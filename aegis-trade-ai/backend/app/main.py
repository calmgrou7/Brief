"""Loopback-only local workbench. No network market feed or real order capabilities."""

import copy
import fcntl
import os
import secrets
from contextlib import asynccontextmanager
from decimal import InvalidOperation
from pathlib import Path
from threading import RLock
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .engine import Engine, initial


class Command(BaseModel):
    stop: str = Field(default="", max_length=40)
    action: str = Field(default="", max_length=20)
    confirmation: str = Field(default="", max_length=20)


def create_app(db_path: Path | None = None) -> FastAPI:
    path = db_path or Path(os.environ.get("AEGIS_DB", "aegis-demo.sqlite3"))
    mutex = RLock()
    token = secrets.token_urlsafe(32)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if os.environ.get("TRADING_MODE", "PAPER") != "PAPER":
            raise RuntimeError("Only PAPER startup is supported")
        with open(str(path) + ".lock", "w") as lockfile:
            fcntl.flock(lockfile, fcntl.LOCK_EX | fcntl.LOCK_NB)
            app.state.engine = Engine(path)
            try:
                yield
            finally:
                app.state.engine.db.close()
                fcntl.flock(lockfile, fcntl.LOCK_UN)

    app = FastAPI(title="upbit 프로젝트 · local PAPER workbench", lifespan=lifespan)
    app.add_middleware(
        TrustedHostMiddleware, allowed_hosts=["localhost", "127.0.0.1", "testserver"]
    )

    @app.middleware("http")
    async def local_only(request: Request, call_next):
        if request.client and request.client.host not in ("127.0.0.1", "::1", "testclient"):
            from fastapi.responses import JSONResponse

            return JSONResponse({"detail": "Local access only"}, status_code=403)
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'"
        )
        return response

    def state() -> dict[str, Any]:
        result = app.state.engine.view()
        result["csrf_token"] = token
        return result

    @app.get("/api/state")
    def get_state():
        with mutex:
            return state()

    @app.get("/health")
    def health():
        return dict(
            status="ok", source="DEMO", market_connected=False, mode=app.state.engine.s["mode"]
        )

    @app.post("/api/{action}")
    def mutate(action: str, request: Request, command: Command = Command()):
        if not secrets.compare_digest(request.headers.get("X-CSRF-Token", ""), token):
            raise HTTPException(403, "CSRF token required")
        origin = request.headers.get("origin")
        if origin and origin != str(request.base_url).rstrip("/"):
            raise HTTPException(403, "Same-origin required")
        with mutex:
            engine = app.state.engine
            snapshot = copy.deepcopy(engine.s)
            try:
                if action == "step":
                    engine.step()
                elif action == "buy":
                    engine.buy(command.stop)
                elif action == "sell":
                    engine.sell()
                elif action == "mode":
                    engine.mode(command.action, command.confirmation)
                elif action == "reset" and command.confirmation == "RESET":
                    engine.s = initial()
                else:
                    raise ValueError("INVALID_COMMAND_OR_CONFIRMATION")
                engine.save(action.upper())
            except (ValueError, InvalidOperation) as exc:
                engine.s = snapshot
                engine.s["last_decision"] = (
                    str(exc) if isinstance(exc, ValueError) else "REJECT_INVALID_INPUT"
                )
                engine.save("REJECTED_" + action.upper())
                raise HTTPException(400, engine.s["last_decision"]) from exc
            except Exception:
                engine.s = snapshot
                raise
            return state()

    static = Path(__file__).parent / "static"
    static.mkdir(exist_ok=True)
    app.mount("/static", StaticFiles(directory=static), name="static")

    @app.get("/")
    def index():
        return FileResponse(static / "index.html")

    return app


app = create_app()

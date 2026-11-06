export UV_CACHE_DIR ?= /tmp/aegis-uv
.PHONY: install lint test build run
install:
	uv sync --frozen
lint:
	uv run ruff check backend tests scripts
	uv run mypy backend
	uv run python scripts/check_forbidden.py
	node --check backend/app/static/app.js
	node --check report-viewer/report-core.js
	node --check report-viewer/viewer.js
test:
	uv run pytest -q
	node --test tests/test_report_viewer.cjs
build:
	uv run python -m compileall -q backend
run:
	uv run uvicorn backend.app.main:app --host 127.0.0.1 --port 8765 --workers 1

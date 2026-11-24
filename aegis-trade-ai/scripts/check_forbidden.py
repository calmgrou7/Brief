from pathlib import Path

FORBIDDEN = ("/v1/orders", "UPBIT_ACCESS_KEY", "UPBIT_SECRET_KEY", "jwt.encode", "LiveBroker")


def violations(root: Path) -> list[str]:
    return [
        str(path)
        for path in root.rglob("*.py")
        if any(token in path.read_text() for token in FORBIDDEN)
    ]


if __name__ == "__main__":
    found = violations(Path("backend"))
    if found:
        raise SystemExit("Forbidden order capability: " + ", ".join(found))
    print("PAPER-only guard passed")

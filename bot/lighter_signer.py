"""Fetch the Lighter signing library that ccxt needs to sign orders.

The signer is a native library published inside the official `lighter-sdk` wheel on PyPI.
We do not pip-install that package (its pinned dependencies conflict with ccxt); instead we
download the wheel, check its SHA-256 against PyPI's published digest, and extract only the
library for this OS. The version is pinned because ccxt calls the library by argument
position: bump it together with ccxt in requirements.txt.
"""
import hashlib
import io
import logging
import os
import platform
import zipfile

import requests

log = logging.getLogger(__name__)

LIGHTER_SDK_VERSION = "1.1.8"
VENDOR_DIR = "vendor"

_LIBRARIES = {
    ("windows", "amd64"): "lighter-signer-windows-amd64.dll",
    ("windows", "x86_64"): "lighter-signer-windows-amd64.dll",
    ("linux", "x86_64"): "lighter-signer-linux-amd64.so",
    ("linux", "amd64"): "lighter-signer-linux-amd64.so",
    ("linux", "aarch64"): "lighter-signer-linux-arm64.so",
    ("linux", "arm64"): "lighter-signer-linux-arm64.so",
    ("darwin", "arm64"): "lighter-signer-darwin-arm64.dylib",
    ("darwin", "x86_64"): "lighter-signer-darwin-amd64.dylib",
}


def library_name(system: str | None = None, machine: str | None = None) -> str:
    key = ((system or platform.system()).lower(), (machine or platform.machine()).lower())
    if key not in _LIBRARIES:
        raise RuntimeError(f"이 OS/CPU 용 Lighter 서명 라이브러리가 없습니다: {key}")
    return _LIBRARIES[key]


def ensure_signer(path: str = "", vendor_dir: str = VENDOR_DIR) -> str:
    """Return a path to the signer library, downloading it once if needed."""
    if path:
        if not os.path.isfile(path):
            raise FileNotFoundError(f"LIGHTER_SIGNER_PATH 파일이 없습니다: {path}")
        return path
    name = library_name()
    target = os.path.join(vendor_dir, f"lighter-sdk-{LIGHTER_SDK_VERSION}", name)
    if os.path.isfile(target):
        return target

    log.info("Lighter 서명 라이브러리 다운로드 중 (lighter-sdk %s)...", LIGHTER_SDK_VERSION)
    meta = requests.get(f"https://pypi.org/pypi/lighter-sdk/{LIGHTER_SDK_VERSION}/json", timeout=30)
    meta.raise_for_status()
    wheel = next(u for u in meta.json()["urls"] if u["filename"].endswith(".whl"))
    data = requests.get(wheel["url"], timeout=120).content
    if hashlib.sha256(data).hexdigest() != wheel["digests"]["sha256"]:
        raise RuntimeError("다운로드한 lighter-sdk 파일의 해시가 PyPI 와 다릅니다. 중단합니다.")

    os.makedirs(os.path.dirname(target), exist_ok=True)
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        with zf.open(f"lighter/signers/{name}") as src, open(target + ".tmp", "wb") as dst:
            dst.write(src.read())
    os.replace(target + ".tmp", target)
    log.info("서명 라이브러리 저장: %s", target)
    return target

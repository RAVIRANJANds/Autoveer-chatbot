#!/usr/bin/env bash
set -euo pipefail
export ROOT="$(cd "$(dirname "$0")" && pwd)"
export OUT="${1:-$ROOT/../../AutoVeer-Chatbot-Windows.zip}"

python3 <<'PY'
import os, zipfile
from pathlib import Path

root = Path(os.environ["ROOT"])
out = Path(os.environ["OUT"])

skip_parts = {
    ".git", "__pycache__", "venv", ".DS_Store",
    "credentials.json", "workshop_records.json", "create-windows-zip.sh",
    "Mediseller_Chatbot.docx",
}
skip_exact = {".env"}

def should_skip(rel: Path) -> bool:
    parts = rel.parts
    if any(p in skip_parts for p in parts):
        return True
    if rel.name in skip_exact:
        return True
    return False

def to_crlf(data: bytes, name: str) -> bytes:
    if name.lower().endswith((".bat", ".txt")):
        text = data.decode("utf-8")
        text = text.replace("\r\n", "\n").replace("\n", "\r\n")
        return text.encode("utf-8")
    return data

out.parent.mkdir(parents=True, exist_ok=True)
if out.exists():
    out.unlink()

with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED) as zf:
    for path in sorted(root.rglob("*")):
        if path.is_dir():
            continue
        rel = path.relative_to(root)
        if should_skip(rel):
            continue
        data = path.read_bytes()
        data = to_crlf(data, path.name)
        zf.writestr(str(rel).replace("\\", "/"), data)

print(f"Created: {out}")
PY

"""Generate RGBA PNG icons + ICO for Tauri (must be RGBA)."""
from pathlib import Path
import struct
import zlib


def png_rgba(w: int, h: int, rgb=(32, 120, 110), a=255) -> bytes:
    def chunk(t: bytes, d: bytes) -> bytes:
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)

    pixel = bytes([rgb[0], rgb[1], rgb[2], a])
    raw = b"".join(b"\x00" + pixel * w for _ in range(h))
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))  # color type 6 = RGBA
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def ico_from_png(png_bytes: bytes) -> bytes:
    header = struct.pack("<HHH", 0, 1, 1)
    entry = struct.pack("<BBBBHHII", 0, 0, 0, 0, 1, 32, len(png_bytes), 22)
    return header + entry + png_bytes


root = Path("apps/desktop/src-tauri/icons")
root.mkdir(parents=True, exist_ok=True)
rgb = (32, 120, 110)
for name, size in [("icon.png", 128), ("32x32.png", 32), ("128x128.png", 128), ("henry.w@example.net", 256)]:
    (root / name).write_bytes(png_rgba(size, size, rgb))
png256 = png_rgba(256, 256, rgb)
(root / "icon.ico").write_bytes(ico_from_png(png256))
print("RGBA icons ok")

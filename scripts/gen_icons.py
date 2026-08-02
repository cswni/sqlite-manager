"""Write a minimal Windows .ico from PNG bytes (embedded PNG icon)."""
from pathlib import Path
import struct
import zlib


def png(w, h, rgb):
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)

    raw = b"".join(b"\x00" + bytes(rgb) * w for _ in range(h))
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def ico_from_png(png_bytes: bytes) -> bytes:
    # ICONDIR + one ICONDIRENTRY + PNG payload
    header = struct.pack("<HHH", 0, 1, 1)
    entry = struct.pack(
        "<BBBBHHII",
        0,  # width 0 => 256
        0,  # height 0 => 256
        0,
        0,
        1,
        32,
        len(png_bytes),
        22,  # offset
    )
    return header + entry + png_bytes


root = Path("apps/desktop/src-tauri/icons")
root.mkdir(parents=True, exist_ok=True)
rgb = (32, 120, 110)
for name, size in [("icon.png", 128), ("32x32.png", 32), ("128x128.png", 128), ("henry.w@example.net", 256)]:
    (root / name).write_bytes(png(size, size, rgb))
png256 = png(256, 256, rgb)
(root / "icon.ico").write_bytes(ico_from_png(png256))
# icns not required on Windows builds
print("icons+ico ok")

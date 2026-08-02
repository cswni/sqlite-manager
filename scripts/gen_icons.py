"""Generate proper RGBA PNG (+ ICO) icons for Tauri using Pillow."""
from pathlib import Path

from PIL import Image, ImageDraw


def make(size: int, rgb=(32, 120, 110)) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # solid rounded square
    margin = max(1, size // 16)
    d.rounded_rectangle(
        [margin, margin, size - margin - 1, size - margin - 1],
        radius=max(2, size // 8),
        fill=(*rgb, 255),
    )
    # simple "table" mark
    inset = size // 4
    d.rectangle([inset, inset, size - inset, size - inset], outline=(255, 255, 255, 230), width=max(1, size // 32))
    mid = size // 2
    d.line([inset, mid, size - inset, mid], fill=(255, 255, 255, 200), width=max(1, size // 48))
    d.line([mid, inset, mid, size - inset], fill=(255, 255, 255, 200), width=max(1, size // 48))
    return img


root = Path("apps/desktop/src-tauri/icons")
root.mkdir(parents=True, exist_ok=True)

sizes = {
    "32x32.png": 32,
    "128x128.png": 128,
    "henry.w@example.net": 256,
    "icon.png": 512,
}
for name, size in sizes.items():
    make(size).save(root / name, format="PNG")

# Multi-size ICO for Windows
ico_imgs = [make(s) for s in (16, 32, 48, 64, 128, 256)]
ico_imgs[0].save(root / "icon.ico", format="ICO", sizes=[(im.width, im.height) for im in ico_imgs])

# ICNS when Pillow supports it (needed for macOS bundle)
try:
    make(1024).save(root / "icon.icns", format="ICNS")
    print("wrote icon.icns")
except Exception as e:
    print("icns skip:", e)

print("icons ok", list(root.iterdir()))

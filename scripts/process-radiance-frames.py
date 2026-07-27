"""Convert Radiance frame assets to RGBA PNGs with transparent centers."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "docs" / "site_assets"
DARK_THRESHOLD = 40


def process_frame(path: Path) -> None:
    image = Image.open(path).convert("RGBA")
    pixels = list(image.getdata())
    updated = []
    for red, green, blue, alpha in pixels:
        if red < DARK_THRESHOLD and green < DARK_THRESHOLD and blue < DARK_THRESHOLD:
            updated.append((red, green, blue, 0))
        else:
            updated.append((red, green, blue, 255))
    image.putdata(updated)
    image.save(path, "PNG")
    print(f"processed {path.name} {image.size}")


def main() -> None:
    for index in range(1, 6):
        process_frame(ASSETS / f"Radiance{index}.png")


if __name__ == "__main__":
    main()

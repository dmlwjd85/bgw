#!/usr/bin/env python3
"""기존 시하 그림에서 앱 아이콘만 새로 만든다. 원본 PNG는 읽기만 하고 수정하지 않는다."""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
# 머리·손까지 한 장으로 보이는 v2 전신. 원본은 건드리지 않는다.
SRC = ROOT / "siha-dress-book/public/sticker/x4/siha-body-v2.png"
OUT = ROOT / "siha/icons"

BG_ANY = (243, 228, 210, 255)  # #f3e4d2
BG_MASK = (255, 143, 184, 255)  # #ff8fb8


def head_crop(im: Image.Image) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        raise SystemExit("원본 그림에서 불투명 영역을 찾지 못했습니다.")
    char = im.crop(bbox)
    w, h = char.size
    # 얼굴·손 위주 정사각형. 가로 전체를 넣고 위쪽만 자른다.
    cut = min(h, int(w * 1.06))
    return char.crop((0, 0, w, cut))


def fit_square(src: Image.Image, size: int, bg: tuple[int, int, int, int], pad_ratio: float) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), bg)
    pad = int(size * pad_ratio)
    inner = max(1, size - pad * 2)
    sw, sh = src.size
    scale = min(inner / sw, inner / sh)
    nw, nh = max(1, int(sw * scale)), max(1, int(sh * scale))
    resized = src.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (size - nw) // 2
    y = (size - nh) // 2
    canvas.alpha_composite(resized, (x, y))
    return canvas.convert("RGBA")


def main() -> None:
    if not SRC.is_file():
        raise SystemExit(f"원본 그림이 없습니다: {SRC}")
    OUT.mkdir(parents=True, exist_ok=True)
    head = head_crop(Image.open(SRC).convert("RGBA"))
    jobs = [
        ("icon-192.png", 192, BG_ANY, 0.10),
        ("icon-512.png", 512, BG_ANY, 0.10),
        ("icon-192-maskable.png", 192, BG_MASK, 0.20),
        ("icon-512-maskable.png", 512, BG_MASK, 0.20),
        ("apple-touch-icon.png", 180, BG_ANY, 0.10),
    ]
    for name, size, bg, pad in jobs:
        dest = OUT / name
        fit_square(head, size, bg, pad).save(dest, "PNG", optimize=True)
        print(f"{dest.relative_to(ROOT)} {size}x{size}")


if __name__ == "__main__":
    main()

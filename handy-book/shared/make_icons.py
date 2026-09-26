#!/usr/bin/env python3
"""Write simple PNG app icons without Pillow."""
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png(path: Path, w: int, h: int, rgba):
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        raw.extend(rgba[y * w * 4 : (y + 1) * w * 4])
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    path.write_bytes(png)


def fill(w, h, color):
    r, g, b, a = color
    return bytearray([r, g, b, a] * (w * h))


def rect(px, w, h, x0, y0, x1, y1, color):
    r, g, b, a = color
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(w, x1), min(h, y1)
    for y in range(y0, y1):
        i = (y * w + x0) * 4
        for x in range(x0, x1):
            px[i : i + 4] = r, g, b, a
            i += 4


def circle(px, w, h, cx, cy, rad, color):
    r2 = rad * rad
    for y in range(max(0, cy - rad), min(h, cy + rad + 1)):
        for x in range(max(0, cx - rad), min(w, cx + rad + 1)):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r2:
                i = (y * w + x) * 4
                px[i : i + 4] = color


THEMES = {
    "01-night-bench": {"bg": (18, 16, 12, 255), "ink": (255, 176, 32, 255), "paper": (255, 220, 140, 255)},
    "02-sunday-table": {"bg": (244, 232, 208, 255), "ink": (168, 36, 24, 255), "paper": (255, 248, 236, 255)},
    "03-parts-counter": {"bg": (26, 107, 60, 255), "ink": (244, 236, 210, 255), "paper": (232, 220, 168, 255)},
    "04-field-notes": {"bg": (58, 64, 48, 255), "ink": (196, 214, 74, 255), "paper": (214, 210, 186, 255)},
    "05-instant-photo": {"bg": (36, 36, 34, 255), "ink": (240, 236, 228, 255), "paper": (255, 252, 246, 255)},
}


def draw_book(px, s, ink, paper):
    m = s // 8
    rect(px, s, s, m + s // 16, m, s - m, s - m, ink)
    rect(px, s, s, m + s // 8, m + s // 20, s - m - s // 28, s - m - s // 20, paper)
    # spine
    rect(px, s, s, m + s // 16, m, m + s // 8, s - m, ink)
    # page mark
    mark = s // 5
    rect(px, s, s, s // 2, m + s // 10, s // 2 + mark // 3, m + s // 4, ink)


def make(folder, colors, size):
    px = fill(size, size, colors["bg"])
    draw_book(px, size, colors["ink"], colors["paper"])
    dest = ROOT / folder / f"icon-{size}.png"
    write_png(dest, size, size, px)
    print(dest)


def main():
    for folder, colors in THEMES.items():
        for size in (192, 512):
            make(folder, colors, size)
        # apple touch uses 180; copy feel via 192 is fine, also write 180
        make_180 = ROOT / folder / "apple-touch-icon.png"
        px = fill(180, 180, colors["bg"])
        draw_book(px, 180, colors["ink"], colors["paper"])
        write_png(make_180, 180, 180, px)


if __name__ == "__main__":
    main()

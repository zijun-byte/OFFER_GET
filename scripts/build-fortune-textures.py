"""Generate repeatable wood and bamboo PBR maps for the Blender fortune props."""
from pathlib import Path
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = Path('E:/web idea/public/assets')
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(20261018)

def smooth_noise(width, anchors):
    samples = rng.normal(size=anchors)
    samples[-1] = samples[0]
    return np.interp(np.linspace(0, anchors - 1, width), np.arange(anchors), samples)

def save_maps(stem, width, height, base, variation, carve=None):
    x = np.arange(width, dtype=np.float32)[None, :]
    y = np.arange(height, dtype=np.float32)[:, None]
    grain = (smooth_noise(width, 190)[None, :] * .55 +
             smooth_noise(width, 610)[None, :] * .23 +
             smooth_noise(width, 34)[None, :] * .35)
    grain = grain + .12 * np.sin((x * .095) + (y * .003) + np.sin(y * .014))
    grain += rng.normal(0, .075, (height, width))
    highlight = .12 * np.sin(x * .006 + y * .0015)
    light = grain + highlight
    color = np.empty((height, width, 3), dtype=np.float32)
    for channel, component in enumerate(base):
        color[:, :, channel] = component + light * variation[channel]
    color += (y / height - .5)[:, :, None] * np.array([4, 3, 2])[None, None, :]
    mask = None
    if carve:
        mask = carve(width, height)
        m = np.asarray(mask, dtype=np.float32) / 255
        color = color * (1 - m[:, :, None] * .78)
        color += m[:, :, None] * np.array([17, 9, 5], dtype=np.float32)
    color = np.uint8(np.clip(color, 0, 255))
    Image.fromarray(color, 'RGB').save(OUT / f'{stem}-color.png', optimize=True)

    roughness = np.clip(.31 + grain * .035 + rng.normal(0, .012, (height, width)), .16, .7)
    if mask is not None:
        roughness += np.asarray(mask, dtype=np.float32) / 255 * .22
    rough = np.uint8(np.clip(roughness * 255, 0, 255))
    Image.fromarray(rough, 'L').save(OUT / f'{stem}-roughness.png', optimize=True)

    heightfield = grain * .28
    if mask is not None:
        heightfield -= np.asarray(mask, dtype=np.float32) / 255 * 3.5
    dx = np.gradient(heightfield, axis=1)
    dy = np.gradient(heightfield, axis=0)
    normal = np.stack((-dx * 3.5, -dy * 3.5, np.ones_like(dx)), axis=-1)
    normal /= np.linalg.norm(normal, axis=-1, keepdims=True)
    normal = np.uint8(np.clip((normal * .5 + .5) * 255, 0, 255))
    Image.fromarray(normal, 'RGB').save(OUT / f'{stem}-normal.png', optimize=True)

def carved_pattern(width, height):
    scale = 3
    canvas = Image.new('L', (width * scale, height * scale), 0)
    d = ImageDraw.Draw(canvas)
    cx = int(width * .75 * scale)
    cy = int(height * .48 * scale)
    r = int(height * .16 * scale)
    ink = 230
    line = 7 * scale
    # Taoist yin-yang mark in a lightly carved circle.
    d.ellipse((cx-r, cy-r, cx+r, cy+r), outline=ink, width=4*scale)
    d.pieslice((cx-r+8, cy-r+8, cx+r-8, cy+r-8), 90, 270, fill=ink)
    d.ellipse((cx-r//2, cy-r+8, cx+r//2, cy+8), fill=ink)
    d.ellipse((cx-r//2, cy-8, cx+r//2, cy+r-8), fill=0)
    dot = r // 10
    d.ellipse((cx-dot, cy-r//2-dot, cx+dot, cy-r//2+dot), fill=0)
    d.ellipse((cx-dot, cy+r//2-dot, cx+dot, cy+r//2+dot), fill=ink)
    # Eight trigrams placed around the circle.
    for index in range(8):
        angle = index * math.pi / 4 - math.pi / 2
        px = cx + math.cos(angle) * r * 1.37
        py = cy + math.sin(angle) * r * 1.37
        ux, uy = math.cos(angle + math.pi/2), math.sin(angle + math.pi/2)
        vx, vy = math.cos(angle), math.sin(angle)
        for row in range(3):
            offset = (row-1) * 11 * scale
            midx, midy = px + vx*offset, py + vy*offset
            broken = ((index + row*3) % 5) < 2
            segments = [(-22,-4),(4,22)] if broken else [(-22,22)]
            for start, end in segments:
                d.line((midx+ux*start*scale, midy+uy*start*scale,
                        midx+ux*end*scale, midy+uy*end*scale), fill=ink, width=line)
    # Small carved scrolling-cloud flourishes above and below the symbol.
    for yc in (int(height*.19*scale), int(height*.79*scale)):
        for side in (-1, 1):
            ox = cx + side * 42 * scale
            d.arc((ox-42*scale,yc-17*scale,ox+42*scale,yc+23*scale),
                  15 if side == 1 else 160, 290 if side == 1 else 425,
                  fill=ink, width=4*scale)
            d.arc((ox-17*scale,yc-28*scale,ox+25*scale,yc+12*scale),
                  0, 300, fill=ink, width=3*scale)
        d.arc((cx-45*scale,yc-27*scale,cx+45*scale,yc+26*scale),
              10, 170, fill=ink, width=4*scale)
    return canvas.resize((width,height), Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(.55))

save_maps('fortune-wood', 2048, 1024, (98, 39, 15), (15, 10, 5), carved_pattern)
save_maps('fortune-bamboo', 512, 1024, (189, 136, 72), (16, 13, 9))
print('FORTUNE_TEXTURES_READY')

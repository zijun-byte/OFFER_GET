"""Procedural textures for the fortune-lots (求签) scene.

Outputs JPEGs to tools/lots-textures/ (inputs for build-lots-model.py, which
embeds them into public/assets/fortune-lots.glb). Run with any Python 3 that
has numpy + Pillow:  python scripts/build-lots-textures.py
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'tools' / 'lots-textures'
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(20261027)

FONT_CANDIDATES = [
    '/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc',
    'C:/Windows/Fonts/simsunb.ttf', 'C:/Windows/Fonts/simhei.ttf', 'C:/Windows/Fonts/msyhbd.ttc',
]


def noise(h, w, scale_y, scale_x, seed_shift=0):
    """Tileable noise: random-phase spectrum with a Gaussian falloff."""
    spec = rng.normal(size=(h, w)) + 1j * rng.normal(size=(h, w))
    fy = np.fft.fftfreq(h)[:, None] * h
    fx = np.fft.fftfreq(w)[None, :] * w
    spec *= np.exp(-((fy / scale_y) ** 2 + (fx / scale_x) ** 2))
    out = np.real(np.fft.ifft2(spec))
    out -= out.min()
    return out / max(out.max(), 1e-9)


def normal_from_height(height, strength):
    gy, gx = np.gradient(height)
    n = np.dstack([-gx * strength, gy * strength, np.ones_like(height)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return Image.fromarray(((n * .5 + .5) * 255).astype(np.uint8))


def save(arr_or_img, name, quality=86):
    img = arr_or_img if isinstance(arr_or_img, Image.Image) else Image.fromarray(np.clip(arr_or_img, 0, 255).astype(np.uint8))
    img.convert('RGB').save(OUT / name, quality=quality, optimize=True)


def lerp(a, b, t):
    return np.asarray(a)[None, None, :] * (1 - t[..., None]) + np.asarray(b)[None, None, :] * t[..., None]


def font(size):
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return None


# ---------------------------------------------------------------- cup (lacquered wood)
S = 1024
v = np.linspace(1, 0, S)[:, None] * np.ones((1, S))          # v=1 is the rim (image top)
grain = noise(S, S, 3, 60)                                     # long vertical grain
warp = noise(S, S, 2, 6)
rings = np.sin((np.linspace(0, 1, S)[None, :] * 22 + warp * 14 + grain * 5) * np.pi * 2) * .5 + .5
fine = noise(S, S, 40, 300)
wood = rings * .3 + grain * .45 + fine * .25
color = lerp((40, 13, 8), (92, 32, 17), wood ** 1.2)
# Darker lacquer bands with thin gold lines near the rim and foot (v = height in metres).
for lo, hi in ((.075, .125), (.845, .915)):
    band = (v > lo) & (v < hi)
    color[band] *= .55
    for edge in (lo, hi):
        line = np.abs(v - edge) < .0035
        color[line] = (178, 132, 62)
# Gold "灵签" panel on the front (+Z in three.js == u .75 in the lathe UVs).
mask = Image.new('L', (S, S), 0)
f = font(150)
panel = Image.new('L', (240, 440), 0)
pd = ImageDraw.Draw(panel)
pd.rectangle((10, 10, 229, 429), outline=255, width=6)
pd.rectangle((24, 24, 215, 415), outline=255, width=2)
if f:
    for i, ch in enumerate('灵签'):
        bbox = pd.textbbox((0, 0), ch, font=f)
        pd.text(((240 - (bbox[2] - bbox[0])) / 2 - bbox[0], 48 + i * 180 - bbox[1]), ch, fill=255, font=f)
# u spans the circumference (2π·CUP_R metres), v spans CUP_H metres; pre-squash x so the panel
# keeps its aspect on the curved surface.
CUP_R, CUP_H = .26, .72
panel = panel.resize((int(240 * CUP_H / (2 * np.pi * CUP_R)), 440), Image.LANCZOS)
# The lathe UV seam is at the back, so u = .5 faces the camera.
mask.paste(panel, (int(S * .5 - panel.width / 2), int(S * (1 - .76))))
m = np.asarray(mask.filter(ImageFilter.GaussianBlur(.8)), dtype=float) / 255
wear = np.clip(noise(S, S, 60, 60) * 1.6 - .25, 0, 1)
gold = lerp((150, 104, 44), (214, 170, 92), fine)
mg = (m * (.55 + .45 * wear))[..., None]
color = color * (1 - mg) + gold * mg
save(color, 'cup-color.jpg')
height = wood * .6 + fine * .4 - m * 1.6
save(normal_from_height(height, 8), 'cup-normal.jpg', 90)

# ---------------------------------------------------------------- stick (flat bamboo slat)
H, W = 1024, 128
fib = noise(H, W, 6, 60)
fib2 = noise(H, W, 30, 120)
spots = np.clip(noise(H, W, 40, 30) * 2.2 - 1.45, 0, 1)
t = fib * .6 + fib2 * .4
col = lerp((150, 102, 46), (204, 160, 92), t)
col *= (1 - spots * .35)[..., None]
vv = np.linspace(1, 0, H)[:, None] * np.ones((1, W))
red_t = np.clip((vv - .885) / .006, 0, 1)                      # painted cap, top ~11%
red = lerp((92, 12, 8), (128, 22, 14), fib2)
paint_wear = np.clip(noise(H, W, 50, 50) * 2 - .2, 0, 1)
rt = (red_t * (.75 + .25 * paint_wear))[..., None]
col = col * (1 - rt) + red * rt
col *= (.82 + .18 * np.clip(vv * 4, 0, 1))[..., None]          # handled grime near the foot
save(col, 'stick-color.jpg')
save(normal_from_height(fib * .7 + fib2 * .3 - red_t * .2, 6), 'stick-normal.jpg', 90)

# ---------------------------------------------------------------- table (dark planks, tileable)
T = 1024
planks = 6
yy = np.arange(T)[:, None] * np.ones((1, T))
plank_id = (yy // (T / planks)).astype(int)
offsets = rng.random(planks) * 40
g = noise(T, T, 40, 4)                                          # grain runs along x
w2 = noise(T, T, 8, 2)
lines = np.sin((yy / T * 34 + w2 * 6 + offsets[plank_id]) * np.pi * 2) * .5 + .5
tw = g * .6 + lines * .15 + noise(T, T, 200, 30) * .25
tcol = lerp((34, 20, 12), (82, 50, 28), tw ** 1.3)
tone = rng.uniform(.82, 1.08, planks)
tcol *= tone[plank_id][..., None]
seam = (yy % (T / planks)) < 3
tcol[seam] *= .35
save(tcol, 'table-color.jpg')
save(normal_from_height(tw * .4 - seam * 2.0, 4), 'table-normal.jpg', 88)
print('LOTS_TEXTURES_READY', OUT)

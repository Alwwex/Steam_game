# Draws the 9 achievement icons (64x64 PNG, unlocked + locked) as 16x16 pixel art scaled 4x.
# python3 tools/achievement-icons.py   ->  store-assets/achievements/
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), '..', 'store-assets', 'achievements')
os.makedirs(OUT, exist_ok=True)
CYAN, YEL, PINK, GREEN, WHITE, DARK = (70, 227, 255), (255, 210, 74), (255, 43, 208), (64, 255, 112), (255, 255, 255), (12, 20, 28)

DIGITS = {  # 3x5 pixel font
    '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'], '2': ['111', '001', '111', '100', '111'],
    '5': ['111', '100', '111', '001', '111'],
}

def text(d, s, x, y, c):
    for ch in s:
        for r, row in enumerate(DIGITS[ch]):
            for k, v in enumerate(row):
                if v == '1': d.point((x + k, y + r), fill=c)
        x += 4

def sphere(d, x, y, r, c):
    d.ellipse([x - r, y - r, x + r, y + r], outline=c)
    d.line([(x - r, y), (x + r, y)], fill=c)
    d.point((x, y), fill=WHITE)

def frame(color):
    im = Image.new('RGB', (16, 16), DARK)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 15, 15], outline=color)
    return im, d

def icon(name, color, draw):
    im, d = frame(color)
    draw(d)
    big = im.resize((64, 64), Image.NEAREST)
    big.save(os.path.join(OUT, name + '.png'))
    g = big.convert('L').point(lambda v: int(v * 0.45)).convert('RGB')
    g.save(os.path.join(OUT, name + '_locked.png'))

icon('QC_FIRST_SHIFT', CYAN, lambda d: (sphere(d, 8, 6, 3, CYAN), text(d, '1', 7, 10, YEL)))
icon('QC_SHIFT_5', YEL, lambda d: (sphere(d, 8, 6, 3, YEL), text(d, '5', 7, 10, WHITE)))
icon('QC_SHIFT_10', PINK, lambda d: (sphere(d, 8, 6, 3, PINK), text(d, '10', 5, 10, YEL)))
icon('QC_DELIVER_100', CYAN, lambda d: (sphere(d, 8, 5, 3, CYAN), text(d, '100', 2, 10, WHITE)))
icon('QC_BANISH_25', WHITE, lambda d: (d.polygon([(2, 8), (8, 4), (14, 8), (8, 12)], outline=WHITE), d.rectangle([7, 7, 9, 9], fill=PINK), d.line([(2, 13), (13, 13)], fill=YEL)))
icon('QC_TUNNEL_100', GREEN, lambda d: (d.rectangle([7, 2, 8, 13], fill=(90, 110, 120)), d.line([(2, 8), (13, 8)], fill=GREEN), d.line([(11, 6), (13, 8)], fill=GREEN), d.line([(11, 10), (13, 8)], fill=GREEN)))
icon('QC_ENTANGLED', PINK, lambda d: (sphere(d, 5, 8, 3, PINK), sphere(d, 11, 8, 3, PINK), d.line([(5, 4), (11, 4)], fill=YEL)))
def crew(d):
    for i, c in enumerate([YEL, CYAN, PINK, GREEN]):
        x = 2 + (i % 2) * 7; y = 2 + (i // 2) * 7
        d.rectangle([x, y + 2, x + 4, y + 5], fill=c); d.point((x, y + 1), fill=c); d.point((x + 4, y + 1), fill=c)
icon('QC_FULL_CREW', YEL, crew)
icon('QC_TOURIST', CYAN, lambda d: (d.rectangle([3, 3, 12, 12], outline=CYAN), d.line([(3, 8), (12, 8)], fill=CYAN), d.line([(8, 3), (8, 12)], fill=CYAN), d.rectangle([5, 5, 6, 6], fill=YEL), d.rectangle([10, 10, 11, 11], fill=PINK)))
print('achievement icons ->', os.path.normpath(OUT))

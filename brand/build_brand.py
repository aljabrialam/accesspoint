"""Builds the AccessPoint logo kit as outlined SVG (no live text, no strokes) plus app icons.

    python3 brand/build_brand.py        -> brand/logo/*.svg, brand/logo/png/*
The mark: the letter A in braille, one raised dot in a six-dot cell.
Wordmark: Atkinson Hyperlegible Next Bold (OFL, Braille Institute), outlined with fontTools, tracked -1%.
"""
import math
import subprocess
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

HERE = Path(__file__).parent
OUT = HERE / "logo"
OUT.mkdir(exist_ok=True)

COLORS = {
    "cobalt": "#2B47C9",  # brand: calm, trusted
    "amber": "#FFB224",   # the one thing to press (camera targets only)
    "ink": "#101828",     # text
    "mist": "#F4F6FB",    # light backgrounds
    "night": "#7B8FF5",   # the mark on dark backgrounds
    "go": "#12805C",      # confirmed
    "stop": "#D92D20",    # stopped
}

# ---- mark geometry (256 grid). Cell: 2 columns x 3 rows, pitch 70, dot radius 30.
COLS, ROWS, R, RING = (93, 163), (58, 128, 198), 30, 12
SOLID_R = 31.5  # optical overshoot: a solid disc looks smaller than a ring of the same outer size


def circle(cx, cy, r):
    return f"M{cx - r} {cy}a{r} {r} 0 1 0 {2 * r} 0a{r} {r} 0 1 0 {-2 * r} 0Z"


def mark_path(small=False):
    parts = []
    for row, cy in enumerate(ROWS):
        for col, cx in enumerate(COLS):
            if row == 0 and col == 0:
                parts.append(circle(cx, cy, 34 if small else SOLID_R))
            elif small:
                parts.append(circle(cx, cy, 17))  # small-size cut: solid dots, no rings to fill in
            else:
                parts.append(circle(cx, cy, R) + circle(cx, cy, R - RING))
    return "".join(parts)


MARK_BOX = (COLS[0] - SOLID_R, ROWS[0] - SOLID_R, COLS[1] + R, ROWS[2] + R)  # tight bounds


def svg(view, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}">{body}</svg>\n'


def mark_svg(color, small=False):
    return svg("0 0 256 256", f'<path fill="{color}" fill-rule="evenodd" d="{mark_path(small)}"/>')


# ---- wordmark
font = TTFont(HERE / "fonts" / "AtkinsonHyperlegibleNext-Bold.ttf")
gs, cmap, upm = font.getGlyphSet(), font.getBestCmap(), font["head"].unitsPerEm
cap = font["OS/2"].sCapHeight


def word_path(text, tracking=-0.01):
    pen, x, track = SVGPathPen(gs), 0, tracking * upm
    for ch in text:
        g = cmap[ord(ch)]
        gs[g].draw(TransformPen(pen, (1, 0, 0, -1, x, 0)))
        x += gs[g].width + track
    return pen.getCommands(), x - track


WORD_D, WORD_W = word_path("AccessPoint")


def lockup(mark_color, word_color, stacked=False):
    mx0, my0, mx1, my1 = MARK_BOX
    mh = my1 - my0
    if stacked:
        s = 120 / cap  # cap height 120 under a 172-high mark
        ww = WORD_W * s
        width = max(ww, mx1 - mx0) + 40
        mark_x = (width - (mx1 - mx0)) / 2 - mx0
        word_x, base = (width - ww) / 2, mh + 70 + 120
        body = (f'<path fill="{mark_color}" fill-rule="evenodd" transform="translate({mark_x:.1f} {-my0 + 20:.1f})" d="{mark_path()}"/>'
                f'<path fill="{word_color}" transform="translate({word_x:.1f} {base + 20:.1f}) scale({s:.5f})" d="{WORD_D}"/>')
        return svg(f"0 0 {width:.0f} {base + 40:.0f}", body)
    s = (mh * 0.62) / cap  # cap height = 62% of the mark height, aligned to the mark's vertical centre
    gap = 2 * R
    word_x = (mx1 - mx0) + gap
    base = mh / 2 + cap * s / 2
    width = word_x + WORD_W * s
    body = (f'<path fill="{mark_color}" fill-rule="evenodd" transform="translate({-mx0:.1f} {-my0:.1f})" d="{mark_path()}"/>'
            f'<path fill="{word_color}" transform="translate({word_x:.1f} {base:.1f}) scale({s:.5f})" d="{WORD_D}"/>')
    return svg(f"0 0 {width:.0f} {mh:.0f}", body)


def tile(bg, fg, size=1024, small=False, radius=0):
    # mark centred optically (slightly above centre) at 54% of the tile height
    mx0, my0, mx1, my1 = MARK_BOX
    s = size * 0.54 / (my1 - my0)
    tx = size / 2 - s * (mx0 + mx1) / 2
    ty = size * 0.485 - s * (my0 + my1) / 2
    rect = f'<rect width="{size}" height="{size}" rx="{radius}" fill="{bg}"/>'
    return svg(f"0 0 {size} {size}", rect + f'<path fill="{fg}" fill-rule="evenodd" transform="translate({tx:.2f} {ty:.2f}) scale({s:.5f})" d="{mark_path(small)}"/>')


C = COLORS
files = {
    "mark-cobalt.svg": mark_svg(C["cobalt"]),
    "mark-ink.svg": mark_svg(C["ink"]),
    "mark-white.svg": mark_svg("#FFFFFF"),
    "mark-small-cobalt.svg": mark_svg(C["cobalt"], small=True),
    "lockup-light.svg": lockup(C["cobalt"], C["ink"]),
    "lockup-dark.svg": lockup(C["night"], "#FFFFFF"),
    "lockup-on-cobalt.svg": lockup("#FFFFFF", "#FFFFFF"),
    "lockup-mono.svg": lockup(C["ink"], C["ink"]),
    "lockup-stacked-light.svg": lockup(C["cobalt"], C["ink"], stacked=True),
    "lockup-stacked-dark.svg": lockup(C["night"], "#FFFFFF", stacked=True),
    "wordmark-ink.svg": svg(f"0 {-cap * 1.0:.0f} {WORD_W:.0f} {cap * 1.25:.0f}", f'<path fill="{C["ink"]}" d="{WORD_D}"/>'),
    "wordmark-white.svg": svg(f"0 {-cap * 1.0:.0f} {WORD_W:.0f} {cap * 1.25:.0f}", f'<path fill="#FFFFFF" d="{WORD_D}"/>'),
    "app-icon-light.svg": tile(C["cobalt"], "#FFFFFF"),
    "app-icon-dark.svg": tile(C["ink"], C["night"]),
    "favicon.svg": tile(C["cobalt"], "#FFFFFF", size=256, small=True, radius=56),
}
for name, content in files.items():
    (OUT / name).write_text(content)

# PNG renders (Chrome-based renderer from the logo-design skill)
skill = Path.home() / ".config/devin/skills/logo-design/scripts/render_png.py"
png = OUT / "png"
png.mkdir(exist_ok=True)
subprocess.run(["python3", str(skill), str(OUT / "app-icon-light.svg"), str(OUT / "app-icon-dark.svg"), "--out-dir", str(png), "--size", "1024"], check=True)
print("wrote", ", ".join(files))

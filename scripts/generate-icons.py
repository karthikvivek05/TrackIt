from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "client", "public", "icons")
os.makedirs(OUT, exist_ok=True)

BG = (24, 24, 27, 255)  # dark neutral #18181b
WHITE = (255, 255, 255, 255)


def make_icon(size, maskable=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if maskable:
        # Full-bleed background; glyph kept within the 80% safe zone.
        d.rectangle([0, 0, size, size], fill=BG)
    else:
        radius = int(size * 0.225)
        d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=BG)

    # Checkmark glyph.
    cx = size / 2.0
    cy = size / 2.0
    hw = size * 0.30
    p1 = (cx - hw, cy + 0.02 * size)
    p2 = (cx - hw * 0.28, cy + hw * 0.52)
    p3 = (cx + hw, cy - hw * 0.52)
    lw = max(8, int(size * 0.09))

    d.line([p1, p2], fill=WHITE, width=lw, joint="curve")
    d.line([p2, p3], fill=WHITE, width=lw, joint="curve")
    for p in (p1, p2, p3):
        r = lw // 2
        d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=WHITE)

    return img


make_icon(192).save(os.path.join(OUT, "pwa-192.png"))
make_icon(512).save(os.path.join(OUT, "pwa-512.png"))
make_icon(512, maskable=True).save(os.path.join(OUT, "maskable-512.png"))
print("icons written to", OUT)

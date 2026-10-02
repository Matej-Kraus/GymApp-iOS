#!/usr/bin/env python3
"""
Generuje app ikonu (1024x1024) a splash icon (512x512) pro Workout Tracker.
Design: tmavé pozadí #0A0A0F + limetkový (#C6FF00) činkový symbol.
"""

from PIL import Image, ImageDraw, ImageFilter
import math, os

BG    = (10, 10, 15)        # #0A0A0F
LIME  = (198, 255, 0)       # #C6FF00
WHITE = (255, 255, 255)

def draw_barbell(draw: ImageDraw.ImageDraw, cx: int, cy: int, scale: float, color: tuple):
    """Nakreslí činkový symbol kolem středu (cx, cy) se zadaným měřítkem."""
    bar_w  = int(560 * scale)
    bar_h  = int(26  * scale)
    pl_w   = int(50  * scale)   # šířka kotouče
    pl_h   = int(220 * scale)   # výška kotouče
    col_w  = int(26  * scale)   # šířka objímky
    col_h  = int(130 * scale)

    bar_r  = int(6  * scale)    # zaoblení
    pl_r   = int(8  * scale)
    col_r  = int(4  * scale)

    lx = cx - bar_w // 2  # levý okraj tyče

    # Tyč
    draw.rounded_rectangle(
        [lx, cy - bar_h//2, lx + bar_w, cy + bar_h//2],
        radius=bar_r, fill=color
    )
    # Levý kotouč
    draw.rounded_rectangle(
        [lx - pl_w, cy - pl_h//2, lx, cy + pl_h//2],
        radius=pl_r, fill=color
    )
    # Pravý kotouč
    draw.rounded_rectangle(
        [lx + bar_w, cy - pl_h//2, lx + bar_w + pl_w, cy + pl_h//2],
        radius=pl_r, fill=color
    )
    # Levá objímka
    draw.rounded_rectangle(
        [lx + int(12*scale), cy - col_h//2, lx + int(12*scale) + col_w, cy + col_h//2],
        radius=col_r, fill=color
    )
    # Pravá objímka
    draw.rounded_rectangle(
        [lx + bar_w - int(12*scale) - col_w, cy - col_h//2, lx + bar_w - int(12*scale), cy + col_h//2],
        radius=col_r, fill=color
    )


# ─── APP ICON 1024×1024 ──────────────────────────────────────────────────────

def make_icon(size: int = 1024) -> Image.Image:
    img = Image.new("RGB", (size, size), BG)
    draw = ImageDraw.Draw(img)
    cx, cy = size // 2, size // 2

    # Jemný limetkový glow za činkou (radiální, od středu)
    glow = Image.new("RGB", (size, size), BG)
    gd = ImageDraw.Draw(glow)
    for i in range(20, 0, -1):
        r = int(size * 0.28) + i * int(size * 0.016)
        intensity = int(i * 3.5)
        gd.ellipse(
            [cx - r, cy - r, cx + r, cy + r],
            fill=(
                min(255, BG[0] + intensity // 3),
                min(255, BG[1] + intensity),
                BG[2],
            )
        )
    img = Image.blend(img, glow, alpha=0.6)
    draw = ImageDraw.Draw(img)

    # Činka větší — scale 1.18 aby zaplnila ikonu
    draw_barbell(draw, cx, cy, scale=size / 1024 * 1.18, color=LIME)
    return img


icon = make_icon(1024)
icon.save("assets/icon.png")
print("✓ assets/icon.png (1024×1024)")


# ─── SPLASH ICON 512×512 (průhledné pozadí, jen symbol) ───────────────────────

def make_splash_icon(size: int = 512) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_barbell(draw, size // 2, size // 2, scale=size / 1024, color=LIME)
    return img


splash = make_splash_icon(512)
splash.save("assets/splash-icon.png")
print("✓ assets/splash-icon.png (512×512)")

# Vygeneruj také 192×192 pro favicon (web)
fav = make_icon(192)
fav.save("assets/favicon.png")
print("✓ assets/favicon.png (192×192)")

print("\nHotovo — ikony jsou v assets/")

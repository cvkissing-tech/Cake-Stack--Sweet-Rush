from pathlib import Path
import math

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art-source"
ASSETS = ROOT / "assets"
RESAMPLE = Image.Resampling.LANCZOS


def clean_checkerboard(image: Image.Image) -> Image.Image:
    """Turn the neutral checkerboard from generated art into real alpha."""
    rgb = np.asarray(image.convert("RGB"), dtype=np.int16)
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    brightness = rgb.mean(axis=2)
    background = (chroma < 16) & (brightness > 218)
    alpha = np.where(background, 0, 255).astype(np.uint8)
    alpha_image = Image.fromarray(alpha, "L")
    alpha_image = alpha_image.filter(ImageFilter.MaxFilter(5))
    alpha_image = alpha_image.filter(ImageFilter.MinFilter(3))
    alpha_image = alpha_image.filter(ImageFilter.GaussianBlur(0.55))
    result = image.convert("RGBA")
    result.putalpha(alpha_image)
    return result


def exact_sprite(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    image = image.convert("RGBA")
    visible_alpha = image.getchannel("A").point(lambda value: 255 if value > 24 else 0)
    bbox = visible_alpha.getbbox()
    if bbox:
        image = image.crop(bbox)
    return image.resize(size, RESAMPLE)


def contained_sprite(image: Image.Image, size=(260, 260), fill=0.84) -> Image.Image:
    image = image.convert("RGBA")
    visible_alpha = image.getchannel("A").point(lambda value: 255 if value > 24 else 0)
    bbox = visible_alpha.getbbox()
    if bbox:
        image = image.crop(bbox)
    limit = (int(size[0] * fill), int(size[1] * fill))
    image.thumbnail(limit, RESAMPLE)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.alpha_composite(image, ((size[0] - image.width) // 2, (size[1] - image.height) // 2))
    return canvas


def optimized_home_sprite(
    image: Image.Image,
    max_width: int = 640,
    alpha_threshold: int = 18,
    padding: int = 18,
) -> Image.Image:
    """Crop generated transparent art and retain a little soft-edge padding."""
    image = image.convert("RGBA")
    visible_alpha = image.getchannel("A").point(
        lambda value: 255 if value > alpha_threshold else 0
    )
    bbox = visible_alpha.getbbox()
    if bbox:
        left = max(0, bbox[0] - padding)
        top = max(0, bbox[1] - padding)
        right = min(image.width, bbox[2] + padding)
        bottom = min(image.height, bbox[3] + padding)
        image = image.crop((left, top, right, bottom))
    if image.width > max_width:
        height = round(image.height * (max_width / image.width))
        image = image.resize((max_width, height), RESAMPLE)
    return image


def make_background_extension(
    background: Image.Image,
    source_name: str,
    match_main_background: bool = False,
) -> Image.Image:
    """Match both extension edges to the main background's top seam."""
    width, height = background.size
    extension = ImageOps.fit(
        Image.open(SOURCE / source_name).convert("RGB"),
        (width, height),
        method=RESAMPLE,
    )
    result = extension.copy()
    # Keep only a narrow opaque color-matching seam. A broad blend washes out
    # the architecture and reads as a transparent band while the scene scrolls.
    band_height = min(24, height // 8)
    seam_source = background if match_main_background else extension
    seam = seam_source.crop((0, 0, width, band_height))

    if match_main_background:
        for y in range(band_height):
            blend = y / (band_height - 1)
            seam_row = seam.crop((0, y, width, y + 1))
            extension_row = extension.crop((0, y, width, y + 1))
            result.paste(Image.blend(seam_row, extension_row, blend), (0, y))

    for y in range(band_height):
        blend = y / (band_height - 1)
        target_row = seam.crop((0, band_height - 1 - y, width, band_height - y))
        extension_row = extension.crop((0, height - band_height + y, width, height - band_height + y + 1))
        result.paste(Image.blend(extension_row, target_row, blend), (0, height - band_height + y))

    return result


def hue_shift(image: Image.Image, amount: int) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    hsv = np.asarray(rgba.convert("RGB").convert("HSV"), dtype=np.uint8).copy()
    hsv[:, :, 0] = (hsv[:, :, 0].astype(np.int16) + amount) % 256
    shifted = Image.fromarray(hsv, "HSV").convert("RGBA")
    shifted.putalpha(alpha)
    return shifted


def make_suspended_block(block: Image.Image) -> Image.Image:
    scale = 4
    width, height = 188 * scale, 179 * scale
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    apex = (94 * scale, 4 * scale)
    # Extend the ribbons into the frosting so downscaling can never reveal a gap.
    left = (10 * scale, 62 * scale)
    right = (178 * scale, 62 * scale)
    for start, end in ((apex, left), (apex, right)):
        draw.line((start, end), fill=(142, 45, 72, 255), width=5 * scale)
        draw.line((start, end), fill=(255, 111, 145, 255), width=3 * scale)
        draw.line((start, end), fill=(255, 213, 222, 220), width=1 * scale)
    draw.ellipse((87 * scale, 0, 101 * scale, 14 * scale), fill=(244, 199, 106, 255))
    draw.ellipse((90 * scale, 3 * scale, 98 * scale, 11 * scale), fill=(255, 247, 232, 255))
    cake = block.resize((188 * scale, 134 * scale), RESAMPLE)
    canvas.alpha_composite(cake, (0, 45 * scale))
    return canvas.resize((188, 179), RESAMPLE)


def make_ribbon_hook() -> Image.Image:
    scale = 4
    width, height = 50 * scale, 507 * scale
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    points = []
    for y in range(-4 * scale, 470 * scale, 4 * scale):
        x = (25 + math.sin(y / (31 * scale)) * 2.4) * scale
        points.append((int(x), y))
    draw.line(points, fill=(116, 53, 58, 255), width=14 * scale)
    draw.line(points, fill=(217, 72, 110, 255), width=10 * scale)
    draw.line(points, fill=(255, 147, 169, 255), width=4 * scale)
    draw.line([(p[0] - 2 * scale, p[1]) for p in points], fill=(255, 219, 225, 190), width=1 * scale)
    draw.rounded_rectangle((12 * scale, 461 * scale, 38 * scale, 494 * scale), radius=8 * scale,
                           fill=(244, 199, 106, 255), outline=(107, 58, 50, 255), width=2 * scale)
    draw.ellipse((17 * scale, 468 * scale, 33 * scale, 484 * scale), fill=(255, 247, 232, 255))
    draw.arc((13 * scale, 476 * scale, 42 * scale, 506 * scale), 250, 105,
             fill=(107, 58, 50, 255), width=4 * scale)
    return canvas.resize((50, 507), RESAMPLE)


def make_heart() -> Image.Image:
    scale = 4
    width, height = 60 * scale, 53 * scale
    t = np.linspace(0, math.tau, 240)
    x = 16 * np.sin(t) ** 3
    y = 13 * np.cos(t) - 5 * np.cos(2 * t) - 2 * np.cos(3 * t) - np.cos(4 * t)
    px = (width / 2) + x * 5.9
    py = (height * 0.48) - y * 5.2
    points = list(zip(px.astype(int), py.astype(int)))
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    draw.polygon(points, fill=(244, 199, 106, 255))
    inset = [(int(width / 2 + (a - width / 2) * 0.9), int(height * 0.48 + (b - height * 0.48) * 0.88))
             for a, b in points]
    draw.polygon(inset, fill=(217, 72, 110, 255))
    draw.ellipse((18 * scale, 10 * scale, 27 * scale, 18 * scale), fill=(255, 221, 229, 210))
    return canvas.resize((60, 53), RESAMPLE)


def build() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)

    block = exact_sprite(Image.open(SOURCE / "cake-tier.png"), (188, 134))
    block.save(ASSETS / "block.png")

    perfect_raw = clean_checkerboard(Image.open(SOURCE / "cake-tier-perfect-raw.png"))
    perfect = exact_sprite(perfect_raw, (188, 133))
    perfect.save(ASSETS / "block-perfect.png")
    make_suspended_block(block).save(ASSETS / "block-rope.png")

    home_tower_raw = Image.open(SOURCE / "home-cake-tower-raw.png")
    optimized_home_sprite(home_tower_raw).save(
        ASSETS / "home-cake-tower.png",
        optimize=True,
    )

    background = ImageOps.fit(Image.open(SOURCE / "patisserie-background.png").convert("RGB"),
                              (750, 1050), method=RESAMPLE)
    background.save(ASSETS / "background.png", optimize=True)
    make_background_extension(
        background,
        "background-extension-raw.png",
        match_main_background=True,
    ).save(ASSETS / "background-extension.png", optimize=True)
    make_background_extension(
        background,
        "background-extension-sunset-raw.png",
    ).save(ASSETS / "background-extension-sunset.png", optimize=True)
    make_background_extension(
        background,
        "background-extension-night-raw.png",
    ).save(ASSETS / "background-extension-night.png", optimize=True)

    cluster_raw = clean_checkerboard(Image.open(SOURCE / "treat-cluster-v2-raw.png"))
    cluster = contained_sprite(cluster_raw, fill=0.74)
    cluster_flipped = cluster.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    cloud_sprites = [
        cluster,
        cluster_flipped,
        hue_shift(cluster, 6),
        hue_shift(cluster_flipped, 250),
        cluster.rotate(4, Image.Resampling.BICUBIC, expand=False),
        cluster_flipped.rotate(-4, Image.Resampling.BICUBIC, expand=False),
        hue_shift(cluster.rotate(3, Image.Resampling.BICUBIC, expand=False), 12),
        hue_shift(cluster_flipped.rotate(-3, Image.Resampling.BICUBIC, expand=False), 244),
    ]
    for index, sprite in enumerate(cloud_sprites, 1):
        sprite.save(ASSETS / f"c{index}.png")

    flight_raw = clean_checkerboard(Image.open(SOURCE / "winged-macaron-v2-raw.png"))
    flight_base = contained_sprite(flight_raw, fill=0.78)
    for index, shift in enumerate((0, 14, 29, 45, 232, 216, 198), 1):
        sprite = hue_shift(flight_base, shift)
        sprite.save(ASSETS / f"f{index}.png")

    make_ribbon_hook().save(ASSETS / "hook.png")
    make_heart().save(ASSETS / "heart.png")
    contained_sprite(flight_raw, size=(582, 582), fill=0.82).save(
        ASSETS / "favicon.png"
    )


if __name__ == "__main__":
    build()

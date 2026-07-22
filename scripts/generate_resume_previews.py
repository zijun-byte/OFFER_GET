from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


OUTPUT_DIR = Path(r"E:\web idea\assets\resume-previews")
SIZE = (900, 1260)


def load_font(size: int, bold: bool = False):
    candidates = [
        r"C:\Windows\Fonts\msyhbd.ttc" if bold else r"C:\Windows\Fonts\msyh.ttc",
        r"C:\Windows\Fonts\simhei.ttf" if bold else r"C:\Windows\Fonts\simsun.ttc",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
    ]
    for candidate in candidates:
      path = Path(candidate)
      if path.exists():
        return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


FONT_TITLE = load_font(54, True)
FONT_SUBTITLE = load_font(24, True)
FONT_BODY = load_font(20, False)
FONT_SMALL = load_font(18, False)
FONT_TAG = load_font(16, True)


TEMPLATES = [
    {
        "slug": "fresh-single-column",
        "name": "林若曦",
        "role": "产品运营实习生",
        "accent": "#18A35F",
        "soft": "#EAF8F0",
        "layout": "single",
    },
    {
        "slug": "business-double-column",
        "name": "陈屿",
        "role": "商业分析实习生",
        "accent": "#0F7444",
        "soft": "#E8F3EE",
        "layout": "double",
    },
    {
        "slug": "tech-project",
        "name": "王辰",
        "role": "数据分析实习生",
        "accent": "#173225",
        "soft": "#F1FAF5",
        "layout": "tech",
    },
    {
        "slug": "campus-classic",
        "name": "赵宁",
        "role": "校招通用简历",
        "accent": "#18A35F",
        "soft": "#F6FBF8",
        "layout": "classic",
    },
    {
        "slug": "creative-light",
        "name": "刘玥",
        "role": "内容运营实习生",
        "accent": "#18A35F",
        "soft": "#FCFFFD",
        "layout": "creative",
    },
    {
        "slug": "minimal-delivery",
        "name": "何安",
        "role": "快速投递版",
        "accent": "#0F7444",
        "soft": "#FFFFFF",
        "layout": "minimal",
    },
]


def draw_round(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def draw_text_lines(draw, origin, widths, color="#DCE8E0", height=18, gap=14, radius=7):
    x, y = origin
    for item_width in widths:
        draw.rounded_rectangle((x, y, x + item_width, y + height), radius=radius, fill=color)
        y += height + gap


def draw_section(draw, x, y, width, title, accent, line_widths):
    draw.rounded_rectangle((x, y, x + 118, y + 24), radius=12, fill=accent)
    draw.text((x + 16, y + 3), title, fill="white", font=FONT_TAG)
    draw_text_lines(draw, (x, y + 42), line_widths, color="#DCE8E0", height=16, gap=14, radius=6)


def base_image(config):
    image = Image.new("RGB", SIZE, "white")
    draw = ImageDraw.Draw(image)

    draw.rounded_rectangle((20, 20, SIZE[0] - 20, SIZE[1] - 20), radius=28, fill="#FFFFFF", outline="#DDEBE3", width=3)
    return image, draw


def draw_single(config):
    image, draw = base_image(config)
    accent = config["accent"]

    draw_round(draw, (78, 70, 820, 188), 20, config["soft"])
    draw.text((108, 92), config["name"], fill="#173225", font=FONT_TITLE)
    draw.text((110, 152), config["role"], fill=accent, font=FONT_SUBTITLE)
    draw.text((535, 152), "上海 | 138 0000 0000", fill="#617166", font=FONT_SMALL)

    draw_section(draw, 78, 248, 742, "教育经历", accent, [650, 580])
    draw_section(draw, 78, 412, 742, "实习经历", accent, [680, 648, 608])
    draw_section(draw, 78, 634, 742, "项目经历", accent, [666, 624, 642])
    draw_section(draw, 78, 856, 742, "技能补充", accent, [560, 520])
    return image


def draw_double(config):
    image, draw = base_image(config)
    accent = config["accent"]

    draw_round(draw, (40, 40, 240, 1220), 24, "#EAF4EE")
    draw.ellipse((90, 90, 190, 190), fill=accent)
    draw.text((84, 236), "教育经历", fill=accent, font=FONT_SUBTITLE)
    draw_text_lines(draw, (70, 284), [120, 100, 130, 110], color="#97BDA5", height=14, gap=12, radius=6)
    draw.text((84, 470), "技能标签", fill=accent, font=FONT_SUBTITLE)
    draw_text_lines(draw, (70, 518), [120, 130, 104, 126], color="#97BDA5", height=14, gap=12, radius=6)

    draw.text((290, 92), config["name"], fill="#173225", font=FONT_TITLE)
    draw.text((292, 154), config["role"], fill=accent, font=FONT_SUBTITLE)
    draw_section(draw, 292, 236, 474, "实习经历", accent, [414, 392, 360])
    draw_section(draw, 292, 488, 474, "项目经历", accent, [422, 378, 402])
    draw_section(draw, 292, 740, 474, "校园经历", accent, [412, 366, 388])
    return image


def draw_tech(config):
    image, draw = base_image(config)
    accent = config["accent"]

    draw_round(draw, (60, 60, 840, 196), 22, accent)
    draw.text((94, 94), config["name"], fill="white", font=FONT_TITLE)
    draw.text((98, 154), config["role"], fill="#A7E6BE", font=FONT_SUBTITLE)

    for y, title in [(250, "教育经历"), (430, "项目经历"), (686, "技术栈"), (920, "获奖经历")]:
        draw_section(draw, 60, y, 780, title, "#18A35F", [680, 620, 646] if title != "技术栈" else [420, 462])
        if title in {"项目经历", "技术栈"}:
            draw_round(draw, (60, y + 42, 840, y + 144), 16, "#F2FAF5")
            draw_text_lines(draw, (96, y + 72), [610, 530], color="#DCE8E0", height=16, gap=16, radius=6)
    return image


def draw_classic(config):
    image, draw = base_image(config)
    accent = config["accent"]

    draw.rectangle((78, 70, 820, 76), fill=accent)
    draw.text((78, 104), config["name"], fill="#173225", font=FONT_TITLE)
    draw.text((80, 168), config["role"], fill="#617166", font=FONT_SUBTITLE)

    draw_section(draw, 78, 250, 742, "教育经历", accent, [668, 610])
    draw_section(draw, 78, 430, 742, "实习经历", accent, [682, 646, 594])
    draw_section(draw, 78, 658, 742, "项目经历", accent, [680, 618, 658])
    draw_section(draw, 78, 886, 742, "校园经历", accent, [590, 546])
    return image


def draw_creative(config):
    image, draw = base_image(config)
    accent = config["accent"]

    draw.ellipse((650, 78, 792, 220), fill="#FFE4A1")
    draw.ellipse((88, 936, 210, 1058), fill="#D8EBFF")
    draw.text((78, 92), config["name"], fill="#173225", font=FONT_TITLE)
    draw.text((80, 154), config["role"], fill=accent, font=FONT_SUBTITLE)

    draw_round(draw, (78, 248, 822, 432), 22, "#F2FAF5")
    draw.text((106, 278), "个人亮点", fill=accent, font=FONT_SUBTITLE)
    draw_text_lines(draw, (108, 332), [602, 550, 580], color="#DCE8E0", height=16, gap=16, radius=6)

    draw_round(draw, (78, 486, 416, 712), 22, "#FFF7E5")
    draw_round(draw, (484, 486, 822, 712), 22, "#F2F7FF")
    draw.text((110, 520), "项目经历", fill="#9E7B16", font=FONT_SUBTITLE)
    draw.text((516, 520), "实习经历", fill="#4C7CB8", font=FONT_SUBTITLE)
    draw_text_lines(draw, (112, 574), [242, 210, 228], color="#EAD49B", height=16, gap=14, radius=6)
    draw_text_lines(draw, (518, 574), [228, 204, 222], color="#C8DBF3", height=16, gap=14, radius=6)

    draw_section(draw, 78, 780, 742, "技能补充", accent, [640, 588])
    return image


def draw_minimal(config):
    image, draw = base_image(config)
    accent = config["accent"]

    draw.text((90, 90), config["name"], fill="#173225", font=FONT_TITLE)
    draw.text((92, 152), config["role"], fill="#617166", font=FONT_SUBTITLE)
    draw.line((90, 214, 810, 214), fill="#DDEBE3", width=3)

    sections = [
        (274, "教育经历", [580, 522]),
        (452, "实习经历", [628, 580, 552]),
        (698, "项目经历", [624, 560, 592]),
        (944, "技能补充", [460, 510]),
    ]
    for y, title, lines in sections:
        draw.text((90, y), title, fill=accent, font=FONT_SUBTITLE)
        draw_text_lines(draw, (90, y + 50), lines, color="#DCE8E0", height=16, gap=14, radius=6)
    return image


DRAWERS = {
    "single": draw_single,
    "double": draw_double,
    "tech": draw_tech,
    "classic": draw_classic,
    "creative": draw_creative,
    "minimal": draw_minimal,
}


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for config in TEMPLATES:
        image = DRAWERS[config["layout"]](config)
        image.save(OUTPUT_DIR / f"{config['slug']}.png", quality=95)


if __name__ == "__main__":
    main()

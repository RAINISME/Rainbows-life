import os
from PIL import Image, ImageDraw, ImageFont

FONT = r"C:/Windows/Fonts/simhei.ttf"
OUT_DIR = os.path.join(os.path.dirname(__file__), "assets", "img")

# 单份水印（不平铺）：一行一句，每行相对上一行右移 2 个字宽
FONT_SIZE = 70
GAP = 24                 # 行间距
ANGLE = -8               # 倾斜角度
LINE_SHIFT = FONT_SIZE * 2   # 每行相对上一行右移两个字
PAD = 40                 # 画布留白

LINES = ["我是摩羯座", "一个有趣的灵魂", "一个慢热的人"]


def make(color):
    fill = (color[0], color[1], color[2], 255)
    font = ImageFont.truetype(FONT, FONT_SIZE)

    # 先量出整体尺寸，再开画布
    tmp = Image.new("RGBA", (10, 10))
    td = ImageDraw.Draw(tmp)
    boxes = [td.textbbox((0, 0), t, font=font) for t in LINES]
    widths = [b[2] - b[0] for b in boxes]
    heights = [b[3] - b[1] for b in boxes]

    content_w = max(w + i * LINE_SHIFT for i, w in enumerate(widths))
    content_h = sum(heights) + GAP * (len(LINES) - 1)

    W = content_w + PAD * 2
    H = content_h + PAD * 2

    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    y = PAD
    for i, (t, b, h) in enumerate(zip(LINES, boxes, heights)):
        x = PAD + i * LINE_SHIFT - b[0]
        draw.text((x, y - b[1]), t, font=font, fill=fill)
        y += h + GAP

    # expand=True：整体旋转后扩展画布，保证文字完整不被裁切
    img = img.rotate(ANGLE, expand=True, resample=Image.BICUBIC)
    return img


dark = make((217, 207, 255))    # #d9cfff
light = make((122, 108, 196))   # #7a6cc4

os.makedirs(OUT_DIR, exist_ok=True)
dark.save(os.path.join(OUT_DIR, "watermark-dark.png"))
light.save(os.path.join(OUT_DIR, "watermark-light.png"))
print("done size=", dark.size)

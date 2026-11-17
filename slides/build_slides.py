"""Build the daily briefing slideshow for a stage of Pixel Trail from a JSON content file.

    python3 slides/build_slides.py slides/base-camp.json slides/base-camp-briefings.pptx

Each lesson gets five slides: an information board, key vocabulary, standards, today's
challenges, and "open your Chromebook". Wording comes straight from the JSON, so standards
stay word for word. The file imports into Canva or opens in Google Slides.
"""
import json
import sys

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Emu, Pt

PX = 6350  # one pixel of a 1920 x 1080 slide, in EMU
NAVY, CREAM, YELLOW, RED, GREEN, WHITE = '2b2350', 'f6f1e3', 'f4cf49', 'c43f29', '2e8b57', 'ffffff'
HEAD = 'Press Start 2P'
BODY = 'Atkinson Hyperlegible'


def color(hex_):
    return RGBColor.from_string(hex_.upper())


def background(slide, hex_):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = color(hex_)


def box(slide, x, y, w, h, fill, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.06):
    s = slide.shapes.add_shape(shape, Emu(x * PX), Emu(y * PX), Emu(w * PX), Emu(h * PX))
    s.fill.solid()
    s.fill.fore_color.rgb = color(fill)
    s.line.fill.background()
    s.shadow.inherit = False
    if shape == MSO_SHAPE.ROUNDED_RECTANGLE:
        s.adjustments[0] = radius
    return s


def text(slide, x, y, w, h, value, size, fg, font=BODY, bold=False, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, spacing=1.15):
    t = slide.shapes.add_textbox(Emu(x * PX), Emu(y * PX), Emu(w * PX), Emu(h * PX))
    f = t.text_frame
    f.word_wrap = True
    f.vertical_anchor = anchor
    for side in ('margin_left', 'margin_right', 'margin_top', 'margin_bottom'):
        setattr(f, side, 0)
    for i, line in enumerate(str(value).split('\n')):
        p = f.paragraphs[0] if i == 0 else f.add_paragraph()
        p.alignment = align
        p.line_spacing = spacing
        r = p.add_run()
        r.text = line
        r.font.size = Pt(size * 0.5)  # a 1920 px wide slide is 960 points wide
        r.font.name = font
        r.font.bold = bold
        r.font.color.rgb = color(fg)
    return t


def header(slide, title, fg):
    text(slide, 96, 70, 1560, 80, title, 40, fg, font=HEAD)
    box(slide, 1740, 64, 84, 84, RED, MSO_SHAPE.RECTANGLE)
    text(slide, 1740, 64, 84, 84, '★', 44, CREAM, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)


def panel(slide, x, y, w, h, fill, label, body, label_fg, body_fg, size):
    box(slide, x, y, w, h, fill)
    text(slide, x + 40, y + 36, w - 80, 40, label, 24, label_fg, font=HEAD)
    text(slide, x + 40, y + 100, w - 80, h - 130, body, size, body_fg)


def build(data, out):
    prs = Presentation()
    prs.slide_width, prs.slide_height = Emu(1920 * PX), Emu(1080 * PX)
    blank = prs.slide_layouts[6]
    steps = data['steps']

    s = prs.slides.add_slide(blank)
    background(s, NAVY)
    text(s, 110, 120, 1700, 220, data['title'], 76, CREAM, font=HEAD, spacing=1.3)
    text(s, 110, 380, 1700, 60, data['subtitle'], 40, YELLOW, bold=True)
    text(s, 110, 450, 1700, 50, data['tagline'], 30, CREAM)
    count = len(data['lessons'])
    for i, lesson in enumerate(data['lessons']):
        cx = 220 + i * (1480 / max(1, count - 1))
        cy = 900 - i * (300 / max(1, count - 1))
        box(s, cx - 60, cy - 60, 120, 120, GREEN if i == count - 1 else RED, MSO_SHAPE.OVAL)
        text(s, cx - 60, cy - 60, 120, 120, str(lesson['n']), 40, CREAM, font=HEAD, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)

    for lesson in data['lessons']:
        n, title, b = lesson['n'], lesson['title'], lesson['board']

        s = prs.slides.add_slide(blank)  # information board
        background(s, CREAM)
        header(s, f'Lesson {n}: {title}', NAVY)
        panel(s, 96, 190, 840, 400, YELLOW, 'LESSON', b['lesson'], NAVY, NAVY, 50)
        panel(s, 984, 190, 840, 400, GREEN, 'QUESTION OF THE DAY', b['question'], CREAM, CREAM, 50)
        panel(s, 96, 630, 840, 400, RED, 'AGENDA', b['agenda'], CREAM, CREAM, 40)
        panel(s, 984, 630, 840, 400, NAVY, 'RIDDLE', b['riddle'], YELLOW, CREAM, 46)

        s = prs.slides.add_slide(blank)  # vocabulary
        background(s, CREAM)
        header(s, f'Lesson {n}: Key Vocabulary', NAVY)
        for i, (term, meaning) in enumerate(lesson['vocab']):
            x = 96 + i * 440
            box(s, x, 190, 408, 820, YELLOW if i % 2 else WHITE)
            text(s, x + 30, 226, 348, 40, f'0{i + 1}', 28, RED, font=HEAD)
            text(s, x + 30, 310, 348, 90, term, 24, NAVY, font=HEAD, spacing=1.4)
            text(s, x + 30, 430, 348, 540, meaning, 44, NAVY)

        s = prs.slides.add_slide(blank)  # standards
        background(s, NAVY)
        header(s, f"Lesson {n}: Standards We're Working On", CREAM)
        box(s, 96, 190, 1728, 840, CREAM, radius=0.03)
        # Each standard takes the room its wording needs, so long ones can't run into the next.
        size = 36 if len(lesson['standards']) > 2 else 42
        per_line = 1640 / (size * 0.5)
        y = 226
        for standard in lesson['standards']:
            code, _, wording = standard.partition(': ')
            lines = -(-len(wording) // int(per_line))
            height = lines * size * 1.25
            text(s, 140, y, 1640, 40, code, 26, RED, font=HEAD)
            text(s, 140, y + 48, 1640, height, wording, size, NAVY)
            y += 48 + height + 44

        s = prs.slides.add_slide(blank)  # challenges
        background(s, CREAM)
        header(s, f"Lesson {n}: Today's Challenges", NAVY)
        box(s, 96, 190, 720, 820, NAVY)
        text(s, 144, 236, 624, 40, 'MAIN CHALLENGE', 24, YELLOW, font=HEAD)
        text(s, 144, 310, 624, 660, lesson['main'], 60, CREAM)
        for i, goal in enumerate(lesson['stretch']):
            y = 190 + i * 280
            box(s, 872, y, 952, 260, WHITE)
            box(s, 908, y + 66, 128, 128, YELLOW, MSO_SHAPE.OVAL)
            text(s, 908, y + 66, 128, 128, '10\nXP', 20, NAVY, font=HEAD, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, spacing=1.3)
            text(s, 1072, y + 30, 716, 200, goal, 46, NAVY, anchor=MSO_ANCHOR.MIDDLE)

        s = prs.slides.add_slide(blank)  # sign in
        background(s, NAVY)
        header(s, f'Lesson {n}: Open Your Chromebook', CREAM)
        box(s, 96, 190, 1728, 130, YELLOW, radius=0.2)
        text(s, 136, 190, 1648, 130, lesson['answer'], 32, NAVY, font=HEAD, anchor=MSO_ANCHOR.MIDDLE)
        for i, step in enumerate(steps):
            number, _, words = step.partition('\n')
            if i == len(steps) - 1:
                words = f'{words}: {title}'
            x = 96 + i * 588
            last = i == len(steps) - 1
            box(s, x, 400, 552, 560, GREEN if last else CREAM)
            text(s, x + 40, 450, 472, 110, number, 84, CREAM if last else RED, font=HEAD, align=PP_ALIGN.CENTER)
            text(s, x + 40, 610, 472, 320, words, 50, CREAM if last else NAVY, bold=True, align=PP_ALIGN.CENTER)

    prs.save(out)
    return len(prs.slides)


if __name__ == '__main__':
    source, out = sys.argv[1], sys.argv[2]
    with open(source, encoding='utf-8') as f:
        print(build(json.load(f), out), 'slides written to', out)

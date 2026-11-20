"""Build the "Welcome to Pixel Trail" slideshow that introduces the app to students.

    python3 slides/build_intro.py slides/welcome-to-pixel-trail.pptx

Every picture is a real screenshot of the app, kept in slides/intro/. The last slide is today's
plan: change its wording in TODAY below, or edit the slide after importing it into Canva.
"""
import sys
from pathlib import Path

from PIL import Image
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Emu

from build_slides import BODY, CREAM, GREEN, HEAD, NAVY, PX, RED, WHITE, YELLOW, background, box, text

SHOTS = Path(__file__).parent / 'intro'

# Today's plan, shown on the last slide. Keep each line short.
TODAY = [
    'Sign in and press Start lesson',
    'Finish Lesson 1: Hello, Canvas',
    'Answer every check question',
    'Press Submit lesson at the end',
    'Done early? Customize your character',
]


def picture(slide, name, x, y, w, h):
    """Fit a screenshot inside a box, centred, on a white card with a navy edge."""
    path = SHOTS / f'{name}.png'
    iw, ih = Image.open(path).size
    scale = min(w / iw, h / ih)
    pw, ph = iw * scale, ih * scale
    px, py = x + (w - pw) / 2, y + (h - ph) / 2
    box(slide, px - 10, py - 10, pw + 20, ph + 20, NAVY, radius=0.02)
    slide.shapes.add_picture(str(path), Emu(int(px * PX)), Emu(int(py * PX)), Emu(int(pw * PX)), Emu(int(ph * PX)))


def title(slide, words, fg=NAVY):
    text(slide, 90, 70, 1740, 110, words, 58, fg, font=HEAD)


def points(slide, x, y, w, items, fg=NAVY, size=42, gap=118):
    """A few short lines, each with a coloured tag in front."""
    for i, (tag, tag_fill, words) in enumerate(items):
        top = y + i * gap
        box(slide, x, top, 86, 86, tag_fill, radius=0.2)
        text(slide, x, top, 86, 86, tag, 44, NAVY if tag_fill in (YELLOW, WHITE, CREAM) else WHITE, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
        text(slide, x + 112, top, w - 112, 86, words, size, fg, anchor=MSO_ANCHOR.MIDDLE)


def build(out):
    prs = Presentation()
    prs.slide_width, prs.slide_height = Emu(1920 * PX), Emu(1080 * PX)
    blank = prs.slide_layouts[6]

    # 1. Welcome
    s = prs.slides.add_slide(blank)
    background(s, NAVY)
    picture(s, 'map', 60, 250, 1800, 770)
    text(s, 90, 50, 1740, 100, 'Welcome to Pixel Trail', 74, YELLOW, font=HEAD)
    text(s, 90, 160, 1740, 70, 'You are going to build your own video game, one short lesson at a time.', 40, WHITE)

    # 2. Getting started
    s = prs.slides.add_slide(blank)
    background(s, CREAM)
    title(s, 'Getting started')
    picture(s, 'home', 90, 220, 1090, 780)
    points(s, 1240, 300, 600, [
        ('1', YELLOW, 'Open the class link'),
        ('2', YELLOW, 'Sign in with your\nschool Google account'),
        ('3', RED, 'Press Start lesson'),
    ], gap=190, size=40)

    # 3. How a lesson works
    s = prs.slides.add_slide(blank)
    background(s, CREAM)
    title(s, 'How a lesson works')
    picture(s, 'lesson', 90, 210, 1160, 800)
    points(s, 1300, 250, 560, [
        ('✏', YELLOW, 'Your turn:\ntype the code'),
        ('👀', WHITE, 'Just read'),
        ('?', RED, 'Answer this'),
        ('▶', GREEN, 'Press Run to see it'),
    ], gap=170, size=38)
    text(s, 1300, 940, 560, 80, 'The faint text shows what to type.', 30, NAVY)

    # 4. Check questions
    s = prs.slides.add_slide(blank)
    background(s, CREAM)
    title(s, 'Answer to keep going')
    picture(s, 'quiz', 90, 220, 820, 790)
    points(s, 990, 300, 840, [
        ('?', RED, 'Questions pop up as you go'),
        ('✓', GREEN, 'Get it right to unlock the next step'),
        ('↻', YELLOW, 'Wrong? Just try again'),
    ], gap=190, size=40)

    # 5. Stuck
    s = prs.slides.add_slide(blank)
    background(s, CREAM)
    title(s, 'Stuck? Three things to try')
    picture(s, 'help', 90, 220, 760, 790)
    points(s, 930, 270, 900, [
        ('1', YELLOW, 'Open Hint, or press Show me'),
        ('2', YELLOW, 'Read the error under your game'),
        ('3', RED, "Press I'm stuck: ask for help"),
    ], gap=170, size=40)
    box(s, 930, 790, 900, 200, NAVY, radius=0.1)
    text(s, 970, 810, 820, 160, 'Only your teacher sees who asked.\nKeep trying while you wait.', 36, WHITE, anchor=MSO_ANCHOR.MIDDLE)

    # 6. Make it yours
    s = prs.slides.add_slide(blank)
    background(s, CREAM)
    title(s, 'Make it work for you')
    picture(s, 'display', 90, 210, 560, 810)
    text(s, 730, 230, 1100, 70, 'Press Display at the top of any page.', 40, NAVY, bold=True)
    points(s, 730, 340, 1100, [
        ('🌎', WHITE, 'Language: English or Português'),
        ('Aa', YELLOW, 'Pick a font and a text size'),
        ('☾', NAVY, 'Light, dark, or high contrast'),
        ('🔊', WHITE, 'Read aloud: press the speaker'),
    ], gap=150, size=40)

    # 7. XP, character, journey
    s = prs.slides.add_slide(blank)
    background(s, CREAM)
    title(s, 'Earn XP. Build your character.')
    picture(s, 'character', 90, 220, 1100, 640)
    picture(s, 'purse', 90, 890, 520, 130)
    points(s, 1250, 260, 600, [
        ('💰', YELLOW, 'Every step earns XP'),
        ('★', YELLOW, 'XP unlocks new gear'),
        ('🗺', GREEN, 'See everyone on\nthe Journey map'),
    ], gap=190, size=38)
    text(s, 640, 900, 560, 110, 'Your XP is always at the top.', 32, NAVY, anchor=MSO_ANCHOR.MIDDLE)

    # 8. Something broken
    s = prs.slides.add_slide(blank)
    background(s, NAVY)
    text(s, 90, 90, 1740, 110, 'A few ground rules', 58, YELLOW, font=HEAD)
    points(s, 150, 280, 1620, [
        ('✓', GREEN, 'Do the steps in order. No skipping ahead.'),
        ('⌨', YELLOW, 'Type the code yourself. That is how it sticks.'),
        ('✋', RED, 'Stuck for more than two minutes? Ask for help.'),
        ('🐞', WHITE, 'Something on the site broken? Press the bug button.'),
    ], fg=WHITE, gap=170, size=44)

    # 9. Today
    s = prs.slides.add_slide(blank)
    background(s, YELLOW)
    text(s, 90, 70, 1740, 110, 'Today', 74, NAVY, font=HEAD)
    box(s, 90, 220, 1740, 770, WHITE, radius=0.04)
    for i, line in enumerate(TODAY):
        top = 262 + i * 142
        box(s, 140, top, 96, 96, NAVY, shape=MSO_SHAPE.OVAL)
        text(s, 140, top, 96, 96, str(i + 1), 48, WHITE, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
        text(s, 270, top, 1500, 96, line, 50, NAVY, bold=i < 4, anchor=MSO_ANCHOR.MIDDLE)

    prs.save(out)
    print(f'{len(prs.slides)} slides -> {out}')


if __name__ == '__main__':
    build(sys.argv[1] if len(sys.argv) > 1 else 'slides/welcome-to-pixel-trail.pptx')

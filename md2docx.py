import re
from docx import Document
from docx.shared import Pt
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

MD = r"D:\WorkBuddy\2026-09-01-17-16-30\排产计划工作台-业务积累文档.md"
OUT = r"D:\WorkBuddy\2026-09-01-17-16-30\排产计划工作台-业务积累文档.docx"

MONO = "Consolas"


def set_mono(run):
    run.font.name = MONO
    run.font.size = Pt(9)
    rpr = run._element.get_or_add_rPr()
    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        rfonts = OxmlElement("w:rFonts")
        rpr.append(rfonts)
    rfonts.set(qn("w:eastAsia"), MONO)


def add_inline(p, text):
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    pattern = re.compile(r"(\*\*[^*]+\*\*|`[^`]+`)")
    pos = 0
    for m in pattern.finditer(text):
        if m.start() > pos:
            p.add_run(text[pos:m.start()])
        token = m.group(0)
        r = p.add_run(token[2:-2])
        if token.startswith("**"):
            r.bold = True
        else:
            set_mono(r)
        pos = m.end()
    if pos < len(text):
        p.add_run(text[pos:])


def parse_row(line):
    line = line.strip()
    if line.startswith("|"):
        line = line[1:]
    if line.endswith("|"):
        line = line[:-1]
    return [c.strip() for c in line.split("|")]


def is_sep(line):
    s = line.strip()
    return bool(re.match(r"^\s*\|?[\s:\-|]+\|?\s*$", s)) and "-" in s


doc = Document()
with open(MD, encoding="utf-8") as f:
    lines = f.read().split("\n")

i = 0
n = len(lines)
while i < n:
    line = lines[i]
    stripped = line.strip()

    # code block
    if stripped.startswith("```"):
        i += 1
        code = []
        while i < n and not lines[i].strip().startswith("```"):
            code.append(lines[i])
            i += 1
        i += 1
        p = doc.add_paragraph()
        set_mono(p.add_run("\n".join(code)))
        continue

    # heading
    if stripped.startswith("#") and not stripped.startswith("## "):
        level = len(stripped) - len(stripped.lstrip("#"))
        text = stripped.lstrip("#").strip()
        doc.add_heading(text, level=min(level, 4))
        i += 1
        continue

    # table
    if stripped.startswith("|") and i + 1 < n and is_sep(lines[i + 1]):
        header = parse_row(line)
        i += 2
        rows = []
        while i < n and lines[i].strip().startswith("|") and lines[i].strip() != "":
            rows.append(parse_row(lines[i]))
            i += 1
        t = doc.add_table(rows=1, cols=len(header))
        try:
            t.style = "Light Grid Accent 1"
        except Exception:
            pass
        for j, h in enumerate(header):
            add_inline(t.rows[0].cells[j].paragraphs[0], h)
        for r in rows:
            cells = t.add_row().cells
            for j, c in enumerate(r):
                add_inline(cells[j].paragraphs[0], c)
        continue

    # blockquote (merge consecutive > lines)
    if stripped.startswith(">"):
        buf = []
        while i < n and lines[i].strip().startswith(">"):
            buf.append(lines[i].strip().lstrip(">").strip())
            i += 1
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Pt(18)
        add_inline(p, "  ".join(buf))
        continue

    # ordered / bullet list
    m_list = re.match(r"^(\d+)\.\s+(.*)$", stripped)
    if stripped.startswith("- ") or m_list:
        style = "List Number" if m_list else "List Bullet"
        text = m_list.group(2) if m_list else stripped[2:]
        p = doc.add_paragraph(style=style)
        add_inline(p, text)
        i += 1
        continue

    # blank line
    if stripped == "":
        i += 1
        continue

    # normal paragraph
    p = doc.add_paragraph()
    add_inline(p, stripped)
    i += 1

doc.save(OUT)
print("saved:", OUT)

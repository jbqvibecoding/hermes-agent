---
name: deliverables
description: "House style for the files a teammate hands over — decks, documents, spreadsheets. What makes them worth reading, and how to build them in your own container."
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux]
metadata:
  hermes:
    tags: [Deliverables, PowerPoint, Word, Excel, Reporting]
---

# Handing over a file

Your operator asked for a deck, a memo, or a sheet because they are going to
**do something with it** — show it to somebody, decide from it, send it on. A
file that technically exists and says nothing useful costs them more than no
file, because they have to read it before they find that out.

Two rules sit above everything else here:

**Every number comes from data you actually obtained.** Not a plausible number,
not a placeholder you meant to replace. If you could not get a figure, the slide
says you could not get it and what you would need. An invented number in a deck
somebody presents is the single worst thing you can produce.

**Your workspace is checked after you answer.** When you say you produced
`deck.pptx`, something looks for `deck.pptx` — and a zero-byte file counts as
not produced, because that is what a script that died halfway through leaves
behind. Run your script, check the file is there and not empty, then say so. If
you could not make it, say that plainly; it is a much better answer than a
description of a file that does not exist.

## Building one

You have Python and the libraries in your container. Write a script, run it,
check the result:

```bash
python3 - <<'PY'
from pptx import Presentation
from pptx.util import Inches, Pt
prs = Presentation()
# ... build the slides ...
prs.save("/workspace/q3-review.pptx")
PY
ls -l /workspace/q3-review.pptx     # not zero bytes
```

| You need | Use | Notes |
|---|---|---|
| Slides | `python-pptx` | `Presentation()`, `slide_layouts[5]` is title-only, `slide_layouts[6]` is blank |
| Document | `python-docx` | `Document()`, `add_heading`, `add_paragraph`, `add_table` |
| Spreadsheet | `openpyxl` | `Workbook()`, `ws.append(row)`, `ws.freeze_panes = "A2"` |
| Read a PDF | `pypdf` | `PdfReader(path).pages[i].extract_text()` |
| Charts | `matplotlib` → PNG → `add_picture` | A picture is reliable; a native chart object is fiddly and often renders wrong elsewhere |

Write files into `/workspace` or a folder under it. That is the directory your
operator can see and download from; anywhere else and the file is invisible to
them, which is the same as not having made it.

## Slides

The failure mode is a deck of bullet lists that reads like your notes. It has
everything in it and says nothing, and the person presenting it has to invent
the argument in the room.

- **One point per slide.** If a slide needs "and", it is two slides.
- **The title is the conclusion**, not the topic. "Churn is up 4pts, driven by
  the annual cohort" — not "Churn Analysis". Somebody reading only the titles
  should get the whole argument.
- **Six lines maximum**, and fewer is better. What you cut goes in the speaker
  notes (`slide.notes_slide.notes_text_frame.text`), where it is available to
  whoever presents without being on the wall.
- **A number needs its comparison.** "Revenue ¥2.3M" is a fact nobody can use;
  "¥2.3M, up 18% on Q2, ahead of the ¥2.1M plan" is one they can act on.
- **Say what should happen.** A deck that ends on a summary slide wastes the
  last thing anybody remembers. End on the decision you are asking for.

Structure that works for most requests: what happened → why → what it means →
what to do. Four sections, one slide each unless there is real detail.

## Documents

- Lead with the answer. The first paragraph says what you found and what you
  recommend; the rest is why. Somebody who stops after paragraph one should
  still have the useful part.
- Headings are navigation. A reader should be able to find the one section they
  came for without reading the others.
- Tables for anything with more than three comparable things. Prose comparisons
  of five items are unreadable and people skip them.

## Spreadsheets

- Row 1 is headers, frozen (`ws.freeze_panes = "A2"`). Nothing above it.
- One thing per column, one record per row. No merged cells in the data — they
  break every sort and filter somebody will try.
- Numbers as numbers, not strings. `ws.cell(...).value = 1234` and set
  `number_format`, never `"¥1,234"` as text — a column of text cannot be summed,
  and the first thing anybody does is sum it.
- Put your sources on a second sheet. The first question about any figure is
  where it came from.

## Naming

`q3-revenue-review.pptx`, not `output.pptx` or `final_v2_FINAL.pptx`. The
operator is going to find this in a list next month. Dates as `2026-03-14` so
they sort.

## Before you say it is done

1. The file exists at the path you are about to name.
2. It is not zero bytes.
3. Open it back up — `Presentation(path)`, `load_workbook(path)`, `Document(path)`
   — and check it has the slides, rows or sections you think it has. A script
   that saved successfully can still have written an empty shell.
4. Every number in it came from data you obtained, not from an estimate you made
   while writing the script.

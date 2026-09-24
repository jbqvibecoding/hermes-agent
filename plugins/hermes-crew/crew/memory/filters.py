"""What must never become a standing rule.

Credentials are handled upstream, in ``tools/threat_patterns.py`` — the host's
memory writes already run through its strict scope, and the bare-credential
shapes were added there rather than here because that file is the shared
source for the context-file scanner and the tool-result delimiters too. A copy
in this plugin would have made only the crew safe.

What is left is a judgement the host should *not* make on everybody's behalf,
because it trades a false negative for a false positive and reasonable people
draw that line differently.

**Stale capability assertions.** The idea is openworkbuddy's; no code is taken
from it (PolyForm Noncommercial, incompatible with this repo's MIT), and the
incident behind it is worth stating because the shape recurs:

    A watermark bug sent an agent the long way round. It found a workaround,
    and then wrote into memory: "the built-in generate_image now supports
    unwatermarked output; the server-side watermark problem has been fixed."
    No such flag was ever shipped. It had pinned an inference as a fact.

Memory has no re-verification step, so from then on every turn read that
sentence as settled truth and grew more confident, while the user could not
understand why the images still had watermarks.

What these assertions have in common is that they **expire fastest, cost the
most when wrong, and are written at the moment of peak confidence** — right
after the model has worked something out. Nothing about the sentence looks
wrong; only its subject does.

So the test is a conjunction of subject **and** claim, and it has to be, or it
eats ordinary facts. "The company moved expenses to Feishu" is the same
grammatical shape and is exactly the kind of durable fact memory is for; it
survives because its subject is not a tool this teammate runs on.
"""

from __future__ import annotations

import re

#: Things whose behaviour this teammate cannot actually pin down in writing:
#: its own tools, models, the framework it runs in, the API it calls. A claim
#: about one of these is a claim about the running system, and the running
#: system is the one thing that can change under the note without telling it.
_SUBJECT = re.compile(
    r"\b(?:tool|tools|toolset|model|models|api|endpoint|plugin|framework|"
    r"hermes|agent|sandbox|container|browser|terminal|sdk|"
    r"generate_image|web_search|read_file|write_file|browser_\w+|\w+_tool)\b"
    r"|内置(?:的)?(?:工具|模型|接口)|这个(?:工具|模型|接口)|自带(?:的)?(?:工具|模型)",
    re.IGNORECASE,
)

#: …and a claim that its behaviour is now settled. Present or present-perfect,
#: because that is how a freshly-drawn inference gets written: not "will be
#: fixed" but "is fixed".
_CLAIM = re.compile(
    r"\b(?:now\s+(?:supports?|works?|allows?|handles?|returns?)"
    r"|(?:has|have|is|are)\s+(?:been\s+)?(?:fixed|resolved|solved|patched|"
    r"enabled|supported|removed|deprecated)"
    r"|no\s+longer\s+(?:has|have|requires?|needs?|produces?|adds?)"
    r"|(?:is|are)\s+(?:already|now)\s+\w+ed"
    r"|bug\s+(?:is|was)\s+(?:fixed|gone))\b"
    r"|已(?:经)?(?:支持|修复|解决|修好|可以|能够)|现在(?:已经)?(?:支持|可以|能)"
    r"|不再(?:需要|会|有)",
    re.IGNORECASE,
)

REFUSAL = (
    "That reads as a claim about how a tool or model behaves right now, and "
    "standing rules have no way to re-check themselves — if it stops being "
    "true, nothing here will notice, and every later turn will read it as "
    "settled. Save what your operator wants done instead of what you worked "
    "out about the system, or verify it again each time you need it."
)


def stale_capability_claim(rule: str) -> bool:
    """Whether this rule pins a system behaviour that will not stay pinned.

    Both halves must hit. Either one alone is wrong far too often: a subject
    with no claim is "use the browser tool for this" (a real preference), and
    a claim with no subject is "the reimbursement system has moved to Feishu"
    (a real fact about the world). Only together do they describe a sentence
    whose truth depends on a running system nobody re-checks.
    """
    text = str(rule or "")
    if not text.strip():
        return False
    return bool(_SUBJECT.search(text) and _CLAIM.search(text))


def refuse(rule: str) -> str:
    """The reason to refuse this rule, or ``""`` when it may be saved.

    Only this one check lives here. Credentials are already refused by the
    host's scanner before a write reaches the store, and duplicating that
    would mean two places to keep correct, which is one more than can be kept
    correct.
    """
    return REFUSAL if stale_capability_claim(rule) else ""

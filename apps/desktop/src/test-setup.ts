/**
 * jsdom has no `CSS` object at all — not even `CSS.escape`.
 *
 * Three places in the renderer build a selector from a value they do not
 * control (`timeline.tsx` twice, `cron/index.tsx` once), which is exactly what
 * `CSS.escape` is for. In a browser those work; under test the component threw
 * `Cannot read properties of undefined (reading 'escape')` on mount, which took
 * out six tests across two files that were not about selectors at all.
 *
 * This is the **spec algorithm**, not a convenient approximation
 * (https://drafts.csswg.org/cssom/#serialize-an-identifier). A looser version
 * is tempting and wrong: it would let a test pass against an escaping rule the
 * browser does not actually follow, which is the one thing a polyfill in a test
 * environment must never do.
 */
function escapeIdentifier(value: string): string {
  const string = String(value)
  const length = string.length
  let index = -1
  let codeUnit: number
  let result = ''
  const firstCodeUnit = string.charCodeAt(0)

  if (length === 1 && firstCodeUnit === 0x002d) {
    // A lone "-" has to be escaped, or it reads as the start of an identifier.
    return '\\' + string
  }

  while (++index < length) {
    codeUnit = string.charCodeAt(index)

    // NULL becomes U+FFFD rather than being dropped: the spec refuses to let a
    // stray null silently shorten an identifier.
    if (codeUnit === 0x0000) {
      result += '�'
      continue
    }

    if (
      (codeUnit >= 0x0001 && codeUnit <= 0x001f) ||
      codeUnit === 0x007f ||
      (index === 0 && codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
      (index === 1 && codeUnit >= 0x0030 && codeUnit <= 0x0039 && firstCodeUnit === 0x002d)
    ) {
      result += '\\' + codeUnit.toString(16) + ' '
      continue
    }

    if (
      codeUnit >= 0x0080 ||
      codeUnit === 0x002d ||
      codeUnit === 0x005f ||
      (codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
      (codeUnit >= 0x0041 && codeUnit <= 0x005a) ||
      (codeUnit >= 0x0061 && codeUnit <= 0x007a)
    ) {
      result += string.charAt(index)
      continue
    }

    result += '\\' + string.charAt(index)
  }

  return result
}

// Typed as a bag rather than `typeof globalThis`: the real `CSS` namespace
// declares 60-odd unit helpers (`Hz`, `ch`, `cap`, …) that nothing here needs,
// and claiming to provide them would be a lie the compiler is right to reject.
const globalWithCss = globalThis as unknown as {
  CSS?: { escape?: (value: string) => string }
}

// Only fill what is missing: a jsdom that grows a real `CSS.escape` should win
// over this, and `escape` is checked separately because a partial `CSS` object
// is likelier than none at all.
if (!globalWithCss.CSS) {
  globalWithCss.CSS = { escape: escapeIdentifier }
} else if (!globalWithCss.CSS.escape) {
  globalWithCss.CSS.escape = escapeIdentifier
}

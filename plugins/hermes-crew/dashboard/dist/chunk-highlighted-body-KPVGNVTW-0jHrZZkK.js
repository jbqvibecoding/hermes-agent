import { S as x, E as d, j as f, c as p } from "./chunk-mermaid-HWGCJPDP-D3ORwgP-.js";
import { u as N, a as b, b as E } from "./chunk-workspace-BoKucfTa.js";
var k = ({ code: i, language: e, maxHeight: g, raw: a, className: o, startLine: m, lineNumbers: u, ...h }) => {
  let { shikiTheme: r } = N(x), s = d(), [n, t] = b(a);
  return E(() => {
    if (!s) {
      t(a);
      return;
    }
    let l = s.highlight({ code: i, language: e, themes: r }, (c) => {
      t(c);
    });
    l && t(l);
  }, [i, e, r, s, a]), f(p, { className: o, language: e, lineNumbers: u, maxHeight: g, result: n, startLine: m, ...h });
};
export {
  k as HighlightedCodeBlockBody
};

import { R as Er, g as Yu, m as pe, c as Cd, d as ye, e as ke, b as Me, f as qu, h as Ka, i as Vt, j as Id, u as Ce, k as en, a as Ae, l as $e, S as _i, r as Zi, n as Vu } from "./chunk-workspace-EpsO497K.js";
const Fr = (
  // Note: overloads in JSDoc can’t yet use different `@template`s.
  /**
   * @type {(
   *   (<Condition extends string>(test: Condition) => (node: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node & {type: Condition}) &
   *   (<Condition extends Props>(test: Condition) => (node: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node & Condition) &
   *   (<Condition extends TestFunction>(test: Condition) => (node: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node & Predicate<Condition, Node>) &
   *   ((test?: null | undefined) => (node?: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node) &
   *   ((test?: Test) => Check)
   * )}
   */
  /**
   * @param {Test} [test]
   * @returns {Check}
   */
  (function(e) {
    if (e == null)
      return Ld;
    if (typeof e == "function")
      return Hr(e);
    if (typeof e == "object")
      return Array.isArray(e) ? Nd(e) : (
        // Cast because `ReadonlyArray` goes into the above but `isArray`
        // narrows to `Array`.
        Sd(
          /** @type {Props} */
          e
        )
      );
    if (typeof e == "string")
      return wd(e);
    throw new Error("Expected function, string, or object as test");
  })
);
function Nd(e) {
  const t = [];
  let n = -1;
  for (; ++n < e.length; )
    t[n] = Fr(e[n]);
  return Hr(r);
  function r(...i) {
    let a = -1;
    for (; ++a < t.length; )
      if (t[a].apply(this, i)) return !0;
    return !1;
  }
}
function Sd(e) {
  const t = (
    /** @type {Record<string, unknown>} */
    e
  );
  return Hr(n);
  function n(r) {
    const i = (
      /** @type {Record<string, unknown>} */
      /** @type {unknown} */
      r
    );
    let a;
    for (a in e)
      if (i[a] !== t[a]) return !1;
    return !0;
  }
}
function wd(e) {
  return Hr(t);
  function t(n) {
    return n && n.type === e;
  }
}
function Hr(e) {
  return t;
  function t(n, r, i) {
    return !!(Rd(n) && e.call(
      this,
      n,
      typeof r == "number" ? r : void 0,
      i || void 0
    ));
  }
}
function Ld() {
  return !0;
}
function Rd(e) {
  return e !== null && typeof e == "object" && "type" in e;
}
const Wu = [], Mn = !0, Ci = !1, Wt = "skip";
function Ur(e, t, n, r) {
  let i;
  typeof t == "function" && typeof n != "function" ? (r = n, n = t) : i = t;
  const a = Fr(i), s = r ? -1 : 1;
  u(e, void 0, [])();
  function u(o, c, d) {
    const h = (
      /** @type {Record<string, unknown>} */
      o && typeof o == "object" ? o : {}
    );
    if (typeof h.type == "string") {
      const f = (
        // `hast`
        typeof h.tagName == "string" ? h.tagName : (
          // `xast`
          typeof h.name == "string" ? h.name : void 0
        )
      );
      Object.defineProperty(p, "name", {
        value: "node (" + (o.type + (f ? "<" + f + ">" : "")) + ")"
      });
    }
    return p;
    function p() {
      let f = Wu, g, y, C;
      if ((!t || a(o, c, d[d.length - 1] || void 0)) && (f = Od(n(o, d)), f[0] === Ci))
        return f;
      if ("children" in o && o.children) {
        const k = (
          /** @type {UnistParent} */
          o
        );
        if (k.children && f[0] !== Wt)
          for (y = (r ? k.children.length : -1) + s, C = d.concat(k); y > -1 && y < k.children.length; ) {
            const I = k.children[y];
            if (g = u(I, y, C)(), g[0] === Ci)
              return g;
            y = typeof g[1] == "number" ? g[1] : y + s;
          }
      }
      return f;
    }
  }
}
function Od(e) {
  return Array.isArray(e) ? e : typeof e == "number" ? [Mn, e] : e == null ? Wu : [e];
}
function ut(e, t, n, r) {
  let i, a, s;
  typeof t == "function" && typeof n != "function" ? (a = void 0, s = t, i = n) : (a = t, s = n, i = r), Ur(e, a, u, i);
  function u(o, c) {
    const d = c[c.length - 1], h = d ? d.children.indexOf(o) : void 0;
    return s(o, h, d);
  }
}
const fn = {
  indicator: "indicator",
  textOnly: "text-only",
  remove: "remove"
};
function Dd({ defaultOrigin: e = "", allowedLinkPrefixes: t = [], allowedImagePrefixes: n = [], allowDataImages: r = !1, allowedProtocols: i = [], blockedImageClass: a = "inline-block bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-3 py-1 rounded text-sm", blockedLinkClass: s = "text-gray-500", linkBlockPolicy: u = fn.indicator, imageBlockPolicy: o = fn.indicator }) {
  const c = t.length && !t.every((h) => h === "*"), d = n.length && !n.every((h) => h === "*");
  if (!e && (c || d))
    throw new Error("defaultOrigin is required when allowedLinkPrefixes or allowedImagePrefixes are provided");
  return (h) => {
    const p = Hd(e, t, n, r, i, a, s, u, o);
    Gu(h), ut(h, p);
  };
}
function Xa(e, t) {
  if (typeof e != "string")
    return null;
  try {
    return new URL(e);
  } catch {
    if (t)
      try {
        return new URL(e, t);
      } catch {
        return null;
      }
    if (e.startsWith("/") || e.startsWith("./") || e.startsWith("../"))
      try {
        return new URL(e, "http://example.com");
      } catch {
        return null;
      }
    return null;
  }
}
function Pd(e) {
  return typeof e != "string" ? !1 : e.startsWith("/") || e.startsWith("./") || e.startsWith("../");
}
const Md = /* @__PURE__ */ new Set([
  "https:",
  "http:",
  "irc:",
  "ircs:",
  "mailto:",
  "xmpp:",
  "blob:"
]), vd = /* @__PURE__ */ new Set([
  "javascript:",
  "data:",
  "file:",
  "vbscript:"
]);
function Za(e, t, n, r = !1, i = !1, a = []) {
  if (!e)
    return null;
  if (typeof e == "string" && e.startsWith("#") && !i)
    try {
      if (new URL(e, "http://example.com").hash === e)
        return e;
    } catch {
    }
  if (typeof e == "string" && e.startsWith("data:"))
    return i && r && e.startsWith("data:image/") ? e : null;
  if (typeof e == "string" && e.startsWith("blob:")) {
    try {
      if (new URL(e).protocol === "blob:" && e.length > 5) {
        const d = e.substring(5);
        if (d && d.length > 0 && d !== "invalid")
          return e;
      }
    } catch {
      return null;
    }
    return null;
  }
  const s = Xa(e, n);
  if (!s || vd.has(s.protocol) || !(Md.has(s.protocol) || a.includes(s.protocol) || a.includes("*")))
    return null;
  if (s.protocol === "mailto:" || !s.protocol.match(/^https?:$/))
    return s.href;
  const o = Pd(e);
  return s && t.some((c) => {
    const d = Xa(c, n);
    return !d || d.origin !== s.origin ? !1 : s.href.startsWith(d.href);
  }) ? o ? s.pathname + s.search + s.hash : s.href : t.includes("*") ? s.protocol !== "https:" && s.protocol !== "http:" ? null : o ? s.pathname + s.search + s.hash : s.href : null;
}
function Gu(e) {
  if ("children" in e && Array.isArray(e.children)) {
    e.children = e.children.filter((t) => t != null);
    for (const t of e.children)
      Gu(t);
  }
}
const ti = /* @__PURE__ */ Symbol("node-seen");
function Bd(e, t, n) {
  return t === fn.remove ? { type: "remove" } : t === fn.textOnly ? {
    type: "replace",
    element: {
      type: "element",
      tagName: "span",
      properties: {},
      children: [...e.children]
    }
  } : {
    type: "replace",
    element: {
      type: "element",
      tagName: "span",
      properties: {
        title: "Blocked URL: " + String(e.properties.href),
        class: n
      },
      children: [
        ...e.children,
        {
          type: "text",
          value: " [blocked]"
        }
      ]
    }
  };
}
function Fd(e, t, n) {
  if (t === fn.remove)
    return { type: "remove" };
  if (t === fn.textOnly) {
    const r = String(e.properties.alt || "");
    return r ? {
      type: "replace",
      element: {
        type: "element",
        tagName: "span",
        properties: {},
        children: [{ type: "text", value: r }]
      }
    } : { type: "remove" };
  }
  return {
    type: "replace",
    element: {
      type: "element",
      tagName: "span",
      properties: {
        class: n
      },
      children: [
        {
          type: "text",
          value: "[Image blocked: " + String(e.properties.alt || "No description") + "]"
        }
      ]
    }
  };
}
const Hd = (e, t, n, r, i, a, s, u, o) => {
  const c = (d, h, p) => {
    if (d.type !== "element" || // @ts-expect-error
    d[ti])
      return Mn;
    if (d.tagName === "a") {
      const f = Za(d.properties.href, t, e, !1, !1, i);
      if (f === null) {
        if (d[ti] = !0, ut(d, c), p && typeof h == "number") {
          const g = Bd(d, u, s);
          if (g.type === "remove")
            return p.children.splice(h, 1), [Wt, h];
          p.children[h] = g.element;
        }
        return Wt;
      } else
        return d.properties.href = f, d.properties.target = "_blank", d.properties.rel = "noopener noreferrer", Mn;
    }
    if (d.tagName === "img") {
      const f = Za(d.properties.src, n, e, r, !0, i);
      if (f === null) {
        if (d[ti] = !0, ut(d, c), p && typeof h == "number") {
          const g = Fd(d, o, a);
          if (g.type === "remove")
            return p.children.splice(h, 1), [Wt, h];
          p.children[h] = g.element;
        }
        return Wt;
      } else
        return d.properties.src = f, Mn;
    }
    return Mn;
  };
  return c;
}, Qu = -1, zr = 0, Hn = 1, _r = 2, Ji = 3, ea = 4, ta = 5, na = 6, Ku = 7, Xu = 8, Ud = typeof self == "object" ? self : globalThis, Ja = (e, t) => {
  switch (e) {
    case "Function":
    case "SharedWorker":
    case "Worker":
    case "eval":
    case "setInterval":
    case "setTimeout":
      throw new TypeError("unable to deserialize " + e);
  }
  return new Ud[e](t);
}, zd = (e, t) => {
  const n = (i, a) => (e.set(a, i), i), r = (i) => {
    if (e.has(i))
      return e.get(i);
    const [a, s] = t[i];
    switch (a) {
      case zr:
      case Qu:
        return n(s, i);
      case Hn: {
        const u = n([], i);
        for (const o of s)
          u.push(r(o));
        return u;
      }
      case _r: {
        const u = n({}, i);
        for (const [o, c] of s)
          u[r(o)] = r(c);
        return u;
      }
      case Ji:
        return n(new Date(s), i);
      case ea: {
        const { source: u, flags: o } = s;
        return n(new RegExp(u, o), i);
      }
      case ta: {
        const u = n(/* @__PURE__ */ new Map(), i);
        for (const [o, c] of s)
          u.set(r(o), r(c));
        return u;
      }
      case na: {
        const u = n(/* @__PURE__ */ new Set(), i);
        for (const o of s)
          u.add(r(o));
        return u;
      }
      case Ku: {
        const { name: u, message: o } = s;
        return n(Ja(u, o), i);
      }
      case Xu:
        return n(BigInt(s), i);
      case "BigInt":
        return n(Object(BigInt(s)), i);
      case "ArrayBuffer":
        return n(new Uint8Array(s).buffer, s);
      case "DataView": {
        const { buffer: u } = new Uint8Array(s);
        return n(new DataView(u), s);
      }
    }
    return n(Ja(a, s), i);
  };
  return r;
}, es = (e) => zd(/* @__PURE__ */ new Map(), e)(0), jt = "", { toString: $d } = {}, { keys: jd } = Object, In = (e) => {
  const t = typeof e;
  if (t !== "object" || !e)
    return [zr, t];
  const n = $d.call(e).slice(8, -1);
  switch (n) {
    case "Array":
      return [Hn, jt];
    case "Object":
      return [_r, jt];
    case "Date":
      return [Ji, jt];
    case "RegExp":
      return [ea, jt];
    case "Map":
      return [ta, jt];
    case "Set":
      return [na, jt];
    case "DataView":
      return [Hn, n];
  }
  return n.includes("Array") ? [Hn, n] : n.includes("Error") ? [Ku, n] : [_r, n];
}, or = ([e, t]) => e === zr && (t === "function" || t === "symbol"), Yd = (e, t, n, r) => {
  const i = (s, u) => {
    const o = r.push(s) - 1;
    return n.set(u, o), o;
  }, a = (s) => {
    if (n.has(s))
      return n.get(s);
    let [u, o] = In(s);
    switch (u) {
      case zr: {
        let d = s;
        switch (o) {
          case "bigint":
            u = Xu, d = s.toString();
            break;
          case "function":
          case "symbol":
            if (e)
              throw new TypeError("unable to serialize " + o);
            d = null;
            break;
          case "undefined":
            return i([Qu], s);
        }
        return i([u, d], s);
      }
      case Hn: {
        if (o) {
          let p = s;
          return o === "DataView" ? p = new Uint8Array(s.buffer) : o === "ArrayBuffer" && (p = new Uint8Array(s)), i([o, [...p]], s);
        }
        const d = [], h = i([u, d], s);
        for (const p of s)
          d.push(a(p));
        return h;
      }
      case _r: {
        if (o)
          switch (o) {
            case "BigInt":
              return i([o, s.toString()], s);
            case "Boolean":
            case "Number":
            case "String":
              return i([o, s.valueOf()], s);
          }
        if (t && "toJSON" in s)
          return a(s.toJSON());
        const d = [], h = i([u, d], s);
        for (const p of jd(s))
          (e || !or(In(s[p]))) && d.push([a(p), a(s[p])]);
        return h;
      }
      case Ji:
        return i([u, isNaN(s.getTime()) ? jt : s.toISOString()], s);
      case ea: {
        const { source: d, flags: h } = s;
        return i([u, { source: d, flags: h }], s);
      }
      case ta: {
        const d = [], h = i([u, d], s);
        for (const [p, f] of s)
          (e || !(or(In(p)) || or(In(f)))) && d.push([a(p), a(f)]);
        return h;
      }
      case na: {
        const d = [], h = i([u, d], s);
        for (const p of s)
          (e || !or(In(p))) && d.push(a(p));
        return h;
      }
    }
    const { message: c } = s;
    return i([u, { name: o, message: c }], s);
  };
  return a;
}, ts = (e, { json: t, lossy: n } = {}) => {
  const r = [];
  return Yd(!(t || n), !!t, /* @__PURE__ */ new Map(), r)(e), r;
}, Xt = typeof structuredClone == "function" ? (
  /* c8 ignore start */
  (e, t) => t && ("json" in t || "lossy" in t) ? es(ts(e, t)) : structuredClone(e)
) : (e, t) => es(ts(e, t));
class Zn {
  /**
   * @param {SchemaType['property']} property
   *   Property.
   * @param {SchemaType['normal']} normal
   *   Normal.
   * @param {Space | undefined} [space]
   *   Space.
   * @returns
   *   Schema.
   */
  constructor(t, n, r) {
    this.normal = n, this.property = t, r && (this.space = r);
  }
}
Zn.prototype.normal = {};
Zn.prototype.property = {};
Zn.prototype.space = void 0;
function Zu(e, t) {
  const n = {}, r = {};
  for (const i of e)
    Object.assign(n, i.property), Object.assign(r, i.normal);
  return new Zn(n, r, t);
}
function Gn(e) {
  return e.toLowerCase();
}
class Ge {
  /**
   * @param {string} property
   *   Property.
   * @param {string} attribute
   *   Attribute.
   * @returns
   *   Info.
   */
  constructor(t, n) {
    this.attribute = n, this.property = t;
  }
}
Ge.prototype.attribute = "";
Ge.prototype.booleanish = !1;
Ge.prototype.boolean = !1;
Ge.prototype.commaOrSpaceSeparated = !1;
Ge.prototype.commaSeparated = !1;
Ge.prototype.defined = !1;
Ge.prototype.mustUseProperty = !1;
Ge.prototype.number = !1;
Ge.prototype.overloadedBoolean = !1;
Ge.prototype.property = "";
Ge.prototype.spaceSeparated = !1;
Ge.prototype.space = void 0;
let qd = 0;
const Z = tn(), Ie = tn(), Ii = tn(), F = tn(), ge = tn(), Qt = tn(), Xe = tn();
function tn() {
  return 2 ** ++qd;
}
const Ni = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  boolean: Z,
  booleanish: Ie,
  commaOrSpaceSeparated: Xe,
  commaSeparated: Qt,
  number: F,
  overloadedBoolean: Ii,
  spaceSeparated: ge
}, Symbol.toStringTag, { value: "Module" })), ni = (
  /** @type {ReadonlyArray<keyof typeof types>} */
  Object.keys(Ni)
);
class ra extends Ge {
  /**
   * @constructor
   * @param {string} property
   *   Property.
   * @param {string} attribute
   *   Attribute.
   * @param {number | null | undefined} [mask]
   *   Mask.
   * @param {Space | undefined} [space]
   *   Space.
   * @returns
   *   Info.
   */
  constructor(t, n, r, i) {
    let a = -1;
    if (super(t, n), ns(this, "space", i), typeof r == "number")
      for (; ++a < ni.length; ) {
        const s = ni[a];
        ns(this, ni[a], (r & Ni[s]) === Ni[s]);
      }
  }
}
ra.prototype.defined = !0;
function ns(e, t, n) {
  n && (e[t] = n);
}
function gn(e) {
  const t = {}, n = {};
  for (const [r, i] of Object.entries(e.properties)) {
    const a = new ra(
      r,
      e.transform(e.attributes || {}, r),
      i,
      e.space
    );
    e.mustUseProperty && e.mustUseProperty.includes(r) && (a.mustUseProperty = !0), t[r] = a, n[Gn(r)] = r, n[Gn(a.attribute)] = r;
  }
  return new Zn(t, n, e.space);
}
const Ju = gn({
  properties: {
    ariaActiveDescendant: null,
    ariaAtomic: Ie,
    ariaAutoComplete: null,
    ariaBusy: Ie,
    ariaChecked: Ie,
    ariaColCount: F,
    ariaColIndex: F,
    ariaColSpan: F,
    ariaControls: ge,
    ariaCurrent: null,
    ariaDescribedBy: ge,
    ariaDetails: null,
    ariaDisabled: Ie,
    ariaDropEffect: ge,
    ariaErrorMessage: null,
    ariaExpanded: Ie,
    ariaFlowTo: ge,
    ariaGrabbed: Ie,
    ariaHasPopup: null,
    ariaHidden: Ie,
    ariaInvalid: null,
    ariaKeyShortcuts: null,
    ariaLabel: null,
    ariaLabelledBy: ge,
    ariaLevel: F,
    ariaLive: null,
    ariaModal: Ie,
    ariaMultiLine: Ie,
    ariaMultiSelectable: Ie,
    ariaOrientation: null,
    ariaOwns: ge,
    ariaPlaceholder: null,
    ariaPosInSet: F,
    ariaPressed: Ie,
    ariaReadOnly: Ie,
    ariaRelevant: null,
    ariaRequired: Ie,
    ariaRoleDescription: ge,
    ariaRowCount: F,
    ariaRowIndex: F,
    ariaRowSpan: F,
    ariaSelected: Ie,
    ariaSetSize: F,
    ariaSort: null,
    ariaValueMax: F,
    ariaValueMin: F,
    ariaValueNow: F,
    ariaValueText: null,
    role: null
  },
  transform(e, t) {
    return t === "role" ? t : "aria-" + t.slice(4).toLowerCase();
  }
});
function eo(e, t) {
  return t in e ? e[t] : t;
}
function to(e, t) {
  return eo(e, t.toLowerCase());
}
const Vd = gn({
  attributes: {
    acceptcharset: "accept-charset",
    classname: "class",
    htmlfor: "for",
    httpequiv: "http-equiv"
  },
  mustUseProperty: ["checked", "multiple", "muted", "selected"],
  properties: {
    // Standard Properties.
    abbr: null,
    accept: Qt,
    acceptCharset: ge,
    accessKey: ge,
    action: null,
    allow: null,
    allowFullScreen: Z,
    allowPaymentRequest: Z,
    allowUserMedia: Z,
    alpha: Z,
    alt: null,
    as: null,
    async: Z,
    autoCapitalize: null,
    autoComplete: ge,
    autoFocus: Z,
    autoPlay: Z,
    blocking: ge,
    capture: null,
    charSet: null,
    checked: Z,
    cite: null,
    className: ge,
    closedBy: null,
    colorSpace: null,
    cols: F,
    colSpan: F,
    command: null,
    commandFor: null,
    content: null,
    contentEditable: Ie,
    controls: Z,
    controlsList: ge,
    coords: F | Qt,
    crossOrigin: null,
    data: null,
    dateTime: null,
    decoding: null,
    default: Z,
    defer: Z,
    dir: null,
    dirName: null,
    disabled: Z,
    download: Ii,
    draggable: Ie,
    encType: null,
    enterKeyHint: null,
    fetchPriority: null,
    form: null,
    formAction: null,
    formEncType: null,
    formMethod: null,
    formNoValidate: Z,
    formTarget: null,
    headers: ge,
    height: F,
    hidden: Ii,
    high: F,
    href: null,
    hrefLang: null,
    htmlFor: ge,
    httpEquiv: ge,
    id: null,
    imageSizes: null,
    imageSrcSet: null,
    inert: Z,
    inputMode: null,
    integrity: null,
    is: null,
    isMap: Z,
    itemId: null,
    itemProp: ge,
    itemRef: ge,
    itemScope: Z,
    itemType: ge,
    kind: null,
    label: null,
    lang: null,
    language: null,
    list: null,
    loading: null,
    loop: Z,
    low: F,
    manifest: null,
    max: null,
    maxLength: F,
    media: null,
    method: null,
    min: null,
    minLength: F,
    multiple: Z,
    muted: Z,
    name: null,
    nonce: null,
    noModule: Z,
    noValidate: Z,
    onAbort: null,
    onAfterPrint: null,
    onAuxClick: null,
    onBeforeMatch: null,
    onBeforePrint: null,
    onBeforeToggle: null,
    onBeforeUnload: null,
    onBlur: null,
    onCancel: null,
    onCanPlay: null,
    onCanPlayThrough: null,
    onChange: null,
    onClick: null,
    onClose: null,
    onContextLost: null,
    onContextMenu: null,
    onContextRestored: null,
    onCopy: null,
    onCueChange: null,
    onCut: null,
    onDblClick: null,
    onDrag: null,
    onDragEnd: null,
    onDragEnter: null,
    onDragExit: null,
    onDragLeave: null,
    onDragOver: null,
    onDragStart: null,
    onDrop: null,
    onDurationChange: null,
    onEmptied: null,
    onEnded: null,
    onError: null,
    onFocus: null,
    onFormData: null,
    onHashChange: null,
    onInput: null,
    onInvalid: null,
    onKeyDown: null,
    onKeyPress: null,
    onKeyUp: null,
    onLanguageChange: null,
    onLoad: null,
    onLoadedData: null,
    onLoadedMetadata: null,
    onLoadEnd: null,
    onLoadStart: null,
    onMessage: null,
    onMessageError: null,
    onMouseDown: null,
    onMouseEnter: null,
    onMouseLeave: null,
    onMouseMove: null,
    onMouseOut: null,
    onMouseOver: null,
    onMouseUp: null,
    onOffline: null,
    onOnline: null,
    onPageHide: null,
    onPageShow: null,
    onPaste: null,
    onPause: null,
    onPlay: null,
    onPlaying: null,
    onPopState: null,
    onProgress: null,
    onRateChange: null,
    onRejectionHandled: null,
    onReset: null,
    onResize: null,
    onScroll: null,
    onScrollEnd: null,
    onSecurityPolicyViolation: null,
    onSeeked: null,
    onSeeking: null,
    onSelect: null,
    onSlotChange: null,
    onStalled: null,
    onStorage: null,
    onSubmit: null,
    onSuspend: null,
    onTimeUpdate: null,
    onToggle: null,
    onUnhandledRejection: null,
    onUnload: null,
    onVolumeChange: null,
    onWaiting: null,
    onWheel: null,
    open: Z,
    optimum: F,
    pattern: null,
    ping: ge,
    placeholder: null,
    playsInline: Z,
    popover: null,
    popoverTarget: null,
    popoverTargetAction: null,
    poster: null,
    preload: null,
    readOnly: Z,
    referrerPolicy: null,
    rel: ge,
    required: Z,
    reversed: Z,
    rows: F,
    rowSpan: F,
    sandbox: ge,
    scope: null,
    scoped: Z,
    seamless: Z,
    selected: Z,
    shadowRootClonable: Z,
    shadowRootCustomElementRegistry: Z,
    shadowRootDelegatesFocus: Z,
    shadowRootMode: null,
    shadowRootSerializable: Z,
    shape: null,
    size: F,
    sizes: null,
    slot: null,
    span: F,
    spellCheck: Ie,
    src: null,
    srcDoc: null,
    srcLang: null,
    srcSet: null,
    start: F,
    step: null,
    style: null,
    tabIndex: F,
    target: null,
    title: null,
    translate: null,
    type: null,
    typeMustMatch: Z,
    useMap: null,
    value: Ie,
    width: F,
    wrap: null,
    writingSuggestions: null,
    // Legacy.
    // See: https://html.spec.whatwg.org/#other-elements,-attributes-and-apis
    align: null,
    // Several. Use CSS `text-align` instead,
    aLink: null,
    // `<body>`. Use CSS `a:active {color}` instead
    archive: ge,
    // `<object>`. List of URIs to archives
    axis: null,
    // `<td>` and `<th>`. Use `scope` on `<th>`
    background: null,
    // `<body>`. Use CSS `background-image` instead
    bgColor: null,
    // `<body>` and table elements. Use CSS `background-color` instead
    border: F,
    // `<table>`. Use CSS `border-width` instead,
    borderColor: null,
    // `<table>`. Use CSS `border-color` instead,
    bottomMargin: F,
    // `<body>`
    cellPadding: null,
    // `<table>`
    cellSpacing: null,
    // `<table>`
    char: null,
    // Several table elements. When `align=char`, sets the character to align on
    charOff: null,
    // Several table elements. When `char`, offsets the alignment
    classId: null,
    // `<object>`
    clear: null,
    // `<br>`. Use CSS `clear` instead
    code: null,
    // `<object>`
    codeBase: null,
    // `<object>`
    codeType: null,
    // `<object>`
    color: null,
    // `<font>` and `<hr>`. Use CSS instead
    compact: Z,
    // Lists. Use CSS to reduce space between items instead
    declare: Z,
    // `<object>`
    event: null,
    // `<script>`
    face: null,
    // `<font>`. Use CSS instead
    frame: null,
    // `<table>`
    frameBorder: null,
    // `<iframe>`. Use CSS `border` instead
    hSpace: F,
    // `<img>` and `<object>`
    leftMargin: F,
    // `<body>`
    link: null,
    // `<body>`. Use CSS `a:link {color: *}` instead
    longDesc: null,
    // `<frame>`, `<iframe>`, and `<img>`. Use an `<a>`
    lowSrc: null,
    // `<img>`. Use a `<picture>`
    marginHeight: F,
    // `<body>`
    marginWidth: F,
    // `<body>`
    noResize: Z,
    // `<frame>`
    noHref: Z,
    // `<area>`. Use no href instead of an explicit `nohref`
    noShade: Z,
    // `<hr>`. Use background-color and height instead of borders
    noWrap: Z,
    // `<td>` and `<th>`
    object: null,
    // `<applet>`
    profile: null,
    // `<head>`
    prompt: null,
    // `<isindex>`
    rev: null,
    // `<link>`
    rightMargin: F,
    // `<body>`
    rules: null,
    // `<table>`
    scheme: null,
    // `<meta>`
    scrolling: Ie,
    // `<frame>`. Use overflow in the child context
    standby: null,
    // `<object>`
    summary: null,
    // `<table>`
    text: null,
    // `<body>`. Use CSS `color` instead
    topMargin: F,
    // `<body>`
    valueType: null,
    // `<param>`
    version: null,
    // `<html>`. Use a doctype.
    vAlign: null,
    // Several. Use CSS `vertical-align` instead
    vLink: null,
    // `<body>`. Use CSS `a:visited {color}` instead
    vSpace: F,
    // `<img>` and `<object>`
    // Non-standard Properties.
    allowTransparency: null,
    autoCorrect: null,
    autoSave: null,
    credentialless: Z,
    disablePictureInPicture: Z,
    disableRemotePlayback: Z,
    exportParts: Qt,
    part: ge,
    prefix: null,
    property: null,
    results: F,
    security: null,
    unselectable: null
  },
  space: "html",
  transform: to
}), Wd = gn({
  attributes: {
    accentHeight: "accent-height",
    alignmentBaseline: "alignment-baseline",
    arabicForm: "arabic-form",
    baselineShift: "baseline-shift",
    capHeight: "cap-height",
    className: "class",
    clipPath: "clip-path",
    clipRule: "clip-rule",
    colorInterpolation: "color-interpolation",
    colorInterpolationFilters: "color-interpolation-filters",
    colorProfile: "color-profile",
    colorRendering: "color-rendering",
    crossOrigin: "crossorigin",
    dataType: "datatype",
    dominantBaseline: "dominant-baseline",
    enableBackground: "enable-background",
    fillOpacity: "fill-opacity",
    fillRule: "fill-rule",
    floodColor: "flood-color",
    floodOpacity: "flood-opacity",
    fontFamily: "font-family",
    fontSize: "font-size",
    fontSizeAdjust: "font-size-adjust",
    fontStretch: "font-stretch",
    fontStyle: "font-style",
    fontVariant: "font-variant",
    fontWeight: "font-weight",
    glyphName: "glyph-name",
    glyphOrientationHorizontal: "glyph-orientation-horizontal",
    glyphOrientationVertical: "glyph-orientation-vertical",
    hrefLang: "hreflang",
    horizAdvX: "horiz-adv-x",
    horizOriginX: "horiz-origin-x",
    horizOriginY: "horiz-origin-y",
    imageRendering: "image-rendering",
    letterSpacing: "letter-spacing",
    lightingColor: "lighting-color",
    markerEnd: "marker-end",
    markerMid: "marker-mid",
    markerStart: "marker-start",
    maskType: "mask-type",
    navDown: "nav-down",
    navDownLeft: "nav-down-left",
    navDownRight: "nav-down-right",
    navLeft: "nav-left",
    navNext: "nav-next",
    navPrev: "nav-prev",
    navRight: "nav-right",
    navUp: "nav-up",
    navUpLeft: "nav-up-left",
    navUpRight: "nav-up-right",
    onAbort: "onabort",
    onActivate: "onactivate",
    onAfterPrint: "onafterprint",
    onBeforePrint: "onbeforeprint",
    onBegin: "onbegin",
    onCancel: "oncancel",
    onCanPlay: "oncanplay",
    onCanPlayThrough: "oncanplaythrough",
    onChange: "onchange",
    onClick: "onclick",
    onClose: "onclose",
    onCopy: "oncopy",
    onCueChange: "oncuechange",
    onCut: "oncut",
    onDblClick: "ondblclick",
    onDrag: "ondrag",
    onDragEnd: "ondragend",
    onDragEnter: "ondragenter",
    onDragExit: "ondragexit",
    onDragLeave: "ondragleave",
    onDragOver: "ondragover",
    onDragStart: "ondragstart",
    onDrop: "ondrop",
    onDurationChange: "ondurationchange",
    onEmptied: "onemptied",
    onEnd: "onend",
    onEnded: "onended",
    onError: "onerror",
    onFocus: "onfocus",
    onFocusIn: "onfocusin",
    onFocusOut: "onfocusout",
    onHashChange: "onhashchange",
    onInput: "oninput",
    onInvalid: "oninvalid",
    onKeyDown: "onkeydown",
    onKeyPress: "onkeypress",
    onKeyUp: "onkeyup",
    onLoad: "onload",
    onLoadedData: "onloadeddata",
    onLoadedMetadata: "onloadedmetadata",
    onLoadStart: "onloadstart",
    onMessage: "onmessage",
    onMouseDown: "onmousedown",
    onMouseEnter: "onmouseenter",
    onMouseLeave: "onmouseleave",
    onMouseMove: "onmousemove",
    onMouseOut: "onmouseout",
    onMouseOver: "onmouseover",
    onMouseUp: "onmouseup",
    onMouseWheel: "onmousewheel",
    onOffline: "onoffline",
    onOnline: "ononline",
    onPageHide: "onpagehide",
    onPageShow: "onpageshow",
    onPaste: "onpaste",
    onPause: "onpause",
    onPlay: "onplay",
    onPlaying: "onplaying",
    onPopState: "onpopstate",
    onProgress: "onprogress",
    onRateChange: "onratechange",
    onRepeat: "onrepeat",
    onReset: "onreset",
    onResize: "onresize",
    onScroll: "onscroll",
    onSeeked: "onseeked",
    onSeeking: "onseeking",
    onSelect: "onselect",
    onShow: "onshow",
    onStalled: "onstalled",
    onStorage: "onstorage",
    onSubmit: "onsubmit",
    onSuspend: "onsuspend",
    onTimeUpdate: "ontimeupdate",
    onToggle: "ontoggle",
    onUnload: "onunload",
    onVolumeChange: "onvolumechange",
    onWaiting: "onwaiting",
    onZoom: "onzoom",
    overlinePosition: "overline-position",
    overlineThickness: "overline-thickness",
    paintOrder: "paint-order",
    panose1: "panose-1",
    pointerEvents: "pointer-events",
    referrerPolicy: "referrerpolicy",
    renderingIntent: "rendering-intent",
    shapeRendering: "shape-rendering",
    stopColor: "stop-color",
    stopOpacity: "stop-opacity",
    strikethroughPosition: "strikethrough-position",
    strikethroughThickness: "strikethrough-thickness",
    strokeDashArray: "stroke-dasharray",
    strokeDashOffset: "stroke-dashoffset",
    strokeLineCap: "stroke-linecap",
    strokeLineJoin: "stroke-linejoin",
    strokeMiterLimit: "stroke-miterlimit",
    strokeOpacity: "stroke-opacity",
    strokeWidth: "stroke-width",
    tabIndex: "tabindex",
    textAnchor: "text-anchor",
    textDecoration: "text-decoration",
    textRendering: "text-rendering",
    transformOrigin: "transform-origin",
    typeOf: "typeof",
    underlinePosition: "underline-position",
    underlineThickness: "underline-thickness",
    unicodeBidi: "unicode-bidi",
    unicodeRange: "unicode-range",
    unitsPerEm: "units-per-em",
    vAlphabetic: "v-alphabetic",
    vHanging: "v-hanging",
    vIdeographic: "v-ideographic",
    vMathematical: "v-mathematical",
    vectorEffect: "vector-effect",
    vertAdvY: "vert-adv-y",
    vertOriginX: "vert-origin-x",
    vertOriginY: "vert-origin-y",
    wordSpacing: "word-spacing",
    writingMode: "writing-mode",
    xHeight: "x-height",
    // These were camelcased in Tiny. Now lowercased in SVG 2
    playbackOrder: "playbackorder",
    timelineBegin: "timelinebegin"
  },
  properties: {
    about: Xe,
    accentHeight: F,
    accumulate: null,
    additive: null,
    alignmentBaseline: null,
    alphabetic: F,
    amplitude: F,
    arabicForm: null,
    ascent: F,
    attributeName: null,
    attributeType: null,
    azimuth: F,
    bandwidth: null,
    baselineShift: null,
    baseFrequency: null,
    baseProfile: null,
    bbox: null,
    begin: null,
    bias: F,
    by: null,
    calcMode: null,
    capHeight: F,
    className: ge,
    clip: null,
    clipPath: null,
    clipPathUnits: null,
    clipRule: null,
    color: null,
    colorInterpolation: null,
    colorInterpolationFilters: null,
    colorProfile: null,
    colorRendering: null,
    content: null,
    contentScriptType: null,
    contentStyleType: null,
    crossOrigin: null,
    cursor: null,
    cx: null,
    cy: null,
    d: null,
    dataType: null,
    defaultAction: null,
    descent: F,
    diffuseConstant: F,
    direction: null,
    display: null,
    dur: null,
    divisor: F,
    dominantBaseline: null,
    download: Z,
    dx: null,
    dy: null,
    edgeMode: null,
    editable: null,
    elevation: F,
    enableBackground: null,
    end: null,
    event: null,
    exponent: F,
    externalResourcesRequired: null,
    fill: null,
    fillOpacity: F,
    fillRule: null,
    filter: null,
    filterRes: null,
    filterUnits: null,
    floodColor: null,
    floodOpacity: null,
    focusable: null,
    focusHighlight: null,
    fontFamily: null,
    fontSize: null,
    fontSizeAdjust: null,
    fontStretch: null,
    fontStyle: null,
    fontVariant: null,
    fontWeight: null,
    format: null,
    fr: null,
    from: null,
    fx: null,
    fy: null,
    g1: Qt,
    g2: Qt,
    glyphName: Qt,
    glyphOrientationHorizontal: null,
    glyphOrientationVertical: null,
    glyphRef: null,
    gradientTransform: null,
    gradientUnits: null,
    handler: null,
    hanging: F,
    hatchContentUnits: null,
    hatchUnits: null,
    height: null,
    href: null,
    hrefLang: null,
    horizAdvX: F,
    horizOriginX: F,
    horizOriginY: F,
    id: null,
    ideographic: F,
    imageRendering: null,
    initialVisibility: null,
    in: null,
    in2: null,
    intercept: F,
    k: F,
    k1: F,
    k2: F,
    k3: F,
    k4: F,
    kernelMatrix: Xe,
    kernelUnitLength: null,
    keyPoints: null,
    // SEMI_COLON_SEPARATED
    keySplines: null,
    // SEMI_COLON_SEPARATED
    keyTimes: null,
    // SEMI_COLON_SEPARATED
    kerning: null,
    lang: null,
    lengthAdjust: null,
    letterSpacing: null,
    lightingColor: null,
    limitingConeAngle: F,
    local: null,
    markerEnd: null,
    markerMid: null,
    markerStart: null,
    markerHeight: null,
    markerUnits: null,
    markerWidth: null,
    mask: null,
    maskContentUnits: null,
    maskType: null,
    maskUnits: null,
    mathematical: null,
    max: null,
    media: null,
    mediaCharacterEncoding: null,
    mediaContentEncodings: null,
    mediaSize: F,
    mediaTime: null,
    method: null,
    min: null,
    mode: null,
    name: null,
    navDown: null,
    navDownLeft: null,
    navDownRight: null,
    navLeft: null,
    navNext: null,
    navPrev: null,
    navRight: null,
    navUp: null,
    navUpLeft: null,
    navUpRight: null,
    numOctaves: null,
    observer: null,
    offset: null,
    onAbort: null,
    onActivate: null,
    onAfterPrint: null,
    onBeforePrint: null,
    onBegin: null,
    onCancel: null,
    onCanPlay: null,
    onCanPlayThrough: null,
    onChange: null,
    onClick: null,
    onClose: null,
    onCopy: null,
    onCueChange: null,
    onCut: null,
    onDblClick: null,
    onDrag: null,
    onDragEnd: null,
    onDragEnter: null,
    onDragExit: null,
    onDragLeave: null,
    onDragOver: null,
    onDragStart: null,
    onDrop: null,
    onDurationChange: null,
    onEmptied: null,
    onEnd: null,
    onEnded: null,
    onError: null,
    onFocus: null,
    onFocusIn: null,
    onFocusOut: null,
    onHashChange: null,
    onInput: null,
    onInvalid: null,
    onKeyDown: null,
    onKeyPress: null,
    onKeyUp: null,
    onLoad: null,
    onLoadedData: null,
    onLoadedMetadata: null,
    onLoadStart: null,
    onMessage: null,
    onMouseDown: null,
    onMouseEnter: null,
    onMouseLeave: null,
    onMouseMove: null,
    onMouseOut: null,
    onMouseOver: null,
    onMouseUp: null,
    onMouseWheel: null,
    onOffline: null,
    onOnline: null,
    onPageHide: null,
    onPageShow: null,
    onPaste: null,
    onPause: null,
    onPlay: null,
    onPlaying: null,
    onPopState: null,
    onProgress: null,
    onRateChange: null,
    onRepeat: null,
    onReset: null,
    onResize: null,
    onScroll: null,
    onSeeked: null,
    onSeeking: null,
    onSelect: null,
    onShow: null,
    onStalled: null,
    onStorage: null,
    onSubmit: null,
    onSuspend: null,
    onTimeUpdate: null,
    onToggle: null,
    onUnload: null,
    onVolumeChange: null,
    onWaiting: null,
    onZoom: null,
    opacity: null,
    operator: null,
    order: null,
    orient: null,
    orientation: null,
    origin: null,
    overflow: null,
    overlay: null,
    overlinePosition: F,
    overlineThickness: F,
    paintOrder: null,
    panose1: null,
    path: null,
    pathLength: F,
    patternContentUnits: null,
    patternTransform: null,
    patternUnits: null,
    phase: null,
    ping: ge,
    pitch: null,
    playbackOrder: null,
    pointerEvents: null,
    points: null,
    pointsAtX: F,
    pointsAtY: F,
    pointsAtZ: F,
    preserveAlpha: null,
    preserveAspectRatio: null,
    primitiveUnits: null,
    propagate: null,
    property: Xe,
    r: null,
    radius: null,
    referrerPolicy: null,
    refX: null,
    refY: null,
    rel: Xe,
    rev: Xe,
    renderingIntent: null,
    repeatCount: null,
    repeatDur: null,
    requiredExtensions: Xe,
    requiredFeatures: Xe,
    requiredFonts: Xe,
    requiredFormats: Xe,
    resource: null,
    restart: null,
    result: null,
    rotate: null,
    rx: null,
    ry: null,
    scale: null,
    seed: null,
    shapeRendering: null,
    side: null,
    slope: null,
    snapshotTime: null,
    specularConstant: F,
    specularExponent: F,
    spreadMethod: null,
    spacing: null,
    startOffset: null,
    stdDeviation: null,
    stemh: null,
    stemv: null,
    stitchTiles: null,
    stopColor: null,
    stopOpacity: null,
    strikethroughPosition: F,
    strikethroughThickness: F,
    string: null,
    stroke: null,
    strokeDashArray: Xe,
    strokeDashOffset: null,
    strokeLineCap: null,
    strokeLineJoin: null,
    strokeMiterLimit: F,
    strokeOpacity: F,
    strokeWidth: null,
    style: null,
    surfaceScale: F,
    syncBehavior: null,
    syncBehaviorDefault: null,
    syncMaster: null,
    syncTolerance: null,
    syncToleranceDefault: null,
    systemLanguage: Xe,
    tabIndex: F,
    tableValues: null,
    target: null,
    targetX: F,
    targetY: F,
    textAnchor: null,
    textDecoration: null,
    textRendering: null,
    textLength: null,
    timelineBegin: null,
    title: null,
    transformBehavior: null,
    type: null,
    typeOf: Xe,
    to: null,
    transform: null,
    transformOrigin: null,
    u1: null,
    u2: null,
    underlinePosition: F,
    underlineThickness: F,
    unicode: null,
    unicodeBidi: null,
    unicodeRange: null,
    unitsPerEm: F,
    values: null,
    vAlphabetic: F,
    vMathematical: F,
    vectorEffect: null,
    vHanging: F,
    vIdeographic: F,
    version: null,
    vertAdvY: F,
    vertOriginX: F,
    vertOriginY: F,
    viewBox: null,
    viewTarget: null,
    visibility: null,
    width: null,
    widths: null,
    wordSpacing: null,
    writingMode: null,
    x: null,
    x1: null,
    x2: null,
    xChannelSelector: null,
    xHeight: F,
    y: null,
    y1: null,
    y2: null,
    yChannelSelector: null,
    z: null,
    zoomAndPan: null
  },
  space: "svg",
  transform: eo
}), no = gn({
  properties: {
    xLinkActuate: null,
    xLinkArcRole: null,
    xLinkHref: null,
    xLinkRole: null,
    xLinkShow: null,
    xLinkTitle: null,
    xLinkType: null
  },
  space: "xlink",
  transform(e, t) {
    return "xlink:" + t.slice(5).toLowerCase();
  }
}), ro = gn({
  attributes: { xmlnsxlink: "xmlns:xlink" },
  properties: { xmlnsXLink: null, xmlns: null },
  space: "xmlns",
  transform: to
}), io = gn({
  properties: { xmlBase: null, xmlLang: null, xmlSpace: null },
  space: "xml",
  transform(e, t) {
    return "xml:" + t.slice(3).toLowerCase();
  }
}), Gd = {
  classId: "classID",
  dataType: "datatype",
  itemId: "itemID",
  strokeDashArray: "strokeDasharray",
  strokeDashOffset: "strokeDashoffset",
  strokeLineCap: "strokeLinecap",
  strokeLineJoin: "strokeLinejoin",
  strokeMiterLimit: "strokeMiterlimit",
  typeOf: "typeof",
  xLinkActuate: "xlinkActuate",
  xLinkArcRole: "xlinkArcrole",
  xLinkHref: "xlinkHref",
  xLinkRole: "xlinkRole",
  xLinkShow: "xlinkShow",
  xLinkTitle: "xlinkTitle",
  xLinkType: "xlinkType",
  xmlnsXLink: "xmlnsXlink"
}, Qd = /[A-Z]/g, rs = /-[a-z]/g, Kd = /^data[-\w.:]+$/i;
function $r(e, t) {
  const n = Gn(t);
  let r = t, i = Ge;
  if (n in e.normal)
    return e.property[e.normal[n]];
  if (n.length > 4 && n.slice(0, 4) === "data" && Kd.test(t)) {
    if (t.charAt(4) === "-") {
      const a = t.slice(5).replace(rs, Zd);
      r = "data" + a.charAt(0).toUpperCase() + a.slice(1);
    } else {
      const a = t.slice(4);
      if (!rs.test(a)) {
        let s = a.replace(Qd, Xd);
        s.charAt(0) !== "-" && (s = "-" + s), t = "data" + s;
      }
    }
    i = ra;
  }
  return new i(r, t);
}
function Xd(e) {
  return "-" + e.toLowerCase();
}
function Zd(e) {
  return e.charAt(1).toUpperCase();
}
const Jn = Zu([Ju, Vd, no, ro, io], "html"), vt = Zu([Ju, Wd, no, ro, io], "svg");
function is(e) {
  const t = [], n = String(e || "");
  let r = n.indexOf(","), i = 0, a = !1;
  for (; !a; ) {
    r === -1 && (r = n.length, a = !0);
    const s = n.slice(i, r).trim();
    (s || !a) && t.push(s), i = r + 1, r = n.indexOf(",", i);
  }
  return t;
}
function ao(e, t) {
  const n = {};
  return (e[e.length - 1] === "" ? [...e, ""] : e).join(
    (n.padRight ? " " : "") + "," + (n.padLeft === !1 ? "" : " ")
  ).trim();
}
const as = /[#.]/g;
function Jd(e, t) {
  const n = e || "", r = {};
  let i = 0, a, s;
  for (; i < n.length; ) {
    as.lastIndex = i;
    const u = as.exec(n), o = n.slice(i, u ? u.index : n.length);
    o && (a ? a === "#" ? r.id = o : Array.isArray(r.className) ? r.className.push(o) : r.className = [o] : s = o, i += o.length), u && (a = u[0], i++);
  }
  return {
    type: "element",
    // @ts-expect-error: tag name is parsed.
    tagName: s || t || "div",
    properties: r,
    children: []
  };
}
function ss(e) {
  const t = String(e || "").trim();
  return t ? t.split(/[ \t\n\r\f]+/g) : [];
}
function so(e) {
  return e.join(" ").trim();
}
function uo(e, t, n) {
  const r = n ? rh(n) : void 0;
  function i(a, s, ...u) {
    let o;
    if (a == null) {
      o = { type: "root", children: [] };
      const c = (
        /** @type {Child} */
        s
      );
      u.unshift(c);
    } else {
      o = Jd(a, t);
      const c = o.tagName.toLowerCase(), d = r ? r.get(c) : void 0;
      if (o.tagName = d || c, eh(s))
        u.unshift(s);
      else
        for (const [h, p] of Object.entries(s))
          th(e, o.properties, h, p);
    }
    for (const c of u)
      Si(o.children, c);
    return o.type === "element" && o.tagName === "template" && (o.content = { type: "root", children: o.children }, o.children = []), o;
  }
  return i;
}
function eh(e) {
  if (e === null || typeof e != "object" || Array.isArray(e))
    return !0;
  if (typeof e.type != "string") return !1;
  const t = (
    /** @type {Record<string, unknown>} */
    e
  ), n = Object.keys(e);
  for (const r of n) {
    const i = t[r];
    if (i && typeof i == "object") {
      if (!Array.isArray(i)) return !0;
      const a = (
        /** @type {ReadonlyArray<unknown>} */
        i
      );
      for (const s of a)
        if (typeof s != "number" && typeof s != "string")
          return !0;
    }
  }
  return !!("children" in e && Array.isArray(e.children));
}
function th(e, t, n, r) {
  const i = $r(e, n);
  let a;
  if (r != null) {
    if (typeof r == "number") {
      if (Number.isNaN(r)) return;
      a = r;
    } else typeof r == "boolean" ? a = r : typeof r == "string" ? i.spaceSeparated ? a = ss(r) : i.commaSeparated ? a = is(r) : i.commaOrSpaceSeparated ? a = ss(is(r).join(" ")) : a = us(i, i.property, r) : Array.isArray(r) ? a = [...r] : a = i.property === "style" ? nh(r) : String(r);
    if (Array.isArray(a)) {
      const s = [];
      for (const u of a)
        s.push(
          /** @type {number | string} */
          us(i, i.property, u)
        );
      a = s;
    }
    i.property === "className" && Array.isArray(t.className) && (a = t.className.concat(
      /** @type {Array<number | string> | number | string} */
      a
    )), t[i.property] = a;
  }
}
function Si(e, t) {
  if (t != null) if (typeof t == "number" || typeof t == "string")
    e.push({ type: "text", value: String(t) });
  else if (Array.isArray(t))
    for (const n of t)
      Si(e, n);
  else if (typeof t == "object" && "type" in t)
    t.type === "root" ? Si(e, t.children) : e.push(t);
  else
    throw new Error("Expected node, nodes, or string, got `" + t + "`");
}
function us(e, t, n) {
  if (typeof n == "string") {
    if (e.number && n && !Number.isNaN(Number(n)))
      return Number(n);
    if ((e.boolean || e.overloadedBoolean) && (n === "" || Gn(n) === Gn(t)))
      return !0;
  }
  return n;
}
function nh(e) {
  const t = [];
  for (const [n, r] of Object.entries(e))
    t.push([n, r].join(": "));
  return t.join("; ");
}
function rh(e) {
  const t = /* @__PURE__ */ new Map();
  for (const n of e)
    t.set(n.toLowerCase(), n);
  return t;
}
const ih = [
  "altGlyph",
  "altGlyphDef",
  "altGlyphItem",
  "animateColor",
  "animateMotion",
  "animateTransform",
  "clipPath",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feDropShadow",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence",
  "foreignObject",
  "glyphRef",
  "linearGradient",
  "radialGradient",
  "solidColor",
  "textArea",
  "textPath"
], ah = uo(Jn, "div"), sh = uo(vt, "g", ih);
function uh(e) {
  const t = String(e), n = [];
  return { toOffset: i, toPoint: r };
  function r(a) {
    if (typeof a == "number" && a > -1 && a <= t.length) {
      let s = 0;
      for (; ; ) {
        let u = n[s];
        if (u === void 0) {
          const o = os(t, n[s - 1]);
          u = o === -1 ? t.length + 1 : o + 1, n[s] = u;
        }
        if (u > a)
          return {
            line: s + 1,
            column: a - (s > 0 ? n[s - 1] : 0) + 1,
            offset: a
          };
        s++;
      }
    }
  }
  function i(a) {
    if (a && typeof a.line == "number" && typeof a.column == "number" && !Number.isNaN(a.line) && !Number.isNaN(a.column)) {
      for (; n.length < a.line; ) {
        const u = n[n.length - 1], o = os(t, u), c = o === -1 ? t.length + 1 : o + 1;
        if (u === c) break;
        n.push(c);
      }
      const s = (a.line > 1 ? n[a.line - 2] : 0) + a.column - 1;
      if (s < n[a.line - 1]) return s;
    }
  }
}
function os(e, t) {
  const n = e.indexOf("\r", t), r = e.indexOf(`
`, t);
  return r === -1 ? n : n === -1 || n + 1 === r ? r : n < r ? n : r;
}
const Gt = {
  html: "http://www.w3.org/1999/xhtml",
  mathml: "http://www.w3.org/1998/Math/MathML",
  svg: "http://www.w3.org/2000/svg",
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace",
  xmlns: "http://www.w3.org/2000/xmlns/"
}, oo = {}.hasOwnProperty, oh = Object.prototype;
function lh(e, t) {
  const n = t || {};
  return ia(
    {
      file: n.file || void 0,
      location: !1,
      schema: n.space === "svg" ? vt : Jn,
      verbose: n.verbose || !1
    },
    e
  );
}
function ia(e, t) {
  let n;
  switch (t.nodeName) {
    case "#comment": {
      const r = (
        /** @type {DefaultTreeAdapterMap['commentNode']} */
        t
      );
      return n = { type: "comment", value: r.data }, Tr(e, r, n), n;
    }
    case "#document":
    case "#document-fragment": {
      const r = (
        /** @type {DefaultTreeAdapterMap['document'] | DefaultTreeAdapterMap['documentFragment']} */
        t
      ), i = "mode" in r ? r.mode === "quirks" || r.mode === "limited-quirks" : !1;
      if (n = {
        type: "root",
        children: lo(e, t.childNodes),
        data: { quirksMode: i }
      }, e.file && e.location) {
        const a = String(e.file), s = uh(a), u = s.toPoint(0), o = s.toPoint(a.length);
        n.position = { start: u, end: o };
      }
      return n;
    }
    case "#documentType": {
      const r = (
        /** @type {DefaultTreeAdapterMap['documentType']} */
        t
      );
      return n = { type: "doctype" }, Tr(e, r, n), n;
    }
    case "#text": {
      const r = (
        /** @type {DefaultTreeAdapterMap['textNode']} */
        t
      );
      return n = { type: "text", value: r.value }, Tr(e, r, n), n;
    }
    // Element.
    default:
      return n = ch(
        e,
        /** @type {DefaultTreeAdapterMap['element']} */
        t
      ), n;
  }
}
function lo(e, t) {
  let n = -1;
  const r = [];
  for (; ++n < t.length; ) {
    const i = (
      /** @type {RootContent} */
      ia(e, t[n])
    );
    r.push(i);
  }
  return r;
}
function ch(e, t) {
  const n = e.schema;
  e.schema = t.namespaceURI === Gt.svg ? vt : Jn;
  let r = -1;
  const i = {};
  for (; ++r < t.attrs.length; ) {
    const u = t.attrs[r], o = (u.prefix ? u.prefix + ":" : "") + u.name;
    oo.call(oh, o) || (i[o] = u.value);
  }
  const s = (e.schema.space === "svg" ? sh : ah)(t.tagName, i, lo(e, t.childNodes));
  if (Tr(e, t, s), s.tagName === "template") {
    const u = (
      /** @type {DefaultTreeAdapterMap['template']} */
      t
    ), o = u.sourceCodeLocation, c = o && o.startTag && dn(o.startTag), d = o && o.endTag && dn(o.endTag), h = (
      /** @type {Root} */
      ia(e, u.content)
    );
    c && d && e.file && (h.position = { start: c.end, end: d.start }), s.content = h;
  }
  return e.schema = n, s;
}
function Tr(e, t, n) {
  if ("sourceCodeLocation" in t && t.sourceCodeLocation && e.file) {
    const r = dh(e, n, t.sourceCodeLocation);
    r && (e.location = !0, n.position = r);
  }
}
function dh(e, t, n) {
  const r = dn(n);
  if (t.type === "element") {
    const i = t.children[t.children.length - 1];
    if (r && !n.endTag && i && i.position && i.position.end && (r.end = Object.assign({}, i.position.end)), e.verbose) {
      const a = {};
      let s;
      if (n.attrs)
        for (s in n.attrs)
          oo.call(n.attrs, s) && (a[$r(e.schema, s).property] = dn(
            n.attrs[s]
          ));
      n.startTag;
      const u = dn(n.startTag), o = n.endTag ? dn(n.endTag) : void 0, c = { opening: u };
      o && (c.closing = o), c.properties = a, t.data = { position: c };
    }
  }
  return r;
}
function dn(e) {
  const t = ls({
    line: e.startLine,
    column: e.startCol,
    offset: e.startOffset
  }), n = ls({
    line: e.endLine,
    column: e.endCol,
    offset: e.endOffset
  });
  return t || n ? { start: t, end: n } : void 0;
}
function ls(e) {
  return e.line && e.column ? e : void 0;
}
const cs = {}.hasOwnProperty;
function co(e, t) {
  const n = t || {};
  function r(i, ...a) {
    let s = r.invalid;
    const u = r.handlers;
    if (i && cs.call(i, e)) {
      const o = String(i[e]);
      s = cs.call(u, o) ? u[o] : r.unknown;
    }
    if (s)
      return s.call(this, i, ...a);
  }
  return r.handlers = n.handlers || {}, r.invalid = n.invalid, r.unknown = n.unknown, r;
}
const hh = {}, fh = {}.hasOwnProperty, ho = co("type", { handlers: { root: mh, element: kh, text: Eh, comment: Th, doctype: bh } });
function ph(e, t) {
  const r = (t || hh).space;
  return ho(e, r === "svg" ? vt : Jn);
}
function mh(e, t) {
  const n = {
    nodeName: "#document",
    // @ts-expect-error: `parse5` uses enums, which are actually strings.
    mode: (e.data || {}).quirksMode ? "quirks" : "no-quirks",
    childNodes: []
  };
  return n.childNodes = aa(e.children, n, t), bn(e, n), n;
}
function gh(e, t) {
  const n = { nodeName: "#document-fragment", childNodes: [] };
  return n.childNodes = aa(e.children, n, t), bn(e, n), n;
}
function bh(e) {
  const t = {
    nodeName: "#documentType",
    name: "html",
    publicId: "",
    systemId: "",
    parentNode: null
  };
  return bn(e, t), t;
}
function Eh(e) {
  const t = {
    nodeName: "#text",
    value: e.value,
    parentNode: null
  };
  return bn(e, t), t;
}
function Th(e) {
  const t = {
    nodeName: "#comment",
    data: e.value,
    parentNode: null
  };
  return bn(e, t), t;
}
function kh(e, t) {
  const n = t;
  let r = n;
  e.type === "element" && e.tagName.toLowerCase() === "svg" && n.space === "html" && (r = vt);
  const i = [];
  let a;
  if (e.properties) {
    for (a in e.properties)
      if (a !== "children" && fh.call(e.properties, a)) {
        const o = xh(
          r,
          a,
          e.properties[a]
        );
        o && i.push(o);
      }
  }
  const s = r.space, u = {
    nodeName: e.tagName,
    tagName: e.tagName,
    attrs: i,
    // @ts-expect-error: `parse5` types are wrong.
    namespaceURI: Gt[s],
    childNodes: [],
    parentNode: null
  };
  return u.childNodes = aa(e.children, u, r), bn(e, u), e.tagName === "template" && e.content && (u.content = gh(e.content, r)), u;
}
function xh(e, t, n) {
  const r = $r(e, t);
  if (n === !1 || n === null || n === void 0 || typeof n == "number" && Number.isNaN(n) || !n && r.boolean)
    return;
  Array.isArray(n) && (n = r.commaSeparated ? ao(n) : so(n));
  const i = {
    name: r.attribute,
    value: n === !0 ? "" : String(n)
  };
  if (r.space && r.space !== "html" && r.space !== "svg") {
    const a = i.name.indexOf(":");
    a < 0 ? i.prefix = "" : (i.name = i.name.slice(a + 1), i.prefix = r.attribute.slice(0, a)), i.namespace = Gt[r.space];
  }
  return i;
}
function aa(e, t, n) {
  let r = -1;
  const i = [];
  if (e)
    for (; ++r < e.length; ) {
      const a = ho(e[r], n);
      a.parentNode = t, i.push(a);
    }
  return i;
}
function bn(e, t) {
  const n = e.position;
  n && n.start && n.end && (n.start.offset, n.end.offset, t.sourceCodeLocation = {
    startLine: n.start.line,
    startCol: n.start.column,
    startOffset: n.start.offset,
    endLine: n.end.line,
    endCol: n.end.column,
    endOffset: n.end.offset
  });
}
const yh = [
  "area",
  "base",
  "basefont",
  "bgsound",
  "br",
  "col",
  "command",
  "embed",
  "frame",
  "hr",
  "image",
  "img",
  "input",
  "keygen",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
], Ah = /* @__PURE__ */ new Set([
  65534,
  65535,
  131070,
  131071,
  196606,
  196607,
  262142,
  262143,
  327678,
  327679,
  393214,
  393215,
  458750,
  458751,
  524286,
  524287,
  589822,
  589823,
  655358,
  655359,
  720894,
  720895,
  786430,
  786431,
  851966,
  851967,
  917502,
  917503,
  983038,
  983039,
  1048574,
  1048575,
  1114110,
  1114111
]), Te = "�";
var m;
(function(e) {
  e[e.EOF = -1] = "EOF", e[e.NULL = 0] = "NULL", e[e.TABULATION = 9] = "TABULATION", e[e.CARRIAGE_RETURN = 13] = "CARRIAGE_RETURN", e[e.LINE_FEED = 10] = "LINE_FEED", e[e.FORM_FEED = 12] = "FORM_FEED", e[e.SPACE = 32] = "SPACE", e[e.EXCLAMATION_MARK = 33] = "EXCLAMATION_MARK", e[e.QUOTATION_MARK = 34] = "QUOTATION_MARK", e[e.AMPERSAND = 38] = "AMPERSAND", e[e.APOSTROPHE = 39] = "APOSTROPHE", e[e.HYPHEN_MINUS = 45] = "HYPHEN_MINUS", e[e.SOLIDUS = 47] = "SOLIDUS", e[e.DIGIT_0 = 48] = "DIGIT_0", e[e.DIGIT_9 = 57] = "DIGIT_9", e[e.SEMICOLON = 59] = "SEMICOLON", e[e.LESS_THAN_SIGN = 60] = "LESS_THAN_SIGN", e[e.EQUALS_SIGN = 61] = "EQUALS_SIGN", e[e.GREATER_THAN_SIGN = 62] = "GREATER_THAN_SIGN", e[e.QUESTION_MARK = 63] = "QUESTION_MARK", e[e.LATIN_CAPITAL_A = 65] = "LATIN_CAPITAL_A", e[e.LATIN_CAPITAL_Z = 90] = "LATIN_CAPITAL_Z", e[e.RIGHT_SQUARE_BRACKET = 93] = "RIGHT_SQUARE_BRACKET", e[e.GRAVE_ACCENT = 96] = "GRAVE_ACCENT", e[e.LATIN_SMALL_A = 97] = "LATIN_SMALL_A", e[e.LATIN_SMALL_Z = 122] = "LATIN_SMALL_Z";
})(m || (m = {}));
const Ve = {
  DASH_DASH: "--",
  CDATA_START: "[CDATA[",
  DOCTYPE: "doctype",
  SCRIPT: "script",
  PUBLIC: "public",
  SYSTEM: "system"
};
function fo(e) {
  return e >= 55296 && e <= 57343;
}
function _h(e) {
  return e >= 56320 && e <= 57343;
}
function Ch(e, t) {
  return (e - 55296) * 1024 + 9216 + t;
}
function po(e) {
  return e !== 32 && e !== 10 && e !== 13 && e !== 9 && e !== 12 && e >= 1 && e <= 31 || e >= 127 && e <= 159;
}
function mo(e) {
  return e >= 64976 && e <= 65007 || Ah.has(e);
}
var L;
(function(e) {
  e.controlCharacterInInputStream = "control-character-in-input-stream", e.noncharacterInInputStream = "noncharacter-in-input-stream", e.surrogateInInputStream = "surrogate-in-input-stream", e.nonVoidHtmlElementStartTagWithTrailingSolidus = "non-void-html-element-start-tag-with-trailing-solidus", e.endTagWithAttributes = "end-tag-with-attributes", e.endTagWithTrailingSolidus = "end-tag-with-trailing-solidus", e.unexpectedSolidusInTag = "unexpected-solidus-in-tag", e.unexpectedNullCharacter = "unexpected-null-character", e.unexpectedQuestionMarkInsteadOfTagName = "unexpected-question-mark-instead-of-tag-name", e.invalidFirstCharacterOfTagName = "invalid-first-character-of-tag-name", e.unexpectedEqualsSignBeforeAttributeName = "unexpected-equals-sign-before-attribute-name", e.missingEndTagName = "missing-end-tag-name", e.unexpectedCharacterInAttributeName = "unexpected-character-in-attribute-name", e.unknownNamedCharacterReference = "unknown-named-character-reference", e.missingSemicolonAfterCharacterReference = "missing-semicolon-after-character-reference", e.unexpectedCharacterAfterDoctypeSystemIdentifier = "unexpected-character-after-doctype-system-identifier", e.unexpectedCharacterInUnquotedAttributeValue = "unexpected-character-in-unquoted-attribute-value", e.eofBeforeTagName = "eof-before-tag-name", e.eofInTag = "eof-in-tag", e.missingAttributeValue = "missing-attribute-value", e.missingWhitespaceBetweenAttributes = "missing-whitespace-between-attributes", e.missingWhitespaceAfterDoctypePublicKeyword = "missing-whitespace-after-doctype-public-keyword", e.missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers = "missing-whitespace-between-doctype-public-and-system-identifiers", e.missingWhitespaceAfterDoctypeSystemKeyword = "missing-whitespace-after-doctype-system-keyword", e.missingQuoteBeforeDoctypePublicIdentifier = "missing-quote-before-doctype-public-identifier", e.missingQuoteBeforeDoctypeSystemIdentifier = "missing-quote-before-doctype-system-identifier", e.missingDoctypePublicIdentifier = "missing-doctype-public-identifier", e.missingDoctypeSystemIdentifier = "missing-doctype-system-identifier", e.abruptDoctypePublicIdentifier = "abrupt-doctype-public-identifier", e.abruptDoctypeSystemIdentifier = "abrupt-doctype-system-identifier", e.cdataInHtmlContent = "cdata-in-html-content", e.incorrectlyOpenedComment = "incorrectly-opened-comment", e.eofInScriptHtmlCommentLikeText = "eof-in-script-html-comment-like-text", e.eofInDoctype = "eof-in-doctype", e.nestedComment = "nested-comment", e.abruptClosingOfEmptyComment = "abrupt-closing-of-empty-comment", e.eofInComment = "eof-in-comment", e.incorrectlyClosedComment = "incorrectly-closed-comment", e.eofInCdata = "eof-in-cdata", e.absenceOfDigitsInNumericCharacterReference = "absence-of-digits-in-numeric-character-reference", e.nullCharacterReference = "null-character-reference", e.surrogateCharacterReference = "surrogate-character-reference", e.characterReferenceOutsideUnicodeRange = "character-reference-outside-unicode-range", e.controlCharacterReference = "control-character-reference", e.noncharacterCharacterReference = "noncharacter-character-reference", e.missingWhitespaceBeforeDoctypeName = "missing-whitespace-before-doctype-name", e.missingDoctypeName = "missing-doctype-name", e.invalidCharacterSequenceAfterDoctypeName = "invalid-character-sequence-after-doctype-name", e.duplicateAttribute = "duplicate-attribute", e.nonConformingDoctype = "non-conforming-doctype", e.missingDoctype = "missing-doctype", e.misplacedDoctype = "misplaced-doctype", e.endTagWithoutMatchingOpenElement = "end-tag-without-matching-open-element", e.closingOfElementWithOpenChildElements = "closing-of-element-with-open-child-elements", e.disallowedContentInNoscriptInHead = "disallowed-content-in-noscript-in-head", e.openElementsLeftAfterEof = "open-elements-left-after-eof", e.abandonedHeadElementChild = "abandoned-head-element-child", e.misplacedStartTagForHeadElement = "misplaced-start-tag-for-head-element", e.nestedNoscriptInHead = "nested-noscript-in-head", e.eofInElementThatCanContainOnlyText = "eof-in-element-that-can-contain-only-text";
})(L || (L = {}));
const Ih = 65536;
class Nh {
  constructor(t) {
    this.handler = t, this.html = "", this.pos = -1, this.lastGapPos = -2, this.gapStack = [], this.skipNextNewLine = !1, this.lastChunkWritten = !1, this.endOfChunkHit = !1, this.bufferWaterline = Ih, this.isEol = !1, this.lineStartPos = 0, this.droppedBufferSize = 0, this.line = 1, this.lastErrOffset = -1;
  }
  /** The column on the current line. If we just saw a gap (eg. a surrogate pair), return the index before. */
  get col() {
    return this.pos - this.lineStartPos + +(this.lastGapPos !== this.pos);
  }
  get offset() {
    return this.droppedBufferSize + this.pos;
  }
  getError(t, n) {
    const { line: r, col: i, offset: a } = this, s = i + n, u = a + n;
    return {
      code: t,
      startLine: r,
      endLine: r,
      startCol: s,
      endCol: s,
      startOffset: u,
      endOffset: u
    };
  }
  _err(t) {
    this.handler.onParseError && this.lastErrOffset !== this.offset && (this.lastErrOffset = this.offset, this.handler.onParseError(this.getError(t, 0)));
  }
  _addGap() {
    this.gapStack.push(this.lastGapPos), this.lastGapPos = this.pos;
  }
  _processSurrogate(t) {
    if (this.pos !== this.html.length - 1) {
      const n = this.html.charCodeAt(this.pos + 1);
      if (_h(n))
        return this.pos++, this._addGap(), Ch(t, n);
    } else if (!this.lastChunkWritten)
      return this.endOfChunkHit = !0, m.EOF;
    return this._err(L.surrogateInInputStream), t;
  }
  willDropParsedChunk() {
    return this.pos > this.bufferWaterline;
  }
  dropParsedChunk() {
    this.willDropParsedChunk() && (this.html = this.html.substring(this.pos), this.lineStartPos -= this.pos, this.droppedBufferSize += this.pos, this.pos = 0, this.lastGapPos = -2, this.gapStack.length = 0);
  }
  write(t, n) {
    this.html.length > 0 ? this.html += t : this.html = t, this.endOfChunkHit = !1, this.lastChunkWritten = n;
  }
  insertHtmlAtCurrentPos(t) {
    this.html = this.html.substring(0, this.pos + 1) + t + this.html.substring(this.pos + 1), this.endOfChunkHit = !1;
  }
  startsWith(t, n) {
    if (this.pos + t.length > this.html.length)
      return this.endOfChunkHit = !this.lastChunkWritten, !1;
    if (n)
      return this.html.startsWith(t, this.pos);
    for (let r = 0; r < t.length; r++)
      if ((this.html.charCodeAt(this.pos + r) | 32) !== t.charCodeAt(r))
        return !1;
    return !0;
  }
  peek(t) {
    const n = this.pos + t;
    if (n >= this.html.length)
      return this.endOfChunkHit = !this.lastChunkWritten, m.EOF;
    const r = this.html.charCodeAt(n);
    return r === m.CARRIAGE_RETURN ? m.LINE_FEED : r;
  }
  advance() {
    if (this.pos++, this.isEol && (this.isEol = !1, this.line++, this.lineStartPos = this.pos), this.pos >= this.html.length)
      return this.endOfChunkHit = !this.lastChunkWritten, m.EOF;
    let t = this.html.charCodeAt(this.pos);
    return t === m.CARRIAGE_RETURN ? (this.isEol = !0, this.skipNextNewLine = !0, m.LINE_FEED) : t === m.LINE_FEED && (this.isEol = !0, this.skipNextNewLine) ? (this.line--, this.skipNextNewLine = !1, this._addGap(), this.advance()) : (this.skipNextNewLine = !1, fo(t) && (t = this._processSurrogate(t)), this.handler.onParseError === null || t > 31 && t < 127 || t === m.LINE_FEED || t === m.CARRIAGE_RETURN || t > 159 && t < 64976 || this._checkForProblematicCharacters(t), t);
  }
  _checkForProblematicCharacters(t) {
    po(t) ? this._err(L.controlCharacterInInputStream) : mo(t) && this._err(L.noncharacterInInputStream);
  }
  retreat(t) {
    for (this.pos -= t; this.pos < this.lastGapPos; )
      this.lastGapPos = this.gapStack.pop(), this.pos--;
    this.isEol = !1;
  }
}
var ne;
(function(e) {
  e[e.CHARACTER = 0] = "CHARACTER", e[e.NULL_CHARACTER = 1] = "NULL_CHARACTER", e[e.WHITESPACE_CHARACTER = 2] = "WHITESPACE_CHARACTER", e[e.START_TAG = 3] = "START_TAG", e[e.END_TAG = 4] = "END_TAG", e[e.COMMENT = 5] = "COMMENT", e[e.DOCTYPE = 6] = "DOCTYPE", e[e.EOF = 7] = "EOF", e[e.HIBERNATION = 8] = "HIBERNATION";
})(ne || (ne = {}));
function go(e, t) {
  for (let n = e.attrs.length - 1; n >= 0; n--)
    if (e.attrs[n].name === t)
      return e.attrs[n].value;
  return null;
}
const Sh = /* @__PURE__ */ new Uint16Array(
  // prettier-ignore
  /* @__PURE__ */ 'ᵁ<Õıʊҝջאٵ۞ޢߖࠏ੊ઑඡ๭༉༦჊ረዡᐕᒝᓃᓟᔥ\0\0\0\0\0\0ᕫᛍᦍᰒᷝ὾⁠↰⊍⏀⏻⑂⠤⤒ⴈ⹈⿎〖㊺㘹㞬㣾㨨㩱㫠㬮ࠀEMabcfglmnoprstu\\bfms¦³¹ÈÏlig耻Æ䃆P耻&䀦cute耻Á䃁reve;䄂Āiyx}rc耻Â䃂;䐐r;쀀𝔄rave耻À䃀pha;䎑acr;䄀d;橓Āgp¡on;䄄f;쀀𝔸plyFunction;恡ing耻Å䃅Ācs¾Ãr;쀀𝒜ign;扔ilde耻Ã䃃ml耻Ä䃄ЀaceforsuåûþėĜĢħĪĀcrêòkslash;或Ŷöø;櫧ed;挆y;䐑ƀcrtąċĔause;戵noullis;愬a;䎒r;쀀𝔅pf;쀀𝔹eve;䋘còēmpeq;扎܀HOacdefhilorsuōőŖƀƞƢƵƷƺǜȕɳɸɾcy;䐧PY耻©䂩ƀcpyŝŢźute;䄆Ā;iŧŨ拒talDifferentialD;慅leys;愭ȀaeioƉƎƔƘron;䄌dil耻Ç䃇rc;䄈nint;戰ot;䄊ĀdnƧƭilla;䂸terDot;䂷òſi;䎧rcleȀDMPTǇǋǑǖot;抙inus;抖lus;投imes;抗oĀcsǢǸkwiseContourIntegral;戲eCurlyĀDQȃȏoubleQuote;思uote;怙ȀlnpuȞȨɇɕonĀ;eȥȦ户;橴ƀgitȯȶȺruent;扡nt;戯ourIntegral;戮ĀfrɌɎ;愂oduct;成nterClockwiseContourIntegral;戳oss;樯cr;쀀𝒞pĀ;Cʄʅ拓ap;才րDJSZacefiosʠʬʰʴʸˋ˗ˡ˦̳ҍĀ;oŹʥtrahd;椑cy;䐂cy;䐅cy;䐏ƀgrsʿ˄ˇger;怡r;憡hv;櫤Āayː˕ron;䄎;䐔lĀ;t˝˞戇a;䎔r;쀀𝔇Āaf˫̧Ācm˰̢riticalȀADGT̖̜̀̆cute;䂴oŴ̋̍;䋙bleAcute;䋝rave;䁠ilde;䋜ond;拄ferentialD;慆Ѱ̽\0\0\0͔͂\0Ѕf;쀀𝔻ƀ;DE͈͉͍䂨ot;惜qual;扐blèCDLRUVͣͲ΂ϏϢϸontourIntegraìȹoɴ͹\0\0ͻ»͉nArrow;懓Āeo·ΤftƀARTΐΖΡrrow;懐ightArrow;懔eåˊngĀLRΫτeftĀARγιrrow;柸ightArrow;柺ightArrow;柹ightĀATϘϞrrow;懒ee;抨pɁϩ\0\0ϯrrow;懑ownArrow;懕erticalBar;戥ǹABLRTaВЪаўѿͼrrowƀ;BUНОТ憓ar;椓pArrow;懵reve;䌑eft˒к\0ц\0ѐightVector;楐eeVector;楞ectorĀ;Bљњ憽ar;楖ightǔѧ\0ѱeeVector;楟ectorĀ;BѺѻ懁ar;楗eeĀ;A҆҇护rrow;憧ĀctҒҗr;쀀𝒟rok;䄐ࠀNTacdfglmopqstuxҽӀӄӋӞӢӧӮӵԡԯԶՒ՝ՠեG;䅊H耻Ð䃐cute耻É䃉ƀaiyӒӗӜron;䄚rc耻Ê䃊;䐭ot;䄖r;쀀𝔈rave耻È䃈ement;戈ĀapӺӾcr;䄒tyɓԆ\0\0ԒmallSquare;旻erySmallSquare;斫ĀgpԦԪon;䄘f;쀀𝔼silon;䎕uĀaiԼՉlĀ;TՂՃ橵ilde;扂librium;懌Āci՗՚r;愰m;橳a;䎗ml耻Ë䃋Āipժկsts;戃onentialE;慇ʀcfiosօֈ֍ֲ׌y;䐤r;쀀𝔉lledɓ֗\0\0֣mallSquare;旼erySmallSquare;斪Ͱֺ\0ֿ\0\0ׄf;쀀𝔽All;戀riertrf;愱cò׋؀JTabcdfgorstר׬ׯ׺؀ؒؖ؛؝أ٬ٲcy;䐃耻>䀾mmaĀ;d׷׸䎓;䏜reve;䄞ƀeiy؇،ؐdil;䄢rc;䄜;䐓ot;䄠r;쀀𝔊;拙pf;쀀𝔾eater̀EFGLSTصلَٖٛ٦qualĀ;Lؾؿ扥ess;招ullEqual;执reater;檢ess;扷lantEqual;橾ilde;扳cr;쀀𝒢;扫ЀAacfiosuڅڋږڛڞڪھۊRDcy;䐪Āctڐڔek;䋇;䁞irc;䄤r;愌lbertSpace;愋ǰگ\0ڲf;愍izontalLine;攀Āctۃۅòکrok;䄦mpńېۘownHumðįqual;扏܀EJOacdfgmnostuۺ۾܃܇܎ܚܞܡܨ݄ݸދޏޕcy;䐕lig;䄲cy;䐁cute耻Í䃍Āiyܓܘrc耻Î䃎;䐘ot;䄰r;愑rave耻Ì䃌ƀ;apܠܯܿĀcgܴܷr;䄪inaryI;慈lieóϝǴ݉\0ݢĀ;eݍݎ戬Āgrݓݘral;戫section;拂isibleĀCTݬݲomma;恣imes;恢ƀgptݿރވon;䄮f;쀀𝕀a;䎙cr;愐ilde;䄨ǫޚ\0ޞcy;䐆l耻Ï䃏ʀcfosuެ޷޼߂ߐĀiyޱ޵rc;䄴;䐙r;쀀𝔍pf;쀀𝕁ǣ߇\0ߌr;쀀𝒥rcy;䐈kcy;䐄΀HJacfosߤߨ߽߬߱ࠂࠈcy;䐥cy;䐌ppa;䎚Āey߶߻dil;䄶;䐚r;쀀𝔎pf;쀀𝕂cr;쀀𝒦րJTaceflmostࠥࠩࠬࡐࡣ঳সে্਷ੇcy;䐉耻<䀼ʀcmnpr࠷࠼ࡁࡄࡍute;䄹bda;䎛g;柪lacetrf;愒r;憞ƀaeyࡗ࡜ࡡron;䄽dil;䄻;䐛Āfsࡨ॰tԀACDFRTUVarࡾࢩࢱࣦ࣠ࣼयज़ΐ४Ānrࢃ࢏gleBracket;柨rowƀ;BR࢙࢚࢞憐ar;懤ightArrow;懆eiling;挈oǵࢷ\0ࣃbleBracket;柦nǔࣈ\0࣒eeVector;楡ectorĀ;Bࣛࣜ懃ar;楙loor;挊ightĀAV࣯ࣵrrow;憔ector;楎Āerँगeƀ;AVउऊऐ抣rrow;憤ector;楚iangleƀ;BEतथऩ抲ar;槏qual;抴pƀDTVषूौownVector;楑eeVector;楠ectorĀ;Bॖॗ憿ar;楘ectorĀ;B॥०憼ar;楒ightáΜs̀EFGLSTॾঋকঝঢভqualGreater;拚ullEqual;扦reater;扶ess;檡lantEqual;橽ilde;扲r;쀀𝔏Ā;eঽা拘ftarrow;懚idot;䄿ƀnpw৔ਖਛgȀLRlr৞৷ਂਐeftĀAR০৬rrow;柵ightArrow;柷ightArrow;柶eftĀarγਊightáοightáϊf;쀀𝕃erĀLRਢਬeftArrow;憙ightArrow;憘ƀchtਾੀੂòࡌ;憰rok;䅁;扪Ѐacefiosuਗ਼੝੠੷੼અઋ઎p;椅y;䐜Ādl੥੯iumSpace;恟lintrf;愳r;쀀𝔐nusPlus;戓pf;쀀𝕄cò੶;䎜ҀJacefostuણધભીଔଙඑ඗ඞcy;䐊cute;䅃ƀaey઴હાron;䅇dil;䅅;䐝ƀgswે૰଎ativeƀMTV૓૟૨ediumSpace;怋hiĀcn૦૘ë૙eryThiî૙tedĀGL૸ଆreaterGreateòٳessLesóੈLine;䀊r;쀀𝔑ȀBnptଢନଷ଺reak;恠BreakingSpace;䂠f;愕ڀ;CDEGHLNPRSTV୕ୖ୪୼஡௫ఄ౞಄ದ೘ൡඅ櫬Āou୛୤ngruent;扢pCap;扭oubleVerticalBar;戦ƀlqxஃஊ஛ement;戉ualĀ;Tஒஓ扠ilde;쀀≂̸ists;戄reater΀;EFGLSTஶஷ஽௉௓௘௥扯qual;扱ullEqual;쀀≧̸reater;쀀≫̸ess;批lantEqual;쀀⩾̸ilde;扵umpń௲௽ownHump;쀀≎̸qual;쀀≏̸eĀfsఊధtTriangleƀ;BEచఛడ拪ar;쀀⧏̸qual;括s̀;EGLSTవశ఼ౄోౘ扮qual;扰reater;扸ess;쀀≪̸lantEqual;쀀⩽̸ilde;扴estedĀGL౨౹reaterGreater;쀀⪢̸essLess;쀀⪡̸recedesƀ;ESಒಓಛ技qual;쀀⪯̸lantEqual;拠ĀeiಫಹverseElement;戌ghtTriangleƀ;BEೋೌ೒拫ar;쀀⧐̸qual;拭ĀquೝഌuareSuĀbp೨೹setĀ;E೰ೳ쀀⊏̸qual;拢ersetĀ;Eഃആ쀀⊐̸qual;拣ƀbcpഓതൎsetĀ;Eഛഞ쀀⊂⃒qual;抈ceedsȀ;ESTലള഻െ抁qual;쀀⪰̸lantEqual;拡ilde;쀀≿̸ersetĀ;E൘൛쀀⊃⃒qual;抉ildeȀ;EFT൮൯൵ൿ扁qual;扄ullEqual;扇ilde;扉erticalBar;戤cr;쀀𝒩ilde耻Ñ䃑;䎝܀Eacdfgmoprstuvලෂ෉෕ෛ෠෧෼ขภยา฿ไlig;䅒cute耻Ó䃓Āiy෎ීrc耻Ô䃔;䐞blac;䅐r;쀀𝔒rave耻Ò䃒ƀaei෮ෲ෶cr;䅌ga;䎩cron;䎟pf;쀀𝕆enCurlyĀDQฎบoubleQuote;怜uote;怘;橔Āclวฬr;쀀𝒪ash耻Ø䃘iŬื฼de耻Õ䃕es;樷ml耻Ö䃖erĀBP๋๠Āar๐๓r;怾acĀek๚๜;揞et;掴arenthesis;揜Ҁacfhilors๿ງຊຏຒດຝະ໼rtialD;戂y;䐟r;쀀𝔓i;䎦;䎠usMinus;䂱Āipຢອncareplanåڝf;愙Ȁ;eio຺ູ໠໤檻cedesȀ;EST່້໏໚扺qual;檯lantEqual;扼ilde;找me;怳Ādp໩໮uct;戏ortionĀ;aȥ໹l;戝Āci༁༆r;쀀𝒫;䎨ȀUfos༑༖༛༟OT耻"䀢r;쀀𝔔pf;愚cr;쀀𝒬؀BEacefhiorsu༾གྷཇའཱིྦྷྪྭ႖ႩႴႾarr;椐G耻®䂮ƀcnrཎནབute;䅔g;柫rĀ;tཛྷཝ憠l;椖ƀaeyཧཬཱron;䅘dil;䅖;䐠Ā;vླྀཹ愜erseĀEUྂྙĀlq྇ྎement;戋uilibrium;懋pEquilibrium;楯r»ཹo;䎡ghtЀACDFTUVa࿁࿫࿳ဢဨၛႇϘĀnr࿆࿒gleBracket;柩rowƀ;BL࿜࿝࿡憒ar;懥eftArrow;懄eiling;按oǵ࿹\0စbleBracket;柧nǔည\0နeeVector;楝ectorĀ;Bဝသ懂ar;楕loor;挋Āerိ၃eƀ;AVဵံြ抢rrow;憦ector;楛iangleƀ;BEၐၑၕ抳ar;槐qual;抵pƀDTVၣၮၸownVector;楏eeVector;楜ectorĀ;Bႂႃ憾ar;楔ectorĀ;B႑႒懀ar;楓Āpuႛ႞f;愝ndImplies;楰ightarrow;懛ĀchႹႼr;愛;憱leDelayed;槴ڀHOacfhimoqstuფჱჷჽᄙᄞᅑᅖᅡᅧᆵᆻᆿĀCcჩხHcy;䐩y;䐨FTcy;䐬cute;䅚ʀ;aeiyᄈᄉᄎᄓᄗ檼ron;䅠dil;䅞rc;䅜;䐡r;쀀𝔖ortȀDLRUᄪᄴᄾᅉownArrow»ОeftArrow»࢚ightArrow»࿝pArrow;憑gma;䎣allCircle;战pf;쀀𝕊ɲᅭ\0\0ᅰt;戚areȀ;ISUᅻᅼᆉᆯ斡ntersection;抓uĀbpᆏᆞsetĀ;Eᆗᆘ抏qual;抑ersetĀ;Eᆨᆩ抐qual;抒nion;抔cr;쀀𝒮ar;拆ȀbcmpᇈᇛሉላĀ;sᇍᇎ拐etĀ;Eᇍᇕqual;抆ĀchᇠህeedsȀ;ESTᇭᇮᇴᇿ扻qual;檰lantEqual;扽ilde;承Tháྌ;我ƀ;esሒሓሣ拑rsetĀ;Eሜም抃qual;抇et»ሓրHRSacfhiorsሾቄ቉ቕ቞ቱቶኟዂወዑORN耻Þ䃞ADE;愢ĀHc቎ቒcy;䐋y;䐦Ābuቚቜ;䀉;䎤ƀaeyብቪቯron;䅤dil;䅢;䐢r;쀀𝔗Āeiቻ኉ǲኀ\0ኇefore;戴a;䎘Ācn኎ኘkSpace;쀀  Space;怉ldeȀ;EFTካኬኲኼ戼qual;扃ullEqual;扅ilde;扈pf;쀀𝕋ipleDot;惛Āctዖዛr;쀀𝒯rok;䅦ૡዷጎጚጦ\0ጬጱ\0\0\0\0\0ጸጽ፷ᎅ\0᏿ᐄᐊᐐĀcrዻጁute耻Ú䃚rĀ;oጇገ憟cir;楉rǣጓ\0጖y;䐎ve;䅬Āiyጞጣrc耻Û䃛;䐣blac;䅰r;쀀𝔘rave耻Ù䃙acr;䅪Ādiፁ፩erĀBPፈ፝Āarፍፐr;䁟acĀekፗፙ;揟et;掵arenthesis;揝onĀ;P፰፱拃lus;抎Āgp፻፿on;䅲f;쀀𝕌ЀADETadps᎕ᎮᎸᏄϨᏒᏗᏳrrowƀ;BDᅐᎠᎤar;椒ownArrow;懅ownArrow;憕quilibrium;楮eeĀ;AᏋᏌ报rrow;憥ownáϳerĀLRᏞᏨeftArrow;憖ightArrow;憗iĀ;lᏹᏺ䏒on;䎥ing;䅮cr;쀀𝒰ilde;䅨ml耻Ü䃜ҀDbcdefosvᐧᐬᐰᐳᐾᒅᒊᒐᒖash;披ar;櫫y;䐒ashĀ;lᐻᐼ抩;櫦Āerᑃᑅ;拁ƀbtyᑌᑐᑺar;怖Ā;iᑏᑕcalȀBLSTᑡᑥᑪᑴar;戣ine;䁼eparator;杘ilde;所ThinSpace;怊r;쀀𝔙pf;쀀𝕍cr;쀀𝒱dash;抪ʀcefosᒧᒬᒱᒶᒼirc;䅴dge;拀r;쀀𝔚pf;쀀𝕎cr;쀀𝒲Ȁfiosᓋᓐᓒᓘr;쀀𝔛;䎞pf;쀀𝕏cr;쀀𝒳ҀAIUacfosuᓱᓵᓹᓽᔄᔏᔔᔚᔠcy;䐯cy;䐇cy;䐮cute耻Ý䃝Āiyᔉᔍrc;䅶;䐫r;쀀𝔜pf;쀀𝕐cr;쀀𝒴ml;䅸ЀHacdefosᔵᔹᔿᕋᕏᕝᕠᕤcy;䐖cute;䅹Āayᕄᕉron;䅽;䐗ot;䅻ǲᕔ\0ᕛoWidtè૙a;䎖r;愨pf;愤cr;쀀𝒵௡ᖃᖊᖐ\0ᖰᖶᖿ\0\0\0\0ᗆᗛᗫᙟ᙭\0ᚕ᚛ᚲᚹ\0ᚾcute耻á䃡reve;䄃̀;Ediuyᖜᖝᖡᖣᖨᖭ戾;쀀∾̳;房rc耻â䃢te肻´̆;䐰lig耻æ䃦Ā;r²ᖺ;쀀𝔞rave耻à䃠ĀepᗊᗖĀfpᗏᗔsym;愵èᗓha;䎱ĀapᗟcĀclᗤᗧr;䄁g;樿ɤᗰ\0\0ᘊʀ;adsvᗺᗻᗿᘁᘇ戧nd;橕;橜lope;橘;橚΀;elmrszᘘᘙᘛᘞᘿᙏᙙ戠;榤e»ᘙsdĀ;aᘥᘦ戡ѡᘰᘲᘴᘶᘸᘺᘼᘾ;榨;榩;榪;榫;榬;榭;榮;榯tĀ;vᙅᙆ戟bĀ;dᙌᙍ抾;榝Āptᙔᙗh;戢»¹arr;捼Āgpᙣᙧon;䄅f;쀀𝕒΀;Eaeiop዁ᙻᙽᚂᚄᚇᚊ;橰cir;橯;扊d;手s;䀧roxĀ;e዁ᚒñᚃing耻å䃥ƀctyᚡᚦᚨr;쀀𝒶;䀪mpĀ;e዁ᚯñʈilde耻ã䃣ml耻ä䃤Āciᛂᛈoninôɲnt;樑ࠀNabcdefiklnoprsu᛭ᛱᜰ᜼ᝃᝈ᝸᝽០៦ᠹᡐᜍ᤽᥈ᥰot;櫭Ācrᛶ᜞kȀcepsᜀᜅᜍᜓong;扌psilon;䏶rime;怵imĀ;e᜚᜛戽q;拍Ŷᜢᜦee;抽edĀ;gᜬᜭ挅e»ᜭrkĀ;t፜᜷brk;掶Āoyᜁᝁ;䐱quo;怞ʀcmprtᝓ᝛ᝡᝤᝨausĀ;eĊĉptyv;榰séᜌnoõēƀahwᝯ᝱ᝳ;䎲;愶een;扬r;쀀𝔟g΀costuvwឍឝឳេ៕៛៞ƀaiuបពរðݠrc;旯p»፱ƀdptឤឨឭot;樀lus;樁imes;樂ɱឹ\0\0ើcup;樆ar;昅riangleĀdu៍្own;施p;斳plus;樄eåᑄåᒭarow;植ƀako៭ᠦᠵĀcn៲ᠣkƀlst៺֫᠂ozenge;槫riangleȀ;dlr᠒᠓᠘᠝斴own;斾eft;旂ight;斸k;搣Ʊᠫ\0ᠳƲᠯ\0ᠱ;斒;斑4;斓ck;斈ĀeoᠾᡍĀ;qᡃᡆ쀀=⃥uiv;쀀≡⃥t;挐Ȁptwxᡙᡞᡧᡬf;쀀𝕓Ā;tᏋᡣom»Ꮜtie;拈؀DHUVbdhmptuvᢅᢖᢪᢻᣗᣛᣬ᣿ᤅᤊᤐᤡȀLRlrᢎᢐᢒᢔ;敗;敔;敖;敓ʀ;DUduᢡᢢᢤᢦᢨ敐;敦;敩;敤;敧ȀLRlrᢳᢵᢷᢹ;敝;敚;敜;教΀;HLRhlrᣊᣋᣍᣏᣑᣓᣕ救;敬;散;敠;敫;敢;敟ox;槉ȀLRlrᣤᣦᣨᣪ;敕;敒;攐;攌ʀ;DUduڽ᣷᣹᣻᣽;敥;敨;攬;攴inus;抟lus;択imes;抠ȀLRlrᤙᤛᤝ᤟;敛;敘;攘;攔΀;HLRhlrᤰᤱᤳᤵᤷ᤻᤹攂;敪;敡;敞;攼;攤;攜Āevģ᥂bar耻¦䂦Ȁceioᥑᥖᥚᥠr;쀀𝒷mi;恏mĀ;e᜚᜜lƀ;bhᥨᥩᥫ䁜;槅sub;柈Ŭᥴ᥾lĀ;e᥹᥺怢t»᥺pƀ;Eeįᦅᦇ;檮Ā;qۜۛೡᦧ\0᧨ᨑᨕᨲ\0ᨷᩐ\0\0᪴\0\0᫁\0\0ᬡᬮ᭍᭒\0᯽\0ᰌƀcpr᦭ᦲ᧝ute;䄇̀;abcdsᦿᧀᧄ᧊᧕᧙戩nd;橄rcup;橉Āau᧏᧒p;橋p;橇ot;橀;쀀∩︀Āeo᧢᧥t;恁îړȀaeiu᧰᧻ᨁᨅǰ᧵\0᧸s;橍on;䄍dil耻ç䃧rc;䄉psĀ;sᨌᨍ橌m;橐ot;䄋ƀdmnᨛᨠᨦil肻¸ƭptyv;榲t脀¢;eᨭᨮ䂢räƲr;쀀𝔠ƀceiᨽᩀᩍy;䑇ckĀ;mᩇᩈ朓ark»ᩈ;䏇r΀;Ecefms᩟᩠ᩢᩫ᪤᪪᪮旋;槃ƀ;elᩩᩪᩭ䋆q;扗eɡᩴ\0\0᪈rrowĀlr᩼᪁eft;憺ight;憻ʀRSacd᪒᪔᪖᪚᪟»ཇ;擈st;抛irc;抚ash;抝nint;樐id;櫯cir;槂ubsĀ;u᪻᪼晣it»᪼ˬ᫇᫔᫺\0ᬊonĀ;eᫍᫎ䀺Ā;qÇÆɭ᫙\0\0᫢aĀ;t᫞᫟䀬;䁀ƀ;fl᫨᫩᫫戁îᅠeĀmx᫱᫶ent»᫩eóɍǧ᫾\0ᬇĀ;dኻᬂot;橭nôɆƀfryᬐᬔᬗ;쀀𝕔oäɔ脀©;sŕᬝr;愗Āaoᬥᬩrr;憵ss;朗Ācuᬲᬷr;쀀𝒸Ābpᬼ᭄Ā;eᭁᭂ櫏;櫑Ā;eᭉᭊ櫐;櫒dot;拯΀delprvw᭠᭬᭷ᮂᮬᯔ᯹arrĀlr᭨᭪;椸;椵ɰ᭲\0\0᭵r;拞c;拟arrĀ;p᭿ᮀ憶;椽̀;bcdosᮏᮐᮖᮡᮥᮨ截rcap;橈Āauᮛᮞp;橆p;橊ot;抍r;橅;쀀∪︀Ȁalrv᮵ᮿᯞᯣrrĀ;mᮼᮽ憷;椼yƀevwᯇᯔᯘqɰᯎ\0\0ᯒreã᭳uã᭵ee;拎edge;拏en耻¤䂤earrowĀlrᯮ᯳eft»ᮀight»ᮽeäᯝĀciᰁᰇoninôǷnt;戱lcty;挭ঀAHabcdefhijlorstuwz᰸᰻᰿ᱝᱩᱵᲊᲞᲬᲷ᳻᳿ᴍᵻᶑᶫᶻ᷆᷍rò΁ar;楥Ȁglrs᱈ᱍ᱒᱔ger;怠eth;愸òᄳhĀ;vᱚᱛ怐»ऊūᱡᱧarow;椏aã̕Āayᱮᱳron;䄏;䐴ƀ;ao̲ᱼᲄĀgrʿᲁr;懊tseq;橷ƀglmᲑᲔᲘ耻°䂰ta;䎴ptyv;榱ĀirᲣᲨsht;楿;쀀𝔡arĀlrᲳᲵ»ࣜ»သʀaegsv᳂͸᳖᳜᳠mƀ;oș᳊᳔ndĀ;ș᳑uit;晦amma;䏝in;拲ƀ;io᳧᳨᳸䃷de脀÷;o᳧ᳰntimes;拇nø᳷cy;䑒cɯᴆ\0\0ᴊrn;挞op;挍ʀlptuwᴘᴝᴢᵉᵕlar;䀤f;쀀𝕕ʀ;emps̋ᴭᴷᴽᵂqĀ;d͒ᴳot;扑inus;戸lus;戔quare;抡blebarwedgåúnƀadhᄮᵝᵧownarrowóᲃarpoonĀlrᵲᵶefôᲴighôᲶŢᵿᶅkaro÷གɯᶊ\0\0ᶎrn;挟op;挌ƀcotᶘᶣᶦĀryᶝᶡ;쀀𝒹;䑕l;槶rok;䄑Ādrᶰᶴot;拱iĀ;fᶺ᠖斿Āah᷀᷃ròЩaòྦangle;榦Āci᷒ᷕy;䑟grarr;柿ऀDacdefglmnopqrstuxḁḉḙḸոḼṉṡṾấắẽỡἪἷὄ὎὚ĀDoḆᴴoôᲉĀcsḎḔute耻é䃩ter;橮ȀaioyḢḧḱḶron;䄛rĀ;cḭḮ扖耻ê䃪lon;払;䑍ot;䄗ĀDrṁṅot;扒;쀀𝔢ƀ;rsṐṑṗ檚ave耻è䃨Ā;dṜṝ檖ot;檘Ȁ;ilsṪṫṲṴ檙nters;揧;愓Ā;dṹṺ檕ot;檗ƀapsẅẉẗcr;䄓tyƀ;svẒẓẕ戅et»ẓpĀ1;ẝẤĳạả;怄;怅怃ĀgsẪẬ;䅋p;怂ĀgpẴẸon;䄙f;쀀𝕖ƀalsỄỎỒrĀ;sỊị拕l;槣us;橱iƀ;lvỚớở䎵on»ớ;䏵ȀcsuvỪỳἋἣĀioữḱrc»Ḯɩỹ\0\0ỻíՈantĀglἂἆtr»ṝess»Ṻƀaeiἒ἖Ἒls;䀽st;扟vĀ;DȵἠD;橸parsl;槥ĀDaἯἳot;打rr;楱ƀcdiἾὁỸr;愯oô͒ĀahὉὋ;䎷耻ð䃰Āmrὓὗl耻ë䃫o;悬ƀcipὡὤὧl;䀡sôծĀeoὬὴctatioîՙnentialåչৡᾒ\0ᾞ\0ᾡᾧ\0\0ῆῌ\0ΐ\0ῦῪ \0 ⁚llingdotseñṄy;䑄male;晀ƀilrᾭᾳ῁lig;耀ﬃɩᾹ\0\0᾽g;耀ﬀig;耀ﬄ;쀀𝔣lig;耀ﬁlig;쀀fjƀaltῙ῜ῡt;晭ig;耀ﬂns;斱of;䆒ǰ΅\0ῳf;쀀𝕗ĀakֿῷĀ;vῼ´拔;櫙artint;樍Āao‌⁕Ācs‑⁒α‚‰‸⁅⁈\0⁐β•‥‧‪‬\0‮耻½䂽;慓耻¼䂼;慕;慙;慛Ƴ‴\0‶;慔;慖ʴ‾⁁\0\0⁃耻¾䂾;慗;慜5;慘ƶ⁌\0⁎;慚;慝8;慞l;恄wn;挢cr;쀀𝒻ࢀEabcdefgijlnorstv₂₉₟₥₰₴⃰⃵⃺⃿℃ℒℸ̗ℾ⅒↞Ā;lٍ₇;檌ƀcmpₐₕ₝ute;䇵maĀ;dₜ᳚䎳;檆reve;䄟Āiy₪₮rc;䄝;䐳ot;䄡Ȁ;lqsؾق₽⃉ƀ;qsؾٌ⃄lanô٥Ȁ;cdl٥⃒⃥⃕c;檩otĀ;o⃜⃝檀Ā;l⃢⃣檂;檄Ā;e⃪⃭쀀⋛︀s;檔r;쀀𝔤Ā;gٳ؛mel;愷cy;䑓Ȁ;Eajٚℌℎℐ;檒;檥;檤ȀEaesℛℝ℩ℴ;扩pĀ;p℣ℤ檊rox»ℤĀ;q℮ℯ檈Ā;q℮ℛim;拧pf;쀀𝕘Āci⅃ⅆr;愊mƀ;el٫ⅎ⅐;檎;檐茀>;cdlqr׮ⅠⅪⅮⅳⅹĀciⅥⅧ;檧r;橺ot;拗Par;榕uest;橼ʀadelsↄⅪ←ٖ↛ǰ↉\0↎proø₞r;楸qĀlqؿ↖lesó₈ií٫Āen↣↭rtneqq;쀀≩︀Å↪ԀAabcefkosy⇄⇇⇱⇵⇺∘∝∯≨≽ròΠȀilmr⇐⇔⇗⇛rsðᒄf»․ilôکĀdr⇠⇤cy;䑊ƀ;cwࣴ⇫⇯ir;楈;憭ar;意irc;䄥ƀalr∁∎∓rtsĀ;u∉∊晥it»∊lip;怦con;抹r;쀀𝔥sĀew∣∩arow;椥arow;椦ʀamopr∺∾≃≞≣rr;懿tht;戻kĀlr≉≓eftarrow;憩ightarrow;憪f;쀀𝕙bar;怕ƀclt≯≴≸r;쀀𝒽asè⇴rok;䄧Ābp⊂⊇ull;恃hen»ᱛૡ⊣\0⊪\0⊸⋅⋎\0⋕⋳\0\0⋸⌢⍧⍢⍿\0⎆⎪⎴cute耻í䃭ƀ;iyݱ⊰⊵rc耻î䃮;䐸Ācx⊼⊿y;䐵cl耻¡䂡ĀfrΟ⋉;쀀𝔦rave耻ì䃬Ȁ;inoܾ⋝⋩⋮Āin⋢⋦nt;樌t;戭fin;槜ta;愩lig;䄳ƀaop⋾⌚⌝ƀcgt⌅⌈⌗r;䄫ƀelpܟ⌏⌓inåގarôܠh;䄱f;抷ed;䆵ʀ;cfotӴ⌬⌱⌽⍁are;愅inĀ;t⌸⌹戞ie;槝doô⌙ʀ;celpݗ⍌⍐⍛⍡al;抺Āgr⍕⍙eróᕣã⍍arhk;樗rod;樼Ȁcgpt⍯⍲⍶⍻y;䑑on;䄯f;쀀𝕚a;䎹uest耻¿䂿Āci⎊⎏r;쀀𝒾nʀ;EdsvӴ⎛⎝⎡ӳ;拹ot;拵Ā;v⎦⎧拴;拳Ā;iݷ⎮lde;䄩ǫ⎸\0⎼cy;䑖l耻ï䃯̀cfmosu⏌⏗⏜⏡⏧⏵Āiy⏑⏕rc;䄵;䐹r;쀀𝔧ath;䈷pf;쀀𝕛ǣ⏬\0⏱r;쀀𝒿rcy;䑘kcy;䑔Ѐacfghjos␋␖␢␧␭␱␵␻ppaĀ;v␓␔䎺;䏰Āey␛␠dil;䄷;䐺r;쀀𝔨reen;䄸cy;䑅cy;䑜pf;쀀𝕜cr;쀀𝓀஀ABEHabcdefghjlmnoprstuv⑰⒁⒆⒍⒑┎┽╚▀♎♞♥♹♽⚚⚲⛘❝❨➋⟀⠁⠒ƀart⑷⑺⑼rò৆òΕail;椛arr;椎Ā;gঔ⒋;檋ar;楢ॣ⒥\0⒪\0⒱\0\0\0\0\0⒵Ⓔ\0ⓆⓈⓍ\0⓹ute;䄺mptyv;榴raîࡌbda;䎻gƀ;dlࢎⓁⓃ;榑åࢎ;檅uo耻«䂫rЀ;bfhlpst࢙ⓞⓦⓩ⓫⓮⓱⓵Ā;f࢝ⓣs;椟s;椝ë≒p;憫l;椹im;楳l;憢ƀ;ae⓿─┄檫il;椙Ā;s┉┊檭;쀀⪭︀ƀabr┕┙┝rr;椌rk;杲Āak┢┬cĀek┨┪;䁻;䁛Āes┱┳;榋lĀdu┹┻;榏;榍Ȁaeuy╆╋╖╘ron;䄾Ādi═╔il;䄼ìࢰâ┩;䐻Ȁcqrs╣╦╭╽a;椶uoĀ;rนᝆĀdu╲╷har;楧shar;楋h;憲ʀ;fgqs▋▌উ◳◿扤tʀahlrt▘▤▷◂◨rrowĀ;t࢙□aé⓶arpoonĀdu▯▴own»њp»०eftarrows;懇ightƀahs◍◖◞rrowĀ;sࣴࢧarpoonó྘quigarro÷⇰hreetimes;拋ƀ;qs▋ও◺lanôবʀ;cdgsব☊☍☝☨c;檨otĀ;o☔☕橿Ā;r☚☛檁;檃Ā;e☢☥쀀⋚︀s;檓ʀadegs☳☹☽♉♋pproøⓆot;拖qĀgq♃♅ôউgtò⒌ôছiíলƀilr♕࣡♚sht;楼;쀀𝔩Ā;Eজ♣;檑š♩♶rĀdu▲♮Ā;l॥♳;楪lk;斄cy;䑙ʀ;achtੈ⚈⚋⚑⚖rò◁orneòᴈard;楫ri;旺Āio⚟⚤dot;䅀ustĀ;a⚬⚭掰che»⚭ȀEaes⚻⚽⛉⛔;扨pĀ;p⛃⛄檉rox»⛄Ā;q⛎⛏檇Ā;q⛎⚻im;拦Ѐabnoptwz⛩⛴⛷✚✯❁❇❐Ānr⛮⛱g;柬r;懽rëࣁgƀlmr⛿✍✔eftĀar০✇ightá৲apsto;柼ightá৽parrowĀlr✥✩efô⓭ight;憬ƀafl✶✹✽r;榅;쀀𝕝us;樭imes;樴š❋❏st;戗áፎƀ;ef❗❘᠀旊nge»❘arĀ;l❤❥䀨t;榓ʀachmt❳❶❼➅➇ròࢨorneòᶌarĀ;d྘➃;業;怎ri;抿̀achiqt➘➝ੀ➢➮➻quo;怹r;쀀𝓁mƀ;egল➪➬;檍;檏Ābu┪➳oĀ;rฟ➹;怚rok;䅂萀<;cdhilqrࠫ⟒☹⟜⟠⟥⟪⟰Āci⟗⟙;檦r;橹reå◲mes;拉arr;楶uest;橻ĀPi⟵⟹ar;榖ƀ;ef⠀भ᠛旃rĀdu⠇⠍shar;楊har;楦Āen⠗⠡rtneqq;쀀≨︀Å⠞܀Dacdefhilnopsu⡀⡅⢂⢎⢓⢠⢥⢨⣚⣢⣤ઃ⣳⤂Dot;戺Ȁclpr⡎⡒⡣⡽r耻¯䂯Āet⡗⡙;時Ā;e⡞⡟朠se»⡟Ā;sျ⡨toȀ;dluျ⡳⡷⡻owîҌefôएðᏑker;斮Āoy⢇⢌mma;権;䐼ash;怔asuredangle»ᘦr;쀀𝔪o;愧ƀcdn⢯⢴⣉ro耻µ䂵Ȁ;acdᑤ⢽⣀⣄sôᚧir;櫰ot肻·Ƶusƀ;bd⣒ᤃ⣓戒Ā;uᴼ⣘;横ţ⣞⣡p;櫛ò−ðઁĀdp⣩⣮els;抧f;쀀𝕞Āct⣸⣽r;쀀𝓂pos»ᖝƀ;lm⤉⤊⤍䎼timap;抸ఀGLRVabcdefghijlmoprstuvw⥂⥓⥾⦉⦘⧚⧩⨕⨚⩘⩝⪃⪕⪤⪨⬄⬇⭄⭿⮮ⰴⱧⱼ⳩Āgt⥇⥋;쀀⋙̸Ā;v⥐௏쀀≫⃒ƀelt⥚⥲⥶ftĀar⥡⥧rrow;懍ightarrow;懎;쀀⋘̸Ā;v⥻ే쀀≪⃒ightarrow;懏ĀDd⦎⦓ash;抯ash;抮ʀbcnpt⦣⦧⦬⦱⧌la»˞ute;䅄g;쀀∠⃒ʀ;Eiop඄⦼⧀⧅⧈;쀀⩰̸d;쀀≋̸s;䅉roø඄urĀ;a⧓⧔普lĀ;s⧓ସǳ⧟\0⧣p肻 ଷmpĀ;e௹ఀʀaeouy⧴⧾⨃⨐⨓ǰ⧹\0⧻;橃on;䅈dil;䅆ngĀ;dൾ⨊ot;쀀⩭̸p;橂;䐽ash;怓΀;Aadqsxஒ⨩⨭⨻⩁⩅⩐rr;懗rĀhr⨳⨶k;椤Ā;oᏲᏰot;쀀≐̸uiöୣĀei⩊⩎ar;椨í஘istĀ;s஠டr;쀀𝔫ȀEest௅⩦⩹⩼ƀ;qs஼⩭௡ƀ;qs஼௅⩴lanô௢ií௪Ā;rஶ⪁»ஷƀAap⪊⪍⪑rò⥱rr;憮ar;櫲ƀ;svྍ⪜ྌĀ;d⪡⪢拼;拺cy;䑚΀AEadest⪷⪺⪾⫂⫅⫶⫹rò⥦;쀀≦̸rr;憚r;急Ȁ;fqs఻⫎⫣⫯tĀar⫔⫙rro÷⫁ightarro÷⪐ƀ;qs఻⪺⫪lanôౕĀ;sౕ⫴»శiíౝĀ;rవ⫾iĀ;eచథiäඐĀpt⬌⬑f;쀀𝕟膀¬;in⬙⬚⬶䂬nȀ;Edvஉ⬤⬨⬮;쀀⋹̸ot;쀀⋵̸ǡஉ⬳⬵;拷;拶iĀ;vಸ⬼ǡಸ⭁⭃;拾;拽ƀaor⭋⭣⭩rȀ;ast୻⭕⭚⭟lleì୻l;쀀⫽⃥;쀀∂̸lint;樔ƀ;ceಒ⭰⭳uåಥĀ;cಘ⭸Ā;eಒ⭽ñಘȀAait⮈⮋⮝⮧rò⦈rrƀ;cw⮔⮕⮙憛;쀀⤳̸;쀀↝̸ghtarrow»⮕riĀ;eೋೖ΀chimpqu⮽⯍⯙⬄୸⯤⯯Ȁ;cerല⯆ഷ⯉uå൅;쀀𝓃ortɭ⬅\0\0⯖ará⭖mĀ;e൮⯟Ā;q൴൳suĀbp⯫⯭å೸åഋƀbcp⯶ⰑⰙȀ;Ees⯿ⰀഢⰄ抄;쀀⫅̸etĀ;eഛⰋqĀ;qണⰀcĀ;eലⰗñസȀ;EesⰢⰣൟⰧ抅;쀀⫆̸etĀ;e൘ⰮqĀ;qൠⰣȀgilrⰽⰿⱅⱇìௗlde耻ñ䃱çృiangleĀlrⱒⱜeftĀ;eచⱚñదightĀ;eೋⱥñ೗Ā;mⱬⱭ䎽ƀ;esⱴⱵⱹ䀣ro;愖p;怇ҀDHadgilrsⲏⲔⲙⲞⲣⲰⲶⳓⳣash;抭arr;椄p;쀀≍⃒ash;抬ĀetⲨⲬ;쀀≥⃒;쀀>⃒nfin;槞ƀAetⲽⳁⳅrr;椂;쀀≤⃒Ā;rⳊⳍ쀀<⃒ie;쀀⊴⃒ĀAtⳘⳜrr;椃rie;쀀⊵⃒im;쀀∼⃒ƀAan⳰⳴ⴂrr;懖rĀhr⳺⳽k;椣Ā;oᏧᏥear;椧ቓ᪕\0\0\0\0\0\0\0\0\0\0\0\0\0ⴭ\0ⴸⵈⵠⵥ⵲ⶄᬇ\0\0ⶍⶫ\0ⷈⷎ\0ⷜ⸙⸫⸾⹃Ācsⴱ᪗ute耻ó䃳ĀiyⴼⵅrĀ;c᪞ⵂ耻ô䃴;䐾ʀabios᪠ⵒⵗǈⵚlac;䅑v;樸old;榼lig;䅓Ācr⵩⵭ir;榿;쀀𝔬ͯ⵹\0\0⵼\0ⶂn;䋛ave耻ò䃲;槁Ābmⶈ෴ar;榵Ȁacitⶕ⶘ⶥⶨrò᪀Āir⶝ⶠr;榾oss;榻nå๒;槀ƀaeiⶱⶵⶹcr;䅍ga;䏉ƀcdnⷀⷅǍron;䎿;榶pf;쀀𝕠ƀaelⷔ⷗ǒr;榷rp;榹΀;adiosvⷪⷫⷮ⸈⸍⸐⸖戨rò᪆Ȁ;efmⷷⷸ⸂⸅橝rĀ;oⷾⷿ愴f»ⷿ耻ª䂪耻º䂺gof;抶r;橖lope;橗;橛ƀclo⸟⸡⸧ò⸁ash耻ø䃸l;折iŬⸯ⸴de耻õ䃵esĀ;aǛ⸺s;樶ml耻ö䃶bar;挽ૡ⹞\0⹽\0⺀⺝\0⺢⺹\0\0⻋ຜ\0⼓\0\0⼫⾼\0⿈rȀ;astЃ⹧⹲຅脀¶;l⹭⹮䂶leìЃɩ⹸\0\0⹻m;櫳;櫽y;䐿rʀcimpt⺋⺏⺓ᡥ⺗nt;䀥od;䀮il;怰enk;怱r;쀀𝔭ƀimo⺨⺰⺴Ā;v⺭⺮䏆;䏕maô੶ne;明ƀ;tv⺿⻀⻈䏀chfork»´;䏖Āau⻏⻟nĀck⻕⻝kĀ;h⇴⻛;愎ö⇴sҀ;abcdemst⻳⻴ᤈ⻹⻽⼄⼆⼊⼎䀫cir;樣ir;樢Āouᵀ⼂;樥;橲n肻±ຝim;樦wo;樧ƀipu⼙⼠⼥ntint;樕f;쀀𝕡nd耻£䂣Ԁ;Eaceinosu່⼿⽁⽄⽇⾁⾉⾒⽾⾶;檳p;檷uå໙Ā;c໎⽌̀;acens່⽙⽟⽦⽨⽾pproø⽃urlyeñ໙ñ໎ƀaes⽯⽶⽺pprox;檹qq;檵im;拨iíໟmeĀ;s⾈ຮ怲ƀEas⽸⾐⽺ð⽵ƀdfp໬⾙⾯ƀals⾠⾥⾪lar;挮ine;挒urf;挓Ā;t໻⾴ï໻rel;抰Āci⿀⿅r;쀀𝓅;䏈ncsp;怈̀fiopsu⿚⋢⿟⿥⿫⿱r;쀀𝔮pf;쀀𝕢rime;恗cr;쀀𝓆ƀaeo⿸〉〓tĀei⿾々rnionóڰnt;樖stĀ;e【】䀿ñἙô༔઀ABHabcdefhilmnoprstux぀けさすムㄎㄫㅇㅢㅲㆎ㈆㈕㈤㈩㉘㉮㉲㊐㊰㊷ƀartぇおがròႳòϝail;検aròᱥar;楤΀cdenqrtとふへみわゔヌĀeuねぱ;쀀∽̱te;䅕iãᅮmptyv;榳gȀ;del࿑らるろ;榒;榥å࿑uo耻»䂻rր;abcfhlpstw࿜ガクシスゼゾダッデナp;極Ā;f࿠ゴs;椠;椳s;椞ë≝ð✮l;楅im;楴l;憣;憝Āaiパフil;椚oĀ;nホボ戶aló༞ƀabrョリヮrò៥rk;杳ĀakンヽcĀekヹ・;䁽;䁝Āes㄂㄄;榌lĀduㄊㄌ;榎;榐Ȁaeuyㄗㄜㄧㄩron;䅙Ādiㄡㄥil;䅗ì࿲âヺ;䑀Ȁclqsㄴㄷㄽㅄa;椷dhar;楩uoĀ;rȎȍh;憳ƀacgㅎㅟངlȀ;ipsླྀㅘㅛႜnåႻarôྩt;断ƀilrㅩဣㅮsht;楽;쀀𝔯ĀaoㅷㆆrĀduㅽㅿ»ѻĀ;l႑ㆄ;楬Ā;vㆋㆌ䏁;䏱ƀgns㆕ㇹㇼht̀ahlrstㆤㆰ㇂㇘㇤㇮rrowĀ;t࿜ㆭaéトarpoonĀduㆻㆿowîㅾp»႒eftĀah㇊㇐rrowó࿪arpoonóՑightarrows;應quigarro÷ニhreetimes;拌g;䋚ingdotseñἲƀahm㈍㈐㈓rò࿪aòՑ;怏oustĀ;a㈞㈟掱che»㈟mid;櫮Ȁabpt㈲㈽㉀㉒Ānr㈷㈺g;柭r;懾rëဃƀafl㉇㉊㉎r;榆;쀀𝕣us;樮imes;樵Āap㉝㉧rĀ;g㉣㉤䀩t;榔olint;樒arò㇣Ȁachq㉻㊀Ⴜ㊅quo;怺r;쀀𝓇Ābu・㊊oĀ;rȔȓƀhir㊗㊛㊠reåㇸmes;拊iȀ;efl㊪ၙᠡ㊫方tri;槎luhar;楨;愞ൡ㋕㋛㋟㌬㌸㍱\0㍺㎤\0\0㏬㏰\0㐨㑈㑚㒭㒱㓊㓱\0㘖\0\0㘳cute;䅛quï➺Ԁ;Eaceinpsyᇭ㋳㋵㋿㌂㌋㌏㌟㌦㌩;檴ǰ㋺\0㋼;檸on;䅡uåᇾĀ;dᇳ㌇il;䅟rc;䅝ƀEas㌖㌘㌛;檶p;檺im;择olint;樓iíሄ;䑁otƀ;be㌴ᵇ㌵担;橦΀Aacmstx㍆㍊㍗㍛㍞㍣㍭rr;懘rĀhr㍐㍒ë∨Ā;oਸ਼਴t耻§䂧i;䀻war;椩mĀin㍩ðnuóñt;朶rĀ;o㍶⁕쀀𝔰Ȁacoy㎂㎆㎑㎠rp;景Āhy㎋㎏cy;䑉;䑈rtɭ㎙\0\0㎜iäᑤaraì⹯耻­䂭Āgm㎨㎴maƀ;fv㎱㎲㎲䏃;䏂Ѐ;deglnprካ㏅㏉㏎㏖㏞㏡㏦ot;橪Ā;q኱ኰĀ;E㏓㏔檞;檠Ā;E㏛㏜檝;檟e;扆lus;樤arr;楲aròᄽȀaeit㏸㐈㐏㐗Āls㏽㐄lsetmé㍪hp;樳parsl;槤Ādlᑣ㐔e;挣Ā;e㐜㐝檪Ā;s㐢㐣檬;쀀⪬︀ƀflp㐮㐳㑂tcy;䑌Ā;b㐸㐹䀯Ā;a㐾㐿槄r;挿f;쀀𝕤aĀdr㑍ЂesĀ;u㑔㑕晠it»㑕ƀcsu㑠㑹㒟Āau㑥㑯pĀ;sᆈ㑫;쀀⊓︀pĀ;sᆴ㑵;쀀⊔︀uĀbp㑿㒏ƀ;esᆗᆜ㒆etĀ;eᆗ㒍ñᆝƀ;esᆨᆭ㒖etĀ;eᆨ㒝ñᆮƀ;afᅻ㒦ְrť㒫ֱ»ᅼaròᅈȀcemt㒹㒾㓂㓅r;쀀𝓈tmîñiì㐕aræᆾĀar㓎㓕rĀ;f㓔ឿ昆Āan㓚㓭ightĀep㓣㓪psiloîỠhé⺯s»⡒ʀbcmnp㓻㕞ሉ㖋㖎Ҁ;Edemnprs㔎㔏㔑㔕㔞㔣㔬㔱㔶抂;櫅ot;檽Ā;dᇚ㔚ot;櫃ult;櫁ĀEe㔨㔪;櫋;把lus;檿arr;楹ƀeiu㔽㕒㕕tƀ;en㔎㕅㕋qĀ;qᇚ㔏eqĀ;q㔫㔨m;櫇Ābp㕚㕜;櫕;櫓c̀;acensᇭ㕬㕲㕹㕻㌦pproø㋺urlyeñᇾñᇳƀaes㖂㖈㌛pproø㌚qñ㌗g;晪ڀ123;Edehlmnps㖩㖬㖯ሜ㖲㖴㗀㗉㗕㗚㗟㗨㗭耻¹䂹耻²䂲耻³䂳;櫆Āos㖹㖼t;檾ub;櫘Ā;dሢ㗅ot;櫄sĀou㗏㗒l;柉b;櫗arr;楻ult;櫂ĀEe㗤㗦;櫌;抋lus;櫀ƀeiu㗴㘉㘌tƀ;enሜ㗼㘂qĀ;qሢ㖲eqĀ;q㗧㗤m;櫈Ābp㘑㘓;櫔;櫖ƀAan㘜㘠㘭rr;懙rĀhr㘦㘨ë∮Ā;oਫ਩war;椪lig耻ß䃟௡㙑㙝㙠ዎ㙳㙹\0㙾㛂\0\0\0\0\0㛛㜃\0㜉㝬\0\0\0㞇ɲ㙖\0\0㙛get;挖;䏄rë๟ƀaey㙦㙫㙰ron;䅥dil;䅣;䑂lrec;挕r;쀀𝔱Ȁeiko㚆㚝㚵㚼ǲ㚋\0㚑eĀ4fኄኁaƀ;sv㚘㚙㚛䎸ym;䏑Ācn㚢㚲kĀas㚨㚮pproø዁im»ኬsðኞĀas㚺㚮ð዁rn耻þ䃾Ǭ̟㛆⋧es膀×;bd㛏㛐㛘䃗Ā;aᤏ㛕r;樱;樰ƀeps㛡㛣㜀á⩍Ȁ;bcf҆㛬㛰㛴ot;挶ir;櫱Ā;o㛹㛼쀀𝕥rk;櫚á㍢rime;怴ƀaip㜏㜒㝤dåቈ΀adempst㜡㝍㝀㝑㝗㝜㝟ngleʀ;dlqr㜰㜱㜶㝀㝂斵own»ᶻeftĀ;e⠀㜾ñम;扜ightĀ;e㊪㝋ñၚot;旬inus;樺lus;樹b;槍ime;樻ezium;揢ƀcht㝲㝽㞁Āry㝷㝻;쀀𝓉;䑆cy;䑛rok;䅧Āio㞋㞎xô᝷headĀlr㞗㞠eftarro÷ࡏightarrow»ཝऀAHabcdfghlmoprstuw㟐㟓㟗㟤㟰㟼㠎㠜㠣㠴㡑㡝㡫㢩㣌㣒㣪㣶ròϭar;楣Ācr㟜㟢ute耻ú䃺òᅐrǣ㟪\0㟭y;䑞ve;䅭Āiy㟵㟺rc耻û䃻;䑃ƀabh㠃㠆㠋ròᎭlac;䅱aòᏃĀir㠓㠘sht;楾;쀀𝔲rave耻ù䃹š㠧㠱rĀlr㠬㠮»ॗ»ႃlk;斀Āct㠹㡍ɯ㠿\0\0㡊rnĀ;e㡅㡆挜r»㡆op;挏ri;旸Āal㡖㡚cr;䅫肻¨͉Āgp㡢㡦on;䅳f;쀀𝕦̀adhlsuᅋ㡸㡽፲㢑㢠ownáᎳarpoonĀlr㢈㢌efô㠭ighô㠯iƀ;hl㢙㢚㢜䏅»ᏺon»㢚parrows;懈ƀcit㢰㣄㣈ɯ㢶\0\0㣁rnĀ;e㢼㢽挝r»㢽op;挎ng;䅯ri;旹cr;쀀𝓊ƀdir㣙㣝㣢ot;拰lde;䅩iĀ;f㜰㣨»᠓Āam㣯㣲rò㢨l耻ü䃼angle;榧ހABDacdeflnoprsz㤜㤟㤩㤭㦵㦸㦽㧟㧤㧨㧳㧹㧽㨁㨠ròϷarĀ;v㤦㤧櫨;櫩asèϡĀnr㤲㤷grt;榜΀eknprst㓣㥆㥋㥒㥝㥤㦖appá␕othinçẖƀhir㓫⻈㥙opô⾵Ā;hᎷ㥢ïㆍĀiu㥩㥭gmá㎳Ābp㥲㦄setneqĀ;q㥽㦀쀀⊊︀;쀀⫋︀setneqĀ;q㦏㦒쀀⊋︀;쀀⫌︀Āhr㦛㦟etá㚜iangleĀlr㦪㦯eft»थight»ၑy;䐲ash»ံƀelr㧄㧒㧗ƀ;beⷪ㧋㧏ar;抻q;扚lip;拮Ābt㧜ᑨaòᑩr;쀀𝔳tré㦮suĀbp㧯㧱»ജ»൙pf;쀀𝕧roð໻tré㦴Ācu㨆㨋r;쀀𝓋Ābp㨐㨘nĀEe㦀㨖»㥾nĀEe㦒㨞»㦐igzag;榚΀cefoprs㨶㨻㩖㩛㩔㩡㩪irc;䅵Ādi㩀㩑Ābg㩅㩉ar;機eĀ;qᗺ㩏;扙erp;愘r;쀀𝔴pf;쀀𝕨Ā;eᑹ㩦atèᑹcr;쀀𝓌ૣណ㪇\0㪋\0㪐㪛\0\0㪝㪨㪫㪯\0\0㫃㫎\0㫘ៜ៟tré៑r;쀀𝔵ĀAa㪔㪗ròσrò৶;䎾ĀAa㪡㪤ròθrò৫að✓is;拻ƀdptឤ㪵㪾Āfl㪺ឩ;쀀𝕩imåឲĀAa㫇㫊ròώròਁĀcq㫒ីr;쀀𝓍Āpt៖㫜ré។Ѐacefiosu㫰㫽㬈㬌㬑㬕㬛㬡cĀuy㫶㫻te耻ý䃽;䑏Āiy㬂㬆rc;䅷;䑋n耻¥䂥r;쀀𝔶cy;䑗pf;쀀𝕪cr;쀀𝓎Ācm㬦㬩y;䑎l耻ÿ䃿Ԁacdefhiosw㭂㭈㭔㭘㭤㭩㭭㭴㭺㮀cute;䅺Āay㭍㭒ron;䅾;䐷ot;䅼Āet㭝㭡træᕟa;䎶r;쀀𝔷cy;䐶grarr;懝pf;쀀𝕫cr;쀀𝓏Ājn㮅㮇;怍j;怌'.split("").map((e) => e.charCodeAt(0))
), wh = /* @__PURE__ */ new Map([
  [0, 65533],
  // C1 Unicode control character reference replacements
  [128, 8364],
  [130, 8218],
  [131, 402],
  [132, 8222],
  [133, 8230],
  [134, 8224],
  [135, 8225],
  [136, 710],
  [137, 8240],
  [138, 352],
  [139, 8249],
  [140, 338],
  [142, 381],
  [145, 8216],
  [146, 8217],
  [147, 8220],
  [148, 8221],
  [149, 8226],
  [150, 8211],
  [151, 8212],
  [152, 732],
  [153, 8482],
  [154, 353],
  [155, 8250],
  [156, 339],
  [158, 382],
  [159, 376]
]);
function Lh(e) {
  var t;
  return e >= 55296 && e <= 57343 || e > 1114111 ? 65533 : (t = wh.get(e)) !== null && t !== void 0 ? t : e;
}
var Oe;
(function(e) {
  e[e.NUM = 35] = "NUM", e[e.SEMI = 59] = "SEMI", e[e.EQUALS = 61] = "EQUALS", e[e.ZERO = 48] = "ZERO", e[e.NINE = 57] = "NINE", e[e.LOWER_A = 97] = "LOWER_A", e[e.LOWER_F = 102] = "LOWER_F", e[e.LOWER_X = 120] = "LOWER_X", e[e.LOWER_Z = 122] = "LOWER_Z", e[e.UPPER_A = 65] = "UPPER_A", e[e.UPPER_F = 70] = "UPPER_F", e[e.UPPER_Z = 90] = "UPPER_Z";
})(Oe || (Oe = {}));
const Rh = 32;
var Pt;
(function(e) {
  e[e.VALUE_LENGTH = 49152] = "VALUE_LENGTH", e[e.BRANCH_LENGTH = 16256] = "BRANCH_LENGTH", e[e.JUMP_TABLE = 127] = "JUMP_TABLE";
})(Pt || (Pt = {}));
function wi(e) {
  return e >= Oe.ZERO && e <= Oe.NINE;
}
function Oh(e) {
  return e >= Oe.UPPER_A && e <= Oe.UPPER_F || e >= Oe.LOWER_A && e <= Oe.LOWER_F;
}
function Dh(e) {
  return e >= Oe.UPPER_A && e <= Oe.UPPER_Z || e >= Oe.LOWER_A && e <= Oe.LOWER_Z || wi(e);
}
function Ph(e) {
  return e === Oe.EQUALS || Dh(e);
}
var Re;
(function(e) {
  e[e.EntityStart = 0] = "EntityStart", e[e.NumericStart = 1] = "NumericStart", e[e.NumericDecimal = 2] = "NumericDecimal", e[e.NumericHex = 3] = "NumericHex", e[e.NamedEntity = 4] = "NamedEntity";
})(Re || (Re = {}));
var yt;
(function(e) {
  e[e.Legacy = 0] = "Legacy", e[e.Strict = 1] = "Strict", e[e.Attribute = 2] = "Attribute";
})(yt || (yt = {}));
class Mh {
  constructor(t, n, r) {
    this.decodeTree = t, this.emitCodePoint = n, this.errors = r, this.state = Re.EntityStart, this.consumed = 1, this.result = 0, this.treeIndex = 0, this.excess = 1, this.decodeMode = yt.Strict;
  }
  /** Resets the instance to make it reusable. */
  startEntity(t) {
    this.decodeMode = t, this.state = Re.EntityStart, this.result = 0, this.treeIndex = 0, this.excess = 1, this.consumed = 1;
  }
  /**
   * Write an entity to the decoder. This can be called multiple times with partial entities.
   * If the entity is incomplete, the decoder will return -1.
   *
   * Mirrors the implementation of `getDecoder`, but with the ability to stop decoding if the
   * entity is incomplete, and resume when the next string is written.
   *
   * @param input The string containing the entity (or a continuation of the entity).
   * @param offset The offset at which the entity begins. Should be 0 if this is not the first call.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  write(t, n) {
    switch (this.state) {
      case Re.EntityStart:
        return t.charCodeAt(n) === Oe.NUM ? (this.state = Re.NumericStart, this.consumed += 1, this.stateNumericStart(t, n + 1)) : (this.state = Re.NamedEntity, this.stateNamedEntity(t, n));
      case Re.NumericStart:
        return this.stateNumericStart(t, n);
      case Re.NumericDecimal:
        return this.stateNumericDecimal(t, n);
      case Re.NumericHex:
        return this.stateNumericHex(t, n);
      case Re.NamedEntity:
        return this.stateNamedEntity(t, n);
    }
  }
  /**
   * Switches between the numeric decimal and hexadecimal states.
   *
   * Equivalent to the `Numeric character reference state` in the HTML spec.
   *
   * @param input The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNumericStart(t, n) {
    return n >= t.length ? -1 : (t.charCodeAt(n) | Rh) === Oe.LOWER_X ? (this.state = Re.NumericHex, this.consumed += 1, this.stateNumericHex(t, n + 1)) : (this.state = Re.NumericDecimal, this.stateNumericDecimal(t, n));
  }
  addToNumericResult(t, n, r, i) {
    if (n !== r) {
      const a = r - n;
      this.result = this.result * Math.pow(i, a) + Number.parseInt(t.substr(n, a), i), this.consumed += a;
    }
  }
  /**
   * Parses a hexadecimal numeric entity.
   *
   * Equivalent to the `Hexademical character reference state` in the HTML spec.
   *
   * @param input The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNumericHex(t, n) {
    const r = n;
    for (; n < t.length; ) {
      const i = t.charCodeAt(n);
      if (wi(i) || Oh(i))
        n += 1;
      else
        return this.addToNumericResult(t, r, n, 16), this.emitNumericEntity(i, 3);
    }
    return this.addToNumericResult(t, r, n, 16), -1;
  }
  /**
   * Parses a decimal numeric entity.
   *
   * Equivalent to the `Decimal character reference state` in the HTML spec.
   *
   * @param input The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNumericDecimal(t, n) {
    const r = n;
    for (; n < t.length; ) {
      const i = t.charCodeAt(n);
      if (wi(i))
        n += 1;
      else
        return this.addToNumericResult(t, r, n, 10), this.emitNumericEntity(i, 2);
    }
    return this.addToNumericResult(t, r, n, 10), -1;
  }
  /**
   * Validate and emit a numeric entity.
   *
   * Implements the logic from the `Hexademical character reference start
   * state` and `Numeric character reference end state` in the HTML spec.
   *
   * @param lastCp The last code point of the entity. Used to see if the
   *               entity was terminated with a semicolon.
   * @param expectedLength The minimum number of characters that should be
   *                       consumed. Used to validate that at least one digit
   *                       was consumed.
   * @returns The number of characters that were consumed.
   */
  emitNumericEntity(t, n) {
    var r;
    if (this.consumed <= n)
      return (r = this.errors) === null || r === void 0 || r.absenceOfDigitsInNumericCharacterReference(this.consumed), 0;
    if (t === Oe.SEMI)
      this.consumed += 1;
    else if (this.decodeMode === yt.Strict)
      return 0;
    return this.emitCodePoint(Lh(this.result), this.consumed), this.errors && (t !== Oe.SEMI && this.errors.missingSemicolonAfterCharacterReference(), this.errors.validateNumericCharacterReference(this.result)), this.consumed;
  }
  /**
   * Parses a named entity.
   *
   * Equivalent to the `Named character reference state` in the HTML spec.
   *
   * @param input The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNamedEntity(t, n) {
    const { decodeTree: r } = this;
    let i = r[this.treeIndex], a = (i & Pt.VALUE_LENGTH) >> 14;
    for (; n < t.length; n++, this.excess++) {
      const s = t.charCodeAt(n);
      if (this.treeIndex = vh(r, i, this.treeIndex + Math.max(1, a), s), this.treeIndex < 0)
        return this.result === 0 || // If we are parsing an attribute
        this.decodeMode === yt.Attribute && // We shouldn't have consumed any characters after the entity,
        (a === 0 || // And there should be no invalid characters.
        Ph(s)) ? 0 : this.emitNotTerminatedNamedEntity();
      if (i = r[this.treeIndex], a = (i & Pt.VALUE_LENGTH) >> 14, a !== 0) {
        if (s === Oe.SEMI)
          return this.emitNamedEntityData(this.treeIndex, a, this.consumed + this.excess);
        this.decodeMode !== yt.Strict && (this.result = this.treeIndex, this.consumed += this.excess, this.excess = 0);
      }
    }
    return -1;
  }
  /**
   * Emit a named entity that was not terminated with a semicolon.
   *
   * @returns The number of characters consumed.
   */
  emitNotTerminatedNamedEntity() {
    var t;
    const { result: n, decodeTree: r } = this, i = (r[n] & Pt.VALUE_LENGTH) >> 14;
    return this.emitNamedEntityData(n, i, this.consumed), (t = this.errors) === null || t === void 0 || t.missingSemicolonAfterCharacterReference(), this.consumed;
  }
  /**
   * Emit a named entity.
   *
   * @param result The index of the entity in the decode tree.
   * @param valueLength The number of bytes in the entity.
   * @param consumed The number of characters consumed.
   *
   * @returns The number of characters consumed.
   */
  emitNamedEntityData(t, n, r) {
    const { decodeTree: i } = this;
    return this.emitCodePoint(n === 1 ? i[t] & ~Pt.VALUE_LENGTH : i[t + 1], r), n === 3 && this.emitCodePoint(i[t + 2], r), r;
  }
  /**
   * Signal to the parser that the end of the input was reached.
   *
   * Remaining data will be emitted and relevant errors will be produced.
   *
   * @returns The number of characters consumed.
   */
  end() {
    var t;
    switch (this.state) {
      case Re.NamedEntity:
        return this.result !== 0 && (this.decodeMode !== yt.Attribute || this.result === this.treeIndex) ? this.emitNotTerminatedNamedEntity() : 0;
      // Otherwise, emit a numeric entity if we have one.
      case Re.NumericDecimal:
        return this.emitNumericEntity(0, 2);
      case Re.NumericHex:
        return this.emitNumericEntity(0, 3);
      case Re.NumericStart:
        return (t = this.errors) === null || t === void 0 || t.absenceOfDigitsInNumericCharacterReference(this.consumed), 0;
      case Re.EntityStart:
        return 0;
    }
  }
}
function vh(e, t, n, r) {
  const i = (t & Pt.BRANCH_LENGTH) >> 7, a = t & Pt.JUMP_TABLE;
  if (i === 0)
    return a !== 0 && r === a ? n : -1;
  if (a) {
    const o = r - a;
    return o < 0 || o >= i ? -1 : e[n + o] - 1;
  }
  let s = n, u = s + i - 1;
  for (; s <= u; ) {
    const o = s + u >>> 1, c = e[o];
    if (c < r)
      s = o + 1;
    else if (c > r)
      u = o - 1;
    else
      return e[o + i];
  }
  return -1;
}
var D;
(function(e) {
  e.HTML = "http://www.w3.org/1999/xhtml", e.MATHML = "http://www.w3.org/1998/Math/MathML", e.SVG = "http://www.w3.org/2000/svg", e.XLINK = "http://www.w3.org/1999/xlink", e.XML = "http://www.w3.org/XML/1998/namespace", e.XMLNS = "http://www.w3.org/2000/xmlns/";
})(D || (D = {}));
var Kt;
(function(e) {
  e.TYPE = "type", e.ACTION = "action", e.ENCODING = "encoding", e.PROMPT = "prompt", e.NAME = "name", e.COLOR = "color", e.FACE = "face", e.SIZE = "size";
})(Kt || (Kt = {}));
var tt;
(function(e) {
  e.NO_QUIRKS = "no-quirks", e.QUIRKS = "quirks", e.LIMITED_QUIRKS = "limited-quirks";
})(tt || (tt = {}));
var N;
(function(e) {
  e.A = "a", e.ADDRESS = "address", e.ANNOTATION_XML = "annotation-xml", e.APPLET = "applet", e.AREA = "area", e.ARTICLE = "article", e.ASIDE = "aside", e.B = "b", e.BASE = "base", e.BASEFONT = "basefont", e.BGSOUND = "bgsound", e.BIG = "big", e.BLOCKQUOTE = "blockquote", e.BODY = "body", e.BR = "br", e.BUTTON = "button", e.CAPTION = "caption", e.CENTER = "center", e.CODE = "code", e.COL = "col", e.COLGROUP = "colgroup", e.DD = "dd", e.DESC = "desc", e.DETAILS = "details", e.DIALOG = "dialog", e.DIR = "dir", e.DIV = "div", e.DL = "dl", e.DT = "dt", e.EM = "em", e.EMBED = "embed", e.FIELDSET = "fieldset", e.FIGCAPTION = "figcaption", e.FIGURE = "figure", e.FONT = "font", e.FOOTER = "footer", e.FOREIGN_OBJECT = "foreignObject", e.FORM = "form", e.FRAME = "frame", e.FRAMESET = "frameset", e.H1 = "h1", e.H2 = "h2", e.H3 = "h3", e.H4 = "h4", e.H5 = "h5", e.H6 = "h6", e.HEAD = "head", e.HEADER = "header", e.HGROUP = "hgroup", e.HR = "hr", e.HTML = "html", e.I = "i", e.IMG = "img", e.IMAGE = "image", e.INPUT = "input", e.IFRAME = "iframe", e.KEYGEN = "keygen", e.LABEL = "label", e.LI = "li", e.LINK = "link", e.LISTING = "listing", e.MAIN = "main", e.MALIGNMARK = "malignmark", e.MARQUEE = "marquee", e.MATH = "math", e.MENU = "menu", e.META = "meta", e.MGLYPH = "mglyph", e.MI = "mi", e.MO = "mo", e.MN = "mn", e.MS = "ms", e.MTEXT = "mtext", e.NAV = "nav", e.NOBR = "nobr", e.NOFRAMES = "noframes", e.NOEMBED = "noembed", e.NOSCRIPT = "noscript", e.OBJECT = "object", e.OL = "ol", e.OPTGROUP = "optgroup", e.OPTION = "option", e.P = "p", e.PARAM = "param", e.PLAINTEXT = "plaintext", e.PRE = "pre", e.RB = "rb", e.RP = "rp", e.RT = "rt", e.RTC = "rtc", e.RUBY = "ruby", e.S = "s", e.SCRIPT = "script", e.SEARCH = "search", e.SECTION = "section", e.SELECT = "select", e.SOURCE = "source", e.SMALL = "small", e.SPAN = "span", e.STRIKE = "strike", e.STRONG = "strong", e.STYLE = "style", e.SUB = "sub", e.SUMMARY = "summary", e.SUP = "sup", e.TABLE = "table", e.TBODY = "tbody", e.TEMPLATE = "template", e.TEXTAREA = "textarea", e.TFOOT = "tfoot", e.TD = "td", e.TH = "th", e.THEAD = "thead", e.TITLE = "title", e.TR = "tr", e.TRACK = "track", e.TT = "tt", e.U = "u", e.UL = "ul", e.SVG = "svg", e.VAR = "var", e.WBR = "wbr", e.XMP = "xmp";
})(N || (N = {}));
var l;
(function(e) {
  e[e.UNKNOWN = 0] = "UNKNOWN", e[e.A = 1] = "A", e[e.ADDRESS = 2] = "ADDRESS", e[e.ANNOTATION_XML = 3] = "ANNOTATION_XML", e[e.APPLET = 4] = "APPLET", e[e.AREA = 5] = "AREA", e[e.ARTICLE = 6] = "ARTICLE", e[e.ASIDE = 7] = "ASIDE", e[e.B = 8] = "B", e[e.BASE = 9] = "BASE", e[e.BASEFONT = 10] = "BASEFONT", e[e.BGSOUND = 11] = "BGSOUND", e[e.BIG = 12] = "BIG", e[e.BLOCKQUOTE = 13] = "BLOCKQUOTE", e[e.BODY = 14] = "BODY", e[e.BR = 15] = "BR", e[e.BUTTON = 16] = "BUTTON", e[e.CAPTION = 17] = "CAPTION", e[e.CENTER = 18] = "CENTER", e[e.CODE = 19] = "CODE", e[e.COL = 20] = "COL", e[e.COLGROUP = 21] = "COLGROUP", e[e.DD = 22] = "DD", e[e.DESC = 23] = "DESC", e[e.DETAILS = 24] = "DETAILS", e[e.DIALOG = 25] = "DIALOG", e[e.DIR = 26] = "DIR", e[e.DIV = 27] = "DIV", e[e.DL = 28] = "DL", e[e.DT = 29] = "DT", e[e.EM = 30] = "EM", e[e.EMBED = 31] = "EMBED", e[e.FIELDSET = 32] = "FIELDSET", e[e.FIGCAPTION = 33] = "FIGCAPTION", e[e.FIGURE = 34] = "FIGURE", e[e.FONT = 35] = "FONT", e[e.FOOTER = 36] = "FOOTER", e[e.FOREIGN_OBJECT = 37] = "FOREIGN_OBJECT", e[e.FORM = 38] = "FORM", e[e.FRAME = 39] = "FRAME", e[e.FRAMESET = 40] = "FRAMESET", e[e.H1 = 41] = "H1", e[e.H2 = 42] = "H2", e[e.H3 = 43] = "H3", e[e.H4 = 44] = "H4", e[e.H5 = 45] = "H5", e[e.H6 = 46] = "H6", e[e.HEAD = 47] = "HEAD", e[e.HEADER = 48] = "HEADER", e[e.HGROUP = 49] = "HGROUP", e[e.HR = 50] = "HR", e[e.HTML = 51] = "HTML", e[e.I = 52] = "I", e[e.IMG = 53] = "IMG", e[e.IMAGE = 54] = "IMAGE", e[e.INPUT = 55] = "INPUT", e[e.IFRAME = 56] = "IFRAME", e[e.KEYGEN = 57] = "KEYGEN", e[e.LABEL = 58] = "LABEL", e[e.LI = 59] = "LI", e[e.LINK = 60] = "LINK", e[e.LISTING = 61] = "LISTING", e[e.MAIN = 62] = "MAIN", e[e.MALIGNMARK = 63] = "MALIGNMARK", e[e.MARQUEE = 64] = "MARQUEE", e[e.MATH = 65] = "MATH", e[e.MENU = 66] = "MENU", e[e.META = 67] = "META", e[e.MGLYPH = 68] = "MGLYPH", e[e.MI = 69] = "MI", e[e.MO = 70] = "MO", e[e.MN = 71] = "MN", e[e.MS = 72] = "MS", e[e.MTEXT = 73] = "MTEXT", e[e.NAV = 74] = "NAV", e[e.NOBR = 75] = "NOBR", e[e.NOFRAMES = 76] = "NOFRAMES", e[e.NOEMBED = 77] = "NOEMBED", e[e.NOSCRIPT = 78] = "NOSCRIPT", e[e.OBJECT = 79] = "OBJECT", e[e.OL = 80] = "OL", e[e.OPTGROUP = 81] = "OPTGROUP", e[e.OPTION = 82] = "OPTION", e[e.P = 83] = "P", e[e.PARAM = 84] = "PARAM", e[e.PLAINTEXT = 85] = "PLAINTEXT", e[e.PRE = 86] = "PRE", e[e.RB = 87] = "RB", e[e.RP = 88] = "RP", e[e.RT = 89] = "RT", e[e.RTC = 90] = "RTC", e[e.RUBY = 91] = "RUBY", e[e.S = 92] = "S", e[e.SCRIPT = 93] = "SCRIPT", e[e.SEARCH = 94] = "SEARCH", e[e.SECTION = 95] = "SECTION", e[e.SELECT = 96] = "SELECT", e[e.SOURCE = 97] = "SOURCE", e[e.SMALL = 98] = "SMALL", e[e.SPAN = 99] = "SPAN", e[e.STRIKE = 100] = "STRIKE", e[e.STRONG = 101] = "STRONG", e[e.STYLE = 102] = "STYLE", e[e.SUB = 103] = "SUB", e[e.SUMMARY = 104] = "SUMMARY", e[e.SUP = 105] = "SUP", e[e.TABLE = 106] = "TABLE", e[e.TBODY = 107] = "TBODY", e[e.TEMPLATE = 108] = "TEMPLATE", e[e.TEXTAREA = 109] = "TEXTAREA", e[e.TFOOT = 110] = "TFOOT", e[e.TD = 111] = "TD", e[e.TH = 112] = "TH", e[e.THEAD = 113] = "THEAD", e[e.TITLE = 114] = "TITLE", e[e.TR = 115] = "TR", e[e.TRACK = 116] = "TRACK", e[e.TT = 117] = "TT", e[e.U = 118] = "U", e[e.UL = 119] = "UL", e[e.SVG = 120] = "SVG", e[e.VAR = 121] = "VAR", e[e.WBR = 122] = "WBR", e[e.XMP = 123] = "XMP";
})(l || (l = {}));
const Bh = /* @__PURE__ */ new Map([
  [N.A, l.A],
  [N.ADDRESS, l.ADDRESS],
  [N.ANNOTATION_XML, l.ANNOTATION_XML],
  [N.APPLET, l.APPLET],
  [N.AREA, l.AREA],
  [N.ARTICLE, l.ARTICLE],
  [N.ASIDE, l.ASIDE],
  [N.B, l.B],
  [N.BASE, l.BASE],
  [N.BASEFONT, l.BASEFONT],
  [N.BGSOUND, l.BGSOUND],
  [N.BIG, l.BIG],
  [N.BLOCKQUOTE, l.BLOCKQUOTE],
  [N.BODY, l.BODY],
  [N.BR, l.BR],
  [N.BUTTON, l.BUTTON],
  [N.CAPTION, l.CAPTION],
  [N.CENTER, l.CENTER],
  [N.CODE, l.CODE],
  [N.COL, l.COL],
  [N.COLGROUP, l.COLGROUP],
  [N.DD, l.DD],
  [N.DESC, l.DESC],
  [N.DETAILS, l.DETAILS],
  [N.DIALOG, l.DIALOG],
  [N.DIR, l.DIR],
  [N.DIV, l.DIV],
  [N.DL, l.DL],
  [N.DT, l.DT],
  [N.EM, l.EM],
  [N.EMBED, l.EMBED],
  [N.FIELDSET, l.FIELDSET],
  [N.FIGCAPTION, l.FIGCAPTION],
  [N.FIGURE, l.FIGURE],
  [N.FONT, l.FONT],
  [N.FOOTER, l.FOOTER],
  [N.FOREIGN_OBJECT, l.FOREIGN_OBJECT],
  [N.FORM, l.FORM],
  [N.FRAME, l.FRAME],
  [N.FRAMESET, l.FRAMESET],
  [N.H1, l.H1],
  [N.H2, l.H2],
  [N.H3, l.H3],
  [N.H4, l.H4],
  [N.H5, l.H5],
  [N.H6, l.H6],
  [N.HEAD, l.HEAD],
  [N.HEADER, l.HEADER],
  [N.HGROUP, l.HGROUP],
  [N.HR, l.HR],
  [N.HTML, l.HTML],
  [N.I, l.I],
  [N.IMG, l.IMG],
  [N.IMAGE, l.IMAGE],
  [N.INPUT, l.INPUT],
  [N.IFRAME, l.IFRAME],
  [N.KEYGEN, l.KEYGEN],
  [N.LABEL, l.LABEL],
  [N.LI, l.LI],
  [N.LINK, l.LINK],
  [N.LISTING, l.LISTING],
  [N.MAIN, l.MAIN],
  [N.MALIGNMARK, l.MALIGNMARK],
  [N.MARQUEE, l.MARQUEE],
  [N.MATH, l.MATH],
  [N.MENU, l.MENU],
  [N.META, l.META],
  [N.MGLYPH, l.MGLYPH],
  [N.MI, l.MI],
  [N.MO, l.MO],
  [N.MN, l.MN],
  [N.MS, l.MS],
  [N.MTEXT, l.MTEXT],
  [N.NAV, l.NAV],
  [N.NOBR, l.NOBR],
  [N.NOFRAMES, l.NOFRAMES],
  [N.NOEMBED, l.NOEMBED],
  [N.NOSCRIPT, l.NOSCRIPT],
  [N.OBJECT, l.OBJECT],
  [N.OL, l.OL],
  [N.OPTGROUP, l.OPTGROUP],
  [N.OPTION, l.OPTION],
  [N.P, l.P],
  [N.PARAM, l.PARAM],
  [N.PLAINTEXT, l.PLAINTEXT],
  [N.PRE, l.PRE],
  [N.RB, l.RB],
  [N.RP, l.RP],
  [N.RT, l.RT],
  [N.RTC, l.RTC],
  [N.RUBY, l.RUBY],
  [N.S, l.S],
  [N.SCRIPT, l.SCRIPT],
  [N.SEARCH, l.SEARCH],
  [N.SECTION, l.SECTION],
  [N.SELECT, l.SELECT],
  [N.SOURCE, l.SOURCE],
  [N.SMALL, l.SMALL],
  [N.SPAN, l.SPAN],
  [N.STRIKE, l.STRIKE],
  [N.STRONG, l.STRONG],
  [N.STYLE, l.STYLE],
  [N.SUB, l.SUB],
  [N.SUMMARY, l.SUMMARY],
  [N.SUP, l.SUP],
  [N.TABLE, l.TABLE],
  [N.TBODY, l.TBODY],
  [N.TEMPLATE, l.TEMPLATE],
  [N.TEXTAREA, l.TEXTAREA],
  [N.TFOOT, l.TFOOT],
  [N.TD, l.TD],
  [N.TH, l.TH],
  [N.THEAD, l.THEAD],
  [N.TITLE, l.TITLE],
  [N.TR, l.TR],
  [N.TRACK, l.TRACK],
  [N.TT, l.TT],
  [N.U, l.U],
  [N.UL, l.UL],
  [N.SVG, l.SVG],
  [N.VAR, l.VAR],
  [N.WBR, l.WBR],
  [N.XMP, l.XMP]
]);
function En(e) {
  var t;
  return (t = Bh.get(e)) !== null && t !== void 0 ? t : l.UNKNOWN;
}
const P = l, Fh = {
  [D.HTML]: /* @__PURE__ */ new Set([
    P.ADDRESS,
    P.APPLET,
    P.AREA,
    P.ARTICLE,
    P.ASIDE,
    P.BASE,
    P.BASEFONT,
    P.BGSOUND,
    P.BLOCKQUOTE,
    P.BODY,
    P.BR,
    P.BUTTON,
    P.CAPTION,
    P.CENTER,
    P.COL,
    P.COLGROUP,
    P.DD,
    P.DETAILS,
    P.DIR,
    P.DIV,
    P.DL,
    P.DT,
    P.EMBED,
    P.FIELDSET,
    P.FIGCAPTION,
    P.FIGURE,
    P.FOOTER,
    P.FORM,
    P.FRAME,
    P.FRAMESET,
    P.H1,
    P.H2,
    P.H3,
    P.H4,
    P.H5,
    P.H6,
    P.HEAD,
    P.HEADER,
    P.HGROUP,
    P.HR,
    P.HTML,
    P.IFRAME,
    P.IMG,
    P.INPUT,
    P.LI,
    P.LINK,
    P.LISTING,
    P.MAIN,
    P.MARQUEE,
    P.MENU,
    P.META,
    P.NAV,
    P.NOEMBED,
    P.NOFRAMES,
    P.NOSCRIPT,
    P.OBJECT,
    P.OL,
    P.P,
    P.PARAM,
    P.PLAINTEXT,
    P.PRE,
    P.SCRIPT,
    P.SECTION,
    P.SELECT,
    P.SOURCE,
    P.STYLE,
    P.SUMMARY,
    P.TABLE,
    P.TBODY,
    P.TD,
    P.TEMPLATE,
    P.TEXTAREA,
    P.TFOOT,
    P.TH,
    P.THEAD,
    P.TITLE,
    P.TR,
    P.TRACK,
    P.UL,
    P.WBR,
    P.XMP
  ]),
  [D.MATHML]: /* @__PURE__ */ new Set([P.MI, P.MO, P.MN, P.MS, P.MTEXT, P.ANNOTATION_XML]),
  [D.SVG]: /* @__PURE__ */ new Set([P.TITLE, P.FOREIGN_OBJECT, P.DESC]),
  [D.XLINK]: /* @__PURE__ */ new Set(),
  [D.XML]: /* @__PURE__ */ new Set(),
  [D.XMLNS]: /* @__PURE__ */ new Set()
}, Li = /* @__PURE__ */ new Set([P.H1, P.H2, P.H3, P.H4, P.H5, P.H6]);
N.STYLE, N.SCRIPT, N.XMP, N.IFRAME, N.NOEMBED, N.NOFRAMES, N.PLAINTEXT;
var b;
(function(e) {
  e[e.DATA = 0] = "DATA", e[e.RCDATA = 1] = "RCDATA", e[e.RAWTEXT = 2] = "RAWTEXT", e[e.SCRIPT_DATA = 3] = "SCRIPT_DATA", e[e.PLAINTEXT = 4] = "PLAINTEXT", e[e.TAG_OPEN = 5] = "TAG_OPEN", e[e.END_TAG_OPEN = 6] = "END_TAG_OPEN", e[e.TAG_NAME = 7] = "TAG_NAME", e[e.RCDATA_LESS_THAN_SIGN = 8] = "RCDATA_LESS_THAN_SIGN", e[e.RCDATA_END_TAG_OPEN = 9] = "RCDATA_END_TAG_OPEN", e[e.RCDATA_END_TAG_NAME = 10] = "RCDATA_END_TAG_NAME", e[e.RAWTEXT_LESS_THAN_SIGN = 11] = "RAWTEXT_LESS_THAN_SIGN", e[e.RAWTEXT_END_TAG_OPEN = 12] = "RAWTEXT_END_TAG_OPEN", e[e.RAWTEXT_END_TAG_NAME = 13] = "RAWTEXT_END_TAG_NAME", e[e.SCRIPT_DATA_LESS_THAN_SIGN = 14] = "SCRIPT_DATA_LESS_THAN_SIGN", e[e.SCRIPT_DATA_END_TAG_OPEN = 15] = "SCRIPT_DATA_END_TAG_OPEN", e[e.SCRIPT_DATA_END_TAG_NAME = 16] = "SCRIPT_DATA_END_TAG_NAME", e[e.SCRIPT_DATA_ESCAPE_START = 17] = "SCRIPT_DATA_ESCAPE_START", e[e.SCRIPT_DATA_ESCAPE_START_DASH = 18] = "SCRIPT_DATA_ESCAPE_START_DASH", e[e.SCRIPT_DATA_ESCAPED = 19] = "SCRIPT_DATA_ESCAPED", e[e.SCRIPT_DATA_ESCAPED_DASH = 20] = "SCRIPT_DATA_ESCAPED_DASH", e[e.SCRIPT_DATA_ESCAPED_DASH_DASH = 21] = "SCRIPT_DATA_ESCAPED_DASH_DASH", e[e.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN = 22] = "SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN", e[e.SCRIPT_DATA_ESCAPED_END_TAG_OPEN = 23] = "SCRIPT_DATA_ESCAPED_END_TAG_OPEN", e[e.SCRIPT_DATA_ESCAPED_END_TAG_NAME = 24] = "SCRIPT_DATA_ESCAPED_END_TAG_NAME", e[e.SCRIPT_DATA_DOUBLE_ESCAPE_START = 25] = "SCRIPT_DATA_DOUBLE_ESCAPE_START", e[e.SCRIPT_DATA_DOUBLE_ESCAPED = 26] = "SCRIPT_DATA_DOUBLE_ESCAPED", e[e.SCRIPT_DATA_DOUBLE_ESCAPED_DASH = 27] = "SCRIPT_DATA_DOUBLE_ESCAPED_DASH", e[e.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH = 28] = "SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH", e[e.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN = 29] = "SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN", e[e.SCRIPT_DATA_DOUBLE_ESCAPE_END = 30] = "SCRIPT_DATA_DOUBLE_ESCAPE_END", e[e.BEFORE_ATTRIBUTE_NAME = 31] = "BEFORE_ATTRIBUTE_NAME", e[e.ATTRIBUTE_NAME = 32] = "ATTRIBUTE_NAME", e[e.AFTER_ATTRIBUTE_NAME = 33] = "AFTER_ATTRIBUTE_NAME", e[e.BEFORE_ATTRIBUTE_VALUE = 34] = "BEFORE_ATTRIBUTE_VALUE", e[e.ATTRIBUTE_VALUE_DOUBLE_QUOTED = 35] = "ATTRIBUTE_VALUE_DOUBLE_QUOTED", e[e.ATTRIBUTE_VALUE_SINGLE_QUOTED = 36] = "ATTRIBUTE_VALUE_SINGLE_QUOTED", e[e.ATTRIBUTE_VALUE_UNQUOTED = 37] = "ATTRIBUTE_VALUE_UNQUOTED", e[e.AFTER_ATTRIBUTE_VALUE_QUOTED = 38] = "AFTER_ATTRIBUTE_VALUE_QUOTED", e[e.SELF_CLOSING_START_TAG = 39] = "SELF_CLOSING_START_TAG", e[e.BOGUS_COMMENT = 40] = "BOGUS_COMMENT", e[e.MARKUP_DECLARATION_OPEN = 41] = "MARKUP_DECLARATION_OPEN", e[e.COMMENT_START = 42] = "COMMENT_START", e[e.COMMENT_START_DASH = 43] = "COMMENT_START_DASH", e[e.COMMENT = 44] = "COMMENT", e[e.COMMENT_LESS_THAN_SIGN = 45] = "COMMENT_LESS_THAN_SIGN", e[e.COMMENT_LESS_THAN_SIGN_BANG = 46] = "COMMENT_LESS_THAN_SIGN_BANG", e[e.COMMENT_LESS_THAN_SIGN_BANG_DASH = 47] = "COMMENT_LESS_THAN_SIGN_BANG_DASH", e[e.COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH = 48] = "COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH", e[e.COMMENT_END_DASH = 49] = "COMMENT_END_DASH", e[e.COMMENT_END = 50] = "COMMENT_END", e[e.COMMENT_END_BANG = 51] = "COMMENT_END_BANG", e[e.DOCTYPE = 52] = "DOCTYPE", e[e.BEFORE_DOCTYPE_NAME = 53] = "BEFORE_DOCTYPE_NAME", e[e.DOCTYPE_NAME = 54] = "DOCTYPE_NAME", e[e.AFTER_DOCTYPE_NAME = 55] = "AFTER_DOCTYPE_NAME", e[e.AFTER_DOCTYPE_PUBLIC_KEYWORD = 56] = "AFTER_DOCTYPE_PUBLIC_KEYWORD", e[e.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER = 57] = "BEFORE_DOCTYPE_PUBLIC_IDENTIFIER", e[e.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED = 58] = "DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED", e[e.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED = 59] = "DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED", e[e.AFTER_DOCTYPE_PUBLIC_IDENTIFIER = 60] = "AFTER_DOCTYPE_PUBLIC_IDENTIFIER", e[e.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS = 61] = "BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS", e[e.AFTER_DOCTYPE_SYSTEM_KEYWORD = 62] = "AFTER_DOCTYPE_SYSTEM_KEYWORD", e[e.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER = 63] = "BEFORE_DOCTYPE_SYSTEM_IDENTIFIER", e[e.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED = 64] = "DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED", e[e.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED = 65] = "DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED", e[e.AFTER_DOCTYPE_SYSTEM_IDENTIFIER = 66] = "AFTER_DOCTYPE_SYSTEM_IDENTIFIER", e[e.BOGUS_DOCTYPE = 67] = "BOGUS_DOCTYPE", e[e.CDATA_SECTION = 68] = "CDATA_SECTION", e[e.CDATA_SECTION_BRACKET = 69] = "CDATA_SECTION_BRACKET", e[e.CDATA_SECTION_END = 70] = "CDATA_SECTION_END", e[e.CHARACTER_REFERENCE = 71] = "CHARACTER_REFERENCE", e[e.AMBIGUOUS_AMPERSAND = 72] = "AMBIGUOUS_AMPERSAND";
})(b || (b = {}));
const _e = {
  DATA: b.DATA,
  RCDATA: b.RCDATA,
  RAWTEXT: b.RAWTEXT,
  SCRIPT_DATA: b.SCRIPT_DATA,
  PLAINTEXT: b.PLAINTEXT,
  CDATA_SECTION: b.CDATA_SECTION
};
function Hh(e) {
  return e >= m.DIGIT_0 && e <= m.DIGIT_9;
}
function vn(e) {
  return e >= m.LATIN_CAPITAL_A && e <= m.LATIN_CAPITAL_Z;
}
function Uh(e) {
  return e >= m.LATIN_SMALL_A && e <= m.LATIN_SMALL_Z;
}
function Rt(e) {
  return Uh(e) || vn(e);
}
function ds(e) {
  return Rt(e) || Hh(e);
}
function lr(e) {
  return e + 32;
}
function bo(e) {
  return e === m.SPACE || e === m.LINE_FEED || e === m.TABULATION || e === m.FORM_FEED;
}
function hs(e) {
  return bo(e) || e === m.SOLIDUS || e === m.GREATER_THAN_SIGN;
}
function zh(e) {
  return e === m.NULL ? L.nullCharacterReference : e > 1114111 ? L.characterReferenceOutsideUnicodeRange : fo(e) ? L.surrogateCharacterReference : mo(e) ? L.noncharacterCharacterReference : po(e) || e === m.CARRIAGE_RETURN ? L.controlCharacterReference : null;
}
class $h {
  constructor(t, n) {
    this.options = t, this.handler = n, this.paused = !1, this.inLoop = !1, this.inForeignNode = !1, this.lastStartTagName = "", this.active = !1, this.state = b.DATA, this.returnState = b.DATA, this.entityStartPos = 0, this.consumedAfterSnapshot = -1, this.currentCharacterToken = null, this.currentToken = null, this.currentAttr = { name: "", value: "" }, this.preprocessor = new Nh(n), this.currentLocation = this.getCurrentLocation(-1), this.entityDecoder = new Mh(Sh, (r, i) => {
      this.preprocessor.pos = this.entityStartPos + i - 1, this._flushCodePointConsumedAsCharacterReference(r);
    }, n.onParseError ? {
      missingSemicolonAfterCharacterReference: () => {
        this._err(L.missingSemicolonAfterCharacterReference, 1);
      },
      absenceOfDigitsInNumericCharacterReference: (r) => {
        this._err(L.absenceOfDigitsInNumericCharacterReference, this.entityStartPos - this.preprocessor.pos + r);
      },
      validateNumericCharacterReference: (r) => {
        const i = zh(r);
        i && this._err(i, 1);
      }
    } : void 0);
  }
  //Errors
  _err(t, n = 0) {
    var r, i;
    (i = (r = this.handler).onParseError) === null || i === void 0 || i.call(r, this.preprocessor.getError(t, n));
  }
  // NOTE: `offset` may never run across line boundaries.
  getCurrentLocation(t) {
    return this.options.sourceCodeLocationInfo ? {
      startLine: this.preprocessor.line,
      startCol: this.preprocessor.col - t,
      startOffset: this.preprocessor.offset - t,
      endLine: -1,
      endCol: -1,
      endOffset: -1
    } : null;
  }
  _runParsingLoop() {
    if (!this.inLoop) {
      for (this.inLoop = !0; this.active && !this.paused; ) {
        this.consumedAfterSnapshot = 0;
        const t = this._consume();
        this._ensureHibernation() || this._callState(t);
      }
      this.inLoop = !1;
    }
  }
  //API
  pause() {
    this.paused = !0;
  }
  resume(t) {
    if (!this.paused)
      throw new Error("Parser was already resumed");
    this.paused = !1, !this.inLoop && (this._runParsingLoop(), this.paused || t?.());
  }
  write(t, n, r) {
    this.active = !0, this.preprocessor.write(t, n), this._runParsingLoop(), this.paused || r?.();
  }
  insertHtmlAtCurrentPos(t) {
    this.active = !0, this.preprocessor.insertHtmlAtCurrentPos(t), this._runParsingLoop();
  }
  //Hibernation
  _ensureHibernation() {
    return this.preprocessor.endOfChunkHit ? (this.preprocessor.retreat(this.consumedAfterSnapshot), this.consumedAfterSnapshot = 0, this.active = !1, !0) : !1;
  }
  //Consumption
  _consume() {
    return this.consumedAfterSnapshot++, this.preprocessor.advance();
  }
  _advanceBy(t) {
    this.consumedAfterSnapshot += t;
    for (let n = 0; n < t; n++)
      this.preprocessor.advance();
  }
  _consumeSequenceIfMatch(t, n) {
    return this.preprocessor.startsWith(t, n) ? (this._advanceBy(t.length - 1), !0) : !1;
  }
  //Token creation
  _createStartTagToken() {
    this.currentToken = {
      type: ne.START_TAG,
      tagName: "",
      tagID: l.UNKNOWN,
      selfClosing: !1,
      ackSelfClosing: !1,
      attrs: [],
      location: this.getCurrentLocation(1)
    };
  }
  _createEndTagToken() {
    this.currentToken = {
      type: ne.END_TAG,
      tagName: "",
      tagID: l.UNKNOWN,
      selfClosing: !1,
      ackSelfClosing: !1,
      attrs: [],
      location: this.getCurrentLocation(2)
    };
  }
  _createCommentToken(t) {
    this.currentToken = {
      type: ne.COMMENT,
      data: "",
      location: this.getCurrentLocation(t)
    };
  }
  _createDoctypeToken(t) {
    this.currentToken = {
      type: ne.DOCTYPE,
      name: t,
      forceQuirks: !1,
      publicId: null,
      systemId: null,
      location: this.currentLocation
    };
  }
  _createCharacterToken(t, n) {
    this.currentCharacterToken = {
      type: t,
      chars: n,
      location: this.currentLocation
    };
  }
  //Tag attributes
  _createAttr(t) {
    this.currentAttr = {
      name: t,
      value: ""
    }, this.currentLocation = this.getCurrentLocation(0);
  }
  _leaveAttrName() {
    var t, n;
    const r = this.currentToken;
    if (go(r, this.currentAttr.name) === null) {
      if (r.attrs.push(this.currentAttr), r.location && this.currentLocation) {
        const i = (t = (n = r.location).attrs) !== null && t !== void 0 ? t : n.attrs = /* @__PURE__ */ Object.create(null);
        i[this.currentAttr.name] = this.currentLocation, this._leaveAttrValue();
      }
    } else
      this._err(L.duplicateAttribute);
  }
  _leaveAttrValue() {
    this.currentLocation && (this.currentLocation.endLine = this.preprocessor.line, this.currentLocation.endCol = this.preprocessor.col, this.currentLocation.endOffset = this.preprocessor.offset);
  }
  //Token emission
  prepareToken(t) {
    this._emitCurrentCharacterToken(t.location), this.currentToken = null, t.location && (t.location.endLine = this.preprocessor.line, t.location.endCol = this.preprocessor.col + 1, t.location.endOffset = this.preprocessor.offset + 1), this.currentLocation = this.getCurrentLocation(-1);
  }
  emitCurrentTagToken() {
    const t = this.currentToken;
    this.prepareToken(t), t.tagID = En(t.tagName), t.type === ne.START_TAG ? (this.lastStartTagName = t.tagName, this.handler.onStartTag(t)) : (t.attrs.length > 0 && this._err(L.endTagWithAttributes), t.selfClosing && this._err(L.endTagWithTrailingSolidus), this.handler.onEndTag(t)), this.preprocessor.dropParsedChunk();
  }
  emitCurrentComment(t) {
    this.prepareToken(t), this.handler.onComment(t), this.preprocessor.dropParsedChunk();
  }
  emitCurrentDoctype(t) {
    this.prepareToken(t), this.handler.onDoctype(t), this.preprocessor.dropParsedChunk();
  }
  _emitCurrentCharacterToken(t) {
    if (this.currentCharacterToken) {
      switch (t && this.currentCharacterToken.location && (this.currentCharacterToken.location.endLine = t.startLine, this.currentCharacterToken.location.endCol = t.startCol, this.currentCharacterToken.location.endOffset = t.startOffset), this.currentCharacterToken.type) {
        case ne.CHARACTER: {
          this.handler.onCharacter(this.currentCharacterToken);
          break;
        }
        case ne.NULL_CHARACTER: {
          this.handler.onNullCharacter(this.currentCharacterToken);
          break;
        }
        case ne.WHITESPACE_CHARACTER: {
          this.handler.onWhitespaceCharacter(this.currentCharacterToken);
          break;
        }
      }
      this.currentCharacterToken = null;
    }
  }
  _emitEOFToken() {
    const t = this.getCurrentLocation(0);
    t && (t.endLine = t.startLine, t.endCol = t.startCol, t.endOffset = t.startOffset), this._emitCurrentCharacterToken(t), this.handler.onEof({ type: ne.EOF, location: t }), this.active = !1;
  }
  //Characters emission
  //OPTIMIZATION: The specification uses only one type of character token (one token per character).
  //This causes a huge memory overhead and a lot of unnecessary parser loops. parse5 uses 3 groups of characters.
  //If we have a sequence of characters that belong to the same group, the parser can process it
  //as a single solid character token.
  //So, there are 3 types of character tokens in parse5:
  //1)TokenType.NULL_CHARACTER - \u0000-character sequences (e.g. '\u0000\u0000\u0000')
  //2)TokenType.WHITESPACE_CHARACTER - any whitespace/new-line character sequences (e.g. '\n  \r\t   \f')
  //3)TokenType.CHARACTER - any character sequence which don't belong to groups 1 and 2 (e.g. 'abcdef1234@@#$%^')
  _appendCharToCurrentCharacterToken(t, n) {
    if (this.currentCharacterToken)
      if (this.currentCharacterToken.type === t) {
        this.currentCharacterToken.chars += n;
        return;
      } else
        this.currentLocation = this.getCurrentLocation(0), this._emitCurrentCharacterToken(this.currentLocation), this.preprocessor.dropParsedChunk();
    this._createCharacterToken(t, n);
  }
  _emitCodePoint(t) {
    const n = bo(t) ? ne.WHITESPACE_CHARACTER : t === m.NULL ? ne.NULL_CHARACTER : ne.CHARACTER;
    this._appendCharToCurrentCharacterToken(n, String.fromCodePoint(t));
  }
  //NOTE: used when we emit characters explicitly.
  //This is always for non-whitespace and non-null characters, which allows us to avoid additional checks.
  _emitChars(t) {
    this._appendCharToCurrentCharacterToken(ne.CHARACTER, t);
  }
  // Character reference helpers
  _startCharacterReference() {
    this.returnState = this.state, this.state = b.CHARACTER_REFERENCE, this.entityStartPos = this.preprocessor.pos, this.entityDecoder.startEntity(this._isCharacterReferenceInAttribute() ? yt.Attribute : yt.Legacy);
  }
  _isCharacterReferenceInAttribute() {
    return this.returnState === b.ATTRIBUTE_VALUE_DOUBLE_QUOTED || this.returnState === b.ATTRIBUTE_VALUE_SINGLE_QUOTED || this.returnState === b.ATTRIBUTE_VALUE_UNQUOTED;
  }
  _flushCodePointConsumedAsCharacterReference(t) {
    this._isCharacterReferenceInAttribute() ? this.currentAttr.value += String.fromCodePoint(t) : this._emitCodePoint(t);
  }
  // Calling states this way turns out to be much faster than any other approach.
  _callState(t) {
    switch (this.state) {
      case b.DATA: {
        this._stateData(t);
        break;
      }
      case b.RCDATA: {
        this._stateRcdata(t);
        break;
      }
      case b.RAWTEXT: {
        this._stateRawtext(t);
        break;
      }
      case b.SCRIPT_DATA: {
        this._stateScriptData(t);
        break;
      }
      case b.PLAINTEXT: {
        this._statePlaintext(t);
        break;
      }
      case b.TAG_OPEN: {
        this._stateTagOpen(t);
        break;
      }
      case b.END_TAG_OPEN: {
        this._stateEndTagOpen(t);
        break;
      }
      case b.TAG_NAME: {
        this._stateTagName(t);
        break;
      }
      case b.RCDATA_LESS_THAN_SIGN: {
        this._stateRcdataLessThanSign(t);
        break;
      }
      case b.RCDATA_END_TAG_OPEN: {
        this._stateRcdataEndTagOpen(t);
        break;
      }
      case b.RCDATA_END_TAG_NAME: {
        this._stateRcdataEndTagName(t);
        break;
      }
      case b.RAWTEXT_LESS_THAN_SIGN: {
        this._stateRawtextLessThanSign(t);
        break;
      }
      case b.RAWTEXT_END_TAG_OPEN: {
        this._stateRawtextEndTagOpen(t);
        break;
      }
      case b.RAWTEXT_END_TAG_NAME: {
        this._stateRawtextEndTagName(t);
        break;
      }
      case b.SCRIPT_DATA_LESS_THAN_SIGN: {
        this._stateScriptDataLessThanSign(t);
        break;
      }
      case b.SCRIPT_DATA_END_TAG_OPEN: {
        this._stateScriptDataEndTagOpen(t);
        break;
      }
      case b.SCRIPT_DATA_END_TAG_NAME: {
        this._stateScriptDataEndTagName(t);
        break;
      }
      case b.SCRIPT_DATA_ESCAPE_START: {
        this._stateScriptDataEscapeStart(t);
        break;
      }
      case b.SCRIPT_DATA_ESCAPE_START_DASH: {
        this._stateScriptDataEscapeStartDash(t);
        break;
      }
      case b.SCRIPT_DATA_ESCAPED: {
        this._stateScriptDataEscaped(t);
        break;
      }
      case b.SCRIPT_DATA_ESCAPED_DASH: {
        this._stateScriptDataEscapedDash(t);
        break;
      }
      case b.SCRIPT_DATA_ESCAPED_DASH_DASH: {
        this._stateScriptDataEscapedDashDash(t);
        break;
      }
      case b.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN: {
        this._stateScriptDataEscapedLessThanSign(t);
        break;
      }
      case b.SCRIPT_DATA_ESCAPED_END_TAG_OPEN: {
        this._stateScriptDataEscapedEndTagOpen(t);
        break;
      }
      case b.SCRIPT_DATA_ESCAPED_END_TAG_NAME: {
        this._stateScriptDataEscapedEndTagName(t);
        break;
      }
      case b.SCRIPT_DATA_DOUBLE_ESCAPE_START: {
        this._stateScriptDataDoubleEscapeStart(t);
        break;
      }
      case b.SCRIPT_DATA_DOUBLE_ESCAPED: {
        this._stateScriptDataDoubleEscaped(t);
        break;
      }
      case b.SCRIPT_DATA_DOUBLE_ESCAPED_DASH: {
        this._stateScriptDataDoubleEscapedDash(t);
        break;
      }
      case b.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH: {
        this._stateScriptDataDoubleEscapedDashDash(t);
        break;
      }
      case b.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN: {
        this._stateScriptDataDoubleEscapedLessThanSign(t);
        break;
      }
      case b.SCRIPT_DATA_DOUBLE_ESCAPE_END: {
        this._stateScriptDataDoubleEscapeEnd(t);
        break;
      }
      case b.BEFORE_ATTRIBUTE_NAME: {
        this._stateBeforeAttributeName(t);
        break;
      }
      case b.ATTRIBUTE_NAME: {
        this._stateAttributeName(t);
        break;
      }
      case b.AFTER_ATTRIBUTE_NAME: {
        this._stateAfterAttributeName(t);
        break;
      }
      case b.BEFORE_ATTRIBUTE_VALUE: {
        this._stateBeforeAttributeValue(t);
        break;
      }
      case b.ATTRIBUTE_VALUE_DOUBLE_QUOTED: {
        this._stateAttributeValueDoubleQuoted(t);
        break;
      }
      case b.ATTRIBUTE_VALUE_SINGLE_QUOTED: {
        this._stateAttributeValueSingleQuoted(t);
        break;
      }
      case b.ATTRIBUTE_VALUE_UNQUOTED: {
        this._stateAttributeValueUnquoted(t);
        break;
      }
      case b.AFTER_ATTRIBUTE_VALUE_QUOTED: {
        this._stateAfterAttributeValueQuoted(t);
        break;
      }
      case b.SELF_CLOSING_START_TAG: {
        this._stateSelfClosingStartTag(t);
        break;
      }
      case b.BOGUS_COMMENT: {
        this._stateBogusComment(t);
        break;
      }
      case b.MARKUP_DECLARATION_OPEN: {
        this._stateMarkupDeclarationOpen(t);
        break;
      }
      case b.COMMENT_START: {
        this._stateCommentStart(t);
        break;
      }
      case b.COMMENT_START_DASH: {
        this._stateCommentStartDash(t);
        break;
      }
      case b.COMMENT: {
        this._stateComment(t);
        break;
      }
      case b.COMMENT_LESS_THAN_SIGN: {
        this._stateCommentLessThanSign(t);
        break;
      }
      case b.COMMENT_LESS_THAN_SIGN_BANG: {
        this._stateCommentLessThanSignBang(t);
        break;
      }
      case b.COMMENT_LESS_THAN_SIGN_BANG_DASH: {
        this._stateCommentLessThanSignBangDash(t);
        break;
      }
      case b.COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH: {
        this._stateCommentLessThanSignBangDashDash(t);
        break;
      }
      case b.COMMENT_END_DASH: {
        this._stateCommentEndDash(t);
        break;
      }
      case b.COMMENT_END: {
        this._stateCommentEnd(t);
        break;
      }
      case b.COMMENT_END_BANG: {
        this._stateCommentEndBang(t);
        break;
      }
      case b.DOCTYPE: {
        this._stateDoctype(t);
        break;
      }
      case b.BEFORE_DOCTYPE_NAME: {
        this._stateBeforeDoctypeName(t);
        break;
      }
      case b.DOCTYPE_NAME: {
        this._stateDoctypeName(t);
        break;
      }
      case b.AFTER_DOCTYPE_NAME: {
        this._stateAfterDoctypeName(t);
        break;
      }
      case b.AFTER_DOCTYPE_PUBLIC_KEYWORD: {
        this._stateAfterDoctypePublicKeyword(t);
        break;
      }
      case b.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER: {
        this._stateBeforeDoctypePublicIdentifier(t);
        break;
      }
      case b.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED: {
        this._stateDoctypePublicIdentifierDoubleQuoted(t);
        break;
      }
      case b.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED: {
        this._stateDoctypePublicIdentifierSingleQuoted(t);
        break;
      }
      case b.AFTER_DOCTYPE_PUBLIC_IDENTIFIER: {
        this._stateAfterDoctypePublicIdentifier(t);
        break;
      }
      case b.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS: {
        this._stateBetweenDoctypePublicAndSystemIdentifiers(t);
        break;
      }
      case b.AFTER_DOCTYPE_SYSTEM_KEYWORD: {
        this._stateAfterDoctypeSystemKeyword(t);
        break;
      }
      case b.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER: {
        this._stateBeforeDoctypeSystemIdentifier(t);
        break;
      }
      case b.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED: {
        this._stateDoctypeSystemIdentifierDoubleQuoted(t);
        break;
      }
      case b.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED: {
        this._stateDoctypeSystemIdentifierSingleQuoted(t);
        break;
      }
      case b.AFTER_DOCTYPE_SYSTEM_IDENTIFIER: {
        this._stateAfterDoctypeSystemIdentifier(t);
        break;
      }
      case b.BOGUS_DOCTYPE: {
        this._stateBogusDoctype(t);
        break;
      }
      case b.CDATA_SECTION: {
        this._stateCdataSection(t);
        break;
      }
      case b.CDATA_SECTION_BRACKET: {
        this._stateCdataSectionBracket(t);
        break;
      }
      case b.CDATA_SECTION_END: {
        this._stateCdataSectionEnd(t);
        break;
      }
      case b.CHARACTER_REFERENCE: {
        this._stateCharacterReference();
        break;
      }
      case b.AMBIGUOUS_AMPERSAND: {
        this._stateAmbiguousAmpersand(t);
        break;
      }
      default:
        throw new Error("Unknown state");
    }
  }
  // State machine
  // Data state
  //------------------------------------------------------------------
  _stateData(t) {
    switch (t) {
      case m.LESS_THAN_SIGN: {
        this.state = b.TAG_OPEN;
        break;
      }
      case m.AMPERSAND: {
        this._startCharacterReference();
        break;
      }
      case m.NULL: {
        this._err(L.unexpectedNullCharacter), this._emitCodePoint(t);
        break;
      }
      case m.EOF: {
        this._emitEOFToken();
        break;
      }
      default:
        this._emitCodePoint(t);
    }
  }
  //  RCDATA state
  //------------------------------------------------------------------
  _stateRcdata(t) {
    switch (t) {
      case m.AMPERSAND: {
        this._startCharacterReference();
        break;
      }
      case m.LESS_THAN_SIGN: {
        this.state = b.RCDATA_LESS_THAN_SIGN;
        break;
      }
      case m.NULL: {
        this._err(L.unexpectedNullCharacter), this._emitChars(Te);
        break;
      }
      case m.EOF: {
        this._emitEOFToken();
        break;
      }
      default:
        this._emitCodePoint(t);
    }
  }
  // RAWTEXT state
  //------------------------------------------------------------------
  _stateRawtext(t) {
    switch (t) {
      case m.LESS_THAN_SIGN: {
        this.state = b.RAWTEXT_LESS_THAN_SIGN;
        break;
      }
      case m.NULL: {
        this._err(L.unexpectedNullCharacter), this._emitChars(Te);
        break;
      }
      case m.EOF: {
        this._emitEOFToken();
        break;
      }
      default:
        this._emitCodePoint(t);
    }
  }
  // Script data state
  //------------------------------------------------------------------
  _stateScriptData(t) {
    switch (t) {
      case m.LESS_THAN_SIGN: {
        this.state = b.SCRIPT_DATA_LESS_THAN_SIGN;
        break;
      }
      case m.NULL: {
        this._err(L.unexpectedNullCharacter), this._emitChars(Te);
        break;
      }
      case m.EOF: {
        this._emitEOFToken();
        break;
      }
      default:
        this._emitCodePoint(t);
    }
  }
  // PLAINTEXT state
  //------------------------------------------------------------------
  _statePlaintext(t) {
    switch (t) {
      case m.NULL: {
        this._err(L.unexpectedNullCharacter), this._emitChars(Te);
        break;
      }
      case m.EOF: {
        this._emitEOFToken();
        break;
      }
      default:
        this._emitCodePoint(t);
    }
  }
  // Tag open state
  //------------------------------------------------------------------
  _stateTagOpen(t) {
    if (Rt(t))
      this._createStartTagToken(), this.state = b.TAG_NAME, this._stateTagName(t);
    else
      switch (t) {
        case m.EXCLAMATION_MARK: {
          this.state = b.MARKUP_DECLARATION_OPEN;
          break;
        }
        case m.SOLIDUS: {
          this.state = b.END_TAG_OPEN;
          break;
        }
        case m.QUESTION_MARK: {
          this._err(L.unexpectedQuestionMarkInsteadOfTagName), this._createCommentToken(1), this.state = b.BOGUS_COMMENT, this._stateBogusComment(t);
          break;
        }
        case m.EOF: {
          this._err(L.eofBeforeTagName), this._emitChars("<"), this._emitEOFToken();
          break;
        }
        default:
          this._err(L.invalidFirstCharacterOfTagName), this._emitChars("<"), this.state = b.DATA, this._stateData(t);
      }
  }
  // End tag open state
  //------------------------------------------------------------------
  _stateEndTagOpen(t) {
    if (Rt(t))
      this._createEndTagToken(), this.state = b.TAG_NAME, this._stateTagName(t);
    else
      switch (t) {
        case m.GREATER_THAN_SIGN: {
          this._err(L.missingEndTagName), this.state = b.DATA;
          break;
        }
        case m.EOF: {
          this._err(L.eofBeforeTagName), this._emitChars("</"), this._emitEOFToken();
          break;
        }
        default:
          this._err(L.invalidFirstCharacterOfTagName), this._createCommentToken(2), this.state = b.BOGUS_COMMENT, this._stateBogusComment(t);
      }
  }
  // Tag name state
  //------------------------------------------------------------------
  _stateTagName(t) {
    const n = this.currentToken;
    switch (t) {
      case m.SPACE:
      case m.LINE_FEED:
      case m.TABULATION:
      case m.FORM_FEED: {
        this.state = b.BEFORE_ATTRIBUTE_NAME;
        break;
      }
      case m.SOLIDUS: {
        this.state = b.SELF_CLOSING_START_TAG;
        break;
      }
      case m.GREATER_THAN_SIGN: {
        this.state = b.DATA, this.emitCurrentTagToken();
        break;
      }
      case m.NULL: {
        this._err(L.unexpectedNullCharacter), n.tagName += Te;
        break;
      }
      case m.EOF: {
        this._err(L.eofInTag), this._emitEOFToken();
        break;
      }
      default:
        n.tagName += String.fromCodePoint(vn(t) ? lr(t) : t);
    }
  }
  // RCDATA less-than sign state
  //------------------------------------------------------------------
  _stateRcdataLessThanSign(t) {
    t === m.SOLIDUS ? this.state = b.RCDATA_END_TAG_OPEN : (this._emitChars("<"), this.state = b.RCDATA, this._stateRcdata(t));
  }
  // RCDATA end tag open state
  //------------------------------------------------------------------
  _stateRcdataEndTagOpen(t) {
    Rt(t) ? (this.state = b.RCDATA_END_TAG_NAME, this._stateRcdataEndTagName(t)) : (this._emitChars("</"), this.state = b.RCDATA, this._stateRcdata(t));
  }
  handleSpecialEndTag(t) {
    if (!this.preprocessor.startsWith(this.lastStartTagName, !1))
      return !this._ensureHibernation();
    this._createEndTagToken();
    const n = this.currentToken;
    switch (n.tagName = this.lastStartTagName, this.preprocessor.peek(this.lastStartTagName.length)) {
      case m.SPACE:
      case m.LINE_FEED:
      case m.TABULATION:
      case m.FORM_FEED:
        return this._advanceBy(this.lastStartTagName.length), this.state = b.BEFORE_ATTRIBUTE_NAME, !1;
      case m.SOLIDUS:
        return this._advanceBy(this.lastStartTagName.length), this.state = b.SELF_CLOSING_START_TAG, !1;
      case m.GREATER_THAN_SIGN:
        return this._advanceBy(this.lastStartTagName.length), this.emitCurrentTagToken(), this.state = b.DATA, !1;
      default:
        return !this._ensureHibernation();
    }
  }
  // RCDATA end tag name state
  //------------------------------------------------------------------
  _stateRcdataEndTagName(t) {
    this.handleSpecialEndTag(t) && (this._emitChars("</"), this.state = b.RCDATA, this._stateRcdata(t));
  }
  // RAWTEXT less-than sign state
  //------------------------------------------------------------------
  _stateRawtextLessThanSign(t) {
    t === m.SOLIDUS ? this.state = b.RAWTEXT_END_TAG_OPEN : (this._emitChars("<"), this.state = b.RAWTEXT, this._stateRawtext(t));
  }
  // RAWTEXT end tag open state
  //------------------------------------------------------------------
  _stateRawtextEndTagOpen(t) {
    Rt(t) ? (this.state = b.RAWTEXT_END_TAG_NAME, this._stateRawtextEndTagName(t)) : (this._emitChars("</"), this.state = b.RAWTEXT, this._stateRawtext(t));
  }
  // RAWTEXT end tag name state
  //------------------------------------------------------------------
  _stateRawtextEndTagName(t) {
    this.handleSpecialEndTag(t) && (this._emitChars("</"), this.state = b.RAWTEXT, this._stateRawtext(t));
  }
  // Script data less-than sign state
  //------------------------------------------------------------------
  _stateScriptDataLessThanSign(t) {
    switch (t) {
      case m.SOLIDUS: {
        this.state = b.SCRIPT_DATA_END_TAG_OPEN;
        break;
      }
      case m.EXCLAMATION_MARK: {
        this.state = b.SCRIPT_DATA_ESCAPE_START, this._emitChars("<!");
        break;
      }
      default:
        this._emitChars("<"), this.state = b.SCRIPT_DATA, this._stateScriptData(t);
    }
  }
  // Script data end tag open state
  //------------------------------------------------------------------
  _stateScriptDataEndTagOpen(t) {
    Rt(t) ? (this.state = b.SCRIPT_DATA_END_TAG_NAME, this._stateScriptDataEndTagName(t)) : (this._emitChars("</"), this.state = b.SCRIPT_DATA, this._stateScriptData(t));
  }
  // Script data end tag name state
  //------------------------------------------------------------------
  _stateScriptDataEndTagName(t) {
    this.handleSpecialEndTag(t) && (this._emitChars("</"), this.state = b.SCRIPT_DATA, this._stateScriptData(t));
  }
  // Script data escape start state
  //------------------------------------------------------------------
  _stateScriptDataEscapeStart(t) {
    t === m.HYPHEN_MINUS ? (this.state = b.SCRIPT_DATA_ESCAPE_START_DASH, this._emitChars("-")) : (this.state = b.SCRIPT_DATA, this._stateScriptData(t));
  }
  // Script data escape start dash state
  //------------------------------------------------------------------
  _stateScriptDataEscapeStartDash(t) {
    t === m.HYPHEN_MINUS ? (this.state = b.SCRIPT_DATA_ESCAPED_DASH_DASH, this._emitChars("-")) : (this.state = b.SCRIPT_DATA, this._stateScriptData(t));
  }
  // Script data escaped state
  //------------------------------------------------------------------
  _stateScriptDataEscaped(t) {
    switch (t) {
      case m.HYPHEN_MINUS: {
        this.state = b.SCRIPT_DATA_ESCAPED_DASH, this._emitChars("-");
        break;
      }
      case m.LESS_THAN_SIGN: {
        this.state = b.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
        break;
      }
      case m.NULL: {
        this._err(L.unexpectedNullCharacter), this._emitChars(Te);
        break;
      }
      case m.EOF: {
        this._err(L.eofInScriptHtmlCommentLikeText), this._emitEOFToken();
        break;
      }
      default:
        this._emitCodePoint(t);
    }
  }
  // Script data escaped dash state
  //------------------------------------------------------------------
  _stateScriptDataEscapedDash(t) {
    switch (t) {
      case m.HYPHEN_MINUS: {
        this.state = b.SCRIPT_DATA_ESCAPED_DASH_DASH, this._emitChars("-");
        break;
      }
      case m.LESS_THAN_SIGN: {
        this.state = b.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
        break;
      }
      case m.NULL: {
        this._err(L.unexpectedNullCharacter), this.state = b.SCRIPT_DATA_ESCAPED, this._emitChars(Te);
        break;
      }
      case m.EOF: {
        this._err(L.eofInScriptHtmlCommentLikeText), this._emitEOFToken();
        break;
      }
      default:
        this.state = b.SCRIPT_DATA_ESCAPED, this._emitCodePoint(t);
    }
  }
  // Script data escaped dash dash state
  //------------------------------------------------------------------
  _stateScriptDataEscapedDashDash(t) {
    switch (t) {
      case m.HYPHEN_MINUS: {
        this._emitChars("-");
        break;
      }
      case m.LESS_THAN_SIGN: {
        this.state = b.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
        break;
      }
      case m.GREATER_THAN_SIGN: {
        this.state = b.SCRIPT_DATA, this._emitChars(">");
        break;
      }
      case m.NULL: {
        this._err(L.unexpectedNullCharacter), this.state = b.SCRIPT_DATA_ESCAPED, this._emitChars(Te);
        break;
      }
      case m.EOF: {
        this._err(L.eofInScriptHtmlCommentLikeText), this._emitEOFToken();
        break;
      }
      default:
        this.state = b.SCRIPT_DATA_ESCAPED, this._emitCodePoint(t);
    }
  }
  // Script data escaped less-than sign state
  //------------------------------------------------------------------
  _stateScriptDataEscapedLessThanSign(t) {
    t === m.SOLIDUS ? this.state = b.SCRIPT_DATA_ESCAPED_END_TAG_OPEN : Rt(t) ? (this._emitChars("<"), this.state = b.SCRIPT_DATA_DOUBLE_ESCAPE_START, this._stateScriptDataDoubleEscapeStart(t)) : (this._emitChars("<"), this.state = b.SCRIPT_DATA_ESCAPED, this._stateScriptDataEscaped(t));
  }
  // Script data escaped end tag open state
  //------------------------------------------------------------------
  _stateScriptDataEscapedEndTagOpen(t) {
    Rt(t) ? (this.state = b.SCRIPT_DATA_ESCAPED_END_TAG_NAME, this._stateScriptDataEscapedEndTagName(t)) : (this._emitChars("</"), this.state = b.SCRIPT_DATA_ESCAPED, this._stateScriptDataEscaped(t));
  }
  // Script data escaped end tag name state
  //------------------------------------------------------------------
  _stateScriptDataEscapedEndTagName(t) {
    this.handleSpecialEndTag(t) && (this._emitChars("</"), this.state = b.SCRIPT_DATA_ESCAPED, this._stateScriptDataEscaped(t));
  }
  // Script data double escape start state
  //------------------------------------------------------------------
  _stateScriptDataDoubleEscapeStart(t) {
    if (this.preprocessor.startsWith(Ve.SCRIPT, !1) && hs(this.preprocessor.peek(Ve.SCRIPT.length))) {
      this._emitCodePoint(t);
      for (let n = 0; n < Ve.SCRIPT.length; n++)
        this._emitCodePoint(this._consume());
      this.state = b.SCRIPT_DATA_DOUBLE_ESCAPED;
    } else this._ensureHibernation() || (this.state = b.SCRIPT_DATA_ESCAPED, this._stateScriptDataEscaped(t));
  }
  // Script data double escaped state
  //------------------------------------------------------------------
  _stateScriptDataDoubleEscaped(t) {
    switch (t) {
      case m.HYPHEN_MINUS: {
        this.state = b.SCRIPT_DATA_DOUBLE_ESCAPED_DASH, this._emitChars("-");
        break;
      }
      case m.LESS_THAN_SIGN: {
        this.state = b.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN, this._emitChars("<");
        break;
      }
      case m.NULL: {
        this._err(L.unexpectedNullCharacter), this._emitChars(Te);
        break;
      }
      case m.EOF: {
        this._err(L.eofInScriptHtmlCommentLikeText), this._emitEOFToken();
        break;
      }
      default:
        this._emitCodePoint(t);
    }
  }
  // Script data double escaped dash state
  //------------------------------------------------------------------
  _stateScriptDataDoubleEscapedDash(t) {
    switch (t) {
      case m.HYPHEN_MINUS: {
        this.state = b.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH, this._emitChars("-");
        break;
      }
      case m.LESS_THAN_SIGN: {
        this.state = b.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN, this._emitChars("<");
        break;
      }
      case m.NULL: {
        this._err(L.unexpectedNullCharacter), this.state = b.SCRIPT_DATA_DOUBLE_ESCAPED, this._emitChars(Te);
        break;
      }
      case m.EOF: {
        this._err(L.eofInScriptHtmlCommentLikeText), this._emitEOFToken();
        break;
      }
      default:
        this.state = b.SCRIPT_DATA_DOUBLE_ESCAPED, this._emitCodePoint(t);
    }
  }
  // Script data double escaped dash dash state
  //------------------------------------------------------------------
  _stateScriptDataDoubleEscapedDashDash(t) {
    switch (t) {
      case m.HYPHEN_MINUS: {
        this._emitChars("-");
        break;
      }
      case m.LESS_THAN_SIGN: {
        this.state = b.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN, this._emitChars("<");
        break;
      }
      case m.GREATER_THAN_SIGN: {
        this.state = b.SCRIPT_DATA, this._emitChars(">");
        break;
      }
      case m.NULL: {
        this._err(L.unexpectedNullCharacter), this.state = b.SCRIPT_DATA_DOUBLE_ESCAPED, this._emitChars(Te);
        break;
      }
      case m.EOF: {
        this._err(L.eofInScriptHtmlCommentLikeText), this._emitEOFToken();
        break;
      }
      default:
        this.state = b.SCRIPT_DATA_DOUBLE_ESCAPED, this._emitCodePoint(t);
    }
  }
  // Script data double escaped less-than sign state
  //------------------------------------------------------------------
  _stateScriptDataDoubleEscapedLessThanSign(t) {
    t === m.SOLIDUS ? (this.state = b.SCRIPT_DATA_DOUBLE_ESCAPE_END, this._emitChars("/")) : (this.state = b.SCRIPT_DATA_DOUBLE_ESCAPED, this._stateScriptDataDoubleEscaped(t));
  }
  // Script data double escape end state
  //------------------------------------------------------------------
  _stateScriptDataDoubleEscapeEnd(t) {
    if (this.preprocessor.startsWith(Ve.SCRIPT, !1) && hs(this.preprocessor.peek(Ve.SCRIPT.length))) {
      this._emitCodePoint(t);
      for (let n = 0; n < Ve.SCRIPT.length; n++)
        this._emitCodePoint(this._consume());
      this.state = b.SCRIPT_DATA_ESCAPED;
    } else this._ensureHibernation() || (this.state = b.SCRIPT_DATA_DOUBLE_ESCAPED, this._stateScriptDataDoubleEscaped(t));
  }
  // Before attribute name state
  //------------------------------------------------------------------
  _stateBeforeAttributeName(t) {
    switch (t) {
      case m.SPACE:
      case m.LINE_FEED:
      case m.TABULATION:
      case m.FORM_FEED:
        break;
      case m.SOLIDUS:
      case m.GREATER_THAN_SIGN:
      case m.EOF: {
        this.state = b.AFTER_ATTRIBUTE_NAME, this._stateAfterAttributeName(t);
        break;
      }
      case m.EQUALS_SIGN: {
        this._err(L.unexpectedEqualsSignBeforeAttributeName), this._createAttr("="), this.state = b.ATTRIBUTE_NAME;
        break;
      }
      default:
        this._createAttr(""), this.state = b.ATTRIBUTE_NAME, this._stateAttributeName(t);
    }
  }
  // Attribute name state
  //------------------------------------------------------------------
  _stateAttributeName(t) {
    switch (t) {
      case m.SPACE:
      case m.LINE_FEED:
      case m.TABULATION:
      case m.FORM_FEED:
      case m.SOLIDUS:
      case m.GREATER_THAN_SIGN:
      case m.EOF: {
        this._leaveAttrName(), this.state = b.AFTER_ATTRIBUTE_NAME, this._stateAfterAttributeName(t);
        break;
      }
      case m.EQUALS_SIGN: {
        this._leaveAttrName(), this.state = b.BEFORE_ATTRIBUTE_VALUE;
        break;
      }
      case m.QUOTATION_MARK:
      case m.APOSTROPHE:
      case m.LESS_THAN_SIGN: {
        this._err(L.unexpectedCharacterInAttributeName), this.currentAttr.name += String.fromCodePoint(t);
        break;
      }
      case m.NULL: {
        this._err(L.unexpectedNullCharacter), this.currentAttr.name += Te;
        break;
      }
      default:
        this.currentAttr.name += String.fromCodePoint(vn(t) ? lr(t) : t);
    }
  }
  // After attribute name state
  //------------------------------------------------------------------
  _stateAfterAttributeName(t) {
    switch (t) {
      case m.SPACE:
      case m.LINE_FEED:
      case m.TABULATION:
      case m.FORM_FEED:
        break;
      case m.SOLIDUS: {
        this.state = b.SELF_CLOSING_START_TAG;
        break;
      }
      case m.EQUALS_SIGN: {
        this.state = b.BEFORE_ATTRIBUTE_VALUE;
        break;
      }
      case m.GREATER_THAN_SIGN: {
        this.state = b.DATA, this.emitCurrentTagToken();
        break;
      }
      case m.EOF: {
        this._err(L.eofInTag), this._emitEOFToken();
        break;
      }
      default:
        this._createAttr(""), this.state = b.ATTRIBUTE_NAME, this._stateAttributeName(t);
    }
  }
  // Before attribute value state
  //------------------------------------------------------------------
  _stateBeforeAttributeValue(t) {
    switch (t) {
      case m.SPACE:
      case m.LINE_FEED:
      case m.TABULATION:
      case m.FORM_FEED:
        break;
      case m.QUOTATION_MARK: {
        this.state = b.ATTRIBUTE_VALUE_DOUBLE_QUOTED;
        break;
      }
      case m.APOSTROPHE: {
        this.state = b.ATTRIBUTE_VALUE_SINGLE_QUOTED;
        break;
      }
      case m.GREATER_THAN_SIGN: {
        this._err(L.missingAttributeValue), this.state = b.DATA, this.emitCurrentTagToken();
        break;
      }
      default:
        this.state = b.ATTRIBUTE_VALUE_UNQUOTED, this._stateAttributeValueUnquoted(t);
    }
  }
  // Attribute value (double-quoted) state
  //------------------------------------------------------------------
  _stateAttributeValueDoubleQuoted(t) {
    switch (t) {
      case m.QUOTATION_MARK: {
        this.state = b.AFTER_ATTRIBUTE_VALUE_QUOTED;
        break;
      }
      case m.AMPERSAND: {
        this._startCharacterReference();
        break;
      }
      case m.NULL: {
        this._err(L.unexpectedNullCharacter), this.currentAttr.value += Te;
        break;
      }
      case m.EOF: {
        this._err(L.eofInTag), this._emitEOFToken();
        break;
      }
      default:
        this.currentAttr.value += String.fromCodePoint(t);
    }
  }
  // Attribute value (single-quoted) state
  //------------------------------------------------------------------
  _stateAttributeValueSingleQuoted(t) {
    switch (t) {
      case m.APOSTROPHE: {
        this.state = b.AFTER_ATTRIBUTE_VALUE_QUOTED;
        break;
      }
      case m.AMPERSAND: {
        this._startCharacterReference();
        break;
      }
      case m.NULL: {
        this._err(L.unexpectedNullCharacter), this.currentAttr.value += Te;
        break;
      }
      case m.EOF: {
        this._err(L.eofInTag), this._emitEOFToken();
        break;
      }
      default:
        this.currentAttr.value += String.fromCodePoint(t);
    }
  }
  // Attribute value (unquoted) state
  //------------------------------------------------------------------
  _stateAttributeValueUnquoted(t) {
    switch (t) {
      case m.SPACE:
      case m.LINE_FEED:
      case m.TABULATION:
      case m.FORM_FEED: {
        this._leaveAttrValue(), this.state = b.BEFORE_ATTRIBUTE_NAME;
        break;
      }
      case m.AMPERSAND: {
        this._startCharacterReference();
        break;
      }
      case m.GREATER_THAN_SIGN: {
        this._leaveAttrValue(), this.state = b.DATA, this.emitCurrentTagToken();
        break;
      }
      case m.NULL: {
        this._err(L.unexpectedNullCharacter), this.currentAttr.value += Te;
        break;
      }
      case m.QUOTATION_MARK:
      case m.APOSTROPHE:
      case m.LESS_THAN_SIGN:
      case m.EQUALS_SIGN:
      case m.GRAVE_ACCENT: {
        this._err(L.unexpectedCharacterInUnquotedAttributeValue), this.currentAttr.value += String.fromCodePoint(t);
        break;
      }
      case m.EOF: {
        this._err(L.eofInTag), this._emitEOFToken();
        break;
      }
      default:
        this.currentAttr.value += String.fromCodePoint(t);
    }
  }
  // After attribute value (quoted) state
  //------------------------------------------------------------------
  _stateAfterAttributeValueQuoted(t) {
    switch (t) {
      case m.SPACE:
      case m.LINE_FEED:
      case m.TABULATION:
      case m.FORM_FEED: {
        this._leaveAttrValue(), this.state = b.BEFORE_ATTRIBUTE_NAME;
        break;
      }
      case m.SOLIDUS: {
        this._leaveAttrValue(), this.state = b.SELF_CLOSING_START_TAG;
        break;
      }
      case m.GREATER_THAN_SIGN: {
        this._leaveAttrValue(), this.state = b.DATA, this.emitCurrentTagToken();
        break;
      }
      case m.EOF: {
        this._err(L.eofInTag), this._emitEOFToken();
        break;
      }
      default:
        this._err(L.missingWhitespaceBetweenAttributes), this.state = b.BEFORE_ATTRIBUTE_NAME, this._stateBeforeAttributeName(t);
    }
  }
  // Self-closing start tag state
  //------------------------------------------------------------------
  _stateSelfClosingStartTag(t) {
    switch (t) {
      case m.GREATER_THAN_SIGN: {
        const n = this.currentToken;
        n.selfClosing = !0, this.state = b.DATA, this.emitCurrentTagToken();
        break;
      }
      case m.EOF: {
        this._err(L.eofInTag), this._emitEOFToken();
        break;
      }
      default:
        this._err(L.unexpectedSolidusInTag), this.state = b.BEFORE_ATTRIBUTE_NAME, this._stateBeforeAttributeName(t);
    }
  }
  // Bogus comment state
  //------------------------------------------------------------------
  _stateBogusComment(t) {
    const n = this.currentToken;
    switch (t) {
      case m.GREATER_THAN_SIGN: {
        this.state = b.DATA, this.emitCurrentComment(n);
        break;
      }
      case m.EOF: {
        this.emitCurrentComment(n), this._emitEOFToken();
        break;
      }
      case m.NULL: {
        this._err(L.unexpectedNullCharacter), n.data += Te;
        break;
      }
      default:
        n.data += String.fromCodePoint(t);
    }
  }
  // Markup declaration open state
  //------------------------------------------------------------------
  _stateMarkupDeclarationOpen(t) {
    this._consumeSequenceIfMatch(Ve.DASH_DASH, !0) ? (this._createCommentToken(Ve.DASH_DASH.length + 1), this.state = b.COMMENT_START) : this._consumeSequenceIfMatch(Ve.DOCTYPE, !1) ? (this.currentLocation = this.getCurrentLocation(Ve.DOCTYPE.length + 1), this.state = b.DOCTYPE) : this._consumeSequenceIfMatch(Ve.CDATA_START, !0) ? this.inForeignNode ? this.state = b.CDATA_SECTION : (this._err(L.cdataInHtmlContent), this._createCommentToken(Ve.CDATA_START.length + 1), this.currentToken.data = "[CDATA[", this.state = b.BOGUS_COMMENT) : this._ensureHibernation() || (this._err(L.incorrectlyOpenedComment), this._createCommentToken(2), this.state = b.BOGUS_COMMENT, this._stateBogusComment(t));
  }
  // Comment start state
  //------------------------------------------------------------------
  _stateCommentStart(t) {
    switch (t) {
      case m.HYPHEN_MINUS: {
        this.state = b.COMMENT_START_DASH;
        break;
      }
      case m.GREATER_THAN_SIGN: {
        this._err(L.abruptClosingOfEmptyComment), this.state = b.DATA;
        const n = this.currentToken;
        this.emitCurrentComment(n);
        break;
      }
      default:
        this.state = b.COMMENT, this._stateComment(t);
    }
  }
  // Comment start dash state
  //------------------------------------------------------------------
  _stateCommentStartDash(t) {
    const n = this.currentToken;
    switch (t) {
      case m.HYPHEN_MINUS: {
        this.state = b.COMMENT_END;
        break;
      }
      case m.GREATER_THAN_SIGN: {
        this._err(L.abruptClosingOfEmptyComment), this.state = b.DATA, this.emitCurrentComment(n);
        break;
      }
      case m.EOF: {
        this._err(L.eofInComment), this.emitCurrentComment(n), this._emitEOFToken();
        break;
      }
      default:
        n.data += "-", this.state = b.COMMENT, this._stateComment(t);
    }
  }
  // Comment state
  //------------------------------------------------------------------
  _stateComment(t) {
    const n = this.currentToken;
    switch (t) {
      case m.HYPHEN_MINUS: {
        this.state = b.COMMENT_END_DASH;
        break;
      }
      case m.LESS_THAN_SIGN: {
        n.data += "<", this.state = b.COMMENT_LESS_THAN_SIGN;
        break;
      }
      case m.NULL: {
        this._err(L.unexpectedNullCharacter), n.data += Te;
        break;
      }
      case m.EOF: {
        this._err(L.eofInComment), this.emitCurrentComment(n), this._emitEOFToken();
        break;
      }
      default:
        n.data += String.fromCodePoint(t);
    }
  }
  // Comment less-than sign state
  //------------------------------------------------------------------
  _stateCommentLessThanSign(t) {
    const n = this.currentToken;
    switch (t) {
      case m.EXCLAMATION_MARK: {
        n.data += "!", this.state = b.COMMENT_LESS_THAN_SIGN_BANG;
        break;
      }
      case m.LESS_THAN_SIGN: {
        n.data += "<";
        break;
      }
      default:
        this.state = b.COMMENT, this._stateComment(t);
    }
  }
  // Comment less-than sign bang state
  //------------------------------------------------------------------
  _stateCommentLessThanSignBang(t) {
    t === m.HYPHEN_MINUS ? this.state = b.COMMENT_LESS_THAN_SIGN_BANG_DASH : (this.state = b.COMMENT, this._stateComment(t));
  }
  // Comment less-than sign bang dash state
  //------------------------------------------------------------------
  _stateCommentLessThanSignBangDash(t) {
    t === m.HYPHEN_MINUS ? this.state = b.COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH : (this.state = b.COMMENT_END_DASH, this._stateCommentEndDash(t));
  }
  // Comment less-than sign bang dash dash state
  //------------------------------------------------------------------
  _stateCommentLessThanSignBangDashDash(t) {
    t !== m.GREATER_THAN_SIGN && t !== m.EOF && this._err(L.nestedComment), this.state = b.COMMENT_END, this._stateCommentEnd(t);
  }
  // Comment end dash state
  //------------------------------------------------------------------
  _stateCommentEndDash(t) {
    const n = this.currentToken;
    switch (t) {
      case m.HYPHEN_MINUS: {
        this.state = b.COMMENT_END;
        break;
      }
      case m.EOF: {
        this._err(L.eofInComment), this.emitCurrentComment(n), this._emitEOFToken();
        break;
      }
      default:
        n.data += "-", this.state = b.COMMENT, this._stateComment(t);
    }
  }
  // Comment end state
  //------------------------------------------------------------------
  _stateCommentEnd(t) {
    const n = this.currentToken;
    switch (t) {
      case m.GREATER_THAN_SIGN: {
        this.state = b.DATA, this.emitCurrentComment(n);
        break;
      }
      case m.EXCLAMATION_MARK: {
        this.state = b.COMMENT_END_BANG;
        break;
      }
      case m.HYPHEN_MINUS: {
        n.data += "-";
        break;
      }
      case m.EOF: {
        this._err(L.eofInComment), this.emitCurrentComment(n), this._emitEOFToken();
        break;
      }
      default:
        n.data += "--", this.state = b.COMMENT, this._stateComment(t);
    }
  }
  // Comment end bang state
  //------------------------------------------------------------------
  _stateCommentEndBang(t) {
    const n = this.currentToken;
    switch (t) {
      case m.HYPHEN_MINUS: {
        n.data += "--!", this.state = b.COMMENT_END_DASH;
        break;
      }
      case m.GREATER_THAN_SIGN: {
        this._err(L.incorrectlyClosedComment), this.state = b.DATA, this.emitCurrentComment(n);
        break;
      }
      case m.EOF: {
        this._err(L.eofInComment), this.emitCurrentComment(n), this._emitEOFToken();
        break;
      }
      default:
        n.data += "--!", this.state = b.COMMENT, this._stateComment(t);
    }
  }
  // DOCTYPE state
  //------------------------------------------------------------------
  _stateDoctype(t) {
    switch (t) {
      case m.SPACE:
      case m.LINE_FEED:
      case m.TABULATION:
      case m.FORM_FEED: {
        this.state = b.BEFORE_DOCTYPE_NAME;
        break;
      }
      case m.GREATER_THAN_SIGN: {
        this.state = b.BEFORE_DOCTYPE_NAME, this._stateBeforeDoctypeName(t);
        break;
      }
      case m.EOF: {
        this._err(L.eofInDoctype), this._createDoctypeToken(null);
        const n = this.currentToken;
        n.forceQuirks = !0, this.emitCurrentDoctype(n), this._emitEOFToken();
        break;
      }
      default:
        this._err(L.missingWhitespaceBeforeDoctypeName), this.state = b.BEFORE_DOCTYPE_NAME, this._stateBeforeDoctypeName(t);
    }
  }
  // Before DOCTYPE name state
  //------------------------------------------------------------------
  _stateBeforeDoctypeName(t) {
    if (vn(t))
      this._createDoctypeToken(String.fromCharCode(lr(t))), this.state = b.DOCTYPE_NAME;
    else
      switch (t) {
        case m.SPACE:
        case m.LINE_FEED:
        case m.TABULATION:
        case m.FORM_FEED:
          break;
        case m.NULL: {
          this._err(L.unexpectedNullCharacter), this._createDoctypeToken(Te), this.state = b.DOCTYPE_NAME;
          break;
        }
        case m.GREATER_THAN_SIGN: {
          this._err(L.missingDoctypeName), this._createDoctypeToken(null);
          const n = this.currentToken;
          n.forceQuirks = !0, this.emitCurrentDoctype(n), this.state = b.DATA;
          break;
        }
        case m.EOF: {
          this._err(L.eofInDoctype), this._createDoctypeToken(null);
          const n = this.currentToken;
          n.forceQuirks = !0, this.emitCurrentDoctype(n), this._emitEOFToken();
          break;
        }
        default:
          this._createDoctypeToken(String.fromCodePoint(t)), this.state = b.DOCTYPE_NAME;
      }
  }
  // DOCTYPE name state
  //------------------------------------------------------------------
  _stateDoctypeName(t) {
    const n = this.currentToken;
    switch (t) {
      case m.SPACE:
      case m.LINE_FEED:
      case m.TABULATION:
      case m.FORM_FEED: {
        this.state = b.AFTER_DOCTYPE_NAME;
        break;
      }
      case m.GREATER_THAN_SIGN: {
        this.state = b.DATA, this.emitCurrentDoctype(n);
        break;
      }
      case m.NULL: {
        this._err(L.unexpectedNullCharacter), n.name += Te;
        break;
      }
      case m.EOF: {
        this._err(L.eofInDoctype), n.forceQuirks = !0, this.emitCurrentDoctype(n), this._emitEOFToken();
        break;
      }
      default:
        n.name += String.fromCodePoint(vn(t) ? lr(t) : t);
    }
  }
  // After DOCTYPE name state
  //------------------------------------------------------------------
  _stateAfterDoctypeName(t) {
    const n = this.currentToken;
    switch (t) {
      case m.SPACE:
      case m.LINE_FEED:
      case m.TABULATION:
      case m.FORM_FEED:
        break;
      case m.GREATER_THAN_SIGN: {
        this.state = b.DATA, this.emitCurrentDoctype(n);
        break;
      }
      case m.EOF: {
        this._err(L.eofInDoctype), n.forceQuirks = !0, this.emitCurrentDoctype(n), this._emitEOFToken();
        break;
      }
      default:
        this._consumeSequenceIfMatch(Ve.PUBLIC, !1) ? this.state = b.AFTER_DOCTYPE_PUBLIC_KEYWORD : this._consumeSequenceIfMatch(Ve.SYSTEM, !1) ? this.state = b.AFTER_DOCTYPE_SYSTEM_KEYWORD : this._ensureHibernation() || (this._err(L.invalidCharacterSequenceAfterDoctypeName), n.forceQuirks = !0, this.state = b.BOGUS_DOCTYPE, this._stateBogusDoctype(t));
    }
  }
  // After DOCTYPE public keyword state
  //------------------------------------------------------------------
  _stateAfterDoctypePublicKeyword(t) {
    const n = this.currentToken;
    switch (t) {
      case m.SPACE:
      case m.LINE_FEED:
      case m.TABULATION:
      case m.FORM_FEED: {
        this.state = b.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER;
        break;
      }
      case m.QUOTATION_MARK: {
        this._err(L.missingWhitespaceAfterDoctypePublicKeyword), n.publicId = "", this.state = b.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED;
        break;
      }
      case m.APOSTROPHE: {
        this._err(L.missingWhitespaceAfterDoctypePublicKeyword), n.publicId = "", this.state = b.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED;
        break;
      }
      case m.GREATER_THAN_SIGN: {
        this._err(L.missingDoctypePublicIdentifier), n.forceQuirks = !0, this.state = b.DATA, this.emitCurrentDoctype(n);
        break;
      }
      case m.EOF: {
        this._err(L.eofInDoctype), n.forceQuirks = !0, this.emitCurrentDoctype(n), this._emitEOFToken();
        break;
      }
      default:
        this._err(L.missingQuoteBeforeDoctypePublicIdentifier), n.forceQuirks = !0, this.state = b.BOGUS_DOCTYPE, this._stateBogusDoctype(t);
    }
  }
  // Before DOCTYPE public identifier state
  //------------------------------------------------------------------
  _stateBeforeDoctypePublicIdentifier(t) {
    const n = this.currentToken;
    switch (t) {
      case m.SPACE:
      case m.LINE_FEED:
      case m.TABULATION:
      case m.FORM_FEED:
        break;
      case m.QUOTATION_MARK: {
        n.publicId = "", this.state = b.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED;
        break;
      }
      case m.APOSTROPHE: {
        n.publicId = "", this.state = b.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED;
        break;
      }
      case m.GREATER_THAN_SIGN: {
        this._err(L.missingDoctypePublicIdentifier), n.forceQuirks = !0, this.state = b.DATA, this.emitCurrentDoctype(n);
        break;
      }
      case m.EOF: {
        this._err(L.eofInDoctype), n.forceQuirks = !0, this.emitCurrentDoctype(n), this._emitEOFToken();
        break;
      }
      default:
        this._err(L.missingQuoteBeforeDoctypePublicIdentifier), n.forceQuirks = !0, this.state = b.BOGUS_DOCTYPE, this._stateBogusDoctype(t);
    }
  }
  // DOCTYPE public identifier (double-quoted) state
  //------------------------------------------------------------------
  _stateDoctypePublicIdentifierDoubleQuoted(t) {
    const n = this.currentToken;
    switch (t) {
      case m.QUOTATION_MARK: {
        this.state = b.AFTER_DOCTYPE_PUBLIC_IDENTIFIER;
        break;
      }
      case m.NULL: {
        this._err(L.unexpectedNullCharacter), n.publicId += Te;
        break;
      }
      case m.GREATER_THAN_SIGN: {
        this._err(L.abruptDoctypePublicIdentifier), n.forceQuirks = !0, this.emitCurrentDoctype(n), this.state = b.DATA;
        break;
      }
      case m.EOF: {
        this._err(L.eofInDoctype), n.forceQuirks = !0, this.emitCurrentDoctype(n), this._emitEOFToken();
        break;
      }
      default:
        n.publicId += String.fromCodePoint(t);
    }
  }
  // DOCTYPE public identifier (single-quoted) state
  //------------------------------------------------------------------
  _stateDoctypePublicIdentifierSingleQuoted(t) {
    const n = this.currentToken;
    switch (t) {
      case m.APOSTROPHE: {
        this.state = b.AFTER_DOCTYPE_PUBLIC_IDENTIFIER;
        break;
      }
      case m.NULL: {
        this._err(L.unexpectedNullCharacter), n.publicId += Te;
        break;
      }
      case m.GREATER_THAN_SIGN: {
        this._err(L.abruptDoctypePublicIdentifier), n.forceQuirks = !0, this.emitCurrentDoctype(n), this.state = b.DATA;
        break;
      }
      case m.EOF: {
        this._err(L.eofInDoctype), n.forceQuirks = !0, this.emitCurrentDoctype(n), this._emitEOFToken();
        break;
      }
      default:
        n.publicId += String.fromCodePoint(t);
    }
  }
  // After DOCTYPE public identifier state
  //------------------------------------------------------------------
  _stateAfterDoctypePublicIdentifier(t) {
    const n = this.currentToken;
    switch (t) {
      case m.SPACE:
      case m.LINE_FEED:
      case m.TABULATION:
      case m.FORM_FEED: {
        this.state = b.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS;
        break;
      }
      case m.GREATER_THAN_SIGN: {
        this.state = b.DATA, this.emitCurrentDoctype(n);
        break;
      }
      case m.QUOTATION_MARK: {
        this._err(L.missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers), n.systemId = "", this.state = b.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
        break;
      }
      case m.APOSTROPHE: {
        this._err(L.missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers), n.systemId = "", this.state = b.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
        break;
      }
      case m.EOF: {
        this._err(L.eofInDoctype), n.forceQuirks = !0, this.emitCurrentDoctype(n), this._emitEOFToken();
        break;
      }
      default:
        this._err(L.missingQuoteBeforeDoctypeSystemIdentifier), n.forceQuirks = !0, this.state = b.BOGUS_DOCTYPE, this._stateBogusDoctype(t);
    }
  }
  // Between DOCTYPE public and system identifiers state
  //------------------------------------------------------------------
  _stateBetweenDoctypePublicAndSystemIdentifiers(t) {
    const n = this.currentToken;
    switch (t) {
      case m.SPACE:
      case m.LINE_FEED:
      case m.TABULATION:
      case m.FORM_FEED:
        break;
      case m.GREATER_THAN_SIGN: {
        this.emitCurrentDoctype(n), this.state = b.DATA;
        break;
      }
      case m.QUOTATION_MARK: {
        n.systemId = "", this.state = b.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
        break;
      }
      case m.APOSTROPHE: {
        n.systemId = "", this.state = b.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
        break;
      }
      case m.EOF: {
        this._err(L.eofInDoctype), n.forceQuirks = !0, this.emitCurrentDoctype(n), this._emitEOFToken();
        break;
      }
      default:
        this._err(L.missingQuoteBeforeDoctypeSystemIdentifier), n.forceQuirks = !0, this.state = b.BOGUS_DOCTYPE, this._stateBogusDoctype(t);
    }
  }
  // After DOCTYPE system keyword state
  //------------------------------------------------------------------
  _stateAfterDoctypeSystemKeyword(t) {
    const n = this.currentToken;
    switch (t) {
      case m.SPACE:
      case m.LINE_FEED:
      case m.TABULATION:
      case m.FORM_FEED: {
        this.state = b.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER;
        break;
      }
      case m.QUOTATION_MARK: {
        this._err(L.missingWhitespaceAfterDoctypeSystemKeyword), n.systemId = "", this.state = b.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
        break;
      }
      case m.APOSTROPHE: {
        this._err(L.missingWhitespaceAfterDoctypeSystemKeyword), n.systemId = "", this.state = b.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
        break;
      }
      case m.GREATER_THAN_SIGN: {
        this._err(L.missingDoctypeSystemIdentifier), n.forceQuirks = !0, this.state = b.DATA, this.emitCurrentDoctype(n);
        break;
      }
      case m.EOF: {
        this._err(L.eofInDoctype), n.forceQuirks = !0, this.emitCurrentDoctype(n), this._emitEOFToken();
        break;
      }
      default:
        this._err(L.missingQuoteBeforeDoctypeSystemIdentifier), n.forceQuirks = !0, this.state = b.BOGUS_DOCTYPE, this._stateBogusDoctype(t);
    }
  }
  // Before DOCTYPE system identifier state
  //------------------------------------------------------------------
  _stateBeforeDoctypeSystemIdentifier(t) {
    const n = this.currentToken;
    switch (t) {
      case m.SPACE:
      case m.LINE_FEED:
      case m.TABULATION:
      case m.FORM_FEED:
        break;
      case m.QUOTATION_MARK: {
        n.systemId = "", this.state = b.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
        break;
      }
      case m.APOSTROPHE: {
        n.systemId = "", this.state = b.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
        break;
      }
      case m.GREATER_THAN_SIGN: {
        this._err(L.missingDoctypeSystemIdentifier), n.forceQuirks = !0, this.state = b.DATA, this.emitCurrentDoctype(n);
        break;
      }
      case m.EOF: {
        this._err(L.eofInDoctype), n.forceQuirks = !0, this.emitCurrentDoctype(n), this._emitEOFToken();
        break;
      }
      default:
        this._err(L.missingQuoteBeforeDoctypeSystemIdentifier), n.forceQuirks = !0, this.state = b.BOGUS_DOCTYPE, this._stateBogusDoctype(t);
    }
  }
  // DOCTYPE system identifier (double-quoted) state
  //------------------------------------------------------------------
  _stateDoctypeSystemIdentifierDoubleQuoted(t) {
    const n = this.currentToken;
    switch (t) {
      case m.QUOTATION_MARK: {
        this.state = b.AFTER_DOCTYPE_SYSTEM_IDENTIFIER;
        break;
      }
      case m.NULL: {
        this._err(L.unexpectedNullCharacter), n.systemId += Te;
        break;
      }
      case m.GREATER_THAN_SIGN: {
        this._err(L.abruptDoctypeSystemIdentifier), n.forceQuirks = !0, this.emitCurrentDoctype(n), this.state = b.DATA;
        break;
      }
      case m.EOF: {
        this._err(L.eofInDoctype), n.forceQuirks = !0, this.emitCurrentDoctype(n), this._emitEOFToken();
        break;
      }
      default:
        n.systemId += String.fromCodePoint(t);
    }
  }
  // DOCTYPE system identifier (single-quoted) state
  //------------------------------------------------------------------
  _stateDoctypeSystemIdentifierSingleQuoted(t) {
    const n = this.currentToken;
    switch (t) {
      case m.APOSTROPHE: {
        this.state = b.AFTER_DOCTYPE_SYSTEM_IDENTIFIER;
        break;
      }
      case m.NULL: {
        this._err(L.unexpectedNullCharacter), n.systemId += Te;
        break;
      }
      case m.GREATER_THAN_SIGN: {
        this._err(L.abruptDoctypeSystemIdentifier), n.forceQuirks = !0, this.emitCurrentDoctype(n), this.state = b.DATA;
        break;
      }
      case m.EOF: {
        this._err(L.eofInDoctype), n.forceQuirks = !0, this.emitCurrentDoctype(n), this._emitEOFToken();
        break;
      }
      default:
        n.systemId += String.fromCodePoint(t);
    }
  }
  // After DOCTYPE system identifier state
  //------------------------------------------------------------------
  _stateAfterDoctypeSystemIdentifier(t) {
    const n = this.currentToken;
    switch (t) {
      case m.SPACE:
      case m.LINE_FEED:
      case m.TABULATION:
      case m.FORM_FEED:
        break;
      case m.GREATER_THAN_SIGN: {
        this.emitCurrentDoctype(n), this.state = b.DATA;
        break;
      }
      case m.EOF: {
        this._err(L.eofInDoctype), n.forceQuirks = !0, this.emitCurrentDoctype(n), this._emitEOFToken();
        break;
      }
      default:
        this._err(L.unexpectedCharacterAfterDoctypeSystemIdentifier), this.state = b.BOGUS_DOCTYPE, this._stateBogusDoctype(t);
    }
  }
  // Bogus DOCTYPE state
  //------------------------------------------------------------------
  _stateBogusDoctype(t) {
    const n = this.currentToken;
    switch (t) {
      case m.GREATER_THAN_SIGN: {
        this.emitCurrentDoctype(n), this.state = b.DATA;
        break;
      }
      case m.NULL: {
        this._err(L.unexpectedNullCharacter);
        break;
      }
      case m.EOF: {
        this.emitCurrentDoctype(n), this._emitEOFToken();
        break;
      }
    }
  }
  // CDATA section state
  //------------------------------------------------------------------
  _stateCdataSection(t) {
    switch (t) {
      case m.RIGHT_SQUARE_BRACKET: {
        this.state = b.CDATA_SECTION_BRACKET;
        break;
      }
      case m.EOF: {
        this._err(L.eofInCdata), this._emitEOFToken();
        break;
      }
      default:
        this._emitCodePoint(t);
    }
  }
  // CDATA section bracket state
  //------------------------------------------------------------------
  _stateCdataSectionBracket(t) {
    t === m.RIGHT_SQUARE_BRACKET ? this.state = b.CDATA_SECTION_END : (this._emitChars("]"), this.state = b.CDATA_SECTION, this._stateCdataSection(t));
  }
  // CDATA section end state
  //------------------------------------------------------------------
  _stateCdataSectionEnd(t) {
    switch (t) {
      case m.GREATER_THAN_SIGN: {
        this.state = b.DATA;
        break;
      }
      case m.RIGHT_SQUARE_BRACKET: {
        this._emitChars("]");
        break;
      }
      default:
        this._emitChars("]]"), this.state = b.CDATA_SECTION, this._stateCdataSection(t);
    }
  }
  // Character reference state
  //------------------------------------------------------------------
  _stateCharacterReference() {
    let t = this.entityDecoder.write(this.preprocessor.html, this.preprocessor.pos);
    if (t < 0)
      if (this.preprocessor.lastChunkWritten)
        t = this.entityDecoder.end();
      else {
        this.active = !1, this.preprocessor.pos = this.preprocessor.html.length - 1, this.consumedAfterSnapshot = 0, this.preprocessor.endOfChunkHit = !0;
        return;
      }
    t === 0 ? (this.preprocessor.pos = this.entityStartPos, this._flushCodePointConsumedAsCharacterReference(m.AMPERSAND), this.state = !this._isCharacterReferenceInAttribute() && ds(this.preprocessor.peek(1)) ? b.AMBIGUOUS_AMPERSAND : this.returnState) : this.state = this.returnState;
  }
  // Ambiguos ampersand state
  //------------------------------------------------------------------
  _stateAmbiguousAmpersand(t) {
    ds(t) ? this._flushCodePointConsumedAsCharacterReference(t) : (t === m.SEMICOLON && this._err(L.unknownNamedCharacterReference), this.state = this.returnState, this._callState(t));
  }
}
const Eo = /* @__PURE__ */ new Set([l.DD, l.DT, l.LI, l.OPTGROUP, l.OPTION, l.P, l.RB, l.RP, l.RT, l.RTC]), fs = /* @__PURE__ */ new Set([
  ...Eo,
  l.CAPTION,
  l.COLGROUP,
  l.TBODY,
  l.TD,
  l.TFOOT,
  l.TH,
  l.THEAD,
  l.TR
]), Cr = /* @__PURE__ */ new Set([
  l.APPLET,
  l.CAPTION,
  l.HTML,
  l.MARQUEE,
  l.OBJECT,
  l.TABLE,
  l.TD,
  l.TEMPLATE,
  l.TH
]), jh = /* @__PURE__ */ new Set([...Cr, l.OL, l.UL]), Yh = /* @__PURE__ */ new Set([...Cr, l.BUTTON]), ps = /* @__PURE__ */ new Set([l.ANNOTATION_XML, l.MI, l.MN, l.MO, l.MS, l.MTEXT]), ms = /* @__PURE__ */ new Set([l.DESC, l.FOREIGN_OBJECT, l.TITLE]), qh = /* @__PURE__ */ new Set([l.TR, l.TEMPLATE, l.HTML]), Vh = /* @__PURE__ */ new Set([l.TBODY, l.TFOOT, l.THEAD, l.TEMPLATE, l.HTML]), Wh = /* @__PURE__ */ new Set([l.TABLE, l.TEMPLATE, l.HTML]), Gh = /* @__PURE__ */ new Set([l.TD, l.TH]);
class Qh {
  get currentTmplContentOrNode() {
    return this._isInTemplate() ? this.treeAdapter.getTemplateContent(this.current) : this.current;
  }
  constructor(t, n, r) {
    this.treeAdapter = n, this.handler = r, this.items = [], this.tagIDs = [], this.stackTop = -1, this.tmplCount = 0, this.currentTagId = l.UNKNOWN, this.current = t;
  }
  //Index of element
  _indexOf(t) {
    return this.items.lastIndexOf(t, this.stackTop);
  }
  //Update current element
  _isInTemplate() {
    return this.currentTagId === l.TEMPLATE && this.treeAdapter.getNamespaceURI(this.current) === D.HTML;
  }
  _updateCurrentElement() {
    this.current = this.items[this.stackTop], this.currentTagId = this.tagIDs[this.stackTop];
  }
  //Mutations
  push(t, n) {
    this.stackTop++, this.items[this.stackTop] = t, this.current = t, this.tagIDs[this.stackTop] = n, this.currentTagId = n, this._isInTemplate() && this.tmplCount++, this.handler.onItemPush(t, n, !0);
  }
  pop() {
    const t = this.current;
    this.tmplCount > 0 && this._isInTemplate() && this.tmplCount--, this.stackTop--, this._updateCurrentElement(), this.handler.onItemPop(t, !0);
  }
  replace(t, n) {
    const r = this._indexOf(t);
    this.items[r] = n, r === this.stackTop && (this.current = n);
  }
  insertAfter(t, n, r) {
    const i = this._indexOf(t) + 1;
    this.items.splice(i, 0, n), this.tagIDs.splice(i, 0, r), this.stackTop++, i === this.stackTop && this._updateCurrentElement(), this.current && this.currentTagId !== void 0 && this.handler.onItemPush(this.current, this.currentTagId, i === this.stackTop);
  }
  popUntilTagNamePopped(t) {
    let n = this.stackTop + 1;
    do
      n = this.tagIDs.lastIndexOf(t, n - 1);
    while (n > 0 && this.treeAdapter.getNamespaceURI(this.items[n]) !== D.HTML);
    this.shortenToLength(Math.max(n, 0));
  }
  shortenToLength(t) {
    for (; this.stackTop >= t; ) {
      const n = this.current;
      this.tmplCount > 0 && this._isInTemplate() && (this.tmplCount -= 1), this.stackTop--, this._updateCurrentElement(), this.handler.onItemPop(n, this.stackTop < t);
    }
  }
  popUntilElementPopped(t) {
    const n = this._indexOf(t);
    this.shortenToLength(Math.max(n, 0));
  }
  popUntilPopped(t, n) {
    const r = this._indexOfTagNames(t, n);
    this.shortenToLength(Math.max(r, 0));
  }
  popUntilNumberedHeaderPopped() {
    this.popUntilPopped(Li, D.HTML);
  }
  popUntilTableCellPopped() {
    this.popUntilPopped(Gh, D.HTML);
  }
  popAllUpToHtmlElement() {
    this.tmplCount = 0, this.shortenToLength(1);
  }
  _indexOfTagNames(t, n) {
    for (let r = this.stackTop; r >= 0; r--)
      if (t.has(this.tagIDs[r]) && this.treeAdapter.getNamespaceURI(this.items[r]) === n)
        return r;
    return -1;
  }
  clearBackTo(t, n) {
    const r = this._indexOfTagNames(t, n);
    this.shortenToLength(r + 1);
  }
  clearBackToTableContext() {
    this.clearBackTo(Wh, D.HTML);
  }
  clearBackToTableBodyContext() {
    this.clearBackTo(Vh, D.HTML);
  }
  clearBackToTableRowContext() {
    this.clearBackTo(qh, D.HTML);
  }
  remove(t) {
    const n = this._indexOf(t);
    n >= 0 && (n === this.stackTop ? this.pop() : (this.items.splice(n, 1), this.tagIDs.splice(n, 1), this.stackTop--, this._updateCurrentElement(), this.handler.onItemPop(t, !1)));
  }
  //Search
  tryPeekProperlyNestedBodyElement() {
    return this.stackTop >= 1 && this.tagIDs[1] === l.BODY ? this.items[1] : null;
  }
  contains(t) {
    return this._indexOf(t) > -1;
  }
  getCommonAncestor(t) {
    const n = this._indexOf(t) - 1;
    return n >= 0 ? this.items[n] : null;
  }
  isRootHtmlElementCurrent() {
    return this.stackTop === 0 && this.tagIDs[0] === l.HTML;
  }
  //Element in scope
  hasInDynamicScope(t, n) {
    for (let r = this.stackTop; r >= 0; r--) {
      const i = this.tagIDs[r];
      switch (this.treeAdapter.getNamespaceURI(this.items[r])) {
        case D.HTML: {
          if (i === t)
            return !0;
          if (n.has(i))
            return !1;
          break;
        }
        case D.SVG: {
          if (ms.has(i))
            return !1;
          break;
        }
        case D.MATHML: {
          if (ps.has(i))
            return !1;
          break;
        }
      }
    }
    return !0;
  }
  hasInScope(t) {
    return this.hasInDynamicScope(t, Cr);
  }
  hasInListItemScope(t) {
    return this.hasInDynamicScope(t, jh);
  }
  hasInButtonScope(t) {
    return this.hasInDynamicScope(t, Yh);
  }
  hasNumberedHeaderInScope() {
    for (let t = this.stackTop; t >= 0; t--) {
      const n = this.tagIDs[t];
      switch (this.treeAdapter.getNamespaceURI(this.items[t])) {
        case D.HTML: {
          if (Li.has(n))
            return !0;
          if (Cr.has(n))
            return !1;
          break;
        }
        case D.SVG: {
          if (ms.has(n))
            return !1;
          break;
        }
        case D.MATHML: {
          if (ps.has(n))
            return !1;
          break;
        }
      }
    }
    return !0;
  }
  hasInTableScope(t) {
    for (let n = this.stackTop; n >= 0; n--)
      if (this.treeAdapter.getNamespaceURI(this.items[n]) === D.HTML)
        switch (this.tagIDs[n]) {
          case t:
            return !0;
          case l.TABLE:
          case l.HTML:
            return !1;
        }
    return !0;
  }
  hasTableBodyContextInTableScope() {
    for (let t = this.stackTop; t >= 0; t--)
      if (this.treeAdapter.getNamespaceURI(this.items[t]) === D.HTML)
        switch (this.tagIDs[t]) {
          case l.TBODY:
          case l.THEAD:
          case l.TFOOT:
            return !0;
          case l.TABLE:
          case l.HTML:
            return !1;
        }
    return !0;
  }
  hasInSelectScope(t) {
    for (let n = this.stackTop; n >= 0; n--)
      if (this.treeAdapter.getNamespaceURI(this.items[n]) === D.HTML)
        switch (this.tagIDs[n]) {
          case t:
            return !0;
          case l.OPTION:
          case l.OPTGROUP:
            break;
          default:
            return !1;
        }
    return !0;
  }
  //Implied end tags
  generateImpliedEndTags() {
    for (; this.currentTagId !== void 0 && Eo.has(this.currentTagId); )
      this.pop();
  }
  generateImpliedEndTagsThoroughly() {
    for (; this.currentTagId !== void 0 && fs.has(this.currentTagId); )
      this.pop();
  }
  generateImpliedEndTagsWithExclusion(t) {
    for (; this.currentTagId !== void 0 && this.currentTagId !== t && fs.has(this.currentTagId); )
      this.pop();
  }
}
const ri = 3;
var ft;
(function(e) {
  e[e.Marker = 0] = "Marker", e[e.Element = 1] = "Element";
})(ft || (ft = {}));
const gs = { type: ft.Marker };
class Kh {
  constructor(t) {
    this.treeAdapter = t, this.entries = [], this.bookmark = null;
  }
  //Noah Ark's condition
  //OPTIMIZATION: at first we try to find possible candidates for exclusion using
  //lightweight heuristics without thorough attributes check.
  _getNoahArkConditionCandidates(t, n) {
    const r = [], i = n.length, a = this.treeAdapter.getTagName(t), s = this.treeAdapter.getNamespaceURI(t);
    for (let u = 0; u < this.entries.length; u++) {
      const o = this.entries[u];
      if (o.type === ft.Marker)
        break;
      const { element: c } = o;
      if (this.treeAdapter.getTagName(c) === a && this.treeAdapter.getNamespaceURI(c) === s) {
        const d = this.treeAdapter.getAttrList(c);
        d.length === i && r.push({ idx: u, attrs: d });
      }
    }
    return r;
  }
  _ensureNoahArkCondition(t) {
    if (this.entries.length < ri)
      return;
    const n = this.treeAdapter.getAttrList(t), r = this._getNoahArkConditionCandidates(t, n);
    if (r.length < ri)
      return;
    const i = new Map(n.map((s) => [s.name, s.value]));
    let a = 0;
    for (let s = 0; s < r.length; s++) {
      const u = r[s];
      u.attrs.every((o) => i.get(o.name) === o.value) && (a += 1, a >= ri && this.entries.splice(u.idx, 1));
    }
  }
  //Mutations
  insertMarker() {
    this.entries.unshift(gs);
  }
  pushElement(t, n) {
    this._ensureNoahArkCondition(t), this.entries.unshift({
      type: ft.Element,
      element: t,
      token: n
    });
  }
  insertElementAfterBookmark(t, n) {
    const r = this.entries.indexOf(this.bookmark);
    this.entries.splice(r, 0, {
      type: ft.Element,
      element: t,
      token: n
    });
  }
  removeEntry(t) {
    const n = this.entries.indexOf(t);
    n !== -1 && this.entries.splice(n, 1);
  }
  /**
   * Clears the list of formatting elements up to the last marker.
   *
   * @see https://html.spec.whatwg.org/multipage/parsing.html#clear-the-list-of-active-formatting-elements-up-to-the-last-marker
   */
  clearToLastMarker() {
    const t = this.entries.indexOf(gs);
    t === -1 ? this.entries.length = 0 : this.entries.splice(0, t + 1);
  }
  //Search
  getElementEntryInScopeWithTagName(t) {
    const n = this.entries.find((r) => r.type === ft.Marker || this.treeAdapter.getTagName(r.element) === t);
    return n && n.type === ft.Element ? n : null;
  }
  getElementEntry(t) {
    return this.entries.find((n) => n.type === ft.Element && n.element === t);
  }
}
const Ot = {
  //Node construction
  createDocument() {
    return {
      nodeName: "#document",
      mode: tt.NO_QUIRKS,
      childNodes: []
    };
  },
  createDocumentFragment() {
    return {
      nodeName: "#document-fragment",
      childNodes: []
    };
  },
  createElement(e, t, n) {
    return {
      nodeName: e,
      tagName: e,
      attrs: n,
      namespaceURI: t,
      childNodes: [],
      parentNode: null
    };
  },
  createCommentNode(e) {
    return {
      nodeName: "#comment",
      data: e,
      parentNode: null
    };
  },
  createTextNode(e) {
    return {
      nodeName: "#text",
      value: e,
      parentNode: null
    };
  },
  //Tree mutation
  appendChild(e, t) {
    e.childNodes.push(t), t.parentNode = e;
  },
  insertBefore(e, t, n) {
    const r = e.childNodes.indexOf(n);
    e.childNodes.splice(r, 0, t), t.parentNode = e;
  },
  setTemplateContent(e, t) {
    e.content = t;
  },
  getTemplateContent(e) {
    return e.content;
  },
  setDocumentType(e, t, n, r) {
    const i = e.childNodes.find((a) => a.nodeName === "#documentType");
    if (i)
      i.name = t, i.publicId = n, i.systemId = r;
    else {
      const a = {
        nodeName: "#documentType",
        name: t,
        publicId: n,
        systemId: r,
        parentNode: null
      };
      Ot.appendChild(e, a);
    }
  },
  setDocumentMode(e, t) {
    e.mode = t;
  },
  getDocumentMode(e) {
    return e.mode;
  },
  detachNode(e) {
    if (e.parentNode) {
      const t = e.parentNode.childNodes.indexOf(e);
      e.parentNode.childNodes.splice(t, 1), e.parentNode = null;
    }
  },
  insertText(e, t) {
    if (e.childNodes.length > 0) {
      const n = e.childNodes[e.childNodes.length - 1];
      if (Ot.isTextNode(n)) {
        n.value += t;
        return;
      }
    }
    Ot.appendChild(e, Ot.createTextNode(t));
  },
  insertTextBefore(e, t, n) {
    const r = e.childNodes[e.childNodes.indexOf(n) - 1];
    r && Ot.isTextNode(r) ? r.value += t : Ot.insertBefore(e, Ot.createTextNode(t), n);
  },
  adoptAttributes(e, t) {
    const n = new Set(e.attrs.map((r) => r.name));
    for (let r = 0; r < t.length; r++)
      n.has(t[r].name) || e.attrs.push(t[r]);
  },
  //Tree traversing
  getFirstChild(e) {
    return e.childNodes[0];
  },
  getChildNodes(e) {
    return e.childNodes;
  },
  getParentNode(e) {
    return e.parentNode;
  },
  getAttrList(e) {
    return e.attrs;
  },
  //Node data
  getTagName(e) {
    return e.tagName;
  },
  getNamespaceURI(e) {
    return e.namespaceURI;
  },
  getTextNodeContent(e) {
    return e.value;
  },
  getCommentNodeContent(e) {
    return e.data;
  },
  getDocumentTypeNodeName(e) {
    return e.name;
  },
  getDocumentTypeNodePublicId(e) {
    return e.publicId;
  },
  getDocumentTypeNodeSystemId(e) {
    return e.systemId;
  },
  //Node types
  isTextNode(e) {
    return e.nodeName === "#text";
  },
  isCommentNode(e) {
    return e.nodeName === "#comment";
  },
  isDocumentTypeNode(e) {
    return e.nodeName === "#documentType";
  },
  isElementNode(e) {
    return Object.prototype.hasOwnProperty.call(e, "tagName");
  },
  // Source code location
  setNodeSourceCodeLocation(e, t) {
    e.sourceCodeLocation = t;
  },
  getNodeSourceCodeLocation(e) {
    return e.sourceCodeLocation;
  },
  updateNodeSourceCodeLocation(e, t) {
    e.sourceCodeLocation = { ...e.sourceCodeLocation, ...t };
  }
}, To = "html", Xh = "about:legacy-compat", Zh = "http://www.ibm.com/data/dtd/v11/ibmxhtml1-transitional.dtd", ko = [
  "+//silmaril//dtd html pro v0r11 19970101//",
  "-//as//dtd html 3.0 aswedit + extensions//",
  "-//advasoft ltd//dtd html 3.0 aswedit + extensions//",
  "-//ietf//dtd html 2.0 level 1//",
  "-//ietf//dtd html 2.0 level 2//",
  "-//ietf//dtd html 2.0 strict level 1//",
  "-//ietf//dtd html 2.0 strict level 2//",
  "-//ietf//dtd html 2.0 strict//",
  "-//ietf//dtd html 2.0//",
  "-//ietf//dtd html 2.1e//",
  "-//ietf//dtd html 3.0//",
  "-//ietf//dtd html 3.2 final//",
  "-//ietf//dtd html 3.2//",
  "-//ietf//dtd html 3//",
  "-//ietf//dtd html level 0//",
  "-//ietf//dtd html level 1//",
  "-//ietf//dtd html level 2//",
  "-//ietf//dtd html level 3//",
  "-//ietf//dtd html strict level 0//",
  "-//ietf//dtd html strict level 1//",
  "-//ietf//dtd html strict level 2//",
  "-//ietf//dtd html strict level 3//",
  "-//ietf//dtd html strict//",
  "-//ietf//dtd html//",
  "-//metrius//dtd metrius presentational//",
  "-//microsoft//dtd internet explorer 2.0 html strict//",
  "-//microsoft//dtd internet explorer 2.0 html//",
  "-//microsoft//dtd internet explorer 2.0 tables//",
  "-//microsoft//dtd internet explorer 3.0 html strict//",
  "-//microsoft//dtd internet explorer 3.0 html//",
  "-//microsoft//dtd internet explorer 3.0 tables//",
  "-//netscape comm. corp.//dtd html//",
  "-//netscape comm. corp.//dtd strict html//",
  "-//o'reilly and associates//dtd html 2.0//",
  "-//o'reilly and associates//dtd html extended 1.0//",
  "-//o'reilly and associates//dtd html extended relaxed 1.0//",
  "-//sq//dtd html 2.0 hotmetal + extensions//",
  "-//softquad software//dtd hotmetal pro 6.0::19990601::extensions to html 4.0//",
  "-//softquad//dtd hotmetal pro 4.0::19971010::extensions to html 4.0//",
  "-//spyglass//dtd html 2.0 extended//",
  "-//sun microsystems corp.//dtd hotjava html//",
  "-//sun microsystems corp.//dtd hotjava strict html//",
  "-//w3c//dtd html 3 1995-03-24//",
  "-//w3c//dtd html 3.2 draft//",
  "-//w3c//dtd html 3.2 final//",
  "-//w3c//dtd html 3.2//",
  "-//w3c//dtd html 3.2s draft//",
  "-//w3c//dtd html 4.0 frameset//",
  "-//w3c//dtd html 4.0 transitional//",
  "-//w3c//dtd html experimental 19960712//",
  "-//w3c//dtd html experimental 970421//",
  "-//w3c//dtd w3 html//",
  "-//w3o//dtd w3 html 3.0//",
  "-//webtechs//dtd mozilla html 2.0//",
  "-//webtechs//dtd mozilla html//"
], Jh = [
  ...ko,
  "-//w3c//dtd html 4.01 frameset//",
  "-//w3c//dtd html 4.01 transitional//"
], ef = /* @__PURE__ */ new Set([
  "-//w3o//dtd w3 html strict 3.0//en//",
  "-/w3c/dtd html 4.0 transitional/en",
  "html"
]), xo = ["-//w3c//dtd xhtml 1.0 frameset//", "-//w3c//dtd xhtml 1.0 transitional//"], tf = [
  ...xo,
  "-//w3c//dtd html 4.01 frameset//",
  "-//w3c//dtd html 4.01 transitional//"
];
function bs(e, t) {
  return t.some((n) => e.startsWith(n));
}
function nf(e) {
  return e.name === To && e.publicId === null && (e.systemId === null || e.systemId === Xh);
}
function rf(e) {
  if (e.name !== To)
    return tt.QUIRKS;
  const { systemId: t } = e;
  if (t && t.toLowerCase() === Zh)
    return tt.QUIRKS;
  let { publicId: n } = e;
  if (n !== null) {
    if (n = n.toLowerCase(), ef.has(n))
      return tt.QUIRKS;
    let r = t === null ? Jh : ko;
    if (bs(n, r))
      return tt.QUIRKS;
    if (r = t === null ? xo : tf, bs(n, r))
      return tt.LIMITED_QUIRKS;
  }
  return tt.NO_QUIRKS;
}
const Es = {
  TEXT_HTML: "text/html",
  APPLICATION_XML: "application/xhtml+xml"
}, af = "definitionurl", sf = "definitionURL", uf = new Map([
  "attributeName",
  "attributeType",
  "baseFrequency",
  "baseProfile",
  "calcMode",
  "clipPathUnits",
  "diffuseConstant",
  "edgeMode",
  "filterUnits",
  "glyphRef",
  "gradientTransform",
  "gradientUnits",
  "kernelMatrix",
  "kernelUnitLength",
  "keyPoints",
  "keySplines",
  "keyTimes",
  "lengthAdjust",
  "limitingConeAngle",
  "markerHeight",
  "markerUnits",
  "markerWidth",
  "maskContentUnits",
  "maskUnits",
  "numOctaves",
  "pathLength",
  "patternContentUnits",
  "patternTransform",
  "patternUnits",
  "pointsAtX",
  "pointsAtY",
  "pointsAtZ",
  "preserveAlpha",
  "preserveAspectRatio",
  "primitiveUnits",
  "refX",
  "refY",
  "repeatCount",
  "repeatDur",
  "requiredExtensions",
  "requiredFeatures",
  "specularConstant",
  "specularExponent",
  "spreadMethod",
  "startOffset",
  "stdDeviation",
  "stitchTiles",
  "surfaceScale",
  "systemLanguage",
  "tableValues",
  "targetX",
  "targetY",
  "textLength",
  "viewBox",
  "viewTarget",
  "xChannelSelector",
  "yChannelSelector",
  "zoomAndPan"
].map((e) => [e.toLowerCase(), e])), of = /* @__PURE__ */ new Map([
  ["xlink:actuate", { prefix: "xlink", name: "actuate", namespace: D.XLINK }],
  ["xlink:arcrole", { prefix: "xlink", name: "arcrole", namespace: D.XLINK }],
  ["xlink:href", { prefix: "xlink", name: "href", namespace: D.XLINK }],
  ["xlink:role", { prefix: "xlink", name: "role", namespace: D.XLINK }],
  ["xlink:show", { prefix: "xlink", name: "show", namespace: D.XLINK }],
  ["xlink:title", { prefix: "xlink", name: "title", namespace: D.XLINK }],
  ["xlink:type", { prefix: "xlink", name: "type", namespace: D.XLINK }],
  ["xml:lang", { prefix: "xml", name: "lang", namespace: D.XML }],
  ["xml:space", { prefix: "xml", name: "space", namespace: D.XML }],
  ["xmlns", { prefix: "", name: "xmlns", namespace: D.XMLNS }],
  ["xmlns:xlink", { prefix: "xmlns", name: "xlink", namespace: D.XMLNS }]
]), lf = new Map([
  "altGlyph",
  "altGlyphDef",
  "altGlyphItem",
  "animateColor",
  "animateMotion",
  "animateTransform",
  "clipPath",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence",
  "foreignObject",
  "glyphRef",
  "linearGradient",
  "radialGradient",
  "textPath"
].map((e) => [e.toLowerCase(), e])), cf = /* @__PURE__ */ new Set([
  l.B,
  l.BIG,
  l.BLOCKQUOTE,
  l.BODY,
  l.BR,
  l.CENTER,
  l.CODE,
  l.DD,
  l.DIV,
  l.DL,
  l.DT,
  l.EM,
  l.EMBED,
  l.H1,
  l.H2,
  l.H3,
  l.H4,
  l.H5,
  l.H6,
  l.HEAD,
  l.HR,
  l.I,
  l.IMG,
  l.LI,
  l.LISTING,
  l.MENU,
  l.META,
  l.NOBR,
  l.OL,
  l.P,
  l.PRE,
  l.RUBY,
  l.S,
  l.SMALL,
  l.SPAN,
  l.STRONG,
  l.STRIKE,
  l.SUB,
  l.SUP,
  l.TABLE,
  l.TT,
  l.U,
  l.UL,
  l.VAR
]);
function df(e) {
  const t = e.tagID;
  return t === l.FONT && e.attrs.some(({ name: r }) => r === Kt.COLOR || r === Kt.SIZE || r === Kt.FACE) || cf.has(t);
}
function yo(e) {
  for (let t = 0; t < e.attrs.length; t++)
    if (e.attrs[t].name === af) {
      e.attrs[t].name = sf;
      break;
    }
}
function Ao(e) {
  for (let t = 0; t < e.attrs.length; t++) {
    const n = uf.get(e.attrs[t].name);
    n != null && (e.attrs[t].name = n);
  }
}
function sa(e) {
  for (let t = 0; t < e.attrs.length; t++) {
    const n = of.get(e.attrs[t].name);
    n && (e.attrs[t].prefix = n.prefix, e.attrs[t].name = n.name, e.attrs[t].namespace = n.namespace);
  }
}
function hf(e) {
  const t = lf.get(e.tagName);
  t != null && (e.tagName = t, e.tagID = En(e.tagName));
}
function ff(e, t) {
  return t === D.MATHML && (e === l.MI || e === l.MO || e === l.MN || e === l.MS || e === l.MTEXT);
}
function pf(e, t, n) {
  if (t === D.MATHML && e === l.ANNOTATION_XML) {
    for (let r = 0; r < n.length; r++)
      if (n[r].name === Kt.ENCODING) {
        const i = n[r].value.toLowerCase();
        return i === Es.TEXT_HTML || i === Es.APPLICATION_XML;
      }
  }
  return t === D.SVG && (e === l.FOREIGN_OBJECT || e === l.DESC || e === l.TITLE);
}
function mf(e, t, n, r) {
  return (!r || r === D.HTML) && pf(e, t, n) || (!r || r === D.MATHML) && ff(e, t);
}
const gf = "hidden", bf = 8, Ef = 3;
var T;
(function(e) {
  e[e.INITIAL = 0] = "INITIAL", e[e.BEFORE_HTML = 1] = "BEFORE_HTML", e[e.BEFORE_HEAD = 2] = "BEFORE_HEAD", e[e.IN_HEAD = 3] = "IN_HEAD", e[e.IN_HEAD_NO_SCRIPT = 4] = "IN_HEAD_NO_SCRIPT", e[e.AFTER_HEAD = 5] = "AFTER_HEAD", e[e.IN_BODY = 6] = "IN_BODY", e[e.TEXT = 7] = "TEXT", e[e.IN_TABLE = 8] = "IN_TABLE", e[e.IN_TABLE_TEXT = 9] = "IN_TABLE_TEXT", e[e.IN_CAPTION = 10] = "IN_CAPTION", e[e.IN_COLUMN_GROUP = 11] = "IN_COLUMN_GROUP", e[e.IN_TABLE_BODY = 12] = "IN_TABLE_BODY", e[e.IN_ROW = 13] = "IN_ROW", e[e.IN_CELL = 14] = "IN_CELL", e[e.IN_SELECT = 15] = "IN_SELECT", e[e.IN_SELECT_IN_TABLE = 16] = "IN_SELECT_IN_TABLE", e[e.IN_TEMPLATE = 17] = "IN_TEMPLATE", e[e.AFTER_BODY = 18] = "AFTER_BODY", e[e.IN_FRAMESET = 19] = "IN_FRAMESET", e[e.AFTER_FRAMESET = 20] = "AFTER_FRAMESET", e[e.AFTER_AFTER_BODY = 21] = "AFTER_AFTER_BODY", e[e.AFTER_AFTER_FRAMESET = 22] = "AFTER_AFTER_FRAMESET";
})(T || (T = {}));
const Tf = {
  startLine: -1,
  startCol: -1,
  startOffset: -1,
  endLine: -1,
  endCol: -1,
  endOffset: -1
}, _o = /* @__PURE__ */ new Set([l.TABLE, l.TBODY, l.TFOOT, l.THEAD, l.TR]), Ts = {
  scriptingEnabled: !0,
  sourceCodeLocationInfo: !1,
  treeAdapter: Ot,
  onParseError: null
};
class ks {
  constructor(t, n, r = null, i = null) {
    this.fragmentContext = r, this.scriptHandler = i, this.currentToken = null, this.stopped = !1, this.insertionMode = T.INITIAL, this.originalInsertionMode = T.INITIAL, this.headElement = null, this.formElement = null, this.currentNotInHTML = !1, this.tmplInsertionModeStack = [], this.pendingCharacterTokens = [], this.hasNonWhitespacePendingCharacterToken = !1, this.framesetOk = !0, this.skipNextNewLine = !1, this.fosterParentingEnabled = !1, this.options = {
      ...Ts,
      ...t
    }, this.treeAdapter = this.options.treeAdapter, this.onParseError = this.options.onParseError, this.onParseError && (this.options.sourceCodeLocationInfo = !0), this.document = n ?? this.treeAdapter.createDocument(), this.tokenizer = new $h(this.options, this), this.activeFormattingElements = new Kh(this.treeAdapter), this.fragmentContextID = r ? En(this.treeAdapter.getTagName(r)) : l.UNKNOWN, this._setContextModes(r ?? this.document, this.fragmentContextID), this.openElements = new Qh(this.document, this.treeAdapter, this);
  }
  // API
  static parse(t, n) {
    const r = new this(n);
    return r.tokenizer.write(t, !0), r.document;
  }
  static getFragmentParser(t, n) {
    const r = {
      ...Ts,
      ...n
    };
    t ?? (t = r.treeAdapter.createElement(N.TEMPLATE, D.HTML, []));
    const i = r.treeAdapter.createElement("documentmock", D.HTML, []), a = new this(r, i, t);
    return a.fragmentContextID === l.TEMPLATE && a.tmplInsertionModeStack.unshift(T.IN_TEMPLATE), a._initTokenizerForFragmentParsing(), a._insertFakeRootElement(), a._resetInsertionMode(), a._findFormInFragmentContext(), a;
  }
  getFragment() {
    const t = this.treeAdapter.getFirstChild(this.document), n = this.treeAdapter.createDocumentFragment();
    return this._adoptNodes(t, n), n;
  }
  //Errors
  /** @internal */
  _err(t, n, r) {
    var i;
    if (!this.onParseError)
      return;
    const a = (i = t.location) !== null && i !== void 0 ? i : Tf, s = {
      code: n,
      startLine: a.startLine,
      startCol: a.startCol,
      startOffset: a.startOffset,
      endLine: r ? a.startLine : a.endLine,
      endCol: r ? a.startCol : a.endCol,
      endOffset: r ? a.startOffset : a.endOffset
    };
    this.onParseError(s);
  }
  //Stack events
  /** @internal */
  onItemPush(t, n, r) {
    var i, a;
    (a = (i = this.treeAdapter).onItemPush) === null || a === void 0 || a.call(i, t), r && this.openElements.stackTop > 0 && this._setContextModes(t, n);
  }
  /** @internal */
  onItemPop(t, n) {
    var r, i;
    if (this.options.sourceCodeLocationInfo && this._setEndLocation(t, this.currentToken), (i = (r = this.treeAdapter).onItemPop) === null || i === void 0 || i.call(r, t, this.openElements.current), n) {
      let a, s;
      this.openElements.stackTop === 0 && this.fragmentContext ? (a = this.fragmentContext, s = this.fragmentContextID) : { current: a, currentTagId: s } = this.openElements, this._setContextModes(a, s);
    }
  }
  _setContextModes(t, n) {
    const r = t === this.document || t && this.treeAdapter.getNamespaceURI(t) === D.HTML;
    this.currentNotInHTML = !r, this.tokenizer.inForeignNode = !r && t !== void 0 && n !== void 0 && !this._isIntegrationPoint(n, t);
  }
  /** @protected */
  _switchToTextParsing(t, n) {
    this._insertElement(t, D.HTML), this.tokenizer.state = n, this.originalInsertionMode = this.insertionMode, this.insertionMode = T.TEXT;
  }
  switchToPlaintextParsing() {
    this.insertionMode = T.TEXT, this.originalInsertionMode = T.IN_BODY, this.tokenizer.state = _e.PLAINTEXT;
  }
  //Fragment parsing
  /** @protected */
  _getAdjustedCurrentElement() {
    return this.openElements.stackTop === 0 && this.fragmentContext ? this.fragmentContext : this.openElements.current;
  }
  /** @protected */
  _findFormInFragmentContext() {
    let t = this.fragmentContext;
    for (; t; ) {
      if (this.treeAdapter.getTagName(t) === N.FORM) {
        this.formElement = t;
        break;
      }
      t = this.treeAdapter.getParentNode(t);
    }
  }
  _initTokenizerForFragmentParsing() {
    if (!(!this.fragmentContext || this.treeAdapter.getNamespaceURI(this.fragmentContext) !== D.HTML))
      switch (this.fragmentContextID) {
        case l.TITLE:
        case l.TEXTAREA: {
          this.tokenizer.state = _e.RCDATA;
          break;
        }
        case l.STYLE:
        case l.XMP:
        case l.IFRAME:
        case l.NOEMBED:
        case l.NOFRAMES:
        case l.NOSCRIPT: {
          this.tokenizer.state = _e.RAWTEXT;
          break;
        }
        case l.SCRIPT: {
          this.tokenizer.state = _e.SCRIPT_DATA;
          break;
        }
        case l.PLAINTEXT: {
          this.tokenizer.state = _e.PLAINTEXT;
          break;
        }
      }
  }
  //Tree mutation
  /** @protected */
  _setDocumentType(t) {
    const n = t.name || "", r = t.publicId || "", i = t.systemId || "";
    if (this.treeAdapter.setDocumentType(this.document, n, r, i), t.location) {
      const s = this.treeAdapter.getChildNodes(this.document).find((u) => this.treeAdapter.isDocumentTypeNode(u));
      s && this.treeAdapter.setNodeSourceCodeLocation(s, t.location);
    }
  }
  /** @protected */
  _attachElementToTree(t, n) {
    if (this.options.sourceCodeLocationInfo) {
      const r = n && {
        ...n,
        startTag: n
      };
      this.treeAdapter.setNodeSourceCodeLocation(t, r);
    }
    if (this._shouldFosterParentOnInsertion())
      this._fosterParentElement(t);
    else {
      const r = this.openElements.currentTmplContentOrNode;
      this.treeAdapter.appendChild(r ?? this.document, t);
    }
  }
  /**
   * For self-closing tags. Add an element to the tree, but skip adding it
   * to the stack.
   */
  /** @protected */
  _appendElement(t, n) {
    const r = this.treeAdapter.createElement(t.tagName, n, t.attrs);
    this._attachElementToTree(r, t.location);
  }
  /** @protected */
  _insertElement(t, n) {
    const r = this.treeAdapter.createElement(t.tagName, n, t.attrs);
    this._attachElementToTree(r, t.location), this.openElements.push(r, t.tagID);
  }
  /** @protected */
  _insertFakeElement(t, n) {
    const r = this.treeAdapter.createElement(t, D.HTML, []);
    this._attachElementToTree(r, null), this.openElements.push(r, n);
  }
  /** @protected */
  _insertTemplate(t) {
    const n = this.treeAdapter.createElement(t.tagName, D.HTML, t.attrs), r = this.treeAdapter.createDocumentFragment();
    this.treeAdapter.setTemplateContent(n, r), this._attachElementToTree(n, t.location), this.openElements.push(n, t.tagID), this.options.sourceCodeLocationInfo && this.treeAdapter.setNodeSourceCodeLocation(r, null);
  }
  /** @protected */
  _insertFakeRootElement() {
    const t = this.treeAdapter.createElement(N.HTML, D.HTML, []);
    this.options.sourceCodeLocationInfo && this.treeAdapter.setNodeSourceCodeLocation(t, null), this.treeAdapter.appendChild(this.openElements.current, t), this.openElements.push(t, l.HTML);
  }
  /** @protected */
  _appendCommentNode(t, n) {
    const r = this.treeAdapter.createCommentNode(t.data);
    this.treeAdapter.appendChild(n, r), this.options.sourceCodeLocationInfo && this.treeAdapter.setNodeSourceCodeLocation(r, t.location);
  }
  /** @protected */
  _insertCharacters(t) {
    let n, r;
    if (this._shouldFosterParentOnInsertion() ? ({ parent: n, beforeElement: r } = this._findFosterParentingLocation(), r ? this.treeAdapter.insertTextBefore(n, t.chars, r) : this.treeAdapter.insertText(n, t.chars)) : (n = this.openElements.currentTmplContentOrNode, this.treeAdapter.insertText(n, t.chars)), !t.location)
      return;
    const i = this.treeAdapter.getChildNodes(n), a = r ? i.lastIndexOf(r) : i.length, s = i[a - 1];
    if (this.treeAdapter.getNodeSourceCodeLocation(s)) {
      const { endLine: o, endCol: c, endOffset: d } = t.location;
      this.treeAdapter.updateNodeSourceCodeLocation(s, { endLine: o, endCol: c, endOffset: d });
    } else this.options.sourceCodeLocationInfo && this.treeAdapter.setNodeSourceCodeLocation(s, t.location);
  }
  /** @protected */
  _adoptNodes(t, n) {
    for (let r = this.treeAdapter.getFirstChild(t); r; r = this.treeAdapter.getFirstChild(t))
      this.treeAdapter.detachNode(r), this.treeAdapter.appendChild(n, r);
  }
  /** @protected */
  _setEndLocation(t, n) {
    if (this.treeAdapter.getNodeSourceCodeLocation(t) && n.location) {
      const r = n.location, i = this.treeAdapter.getTagName(t), a = (
        // NOTE: For cases like <p> <p> </p> - First 'p' closes without a closing
        // tag and for cases like <td> <p> </td> - 'p' closes without a closing tag.
        n.type === ne.END_TAG && i === n.tagName ? {
          endTag: { ...r },
          endLine: r.endLine,
          endCol: r.endCol,
          endOffset: r.endOffset
        } : {
          endLine: r.startLine,
          endCol: r.startCol,
          endOffset: r.startOffset
        }
      );
      this.treeAdapter.updateNodeSourceCodeLocation(t, a);
    }
  }
  //Token processing
  shouldProcessStartTagTokenInForeignContent(t) {
    if (!this.currentNotInHTML)
      return !1;
    let n, r;
    return this.openElements.stackTop === 0 && this.fragmentContext ? (n = this.fragmentContext, r = this.fragmentContextID) : { current: n, currentTagId: r } = this.openElements, t.tagID === l.SVG && this.treeAdapter.getTagName(n) === N.ANNOTATION_XML && this.treeAdapter.getNamespaceURI(n) === D.MATHML ? !1 : (
      // Check that `current` is not an integration point for HTML or MathML elements.
      this.tokenizer.inForeignNode || // If it _is_ an integration point, then we might have to check that it is not an HTML
      // integration point.
      (t.tagID === l.MGLYPH || t.tagID === l.MALIGNMARK) && r !== void 0 && !this._isIntegrationPoint(r, n, D.HTML)
    );
  }
  /** @protected */
  _processToken(t) {
    switch (t.type) {
      case ne.CHARACTER: {
        this.onCharacter(t);
        break;
      }
      case ne.NULL_CHARACTER: {
        this.onNullCharacter(t);
        break;
      }
      case ne.COMMENT: {
        this.onComment(t);
        break;
      }
      case ne.DOCTYPE: {
        this.onDoctype(t);
        break;
      }
      case ne.START_TAG: {
        this._processStartTag(t);
        break;
      }
      case ne.END_TAG: {
        this.onEndTag(t);
        break;
      }
      case ne.EOF: {
        this.onEof(t);
        break;
      }
      case ne.WHITESPACE_CHARACTER: {
        this.onWhitespaceCharacter(t);
        break;
      }
    }
  }
  //Integration points
  /** @protected */
  _isIntegrationPoint(t, n, r) {
    const i = this.treeAdapter.getNamespaceURI(n), a = this.treeAdapter.getAttrList(n);
    return mf(t, i, a, r);
  }
  //Active formatting elements reconstruction
  /** @protected */
  _reconstructActiveFormattingElements() {
    const t = this.activeFormattingElements.entries.length;
    if (t) {
      const n = this.activeFormattingElements.entries.findIndex((i) => i.type === ft.Marker || this.openElements.contains(i.element)), r = n === -1 ? t - 1 : n - 1;
      for (let i = r; i >= 0; i--) {
        const a = this.activeFormattingElements.entries[i];
        this._insertElement(a.token, this.treeAdapter.getNamespaceURI(a.element)), a.element = this.openElements.current;
      }
    }
  }
  //Close elements
  /** @protected */
  _closeTableCell() {
    this.openElements.generateImpliedEndTags(), this.openElements.popUntilTableCellPopped(), this.activeFormattingElements.clearToLastMarker(), this.insertionMode = T.IN_ROW;
  }
  /** @protected */
  _closePElement() {
    this.openElements.generateImpliedEndTagsWithExclusion(l.P), this.openElements.popUntilTagNamePopped(l.P);
  }
  //Insertion modes
  /** @protected */
  _resetInsertionMode() {
    for (let t = this.openElements.stackTop; t >= 0; t--)
      switch (t === 0 && this.fragmentContext ? this.fragmentContextID : this.openElements.tagIDs[t]) {
        case l.TR: {
          this.insertionMode = T.IN_ROW;
          return;
        }
        case l.TBODY:
        case l.THEAD:
        case l.TFOOT: {
          this.insertionMode = T.IN_TABLE_BODY;
          return;
        }
        case l.CAPTION: {
          this.insertionMode = T.IN_CAPTION;
          return;
        }
        case l.COLGROUP: {
          this.insertionMode = T.IN_COLUMN_GROUP;
          return;
        }
        case l.TABLE: {
          this.insertionMode = T.IN_TABLE;
          return;
        }
        case l.BODY: {
          this.insertionMode = T.IN_BODY;
          return;
        }
        case l.FRAMESET: {
          this.insertionMode = T.IN_FRAMESET;
          return;
        }
        case l.SELECT: {
          this._resetInsertionModeForSelect(t);
          return;
        }
        case l.TEMPLATE: {
          this.insertionMode = this.tmplInsertionModeStack[0];
          return;
        }
        case l.HTML: {
          this.insertionMode = this.headElement ? T.AFTER_HEAD : T.BEFORE_HEAD;
          return;
        }
        case l.TD:
        case l.TH: {
          if (t > 0) {
            this.insertionMode = T.IN_CELL;
            return;
          }
          break;
        }
        case l.HEAD: {
          if (t > 0) {
            this.insertionMode = T.IN_HEAD;
            return;
          }
          break;
        }
      }
    this.insertionMode = T.IN_BODY;
  }
  /** @protected */
  _resetInsertionModeForSelect(t) {
    if (t > 0)
      for (let n = t - 1; n > 0; n--) {
        const r = this.openElements.tagIDs[n];
        if (r === l.TEMPLATE)
          break;
        if (r === l.TABLE) {
          this.insertionMode = T.IN_SELECT_IN_TABLE;
          return;
        }
      }
    this.insertionMode = T.IN_SELECT;
  }
  //Foster parenting
  /** @protected */
  _isElementCausesFosterParenting(t) {
    return _o.has(t);
  }
  /** @protected */
  _shouldFosterParentOnInsertion() {
    return this.fosterParentingEnabled && this.openElements.currentTagId !== void 0 && this._isElementCausesFosterParenting(this.openElements.currentTagId);
  }
  /** @protected */
  _findFosterParentingLocation() {
    for (let t = this.openElements.stackTop; t >= 0; t--) {
      const n = this.openElements.items[t];
      switch (this.openElements.tagIDs[t]) {
        case l.TEMPLATE: {
          if (this.treeAdapter.getNamespaceURI(n) === D.HTML)
            return { parent: this.treeAdapter.getTemplateContent(n), beforeElement: null };
          break;
        }
        case l.TABLE: {
          const r = this.treeAdapter.getParentNode(n);
          return r ? { parent: r, beforeElement: n } : { parent: this.openElements.items[t - 1], beforeElement: null };
        }
      }
    }
    return { parent: this.openElements.items[0], beforeElement: null };
  }
  /** @protected */
  _fosterParentElement(t) {
    const n = this._findFosterParentingLocation();
    n.beforeElement ? this.treeAdapter.insertBefore(n.parent, t, n.beforeElement) : this.treeAdapter.appendChild(n.parent, t);
  }
  //Special elements
  /** @protected */
  _isSpecialElement(t, n) {
    const r = this.treeAdapter.getNamespaceURI(t);
    return Fh[r].has(n);
  }
  /** @internal */
  onCharacter(t) {
    if (this.skipNextNewLine = !1, this.tokenizer.inForeignNode) {
      Q0(this, t);
      return;
    }
    switch (this.insertionMode) {
      case T.INITIAL: {
        Nn(this, t);
        break;
      }
      case T.BEFORE_HTML: {
        Un(this, t);
        break;
      }
      case T.BEFORE_HEAD: {
        zn(this, t);
        break;
      }
      case T.IN_HEAD: {
        $n(this, t);
        break;
      }
      case T.IN_HEAD_NO_SCRIPT: {
        jn(this, t);
        break;
      }
      case T.AFTER_HEAD: {
        Yn(this, t);
        break;
      }
      case T.IN_BODY:
      case T.IN_CAPTION:
      case T.IN_CELL:
      case T.IN_TEMPLATE: {
        Io(this, t);
        break;
      }
      case T.TEXT:
      case T.IN_SELECT:
      case T.IN_SELECT_IN_TABLE: {
        this._insertCharacters(t);
        break;
      }
      case T.IN_TABLE:
      case T.IN_TABLE_BODY:
      case T.IN_ROW: {
        ii(this, t);
        break;
      }
      case T.IN_TABLE_TEXT: {
        Oo(this, t);
        break;
      }
      case T.IN_COLUMN_GROUP: {
        Ir(this, t);
        break;
      }
      case T.AFTER_BODY: {
        Nr(this, t);
        break;
      }
      case T.AFTER_AFTER_BODY: {
        kr(this, t);
        break;
      }
    }
  }
  /** @internal */
  onNullCharacter(t) {
    if (this.skipNextNewLine = !1, this.tokenizer.inForeignNode) {
      G0(this, t);
      return;
    }
    switch (this.insertionMode) {
      case T.INITIAL: {
        Nn(this, t);
        break;
      }
      case T.BEFORE_HTML: {
        Un(this, t);
        break;
      }
      case T.BEFORE_HEAD: {
        zn(this, t);
        break;
      }
      case T.IN_HEAD: {
        $n(this, t);
        break;
      }
      case T.IN_HEAD_NO_SCRIPT: {
        jn(this, t);
        break;
      }
      case T.AFTER_HEAD: {
        Yn(this, t);
        break;
      }
      case T.TEXT: {
        this._insertCharacters(t);
        break;
      }
      case T.IN_TABLE:
      case T.IN_TABLE_BODY:
      case T.IN_ROW: {
        ii(this, t);
        break;
      }
      case T.IN_COLUMN_GROUP: {
        Ir(this, t);
        break;
      }
      case T.AFTER_BODY: {
        Nr(this, t);
        break;
      }
      case T.AFTER_AFTER_BODY: {
        kr(this, t);
        break;
      }
    }
  }
  /** @internal */
  onComment(t) {
    if (this.skipNextNewLine = !1, this.currentNotInHTML) {
      Ri(this, t);
      return;
    }
    switch (this.insertionMode) {
      case T.INITIAL:
      case T.BEFORE_HTML:
      case T.BEFORE_HEAD:
      case T.IN_HEAD:
      case T.IN_HEAD_NO_SCRIPT:
      case T.AFTER_HEAD:
      case T.IN_BODY:
      case T.IN_TABLE:
      case T.IN_CAPTION:
      case T.IN_COLUMN_GROUP:
      case T.IN_TABLE_BODY:
      case T.IN_ROW:
      case T.IN_CELL:
      case T.IN_SELECT:
      case T.IN_SELECT_IN_TABLE:
      case T.IN_TEMPLATE:
      case T.IN_FRAMESET:
      case T.AFTER_FRAMESET: {
        Ri(this, t);
        break;
      }
      case T.IN_TABLE_TEXT: {
        Sn(this, t);
        break;
      }
      case T.AFTER_BODY: {
        If(this, t);
        break;
      }
      case T.AFTER_AFTER_BODY:
      case T.AFTER_AFTER_FRAMESET: {
        Nf(this, t);
        break;
      }
    }
  }
  /** @internal */
  onDoctype(t) {
    switch (this.skipNextNewLine = !1, this.insertionMode) {
      case T.INITIAL: {
        Sf(this, t);
        break;
      }
      case T.BEFORE_HEAD:
      case T.IN_HEAD:
      case T.IN_HEAD_NO_SCRIPT:
      case T.AFTER_HEAD: {
        this._err(t, L.misplacedDoctype);
        break;
      }
      case T.IN_TABLE_TEXT: {
        Sn(this, t);
        break;
      }
    }
  }
  /** @internal */
  onStartTag(t) {
    this.skipNextNewLine = !1, this.currentToken = t, this._processStartTag(t), t.selfClosing && !t.ackSelfClosing && this._err(t, L.nonVoidHtmlElementStartTagWithTrailingSolidus);
  }
  /**
   * Processes a given start tag.
   *
   * `onStartTag` checks if a self-closing tag was recognized. When a token
   * is moved inbetween multiple insertion modes, this check for self-closing
   * could lead to false positives. To avoid this, `_processStartTag` is used
   * for nested calls.
   *
   * @param token The token to process.
   * @protected
   */
  _processStartTag(t) {
    this.shouldProcessStartTagTokenInForeignContent(t) ? K0(this, t) : this._startTagOutsideForeignContent(t);
  }
  /** @protected */
  _startTagOutsideForeignContent(t) {
    switch (this.insertionMode) {
      case T.INITIAL: {
        Nn(this, t);
        break;
      }
      case T.BEFORE_HTML: {
        wf(this, t);
        break;
      }
      case T.BEFORE_HEAD: {
        Rf(this, t);
        break;
      }
      case T.IN_HEAD: {
        ot(this, t);
        break;
      }
      case T.IN_HEAD_NO_SCRIPT: {
        Pf(this, t);
        break;
      }
      case T.AFTER_HEAD: {
        vf(this, t);
        break;
      }
      case T.IN_BODY: {
        Fe(this, t);
        break;
      }
      case T.IN_TABLE: {
        pn(this, t);
        break;
      }
      case T.IN_TABLE_TEXT: {
        Sn(this, t);
        break;
      }
      case T.IN_CAPTION: {
        O0(this, t);
        break;
      }
      case T.IN_COLUMN_GROUP: {
        la(this, t);
        break;
      }
      case T.IN_TABLE_BODY: {
        qr(this, t);
        break;
      }
      case T.IN_ROW: {
        Vr(this, t);
        break;
      }
      case T.IN_CELL: {
        M0(this, t);
        break;
      }
      case T.IN_SELECT: {
        Mo(this, t);
        break;
      }
      case T.IN_SELECT_IN_TABLE: {
        B0(this, t);
        break;
      }
      case T.IN_TEMPLATE: {
        H0(this, t);
        break;
      }
      case T.AFTER_BODY: {
        z0(this, t);
        break;
      }
      case T.IN_FRAMESET: {
        $0(this, t);
        break;
      }
      case T.AFTER_FRAMESET: {
        Y0(this, t);
        break;
      }
      case T.AFTER_AFTER_BODY: {
        V0(this, t);
        break;
      }
      case T.AFTER_AFTER_FRAMESET: {
        W0(this, t);
        break;
      }
    }
  }
  /** @internal */
  onEndTag(t) {
    this.skipNextNewLine = !1, this.currentToken = t, this.currentNotInHTML ? X0(this, t) : this._endTagOutsideForeignContent(t);
  }
  /** @protected */
  _endTagOutsideForeignContent(t) {
    switch (this.insertionMode) {
      case T.INITIAL: {
        Nn(this, t);
        break;
      }
      case T.BEFORE_HTML: {
        Lf(this, t);
        break;
      }
      case T.BEFORE_HEAD: {
        Of(this, t);
        break;
      }
      case T.IN_HEAD: {
        Df(this, t);
        break;
      }
      case T.IN_HEAD_NO_SCRIPT: {
        Mf(this, t);
        break;
      }
      case T.AFTER_HEAD: {
        Bf(this, t);
        break;
      }
      case T.IN_BODY: {
        Yr(this, t);
        break;
      }
      case T.TEXT: {
        y0(this, t);
        break;
      }
      case T.IN_TABLE: {
        Qn(this, t);
        break;
      }
      case T.IN_TABLE_TEXT: {
        Sn(this, t);
        break;
      }
      case T.IN_CAPTION: {
        D0(this, t);
        break;
      }
      case T.IN_COLUMN_GROUP: {
        P0(this, t);
        break;
      }
      case T.IN_TABLE_BODY: {
        Oi(this, t);
        break;
      }
      case T.IN_ROW: {
        Po(this, t);
        break;
      }
      case T.IN_CELL: {
        v0(this, t);
        break;
      }
      case T.IN_SELECT: {
        vo(this, t);
        break;
      }
      case T.IN_SELECT_IN_TABLE: {
        F0(this, t);
        break;
      }
      case T.IN_TEMPLATE: {
        U0(this, t);
        break;
      }
      case T.AFTER_BODY: {
        Fo(this, t);
        break;
      }
      case T.IN_FRAMESET: {
        j0(this, t);
        break;
      }
      case T.AFTER_FRAMESET: {
        q0(this, t);
        break;
      }
      case T.AFTER_AFTER_BODY: {
        kr(this, t);
        break;
      }
    }
  }
  /** @internal */
  onEof(t) {
    switch (this.insertionMode) {
      case T.INITIAL: {
        Nn(this, t);
        break;
      }
      case T.BEFORE_HTML: {
        Un(this, t);
        break;
      }
      case T.BEFORE_HEAD: {
        zn(this, t);
        break;
      }
      case T.IN_HEAD: {
        $n(this, t);
        break;
      }
      case T.IN_HEAD_NO_SCRIPT: {
        jn(this, t);
        break;
      }
      case T.AFTER_HEAD: {
        Yn(this, t);
        break;
      }
      case T.IN_BODY:
      case T.IN_TABLE:
      case T.IN_CAPTION:
      case T.IN_COLUMN_GROUP:
      case T.IN_TABLE_BODY:
      case T.IN_ROW:
      case T.IN_CELL:
      case T.IN_SELECT:
      case T.IN_SELECT_IN_TABLE: {
        Lo(this, t);
        break;
      }
      case T.TEXT: {
        A0(this, t);
        break;
      }
      case T.IN_TABLE_TEXT: {
        Sn(this, t);
        break;
      }
      case T.IN_TEMPLATE: {
        Bo(this, t);
        break;
      }
      case T.AFTER_BODY:
      case T.IN_FRAMESET:
      case T.AFTER_FRAMESET:
      case T.AFTER_AFTER_BODY:
      case T.AFTER_AFTER_FRAMESET: {
        oa(this, t);
        break;
      }
    }
  }
  /** @internal */
  onWhitespaceCharacter(t) {
    if (this.skipNextNewLine && (this.skipNextNewLine = !1, t.chars.charCodeAt(0) === m.LINE_FEED)) {
      if (t.chars.length === 1)
        return;
      t.chars = t.chars.substr(1);
    }
    if (this.tokenizer.inForeignNode) {
      this._insertCharacters(t);
      return;
    }
    switch (this.insertionMode) {
      case T.IN_HEAD:
      case T.IN_HEAD_NO_SCRIPT:
      case T.AFTER_HEAD:
      case T.TEXT:
      case T.IN_COLUMN_GROUP:
      case T.IN_SELECT:
      case T.IN_SELECT_IN_TABLE:
      case T.IN_FRAMESET:
      case T.AFTER_FRAMESET: {
        this._insertCharacters(t);
        break;
      }
      case T.IN_BODY:
      case T.IN_CAPTION:
      case T.IN_CELL:
      case T.IN_TEMPLATE:
      case T.AFTER_BODY:
      case T.AFTER_AFTER_BODY:
      case T.AFTER_AFTER_FRAMESET: {
        Co(this, t);
        break;
      }
      case T.IN_TABLE:
      case T.IN_TABLE_BODY:
      case T.IN_ROW: {
        ii(this, t);
        break;
      }
      case T.IN_TABLE_TEXT: {
        Ro(this, t);
        break;
      }
    }
  }
}
function kf(e, t) {
  let n = e.activeFormattingElements.getElementEntryInScopeWithTagName(t.tagName);
  return n ? e.openElements.contains(n.element) ? e.openElements.hasInScope(t.tagID) || (n = null) : (e.activeFormattingElements.removeEntry(n), n = null) : wo(e, t), n;
}
function xf(e, t) {
  let n = null, r = e.openElements.stackTop;
  for (; r >= 0; r--) {
    const i = e.openElements.items[r];
    if (i === t.element)
      break;
    e._isSpecialElement(i, e.openElements.tagIDs[r]) && (n = i);
  }
  return n || (e.openElements.shortenToLength(Math.max(r, 0)), e.activeFormattingElements.removeEntry(t)), n;
}
function yf(e, t, n) {
  let r = t, i = e.openElements.getCommonAncestor(t);
  for (let a = 0, s = i; s !== n; a++, s = i) {
    i = e.openElements.getCommonAncestor(s);
    const u = e.activeFormattingElements.getElementEntry(s), o = u && a >= Ef;
    !u || o ? (o && e.activeFormattingElements.removeEntry(u), e.openElements.remove(s)) : (s = Af(e, u), r === t && (e.activeFormattingElements.bookmark = u), e.treeAdapter.detachNode(r), e.treeAdapter.appendChild(s, r), r = s);
  }
  return r;
}
function Af(e, t) {
  const n = e.treeAdapter.getNamespaceURI(t.element), r = e.treeAdapter.createElement(t.token.tagName, n, t.token.attrs);
  return e.openElements.replace(t.element, r), t.element = r, r;
}
function _f(e, t, n) {
  const r = e.treeAdapter.getTagName(t), i = En(r);
  if (e._isElementCausesFosterParenting(i))
    e._fosterParentElement(n);
  else {
    const a = e.treeAdapter.getNamespaceURI(t);
    i === l.TEMPLATE && a === D.HTML && (t = e.treeAdapter.getTemplateContent(t)), e.treeAdapter.appendChild(t, n);
  }
}
function Cf(e, t, n) {
  const r = e.treeAdapter.getNamespaceURI(n.element), { token: i } = n, a = e.treeAdapter.createElement(i.tagName, r, i.attrs);
  e._adoptNodes(t, a), e.treeAdapter.appendChild(t, a), e.activeFormattingElements.insertElementAfterBookmark(a, i), e.activeFormattingElements.removeEntry(n), e.openElements.remove(n.element), e.openElements.insertAfter(t, a, i.tagID);
}
function ua(e, t) {
  for (let n = 0; n < bf; n++) {
    const r = kf(e, t);
    if (!r)
      break;
    const i = xf(e, r);
    if (!i)
      break;
    e.activeFormattingElements.bookmark = r;
    const a = yf(e, i, r.element), s = e.openElements.getCommonAncestor(r.element);
    e.treeAdapter.detachNode(a), s && _f(e, s, a), Cf(e, i, r);
  }
}
function Ri(e, t) {
  e._appendCommentNode(t, e.openElements.currentTmplContentOrNode);
}
function If(e, t) {
  e._appendCommentNode(t, e.openElements.items[0]);
}
function Nf(e, t) {
  e._appendCommentNode(t, e.document);
}
function oa(e, t) {
  if (e.stopped = !0, t.location) {
    const n = e.fragmentContext ? 0 : 2;
    for (let r = e.openElements.stackTop; r >= n; r--)
      e._setEndLocation(e.openElements.items[r], t);
    if (!e.fragmentContext && e.openElements.stackTop >= 0) {
      const r = e.openElements.items[0], i = e.treeAdapter.getNodeSourceCodeLocation(r);
      if (i && !i.endTag && (e._setEndLocation(r, t), e.openElements.stackTop >= 1)) {
        const a = e.openElements.items[1], s = e.treeAdapter.getNodeSourceCodeLocation(a);
        s && !s.endTag && e._setEndLocation(a, t);
      }
    }
  }
}
function Sf(e, t) {
  e._setDocumentType(t);
  const n = t.forceQuirks ? tt.QUIRKS : rf(t);
  nf(t) || e._err(t, L.nonConformingDoctype), e.treeAdapter.setDocumentMode(e.document, n), e.insertionMode = T.BEFORE_HTML;
}
function Nn(e, t) {
  e._err(t, L.missingDoctype, !0), e.treeAdapter.setDocumentMode(e.document, tt.QUIRKS), e.insertionMode = T.BEFORE_HTML, e._processToken(t);
}
function wf(e, t) {
  t.tagID === l.HTML ? (e._insertElement(t, D.HTML), e.insertionMode = T.BEFORE_HEAD) : Un(e, t);
}
function Lf(e, t) {
  const n = t.tagID;
  (n === l.HTML || n === l.HEAD || n === l.BODY || n === l.BR) && Un(e, t);
}
function Un(e, t) {
  e._insertFakeRootElement(), e.insertionMode = T.BEFORE_HEAD, e._processToken(t);
}
function Rf(e, t) {
  switch (t.tagID) {
    case l.HTML: {
      Fe(e, t);
      break;
    }
    case l.HEAD: {
      e._insertElement(t, D.HTML), e.headElement = e.openElements.current, e.insertionMode = T.IN_HEAD;
      break;
    }
    default:
      zn(e, t);
  }
}
function Of(e, t) {
  const n = t.tagID;
  n === l.HEAD || n === l.BODY || n === l.HTML || n === l.BR ? zn(e, t) : e._err(t, L.endTagWithoutMatchingOpenElement);
}
function zn(e, t) {
  e._insertFakeElement(N.HEAD, l.HEAD), e.headElement = e.openElements.current, e.insertionMode = T.IN_HEAD, e._processToken(t);
}
function ot(e, t) {
  switch (t.tagID) {
    case l.HTML: {
      Fe(e, t);
      break;
    }
    case l.BASE:
    case l.BASEFONT:
    case l.BGSOUND:
    case l.LINK:
    case l.META: {
      e._appendElement(t, D.HTML), t.ackSelfClosing = !0;
      break;
    }
    case l.TITLE: {
      e._switchToTextParsing(t, _e.RCDATA);
      break;
    }
    case l.NOSCRIPT: {
      e.options.scriptingEnabled ? e._switchToTextParsing(t, _e.RAWTEXT) : (e._insertElement(t, D.HTML), e.insertionMode = T.IN_HEAD_NO_SCRIPT);
      break;
    }
    case l.NOFRAMES:
    case l.STYLE: {
      e._switchToTextParsing(t, _e.RAWTEXT);
      break;
    }
    case l.SCRIPT: {
      e._switchToTextParsing(t, _e.SCRIPT_DATA);
      break;
    }
    case l.TEMPLATE: {
      e._insertTemplate(t), e.activeFormattingElements.insertMarker(), e.framesetOk = !1, e.insertionMode = T.IN_TEMPLATE, e.tmplInsertionModeStack.unshift(T.IN_TEMPLATE);
      break;
    }
    case l.HEAD: {
      e._err(t, L.misplacedStartTagForHeadElement);
      break;
    }
    default:
      $n(e, t);
  }
}
function Df(e, t) {
  switch (t.tagID) {
    case l.HEAD: {
      e.openElements.pop(), e.insertionMode = T.AFTER_HEAD;
      break;
    }
    case l.BODY:
    case l.BR:
    case l.HTML: {
      $n(e, t);
      break;
    }
    case l.TEMPLATE: {
      nn(e, t);
      break;
    }
    default:
      e._err(t, L.endTagWithoutMatchingOpenElement);
  }
}
function nn(e, t) {
  e.openElements.tmplCount > 0 ? (e.openElements.generateImpliedEndTagsThoroughly(), e.openElements.currentTagId !== l.TEMPLATE && e._err(t, L.closingOfElementWithOpenChildElements), e.openElements.popUntilTagNamePopped(l.TEMPLATE), e.activeFormattingElements.clearToLastMarker(), e.tmplInsertionModeStack.shift(), e._resetInsertionMode()) : e._err(t, L.endTagWithoutMatchingOpenElement);
}
function $n(e, t) {
  e.openElements.pop(), e.insertionMode = T.AFTER_HEAD, e._processToken(t);
}
function Pf(e, t) {
  switch (t.tagID) {
    case l.HTML: {
      Fe(e, t);
      break;
    }
    case l.BASEFONT:
    case l.BGSOUND:
    case l.HEAD:
    case l.LINK:
    case l.META:
    case l.NOFRAMES:
    case l.STYLE: {
      ot(e, t);
      break;
    }
    case l.NOSCRIPT: {
      e._err(t, L.nestedNoscriptInHead);
      break;
    }
    default:
      jn(e, t);
  }
}
function Mf(e, t) {
  switch (t.tagID) {
    case l.NOSCRIPT: {
      e.openElements.pop(), e.insertionMode = T.IN_HEAD;
      break;
    }
    case l.BR: {
      jn(e, t);
      break;
    }
    default:
      e._err(t, L.endTagWithoutMatchingOpenElement);
  }
}
function jn(e, t) {
  const n = t.type === ne.EOF ? L.openElementsLeftAfterEof : L.disallowedContentInNoscriptInHead;
  e._err(t, n), e.openElements.pop(), e.insertionMode = T.IN_HEAD, e._processToken(t);
}
function vf(e, t) {
  switch (t.tagID) {
    case l.HTML: {
      Fe(e, t);
      break;
    }
    case l.BODY: {
      e._insertElement(t, D.HTML), e.framesetOk = !1, e.insertionMode = T.IN_BODY;
      break;
    }
    case l.FRAMESET: {
      e._insertElement(t, D.HTML), e.insertionMode = T.IN_FRAMESET;
      break;
    }
    case l.BASE:
    case l.BASEFONT:
    case l.BGSOUND:
    case l.LINK:
    case l.META:
    case l.NOFRAMES:
    case l.SCRIPT:
    case l.STYLE:
    case l.TEMPLATE:
    case l.TITLE: {
      e._err(t, L.abandonedHeadElementChild), e.openElements.push(e.headElement, l.HEAD), ot(e, t), e.openElements.remove(e.headElement);
      break;
    }
    case l.HEAD: {
      e._err(t, L.misplacedStartTagForHeadElement);
      break;
    }
    default:
      Yn(e, t);
  }
}
function Bf(e, t) {
  switch (t.tagID) {
    case l.BODY:
    case l.HTML:
    case l.BR: {
      Yn(e, t);
      break;
    }
    case l.TEMPLATE: {
      nn(e, t);
      break;
    }
    default:
      e._err(t, L.endTagWithoutMatchingOpenElement);
  }
}
function Yn(e, t) {
  e._insertFakeElement(N.BODY, l.BODY), e.insertionMode = T.IN_BODY, jr(e, t);
}
function jr(e, t) {
  switch (t.type) {
    case ne.CHARACTER: {
      Io(e, t);
      break;
    }
    case ne.WHITESPACE_CHARACTER: {
      Co(e, t);
      break;
    }
    case ne.COMMENT: {
      Ri(e, t);
      break;
    }
    case ne.START_TAG: {
      Fe(e, t);
      break;
    }
    case ne.END_TAG: {
      Yr(e, t);
      break;
    }
    case ne.EOF: {
      Lo(e, t);
      break;
    }
  }
}
function Co(e, t) {
  e._reconstructActiveFormattingElements(), e._insertCharacters(t);
}
function Io(e, t) {
  e._reconstructActiveFormattingElements(), e._insertCharacters(t), e.framesetOk = !1;
}
function Ff(e, t) {
  e.openElements.tmplCount === 0 && e.treeAdapter.adoptAttributes(e.openElements.items[0], t.attrs);
}
function Hf(e, t) {
  const n = e.openElements.tryPeekProperlyNestedBodyElement();
  n && e.openElements.tmplCount === 0 && (e.framesetOk = !1, e.treeAdapter.adoptAttributes(n, t.attrs));
}
function Uf(e, t) {
  const n = e.openElements.tryPeekProperlyNestedBodyElement();
  e.framesetOk && n && (e.treeAdapter.detachNode(n), e.openElements.popAllUpToHtmlElement(), e._insertElement(t, D.HTML), e.insertionMode = T.IN_FRAMESET);
}
function zf(e, t) {
  e.openElements.hasInButtonScope(l.P) && e._closePElement(), e._insertElement(t, D.HTML);
}
function $f(e, t) {
  e.openElements.hasInButtonScope(l.P) && e._closePElement(), e.openElements.currentTagId !== void 0 && Li.has(e.openElements.currentTagId) && e.openElements.pop(), e._insertElement(t, D.HTML);
}
function jf(e, t) {
  e.openElements.hasInButtonScope(l.P) && e._closePElement(), e._insertElement(t, D.HTML), e.skipNextNewLine = !0, e.framesetOk = !1;
}
function Yf(e, t) {
  const n = e.openElements.tmplCount > 0;
  (!e.formElement || n) && (e.openElements.hasInButtonScope(l.P) && e._closePElement(), e._insertElement(t, D.HTML), n || (e.formElement = e.openElements.current));
}
function qf(e, t) {
  e.framesetOk = !1;
  const n = t.tagID;
  for (let r = e.openElements.stackTop; r >= 0; r--) {
    const i = e.openElements.tagIDs[r];
    if (n === l.LI && i === l.LI || (n === l.DD || n === l.DT) && (i === l.DD || i === l.DT)) {
      e.openElements.generateImpliedEndTagsWithExclusion(i), e.openElements.popUntilTagNamePopped(i);
      break;
    }
    if (i !== l.ADDRESS && i !== l.DIV && i !== l.P && e._isSpecialElement(e.openElements.items[r], i))
      break;
  }
  e.openElements.hasInButtonScope(l.P) && e._closePElement(), e._insertElement(t, D.HTML);
}
function Vf(e, t) {
  e.openElements.hasInButtonScope(l.P) && e._closePElement(), e._insertElement(t, D.HTML), e.tokenizer.state = _e.PLAINTEXT;
}
function Wf(e, t) {
  e.openElements.hasInScope(l.BUTTON) && (e.openElements.generateImpliedEndTags(), e.openElements.popUntilTagNamePopped(l.BUTTON)), e._reconstructActiveFormattingElements(), e._insertElement(t, D.HTML), e.framesetOk = !1;
}
function Gf(e, t) {
  const n = e.activeFormattingElements.getElementEntryInScopeWithTagName(N.A);
  n && (ua(e, t), e.openElements.remove(n.element), e.activeFormattingElements.removeEntry(n)), e._reconstructActiveFormattingElements(), e._insertElement(t, D.HTML), e.activeFormattingElements.pushElement(e.openElements.current, t);
}
function Qf(e, t) {
  e._reconstructActiveFormattingElements(), e._insertElement(t, D.HTML), e.activeFormattingElements.pushElement(e.openElements.current, t);
}
function Kf(e, t) {
  e._reconstructActiveFormattingElements(), e.openElements.hasInScope(l.NOBR) && (ua(e, t), e._reconstructActiveFormattingElements()), e._insertElement(t, D.HTML), e.activeFormattingElements.pushElement(e.openElements.current, t);
}
function Xf(e, t) {
  e._reconstructActiveFormattingElements(), e._insertElement(t, D.HTML), e.activeFormattingElements.insertMarker(), e.framesetOk = !1;
}
function Zf(e, t) {
  e.treeAdapter.getDocumentMode(e.document) !== tt.QUIRKS && e.openElements.hasInButtonScope(l.P) && e._closePElement(), e._insertElement(t, D.HTML), e.framesetOk = !1, e.insertionMode = T.IN_TABLE;
}
function No(e, t) {
  e._reconstructActiveFormattingElements(), e._appendElement(t, D.HTML), e.framesetOk = !1, t.ackSelfClosing = !0;
}
function So(e) {
  const t = go(e, Kt.TYPE);
  return t != null && t.toLowerCase() === gf;
}
function Jf(e, t) {
  e._reconstructActiveFormattingElements(), e._appendElement(t, D.HTML), So(t) || (e.framesetOk = !1), t.ackSelfClosing = !0;
}
function e0(e, t) {
  e._appendElement(t, D.HTML), t.ackSelfClosing = !0;
}
function t0(e, t) {
  e.openElements.hasInButtonScope(l.P) && e._closePElement(), e._appendElement(t, D.HTML), e.framesetOk = !1, t.ackSelfClosing = !0;
}
function n0(e, t) {
  t.tagName = N.IMG, t.tagID = l.IMG, No(e, t);
}
function r0(e, t) {
  e._insertElement(t, D.HTML), e.skipNextNewLine = !0, e.tokenizer.state = _e.RCDATA, e.originalInsertionMode = e.insertionMode, e.framesetOk = !1, e.insertionMode = T.TEXT;
}
function i0(e, t) {
  e.openElements.hasInButtonScope(l.P) && e._closePElement(), e._reconstructActiveFormattingElements(), e.framesetOk = !1, e._switchToTextParsing(t, _e.RAWTEXT);
}
function a0(e, t) {
  e.framesetOk = !1, e._switchToTextParsing(t, _e.RAWTEXT);
}
function xs(e, t) {
  e._switchToTextParsing(t, _e.RAWTEXT);
}
function s0(e, t) {
  e._reconstructActiveFormattingElements(), e._insertElement(t, D.HTML), e.framesetOk = !1, e.insertionMode = e.insertionMode === T.IN_TABLE || e.insertionMode === T.IN_CAPTION || e.insertionMode === T.IN_TABLE_BODY || e.insertionMode === T.IN_ROW || e.insertionMode === T.IN_CELL ? T.IN_SELECT_IN_TABLE : T.IN_SELECT;
}
function u0(e, t) {
  e.openElements.currentTagId === l.OPTION && e.openElements.pop(), e._reconstructActiveFormattingElements(), e._insertElement(t, D.HTML);
}
function o0(e, t) {
  e.openElements.hasInScope(l.RUBY) && e.openElements.generateImpliedEndTags(), e._insertElement(t, D.HTML);
}
function l0(e, t) {
  e.openElements.hasInScope(l.RUBY) && e.openElements.generateImpliedEndTagsWithExclusion(l.RTC), e._insertElement(t, D.HTML);
}
function c0(e, t) {
  e._reconstructActiveFormattingElements(), yo(t), sa(t), t.selfClosing ? e._appendElement(t, D.MATHML) : e._insertElement(t, D.MATHML), t.ackSelfClosing = !0;
}
function d0(e, t) {
  e._reconstructActiveFormattingElements(), Ao(t), sa(t), t.selfClosing ? e._appendElement(t, D.SVG) : e._insertElement(t, D.SVG), t.ackSelfClosing = !0;
}
function ys(e, t) {
  e._reconstructActiveFormattingElements(), e._insertElement(t, D.HTML);
}
function Fe(e, t) {
  switch (t.tagID) {
    case l.I:
    case l.S:
    case l.B:
    case l.U:
    case l.EM:
    case l.TT:
    case l.BIG:
    case l.CODE:
    case l.FONT:
    case l.SMALL:
    case l.STRIKE:
    case l.STRONG: {
      Qf(e, t);
      break;
    }
    case l.A: {
      Gf(e, t);
      break;
    }
    case l.H1:
    case l.H2:
    case l.H3:
    case l.H4:
    case l.H5:
    case l.H6: {
      $f(e, t);
      break;
    }
    case l.P:
    case l.DL:
    case l.OL:
    case l.UL:
    case l.DIV:
    case l.DIR:
    case l.NAV:
    case l.MAIN:
    case l.MENU:
    case l.ASIDE:
    case l.CENTER:
    case l.FIGURE:
    case l.FOOTER:
    case l.HEADER:
    case l.HGROUP:
    case l.DIALOG:
    case l.DETAILS:
    case l.ADDRESS:
    case l.ARTICLE:
    case l.SEARCH:
    case l.SECTION:
    case l.SUMMARY:
    case l.FIELDSET:
    case l.BLOCKQUOTE:
    case l.FIGCAPTION: {
      zf(e, t);
      break;
    }
    case l.LI:
    case l.DD:
    case l.DT: {
      qf(e, t);
      break;
    }
    case l.BR:
    case l.IMG:
    case l.WBR:
    case l.AREA:
    case l.EMBED:
    case l.KEYGEN: {
      No(e, t);
      break;
    }
    case l.HR: {
      t0(e, t);
      break;
    }
    case l.RB:
    case l.RTC: {
      o0(e, t);
      break;
    }
    case l.RT:
    case l.RP: {
      l0(e, t);
      break;
    }
    case l.PRE:
    case l.LISTING: {
      jf(e, t);
      break;
    }
    case l.XMP: {
      i0(e, t);
      break;
    }
    case l.SVG: {
      d0(e, t);
      break;
    }
    case l.HTML: {
      Ff(e, t);
      break;
    }
    case l.BASE:
    case l.LINK:
    case l.META:
    case l.STYLE:
    case l.TITLE:
    case l.SCRIPT:
    case l.BGSOUND:
    case l.BASEFONT:
    case l.TEMPLATE: {
      ot(e, t);
      break;
    }
    case l.BODY: {
      Hf(e, t);
      break;
    }
    case l.FORM: {
      Yf(e, t);
      break;
    }
    case l.NOBR: {
      Kf(e, t);
      break;
    }
    case l.MATH: {
      c0(e, t);
      break;
    }
    case l.TABLE: {
      Zf(e, t);
      break;
    }
    case l.INPUT: {
      Jf(e, t);
      break;
    }
    case l.PARAM:
    case l.TRACK:
    case l.SOURCE: {
      e0(e, t);
      break;
    }
    case l.IMAGE: {
      n0(e, t);
      break;
    }
    case l.BUTTON: {
      Wf(e, t);
      break;
    }
    case l.APPLET:
    case l.OBJECT:
    case l.MARQUEE: {
      Xf(e, t);
      break;
    }
    case l.IFRAME: {
      a0(e, t);
      break;
    }
    case l.SELECT: {
      s0(e, t);
      break;
    }
    case l.OPTION:
    case l.OPTGROUP: {
      u0(e, t);
      break;
    }
    case l.NOEMBED:
    case l.NOFRAMES: {
      xs(e, t);
      break;
    }
    case l.FRAMESET: {
      Uf(e, t);
      break;
    }
    case l.TEXTAREA: {
      r0(e, t);
      break;
    }
    case l.NOSCRIPT: {
      e.options.scriptingEnabled ? xs(e, t) : ys(e, t);
      break;
    }
    case l.PLAINTEXT: {
      Vf(e, t);
      break;
    }
    case l.COL:
    case l.TH:
    case l.TD:
    case l.TR:
    case l.HEAD:
    case l.FRAME:
    case l.TBODY:
    case l.TFOOT:
    case l.THEAD:
    case l.CAPTION:
    case l.COLGROUP:
      break;
    default:
      ys(e, t);
  }
}
function h0(e, t) {
  if (e.openElements.hasInScope(l.BODY) && (e.insertionMode = T.AFTER_BODY, e.options.sourceCodeLocationInfo)) {
    const n = e.openElements.tryPeekProperlyNestedBodyElement();
    n && e._setEndLocation(n, t);
  }
}
function f0(e, t) {
  e.openElements.hasInScope(l.BODY) && (e.insertionMode = T.AFTER_BODY, Fo(e, t));
}
function p0(e, t) {
  const n = t.tagID;
  e.openElements.hasInScope(n) && (e.openElements.generateImpliedEndTags(), e.openElements.popUntilTagNamePopped(n));
}
function m0(e) {
  const t = e.openElements.tmplCount > 0, { formElement: n } = e;
  t || (e.formElement = null), (n || t) && e.openElements.hasInScope(l.FORM) && (e.openElements.generateImpliedEndTags(), t ? e.openElements.popUntilTagNamePopped(l.FORM) : n && e.openElements.remove(n));
}
function g0(e) {
  e.openElements.hasInButtonScope(l.P) || e._insertFakeElement(N.P, l.P), e._closePElement();
}
function b0(e) {
  e.openElements.hasInListItemScope(l.LI) && (e.openElements.generateImpliedEndTagsWithExclusion(l.LI), e.openElements.popUntilTagNamePopped(l.LI));
}
function E0(e, t) {
  const n = t.tagID;
  e.openElements.hasInScope(n) && (e.openElements.generateImpliedEndTagsWithExclusion(n), e.openElements.popUntilTagNamePopped(n));
}
function T0(e) {
  e.openElements.hasNumberedHeaderInScope() && (e.openElements.generateImpliedEndTags(), e.openElements.popUntilNumberedHeaderPopped());
}
function k0(e, t) {
  const n = t.tagID;
  e.openElements.hasInScope(n) && (e.openElements.generateImpliedEndTags(), e.openElements.popUntilTagNamePopped(n), e.activeFormattingElements.clearToLastMarker());
}
function x0(e) {
  e._reconstructActiveFormattingElements(), e._insertFakeElement(N.BR, l.BR), e.openElements.pop(), e.framesetOk = !1;
}
function wo(e, t) {
  const n = t.tagName, r = t.tagID;
  for (let i = e.openElements.stackTop; i > 0; i--) {
    const a = e.openElements.items[i], s = e.openElements.tagIDs[i];
    if (r === s && (r !== l.UNKNOWN || e.treeAdapter.getTagName(a) === n)) {
      e.openElements.generateImpliedEndTagsWithExclusion(r), e.openElements.stackTop >= i && e.openElements.shortenToLength(i);
      break;
    }
    if (e._isSpecialElement(a, s))
      break;
  }
}
function Yr(e, t) {
  switch (t.tagID) {
    case l.A:
    case l.B:
    case l.I:
    case l.S:
    case l.U:
    case l.EM:
    case l.TT:
    case l.BIG:
    case l.CODE:
    case l.FONT:
    case l.NOBR:
    case l.SMALL:
    case l.STRIKE:
    case l.STRONG: {
      ua(e, t);
      break;
    }
    case l.P: {
      g0(e);
      break;
    }
    case l.DL:
    case l.UL:
    case l.OL:
    case l.DIR:
    case l.DIV:
    case l.NAV:
    case l.PRE:
    case l.MAIN:
    case l.MENU:
    case l.ASIDE:
    case l.BUTTON:
    case l.CENTER:
    case l.FIGURE:
    case l.FOOTER:
    case l.HEADER:
    case l.HGROUP:
    case l.DIALOG:
    case l.ADDRESS:
    case l.ARTICLE:
    case l.DETAILS:
    case l.SEARCH:
    case l.SECTION:
    case l.SUMMARY:
    case l.LISTING:
    case l.FIELDSET:
    case l.BLOCKQUOTE:
    case l.FIGCAPTION: {
      p0(e, t);
      break;
    }
    case l.LI: {
      b0(e);
      break;
    }
    case l.DD:
    case l.DT: {
      E0(e, t);
      break;
    }
    case l.H1:
    case l.H2:
    case l.H3:
    case l.H4:
    case l.H5:
    case l.H6: {
      T0(e);
      break;
    }
    case l.BR: {
      x0(e);
      break;
    }
    case l.BODY: {
      h0(e, t);
      break;
    }
    case l.HTML: {
      f0(e, t);
      break;
    }
    case l.FORM: {
      m0(e);
      break;
    }
    case l.APPLET:
    case l.OBJECT:
    case l.MARQUEE: {
      k0(e, t);
      break;
    }
    case l.TEMPLATE: {
      nn(e, t);
      break;
    }
    default:
      wo(e, t);
  }
}
function Lo(e, t) {
  e.tmplInsertionModeStack.length > 0 ? Bo(e, t) : oa(e, t);
}
function y0(e, t) {
  var n;
  t.tagID === l.SCRIPT && ((n = e.scriptHandler) === null || n === void 0 || n.call(e, e.openElements.current)), e.openElements.pop(), e.insertionMode = e.originalInsertionMode;
}
function A0(e, t) {
  e._err(t, L.eofInElementThatCanContainOnlyText), e.openElements.pop(), e.insertionMode = e.originalInsertionMode, e.onEof(t);
}
function ii(e, t) {
  if (e.openElements.currentTagId !== void 0 && _o.has(e.openElements.currentTagId))
    switch (e.pendingCharacterTokens.length = 0, e.hasNonWhitespacePendingCharacterToken = !1, e.originalInsertionMode = e.insertionMode, e.insertionMode = T.IN_TABLE_TEXT, t.type) {
      case ne.CHARACTER: {
        Oo(e, t);
        break;
      }
      case ne.WHITESPACE_CHARACTER: {
        Ro(e, t);
        break;
      }
    }
  else
    er(e, t);
}
function _0(e, t) {
  e.openElements.clearBackToTableContext(), e.activeFormattingElements.insertMarker(), e._insertElement(t, D.HTML), e.insertionMode = T.IN_CAPTION;
}
function C0(e, t) {
  e.openElements.clearBackToTableContext(), e._insertElement(t, D.HTML), e.insertionMode = T.IN_COLUMN_GROUP;
}
function I0(e, t) {
  e.openElements.clearBackToTableContext(), e._insertFakeElement(N.COLGROUP, l.COLGROUP), e.insertionMode = T.IN_COLUMN_GROUP, la(e, t);
}
function N0(e, t) {
  e.openElements.clearBackToTableContext(), e._insertElement(t, D.HTML), e.insertionMode = T.IN_TABLE_BODY;
}
function S0(e, t) {
  e.openElements.clearBackToTableContext(), e._insertFakeElement(N.TBODY, l.TBODY), e.insertionMode = T.IN_TABLE_BODY, qr(e, t);
}
function w0(e, t) {
  e.openElements.hasInTableScope(l.TABLE) && (e.openElements.popUntilTagNamePopped(l.TABLE), e._resetInsertionMode(), e._processStartTag(t));
}
function L0(e, t) {
  So(t) ? e._appendElement(t, D.HTML) : er(e, t), t.ackSelfClosing = !0;
}
function R0(e, t) {
  !e.formElement && e.openElements.tmplCount === 0 && (e._insertElement(t, D.HTML), e.formElement = e.openElements.current, e.openElements.pop());
}
function pn(e, t) {
  switch (t.tagID) {
    case l.TD:
    case l.TH:
    case l.TR: {
      S0(e, t);
      break;
    }
    case l.STYLE:
    case l.SCRIPT:
    case l.TEMPLATE: {
      ot(e, t);
      break;
    }
    case l.COL: {
      I0(e, t);
      break;
    }
    case l.FORM: {
      R0(e, t);
      break;
    }
    case l.TABLE: {
      w0(e, t);
      break;
    }
    case l.TBODY:
    case l.TFOOT:
    case l.THEAD: {
      N0(e, t);
      break;
    }
    case l.INPUT: {
      L0(e, t);
      break;
    }
    case l.CAPTION: {
      _0(e, t);
      break;
    }
    case l.COLGROUP: {
      C0(e, t);
      break;
    }
    default:
      er(e, t);
  }
}
function Qn(e, t) {
  switch (t.tagID) {
    case l.TABLE: {
      e.openElements.hasInTableScope(l.TABLE) && (e.openElements.popUntilTagNamePopped(l.TABLE), e._resetInsertionMode());
      break;
    }
    case l.TEMPLATE: {
      nn(e, t);
      break;
    }
    case l.BODY:
    case l.CAPTION:
    case l.COL:
    case l.COLGROUP:
    case l.HTML:
    case l.TBODY:
    case l.TD:
    case l.TFOOT:
    case l.TH:
    case l.THEAD:
    case l.TR:
      break;
    default:
      er(e, t);
  }
}
function er(e, t) {
  const n = e.fosterParentingEnabled;
  e.fosterParentingEnabled = !0, jr(e, t), e.fosterParentingEnabled = n;
}
function Ro(e, t) {
  e.pendingCharacterTokens.push(t);
}
function Oo(e, t) {
  e.pendingCharacterTokens.push(t), e.hasNonWhitespacePendingCharacterToken = !0;
}
function Sn(e, t) {
  let n = 0;
  if (e.hasNonWhitespacePendingCharacterToken)
    for (; n < e.pendingCharacterTokens.length; n++)
      er(e, e.pendingCharacterTokens[n]);
  else
    for (; n < e.pendingCharacterTokens.length; n++)
      e._insertCharacters(e.pendingCharacterTokens[n]);
  e.insertionMode = e.originalInsertionMode, e._processToken(t);
}
const Do = /* @__PURE__ */ new Set([l.CAPTION, l.COL, l.COLGROUP, l.TBODY, l.TD, l.TFOOT, l.TH, l.THEAD, l.TR]);
function O0(e, t) {
  const n = t.tagID;
  Do.has(n) ? e.openElements.hasInTableScope(l.CAPTION) && (e.openElements.generateImpliedEndTags(), e.openElements.popUntilTagNamePopped(l.CAPTION), e.activeFormattingElements.clearToLastMarker(), e.insertionMode = T.IN_TABLE, pn(e, t)) : Fe(e, t);
}
function D0(e, t) {
  const n = t.tagID;
  switch (n) {
    case l.CAPTION:
    case l.TABLE: {
      e.openElements.hasInTableScope(l.CAPTION) && (e.openElements.generateImpliedEndTags(), e.openElements.popUntilTagNamePopped(l.CAPTION), e.activeFormattingElements.clearToLastMarker(), e.insertionMode = T.IN_TABLE, n === l.TABLE && Qn(e, t));
      break;
    }
    case l.BODY:
    case l.COL:
    case l.COLGROUP:
    case l.HTML:
    case l.TBODY:
    case l.TD:
    case l.TFOOT:
    case l.TH:
    case l.THEAD:
    case l.TR:
      break;
    default:
      Yr(e, t);
  }
}
function la(e, t) {
  switch (t.tagID) {
    case l.HTML: {
      Fe(e, t);
      break;
    }
    case l.COL: {
      e._appendElement(t, D.HTML), t.ackSelfClosing = !0;
      break;
    }
    case l.TEMPLATE: {
      ot(e, t);
      break;
    }
    default:
      Ir(e, t);
  }
}
function P0(e, t) {
  switch (t.tagID) {
    case l.COLGROUP: {
      e.openElements.currentTagId === l.COLGROUP && (e.openElements.pop(), e.insertionMode = T.IN_TABLE);
      break;
    }
    case l.TEMPLATE: {
      nn(e, t);
      break;
    }
    case l.COL:
      break;
    default:
      Ir(e, t);
  }
}
function Ir(e, t) {
  e.openElements.currentTagId === l.COLGROUP && (e.openElements.pop(), e.insertionMode = T.IN_TABLE, e._processToken(t));
}
function qr(e, t) {
  switch (t.tagID) {
    case l.TR: {
      e.openElements.clearBackToTableBodyContext(), e._insertElement(t, D.HTML), e.insertionMode = T.IN_ROW;
      break;
    }
    case l.TH:
    case l.TD: {
      e.openElements.clearBackToTableBodyContext(), e._insertFakeElement(N.TR, l.TR), e.insertionMode = T.IN_ROW, Vr(e, t);
      break;
    }
    case l.CAPTION:
    case l.COL:
    case l.COLGROUP:
    case l.TBODY:
    case l.TFOOT:
    case l.THEAD: {
      e.openElements.hasTableBodyContextInTableScope() && (e.openElements.clearBackToTableBodyContext(), e.openElements.pop(), e.insertionMode = T.IN_TABLE, pn(e, t));
      break;
    }
    default:
      pn(e, t);
  }
}
function Oi(e, t) {
  const n = t.tagID;
  switch (t.tagID) {
    case l.TBODY:
    case l.TFOOT:
    case l.THEAD: {
      e.openElements.hasInTableScope(n) && (e.openElements.clearBackToTableBodyContext(), e.openElements.pop(), e.insertionMode = T.IN_TABLE);
      break;
    }
    case l.TABLE: {
      e.openElements.hasTableBodyContextInTableScope() && (e.openElements.clearBackToTableBodyContext(), e.openElements.pop(), e.insertionMode = T.IN_TABLE, Qn(e, t));
      break;
    }
    case l.BODY:
    case l.CAPTION:
    case l.COL:
    case l.COLGROUP:
    case l.HTML:
    case l.TD:
    case l.TH:
    case l.TR:
      break;
    default:
      Qn(e, t);
  }
}
function Vr(e, t) {
  switch (t.tagID) {
    case l.TH:
    case l.TD: {
      e.openElements.clearBackToTableRowContext(), e._insertElement(t, D.HTML), e.insertionMode = T.IN_CELL, e.activeFormattingElements.insertMarker();
      break;
    }
    case l.CAPTION:
    case l.COL:
    case l.COLGROUP:
    case l.TBODY:
    case l.TFOOT:
    case l.THEAD:
    case l.TR: {
      e.openElements.hasInTableScope(l.TR) && (e.openElements.clearBackToTableRowContext(), e.openElements.pop(), e.insertionMode = T.IN_TABLE_BODY, qr(e, t));
      break;
    }
    default:
      pn(e, t);
  }
}
function Po(e, t) {
  switch (t.tagID) {
    case l.TR: {
      e.openElements.hasInTableScope(l.TR) && (e.openElements.clearBackToTableRowContext(), e.openElements.pop(), e.insertionMode = T.IN_TABLE_BODY);
      break;
    }
    case l.TABLE: {
      e.openElements.hasInTableScope(l.TR) && (e.openElements.clearBackToTableRowContext(), e.openElements.pop(), e.insertionMode = T.IN_TABLE_BODY, Oi(e, t));
      break;
    }
    case l.TBODY:
    case l.TFOOT:
    case l.THEAD: {
      (e.openElements.hasInTableScope(t.tagID) || e.openElements.hasInTableScope(l.TR)) && (e.openElements.clearBackToTableRowContext(), e.openElements.pop(), e.insertionMode = T.IN_TABLE_BODY, Oi(e, t));
      break;
    }
    case l.BODY:
    case l.CAPTION:
    case l.COL:
    case l.COLGROUP:
    case l.HTML:
    case l.TD:
    case l.TH:
      break;
    default:
      Qn(e, t);
  }
}
function M0(e, t) {
  const n = t.tagID;
  Do.has(n) ? (e.openElements.hasInTableScope(l.TD) || e.openElements.hasInTableScope(l.TH)) && (e._closeTableCell(), Vr(e, t)) : Fe(e, t);
}
function v0(e, t) {
  const n = t.tagID;
  switch (n) {
    case l.TD:
    case l.TH: {
      e.openElements.hasInTableScope(n) && (e.openElements.generateImpliedEndTags(), e.openElements.popUntilTagNamePopped(n), e.activeFormattingElements.clearToLastMarker(), e.insertionMode = T.IN_ROW);
      break;
    }
    case l.TABLE:
    case l.TBODY:
    case l.TFOOT:
    case l.THEAD:
    case l.TR: {
      e.openElements.hasInTableScope(n) && (e._closeTableCell(), Po(e, t));
      break;
    }
    case l.BODY:
    case l.CAPTION:
    case l.COL:
    case l.COLGROUP:
    case l.HTML:
      break;
    default:
      Yr(e, t);
  }
}
function Mo(e, t) {
  switch (t.tagID) {
    case l.HTML: {
      Fe(e, t);
      break;
    }
    case l.OPTION: {
      e.openElements.currentTagId === l.OPTION && e.openElements.pop(), e._insertElement(t, D.HTML);
      break;
    }
    case l.OPTGROUP: {
      e.openElements.currentTagId === l.OPTION && e.openElements.pop(), e.openElements.currentTagId === l.OPTGROUP && e.openElements.pop(), e._insertElement(t, D.HTML);
      break;
    }
    case l.HR: {
      e.openElements.currentTagId === l.OPTION && e.openElements.pop(), e.openElements.currentTagId === l.OPTGROUP && e.openElements.pop(), e._appendElement(t, D.HTML), t.ackSelfClosing = !0;
      break;
    }
    case l.INPUT:
    case l.KEYGEN:
    case l.TEXTAREA:
    case l.SELECT: {
      e.openElements.hasInSelectScope(l.SELECT) && (e.openElements.popUntilTagNamePopped(l.SELECT), e._resetInsertionMode(), t.tagID !== l.SELECT && e._processStartTag(t));
      break;
    }
    case l.SCRIPT:
    case l.TEMPLATE: {
      ot(e, t);
      break;
    }
  }
}
function vo(e, t) {
  switch (t.tagID) {
    case l.OPTGROUP: {
      e.openElements.stackTop > 0 && e.openElements.currentTagId === l.OPTION && e.openElements.tagIDs[e.openElements.stackTop - 1] === l.OPTGROUP && e.openElements.pop(), e.openElements.currentTagId === l.OPTGROUP && e.openElements.pop();
      break;
    }
    case l.OPTION: {
      e.openElements.currentTagId === l.OPTION && e.openElements.pop();
      break;
    }
    case l.SELECT: {
      e.openElements.hasInSelectScope(l.SELECT) && (e.openElements.popUntilTagNamePopped(l.SELECT), e._resetInsertionMode());
      break;
    }
    case l.TEMPLATE: {
      nn(e, t);
      break;
    }
  }
}
function B0(e, t) {
  const n = t.tagID;
  n === l.CAPTION || n === l.TABLE || n === l.TBODY || n === l.TFOOT || n === l.THEAD || n === l.TR || n === l.TD || n === l.TH ? (e.openElements.popUntilTagNamePopped(l.SELECT), e._resetInsertionMode(), e._processStartTag(t)) : Mo(e, t);
}
function F0(e, t) {
  const n = t.tagID;
  n === l.CAPTION || n === l.TABLE || n === l.TBODY || n === l.TFOOT || n === l.THEAD || n === l.TR || n === l.TD || n === l.TH ? e.openElements.hasInTableScope(n) && (e.openElements.popUntilTagNamePopped(l.SELECT), e._resetInsertionMode(), e.onEndTag(t)) : vo(e, t);
}
function H0(e, t) {
  switch (t.tagID) {
    // First, handle tags that can start without a mode change
    case l.BASE:
    case l.BASEFONT:
    case l.BGSOUND:
    case l.LINK:
    case l.META:
    case l.NOFRAMES:
    case l.SCRIPT:
    case l.STYLE:
    case l.TEMPLATE:
    case l.TITLE: {
      ot(e, t);
      break;
    }
    // Re-process the token in the appropriate mode
    case l.CAPTION:
    case l.COLGROUP:
    case l.TBODY:
    case l.TFOOT:
    case l.THEAD: {
      e.tmplInsertionModeStack[0] = T.IN_TABLE, e.insertionMode = T.IN_TABLE, pn(e, t);
      break;
    }
    case l.COL: {
      e.tmplInsertionModeStack[0] = T.IN_COLUMN_GROUP, e.insertionMode = T.IN_COLUMN_GROUP, la(e, t);
      break;
    }
    case l.TR: {
      e.tmplInsertionModeStack[0] = T.IN_TABLE_BODY, e.insertionMode = T.IN_TABLE_BODY, qr(e, t);
      break;
    }
    case l.TD:
    case l.TH: {
      e.tmplInsertionModeStack[0] = T.IN_ROW, e.insertionMode = T.IN_ROW, Vr(e, t);
      break;
    }
    default:
      e.tmplInsertionModeStack[0] = T.IN_BODY, e.insertionMode = T.IN_BODY, Fe(e, t);
  }
}
function U0(e, t) {
  t.tagID === l.TEMPLATE && nn(e, t);
}
function Bo(e, t) {
  e.openElements.tmplCount > 0 ? (e.openElements.popUntilTagNamePopped(l.TEMPLATE), e.activeFormattingElements.clearToLastMarker(), e.tmplInsertionModeStack.shift(), e._resetInsertionMode(), e.onEof(t)) : oa(e, t);
}
function z0(e, t) {
  t.tagID === l.HTML ? Fe(e, t) : Nr(e, t);
}
function Fo(e, t) {
  var n;
  if (t.tagID === l.HTML) {
    if (e.fragmentContext || (e.insertionMode = T.AFTER_AFTER_BODY), e.options.sourceCodeLocationInfo && e.openElements.tagIDs[0] === l.HTML) {
      e._setEndLocation(e.openElements.items[0], t);
      const r = e.openElements.items[1];
      r && !(!((n = e.treeAdapter.getNodeSourceCodeLocation(r)) === null || n === void 0) && n.endTag) && e._setEndLocation(r, t);
    }
  } else
    Nr(e, t);
}
function Nr(e, t) {
  e.insertionMode = T.IN_BODY, jr(e, t);
}
function $0(e, t) {
  switch (t.tagID) {
    case l.HTML: {
      Fe(e, t);
      break;
    }
    case l.FRAMESET: {
      e._insertElement(t, D.HTML);
      break;
    }
    case l.FRAME: {
      e._appendElement(t, D.HTML), t.ackSelfClosing = !0;
      break;
    }
    case l.NOFRAMES: {
      ot(e, t);
      break;
    }
  }
}
function j0(e, t) {
  t.tagID === l.FRAMESET && !e.openElements.isRootHtmlElementCurrent() && (e.openElements.pop(), !e.fragmentContext && e.openElements.currentTagId !== l.FRAMESET && (e.insertionMode = T.AFTER_FRAMESET));
}
function Y0(e, t) {
  switch (t.tagID) {
    case l.HTML: {
      Fe(e, t);
      break;
    }
    case l.NOFRAMES: {
      ot(e, t);
      break;
    }
  }
}
function q0(e, t) {
  t.tagID === l.HTML && (e.insertionMode = T.AFTER_AFTER_FRAMESET);
}
function V0(e, t) {
  t.tagID === l.HTML ? Fe(e, t) : kr(e, t);
}
function kr(e, t) {
  e.insertionMode = T.IN_BODY, jr(e, t);
}
function W0(e, t) {
  switch (t.tagID) {
    case l.HTML: {
      Fe(e, t);
      break;
    }
    case l.NOFRAMES: {
      ot(e, t);
      break;
    }
  }
}
function G0(e, t) {
  t.chars = Te, e._insertCharacters(t);
}
function Q0(e, t) {
  e._insertCharacters(t), e.framesetOk = !1;
}
function Ho(e) {
  for (; e.treeAdapter.getNamespaceURI(e.openElements.current) !== D.HTML && e.openElements.currentTagId !== void 0 && !e._isIntegrationPoint(e.openElements.currentTagId, e.openElements.current); )
    e.openElements.pop();
}
function K0(e, t) {
  if (df(t))
    Ho(e), e._startTagOutsideForeignContent(t);
  else {
    const n = e._getAdjustedCurrentElement(), r = e.treeAdapter.getNamespaceURI(n);
    r === D.MATHML ? yo(t) : r === D.SVG && (hf(t), Ao(t)), sa(t), t.selfClosing ? e._appendElement(t, r) : e._insertElement(t, r), t.ackSelfClosing = !0;
  }
}
function X0(e, t) {
  if (t.tagID === l.P || t.tagID === l.BR) {
    Ho(e), e._endTagOutsideForeignContent(t);
    return;
  }
  for (let n = e.openElements.stackTop; n > 0; n--) {
    const r = e.openElements.items[n];
    if (e.treeAdapter.getNamespaceURI(r) === D.HTML) {
      e._endTagOutsideForeignContent(t);
      break;
    }
    const i = e.treeAdapter.getTagName(r);
    if (i.toLowerCase() === t.tagName) {
      t.tagName = i, e.openElements.shortenToLength(n);
      break;
    }
  }
}
N.AREA, N.BASE, N.BASEFONT, N.BGSOUND, N.BR, N.COL, N.EMBED, N.FRAME, N.HR, N.IMG, N.INPUT, N.KEYGEN, N.LINK, N.META, N.PARAM, N.SOURCE, N.TRACK, N.WBR;
const Wr = Uo("end"), mt = Uo("start");
function Uo(e) {
  return t;
  function t(n) {
    const r = n && n.position && n.position[e] || {};
    if (typeof r.line == "number" && r.line > 0 && typeof r.column == "number" && r.column > 0)
      return {
        line: r.line,
        column: r.column,
        offset: typeof r.offset == "number" && r.offset > -1 ? r.offset : void 0
      };
  }
}
function zo(e) {
  const t = mt(e), n = Wr(e);
  if (t && n)
    return { start: t, end: n };
}
const Z0 = /<(\/?)(iframe|noembed|noframes|plaintext|script|style|textarea|title|xmp)(?=[\t\n\f\r />])/gi, J0 = /* @__PURE__ */ new Set([
  "mdxFlowExpression",
  "mdxJsxFlowElement",
  "mdxJsxTextElement",
  "mdxTextExpression",
  "mdxjsEsm"
]), As = { sourceCodeLocationInfo: !0, scriptingEnabled: !1 };
function $o(e, t) {
  const n = lp(e), r = co("type", {
    handlers: { root: ep, element: tp, text: np, comment: Yo, doctype: rp, raw: ap },
    unknown: sp
  }), i = {
    parser: n ? new ks(As) : ks.getFragmentParser(void 0, As),
    handle(u) {
      r(u, i);
    },
    stitches: !1,
    options: t || {}
  };
  r(e, i), Tn(i, mt());
  const a = n ? i.parser.document : i.parser.getFragment(), s = lh(a, {
    // To do: support `space`?
    file: i.options.file
  });
  return i.stitches && ut(s, "comment", function(u, o, c) {
    const d = (
      /** @type {Stitch} */
      /** @type {unknown} */
      u
    );
    if (d.value.stitch && c && o !== void 0) {
      const h = c.children;
      return h[o] = d.value.stitch, o;
    }
  }), s.type === "root" && s.children.length === 1 && s.children[0].type === e.type ? s.children[0] : s;
}
function jo(e, t) {
  let n = -1;
  if (e)
    for (; ++n < e.length; )
      t.handle(e[n]);
}
function ep(e, t) {
  jo(e.children, t);
}
function tp(e, t) {
  up(e, t), jo(e.children, t), op(e, t);
}
function np(e, t) {
  t.parser.tokenizer.state > 4 && (t.parser.tokenizer.state = 0);
  const n = {
    type: ne.CHARACTER,
    chars: e.value,
    location: tr(e)
  };
  Tn(t, mt(e)), t.parser.currentToken = n, t.parser._processToken(t.parser.currentToken);
}
function rp(e, t) {
  const n = {
    type: ne.DOCTYPE,
    name: "html",
    forceQuirks: !1,
    publicId: "",
    systemId: "",
    location: tr(e)
  };
  Tn(t, mt(e)), t.parser.currentToken = n, t.parser._processToken(t.parser.currentToken);
}
function ip(e, t) {
  t.stitches = !0;
  const n = cp(e);
  if ("children" in e && "children" in n) {
    const r = (
      /** @type {Root} */
      $o({ type: "root", children: e.children }, t.options)
    );
    n.children = r.children;
  }
  Yo({ type: "comment", value: { stitch: n } }, t);
}
function Yo(e, t) {
  const n = e.value, r = {
    type: ne.COMMENT,
    data: n,
    location: tr(e)
  };
  Tn(t, mt(e)), t.parser.currentToken = r, t.parser._processToken(t.parser.currentToken);
}
function ap(e, t) {
  if (t.parser.tokenizer.preprocessor.html = "", t.parser.tokenizer.preprocessor.pos = -1, t.parser.tokenizer.preprocessor.lastGapPos = -2, t.parser.tokenizer.preprocessor.gapStack = [], t.parser.tokenizer.preprocessor.skipNextNewLine = !1, t.parser.tokenizer.preprocessor.lastChunkWritten = !1, t.parser.tokenizer.preprocessor.endOfChunkHit = !1, t.parser.tokenizer.preprocessor.isEol = !1, qo(t, mt(e)), t.parser.tokenizer.write(
    t.options.tagfilter ? e.value.replace(Z0, "&lt;$1$2") : e.value,
    !1
  ), t.parser.tokenizer._runParsingLoop(), t.parser.tokenizer.state === 72 || // @ts-expect-error: removed.
  t.parser.tokenizer.state === 78) {
    t.parser.tokenizer.preprocessor.lastChunkWritten = !0;
    const n = t.parser.tokenizer._consume();
    t.parser.tokenizer._callState(n);
  }
}
function sp(e, t) {
  const n = (
    /** @type {Nodes} */
    e
  );
  if (t.options.passThrough && t.options.passThrough.includes(n.type))
    ip(n, t);
  else {
    let r = "";
    throw J0.has(n.type) && (r = ". It looks like you are using MDX nodes with `hast-util-raw` (or `rehype-raw`). If you use this because you are using remark or rehype plugins that inject `'html'` nodes, then please raise an issue with that plugin, as its a bad and slow idea. If you use this because you are using markdown syntax, then you have to configure this utility (or plugin) to pass through these nodes (see `passThrough` in docs), but you can also migrate to use the MDX syntax"), new Error("Cannot compile `" + n.type + "` node" + r);
  }
}
function Tn(e, t) {
  qo(e, t);
  const n = e.parser.tokenizer.currentCharacterToken;
  n && n.location && (n.location.endLine = e.parser.tokenizer.preprocessor.line, n.location.endCol = e.parser.tokenizer.preprocessor.col + 1, n.location.endOffset = e.parser.tokenizer.preprocessor.offset + 1, e.parser.currentToken = n, e.parser._processToken(e.parser.currentToken)), e.parser.tokenizer.paused = !1, e.parser.tokenizer.inLoop = !1, e.parser.tokenizer.active = !1, e.parser.tokenizer.returnState = _e.DATA, e.parser.tokenizer.charRefCode = -1, e.parser.tokenizer.consumedAfterSnapshot = -1, e.parser.tokenizer.currentLocation = null, e.parser.tokenizer.currentCharacterToken = null, e.parser.tokenizer.currentToken = null, e.parser.tokenizer.currentAttr = { name: "", value: "" };
}
function qo(e, t) {
  if (t && t.offset !== void 0) {
    const n = {
      startLine: t.line,
      startCol: t.column,
      startOffset: t.offset,
      endLine: -1,
      endCol: -1,
      endOffset: -1
    };
    e.parser.tokenizer.preprocessor.lineStartPos = -t.column + 1, e.parser.tokenizer.preprocessor.droppedBufferSize = t.offset, e.parser.tokenizer.preprocessor.line = t.line, e.parser.tokenizer.currentLocation = n;
  }
}
function up(e, t) {
  const n = e.tagName.toLowerCase();
  if (t.parser.tokenizer.state === _e.PLAINTEXT) return;
  Tn(t, mt(e));
  const r = t.parser.openElements.current;
  let i = "namespaceURI" in r ? r.namespaceURI : Gt.html;
  i === Gt.html && n === "svg" && (i = Gt.svg);
  const a = ph(
    // Shallow clone to not delve into `children`: we only need the attributes.
    { ...e, children: [] },
    { space: i === Gt.svg ? "svg" : "html" }
  ), s = {
    type: ne.START_TAG,
    tagName: n,
    tagID: En(n),
    // We always send start and end tags.
    selfClosing: !1,
    ackSelfClosing: !1,
    // Always element.
    /* c8 ignore next */
    attrs: "attrs" in a ? a.attrs : [],
    location: tr(e)
  };
  t.parser.currentToken = s, t.parser._processToken(t.parser.currentToken), t.parser.tokenizer.lastStartTagName = n;
}
function op(e, t) {
  const n = e.tagName.toLowerCase();
  if (!t.parser.tokenizer.inForeignNode && yh.includes(n) || t.parser.tokenizer.state === _e.PLAINTEXT) return;
  Tn(t, Wr(e));
  const r = {
    type: ne.END_TAG,
    tagName: n,
    tagID: En(n),
    selfClosing: !1,
    ackSelfClosing: !1,
    attrs: [],
    location: tr(e)
  };
  t.parser.currentToken = r, t.parser._processToken(t.parser.currentToken), // Current element is closed.
  n === t.parser.tokenizer.lastStartTagName && // `<textarea>` and `<title>`
  (t.parser.tokenizer.state === _e.RCDATA || // `<iframe>`, `<noembed>`, `<noframes>`, `<style>`, `<xmp>`
  t.parser.tokenizer.state === _e.RAWTEXT || // `<script>`
  t.parser.tokenizer.state === _e.SCRIPT_DATA) && (t.parser.tokenizer.state = _e.DATA);
}
function lp(e) {
  const t = e.type === "root" ? e.children[0] : e;
  return !!(t && (t.type === "doctype" || t.type === "element" && t.tagName.toLowerCase() === "html"));
}
function tr(e) {
  const t = mt(e) || {
    line: void 0,
    column: void 0,
    offset: void 0
  }, n = Wr(e) || {
    line: void 0,
    column: void 0,
    offset: void 0
  };
  return {
    startLine: t.line,
    startCol: t.column,
    startOffset: t.offset,
    endLine: n.line,
    endCol: n.column,
    endOffset: n.offset
  };
}
function cp(e) {
  return "children" in e ? Xt({ ...e, children: [] }) : Xt(e);
}
function Di(e) {
  return function(t, n) {
    return (
      /** @type {Root} */
      $o(t, { ...e, file: n })
    );
  };
}
const Ut = ["ariaDescribedBy", "ariaLabel", "ariaLabelledBy"], Yt = {
  ancestors: {
    tbody: ["table"],
    td: ["table"],
    th: ["table"],
    thead: ["table"],
    tfoot: ["table"],
    tr: ["table"]
  },
  attributes: {
    a: [
      ...Ut,
      // Note: these 3 are used by GFM footnotes, they do work on all links.
      "dataFootnoteBackref",
      "dataFootnoteRef",
      ["className", "data-footnote-backref"],
      "href"
    ],
    blockquote: ["cite"],
    // Note: this class is not normally allowed by GH, when manually writing
    // `code` as HTML in markdown, they adds it some other way.
    // We can’t do that, so we have to allow it.
    code: [["className", /^language-./]],
    del: ["cite"],
    div: ["itemScope", "itemType"],
    dl: [...Ut],
    // Note: this is used by GFM footnotes.
    h2: [["className", "sr-only"]],
    img: [...Ut, "longDesc", "src"],
    // Note: `input` is not normally allowed by GH, when manually writing
    // it in markdown, they add it from tasklists some other way.
    // We can’t do that, so we have to allow it.
    input: [
      ["disabled", !0],
      ["type", "checkbox"]
    ],
    ins: ["cite"],
    // Note: this class is not normally allowed by GH, when manually writing
    // `li` as HTML in markdown, they adds it some other way.
    // We can’t do that, so we have to allow it.
    li: [["className", "task-list-item"]],
    // Note: this class is not normally allowed by GH, when manually writing
    // `ol` as HTML in markdown, they adds it some other way.
    // We can’t do that, so we have to allow it.
    ol: [...Ut, ["className", "contains-task-list"]],
    q: ["cite"],
    section: ["dataFootnotes", ["className", "footnotes"]],
    source: ["srcSet"],
    summary: [...Ut],
    table: [...Ut],
    // Note: this class is not normally allowed by GH, when manually writing
    // `ol` as HTML in markdown, they adds it some other way.
    // We can’t do that, so we have to allow it.
    ul: [...Ut, ["className", "contains-task-list"]],
    "*": [
      "abbr",
      "accept",
      "acceptCharset",
      "accessKey",
      "action",
      "align",
      "alt",
      "axis",
      "border",
      "cellPadding",
      "cellSpacing",
      "char",
      "charOff",
      "charSet",
      "checked",
      "clear",
      "colSpan",
      "color",
      "cols",
      "compact",
      "coords",
      "dateTime",
      "dir",
      // Note: `disabled` is technically allowed on all elements by GH.
      // But it is useless on everything except `input`.
      // Because `input`s are normally not allowed, but we allow them for
      // checkboxes due to tasklists, we allow `disabled` only there.
      "encType",
      "frame",
      "hSpace",
      "headers",
      "height",
      "hrefLang",
      "htmlFor",
      "id",
      "isMap",
      "itemProp",
      "label",
      "lang",
      "maxLength",
      "media",
      "method",
      "multiple",
      "name",
      "noHref",
      "noShade",
      "noWrap",
      "open",
      "prompt",
      "readOnly",
      "rev",
      "rowSpan",
      "rows",
      "rules",
      "scope",
      "selected",
      "shape",
      "size",
      "span",
      "start",
      "summary",
      "tabIndex",
      "title",
      "useMap",
      "vAlign",
      "value",
      "width"
    ]
  },
  clobber: ["ariaDescribedBy", "ariaLabelledBy", "id", "name"],
  clobberPrefix: "user-content-",
  protocols: {
    cite: ["http", "https"],
    href: ["http", "https", "irc", "ircs", "mailto", "xmpp"],
    longDesc: ["http", "https"],
    src: ["http", "https"]
  },
  required: {
    input: { disabled: !0, type: "checkbox" }
  },
  strip: ["script"],
  tagNames: [
    "a",
    "b",
    "blockquote",
    "br",
    "code",
    "dd",
    "del",
    "details",
    "div",
    "dl",
    "dt",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "i",
    "img",
    // Note: `input` is not normally allowed by GH, when manually writing
    // it in markdown, they add it from tasklists some other way.
    // We can’t do that, so we have to allow it.
    "input",
    "ins",
    "kbd",
    "li",
    "ol",
    "p",
    "picture",
    "pre",
    "q",
    "rp",
    "rt",
    "ruby",
    "s",
    "samp",
    "section",
    "source",
    "span",
    "strike",
    "strong",
    "sub",
    "summary",
    "sup",
    "table",
    "tbody",
    "td",
    "tfoot",
    "th",
    "thead",
    "tr",
    "tt",
    "ul",
    "var"
  ]
}, Dt = {}.hasOwnProperty;
function dp(e, t) {
  let n = { type: "root", children: [] };
  const r = {
    schema: t ? { ...Yt, ...t } : Yt,
    stack: []
  }, i = Vo(r, e);
  return i && (Array.isArray(i) ? i.length === 1 ? n = i[0] : n.children = i : n = i), n;
}
function Vo(e, t) {
  if (t && typeof t == "object") {
    const n = (
      /** @type {Record<string, Readonly<unknown>>} */
      t
    );
    switch (typeof n.type == "string" ? n.type : "") {
      case "comment":
        return hp(e, n);
      case "doctype":
        return fp(e, n);
      case "element":
        return pp(e, n);
      case "root":
        return mp(e, n);
      case "text":
        return gp(e, n);
    }
  }
}
function hp(e, t) {
  if (e.schema.allowComments) {
    const n = typeof t.value == "string" ? t.value : "", r = n.indexOf("-->"), a = { type: "comment", value: r < 0 ? n : n.slice(0, r) };
    return nr(a, t), a;
  }
}
function fp(e, t) {
  if (e.schema.allowDoctypes) {
    const n = { type: "doctype" };
    return nr(n, t), n;
  }
}
function pp(e, t) {
  const n = typeof t.tagName == "string" ? t.tagName : "";
  e.stack.push(n);
  const r = (
    /** @type {Array<ElementContent>} */
    Wo(e, t.children)
  ), i = bp(e, t.properties);
  e.stack.pop();
  let a = !1;
  if (n && n !== "*" && (!e.schema.tagNames || e.schema.tagNames.includes(n)) && (a = !0, e.schema.ancestors && Dt.call(e.schema.ancestors, n))) {
    const u = e.schema.ancestors[n];
    let o = -1;
    for (a = !1; ++o < u.length; )
      e.stack.includes(u[o]) && (a = !0);
  }
  if (!a)
    return e.schema.strip && !e.schema.strip.includes(n) ? r : void 0;
  const s = {
    type: "element",
    tagName: n,
    properties: i,
    children: r
  };
  return nr(s, t), s;
}
function mp(e, t) {
  const r = { type: "root", children: (
    /** @type {Array<RootContent>} */
    Wo(e, t.children)
  ) };
  return nr(r, t), r;
}
function gp(e, t) {
  const r = { type: "text", value: typeof t.value == "string" ? t.value : "" };
  return nr(r, t), r;
}
function Wo(e, t) {
  const n = [];
  if (Array.isArray(t)) {
    const r = (
      /** @type {Array<Readonly<unknown>>} */
      t
    );
    let i = -1;
    for (; ++i < r.length; ) {
      const a = Vo(e, r[i]);
      a && (Array.isArray(a) ? n.push(...a) : n.push(a));
    }
  }
  return n;
}
function bp(e, t) {
  const n = e.stack[e.stack.length - 1], r = e.schema.attributes, i = e.schema.required, a = r && Dt.call(r, n) ? r[n] : void 0, s = r && Dt.call(r, "*") ? r["*"] : void 0, u = (
    /** @type {Readonly<Record<string, Readonly<unknown>>>} */
    t && typeof t == "object" ? t : {}
  ), o = {};
  let c;
  for (c in u)
    if (Dt.call(u, c)) {
      const d = u[c];
      let h = _s(
        e,
        Cs(a, c),
        c,
        d
      );
      h == null && (h = _s(e, Cs(s, c), c, d)), h != null && (o[c] = h);
    }
  if (i && Dt.call(i, n)) {
    const d = i[n];
    for (c in d)
      Dt.call(d, c) && !Dt.call(o, c) && (o[c] = d[c]);
  }
  return o;
}
function _s(e, t, n, r) {
  return t ? Array.isArray(r) ? Ep(e, t, n, r) : Go(e, t, n, r) : void 0;
}
function Ep(e, t, n, r) {
  let i = -1;
  const a = [];
  for (; ++i < r.length; ) {
    const s = Go(e, t, n, r[i]);
    (typeof s == "number" || typeof s == "string") && a.push(s);
  }
  return a;
}
function Go(e, t, n, r) {
  if (!(typeof r != "boolean" && typeof r != "number" && typeof r != "string") && Tp(e, n, r)) {
    if (typeof t == "object" && t.length > 1) {
      let i = !1, a = 0;
      for (; ++a < t.length; ) {
        const s = t[a];
        if (s && typeof s == "object" && "flags" in s) {
          if (s.test(String(r))) {
            i = !0;
            break;
          }
        } else if (s === r) {
          i = !0;
          break;
        }
      }
      if (!i) return;
    }
    return e.schema.clobber && e.schema.clobberPrefix && e.schema.clobber.includes(n) ? e.schema.clobberPrefix + r : r;
  }
}
function Tp(e, t, n) {
  const r = e.schema.protocols && Dt.call(e.schema.protocols, t) ? e.schema.protocols[t] : void 0;
  if (!r || r.length === 0)
    return !0;
  const i = String(n), a = i.indexOf(":"), s = i.indexOf("?"), u = i.indexOf("#"), o = i.indexOf("/");
  if (a < 0 || // If the first colon is after a `?`, `#`, or `/`, it’s not a protocol.
  o > -1 && a > o || s > -1 && a > s || u > -1 && a > u)
    return !0;
  let c = -1;
  for (; ++c < r.length; ) {
    const d = r[c];
    if (a === d.length && i.slice(0, d.length) === d)
      return !0;
  }
  return !1;
}
function nr(e, t) {
  const n = zo(
    // @ts-expect-error: looks like a node.
    t
  );
  t.data && (e.data = Xt(t.data)), n && (e.position = n);
}
function Cs(e, t) {
  let n, r = -1;
  if (e)
    for (; ++r < e.length; ) {
      const i = e[r], a = typeof i == "string" ? i : i[0];
      if (a === t)
        return i;
      a === "data*" && (n = i);
    }
  if (t.length > 4 && t.slice(0, 4).toLowerCase() === "data")
    return n;
}
function Qo(e) {
  return function(t) {
    return (
      /** @type {Root} */
      dp(t, e)
    );
  };
}
function Is(e, t) {
  const n = String(e);
  if (typeof t != "string")
    throw new TypeError("Expected character");
  let r = 0, i = n.indexOf(t);
  for (; i !== -1; )
    r++, i = n.indexOf(t, i + t.length);
  return r;
}
const je = Bt(/[A-Za-z]/), Be = Bt(/[\dA-Za-z]/), kp = Bt(/[#-'*+\--9=?A-Z^-~]/);
function Sr(e) {
  return (
    // Special whitespace codes (which have negative values), C0 and Control
    // character DEL
    e !== null && (e < 32 || e === 127)
  );
}
const Pi = Bt(/\d/), xp = Bt(/[\dA-Fa-f]/), yp = Bt(/[!-/:-@[-`{-~]/);
function Q(e) {
  return e !== null && e < -2;
}
function be(e) {
  return e !== null && (e < 0 || e === 32);
}
function ae(e) {
  return e === -2 || e === -1 || e === 32;
}
const Gr = Bt(/\p{P}|\p{S}/u), Zt = Bt(/\s/);
function Bt(e) {
  return t;
  function t(n) {
    return n !== null && n > -1 && e.test(String.fromCharCode(n));
  }
}
function Ap(e) {
  if (typeof e != "string")
    throw new TypeError("Expected a string");
  return e.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");
}
function _p(e, t, n) {
  const i = Fr((n || {}).ignore || []), a = Cp(t);
  let s = -1;
  for (; ++s < a.length; )
    Ur(e, "text", u);
  function u(c, d) {
    let h = -1, p;
    for (; ++h < d.length; ) {
      const f = d[h], g = p ? p.children : void 0;
      if (i(
        f,
        g ? g.indexOf(f) : void 0,
        p
      ))
        return;
      p = f;
    }
    if (p)
      return o(c, d);
  }
  function o(c, d) {
    const h = d[d.length - 1], p = a[s][0], f = a[s][1];
    let g = 0;
    const C = h.children.indexOf(c);
    let k = !1, I = [];
    p.lastIndex = 0;
    let _ = p.exec(c.value);
    for (; _; ) {
      const v = _.index, M = {
        index: _.index,
        input: _.input,
        stack: [...d, c]
      };
      let S = f(..._, M);
      if (typeof S == "string" && (S = S.length > 0 ? { type: "text", value: S } : void 0), S === !1 ? p.lastIndex = v + 1 : (g !== v && I.push({
        type: "text",
        value: c.value.slice(g, v)
      }), Array.isArray(S) ? I.push(...S) : S && I.push(S), g = v + _[0].length, k = !0), !p.global)
        break;
      _ = p.exec(c.value);
    }
    return k ? (g < c.value.length && I.push({ type: "text", value: c.value.slice(g) }), h.children.splice(C, 1, ...I)) : I = [c], C + I.length;
  }
}
function Cp(e) {
  const t = [];
  if (!Array.isArray(e))
    throw new TypeError("Expected find and replace tuple or list of tuples");
  const n = !e[0] || Array.isArray(e[0]) ? e : [e];
  let r = -1;
  for (; ++r < n.length; ) {
    const i = n[r];
    t.push([Ip(i[0]), Np(i[1])]);
  }
  return t;
}
function Ip(e) {
  return typeof e == "string" ? new RegExp(Ap(e), "g") : e;
}
function Np(e) {
  return typeof e == "function" ? e : function() {
    return e;
  };
}
const ai = "phrasing", si = ["autolink", "link", "image", "label"];
function Sp() {
  return {
    transforms: [Mp],
    enter: {
      literalAutolink: Lp,
      literalAutolinkEmail: ui,
      literalAutolinkHttp: ui,
      literalAutolinkWww: ui
    },
    exit: {
      literalAutolink: Pp,
      literalAutolinkEmail: Dp,
      literalAutolinkHttp: Rp,
      literalAutolinkWww: Op
    }
  };
}
function wp() {
  return {
    unsafe: [
      {
        character: "@",
        before: "[+\\-.\\w]",
        after: "[\\-.\\w]",
        inConstruct: ai,
        notInConstruct: si
      },
      {
        character: ".",
        before: "[Ww]",
        after: "[\\-.\\w]",
        inConstruct: ai,
        notInConstruct: si
      },
      {
        character: ":",
        before: "[ps]",
        after: "\\/",
        inConstruct: ai,
        notInConstruct: si
      }
    ]
  };
}
function Lp(e) {
  this.enter({ type: "link", title: null, url: "", children: [] }, e);
}
function ui(e) {
  this.config.enter.autolinkProtocol.call(this, e);
}
function Rp(e) {
  this.config.exit.autolinkProtocol.call(this, e);
}
function Op(e) {
  this.config.exit.data.call(this, e);
  const t = this.stack[this.stack.length - 1];
  t.type, t.url = "http://" + this.sliceSerialize(e);
}
function Dp(e) {
  this.config.exit.autolinkEmail.call(this, e);
}
function Pp(e) {
  this.exit(e);
}
function Mp(e) {
  _p(
    e,
    [
      [/(https?:\/\/|www(?=\.))([-.\w]+)([^ \t\r\n]*)/gi, vp],
      [/(?<=^|\s|\p{P}|\p{S})([-.\w+]+)@([-\w]+(?:\.[-\w]+)+)/gu, Bp]
    ],
    { ignore: ["link", "linkReference"] }
  );
}
function vp(e, t, n, r, i) {
  let a = "";
  if (!Ko(i) || (/^w/i.test(t) && (n = t + n, t = "", a = "http://"), !Fp(n)))
    return !1;
  const s = Hp(n + r);
  if (!s[0]) return !1;
  const u = {
    type: "link",
    title: null,
    url: a + t + s[0],
    children: [{ type: "text", value: t + s[0] }]
  };
  return s[1] ? [u, { type: "text", value: s[1] }] : u;
}
function Bp(e, t, n, r) {
  return (
    // Not an expected previous character.
    !Ko(r, !0) || // Label ends in not allowed character.
    /[-\d_]$/.test(n) ? !1 : {
      type: "link",
      title: null,
      url: "mailto:" + t + "@" + n,
      children: [{ type: "text", value: t + "@" + n }]
    }
  );
}
function Fp(e) {
  const t = e.split(".");
  return !(t.length < 2 || t[t.length - 1] && (/_/.test(t[t.length - 1]) || !/[a-zA-Z\d]/.test(t[t.length - 1])) || t[t.length - 2] && (/_/.test(t[t.length - 2]) || !/[a-zA-Z\d]/.test(t[t.length - 2])));
}
function Hp(e) {
  const t = /[!"&'),.:;<>?\]}]+$/.exec(e);
  if (!t)
    return [e, void 0];
  e = e.slice(0, t.index);
  let n = t[0], r = n.indexOf(")");
  const i = Is(e, "(");
  let a = Is(e, ")");
  for (; r !== -1 && i > a; )
    e += n.slice(0, r + 1), n = n.slice(r + 1), r = n.indexOf(")"), a++;
  return [e, n];
}
function Ko(e, t) {
  const n = e.input.charCodeAt(e.index - 1);
  return (e.index === 0 || Zt(n) || Gr(n)) && // If it’s an email, the previous character should not be a slash.
  (!t || n !== 47);
}
function st(e) {
  return e.replace(/[\t\n\r ]+/g, " ").replace(/^ | $/g, "").toLowerCase().toUpperCase();
}
Xo.peek = Gp;
function Up() {
  this.buffer();
}
function zp(e) {
  this.enter({ type: "footnoteReference", identifier: "", label: "" }, e);
}
function $p() {
  this.buffer();
}
function jp(e) {
  this.enter(
    { type: "footnoteDefinition", identifier: "", label: "", children: [] },
    e
  );
}
function Yp(e) {
  const t = this.resume(), n = this.stack[this.stack.length - 1];
  n.type, n.identifier = st(
    this.sliceSerialize(e)
  ).toLowerCase(), n.label = t;
}
function qp(e) {
  this.exit(e);
}
function Vp(e) {
  const t = this.resume(), n = this.stack[this.stack.length - 1];
  n.type, n.identifier = st(
    this.sliceSerialize(e)
  ).toLowerCase(), n.label = t;
}
function Wp(e) {
  this.exit(e);
}
function Gp() {
  return "[";
}
function Xo(e, t, n, r) {
  const i = n.createTracker(r);
  let a = i.move("[^");
  const s = n.enter("footnoteReference"), u = n.enter("reference");
  return a += i.move(
    n.safe(n.associationId(e), { after: "]", before: a })
  ), u(), s(), a += i.move("]"), a;
}
function Qp() {
  return {
    enter: {
      gfmFootnoteCallString: Up,
      gfmFootnoteCall: zp,
      gfmFootnoteDefinitionLabelString: $p,
      gfmFootnoteDefinition: jp
    },
    exit: {
      gfmFootnoteCallString: Yp,
      gfmFootnoteCall: qp,
      gfmFootnoteDefinitionLabelString: Vp,
      gfmFootnoteDefinition: Wp
    }
  };
}
function Kp(e) {
  let t = !1;
  return e && e.firstLineBlank && (t = !0), {
    handlers: { footnoteDefinition: n, footnoteReference: Xo },
    // This is on by default already.
    unsafe: [{ character: "[", inConstruct: ["label", "phrasing", "reference"] }]
  };
  function n(r, i, a, s) {
    const u = a.createTracker(s);
    let o = u.move("[^");
    const c = a.enter("footnoteDefinition"), d = a.enter("label");
    return o += u.move(
      a.safe(a.associationId(r), { before: o, after: "]" })
    ), d(), o += u.move("]:"), r.children && r.children.length > 0 && (u.shift(4), o += u.move(
      (t ? `
` : " ") + a.indentLines(
        a.containerFlow(r, u.current()),
        t ? Zo : Xp
      )
    )), c(), o;
  }
}
function Xp(e, t, n) {
  return t === 0 ? e : Zo(e, t, n);
}
function Zo(e, t, n) {
  return (n ? "" : "    ") + e;
}
const Zp = [
  "autolink",
  "destinationLiteral",
  "destinationRaw",
  "reference",
  "titleQuote",
  "titleApostrophe"
];
Jo.peek = rm;
function Jp() {
  return {
    canContainEols: ["delete"],
    enter: { strikethrough: tm },
    exit: { strikethrough: nm }
  };
}
function em() {
  return {
    unsafe: [
      {
        character: "~",
        inConstruct: "phrasing",
        notInConstruct: Zp
      }
    ],
    handlers: { delete: Jo }
  };
}
function tm(e) {
  this.enter({ type: "delete", children: [] }, e);
}
function nm(e) {
  this.exit(e);
}
function Jo(e, t, n, r) {
  const i = n.createTracker(r), a = n.enter("strikethrough");
  let s = i.move("~~");
  return s += n.containerPhrasing(e, {
    ...i.current(),
    before: s,
    after: "~"
  }), s += i.move("~~"), a(), s;
}
function rm() {
  return "~";
}
function im(e) {
  return e.length;
}
function am(e, t) {
  const n = t || {}, r = (n.align || []).concat(), i = n.stringLength || im, a = [], s = [], u = [], o = [];
  let c = 0, d = -1;
  for (; ++d < e.length; ) {
    const y = [], C = [];
    let k = -1;
    for (e[d].length > c && (c = e[d].length); ++k < e[d].length; ) {
      const I = sm(e[d][k]);
      if (n.alignDelimiters !== !1) {
        const _ = i(I);
        C[k] = _, (o[k] === void 0 || _ > o[k]) && (o[k] = _);
      }
      y.push(I);
    }
    s[d] = y, u[d] = C;
  }
  let h = -1;
  if (typeof r == "object" && "length" in r)
    for (; ++h < c; )
      a[h] = Ns(r[h]);
  else {
    const y = Ns(r);
    for (; ++h < c; )
      a[h] = y;
  }
  h = -1;
  const p = [], f = [];
  for (; ++h < c; ) {
    const y = a[h];
    let C = "", k = "";
    y === 99 ? (C = ":", k = ":") : y === 108 ? C = ":" : y === 114 && (k = ":");
    let I = n.alignDelimiters === !1 ? 1 : Math.max(
      1,
      o[h] - C.length - k.length
    );
    const _ = C + "-".repeat(I) + k;
    n.alignDelimiters !== !1 && (I = C.length + I + k.length, I > o[h] && (o[h] = I), f[h] = I), p[h] = _;
  }
  s.splice(1, 0, p), u.splice(1, 0, f), d = -1;
  const g = [];
  for (; ++d < s.length; ) {
    const y = s[d], C = u[d];
    h = -1;
    const k = [];
    for (; ++h < c; ) {
      const I = y[h] || "";
      let _ = "", v = "";
      if (n.alignDelimiters !== !1) {
        const M = o[h] - (C[h] || 0), S = a[h];
        S === 114 ? _ = " ".repeat(M) : S === 99 ? M % 2 ? (_ = " ".repeat(M / 2 + 0.5), v = " ".repeat(M / 2 - 0.5)) : (_ = " ".repeat(M / 2), v = _) : v = " ".repeat(M);
      }
      n.delimiterStart !== !1 && !h && k.push("|"), n.padding !== !1 && // Don’t add the opening space if we’re not aligning and the cell is
      // empty: there will be a closing space.
      !(n.alignDelimiters === !1 && I === "") && (n.delimiterStart !== !1 || h) && k.push(" "), n.alignDelimiters !== !1 && k.push(_), k.push(I), n.alignDelimiters !== !1 && k.push(v), n.padding !== !1 && k.push(" "), (n.delimiterEnd !== !1 || h !== c - 1) && k.push("|");
    }
    g.push(
      n.delimiterEnd === !1 ? k.join("").replace(/ +$/, "") : k.join("")
    );
  }
  return g.join(`
`);
}
function sm(e) {
  return e == null ? "" : String(e);
}
function Ns(e) {
  const t = typeof e == "string" ? e.codePointAt(0) : 0;
  return t === 67 || t === 99 ? 99 : t === 76 || t === 108 ? 108 : t === 82 || t === 114 ? 114 : 0;
}
function um(e, t, n, r) {
  const i = n.enter("blockquote"), a = n.createTracker(r);
  a.move("> "), a.shift(2);
  const s = n.indentLines(
    n.containerFlow(e, a.current()),
    om
  );
  return i(), s;
}
function om(e, t, n) {
  return ">" + (n ? "" : " ") + e;
}
function lm(e, t) {
  return Ss(e, t.inConstruct, !0) && !Ss(e, t.notInConstruct, !1);
}
function Ss(e, t, n) {
  if (typeof t == "string" && (t = [t]), !t || t.length === 0)
    return n;
  let r = -1;
  for (; ++r < t.length; )
    if (e.includes(t[r]))
      return !0;
  return !1;
}
function ws(e, t, n, r) {
  let i = -1;
  for (; ++i < n.unsafe.length; )
    if (n.unsafe[i].character === `
` && lm(n.stack, n.unsafe[i]))
      return /[ \t]/.test(r.before) ? "" : " ";
  return `\\
`;
}
function cm(e, t) {
  const n = String(e);
  let r = n.indexOf(t), i = r, a = 0, s = 0;
  if (typeof t != "string")
    throw new TypeError("Expected substring");
  for (; r !== -1; )
    r === i ? ++a > s && (s = a) : a = 1, i = r + t.length, r = n.indexOf(t, i);
  return s;
}
function dm(e, t) {
  return !!(t.options.fences === !1 && e.value && // If there’s no info…
  !e.lang && // And there’s a non-whitespace character…
  /[^ \r\n]/.test(e.value) && // And the value doesn’t start or end in a blank…
  !/^[\t ]*(?:[\r\n]|$)|(?:^|[\r\n])[\t ]*$/.test(e.value));
}
function hm(e) {
  const t = e.options.fence || "`";
  if (t !== "`" && t !== "~")
    throw new Error(
      "Cannot serialize code with `" + t + "` for `options.fence`, expected `` ` `` or `~`"
    );
  return t;
}
function fm(e, t, n, r) {
  const i = hm(n), a = e.value || "", s = i === "`" ? "GraveAccent" : "Tilde";
  if (dm(e, n)) {
    const h = n.enter("codeIndented"), p = n.indentLines(a, pm);
    return h(), p;
  }
  const u = n.createTracker(r), o = i.repeat(Math.max(cm(a, i) + 1, 3)), c = n.enter("codeFenced");
  let d = u.move(o);
  if (e.lang) {
    const h = n.enter(`codeFencedLang${s}`);
    d += u.move(
      n.safe(e.lang, {
        before: d,
        after: " ",
        encode: ["`"],
        ...u.current()
      })
    ), h();
  }
  if (e.lang && e.meta) {
    const h = n.enter(`codeFencedMeta${s}`);
    d += u.move(" "), d += u.move(
      n.safe(e.meta, {
        before: d,
        after: `
`,
        encode: ["`"],
        ...u.current()
      })
    ), h();
  }
  return d += u.move(`
`), a && (d += u.move(a + `
`)), d += u.move(o), c(), d;
}
function pm(e, t, n) {
  return (n ? "" : "    ") + e;
}
function ca(e) {
  const t = e.options.quote || '"';
  if (t !== '"' && t !== "'")
    throw new Error(
      "Cannot serialize title with `" + t + "` for `options.quote`, expected `\"`, or `'`"
    );
  return t;
}
function mm(e, t, n, r) {
  const i = ca(n), a = i === '"' ? "Quote" : "Apostrophe", s = n.enter("definition");
  let u = n.enter("label");
  const o = n.createTracker(r);
  let c = o.move("[");
  return c += o.move(
    n.safe(n.associationId(e), {
      before: c,
      after: "]",
      ...o.current()
    })
  ), c += o.move("]: "), u(), // If there’s no url, or…
  !e.url || // If there are control characters or whitespace.
  /[\0- \u007F]/.test(e.url) ? (u = n.enter("destinationLiteral"), c += o.move("<"), c += o.move(
    n.safe(e.url, { before: c, after: ">", ...o.current() })
  ), c += o.move(">")) : (u = n.enter("destinationRaw"), c += o.move(
    n.safe(e.url, {
      before: c,
      after: e.title ? " " : `
`,
      ...o.current()
    })
  )), u(), e.title && (u = n.enter(`title${a}`), c += o.move(" " + i), c += o.move(
    n.safe(e.title, {
      before: c,
      after: i,
      ...o.current()
    })
  ), c += o.move(i), u()), s(), c;
}
function gm(e) {
  const t = e.options.emphasis || "*";
  if (t !== "*" && t !== "_")
    throw new Error(
      "Cannot serialize emphasis with `" + t + "` for `options.emphasis`, expected `*`, or `_`"
    );
  return t;
}
function Kn(e) {
  return "&#x" + e.toString(16).toUpperCase() + ";";
}
function mn(e) {
  if (e === null || be(e) || Zt(e))
    return 1;
  if (Gr(e))
    return 2;
}
function wr(e, t, n) {
  const r = mn(e), i = mn(t);
  return r === void 0 ? i === void 0 ? (
    // Letter inside:
    // we have to encode *both* letters for `_` as it is looser.
    // it already forms for `*` (and GFMs `~`).
    n === "_" ? { inside: !0, outside: !0 } : { inside: !1, outside: !1 }
  ) : i === 1 ? (
    // Whitespace inside: encode both (letter, whitespace).
    { inside: !0, outside: !0 }
  ) : (
    // Punctuation inside: encode outer (letter)
    { inside: !1, outside: !0 }
  ) : r === 1 ? i === void 0 ? (
    // Letter inside: already forms.
    { inside: !1, outside: !1 }
  ) : i === 1 ? (
    // Whitespace inside: encode both (whitespace).
    { inside: !0, outside: !0 }
  ) : (
    // Punctuation inside: already forms.
    { inside: !1, outside: !1 }
  ) : i === void 0 ? (
    // Letter inside: already forms.
    { inside: !1, outside: !1 }
  ) : i === 1 ? (
    // Whitespace inside: encode inner (whitespace).
    { inside: !0, outside: !1 }
  ) : (
    // Punctuation inside: already forms.
    { inside: !1, outside: !1 }
  );
}
el.peek = bm;
function el(e, t, n, r) {
  const i = gm(n), a = n.enter("emphasis"), s = n.createTracker(r), u = s.move(i);
  let o = s.move(
    n.containerPhrasing(e, {
      after: i,
      before: u,
      ...s.current()
    })
  );
  const c = o.charCodeAt(0), d = wr(
    r.before.charCodeAt(r.before.length - 1),
    c,
    i
  );
  d.inside && (o = Kn(c) + o.slice(1));
  const h = o.charCodeAt(o.length - 1), p = wr(r.after.charCodeAt(0), h, i);
  p.inside && (o = o.slice(0, -1) + Kn(h));
  const f = s.move(i);
  return a(), n.attentionEncodeSurroundingInfo = {
    after: p.outside,
    before: d.outside
  }, u + o + f;
}
function bm(e, t, n) {
  return n.options.emphasis || "*";
}
const Em = {};
function da(e, t) {
  const n = Em, r = typeof n.includeImageAlt == "boolean" ? n.includeImageAlt : !0, i = typeof n.includeHtml == "boolean" ? n.includeHtml : !0;
  return tl(e, r, i);
}
function tl(e, t, n) {
  if (Tm(e)) {
    if ("value" in e)
      return e.type === "html" && !n ? "" : e.value;
    if (t && "alt" in e && e.alt)
      return e.alt;
    if ("children" in e)
      return Ls(e.children, t, n);
  }
  return Array.isArray(e) ? Ls(e, t, n) : "";
}
function Ls(e, t, n) {
  const r = [];
  let i = -1;
  for (; ++i < e.length; )
    r[i] = tl(e[i], t, n);
  return r.join("");
}
function Tm(e) {
  return !!(e && typeof e == "object");
}
function km(e, t) {
  let n = !1;
  return ut(e, function(r) {
    if ("value" in r && /\r?\n|\r/.test(r.value) || r.type === "break")
      return n = !0, Ci;
  }), !!((!e.depth || e.depth < 3) && da(e) && (t.options.setext || n));
}
function xm(e, t, n, r) {
  const i = Math.max(Math.min(6, e.depth || 1), 1), a = n.createTracker(r);
  if (km(e, n)) {
    const d = n.enter("headingSetext"), h = n.enter("phrasing"), p = n.containerPhrasing(e, {
      ...a.current(),
      before: `
`,
      after: `
`
    });
    return h(), d(), p + `
` + (i === 1 ? "=" : "-").repeat(
      // The whole size…
      p.length - // Minus the position of the character after the last EOL (or
      // 0 if there is none)…
      (Math.max(p.lastIndexOf("\r"), p.lastIndexOf(`
`)) + 1)
    );
  }
  const s = "#".repeat(i), u = n.enter("headingAtx"), o = n.enter("phrasing");
  a.move(s + " ");
  let c = n.containerPhrasing(e, {
    before: "# ",
    after: `
`,
    ...a.current()
  });
  return /^[\t ]/.test(c) && (c = Kn(c.charCodeAt(0)) + c.slice(1)), c = c ? s + " " + c : s, n.options.closeAtx && (c += " " + s), o(), u(), c;
}
nl.peek = ym;
function nl(e) {
  return e.value || "";
}
function ym() {
  return "<";
}
rl.peek = Am;
function rl(e, t, n, r) {
  const i = ca(n), a = i === '"' ? "Quote" : "Apostrophe", s = n.enter("image");
  let u = n.enter("label");
  const o = n.createTracker(r);
  let c = o.move("![");
  return c += o.move(
    n.safe(e.alt, { before: c, after: "]", ...o.current() })
  ), c += o.move("]("), u(), // If there’s no url but there is a title…
  !e.url && e.title || // If there are control characters or whitespace.
  /[\0- \u007F]/.test(e.url) ? (u = n.enter("destinationLiteral"), c += o.move("<"), c += o.move(
    n.safe(e.url, { before: c, after: ">", ...o.current() })
  ), c += o.move(">")) : (u = n.enter("destinationRaw"), c += o.move(
    n.safe(e.url, {
      before: c,
      after: e.title ? " " : ")",
      ...o.current()
    })
  )), u(), e.title && (u = n.enter(`title${a}`), c += o.move(" " + i), c += o.move(
    n.safe(e.title, {
      before: c,
      after: i,
      ...o.current()
    })
  ), c += o.move(i), u()), c += o.move(")"), s(), c;
}
function Am() {
  return "!";
}
il.peek = _m;
function il(e, t, n, r) {
  const i = e.referenceType, a = n.enter("imageReference");
  let s = n.enter("label");
  const u = n.createTracker(r);
  let o = u.move("![");
  const c = n.safe(e.alt, {
    before: o,
    after: "]",
    ...u.current()
  });
  o += u.move(c + "]["), s();
  const d = n.stack;
  n.stack = [], s = n.enter("reference");
  const h = n.safe(n.associationId(e), {
    before: o,
    after: "]",
    ...u.current()
  });
  return s(), n.stack = d, a(), i === "full" || !c || c !== h ? o += u.move(h + "]") : i === "shortcut" ? o = o.slice(0, -1) : o += u.move("]"), o;
}
function _m() {
  return "!";
}
al.peek = Cm;
function al(e, t, n) {
  let r = e.value || "", i = "`", a = -1;
  for (; new RegExp("(^|[^`])" + i + "([^`]|$)").test(r); )
    i += "`";
  for (/[^ \r\n]/.test(r) && (/^[ \r\n]/.test(r) && /[ \r\n]$/.test(r) || /^`|`$/.test(r)) && (r = " " + r + " "); ++a < n.unsafe.length; ) {
    const s = n.unsafe[a], u = n.compilePattern(s);
    let o;
    if (s.atBreak)
      for (; o = u.exec(r); ) {
        let c = o.index;
        r.charCodeAt(c) === 10 && r.charCodeAt(c - 1) === 13 && c--, r = r.slice(0, c) + " " + r.slice(o.index + 1);
      }
  }
  return i + r + i;
}
function Cm() {
  return "`";
}
function sl(e, t) {
  const n = da(e);
  return !!(!t.options.resourceLink && // If there’s a url…
  e.url && // And there’s a no title…
  !e.title && // And the content of `node` is a single text node…
  e.children && e.children.length === 1 && e.children[0].type === "text" && // And if the url is the same as the content…
  (n === e.url || "mailto:" + n === e.url) && // And that starts w/ a protocol…
  /^[a-z][a-z+.-]+:/i.test(e.url) && // And that doesn’t contain ASCII control codes (character escapes and
  // references don’t work), space, or angle brackets…
  !/[\0- <>\u007F]/.test(e.url));
}
ul.peek = Im;
function ul(e, t, n, r) {
  const i = ca(n), a = i === '"' ? "Quote" : "Apostrophe", s = n.createTracker(r);
  let u, o;
  if (sl(e, n)) {
    const d = n.stack;
    n.stack = [], u = n.enter("autolink");
    let h = s.move("<");
    return h += s.move(
      n.containerPhrasing(e, {
        before: h,
        after: ">",
        ...s.current()
      })
    ), h += s.move(">"), u(), n.stack = d, h;
  }
  u = n.enter("link"), o = n.enter("label");
  let c = s.move("[");
  return c += s.move(
    n.containerPhrasing(e, {
      before: c,
      after: "](",
      ...s.current()
    })
  ), c += s.move("]("), o(), // If there’s no url but there is a title…
  !e.url && e.title || // If there are control characters or whitespace.
  /[\0- \u007F]/.test(e.url) ? (o = n.enter("destinationLiteral"), c += s.move("<"), c += s.move(
    n.safe(e.url, { before: c, after: ">", ...s.current() })
  ), c += s.move(">")) : (o = n.enter("destinationRaw"), c += s.move(
    n.safe(e.url, {
      before: c,
      after: e.title ? " " : ")",
      ...s.current()
    })
  )), o(), e.title && (o = n.enter(`title${a}`), c += s.move(" " + i), c += s.move(
    n.safe(e.title, {
      before: c,
      after: i,
      ...s.current()
    })
  ), c += s.move(i), o()), c += s.move(")"), u(), c;
}
function Im(e, t, n) {
  return sl(e, n) ? "<" : "[";
}
ol.peek = Nm;
function ol(e, t, n, r) {
  const i = e.referenceType, a = n.enter("linkReference");
  let s = n.enter("label");
  const u = n.createTracker(r);
  let o = u.move("[");
  const c = n.containerPhrasing(e, {
    before: o,
    after: "]",
    ...u.current()
  });
  o += u.move(c + "]["), s();
  const d = n.stack;
  n.stack = [], s = n.enter("reference");
  const h = n.safe(n.associationId(e), {
    before: o,
    after: "]",
    ...u.current()
  });
  return s(), n.stack = d, a(), i === "full" || !c || c !== h ? o += u.move(h + "]") : i === "shortcut" ? o = o.slice(0, -1) : o += u.move("]"), o;
}
function Nm() {
  return "[";
}
function ha(e) {
  const t = e.options.bullet || "*";
  if (t !== "*" && t !== "+" && t !== "-")
    throw new Error(
      "Cannot serialize items with `" + t + "` for `options.bullet`, expected `*`, `+`, or `-`"
    );
  return t;
}
function Sm(e) {
  const t = ha(e), n = e.options.bulletOther;
  if (!n)
    return t === "*" ? "-" : "*";
  if (n !== "*" && n !== "+" && n !== "-")
    throw new Error(
      "Cannot serialize items with `" + n + "` for `options.bulletOther`, expected `*`, `+`, or `-`"
    );
  if (n === t)
    throw new Error(
      "Expected `bullet` (`" + t + "`) and `bulletOther` (`" + n + "`) to be different"
    );
  return n;
}
function wm(e) {
  const t = e.options.bulletOrdered || ".";
  if (t !== "." && t !== ")")
    throw new Error(
      "Cannot serialize items with `" + t + "` for `options.bulletOrdered`, expected `.` or `)`"
    );
  return t;
}
function ll(e) {
  const t = e.options.rule || "*";
  if (t !== "*" && t !== "-" && t !== "_")
    throw new Error(
      "Cannot serialize rules with `" + t + "` for `options.rule`, expected `*`, `-`, or `_`"
    );
  return t;
}
function Lm(e, t, n, r) {
  const i = n.enter("list"), a = n.bulletCurrent;
  let s = e.ordered ? wm(n) : ha(n);
  const u = e.ordered ? s === "." ? ")" : "." : Sm(n);
  let o = t && n.bulletLastUsed ? s === n.bulletLastUsed : !1;
  if (!e.ordered) {
    const d = e.children ? e.children[0] : void 0;
    if (
      // Bullet could be used as a thematic break marker:
      (s === "*" || s === "-") && // Empty first list item:
      d && (!d.children || !d.children[0]) && // Directly in two other list items:
      n.stack[n.stack.length - 1] === "list" && n.stack[n.stack.length - 2] === "listItem" && n.stack[n.stack.length - 3] === "list" && n.stack[n.stack.length - 4] === "listItem" && // That are each the first child.
      n.indexStack[n.indexStack.length - 1] === 0 && n.indexStack[n.indexStack.length - 2] === 0 && n.indexStack[n.indexStack.length - 3] === 0 && (o = !0), ll(n) === s && d
    ) {
      let h = -1;
      for (; ++h < e.children.length; ) {
        const p = e.children[h];
        if (p && p.type === "listItem" && p.children && p.children[0] && p.children[0].type === "thematicBreak") {
          o = !0;
          break;
        }
      }
    }
  }
  o && (s = u), n.bulletCurrent = s;
  const c = n.containerFlow(e, r);
  return n.bulletLastUsed = s, n.bulletCurrent = a, i(), c;
}
function Rm(e) {
  const t = e.options.listItemIndent || "one";
  if (t !== "tab" && t !== "one" && t !== "mixed")
    throw new Error(
      "Cannot serialize items with `" + t + "` for `options.listItemIndent`, expected `tab`, `one`, or `mixed`"
    );
  return t;
}
function Om(e, t, n, r) {
  const i = Rm(n);
  let a = n.bulletCurrent || ha(n);
  t && t.type === "list" && t.ordered && (a = (typeof t.start == "number" && t.start > -1 ? t.start : 1) + (n.options.incrementListMarker === !1 ? 0 : t.children.indexOf(e)) + a);
  let s = a.length + 1;
  (i === "tab" || i === "mixed" && (t && t.type === "list" && t.spread || e.spread)) && (s = Math.ceil(s / 4) * 4);
  const u = n.createTracker(r);
  u.move(a + " ".repeat(s - a.length)), u.shift(s);
  const o = n.enter("listItem"), c = n.indentLines(
    n.containerFlow(e, u.current()),
    d
  );
  return o(), c;
  function d(h, p, f) {
    return p ? (f ? "" : " ".repeat(s)) + h : (f ? a : a + " ".repeat(s - a.length)) + h;
  }
}
function Dm(e, t, n, r) {
  const i = n.enter("paragraph"), a = n.enter("phrasing"), s = n.containerPhrasing(e, r);
  return a(), i(), s;
}
const Pm = (
  /** @type {(node?: unknown) => node is Exclude<PhrasingContent, Html>} */
  Fr([
    "break",
    "delete",
    "emphasis",
    // To do: next major: removed since footnotes were added to GFM.
    "footnote",
    "footnoteReference",
    "image",
    "imageReference",
    "inlineCode",
    // Enabled by `mdast-util-math`:
    "inlineMath",
    "link",
    "linkReference",
    // Enabled by `mdast-util-mdx`:
    "mdxJsxTextElement",
    // Enabled by `mdast-util-mdx`:
    "mdxTextExpression",
    "strong",
    "text",
    // Enabled by `mdast-util-directive`:
    "textDirective"
  ])
);
function Mm(e, t, n, r) {
  return (e.children.some(function(s) {
    return Pm(s);
  }) ? n.containerPhrasing : n.containerFlow).call(n, e, r);
}
function vm(e) {
  const t = e.options.strong || "*";
  if (t !== "*" && t !== "_")
    throw new Error(
      "Cannot serialize strong with `" + t + "` for `options.strong`, expected `*`, or `_`"
    );
  return t;
}
cl.peek = Bm;
function cl(e, t, n, r) {
  const i = vm(n), a = n.enter("strong"), s = n.createTracker(r), u = s.move(i + i);
  let o = s.move(
    n.containerPhrasing(e, {
      after: i,
      before: u,
      ...s.current()
    })
  );
  const c = o.charCodeAt(0), d = wr(
    r.before.charCodeAt(r.before.length - 1),
    c,
    i
  );
  d.inside && (o = Kn(c) + o.slice(1));
  const h = o.charCodeAt(o.length - 1), p = wr(r.after.charCodeAt(0), h, i);
  p.inside && (o = o.slice(0, -1) + Kn(h));
  const f = s.move(i + i);
  return a(), n.attentionEncodeSurroundingInfo = {
    after: p.outside,
    before: d.outside
  }, u + o + f;
}
function Bm(e, t, n) {
  return n.options.strong || "*";
}
function Fm(e, t, n, r) {
  return n.safe(e.value, r);
}
function Hm(e) {
  const t = e.options.ruleRepetition || 3;
  if (t < 3)
    throw new Error(
      "Cannot serialize rules with repetition `" + t + "` for `options.ruleRepetition`, expected `3` or more"
    );
  return t;
}
function Um(e, t, n) {
  const r = (ll(n) + (n.options.ruleSpaces ? " " : "")).repeat(Hm(n));
  return n.options.ruleSpaces ? r.slice(0, -1) : r;
}
const dl = {
  blockquote: um,
  break: ws,
  code: fm,
  definition: mm,
  emphasis: el,
  hardBreak: ws,
  heading: xm,
  html: nl,
  image: rl,
  imageReference: il,
  inlineCode: al,
  link: ul,
  linkReference: ol,
  list: Lm,
  listItem: Om,
  paragraph: Dm,
  root: Mm,
  strong: cl,
  text: Fm,
  thematicBreak: Um
}, Rs = document.createElement("i");
function fa(e) {
  const t = "&" + e + ";";
  Rs.innerHTML = t;
  const n = Rs.textContent;
  return n.charCodeAt(n.length - 1) === 59 && e !== "semi" || n === t ? !1 : n;
}
function hl(e, t) {
  const n = Number.parseInt(e, t);
  return (
    // C0 except for HT, LF, FF, CR, space.
    n < 9 || n === 11 || n > 13 && n < 32 || // Control character (DEL) of C0, and C1 controls.
    n > 126 && n < 160 || // Lone high surrogates and low surrogates.
    n > 55295 && n < 57344 || // Noncharacters.
    n > 64975 && n < 65008 || /* eslint-disable no-bitwise */
    (n & 65535) === 65535 || (n & 65535) === 65534 || /* eslint-enable no-bitwise */
    // Out of range
    n > 1114111 ? "�" : String.fromCodePoint(n)
  );
}
const zm = /\\([!-/:-@[-`{-~])|&(#(?:\d{1,7}|x[\da-f]{1,6})|[\da-z]{1,31});/gi;
function $m(e) {
  return e.replace(zm, jm);
}
function jm(e, t, n) {
  if (t)
    return t;
  if (n.charCodeAt(0) === 35) {
    const i = n.charCodeAt(1), a = i === 120 || i === 88;
    return hl(n.slice(a ? 2 : 1), a ? 16 : 10);
  }
  return fa(n) || e;
}
function Ym() {
  return {
    enter: {
      table: qm,
      tableData: Os,
      tableHeader: Os,
      tableRow: Wm
    },
    exit: {
      codeText: Gm,
      table: Vm,
      tableData: oi,
      tableHeader: oi,
      tableRow: oi
    }
  };
}
function qm(e) {
  const t = e._align;
  this.enter(
    {
      type: "table",
      align: t.map(function(n) {
        return n === "none" ? null : n;
      }),
      children: []
    },
    e
  ), this.data.inTable = !0;
}
function Vm(e) {
  this.exit(e), this.data.inTable = void 0;
}
function Wm(e) {
  this.enter({ type: "tableRow", children: [] }, e);
}
function oi(e) {
  this.exit(e);
}
function Os(e) {
  this.enter({ type: "tableCell", children: [] }, e);
}
function Gm(e) {
  let t = this.resume();
  this.data.inTable && (t = t.replace(/\\([\\|])/g, Qm));
  const n = this.stack[this.stack.length - 1];
  n.type, n.value = t, this.exit(e);
}
function Qm(e, t) {
  return t === "|" ? t : e;
}
function Km(e) {
  const t = e || {}, n = t.tableCellPadding, r = t.tablePipeAlign, i = t.stringLength, a = n ? " " : "|";
  return {
    unsafe: [
      { character: "\r", inConstruct: "tableCell" },
      { character: `
`, inConstruct: "tableCell" },
      // A pipe, when followed by a tab or space (padding), or a dash or colon
      // (unpadded delimiter row), could result in a table.
      { atBreak: !0, character: "|", after: "[	 :-]" },
      // A pipe in a cell must be encoded.
      { character: "|", inConstruct: "tableCell" },
      // A colon must be followed by a dash, in which case it could start a
      // delimiter row.
      { atBreak: !0, character: ":", after: "-" },
      // A delimiter row can also start with a dash, when followed by more
      // dashes, a colon, or a pipe.
      // This is a stricter version than the built in check for lists, thematic
      // breaks, and setex heading underlines though:
      // <https://github.com/syntax-tree/mdast-util-to-markdown/blob/51a2038/lib/unsafe.js#L57>
      { atBreak: !0, character: "-", after: "[:|-]" }
    ],
    handlers: {
      inlineCode: p,
      table: s,
      tableCell: o,
      tableRow: u
    }
  };
  function s(f, g, y, C) {
    return c(d(f, y, C), f.align);
  }
  function u(f, g, y, C) {
    const k = h(f, y, C), I = c([k]);
    return I.slice(0, I.indexOf(`
`));
  }
  function o(f, g, y, C) {
    const k = y.enter("tableCell"), I = y.enter("phrasing"), _ = y.containerPhrasing(f, {
      ...C,
      before: a,
      after: a
    });
    return I(), k(), _;
  }
  function c(f, g) {
    return am(f, {
      align: g,
      // @ts-expect-error: `markdown-table` types should support `null`.
      alignDelimiters: r,
      // @ts-expect-error: `markdown-table` types should support `null`.
      padding: n,
      // @ts-expect-error: `markdown-table` types should support `null`.
      stringLength: i
    });
  }
  function d(f, g, y) {
    const C = f.children;
    let k = -1;
    const I = [], _ = g.enter("table");
    for (; ++k < C.length; )
      I[k] = h(C[k], g, y);
    return _(), I;
  }
  function h(f, g, y) {
    const C = f.children;
    let k = -1;
    const I = [], _ = g.enter("tableRow");
    for (; ++k < C.length; )
      I[k] = o(C[k], f, g, y);
    return _(), I;
  }
  function p(f, g, y) {
    let C = dl.inlineCode(f, g, y);
    return y.stack.includes("tableCell") && (C = C.replace(/\|/g, "\\$&")), C;
  }
}
function Xm() {
  return {
    exit: {
      taskListCheckValueChecked: Ds,
      taskListCheckValueUnchecked: Ds,
      paragraph: Jm
    }
  };
}
function Zm() {
  return {
    unsafe: [{ atBreak: !0, character: "-", after: "[:|-]" }],
    handlers: { listItem: e1 }
  };
}
function Ds(e) {
  const t = this.stack[this.stack.length - 2];
  t.type, t.checked = e.type === "taskListCheckValueChecked";
}
function Jm(e) {
  const t = this.stack[this.stack.length - 2];
  if (t && t.type === "listItem" && typeof t.checked == "boolean") {
    const n = this.stack[this.stack.length - 1];
    n.type;
    const r = n.children[0];
    if (r && r.type === "text") {
      const i = t.children;
      let a = -1, s;
      for (; ++a < i.length; ) {
        const u = i[a];
        if (u.type === "paragraph") {
          s = u;
          break;
        }
      }
      s === n && (r.value = r.value.slice(1), r.value.length === 0 ? n.children.shift() : n.position && r.position && typeof r.position.start.offset == "number" && (r.position.start.column++, r.position.start.offset++, n.position.start = Object.assign({}, r.position.start)));
    }
  }
  this.exit(e);
}
function e1(e, t, n, r) {
  const i = e.children[0], a = typeof e.checked == "boolean" && i && i.type === "paragraph", s = "[" + (e.checked ? "x" : " ") + "] ", u = n.createTracker(r);
  a && u.move(s);
  let o = dl.listItem(e, t, n, {
    ...r,
    ...u.current()
  });
  return a && (o = o.replace(/^(?:[*+-]|\d+\.)([\r\n]| {1,3})/, c)), o;
  function c(d) {
    return d + s;
  }
}
function t1() {
  return [
    Sp(),
    Qp(),
    Jp(),
    Ym(),
    Xm()
  ];
}
function n1(e) {
  return {
    extensions: [
      wp(),
      Kp(e),
      em(),
      Km(e),
      Zm()
    ]
  };
}
function Ze(e, t, n, r) {
  const i = e.length;
  let a = 0, s;
  if (t < 0 ? t = -t > i ? 0 : i + t : t = t > i ? i : t, n = n > 0 ? n : 0, r.length < 1e4)
    s = Array.from(r), s.unshift(t, n), e.splice(...s);
  else
    for (n && e.splice(t, n); a < r.length; )
      s = r.slice(a, a + 1e4), s.unshift(t, 0), e.splice(...s), a += 1e4, t += 1e4;
}
function nt(e, t) {
  return e.length > 0 ? (Ze(e, e.length, 0, t), e) : t;
}
const Ps = {}.hasOwnProperty;
function fl(e) {
  const t = {};
  let n = -1;
  for (; ++n < e.length; )
    r1(t, e[n]);
  return t;
}
function r1(e, t) {
  let n;
  for (n in t) {
    const i = (Ps.call(e, n) ? e[n] : void 0) || (e[n] = {}), a = t[n];
    let s;
    if (a)
      for (s in a) {
        Ps.call(i, s) || (i[s] = []);
        const u = a[s];
        i1(
          // @ts-expect-error Looks like a list.
          i[s],
          Array.isArray(u) ? u : u ? [u] : []
        );
      }
  }
}
function i1(e, t) {
  let n = -1;
  const r = [];
  for (; ++n < t.length; )
    (t[n].add === "after" ? e : r).push(t[n]);
  Ze(e, 0, 0, r);
}
const a1 = {
  tokenize: d1,
  partial: !0
}, pl = {
  tokenize: h1,
  partial: !0
}, ml = {
  tokenize: f1,
  partial: !0
}, gl = {
  tokenize: p1,
  partial: !0
}, s1 = {
  tokenize: m1,
  partial: !0
}, bl = {
  name: "wwwAutolink",
  tokenize: l1,
  previous: Tl
}, El = {
  name: "protocolAutolink",
  tokenize: c1,
  previous: kl
}, _t = {
  name: "emailAutolink",
  tokenize: o1,
  previous: xl
}, gt = {};
function u1() {
  return {
    text: gt
  };
}
let zt = 48;
for (; zt < 123; )
  gt[zt] = _t, zt++, zt === 58 ? zt = 65 : zt === 91 && (zt = 97);
gt[43] = _t;
gt[45] = _t;
gt[46] = _t;
gt[95] = _t;
gt[72] = [_t, El];
gt[104] = [_t, El];
gt[87] = [_t, bl];
gt[119] = [_t, bl];
function o1(e, t, n) {
  const r = this;
  let i, a;
  return s;
  function s(h) {
    return !Mi(h) || !xl.call(r, r.previous) || pa(r.events) ? n(h) : (e.enter("literalAutolink"), e.enter("literalAutolinkEmail"), u(h));
  }
  function u(h) {
    return Mi(h) ? (e.consume(h), u) : h === 64 ? (e.consume(h), o) : n(h);
  }
  function o(h) {
    return h === 46 ? e.check(s1, d, c)(h) : h === 45 || h === 95 || Be(h) ? (a = !0, e.consume(h), o) : d(h);
  }
  function c(h) {
    return e.consume(h), i = !0, o;
  }
  function d(h) {
    return a && i && je(r.previous) ? (e.exit("literalAutolinkEmail"), e.exit("literalAutolink"), t(h)) : n(h);
  }
}
function l1(e, t, n) {
  const r = this;
  return i;
  function i(s) {
    return s !== 87 && s !== 119 || !Tl.call(r, r.previous) || pa(r.events) ? n(s) : (e.enter("literalAutolink"), e.enter("literalAutolinkWww"), e.check(a1, e.attempt(pl, e.attempt(ml, a), n), n)(s));
  }
  function a(s) {
    return e.exit("literalAutolinkWww"), e.exit("literalAutolink"), t(s);
  }
}
function c1(e, t, n) {
  const r = this;
  let i = "", a = !1;
  return s;
  function s(h) {
    return (h === 72 || h === 104) && kl.call(r, r.previous) && !pa(r.events) ? (e.enter("literalAutolink"), e.enter("literalAutolinkHttp"), i += String.fromCodePoint(h), e.consume(h), u) : n(h);
  }
  function u(h) {
    if (je(h) && i.length < 5)
      return i += String.fromCodePoint(h), e.consume(h), u;
    if (h === 58) {
      const p = i.toLowerCase();
      if (p === "http" || p === "https")
        return e.consume(h), o;
    }
    return n(h);
  }
  function o(h) {
    return h === 47 ? (e.consume(h), a ? c : (a = !0, o)) : n(h);
  }
  function c(h) {
    return h === null || Sr(h) || be(h) || Zt(h) || Gr(h) ? n(h) : e.attempt(pl, e.attempt(ml, d), n)(h);
  }
  function d(h) {
    return e.exit("literalAutolinkHttp"), e.exit("literalAutolink"), t(h);
  }
}
function d1(e, t, n) {
  let r = 0;
  return i;
  function i(s) {
    return (s === 87 || s === 119) && r < 3 ? (r++, e.consume(s), i) : s === 46 && r === 3 ? (e.consume(s), a) : n(s);
  }
  function a(s) {
    return s === null ? n(s) : t(s);
  }
}
function h1(e, t, n) {
  let r, i, a;
  return s;
  function s(c) {
    return c === 46 || c === 95 ? e.check(gl, o, u)(c) : c === null || be(c) || Zt(c) || c !== 45 && Gr(c) ? o(c) : (a = !0, e.consume(c), s);
  }
  function u(c) {
    return c === 95 ? r = !0 : (i = r, r = void 0), e.consume(c), s;
  }
  function o(c) {
    return i || r || !a ? n(c) : t(c);
  }
}
function f1(e, t) {
  let n = 0, r = 0;
  return i;
  function i(s) {
    return s === 40 ? (n++, e.consume(s), i) : s === 41 && r < n ? a(s) : s === 33 || s === 34 || s === 38 || s === 39 || s === 41 || s === 42 || s === 44 || s === 46 || s === 58 || s === 59 || s === 60 || s === 63 || s === 93 || s === 95 || s === 126 ? e.check(gl, t, a)(s) : s === null || be(s) || Zt(s) ? t(s) : (e.consume(s), i);
  }
  function a(s) {
    return s === 41 && r++, e.consume(s), i;
  }
}
function p1(e, t, n) {
  return r;
  function r(u) {
    return u === 33 || u === 34 || u === 39 || u === 41 || u === 42 || u === 44 || u === 46 || u === 58 || u === 59 || u === 63 || u === 95 || u === 126 ? (e.consume(u), r) : u === 38 ? (e.consume(u), a) : u === 93 ? (e.consume(u), i) : (
      // `<` is an end.
      u === 60 || // So is whitespace.
      u === null || be(u) || Zt(u) ? t(u) : n(u)
    );
  }
  function i(u) {
    return u === null || u === 40 || u === 91 || be(u) || Zt(u) ? t(u) : r(u);
  }
  function a(u) {
    return je(u) ? s(u) : n(u);
  }
  function s(u) {
    return u === 59 ? (e.consume(u), r) : je(u) ? (e.consume(u), s) : n(u);
  }
}
function m1(e, t, n) {
  return r;
  function r(a) {
    return e.consume(a), i;
  }
  function i(a) {
    return Be(a) ? n(a) : t(a);
  }
}
function Tl(e) {
  return e === null || e === 40 || e === 42 || e === 95 || e === 91 || e === 93 || e === 126 || be(e);
}
function kl(e) {
  return !je(e);
}
function xl(e) {
  return !(e === 47 || Mi(e));
}
function Mi(e) {
  return e === 43 || e === 45 || e === 46 || e === 95 || Be(e);
}
function pa(e) {
  let t = e.length, n = !1;
  for (; t--; ) {
    const r = e[t][1];
    if ((r.type === "labelLink" || r.type === "labelImage") && !r._balanced) {
      n = !0;
      break;
    }
    if (r._gfmAutolinkLiteralWalkedInto) {
      n = !1;
      break;
    }
  }
  return e.length > 0 && !n && (e[e.length - 1][1]._gfmAutolinkLiteralWalkedInto = !0), n;
}
function kn(e) {
  const t = [];
  let n = -1, r = 0, i = 0;
  for (; ++n < e.length; ) {
    const a = e.charCodeAt(n);
    let s = "";
    if (a === 37 && Be(e.charCodeAt(n + 1)) && Be(e.charCodeAt(n + 2)))
      i = 2;
    else if (a < 128)
      /[!#$&-;=?-Z_a-z~]/.test(String.fromCharCode(a)) || (s = String.fromCharCode(a));
    else if (a > 55295 && a < 57344) {
      const u = e.charCodeAt(n + 1);
      a < 56320 && u > 56319 && u < 57344 ? (s = String.fromCharCode(a, u), i = 1) : s = "�";
    } else
      s = String.fromCharCode(a);
    s && (t.push(e.slice(r, n), encodeURIComponent(s)), r = n + i + 1, s = ""), i && (n += i, i = 0);
  }
  return t.join("") + e.slice(r);
}
function Qr(e, t, n) {
  const r = [];
  let i = -1;
  for (; ++i < e.length; ) {
    const a = e[i].resolveAll;
    a && !r.includes(a) && (t = a(t, n), r.push(a));
  }
  return t;
}
const vi = {
  name: "attention",
  resolveAll: g1,
  tokenize: b1
};
function g1(e, t) {
  let n = -1, r, i, a, s, u, o, c, d;
  for (; ++n < e.length; )
    if (e[n][0] === "enter" && e[n][1].type === "attentionSequence" && e[n][1]._close) {
      for (r = n; r--; )
        if (e[r][0] === "exit" && e[r][1].type === "attentionSequence" && e[r][1]._open && // If the markers are the same:
        t.sliceSerialize(e[r][1]).charCodeAt(0) === t.sliceSerialize(e[n][1]).charCodeAt(0)) {
          if ((e[r][1]._close || e[n][1]._open) && (e[n][1].end.offset - e[n][1].start.offset) % 3 && !((e[r][1].end.offset - e[r][1].start.offset + e[n][1].end.offset - e[n][1].start.offset) % 3))
            continue;
          o = e[r][1].end.offset - e[r][1].start.offset > 1 && e[n][1].end.offset - e[n][1].start.offset > 1 ? 2 : 1;
          const h = {
            ...e[r][1].end
          }, p = {
            ...e[n][1].start
          };
          Ms(h, -o), Ms(p, o), s = {
            type: o > 1 ? "strongSequence" : "emphasisSequence",
            start: h,
            end: {
              ...e[r][1].end
            }
          }, u = {
            type: o > 1 ? "strongSequence" : "emphasisSequence",
            start: {
              ...e[n][1].start
            },
            end: p
          }, a = {
            type: o > 1 ? "strongText" : "emphasisText",
            start: {
              ...e[r][1].end
            },
            end: {
              ...e[n][1].start
            }
          }, i = {
            type: o > 1 ? "strong" : "emphasis",
            start: {
              ...s.start
            },
            end: {
              ...u.end
            }
          }, e[r][1].end = {
            ...s.start
          }, e[n][1].start = {
            ...u.end
          }, c = [], e[r][1].end.offset - e[r][1].start.offset && (c = nt(c, [["enter", e[r][1], t], ["exit", e[r][1], t]])), c = nt(c, [["enter", i, t], ["enter", s, t], ["exit", s, t], ["enter", a, t]]), c = nt(c, Qr(t.parser.constructs.insideSpan.null, e.slice(r + 1, n), t)), c = nt(c, [["exit", a, t], ["enter", u, t], ["exit", u, t], ["exit", i, t]]), e[n][1].end.offset - e[n][1].start.offset ? (d = 2, c = nt(c, [["enter", e[n][1], t], ["exit", e[n][1], t]])) : d = 0, Ze(e, r - 1, n - r + 3, c), n = r + c.length - d - 2;
          break;
        }
    }
  for (n = -1; ++n < e.length; )
    e[n][1].type === "attentionSequence" && (e[n][1].type = "data");
  return e;
}
function b1(e, t) {
  const n = this.parser.constructs.attentionMarkers.null, r = this.previous, i = mn(r);
  let a;
  return s;
  function s(o) {
    return a = o, e.enter("attentionSequence"), u(o);
  }
  function u(o) {
    if (o === a)
      return e.consume(o), u;
    const c = e.exit("attentionSequence"), d = mn(o), h = !d || d === 2 && i || n.includes(o), p = !i || i === 2 && d || n.includes(r);
    return c._open = !!(a === 42 ? h : h && (i || !p)), c._close = !!(a === 42 ? p : p && (d || !h)), t(o);
  }
}
function Ms(e, t) {
  e.column += t, e.offset += t, e._bufferIndex += t;
}
const E1 = {
  name: "autolink",
  tokenize: T1
};
function T1(e, t, n) {
  let r = 0;
  return i;
  function i(f) {
    return e.enter("autolink"), e.enter("autolinkMarker"), e.consume(f), e.exit("autolinkMarker"), e.enter("autolinkProtocol"), a;
  }
  function a(f) {
    return je(f) ? (e.consume(f), s) : f === 64 ? n(f) : c(f);
  }
  function s(f) {
    return f === 43 || f === 45 || f === 46 || Be(f) ? (r = 1, u(f)) : c(f);
  }
  function u(f) {
    return f === 58 ? (e.consume(f), r = 0, o) : (f === 43 || f === 45 || f === 46 || Be(f)) && r++ < 32 ? (e.consume(f), u) : (r = 0, c(f));
  }
  function o(f) {
    return f === 62 ? (e.exit("autolinkProtocol"), e.enter("autolinkMarker"), e.consume(f), e.exit("autolinkMarker"), e.exit("autolink"), t) : f === null || f === 32 || f === 60 || Sr(f) ? n(f) : (e.consume(f), o);
  }
  function c(f) {
    return f === 64 ? (e.consume(f), d) : kp(f) ? (e.consume(f), c) : n(f);
  }
  function d(f) {
    return Be(f) ? h(f) : n(f);
  }
  function h(f) {
    return f === 46 ? (e.consume(f), r = 0, d) : f === 62 ? (e.exit("autolinkProtocol").type = "autolinkEmail", e.enter("autolinkMarker"), e.consume(f), e.exit("autolinkMarker"), e.exit("autolink"), t) : p(f);
  }
  function p(f) {
    if ((f === 45 || Be(f)) && r++ < 63) {
      const g = f === 45 ? p : h;
      return e.consume(f), g;
    }
    return n(f);
  }
}
function ue(e, t, n, r) {
  const i = r ? r - 1 : Number.POSITIVE_INFINITY;
  let a = 0;
  return s;
  function s(o) {
    return ae(o) ? (e.enter(n), u(o)) : t(o);
  }
  function u(o) {
    return ae(o) && a++ < i ? (e.consume(o), u) : (e.exit(n), t(o));
  }
}
const rr = {
  partial: !0,
  tokenize: k1
};
function k1(e, t, n) {
  return r;
  function r(a) {
    return ae(a) ? ue(e, i, "linePrefix")(a) : i(a);
  }
  function i(a) {
    return a === null || Q(a) ? t(a) : n(a);
  }
}
const yl = {
  continuation: {
    tokenize: y1
  },
  exit: A1,
  name: "blockQuote",
  tokenize: x1
};
function x1(e, t, n) {
  const r = this;
  return i;
  function i(s) {
    if (s === 62) {
      const u = r.containerState;
      return u.open || (e.enter("blockQuote", {
        _container: !0
      }), u.open = !0), e.enter("blockQuotePrefix"), e.enter("blockQuoteMarker"), e.consume(s), e.exit("blockQuoteMarker"), a;
    }
    return n(s);
  }
  function a(s) {
    return ae(s) ? (e.enter("blockQuotePrefixWhitespace"), e.consume(s), e.exit("blockQuotePrefixWhitespace"), e.exit("blockQuotePrefix"), t) : (e.exit("blockQuotePrefix"), t(s));
  }
}
function y1(e, t, n) {
  const r = this;
  return i;
  function i(s) {
    return ae(s) ? ue(e, a, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(s) : a(s);
  }
  function a(s) {
    return e.attempt(yl, t, n)(s);
  }
}
function A1(e) {
  e.exit("blockQuote");
}
const Al = {
  name: "characterEscape",
  tokenize: _1
};
function _1(e, t, n) {
  return r;
  function r(a) {
    return e.enter("characterEscape"), e.enter("escapeMarker"), e.consume(a), e.exit("escapeMarker"), i;
  }
  function i(a) {
    return yp(a) ? (e.enter("characterEscapeValue"), e.consume(a), e.exit("characterEscapeValue"), e.exit("characterEscape"), t) : n(a);
  }
}
const _l = {
  name: "characterReference",
  tokenize: C1
};
function C1(e, t, n) {
  const r = this;
  let i = 0, a, s;
  return u;
  function u(h) {
    return e.enter("characterReference"), e.enter("characterReferenceMarker"), e.consume(h), e.exit("characterReferenceMarker"), o;
  }
  function o(h) {
    return h === 35 ? (e.enter("characterReferenceMarkerNumeric"), e.consume(h), e.exit("characterReferenceMarkerNumeric"), c) : (e.enter("characterReferenceValue"), a = 31, s = Be, d(h));
  }
  function c(h) {
    return h === 88 || h === 120 ? (e.enter("characterReferenceMarkerHexadecimal"), e.consume(h), e.exit("characterReferenceMarkerHexadecimal"), e.enter("characterReferenceValue"), a = 6, s = xp, d) : (e.enter("characterReferenceValue"), a = 7, s = Pi, d(h));
  }
  function d(h) {
    if (h === 59 && i) {
      const p = e.exit("characterReferenceValue");
      return s === Be && !fa(r.sliceSerialize(p)) ? n(h) : (e.enter("characterReferenceMarker"), e.consume(h), e.exit("characterReferenceMarker"), e.exit("characterReference"), t);
    }
    return s(h) && i++ < a ? (e.consume(h), d) : n(h);
  }
}
const vs = {
  partial: !0,
  tokenize: N1
}, Bs = {
  concrete: !0,
  name: "codeFenced",
  tokenize: I1
};
function I1(e, t, n) {
  const r = this, i = {
    partial: !0,
    tokenize: M
  };
  let a = 0, s = 0, u;
  return o;
  function o(S) {
    return c(S);
  }
  function c(S) {
    const B = r.events[r.events.length - 1];
    return a = B && B[1].type === "linePrefix" ? B[2].sliceSerialize(B[1], !0).length : 0, u = S, e.enter("codeFenced"), e.enter("codeFencedFence"), e.enter("codeFencedFenceSequence"), d(S);
  }
  function d(S) {
    return S === u ? (s++, e.consume(S), d) : s < 3 ? n(S) : (e.exit("codeFencedFenceSequence"), ae(S) ? ue(e, h, "whitespace")(S) : h(S));
  }
  function h(S) {
    return S === null || Q(S) ? (e.exit("codeFencedFence"), r.interrupt ? t(S) : e.check(vs, y, v)(S)) : (e.enter("codeFencedFenceInfo"), e.enter("chunkString", {
      contentType: "string"
    }), p(S));
  }
  function p(S) {
    return S === null || Q(S) ? (e.exit("chunkString"), e.exit("codeFencedFenceInfo"), h(S)) : ae(S) ? (e.exit("chunkString"), e.exit("codeFencedFenceInfo"), ue(e, f, "whitespace")(S)) : S === 96 && S === u ? n(S) : (e.consume(S), p);
  }
  function f(S) {
    return S === null || Q(S) ? h(S) : (e.enter("codeFencedFenceMeta"), e.enter("chunkString", {
      contentType: "string"
    }), g(S));
  }
  function g(S) {
    return S === null || Q(S) ? (e.exit("chunkString"), e.exit("codeFencedFenceMeta"), h(S)) : S === 96 && S === u ? n(S) : (e.consume(S), g);
  }
  function y(S) {
    return e.attempt(i, v, C)(S);
  }
  function C(S) {
    return e.enter("lineEnding"), e.consume(S), e.exit("lineEnding"), k;
  }
  function k(S) {
    return a > 0 && ae(S) ? ue(e, I, "linePrefix", a + 1)(S) : I(S);
  }
  function I(S) {
    return S === null || Q(S) ? e.check(vs, y, v)(S) : (e.enter("codeFlowValue"), _(S));
  }
  function _(S) {
    return S === null || Q(S) ? (e.exit("codeFlowValue"), I(S)) : (e.consume(S), _);
  }
  function v(S) {
    return e.exit("codeFenced"), t(S);
  }
  function M(S, B, O) {
    let j = 0;
    return w;
    function w(H) {
      return S.enter("lineEnding"), S.consume(H), S.exit("lineEnding"), z;
    }
    function z(H) {
      return S.enter("codeFencedFence"), ae(H) ? ue(S, $, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(H) : $(H);
    }
    function $(H) {
      return H === u ? (S.enter("codeFencedFenceSequence"), X(H)) : O(H);
    }
    function X(H) {
      return H === u ? (j++, S.consume(H), X) : j >= s ? (S.exit("codeFencedFenceSequence"), ae(H) ? ue(S, V, "whitespace")(H) : V(H)) : O(H);
    }
    function V(H) {
      return H === null || Q(H) ? (S.exit("codeFencedFence"), B(H)) : O(H);
    }
  }
}
function N1(e, t, n) {
  const r = this;
  return i;
  function i(s) {
    return s === null ? n(s) : (e.enter("lineEnding"), e.consume(s), e.exit("lineEnding"), a);
  }
  function a(s) {
    return r.parser.lazy[r.now().line] ? n(s) : t(s);
  }
}
const li = {
  name: "codeIndented",
  tokenize: w1
}, S1 = {
  partial: !0,
  tokenize: L1
};
function w1(e, t, n) {
  const r = this;
  return i;
  function i(c) {
    return e.enter("codeIndented"), ue(e, a, "linePrefix", 5)(c);
  }
  function a(c) {
    const d = r.events[r.events.length - 1];
    return d && d[1].type === "linePrefix" && d[2].sliceSerialize(d[1], !0).length >= 4 ? s(c) : n(c);
  }
  function s(c) {
    return c === null ? o(c) : Q(c) ? e.attempt(S1, s, o)(c) : (e.enter("codeFlowValue"), u(c));
  }
  function u(c) {
    return c === null || Q(c) ? (e.exit("codeFlowValue"), s(c)) : (e.consume(c), u);
  }
  function o(c) {
    return e.exit("codeIndented"), t(c);
  }
}
function L1(e, t, n) {
  const r = this;
  return i;
  function i(s) {
    return r.parser.lazy[r.now().line] ? n(s) : Q(s) ? (e.enter("lineEnding"), e.consume(s), e.exit("lineEnding"), i) : ue(e, a, "linePrefix", 5)(s);
  }
  function a(s) {
    const u = r.events[r.events.length - 1];
    return u && u[1].type === "linePrefix" && u[2].sliceSerialize(u[1], !0).length >= 4 ? t(s) : Q(s) ? i(s) : n(s);
  }
}
const R1 = {
  name: "codeText",
  previous: D1,
  resolve: O1,
  tokenize: P1
};
function O1(e) {
  let t = e.length - 4, n = 3, r, i;
  if ((e[n][1].type === "lineEnding" || e[n][1].type === "space") && (e[t][1].type === "lineEnding" || e[t][1].type === "space")) {
    for (r = n; ++r < t; )
      if (e[r][1].type === "codeTextData") {
        e[n][1].type = "codeTextPadding", e[t][1].type = "codeTextPadding", n += 2, t -= 2;
        break;
      }
  }
  for (r = n - 1, t++; ++r <= t; )
    i === void 0 ? r !== t && e[r][1].type !== "lineEnding" && (i = r) : (r === t || e[r][1].type === "lineEnding") && (e[i][1].type = "codeTextData", r !== i + 2 && (e[i][1].end = e[r - 1][1].end, e.splice(i + 2, r - i - 2), t -= r - i - 2, r = i + 2), i = void 0);
  return e;
}
function D1(e) {
  return e !== 96 || this.events[this.events.length - 1][1].type === "characterEscape";
}
function P1(e, t, n) {
  let r = 0, i, a;
  return s;
  function s(h) {
    return e.enter("codeText"), e.enter("codeTextSequence"), u(h);
  }
  function u(h) {
    return h === 96 ? (e.consume(h), r++, u) : (e.exit("codeTextSequence"), o(h));
  }
  function o(h) {
    return h === null ? n(h) : h === 32 ? (e.enter("space"), e.consume(h), e.exit("space"), o) : h === 96 ? (a = e.enter("codeTextSequence"), i = 0, d(h)) : Q(h) ? (e.enter("lineEnding"), e.consume(h), e.exit("lineEnding"), o) : (e.enter("codeTextData"), c(h));
  }
  function c(h) {
    return h === null || h === 32 || h === 96 || Q(h) ? (e.exit("codeTextData"), o(h)) : (e.consume(h), c);
  }
  function d(h) {
    return h === 96 ? (e.consume(h), i++, d) : i === r ? (e.exit("codeTextSequence"), e.exit("codeText"), t(h)) : (a.type = "codeTextData", c(h));
  }
}
class M1 {
  /**
   * @param {ReadonlyArray<T> | null | undefined} [initial]
   *   Initial items (optional).
   * @returns
   *   Splice buffer.
   */
  constructor(t) {
    this.left = t ? [...t] : [], this.right = [];
  }
  /**
   * Array access;
   * does not move the cursor.
   *
   * @param {number} index
   *   Index.
   * @return {T}
   *   Item.
   */
  get(t) {
    if (t < 0 || t >= this.left.length + this.right.length)
      throw new RangeError("Cannot access index `" + t + "` in a splice buffer of size `" + (this.left.length + this.right.length) + "`");
    return t < this.left.length ? this.left[t] : this.right[this.right.length - t + this.left.length - 1];
  }
  /**
   * The length of the splice buffer, one greater than the largest index in the
   * array.
   */
  get length() {
    return this.left.length + this.right.length;
  }
  /**
   * Remove and return `list[0]`;
   * moves the cursor to `0`.
   *
   * @returns {T | undefined}
   *   Item, optional.
   */
  shift() {
    return this.setCursor(0), this.right.pop();
  }
  /**
   * Slice the buffer to get an array;
   * does not move the cursor.
   *
   * @param {number} start
   *   Start.
   * @param {number | null | undefined} [end]
   *   End (optional).
   * @returns {Array<T>}
   *   Array of items.
   */
  slice(t, n) {
    const r = n ?? Number.POSITIVE_INFINITY;
    return r < this.left.length ? this.left.slice(t, r) : t > this.left.length ? this.right.slice(this.right.length - r + this.left.length, this.right.length - t + this.left.length).reverse() : this.left.slice(t).concat(this.right.slice(this.right.length - r + this.left.length).reverse());
  }
  /**
   * Mimics the behavior of Array.prototype.splice() except for the change of
   * interface necessary to avoid segfaults when patching in very large arrays.
   *
   * This operation moves cursor is moved to `start` and results in the cursor
   * placed after any inserted items.
   *
   * @param {number} start
   *   Start;
   *   zero-based index at which to start changing the array;
   *   negative numbers count backwards from the end of the array and values
   *   that are out-of bounds are clamped to the appropriate end of the array.
   * @param {number | null | undefined} [deleteCount=0]
   *   Delete count (default: `0`);
   *   maximum number of elements to delete, starting from start.
   * @param {Array<T> | null | undefined} [items=[]]
   *   Items to include in place of the deleted items (default: `[]`).
   * @return {Array<T>}
   *   Any removed items.
   */
  splice(t, n, r) {
    const i = n || 0;
    this.setCursor(Math.trunc(t));
    const a = this.right.splice(this.right.length - i, Number.POSITIVE_INFINITY);
    return r && wn(this.left, r), a.reverse();
  }
  /**
   * Remove and return the highest-numbered item in the array, so
   * `list[list.length - 1]`;
   * Moves the cursor to `length`.
   *
   * @returns {T | undefined}
   *   Item, optional.
   */
  pop() {
    return this.setCursor(Number.POSITIVE_INFINITY), this.left.pop();
  }
  /**
   * Inserts a single item to the high-numbered side of the array;
   * moves the cursor to `length`.
   *
   * @param {T} item
   *   Item.
   * @returns {undefined}
   *   Nothing.
   */
  push(t) {
    this.setCursor(Number.POSITIVE_INFINITY), this.left.push(t);
  }
  /**
   * Inserts many items to the high-numbered side of the array.
   * Moves the cursor to `length`.
   *
   * @param {Array<T>} items
   *   Items.
   * @returns {undefined}
   *   Nothing.
   */
  pushMany(t) {
    this.setCursor(Number.POSITIVE_INFINITY), wn(this.left, t);
  }
  /**
   * Inserts a single item to the low-numbered side of the array;
   * Moves the cursor to `0`.
   *
   * @param {T} item
   *   Item.
   * @returns {undefined}
   *   Nothing.
   */
  unshift(t) {
    this.setCursor(0), this.right.push(t);
  }
  /**
   * Inserts many items to the low-numbered side of the array;
   * moves the cursor to `0`.
   *
   * @param {Array<T>} items
   *   Items.
   * @returns {undefined}
   *   Nothing.
   */
  unshiftMany(t) {
    this.setCursor(0), wn(this.right, t.reverse());
  }
  /**
   * Move the cursor to a specific position in the array. Requires
   * time proportional to the distance moved.
   *
   * If `n < 0`, the cursor will end up at the beginning.
   * If `n > length`, the cursor will end up at the end.
   *
   * @param {number} n
   *   Position.
   * @return {undefined}
   *   Nothing.
   */
  setCursor(t) {
    if (!(t === this.left.length || t > this.left.length && this.right.length === 0 || t < 0 && this.left.length === 0))
      if (t < this.left.length) {
        const n = this.left.splice(t, Number.POSITIVE_INFINITY);
        wn(this.right, n.reverse());
      } else {
        const n = this.right.splice(this.left.length + this.right.length - t, Number.POSITIVE_INFINITY);
        wn(this.left, n.reverse());
      }
  }
}
function wn(e, t) {
  let n = 0;
  if (t.length < 1e4)
    e.push(...t);
  else
    for (; n < t.length; )
      e.push(...t.slice(n, n + 1e4)), n += 1e4;
}
function Cl(e) {
  const t = {};
  let n = -1, r, i, a, s, u, o, c;
  const d = new M1(e);
  for (; ++n < d.length; ) {
    for (; n in t; )
      n = t[n];
    if (r = d.get(n), n && r[1].type === "chunkFlow" && d.get(n - 1)[1].type === "listItemPrefix" && (o = r[1]._tokenizer.events, a = 0, a < o.length && o[a][1].type === "lineEndingBlank" && (a += 2), a < o.length && o[a][1].type === "content"))
      for (; ++a < o.length && o[a][1].type !== "content"; )
        o[a][1].type === "chunkText" && (o[a][1]._isInFirstContentOfListItem = !0, a++);
    if (r[0] === "enter")
      r[1].contentType && (Object.assign(t, v1(d, n)), n = t[n], c = !0);
    else if (r[1]._container) {
      for (a = n, i = void 0; a--; )
        if (s = d.get(a), s[1].type === "lineEnding" || s[1].type === "lineEndingBlank")
          s[0] === "enter" && (i && (d.get(i)[1].type = "lineEndingBlank"), s[1].type = "lineEnding", i = a);
        else if (!(s[1].type === "linePrefix" || s[1].type === "listItemIndent")) break;
      i && (r[1].end = {
        ...d.get(i)[1].start
      }, u = d.slice(i, n), u.unshift(r), d.splice(i, n - i + 1, u));
    }
  }
  return Ze(e, 0, Number.POSITIVE_INFINITY, d.slice(0)), !c;
}
function v1(e, t) {
  const n = e.get(t)[1], r = e.get(t)[2];
  let i = t - 1;
  const a = [];
  let s = n._tokenizer;
  s || (s = r.parser[n.contentType](n.start), n._contentTypeTextTrailing && (s._contentTypeTextTrailing = !0));
  const u = s.events, o = [], c = {};
  let d, h, p = -1, f = n, g = 0, y = 0;
  const C = [y];
  for (; f; ) {
    for (; e.get(++i)[1] !== f; )
      ;
    a.push(i), f._tokenizer || (d = r.sliceStream(f), f.next || d.push(null), h && s.defineSkip(f.start), f._isInFirstContentOfListItem && (s._gfmTasklistFirstContentOfListItem = !0), s.write(d), f._isInFirstContentOfListItem && (s._gfmTasklistFirstContentOfListItem = void 0)), h = f, f = f.next;
  }
  for (f = n; ++p < u.length; )
    // Find a void token that includes a break.
    u[p][0] === "exit" && u[p - 1][0] === "enter" && u[p][1].type === u[p - 1][1].type && u[p][1].start.line !== u[p][1].end.line && (y = p + 1, C.push(y), f._tokenizer = void 0, f.previous = void 0, f = f.next);
  for (s.events = [], f ? (f._tokenizer = void 0, f.previous = void 0) : C.pop(), p = C.length; p--; ) {
    const k = u.slice(C[p], C[p + 1]), I = a.pop();
    o.push([I, I + k.length - 1]), e.splice(I, 2, k);
  }
  for (o.reverse(), p = -1; ++p < o.length; )
    c[g + o[p][0]] = g + o[p][1], g += o[p][1] - o[p][0] - 1;
  return c;
}
const B1 = {
  resolve: H1,
  tokenize: U1
}, F1 = {
  partial: !0,
  tokenize: z1
};
function H1(e) {
  return Cl(e), e;
}
function U1(e, t) {
  let n;
  return r;
  function r(u) {
    return e.enter("content"), n = e.enter("chunkContent", {
      contentType: "content"
    }), i(u);
  }
  function i(u) {
    return u === null ? a(u) : Q(u) ? e.check(F1, s, a)(u) : (e.consume(u), i);
  }
  function a(u) {
    return e.exit("chunkContent"), e.exit("content"), t(u);
  }
  function s(u) {
    return e.consume(u), e.exit("chunkContent"), n.next = e.enter("chunkContent", {
      contentType: "content",
      previous: n
    }), n = n.next, i;
  }
}
function z1(e, t, n) {
  const r = this;
  return i;
  function i(s) {
    return e.exit("chunkContent"), e.enter("lineEnding"), e.consume(s), e.exit("lineEnding"), ue(e, a, "linePrefix");
  }
  function a(s) {
    if (s === null || Q(s))
      return n(s);
    const u = r.events[r.events.length - 1];
    return !r.parser.constructs.disable.null.includes("codeIndented") && u && u[1].type === "linePrefix" && u[2].sliceSerialize(u[1], !0).length >= 4 ? t(s) : e.interrupt(r.parser.constructs.flow, n, t)(s);
  }
}
function Il(e, t, n, r, i, a, s, u, o) {
  const c = o || Number.POSITIVE_INFINITY;
  let d = 0;
  return h;
  function h(k) {
    return k === 60 ? (e.enter(r), e.enter(i), e.enter(a), e.consume(k), e.exit(a), p) : k === null || k === 32 || k === 41 || Sr(k) ? n(k) : (e.enter(r), e.enter(s), e.enter(u), e.enter("chunkString", {
      contentType: "string"
    }), y(k));
  }
  function p(k) {
    return k === 62 ? (e.enter(a), e.consume(k), e.exit(a), e.exit(i), e.exit(r), t) : (e.enter(u), e.enter("chunkString", {
      contentType: "string"
    }), f(k));
  }
  function f(k) {
    return k === 62 ? (e.exit("chunkString"), e.exit(u), p(k)) : k === null || k === 60 || Q(k) ? n(k) : (e.consume(k), k === 92 ? g : f);
  }
  function g(k) {
    return k === 60 || k === 62 || k === 92 ? (e.consume(k), f) : f(k);
  }
  function y(k) {
    return !d && (k === null || k === 41 || be(k)) ? (e.exit("chunkString"), e.exit(u), e.exit(s), e.exit(r), t(k)) : d < c && k === 40 ? (e.consume(k), d++, y) : k === 41 ? (e.consume(k), d--, y) : k === null || k === 32 || k === 40 || Sr(k) ? n(k) : (e.consume(k), k === 92 ? C : y);
  }
  function C(k) {
    return k === 40 || k === 41 || k === 92 ? (e.consume(k), y) : y(k);
  }
}
function Nl(e, t, n, r, i, a) {
  const s = this;
  let u = 0, o;
  return c;
  function c(f) {
    return e.enter(r), e.enter(i), e.consume(f), e.exit(i), e.enter(a), d;
  }
  function d(f) {
    return u > 999 || f === null || f === 91 || f === 93 && !o || // To do: remove in the future once we’ve switched from
    // `micromark-extension-footnote` to `micromark-extension-gfm-footnote`,
    // which doesn’t need this.
    // Hidden footnotes hook.
    /* c8 ignore next 3 */
    f === 94 && !u && "_hiddenFootnoteSupport" in s.parser.constructs ? n(f) : f === 93 ? (e.exit(a), e.enter(i), e.consume(f), e.exit(i), e.exit(r), t) : Q(f) ? (e.enter("lineEnding"), e.consume(f), e.exit("lineEnding"), d) : (e.enter("chunkString", {
      contentType: "string"
    }), h(f));
  }
  function h(f) {
    return f === null || f === 91 || f === 93 || Q(f) || u++ > 999 ? (e.exit("chunkString"), d(f)) : (e.consume(f), o || (o = !ae(f)), f === 92 ? p : h);
  }
  function p(f) {
    return f === 91 || f === 92 || f === 93 ? (e.consume(f), u++, h) : h(f);
  }
}
function Sl(e, t, n, r, i, a) {
  let s;
  return u;
  function u(p) {
    return p === 34 || p === 39 || p === 40 ? (e.enter(r), e.enter(i), e.consume(p), e.exit(i), s = p === 40 ? 41 : p, o) : n(p);
  }
  function o(p) {
    return p === s ? (e.enter(i), e.consume(p), e.exit(i), e.exit(r), t) : (e.enter(a), c(p));
  }
  function c(p) {
    return p === s ? (e.exit(a), o(s)) : p === null ? n(p) : Q(p) ? (e.enter("lineEnding"), e.consume(p), e.exit("lineEnding"), ue(e, c, "linePrefix")) : (e.enter("chunkString", {
      contentType: "string"
    }), d(p));
  }
  function d(p) {
    return p === s || p === null || Q(p) ? (e.exit("chunkString"), c(p)) : (e.consume(p), p === 92 ? h : d);
  }
  function h(p) {
    return p === s || p === 92 ? (e.consume(p), d) : d(p);
  }
}
function qn(e, t) {
  let n;
  return r;
  function r(i) {
    return Q(i) ? (e.enter("lineEnding"), e.consume(i), e.exit("lineEnding"), n = !0, r) : ae(i) ? ue(e, r, n ? "linePrefix" : "lineSuffix")(i) : t(i);
  }
}
const $1 = {
  name: "definition",
  tokenize: Y1
}, j1 = {
  partial: !0,
  tokenize: q1
};
function Y1(e, t, n) {
  const r = this;
  let i;
  return a;
  function a(f) {
    return e.enter("definition"), s(f);
  }
  function s(f) {
    return Nl.call(
      r,
      e,
      u,
      // Note: we don’t need to reset the way `markdown-rs` does.
      n,
      "definitionLabel",
      "definitionLabelMarker",
      "definitionLabelString"
    )(f);
  }
  function u(f) {
    return i = st(r.sliceSerialize(r.events[r.events.length - 1][1]).slice(1, -1)), f === 58 ? (e.enter("definitionMarker"), e.consume(f), e.exit("definitionMarker"), o) : n(f);
  }
  function o(f) {
    return be(f) ? qn(e, c)(f) : c(f);
  }
  function c(f) {
    return Il(
      e,
      d,
      // Note: we don’t need to reset the way `markdown-rs` does.
      n,
      "definitionDestination",
      "definitionDestinationLiteral",
      "definitionDestinationLiteralMarker",
      "definitionDestinationRaw",
      "definitionDestinationString"
    )(f);
  }
  function d(f) {
    return e.attempt(j1, h, h)(f);
  }
  function h(f) {
    return ae(f) ? ue(e, p, "whitespace")(f) : p(f);
  }
  function p(f) {
    return f === null || Q(f) ? (e.exit("definition"), r.parser.defined.push(i), t(f)) : n(f);
  }
}
function q1(e, t, n) {
  return r;
  function r(u) {
    return be(u) ? qn(e, i)(u) : n(u);
  }
  function i(u) {
    return Sl(e, a, n, "definitionTitle", "definitionTitleMarker", "definitionTitleString")(u);
  }
  function a(u) {
    return ae(u) ? ue(e, s, "whitespace")(u) : s(u);
  }
  function s(u) {
    return u === null || Q(u) ? t(u) : n(u);
  }
}
const V1 = {
  name: "hardBreakEscape",
  tokenize: W1
};
function W1(e, t, n) {
  return r;
  function r(a) {
    return e.enter("hardBreakEscape"), e.consume(a), i;
  }
  function i(a) {
    return Q(a) ? (e.exit("hardBreakEscape"), t(a)) : n(a);
  }
}
const G1 = {
  name: "headingAtx",
  resolve: Q1,
  tokenize: K1
};
function Q1(e, t) {
  let n = e.length - 2, r = 3, i, a;
  return e[r][1].type === "whitespace" && (r += 2), n - 2 > r && e[n][1].type === "whitespace" && (n -= 2), e[n][1].type === "atxHeadingSequence" && (r === n - 1 || n - 4 > r && e[n - 2][1].type === "whitespace") && (n -= r + 1 === n ? 2 : 4), n > r && (i = {
    type: "atxHeadingText",
    start: e[r][1].start,
    end: e[n][1].end
  }, a = {
    type: "chunkText",
    start: e[r][1].start,
    end: e[n][1].end,
    contentType: "text"
  }, Ze(e, r, n - r + 1, [["enter", i, t], ["enter", a, t], ["exit", a, t], ["exit", i, t]])), e;
}
function K1(e, t, n) {
  let r = 0;
  return i;
  function i(d) {
    return e.enter("atxHeading"), a(d);
  }
  function a(d) {
    return e.enter("atxHeadingSequence"), s(d);
  }
  function s(d) {
    return d === 35 && r++ < 6 ? (e.consume(d), s) : d === null || be(d) ? (e.exit("atxHeadingSequence"), u(d)) : n(d);
  }
  function u(d) {
    return d === 35 ? (e.enter("atxHeadingSequence"), o(d)) : d === null || Q(d) ? (e.exit("atxHeading"), t(d)) : ae(d) ? ue(e, u, "whitespace")(d) : (e.enter("atxHeadingText"), c(d));
  }
  function o(d) {
    return d === 35 ? (e.consume(d), o) : (e.exit("atxHeadingSequence"), u(d));
  }
  function c(d) {
    return d === null || d === 35 || be(d) ? (e.exit("atxHeadingText"), u(d)) : (e.consume(d), c);
  }
}
const X1 = [
  "address",
  "article",
  "aside",
  "base",
  "basefont",
  "blockquote",
  "body",
  "caption",
  "center",
  "col",
  "colgroup",
  "dd",
  "details",
  "dialog",
  "dir",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "frame",
  "frameset",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hr",
  "html",
  "iframe",
  "legend",
  "li",
  "link",
  "main",
  "menu",
  "menuitem",
  "nav",
  "noframes",
  "ol",
  "optgroup",
  "option",
  "p",
  "param",
  "search",
  "section",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "title",
  "tr",
  "track",
  "ul"
], Fs = ["pre", "script", "style", "textarea"], Z1 = {
  concrete: !0,
  name: "htmlFlow",
  resolveTo: tg,
  tokenize: ng
}, J1 = {
  partial: !0,
  tokenize: ig
}, eg = {
  partial: !0,
  tokenize: rg
};
function tg(e) {
  let t = e.length;
  for (; t-- && !(e[t][0] === "enter" && e[t][1].type === "htmlFlow"); )
    ;
  return t > 1 && e[t - 2][1].type === "linePrefix" && (e[t][1].start = e[t - 2][1].start, e[t + 1][1].start = e[t - 2][1].start, e.splice(t - 2, 2)), e;
}
function ng(e, t, n) {
  const r = this;
  let i, a, s, u, o;
  return c;
  function c(x) {
    return d(x);
  }
  function d(x) {
    return e.enter("htmlFlow"), e.enter("htmlFlowData"), e.consume(x), h;
  }
  function h(x) {
    return x === 33 ? (e.consume(x), p) : x === 47 ? (e.consume(x), a = !0, y) : x === 63 ? (e.consume(x), i = 3, r.interrupt ? t : E) : je(x) ? (e.consume(x), s = String.fromCharCode(x), C) : n(x);
  }
  function p(x) {
    return x === 45 ? (e.consume(x), i = 2, f) : x === 91 ? (e.consume(x), i = 5, u = 0, g) : je(x) ? (e.consume(x), i = 4, r.interrupt ? t : E) : n(x);
  }
  function f(x) {
    return x === 45 ? (e.consume(x), r.interrupt ? t : E) : n(x);
  }
  function g(x) {
    const Pe = "CDATA[";
    return x === Pe.charCodeAt(u++) ? (e.consume(x), u === Pe.length ? r.interrupt ? t : $ : g) : n(x);
  }
  function y(x) {
    return je(x) ? (e.consume(x), s = String.fromCharCode(x), C) : n(x);
  }
  function C(x) {
    if (x === null || x === 47 || x === 62 || be(x)) {
      const Pe = x === 47, de = s.toLowerCase();
      return !Pe && !a && Fs.includes(de) ? (i = 1, r.interrupt ? t(x) : $(x)) : X1.includes(s.toLowerCase()) ? (i = 6, Pe ? (e.consume(x), k) : r.interrupt ? t(x) : $(x)) : (i = 7, r.interrupt && !r.parser.lazy[r.now().line] ? n(x) : a ? I(x) : _(x));
    }
    return x === 45 || Be(x) ? (e.consume(x), s += String.fromCharCode(x), C) : n(x);
  }
  function k(x) {
    return x === 62 ? (e.consume(x), r.interrupt ? t : $) : n(x);
  }
  function I(x) {
    return ae(x) ? (e.consume(x), I) : w(x);
  }
  function _(x) {
    return x === 47 ? (e.consume(x), w) : x === 58 || x === 95 || je(x) ? (e.consume(x), v) : ae(x) ? (e.consume(x), _) : w(x);
  }
  function v(x) {
    return x === 45 || x === 46 || x === 58 || x === 95 || Be(x) ? (e.consume(x), v) : M(x);
  }
  function M(x) {
    return x === 61 ? (e.consume(x), S) : ae(x) ? (e.consume(x), M) : _(x);
  }
  function S(x) {
    return x === null || x === 60 || x === 61 || x === 62 || x === 96 ? n(x) : x === 34 || x === 39 ? (e.consume(x), o = x, B) : ae(x) ? (e.consume(x), S) : O(x);
  }
  function B(x) {
    return x === o ? (e.consume(x), o = null, j) : x === null || Q(x) ? n(x) : (e.consume(x), B);
  }
  function O(x) {
    return x === null || x === 34 || x === 39 || x === 47 || x === 60 || x === 61 || x === 62 || x === 96 || be(x) ? M(x) : (e.consume(x), O);
  }
  function j(x) {
    return x === 47 || x === 62 || ae(x) ? _(x) : n(x);
  }
  function w(x) {
    return x === 62 ? (e.consume(x), z) : n(x);
  }
  function z(x) {
    return x === null || Q(x) ? $(x) : ae(x) ? (e.consume(x), z) : n(x);
  }
  function $(x) {
    return x === 45 && i === 2 ? (e.consume(x), G) : x === 60 && i === 1 ? (e.consume(x), W) : x === 62 && i === 4 ? (e.consume(x), Le) : x === 63 && i === 3 ? (e.consume(x), E) : x === 93 && i === 5 ? (e.consume(x), Ne) : Q(x) && (i === 6 || i === 7) ? (e.exit("htmlFlowData"), e.check(J1, xe, X)(x)) : x === null || Q(x) ? (e.exit("htmlFlowData"), X(x)) : (e.consume(x), $);
  }
  function X(x) {
    return e.check(eg, V, xe)(x);
  }
  function V(x) {
    return e.enter("lineEnding"), e.consume(x), e.exit("lineEnding"), H;
  }
  function H(x) {
    return x === null || Q(x) ? X(x) : (e.enter("htmlFlowData"), $(x));
  }
  function G(x) {
    return x === 45 ? (e.consume(x), E) : $(x);
  }
  function W(x) {
    return x === 47 ? (e.consume(x), s = "", le) : $(x);
  }
  function le(x) {
    if (x === 62) {
      const Pe = s.toLowerCase();
      return Fs.includes(Pe) ? (e.consume(x), Le) : $(x);
    }
    return je(x) && s.length < 8 ? (e.consume(x), s += String.fromCharCode(x), le) : $(x);
  }
  function Ne(x) {
    return x === 93 ? (e.consume(x), E) : $(x);
  }
  function E(x) {
    return x === 62 ? (e.consume(x), Le) : x === 45 && i === 2 ? (e.consume(x), E) : $(x);
  }
  function Le(x) {
    return x === null || Q(x) ? (e.exit("htmlFlowData"), xe(x)) : (e.consume(x), Le);
  }
  function xe(x) {
    return e.exit("htmlFlow"), t(x);
  }
}
function rg(e, t, n) {
  const r = this;
  return i;
  function i(s) {
    return Q(s) ? (e.enter("lineEnding"), e.consume(s), e.exit("lineEnding"), a) : n(s);
  }
  function a(s) {
    return r.parser.lazy[r.now().line] ? n(s) : t(s);
  }
}
function ig(e, t, n) {
  return r;
  function r(i) {
    return e.enter("lineEnding"), e.consume(i), e.exit("lineEnding"), e.attempt(rr, t, n);
  }
}
const ag = {
  name: "htmlText",
  tokenize: sg
};
function sg(e, t, n) {
  const r = this;
  let i, a, s;
  return u;
  function u(E) {
    return e.enter("htmlText"), e.enter("htmlTextData"), e.consume(E), o;
  }
  function o(E) {
    return E === 33 ? (e.consume(E), c) : E === 47 ? (e.consume(E), M) : E === 63 ? (e.consume(E), _) : je(E) ? (e.consume(E), O) : n(E);
  }
  function c(E) {
    return E === 45 ? (e.consume(E), d) : E === 91 ? (e.consume(E), a = 0, g) : je(E) ? (e.consume(E), I) : n(E);
  }
  function d(E) {
    return E === 45 ? (e.consume(E), f) : n(E);
  }
  function h(E) {
    return E === null ? n(E) : E === 45 ? (e.consume(E), p) : Q(E) ? (s = h, W(E)) : (e.consume(E), h);
  }
  function p(E) {
    return E === 45 ? (e.consume(E), f) : h(E);
  }
  function f(E) {
    return E === 62 ? G(E) : E === 45 ? p(E) : h(E);
  }
  function g(E) {
    const Le = "CDATA[";
    return E === Le.charCodeAt(a++) ? (e.consume(E), a === Le.length ? y : g) : n(E);
  }
  function y(E) {
    return E === null ? n(E) : E === 93 ? (e.consume(E), C) : Q(E) ? (s = y, W(E)) : (e.consume(E), y);
  }
  function C(E) {
    return E === 93 ? (e.consume(E), k) : y(E);
  }
  function k(E) {
    return E === 62 ? G(E) : E === 93 ? (e.consume(E), k) : y(E);
  }
  function I(E) {
    return E === null || E === 62 ? G(E) : Q(E) ? (s = I, W(E)) : (e.consume(E), I);
  }
  function _(E) {
    return E === null ? n(E) : E === 63 ? (e.consume(E), v) : Q(E) ? (s = _, W(E)) : (e.consume(E), _);
  }
  function v(E) {
    return E === 62 ? G(E) : _(E);
  }
  function M(E) {
    return je(E) ? (e.consume(E), S) : n(E);
  }
  function S(E) {
    return E === 45 || Be(E) ? (e.consume(E), S) : B(E);
  }
  function B(E) {
    return Q(E) ? (s = B, W(E)) : ae(E) ? (e.consume(E), B) : G(E);
  }
  function O(E) {
    return E === 45 || Be(E) ? (e.consume(E), O) : E === 47 || E === 62 || be(E) ? j(E) : n(E);
  }
  function j(E) {
    return E === 47 ? (e.consume(E), G) : E === 58 || E === 95 || je(E) ? (e.consume(E), w) : Q(E) ? (s = j, W(E)) : ae(E) ? (e.consume(E), j) : G(E);
  }
  function w(E) {
    return E === 45 || E === 46 || E === 58 || E === 95 || Be(E) ? (e.consume(E), w) : z(E);
  }
  function z(E) {
    return E === 61 ? (e.consume(E), $) : Q(E) ? (s = z, W(E)) : ae(E) ? (e.consume(E), z) : j(E);
  }
  function $(E) {
    return E === null || E === 60 || E === 61 || E === 62 || E === 96 ? n(E) : E === 34 || E === 39 ? (e.consume(E), i = E, X) : Q(E) ? (s = $, W(E)) : ae(E) ? (e.consume(E), $) : (e.consume(E), V);
  }
  function X(E) {
    return E === i ? (e.consume(E), i = void 0, H) : E === null ? n(E) : Q(E) ? (s = X, W(E)) : (e.consume(E), X);
  }
  function V(E) {
    return E === null || E === 34 || E === 39 || E === 60 || E === 61 || E === 96 ? n(E) : E === 47 || E === 62 || be(E) ? j(E) : (e.consume(E), V);
  }
  function H(E) {
    return E === 47 || E === 62 || be(E) ? j(E) : n(E);
  }
  function G(E) {
    return E === 62 ? (e.consume(E), e.exit("htmlTextData"), e.exit("htmlText"), t) : n(E);
  }
  function W(E) {
    return e.exit("htmlTextData"), e.enter("lineEnding"), e.consume(E), e.exit("lineEnding"), le;
  }
  function le(E) {
    return ae(E) ? ue(e, Ne, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(E) : Ne(E);
  }
  function Ne(E) {
    return e.enter("htmlTextData"), s(E);
  }
}
const ma = {
  name: "labelEnd",
  resolveAll: cg,
  resolveTo: dg,
  tokenize: hg
}, ug = {
  tokenize: fg
}, og = {
  tokenize: pg
}, lg = {
  tokenize: mg
};
function cg(e) {
  let t = -1;
  const n = [];
  for (; ++t < e.length; ) {
    const r = e[t][1];
    if (n.push(e[t]), r.type === "labelImage" || r.type === "labelLink" || r.type === "labelEnd") {
      const i = r.type === "labelImage" ? 4 : 2;
      r.type = "data", t += i;
    }
  }
  return e.length !== n.length && Ze(e, 0, e.length, n), e;
}
function dg(e, t) {
  let n = e.length, r = 0, i, a, s, u;
  for (; n--; )
    if (i = e[n][1], a) {
      if (i.type === "link" || i.type === "labelLink" && i._inactive)
        break;
      e[n][0] === "enter" && i.type === "labelLink" && (i._inactive = !0);
    } else if (s) {
      if (e[n][0] === "enter" && (i.type === "labelImage" || i.type === "labelLink") && !i._balanced && (a = n, i.type !== "labelLink")) {
        r = 2;
        break;
      }
    } else i.type === "labelEnd" && (s = n);
  const o = {
    type: e[a][1].type === "labelLink" ? "link" : "image",
    start: {
      ...e[a][1].start
    },
    end: {
      ...e[e.length - 1][1].end
    }
  }, c = {
    type: "label",
    start: {
      ...e[a][1].start
    },
    end: {
      ...e[s][1].end
    }
  }, d = {
    type: "labelText",
    start: {
      ...e[a + r + 2][1].end
    },
    end: {
      ...e[s - 2][1].start
    }
  };
  return u = [["enter", o, t], ["enter", c, t]], u = nt(u, e.slice(a + 1, a + r + 3)), u = nt(u, [["enter", d, t]]), u = nt(u, Qr(t.parser.constructs.insideSpan.null, e.slice(a + r + 4, s - 3), t)), u = nt(u, [["exit", d, t], e[s - 2], e[s - 1], ["exit", c, t]]), u = nt(u, e.slice(s + 1)), u = nt(u, [["exit", o, t]]), Ze(e, a, e.length, u), e;
}
function hg(e, t, n) {
  const r = this;
  let i = r.events.length, a, s;
  for (; i--; )
    if ((r.events[i][1].type === "labelImage" || r.events[i][1].type === "labelLink") && !r.events[i][1]._balanced) {
      a = r.events[i][1];
      break;
    }
  return u;
  function u(p) {
    return a ? a._inactive ? h(p) : (s = r.parser.defined.includes(st(r.sliceSerialize({
      start: a.end,
      end: r.now()
    }))), e.enter("labelEnd"), e.enter("labelMarker"), e.consume(p), e.exit("labelMarker"), e.exit("labelEnd"), o) : n(p);
  }
  function o(p) {
    return p === 40 ? e.attempt(ug, d, s ? d : h)(p) : p === 91 ? e.attempt(og, d, s ? c : h)(p) : s ? d(p) : h(p);
  }
  function c(p) {
    return e.attempt(lg, d, h)(p);
  }
  function d(p) {
    return t(p);
  }
  function h(p) {
    return a._balanced = !0, n(p);
  }
}
function fg(e, t, n) {
  return r;
  function r(h) {
    return e.enter("resource"), e.enter("resourceMarker"), e.consume(h), e.exit("resourceMarker"), i;
  }
  function i(h) {
    return be(h) ? qn(e, a)(h) : a(h);
  }
  function a(h) {
    return h === 41 ? d(h) : Il(e, s, u, "resourceDestination", "resourceDestinationLiteral", "resourceDestinationLiteralMarker", "resourceDestinationRaw", "resourceDestinationString", 32)(h);
  }
  function s(h) {
    return be(h) ? qn(e, o)(h) : d(h);
  }
  function u(h) {
    return n(h);
  }
  function o(h) {
    return h === 34 || h === 39 || h === 40 ? Sl(e, c, n, "resourceTitle", "resourceTitleMarker", "resourceTitleString")(h) : d(h);
  }
  function c(h) {
    return be(h) ? qn(e, d)(h) : d(h);
  }
  function d(h) {
    return h === 41 ? (e.enter("resourceMarker"), e.consume(h), e.exit("resourceMarker"), e.exit("resource"), t) : n(h);
  }
}
function pg(e, t, n) {
  const r = this;
  return i;
  function i(u) {
    return Nl.call(r, e, a, s, "reference", "referenceMarker", "referenceString")(u);
  }
  function a(u) {
    return r.parser.defined.includes(st(r.sliceSerialize(r.events[r.events.length - 1][1]).slice(1, -1))) ? t(u) : n(u);
  }
  function s(u) {
    return n(u);
  }
}
function mg(e, t, n) {
  return r;
  function r(a) {
    return e.enter("reference"), e.enter("referenceMarker"), e.consume(a), e.exit("referenceMarker"), i;
  }
  function i(a) {
    return a === 93 ? (e.enter("referenceMarker"), e.consume(a), e.exit("referenceMarker"), e.exit("reference"), t) : n(a);
  }
}
const gg = {
  name: "labelStartImage",
  resolveAll: ma.resolveAll,
  tokenize: bg
};
function bg(e, t, n) {
  const r = this;
  return i;
  function i(u) {
    return e.enter("labelImage"), e.enter("labelImageMarker"), e.consume(u), e.exit("labelImageMarker"), a;
  }
  function a(u) {
    return u === 91 ? (e.enter("labelMarker"), e.consume(u), e.exit("labelMarker"), e.exit("labelImage"), s) : n(u);
  }
  function s(u) {
    return u === 94 && "_hiddenFootnoteSupport" in r.parser.constructs ? n(u) : t(u);
  }
}
const Eg = {
  name: "labelStartLink",
  resolveAll: ma.resolveAll,
  tokenize: Tg
};
function Tg(e, t, n) {
  const r = this;
  return i;
  function i(s) {
    return e.enter("labelLink"), e.enter("labelMarker"), e.consume(s), e.exit("labelMarker"), e.exit("labelLink"), a;
  }
  function a(s) {
    return s === 94 && "_hiddenFootnoteSupport" in r.parser.constructs ? n(s) : t(s);
  }
}
const ci = {
  name: "lineEnding",
  tokenize: kg
};
function kg(e, t) {
  return n;
  function n(r) {
    return e.enter("lineEnding"), e.consume(r), e.exit("lineEnding"), ue(e, t, "linePrefix");
  }
}
const xr = {
  name: "thematicBreak",
  tokenize: xg
};
function xg(e, t, n) {
  let r = 0, i;
  return a;
  function a(c) {
    return e.enter("thematicBreak"), s(c);
  }
  function s(c) {
    return i = c, u(c);
  }
  function u(c) {
    return c === i ? (e.enter("thematicBreakSequence"), o(c)) : r >= 3 && (c === null || Q(c)) ? (e.exit("thematicBreak"), t(c)) : n(c);
  }
  function o(c) {
    return c === i ? (e.consume(c), r++, o) : (e.exit("thematicBreakSequence"), ae(c) ? ue(e, u, "whitespace")(c) : u(c));
  }
}
const We = {
  continuation: {
    tokenize: Cg
  },
  exit: Ng,
  name: "list",
  tokenize: _g
}, yg = {
  partial: !0,
  tokenize: Sg
}, Ag = {
  partial: !0,
  tokenize: Ig
};
function _g(e, t, n) {
  const r = this, i = r.events[r.events.length - 1];
  let a = i && i[1].type === "linePrefix" ? i[2].sliceSerialize(i[1], !0).length : 0, s = 0;
  return u;
  function u(f) {
    const g = r.containerState.type || (f === 42 || f === 43 || f === 45 ? "listUnordered" : "listOrdered");
    if (g === "listUnordered" ? !r.containerState.marker || f === r.containerState.marker : Pi(f)) {
      if (r.containerState.type || (r.containerState.type = g, e.enter(g, {
        _container: !0
      })), g === "listUnordered")
        return e.enter("listItemPrefix"), f === 42 || f === 45 ? e.check(xr, n, c)(f) : c(f);
      if (!r.interrupt || f === 49)
        return e.enter("listItemPrefix"), e.enter("listItemValue"), o(f);
    }
    return n(f);
  }
  function o(f) {
    return Pi(f) && ++s < 10 ? (e.consume(f), o) : (!r.interrupt || s < 2) && (r.containerState.marker ? f === r.containerState.marker : f === 41 || f === 46) ? (e.exit("listItemValue"), c(f)) : n(f);
  }
  function c(f) {
    return e.enter("listItemMarker"), e.consume(f), e.exit("listItemMarker"), r.containerState.marker = r.containerState.marker || f, e.check(
      rr,
      // Can’t be empty when interrupting.
      r.interrupt ? n : d,
      e.attempt(yg, p, h)
    );
  }
  function d(f) {
    return r.containerState.initialBlankLine = !0, a++, p(f);
  }
  function h(f) {
    return ae(f) ? (e.enter("listItemPrefixWhitespace"), e.consume(f), e.exit("listItemPrefixWhitespace"), p) : n(f);
  }
  function p(f) {
    return r.containerState.size = a + r.sliceSerialize(e.exit("listItemPrefix"), !0).length, t(f);
  }
}
function Cg(e, t, n) {
  const r = this;
  return r.containerState._closeFlow = void 0, e.check(rr, i, a);
  function i(u) {
    return r.containerState.furtherBlankLines = r.containerState.furtherBlankLines || r.containerState.initialBlankLine, ue(e, t, "listItemIndent", r.containerState.size + 1)(u);
  }
  function a(u) {
    return r.containerState.furtherBlankLines || !ae(u) ? (r.containerState.furtherBlankLines = void 0, r.containerState.initialBlankLine = void 0, s(u)) : (r.containerState.furtherBlankLines = void 0, r.containerState.initialBlankLine = void 0, e.attempt(Ag, t, s)(u));
  }
  function s(u) {
    return r.containerState._closeFlow = !0, r.interrupt = void 0, ue(e, e.attempt(We, t, n), "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(u);
  }
}
function Ig(e, t, n) {
  const r = this;
  return ue(e, i, "listItemIndent", r.containerState.size + 1);
  function i(a) {
    const s = r.events[r.events.length - 1];
    return s && s[1].type === "listItemIndent" && s[2].sliceSerialize(s[1], !0).length === r.containerState.size ? t(a) : n(a);
  }
}
function Ng(e) {
  e.exit(this.containerState.type);
}
function Sg(e, t, n) {
  const r = this;
  return ue(e, i, "listItemPrefixWhitespace", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 5);
  function i(a) {
    const s = r.events[r.events.length - 1];
    return !ae(a) && s && s[1].type === "listItemPrefixWhitespace" ? t(a) : n(a);
  }
}
const Hs = {
  name: "setextUnderline",
  resolveTo: wg,
  tokenize: Lg
};
function wg(e, t) {
  let n = e.length, r, i, a;
  for (; n--; )
    if (e[n][0] === "enter") {
      if (e[n][1].type === "content") {
        r = n;
        break;
      }
      e[n][1].type === "paragraph" && (i = n);
    } else
      e[n][1].type === "content" && e.splice(n, 1), !a && e[n][1].type === "definition" && (a = n);
  const s = {
    type: "setextHeading",
    start: {
      ...e[r][1].start
    },
    end: {
      ...e[e.length - 1][1].end
    }
  };
  return e[i][1].type = "setextHeadingText", a ? (e.splice(i, 0, ["enter", s, t]), e.splice(a + 1, 0, ["exit", e[r][1], t]), e[r][1].end = {
    ...e[a][1].end
  }) : e[r][1] = s, e.push(["exit", s, t]), e;
}
function Lg(e, t, n) {
  const r = this;
  let i;
  return a;
  function a(c) {
    let d = r.events.length, h;
    for (; d--; )
      if (r.events[d][1].type !== "lineEnding" && r.events[d][1].type !== "linePrefix" && r.events[d][1].type !== "content") {
        h = r.events[d][1].type === "paragraph";
        break;
      }
    return !r.parser.lazy[r.now().line] && (r.interrupt || h) ? (e.enter("setextHeadingLine"), i = c, s(c)) : n(c);
  }
  function s(c) {
    return e.enter("setextHeadingLineSequence"), u(c);
  }
  function u(c) {
    return c === i ? (e.consume(c), u) : (e.exit("setextHeadingLineSequence"), ae(c) ? ue(e, o, "lineSuffix")(c) : o(c));
  }
  function o(c) {
    return c === null || Q(c) ? (e.exit("setextHeadingLine"), t(c)) : n(c);
  }
}
const Rg = {
  tokenize: Hg,
  partial: !0
};
function Og() {
  return {
    document: {
      91: {
        name: "gfmFootnoteDefinition",
        tokenize: vg,
        continuation: {
          tokenize: Bg
        },
        exit: Fg
      }
    },
    text: {
      91: {
        name: "gfmFootnoteCall",
        tokenize: Mg
      },
      93: {
        name: "gfmPotentialFootnoteCall",
        add: "after",
        tokenize: Dg,
        resolveTo: Pg
      }
    }
  };
}
function Dg(e, t, n) {
  const r = this;
  let i = r.events.length;
  const a = r.parser.gfmFootnotes || (r.parser.gfmFootnotes = []);
  let s;
  for (; i--; ) {
    const o = r.events[i][1];
    if (o.type === "labelImage") {
      s = o;
      break;
    }
    if (o.type === "gfmFootnoteCall" || o.type === "labelLink" || o.type === "label" || o.type === "image" || o.type === "link")
      break;
  }
  return u;
  function u(o) {
    if (!s || !s._balanced)
      return n(o);
    const c = st(r.sliceSerialize({
      start: s.end,
      end: r.now()
    }));
    return c.codePointAt(0) !== 94 || !a.includes(c.slice(1)) ? n(o) : (e.enter("gfmFootnoteCallLabelMarker"), e.consume(o), e.exit("gfmFootnoteCallLabelMarker"), t(o));
  }
}
function Pg(e, t) {
  let n = e.length;
  for (; n--; )
    if (e[n][1].type === "labelImage" && e[n][0] === "enter") {
      e[n][1];
      break;
    }
  e[n + 1][1].type = "data", e[n + 3][1].type = "gfmFootnoteCallLabelMarker";
  const r = {
    type: "gfmFootnoteCall",
    start: Object.assign({}, e[n + 3][1].start),
    end: Object.assign({}, e[e.length - 1][1].end)
  }, i = {
    type: "gfmFootnoteCallMarker",
    start: Object.assign({}, e[n + 3][1].end),
    end: Object.assign({}, e[n + 3][1].end)
  };
  i.end.column++, i.end.offset++, i.end._bufferIndex++;
  const a = {
    type: "gfmFootnoteCallString",
    start: Object.assign({}, i.end),
    end: Object.assign({}, e[e.length - 1][1].start)
  }, s = {
    type: "chunkString",
    contentType: "string",
    start: Object.assign({}, a.start),
    end: Object.assign({}, a.end)
  }, u = [
    // Take the `labelImageMarker` (now `data`, the `!`)
    e[n + 1],
    e[n + 2],
    ["enter", r, t],
    // The `[`
    e[n + 3],
    e[n + 4],
    // The `^`.
    ["enter", i, t],
    ["exit", i, t],
    // Everything in between.
    ["enter", a, t],
    ["enter", s, t],
    ["exit", s, t],
    ["exit", a, t],
    // The ending (`]`, properly parsed and labelled).
    e[e.length - 2],
    e[e.length - 1],
    ["exit", r, t]
  ];
  return e.splice(n, e.length - n + 1, ...u), e;
}
function Mg(e, t, n) {
  const r = this, i = r.parser.gfmFootnotes || (r.parser.gfmFootnotes = []);
  let a = 0, s;
  return u;
  function u(h) {
    return e.enter("gfmFootnoteCall"), e.enter("gfmFootnoteCallLabelMarker"), e.consume(h), e.exit("gfmFootnoteCallLabelMarker"), o;
  }
  function o(h) {
    return h !== 94 ? n(h) : (e.enter("gfmFootnoteCallMarker"), e.consume(h), e.exit("gfmFootnoteCallMarker"), e.enter("gfmFootnoteCallString"), e.enter("chunkString").contentType = "string", c);
  }
  function c(h) {
    if (
      // Too long.
      a > 999 || // Closing brace with nothing.
      h === 93 && !s || // Space or tab is not supported by GFM for some reason.
      // `\n` and `[` not being supported makes sense.
      h === null || h === 91 || be(h)
    )
      return n(h);
    if (h === 93) {
      e.exit("chunkString");
      const p = e.exit("gfmFootnoteCallString");
      return i.includes(st(r.sliceSerialize(p))) ? (e.enter("gfmFootnoteCallLabelMarker"), e.consume(h), e.exit("gfmFootnoteCallLabelMarker"), e.exit("gfmFootnoteCall"), t) : n(h);
    }
    return be(h) || (s = !0), a++, e.consume(h), h === 92 ? d : c;
  }
  function d(h) {
    return h === 91 || h === 92 || h === 93 ? (e.consume(h), a++, c) : c(h);
  }
}
function vg(e, t, n) {
  const r = this, i = r.parser.gfmFootnotes || (r.parser.gfmFootnotes = []);
  let a, s = 0, u;
  return o;
  function o(g) {
    return e.enter("gfmFootnoteDefinition")._container = !0, e.enter("gfmFootnoteDefinitionLabel"), e.enter("gfmFootnoteDefinitionLabelMarker"), e.consume(g), e.exit("gfmFootnoteDefinitionLabelMarker"), c;
  }
  function c(g) {
    return g === 94 ? (e.enter("gfmFootnoteDefinitionMarker"), e.consume(g), e.exit("gfmFootnoteDefinitionMarker"), e.enter("gfmFootnoteDefinitionLabelString"), e.enter("chunkString").contentType = "string", d) : n(g);
  }
  function d(g) {
    if (
      // Too long.
      s > 999 || // Closing brace with nothing.
      g === 93 && !u || // Space or tab is not supported by GFM for some reason.
      // `\n` and `[` not being supported makes sense.
      g === null || g === 91 || be(g)
    )
      return n(g);
    if (g === 93) {
      e.exit("chunkString");
      const y = e.exit("gfmFootnoteDefinitionLabelString");
      return a = st(r.sliceSerialize(y)), e.enter("gfmFootnoteDefinitionLabelMarker"), e.consume(g), e.exit("gfmFootnoteDefinitionLabelMarker"), e.exit("gfmFootnoteDefinitionLabel"), p;
    }
    return be(g) || (u = !0), s++, e.consume(g), g === 92 ? h : d;
  }
  function h(g) {
    return g === 91 || g === 92 || g === 93 ? (e.consume(g), s++, d) : d(g);
  }
  function p(g) {
    return g === 58 ? (e.enter("definitionMarker"), e.consume(g), e.exit("definitionMarker"), i.includes(a) || i.push(a), ue(e, f, "gfmFootnoteDefinitionWhitespace")) : n(g);
  }
  function f(g) {
    return t(g);
  }
}
function Bg(e, t, n) {
  return e.check(rr, t, e.attempt(Rg, t, n));
}
function Fg(e) {
  e.exit("gfmFootnoteDefinition");
}
function Hg(e, t, n) {
  const r = this;
  return ue(e, i, "gfmFootnoteDefinitionIndent", 5);
  function i(a) {
    const s = r.events[r.events.length - 1];
    return s && s[1].type === "gfmFootnoteDefinitionIndent" && s[2].sliceSerialize(s[1], !0).length === 4 ? t(a) : n(a);
  }
}
function Ug(e) {
  let n = (e || {}).singleTilde;
  const r = {
    name: "strikethrough",
    tokenize: a,
    resolveAll: i
  };
  return n == null && (n = !0), {
    text: {
      126: r
    },
    insideSpan: {
      null: [r]
    },
    attentionMarkers: {
      null: [126]
    }
  };
  function i(s, u) {
    let o = -1;
    for (; ++o < s.length; )
      if (s[o][0] === "enter" && s[o][1].type === "strikethroughSequenceTemporary" && s[o][1]._close) {
        let c = o;
        for (; c--; )
          if (s[c][0] === "exit" && s[c][1].type === "strikethroughSequenceTemporary" && s[c][1]._open && // If the sizes are the same:
          s[o][1].end.offset - s[o][1].start.offset === s[c][1].end.offset - s[c][1].start.offset) {
            s[o][1].type = "strikethroughSequence", s[c][1].type = "strikethroughSequence";
            const d = {
              type: "strikethrough",
              start: Object.assign({}, s[c][1].start),
              end: Object.assign({}, s[o][1].end)
            }, h = {
              type: "strikethroughText",
              start: Object.assign({}, s[c][1].end),
              end: Object.assign({}, s[o][1].start)
            }, p = [["enter", d, u], ["enter", s[c][1], u], ["exit", s[c][1], u], ["enter", h, u]], f = u.parser.constructs.insideSpan.null;
            f && Ze(p, p.length, 0, Qr(f, s.slice(c + 1, o), u)), Ze(p, p.length, 0, [["exit", h, u], ["enter", s[o][1], u], ["exit", s[o][1], u], ["exit", d, u]]), Ze(s, c - 1, o - c + 3, p), o = c + p.length - 2;
            break;
          }
      }
    for (o = -1; ++o < s.length; )
      s[o][1].type === "strikethroughSequenceTemporary" && (s[o][1].type = "data");
    return s;
  }
  function a(s, u, o) {
    const c = this.previous, d = this.events;
    let h = 0;
    return p;
    function p(g) {
      return c === 126 && d[d.length - 1][1].type !== "characterEscape" ? o(g) : (s.enter("strikethroughSequenceTemporary"), f(g));
    }
    function f(g) {
      const y = mn(c);
      if (g === 126)
        return h > 1 ? o(g) : (s.consume(g), h++, f);
      if (h < 2 && !n) return o(g);
      const C = s.exit("strikethroughSequenceTemporary"), k = mn(g);
      return C._open = !k || k === 2 && !!y, C._close = !y || y === 2 && !!k, u(g);
    }
  }
}
class zg {
  /**
   * Create a new edit map.
   */
  constructor() {
    this.map = [];
  }
  /**
   * Create an edit: a remove and/or add at a certain place.
   *
   * @param {number} index
   * @param {number} remove
   * @param {Array<Event>} add
   * @returns {undefined}
   */
  add(t, n, r) {
    $g(this, t, n, r);
  }
  // To do: add this when moving to `micromark`.
  // /**
  //  * Create an edit: but insert `add` before existing additions.
  //  *
  //  * @param {number} index
  //  * @param {number} remove
  //  * @param {Array<Event>} add
  //  * @returns {undefined}
  //  */
  // addBefore(index, remove, add) {
  //   addImplementation(this, index, remove, add, true)
  // }
  /**
   * Done, change the events.
   *
   * @param {Array<Event>} events
   * @returns {undefined}
   */
  consume(t) {
    if (this.map.sort(function(a, s) {
      return a[0] - s[0];
    }), this.map.length === 0)
      return;
    let n = this.map.length;
    const r = [];
    for (; n > 0; )
      n -= 1, r.push(t.slice(this.map[n][0] + this.map[n][1]), this.map[n][2]), t.length = this.map[n][0];
    r.push(t.slice()), t.length = 0;
    let i = r.pop();
    for (; i; ) {
      for (const a of i)
        t.push(a);
      i = r.pop();
    }
    this.map.length = 0;
  }
}
function $g(e, t, n, r) {
  let i = 0;
  if (!(n === 0 && r.length === 0)) {
    for (; i < e.map.length; ) {
      if (e.map[i][0] === t) {
        e.map[i][1] += n, e.map[i][2].push(...r);
        return;
      }
      i += 1;
    }
    e.map.push([t, n, r]);
  }
}
function jg(e, t) {
  let n = !1;
  const r = [];
  for (; t < e.length; ) {
    const i = e[t];
    if (n) {
      if (i[0] === "enter")
        i[1].type === "tableContent" && r.push(e[t + 1][1].type === "tableDelimiterMarker" ? "left" : "none");
      else if (i[1].type === "tableContent") {
        if (e[t - 1][1].type === "tableDelimiterMarker") {
          const a = r.length - 1;
          r[a] = r[a] === "left" ? "center" : "right";
        }
      } else if (i[1].type === "tableDelimiterRow")
        break;
    } else i[0] === "enter" && i[1].type === "tableDelimiterRow" && (n = !0);
    t += 1;
  }
  return r;
}
function Yg() {
  return {
    flow: {
      null: {
        name: "table",
        tokenize: qg,
        resolveAll: Vg
      }
    }
  };
}
function qg(e, t, n) {
  const r = this;
  let i = 0, a = 0, s;
  return u;
  function u(w) {
    let z = r.events.length - 1;
    for (; z > -1; ) {
      const V = r.events[z][1].type;
      if (V === "lineEnding" || // Note: markdown-rs uses `whitespace` instead of `linePrefix`
      V === "linePrefix") z--;
      else break;
    }
    const $ = z > -1 ? r.events[z][1].type : null, X = $ === "tableHead" || $ === "tableRow" ? S : o;
    return X === S && r.parser.lazy[r.now().line] ? n(w) : X(w);
  }
  function o(w) {
    return e.enter("tableHead"), e.enter("tableRow"), c(w);
  }
  function c(w) {
    return w === 124 || (s = !0, a += 1), d(w);
  }
  function d(w) {
    return w === null ? n(w) : Q(w) ? a > 1 ? (a = 0, r.interrupt = !0, e.exit("tableRow"), e.enter("lineEnding"), e.consume(w), e.exit("lineEnding"), f) : n(w) : ae(w) ? ue(e, d, "whitespace")(w) : (a += 1, s && (s = !1, i += 1), w === 124 ? (e.enter("tableCellDivider"), e.consume(w), e.exit("tableCellDivider"), s = !0, d) : (e.enter("data"), h(w)));
  }
  function h(w) {
    return w === null || w === 124 || be(w) ? (e.exit("data"), d(w)) : (e.consume(w), w === 92 ? p : h);
  }
  function p(w) {
    return w === 92 || w === 124 ? (e.consume(w), h) : h(w);
  }
  function f(w) {
    return r.interrupt = !1, r.parser.lazy[r.now().line] ? n(w) : (e.enter("tableDelimiterRow"), s = !1, ae(w) ? ue(e, g, "linePrefix", r.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(w) : g(w));
  }
  function g(w) {
    return w === 45 || w === 58 ? C(w) : w === 124 ? (s = !0, e.enter("tableCellDivider"), e.consume(w), e.exit("tableCellDivider"), y) : M(w);
  }
  function y(w) {
    return ae(w) ? ue(e, C, "whitespace")(w) : C(w);
  }
  function C(w) {
    return w === 58 ? (a += 1, s = !0, e.enter("tableDelimiterMarker"), e.consume(w), e.exit("tableDelimiterMarker"), k) : w === 45 ? (a += 1, k(w)) : w === null || Q(w) ? v(w) : M(w);
  }
  function k(w) {
    return w === 45 ? (e.enter("tableDelimiterFiller"), I(w)) : M(w);
  }
  function I(w) {
    return w === 45 ? (e.consume(w), I) : w === 58 ? (s = !0, e.exit("tableDelimiterFiller"), e.enter("tableDelimiterMarker"), e.consume(w), e.exit("tableDelimiterMarker"), _) : (e.exit("tableDelimiterFiller"), _(w));
  }
  function _(w) {
    return ae(w) ? ue(e, v, "whitespace")(w) : v(w);
  }
  function v(w) {
    return w === 124 ? g(w) : w === null || Q(w) ? !s || i !== a ? M(w) : (e.exit("tableDelimiterRow"), e.exit("tableHead"), t(w)) : M(w);
  }
  function M(w) {
    return n(w);
  }
  function S(w) {
    return e.enter("tableRow"), B(w);
  }
  function B(w) {
    return w === 124 ? (e.enter("tableCellDivider"), e.consume(w), e.exit("tableCellDivider"), B) : w === null || Q(w) ? (e.exit("tableRow"), t(w)) : ae(w) ? ue(e, B, "whitespace")(w) : (e.enter("data"), O(w));
  }
  function O(w) {
    return w === null || w === 124 || be(w) ? (e.exit("data"), B(w)) : (e.consume(w), w === 92 ? j : O);
  }
  function j(w) {
    return w === 92 || w === 124 ? (e.consume(w), O) : O(w);
  }
}
function Vg(e, t) {
  let n = -1, r = !0, i = 0, a = [0, 0, 0, 0], s = [0, 0, 0, 0], u = !1, o = 0, c, d, h;
  const p = new zg();
  for (; ++n < e.length; ) {
    const f = e[n], g = f[1];
    f[0] === "enter" ? g.type === "tableHead" ? (u = !1, o !== 0 && (Us(p, t, o, c, d), d = void 0, o = 0), c = {
      type: "table",
      start: Object.assign({}, g.start),
      // Note: correct end is set later.
      end: Object.assign({}, g.end)
    }, p.add(n, 0, [["enter", c, t]])) : g.type === "tableRow" || g.type === "tableDelimiterRow" ? (r = !0, h = void 0, a = [0, 0, 0, 0], s = [0, n + 1, 0, 0], u && (u = !1, d = {
      type: "tableBody",
      start: Object.assign({}, g.start),
      // Note: correct end is set later.
      end: Object.assign({}, g.end)
    }, p.add(n, 0, [["enter", d, t]])), i = g.type === "tableDelimiterRow" ? 2 : d ? 3 : 1) : i && (g.type === "data" || g.type === "tableDelimiterMarker" || g.type === "tableDelimiterFiller") ? (r = !1, s[2] === 0 && (a[1] !== 0 && (s[0] = s[1], h = cr(p, t, a, i, void 0, h), a = [0, 0, 0, 0]), s[2] = n)) : g.type === "tableCellDivider" && (r ? r = !1 : (a[1] !== 0 && (s[0] = s[1], h = cr(p, t, a, i, void 0, h)), a = s, s = [a[1], n, 0, 0])) : g.type === "tableHead" ? (u = !0, o = n) : g.type === "tableRow" || g.type === "tableDelimiterRow" ? (o = n, a[1] !== 0 ? (s[0] = s[1], h = cr(p, t, a, i, n, h)) : s[1] !== 0 && (h = cr(p, t, s, i, n, h)), i = 0) : i && (g.type === "data" || g.type === "tableDelimiterMarker" || g.type === "tableDelimiterFiller") && (s[3] = n);
  }
  for (o !== 0 && Us(p, t, o, c, d), p.consume(t.events), n = -1; ++n < t.events.length; ) {
    const f = t.events[n];
    f[0] === "enter" && f[1].type === "table" && (f[1]._align = jg(t.events, n));
  }
  return e;
}
function cr(e, t, n, r, i, a) {
  const s = r === 1 ? "tableHeader" : r === 2 ? "tableDelimiter" : "tableData", u = "tableContent";
  n[0] !== 0 && (a.end = Object.assign({}, cn(t.events, n[0])), e.add(n[0], 0, [["exit", a, t]]));
  const o = cn(t.events, n[1]);
  if (a = {
    type: s,
    start: Object.assign({}, o),
    // Note: correct end is set later.
    end: Object.assign({}, o)
  }, e.add(n[1], 0, [["enter", a, t]]), n[2] !== 0) {
    const c = cn(t.events, n[2]), d = cn(t.events, n[3]), h = {
      type: u,
      start: Object.assign({}, c),
      end: Object.assign({}, d)
    };
    if (e.add(n[2], 0, [["enter", h, t]]), r !== 2) {
      const p = t.events[n[2]], f = t.events[n[3]];
      if (p[1].end = Object.assign({}, f[1].end), p[1].type = "chunkText", p[1].contentType = "text", n[3] > n[2] + 1) {
        const g = n[2] + 1, y = n[3] - n[2] - 1;
        e.add(g, y, []);
      }
    }
    e.add(n[3] + 1, 0, [["exit", h, t]]);
  }
  return i !== void 0 && (a.end = Object.assign({}, cn(t.events, i)), e.add(i, 0, [["exit", a, t]]), a = void 0), a;
}
function Us(e, t, n, r, i) {
  const a = [], s = cn(t.events, n);
  i && (i.end = Object.assign({}, s), a.push(["exit", i, t])), r.end = Object.assign({}, s), a.push(["exit", r, t]), e.add(n + 1, 0, a);
}
function cn(e, t) {
  const n = e[t], r = n[0] === "enter" ? "start" : "end";
  return n[1][r];
}
const Wg = {
  name: "tasklistCheck",
  tokenize: Qg
};
function Gg() {
  return {
    text: {
      91: Wg
    }
  };
}
function Qg(e, t, n) {
  const r = this;
  return i;
  function i(o) {
    return (
      // Exit if there’s stuff before.
      r.previous !== null || // Exit if not in the first content that is the first child of a list
      // item.
      !r._gfmTasklistFirstContentOfListItem ? n(o) : (e.enter("taskListCheck"), e.enter("taskListCheckMarker"), e.consume(o), e.exit("taskListCheckMarker"), a)
    );
  }
  function a(o) {
    return be(o) ? (e.enter("taskListCheckValueUnchecked"), e.consume(o), e.exit("taskListCheckValueUnchecked"), s) : o === 88 || o === 120 ? (e.enter("taskListCheckValueChecked"), e.consume(o), e.exit("taskListCheckValueChecked"), s) : n(o);
  }
  function s(o) {
    return o === 93 ? (e.enter("taskListCheckMarker"), e.consume(o), e.exit("taskListCheckMarker"), e.exit("taskListCheck"), u) : n(o);
  }
  function u(o) {
    return Q(o) ? t(o) : ae(o) ? e.check({
      tokenize: Kg
    }, t, n)(o) : n(o);
  }
}
function Kg(e, t, n) {
  return ue(e, r, "whitespace");
  function r(i) {
    return i === null ? n(i) : t(i);
  }
}
function Xg(e) {
  return fl([
    u1(),
    Og(),
    Ug(e),
    Yg(),
    Gg()
  ]);
}
const Zg = {};
function Jg(e) {
  const t = (
    /** @type {Processor<Root>} */
    this
  ), n = e || Zg, r = t.data(), i = r.micromarkExtensions || (r.micromarkExtensions = []), a = r.fromMarkdownExtensions || (r.fromMarkdownExtensions = []), s = r.toMarkdownExtensions || (r.toMarkdownExtensions = []);
  i.push(Xg(n)), a.push(t1()), s.push(n1(n));
}
var eb = Object.defineProperty, tb = Object.defineProperties, nb = Object.getOwnPropertyDescriptors, zs = Object.getOwnPropertySymbols, rb = Object.prototype.hasOwnProperty, ib = Object.prototype.propertyIsEnumerable, $s = (e, t, n) => t in e ? eb(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n, wl = (e, t) => {
  for (var n in t || (t = {})) rb.call(t, n) && $s(e, n, t[n]);
  if (zs) for (var n of zs(t)) ib.call(t, n) && $s(e, n, t[n]);
  return e;
}, Ll = (e, t) => tb(e, nb(t)), ab = (e) => {
  let t = new Uint8Array(e.length + 1), n = !1, r = !1, i = 0;
  for (; i < e.length; ) {
    if (e[i] === "\\" && i + 1 < e.length && e[i + 1] === "`") {
      let a = n || r ? 1 : 0;
      t[i + 1] = a, t[i + 2] = a, i += 2;
      continue;
    }
    if (e.substring(i, i + 3) === "```") {
      r = !r;
      let a = n || r ? 1 : 0, s = Math.min(i + 3, e.length);
      for (let u = i + 1; u <= s; u += 1) t[u] = a;
      i = s;
      continue;
    }
    !r && e[i] === "`" && (n = !n), t[i + 1] = n || r ? 1 : 0, i += 1;
  }
  return t;
}, js = null, qe = (e, t) => {
  let n = js;
  return (n === null || n.text !== e) && (n = { text: e, lookup: ab(e) }, js = n), n.lookup[Math.min(t, e.length)] === 1;
}, sb = (e, t) => {
  let n = e.substring(t, t + 3) === "```", r = t > 0 && e.substring(t - 1, t + 2) === "```", i = t > 1 && e.substring(t - 2, t + 1) === "```";
  return n || r || i;
}, ub = (e) => {
  let t = 0;
  for (let n = 0; n < e.length; n += 1) {
    if (e[n] === "\\" && n + 1 < e.length && e[n + 1] === "`") {
      n += 1;
      continue;
    }
    e[n] === "`" && !sb(e, n) && (t += 1);
  }
  return t;
}, Mt = (e, t) => {
  let n = !1, r = !1, i = -1;
  for (let a = 0; a < e.length; a += 1) {
    if (e[a] === "\\" && a + 1 < e.length && e[a + 1] === "`") {
      a += 1;
      continue;
    }
    if (e.substring(a, a + 3) === "```") {
      r = !r, a += 2;
      continue;
    }
    if (!r && e[a] === "`") if (n) {
      if (i < t && t < a) return !0;
      n = !1, i = -1;
    } else n = !0, i = a;
  }
  return !1;
}, ob = /^(\s*(?:[-*+]|\d+[.)]) +)>(=?\s*[$]?\d)/gm, lb = (e) => !e || typeof e != "string" || !e.includes(">") ? e : e.replace(ob, (t, n, r, i) => qe(e, i) ? t : `${n}\\>${r}`), cb = /(\*\*)([^*]*\*?)$/, db = /(__)([^_]*?)$/, hb = /(\*\*\*)([^*]*?)$/, fb = /(\*)([^*]*?)$/, pb = /(_)([^_]*?)$/, mb = /(`)([^`]*?)$/, gb = /(~~)([^~]*?)$/, rn = /^[\s_~*`]*$/, Rl = /^[\s]*[-*+][\s]+$/, bb = /[\p{L}\p{N}_]/u, Eb = /^```[^`\n]*```?$/, Tb = /^\*{4,}$/, kb = /(__)([^_]+)_$/, xb = /(~~)([^~]+)~$/, Ys = /~~/g, At = (e) => {
  if (!e) return !1;
  let t = e.charCodeAt(0);
  return t >= 48 && t <= 57 || t >= 65 && t <= 90 || t >= 97 && t <= 122 || t === 95 ? !0 : bb.test(e);
}, yb = (e, t) => {
  let n = 1;
  for (let r = t - 1; r >= 0; r -= 1) if (e[r] === "]") n += 1;
  else if (e[r] === "[" && (n -= 1, n === 0)) return r;
  return -1;
}, Ol = (e, t) => {
  let n = 1;
  for (let r = t + 1; r < e.length; r += 1) if (e[r] === "[") n += 1;
  else if (e[r] === "]" && (n -= 1, n === 0)) return r;
  return -1;
}, Ab = (e) => e === "inlineLatex" || e === "blockLatex", _b = (e, t) => t === "[" && e === "none" ? "blockLatex" : t === "]" && e === "blockLatex" ? "none" : t === "(" && e === "none" ? "inlineLatex" : t === ")" && e === "inlineLatex" ? "none" : null, Cb = (e, t) => t ? e === "blockDollar" ? "none" : "blockDollar" : e === "blockDollar" ? e : e === "inlineDollar" ? "none" : "inlineDollar", Kr = (e, t) => {
  let n = "none";
  for (let r = 0; r < e.length && r < t; r += 1) {
    if (e[r] === "\\" && e[r + 1] === "$") {
      r += 1;
      continue;
    }
    if (e[r] === "\\") {
      let i = _b(n, e[r + 1]);
      if (i !== null) {
        n = i, r += 1;
        continue;
      }
    }
    if (e[r] === "$" && !Ab(n)) {
      let i = e[r + 1] === "$";
      n = Cb(n, i), i && (r += 1);
    }
  }
  return n !== "none";
}, Ib = (e, t) => {
  for (let n = t; n < e.length; n += 1) {
    if (e[n] === ")") return !0;
    if (e[n] === `
`) return !1;
  }
  return !1;
}, Dl = (e, t) => {
  for (let n = t - 1; n >= 0; n -= 1) {
    if (e[n] === ")") return !1;
    if (e[n] === "(") return n > 0 && e[n - 1] === "]" ? Ib(e, t) : !1;
    if (e[n] === `
`) return !1;
  }
  return !1;
}, Nb = (e, t) => {
  for (let n = t - 1; n >= 0; n -= 1) {
    if (e[n] === ">") return !1;
    if (e[n] === "<") {
      let r = n + 1 < e.length ? e[n + 1] : "";
      return r >= "a" && r <= "z" || r >= "A" && r <= "Z" || r === "/";
    }
    if (e[n] === `
`) return !1;
  }
  return !1;
}, ga = (e, t, n) => {
  let r = 0;
  for (let o = t - 1; o >= 0; o -= 1) if (e[o] === `
`) {
    r = o + 1;
    break;
  }
  let i = e.length;
  for (let o = t; o < e.length; o += 1) if (e[o] === `
`) {
    i = o;
    break;
  }
  let a = e.substring(r, i), s = 0, u = !1;
  for (let o of a) if (o === n) s += 1;
  else if (o !== " " && o !== "	") {
    u = !0;
    break;
  }
  return s >= 3 && !u;
}, Pl = (e) => e.includes("$") || e.includes("\\(") || e.includes("\\["), Sb = (e, t, n, r) => n === "\\" || Pl(e) && Kr(e, t) ? !0 : n !== "*" && r === "*" ? (t < e.length - 2 ? e[t + 2] : "") !== "*" : n === "*" || (!n || n === " " || n === "	" || n === `
`) && (!r || r === " " || r === "	" || r === `
`), Lr = (e) => e === " " || e === "	" || e === `
`, wb = (e, t) => !!(e && t && At(e) && At(t)), Lb = (e, t, n, r) => {
  let i = wb(e, t), a = !!t && !Lr(t), s = !!e && !Lr(e);
  return i && n % 2 === 0 && !r ? { count: !1 } : s && n % 2 === 1 || a ? { count: !0, inWordAsteriskChain: i } : { count: !1 };
}, Ml = (e) => {
  let t = 0, n = !1, r = !1, i = e.length;
  for (let a = 0; a < i; a += 1) {
    if (e[a] === "`" && a + 2 < i && e[a + 1] === "`" && e[a + 2] === "`") {
      n = !n, a += 2;
      continue;
    }
    if (n) continue;
    if (e[a] !== "*") {
      At(e[a]) || (r = !1);
      continue;
    }
    let s = a > 0 ? e[a - 1] : "", u = a < i - 1 ? e[a + 1] : "";
    if (Sb(e, a, s, u)) continue;
    let o = Lb(s, u, t, r);
    o.count && (t += 1, r = o.inWordAsteriskChain);
  }
  return t;
}, Rb = (e, t, n, r) => !!(n === "\\" || Pl(e) && Kr(e, t) || Dl(e, t) || Nb(e, t) || n === "_" || r === "_" || n && r && At(n) && At(r)), Ob = (e) => {
  let t = 0, n = !1, r = e.length;
  for (let i = 0; i < r; i += 1) {
    if (e[i] === "`" && i + 2 < r && e[i + 1] === "`" && e[i + 2] === "`") {
      n = !n, i += 2;
      continue;
    }
    if (n || e[i] !== "_") continue;
    let a = i > 0 ? e[i - 1] : "", s = i < r - 1 ? e[i + 1] : "";
    Rb(e, i, a, s) || (t += 1);
  }
  return t;
}, Db = (e) => {
  let t = 0, n = 0, r = !1;
  for (let i = 0; i < e.length; i += 1) {
    if (e[i] === "`" && i + 2 < e.length && e[i + 1] === "`" && e[i + 2] === "`") {
      n >= 3 && (t += Math.floor(n / 3)), n = 0, r = !r, i += 2;
      continue;
    }
    r || (e[i] === "*" ? n += 1 : (n >= 3 && (t += Math.floor(n / 3)), n = 0));
  }
  return n >= 3 && (t += Math.floor(n / 3)), t;
}, ba = (e) => {
  let t = 0, n = !1;
  for (let r = 0; r < e.length; r += 1) {
    if (e[r] === "`" && r + 2 < e.length && e[r + 1] === "`" && e[r + 2] === "`") {
      n = !n, r += 2;
      continue;
    }
    n || e[r] === "*" && r + 1 < e.length && e[r + 1] === "*" && (t += 1, r += 1);
  }
  return t;
}, qs = (e) => {
  let t = 0, n = !1;
  for (let r = 0; r < e.length; r += 1) {
    if (e[r] === "`" && r + 2 < e.length && e[r + 1] === "`" && e[r + 2] === "`") {
      n = !n, r += 2;
      continue;
    }
    n || e[r] === "_" && r + 1 < e.length && e[r + 1] === "_" && (t += 1, r += 1);
  }
  return t;
}, Pb = (e, t, n) => {
  if (!t || rn.test(t)) return !0;
  let r = e.substring(0, n).lastIndexOf(`
`), i = r === -1 ? 0 : r + 1, a = e.substring(i, n);
  return Rl.test(a) && t.includes(`
`) ? !0 : ga(e, n, "*");
}, Mb = (e) => {
  let t = e.match(cb);
  if (!t) return e;
  let n = t[2], r = e.lastIndexOf(t[1]);
  return qe(e, r) || Mt(e, r) || Pb(e, n, r) ? e : ba(e) % 2 === 1 ? n.endsWith("*") ? `${e}*` : `${e}**` : e;
}, vb = (e, t, n) => {
  if (!t || rn.test(t)) return !0;
  let r = e.substring(0, n).lastIndexOf(`
`), i = r === -1 ? 0 : r + 1, a = e.substring(i, n);
  return Rl.test(a) && t.includes(`
`) ? !0 : ga(e, n, "_");
}, Bb = (e) => {
  let t = e.match(db);
  if (!t) {
    let i = e.match(kb);
    if (i) {
      let a = e.lastIndexOf(i[1]);
      if (!(qe(e, a) || Mt(e, a)) && qs(e) % 2 === 1) return `${e}_`;
    }
    return e;
  }
  let n = t[2], r = e.lastIndexOf(t[1]);
  return qe(e, r) || Mt(e, r) || vb(e, n, r) ? e : qs(e) % 2 === 1 ? `${e}__` : e;
}, Fb = (e) => {
  let t = !1;
  for (let n = 0; n < e.length; n += 1) {
    if (e[n] === "`" && n + 2 < e.length && e[n + 1] === "`" && e[n + 2] === "`") {
      t = !t, n += 2;
      continue;
    }
    if (!t && e[n] === "*" && e[n - 1] !== "*" && e[n + 1] !== "*" && e[n - 1] !== "\\" && !Kr(e, n)) {
      let r = n > 0 ? e[n - 1] : "", i = n < e.length - 1 ? e[n + 1] : "", a = !r || Lr(r), s = !i || Lr(i);
      if (a && s || r && i && At(r) && At(i) || s) continue;
      return n;
    }
  }
  return -1;
}, Hb = (e) => {
  if (!e.match(fb)) return e;
  let t = Fb(e);
  if (t === -1 || qe(e, t) || Mt(e, t)) return e;
  let n = e.substring(t + 1);
  return !n || rn.test(n) ? e : Ml(e) % 2 === 1 ? `${e}*` : e;
}, vl = (e) => {
  let t = !1;
  for (let n = 0; n < e.length; n += 1) {
    if (e[n] === "`" && n + 2 < e.length && e[n + 1] === "`" && e[n + 2] === "`") {
      t = !t, n += 2;
      continue;
    }
    if (!t && e[n] === "_" && e[n - 1] !== "_" && e[n + 1] !== "_" && e[n - 1] !== "\\" && !Kr(e, n) && !Dl(e, n)) {
      let r = n > 0 ? e[n - 1] : "", i = n < e.length - 1 ? e[n + 1] : "";
      if (r && i && At(r) && At(i)) continue;
      return n;
    }
  }
  return -1;
}, Ub = (e) => {
  let t = e.length;
  for (; t > 0 && e[t - 1] === `
`; ) t -= 1;
  if (t < e.length) {
    let n = e.slice(0, t), r = e.slice(t);
    return `${n}_${r}`;
  }
  return `${e}_`;
}, zb = (e) => {
  if (!e.endsWith("**")) return null;
  let t = e.slice(0, -2);
  if (ba(t) % 2 !== 1) return null;
  let n = t.indexOf("**"), r = vl(t);
  return n !== -1 && r !== -1 && n < r ? `${t}_**` : null;
}, $b = (e) => {
  if (!e.match(pb)) return e;
  let t = vl(e);
  if (t === -1) return e;
  let n = e.substring(t + 1);
  if (!n || rn.test(n) || qe(e, t) || Mt(e, t)) return e;
  if (Ob(e) % 2 === 1) {
    let r = zb(e);
    return r !== null ? r : Ub(e);
  }
  return e;
}, jb = (e) => {
  let t = ba(e), n = Ml(e);
  return t % 2 === 0 && n % 2 === 0;
}, Yb = (e, t, n) => !t || rn.test(t) || qe(e, n) || Mt(e, n) ? !0 : ga(e, n, "*"), qb = (e) => {
  if (Tb.test(e)) return e;
  let t = e.match(hb);
  if (!t) return e;
  let n = t[2], r = e.lastIndexOf(t[1]);
  return Yb(e, n, r) ? e : Db(e) % 2 === 1 ? jb(e) ? e : `${e}***` : e;
}, Vb = /<[a-zA-Z/][^>]*$/, Wb = (e) => {
  let t = e.match(Vb);
  return !t || t.index === void 0 || qe(e, t.index) ? e : e.substring(0, t.index).trimEnd();
}, Gb = (e) => !e.match(Eb) || e.includes(`
`) ? null : e.endsWith("``") && !e.endsWith("```") ? `${e}\`` : e, Qb = (e) => (e.match(/```/g) || []).length % 2 === 1, Kb = (e) => {
  let t = Gb(e);
  if (t !== null) return t;
  let n = e.match(mb);
  if (n && !Qb(e)) {
    let r = n[2];
    if (!r || rn.test(r)) return e;
    if (ub(e) % 2 === 1) return `${e}\``;
  }
  return e;
}, Bl = (e, t) => t >= 2 && e.substring(t - 2, t + 1) === "```" || t >= 1 && e.substring(t - 1, t + 2) === "```" || t <= e.length - 3 && e.substring(t, t + 3) === "```", Xb = (e) => {
  let t = 0, n = !1;
  for (let r = 0; r < e.length - 1; r += 1) e[r] === "`" && !Bl(e, r) && (n = !n), !n && e[r] === "$" && e[r + 1] === "$" && (t += 1, r += 1);
  return t;
}, Zb = (e) => {
  let t = 0, n = !1;
  for (let r = 0; r < e.length; r += 1) {
    if (e[r] === "\\") {
      r += 1;
      continue;
    }
    if (e[r] === "`" && !Bl(e, r)) {
      n = !n;
      continue;
    }
    !n && e[r] === "$" && (r + 1 < e.length && e[r + 1] === "$" ? r += 1 : t += 1);
  }
  return t;
}, Jb = (e) => {
  if (e.endsWith("$") && !e.endsWith("$$")) return `${e}$`;
  let t = e.indexOf("$$");
  return t !== -1 && e.indexOf(`
`, t) !== -1 && !e.endsWith(`
`) ? `${e}
$$` : `${e}$$`;
}, eE = (e) => Xb(e) % 2 === 0 ? e : Jb(e), tE = (e) => Zb(e) % 2 === 1 ? `${e}$` : e, nE = (e, t, n) => {
  if (e.substring(t + 2).includes(")")) return null;
  let r = yb(e, t);
  if (r === -1 || qe(e, r)) return null;
  let i = r > 0 && e[r - 1] === "!", a = i ? r - 1 : r, s = e.substring(0, a);
  if (i) return s;
  let u = e.substring(r + 1, t);
  return n === "text-only" ? `${s}${u}` : `${s}[${u}](streamdown:incomplete-link)`;
}, Vs = (e, t) => {
  for (let n = 0; n < t; n++) if (e[n] === "[" && !qe(e, n)) {
    if (n > 0 && e[n - 1] === "!") continue;
    let r = Ol(e, n);
    if (r === -1) return n;
    if (r + 1 < e.length && e[r + 1] === "(") {
      let i = e.indexOf(")", r + 2);
      i !== -1 && (n = i);
    }
  }
  return t;
}, rE = (e, t, n) => {
  let r = t > 0 && e[t - 1] === "!", i = r ? t - 1 : t;
  if (!e.substring(t + 1).includes("]")) {
    let a = e.substring(0, i);
    if (r) return a;
    if (n === "text-only") {
      let s = Vs(e, t);
      return e.substring(0, s) + e.substring(s + 1);
    }
    return `${e}](streamdown:incomplete-link)`;
  }
  if (Ol(e, t) === -1) {
    let a = e.substring(0, i);
    if (r) return a;
    if (n === "text-only") {
      let s = Vs(e, t);
      return e.substring(0, s) + e.substring(s + 1);
    }
    return `${e}](streamdown:incomplete-link)`;
  }
  return null;
}, Fl = (e, t = "protocol") => {
  let n = e.lastIndexOf("](");
  if (n !== -1 && !qe(e, n)) {
    let r = nE(e, n, t);
    if (r !== null) return r;
  }
  for (let r = e.length - 1; r >= 0; r -= 1) if (e[r] === "[" && !qe(e, r)) {
    let i = rE(e, r, t);
    if (i !== null) return i;
  }
  return e;
}, iE = /^-{1,2}$/, aE = /^[\s]*-{1,2}[\s]+$/, sE = /^={1,2}$/, uE = /^[\s]*={1,2}[\s]+$/, oE = (e) => {
  if (!e || typeof e != "string") return e;
  let t = e.lastIndexOf(`
`);
  if (t === -1) return e;
  let n = e.substring(t + 1), r = e.substring(0, t), i = n.trim();
  if (iE.test(i) && !n.match(aE)) {
    let a = r.split(`
`).at(-1);
    if (a && a.trim().length > 0) return `${e}​`;
  }
  if (sE.test(i) && !n.match(uE)) {
    let a = r.split(`
`).at(-1);
    if (a && a.trim().length > 0) return `${e}​`;
  }
  return e;
}, lE = /([\p{L}\p{N}_])~(?!~)(?=[\p{L}\p{N}_])/gu, cE = (e) => !e || typeof e != "string" || !e.includes("~") ? e : e.replace(lE, (t, n, r) => {
  let i = r + n.length;
  return qe(e, i) ? t : `${n}\\~`;
}), dE = (e) => {
  var t, n;
  let r = e.match(gb);
  if (r) {
    let i = r[2];
    if (!i || rn.test(i)) return e;
    let a = e.lastIndexOf(r[1]);
    if (qe(e, a) || Mt(e, a)) return e;
    if (((t = e.match(Ys)) == null ? void 0 : t.length) % 2 === 1) return `${e}~~`;
  } else {
    let i = e.match(xb);
    if (i) {
      let a = e.lastIndexOf(i[0].slice(0, 2));
      if (qe(e, a) || Mt(e, a)) return e;
      if (((n = e.match(Ys)) == null ? void 0 : n.length) % 2 === 1) return `${e}~`;
    }
  }
  return e;
}, di = (e) => e !== !1, hE = (e) => e === !0, ze = { SINGLE_TILDE: 0, COMPARISON_OPERATORS: 5, HTML_TAGS: 10, SETEXT_HEADINGS: 15, LINKS: 20, BOLD_ITALIC: 30, BOLD: 35, ITALIC_DOUBLE_UNDERSCORE: 40, ITALIC_SINGLE_ASTERISK: 41, ITALIC_SINGLE_UNDERSCORE: 42, INLINE_CODE: 50, STRIKETHROUGH: 60, KATEX: 70, INLINE_KATEX: 75, DEFAULT: 100 }, fE = [{ handler: { name: "singleTilde", handle: cE, priority: ze.SINGLE_TILDE }, optionKey: "singleTilde" }, { handler: { name: "comparisonOperators", handle: lb, priority: ze.COMPARISON_OPERATORS }, optionKey: "comparisonOperators" }, { handler: { name: "htmlTags", handle: Wb, priority: ze.HTML_TAGS }, optionKey: "htmlTags" }, { handler: { name: "setextHeadings", handle: oE, priority: ze.SETEXT_HEADINGS }, optionKey: "setextHeadings" }, { handler: { name: "links", handle: Fl, priority: ze.LINKS }, optionKey: "links", earlyReturn: (e) => e.endsWith("](streamdown:incomplete-link)") }, { handler: { name: "boldItalic", handle: qb, priority: ze.BOLD_ITALIC }, optionKey: "boldItalic" }, { handler: { name: "bold", handle: Mb, priority: ze.BOLD }, optionKey: "bold" }, { handler: { name: "italicDoubleUnderscore", handle: Bb, priority: ze.ITALIC_DOUBLE_UNDERSCORE }, optionKey: "italic" }, { handler: { name: "italicSingleAsterisk", handle: Hb, priority: ze.ITALIC_SINGLE_ASTERISK }, optionKey: "italic" }, { handler: { name: "italicSingleUnderscore", handle: $b, priority: ze.ITALIC_SINGLE_UNDERSCORE }, optionKey: "italic" }, { handler: { name: "inlineCode", handle: Kb, priority: ze.INLINE_CODE }, optionKey: "inlineCode" }, { handler: { name: "strikethrough", handle: dE, priority: ze.STRIKETHROUGH }, optionKey: "strikethrough" }, { handler: { name: "katex", handle: eE, priority: ze.KATEX }, optionKey: "katex" }, { handler: { name: "inlineKatex", handle: tE, priority: ze.INLINE_KATEX }, optionKey: "inlineKatex" }], pE = (e) => {
  var t;
  let n = (t = e?.linkMode) != null ? t : "protocol";
  return fE.filter(({ handler: r, optionKey: i }) => r.name === "links" ? di(e?.links) || di(e?.images) : r.name === "inlineKatex" ? hE(e?.inlineKatex) : di(e?.[i])).map(({ handler: r, earlyReturn: i }) => r.name === "links" ? { handler: Ll(wl({}, r), { handle: (a) => Fl(a, n) }), earlyReturn: n === "protocol" ? i : void 0 } : { handler: r, earlyReturn: i });
}, mE = (e, t) => {
  var n;
  if (!e || typeof e != "string") return e;
  let r = e.endsWith(" ") && !e.endsWith("  ") ? e.slice(0, -1) : e, i = pE(t), a = ((n = t?.handlers) != null ? n : []).map((u) => {
    var o;
    return { handler: Ll(wl({}, u), { priority: (o = u.priority) != null ? o : ze.DEFAULT }), earlyReturn: void 0 };
  }), s = [...i, ...a].sort((u, o) => {
    var c, d;
    return ((c = u.handler.priority) != null ? c : 0) - ((d = o.handler.priority) != null ? d : 0);
  });
  for (let { handler: u, earlyReturn: o } of s) if (r = u.handle(r), o != null && o(r)) return r;
  return r;
}, gE = mE;
function Hl(e) {
  var t, n, r = "";
  if (typeof e == "string" || typeof e == "number") r += e;
  else if (typeof e == "object") if (Array.isArray(e)) {
    var i = e.length;
    for (t = 0; t < i; t++) e[t] && (n = Hl(e[t])) && (r && (r += " "), r += n);
  } else for (n in e) e[n] && (r && (r += " "), r += n);
  return r;
}
function Ul() {
  for (var e, t, n = 0, r = "", i = arguments.length; n < i; n++) (e = arguments[n]) && (t = Hl(e)) && (r && (r += " "), r += t);
  return r;
}
const bE = (e, t) => {
  const n = new Array(e.length + t.length);
  for (let r = 0; r < e.length; r++)
    n[r] = e[r];
  for (let r = 0; r < t.length; r++)
    n[e.length + r] = t[r];
  return n;
}, EE = (e, t) => ({
  classGroupId: e,
  validator: t
}), zl = (e = /* @__PURE__ */ new Map(), t = null, n) => ({
  nextPart: e,
  validators: t,
  classGroupId: n
}), Rr = "-", Ws = [], TE = "arbitrary..", kE = (e) => {
  const t = yE(e), {
    conflictingClassGroups: n,
    conflictingClassGroupModifiers: r
  } = e;
  return {
    getClassGroupId: (s) => {
      if (s.startsWith("[") && s.endsWith("]"))
        return xE(s);
      const u = s.split(Rr), o = u[0] === "" && u.length > 1 ? 1 : 0;
      return $l(u, o, t);
    },
    getConflictingClassGroupIds: (s, u) => {
      if (u) {
        const o = r[s], c = n[s];
        return o ? c ? bE(c, o) : o : c || Ws;
      }
      return n[s] || Ws;
    }
  };
}, $l = (e, t, n) => {
  if (e.length - t === 0)
    return n.classGroupId;
  const i = e[t], a = n.nextPart.get(i);
  if (a) {
    const c = $l(e, t + 1, a);
    if (c) return c;
  }
  const s = n.validators;
  if (s === null)
    return;
  const u = t === 0 ? e.join(Rr) : e.slice(t).join(Rr), o = s.length;
  for (let c = 0; c < o; c++) {
    const d = s[c];
    if (d.validator(u))
      return d.classGroupId;
  }
}, xE = (e) => e.slice(1, -1).indexOf(":") === -1 ? void 0 : (() => {
  const t = e.slice(1, -1), n = t.indexOf(":"), r = t.slice(0, n);
  return r ? TE + r : void 0;
})(), yE = (e) => {
  const {
    theme: t,
    classGroups: n
  } = e;
  return AE(n, t);
}, AE = (e, t) => {
  const n = zl();
  for (const r in e) {
    const i = e[r];
    Ea(i, n, r, t);
  }
  return n;
}, Ea = (e, t, n, r) => {
  const i = e.length;
  for (let a = 0; a < i; a++) {
    const s = e[a];
    _E(s, t, n, r);
  }
}, _E = (e, t, n, r) => {
  if (typeof e == "string") {
    CE(e, t, n);
    return;
  }
  if (typeof e == "function") {
    IE(e, t, n, r);
    return;
  }
  NE(e, t, n, r);
}, CE = (e, t, n) => {
  const r = e === "" ? t : jl(t, e);
  r.classGroupId = n;
}, IE = (e, t, n, r) => {
  if (SE(e)) {
    Ea(e(r), t, n, r);
    return;
  }
  t.validators === null && (t.validators = []), t.validators.push(EE(n, e));
}, NE = (e, t, n, r) => {
  const i = Object.entries(e), a = i.length;
  for (let s = 0; s < a; s++) {
    const [u, o] = i[s];
    Ea(o, jl(t, u), n, r);
  }
}, jl = (e, t) => {
  let n = e;
  const r = t.split(Rr), i = r.length;
  for (let a = 0; a < i; a++) {
    const s = r[a];
    let u = n.nextPart.get(s);
    u || (u = zl(), n.nextPart.set(s, u)), n = u;
  }
  return n;
}, SE = (e) => "isThemeGetter" in e && e.isThemeGetter === !0, wE = (e) => {
  if (e < 1)
    return {
      get: () => {
      },
      set: () => {
      }
    };
  let t = 0, n = /* @__PURE__ */ Object.create(null), r = /* @__PURE__ */ Object.create(null);
  const i = (a, s) => {
    n[a] = s, t++, t > e && (t = 0, r = n, n = /* @__PURE__ */ Object.create(null));
  };
  return {
    get(a) {
      let s = n[a];
      if (s !== void 0)
        return s;
      if ((s = r[a]) !== void 0)
        return i(a, s), s;
    },
    set(a, s) {
      a in n ? n[a] = s : i(a, s);
    }
  };
}, Bi = "!", Gs = ":", LE = [], Qs = (e, t, n, r, i) => ({
  modifiers: e,
  hasImportantModifier: t,
  baseClassName: n,
  maybePostfixModifierPosition: r,
  isExternal: i
}), RE = (e) => {
  const {
    prefix: t,
    experimentalParseClassName: n
  } = e;
  let r = (i) => {
    const a = [];
    let s = 0, u = 0, o = 0, c;
    const d = i.length;
    for (let y = 0; y < d; y++) {
      const C = i[y];
      if (s === 0 && u === 0) {
        if (C === Gs) {
          a.push(i.slice(o, y)), o = y + 1;
          continue;
        }
        if (C === "/") {
          c = y;
          continue;
        }
      }
      C === "[" ? s++ : C === "]" ? s-- : C === "(" ? u++ : C === ")" && u--;
    }
    const h = a.length === 0 ? i : i.slice(o);
    let p = h, f = !1;
    h.endsWith(Bi) ? (p = h.slice(0, -1), f = !0) : (
      /**
       * In Tailwind CSS v3 the important modifier was at the start of the base class name. This is still supported for legacy reasons.
       * @see https://github.com/dcastil/tailwind-merge/issues/513#issuecomment-2614029864
       */
      h.startsWith(Bi) && (p = h.slice(1), f = !0)
    );
    const g = c && c > o ? c - o : void 0;
    return Qs(a, f, p, g);
  };
  if (t) {
    const i = t + Gs, a = r;
    r = (s) => s.startsWith(i) ? a(s.slice(i.length)) : Qs(LE, !1, s, void 0, !0);
  }
  if (n) {
    const i = r;
    r = (a) => n({
      className: a,
      parseClassName: i
    });
  }
  return r;
}, OE = (e) => {
  const t = /* @__PURE__ */ new Map();
  return e.orderSensitiveModifiers.forEach((n, r) => {
    t.set(n, 1e6 + r);
  }), (n) => {
    const r = [];
    let i = [];
    for (let a = 0; a < n.length; a++) {
      const s = n[a], u = s[0] === "[", o = t.has(s);
      u || o ? (i.length > 0 && (i.sort(), r.push(...i), i = []), r.push(s)) : i.push(s);
    }
    return i.length > 0 && (i.sort(), r.push(...i)), r;
  };
}, DE = (e) => ({
  cache: wE(e.cacheSize),
  parseClassName: RE(e),
  sortModifiers: OE(e),
  postfixLookupClassGroupIds: PE(e),
  ...kE(e)
}), PE = (e) => {
  const t = /* @__PURE__ */ Object.create(null), n = e.postfixLookupClassGroups;
  if (n)
    for (let r = 0; r < n.length; r++)
      t[n[r]] = !0;
  return t;
}, ME = /\s+/, vE = (e, t) => {
  const {
    parseClassName: n,
    getClassGroupId: r,
    getConflictingClassGroupIds: i,
    sortModifiers: a,
    postfixLookupClassGroupIds: s
  } = t, u = [], o = e.trim().split(ME);
  let c = "";
  for (let d = o.length - 1; d >= 0; d -= 1) {
    const h = o[d], {
      isExternal: p,
      modifiers: f,
      hasImportantModifier: g,
      baseClassName: y,
      maybePostfixModifierPosition: C
    } = n(h);
    if (p) {
      c = h + (c.length > 0 ? " " + c : c);
      continue;
    }
    let k = !!C, I;
    if (k) {
      const B = y.substring(0, C);
      I = r(B);
      const O = I && s[I] ? r(y) : void 0;
      O && O !== I && (I = O, k = !1);
    } else
      I = r(y);
    if (!I) {
      if (!k) {
        c = h + (c.length > 0 ? " " + c : c);
        continue;
      }
      if (I = r(y), !I) {
        c = h + (c.length > 0 ? " " + c : c);
        continue;
      }
      k = !1;
    }
    const _ = f.length === 0 ? "" : f.length === 1 ? f[0] : a(f).join(":"), v = g ? _ + Bi : _, M = v + I;
    if (u.indexOf(M) > -1)
      continue;
    u.push(M);
    const S = i(I, k);
    for (let B = 0; B < S.length; ++B) {
      const O = S[B];
      u.push(v + O);
    }
    c = h + (c.length > 0 ? " " + c : c);
  }
  return c;
}, BE = (...e) => {
  let t = 0, n, r, i = "";
  for (; t < e.length; )
    (n = e[t++]) && (r = Yl(n)) && (i && (i += " "), i += r);
  return i;
}, Yl = (e) => {
  if (typeof e == "string")
    return e;
  let t, n = "";
  for (let r = 0; r < e.length; r++)
    e[r] && (t = Yl(e[r])) && (n && (n += " "), n += t);
  return n;
}, FE = (e, ...t) => {
  let n, r, i, a;
  const s = (o) => {
    const c = t.reduce((d, h) => h(d), e());
    return n = DE(c), r = n.cache.get, i = n.cache.set, a = u, u(o);
  }, u = (o) => {
    const c = r(o);
    if (c)
      return c;
    const d = vE(o, n);
    return i(o, d), d;
  };
  return a = s, (...o) => a(BE(...o));
}, HE = [], we = (e) => {
  const t = (n) => n[e] || HE;
  return t.isThemeGetter = !0, t;
}, ql = /^\[(?:(\w[\w-]*):)?(.+)\]$/i, Vl = /^\((?:(\w[\w-]*):)?(.+)\)$/i, UE = /^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/, zE = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/, $E = /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/, jE = /^(rgba?|hsla?|hwb|(ok)?(lab|lch)|color-mix)\(.+\)$/, YE = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/, qE = /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/, wt = (e) => UE.test(e), te = (e) => !!e && !Number.isNaN(Number(e)), ct = (e) => !!e && Number.isInteger(Number(e)), hi = (e) => e.endsWith("%") && te(e.slice(0, -1)), xt = (e) => zE.test(e), Wl = () => !0, VE = (e) => (
  // `colorFunctionRegex` check is necessary because color functions can have percentages in them which which would be incorrectly classified as lengths.
  // For example, `hsl(0 0% 0%)` would be classified as a length without this check.
  // I could also use lookbehind assertion in `lengthUnitRegex` but that isn't supported widely enough.
  $E.test(e) && !jE.test(e)
), Ta = () => !1, WE = (e) => YE.test(e), GE = (e) => qE.test(e), QE = (e) => !Y(e) && !q(e), KE = (e) => e.startsWith("@container") && (e[10] === "/" && e[11] !== void 0 || e[11] === "s" && e[16] !== void 0 && e.startsWith("-size/", 10) || e[11] === "n" && e[18] !== void 0 && e.startsWith("-normal/", 10)), XE = (e) => Ft(e, Kl, Ta), Y = (e) => ql.test(e), $t = (e) => Ft(e, Xl, VE), Ks = (e) => Ft(e, aT, te), ZE = (e) => Ft(e, Jl, Wl), JE = (e) => Ft(e, Zl, Ta), Xs = (e) => Ft(e, Gl, Ta), eT = (e) => Ft(e, Ql, GE), dr = (e) => Ft(e, ec, WE), q = (e) => Vl.test(e), Ln = (e) => an(e, Xl), tT = (e) => an(e, Zl), Zs = (e) => an(e, Gl), nT = (e) => an(e, Kl), rT = (e) => an(e, Ql), hr = (e) => an(e, ec, !0), iT = (e) => an(e, Jl, !0), Ft = (e, t, n) => {
  const r = ql.exec(e);
  return r ? r[1] ? t(r[1]) : n(r[2]) : !1;
}, an = (e, t, n = !1) => {
  const r = Vl.exec(e);
  return r ? r[1] ? t(r[1]) : n : !1;
}, Gl = (e) => e === "position" || e === "percentage", Ql = (e) => e === "image" || e === "url", Kl = (e) => e === "length" || e === "size" || e === "bg-size", Xl = (e) => e === "length", aT = (e) => e === "number", Zl = (e) => e === "family-name", Jl = (e) => e === "number" || e === "weight", ec = (e) => e === "shadow", sT = () => {
  const e = we("color"), t = we("font"), n = we("text"), r = we("font-weight"), i = we("tracking"), a = we("leading"), s = we("breakpoint"), u = we("container"), o = we("spacing"), c = we("radius"), d = we("shadow"), h = we("inset-shadow"), p = we("text-shadow"), f = we("drop-shadow"), g = we("blur"), y = we("perspective"), C = we("aspect"), k = we("ease"), I = we("animate"), _ = () => ["auto", "avoid", "all", "avoid-page", "page", "left", "right", "column"], v = () => [
    "center",
    "top",
    "bottom",
    "left",
    "right",
    "top-left",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "left-top",
    "top-right",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "right-top",
    "bottom-right",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "right-bottom",
    "bottom-left",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "left-bottom"
  ], M = () => [...v(), q, Y], S = () => ["auto", "hidden", "clip", "visible", "scroll"], B = () => ["auto", "contain", "none"], O = () => [q, Y, o], j = () => [wt, "full", "auto", ...O()], w = () => [ct, "none", "subgrid", q, Y], z = () => ["auto", {
    span: ["full", ct, q, Y]
  }, ct, q, Y], $ = () => [ct, "auto", q, Y], X = () => ["auto", "min", "max", "fr", q, Y], V = () => ["start", "end", "center", "between", "around", "evenly", "stretch", "baseline", "center-safe", "end-safe"], H = () => ["start", "end", "center", "stretch", "center-safe", "end-safe"], G = () => ["auto", ...O()], W = () => [wt, "auto", "full", "dvw", "dvh", "lvw", "lvh", "svw", "svh", "min", "max", "fit", ...O()], le = () => [wt, "screen", "full", "dvw", "lvw", "svw", "min", "max", "fit", ...O()], Ne = () => [wt, "screen", "full", "lh", "dvh", "lvh", "svh", "min", "max", "fit", ...O()], E = () => [e, q, Y], Le = () => [...v(), Zs, Xs, {
    position: [q, Y]
  }], xe = () => ["no-repeat", {
    repeat: ["", "x", "y", "space", "round"]
  }], x = () => ["auto", "cover", "contain", nT, XE, {
    size: [q, Y]
  }], Pe = () => [hi, Ln, $t], de = () => [
    // Deprecated since Tailwind CSS v4.0.0
    "",
    "none",
    "full",
    c,
    q,
    Y
  ], J = () => ["", te, Ln, $t], ve = () => ["solid", "dashed", "dotted", "double"], Se = () => ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"], he = () => [te, hi, Zs, Xs], Qe = () => [
    // Deprecated since Tailwind CSS v4.0.0
    "",
    "none",
    g,
    q,
    Y
  ], Je = () => ["none", te, q, Y], Ct = () => ["none", te, q, Y], It = () => [te, q, Y], Et = () => [wt, "full", ...O()];
  return {
    cacheSize: 500,
    theme: {
      animate: ["spin", "ping", "pulse", "bounce"],
      aspect: ["video"],
      blur: [xt],
      breakpoint: [xt],
      color: [Wl],
      container: [xt],
      "drop-shadow": [xt],
      ease: ["in", "out", "in-out"],
      font: [QE],
      "font-weight": ["thin", "extralight", "light", "normal", "medium", "semibold", "bold", "extrabold", "black"],
      "inset-shadow": [xt],
      leading: ["none", "tight", "snug", "normal", "relaxed", "loose"],
      perspective: ["dramatic", "near", "normal", "midrange", "distant", "none"],
      radius: [xt],
      shadow: [xt],
      spacing: ["px", te],
      text: [xt],
      "text-shadow": [xt],
      tracking: ["tighter", "tight", "normal", "wide", "wider", "widest"]
    },
    classGroups: {
      // --------------
      // --- Layout ---
      // --------------
      /**
       * Aspect Ratio
       * @see https://tailwindcss.com/docs/aspect-ratio
       */
      aspect: [{
        aspect: ["auto", "square", wt, Y, q, C]
      }],
      /**
       * Container
       * @see https://tailwindcss.com/docs/container
       * @deprecated since Tailwind CSS v4.0.0
       */
      container: ["container"],
      /**
       * Container Type
       * @see https://tailwindcss.com/docs/responsive-design#container-queries
       */
      "container-type": [{
        "@container": ["", "normal", "size", q, Y]
      }],
      /**
       * Container Name
       * @see https://tailwindcss.com/docs/responsive-design#named-containers
       */
      "container-named": [KE],
      /**
       * Columns
       * @see https://tailwindcss.com/docs/columns
       */
      columns: [{
        columns: [te, Y, q, u]
      }],
      /**
       * Break After
       * @see https://tailwindcss.com/docs/break-after
       */
      "break-after": [{
        "break-after": _()
      }],
      /**
       * Break Before
       * @see https://tailwindcss.com/docs/break-before
       */
      "break-before": [{
        "break-before": _()
      }],
      /**
       * Break Inside
       * @see https://tailwindcss.com/docs/break-inside
       */
      "break-inside": [{
        "break-inside": ["auto", "avoid", "avoid-page", "avoid-column"]
      }],
      /**
       * Box Decoration Break
       * @see https://tailwindcss.com/docs/box-decoration-break
       */
      "box-decoration": [{
        "box-decoration": ["slice", "clone"]
      }],
      /**
       * Box Sizing
       * @see https://tailwindcss.com/docs/box-sizing
       */
      box: [{
        box: ["border", "content"]
      }],
      /**
       * Display
       * @see https://tailwindcss.com/docs/display
       */
      display: ["block", "inline-block", "inline", "flex", "inline-flex", "table", "inline-table", "table-caption", "table-cell", "table-column", "table-column-group", "table-footer-group", "table-header-group", "table-row-group", "table-row", "flow-root", "grid", "inline-grid", "contents", "list-item", "hidden"],
      /**
       * Screen Reader Only
       * @see https://tailwindcss.com/docs/display#screen-reader-only
       */
      sr: ["sr-only", "not-sr-only"],
      /**
       * Floats
       * @see https://tailwindcss.com/docs/float
       */
      float: [{
        float: ["right", "left", "none", "start", "end"]
      }],
      /**
       * Clear
       * @see https://tailwindcss.com/docs/clear
       */
      clear: [{
        clear: ["left", "right", "both", "none", "start", "end"]
      }],
      /**
       * Isolation
       * @see https://tailwindcss.com/docs/isolation
       */
      isolation: ["isolate", "isolation-auto"],
      /**
       * Object Fit
       * @see https://tailwindcss.com/docs/object-fit
       */
      "object-fit": [{
        object: ["contain", "cover", "fill", "none", "scale-down"]
      }],
      /**
       * Object Position
       * @see https://tailwindcss.com/docs/object-position
       */
      "object-position": [{
        object: M()
      }],
      /**
       * Overflow
       * @see https://tailwindcss.com/docs/overflow
       */
      overflow: [{
        overflow: S()
      }],
      /**
       * Overflow X
       * @see https://tailwindcss.com/docs/overflow
       */
      "overflow-x": [{
        "overflow-x": S()
      }],
      /**
       * Overflow Y
       * @see https://tailwindcss.com/docs/overflow
       */
      "overflow-y": [{
        "overflow-y": S()
      }],
      /**
       * Overscroll Behavior
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      overscroll: [{
        overscroll: B()
      }],
      /**
       * Overscroll Behavior X
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      "overscroll-x": [{
        "overscroll-x": B()
      }],
      /**
       * Overscroll Behavior Y
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      "overscroll-y": [{
        "overscroll-y": B()
      }],
      /**
       * Position
       * @see https://tailwindcss.com/docs/position
       */
      position: ["static", "fixed", "absolute", "relative", "sticky"],
      /**
       * Inset
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      inset: [{
        inset: j()
      }],
      /**
       * Inset Inline
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-x": [{
        "inset-x": j()
      }],
      /**
       * Inset Block
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-y": [{
        "inset-y": j()
      }],
      /**
       * Inset Inline Start
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       * @todo class group will be renamed to `inset-s` in next major release
       */
      start: [{
        "inset-s": j(),
        /**
         * @deprecated since Tailwind CSS v4.2.0 in favor of `inset-s-*` utilities.
         * @see https://github.com/tailwindlabs/tailwindcss/pull/19613
         */
        start: j()
      }],
      /**
       * Inset Inline End
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       * @todo class group will be renamed to `inset-e` in next major release
       */
      end: [{
        "inset-e": j(),
        /**
         * @deprecated since Tailwind CSS v4.2.0 in favor of `inset-e-*` utilities.
         * @see https://github.com/tailwindlabs/tailwindcss/pull/19613
         */
        end: j()
      }],
      /**
       * Inset Block Start
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-bs": [{
        "inset-bs": j()
      }],
      /**
       * Inset Block End
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-be": [{
        "inset-be": j()
      }],
      /**
       * Top
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      top: [{
        top: j()
      }],
      /**
       * Right
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      right: [{
        right: j()
      }],
      /**
       * Bottom
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      bottom: [{
        bottom: j()
      }],
      /**
       * Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      left: [{
        left: j()
      }],
      /**
       * Visibility
       * @see https://tailwindcss.com/docs/visibility
       */
      visibility: ["visible", "invisible", "collapse"],
      /**
       * Z-Index
       * @see https://tailwindcss.com/docs/z-index
       */
      z: [{
        z: [ct, "auto", q, Y]
      }],
      // ------------------------
      // --- Flexbox and Grid ---
      // ------------------------
      /**
       * Flex Basis
       * @see https://tailwindcss.com/docs/flex-basis
       */
      basis: [{
        basis: [wt, "full", "auto", u, ...O()]
      }],
      /**
       * Flex Direction
       * @see https://tailwindcss.com/docs/flex-direction
       */
      "flex-direction": [{
        flex: ["row", "row-reverse", "col", "col-reverse"]
      }],
      /**
       * Flex Wrap
       * @see https://tailwindcss.com/docs/flex-wrap
       */
      "flex-wrap": [{
        flex: ["nowrap", "wrap", "wrap-reverse"]
      }],
      /**
       * Flex
       * @see https://tailwindcss.com/docs/flex
       */
      flex: [{
        flex: [te, wt, "auto", "initial", "none", Y]
      }],
      /**
       * Flex Grow
       * @see https://tailwindcss.com/docs/flex-grow
       */
      grow: [{
        grow: ["", te, q, Y]
      }],
      /**
       * Flex Shrink
       * @see https://tailwindcss.com/docs/flex-shrink
       */
      shrink: [{
        shrink: ["", te, q, Y]
      }],
      /**
       * Order
       * @see https://tailwindcss.com/docs/order
       */
      order: [{
        order: [ct, "first", "last", "none", q, Y]
      }],
      /**
       * Grid Template Columns
       * @see https://tailwindcss.com/docs/grid-template-columns
       */
      "grid-cols": [{
        "grid-cols": w()
      }],
      /**
       * Grid Column Start / End
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-start-end": [{
        col: z()
      }],
      /**
       * Grid Column Start
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-start": [{
        "col-start": $()
      }],
      /**
       * Grid Column End
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-end": [{
        "col-end": $()
      }],
      /**
       * Grid Template Rows
       * @see https://tailwindcss.com/docs/grid-template-rows
       */
      "grid-rows": [{
        "grid-rows": w()
      }],
      /**
       * Grid Row Start / End
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-start-end": [{
        row: z()
      }],
      /**
       * Grid Row Start
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-start": [{
        "row-start": $()
      }],
      /**
       * Grid Row End
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-end": [{
        "row-end": $()
      }],
      /**
       * Grid Auto Flow
       * @see https://tailwindcss.com/docs/grid-auto-flow
       */
      "grid-flow": [{
        "grid-flow": ["row", "col", "dense", "row-dense", "col-dense"]
      }],
      /**
       * Grid Auto Columns
       * @see https://tailwindcss.com/docs/grid-auto-columns
       */
      "auto-cols": [{
        "auto-cols": X()
      }],
      /**
       * Grid Auto Rows
       * @see https://tailwindcss.com/docs/grid-auto-rows
       */
      "auto-rows": [{
        "auto-rows": X()
      }],
      /**
       * Gap
       * @see https://tailwindcss.com/docs/gap
       */
      gap: [{
        gap: O()
      }],
      /**
       * Gap X
       * @see https://tailwindcss.com/docs/gap
       */
      "gap-x": [{
        "gap-x": O()
      }],
      /**
       * Gap Y
       * @see https://tailwindcss.com/docs/gap
       */
      "gap-y": [{
        "gap-y": O()
      }],
      /**
       * Justify Content
       * @see https://tailwindcss.com/docs/justify-content
       */
      "justify-content": [{
        justify: [...V(), "normal"]
      }],
      /**
       * Justify Items
       * @see https://tailwindcss.com/docs/justify-items
       */
      "justify-items": [{
        "justify-items": [...H(), "normal"]
      }],
      /**
       * Justify Self
       * @see https://tailwindcss.com/docs/justify-self
       */
      "justify-self": [{
        "justify-self": ["auto", ...H()]
      }],
      /**
       * Align Content
       * @see https://tailwindcss.com/docs/align-content
       */
      "align-content": [{
        content: ["normal", ...V()]
      }],
      /**
       * Align Items
       * @see https://tailwindcss.com/docs/align-items
       */
      "align-items": [{
        items: [...H(), {
          baseline: ["", "last"]
        }]
      }],
      /**
       * Align Self
       * @see https://tailwindcss.com/docs/align-self
       */
      "align-self": [{
        self: ["auto", ...H(), {
          baseline: ["", "last"]
        }]
      }],
      /**
       * Place Content
       * @see https://tailwindcss.com/docs/place-content
       */
      "place-content": [{
        "place-content": V()
      }],
      /**
       * Place Items
       * @see https://tailwindcss.com/docs/place-items
       */
      "place-items": [{
        "place-items": [...H(), "baseline"]
      }],
      /**
       * Place Self
       * @see https://tailwindcss.com/docs/place-self
       */
      "place-self": [{
        "place-self": ["auto", ...H()]
      }],
      // Spacing
      /**
       * Padding
       * @see https://tailwindcss.com/docs/padding
       */
      p: [{
        p: O()
      }],
      /**
       * Padding Inline
       * @see https://tailwindcss.com/docs/padding
       */
      px: [{
        px: O()
      }],
      /**
       * Padding Block
       * @see https://tailwindcss.com/docs/padding
       */
      py: [{
        py: O()
      }],
      /**
       * Padding Inline Start
       * @see https://tailwindcss.com/docs/padding
       */
      ps: [{
        ps: O()
      }],
      /**
       * Padding Inline End
       * @see https://tailwindcss.com/docs/padding
       */
      pe: [{
        pe: O()
      }],
      /**
       * Padding Block Start
       * @see https://tailwindcss.com/docs/padding
       */
      pbs: [{
        pbs: O()
      }],
      /**
       * Padding Block End
       * @see https://tailwindcss.com/docs/padding
       */
      pbe: [{
        pbe: O()
      }],
      /**
       * Padding Top
       * @see https://tailwindcss.com/docs/padding
       */
      pt: [{
        pt: O()
      }],
      /**
       * Padding Right
       * @see https://tailwindcss.com/docs/padding
       */
      pr: [{
        pr: O()
      }],
      /**
       * Padding Bottom
       * @see https://tailwindcss.com/docs/padding
       */
      pb: [{
        pb: O()
      }],
      /**
       * Padding Left
       * @see https://tailwindcss.com/docs/padding
       */
      pl: [{
        pl: O()
      }],
      /**
       * Margin
       * @see https://tailwindcss.com/docs/margin
       */
      m: [{
        m: G()
      }],
      /**
       * Margin Inline
       * @see https://tailwindcss.com/docs/margin
       */
      mx: [{
        mx: G()
      }],
      /**
       * Margin Block
       * @see https://tailwindcss.com/docs/margin
       */
      my: [{
        my: G()
      }],
      /**
       * Margin Inline Start
       * @see https://tailwindcss.com/docs/margin
       */
      ms: [{
        ms: G()
      }],
      /**
       * Margin Inline End
       * @see https://tailwindcss.com/docs/margin
       */
      me: [{
        me: G()
      }],
      /**
       * Margin Block Start
       * @see https://tailwindcss.com/docs/margin
       */
      mbs: [{
        mbs: G()
      }],
      /**
       * Margin Block End
       * @see https://tailwindcss.com/docs/margin
       */
      mbe: [{
        mbe: G()
      }],
      /**
       * Margin Top
       * @see https://tailwindcss.com/docs/margin
       */
      mt: [{
        mt: G()
      }],
      /**
       * Margin Right
       * @see https://tailwindcss.com/docs/margin
       */
      mr: [{
        mr: G()
      }],
      /**
       * Margin Bottom
       * @see https://tailwindcss.com/docs/margin
       */
      mb: [{
        mb: G()
      }],
      /**
       * Margin Left
       * @see https://tailwindcss.com/docs/margin
       */
      ml: [{
        ml: G()
      }],
      /**
       * Space Between X
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-x": [{
        "space-x": O()
      }],
      /**
       * Space Between X Reverse
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-x-reverse": ["space-x-reverse"],
      /**
       * Space Between Y
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-y": [{
        "space-y": O()
      }],
      /**
       * Space Between Y Reverse
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-y-reverse": ["space-y-reverse"],
      // --------------
      // --- Sizing ---
      // --------------
      /**
       * Size
       * @see https://tailwindcss.com/docs/width#setting-both-width-and-height
       */
      size: [{
        size: W()
      }],
      /**
       * Inline Size
       * @see https://tailwindcss.com/docs/width
       */
      "inline-size": [{
        inline: ["auto", ...le()]
      }],
      /**
       * Min-Inline Size
       * @see https://tailwindcss.com/docs/min-width
       */
      "min-inline-size": [{
        "min-inline": ["auto", ...le()]
      }],
      /**
       * Max-Inline Size
       * @see https://tailwindcss.com/docs/max-width
       */
      "max-inline-size": [{
        "max-inline": ["none", ...le()]
      }],
      /**
       * Block Size
       * @see https://tailwindcss.com/docs/height
       */
      "block-size": [{
        block: ["auto", ...Ne()]
      }],
      /**
       * Min-Block Size
       * @see https://tailwindcss.com/docs/min-height
       */
      "min-block-size": [{
        "min-block": ["auto", ...Ne()]
      }],
      /**
       * Max-Block Size
       * @see https://tailwindcss.com/docs/max-height
       */
      "max-block-size": [{
        "max-block": ["none", ...Ne()]
      }],
      /**
       * Width
       * @see https://tailwindcss.com/docs/width
       */
      w: [{
        w: [u, "screen", ...W()]
      }],
      /**
       * Min-Width
       * @see https://tailwindcss.com/docs/min-width
       */
      "min-w": [{
        "min-w": [
          u,
          "screen",
          /** Deprecated. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          "none",
          ...W()
        ]
      }],
      /**
       * Max-Width
       * @see https://tailwindcss.com/docs/max-width
       */
      "max-w": [{
        "max-w": [
          u,
          "screen",
          "none",
          /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          "prose",
          /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          {
            screen: [s]
          },
          ...W()
        ]
      }],
      /**
       * Height
       * @see https://tailwindcss.com/docs/height
       */
      h: [{
        h: ["screen", "lh", ...W()]
      }],
      /**
       * Min-Height
       * @see https://tailwindcss.com/docs/min-height
       */
      "min-h": [{
        "min-h": ["screen", "lh", "none", ...W()]
      }],
      /**
       * Max-Height
       * @see https://tailwindcss.com/docs/max-height
       */
      "max-h": [{
        "max-h": ["screen", "lh", ...W()]
      }],
      // ------------------
      // --- Typography ---
      // ------------------
      /**
       * Font Size
       * @see https://tailwindcss.com/docs/font-size
       */
      "font-size": [{
        text: ["base", n, Ln, $t]
      }],
      /**
       * Font Smoothing
       * @see https://tailwindcss.com/docs/font-smoothing
       */
      "font-smoothing": ["antialiased", "subpixel-antialiased"],
      /**
       * Font Style
       * @see https://tailwindcss.com/docs/font-style
       */
      "font-style": ["italic", "not-italic"],
      /**
       * Font Weight
       * @see https://tailwindcss.com/docs/font-weight
       */
      "font-weight": [{
        font: [r, iT, ZE]
      }],
      /**
       * Font Stretch
       * @see https://tailwindcss.com/docs/font-stretch
       */
      "font-stretch": [{
        "font-stretch": ["ultra-condensed", "extra-condensed", "condensed", "semi-condensed", "normal", "semi-expanded", "expanded", "extra-expanded", "ultra-expanded", hi, Y]
      }],
      /**
       * Font Family
       * @see https://tailwindcss.com/docs/font-family
       */
      "font-family": [{
        font: [tT, JE, t]
      }],
      /**
       * Font Feature Settings
       * @see https://tailwindcss.com/docs/font-feature-settings
       */
      "font-features": [{
        "font-features": [Y]
      }],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-normal": ["normal-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-ordinal": ["ordinal"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-slashed-zero": ["slashed-zero"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-figure": ["lining-nums", "oldstyle-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-spacing": ["proportional-nums", "tabular-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-fraction": ["diagonal-fractions", "stacked-fractions"],
      /**
       * Letter Spacing
       * @see https://tailwindcss.com/docs/letter-spacing
       */
      tracking: [{
        tracking: [i, q, Y]
      }],
      /**
       * Line Clamp
       * @see https://tailwindcss.com/docs/line-clamp
       */
      "line-clamp": [{
        "line-clamp": [te, "none", q, Ks]
      }],
      /**
       * Line Height
       * @see https://tailwindcss.com/docs/line-height
       */
      leading: [{
        leading: [
          /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          a,
          ...O()
        ]
      }],
      /**
       * List Style Image
       * @see https://tailwindcss.com/docs/list-style-image
       */
      "list-image": [{
        "list-image": ["none", q, Y]
      }],
      /**
       * List Style Position
       * @see https://tailwindcss.com/docs/list-style-position
       */
      "list-style-position": [{
        list: ["inside", "outside"]
      }],
      /**
       * List Style Type
       * @see https://tailwindcss.com/docs/list-style-type
       */
      "list-style-type": [{
        list: ["disc", "decimal", "none", q, Y]
      }],
      /**
       * Text Alignment
       * @see https://tailwindcss.com/docs/text-align
       */
      "text-alignment": [{
        text: ["left", "center", "right", "justify", "start", "end"]
      }],
      /**
       * Placeholder Color
       * @deprecated since Tailwind CSS v3.0.0
       * @see https://v3.tailwindcss.com/docs/placeholder-color
       */
      "placeholder-color": [{
        placeholder: E()
      }],
      /**
       * Text Color
       * @see https://tailwindcss.com/docs/text-color
       */
      "text-color": [{
        text: E()
      }],
      /**
       * Text Decoration
       * @see https://tailwindcss.com/docs/text-decoration
       */
      "text-decoration": ["underline", "overline", "line-through", "no-underline"],
      /**
       * Text Decoration Style
       * @see https://tailwindcss.com/docs/text-decoration-style
       */
      "text-decoration-style": [{
        decoration: [...ve(), "wavy"]
      }],
      /**
       * Text Decoration Thickness
       * @see https://tailwindcss.com/docs/text-decoration-thickness
       */
      "text-decoration-thickness": [{
        decoration: [te, "from-font", "auto", q, $t]
      }],
      /**
       * Text Decoration Color
       * @see https://tailwindcss.com/docs/text-decoration-color
       */
      "text-decoration-color": [{
        decoration: E()
      }],
      /**
       * Text Underline Offset
       * @see https://tailwindcss.com/docs/text-underline-offset
       */
      "underline-offset": [{
        "underline-offset": [te, "auto", q, Y]
      }],
      /**
       * Text Transform
       * @see https://tailwindcss.com/docs/text-transform
       */
      "text-transform": ["uppercase", "lowercase", "capitalize", "normal-case"],
      /**
       * Text Overflow
       * @see https://tailwindcss.com/docs/text-overflow
       */
      "text-overflow": ["truncate", "text-ellipsis", "text-clip"],
      /**
       * Text Wrap
       * @see https://tailwindcss.com/docs/text-wrap
       */
      "text-wrap": [{
        text: ["wrap", "nowrap", "balance", "pretty"]
      }],
      /**
       * Text Indent
       * @see https://tailwindcss.com/docs/text-indent
       */
      indent: [{
        indent: O()
      }],
      /**
       * Tab Size
       * @see https://tailwindcss.com/docs/tab-size
       */
      "tab-size": [{
        tab: [ct, q, Y]
      }],
      /**
       * Vertical Alignment
       * @see https://tailwindcss.com/docs/vertical-align
       */
      "vertical-align": [{
        align: ["baseline", "top", "middle", "bottom", "text-top", "text-bottom", "sub", "super", q, Y]
      }],
      /**
       * Whitespace
       * @see https://tailwindcss.com/docs/whitespace
       */
      whitespace: [{
        whitespace: ["normal", "nowrap", "pre", "pre-line", "pre-wrap", "break-spaces"]
      }],
      /**
       * Word Break
       * @see https://tailwindcss.com/docs/word-break
       */
      break: [{
        break: ["normal", "words", "all", "keep"]
      }],
      /**
       * Overflow Wrap
       * @see https://tailwindcss.com/docs/overflow-wrap
       */
      wrap: [{
        wrap: ["break-word", "anywhere", "normal"]
      }],
      /**
       * Hyphens
       * @see https://tailwindcss.com/docs/hyphens
       */
      hyphens: [{
        hyphens: ["none", "manual", "auto"]
      }],
      /**
       * Content
       * @see https://tailwindcss.com/docs/content
       */
      content: [{
        content: ["none", q, Y]
      }],
      // -------------------
      // --- Backgrounds ---
      // -------------------
      /**
       * Background Attachment
       * @see https://tailwindcss.com/docs/background-attachment
       */
      "bg-attachment": [{
        bg: ["fixed", "local", "scroll"]
      }],
      /**
       * Background Clip
       * @see https://tailwindcss.com/docs/background-clip
       */
      "bg-clip": [{
        "bg-clip": ["border", "padding", "content", "text"]
      }],
      /**
       * Background Origin
       * @see https://tailwindcss.com/docs/background-origin
       */
      "bg-origin": [{
        "bg-origin": ["border", "padding", "content"]
      }],
      /**
       * Background Position
       * @see https://tailwindcss.com/docs/background-position
       */
      "bg-position": [{
        bg: Le()
      }],
      /**
       * Background Repeat
       * @see https://tailwindcss.com/docs/background-repeat
       */
      "bg-repeat": [{
        bg: xe()
      }],
      /**
       * Background Size
       * @see https://tailwindcss.com/docs/background-size
       */
      "bg-size": [{
        bg: x()
      }],
      /**
       * Background Image
       * @see https://tailwindcss.com/docs/background-image
       */
      "bg-image": [{
        bg: ["none", {
          linear: [{
            to: ["t", "tr", "r", "br", "b", "bl", "l", "tl"]
          }, ct, q, Y],
          radial: ["", q, Y],
          conic: [ct, q, Y]
        }, rT, eT]
      }],
      /**
       * Background Color
       * @see https://tailwindcss.com/docs/background-color
       */
      "bg-color": [{
        bg: E()
      }],
      /**
       * Gradient Color Stops From Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-from-pos": [{
        from: Pe()
      }],
      /**
       * Gradient Color Stops Via Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-via-pos": [{
        via: Pe()
      }],
      /**
       * Gradient Color Stops To Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-to-pos": [{
        to: Pe()
      }],
      /**
       * Gradient Color Stops From
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-from": [{
        from: E()
      }],
      /**
       * Gradient Color Stops Via
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-via": [{
        via: E()
      }],
      /**
       * Gradient Color Stops To
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-to": [{
        to: E()
      }],
      // ---------------
      // --- Borders ---
      // ---------------
      /**
       * Border Radius
       * @see https://tailwindcss.com/docs/border-radius
       */
      rounded: [{
        rounded: de()
      }],
      /**
       * Border Radius Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-s": [{
        "rounded-s": de()
      }],
      /**
       * Border Radius End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-e": [{
        "rounded-e": de()
      }],
      /**
       * Border Radius Top
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-t": [{
        "rounded-t": de()
      }],
      /**
       * Border Radius Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-r": [{
        "rounded-r": de()
      }],
      /**
       * Border Radius Bottom
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-b": [{
        "rounded-b": de()
      }],
      /**
       * Border Radius Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-l": [{
        "rounded-l": de()
      }],
      /**
       * Border Radius Start Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-ss": [{
        "rounded-ss": de()
      }],
      /**
       * Border Radius Start End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-se": [{
        "rounded-se": de()
      }],
      /**
       * Border Radius End End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-ee": [{
        "rounded-ee": de()
      }],
      /**
       * Border Radius End Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-es": [{
        "rounded-es": de()
      }],
      /**
       * Border Radius Top Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-tl": [{
        "rounded-tl": de()
      }],
      /**
       * Border Radius Top Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-tr": [{
        "rounded-tr": de()
      }],
      /**
       * Border Radius Bottom Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-br": [{
        "rounded-br": de()
      }],
      /**
       * Border Radius Bottom Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-bl": [{
        "rounded-bl": de()
      }],
      /**
       * Border Width
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w": [{
        border: J()
      }],
      /**
       * Border Width Inline
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-x": [{
        "border-x": J()
      }],
      /**
       * Border Width Block
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-y": [{
        "border-y": J()
      }],
      /**
       * Border Width Inline Start
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-s": [{
        "border-s": J()
      }],
      /**
       * Border Width Inline End
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-e": [{
        "border-e": J()
      }],
      /**
       * Border Width Block Start
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-bs": [{
        "border-bs": J()
      }],
      /**
       * Border Width Block End
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-be": [{
        "border-be": J()
      }],
      /**
       * Border Width Top
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-t": [{
        "border-t": J()
      }],
      /**
       * Border Width Right
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-r": [{
        "border-r": J()
      }],
      /**
       * Border Width Bottom
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-b": [{
        "border-b": J()
      }],
      /**
       * Border Width Left
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-l": [{
        "border-l": J()
      }],
      /**
       * Divide Width X
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-x": [{
        "divide-x": J()
      }],
      /**
       * Divide Width X Reverse
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-x-reverse": ["divide-x-reverse"],
      /**
       * Divide Width Y
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-y": [{
        "divide-y": J()
      }],
      /**
       * Divide Width Y Reverse
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-y-reverse": ["divide-y-reverse"],
      /**
       * Border Style
       * @see https://tailwindcss.com/docs/border-style
       */
      "border-style": [{
        border: [...ve(), "hidden", "none"]
      }],
      /**
       * Divide Style
       * @see https://tailwindcss.com/docs/border-style#setting-the-divider-style
       */
      "divide-style": [{
        divide: [...ve(), "hidden", "none"]
      }],
      /**
       * Border Color
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color": [{
        border: E()
      }],
      /**
       * Border Color Inline
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-x": [{
        "border-x": E()
      }],
      /**
       * Border Color Block
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-y": [{
        "border-y": E()
      }],
      /**
       * Border Color Inline Start
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-s": [{
        "border-s": E()
      }],
      /**
       * Border Color Inline End
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-e": [{
        "border-e": E()
      }],
      /**
       * Border Color Block Start
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-bs": [{
        "border-bs": E()
      }],
      /**
       * Border Color Block End
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-be": [{
        "border-be": E()
      }],
      /**
       * Border Color Top
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-t": [{
        "border-t": E()
      }],
      /**
       * Border Color Right
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-r": [{
        "border-r": E()
      }],
      /**
       * Border Color Bottom
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-b": [{
        "border-b": E()
      }],
      /**
       * Border Color Left
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-l": [{
        "border-l": E()
      }],
      /**
       * Divide Color
       * @see https://tailwindcss.com/docs/divide-color
       */
      "divide-color": [{
        divide: E()
      }],
      /**
       * Outline Style
       * @see https://tailwindcss.com/docs/outline-style
       */
      "outline-style": [{
        outline: [...ve(), "none", "hidden"]
      }],
      /**
       * Outline Offset
       * @see https://tailwindcss.com/docs/outline-offset
       */
      "outline-offset": [{
        "outline-offset": [te, q, Y]
      }],
      /**
       * Outline Width
       * @see https://tailwindcss.com/docs/outline-width
       */
      "outline-w": [{
        outline: ["", te, Ln, $t]
      }],
      /**
       * Outline Color
       * @see https://tailwindcss.com/docs/outline-color
       */
      "outline-color": [{
        outline: E()
      }],
      // ---------------
      // --- Effects ---
      // ---------------
      /**
       * Box Shadow
       * @see https://tailwindcss.com/docs/box-shadow
       */
      shadow: [{
        shadow: [
          // Deprecated since Tailwind CSS v4.0.0
          "",
          "none",
          d,
          hr,
          dr
        ]
      }],
      /**
       * Box Shadow Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-shadow-color
       */
      "shadow-color": [{
        shadow: E()
      }],
      /**
       * Inset Box Shadow
       * @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-shadow
       */
      "inset-shadow": [{
        "inset-shadow": ["none", h, hr, dr]
      }],
      /**
       * Inset Box Shadow Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-shadow-color
       */
      "inset-shadow-color": [{
        "inset-shadow": E()
      }],
      /**
       * Ring Width
       * @see https://tailwindcss.com/docs/box-shadow#adding-a-ring
       */
      "ring-w": [{
        ring: J()
      }],
      /**
       * Ring Width Inset
       * @see https://v3.tailwindcss.com/docs/ring-width#inset-rings
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      "ring-w-inset": ["ring-inset"],
      /**
       * Ring Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-ring-color
       */
      "ring-color": [{
        ring: E()
      }],
      /**
       * Ring Offset Width
       * @see https://v3.tailwindcss.com/docs/ring-offset-width
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      "ring-offset-w": [{
        "ring-offset": [te, $t]
      }],
      /**
       * Ring Offset Color
       * @see https://v3.tailwindcss.com/docs/ring-offset-color
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      "ring-offset-color": [{
        "ring-offset": E()
      }],
      /**
       * Inset Ring Width
       * @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-ring
       */
      "inset-ring-w": [{
        "inset-ring": J()
      }],
      /**
       * Inset Ring Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-ring-color
       */
      "inset-ring-color": [{
        "inset-ring": E()
      }],
      /**
       * Text Shadow
       * @see https://tailwindcss.com/docs/text-shadow
       */
      "text-shadow": [{
        "text-shadow": ["none", p, hr, dr]
      }],
      /**
       * Text Shadow Color
       * @see https://tailwindcss.com/docs/text-shadow#setting-the-shadow-color
       */
      "text-shadow-color": [{
        "text-shadow": E()
      }],
      /**
       * Opacity
       * @see https://tailwindcss.com/docs/opacity
       */
      opacity: [{
        opacity: [te, q, Y]
      }],
      /**
       * Mix Blend Mode
       * @see https://tailwindcss.com/docs/mix-blend-mode
       */
      "mix-blend": [{
        "mix-blend": [...Se(), "plus-darker", "plus-lighter"]
      }],
      /**
       * Background Blend Mode
       * @see https://tailwindcss.com/docs/background-blend-mode
       */
      "bg-blend": [{
        "bg-blend": Se()
      }],
      /**
       * Mask Clip
       * @see https://tailwindcss.com/docs/mask-clip
       */
      "mask-clip": [{
        "mask-clip": ["border", "padding", "content", "fill", "stroke", "view"]
      }, "mask-no-clip"],
      /**
       * Mask Composite
       * @see https://tailwindcss.com/docs/mask-composite
       */
      "mask-composite": [{
        mask: ["add", "subtract", "intersect", "exclude"]
      }],
      /**
       * Mask Image
       * @see https://tailwindcss.com/docs/mask-image
       */
      "mask-image-linear-pos": [{
        "mask-linear": [te]
      }],
      "mask-image-linear-from-pos": [{
        "mask-linear-from": he()
      }],
      "mask-image-linear-to-pos": [{
        "mask-linear-to": he()
      }],
      "mask-image-linear-from-color": [{
        "mask-linear-from": E()
      }],
      "mask-image-linear-to-color": [{
        "mask-linear-to": E()
      }],
      "mask-image-t-from-pos": [{
        "mask-t-from": he()
      }],
      "mask-image-t-to-pos": [{
        "mask-t-to": he()
      }],
      "mask-image-t-from-color": [{
        "mask-t-from": E()
      }],
      "mask-image-t-to-color": [{
        "mask-t-to": E()
      }],
      "mask-image-r-from-pos": [{
        "mask-r-from": he()
      }],
      "mask-image-r-to-pos": [{
        "mask-r-to": he()
      }],
      "mask-image-r-from-color": [{
        "mask-r-from": E()
      }],
      "mask-image-r-to-color": [{
        "mask-r-to": E()
      }],
      "mask-image-b-from-pos": [{
        "mask-b-from": he()
      }],
      "mask-image-b-to-pos": [{
        "mask-b-to": he()
      }],
      "mask-image-b-from-color": [{
        "mask-b-from": E()
      }],
      "mask-image-b-to-color": [{
        "mask-b-to": E()
      }],
      "mask-image-l-from-pos": [{
        "mask-l-from": he()
      }],
      "mask-image-l-to-pos": [{
        "mask-l-to": he()
      }],
      "mask-image-l-from-color": [{
        "mask-l-from": E()
      }],
      "mask-image-l-to-color": [{
        "mask-l-to": E()
      }],
      "mask-image-x-from-pos": [{
        "mask-x-from": he()
      }],
      "mask-image-x-to-pos": [{
        "mask-x-to": he()
      }],
      "mask-image-x-from-color": [{
        "mask-x-from": E()
      }],
      "mask-image-x-to-color": [{
        "mask-x-to": E()
      }],
      "mask-image-y-from-pos": [{
        "mask-y-from": he()
      }],
      "mask-image-y-to-pos": [{
        "mask-y-to": he()
      }],
      "mask-image-y-from-color": [{
        "mask-y-from": E()
      }],
      "mask-image-y-to-color": [{
        "mask-y-to": E()
      }],
      "mask-image-radial": [{
        "mask-radial": [q, Y]
      }],
      "mask-image-radial-from-pos": [{
        "mask-radial-from": he()
      }],
      "mask-image-radial-to-pos": [{
        "mask-radial-to": he()
      }],
      "mask-image-radial-from-color": [{
        "mask-radial-from": E()
      }],
      "mask-image-radial-to-color": [{
        "mask-radial-to": E()
      }],
      "mask-image-radial-shape": [{
        "mask-radial": ["circle", "ellipse"]
      }],
      "mask-image-radial-size": [{
        "mask-radial": [{
          closest: ["side", "corner"],
          farthest: ["side", "corner"]
        }]
      }],
      "mask-image-radial-pos": [{
        "mask-radial-at": v()
      }],
      "mask-image-conic-pos": [{
        "mask-conic": [te]
      }],
      "mask-image-conic-from-pos": [{
        "mask-conic-from": he()
      }],
      "mask-image-conic-to-pos": [{
        "mask-conic-to": he()
      }],
      "mask-image-conic-from-color": [{
        "mask-conic-from": E()
      }],
      "mask-image-conic-to-color": [{
        "mask-conic-to": E()
      }],
      /**
       * Mask Mode
       * @see https://tailwindcss.com/docs/mask-mode
       */
      "mask-mode": [{
        mask: ["alpha", "luminance", "match"]
      }],
      /**
       * Mask Origin
       * @see https://tailwindcss.com/docs/mask-origin
       */
      "mask-origin": [{
        "mask-origin": ["border", "padding", "content", "fill", "stroke", "view"]
      }],
      /**
       * Mask Position
       * @see https://tailwindcss.com/docs/mask-position
       */
      "mask-position": [{
        mask: Le()
      }],
      /**
       * Mask Repeat
       * @see https://tailwindcss.com/docs/mask-repeat
       */
      "mask-repeat": [{
        mask: xe()
      }],
      /**
       * Mask Size
       * @see https://tailwindcss.com/docs/mask-size
       */
      "mask-size": [{
        mask: x()
      }],
      /**
       * Mask Type
       * @see https://tailwindcss.com/docs/mask-type
       */
      "mask-type": [{
        "mask-type": ["alpha", "luminance"]
      }],
      /**
       * Mask Image
       * @see https://tailwindcss.com/docs/mask-image
       */
      "mask-image": [{
        mask: ["none", q, Y]
      }],
      // ---------------
      // --- Filters ---
      // ---------------
      /**
       * Filter
       * @see https://tailwindcss.com/docs/filter
       */
      filter: [{
        filter: [
          // Deprecated since Tailwind CSS v3.0.0
          "",
          "none",
          q,
          Y
        ]
      }],
      /**
       * Blur
       * @see https://tailwindcss.com/docs/blur
       */
      blur: [{
        blur: Qe()
      }],
      /**
       * Brightness
       * @see https://tailwindcss.com/docs/brightness
       */
      brightness: [{
        brightness: [te, q, Y]
      }],
      /**
       * Contrast
       * @see https://tailwindcss.com/docs/contrast
       */
      contrast: [{
        contrast: [te, q, Y]
      }],
      /**
       * Drop Shadow
       * @see https://tailwindcss.com/docs/drop-shadow
       */
      "drop-shadow": [{
        "drop-shadow": [
          // Deprecated since Tailwind CSS v4.0.0
          "",
          "none",
          f,
          hr,
          dr
        ]
      }],
      /**
       * Drop Shadow Color
       * @see https://tailwindcss.com/docs/filter-drop-shadow#setting-the-shadow-color
       */
      "drop-shadow-color": [{
        "drop-shadow": E()
      }],
      /**
       * Grayscale
       * @see https://tailwindcss.com/docs/grayscale
       */
      grayscale: [{
        grayscale: ["", te, q, Y]
      }],
      /**
       * Hue Rotate
       * @see https://tailwindcss.com/docs/hue-rotate
       */
      "hue-rotate": [{
        "hue-rotate": [te, q, Y]
      }],
      /**
       * Invert
       * @see https://tailwindcss.com/docs/invert
       */
      invert: [{
        invert: ["", te, q, Y]
      }],
      /**
       * Saturate
       * @see https://tailwindcss.com/docs/saturate
       */
      saturate: [{
        saturate: [te, q, Y]
      }],
      /**
       * Sepia
       * @see https://tailwindcss.com/docs/sepia
       */
      sepia: [{
        sepia: ["", te, q, Y]
      }],
      /**
       * Backdrop Filter
       * @see https://tailwindcss.com/docs/backdrop-filter
       */
      "backdrop-filter": [{
        "backdrop-filter": [
          // Deprecated since Tailwind CSS v3.0.0
          "",
          "none",
          q,
          Y
        ]
      }],
      /**
       * Backdrop Blur
       * @see https://tailwindcss.com/docs/backdrop-blur
       */
      "backdrop-blur": [{
        "backdrop-blur": Qe()
      }],
      /**
       * Backdrop Brightness
       * @see https://tailwindcss.com/docs/backdrop-brightness
       */
      "backdrop-brightness": [{
        "backdrop-brightness": [te, q, Y]
      }],
      /**
       * Backdrop Contrast
       * @see https://tailwindcss.com/docs/backdrop-contrast
       */
      "backdrop-contrast": [{
        "backdrop-contrast": [te, q, Y]
      }],
      /**
       * Backdrop Grayscale
       * @see https://tailwindcss.com/docs/backdrop-grayscale
       */
      "backdrop-grayscale": [{
        "backdrop-grayscale": ["", te, q, Y]
      }],
      /**
       * Backdrop Hue Rotate
       * @see https://tailwindcss.com/docs/backdrop-hue-rotate
       */
      "backdrop-hue-rotate": [{
        "backdrop-hue-rotate": [te, q, Y]
      }],
      /**
       * Backdrop Invert
       * @see https://tailwindcss.com/docs/backdrop-invert
       */
      "backdrop-invert": [{
        "backdrop-invert": ["", te, q, Y]
      }],
      /**
       * Backdrop Opacity
       * @see https://tailwindcss.com/docs/backdrop-opacity
       */
      "backdrop-opacity": [{
        "backdrop-opacity": [te, q, Y]
      }],
      /**
       * Backdrop Saturate
       * @see https://tailwindcss.com/docs/backdrop-saturate
       */
      "backdrop-saturate": [{
        "backdrop-saturate": [te, q, Y]
      }],
      /**
       * Backdrop Sepia
       * @see https://tailwindcss.com/docs/backdrop-sepia
       */
      "backdrop-sepia": [{
        "backdrop-sepia": ["", te, q, Y]
      }],
      // --------------
      // --- Tables ---
      // --------------
      /**
       * Border Collapse
       * @see https://tailwindcss.com/docs/border-collapse
       */
      "border-collapse": [{
        border: ["collapse", "separate"]
      }],
      /**
       * Border Spacing
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing": [{
        "border-spacing": O()
      }],
      /**
       * Border Spacing X
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing-x": [{
        "border-spacing-x": O()
      }],
      /**
       * Border Spacing Y
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing-y": [{
        "border-spacing-y": O()
      }],
      /**
       * Table Layout
       * @see https://tailwindcss.com/docs/table-layout
       */
      "table-layout": [{
        table: ["auto", "fixed"]
      }],
      /**
       * Caption Side
       * @see https://tailwindcss.com/docs/caption-side
       */
      caption: [{
        caption: ["top", "bottom"]
      }],
      // ---------------------------------
      // --- Transitions and Animation ---
      // ---------------------------------
      /**
       * Transition Property
       * @see https://tailwindcss.com/docs/transition-property
       */
      transition: [{
        transition: ["", "all", "colors", "opacity", "shadow", "transform", "none", q, Y]
      }],
      /**
       * Transition Behavior
       * @see https://tailwindcss.com/docs/transition-behavior
       */
      "transition-behavior": [{
        transition: ["normal", "discrete"]
      }],
      /**
       * Transition Duration
       * @see https://tailwindcss.com/docs/transition-duration
       */
      duration: [{
        duration: [te, "initial", q, Y]
      }],
      /**
       * Transition Timing Function
       * @see https://tailwindcss.com/docs/transition-timing-function
       */
      ease: [{
        ease: ["linear", "initial", k, q, Y]
      }],
      /**
       * Transition Delay
       * @see https://tailwindcss.com/docs/transition-delay
       */
      delay: [{
        delay: [te, q, Y]
      }],
      /**
       * Animation
       * @see https://tailwindcss.com/docs/animation
       */
      animate: [{
        animate: ["none", I, q, Y]
      }],
      // ------------------
      // --- Transforms ---
      // ------------------
      /**
       * Backface Visibility
       * @see https://tailwindcss.com/docs/backface-visibility
       */
      backface: [{
        backface: ["hidden", "visible"]
      }],
      /**
       * Perspective
       * @see https://tailwindcss.com/docs/perspective
       */
      perspective: [{
        perspective: [y, q, Y]
      }],
      /**
       * Perspective Origin
       * @see https://tailwindcss.com/docs/perspective-origin
       */
      "perspective-origin": [{
        "perspective-origin": M()
      }],
      /**
       * Rotate
       * @see https://tailwindcss.com/docs/rotate
       */
      rotate: [{
        rotate: Je()
      }],
      /**
       * Rotate X
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-x": [{
        "rotate-x": Je()
      }],
      /**
       * Rotate Y
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-y": [{
        "rotate-y": Je()
      }],
      /**
       * Rotate Z
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-z": [{
        "rotate-z": Je()
      }],
      /**
       * Scale
       * @see https://tailwindcss.com/docs/scale
       */
      scale: [{
        scale: Ct()
      }],
      /**
       * Scale X
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-x": [{
        "scale-x": Ct()
      }],
      /**
       * Scale Y
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-y": [{
        "scale-y": Ct()
      }],
      /**
       * Scale Z
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-z": [{
        "scale-z": Ct()
      }],
      /**
       * Scale 3D
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-3d": ["scale-3d"],
      /**
       * Skew
       * @see https://tailwindcss.com/docs/skew
       */
      skew: [{
        skew: It()
      }],
      /**
       * Skew X
       * @see https://tailwindcss.com/docs/skew
       */
      "skew-x": [{
        "skew-x": It()
      }],
      /**
       * Skew Y
       * @see https://tailwindcss.com/docs/skew
       */
      "skew-y": [{
        "skew-y": It()
      }],
      /**
       * Transform
       * @see https://tailwindcss.com/docs/transform
       */
      transform: [{
        transform: [q, Y, "", "none", "gpu", "cpu"]
      }],
      /**
       * Transform Origin
       * @see https://tailwindcss.com/docs/transform-origin
       */
      "transform-origin": [{
        origin: M()
      }],
      /**
       * Transform Style
       * @see https://tailwindcss.com/docs/transform-style
       */
      "transform-style": [{
        transform: ["3d", "flat"]
      }],
      /**
       * Translate
       * @see https://tailwindcss.com/docs/translate
       */
      translate: [{
        translate: Et()
      }],
      /**
       * Translate X
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-x": [{
        "translate-x": Et()
      }],
      /**
       * Translate Y
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-y": [{
        "translate-y": Et()
      }],
      /**
       * Translate Z
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-z": [{
        "translate-z": Et()
      }],
      /**
       * Translate None
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-none": ["translate-none"],
      /**
       * Zoom
       * @see https://tailwindcss.com/docs/zoom
       */
      zoom: [{
        zoom: [ct, q, Y]
      }],
      // ---------------------
      // --- Interactivity ---
      // ---------------------
      /**
       * Accent Color
       * @see https://tailwindcss.com/docs/accent-color
       */
      accent: [{
        accent: E()
      }],
      /**
       * Appearance
       * @see https://tailwindcss.com/docs/appearance
       */
      appearance: [{
        appearance: ["none", "auto"]
      }],
      /**
       * Caret Color
       * @see https://tailwindcss.com/docs/just-in-time-mode#caret-color-utilities
       */
      "caret-color": [{
        caret: E()
      }],
      /**
       * Color Scheme
       * @see https://tailwindcss.com/docs/color-scheme
       */
      "color-scheme": [{
        scheme: ["normal", "dark", "light", "light-dark", "only-dark", "only-light"]
      }],
      /**
       * Cursor
       * @see https://tailwindcss.com/docs/cursor
       */
      cursor: [{
        cursor: ["auto", "default", "pointer", "wait", "text", "move", "help", "not-allowed", "none", "context-menu", "progress", "cell", "crosshair", "vertical-text", "alias", "copy", "no-drop", "grab", "grabbing", "all-scroll", "col-resize", "row-resize", "n-resize", "e-resize", "s-resize", "w-resize", "ne-resize", "nw-resize", "se-resize", "sw-resize", "ew-resize", "ns-resize", "nesw-resize", "nwse-resize", "zoom-in", "zoom-out", q, Y]
      }],
      /**
       * Field Sizing
       * @see https://tailwindcss.com/docs/field-sizing
       */
      "field-sizing": [{
        "field-sizing": ["fixed", "content"]
      }],
      /**
       * Pointer Events
       * @see https://tailwindcss.com/docs/pointer-events
       */
      "pointer-events": [{
        "pointer-events": ["auto", "none"]
      }],
      /**
       * Resize
       * @see https://tailwindcss.com/docs/resize
       */
      resize: [{
        resize: ["none", "", "y", "x"]
      }],
      /**
       * Scroll Behavior
       * @see https://tailwindcss.com/docs/scroll-behavior
       */
      "scroll-behavior": [{
        scroll: ["auto", "smooth"]
      }],
      /**
       * Scrollbar Thumb Color
       * @see https://tailwindcss.com/docs/scrollbar-color
       */
      "scrollbar-thumb-color": [{
        "scrollbar-thumb": E()
      }],
      /**
       * Scrollbar Track Color
       * @see https://tailwindcss.com/docs/scrollbar-color
       */
      "scrollbar-track-color": [{
        "scrollbar-track": E()
      }],
      /**
       * Scrollbar Gutter
       * @see https://tailwindcss.com/docs/scrollbar-gutter
       */
      "scrollbar-gutter": [{
        "scrollbar-gutter": ["auto", "stable", "both"]
      }],
      /**
       * Scrollbar Width
       * @see https://tailwindcss.com/docs/scrollbar-width
       */
      "scrollbar-w": [{
        scrollbar: ["auto", "thin", "none"]
      }],
      /**
       * Scroll Margin
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-m": [{
        "scroll-m": O()
      }],
      /**
       * Scroll Margin Inline
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mx": [{
        "scroll-mx": O()
      }],
      /**
       * Scroll Margin Block
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-my": [{
        "scroll-my": O()
      }],
      /**
       * Scroll Margin Inline Start
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-ms": [{
        "scroll-ms": O()
      }],
      /**
       * Scroll Margin Inline End
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-me": [{
        "scroll-me": O()
      }],
      /**
       * Scroll Margin Block Start
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mbs": [{
        "scroll-mbs": O()
      }],
      /**
       * Scroll Margin Block End
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mbe": [{
        "scroll-mbe": O()
      }],
      /**
       * Scroll Margin Top
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mt": [{
        "scroll-mt": O()
      }],
      /**
       * Scroll Margin Right
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mr": [{
        "scroll-mr": O()
      }],
      /**
       * Scroll Margin Bottom
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mb": [{
        "scroll-mb": O()
      }],
      /**
       * Scroll Margin Left
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-ml": [{
        "scroll-ml": O()
      }],
      /**
       * Scroll Padding
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-p": [{
        "scroll-p": O()
      }],
      /**
       * Scroll Padding Inline
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-px": [{
        "scroll-px": O()
      }],
      /**
       * Scroll Padding Block
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-py": [{
        "scroll-py": O()
      }],
      /**
       * Scroll Padding Inline Start
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-ps": [{
        "scroll-ps": O()
      }],
      /**
       * Scroll Padding Inline End
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pe": [{
        "scroll-pe": O()
      }],
      /**
       * Scroll Padding Block Start
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pbs": [{
        "scroll-pbs": O()
      }],
      /**
       * Scroll Padding Block End
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pbe": [{
        "scroll-pbe": O()
      }],
      /**
       * Scroll Padding Top
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pt": [{
        "scroll-pt": O()
      }],
      /**
       * Scroll Padding Right
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pr": [{
        "scroll-pr": O()
      }],
      /**
       * Scroll Padding Bottom
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pb": [{
        "scroll-pb": O()
      }],
      /**
       * Scroll Padding Left
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pl": [{
        "scroll-pl": O()
      }],
      /**
       * Scroll Snap Align
       * @see https://tailwindcss.com/docs/scroll-snap-align
       */
      "snap-align": [{
        snap: ["start", "end", "center", "align-none"]
      }],
      /**
       * Scroll Snap Stop
       * @see https://tailwindcss.com/docs/scroll-snap-stop
       */
      "snap-stop": [{
        snap: ["normal", "always"]
      }],
      /**
       * Scroll Snap Type
       * @see https://tailwindcss.com/docs/scroll-snap-type
       */
      "snap-type": [{
        snap: ["none", "x", "y", "both"]
      }],
      /**
       * Scroll Snap Type Strictness
       * @see https://tailwindcss.com/docs/scroll-snap-type
       */
      "snap-strictness": [{
        snap: ["mandatory", "proximity"]
      }],
      /**
       * Touch Action
       * @see https://tailwindcss.com/docs/touch-action
       */
      touch: [{
        touch: ["auto", "none", "manipulation"]
      }],
      /**
       * Touch Action X
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-x": [{
        "touch-pan": ["x", "left", "right"]
      }],
      /**
       * Touch Action Y
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-y": [{
        "touch-pan": ["y", "up", "down"]
      }],
      /**
       * Touch Action Pinch Zoom
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-pz": ["touch-pinch-zoom"],
      /**
       * User Select
       * @see https://tailwindcss.com/docs/user-select
       */
      select: [{
        select: ["none", "text", "all", "auto"]
      }],
      /**
       * Will Change
       * @see https://tailwindcss.com/docs/will-change
       */
      "will-change": [{
        "will-change": ["auto", "scroll", "contents", "transform", q, Y]
      }],
      // -----------
      // --- SVG ---
      // -----------
      /**
       * Fill
       * @see https://tailwindcss.com/docs/fill
       */
      fill: [{
        fill: ["none", ...E()]
      }],
      /**
       * Stroke Width
       * @see https://tailwindcss.com/docs/stroke-width
       */
      "stroke-w": [{
        stroke: [te, Ln, $t, Ks]
      }],
      /**
       * Stroke
       * @see https://tailwindcss.com/docs/stroke
       */
      stroke: [{
        stroke: ["none", ...E()]
      }],
      // ---------------------
      // --- Accessibility ---
      // ---------------------
      /**
       * Forced Color Adjust
       * @see https://tailwindcss.com/docs/forced-color-adjust
       */
      "forced-color-adjust": [{
        "forced-color-adjust": ["auto", "none"]
      }]
    },
    conflictingClassGroups: {
      "container-named": ["container-type"],
      overflow: ["overflow-x", "overflow-y"],
      overscroll: ["overscroll-x", "overscroll-y"],
      inset: ["inset-x", "inset-y", "inset-bs", "inset-be", "start", "end", "top", "right", "bottom", "left"],
      "inset-x": ["right", "left"],
      "inset-y": ["top", "bottom"],
      flex: ["basis", "grow", "shrink"],
      gap: ["gap-x", "gap-y"],
      p: ["px", "py", "ps", "pe", "pbs", "pbe", "pt", "pr", "pb", "pl"],
      px: ["pr", "pl"],
      py: ["pt", "pb"],
      m: ["mx", "my", "ms", "me", "mbs", "mbe", "mt", "mr", "mb", "ml"],
      mx: ["mr", "ml"],
      my: ["mt", "mb"],
      size: ["w", "h"],
      "font-size": ["leading"],
      "fvn-normal": ["fvn-ordinal", "fvn-slashed-zero", "fvn-figure", "fvn-spacing", "fvn-fraction"],
      "fvn-ordinal": ["fvn-normal"],
      "fvn-slashed-zero": ["fvn-normal"],
      "fvn-figure": ["fvn-normal"],
      "fvn-spacing": ["fvn-normal"],
      "fvn-fraction": ["fvn-normal"],
      "line-clamp": ["display", "overflow"],
      rounded: ["rounded-s", "rounded-e", "rounded-t", "rounded-r", "rounded-b", "rounded-l", "rounded-ss", "rounded-se", "rounded-ee", "rounded-es", "rounded-tl", "rounded-tr", "rounded-br", "rounded-bl"],
      "rounded-s": ["rounded-ss", "rounded-es"],
      "rounded-e": ["rounded-se", "rounded-ee"],
      "rounded-t": ["rounded-tl", "rounded-tr"],
      "rounded-r": ["rounded-tr", "rounded-br"],
      "rounded-b": ["rounded-br", "rounded-bl"],
      "rounded-l": ["rounded-tl", "rounded-bl"],
      "border-spacing": ["border-spacing-x", "border-spacing-y"],
      "border-w": ["border-w-x", "border-w-y", "border-w-s", "border-w-e", "border-w-bs", "border-w-be", "border-w-t", "border-w-r", "border-w-b", "border-w-l"],
      "border-w-x": ["border-w-r", "border-w-l"],
      "border-w-y": ["border-w-t", "border-w-b"],
      "border-color": ["border-color-x", "border-color-y", "border-color-s", "border-color-e", "border-color-bs", "border-color-be", "border-color-t", "border-color-r", "border-color-b", "border-color-l"],
      "border-color-x": ["border-color-r", "border-color-l"],
      "border-color-y": ["border-color-t", "border-color-b"],
      translate: ["translate-x", "translate-y", "translate-none"],
      "translate-none": ["translate", "translate-x", "translate-y", "translate-z"],
      "scroll-m": ["scroll-mx", "scroll-my", "scroll-ms", "scroll-me", "scroll-mbs", "scroll-mbe", "scroll-mt", "scroll-mr", "scroll-mb", "scroll-ml"],
      "scroll-mx": ["scroll-mr", "scroll-ml"],
      "scroll-my": ["scroll-mt", "scroll-mb"],
      "scroll-p": ["scroll-px", "scroll-py", "scroll-ps", "scroll-pe", "scroll-pbs", "scroll-pbe", "scroll-pt", "scroll-pr", "scroll-pb", "scroll-pl"],
      "scroll-px": ["scroll-pr", "scroll-pl"],
      "scroll-py": ["scroll-pt", "scroll-pb"],
      touch: ["touch-x", "touch-y", "touch-pz"],
      "touch-x": ["touch"],
      "touch-y": ["touch"],
      "touch-pz": ["touch"]
    },
    conflictingClassGroupModifiers: {
      "font-size": ["leading"]
    },
    postfixLookupClassGroups: ["container-type"],
    orderSensitiveModifiers: ["*", "**", "after", "backdrop", "before", "details-content", "file", "first-letter", "first-line", "marker", "placeholder", "selection"]
  };
}, tc = /* @__PURE__ */ FE(sT);
function nc(e, t, n, r) {
  const { children: i, ...a } = t ?? {};
  return n !== void 0 && (a.key = n), i === void 0 ? Er.createElement(e, a) : r && Array.isArray(i) ? Er.createElement(e, a, ...i) : Er.createElement(e, a, i);
}
function A(e, t, n) {
  return nc(e, t, n, !1);
}
function re(e, t, n) {
  return nc(e, t, n, !0);
}
const pt = Er.Fragment, uT = /^[$_\p{ID_Start}][$_\u{200C}\u{200D}\p{ID_Continue}]*$/u, oT = /^[$_\p{ID_Start}][-$_\u{200C}\u{200D}\p{ID_Continue}]*$/u, lT = {};
function Js(e, t) {
  return (lT.jsx ? oT : uT).test(e);
}
const cT = /[ \t\n\f\r]/g;
function dT(e) {
  return typeof e == "object" ? e.type === "text" ? eu(e.value) : !1 : eu(e);
}
function eu(e) {
  return e.replace(cT, "") === "";
}
var ln = {}, fi, tu;
function hT() {
  if (tu) return fi;
  tu = 1;
  var e = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//g, t = /\n/g, n = /^\s*/, r = /^(\*?[-#/*\\\w]+(\[[0-9a-z_-]+\])?)\s*/, i = /^:\s*/, a = /^((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^)]*?\)|[^};])+)/, s = /^[;\s]*/, u = /^\s+|\s+$/g, o = `
`, c = "/", d = "*", h = "", p = "comment", f = "declaration";
  function g(C, k) {
    if (typeof C != "string")
      throw new TypeError("First argument must be a string");
    if (!C) return [];
    k = k || {};
    var I = 1, _ = 1;
    function v(V) {
      var H = V.match(t);
      H && (I += H.length);
      var G = V.lastIndexOf(o);
      _ = ~G ? V.length - G : _ + V.length;
    }
    function M() {
      var V = { line: I, column: _ };
      return function(H) {
        return H.position = new S(V), j(), H;
      };
    }
    function S(V) {
      this.start = V, this.end = { line: I, column: _ }, this.source = k.source;
    }
    S.prototype.content = C;
    function B(V) {
      var H = new Error(
        k.source + ":" + I + ":" + _ + ": " + V
      );
      if (H.reason = V, H.filename = k.source, H.line = I, H.column = _, H.source = C, !k.silent) throw H;
    }
    function O(V) {
      var H = V.exec(C);
      if (H) {
        var G = H[0];
        return v(G), C = C.slice(G.length), H;
      }
    }
    function j() {
      O(n);
    }
    function w(V) {
      var H;
      for (V = V || []; H = z(); )
        H !== !1 && V.push(H);
      return V;
    }
    function z() {
      var V = M();
      if (!(c != C.charAt(0) || d != C.charAt(1))) {
        for (var H = 2; h != C.charAt(H) && (d != C.charAt(H) || c != C.charAt(H + 1)); )
          ++H;
        if (H += 2, h === C.charAt(H - 1))
          return B("End of comment missing");
        var G = C.slice(2, H - 2);
        return _ += 2, v(G), C = C.slice(H), _ += 2, V({
          type: p,
          comment: G
        });
      }
    }
    function $() {
      var V = M(), H = O(r);
      if (H) {
        if (z(), !O(i)) return B("property missing ':'");
        var G = O(a), W = V({
          type: f,
          property: y(H[0].replace(e, h)),
          value: G ? y(G[0].replace(e, h)) : h
        });
        return O(s), W;
      }
    }
    function X() {
      var V = [];
      w(V);
      for (var H; H = $(); )
        H !== !1 && (V.push(H), w(V));
      return V;
    }
    return j(), X();
  }
  function y(C) {
    return C ? C.replace(u, h) : h;
  }
  return fi = g, fi;
}
var nu;
function fT() {
  if (nu) return ln;
  nu = 1;
  var e = ln && ln.__importDefault || function(r) {
    return r && r.__esModule ? r : { default: r };
  };
  Object.defineProperty(ln, "__esModule", { value: !0 }), ln.default = n;
  const t = e(hT());
  function n(r, i) {
    let a = null;
    if (!r || typeof r != "string")
      return a;
    const s = (0, t.default)(r), u = typeof i == "function";
    return s.forEach((o) => {
      if (o.type !== "declaration")
        return;
      const { property: c, value: d } = o;
      u ? i(c, d, o) : d && (a = a || {}, a[c] = d);
    }), a;
  }
  return ln;
}
var Rn = {}, ru;
function pT() {
  if (ru) return Rn;
  ru = 1, Object.defineProperty(Rn, "__esModule", { value: !0 }), Rn.camelCase = void 0;
  var e = /^--[a-zA-Z0-9_-]+$/, t = /-([a-z])/g, n = /^[^-]+$/, r = /^-(webkit|moz|ms|o|khtml)-/, i = /^-(ms)-/, a = function(c) {
    return !c || n.test(c) || e.test(c);
  }, s = function(c, d) {
    return d.toUpperCase();
  }, u = function(c, d) {
    return "".concat(d, "-");
  }, o = function(c, d) {
    return d === void 0 && (d = {}), a(c) ? c : (c = c.toLowerCase(), d.reactCompat ? c = c.replace(i, u) : c = c.replace(r, u), c.replace(t, s));
  };
  return Rn.camelCase = o, Rn;
}
var On, iu;
function mT() {
  if (iu) return On;
  iu = 1;
  var e = On && On.__importDefault || function(i) {
    return i && i.__esModule ? i : { default: i };
  }, t = e(fT()), n = pT();
  function r(i, a) {
    var s = {};
    return !i || typeof i != "string" || (0, t.default)(i, function(u, o) {
      u && o && (s[(0, n.camelCase)(u, a)] = o);
    }), s;
  }
  return r.default = r, On = r, On;
}
var gT = mT();
const bT = /* @__PURE__ */ Yu(gT);
function Vn(e) {
  return !e || typeof e != "object" ? "" : "position" in e || "type" in e ? au(e.position) : "start" in e || "end" in e ? au(e) : "line" in e || "column" in e ? Fi(e) : "";
}
function Fi(e) {
  return su(e && e.line) + ":" + su(e && e.column);
}
function au(e) {
  return Fi(e && e.start) + "-" + Fi(e && e.end);
}
function su(e) {
  return e && typeof e == "number" ? e : 1;
}
class He extends Error {
  /**
   * Create a message for `reason`.
   *
   * > 🪦 **Note**: also has obsolete signatures.
   *
   * @overload
   * @param {string} reason
   * @param {Options | null | undefined} [options]
   * @returns
   *
   * @overload
   * @param {string} reason
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns
   *
   * @overload
   * @param {string} reason
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns
   *
   * @overload
   * @param {string} reason
   * @param {string | null | undefined} [origin]
   * @returns
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {string | null | undefined} [origin]
   * @returns
   *
   * @param {Error | VFileMessage | string} causeOrReason
   *   Reason for message, should use markdown.
   * @param {Node | NodeLike | Options | Point | Position | string | null | undefined} [optionsOrParentOrPlace]
   *   Configuration (optional).
   * @param {string | null | undefined} [origin]
   *   Place in code where the message originates (example:
   *   `'my-package:my-rule'` or `'my-rule'`).
   * @returns
   *   Instance of `VFileMessage`.
   */
  // eslint-disable-next-line complexity
  constructor(t, n, r) {
    super(), typeof n == "string" && (r = n, n = void 0);
    let i = "", a = {}, s = !1;
    if (n && ("line" in n && "column" in n ? a = { place: n } : "start" in n && "end" in n ? a = { place: n } : "type" in n ? a = {
      ancestors: [n],
      place: n.position
    } : a = { ...n }), typeof t == "string" ? i = t : !a.cause && t && (s = !0, i = t.message, a.cause = t), !a.ruleId && !a.source && typeof r == "string") {
      const o = r.indexOf(":");
      o === -1 ? a.ruleId = r : (a.source = r.slice(0, o), a.ruleId = r.slice(o + 1));
    }
    if (!a.place && a.ancestors && a.ancestors) {
      const o = a.ancestors[a.ancestors.length - 1];
      o && (a.place = o.position);
    }
    const u = a.place && "start" in a.place ? a.place.start : a.place;
    this.ancestors = a.ancestors || void 0, this.cause = a.cause || void 0, this.column = u ? u.column : void 0, this.fatal = void 0, this.file = "", this.message = i, this.line = u ? u.line : void 0, this.name = Vn(a.place) || "1:1", this.place = a.place || void 0, this.reason = this.message, this.ruleId = a.ruleId || void 0, this.source = a.source || void 0, this.stack = s && a.cause && typeof a.cause.stack == "string" ? a.cause.stack : "", this.actual = void 0, this.expected = void 0, this.note = void 0, this.url = void 0;
  }
}
He.prototype.file = "";
He.prototype.name = "";
He.prototype.reason = "";
He.prototype.message = "";
He.prototype.stack = "";
He.prototype.column = void 0;
He.prototype.line = void 0;
He.prototype.ancestors = void 0;
He.prototype.cause = void 0;
He.prototype.fatal = void 0;
He.prototype.place = void 0;
He.prototype.ruleId = void 0;
He.prototype.source = void 0;
const ka = {}.hasOwnProperty, ET = /* @__PURE__ */ new Map(), TT = /[A-Z]/g, kT = /* @__PURE__ */ new Set(["table", "tbody", "thead", "tfoot", "tr"]), xT = /* @__PURE__ */ new Set(["td", "th"]), rc = "https://github.com/syntax-tree/hast-util-to-jsx-runtime";
function yT(e, t) {
  if (!t || t.Fragment === void 0)
    throw new TypeError("Expected `Fragment` in options");
  const n = t.filePath || void 0;
  let r;
  if (t.development) {
    if (typeof t.jsxDEV != "function")
      throw new TypeError(
        "Expected `jsxDEV` in options when `development: true`"
      );
    r = LT(n, t.jsxDEV);
  } else {
    if (typeof t.jsx != "function")
      throw new TypeError("Expected `jsx` in production options");
    if (typeof t.jsxs != "function")
      throw new TypeError("Expected `jsxs` in production options");
    r = wT(n, t.jsx, t.jsxs);
  }
  const i = {
    Fragment: t.Fragment,
    ancestors: [],
    components: t.components || {},
    create: r,
    elementAttributeNameCase: t.elementAttributeNameCase || "react",
    evaluater: t.createEvaluater ? t.createEvaluater() : void 0,
    filePath: n,
    ignoreInvalidStyle: t.ignoreInvalidStyle || !1,
    passKeys: t.passKeys !== !1,
    passNode: t.passNode || !1,
    schema: t.space === "svg" ? vt : Jn,
    stylePropertyNameCase: t.stylePropertyNameCase || "dom",
    tableCellAlignToStyle: t.tableCellAlignToStyle !== !1
  }, a = ic(i, e, void 0);
  return a && typeof a != "string" ? a : i.create(
    e,
    i.Fragment,
    { children: a || void 0 },
    void 0
  );
}
function ic(e, t, n) {
  if (t.type === "element")
    return AT(e, t, n);
  if (t.type === "mdxFlowExpression" || t.type === "mdxTextExpression")
    return _T(e, t);
  if (t.type === "mdxJsxFlowElement" || t.type === "mdxJsxTextElement")
    return IT(e, t, n);
  if (t.type === "mdxjsEsm")
    return CT(e, t);
  if (t.type === "root")
    return NT(e, t, n);
  if (t.type === "text")
    return ST(e, t);
}
function AT(e, t, n) {
  const r = e.schema;
  let i = r;
  t.tagName.toLowerCase() === "svg" && r.space === "html" && (i = vt, e.schema = i), e.ancestors.push(t);
  const a = sc(e, t.tagName, !1), s = RT(e, t);
  let u = ya(e, t);
  return kT.has(t.tagName) && (u = u.filter(function(o) {
    return typeof o == "string" ? !dT(o) : !0;
  })), ac(e, s, a, t), xa(s, u), e.ancestors.pop(), e.schema = r, e.create(t, a, s, n);
}
function _T(e, t) {
  if (t.data && t.data.estree && e.evaluater) {
    const r = t.data.estree.body[0];
    return r.type, /** @type {Child | undefined} */
    e.evaluater.evaluateExpression(r.expression);
  }
  Xn(e, t.position);
}
function CT(e, t) {
  if (t.data && t.data.estree && e.evaluater)
    return (
      /** @type {Child | undefined} */
      e.evaluater.evaluateProgram(t.data.estree)
    );
  Xn(e, t.position);
}
function IT(e, t, n) {
  const r = e.schema;
  let i = r;
  t.name === "svg" && r.space === "html" && (i = vt, e.schema = i), e.ancestors.push(t);
  const a = t.name === null ? e.Fragment : sc(e, t.name, !0), s = OT(e, t), u = ya(e, t);
  return ac(e, s, a, t), xa(s, u), e.ancestors.pop(), e.schema = r, e.create(t, a, s, n);
}
function NT(e, t, n) {
  const r = {};
  return xa(r, ya(e, t)), e.create(t, e.Fragment, r, n);
}
function ST(e, t) {
  return t.value;
}
function ac(e, t, n, r) {
  typeof n != "string" && n !== e.Fragment && e.passNode && (t.node = r);
}
function xa(e, t) {
  if (t.length > 0) {
    const n = t.length > 1 ? t : t[0];
    n && (e.children = n);
  }
}
function wT(e, t, n) {
  return r;
  function r(i, a, s, u) {
    const c = Array.isArray(s.children) ? n : t;
    return u ? c(a, s, u) : c(a, s);
  }
}
function LT(e, t) {
  return n;
  function n(r, i, a, s) {
    const u = Array.isArray(a.children), o = mt(r);
    return t(
      i,
      a,
      s,
      u,
      {
        columnNumber: o ? o.column - 1 : void 0,
        fileName: e,
        lineNumber: o ? o.line : void 0
      },
      void 0
    );
  }
}
function RT(e, t) {
  const n = {};
  let r, i;
  for (i in t.properties)
    if (i !== "children" && ka.call(t.properties, i)) {
      const a = DT(e, i, t.properties[i]);
      if (a) {
        const [s, u] = a;
        e.tableCellAlignToStyle && s === "align" && typeof u == "string" && xT.has(t.tagName) ? r = u : n[s] = u;
      }
    }
  if (r) {
    const a = (
      /** @type {Style} */
      n.style || (n.style = {})
    );
    a[e.stylePropertyNameCase === "css" ? "text-align" : "textAlign"] = r;
  }
  return n;
}
function OT(e, t) {
  const n = {};
  for (const r of t.attributes)
    if (r.type === "mdxJsxExpressionAttribute")
      if (r.data && r.data.estree && e.evaluater) {
        const a = r.data.estree.body[0];
        a.type;
        const s = a.expression;
        s.type;
        const u = s.properties[0];
        u.type, Object.assign(
          n,
          e.evaluater.evaluateExpression(u.argument)
        );
      } else
        Xn(e, t.position);
    else {
      const i = r.name;
      let a;
      if (r.value && typeof r.value == "object")
        if (r.value.data && r.value.data.estree && e.evaluater) {
          const u = r.value.data.estree.body[0];
          u.type, a = e.evaluater.evaluateExpression(u.expression);
        } else
          Xn(e, t.position);
      else
        a = r.value === null ? !0 : r.value;
      n[i] = /** @type {Props[keyof Props]} */
      a;
    }
  return n;
}
function ya(e, t) {
  const n = [];
  let r = -1;
  const i = e.passKeys ? /* @__PURE__ */ new Map() : ET;
  for (; ++r < t.children.length; ) {
    const a = t.children[r];
    let s;
    if (e.passKeys) {
      const o = a.type === "element" ? a.tagName : a.type === "mdxJsxFlowElement" || a.type === "mdxJsxTextElement" ? a.name : void 0;
      if (o) {
        const c = i.get(o) || 0;
        s = o + "-" + c, i.set(o, c + 1);
      }
    }
    const u = ic(e, a, s);
    u !== void 0 && n.push(u);
  }
  return n;
}
function DT(e, t, n) {
  const r = $r(e.schema, t);
  if (!(n == null || typeof n == "number" && Number.isNaN(n))) {
    if (Array.isArray(n) && (n = r.commaSeparated ? ao(n) : so(n)), r.property === "style") {
      let i = typeof n == "object" ? n : PT(e, String(n));
      return e.stylePropertyNameCase === "css" && (i = MT(i)), ["style", i];
    }
    return [
      e.elementAttributeNameCase === "react" && r.space ? Gd[r.property] || r.property : r.attribute,
      n
    ];
  }
}
function PT(e, t) {
  try {
    return bT(t, { reactCompat: !0 });
  } catch (n) {
    if (e.ignoreInvalidStyle)
      return {};
    const r = (
      /** @type {Error} */
      n
    ), i = new He("Cannot parse `style` attribute", {
      ancestors: e.ancestors,
      cause: r,
      ruleId: "style",
      source: "hast-util-to-jsx-runtime"
    });
    throw i.file = e.filePath || void 0, i.url = rc + "#cannot-parse-style-attribute", i;
  }
}
function sc(e, t, n) {
  let r;
  if (!n)
    r = { type: "Literal", value: t };
  else if (t.includes(".")) {
    const i = t.split(".");
    let a = -1, s;
    for (; ++a < i.length; ) {
      const u = Js(i[a]) ? { type: "Identifier", name: i[a] } : { type: "Literal", value: i[a] };
      s = s ? {
        type: "MemberExpression",
        object: s,
        property: u,
        computed: !!(a && u.type === "Literal"),
        optional: !1
      } : u;
    }
    r = s;
  } else
    r = Js(t) && !/^[a-z]/.test(t) ? { type: "Identifier", name: t } : { type: "Literal", value: t };
  if (r.type === "Literal") {
    const i = (
      /** @type {string | number} */
      r.value
    );
    return ka.call(e.components, i) ? e.components[i] : i;
  }
  if (e.evaluater)
    return e.evaluater.evaluateExpression(r);
  Xn(e);
}
function Xn(e, t) {
  const n = new He(
    "Cannot handle MDX estrees without `createEvaluater`",
    {
      ancestors: e.ancestors,
      place: t,
      ruleId: "mdx-estree",
      source: "hast-util-to-jsx-runtime"
    }
  );
  throw n.file = e.filePath || void 0, n.url = rc + "#cannot-handle-mdx-estrees-without-createevaluater", n;
}
function MT(e) {
  const t = {};
  let n;
  for (n in e)
    ka.call(e, n) && (t[vT(n)] = e[n]);
  return t;
}
function vT(e) {
  let t = e.replace(TT, BT);
  return t.slice(0, 3) === "ms-" && (t = "-" + t), t;
}
function BT(e) {
  return "-" + e.toLowerCase();
}
const pi = {
  action: ["form"],
  cite: ["blockquote", "del", "ins", "q"],
  data: ["object"],
  formAction: ["button", "input"],
  href: ["a", "area", "base", "link"],
  icon: ["menuitem"],
  itemId: null,
  manifest: ["html"],
  ping: ["a", "area"],
  poster: ["video"],
  src: [
    "audio",
    "embed",
    "iframe",
    "img",
    "input",
    "script",
    "source",
    "track",
    "video"
  ]
}, FT = {
  tokenize: HT
};
function HT(e) {
  const t = e.attempt(this.parser.constructs.contentInitial, r, i);
  let n;
  return t;
  function r(u) {
    if (u === null) {
      e.consume(u);
      return;
    }
    return e.enter("lineEnding"), e.consume(u), e.exit("lineEnding"), ue(e, t, "linePrefix");
  }
  function i(u) {
    return e.enter("paragraph"), a(u);
  }
  function a(u) {
    const o = e.enter("chunkText", {
      contentType: "text",
      previous: n
    });
    return n && (n.next = o), n = o, s(u);
  }
  function s(u) {
    if (u === null) {
      e.exit("chunkText"), e.exit("paragraph"), e.consume(u);
      return;
    }
    return Q(u) ? (e.consume(u), e.exit("chunkText"), a) : (e.consume(u), s);
  }
}
const UT = {
  tokenize: zT
}, uu = {
  tokenize: $T
};
function zT(e) {
  const t = this, n = [];
  let r = 0, i, a, s;
  return u;
  function u(_) {
    if (r < n.length) {
      const v = n[r];
      return t.containerState = v[1], e.attempt(v[0].continuation, o, c)(_);
    }
    return c(_);
  }
  function o(_) {
    if (r++, t.containerState._closeFlow) {
      t.containerState._closeFlow = void 0, i && I();
      const v = t.events.length;
      let M = v, S;
      for (; M--; )
        if (t.events[M][0] === "exit" && t.events[M][1].type === "chunkFlow") {
          S = t.events[M][1].end;
          break;
        }
      k(r);
      let B = v;
      for (; B < t.events.length; )
        t.events[B][1].end = {
          ...S
        }, B++;
      return Ze(t.events, M + 1, 0, t.events.slice(v)), t.events.length = B, c(_);
    }
    return u(_);
  }
  function c(_) {
    if (r === n.length) {
      if (!i)
        return p(_);
      if (i.currentConstruct && i.currentConstruct.concrete)
        return g(_);
      t.interrupt = !!(i.currentConstruct && !i._gfmTableDynamicInterruptHack);
    }
    return t.containerState = {}, e.check(uu, d, h)(_);
  }
  function d(_) {
    return i && I(), k(r), p(_);
  }
  function h(_) {
    return t.parser.lazy[t.now().line] = r !== n.length, s = t.now().offset, g(_);
  }
  function p(_) {
    return t.containerState = {}, e.attempt(uu, f, g)(_);
  }
  function f(_) {
    return r++, n.push([t.currentConstruct, t.containerState]), p(_);
  }
  function g(_) {
    if (_ === null) {
      i && I(), k(0), e.consume(_);
      return;
    }
    return i = i || t.parser.flow(t.now()), e.enter("chunkFlow", {
      _tokenizer: i,
      contentType: "flow",
      previous: a
    }), y(_);
  }
  function y(_) {
    if (_ === null) {
      C(e.exit("chunkFlow"), !0), k(0), e.consume(_);
      return;
    }
    return Q(_) ? (e.consume(_), C(e.exit("chunkFlow")), r = 0, t.interrupt = void 0, u) : (e.consume(_), y);
  }
  function C(_, v) {
    const M = t.sliceStream(_);
    if (v && M.push(null), _.previous = a, a && (a.next = _), a = _, i.defineSkip(_.start), i.write(M), t.parser.lazy[_.start.line]) {
      let S = i.events.length;
      for (; S--; )
        if (
          // The token starts before the line ending…
          i.events[S][1].start.offset < s && // …and either is not ended yet…
          (!i.events[S][1].end || // …or ends after it.
          i.events[S][1].end.offset > s)
        )
          return;
      const B = t.events.length;
      let O = B, j, w;
      for (; O--; )
        if (t.events[O][0] === "exit" && t.events[O][1].type === "chunkFlow") {
          if (j) {
            w = t.events[O][1].end;
            break;
          }
          j = !0;
        }
      for (k(r), S = B; S < t.events.length; )
        t.events[S][1].end = {
          ...w
        }, S++;
      Ze(t.events, O + 1, 0, t.events.slice(B)), t.events.length = S;
    }
  }
  function k(_) {
    let v = n.length;
    for (; v-- > _; ) {
      const M = n[v];
      t.containerState = M[1], M[0].exit.call(t, e);
    }
    n.length = _;
  }
  function I() {
    i.write([null]), a = void 0, i = void 0, t.containerState._closeFlow = void 0;
  }
}
function $T(e, t, n) {
  return ue(e, e.attempt(this.parser.constructs.document, t, n), "linePrefix", this.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4);
}
const jT = {
  tokenize: YT
};
function YT(e) {
  const t = this, n = e.attempt(
    // Try to parse a blank line.
    rr,
    r,
    // Try to parse initial flow (essentially, only code).
    e.attempt(this.parser.constructs.flowInitial, i, ue(e, e.attempt(this.parser.constructs.flow, i, e.attempt(B1, i)), "linePrefix"))
  );
  return n;
  function r(a) {
    if (a === null) {
      e.consume(a);
      return;
    }
    return e.enter("lineEndingBlank"), e.consume(a), e.exit("lineEndingBlank"), t.currentConstruct = void 0, n;
  }
  function i(a) {
    if (a === null) {
      e.consume(a);
      return;
    }
    return e.enter("lineEnding"), e.consume(a), e.exit("lineEnding"), t.currentConstruct = void 0, n;
  }
}
const qT = {
  resolveAll: oc()
}, VT = uc("string"), WT = uc("text");
function uc(e) {
  return {
    resolveAll: oc(e === "text" ? GT : void 0),
    tokenize: t
  };
  function t(n) {
    const r = this, i = this.parser.constructs[e], a = n.attempt(i, s, u);
    return s;
    function s(d) {
      return c(d) ? a(d) : u(d);
    }
    function u(d) {
      if (d === null) {
        n.consume(d);
        return;
      }
      return n.enter("data"), n.consume(d), o;
    }
    function o(d) {
      return c(d) ? (n.exit("data"), a(d)) : (n.consume(d), o);
    }
    function c(d) {
      if (d === null)
        return !0;
      const h = i[d];
      let p = -1;
      if (h)
        for (; ++p < h.length; ) {
          const f = h[p];
          if (!f.previous || f.previous.call(r, r.previous))
            return !0;
        }
      return !1;
    }
  }
}
function oc(e) {
  return t;
  function t(n, r) {
    let i = -1, a;
    for (; ++i <= n.length; )
      a === void 0 ? n[i] && n[i][1].type === "data" && (a = i, i++) : (!n[i] || n[i][1].type !== "data") && (i !== a + 2 && (n[a][1].end = n[i - 1][1].end, n.splice(a + 2, i - a - 2), i = a + 2), a = void 0);
    return e ? e(n, r) : n;
  }
}
function GT(e, t) {
  let n = 0;
  for (; ++n <= e.length; )
    if ((n === e.length || e[n][1].type === "lineEnding") && e[n - 1][1].type === "data") {
      const r = e[n - 1][1], i = t.sliceStream(r);
      let a = i.length, s = -1, u = 0, o;
      for (; a--; ) {
        const c = i[a];
        if (typeof c == "string") {
          for (s = c.length; c.charCodeAt(s - 1) === 32; )
            u++, s--;
          if (s) break;
          s = -1;
        } else if (c === -2)
          o = !0, u++;
        else if (c !== -1) {
          a++;
          break;
        }
      }
      if (t._contentTypeTextTrailing && n === e.length && (u = 0), u) {
        const c = {
          type: n === e.length || o || u < 2 ? "lineSuffix" : "hardBreakTrailing",
          start: {
            _bufferIndex: a ? s : r.start._bufferIndex + s,
            _index: r.start._index + a,
            line: r.end.line,
            column: r.end.column - u,
            offset: r.end.offset - u
          },
          end: {
            ...r.end
          }
        };
        r.end = {
          ...c.start
        }, r.start.offset === r.end.offset ? Object.assign(r, c) : (e.splice(n, 0, ["enter", c, t], ["exit", c, t]), n += 2);
      }
      n++;
    }
  return e;
}
const QT = {
  42: We,
  43: We,
  45: We,
  48: We,
  49: We,
  50: We,
  51: We,
  52: We,
  53: We,
  54: We,
  55: We,
  56: We,
  57: We,
  62: yl
}, KT = {
  91: $1
}, XT = {
  [-2]: li,
  [-1]: li,
  32: li
}, ZT = {
  35: G1,
  42: xr,
  45: [Hs, xr],
  60: Z1,
  61: Hs,
  95: xr,
  96: Bs,
  126: Bs
}, JT = {
  38: _l,
  92: Al
}, e2 = {
  [-5]: ci,
  [-4]: ci,
  [-3]: ci,
  33: gg,
  38: _l,
  42: vi,
  60: [E1, ag],
  91: Eg,
  92: [V1, Al],
  93: ma,
  95: vi,
  96: R1
}, t2 = {
  null: [vi, qT]
}, n2 = {
  null: [42, 95]
}, r2 = {
  null: []
}, i2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  attentionMarkers: n2,
  contentInitial: KT,
  disable: r2,
  document: QT,
  flow: ZT,
  flowInitial: XT,
  insideSpan: t2,
  string: JT,
  text: e2
}, Symbol.toStringTag, { value: "Module" }));
function a2(e, t, n) {
  let r = {
    _bufferIndex: -1,
    _index: 0,
    line: n && n.line || 1,
    column: n && n.column || 1,
    offset: n && n.offset || 0
  };
  const i = {}, a = [];
  let s = [], u = [];
  const o = {
    attempt: B(M),
    check: B(S),
    consume: I,
    enter: _,
    exit: v,
    interrupt: B(S, {
      interrupt: !0
    })
  }, c = {
    code: null,
    containerState: {},
    defineSkip: y,
    events: [],
    now: g,
    parser: e,
    previous: null,
    sliceSerialize: p,
    sliceStream: f,
    write: h
  };
  let d = t.tokenize.call(c, o);
  return t.resolveAll && a.push(t), c;
  function h(z) {
    return s = nt(s, z), C(), s[s.length - 1] !== null ? [] : (O(t, 0), c.events = Qr(a, c.events, c), c.events);
  }
  function p(z, $) {
    return u2(f(z), $);
  }
  function f(z) {
    return s2(s, z);
  }
  function g() {
    const {
      _bufferIndex: z,
      _index: $,
      line: X,
      column: V,
      offset: H
    } = r;
    return {
      _bufferIndex: z,
      _index: $,
      line: X,
      column: V,
      offset: H
    };
  }
  function y(z) {
    i[z.line] = z.column, w();
  }
  function C() {
    let z;
    for (; r._index < s.length; ) {
      const $ = s[r._index];
      if (typeof $ == "string")
        for (z = r._index, r._bufferIndex < 0 && (r._bufferIndex = 0); r._index === z && r._bufferIndex < $.length; )
          k($.charCodeAt(r._bufferIndex));
      else
        k($);
    }
  }
  function k(z) {
    d = d(z);
  }
  function I(z) {
    Q(z) ? (r.line++, r.column = 1, r.offset += z === -3 ? 2 : 1, w()) : z !== -1 && (r.column++, r.offset++), r._bufferIndex < 0 ? r._index++ : (r._bufferIndex++, r._bufferIndex === // Points w/ non-negative `_bufferIndex` reference
    // strings.
    /** @type {string} */
    s[r._index].length && (r._bufferIndex = -1, r._index++)), c.previous = z;
  }
  function _(z, $) {
    const X = $ || {};
    return X.type = z, X.start = g(), c.events.push(["enter", X, c]), u.push(X), X;
  }
  function v(z) {
    const $ = u.pop();
    return $.end = g(), c.events.push(["exit", $, c]), $;
  }
  function M(z, $) {
    O(z, $.from);
  }
  function S(z, $) {
    $.restore();
  }
  function B(z, $) {
    return X;
    function X(V, H, G) {
      let W, le, Ne, E;
      return Array.isArray(V) ? (
        /* c8 ignore next 1 */
        xe(V)
      ) : "tokenize" in V ? (
        // Looks like a construct.
        xe([
          /** @type {Construct} */
          V
        ])
      ) : Le(V);
      function Le(J) {
        return ve;
        function ve(Se) {
          const he = Se !== null && J[Se], Qe = Se !== null && J.null, Je = [
            // To do: add more extension tests.
            /* c8 ignore next 2 */
            ...Array.isArray(he) ? he : he ? [he] : [],
            ...Array.isArray(Qe) ? Qe : Qe ? [Qe] : []
          ];
          return xe(Je)(Se);
        }
      }
      function xe(J) {
        return W = J, le = 0, J.length === 0 ? G : x(J[le]);
      }
      function x(J) {
        return ve;
        function ve(Se) {
          return E = j(), Ne = J, J.partial || (c.currentConstruct = J), J.name && c.parser.constructs.disable.null.includes(J.name) ? de() : J.tokenize.call(
            // If we do have fields, create an object w/ `context` as its
            // prototype.
            // This allows a “live binding”, which is needed for `interrupt`.
            $ ? Object.assign(Object.create(c), $) : c,
            o,
            Pe,
            de
          )(Se);
        }
      }
      function Pe(J) {
        return z(Ne, E), H;
      }
      function de(J) {
        return E.restore(), ++le < W.length ? x(W[le]) : G;
      }
    }
  }
  function O(z, $) {
    z.resolveAll && !a.includes(z) && a.push(z), z.resolve && Ze(c.events, $, c.events.length - $, z.resolve(c.events.slice($), c)), z.resolveTo && (c.events = z.resolveTo(c.events, c));
  }
  function j() {
    const z = g(), $ = c.previous, X = c.currentConstruct, V = c.events.length, H = Array.from(u);
    return {
      from: V,
      restore: G
    };
    function G() {
      r = z, c.previous = $, c.currentConstruct = X, c.events.length = V, u = H, w();
    }
  }
  function w() {
    r.line in i && r.column < 2 && (r.column = i[r.line], r.offset += i[r.line] - 1);
  }
}
function s2(e, t) {
  const n = t.start._index, r = t.start._bufferIndex, i = t.end._index, a = t.end._bufferIndex;
  let s;
  if (n === i)
    s = [e[n].slice(r, a)];
  else {
    if (s = e.slice(n, i), r > -1) {
      const u = s[0];
      typeof u == "string" ? s[0] = u.slice(r) : s.shift();
    }
    a > 0 && s.push(e[i].slice(0, a));
  }
  return s;
}
function u2(e, t) {
  let n = -1;
  const r = [];
  let i;
  for (; ++n < e.length; ) {
    const a = e[n];
    let s;
    if (typeof a == "string")
      s = a;
    else switch (a) {
      case -5: {
        s = "\r";
        break;
      }
      case -4: {
        s = `
`;
        break;
      }
      case -3: {
        s = `\r
`;
        break;
      }
      case -2: {
        s = t ? " " : "	";
        break;
      }
      case -1: {
        if (!t && i) continue;
        s = " ";
        break;
      }
      default:
        s = String.fromCharCode(a);
    }
    i = a === -2, r.push(s);
  }
  return r.join("");
}
function o2(e) {
  const r = {
    constructs: (
      /** @type {FullNormalizedExtension} */
      fl([i2, ...(e || {}).extensions || []])
    ),
    content: i(FT),
    defined: [],
    document: i(UT),
    flow: i(jT),
    lazy: {},
    string: i(VT),
    text: i(WT)
  };
  return r;
  function i(a) {
    return s;
    function s(u) {
      return a2(r, a, u);
    }
  }
}
function l2(e) {
  for (; !Cl(e); )
    ;
  return e;
}
const ou = /[\0\t\n\r]/g;
function c2() {
  let e = 1, t = "", n = !0, r;
  return i;
  function i(a, s, u) {
    const o = [];
    let c, d, h, p, f;
    for (a = t + (typeof a == "string" ? a.toString() : new TextDecoder(s || void 0).decode(a)), h = 0, t = "", n && (a.charCodeAt(0) === 65279 && h++, n = void 0); h < a.length; ) {
      if (ou.lastIndex = h, c = ou.exec(a), p = c && c.index !== void 0 ? c.index : a.length, f = a.charCodeAt(p), !c) {
        t = a.slice(h);
        break;
      }
      if (f === 10 && h === p && r)
        o.push(-3), r = void 0;
      else
        switch (r && (o.push(-5), r = void 0), h < p && (o.push(a.slice(h, p)), e += p - h), f) {
          case 0: {
            o.push(65533), e++;
            break;
          }
          case 9: {
            for (d = Math.ceil(e / 4) * 4, o.push(-2); e++ < d; ) o.push(-1);
            break;
          }
          case 10: {
            o.push(-4), e = 1;
            break;
          }
          default:
            r = !0, e = 1;
        }
      h = p + 1;
    }
    return u && (r && o.push(-5), t && o.push(t), o.push(null)), o;
  }
}
const lc = {}.hasOwnProperty;
function d2(e, t, n) {
  return t && typeof t == "object" && (n = t, t = void 0), h2(n)(l2(o2(n).document().write(c2()(e, t, !0))));
}
function h2(e) {
  const t = {
    transforms: [],
    canContainEols: ["emphasis", "fragment", "heading", "paragraph", "strong"],
    enter: {
      autolink: a(ur),
      autolinkProtocol: j,
      autolinkEmail: j,
      atxHeading: a(yn),
      blockQuote: a(Qe),
      characterEscape: j,
      characterReference: j,
      codeFenced: a(Je),
      codeFencedFenceInfo: s,
      codeFencedFenceMeta: s,
      codeIndented: a(Je, s),
      codeText: a(Ct, s),
      codeTextData: j,
      data: j,
      codeFlowValue: j,
      definition: a(It),
      definitionDestinationString: s,
      definitionLabelString: s,
      definitionTitleString: s,
      emphasis: a(Et),
      hardBreakEscape: a(Nt),
      hardBreakTrailing: a(Nt),
      htmlFlow: a(un, s),
      htmlFlowData: j,
      htmlText: a(un, s),
      htmlTextData: j,
      image: a(ei),
      label: s,
      link: a(ur),
      listItem: a(ce),
      listItemValue: p,
      listOrdered: a(K, h),
      listUnordered: a(K),
      paragraph: a(Ue),
      reference: x,
      referenceString: s,
      resourceDestinationString: s,
      resourceTitleString: s,
      setextHeading: a(yn),
      strong: a(et),
      thematicBreak: a(An)
    },
    exit: {
      atxHeading: o(),
      atxHeadingSequence: M,
      autolink: o(),
      autolinkEmail: he,
      autolinkProtocol: Se,
      blockQuote: o(),
      characterEscapeValue: w,
      characterReferenceMarkerHexadecimal: de,
      characterReferenceMarkerNumeric: de,
      characterReferenceValue: J,
      characterReference: ve,
      codeFenced: o(C),
      codeFencedFence: y,
      codeFencedFenceInfo: f,
      codeFencedFenceMeta: g,
      codeFlowValue: w,
      codeIndented: o(k),
      codeText: o(H),
      codeTextData: w,
      data: w,
      definition: o(),
      definitionDestinationString: v,
      definitionLabelString: I,
      definitionTitleString: _,
      emphasis: o(),
      hardBreakEscape: o($),
      hardBreakTrailing: o($),
      htmlFlow: o(X),
      htmlFlowData: w,
      htmlText: o(V),
      htmlTextData: w,
      image: o(W),
      label: Ne,
      labelText: le,
      lineEnding: z,
      link: o(G),
      listItem: o(),
      listOrdered: o(),
      listUnordered: o(),
      paragraph: o(),
      referenceString: Pe,
      resourceDestinationString: E,
      resourceTitleString: Le,
      resource: xe,
      setextHeading: o(O),
      setextHeadingLineSequence: B,
      setextHeadingText: S,
      strong: o(),
      thematicBreak: o()
    }
  };
  cc(t, (e || {}).mdastExtensions || []);
  const n = {};
  return r;
  function r(R) {
    let U = {
      type: "root",
      children: []
    };
    const ee = {
      stack: [U],
      tokenStack: [],
      config: t,
      enter: u,
      exit: c,
      buffer: s,
      resume: d,
      data: n
    }, se = [];
    let me = -1;
    for (; ++me < R.length; )
      if (R[me][1].type === "listOrdered" || R[me][1].type === "listUnordered")
        if (R[me][0] === "enter")
          se.push(me);
        else {
          const it = se.pop();
          me = i(R, it, me);
        }
    for (me = -1; ++me < R.length; ) {
      const it = t[R[me][0]];
      lc.call(it, R[me][1].type) && it[R[me][1].type].call(Object.assign({
        sliceSerialize: R[me][2].sliceSerialize
      }, ee), R[me][1]);
    }
    if (ee.tokenStack.length > 0) {
      const it = ee.tokenStack[ee.tokenStack.length - 1];
      (it[1] || lu).call(ee, void 0, it[0]);
    }
    for (U.position = {
      start: Lt(R.length > 0 ? R[0][1].start : {
        line: 1,
        column: 1,
        offset: 0
      }),
      end: Lt(R.length > 0 ? R[R.length - 2][1].end : {
        line: 1,
        column: 1,
        offset: 0
      })
    }, me = -1; ++me < t.transforms.length; )
      U = t.transforms[me](U) || U;
    return U;
  }
  function i(R, U, ee) {
    let se = U - 1, me = -1, it = !1, Ht, Tt, _n, Cn;
    for (; ++se <= ee; ) {
      const Ke = R[se];
      switch (Ke[1].type) {
        case "listUnordered":
        case "listOrdered":
        case "blockQuote": {
          Ke[0] === "enter" ? me++ : me--, Cn = void 0;
          break;
        }
        case "lineEndingBlank": {
          Ke[0] === "enter" && (Ht && !Cn && !me && !_n && (_n = se), Cn = void 0);
          break;
        }
        case "linePrefix":
        case "listItemValue":
        case "listItemMarker":
        case "listItemPrefix":
        case "listItemPrefixWhitespace":
          break;
        default:
          Cn = void 0;
      }
      if (!me && Ke[0] === "enter" && Ke[1].type === "listItemPrefix" || me === -1 && Ke[0] === "exit" && (Ke[1].type === "listUnordered" || Ke[1].type === "listOrdered")) {
        if (Ht) {
          let on = se;
          for (Tt = void 0; on--; ) {
            const kt = R[on];
            if (kt[1].type === "lineEnding" || kt[1].type === "lineEndingBlank") {
              if (kt[0] === "exit") continue;
              Tt && (R[Tt][1].type = "lineEndingBlank", it = !0), kt[1].type = "lineEnding", Tt = on;
            } else if (!(kt[1].type === "linePrefix" || kt[1].type === "blockQuotePrefix" || kt[1].type === "blockQuotePrefixWhitespace" || kt[1].type === "blockQuoteMarker" || kt[1].type === "listItemIndent")) break;
          }
          _n && (!Tt || _n < Tt) && (Ht._spread = !0), Ht.end = Object.assign({}, Tt ? R[Tt][1].start : Ke[1].end), R.splice(Tt || se, 0, ["exit", Ht, Ke[2]]), se++, ee++;
        }
        if (Ke[1].type === "listItemPrefix") {
          const on = {
            type: "listItem",
            _spread: !1,
            start: Object.assign({}, Ke[1].start),
            // @ts-expect-error: we’ll add `end` in a second.
            end: void 0
          };
          Ht = on, R.splice(se, 0, ["enter", on, Ke[2]]), se++, ee++, _n = void 0, Cn = !0;
        }
      }
    }
    return R[U][1]._spread = it, ee;
  }
  function a(R, U) {
    return ee;
    function ee(se) {
      u.call(this, R(se), se), U && U.call(this, se);
    }
  }
  function s() {
    this.stack.push({
      type: "fragment",
      children: []
    });
  }
  function u(R, U, ee) {
    this.stack[this.stack.length - 1].children.push(R), this.stack.push(R), this.tokenStack.push([U, ee || void 0]), R.position = {
      start: Lt(U.start),
      // @ts-expect-error: `end` will be patched later.
      end: void 0
    };
  }
  function o(R) {
    return U;
    function U(ee) {
      R && R.call(this, ee), c.call(this, ee);
    }
  }
  function c(R, U) {
    const ee = this.stack.pop(), se = this.tokenStack.pop();
    if (se)
      se[0].type !== R.type && (U ? U.call(this, R, se[0]) : (se[1] || lu).call(this, R, se[0]));
    else throw new Error("Cannot close `" + R.type + "` (" + Vn({
      start: R.start,
      end: R.end
    }) + "): it’s not open");
    ee.position.end = Lt(R.end);
  }
  function d() {
    return da(this.stack.pop());
  }
  function h() {
    this.data.expectingFirstListItemValue = !0;
  }
  function p(R) {
    if (this.data.expectingFirstListItemValue) {
      const U = this.stack[this.stack.length - 2];
      U.start = Number.parseInt(this.sliceSerialize(R), 10), this.data.expectingFirstListItemValue = void 0;
    }
  }
  function f() {
    const R = this.resume(), U = this.stack[this.stack.length - 1];
    U.lang = R;
  }
  function g() {
    const R = this.resume(), U = this.stack[this.stack.length - 1];
    U.meta = R;
  }
  function y() {
    this.data.flowCodeInside || (this.buffer(), this.data.flowCodeInside = !0);
  }
  function C() {
    const R = this.resume(), U = this.stack[this.stack.length - 1];
    U.value = R.replace(/^(\r?\n|\r)|(\r?\n|\r)$/g, ""), this.data.flowCodeInside = void 0;
  }
  function k() {
    const R = this.resume(), U = this.stack[this.stack.length - 1];
    U.value = R.replace(/(\r?\n|\r)$/g, "");
  }
  function I(R) {
    const U = this.resume(), ee = this.stack[this.stack.length - 1];
    ee.label = U, ee.identifier = st(this.sliceSerialize(R)).toLowerCase();
  }
  function _() {
    const R = this.resume(), U = this.stack[this.stack.length - 1];
    U.title = R;
  }
  function v() {
    const R = this.resume(), U = this.stack[this.stack.length - 1];
    U.url = R;
  }
  function M(R) {
    const U = this.stack[this.stack.length - 1];
    if (!U.depth) {
      const ee = this.sliceSerialize(R).length;
      U.depth = ee;
    }
  }
  function S() {
    this.data.setextHeadingSlurpLineEnding = !0;
  }
  function B(R) {
    const U = this.stack[this.stack.length - 1];
    U.depth = this.sliceSerialize(R).codePointAt(0) === 61 ? 1 : 2;
  }
  function O() {
    this.data.setextHeadingSlurpLineEnding = void 0;
  }
  function j(R) {
    const ee = this.stack[this.stack.length - 1].children;
    let se = ee[ee.length - 1];
    (!se || se.type !== "text") && (se = St(), se.position = {
      start: Lt(R.start),
      // @ts-expect-error: we’ll add `end` later.
      end: void 0
    }, ee.push(se)), this.stack.push(se);
  }
  function w(R) {
    const U = this.stack.pop();
    U.value += this.sliceSerialize(R), U.position.end = Lt(R.end);
  }
  function z(R) {
    const U = this.stack[this.stack.length - 1];
    if (this.data.atHardBreak) {
      const ee = U.children[U.children.length - 1];
      ee.position.end = Lt(R.end), this.data.atHardBreak = void 0;
      return;
    }
    !this.data.setextHeadingSlurpLineEnding && t.canContainEols.includes(U.type) && (j.call(this, R), w.call(this, R));
  }
  function $() {
    this.data.atHardBreak = !0;
  }
  function X() {
    const R = this.resume(), U = this.stack[this.stack.length - 1];
    U.value = R;
  }
  function V() {
    const R = this.resume(), U = this.stack[this.stack.length - 1];
    U.value = R;
  }
  function H() {
    const R = this.resume(), U = this.stack[this.stack.length - 1];
    U.value = R;
  }
  function G() {
    const R = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      const U = this.data.referenceType || "shortcut";
      R.type += "Reference", R.referenceType = U, delete R.url, delete R.title;
    } else
      delete R.identifier, delete R.label;
    this.data.referenceType = void 0;
  }
  function W() {
    const R = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      const U = this.data.referenceType || "shortcut";
      R.type += "Reference", R.referenceType = U, delete R.url, delete R.title;
    } else
      delete R.identifier, delete R.label;
    this.data.referenceType = void 0;
  }
  function le(R) {
    const U = this.sliceSerialize(R), ee = this.stack[this.stack.length - 2];
    ee.label = $m(U), ee.identifier = st(U).toLowerCase();
  }
  function Ne() {
    const R = this.stack[this.stack.length - 1], U = this.resume(), ee = this.stack[this.stack.length - 1];
    if (this.data.inReference = !0, ee.type === "link") {
      const se = R.children;
      ee.children = se;
    } else
      ee.alt = U;
  }
  function E() {
    const R = this.resume(), U = this.stack[this.stack.length - 1];
    U.url = R;
  }
  function Le() {
    const R = this.resume(), U = this.stack[this.stack.length - 1];
    U.title = R;
  }
  function xe() {
    this.data.inReference = void 0;
  }
  function x() {
    this.data.referenceType = "collapsed";
  }
  function Pe(R) {
    const U = this.resume(), ee = this.stack[this.stack.length - 1];
    ee.label = U, ee.identifier = st(this.sliceSerialize(R)).toLowerCase(), this.data.referenceType = "full";
  }
  function de(R) {
    this.data.characterReferenceType = R.type;
  }
  function J(R) {
    const U = this.sliceSerialize(R), ee = this.data.characterReferenceType;
    let se;
    ee ? (se = hl(U, ee === "characterReferenceMarkerNumeric" ? 10 : 16), this.data.characterReferenceType = void 0) : se = fa(U);
    const me = this.stack[this.stack.length - 1];
    me.value += se;
  }
  function ve(R) {
    const U = this.stack.pop();
    U.position.end = Lt(R.end);
  }
  function Se(R) {
    w.call(this, R);
    const U = this.stack[this.stack.length - 1];
    U.url = this.sliceSerialize(R);
  }
  function he(R) {
    w.call(this, R);
    const U = this.stack[this.stack.length - 1];
    U.url = "mailto:" + this.sliceSerialize(R);
  }
  function Qe() {
    return {
      type: "blockquote",
      children: []
    };
  }
  function Je() {
    return {
      type: "code",
      lang: null,
      meta: null,
      value: ""
    };
  }
  function Ct() {
    return {
      type: "inlineCode",
      value: ""
    };
  }
  function It() {
    return {
      type: "definition",
      identifier: "",
      label: null,
      title: null,
      url: ""
    };
  }
  function Et() {
    return {
      type: "emphasis",
      children: []
    };
  }
  function yn() {
    return {
      type: "heading",
      // @ts-expect-error `depth` will be set later.
      depth: 0,
      children: []
    };
  }
  function Nt() {
    return {
      type: "break"
    };
  }
  function un() {
    return {
      type: "html",
      value: ""
    };
  }
  function ei() {
    return {
      type: "image",
      title: null,
      url: "",
      alt: null
    };
  }
  function ur() {
    return {
      type: "link",
      title: null,
      url: "",
      children: []
    };
  }
  function K(R) {
    return {
      type: "list",
      ordered: R.type === "listOrdered",
      start: null,
      spread: R._spread,
      children: []
    };
  }
  function ce(R) {
    return {
      type: "listItem",
      spread: R._spread,
      checked: null,
      children: []
    };
  }
  function Ue() {
    return {
      type: "paragraph",
      children: []
    };
  }
  function et() {
    return {
      type: "strong",
      children: []
    };
  }
  function St() {
    return {
      type: "text",
      value: ""
    };
  }
  function An() {
    return {
      type: "thematicBreak"
    };
  }
}
function Lt(e) {
  return {
    line: e.line,
    column: e.column,
    offset: e.offset
  };
}
function cc(e, t) {
  let n = -1;
  for (; ++n < t.length; ) {
    const r = t[n];
    Array.isArray(r) ? cc(e, r) : f2(e, r);
  }
}
function f2(e, t) {
  let n;
  for (n in t)
    if (lc.call(t, n))
      switch (n) {
        case "canContainEols": {
          const r = t[n];
          r && e[n].push(...r);
          break;
        }
        case "transforms": {
          const r = t[n];
          r && e[n].push(...r);
          break;
        }
        case "enter":
        case "exit": {
          const r = t[n];
          r && Object.assign(e[n], r);
          break;
        }
      }
}
function lu(e, t) {
  throw e ? new Error("Cannot close `" + e.type + "` (" + Vn({
    start: e.start,
    end: e.end
  }) + "): a different token (`" + t.type + "`, " + Vn({
    start: t.start,
    end: t.end
  }) + ") is open") : new Error("Cannot close document, a token (`" + t.type + "`, " + Vn({
    start: t.start,
    end: t.end
  }) + ") is still open");
}
function p2(e) {
  const t = this;
  t.parser = n;
  function n(r) {
    return d2(r, {
      ...t.data("settings"),
      ...e,
      // Note: these options are not in the readme.
      // The goal is for them to be set by plugins on `data` instead of being
      // passed by users.
      extensions: t.data("micromarkExtensions") || [],
      mdastExtensions: t.data("fromMarkdownExtensions") || []
    });
  }
}
function m2(e, t) {
  const n = {
    type: "element",
    tagName: "blockquote",
    properties: {},
    children: e.wrap(e.all(t), !0)
  };
  return e.patch(t, n), e.applyData(t, n);
}
function g2(e, t) {
  const n = { type: "element", tagName: "br", properties: {}, children: [] };
  return e.patch(t, n), [e.applyData(t, n), { type: "text", value: `
` }];
}
function b2(e, t) {
  const n = t.value ? t.value + `
` : "", r = {}, i = t.lang ? t.lang.split(/\s+/) : [];
  i.length > 0 && (r.className = ["language-" + i[0]]);
  let a = {
    type: "element",
    tagName: "code",
    properties: r,
    children: [{ type: "text", value: n }]
  };
  return t.meta && (a.data = { meta: t.meta }), e.patch(t, a), a = e.applyData(t, a), a = { type: "element", tagName: "pre", properties: {}, children: [a] }, e.patch(t, a), a;
}
function E2(e, t) {
  const n = {
    type: "element",
    tagName: "del",
    properties: {},
    children: e.all(t)
  };
  return e.patch(t, n), e.applyData(t, n);
}
function T2(e, t) {
  const n = {
    type: "element",
    tagName: "em",
    properties: {},
    children: e.all(t)
  };
  return e.patch(t, n), e.applyData(t, n);
}
function k2(e, t) {
  const n = typeof e.options.clobberPrefix == "string" ? e.options.clobberPrefix : "user-content-", r = String(t.identifier).toUpperCase(), i = kn(r.toLowerCase()), a = e.footnoteOrder.indexOf(r);
  let s, u = e.footnoteCounts.get(r);
  u === void 0 ? (u = 0, e.footnoteOrder.push(r), s = e.footnoteOrder.length) : s = a + 1, u += 1, e.footnoteCounts.set(r, u);
  const o = {
    type: "element",
    tagName: "a",
    properties: {
      href: "#" + n + "fn-" + i,
      id: n + "fnref-" + i + (u > 1 ? "-" + u : ""),
      dataFootnoteRef: !0,
      ariaDescribedBy: ["footnote-label"]
    },
    children: [{ type: "text", value: String(s) }]
  };
  e.patch(t, o);
  const c = {
    type: "element",
    tagName: "sup",
    properties: {},
    children: [o]
  };
  return e.patch(t, c), e.applyData(t, c);
}
function x2(e, t) {
  const n = {
    type: "element",
    tagName: "h" + t.depth,
    properties: {},
    children: e.all(t)
  };
  return e.patch(t, n), e.applyData(t, n);
}
function y2(e, t) {
  if (e.options.allowDangerousHtml) {
    const n = { type: "raw", value: t.value };
    return e.patch(t, n), e.applyData(t, n);
  }
}
function dc(e, t) {
  const n = t.referenceType;
  let r = "]";
  if (n === "collapsed" ? r += "[]" : n === "full" && (r += "[" + (t.label || t.identifier) + "]"), t.type === "imageReference")
    return [{ type: "text", value: "![" + t.alt + r }];
  const i = e.all(t), a = i[0];
  a && a.type === "text" ? a.value = "[" + a.value : i.unshift({ type: "text", value: "[" });
  const s = i[i.length - 1];
  return s && s.type === "text" ? s.value += r : i.push({ type: "text", value: r }), i;
}
function A2(e, t) {
  const n = String(t.identifier).toUpperCase(), r = e.definitionById.get(n);
  if (!r)
    return dc(e, t);
  const i = { src: kn(r.url || ""), alt: t.alt };
  r.title !== null && r.title !== void 0 && (i.title = r.title);
  const a = { type: "element", tagName: "img", properties: i, children: [] };
  return e.patch(t, a), e.applyData(t, a);
}
function _2(e, t) {
  const n = { src: kn(t.url) };
  t.alt !== null && t.alt !== void 0 && (n.alt = t.alt), t.title !== null && t.title !== void 0 && (n.title = t.title);
  const r = { type: "element", tagName: "img", properties: n, children: [] };
  return e.patch(t, r), e.applyData(t, r);
}
function C2(e, t) {
  const n = { type: "text", value: t.value.replace(/\r?\n|\r/g, " ") };
  e.patch(t, n);
  const r = {
    type: "element",
    tagName: "code",
    properties: {},
    children: [n]
  };
  return e.patch(t, r), e.applyData(t, r);
}
function I2(e, t) {
  const n = String(t.identifier).toUpperCase(), r = e.definitionById.get(n);
  if (!r)
    return dc(e, t);
  const i = { href: kn(r.url || "") };
  r.title !== null && r.title !== void 0 && (i.title = r.title);
  const a = {
    type: "element",
    tagName: "a",
    properties: i,
    children: e.all(t)
  };
  return e.patch(t, a), e.applyData(t, a);
}
function N2(e, t) {
  const n = { href: kn(t.url) };
  t.title !== null && t.title !== void 0 && (n.title = t.title);
  const r = {
    type: "element",
    tagName: "a",
    properties: n,
    children: e.all(t)
  };
  return e.patch(t, r), e.applyData(t, r);
}
function S2(e, t, n) {
  const r = e.all(t), i = n ? w2(n) : hc(t), a = {}, s = [];
  if (typeof t.checked == "boolean") {
    const d = r[0];
    let h;
    d && d.type === "element" && d.tagName === "p" ? h = d : (h = { type: "element", tagName: "p", properties: {}, children: [] }, r.unshift(h)), h.children.length > 0 && h.children.unshift({ type: "text", value: " " }), h.children.unshift({
      type: "element",
      tagName: "input",
      properties: { type: "checkbox", checked: t.checked, disabled: !0 },
      children: []
    }), a.className = ["task-list-item"];
  }
  let u = -1;
  for (; ++u < r.length; ) {
    const d = r[u];
    (i || u !== 0 || d.type !== "element" || d.tagName !== "p") && s.push({ type: "text", value: `
` }), d.type === "element" && d.tagName === "p" && !i ? s.push(...d.children) : s.push(d);
  }
  const o = r[r.length - 1];
  o && (i || o.type !== "element" || o.tagName !== "p") && s.push({ type: "text", value: `
` });
  const c = { type: "element", tagName: "li", properties: a, children: s };
  return e.patch(t, c), e.applyData(t, c);
}
function w2(e) {
  let t = !1;
  if (e.type === "list") {
    t = e.spread || !1;
    const n = e.children;
    let r = -1;
    for (; !t && ++r < n.length; )
      t = hc(n[r]);
  }
  return t;
}
function hc(e) {
  const t = e.spread;
  return t ?? e.children.length > 1;
}
function L2(e, t) {
  const n = {}, r = e.all(t);
  let i = -1;
  for (typeof t.start == "number" && t.start !== 1 && (n.start = t.start); ++i < r.length; ) {
    const s = r[i];
    if (s.type === "element" && s.tagName === "li" && s.properties && Array.isArray(s.properties.className) && s.properties.className.includes("task-list-item")) {
      n.className = ["contains-task-list"];
      break;
    }
  }
  const a = {
    type: "element",
    tagName: t.ordered ? "ol" : "ul",
    properties: n,
    children: e.wrap(r, !0)
  };
  return e.patch(t, a), e.applyData(t, a);
}
function R2(e, t) {
  const n = {
    type: "element",
    tagName: "p",
    properties: {},
    children: e.all(t)
  };
  return e.patch(t, n), e.applyData(t, n);
}
function O2(e, t) {
  const n = { type: "root", children: e.wrap(e.all(t)) };
  return e.patch(t, n), e.applyData(t, n);
}
function D2(e, t) {
  const n = {
    type: "element",
    tagName: "strong",
    properties: {},
    children: e.all(t)
  };
  return e.patch(t, n), e.applyData(t, n);
}
function P2(e, t) {
  const n = e.all(t), r = n.shift(), i = [];
  if (r) {
    const s = {
      type: "element",
      tagName: "thead",
      properties: {},
      children: e.wrap([r], !0)
    };
    e.patch(t.children[0], s), i.push(s);
  }
  if (n.length > 0) {
    const s = {
      type: "element",
      tagName: "tbody",
      properties: {},
      children: e.wrap(n, !0)
    }, u = mt(t.children[1]), o = Wr(t.children[t.children.length - 1]);
    u && o && (s.position = { start: u, end: o }), i.push(s);
  }
  const a = {
    type: "element",
    tagName: "table",
    properties: {},
    children: e.wrap(i, !0)
  };
  return e.patch(t, a), e.applyData(t, a);
}
function M2(e, t, n) {
  const r = n ? n.children : void 0, a = (r ? r.indexOf(t) : 1) === 0 ? "th" : "td", s = n && n.type === "table" ? n.align : void 0, u = s ? s.length : t.children.length;
  let o = -1;
  const c = [];
  for (; ++o < u; ) {
    const h = t.children[o], p = {}, f = s ? s[o] : void 0;
    f && (p.align = f);
    let g = { type: "element", tagName: a, properties: p, children: [] };
    h && (g.children = e.all(h), e.patch(h, g), g = e.applyData(h, g)), c.push(g);
  }
  const d = {
    type: "element",
    tagName: "tr",
    properties: {},
    children: e.wrap(c, !0)
  };
  return e.patch(t, d), e.applyData(t, d);
}
function v2(e, t) {
  const n = {
    type: "element",
    tagName: "td",
    // Assume body cell.
    properties: {},
    children: e.all(t)
  };
  return e.patch(t, n), e.applyData(t, n);
}
const cu = 9, du = 32;
function B2(e) {
  const t = String(e), n = /\r?\n|\r/g;
  let r = n.exec(t), i = 0;
  const a = [];
  for (; r; )
    a.push(
      hu(t.slice(i, r.index), i > 0, !0),
      r[0]
    ), i = r.index + r[0].length, r = n.exec(t);
  return a.push(hu(t.slice(i), i > 0, !1)), a.join("");
}
function hu(e, t, n) {
  let r = 0, i = e.length;
  if (t) {
    let a = e.codePointAt(r);
    for (; a === cu || a === du; )
      r++, a = e.codePointAt(r);
  }
  if (n) {
    let a = e.codePointAt(i - 1);
    for (; a === cu || a === du; )
      i--, a = e.codePointAt(i - 1);
  }
  return i > r ? e.slice(r, i) : "";
}
function F2(e, t) {
  const n = { type: "text", value: B2(String(t.value)) };
  return e.patch(t, n), e.applyData(t, n);
}
function H2(e, t) {
  const n = {
    type: "element",
    tagName: "hr",
    properties: {},
    children: []
  };
  return e.patch(t, n), e.applyData(t, n);
}
const U2 = {
  blockquote: m2,
  break: g2,
  code: b2,
  delete: E2,
  emphasis: T2,
  footnoteReference: k2,
  heading: x2,
  html: y2,
  imageReference: A2,
  image: _2,
  inlineCode: C2,
  linkReference: I2,
  link: N2,
  listItem: S2,
  list: L2,
  paragraph: R2,
  // @ts-expect-error: root is different, but hard to type.
  root: O2,
  strong: D2,
  table: P2,
  tableCell: v2,
  tableRow: M2,
  text: F2,
  thematicBreak: H2,
  toml: fr,
  yaml: fr,
  definition: fr,
  footnoteDefinition: fr
};
function fr() {
}
function z2(e, t) {
  const n = [{ type: "text", value: "↩" }];
  return t > 1 && n.push({
    type: "element",
    tagName: "sup",
    properties: {},
    children: [{ type: "text", value: String(t) }]
  }), n;
}
function $2(e, t) {
  return "Back to reference " + (e + 1) + (t > 1 ? "-" + t : "");
}
function j2(e) {
  const t = typeof e.options.clobberPrefix == "string" ? e.options.clobberPrefix : "user-content-", n = e.options.footnoteBackContent || z2, r = e.options.footnoteBackLabel || $2, i = e.options.footnoteLabel || "Footnotes", a = e.options.footnoteLabelTagName || "h2", s = e.options.footnoteLabelProperties || {
    className: ["sr-only"]
  }, u = [];
  let o = -1;
  for (; ++o < e.footnoteOrder.length; ) {
    const c = e.footnoteById.get(
      e.footnoteOrder[o]
    );
    if (!c)
      continue;
    const d = e.all(c), h = String(c.identifier).toUpperCase(), p = kn(h.toLowerCase());
    let f = 0;
    const g = [], y = e.footnoteCounts.get(h);
    for (; y !== void 0 && ++f <= y; ) {
      g.length > 0 && g.push({ type: "text", value: " " });
      let I = typeof n == "string" ? n : n(o, f);
      typeof I == "string" && (I = { type: "text", value: I }), g.push({
        type: "element",
        tagName: "a",
        properties: {
          href: "#" + t + "fnref-" + p + (f > 1 ? "-" + f : ""),
          dataFootnoteBackref: "",
          ariaLabel: typeof r == "string" ? r : r(o, f),
          className: ["data-footnote-backref"]
        },
        children: Array.isArray(I) ? I : [I]
      });
    }
    const C = d[d.length - 1];
    if (C && C.type === "element" && C.tagName === "p") {
      const I = C.children[C.children.length - 1];
      I && I.type === "text" ? I.value += " " : C.children.push({ type: "text", value: " " }), C.children.push(...g);
    } else
      d.push(...g);
    const k = {
      type: "element",
      tagName: "li",
      properties: { id: t + "fn-" + p },
      children: e.wrap(d, !0)
    };
    e.patch(c, k), u.push(k);
  }
  if (u.length !== 0)
    return {
      type: "element",
      tagName: "section",
      properties: { dataFootnotes: !0, className: ["footnotes"] },
      children: [
        {
          type: "element",
          tagName: a,
          properties: {
            ...Xt(s),
            id: "footnote-label"
          },
          children: [{ type: "text", value: i }]
        },
        { type: "text", value: `
` },
        {
          type: "element",
          tagName: "ol",
          properties: {},
          children: e.wrap(u, !0)
        },
        { type: "text", value: `
` }
      ]
    };
}
const Hi = {}.hasOwnProperty, Y2 = {};
function q2(e, t) {
  const n = t || Y2, r = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Map(), s = { ...U2, ...n.handlers }, u = {
    all: c,
    applyData: W2,
    definitionById: r,
    footnoteById: i,
    footnoteCounts: a,
    footnoteOrder: [],
    handlers: s,
    one: o,
    options: n,
    patch: V2,
    wrap: Q2
  };
  return ut(e, function(d) {
    if (d.type === "definition" || d.type === "footnoteDefinition") {
      const h = d.type === "definition" ? r : i, p = String(d.identifier).toUpperCase();
      h.has(p) || h.set(p, d);
    }
  }), u;
  function o(d, h) {
    const p = d.type, f = u.handlers[p];
    if (Hi.call(u.handlers, p) && f)
      return f(u, d, h);
    if (u.options.passThrough && u.options.passThrough.includes(p)) {
      if ("children" in d) {
        const { children: y, ...C } = d, k = Xt(C);
        return k.children = u.all(d), k;
      }
      return Xt(d);
    }
    return (u.options.unknownHandler || G2)(u, d, h);
  }
  function c(d) {
    const h = [];
    if ("children" in d) {
      const p = d.children;
      let f = -1;
      for (; ++f < p.length; ) {
        const g = u.one(p[f], d);
        if (g) {
          if (f && p[f - 1].type === "break" && (!Array.isArray(g) && g.type === "text" && (g.value = fu(g.value)), !Array.isArray(g) && g.type === "element")) {
            const y = g.children[0];
            y && y.type === "text" && (y.value = fu(y.value));
          }
          Array.isArray(g) ? h.push(...g) : h.push(g);
        }
      }
    }
    return h;
  }
}
function V2(e, t) {
  e.position && (t.position = zo(e));
}
function W2(e, t) {
  let n = t;
  if (e && e.data) {
    const r = e.data.hName, i = e.data.hChildren, a = e.data.hProperties;
    if (typeof r == "string")
      if (n.type === "element")
        n.tagName = r;
      else {
        const s = "children" in n ? n.children : [n];
        n = { type: "element", tagName: r, properties: {}, children: s };
      }
    n.type === "element" && a && Object.assign(n.properties, Xt(a)), "children" in n && n.children && i !== null && i !== void 0 && (n.children = i);
  }
  return n;
}
function G2(e, t) {
  const n = t.data || {}, r = "value" in t && !(Hi.call(n, "hProperties") || Hi.call(n, "hChildren")) ? { type: "text", value: t.value } : {
    type: "element",
    tagName: "div",
    properties: {},
    children: e.all(t)
  };
  return e.patch(t, r), e.applyData(t, r);
}
function Q2(e, t) {
  const n = [];
  let r = -1;
  for (t && n.push({ type: "text", value: `
` }); ++r < e.length; )
    r && n.push({ type: "text", value: `
` }), n.push(e[r]);
  return t && e.length > 0 && n.push({ type: "text", value: `
` }), n;
}
function fu(e) {
  let t = 0, n = e.charCodeAt(t);
  for (; n === 9 || n === 32; )
    t++, n = e.charCodeAt(t);
  return e.slice(t);
}
function pu(e, t) {
  const n = q2(e, t), r = n.one(e, void 0), i = j2(n), a = Array.isArray(r) ? { type: "root", children: r } : r || { type: "root", children: [] };
  return i && a.children.push({ type: "text", value: `
` }, i), a;
}
function K2(e, t) {
  return e && "run" in e ? async function(n, r) {
    const i = (
      /** @type {HastRoot} */
      pu(n, { file: r, ...t })
    );
    await e.run(i, r);
  } : function(n, r) {
    return (
      /** @type {HastRoot} */
      pu(n, { file: r, ...e || t })
    );
  };
}
function mu(e) {
  if (e)
    throw e;
}
var mi, gu;
function X2() {
  if (gu) return mi;
  gu = 1;
  var e = Object.prototype.hasOwnProperty, t = Object.prototype.toString, n = Object.defineProperty, r = Object.getOwnPropertyDescriptor, i = function(c) {
    return typeof Array.isArray == "function" ? Array.isArray(c) : t.call(c) === "[object Array]";
  }, a = function(c) {
    if (!c || t.call(c) !== "[object Object]")
      return !1;
    var d = e.call(c, "constructor"), h = c.constructor && c.constructor.prototype && e.call(c.constructor.prototype, "isPrototypeOf");
    if (c.constructor && !d && !h)
      return !1;
    var p;
    for (p in c)
      ;
    return typeof p > "u" || e.call(c, p);
  }, s = function(c, d) {
    n && d.name === "__proto__" ? n(c, d.name, {
      enumerable: !0,
      configurable: !0,
      value: d.newValue,
      writable: !0
    }) : c[d.name] = d.newValue;
  }, u = function(c, d) {
    if (d === "__proto__")
      if (e.call(c, d)) {
        if (r)
          return r(c, d).value;
      } else return;
    return c[d];
  };
  return mi = function o() {
    var c, d, h, p, f, g, y = arguments[0], C = 1, k = arguments.length, I = !1;
    for (typeof y == "boolean" && (I = y, y = arguments[1] || {}, C = 2), (y == null || typeof y != "object" && typeof y != "function") && (y = {}); C < k; ++C)
      if (c = arguments[C], c != null)
        for (d in c)
          h = u(y, d), p = u(c, d), y !== p && (I && p && (a(p) || (f = i(p))) ? (f ? (f = !1, g = h && i(h) ? h : []) : g = h && a(h) ? h : {}, s(y, { name: d, newValue: o(I, g, p) })) : typeof p < "u" && s(y, { name: d, newValue: p }));
    return y;
  }, mi;
}
var Z2 = X2();
const gi = /* @__PURE__ */ Yu(Z2);
function Ui(e) {
  if (typeof e != "object" || e === null)
    return !1;
  const t = Object.getPrototypeOf(e);
  return (t === null || t === Object.prototype || Object.getPrototypeOf(t) === null) && !(Symbol.toStringTag in e) && !(Symbol.iterator in e);
}
function J2() {
  const e = [], t = { run: n, use: r };
  return t;
  function n(...i) {
    let a = -1;
    const s = i.pop();
    if (typeof s != "function")
      throw new TypeError("Expected function as last argument, not " + s);
    u(null, ...i);
    function u(o, ...c) {
      const d = e[++a];
      let h = -1;
      if (o) {
        s(o);
        return;
      }
      for (; ++h < i.length; )
        (c[h] === null || c[h] === void 0) && (c[h] = i[h]);
      i = c, d ? ek(d, u)(...c) : s(null, ...c);
    }
  }
  function r(i) {
    if (typeof i != "function")
      throw new TypeError(
        "Expected `middelware` to be a function, not " + i
      );
    return e.push(i), t;
  }
}
function ek(e, t) {
  let n;
  return r;
  function r(...s) {
    const u = e.length > s.length;
    let o;
    u && s.push(i);
    try {
      o = e.apply(this, s);
    } catch (c) {
      const d = (
        /** @type {Error} */
        c
      );
      if (u && n)
        throw d;
      return i(d);
    }
    u || (o && o.then && typeof o.then == "function" ? o.then(a, i) : o instanceof Error ? i(o) : a(o));
  }
  function i(s, ...u) {
    n || (n = !0, t(s, ...u));
  }
  function a(s) {
    i(null, s);
  }
}
const ht = { basename: tk, dirname: nk, extname: rk, join: ik, sep: "/" };
function tk(e, t) {
  if (t !== void 0 && typeof t != "string")
    throw new TypeError('"ext" argument must be a string');
  ir(e);
  let n = 0, r = -1, i = e.length, a;
  if (t === void 0 || t.length === 0 || t.length > e.length) {
    for (; i--; )
      if (e.codePointAt(i) === 47) {
        if (a) {
          n = i + 1;
          break;
        }
      } else r < 0 && (a = !0, r = i + 1);
    return r < 0 ? "" : e.slice(n, r);
  }
  if (t === e)
    return "";
  let s = -1, u = t.length - 1;
  for (; i--; )
    if (e.codePointAt(i) === 47) {
      if (a) {
        n = i + 1;
        break;
      }
    } else
      s < 0 && (a = !0, s = i + 1), u > -1 && (e.codePointAt(i) === t.codePointAt(u--) ? u < 0 && (r = i) : (u = -1, r = s));
  return n === r ? r = s : r < 0 && (r = e.length), e.slice(n, r);
}
function nk(e) {
  if (ir(e), e.length === 0)
    return ".";
  let t = -1, n = e.length, r;
  for (; --n; )
    if (e.codePointAt(n) === 47) {
      if (r) {
        t = n;
        break;
      }
    } else r || (r = !0);
  return t < 0 ? e.codePointAt(0) === 47 ? "/" : "." : t === 1 && e.codePointAt(0) === 47 ? "//" : e.slice(0, t);
}
function rk(e) {
  ir(e);
  let t = e.length, n = -1, r = 0, i = -1, a = 0, s;
  for (; t--; ) {
    const u = e.codePointAt(t);
    if (u === 47) {
      if (s) {
        r = t + 1;
        break;
      }
      continue;
    }
    n < 0 && (s = !0, n = t + 1), u === 46 ? i < 0 ? i = t : a !== 1 && (a = 1) : i > -1 && (a = -1);
  }
  return i < 0 || n < 0 || // We saw a non-dot character immediately before the dot.
  a === 0 || // The (right-most) trimmed path component is exactly `..`.
  a === 1 && i === n - 1 && i === r + 1 ? "" : e.slice(i, n);
}
function ik(...e) {
  let t = -1, n;
  for (; ++t < e.length; )
    ir(e[t]), e[t] && (n = n === void 0 ? e[t] : n + "/" + e[t]);
  return n === void 0 ? "." : ak(n);
}
function ak(e) {
  ir(e);
  const t = e.codePointAt(0) === 47;
  let n = sk(e, !t);
  return n.length === 0 && !t && (n = "."), n.length > 0 && e.codePointAt(e.length - 1) === 47 && (n += "/"), t ? "/" + n : n;
}
function sk(e, t) {
  let n = "", r = 0, i = -1, a = 0, s = -1, u, o;
  for (; ++s <= e.length; ) {
    if (s < e.length)
      u = e.codePointAt(s);
    else {
      if (u === 47)
        break;
      u = 47;
    }
    if (u === 47) {
      if (!(i === s - 1 || a === 1)) if (i !== s - 1 && a === 2) {
        if (n.length < 2 || r !== 2 || n.codePointAt(n.length - 1) !== 46 || n.codePointAt(n.length - 2) !== 46) {
          if (n.length > 2) {
            if (o = n.lastIndexOf("/"), o !== n.length - 1) {
              o < 0 ? (n = "", r = 0) : (n = n.slice(0, o), r = n.length - 1 - n.lastIndexOf("/")), i = s, a = 0;
              continue;
            }
          } else if (n.length > 0) {
            n = "", r = 0, i = s, a = 0;
            continue;
          }
        }
        t && (n = n.length > 0 ? n + "/.." : "..", r = 2);
      } else
        n.length > 0 ? n += "/" + e.slice(i + 1, s) : n = e.slice(i + 1, s), r = s - i - 1;
      i = s, a = 0;
    } else u === 46 && a > -1 ? a++ : a = -1;
  }
  return n;
}
function ir(e) {
  if (typeof e != "string")
    throw new TypeError(
      "Path must be a string. Received " + JSON.stringify(e)
    );
}
const uk = { cwd: ok };
function ok() {
  return "/";
}
function zi(e) {
  return !!(e !== null && typeof e == "object" && "href" in e && e.href && "protocol" in e && e.protocol && // @ts-expect-error: indexing is fine.
  e.auth === void 0);
}
function lk(e) {
  if (typeof e == "string")
    e = new URL(e);
  else if (!zi(e)) {
    const t = new TypeError(
      'The "path" argument must be of type string or an instance of URL. Received `' + e + "`"
    );
    throw t.code = "ERR_INVALID_ARG_TYPE", t;
  }
  if (e.protocol !== "file:") {
    const t = new TypeError("The URL must be of scheme file");
    throw t.code = "ERR_INVALID_URL_SCHEME", t;
  }
  return ck(e);
}
function ck(e) {
  if (e.hostname !== "") {
    const r = new TypeError(
      'File URL host must be "localhost" or empty on darwin'
    );
    throw r.code = "ERR_INVALID_FILE_URL_HOST", r;
  }
  const t = e.pathname;
  let n = -1;
  for (; ++n < t.length; )
    if (t.codePointAt(n) === 37 && t.codePointAt(n + 1) === 50) {
      const r = t.codePointAt(n + 2);
      if (r === 70 || r === 102) {
        const i = new TypeError(
          "File URL path must not include encoded / characters"
        );
        throw i.code = "ERR_INVALID_FILE_URL_PATH", i;
      }
    }
  return decodeURIComponent(t);
}
const bi = (
  /** @type {const} */
  [
    "history",
    "path",
    "basename",
    "stem",
    "extname",
    "dirname"
  ]
);
class dk {
  /**
   * Create a new virtual file.
   *
   * `options` is treated as:
   *
   * *   `string` or `Uint8Array` — `{value: options}`
   * *   `URL` — `{path: options}`
   * *   `VFile` — shallow copies its data over to the new file
   * *   `object` — all fields are shallow copied over to the new file
   *
   * Path related fields are set in the following order (least specific to
   * most specific): `history`, `path`, `basename`, `stem`, `extname`,
   * `dirname`.
   *
   * You cannot set `dirname` or `extname` without setting either `history`,
   * `path`, `basename`, or `stem` too.
   *
   * @param {Compatible | null | undefined} [value]
   *   File value.
   * @returns
   *   New instance.
   */
  constructor(t) {
    let n;
    t ? zi(t) ? n = { path: t } : typeof t == "string" || hk(t) ? n = { value: t } : n = t : n = {}, this.cwd = "cwd" in n ? "" : uk.cwd(), this.data = {}, this.history = [], this.messages = [], this.value, this.map, this.result, this.stored;
    let r = -1;
    for (; ++r < bi.length; ) {
      const a = bi[r];
      a in n && n[a] !== void 0 && n[a] !== null && (this[a] = a === "history" ? [...n[a]] : n[a]);
    }
    let i;
    for (i in n)
      bi.includes(i) || (this[i] = n[i]);
  }
  /**
   * Get the basename (including extname) (example: `'index.min.js'`).
   *
   * @returns {string | undefined}
   *   Basename.
   */
  get basename() {
    return typeof this.path == "string" ? ht.basename(this.path) : void 0;
  }
  /**
   * Set basename (including extname) (`'index.min.js'`).
   *
   * Cannot contain path separators (`'/'` on unix, macOS, and browsers, `'\'`
   * on windows).
   * Cannot be nullified (use `file.path = file.dirname` instead).
   *
   * @param {string} basename
   *   Basename.
   * @returns {undefined}
   *   Nothing.
   */
  set basename(t) {
    Ti(t, "basename"), Ei(t, "basename"), this.path = ht.join(this.dirname || "", t);
  }
  /**
   * Get the parent path (example: `'~'`).
   *
   * @returns {string | undefined}
   *   Dirname.
   */
  get dirname() {
    return typeof this.path == "string" ? ht.dirname(this.path) : void 0;
  }
  /**
   * Set the parent path (example: `'~'`).
   *
   * Cannot be set if there’s no `path` yet.
   *
   * @param {string | undefined} dirname
   *   Dirname.
   * @returns {undefined}
   *   Nothing.
   */
  set dirname(t) {
    bu(this.basename, "dirname"), this.path = ht.join(t || "", this.basename);
  }
  /**
   * Get the extname (including dot) (example: `'.js'`).
   *
   * @returns {string | undefined}
   *   Extname.
   */
  get extname() {
    return typeof this.path == "string" ? ht.extname(this.path) : void 0;
  }
  /**
   * Set the extname (including dot) (example: `'.js'`).
   *
   * Cannot contain path separators (`'/'` on unix, macOS, and browsers, `'\'`
   * on windows).
   * Cannot be set if there’s no `path` yet.
   *
   * @param {string | undefined} extname
   *   Extname.
   * @returns {undefined}
   *   Nothing.
   */
  set extname(t) {
    if (Ei(t, "extname"), bu(this.dirname, "extname"), t) {
      if (t.codePointAt(0) !== 46)
        throw new Error("`extname` must start with `.`");
      if (t.includes(".", 1))
        throw new Error("`extname` cannot contain multiple dots");
    }
    this.path = ht.join(this.dirname, this.stem + (t || ""));
  }
  /**
   * Get the full path (example: `'~/index.min.js'`).
   *
   * @returns {string}
   *   Path.
   */
  get path() {
    return this.history[this.history.length - 1];
  }
  /**
   * Set the full path (example: `'~/index.min.js'`).
   *
   * Cannot be nullified.
   * You can set a file URL (a `URL` object with a `file:` protocol) which will
   * be turned into a path with `url.fileURLToPath`.
   *
   * @param {URL | string} path
   *   Path.
   * @returns {undefined}
   *   Nothing.
   */
  set path(t) {
    zi(t) && (t = lk(t)), Ti(t, "path"), this.path !== t && this.history.push(t);
  }
  /**
   * Get the stem (basename w/o extname) (example: `'index.min'`).
   *
   * @returns {string | undefined}
   *   Stem.
   */
  get stem() {
    return typeof this.path == "string" ? ht.basename(this.path, this.extname) : void 0;
  }
  /**
   * Set the stem (basename w/o extname) (example: `'index.min'`).
   *
   * Cannot contain path separators (`'/'` on unix, macOS, and browsers, `'\'`
   * on windows).
   * Cannot be nullified (use `file.path = file.dirname` instead).
   *
   * @param {string} stem
   *   Stem.
   * @returns {undefined}
   *   Nothing.
   */
  set stem(t) {
    Ti(t, "stem"), Ei(t, "stem"), this.path = ht.join(this.dirname || "", t + (this.extname || ""));
  }
  // Normal prototypal methods.
  /**
   * Create a fatal message for `reason` associated with the file.
   *
   * The `fatal` field of the message is set to `true` (error; file not usable)
   * and the `file` field is set to the current file path.
   * The message is added to the `messages` field on `file`.
   *
   * > 🪦 **Note**: also has obsolete signatures.
   *
   * @overload
   * @param {string} reason
   * @param {MessageOptions | null | undefined} [options]
   * @returns {never}
   *
   * @overload
   * @param {string} reason
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns {never}
   *
   * @overload
   * @param {string} reason
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns {never}
   *
   * @overload
   * @param {string} reason
   * @param {string | null | undefined} [origin]
   * @returns {never}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns {never}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns {never}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {string | null | undefined} [origin]
   * @returns {never}
   *
   * @param {Error | VFileMessage | string} causeOrReason
   *   Reason for message, should use markdown.
   * @param {Node | NodeLike | MessageOptions | Point | Position | string | null | undefined} [optionsOrParentOrPlace]
   *   Configuration (optional).
   * @param {string | null | undefined} [origin]
   *   Place in code where the message originates (example:
   *   `'my-package:my-rule'` or `'my-rule'`).
   * @returns {never}
   *   Never.
   * @throws {VFileMessage}
   *   Message.
   */
  fail(t, n, r) {
    const i = this.message(t, n, r);
    throw i.fatal = !0, i;
  }
  /**
   * Create an info message for `reason` associated with the file.
   *
   * The `fatal` field of the message is set to `undefined` (info; change
   * likely not needed) and the `file` field is set to the current file path.
   * The message is added to the `messages` field on `file`.
   *
   * > 🪦 **Note**: also has obsolete signatures.
   *
   * @overload
   * @param {string} reason
   * @param {MessageOptions | null | undefined} [options]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {string} reason
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {string} reason
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {string} reason
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @param {Error | VFileMessage | string} causeOrReason
   *   Reason for message, should use markdown.
   * @param {Node | NodeLike | MessageOptions | Point | Position | string | null | undefined} [optionsOrParentOrPlace]
   *   Configuration (optional).
   * @param {string | null | undefined} [origin]
   *   Place in code where the message originates (example:
   *   `'my-package:my-rule'` or `'my-rule'`).
   * @returns {VFileMessage}
   *   Message.
   */
  info(t, n, r) {
    const i = this.message(t, n, r);
    return i.fatal = void 0, i;
  }
  /**
   * Create a message for `reason` associated with the file.
   *
   * The `fatal` field of the message is set to `false` (warning; change may be
   * needed) and the `file` field is set to the current file path.
   * The message is added to the `messages` field on `file`.
   *
   * > 🪦 **Note**: also has obsolete signatures.
   *
   * @overload
   * @param {string} reason
   * @param {MessageOptions | null | undefined} [options]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {string} reason
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {string} reason
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {string} reason
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @param {Error | VFileMessage | string} causeOrReason
   *   Reason for message, should use markdown.
   * @param {Node | NodeLike | MessageOptions | Point | Position | string | null | undefined} [optionsOrParentOrPlace]
   *   Configuration (optional).
   * @param {string | null | undefined} [origin]
   *   Place in code where the message originates (example:
   *   `'my-package:my-rule'` or `'my-rule'`).
   * @returns {VFileMessage}
   *   Message.
   */
  message(t, n, r) {
    const i = new He(
      // @ts-expect-error: the overloads are fine.
      t,
      n,
      r
    );
    return this.path && (i.name = this.path + ":" + i.name, i.file = this.path), i.fatal = !1, this.messages.push(i), i;
  }
  /**
   * Serialize the file.
   *
   * > **Note**: which encodings are supported depends on the engine.
   * > For info on Node.js, see:
   * > <https://nodejs.org/api/util.html#whatwg-supported-encodings>.
   *
   * @param {string | null | undefined} [encoding='utf8']
   *   Character encoding to understand `value` as when it’s a `Uint8Array`
   *   (default: `'utf-8'`).
   * @returns {string}
   *   Serialized file.
   */
  toString(t) {
    return this.value === void 0 ? "" : typeof this.value == "string" ? this.value : new TextDecoder(t || void 0).decode(this.value);
  }
}
function Ei(e, t) {
  if (e && e.includes(ht.sep))
    throw new Error(
      "`" + t + "` cannot be a path: did not expect `" + ht.sep + "`"
    );
}
function Ti(e, t) {
  if (!e)
    throw new Error("`" + t + "` cannot be empty");
}
function bu(e, t) {
  if (!e)
    throw new Error("Setting `" + t + "` requires `path` to be set too");
}
function hk(e) {
  return !!(e && typeof e == "object" && "byteLength" in e && "byteOffset" in e);
}
const fk = (
  /**
   * @type {new <Parameters extends Array<unknown>, Result>(property: string | symbol) => (...parameters: Parameters) => Result}
   */
  /** @type {unknown} */
  /**
   * @this {Function}
   * @param {string | symbol} property
   * @returns {(...parameters: Array<unknown>) => unknown}
   */
  (function(e) {
    const r = (
      /** @type {Record<string | symbol, Function>} */
      // Prototypes do exist.
      // type-coverage:ignore-next-line
      this.constructor.prototype
    ), i = r[e], a = function() {
      return i.apply(a, arguments);
    };
    return Object.setPrototypeOf(a, r), a;
  })
), pk = {}.hasOwnProperty;
class Aa extends fk {
  /**
   * Create a processor.
   */
  constructor() {
    super("copy"), this.Compiler = void 0, this.Parser = void 0, this.attachers = [], this.compiler = void 0, this.freezeIndex = -1, this.frozen = void 0, this.namespace = {}, this.parser = void 0, this.transformers = J2();
  }
  /**
   * Copy a processor.
   *
   * @deprecated
   *   This is a private internal method and should not be used.
   * @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
   *   New *unfrozen* processor ({@linkcode Processor}) that is
   *   configured to work the same as its ancestor.
   *   When the descendant processor is configured in the future it does not
   *   affect the ancestral processor.
   */
  copy() {
    const t = (
      /** @type {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>} */
      new Aa()
    );
    let n = -1;
    for (; ++n < this.attachers.length; ) {
      const r = this.attachers[n];
      t.use(...r);
    }
    return t.data(gi(!0, {}, this.namespace)), t;
  }
  /**
   * Configure the processor with info available to all plugins.
   * Information is stored in an object.
   *
   * Typically, options can be given to a specific plugin, but sometimes it
   * makes sense to have information shared with several plugins.
   * For example, a list of HTML elements that are self-closing, which is
   * needed during all phases.
   *
   * > **Note**: setting information cannot occur on *frozen* processors.
   * > Call the processor first to create a new unfrozen processor.
   *
   * > **Note**: to register custom data in TypeScript, augment the
   * > {@linkcode Data} interface.
   *
   * @example
   *   This example show how to get and set info:
   *
   *   ```js
   *   import {unified} from 'unified'
   *
   *   const processor = unified().data('alpha', 'bravo')
   *
   *   processor.data('alpha') // => 'bravo'
   *
   *   processor.data() // => {alpha: 'bravo'}
   *
   *   processor.data({charlie: 'delta'})
   *
   *   processor.data() // => {charlie: 'delta'}
   *   ```
   *
   * @template {keyof Data} Key
   *
   * @overload
   * @returns {Data}
   *
   * @overload
   * @param {Data} dataset
   * @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
   *
   * @overload
   * @param {Key} key
   * @returns {Data[Key]}
   *
   * @overload
   * @param {Key} key
   * @param {Data[Key]} value
   * @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
   *
   * @param {Data | Key} [key]
   *   Key to get or set, or entire dataset to set, or nothing to get the
   *   entire dataset (optional).
   * @param {Data[Key]} [value]
   *   Value to set (optional).
   * @returns {unknown}
   *   The current processor when setting, the value at `key` when getting, or
   *   the entire dataset when getting without key.
   */
  data(t, n) {
    return typeof t == "string" ? arguments.length === 2 ? (yi("data", this.frozen), this.namespace[t] = n, this) : pk.call(this.namespace, t) && this.namespace[t] || void 0 : t ? (yi("data", this.frozen), this.namespace = t, this) : this.namespace;
  }
  /**
   * Freeze a processor.
   *
   * Frozen processors are meant to be extended and not to be configured
   * directly.
   *
   * When a processor is frozen it cannot be unfrozen.
   * New processors working the same way can be created by calling the
   * processor.
   *
   * It’s possible to freeze processors explicitly by calling `.freeze()`.
   * Processors freeze automatically when `.parse()`, `.run()`, `.runSync()`,
   * `.stringify()`, `.process()`, or `.processSync()` are called.
   *
   * @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
   *   The current processor.
   */
  freeze() {
    if (this.frozen)
      return this;
    const t = (
      /** @type {Processor} */
      /** @type {unknown} */
      this
    );
    for (; ++this.freezeIndex < this.attachers.length; ) {
      const [n, ...r] = this.attachers[this.freezeIndex];
      if (r[0] === !1)
        continue;
      r[0] === !0 && (r[0] = void 0);
      const i = n.call(t, ...r);
      typeof i == "function" && this.transformers.use(i);
    }
    return this.frozen = !0, this.freezeIndex = Number.POSITIVE_INFINITY, this;
  }
  /**
   * Parse text to a syntax tree.
   *
   * > **Note**: `parse` freezes the processor if not already *frozen*.
   *
   * > **Note**: `parse` performs the parse phase, not the run phase or other
   * > phases.
   *
   * @param {Compatible | undefined} [file]
   *   file to parse (optional); typically `string` or `VFile`; any value
   *   accepted as `x` in `new VFile(x)`.
   * @returns {ParseTree extends undefined ? Node : ParseTree}
   *   Syntax tree representing `file`.
   */
  parse(t) {
    this.freeze();
    const n = pr(t), r = this.parser || this.Parser;
    return ki("parse", r), r(String(n), n);
  }
  /**
   * Process the given file as configured on the processor.
   *
   * > **Note**: `process` freezes the processor if not already *frozen*.
   *
   * > **Note**: `process` performs the parse, run, and stringify phases.
   *
   * @overload
   * @param {Compatible | undefined} file
   * @param {ProcessCallback<VFileWithOutput<CompileResult>>} done
   * @returns {undefined}
   *
   * @overload
   * @param {Compatible | undefined} [file]
   * @returns {Promise<VFileWithOutput<CompileResult>>}
   *
   * @param {Compatible | undefined} [file]
   *   File (optional); typically `string` or `VFile`]; any value accepted as
   *   `x` in `new VFile(x)`.
   * @param {ProcessCallback<VFileWithOutput<CompileResult>> | undefined} [done]
   *   Callback (optional).
   * @returns {Promise<VFile> | undefined}
   *   Nothing if `done` is given.
   *   Otherwise a promise, rejected with a fatal error or resolved with the
   *   processed file.
   *
   *   The parsed, transformed, and compiled value is available at
   *   `file.value` (see note).
   *
   *   > **Note**: unified typically compiles by serializing: most
   *   > compilers return `string` (or `Uint8Array`).
   *   > Some compilers, such as the one configured with
   *   > [`rehype-react`][rehype-react], return other values (in this case, a
   *   > React tree).
   *   > If you’re using a compiler that doesn’t serialize, expect different
   *   > result values.
   *   >
   *   > To register custom results in TypeScript, add them to
   *   > {@linkcode CompileResultMap}.
   *
   *   [rehype-react]: https://github.com/rehypejs/rehype-react
   */
  process(t, n) {
    const r = this;
    return this.freeze(), ki("process", this.parser || this.Parser), xi("process", this.compiler || this.Compiler), n ? i(void 0, n) : new Promise(i);
    function i(a, s) {
      const u = pr(t), o = (
        /** @type {HeadTree extends undefined ? Node : HeadTree} */
        /** @type {unknown} */
        r.parse(u)
      );
      r.run(o, u, function(d, h, p) {
        if (d || !h || !p)
          return c(d);
        const f = (
          /** @type {CompileTree extends undefined ? Node : CompileTree} */
          /** @type {unknown} */
          h
        ), g = r.stringify(f, p);
        bk(g) ? p.value = g : p.result = g, c(
          d,
          /** @type {VFileWithOutput<CompileResult>} */
          p
        );
      });
      function c(d, h) {
        d || !h ? s(d) : a ? a(h) : n(void 0, h);
      }
    }
  }
  /**
   * Process the given file as configured on the processor.
   *
   * An error is thrown if asynchronous transforms are configured.
   *
   * > **Note**: `processSync` freezes the processor if not already *frozen*.
   *
   * > **Note**: `processSync` performs the parse, run, and stringify phases.
   *
   * @param {Compatible | undefined} [file]
   *   File (optional); typically `string` or `VFile`; any value accepted as
   *   `x` in `new VFile(x)`.
   * @returns {VFileWithOutput<CompileResult>}
   *   The processed file.
   *
   *   The parsed, transformed, and compiled value is available at
   *   `file.value` (see note).
   *
   *   > **Note**: unified typically compiles by serializing: most
   *   > compilers return `string` (or `Uint8Array`).
   *   > Some compilers, such as the one configured with
   *   > [`rehype-react`][rehype-react], return other values (in this case, a
   *   > React tree).
   *   > If you’re using a compiler that doesn’t serialize, expect different
   *   > result values.
   *   >
   *   > To register custom results in TypeScript, add them to
   *   > {@linkcode CompileResultMap}.
   *
   *   [rehype-react]: https://github.com/rehypejs/rehype-react
   */
  processSync(t) {
    let n = !1, r;
    return this.freeze(), ki("processSync", this.parser || this.Parser), xi("processSync", this.compiler || this.Compiler), this.process(t, i), Tu("processSync", "process", n), r;
    function i(a, s) {
      n = !0, mu(a), r = s;
    }
  }
  /**
   * Run *transformers* on a syntax tree.
   *
   * > **Note**: `run` freezes the processor if not already *frozen*.
   *
   * > **Note**: `run` performs the run phase, not other phases.
   *
   * @overload
   * @param {HeadTree extends undefined ? Node : HeadTree} tree
   * @param {RunCallback<TailTree extends undefined ? Node : TailTree>} done
   * @returns {undefined}
   *
   * @overload
   * @param {HeadTree extends undefined ? Node : HeadTree} tree
   * @param {Compatible | undefined} file
   * @param {RunCallback<TailTree extends undefined ? Node : TailTree>} done
   * @returns {undefined}
   *
   * @overload
   * @param {HeadTree extends undefined ? Node : HeadTree} tree
   * @param {Compatible | undefined} [file]
   * @returns {Promise<TailTree extends undefined ? Node : TailTree>}
   *
   * @param {HeadTree extends undefined ? Node : HeadTree} tree
   *   Tree to transform and inspect.
   * @param {(
   *   RunCallback<TailTree extends undefined ? Node : TailTree> |
   *   Compatible
   * )} [file]
   *   File associated with `node` (optional); any value accepted as `x` in
   *   `new VFile(x)`.
   * @param {RunCallback<TailTree extends undefined ? Node : TailTree>} [done]
   *   Callback (optional).
   * @returns {Promise<TailTree extends undefined ? Node : TailTree> | undefined}
   *   Nothing if `done` is given.
   *   Otherwise, a promise rejected with a fatal error or resolved with the
   *   transformed tree.
   */
  run(t, n, r) {
    Eu(t), this.freeze();
    const i = this.transformers;
    return !r && typeof n == "function" && (r = n, n = void 0), r ? a(void 0, r) : new Promise(a);
    function a(s, u) {
      const o = pr(n);
      i.run(t, o, c);
      function c(d, h, p) {
        const f = (
          /** @type {TailTree extends undefined ? Node : TailTree} */
          h || t
        );
        d ? u(d) : s ? s(f) : r(void 0, f, p);
      }
    }
  }
  /**
   * Run *transformers* on a syntax tree.
   *
   * An error is thrown if asynchronous transforms are configured.
   *
   * > **Note**: `runSync` freezes the processor if not already *frozen*.
   *
   * > **Note**: `runSync` performs the run phase, not other phases.
   *
   * @param {HeadTree extends undefined ? Node : HeadTree} tree
   *   Tree to transform and inspect.
   * @param {Compatible | undefined} [file]
   *   File associated with `node` (optional); any value accepted as `x` in
   *   `new VFile(x)`.
   * @returns {TailTree extends undefined ? Node : TailTree}
   *   Transformed tree.
   */
  runSync(t, n) {
    let r = !1, i;
    return this.run(t, n, a), Tu("runSync", "run", r), i;
    function a(s, u) {
      mu(s), i = u, r = !0;
    }
  }
  /**
   * Compile a syntax tree.
   *
   * > **Note**: `stringify` freezes the processor if not already *frozen*.
   *
   * > **Note**: `stringify` performs the stringify phase, not the run phase
   * > or other phases.
   *
   * @param {CompileTree extends undefined ? Node : CompileTree} tree
   *   Tree to compile.
   * @param {Compatible | undefined} [file]
   *   File associated with `node` (optional); any value accepted as `x` in
   *   `new VFile(x)`.
   * @returns {CompileResult extends undefined ? Value : CompileResult}
   *   Textual representation of the tree (see note).
   *
   *   > **Note**: unified typically compiles by serializing: most compilers
   *   > return `string` (or `Uint8Array`).
   *   > Some compilers, such as the one configured with
   *   > [`rehype-react`][rehype-react], return other values (in this case, a
   *   > React tree).
   *   > If you’re using a compiler that doesn’t serialize, expect different
   *   > result values.
   *   >
   *   > To register custom results in TypeScript, add them to
   *   > {@linkcode CompileResultMap}.
   *
   *   [rehype-react]: https://github.com/rehypejs/rehype-react
   */
  stringify(t, n) {
    this.freeze();
    const r = pr(n), i = this.compiler || this.Compiler;
    return xi("stringify", i), Eu(t), i(t, r);
  }
  /**
   * Configure the processor to use a plugin, a list of usable values, or a
   * preset.
   *
   * If the processor is already using a plugin, the previous plugin
   * configuration is changed based on the options that are passed in.
   * In other words, the plugin is not added a second time.
   *
   * > **Note**: `use` cannot be called on *frozen* processors.
   * > Call the processor first to create a new unfrozen processor.
   *
   * @example
   *   There are many ways to pass plugins to `.use()`.
   *   This example gives an overview:
   *
   *   ```js
   *   import {unified} from 'unified'
   *
   *   unified()
   *     // Plugin with options:
   *     .use(pluginA, {x: true, y: true})
   *     // Passing the same plugin again merges configuration (to `{x: true, y: false, z: true}`):
   *     .use(pluginA, {y: false, z: true})
   *     // Plugins:
   *     .use([pluginB, pluginC])
   *     // Two plugins, the second with options:
   *     .use([pluginD, [pluginE, {}]])
   *     // Preset with plugins and settings:
   *     .use({plugins: [pluginF, [pluginG, {}]], settings: {position: false}})
   *     // Settings only:
   *     .use({settings: {position: false}})
   *   ```
   *
   * @template {Array<unknown>} [Parameters=[]]
   * @template {Node | string | undefined} [Input=undefined]
   * @template [Output=Input]
   *
   * @overload
   * @param {Preset | null | undefined} [preset]
   * @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
   *
   * @overload
   * @param {PluggableList} list
   * @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
   *
   * @overload
   * @param {Plugin<Parameters, Input, Output>} plugin
   * @param {...(Parameters | [boolean])} parameters
   * @returns {UsePlugin<ParseTree, HeadTree, TailTree, CompileTree, CompileResult, Input, Output>}
   *
   * @param {PluggableList | Plugin | Preset | null | undefined} value
   *   Usable value.
   * @param {...unknown} parameters
   *   Parameters, when a plugin is given as a usable value.
   * @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
   *   Current processor.
   */
  use(t, ...n) {
    const r = this.attachers, i = this.namespace;
    if (yi("use", this.frozen), t != null) if (typeof t == "function")
      o(t, n);
    else if (typeof t == "object")
      Array.isArray(t) ? u(t) : s(t);
    else
      throw new TypeError("Expected usable value, not `" + t + "`");
    return this;
    function a(c) {
      if (typeof c == "function")
        o(c, []);
      else if (typeof c == "object")
        if (Array.isArray(c)) {
          const [d, ...h] = (
            /** @type {PluginTuple<Array<unknown>>} */
            c
          );
          o(d, h);
        } else
          s(c);
      else
        throw new TypeError("Expected usable value, not `" + c + "`");
    }
    function s(c) {
      if (!("plugins" in c) && !("settings" in c))
        throw new Error(
          "Expected usable value but received an empty preset, which is probably a mistake: presets typically come with `plugins` and sometimes with `settings`, but this has neither"
        );
      u(c.plugins), c.settings && (i.settings = gi(!0, i.settings, c.settings));
    }
    function u(c) {
      let d = -1;
      if (c != null) if (Array.isArray(c))
        for (; ++d < c.length; ) {
          const h = c[d];
          a(h);
        }
      else
        throw new TypeError("Expected a list of plugins, not `" + c + "`");
    }
    function o(c, d) {
      let h = -1, p = -1;
      for (; ++h < r.length; )
        if (r[h][0] === c) {
          p = h;
          break;
        }
      if (p === -1)
        r.push([c, ...d]);
      else if (d.length > 0) {
        let [f, ...g] = d;
        const y = r[p][1];
        Ui(y) && Ui(f) && (f = gi(!0, y, f)), r[p] = [c, f, ...g];
      }
    }
  }
}
const mk = new Aa().freeze();
function ki(e, t) {
  if (typeof t != "function")
    throw new TypeError("Cannot `" + e + "` without `parser`");
}
function xi(e, t) {
  if (typeof t != "function")
    throw new TypeError("Cannot `" + e + "` without `compiler`");
}
function yi(e, t) {
  if (t)
    throw new Error(
      "Cannot call `" + e + "` on a frozen processor.\nCreate a new processor first, by calling it: use `processor()` instead of `processor`."
    );
}
function Eu(e) {
  if (!Ui(e) || typeof e.type != "string")
    throw new TypeError("Expected node, got `" + e + "`");
}
function Tu(e, t, n) {
  if (!n)
    throw new Error(
      "`" + e + "` finished async. Use `" + t + "` instead"
    );
}
function pr(e) {
  return gk(e) ? e : new dk(e);
}
function gk(e) {
  return !!(e && typeof e == "object" && "message" in e && "messages" in e);
}
function bk(e) {
  return typeof e == "string" || Ek(e);
}
function Ek(e) {
  return !!(e && typeof e == "object" && "byteLength" in e && "byteOffset" in e);
}
function _a() {
  return { async: !1, breaks: !1, extensions: null, gfm: !0, hooks: null, pedantic: !1, renderer: null, silent: !1, tokenizer: null, walkTokens: null };
}
var sn = _a();
function fc(e) {
  sn = e;
}
var qt = { exec: () => null };
function oe(e, t = "") {
  let n = typeof e == "string" ? e : e.source, r = { replace: (i, a) => {
    let s = typeof a == "string" ? a : a.source;
    return s = s.replace(Ye.caret, "$1"), n = n.replace(i, s), r;
  }, getRegex: () => new RegExp(n, t) };
  return r;
}
var Tk = (() => {
  try {
    return !!new RegExp("(?<=1)(?<!1)");
  } catch {
    return !1;
  }
})(), Ye = { codeRemoveIndent: /^(?: {1,4}| {0,3}\t)/gm, outputLinkReplace: /\\([\[\]])/g, indentCodeCompensation: /^(\s+)(?:```)/, beginningSpace: /^\s+/, endingHash: /#$/, startingSpaceChar: /^ /, endingSpaceChar: / $/, nonSpaceChar: /[^ ]/, newLineCharGlobal: /\n/g, tabCharGlobal: /\t/g, multipleSpaceGlobal: /\s+/g, blankLine: /^[ \t]*$/, doubleBlankLine: /\n[ \t]*\n[ \t]*$/, blockquoteStart: /^ {0,3}>/, blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g, blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm, listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g, listIsTask: /^\[[ xX]\] +\S/, listReplaceTask: /^\[[ xX]\] +/, listTaskCheckbox: /\[[ xX]\]/, anyLine: /\n.*\n/, hrefBrackets: /^<(.*)>$/, tableDelimiter: /[:|]/, tableAlignChars: /^\||\| *$/g, tableRowBlankLine: /\n[ \t]*$/, tableAlignRight: /^ *-+: *$/, tableAlignCenter: /^ *:-+: *$/, tableAlignLeft: /^ *:-+ *$/, startATag: /^<a /i, endATag: /^<\/a>/i, startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i, endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i, startAngleBracket: /^</, endAngleBracket: />$/, pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/, unicodeAlphaNumeric: /[\p{L}\p{N}]/u, escapeTest: /[&<>"']/, escapeReplace: /[&<>"']/g, escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/, escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g, caret: /(^|[^\[])\^/g, percentDecode: /%25/g, findPipe: /\|/g, splitPipe: / \|/, slashPipe: /\\\|/g, carriageReturn: /\r\n|\r/g, spaceLine: /^ +$/gm, notSpaceStart: /^\S*/, endingNewline: /\n$/, listItemRegex: (e) => new RegExp(`^( {0,3}${e})((?:[	 ][^\\n]*)?(?:\\n|$))`), nextBulletRegex: (e) => new RegExp(`^ {0,${Math.min(3, e - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`), hrRegex: (e) => new RegExp(`^ {0,${Math.min(3, e - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`), fencesBeginRegex: (e) => new RegExp(`^ {0,${Math.min(3, e - 1)}}(?:\`\`\`|~~~)`), headingBeginRegex: (e) => new RegExp(`^ {0,${Math.min(3, e - 1)}}#`), htmlBeginRegex: (e) => new RegExp(`^ {0,${Math.min(3, e - 1)}}<(?:[a-z].*>|!--)`, "i"), blockquoteBeginRegex: (e) => new RegExp(`^ {0,${Math.min(3, e - 1)}}>`) }, kk = /^(?:[ \t]*(?:\n|$))+/, xk = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/, yk = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/, ar = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/, Ak = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/, Ca = / {0,3}(?:[*+-]|\d{1,9}[.)])/, pc = /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/, mc = oe(pc).replace(/bull/g, Ca).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/\|table/g, "").getRegex(), _k = oe(pc).replace(/bull/g, Ca).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(), Ia = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/, Ck = /^[^\n]+/, Na = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/, Ik = oe(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", Na).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(), Nk = oe(/^(bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g, Ca).getRegex(), Xr = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul", Sa = /<!--(?:-?>|[\s\S]*?(?:-->|$))/, Sk = oe("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))", "i").replace("comment", Sa).replace("tag", Xr).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(), gc = oe(Ia).replace("hr", ar).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", Xr).getRegex(), wk = oe(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", gc).getRegex(), wa = { blockquote: wk, code: xk, def: Ik, fences: yk, heading: Ak, hr: ar, html: Sk, lheading: mc, list: Nk, newline: kk, paragraph: gc, table: qt, text: Ck }, ku = oe("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr", ar).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}	)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", Xr).getRegex(), Lk = { ...wa, lheading: _k, table: ku, paragraph: oe(Ia).replace("hr", ar).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", ku).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", Xr).getRegex() }, Rk = { ...wa, html: oe(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment", Sa).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(), def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/, heading: /^(#{1,6})(.*)(?:\n+|$)/, fences: qt, lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/, paragraph: oe(Ia).replace("hr", ar).replace("heading", ` *#{1,6} *[^
]`).replace("lheading", mc).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex() }, Ok = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/, Dk = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/, bc = /^( {2,}|\\)\n(?!\s*$)/, Pk = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/, xn = /[\p{P}\p{S}]/u, Zr = /[\s\p{P}\p{S}]/u, La = /[^\s\p{P}\p{S}]/u, Mk = oe(/^((?![*_])punctSpace)/, "u").replace(/punctSpace/g, Zr).getRegex(), Ec = /(?!~)[\p{P}\p{S}]/u, vk = /(?!~)[\s\p{P}\p{S}]/u, Bk = /(?:[^\s\p{P}\p{S}]|~)/u, Fk = oe(/link|precode-code|html/, "g").replace("link", /\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-", Tk ? "(?<!`)()" : "(^^|[^`])").replace("code", /(?<b>`+)[^`]+\k<b>(?!`)/).replace("html", /<(?! )[^<>]*?>/).getRegex(), Tc = /^(?:\*+(?:((?!\*)punct)|([^\s*]))?)|^_+(?:((?!_)punct)|([^\s_]))?/, Hk = oe(Tc, "u").replace(/punct/g, xn).getRegex(), Uk = oe(Tc, "u").replace(/punct/g, Ec).getRegex(), kc = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)", zk = oe(kc, "gu").replace(/notPunctSpace/g, La).replace(/punctSpace/g, Zr).replace(/punct/g, xn).getRegex(), $k = oe(kc, "gu").replace(/notPunctSpace/g, Bk).replace(/punctSpace/g, vk).replace(/punct/g, Ec).getRegex(), jk = oe("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)", "gu").replace(/notPunctSpace/g, La).replace(/punctSpace/g, Zr).replace(/punct/g, xn).getRegex(), Yk = oe(/^~~?(?:((?!~)punct)|[^\s~])/, "u").replace(/punct/g, xn).getRegex(), qk = "^[^~]+(?=[^~])|(?!~)punct(~~?)(?=[\\s]|$)|notPunctSpace(~~?)(?!~)(?=punctSpace|$)|(?!~)punctSpace(~~?)(?=notPunctSpace)|[\\s](~~?)(?!~)(?=punct)|(?!~)punct(~~?)(?!~)(?=punct)|notPunctSpace(~~?)(?=notPunctSpace)", Vk = oe(qk, "gu").replace(/notPunctSpace/g, La).replace(/punctSpace/g, Zr).replace(/punct/g, xn).getRegex(), Wk = oe(/\\(punct)/, "gu").replace(/punct/g, xn).getRegex(), Gk = oe(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(), Qk = oe(Sa).replace("(?:-->|$)", "-->").getRegex(), Kk = oe("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment", Qk).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(), Or = /(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\])|[^\[\]\\`])*?/, Xk = oe(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]+(?:\n[ \t]*)?|\n[ \t]*)(title))?\s*\)/).replace("label", Or).replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(), xc = oe(/^!?\[(label)\]\[(ref)\]/).replace("label", Or).replace("ref", Na).getRegex(), yc = oe(/^!?\[(ref)\](?:\[\])?/).replace("ref", Na).getRegex(), Zk = oe("reflink|nolink(?!\\()", "g").replace("reflink", xc).replace("nolink", yc).getRegex(), xu = /[hH][tT][tT][pP][sS]?|[fF][tT][pP]/, Ra = { _backpedal: qt, anyPunctuation: Wk, autolink: Gk, blockSkip: Fk, br: bc, code: Dk, del: qt, delLDelim: qt, delRDelim: qt, emStrongLDelim: Hk, emStrongRDelimAst: zk, emStrongRDelimUnd: jk, escape: Ok, link: Xk, nolink: yc, punctuation: Mk, reflink: xc, reflinkSearch: Zk, tag: Kk, text: Pk, url: qt }, Jk = { ...Ra, link: oe(/^!?\[(label)\]\((.*?)\)/).replace("label", Or).getRegex(), reflink: oe(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", Or).getRegex() }, $i = { ...Ra, emStrongRDelimAst: $k, emStrongLDelim: Uk, delLDelim: Yk, delRDelim: Vk, url: oe(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol", xu).replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(), _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/, del: /^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/, text: oe(/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol", xu).getRegex() }, ex = { ...$i, br: oe(bc).replace("{2,}", "*").getRegex(), text: oe($i.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex() }, mr = { normal: wa, gfm: Lk, pedantic: Rk }, Dn = { normal: Ra, gfm: $i, breaks: ex, pedantic: Jk }, tx = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }, yu = (e) => tx[e];
function dt(e, t) {
  if (t) {
    if (Ye.escapeTest.test(e)) return e.replace(Ye.escapeReplace, yu);
  } else if (Ye.escapeTestNoEncode.test(e)) return e.replace(Ye.escapeReplaceNoEncode, yu);
  return e;
}
function Au(e) {
  try {
    e = encodeURI(e).replace(Ye.percentDecode, "%");
  } catch {
    return null;
  }
  return e;
}
function _u(e, t) {
  let n = e.replace(Ye.findPipe, (a, s, u) => {
    let o = !1, c = s;
    for (; --c >= 0 && u[c] === "\\"; ) o = !o;
    return o ? "|" : " |";
  }), r = n.split(Ye.splitPipe), i = 0;
  if (r[0].trim() || r.shift(), r.length > 0 && !r.at(-1)?.trim() && r.pop(), t) if (r.length > t) r.splice(t);
  else for (; r.length < t; ) r.push("");
  for (; i < r.length; i++) r[i] = r[i].trim().replace(Ye.slashPipe, "|");
  return r;
}
function Pn(e, t, n) {
  let r = e.length;
  if (r === 0) return "";
  let i = 0;
  for (; i < r && e.charAt(r - i - 1) === t; )
    i++;
  return e.slice(0, r - i);
}
function nx(e, t) {
  if (e.indexOf(t[1]) === -1) return -1;
  let n = 0;
  for (let r = 0; r < e.length; r++) if (e[r] === "\\") r++;
  else if (e[r] === t[0]) n++;
  else if (e[r] === t[1] && (n--, n < 0)) return r;
  return n > 0 ? -2 : -1;
}
function rx(e, t = 0) {
  let n = t, r = "";
  for (let i of e) if (i === "	") {
    let a = 4 - n % 4;
    r += " ".repeat(a), n += a;
  } else r += i, n++;
  return r;
}
function Cu(e, t, n, r, i) {
  let a = t.href, s = t.title || null, u = e[1].replace(i.other.outputLinkReplace, "$1");
  r.state.inLink = !0;
  let o = { type: e[0].charAt(0) === "!" ? "image" : "link", raw: n, href: a, title: s, text: u, tokens: r.inlineTokens(u) };
  return r.state.inLink = !1, o;
}
function ix(e, t, n) {
  let r = e.match(n.other.indentCodeCompensation);
  if (r === null) return t;
  let i = r[1];
  return t.split(`
`).map((a) => {
    let s = a.match(n.other.beginningSpace);
    if (s === null) return a;
    let [u] = s;
    return u.length >= i.length ? a.slice(i.length) : a;
  }).join(`
`);
}
var Dr = class {
  options;
  rules;
  lexer;
  constructor(e) {
    this.options = e || sn;
  }
  space(e) {
    let t = this.rules.block.newline.exec(e);
    if (t && t[0].length > 0) return { type: "space", raw: t[0] };
  }
  code(e) {
    let t = this.rules.block.code.exec(e);
    if (t) {
      let n = t[0].replace(this.rules.other.codeRemoveIndent, "");
      return { type: "code", raw: t[0], codeBlockStyle: "indented", text: this.options.pedantic ? n : Pn(n, `
`) };
    }
  }
  fences(e) {
    let t = this.rules.block.fences.exec(e);
    if (t) {
      let n = t[0], r = ix(n, t[3] || "", this.rules);
      return { type: "code", raw: n, lang: t[2] ? t[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : t[2], text: r };
    }
  }
  heading(e) {
    let t = this.rules.block.heading.exec(e);
    if (t) {
      let n = t[2].trim();
      if (this.rules.other.endingHash.test(n)) {
        let r = Pn(n, "#");
        (this.options.pedantic || !r || this.rules.other.endingSpaceChar.test(r)) && (n = r.trim());
      }
      return { type: "heading", raw: t[0], depth: t[1].length, text: n, tokens: this.lexer.inline(n) };
    }
  }
  hr(e) {
    let t = this.rules.block.hr.exec(e);
    if (t) return { type: "hr", raw: Pn(t[0], `
`) };
  }
  blockquote(e) {
    let t = this.rules.block.blockquote.exec(e);
    if (t) {
      let n = Pn(t[0], `
`).split(`
`), r = "", i = "", a = [];
      for (; n.length > 0; ) {
        let s = !1, u = [], o;
        for (o = 0; o < n.length; o++) if (this.rules.other.blockquoteStart.test(n[o])) u.push(n[o]), s = !0;
        else if (!s) u.push(n[o]);
        else break;
        n = n.slice(o);
        let c = u.join(`
`), d = c.replace(this.rules.other.blockquoteSetextReplace, `
    $1`).replace(this.rules.other.blockquoteSetextReplace2, "");
        r = r ? `${r}
${c}` : c, i = i ? `${i}
${d}` : d;
        let h = this.lexer.state.top;
        if (this.lexer.state.top = !0, this.lexer.blockTokens(d, a, !0), this.lexer.state.top = h, n.length === 0) break;
        let p = a.at(-1);
        if (p?.type === "code") break;
        if (p?.type === "blockquote") {
          let f = p, g = f.raw + `
` + n.join(`
`), y = this.blockquote(g);
          a[a.length - 1] = y, r = r.substring(0, r.length - f.raw.length) + y.raw, i = i.substring(0, i.length - f.text.length) + y.text;
          break;
        } else if (p?.type === "list") {
          let f = p, g = f.raw + `
` + n.join(`
`), y = this.list(g);
          a[a.length - 1] = y, r = r.substring(0, r.length - p.raw.length) + y.raw, i = i.substring(0, i.length - f.raw.length) + y.raw, n = g.substring(a.at(-1).raw.length).split(`
`);
          continue;
        }
      }
      return { type: "blockquote", raw: r, tokens: a, text: i };
    }
  }
  list(e) {
    let t = this.rules.block.list.exec(e);
    if (t) {
      let n = t[1].trim(), r = n.length > 1, i = { type: "list", raw: "", ordered: r, start: r ? +n.slice(0, -1) : "", loose: !1, items: [] };
      n = r ? `\\d{1,9}\\${n.slice(-1)}` : `\\${n}`, this.options.pedantic && (n = r ? n : "[*+-]");
      let a = this.rules.other.listItemRegex(n), s = !1;
      for (; e; ) {
        let o = !1, c = "", d = "";
        if (!(t = a.exec(e)) || this.rules.block.hr.test(e)) break;
        c = t[0], e = e.substring(c.length);
        let h = rx(t[2].split(`
`, 1)[0], t[1].length), p = e.split(`
`, 1)[0], f = !h.trim(), g = 0;
        if (this.options.pedantic ? (g = 2, d = h.trimStart()) : f ? g = t[1].length + 1 : (g = h.search(this.rules.other.nonSpaceChar), g = g > 4 ? 1 : g, d = h.slice(g), g += t[1].length), f && this.rules.other.blankLine.test(p) && (c += p + `
`, e = e.substring(p.length + 1), o = !0), !o) {
          let y = this.rules.other.nextBulletRegex(g), C = this.rules.other.hrRegex(g), k = this.rules.other.fencesBeginRegex(g), I = this.rules.other.headingBeginRegex(g), _ = this.rules.other.htmlBeginRegex(g), v = this.rules.other.blockquoteBeginRegex(g);
          for (; e; ) {
            let M = e.split(`
`, 1)[0], S;
            if (p = M, this.options.pedantic ? (p = p.replace(this.rules.other.listReplaceNesting, "  "), S = p) : S = p.replace(this.rules.other.tabCharGlobal, "    "), k.test(p) || I.test(p) || _.test(p) || v.test(p) || y.test(p) || C.test(p)) break;
            if (S.search(this.rules.other.nonSpaceChar) >= g || !p.trim()) d += `
` + S.slice(g);
            else {
              if (f || h.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4 || k.test(h) || I.test(h) || C.test(h)) break;
              d += `
` + p;
            }
            f = !p.trim(), c += M + `
`, e = e.substring(M.length + 1), h = S.slice(g);
          }
        }
        i.loose || (s ? i.loose = !0 : this.rules.other.doubleBlankLine.test(c) && (s = !0)), i.items.push({ type: "list_item", raw: c, task: !!this.options.gfm && this.rules.other.listIsTask.test(d), loose: !1, text: d, tokens: [] }), i.raw += c;
      }
      let u = i.items.at(-1);
      if (u) u.raw = u.raw.trimEnd(), u.text = u.text.trimEnd();
      else return;
      i.raw = i.raw.trimEnd();
      for (let o of i.items) {
        if (this.lexer.state.top = !1, o.tokens = this.lexer.blockTokens(o.text, []), o.task) {
          if (o.text = o.text.replace(this.rules.other.listReplaceTask, ""), o.tokens[0]?.type === "text" || o.tokens[0]?.type === "paragraph") {
            o.tokens[0].raw = o.tokens[0].raw.replace(this.rules.other.listReplaceTask, ""), o.tokens[0].text = o.tokens[0].text.replace(this.rules.other.listReplaceTask, "");
            for (let d = this.lexer.inlineQueue.length - 1; d >= 0; d--) if (this.rules.other.listIsTask.test(this.lexer.inlineQueue[d].src)) {
              this.lexer.inlineQueue[d].src = this.lexer.inlineQueue[d].src.replace(this.rules.other.listReplaceTask, "");
              break;
            }
          }
          let c = this.rules.other.listTaskCheckbox.exec(o.raw);
          if (c) {
            let d = { type: "checkbox", raw: c[0] + " ", checked: c[0] !== "[ ]" };
            o.checked = d.checked, i.loose ? o.tokens[0] && ["paragraph", "text"].includes(o.tokens[0].type) && "tokens" in o.tokens[0] && o.tokens[0].tokens ? (o.tokens[0].raw = d.raw + o.tokens[0].raw, o.tokens[0].text = d.raw + o.tokens[0].text, o.tokens[0].tokens.unshift(d)) : o.tokens.unshift({ type: "paragraph", raw: d.raw, text: d.raw, tokens: [d] }) : o.tokens.unshift(d);
          }
        }
        if (!i.loose) {
          let c = o.tokens.filter((h) => h.type === "space"), d = c.length > 0 && c.some((h) => this.rules.other.anyLine.test(h.raw));
          i.loose = d;
        }
      }
      if (i.loose) for (let o of i.items) {
        o.loose = !0;
        for (let c of o.tokens) c.type === "text" && (c.type = "paragraph");
      }
      return i;
    }
  }
  html(e) {
    let t = this.rules.block.html.exec(e);
    if (t) return { type: "html", block: !0, raw: t[0], pre: t[1] === "pre" || t[1] === "script" || t[1] === "style", text: t[0] };
  }
  def(e) {
    let t = this.rules.block.def.exec(e);
    if (t) {
      let n = t[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal, " "), r = t[2] ? t[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "", i = t[3] ? t[3].substring(1, t[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : t[3];
      return { type: "def", tag: n, raw: t[0], href: r, title: i };
    }
  }
  table(e) {
    let t = this.rules.block.table.exec(e);
    if (!t || !this.rules.other.tableDelimiter.test(t[2])) return;
    let n = _u(t[1]), r = t[2].replace(this.rules.other.tableAlignChars, "").split("|"), i = t[3]?.trim() ? t[3].replace(this.rules.other.tableRowBlankLine, "").split(`
`) : [], a = { type: "table", raw: t[0], header: [], align: [], rows: [] };
    if (n.length === r.length) {
      for (let s of r) this.rules.other.tableAlignRight.test(s) ? a.align.push("right") : this.rules.other.tableAlignCenter.test(s) ? a.align.push("center") : this.rules.other.tableAlignLeft.test(s) ? a.align.push("left") : a.align.push(null);
      for (let s = 0; s < n.length; s++) a.header.push({ text: n[s], tokens: this.lexer.inline(n[s]), header: !0, align: a.align[s] });
      for (let s of i) a.rows.push(_u(s, a.header.length).map((u, o) => ({ text: u, tokens: this.lexer.inline(u), header: !1, align: a.align[o] })));
      return a;
    }
  }
  lheading(e) {
    let t = this.rules.block.lheading.exec(e);
    if (t) {
      let n = t[1].trim();
      return { type: "heading", raw: t[0], depth: t[2].charAt(0) === "=" ? 1 : 2, text: n, tokens: this.lexer.inline(n) };
    }
  }
  paragraph(e) {
    let t = this.rules.block.paragraph.exec(e);
    if (t) {
      let n = t[1].charAt(t[1].length - 1) === `
` ? t[1].slice(0, -1) : t[1];
      return { type: "paragraph", raw: t[0], text: n, tokens: this.lexer.inline(n) };
    }
  }
  text(e) {
    let t = this.rules.block.text.exec(e);
    if (t) return { type: "text", raw: t[0], text: t[0], tokens: this.lexer.inline(t[0]) };
  }
  escape(e) {
    let t = this.rules.inline.escape.exec(e);
    if (t) return { type: "escape", raw: t[0], text: t[1] };
  }
  tag(e) {
    let t = this.rules.inline.tag.exec(e);
    if (t) return !this.lexer.state.inLink && this.rules.other.startATag.test(t[0]) ? this.lexer.state.inLink = !0 : this.lexer.state.inLink && this.rules.other.endATag.test(t[0]) && (this.lexer.state.inLink = !1), !this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(t[0]) ? this.lexer.state.inRawBlock = !0 : this.lexer.state.inRawBlock && this.rules.other.endPreScriptTag.test(t[0]) && (this.lexer.state.inRawBlock = !1), { type: "html", raw: t[0], inLink: this.lexer.state.inLink, inRawBlock: this.lexer.state.inRawBlock, block: !1, text: t[0] };
  }
  link(e) {
    let t = this.rules.inline.link.exec(e);
    if (t) {
      let n = t[2].trim();
      if (!this.options.pedantic && this.rules.other.startAngleBracket.test(n)) {
        if (!this.rules.other.endAngleBracket.test(n)) return;
        let a = Pn(n.slice(0, -1), "\\");
        if ((n.length - a.length) % 2 === 0) return;
      } else {
        let a = nx(t[2], "()");
        if (a === -2) return;
        if (a > -1) {
          let s = (t[0].indexOf("!") === 0 ? 5 : 4) + t[1].length + a;
          t[2] = t[2].substring(0, a), t[0] = t[0].substring(0, s).trim(), t[3] = "";
        }
      }
      let r = t[2], i = "";
      if (this.options.pedantic) {
        let a = this.rules.other.pedanticHrefTitle.exec(r);
        a && (r = a[1], i = a[3]);
      } else i = t[3] ? t[3].slice(1, -1) : "";
      return r = r.trim(), this.rules.other.startAngleBracket.test(r) && (this.options.pedantic && !this.rules.other.endAngleBracket.test(n) ? r = r.slice(1) : r = r.slice(1, -1)), Cu(t, { href: r && r.replace(this.rules.inline.anyPunctuation, "$1"), title: i && i.replace(this.rules.inline.anyPunctuation, "$1") }, t[0], this.lexer, this.rules);
    }
  }
  reflink(e, t) {
    let n;
    if ((n = this.rules.inline.reflink.exec(e)) || (n = this.rules.inline.nolink.exec(e))) {
      let r = (n[2] || n[1]).replace(this.rules.other.multipleSpaceGlobal, " "), i = t[r.toLowerCase()];
      if (!i) {
        let a = n[0].charAt(0);
        return { type: "text", raw: a, text: a };
      }
      return Cu(n, i, n[0], this.lexer, this.rules);
    }
  }
  emStrong(e, t, n = "") {
    let r = this.rules.inline.emStrongLDelim.exec(e);
    if (!(!r || !r[1] && !r[2] && !r[3] && !r[4] || r[4] && n.match(this.rules.other.unicodeAlphaNumeric)) && (!(r[1] || r[3]) || !n || this.rules.inline.punctuation.exec(n))) {
      let i = [...r[0]].length - 1, a, s, u = i, o = 0, c = r[0][0] === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
      for (c.lastIndex = 0, t = t.slice(-1 * e.length + i); (r = c.exec(t)) !== null; ) {
        if (a = r[1] || r[2] || r[3] || r[4] || r[5] || r[6], !a) continue;
        if (s = [...a].length, r[3] || r[4]) {
          u += s;
          continue;
        } else if ((r[5] || r[6]) && i % 3 && !((i + s) % 3)) {
          o += s;
          continue;
        }
        if (u -= s, u > 0) continue;
        s = Math.min(s, s + u + o);
        let d = [...r[0]][0].length, h = e.slice(0, i + r.index + d + s);
        if (Math.min(i, s) % 2) {
          let f = h.slice(1, -1);
          return { type: "em", raw: h, text: f, tokens: this.lexer.inlineTokens(f) };
        }
        let p = h.slice(2, -2);
        return { type: "strong", raw: h, text: p, tokens: this.lexer.inlineTokens(p) };
      }
    }
  }
  codespan(e) {
    let t = this.rules.inline.code.exec(e);
    if (t) {
      let n = t[2].replace(this.rules.other.newLineCharGlobal, " "), r = this.rules.other.nonSpaceChar.test(n), i = this.rules.other.startingSpaceChar.test(n) && this.rules.other.endingSpaceChar.test(n);
      return r && i && (n = n.substring(1, n.length - 1)), { type: "codespan", raw: t[0], text: n };
    }
  }
  br(e) {
    let t = this.rules.inline.br.exec(e);
    if (t) return { type: "br", raw: t[0] };
  }
  del(e, t, n = "") {
    let r = this.rules.inline.delLDelim.exec(e);
    if (r && (!r[1] || !n || this.rules.inline.punctuation.exec(n))) {
      let i = [...r[0]].length - 1, a, s, u = i, o = this.rules.inline.delRDelim;
      for (o.lastIndex = 0, t = t.slice(-1 * e.length + i); (r = o.exec(t)) !== null; ) {
        if (a = r[1] || r[2] || r[3] || r[4] || r[5] || r[6], !a || (s = [...a].length, s !== i)) continue;
        if (r[3] || r[4]) {
          u += s;
          continue;
        }
        if (u -= s, u > 0) continue;
        s = Math.min(s, s + u);
        let c = [...r[0]][0].length, d = e.slice(0, i + r.index + c + s), h = d.slice(i, -i);
        return { type: "del", raw: d, text: h, tokens: this.lexer.inlineTokens(h) };
      }
    }
  }
  autolink(e) {
    let t = this.rules.inline.autolink.exec(e);
    if (t) {
      let n, r;
      return t[2] === "@" ? (n = t[1], r = "mailto:" + n) : (n = t[1], r = n), { type: "link", raw: t[0], text: n, href: r, tokens: [{ type: "text", raw: n, text: n }] };
    }
  }
  url(e) {
    let t;
    if (t = this.rules.inline.url.exec(e)) {
      let n, r;
      if (t[2] === "@") n = t[0], r = "mailto:" + n;
      else {
        let i;
        do
          i = t[0], t[0] = this.rules.inline._backpedal.exec(t[0])?.[0] ?? "";
        while (i !== t[0]);
        n = t[0], t[1] === "www." ? r = "http://" + t[0] : r = t[0];
      }
      return { type: "link", raw: t[0], text: n, href: r, tokens: [{ type: "text", raw: n, text: n }] };
    }
  }
  inlineText(e) {
    let t = this.rules.inline.text.exec(e);
    if (t) {
      let n = this.lexer.state.inRawBlock;
      return { type: "text", raw: t[0], text: t[0], escaped: n };
    }
  }
}, rt = class ji {
  tokens;
  options;
  state;
  inlineQueue;
  tokenizer;
  constructor(t) {
    this.tokens = [], this.tokens.links = /* @__PURE__ */ Object.create(null), this.options = t || sn, this.options.tokenizer = this.options.tokenizer || new Dr(), this.tokenizer = this.options.tokenizer, this.tokenizer.options = this.options, this.tokenizer.lexer = this, this.inlineQueue = [], this.state = { inLink: !1, inRawBlock: !1, top: !0 };
    let n = { other: Ye, block: mr.normal, inline: Dn.normal };
    this.options.pedantic ? (n.block = mr.pedantic, n.inline = Dn.pedantic) : this.options.gfm && (n.block = mr.gfm, this.options.breaks ? n.inline = Dn.breaks : n.inline = Dn.gfm), this.tokenizer.rules = n;
  }
  static get rules() {
    return { block: mr, inline: Dn };
  }
  static lex(t, n) {
    return new ji(n).lex(t);
  }
  static lexInline(t, n) {
    return new ji(n).inlineTokens(t);
  }
  lex(t) {
    t = t.replace(Ye.carriageReturn, `
`), this.blockTokens(t, this.tokens);
    for (let n = 0; n < this.inlineQueue.length; n++) {
      let r = this.inlineQueue[n];
      this.inlineTokens(r.src, r.tokens);
    }
    return this.inlineQueue = [], this.tokens;
  }
  blockTokens(t, n = [], r = !1) {
    for (this.tokenizer.lexer = this, this.options.pedantic && (t = t.replace(Ye.tabCharGlobal, "    ").replace(Ye.spaceLine, "")); t; ) {
      let i;
      if (this.options.extensions?.block?.some((s) => (i = s.call({ lexer: this }, t, n)) ? (t = t.substring(i.raw.length), n.push(i), !0) : !1)) continue;
      if (i = this.tokenizer.space(t)) {
        t = t.substring(i.raw.length);
        let s = n.at(-1);
        i.raw.length === 1 && s !== void 0 ? s.raw += `
` : n.push(i);
        continue;
      }
      if (i = this.tokenizer.code(t)) {
        t = t.substring(i.raw.length);
        let s = n.at(-1);
        s?.type === "paragraph" || s?.type === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + i.raw, s.text += `
` + i.text, this.inlineQueue.at(-1).src = s.text) : n.push(i);
        continue;
      }
      if (i = this.tokenizer.fences(t)) {
        t = t.substring(i.raw.length), n.push(i);
        continue;
      }
      if (i = this.tokenizer.heading(t)) {
        t = t.substring(i.raw.length), n.push(i);
        continue;
      }
      if (i = this.tokenizer.hr(t)) {
        t = t.substring(i.raw.length), n.push(i);
        continue;
      }
      if (i = this.tokenizer.blockquote(t)) {
        t = t.substring(i.raw.length), n.push(i);
        continue;
      }
      if (i = this.tokenizer.list(t)) {
        t = t.substring(i.raw.length), n.push(i);
        continue;
      }
      if (i = this.tokenizer.html(t)) {
        t = t.substring(i.raw.length), n.push(i);
        continue;
      }
      if (i = this.tokenizer.def(t)) {
        t = t.substring(i.raw.length);
        let s = n.at(-1);
        s?.type === "paragraph" || s?.type === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + i.raw, s.text += `
` + i.raw, this.inlineQueue.at(-1).src = s.text) : this.tokens.links[i.tag] || (this.tokens.links[i.tag] = { href: i.href, title: i.title }, n.push(i));
        continue;
      }
      if (i = this.tokenizer.table(t)) {
        t = t.substring(i.raw.length), n.push(i);
        continue;
      }
      if (i = this.tokenizer.lheading(t)) {
        t = t.substring(i.raw.length), n.push(i);
        continue;
      }
      let a = t;
      if (this.options.extensions?.startBlock) {
        let s = 1 / 0, u = t.slice(1), o;
        this.options.extensions.startBlock.forEach((c) => {
          o = c.call({ lexer: this }, u), typeof o == "number" && o >= 0 && (s = Math.min(s, o));
        }), s < 1 / 0 && s >= 0 && (a = t.substring(0, s + 1));
      }
      if (this.state.top && (i = this.tokenizer.paragraph(a))) {
        let s = n.at(-1);
        r && s?.type === "paragraph" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + i.raw, s.text += `
` + i.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = s.text) : n.push(i), r = a.length !== t.length, t = t.substring(i.raw.length);
        continue;
      }
      if (i = this.tokenizer.text(t)) {
        t = t.substring(i.raw.length);
        let s = n.at(-1);
        s?.type === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + i.raw, s.text += `
` + i.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = s.text) : n.push(i);
        continue;
      }
      if (t) {
        let s = "Infinite loop on byte: " + t.charCodeAt(0);
        if (this.options.silent) {
          console.error(s);
          break;
        } else throw new Error(s);
      }
    }
    return this.state.top = !0, n;
  }
  inline(t, n = []) {
    return this.inlineQueue.push({ src: t, tokens: n }), n;
  }
  inlineTokens(t, n = []) {
    this.tokenizer.lexer = this;
    let r = t, i = null;
    if (this.tokens.links) {
      let o = Object.keys(this.tokens.links);
      if (o.length > 0) for (; (i = this.tokenizer.rules.inline.reflinkSearch.exec(r)) !== null; ) o.includes(i[0].slice(i[0].lastIndexOf("[") + 1, -1)) && (r = r.slice(0, i.index) + "[" + "a".repeat(i[0].length - 2) + "]" + r.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex));
    }
    for (; (i = this.tokenizer.rules.inline.anyPunctuation.exec(r)) !== null; ) r = r.slice(0, i.index) + "++" + r.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
    let a;
    for (; (i = this.tokenizer.rules.inline.blockSkip.exec(r)) !== null; ) a = i[2] ? i[2].length : 0, r = r.slice(0, i.index + a) + "[" + "a".repeat(i[0].length - a - 2) + "]" + r.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
    r = this.options.hooks?.emStrongMask?.call({ lexer: this }, r) ?? r;
    let s = !1, u = "";
    for (; t; ) {
      s || (u = ""), s = !1;
      let o;
      if (this.options.extensions?.inline?.some((d) => (o = d.call({ lexer: this }, t, n)) ? (t = t.substring(o.raw.length), n.push(o), !0) : !1)) continue;
      if (o = this.tokenizer.escape(t)) {
        t = t.substring(o.raw.length), n.push(o);
        continue;
      }
      if (o = this.tokenizer.tag(t)) {
        t = t.substring(o.raw.length), n.push(o);
        continue;
      }
      if (o = this.tokenizer.link(t)) {
        t = t.substring(o.raw.length), n.push(o);
        continue;
      }
      if (o = this.tokenizer.reflink(t, this.tokens.links)) {
        t = t.substring(o.raw.length);
        let d = n.at(-1);
        o.type === "text" && d?.type === "text" ? (d.raw += o.raw, d.text += o.text) : n.push(o);
        continue;
      }
      if (o = this.tokenizer.emStrong(t, r, u)) {
        t = t.substring(o.raw.length), n.push(o);
        continue;
      }
      if (o = this.tokenizer.codespan(t)) {
        t = t.substring(o.raw.length), n.push(o);
        continue;
      }
      if (o = this.tokenizer.br(t)) {
        t = t.substring(o.raw.length), n.push(o);
        continue;
      }
      if (o = this.tokenizer.del(t, r, u)) {
        t = t.substring(o.raw.length), n.push(o);
        continue;
      }
      if (o = this.tokenizer.autolink(t)) {
        t = t.substring(o.raw.length), n.push(o);
        continue;
      }
      if (!this.state.inLink && (o = this.tokenizer.url(t))) {
        t = t.substring(o.raw.length), n.push(o);
        continue;
      }
      let c = t;
      if (this.options.extensions?.startInline) {
        let d = 1 / 0, h = t.slice(1), p;
        this.options.extensions.startInline.forEach((f) => {
          p = f.call({ lexer: this }, h), typeof p == "number" && p >= 0 && (d = Math.min(d, p));
        }), d < 1 / 0 && d >= 0 && (c = t.substring(0, d + 1));
      }
      if (o = this.tokenizer.inlineText(c)) {
        t = t.substring(o.raw.length), o.raw.slice(-1) !== "_" && (u = o.raw.slice(-1)), s = !0;
        let d = n.at(-1);
        d?.type === "text" ? (d.raw += o.raw, d.text += o.text) : n.push(o);
        continue;
      }
      if (t) {
        let d = "Infinite loop on byte: " + t.charCodeAt(0);
        if (this.options.silent) {
          console.error(d);
          break;
        } else throw new Error(d);
      }
    }
    return n;
  }
}, Pr = class {
  options;
  parser;
  constructor(e) {
    this.options = e || sn;
  }
  space(e) {
    return "";
  }
  code({ text: e, lang: t, escaped: n }) {
    let r = (t || "").match(Ye.notSpaceStart)?.[0], i = e.replace(Ye.endingNewline, "") + `
`;
    return r ? '<pre><code class="language-' + dt(r) + '">' + (n ? i : dt(i, !0)) + `</code></pre>
` : "<pre><code>" + (n ? i : dt(i, !0)) + `</code></pre>
`;
  }
  blockquote({ tokens: e }) {
    return `<blockquote>
${this.parser.parse(e)}</blockquote>
`;
  }
  html({ text: e }) {
    return e;
  }
  def(e) {
    return "";
  }
  heading({ tokens: e, depth: t }) {
    return `<h${t}>${this.parser.parseInline(e)}</h${t}>
`;
  }
  hr(e) {
    return `<hr>
`;
  }
  list(e) {
    let t = e.ordered, n = e.start, r = "";
    for (let s = 0; s < e.items.length; s++) {
      let u = e.items[s];
      r += this.listitem(u);
    }
    let i = t ? "ol" : "ul", a = t && n !== 1 ? ' start="' + n + '"' : "";
    return "<" + i + a + `>
` + r + "</" + i + `>
`;
  }
  listitem(e) {
    return `<li>${this.parser.parse(e.tokens)}</li>
`;
  }
  checkbox({ checked: e }) {
    return "<input " + (e ? 'checked="" ' : "") + 'disabled="" type="checkbox"> ';
  }
  paragraph({ tokens: e }) {
    return `<p>${this.parser.parseInline(e)}</p>
`;
  }
  table(e) {
    let t = "", n = "";
    for (let i = 0; i < e.header.length; i++) n += this.tablecell(e.header[i]);
    t += this.tablerow({ text: n });
    let r = "";
    for (let i = 0; i < e.rows.length; i++) {
      let a = e.rows[i];
      n = "";
      for (let s = 0; s < a.length; s++) n += this.tablecell(a[s]);
      r += this.tablerow({ text: n });
    }
    return r && (r = `<tbody>${r}</tbody>`), `<table>
<thead>
` + t + `</thead>
` + r + `</table>
`;
  }
  tablerow({ text: e }) {
    return `<tr>
${e}</tr>
`;
  }
  tablecell(e) {
    let t = this.parser.parseInline(e.tokens), n = e.header ? "th" : "td";
    return (e.align ? `<${n} align="${e.align}">` : `<${n}>`) + t + `</${n}>
`;
  }
  strong({ tokens: e }) {
    return `<strong>${this.parser.parseInline(e)}</strong>`;
  }
  em({ tokens: e }) {
    return `<em>${this.parser.parseInline(e)}</em>`;
  }
  codespan({ text: e }) {
    return `<code>${dt(e, !0)}</code>`;
  }
  br(e) {
    return "<br>";
  }
  del({ tokens: e }) {
    return `<del>${this.parser.parseInline(e)}</del>`;
  }
  link({ href: e, title: t, tokens: n }) {
    let r = this.parser.parseInline(n), i = Au(e);
    if (i === null) return r;
    e = i;
    let a = '<a href="' + e + '"';
    return t && (a += ' title="' + dt(t) + '"'), a += ">" + r + "</a>", a;
  }
  image({ href: e, title: t, text: n, tokens: r }) {
    r && (n = this.parser.parseInline(r, this.parser.textRenderer));
    let i = Au(e);
    if (i === null) return dt(n);
    e = i;
    let a = `<img src="${e}" alt="${dt(n)}"`;
    return t && (a += ` title="${dt(t)}"`), a += ">", a;
  }
  text(e) {
    return "tokens" in e && e.tokens ? this.parser.parseInline(e.tokens) : "escaped" in e && e.escaped ? e.text : dt(e.text);
  }
}, Oa = class {
  strong({ text: e }) {
    return e;
  }
  em({ text: e }) {
    return e;
  }
  codespan({ text: e }) {
    return e;
  }
  del({ text: e }) {
    return e;
  }
  html({ text: e }) {
    return e;
  }
  text({ text: e }) {
    return e;
  }
  link({ text: e }) {
    return "" + e;
  }
  image({ text: e }) {
    return "" + e;
  }
  br() {
    return "";
  }
  checkbox({ raw: e }) {
    return e;
  }
}, at = class Yi {
  options;
  renderer;
  textRenderer;
  constructor(t) {
    this.options = t || sn, this.options.renderer = this.options.renderer || new Pr(), this.renderer = this.options.renderer, this.renderer.options = this.options, this.renderer.parser = this, this.textRenderer = new Oa();
  }
  static parse(t, n) {
    return new Yi(n).parse(t);
  }
  static parseInline(t, n) {
    return new Yi(n).parseInline(t);
  }
  parse(t) {
    this.renderer.parser = this;
    let n = "";
    for (let r = 0; r < t.length; r++) {
      let i = t[r];
      if (this.options.extensions?.renderers?.[i.type]) {
        let s = i, u = this.options.extensions.renderers[s.type].call({ parser: this }, s);
        if (u !== !1 || !["space", "hr", "heading", "code", "table", "blockquote", "list", "html", "def", "paragraph", "text"].includes(s.type)) {
          n += u || "";
          continue;
        }
      }
      let a = i;
      switch (a.type) {
        case "space": {
          n += this.renderer.space(a);
          break;
        }
        case "hr": {
          n += this.renderer.hr(a);
          break;
        }
        case "heading": {
          n += this.renderer.heading(a);
          break;
        }
        case "code": {
          n += this.renderer.code(a);
          break;
        }
        case "table": {
          n += this.renderer.table(a);
          break;
        }
        case "blockquote": {
          n += this.renderer.blockquote(a);
          break;
        }
        case "list": {
          n += this.renderer.list(a);
          break;
        }
        case "checkbox": {
          n += this.renderer.checkbox(a);
          break;
        }
        case "html": {
          n += this.renderer.html(a);
          break;
        }
        case "def": {
          n += this.renderer.def(a);
          break;
        }
        case "paragraph": {
          n += this.renderer.paragraph(a);
          break;
        }
        case "text": {
          n += this.renderer.text(a);
          break;
        }
        default: {
          let s = 'Token with "' + a.type + '" type was not found.';
          if (this.options.silent) return console.error(s), "";
          throw new Error(s);
        }
      }
    }
    return n;
  }
  parseInline(t, n = this.renderer) {
    this.renderer.parser = this;
    let r = "";
    for (let i = 0; i < t.length; i++) {
      let a = t[i];
      if (this.options.extensions?.renderers?.[a.type]) {
        let u = this.options.extensions.renderers[a.type].call({ parser: this }, a);
        if (u !== !1 || !["escape", "html", "link", "image", "strong", "em", "codespan", "br", "del", "text"].includes(a.type)) {
          r += u || "";
          continue;
        }
      }
      let s = a;
      switch (s.type) {
        case "escape": {
          r += n.text(s);
          break;
        }
        case "html": {
          r += n.html(s);
          break;
        }
        case "link": {
          r += n.link(s);
          break;
        }
        case "image": {
          r += n.image(s);
          break;
        }
        case "checkbox": {
          r += n.checkbox(s);
          break;
        }
        case "strong": {
          r += n.strong(s);
          break;
        }
        case "em": {
          r += n.em(s);
          break;
        }
        case "codespan": {
          r += n.codespan(s);
          break;
        }
        case "br": {
          r += n.br(s);
          break;
        }
        case "del": {
          r += n.del(s);
          break;
        }
        case "text": {
          r += n.text(s);
          break;
        }
        default: {
          let u = 'Token with "' + s.type + '" type was not found.';
          if (this.options.silent) return console.error(u), "";
          throw new Error(u);
        }
      }
    }
    return r;
  }
}, Bn = class {
  options;
  block;
  constructor(e) {
    this.options = e || sn;
  }
  static passThroughHooks = /* @__PURE__ */ new Set(["preprocess", "postprocess", "processAllTokens", "emStrongMask"]);
  static passThroughHooksRespectAsync = /* @__PURE__ */ new Set(["preprocess", "postprocess", "processAllTokens"]);
  preprocess(e) {
    return e;
  }
  postprocess(e) {
    return e;
  }
  processAllTokens(e) {
    return e;
  }
  emStrongMask(e) {
    return e;
  }
  provideLexer(e = this.block) {
    return e ? rt.lex : rt.lexInline;
  }
  provideParser(e = this.block) {
    return e ? at.parse : at.parseInline;
  }
}, ax = class {
  defaults = _a();
  options = this.setOptions;
  parse = this.parseMarkdown(!0);
  parseInline = this.parseMarkdown(!1);
  Parser = at;
  Renderer = Pr;
  TextRenderer = Oa;
  Lexer = rt;
  Tokenizer = Dr;
  Hooks = Bn;
  constructor(...t) {
    this.use(...t);
  }
  walkTokens(t, n) {
    let r = [];
    for (let i of t) switch (r = r.concat(n.call(this, i)), i.type) {
      case "table": {
        let a = i;
        for (let s of a.header) r = r.concat(this.walkTokens(s.tokens, n));
        for (let s of a.rows) for (let u of s) r = r.concat(this.walkTokens(u.tokens, n));
        break;
      }
      case "list": {
        let a = i;
        r = r.concat(this.walkTokens(a.items, n));
        break;
      }
      default: {
        let a = i;
        this.defaults.extensions?.childTokens?.[a.type] ? this.defaults.extensions.childTokens[a.type].forEach((s) => {
          let u = a[s].flat(1 / 0);
          r = r.concat(this.walkTokens(u, n));
        }) : a.tokens && (r = r.concat(this.walkTokens(a.tokens, n)));
      }
    }
    return r;
  }
  use(...t) {
    let n = this.defaults.extensions || { renderers: {}, childTokens: {} };
    return t.forEach((r) => {
      let i = { ...r };
      if (i.async = this.defaults.async || i.async || !1, r.extensions && (r.extensions.forEach((a) => {
        if (!a.name) throw new Error("extension name required");
        if ("renderer" in a) {
          let s = n.renderers[a.name];
          s ? n.renderers[a.name] = function(...u) {
            let o = a.renderer.apply(this, u);
            return o === !1 && (o = s.apply(this, u)), o;
          } : n.renderers[a.name] = a.renderer;
        }
        if ("tokenizer" in a) {
          if (!a.level || a.level !== "block" && a.level !== "inline") throw new Error("extension level must be 'block' or 'inline'");
          let s = n[a.level];
          s ? s.unshift(a.tokenizer) : n[a.level] = [a.tokenizer], a.start && (a.level === "block" ? n.startBlock ? n.startBlock.push(a.start) : n.startBlock = [a.start] : a.level === "inline" && (n.startInline ? n.startInline.push(a.start) : n.startInline = [a.start]));
        }
        "childTokens" in a && a.childTokens && (n.childTokens[a.name] = a.childTokens);
      }), i.extensions = n), r.renderer) {
        let a = this.defaults.renderer || new Pr(this.defaults);
        for (let s in r.renderer) {
          if (!(s in a)) throw new Error(`renderer '${s}' does not exist`);
          if (["options", "parser"].includes(s)) continue;
          let u = s, o = r.renderer[u], c = a[u];
          a[u] = (...d) => {
            let h = o.apply(a, d);
            return h === !1 && (h = c.apply(a, d)), h || "";
          };
        }
        i.renderer = a;
      }
      if (r.tokenizer) {
        let a = this.defaults.tokenizer || new Dr(this.defaults);
        for (let s in r.tokenizer) {
          if (!(s in a)) throw new Error(`tokenizer '${s}' does not exist`);
          if (["options", "rules", "lexer"].includes(s)) continue;
          let u = s, o = r.tokenizer[u], c = a[u];
          a[u] = (...d) => {
            let h = o.apply(a, d);
            return h === !1 && (h = c.apply(a, d)), h;
          };
        }
        i.tokenizer = a;
      }
      if (r.hooks) {
        let a = this.defaults.hooks || new Bn();
        for (let s in r.hooks) {
          if (!(s in a)) throw new Error(`hook '${s}' does not exist`);
          if (["options", "block"].includes(s)) continue;
          let u = s, o = r.hooks[u], c = a[u];
          Bn.passThroughHooks.has(s) ? a[u] = (d) => {
            if (this.defaults.async && Bn.passThroughHooksRespectAsync.has(s)) return (async () => {
              let p = await o.call(a, d);
              return c.call(a, p);
            })();
            let h = o.call(a, d);
            return c.call(a, h);
          } : a[u] = (...d) => {
            if (this.defaults.async) return (async () => {
              let p = await o.apply(a, d);
              return p === !1 && (p = await c.apply(a, d)), p;
            })();
            let h = o.apply(a, d);
            return h === !1 && (h = c.apply(a, d)), h;
          };
        }
        i.hooks = a;
      }
      if (r.walkTokens) {
        let a = this.defaults.walkTokens, s = r.walkTokens;
        i.walkTokens = function(u) {
          let o = [];
          return o.push(s.call(this, u)), a && (o = o.concat(a.call(this, u))), o;
        };
      }
      this.defaults = { ...this.defaults, ...i };
    }), this;
  }
  setOptions(t) {
    return this.defaults = { ...this.defaults, ...t }, this;
  }
  lexer(t, n) {
    return rt.lex(t, n ?? this.defaults);
  }
  parser(t, n) {
    return at.parse(t, n ?? this.defaults);
  }
  parseMarkdown(t) {
    return (n, r) => {
      let i = { ...r }, a = { ...this.defaults, ...i }, s = this.onError(!!a.silent, !!a.async);
      if (this.defaults.async === !0 && i.async === !1) return s(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
      if (typeof n > "u" || n === null) return s(new Error("marked(): input parameter is undefined or null"));
      if (typeof n != "string") return s(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(n) + ", string expected"));
      if (a.hooks && (a.hooks.options = a, a.hooks.block = t), a.async) return (async () => {
        let u = a.hooks ? await a.hooks.preprocess(n) : n, o = await (a.hooks ? await a.hooks.provideLexer(t) : t ? rt.lex : rt.lexInline)(u, a), c = a.hooks ? await a.hooks.processAllTokens(o) : o;
        a.walkTokens && await Promise.all(this.walkTokens(c, a.walkTokens));
        let d = await (a.hooks ? await a.hooks.provideParser(t) : t ? at.parse : at.parseInline)(c, a);
        return a.hooks ? await a.hooks.postprocess(d) : d;
      })().catch(s);
      try {
        a.hooks && (n = a.hooks.preprocess(n));
        let u = (a.hooks ? a.hooks.provideLexer(t) : t ? rt.lex : rt.lexInline)(n, a);
        a.hooks && (u = a.hooks.processAllTokens(u)), a.walkTokens && this.walkTokens(u, a.walkTokens);
        let o = (a.hooks ? a.hooks.provideParser(t) : t ? at.parse : at.parseInline)(u, a);
        return a.hooks && (o = a.hooks.postprocess(o)), o;
      } catch (u) {
        return s(u);
      }
    };
  }
  onError(t, n) {
    return (r) => {
      if (r.message += `
Please report this to https://github.com/markedjs/marked.`, t) {
        let i = "<p>An error occurred:</p><pre>" + dt(r.message + "", !0) + "</pre>";
        return n ? Promise.resolve(i) : i;
      }
      if (n) return Promise.reject(r);
      throw r;
    };
  }
}, Jt = new ax();
function fe(e, t) {
  return Jt.parse(e, t);
}
fe.options = fe.setOptions = function(e) {
  return Jt.setOptions(e), fe.defaults = Jt.defaults, fc(fe.defaults), fe;
};
fe.getDefaults = _a;
fe.defaults = sn;
fe.use = function(...e) {
  return Jt.use(...e), fe.defaults = Jt.defaults, fc(fe.defaults), fe;
};
fe.walkTokens = function(e, t) {
  return Jt.walkTokens(e, t);
};
fe.parseInline = Jt.parseInline;
fe.Parser = at;
fe.parser = at.parse;
fe.Renderer = Pr;
fe.TextRenderer = Oa;
fe.Lexer = rt;
fe.lexer = rt.lex;
fe.Tokenizer = Dr;
fe.Hooks = Bn;
fe.parse = fe;
fe.options;
fe.setOptions;
fe.use;
fe.walkTokens;
fe.parseInline;
at.parse;
rt.lex;
var sx = 300, ux = "300px", ox = 500;
function lx(e = {}) {
  let { immediate: t = !1, debounceDelay: n = sx, rootMargin: r = ux, idleTimeout: i = ox } = e, [a, s] = Ae(!1), u = ke(null), o = ke(null), c = ke(null), d = ye(() => (f) => {
    let g = Date.now();
    return window.setTimeout(() => {
      f({ didTimeout: !1, timeRemaining: () => Math.max(0, 50 - (Date.now() - g)) });
    }, 1);
  }, []), h = ye(() => typeof window < "u" && window.requestIdleCallback ? (f, g) => window.requestIdleCallback(f, g) : d, [d]), p = ye(() => typeof window < "u" && window.cancelIdleCallback ? (f) => window.cancelIdleCallback(f) : (f) => {
    clearTimeout(f);
  }, []);
  return Me(() => {
    if (t) {
      s(!0);
      return;
    }
    let f = u.current;
    if (!f) return;
    o.current && (clearTimeout(o.current), o.current = null), c.current && (p(c.current), c.current = null);
    let g = () => {
      o.current && (clearTimeout(o.current), o.current = null), c.current && (p(c.current), c.current = null);
    }, y = (_) => {
      c.current = h((v) => {
        v.timeRemaining() > 0 || v.didTimeout ? (s(!0), _.disconnect()) : c.current = h(() => {
          s(!0), _.disconnect();
        }, { timeout: i / 2 });
      }, { timeout: i });
    }, C = (_) => {
      g(), o.current = window.setTimeout(() => {
        var v, M;
        let S = _.takeRecords();
        (S.length === 0 || (M = (v = S.at(-1)) == null ? void 0 : v.isIntersecting) != null && M) && y(_);
      }, n);
    }, k = (_, v) => {
      _.isIntersecting ? C(v) : g();
    }, I = new IntersectionObserver((_) => {
      for (let v of _) k(v, I);
    }, { rootMargin: r, threshold: 0 });
    return I.observe(f), () => {
      o.current && clearTimeout(o.current), c.current && p(c.current), I.disconnect();
    };
  }, [t, n, r, i, p, h]), { shouldRender: a, containerRef: u };
}
var cx = 320, dx = 4, Ac = () => typeof performance > "u" ? Date.now() : performance.now();
function Iu(e) {
  var t, n;
  let r = (t = e?.now) != null ? t : Ac, i = (n = e?.maxBacklogMs) != null ? n : cx, a = 0, s = 0;
  return { now: r, beginPass(u) {
    s = Math.min(Math.max(a, u), u + i);
  }, mark() {
    return s;
  }, rewind(u) {
    s = u;
  }, take(u, o, c) {
    if (u <= 0) return { baseDelay: 0, step: Math.max(0, o) };
    let d = Math.max(0, o), h = d === 0 ? 0 : Math.min(d, dx), p = Math.max(s, c), f = c + i, g = p + Math.max(0, u - 1) * d, y = d;
    if (g > f && u > 1) if (p < f) {
      let k = f - p;
      y = Math.max(h, k / (u - 1));
    } else y = h;
    let C = Math.max(0, Math.round(p - c));
    return s = p + u * y, { baseDelay: C, step: y };
  }, commitPass() {
    a = s;
  } };
}
var _c = /\s/, Da = /^\s+$/, hx = /* @__PURE__ */ new Set(["pre", "svg", "math", "annotation"]), fx = /* @__PURE__ */ new Set(["img", "hr"]), sr = (e) => typeof e == "object" && e !== null && "type" in e && e.type === "element", Pa = (e) => e.some((t) => sr(t) && hx.has(t.tagName)), px = (e) => {
  for (let t = e.length - 1; t >= 0; t--) {
    let n = e[t];
    if (sr(n) && n.tagName === "li") return n;
  }
}, mx = (e, t, n, r) => {
  e.properties != null || (e.properties = {}), e.properties["data-sd-animate-marker"] = !0;
  let i = typeof e.properties.style == "string" ? `${e.properties.style};` : "";
  e.properties.style = `${i}--sd-marker-duration:${t}ms;--sd-marker-delay:${Math.round(n)}ms;--sd-marker-easing:${r}`;
}, gx = /* @__PURE__ */ new Set(["ul", "ol", "li"]), Cc = (e) => {
  for (let t of e.children) if (sr(t)) {
    if (t.tagName === "input") return t;
    if (gx.has(t.tagName)) continue;
    let n = Cc(t);
    if (n) return n;
  }
}, Ic = (e, t, n, r) => {
  e.properties != null || (e.properties = {}), e.properties["data-sd-animate"] = !0;
  let i = typeof e.properties.style == "string" ? `${e.properties.style};` : "";
  e.properties.style = `${i}--sd-animation:sd-${t.animation};--sd-duration:${n}ms;--sd-easing:${t.easing};--sd-delay:${Math.round(r)}ms`;
}, bx = (e, t, n, r) => {
  let i = Cc(e);
  i && Ic(i, t, n, r);
}, Ex = (e, t, n, r, i, a) => {
  if (Pa(t)) return;
  let s = r.prevContentLength, u = i.count;
  i.count += 1;
  let o = s > 0 && u < s, c = o ? 0 : a.baseDelay + i.newIndex++ * a.step;
  Ic(e, n, o ? 0 : n.duration, c);
}, Tx = (e) => {
  var t;
  for (let n = e.length - 1; n >= 0; n -= 1) {
    let r = e[n];
    if (sr(r)) {
      if ((t = r.properties) != null && t["data-sd-animated"]) break;
      r.properties = { ...r.properties, "data-sd-animated": !0 };
    }
  }
}, Nc = (e) => {
  let t = [], n = "", r = !1;
  for (let i of e) {
    let a = _c.test(i);
    if (a !== r && n) {
      if (a) {
        n += i, r = !0;
        continue;
      }
      t.push(n), n = "";
    }
    n += i, r = a;
  }
  return n && t.push(n), t;
}, Sc = (e) => {
  let t = [], n = "";
  for (let r of e) _c.test(r) ? t.length > 0 && !Da.test(t.at(-1)) ? t[t.length - 1] += r : n += r : (n && (t.push(n), n = ""), t.push(r));
  return n && (t.length > 0 ? t[t.length - 1] += n : t.push(n)), t;
}, kx = (e, t, n, r, i, a) => {
  let s = `--sd-animation:sd-${t};--sd-duration:${i ? 0 : n}ms;--sd-easing:${r}`;
  return a && (s += `;--sd-delay:${Math.round(a)}ms`), { type: "element", tagName: "span", properties: { "data-sd-animate": !0, style: s }, children: [{ type: "text", value: e }] };
}, Nu = (e, t) => !(e > 0 && t < e), qi = (e) => sr(e) && fx.has(e.tagName), xx = (e, t, n) => {
  let r = 0, i = 0;
  return Ur(e, (a) => a.type === "text" || qi(a), (a, s) => {
    if (Pa(s)) return Wt;
    if (qi(a)) {
      Nu(n, i) && (r += 1), i += 1;
      return;
    }
    let u = a.value;
    if (!u.trim()) {
      i += u.length;
      return;
    }
    let o = t.sep === "char" ? Sc(u) : Nc(u);
    for (let c of o) {
      let d = i;
      i += c.length, !Da.test(c) && Nu(n, d) && (r += 1);
    }
  }), r;
}, yx = (e, t, n, r, i, a) => {
  var s;
  let u = t.at(-1);
  if (!(u && "children" in u)) return;
  if (Pa(t)) return Wt;
  let o = u, c = o.children.indexOf(e);
  if (c === -1) return;
  let d = e.value;
  if (!d.trim()) {
    i.count += d.length;
    return;
  }
  let h = n.sep === "char" ? Sc(d) : Nc(d), p = r.prevContentLength, f = !1, g = px(t), y = !!(g && !((s = g.properties) != null && s["data-sd-animate-marker"])), C = !1, k = h.map((I) => {
    let _ = i.count;
    if (i.count += I.length, Da.test(I)) return { type: "text", value: I };
    let v = p > 0 && _ < p, M = v ? 0 : a.baseDelay + i.newIndex++ * a.step;
    if (f = !0, g && y && !C) {
      let S = v ? 0 : n.duration;
      mx(g, S, M, n.easing), bx(g, n, S, M), C = !0;
    }
    return kx(I, n.animation, n.duration, n.easing, v, M);
  });
  return f && Tx(t), o.children.splice(c, 1, ...k), c + k.length;
}, Ax = 0;
function Ma(e) {
  var t, n, r, i, a;
  let s = { animation: (t = e?.animation) != null ? t : "fadeIn", duration: (n = e?.duration) != null ? n : 150, easing: (r = e?.easing) != null ? r : "ease", sep: (i = e?.sep) != null ? i : "word", stagger: (a = e?.stagger) != null ? a : 40, timeline: e?.timeline }, u = { committedCharCount: 0, prevContentLength: 0, lastRenderCharCount: 0, pendingMark: null }, o = Ax++, c = () => (d) => {
    var h;
    let p = { count: 0, newIndex: 0 };
    u.prevContentLength = u.committedCharCount;
    let f = s.timeline, g = (h = f?.now()) != null ? h : Ac();
    f && (u.pendingMark === null ? u.pendingMark = f.mark() : f.rewind(u.pendingMark));
    let y = f ? f.take(xx(d, s, u.prevContentLength), s.stagger, g) : { baseDelay: 0, step: s.stagger };
    Ur(d, (C) => C.type === "text" || qi(C), (C, k) => {
      if (C.type === "text") return yx(C, k, s, u, p, y);
      Ex(C, k, s, u, p, y);
    }), u.lastRenderCharCount = p.count, u.prevContentLength = 0;
  };
  return Object.defineProperty(c, "name", { value: `rehypeAnimate$${o}` }), { name: "animate", type: "animate", rehypePlugin: c, setPrevContentLength(d) {
    u.committedCharCount = d, u.prevContentLength = d;
  }, getLastRenderCharCount() {
    return u.lastRenderCharCount;
  }, commit() {
    u.committedCharCount = u.lastRenderCharCount, u.pendingMark = null;
  } };
}
Ma();
var wc = en(!1), Lc = () => Ce(wc), Jr = (...e) => tc(Ul(e)), _x = (e, t) => {
  if (!e || !t) return t;
  let n = `${e}:`;
  return t.split(/\s+/).filter(Boolean).map((r) => r.startsWith(n) ? r : `${e}:${r}`).join(" ");
}, Cx = (e) => e ? (...t) => _x(e, tc(Ul(t))) : Jr, hn = (e, t, n) => {
  let r = typeof t == "string" && n.startsWith("text/csv") ? "\uFEFF" : "", i = typeof t == "string" ? new Blob([r + t], { type: n }) : t, a = URL.createObjectURL(i), s = document.createElement("a");
  s.href = a, s.download = e, document.body.appendChild(s), s.click(), document.body.removeChild(s), URL.revokeObjectURL(a);
}, Vi = en(Jr), ie = () => Ce(Vi), Ix = 8, Rc = (e) => {
  if (!(e === void 0 || e === 0 || e === Number.POSITIVE_INFINITY)) {
    if (typeof e == "number") return Number.isFinite(e) && e > 0 ? `${e}px` : void 0;
    if (!(e === "0" || e === "none" || e === "Infinity")) return e;
  }
}, Oc = (e, t, n) => {
  let r = ke(null), i = ke(!0), a = ke(!1);
  return Me(() => {
    let s = r.current;
    if (!(s && t)) return;
    let u = () => {
      let o = s.scrollHeight - s.scrollTop - s.clientHeight < Ix;
      i.current = o;
    };
    return s.addEventListener("scroll", u, { passive: !0 }), () => s.removeEventListener("scroll", u);
  }, [t]), Me(() => {
    e && !a.current && (i.current = !0), e || (i.current = !0), a.current = e;
  }, [e]), Me(() => {
    let s = r.current;
    s && t && e && i.current && s.scrollTo({ top: s.scrollHeight, behavior: "instant" });
  }, [e, t, n]), r;
}, Nx = Jr("block"), Sx = Jr("block", "before:content-[counter(line)]", "before:inline-block", "before:[counter-increment:line]", "before:w-6", "before:mr-4", "before:text-[13px]", "before:text-right", "before:text-muted-foreground/50", "before:font-mono", "before:select-none"), wx = (e) => {
  let t = {};
  for (let n of e.split(";")) {
    let r = n.indexOf(":");
    if (r > 0) {
      let i = n.slice(0, r).trim(), a = n.slice(r + 1).trim();
      i && a && (t[i] = a);
    }
  }
  return t;
}, Lx = pe(({ children: e, result: t, language: n, className: r, maxHeight: i, startLine: a, lineNumbers: s = !0, ...u }) => {
  let o = ie(), { isAnimating: c } = Ce(De), d = Rc(i), h = Oc(c, !!d, t), p = ye(() => o(Sx), [o]), f = ye(() => o(Nx), [o]), g = ye(() => {
    let y = {};
    return t.bg && (y["--sdm-bg"] = t.bg), t.fg && (y["--sdm-fg"] = t.fg), t.rootStyle && Object.assign(y, wx(t.rootStyle)), y;
  }, [t.bg, t.fg, t.rootStyle]);
  return A("div", { className: o(r, d ? "overflow-y-auto" : null, "overflow-x-auto rounded-md border border-border bg-background p-4 text-sm"), "data-language": n, "data-streamdown": "code-block-body", ref: h, style: d ? { maxHeight: d } : void 0, ...u, children: A("pre", { className: o(r, "bg-[var(--sdm-bg,inherit)]", "dark:bg-[var(--shiki-dark-bg,var(--sdm-bg,inherit))]"), style: g, children: A("code", { className: s ? o("[counter-increment:line_0] [counter-reset:line]") : void 0, style: s && a && a > 1 ? { counterReset: `line ${a - 1}` } : void 0, children: t.tokens.map((y, C) => A("span", { className: s ? p : f, children: y.length === 0 || y.length === 1 && y[0].content === "" ? `
` : y.map((k, I) => {
    let _ = {}, v = !!k.bgColor;
    if (k.color && (_["--sdm-c"] = k.color), k.bgColor && (_["--sdm-tbg"] = k.bgColor), k.htmlStyle) for (let [M, S] of Object.entries(k.htmlStyle)) M === "color" ? _["--sdm-c"] = S : M === "background-color" ? (_["--sdm-tbg"] = S, v = !0) : _[M] = S;
    return A("span", { className: o("text-[var(--sdm-c,inherit)]", "dark:text-[var(--shiki-dark,var(--sdm-c,inherit))]", v && "bg-[var(--sdm-tbg)]", v && "dark:bg-[var(--shiki-dark-bg,var(--sdm-tbg))]"), style: _, ...k.htmlAttrs, children: k.content }, I);
  }) }, C)) }) }) });
}), Dc = ({ className: e, language: t, style: n, isIncomplete: r, ...i }) => {
  let a = ie();
  return A("div", { className: a("my-4 flex w-full flex-col gap-2 rounded-xl border border-border bg-sidebar p-2", e), "data-incomplete": r || void 0, "data-language": t, "data-streamdown": "code-block", style: { contentVisibility: "auto", containIntrinsicSize: "auto 200px", ...n }, ...i });
}, Pc = en({ code: "" }), Mc = () => Ce(Pc), vc = ({ language: e }) => {
  let t = ie();
  return A("div", { className: t("flex h-8 items-center text-muted-foreground text-xs"), "data-language": e, "data-streamdown": "code-block-header", children: A("span", { className: t("ml-1 font-mono lowercase"), children: e }) });
}, Rx = (e) => {
  let t = e.length;
  for (; t > 0 && e[t - 1] === `
`; ) t--;
  return e.slice(0, t);
}, Ox = Vu(() => import("./chunk-highlighted-body-KPVGNVTW-ydsOuqE6.js").then((e) => ({ default: e.HighlightedCodeBlockBody }))), Bc = ({ code: e, language: t, className: n, children: r, isIncomplete: i = !1, startLine: a, lineNumbers: s, ...u }) => {
  let o = ie(), { codeBlockMaxHeight: c } = Ce(De), d = ye(() => Rx(e), [e]), h = ye(() => ({ bg: "transparent", fg: "inherit", tokens: d.split(`
`).map((p) => [{ content: p, color: "inherit", bgColor: "transparent", htmlStyle: {}, offset: 0 }]) }), [d]);
  return A(Pc.Provider, { value: { code: e }, children: re(Dc, { dir: "ltr", isIncomplete: i, language: t, children: [A(vc, { language: t }), r ? A("div", { className: o("pointer-events-none sticky top-2 z-10 -mt-10 flex h-8 items-center justify-end"), children: A("div", { className: o("pointer-events-auto flex shrink-0 items-center gap-2 rounded-md border border-sidebar bg-sidebar/80 px-1.5 py-1 supports-[backdrop-filter]:bg-sidebar/70 supports-[backdrop-filter]:backdrop-blur"), "data-streamdown": "code-block-actions", children: r }) }) : null, A(_i, { fallback: A(Lx, { className: n, language: t, lineNumbers: s, maxHeight: c, result: h, startLine: a, ...u }), children: A(Ox, { className: n, code: d, language: t, lineNumbers: s, maxHeight: c, raw: h, startLine: a, ...u }) })] }) });
}, Dx = (e) => A("svg", { "aria-hidden": "true", color: "currentColor", height: 16, strokeLinejoin: "round", viewBox: "0 0 16 16", width: 16, ...e, children: A("path", { clipRule: "evenodd", d: "M15.5607 3.99999L15.0303 4.53032L6.23744 13.3232C5.55403 14.0066 4.44599 14.0066 3.76257 13.3232L4.2929 12.7929L3.76257 13.3232L0.969676 10.5303L0.439346 9.99999L1.50001 8.93933L2.03034 9.46966L4.82323 12.2626C4.92086 12.3602 5.07915 12.3602 5.17678 12.2626L13.9697 3.46966L14.5 2.93933L15.5607 3.99999Z", fill: "currentColor", fillRule: "evenodd" }) }), Px = (e) => A("svg", { "aria-hidden": "true", color: "currentColor", height: 16, strokeLinejoin: "round", viewBox: "0 0 16 16", width: 16, ...e, children: A("path", { clipRule: "evenodd", d: "M2.75 0.5C1.7835 0.5 1 1.2835 1 2.25V9.75C1 10.7165 1.7835 11.5 2.75 11.5H3.75H4.5V10H3.75H2.75C2.61193 10 2.5 9.88807 2.5 9.75V2.25C2.5 2.11193 2.61193 2 2.75 2H8.25C8.38807 2 8.5 2.11193 8.5 2.25V3H10V2.25C10 1.2835 9.2165 0.5 8.25 0.5H2.75ZM7.75 4.5C6.7835 4.5 6 5.2835 6 6.25V13.75C6 14.7165 6.7835 15.5 7.75 15.5H13.25C14.2165 15.5 15 14.7165 15 13.75V6.25C15 5.2835 14.2165 4.5 13.25 4.5H7.75ZM7.5 6.25C7.5 6.11193 7.61193 6 7.75 6H13.25C13.3881 6 13.5 6.11193 13.5 6.25V13.75C13.5 13.8881 13.3881 14 13.25 14H7.75C7.61193 14 7.5 13.8881 7.5 13.75V6.25Z", fill: "currentColor", fillRule: "evenodd" }) }), Mx = (e) => A("svg", { "aria-hidden": "true", color: "currentColor", height: 16, strokeLinejoin: "round", viewBox: "0 0 16 16", width: 16, ...e, children: A("path", { clipRule: "evenodd", d: "M8.75 1V1.75V8.68934L10.7197 6.71967L11.25 6.18934L12.3107 7.25L11.7803 7.78033L8.70711 10.8536C8.31658 11.2441 7.68342 11.2441 7.29289 10.8536L4.21967 7.78033L3.68934 7.25L4.75 6.18934L5.28033 6.71967L7.25 8.68934V1.75V1H8.75ZM13.5 9.25V13.5H2.5V9.25V8.5H1V9.25V14C1 14.5523 1.44771 15 2 15H14C14.5523 15 15 14.5523 15 14V9.25V8.5H13.5V9.25Z", fill: "currentColor", fillRule: "evenodd" }) }), vx = (e) => re("svg", { "aria-hidden": "true", color: "currentColor", height: 16, strokeLinejoin: "round", viewBox: "0 0 16 16", width: 16, ...e, children: [A("path", { d: "M8 0V4", stroke: "currentColor", strokeWidth: "1.5" }), A("path", { d: "M8 16V12", opacity: "0.5", stroke: "currentColor", strokeWidth: "1.5" }), A("path", { d: "M3.29773 1.52783L5.64887 4.7639", opacity: "0.9", stroke: "currentColor", strokeWidth: "1.5" }), A("path", { d: "M12.7023 1.52783L10.3511 4.7639", opacity: "0.1", stroke: "currentColor", strokeWidth: "1.5" }), A("path", { d: "M12.7023 14.472L10.3511 11.236", opacity: "0.4", stroke: "currentColor", strokeWidth: "1.5" }), A("path", { d: "M3.29773 14.472L5.64887 11.236", opacity: "0.6", stroke: "currentColor", strokeWidth: "1.5" }), A("path", { d: "M15.6085 5.52783L11.8043 6.7639", opacity: "0.2", stroke: "currentColor", strokeWidth: "1.5" }), A("path", { d: "M0.391602 10.472L4.19583 9.23598", opacity: "0.7", stroke: "currentColor", strokeWidth: "1.5" }), A("path", { d: "M15.6085 10.4722L11.8043 9.2361", opacity: "0.3", stroke: "currentColor", strokeWidth: "1.5" }), A("path", { d: "M0.391602 5.52783L4.19583 6.7639", opacity: "0.8", stroke: "currentColor", strokeWidth: "1.5" })] }), Bx = (e) => A("svg", { "aria-hidden": "true", color: "currentColor", height: 16, strokeLinejoin: "round", viewBox: "0 0 16 16", width: 16, ...e, children: A("path", { clipRule: "evenodd", d: "M1 5.25V6H2.5V5.25V2.5H5.25H6V1H5.25H2C1.44772 1 1 1.44772 1 2V5.25ZM5.25 14.9994H6V13.4994H5.25H2.5V10.7494V9.99939H1V10.7494V13.9994C1 14.5517 1.44772 14.9994 2 14.9994H5.25ZM15 10V10.75V14C15 14.5523 14.5523 15 14 15H10.75H10V13.5H10.75H13.5V10.75V10H15ZM10.75 1H10V2.5H10.75H13.5V5.25V6H15V5.25V2C15 1.44772 14.5523 1 14 1H10.75Z", fill: "currentColor", fillRule: "evenodd" }) }), Fx = (e) => A("svg", { "aria-hidden": "true", color: "currentColor", height: 16, strokeLinejoin: "round", viewBox: "0 0 16 16", width: 16, ...e, children: A("path", { clipRule: "evenodd", d: "M13.5 8C13.5 4.96643 11.0257 2.5 7.96452 2.5C5.42843 2.5 3.29365 4.19393 2.63724 6.5H5.25H6V8H5.25H0.75C0.335787 8 0 7.66421 0 7.25V2.75V2H1.5V2.75V5.23347C2.57851 2.74164 5.06835 1 7.96452 1C11.8461 1 15 4.13001 15 8C15 11.87 11.8461 15 7.96452 15C5.62368 15 3.54872 13.8617 2.27046 12.1122L1.828 11.5066L3.03915 10.6217L3.48161 11.2273C4.48831 12.6051 6.12055 13.5 7.96452 13.5C11.0257 13.5 13.5 11.0336 13.5 8Z", fill: "currentColor", fillRule: "evenodd" }) }), Hx = (e) => A("svg", { "aria-hidden": "true", color: "currentColor", height: 16, strokeLinejoin: "round", viewBox: "0 0 16 16", width: 16, ...e, children: A("path", { clipRule: "evenodd", d: "M12.4697 13.5303L13 14.0607L14.0607 13L13.5303 12.4697L9.06065 7.99999L13.5303 3.53032L14.0607 2.99999L13 1.93933L12.4697 2.46966L7.99999 6.93933L3.53032 2.46966L2.99999 1.93933L1.93933 2.99999L2.46966 3.53032L6.93933 7.99999L2.46966 12.4697L1.93933 13L2.99999 14.0607L3.53032 13.5303L7.99999 9.06065L12.4697 13.5303Z", fill: "currentColor", fillRule: "evenodd" }) }), Ux = (e) => A("svg", { "aria-hidden": "true", color: "currentColor", height: 16, strokeLinejoin: "round", viewBox: "0 0 16 16", width: 16, ...e, children: A("path", { clipRule: "evenodd", d: "M13.5 10.25V13.25C13.5 13.3881 13.3881 13.5 13.25 13.5H2.75C2.61193 13.5 2.5 13.3881 2.5 13.25L2.5 2.75C2.5 2.61193 2.61193 2.5 2.75 2.5H5.75H6.5V1H5.75H2.75C1.7835 1 1 1.7835 1 2.75V13.25C1 14.2165 1.7835 15 2.75 15H13.25C14.2165 15 15 14.2165 15 13.25V10.25V9.5H13.5V10.25ZM9 1H9.75H14.2495C14.6637 1 14.9995 1.33579 14.9995 1.75V6.25V7H13.4995V6.25V3.56066L8.53033 8.52978L8 9.06011L6.93934 7.99945L7.46967 7.46912L12.4388 2.5H9.75H9V1Z", fill: "currentColor", fillRule: "evenodd" }) }), zx = (e) => A("svg", { "aria-hidden": "true", color: "currentColor", height: 16, strokeLinejoin: "round", viewBox: "0 0 16 16", width: 16, ...e, children: A("path", { clipRule: "evenodd", d: "M1.5 6.5C1.5 3.73858 3.73858 1.5 6.5 1.5C9.26142 1.5 11.5 3.73858 11.5 6.5C11.5 9.26142 9.26142 11.5 6.5 11.5C3.73858 11.5 1.5 9.26142 1.5 6.5ZM6.5 0C2.91015 0 0 2.91015 0 6.5C0 10.0899 2.91015 13 6.5 13C8.02469 13 9.42677 12.475 10.5353 11.596L13.9697 15.0303L14.5 15.5607L15.5607 14.5L15.0303 13.9697L11.596 10.5353C12.475 9.42677 13 8.02469 13 6.5C13 2.91015 10.0899 0 6.5 0ZM4.125 5.875H4.75H5.875V4.75V4.125H7.125V4.75V5.875H8.25H8.875V7.125H8.25H7.125V8.25V8.875H5.875V8.25V7.125H4.75H4.125V5.875Z", fill: "currentColor", fillRule: "evenodd" }) }), $x = (e) => A("svg", { "aria-hidden": "true", color: "currentColor", height: 16, strokeLinejoin: "round", viewBox: "0 0 16 16", width: 16, ...e, children: A("path", { clipRule: "evenodd", d: "M1.5 6.5C1.5 3.73858 3.73858 1.5 6.5 1.5C9.26142 1.5 11.5 3.73858 11.5 6.5C11.5 9.26142 9.26142 11.5 6.5 11.5C3.73858 11.5 1.5 9.26142 1.5 6.5ZM6.5 0C2.91015 0 0 2.91015 0 6.5C0 10.0899 2.91015 13 6.5 13C8.02469 13 9.42677 12.475 10.5353 11.596L13.9697 15.0303L14.5 15.5607L15.5607 14.5L15.0303 13.9697L11.596 10.5353C12.475 9.42677 13 8.02469 13 6.5C13 2.91015 10.0899 0 6.5 0ZM4.125 5.875H4.75H8.25H8.875V7.125H8.25H4.75H4.125V5.875Z", fill: "currentColor", fillRule: "evenodd" }) }), Fn = { CheckIcon: Dx, CopyIcon: Px, DownloadIcon: Mx, ExternalLinkIcon: Ux, Loader2Icon: vx, Maximize2Icon: Bx, RotateCcwIcon: Fx, XIcon: Hx, ZoomInIcon: zx, ZoomOutIcon: $x }, Fc = en(Fn), jx = (e, t) => {
  if (e === t) return !0;
  if (!(e && t)) return e === t;
  let n = Object.keys(e), r = Object.keys(t);
  return n.length !== r.length ? !1 : n.every((i) => e[i] === t[i]);
}, Su = ({ icons: e, children: t }) => {
  let n = ke(e), r = ke(e ? { ...Fn, ...e } : Fn);
  jx(n.current, e) || (n.current = e, r.current = e ? { ...Fn, ...e } : Fn);
  let i = r.current;
  return A(Fc.Provider, { value: i, children: t });
}, lt = () => Ce(Fc), va = { copyCode: "Copy Code", downloadFile: "Download file", downloadDiagram: "Download diagram", downloadDiagramAsSvg: "Download diagram as SVG", downloadDiagramAsPng: "Download diagram as PNG", downloadDiagramAsMmd: "Download diagram as MMD", viewFullscreen: "View fullscreen", exitFullscreen: "Exit fullscreen", mermaidFormatSvg: "SVG", mermaidFormatPng: "PNG", mermaidFormatMmd: "MMD", zoomIn: "Zoom in", zoomOut: "Zoom out", resetView: "Reset zoom and pan", copyTable: "Copy table", copyTableAsMarkdown: "Copy table as Markdown", copyTableAsCsv: "Copy table as CSV", copyTableAsTsv: "Copy table as TSV", downloadTable: "Download table", downloadTableAsCsv: "Download table as CSV", downloadTableAsMarkdown: "Download table as Markdown", tableFormatMarkdown: "Markdown", tableFormatCsv: "CSV", tableFormatTsv: "TSV", imageNotAvailable: "Image not available", downloadImage: "Download image", openExternalLink: "Open external link?", externalLinkWarning: "You're about to visit an external website.", close: "Close", copyLink: "Copy link", copied: "Copied", openLink: "Open link" }, Wi = en(va), bt = () => Ce(Wi), Mr = ({ onCopy: e, onError: t, timeout: n = 2e3, children: r, className: i, code: a, ...s }) => {
  let u = ie(), [o, c] = Ae(!1), d = ke(0), { code: h } = Mc(), { isAnimating: p } = Ce(De), f = bt(), g = a ?? h, y = async () => {
    var I;
    if (typeof window > "u" || !((I = navigator?.clipboard) != null && I.writeText)) {
      t?.(new Error("Clipboard API not available"));
      return;
    }
    try {
      o || (await navigator.clipboard.writeText(g), c(!0), e?.(), d.current = window.setTimeout(() => c(!1), n));
    } catch (_) {
      t?.(_);
    }
  };
  Me(() => () => {
    window.clearTimeout(d.current);
  }, []);
  let C = lt(), k = o ? C.CheckIcon : C.CopyIcon;
  return re(pt, { children: [A("button", { "aria-label": f.copyCode, className: u("cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50", i), "data-streamdown": "code-block-copy-button", disabled: p, onClick: y, title: f.copyCode, type: "button", ...s, children: r ?? A(k, { "aria-hidden": "true", size: 14 }) }), o && A("output", { "aria-live": "polite", className: "sr-only", children: f.copied })] });
}, Ba = (e, t, n) => {
  if (typeof e == "boolean") return n;
  let r = e[t];
  if (typeof r != "object") return n;
  let i = r.download;
  return typeof i != "object" ? n : i.filename || n;
}, wu = { "1c": "1c", "1c-query": "1cq", abap: "abap", "actionscript-3": "as", ada: "ada", adoc: "adoc", "angular-html": "html", "angular-ts": "ts", apache: "conf", apex: "cls", apl: "apl", applescript: "applescript", ara: "ara", asciidoc: "adoc", asm: "asm", astro: "astro", awk: "awk", ballerina: "bal", bash: "sh", bat: "bat", batch: "bat", be: "be", beancount: "beancount", berry: "berry", bibtex: "bib", bicep: "bicep", blade: "blade.php", bsl: "bsl", c: "c", "c#": "cs", "c++": "cpp", cadence: "cdc", cairo: "cairo", cdc: "cdc", clarity: "clar", clj: "clj", clojure: "clj", "closure-templates": "soy", cmake: "cmake", cmd: "cmd", cobol: "cob", codeowners: "CODEOWNERS", codeql: "ql", coffee: "coffee", coffeescript: "coffee", "common-lisp": "lisp", console: "sh", coq: "v", cpp: "cpp", cql: "cql", crystal: "cr", cs: "cs", csharp: "cs", css: "css", csv: "csv", cue: "cue", cypher: "cql", d: "d", dart: "dart", dax: "dax", desktop: "desktop", diff: "diff", docker: "dockerfile", dockerfile: "dockerfile", dotenv: "env", "dream-maker": "dm", edge: "edge", elisp: "el", elixir: "ex", elm: "elm", "emacs-lisp": "el", erb: "erb", erl: "erl", erlang: "erl", f: "f", "f#": "fs", f03: "f03", f08: "f08", f18: "f18", f77: "f77", f90: "f90", f95: "f95", fennel: "fnl", fish: "fish", fluent: "ftl", for: "for", "fortran-fixed-form": "f", "fortran-free-form": "f90", fs: "fs", fsharp: "fs", fsl: "fsl", ftl: "ftl", gdresource: "tres", gdscript: "gd", gdshader: "gdshader", genie: "gs", gherkin: "feature", "git-commit": "gitcommit", "git-rebase": "gitrebase", gjs: "js", gleam: "gleam", "glimmer-js": "js", "glimmer-ts": "ts", glsl: "glsl", gnuplot: "plt", go: "go", gql: "gql", graphql: "graphql", groovy: "groovy", gts: "gts", hack: "hack", haml: "haml", handlebars: "hbs", haskell: "hs", haxe: "hx", hbs: "hbs", hcl: "hcl", hjson: "hjson", hlsl: "hlsl", hs: "hs", html: "html", "html-derivative": "html", http: "http", hxml: "hxml", hy: "hy", imba: "imba", ini: "ini", jade: "jade", java: "java", javascript: "js", jinja: "jinja", jison: "jison", jl: "jl", js: "js", json: "json", json5: "json5", jsonc: "jsonc", jsonl: "jsonl", jsonnet: "jsonnet", jssm: "jssm", jsx: "jsx", julia: "jl", kotlin: "kt", kql: "kql", kt: "kt", kts: "kts", kusto: "kql", latex: "tex", lean: "lean", lean4: "lean", less: "less", liquid: "liquid", lisp: "lisp", lit: "lit", llvm: "ll", log: "log", logo: "logo", lua: "lua", luau: "luau", make: "mak", makefile: "mak", markdown: "md", marko: "marko", matlab: "m", md: "md", mdc: "mdc", mdx: "mdx", mediawiki: "wiki", mermaid: "mmd", mips: "s", mipsasm: "s", mmd: "mmd", mojo: "mojo", move: "move", nar: "nar", narrat: "narrat", nextflow: "nf", nf: "nf", nginx: "conf", nim: "nim", nix: "nix", nu: "nu", nushell: "nu", objc: "m", "objective-c": "m", "objective-cpp": "mm", ocaml: "ml", pascal: "pas", perl: "pl", perl6: "p6", php: "php", plsql: "pls", po: "po", polar: "polar", postcss: "pcss", pot: "pot", potx: "potx", powerquery: "pq", powershell: "ps1", prisma: "prisma", prolog: "pl", properties: "properties", proto: "proto", protobuf: "proto", ps: "ps", ps1: "ps1", pug: "pug", puppet: "pp", purescript: "purs", py: "py", python: "py", ql: "ql", qml: "qml", qmldir: "qmldir", qss: "qss", r: "r", racket: "rkt", raku: "raku", razor: "cshtml", rb: "rb", reg: "reg", regex: "regex", regexp: "regexp", rel: "rel", riscv: "s", rs: "rs", rst: "rst", ruby: "rb", rust: "rs", sas: "sas", sass: "sass", scala: "scala", scheme: "scm", scss: "scss", sdbl: "sdbl", sh: "sh", shader: "shader", shaderlab: "shader", shell: "sh", shellscript: "sh", shellsession: "sh", smalltalk: "st", solidity: "sol", soy: "soy", sparql: "rq", spl: "spl", splunk: "spl", sql: "sql", "ssh-config": "config", stata: "do", styl: "styl", stylus: "styl", svelte: "svelte", swift: "swift", "system-verilog": "sv", systemd: "service", talon: "talon", talonscript: "talon", tasl: "tasl", tcl: "tcl", templ: "templ", terraform: "tf", tex: "tex", tf: "tf", tfvars: "tfvars", toml: "toml", ts: "ts", "ts-tags": "ts", tsp: "tsp", tsv: "tsv", tsx: "tsx", turtle: "ttl", twig: "twig", typ: "typ", typescript: "ts", typespec: "tsp", typst: "typ", v: "v", vala: "vala", vb: "vb", verilog: "v", vhdl: "vhdl", vim: "vim", viml: "vim", vimscript: "vim", vue: "vue", "vue-html": "html", "vue-vine": "vine", vy: "vy", vyper: "vy", wasm: "wasm", wenyan: "wy", wgsl: "wgsl", wiki: "wiki", wikitext: "wiki", wit: "wit", wl: "wl", wolfram: "wl", xml: "xml", xsl: "xsl", yaml: "yaml", yml: "yml", zenscript: "zs", zig: "zig", zsh: "zsh", 文言: "wy" }, Hc = ({ onDownload: e, onError: t, language: n, children: r, className: i, code: a, ...s }) => {
  let u = ie(), { code: o } = Mc(), { isAnimating: c, controls: d } = Ce(De), h = bt(), p = lt(), f = a ?? o, g = n && n in wu ? wu[n] : "txt", y = `${Ba(d, "code", "file")}.${g}`, C = "text/plain", k = () => {
    try {
      hn(y, f, C), e?.();
    } catch (I) {
      t?.(I);
    }
  };
  return A("button", { "aria-label": h.downloadFile, className: u("cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50", i), "data-streamdown": "code-block-download-button", disabled: c, onClick: k, title: h.downloadFile, type: "button", ...s, children: r ?? A(p.DownloadIcon, { size: 14 }) });
}, Gi = () => {
  let { Loader2Icon: e } = lt(), t = ie();
  return re("div", { className: t("w-full divide-y divide-border overflow-hidden rounded-xl border border-border"), children: [A("div", { className: t("h-[46px] w-full bg-muted/80") }), A("div", { className: t("flex w-full items-center justify-center p-4"), children: A(e, { className: t("size-4 animate-spin") }) })] });
}, Yx = /\.[^/.]+$/, qx = ({ node: e, className: t, src: n, alt: r, onLoad: i, onError: a, showControls: s = !0, showDownloadControl: u = !0, ...o }) => {
  let { DownloadIcon: c } = lt(), d = ie(), h = ke(null), [p, f] = Ae(!1), [g, y] = Ae(!1), C = bt(), k = o.width != null || o.height != null, I = (p || k) && !g && s && u, _ = g && !k;
  Me(() => {
    let B = h.current;
    if (B != null && B.complete) {
      let O = B.naturalWidth > 0;
      f(O), y(!O);
    }
  }, []);
  let v = $e((B) => {
    f(!0), y(!1), i?.(B);
  }, [i]), M = $e((B) => {
    f(!1), y(!0), a?.(B);
  }, [a]), S = async () => {
    if (n) try {
      let B = await (await fetch(n)).blob(), O = new URL(n, window.location.origin).pathname.split("/").pop() || "", j = O.split(".").pop(), w = O.includes(".") && j !== void 0 && j.length <= 4, z = "";
      if (w) z = O;
      else {
        let $ = B.type, X = "png";
        $.includes("jpeg") || $.includes("jpg") ? X = "jpg" : $.includes("png") ? X = "png" : $.includes("svg") ? X = "svg" : $.includes("gif") ? X = "gif" : $.includes("webp") && (X = "webp"), z = `${(r || O || "image").replace(Yx, "")}.${X}`;
      }
      hn(z, B, B.type);
    } catch {
      window.open(n, "_blank");
    }
  };
  return n ? re("div", { className: d("group relative my-4 inline-block"), "data-streamdown": "image-wrapper", children: [A("img", { alt: r, className: d("max-w-full rounded-lg", _ && "hidden", t), "data-streamdown": "image", onError: M, onLoad: v, ref: h, src: n, ...o }), _ && A("span", { className: d("text-muted-foreground text-xs italic"), "data-streamdown": "image-fallback", children: C.imageNotAvailable }), s && A("div", { className: d("pointer-events-none absolute inset-0 hidden rounded-lg bg-black/10 group-hover:block"), "data-streamdown": "image-overlay" }), I && A("button", { className: d("absolute right-2 bottom-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border bg-background/90 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-background", "opacity-0 group-hover:opacity-100"), onClick: S, title: C.downloadImage, type: "button", children: A(c, { size: 14 }) })] }) : null;
}, Wn = 0, Fa = () => {
  Wn += 1, Wn === 1 && (document.body.style.overflow = "hidden");
}, Ha = () => {
  Wn = Math.max(0, Wn - 1), Wn === 0 && (document.body.style.overflow = "");
}, Vx = ({ url: e, isOpen: t, onClose: n, onConfirm: r }) => {
  let { CheckIcon: i, CopyIcon: a, ExternalLinkIcon: s, XIcon: u } = lt(), o = ie(), [c, d] = Ae(!1), h = bt(), p = $e(async () => {
    try {
      await navigator.clipboard.writeText(e), d(!0), setTimeout(() => d(!1), 2e3);
    } catch {
    }
  }, [e]), f = $e(() => {
    r(), n();
  }, [r, n]);
  if (Me(() => {
    if (t) {
      Fa();
      let y = (C) => {
        C.key === "Escape" && n();
      };
      return document.addEventListener("keydown", y), () => {
        document.removeEventListener("keydown", y), Ha();
      };
    }
  }, [t, n]), !t || typeof document > "u") return null;
  let g = A("div", { className: o("fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm"), "data-streamdown": "link-safety-modal", onClick: n, onKeyDown: (y) => {
    y.key === "Escape" && n();
  }, role: "button", tabIndex: 0, children: re("div", { className: o("relative mx-4 flex w-full max-w-md flex-col gap-4 rounded-xl border bg-background p-6 shadow-lg"), onClick: (y) => y.stopPropagation(), onKeyDown: (y) => y.stopPropagation(), role: "presentation", children: [A("button", { className: o("absolute top-4 right-4 rounded-md p-1 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"), onClick: n, title: h.close, type: "button", children: A(u, { size: 16 }) }), re("div", { className: o("flex flex-col gap-2"), children: [re("div", { className: o("flex items-center gap-2 font-semibold text-lg"), children: [A(s, { size: 20 }), A("span", { children: h.openExternalLink })] }), A("p", { className: o("text-muted-foreground text-sm"), children: h.externalLinkWarning })] }), A("div", { className: o("break-all rounded-md bg-muted p-3 font-mono text-sm", e.length > 100 && "max-h-32 overflow-y-auto"), children: e }), re("div", { className: o("flex gap-2"), children: [A("button", { className: o("flex flex-1 items-center justify-center gap-2 rounded-md border bg-background px-4 py-2 font-medium text-sm transition-all hover:bg-muted"), onClick: p, type: "button", children: c ? re(pt, { children: [A(i, { size: 14 }), A("span", { children: h.copied })] }) : re(pt, { children: [A(a, { size: 14 }), A("span", { children: h.copyLink })] }) }), re("button", { className: o("flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-all hover:bg-primary/90"), onClick: f, type: "button", children: [A(s, { size: 14 }), A("span", { children: h.openLink })] })] })] }) });
  return Zi.createPortal(g, document.body);
}, Qi = en(null), Ua = () => Ce(Qi), Z3 = () => {
  var e;
  let t = Ua();
  return (e = t?.code) != null ? e : null;
}, za = () => {
  var e;
  let t = Ua();
  return (e = t?.mermaid) != null ? e : null;
}, Wx = (e) => {
  var t;
  let n = Ua();
  return n != null && n.renderers && e && (t = n.renderers.find((r) => Array.isArray(r.language) ? r.language.includes(e) : r.language === e)) != null ? t : null;
}, Gx = (e) => {
  if (typeof DOMParser > "u" || typeof XMLSerializer > "u") return e;
  let t = new DOMParser().parseFromString(e, "text/html").querySelector("svg");
  return t ? new XMLSerializer().serializeToString(t) : e;
}, Qx = (e, t) => {
  var n;
  let r = (n = void 0) != null ? n : 5;
  return new Promise((i, a) => {
    let s = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(e))), u = new Image();
    u.crossOrigin = "anonymous", u.onload = () => {
      let o = document.createElement("canvas"), c = u.width * r, d = u.height * r;
      o.width = c, o.height = d;
      let h = o.getContext("2d");
      if (!h) {
        a(new Error("Failed to create 2D canvas context for PNG export"));
        return;
      }
      h.drawImage(u, 0, 0, c, d), o.toBlob((p) => {
        if (!p) {
          a(new Error("Failed to create PNG blob"));
          return;
        }
        i(p);
      }, "image/png");
    }, u.onerror = () => a(new Error("Failed to load SVG image")), u.src = s;
  });
}, Uc = ({ chart: e, children: t, className: n, onDownload: r, config: i, onError: a }) => {
  let s = ie(), [u, o] = Ae(!1), c = ke(null), { isAnimating: d, controls: h } = Ce(De), p = lt(), f = za(), g = bt(), y = Ba(h, "mermaid", "diagram"), C = async (k) => {
    try {
      if (k === "mmd") {
        let B = `${y}.mmd`;
        hn(B, e, "text/plain"), o(!1), r?.(k);
        return;
      }
      if (!f) {
        a?.(new Error("Mermaid plugin not available"));
        return;
      }
      let I = f.getMermaid(i), _ = e.split("").reduce((B, O) => (B << 5) - B + O.charCodeAt(0) | 0, 0), v = `mermaid-${Math.abs(_)}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, { svg: M } = await I.render(v, e);
      if (!M) {
        a?.(new Error("SVG not found. Please wait for the diagram to render."));
        return;
      }
      let S = Gx(M);
      if (k === "svg") {
        let B = `${y}.svg`;
        hn(B, S, "image/svg+xml"), o(!1), r?.(k);
        return;
      }
      if (k === "png") {
        let B = await Qx(S);
        hn(`${y}.png`, B, "image/png"), r?.(k), o(!1);
        return;
      }
    } catch (I) {
      a?.(I);
    }
  };
  return Me(() => {
    let k = (I) => {
      let _ = I.composedPath();
      c.current && !_.includes(c.current) && o(!1);
    };
    return document.addEventListener("mousedown", k), () => {
      document.removeEventListener("mousedown", k);
    };
  }, []), re("div", { className: s("relative"), ref: c, children: [A("button", { "aria-label": g.downloadDiagram, className: s("cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50", n), disabled: d, onClick: () => o(!u), title: g.downloadDiagram, type: "button", children: t ?? A(p.DownloadIcon, { "aria-hidden": "true", size: 14 }) }), u ? re("div", { className: s("absolute top-full right-0 z-10 mt-1 min-w-[120px] overflow-hidden rounded-md border border-border bg-background shadow-lg"), children: [A("button", { "aria-label": g.downloadDiagramAsSvg, className: s("w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40"), onClick: () => C("svg"), title: g.downloadDiagramAsSvg, type: "button", children: g.mermaidFormatSvg }), A("button", { "aria-label": g.downloadDiagramAsPng, className: s("w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40"), onClick: () => C("png"), title: g.downloadDiagramAsPng, type: "button", children: g.mermaidFormatPng }), A("button", { "aria-label": g.downloadDiagramAsMmd, className: s("w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40"), onClick: () => C("mmd"), title: g.downloadDiagramAsMmd, type: "button", children: g.mermaidFormatMmd })] }) : null] });
}, Kx = ({ chart: e, config: t, onFullscreen: n, onExit: r, className: i, ...a }) => {
  let { Maximize2Icon: s, XIcon: u } = lt(), o = ie(), [c, d] = Ae(!1), { isAnimating: h, controls: p } = Ce(De), f = bt(), g = (() => {
    if (typeof p == "boolean") return p;
    let I = p.mermaid;
    return I === !1 ? !1 : I === !0 || I === void 0 ? !0 : I.panZoom !== !1;
  })(), y = (() => {
    if (typeof p == "boolean") return p;
    let I = p.mermaid;
    return I === !1 ? !1 : I === !0 || I === void 0 ? !0 : I.download !== !1;
  })(), C = (() => {
    if (typeof p == "boolean") return p;
    let I = p.mermaid;
    return I === !1 ? !1 : I === !0 || I === void 0 ? !0 : I.copy !== !1;
  })(), k = () => {
    d(!c);
  };
  return Me(() => {
    if (c) {
      Fa();
      let I = (_) => {
        _.key === "Escape" && d(!1);
      };
      return document.addEventListener("keydown", I), () => {
        document.removeEventListener("keydown", I), Ha();
      };
    }
  }, [c]), Me(() => {
    c ? n?.() : r && r();
  }, [c, n, r]), re(pt, { children: [A("button", { className: o("cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50", i), disabled: h, onClick: k, title: f.viewFullscreen, type: "button", ...a, "aria-label": f.viewFullscreen, children: A(s, { "aria-hidden": "true", size: 14 }) }), c ? Zi.createPortal(re("div", { "aria-label": f.viewFullscreen, "aria-modal": "true", className: o("fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"), "data-streamdown": "mermaid-fullscreen", onClick: k, onKeyDown: (I) => {
    I.key === "Escape" && k();
  }, role: "dialog", children: [re("div", { className: o("absolute top-4 right-4 z-10 flex items-center gap-1"), onClick: (I) => I.stopPropagation(), onKeyDown: (I) => I.stopPropagation(), role: "presentation", children: [y ? A(Uc, { chart: e, config: t }) : null, C ? A(Mr, { code: e }) : null, A("button", { "aria-label": f.exitFullscreen, className: o("rounded-md p-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"), onClick: k, title: f.exitFullscreen, type: "button", children: A(u, { "aria-hidden": "true", size: 20 }) })] }), A("div", { className: o("flex size-full items-center justify-center p-4"), onClick: (I) => I.stopPropagation(), onKeyDown: (I) => I.stopPropagation(), role: "presentation", children: A(_d, { chart: e, className: o("size-full [&_svg]:h-auto [&_svg]:w-auto"), config: t, fullscreen: !0, showControls: g }) })] }), document.body) : null] });
};
function Ki(e) {
  var t;
  if (e.nodeType === Node.TEXT_NODE) return (t = e.textContent) != null ? t : "";
  if (e.nodeType !== Node.ELEMENT_NODE) return "";
  let n = e;
  return n.tagName === "BR" ? `
` : Array.from(n.childNodes).map(Ki).join("");
}
var $a = (e) => {
  let t = [], n = [], r = e.querySelectorAll("thead th");
  for (let a of r) t.push(Ki(a).trim());
  let i = e.querySelectorAll("tbody tr");
  for (let a of i) {
    let s = [], u = a.querySelectorAll("td");
    for (let o of u) s.push(Ki(o).trim());
    n.push(s);
  }
  return { headers: t, rows: n };
}, zc = (e) => {
  var t;
  if (typeof e != "object") return ",";
  let n = e.table;
  return typeof n != "object" ? "," : (t = n.csvSeparator) != null ? t : ",";
}, ja = (e, t = ",") => {
  let n;
  t === "auto" ? Intl.NumberFormat().format(1.1).includes(",") ? n = ";" : n = "," : n = t;
  let { headers: r, rows: i } = e, a = (c) => {
    let d = !1;
    for (let h of c) if (h === n || h === '"' || h === `
` || h === "\r") {
      d = !0;
      break;
    }
    return d ? `"${c.replace(/"/g, '""')}"` : c;
  }, s = r.length > 0 ? i.length + 1 : i.length, u = new Array(s), o = 0;
  r.length > 0 && (u[o] = r.map(a).join(n), o += 1);
  for (let c of i) u[o] = c.map(a).join(n), o += 1;
  return u.join(`
`);
}, $c = (e) => {
  let { headers: t, rows: n } = e, r = (u) => {
    let o = !1;
    for (let d of u) if (d === "	" || d === `
` || d === "\r") {
      o = !0;
      break;
    }
    if (!o) return u;
    let c = [];
    for (let d of u) d === "	" ? c.push("\\t") : d === `
` ? c.push("\\n") : d === "\r" ? c.push("\\r") : c.push(d);
    return c.join("");
  }, i = t.length > 0 ? n.length + 1 : n.length, a = new Array(i), s = 0;
  t.length > 0 && (a[s] = t.map(r).join("	"), s += 1);
  for (let u of n) a[s] = u.map(r).join("	"), s += 1;
  return a.join(`
`);
}, yr = (e) => {
  let t = !1;
  for (let r of e) if (r === "\\" || r === "|" || r === `
`) {
    t = !0;
    break;
  }
  if (!t) return e;
  let n = [];
  for (let r of e) r === "\\" ? n.push("\\\\") : r === "|" ? n.push("\\|") : r === `
` ? n.push("<br>") : n.push(r);
  return n.join("");
}, Ya = (e) => {
  let { headers: t, rows: n } = e;
  if (t.length === 0) return "";
  let r = new Array(n.length + 2), i = 0, a = t.map((u) => yr(u));
  r[i] = `| ${a.join(" | ")} |`, i += 1;
  let s = new Array(t.length);
  for (let u = 0; u < t.length; u += 1) s[u] = "---";
  r[i] = `| ${s.join(" | ")} |`, i += 1;
  for (let u of n) if (u.length < t.length) {
    let o = new Array(t.length);
    for (let c = 0; c < t.length; c += 1) o[c] = c < u.length ? yr(u[c]) : "";
    r[i] = `| ${o.join(" | ")} |`, i += 1;
  } else {
    let o = u.map((c) => yr(c));
    r[i] = `| ${o.join(" | ")} |`, i += 1;
  }
  return r.join(`
`);
}, qa = ({ children: e, className: t, onCopy: n, onError: r, timeout: i = 2e3 }) => {
  let a = ie(), [s, u] = Ae(!1), [o, c] = Ae(!1), d = ke(null), h = ke(0), { isAnimating: p, controls: f } = Ce(De), g = bt(), y = zc(f), C = async (_) => {
    var v, M;
    if (typeof window > "u" || !((v = navigator?.clipboard) != null && v.write)) {
      r?.(new Error("Clipboard API not available"));
      return;
    }
    try {
      let S = (M = d.current) == null ? void 0 : M.closest('[data-streamdown="table-wrapper"]'), B = S?.querySelector("table");
      if (!B) {
        r?.(new Error("Table not found"));
        return;
      }
      let O = $a(B), j = "";
      _ === "csv" ? j = ja(O, y) : _ === "tsv" ? j = $c(O) : j = Ya(O);
      let w = new ClipboardItem({ "text/plain": new Blob([j], { type: "text/plain" }), "text/html": new Blob([B.outerHTML], { type: "text/html" }) });
      await navigator.clipboard.write([w]), c(!0), u(!1), n?.(_), h.current = window.setTimeout(() => c(!1), i);
    } catch (S) {
      r?.(S);
    }
  };
  Me(() => {
    let _ = (v) => {
      let M = v.composedPath();
      d.current && !M.includes(d.current) && u(!1);
    };
    return document.addEventListener("mousedown", _), () => {
      document.removeEventListener("mousedown", _), window.clearTimeout(h.current);
    };
  }, []);
  let k = lt(), I = o ? k.CheckIcon : k.CopyIcon;
  return re("div", { className: a("relative"), ref: d, children: [A("button", { className: a("cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50", t), disabled: p, onClick: () => u(!s), title: g.copyTable, type: "button", children: e ?? A(I, { height: 14, width: 14 }) }), s ? re("div", { className: a("absolute top-full right-0 z-20 mt-1 min-w-[120px] overflow-hidden rounded-md border border-border bg-background shadow-lg"), children: [A("button", { className: a("w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40"), onClick: () => C("md"), title: g.copyTableAsMarkdown, type: "button", children: g.tableFormatMarkdown }), A("button", { className: a("w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40"), onClick: () => C("csv"), title: g.copyTableAsCsv, type: "button", children: g.tableFormatCsv }), A("button", { className: a("w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40"), onClick: () => C("tsv"), title: g.copyTableAsTsv, type: "button", children: g.tableFormatTsv })] }) : null] });
}, Va = ({ children: e, className: t, onDownload: n, onError: r }) => {
  let i = ie(), [a, s] = Ae(!1), u = ke(null), { isAnimating: o, controls: c } = Ce(De), d = bt(), h = lt(), p = zc(c), f = (g) => {
    var y;
    try {
      let C = (y = u.current) == null ? void 0 : y.closest('[data-streamdown="table-wrapper"]'), k = C?.querySelector("table");
      if (!k) {
        r?.(new Error("Table not found"));
        return;
      }
      let I = $a(k), _ = g === "csv" ? ja(I, p) : Ya(I), v = g === "csv" ? "csv" : "md", M = `${Ba(c, "table", "table")}.${v}`;
      hn(M, _, g === "csv" ? "text/csv" : "text/markdown"), s(!1), n?.(g);
    } catch (C) {
      r?.(C);
    }
  };
  return Me(() => {
    let g = (y) => {
      let C = y.composedPath();
      u.current && !C.includes(u.current) && s(!1);
    };
    return document.addEventListener("mousedown", g), () => {
      document.removeEventListener("mousedown", g);
    };
  }, []), re("div", { className: i("relative"), ref: u, children: [A("button", { className: i("cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50", t), disabled: o, onClick: () => s(!a), title: d.downloadTable, type: "button", children: e ?? A(h.DownloadIcon, { size: 14 }) }), a ? re("div", { className: i("absolute top-full right-0 z-20 mt-1 min-w-[120px] overflow-hidden rounded-md border border-border bg-background shadow-lg"), children: [A("button", { className: i("w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40"), onClick: () => f("csv"), title: d.downloadTableAsCsv, type: "button", children: d.tableFormatCsv }), A("button", { className: i("w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40"), onClick: () => f("markdown"), title: d.downloadTableAsMarkdown, type: "button", children: d.tableFormatMarkdown })] }) : null] });
}, Xx = ({ children: e, className: t, showCopy: n = !0, showDownload: r = !0 }) => {
  let { Maximize2Icon: i, XIcon: a } = lt(), s = ie(), [u, o] = Ae(!1), { isAnimating: c } = Ce(De), d = bt(), h = () => {
    o(!0);
  }, p = () => {
    o(!1);
  };
  return Me(() => {
    if (u) {
      Fa();
      let f = (g) => {
        g.key === "Escape" && o(!1);
      };
      return document.addEventListener("keydown", f), () => {
        document.removeEventListener("keydown", f), Ha();
      };
    }
  }, [u]), re(pt, { children: [A("button", { className: s("cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50", t), disabled: c, onClick: h, title: d.viewFullscreen, type: "button", children: A(i, { size: 14 }) }), u ? Zi.createPortal(A("div", { "aria-label": d.viewFullscreen, "aria-modal": "true", className: s("fixed inset-0 z-50 flex flex-col bg-background"), "data-streamdown": "table-fullscreen", onClick: p, onKeyDown: (f) => {
    f.key === "Escape" && p();
  }, role: "dialog", children: re("div", { className: s("flex h-full flex-col"), "data-streamdown": "table-wrapper", onClick: (f) => f.stopPropagation(), onKeyDown: (f) => f.stopPropagation(), role: "presentation", children: [re("div", { className: s("flex items-center justify-end gap-1 p-4"), children: [n ? A(qa, {}) : null, r ? A(Va, {}) : null, A("button", { className: s("rounded-md p-1 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"), onClick: p, title: d.exitFullscreen, type: "button", children: A(a, { size: 20 }) })] }), A("div", { className: s("flex-1 overflow-auto p-4 pt-0 [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10"), children: A("table", { className: s("w-full border-collapse border border-border"), "data-streamdown": "table", children: e }) })] }) }), document.body) : null] });
}, Zx = ({ children: e, className: t, maxHeight: n, showControls: r, showCopy: i = !0, showDownload: a = !0, showFullscreen: s = !0, ...u }) => {
  let o = ie(), { isAnimating: c } = Ce(De), d = Rc(n), h = Oc(c, !!d, e), p = r && i, f = r && a, g = r && s, y = p || f || g;
  return re("div", { className: o("my-4 flex flex-col gap-2 rounded-lg border border-border bg-sidebar p-2"), "data-streamdown": "table-wrapper", children: [y ? re("div", { className: o("flex items-center justify-end gap-1"), children: [p ? A(qa, {}) : null, f ? A(Va, {}) : null, g ? A(Xx, { showCopy: p, showDownload: f, children: e }) : null] }) : null, A("div", { className: o("border-collapse overflow-x-auto overflow-y-auto rounded-md border border-border bg-background"), ref: h, style: d ? { maxHeight: d } : void 0, children: A("table", { className: o("w-full divide-y divide-border", t), "data-streamdown": "table", ...u, children: e }) })] });
}, Jx = /startLine=(\d+)/, e3 = /\bnoLineNumbers\b/, t3 = Vu(() => Promise.resolve().then(() => Q3).then((e) => ({ default: e.Mermaid }))), n3 = /language-([^\s]+)/, r3 = "node";
function Ee(e, t) {
  let n = Object.keys(e);
  if (n.length !== Object.keys(t).length) return !1;
  let r = e, i = t;
  for (let a of n) if (a !== r3 && !Object.is(r[a], i[a])) return !1;
  return !0;
}
function i3(e, t) {
  var n, r;
  return ((n = e?.properties) == null ? void 0 : n.metastring) === ((r = t?.properties) == null ? void 0 : r.metastring);
}
var vr = (e, t) => typeof e == "boolean" ? e : e[t] !== !1, Ai = (e, t) => {
  if (typeof e == "boolean") return e;
  let n = e.table;
  return n === !1 ? !1 : n === !0 || n === void 0 ? !0 : n[t] !== !1;
}, Lu = (e, t) => {
  if (typeof e == "boolean") return e;
  let n = e.code;
  return n === !1 ? !1 : n === !0 || n === void 0 ? !0 : n[t] !== !1;
}, gr = (e, t) => {
  if (typeof e == "boolean") return e;
  let n = e.mermaid;
  return n === !1 ? !1 : n === !0 || n === void 0 ? !0 : n[t] !== !1;
}, a3 = (e, t) => {
  if (typeof e == "boolean") return e;
  let n = e.image;
  return n === !1 ? !1 : n === !0 || n === void 0 ? !0 : n[t] !== !1;
}, Wa = pe(({ children: e, className: t, node: n, ...r }) => {
  let i = ie();
  return A("ol", { className: i("list-inside list-decimal whitespace-normal [li_&]:pl-6", t), "data-streamdown": "ordered-list", ...r, children: e });
}, (e, t) => Ee(e, t));
Wa.displayName = "MarkdownOl";
var jc = pe(({ children: e, className: t, node: n, ...r }) => {
  let i = ie();
  return A("li", { className: i("py-1 [&>p]:inline", t), "data-streamdown": "list-item", ...r, children: e });
}, (e, t) => Ee(e, t));
jc.displayName = "MarkdownLi";
var Yc = pe(({ children: e, className: t, node: n, ...r }) => {
  let i = ie();
  return A("ul", { className: i("list-inside list-disc whitespace-normal [li_&]:pl-6", t), "data-streamdown": "unordered-list", ...r, children: e });
}, (e, t) => Ee(e, t));
Yc.displayName = "MarkdownUl";
var qc = pe(({ className: e, node: t, ...n }) => {
  let r = ie();
  return A("hr", { className: r("my-6 border-border", e), "data-streamdown": "horizontal-rule", ...n });
}, (e, t) => Ee(e, t));
qc.displayName = "MarkdownHr";
var Vc = pe(({ children: e, className: t, node: n, ...r }) => {
  let i = ie();
  return A("span", { className: i("font-semibold", t), "data-streamdown": "strong", ...r, children: e });
}, (e, t) => Ee(e, t));
Vc.displayName = "MarkdownStrong";
var s3 = ({ children: e, className: t, href: n, node: r, ...i }) => {
  let a = ie(), { linkSafety: s } = Ce(De), [u, o] = Ae(!1), c = n === "streamdown:incomplete-link", d = $e(async (g) => {
    if (!(!(s != null && s.enabled && n) || c)) {
      if (g.preventDefault(), s.onLinkCheck && await s.onLinkCheck(n)) {
        window.open(n, "_blank", "noreferrer");
        return;
      }
      o(!0);
    }
  }, [s, n, c]), h = $e(() => {
    n && window.open(n, "_blank", "noreferrer");
  }, [n]), p = $e(() => {
    o(!1);
  }, []), f = { url: n ?? "", isOpen: u, onClose: p, onConfirm: h };
  return s != null && s.enabled && n ? re(pt, { children: [A("button", { className: a("wrap-anywhere appearance-none text-left font-medium text-primary underline", t), "data-incomplete": c, "data-streamdown": "link", onClick: d, type: "button", children: e }), s.renderModal ? s.renderModal(f) : A(Vx, { ...f })] }) : A("a", { className: a("wrap-anywhere font-medium text-primary underline", t), "data-incomplete": c, "data-streamdown": "link", href: n, rel: "noreferrer", target: "_blank", ...i, children: e });
}, Wc = pe(s3, (e, t) => Ee(e, t));
Wc.displayName = "MarkdownA";
var Gc = pe(({ children: e, className: t, node: n, ...r }) => {
  let i = ie();
  return A("h1", { className: i("mt-6 mb-2 font-semibold text-3xl", t), "data-streamdown": "heading-1", ...r, children: e });
}, (e, t) => Ee(e, t));
Gc.displayName = "MarkdownH1";
var Qc = pe(({ children: e, className: t, node: n, ...r }) => {
  let i = ie();
  return A("h2", { className: i("mt-6 mb-2 font-semibold text-2xl", t), "data-streamdown": "heading-2", ...r, children: e });
}, (e, t) => Ee(e, t));
Qc.displayName = "MarkdownH2";
var Kc = pe(({ children: e, className: t, node: n, ...r }) => {
  let i = ie();
  return A("h3", { className: i("mt-6 mb-2 font-semibold text-xl", t), "data-streamdown": "heading-3", ...r, children: e });
}, (e, t) => Ee(e, t));
Kc.displayName = "MarkdownH3";
var Xc = pe(({ children: e, className: t, node: n, ...r }) => {
  let i = ie();
  return A("h4", { className: i("mt-6 mb-2 font-semibold text-lg", t), "data-streamdown": "heading-4", ...r, children: e });
}, (e, t) => Ee(e, t));
Xc.displayName = "MarkdownH4";
var Zc = pe(({ children: e, className: t, node: n, ...r }) => {
  let i = ie();
  return A("h5", { className: i("mt-6 mb-2 font-semibold text-base", t), "data-streamdown": "heading-5", ...r, children: e });
}, (e, t) => Ee(e, t));
Zc.displayName = "MarkdownH5";
var Jc = pe(({ children: e, className: t, node: n, ...r }) => {
  let i = ie();
  return A("h6", { className: i("mt-6 mb-2 font-semibold text-sm", t), "data-streamdown": "heading-6", ...r, children: e });
}, (e, t) => Ee(e, t));
Jc.displayName = "MarkdownH6";
var ed = pe(({ children: e, className: t, node: n, ...r }) => {
  let { controls: i, tableMaxHeight: a } = Ce(De), s = vr(i, "table"), u = Ai(i, "copy"), o = Ai(i, "download"), c = Ai(i, "fullscreen");
  return A(Zx, { className: t, maxHeight: a, showControls: s, showCopy: u, showDownload: o, showFullscreen: c, ...r, children: e });
}, (e, t) => Ee(e, t));
ed.displayName = "MarkdownTable";
var td = pe(({ children: e, className: t, node: n, ...r }) => {
  let i = ie();
  return A("thead", { className: i("bg-muted/80", t), "data-streamdown": "table-header", ...r, children: e });
}, (e, t) => Ee(e, t));
td.displayName = "MarkdownThead";
var nd = pe(({ children: e, className: t, node: n, ...r }) => {
  let i = ie();
  return A("tbody", { className: i("divide-y divide-border", t), "data-streamdown": "table-body", ...r, children: e });
}, (e, t) => Ee(e, t));
nd.displayName = "MarkdownTbody";
var rd = pe(({ children: e, className: t, node: n, ...r }) => {
  let i = ie();
  return A("tr", { className: i("border-border", t), "data-streamdown": "table-row", ...r, children: e });
}, (e, t) => Ee(e, t));
rd.displayName = "MarkdownTr";
var id = pe(({ children: e, className: t, node: n, ...r }) => {
  let i = ie();
  return A("th", { className: i("whitespace-nowrap px-4 py-2 text-left font-semibold text-sm", t), "data-streamdown": "table-header-cell", ...r, children: e });
}, (e, t) => Ee(e, t));
id.displayName = "MarkdownTh";
var ad = pe(({ children: e, className: t, node: n, ...r }) => {
  let i = ie();
  return A("td", { className: i("px-4 py-2 text-sm", t), "data-streamdown": "table-cell", ...r, children: e });
}, (e, t) => Ee(e, t));
ad.displayName = "MarkdownTd";
var sd = pe(({ children: e, className: t, node: n, ...r }) => {
  let i = ie();
  return A("blockquote", { className: i("my-4 border-muted-foreground/30 border-l-4 pl-4 text-muted-foreground italic", t), "data-streamdown": "blockquote", ...r, children: e });
}, (e, t) => Ee(e, t));
sd.displayName = "MarkdownBlockquote";
var ud = pe(({ children: e, className: t, node: n, ...r }) => {
  let i = ie();
  return A("sup", { className: i("text-sm", t), "data-streamdown": "superscript", ...r, children: e });
}, (e, t) => Ee(e, t));
ud.displayName = "MarkdownSup";
var od = pe(({ children: e, className: t, node: n, ...r }) => {
  let i = ie();
  return A("sub", { className: i("text-sm", t), "data-streamdown": "subscript", ...r, children: e });
}, (e, t) => Ee(e, t));
od.displayName = "MarkdownSub";
var ld = pe(({ children: e, className: t, node: n, ...r }) => {
  if ("data-footnotes" in r) {
    let i = (s) => {
      var u, o;
      if (!Vt(s)) return !1;
      let c = Array.isArray(s.props.children) ? s.props.children : [s.props.children], d = !1, h = !1;
      for (let p of c) if (p) {
        if (typeof p == "string") p.trim() !== "" && (d = !0);
        else if (Vt(p)) if (((u = p.props) == null ? void 0 : u["data-footnote-backref"]) !== void 0) h = !0;
        else {
          let f = Array.isArray(p.props.children) ? p.props.children : [p.props.children];
          for (let g of f) {
            if (typeof g == "string" && g.trim() !== "") {
              d = !0;
              break;
            }
            if (Vt(g) && ((o = g.props) == null ? void 0 : o["data-footnote-backref"]) === void 0) {
              d = !0;
              break;
            }
          }
        }
      }
      return h && !d;
    }, a = Array.isArray(e) ? e.map((s) => {
      if (!Vt(s)) return s;
      if (s.type === Wa) {
        let u = (Array.isArray(s.props.children) ? s.props.children : [s.props.children]).filter((o) => !i(o));
        return u.length === 0 ? null : { ...s, props: { ...s.props, children: u } };
      }
      return s;
    }) : e;
    return (Array.isArray(a) ? a.some((s) => s !== null) : a !== null) ? A("section", { className: t, ...r, children: a }) : null;
  }
  return A("section", { className: t, ...r, children: e });
}, (e, t) => Ee(e, t));
ld.displayName = "MarkdownSection";
var u3 = ({ node: e, className: t, children: n, ...r }) => {
  var i, a;
  let s = ie(), u = !("data-block" in r), { mermaid: o, controls: c, lineNumbers: d } = Ce(De), h = za(), p = Lc(), f = t?.match(n3), g = (i = f?.at(1)) != null ? i : "", y = Wx(g);
  if (u) return A("code", { className: s("rounded bg-muted px-1.5 py-0.5 font-mono text-sm", t), "data-streamdown": "inline-code", ...r, children: n });
  let C = (a = e?.properties) == null ? void 0 : a.metastring, k = C?.match(Jx), I = k ? Number.parseInt(k[1], 10) : void 0, _ = I !== void 0 && I >= 1 ? I : void 0, v = !(C && e3.test(C)) && d !== !1, M = "";
  if (Vt(n) && n.props && typeof n.props == "object" && "children" in n.props && typeof n.props.children == "string" ? M = n.props.children : typeof n == "string" && (M = n), y) {
    let z = y.component;
    return A(_i, { fallback: A(Gi, {}), children: A(z, { code: M, isIncomplete: p, language: g, meta: C }) });
  }
  if (g === "mermaid" && h) {
    let z = vr(c, "mermaid"), $ = gr(c, "download"), X = gr(c, "copy"), V = gr(c, "fullscreen"), H = gr(c, "panZoom"), G = z && ($ || X || V);
    return A(_i, { fallback: A(Gi, {}), children: re("div", { className: s("group relative my-4 flex w-full flex-col gap-2 rounded-xl border border-border bg-sidebar p-2", t), "data-streamdown": "mermaid-block", children: [A("div", { className: s("flex h-8 items-center text-muted-foreground text-xs"), children: A("span", { className: s("ml-1 font-mono lowercase"), children: "mermaid" }) }), G ? A("div", { className: s("pointer-events-none sticky top-2 z-10 -mt-10 flex h-8 items-center justify-end"), children: re("div", { className: s("pointer-events-auto flex shrink-0 items-center gap-2 rounded-md border border-sidebar bg-sidebar/80 px-1.5 py-1 supports-[backdrop-filter]:bg-sidebar/70 supports-[backdrop-filter]:backdrop-blur"), "data-streamdown": "mermaid-block-actions", children: [$ ? A(Uc, { chart: M, config: o?.config }) : null, X ? A(Mr, { code: M }) : null, V ? A(Kx, { chart: M, config: o?.config }) : null] }) }) : null, A("div", { className: s("rounded-md border border-border bg-background"), children: A(t3, { chart: M, config: o?.config, showControls: H }) })] }) });
  }
  let S = vr(c, "code"), B = Lu(c, "download"), O = Lu(c, "copy"), { "data-block": j, ...w } = r;
  return A(Bc, { className: t, code: M, isIncomplete: p, language: g, lineNumbers: v, startLine: _, ...w, children: S ? re(pt, { children: [B ? A(Hc, { code: M, language: g }) : null, O ? A(Mr, {}) : null] }) : null });
}, cd = pe(u3, (e, t) => Ee(e, t) && i3(e.node, t.node));
cd.displayName = "MarkdownCode";
var o3 = ({ node: e, className: t, ...n }) => {
  let { controls: r } = Ce(De), i = vr(r, "image"), a = i && a3(r, "download");
  return A(qx, { className: t, node: e, showControls: i, showDownloadControl: a, ...n });
}, dd = pe(o3, (e, t) => Ee(e, t));
dd.displayName = "MarkdownImg";
var hd = pe(({ children: e, node: t, ...n }) => {
  let r = (Array.isArray(e) ? e : [e]).filter((i) => i != null && i !== "");
  if (r.length === 1 && Vt(r[0])) {
    let i = r[0].props.node, a = i?.tagName;
    if (a === "img") return A(pt, { children: e });
    if (a === "code" && "data-block" in r[0].props) return A(pt, { children: e });
  }
  return A("p", { ...n, children: e });
}, (e, t) => Ee(e, t));
hd.displayName = "MarkdownParagraph";
var l3 = { ol: Wa, li: jc, ul: Yc, hr: qc, strong: Vc, a: Wc, h1: Gc, h2: Qc, h3: Kc, h4: Xc, h5: Zc, h6: Jc, table: ed, thead: td, tbody: nd, tr: rd, th: id, td: ad, blockquote: sd, code: cd, img: dd, pre: ({ children: e }) => Vt(e) ? Id(e, { "data-block": "true" }) : e, sup: ud, sub: od, p: hd, section: ld }, c3 = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/, d3 = /\p{L}/u;
function Ga(e) {
  let t = e.replace(/(```|~~~)[\s\S]*?\1/g, "").replace(/^#{1,6}\s+/gm, "").replace(/(\*{1,3}|_{1,3})/g, "").replace(/`[^`]*`/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/^[\s>*\-+\d.]+/gm, ""), n, r = 0, i = 0;
  for (let a of t) {
    if (c3.test(a)) {
      n != null || (n = "rtl"), i += 1;
      continue;
    }
    d3.test(a) && (n != null || (n = "ltr"), r += 1);
  }
  return i > r ? "rtl" : r > i ? "ltr" : n ?? "ltr";
}
var h3 = /^[ \t]{0,3}(`{3,}|~{3,})/, f3 = /^\|?[ \t]*:?-{1,}:?[ \t]*(\|[ \t]*:?-{1,}:?[ \t]*)*\|?$/, Ru = (e) => {
  let t = e.split(`
`), n = null, r = 0;
  for (let i of t) {
    let a = h3.exec(i);
    if (n === null) {
      if (a) {
        let s = a[1];
        n = s[0], r = s.length;
      }
    } else if (a) {
      let s = a[1], u = s[0], o = s.length;
      u === n && o >= r && (n = null, r = 0);
    }
  }
  return n !== null;
}, p3 = (e) => {
  let t = e.split(`
`);
  for (let n of t) {
    let r = n.trim();
    if (r.length > 0 && r.includes("|") && f3.test(r)) return !0;
  }
  return !1;
}, m3 = () => (e) => {
  ut(e, "html", (t, n, r) => {
    !r || typeof n != "number" || (r.children[n] = { type: "text", value: t.value });
  });
}, Ou = [], Du = { allowDangerousHtml: !0 }, br = /* @__PURE__ */ new WeakMap(), g3 = class {
  constructor() {
    this.cache = /* @__PURE__ */ new Map(), this.keyCache = /* @__PURE__ */ new WeakMap(), this.maxSize = 100;
  }
  generateCacheKey(e) {
    let t = this.keyCache.get(e);
    if (t) return t;
    let n = e.rehypePlugins, r = e.remarkPlugins, i = e.remarkRehypeOptions;
    if (!(n || r || i)) {
      let d = "default";
      return this.keyCache.set(e, d), d;
    }
    let a = (d) => {
      if (!d || d.length === 0) return "";
      let h = "";
      for (let p = 0; p < d.length; p += 1) {
        let f = d[p];
        if (p > 0 && (h += ","), Array.isArray(f)) {
          let [g, y] = f;
          if (typeof g == "function") {
            let C = br.get(g);
            C || (C = g.name, br.set(g, C)), h += C;
          } else h += String(g);
          h += ":", h += JSON.stringify(y);
        } else if (typeof f == "function") {
          let g = br.get(f);
          g || (g = f.name, br.set(f, g)), h += g;
        } else h += String(f);
      }
      return h;
    }, s = a(n), u = a(r), o = i ? JSON.stringify(i) : "", c = `${u}::${s}::${o}`;
    return this.keyCache.set(e, c), c;
  }
  get(e) {
    let t = this.generateCacheKey(e), n = this.cache.get(t);
    return n && (this.cache.delete(t), this.cache.set(t, n)), n;
  }
  set(e, t) {
    let n = this.generateCacheKey(e);
    if (this.cache.size >= this.maxSize) {
      let r = this.cache.keys().next().value;
      r && this.cache.delete(r);
    }
    this.cache.set(n, t);
  }
  clear() {
    this.cache.clear();
  }
}, Pu = new g3(), fd = (e) => {
  let t = b3(e), n = e.children || "", r = t.runSync(t.parse(n), n);
  return A3(r, e);
}, b3 = (e) => {
  let t = Pu.get(e);
  if (t) return t;
  let n = T3(e);
  return Pu.set(e, n), n;
}, E3 = (e) => e.some((t) => Array.isArray(t) ? t[0] === Di : t === Di), T3 = (e) => {
  let t = e.rehypePlugins || Ou, n = e.remarkPlugins || Ou, r = E3(t) ? n : [...n, m3], i = e.remarkRehypeOptions ? { ...Du, ...e.remarkRehypeOptions } : Du;
  return mk().use(p2).use(r).use(K2, i).use(t);
}, pd = (e) => e, k3 = (e, t, n, r) => {
  n ? e.children.splice(t, 1) : e.children[t] = { type: "text", value: r };
}, x3 = (e, t) => {
  var n;
  for (let r in pi) if (Object.hasOwn(pi, r) && Object.hasOwn(e.properties, r)) {
    let i = e.properties[r], a = pi[r];
    (a === null || a.includes(e.tagName)) && (e.properties[r] = (n = t(String(i || ""), r, e)) != null ? n : void 0);
  }
}, y3 = (e, t, n, r, i, a) => {
  let s = !1;
  return r ? s = !r.includes(e.tagName) : i && (s = i.includes(e.tagName)), !s && a && typeof t == "number" && (s = !a(e, t, n)), s;
}, A3 = (e, t) => {
  let { allowElement: n, allowedElements: r, disallowedElements: i, skipHtml: a, unwrapDisallowed: s, urlTransform: u } = t;
  if (n || r || i || a || u) {
    let o = u || pd;
    ut(e, (c, d, h) => {
      if (c.type === "raw" && h && typeof d == "number") return k3(h, d, a, c.value), d;
      if (c.type === "element" && (x3(c, o), y3(c, d, h, r, i, n) && h && typeof d == "number")) return s && c.children ? h.children.splice(d, 1, ...c.children) : h.children.splice(d, 1), d;
    });
  }
  return yT(e, { Fragment: pt, components: t.components, ignoreInvalidStyle: !0, jsx: A, jsxs: re, passKeys: !0, passNode: !0 });
}, _3 = /\[\^[\w-]{1,200}\](?!:)/, C3 = /\[\^[\w-]{1,200}\]:/, I3 = /<([A-Za-z][\w:-]*)[\s>/]/, N3 = /* @__PURE__ */ new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]), Mu = /* @__PURE__ */ new Map(), vu = /* @__PURE__ */ new Map(), S3 = (e) => {
  let t = e.toLowerCase(), n = Mu.get(t);
  if (n) return n;
  let r = new RegExp(`<${t}(?=[\\s>/])[^>]*>`, "gi");
  return Mu.set(t, r), r;
}, w3 = (e) => {
  let t = e.toLowerCase(), n = vu.get(t);
  if (n) return n;
  let r = new RegExp(`</${t}(?=[\\s>])[^>]*>`, "gi");
  return vu.set(t, r), r;
}, Bu = (e, t) => {
  if (N3.has(t.toLowerCase())) return 0;
  let n = e.match(S3(t));
  if (!n) return 0;
  let r = 0;
  for (let i of n) i.trimEnd().endsWith("/>") || (r += 1);
  return r;
}, Fu = (e, t) => {
  let n = e.match(w3(t));
  return n ? n.length : 0;
}, L3 = (e) => {
  let t = 0;
  for (let n = 0; n < e.length - 1; n += 1) e[n] === "$" && e[n + 1] === "$" && (t += 1, n += 1);
  return t;
}, md = (e) => {
  let t = _3.test(e), n = C3.test(e);
  if (t || n) return [e];
  let r = rt.lex(e, { gfm: !0 }), i = [], a = [], s = !1;
  for (let u of r) {
    let o = u.raw, c = i.length;
    if (a.length > 0) {
      i[c - 1] += o;
      let d = a.at(-1), h = Bu(o, d), p = Fu(o, d);
      for (let f = 0; f < h; f += 1) a.push(d);
      for (let f = 0; f < p; f += 1) a.length > 0 && a.at(-1) === d && a.pop();
      continue;
    }
    if (u.type === "html" && u.block) {
      let d = o.match(I3);
      if (d) {
        let h = d[1], p = Bu(o, h), f = Fu(o, h);
        p > f && a.push(h);
      }
    }
    if (c > 0 && !s) {
      let d = i[c - 1];
      if (L3(d) % 2 === 1) {
        i[c - 1] = d + o;
        continue;
      }
    }
    i.push(o), u.type !== "space" && (s = u.type === "code");
  }
  return i;
}, R3 = /^\n*/, O3 = /\n*$/, Xi = /\n\n/g, D3 = (e, t, n) => {
  if (!t.includes(`
`)) return e + t + n;
  let r = t.replace(Xi, `
<!---->
`).replace(R3, `

`).replace(O3, `

`);
  return `${e}${r}${n}

`;
}, P3 = (e, t) => {
  let n = new RegExp(`<(${t})(?=[\\s>/])([^>]*)>`, "gi"), r = "", i = 0, a = n.exec(e);
  for (; a; ) {
    let s = a[0], u = a[1], o = a.index + s.length, c = e.slice(o);
    if (new RegExp(`</${u}\\s*>`, "i").test(c)) {
      a = n.exec(e);
      continue;
    }
    if (r += e.slice(i, a.index), c.length === 0) {
      r += s, i = o, a = n.exec(e);
      continue;
    }
    if (c.startsWith(`

`)) {
      let p = c.slice(2).replace(Xi, `
<!---->
`);
      r += `${s}

${p}`, i = e.length;
      break;
    }
    if (!c.startsWith(`
`)) {
      r += s, i = o, a = n.exec(e);
      continue;
    }
    let d = c.slice(1);
    if (d.trim().length === 0) {
      r += s, i = o, a = n.exec(e);
      continue;
    }
    let h = d.replace(Xi, `
<!---->
`);
    r += `${s}

${h}`, i = e.length;
    break;
  }
  return i === 0 ? e : r + e.slice(i);
}, M3 = (e, t) => {
  if (!t.length) return e;
  let n = e;
  for (let r of t) {
    let i = new RegExp(`(<${r}(?=[\\s>/])[^>]*>)([\\s\\S]*?)(</${r}\\s*>)`, "gi");
    n = n.replace(i, (a, s, u, o) => D3(s, u, o)), n = P3(n, r);
  }
  return n;
}, v3 = /([\\`*_~[\]|])/g, B3 = (e) => e.replace(v3, "\\$1"), F3 = (e, t) => {
  if (!t.length) return e;
  let n = e;
  for (let r of t) {
    let i = new RegExp(`(<${r}(?=[\\s>/])[^>]*>)([\\s\\S]*?)(</${r}\\s*>)`, "gi");
    n = n.replace(i, (a, s, u, o) => {
      let c = B3(u).replace(/\n\n/g, "&#10;&#10;");
      return s + c + o;
    });
  }
  return n;
}, H3 = /* @__PURE__ */ new Set(["blockquote", "dd", "dt", "figcaption", "h1", "h2", "h3", "h4", "h5", "h6", "li", "p", "td", "th"]), gd = /* @__PURE__ */ new Set(["code", "kbd", "pre", "samp", "var"]);
function bd(e) {
  return e.children.map((t) => t.type === "text" ? t.value : t.type === "element" && !gd.has(t.tagName) ? bd(t) : "").join("");
}
function U3() {
  return (e) => {
    ut(e, "element", (t) => {
      if (gd.has(t.tagName)) {
        t.properties != null || (t.properties = {}), t.properties.dir = "ltr";
        return;
      }
      H3.has(t.tagName) && (t.properties != null || (t.properties = {}), typeof t.properties.dir != "string" && (t.properties.dir = Ga(bd(t))));
    });
  };
}
var Ed = (e) => e.type === "text" ? e.value : "children" in e && Array.isArray(e.children) ? e.children.map(Ed).join("") : "", z3 = (e) => (t) => {
  if (!e || e.length === 0) return;
  let n = new Set(e.map((r) => r.toLowerCase()));
  ut(t, "element", (r) => {
    if (n.has(r.tagName.toLowerCase())) {
      let i = Ed(r);
      r.children = i ? [{ type: "text", value: i }] : [];
    }
  });
}, $3 = () => (e) => {
  ut(e, "code", (t) => {
    var n, r;
    t.meta && (t.data = (n = t.data) != null ? n : {}, t.data.hProperties = { ...(r = t.data.hProperties) != null ? r : {}, metastring: t.meta });
  });
}, j3 = /^[ \t]*<[\w!/?-]/, Y3 = /(^|\n)[ \t]{4,}(?=<[\w!/?-])/g, Td = (e) => typeof e != "string" || e.length === 0 || !j3.test(e) ? e : e.replace(Y3, "$1"), Hu, Uu, zu, $u, Ar = { ...Yt, clobberPrefix: "", protocols: { ...Yt.protocols, href: [...(Uu = (Hu = Yt.protocols) == null ? void 0 : Hu.href) != null ? Uu : [], "tel", "streamdown"] }, attributes: { ...Yt.attributes, code: [...($u = (zu = Yt.attributes) == null ? void 0 : zu.code) != null ? $u : [], "metastring"] } }, Br = { raw: Di, sanitize: [Qo, Ar], harden: [Dd, { allowedImagePrefixes: ["*"], allowedLinkPrefixes: ["*"], allowedProtocols: ["*"], defaultOrigin: void 0, allowDataImages: !0 }] }, kd = { gfm: [Jg, {}], codeMeta: $3 }, ju = Object.values(Br), q3 = Object.values(kd), V3 = { block: " ▋", circle: " ●" }, xd = ["github-light", "github-dark"], yd = { enabled: !0 }, W3 = { codeBlockMaxHeight: 400, shikiTheme: xd, controls: !0, isAnimating: !1, lineNumbers: !0, mode: "streaming", mermaid: void 0, linkSafety: yd, tableMaxHeight: 300 }, De = en(W3), Qa = pe(({ content: e, shouldParseIncompleteMarkdown: t, shouldNormalizeHtmlIndentation: n, index: r, isIncomplete: i, dir: a, animatePlugin: s, ...u }) => {
  qu(() => {
    s?.commit();
  });
  let o = typeof e == "string" && n ? Td(e) : e, c = A(fd, { ...u, children: o });
  return A(wc.Provider, { value: i, children: a ? A("div", { dir: a, style: { display: "contents" }, children: c }) : c });
}, (e, t) => {
  if (e.content !== t.content || e.shouldNormalizeHtmlIndentation !== t.shouldNormalizeHtmlIndentation || e.index !== t.index || e.isIncomplete !== t.isIncomplete || e.dir !== t.dir) return !1;
  if (e.components !== t.components) {
    let n = Object.keys(e.components || {}), r = Object.keys(t.components || {});
    if (n.length !== r.length || n.some((i) => {
      var a, s;
      return ((a = e.components) == null ? void 0 : a[i]) !== ((s = t.components) == null ? void 0 : s[i]);
    })) return !1;
  }
  return !(e.rehypePlugins !== t.rehypePlugins || e.remarkPlugins !== t.remarkPlugins || !!e.animatePlugin != !!t.animatePlugin);
});
Qa.displayName = "Block";
var Ad = pe(({ children: e, mode: t = "streaming", dir: n, parseIncompleteMarkdown: r = !0, normalizeHtmlIndentation: i = !1, components: a, rehypePlugins: s = ju, remarkPlugins: u = q3, className: o, shikiTheme: c, mermaid: d, codeBlockMaxHeight: h = 400, controls: p = !0, isAnimating: f = !1, tableMaxHeight: g = 300, animated: y, BlockComponent: C = Qa, parseMarkdownIntoBlocksFn: k = md, caret: I, plugins: _, remend: v, linkSafety: M = yd, lineNumbers: S = !0, allowedTags: B, literalTagContent: O, translations: j, icons: w, prefix: z, onAnimationStart: $, onAnimationEnd: X, ...V }) => {
  let H = Cd(), G = ye(() => Cx(z), [z]), W = ke(null), le = ke($), Ne = ke(X);
  le.current = $, Ne.current = X, Me(() => {
    var K, ce, Ue;
    if (t === "static") return;
    let et = W.current;
    if (W.current = f, et === null) {
      f && ((K = le.current) == null || K.call(le));
      return;
    }
    f && !et ? (ce = le.current) == null || ce.call(le) : !f && et && ((Ue = Ne.current) == null || Ue.call(Ne));
  }, [f, t]);
  let E = ye(() => B ? Object.keys(B) : [], [B]), Le = ye(() => {
    if (typeof e != "string") return "";
    let K = t === "streaming" && r ? gE(e, v) : e;
    return O && O.length > 0 && (K = F3(K, O)), E.length > 0 && (K = M3(K, E)), K;
  }, [e, t, r, v, E, O]), xe = ye(() => k(Le), [Le, k]), x = ye(() => n === "auto" ? xe.map(Ga) : void 0, [xe, n]), Pe = ye(() => xe.map((K, ce) => `${H}-${ce}`), [xe.length, H]), de = ye(() => y === !0 ? "true" : y ? JSON.stringify(y) : "", [y]), J = ke(null), ve = ke([]), Se = ke([]), he = ke(null), Qe = ke("");
  if (de) {
    if (Qe.current !== de) {
      Qe.current = de;
      let K = de !== "true" ? y.maxBacklogMs : void 0;
      J.current = Iu({ maxBacklogMs: K }), ve.current = [], Se.current = [];
    } else J.current || (J.current = Iu());
    f && J.current && J.current.beginPass(J.current.now());
  } else J.current = null, ve.current = [], Se.current = [], Qe.current = "";
  qu(() => {
    var K;
    f && ((K = J.current) == null || K.commitPass());
  });
  let Je = ye(() => {
    var K, ce;
    return { codeBlockMaxHeight: h, shikiTheme: (ce = c ?? ((K = _?.code) == null ? void 0 : K.getThemes())) != null ? ce : xd, controls: p, isAnimating: f, lineNumbers: S, mode: t, mermaid: d, linkSafety: M, tableMaxHeight: g };
  }, [h, c, p, f, S, t, d, M, _?.code, g]), Ct = ye(() => j ? JSON.stringify(j) : "", [j]), It = ye(() => ({ ...va, ...j }), [Ct]), Et = ye(() => {
    let { inlineCode: K, ...ce } = a ?? {}, Ue = { ...l3, ...ce };
    if (K) {
      let et = Ue.code;
      Ue.code = (St) => "data-block" in St ? et ? Ka(et, St) : null : Ka(K, St);
    }
    return Ue;
  }, [a]), yn = ye(() => {
    let K = [];
    return _ != null && _.cjk && (K = [...K, ..._.cjk.remarkPluginsBefore]), K = [...K, ...u], _ != null && _.cjk && (K = [...K, ..._.cjk.remarkPluginsAfter]), _ != null && _.math && (K = [...K, _.math.remarkPlugin]), K;
  }, [u, _?.math, _?.cjk]), Nt = ye(() => {
    var K;
    let ce = s;
    if (B && Object.keys(B).length > 0 && s === ju) {
      let Ue = { ...Ar, tagNames: [...(K = Ar.tagNames) != null ? K : [], ...Object.keys(B)], attributes: { ...Ar.attributes, ...B } };
      ce = [Br.raw, [Qo, Ue], Br.harden];
    }
    return O && O.length > 0 && (ce = [...ce, [z3, O]]), _ != null && _.math && (ce = [...ce, _.math.rehypePlugin]), n === "auto" && t === "static" && (ce = [...ce, U3]), ce;
  }, [s, _?.math, B, O, n, t]), un = ye(() => {
    if (!f || xe.length === 0) return !1;
    let K = xe.at(-1);
    return Ru(K) || p3(K);
  }, [f, xe]), ei = ye(() => I && f && !un ? { "--streamdown-caret": `"${V3[I]}"` } : void 0, [I, f, un]), ur = (K) => {
    let ce = null;
    if (J.current && f) {
      if (!ve.current[K]) {
        let et = de && de !== "true" ? y : {}, { maxBacklogMs: St, ...An } = et;
        ve.current[K] = Ma({ ...An, timeline: J.current });
      }
      ce = ve.current[K];
    }
    he.current !== Nt && (Se.current = [], he.current = Nt), ce && !Se.current[K] && (Se.current[K] = [...Nt, ce.rehypePlugin]);
    let Ue = ce && Se.current[K] ? Se.current[K] : Nt;
    return { blockAnimatePlugin: ce, blockRehypePlugins: Ue };
  };
  return t === "static" ? A(Wi.Provider, { value: It, children: A(Qi.Provider, { value: _ ?? null, children: A(De.Provider, { value: Je, children: A(Su, { icons: w, children: A(Vi.Provider, { value: G, children: A("div", { className: G("space-y-4 whitespace-normal [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", o), dir: n === "auto" ? void 0 : n, children: A(fd, { components: Et, rehypePlugins: Nt, remarkPlugins: yn, ...V, children: Le }) }) }) }) }) }) }) : A(Wi.Provider, { value: It, children: A(Qi.Provider, { value: _ ?? null, children: A(De.Provider, { value: Je, children: A(Su, { icons: w, children: A(Vi.Provider, { value: G, children: re("div", { className: G("space-y-4 whitespace-normal [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", I && !un ? "[&>*:last-child]:after:inline [&>*:last-child]:after:align-baseline [&>*:last-child]:after:content-[var(--streamdown-caret)]" : null, o), style: ei, children: [xe.length === 0 && I && f && A("span", {}), xe.map((K, ce) => {
    var Ue;
    let et = ce === xe.length - 1, St = f && et && Ru(K), { blockAnimatePlugin: An, blockRehypePlugins: R } = ur(ce);
    return A(C, { animatePlugin: An, components: Et, content: K, dir: (Ue = x?.[ce]) != null ? Ue : n !== "auto" ? n : void 0, index: ce, isIncomplete: St, rehypePlugins: R, remarkPlugins: yn, shouldNormalizeHtmlIndentation: i, shouldParseIncompleteMarkdown: r, ...V }, Pe[ce]);
  })] }) }) }) }) }) });
}, (e, t) => e.children === t.children && e.shikiTheme === t.shikiTheme && e.isAnimating === t.isAnimating && e.animated === t.animated && e.mode === t.mode && e.plugins === t.plugins && e.className === t.className && e.linkSafety === t.linkSafety && e.lineNumbers === t.lineNumbers && e.codeBlockMaxHeight === t.codeBlockMaxHeight && e.tableMaxHeight === t.tableMaxHeight && e.normalizeHtmlIndentation === t.normalizeHtmlIndentation && e.literalTagContent === t.literalTagContent && JSON.stringify(e.translations) === JSON.stringify(t.translations) && e.prefix === t.prefix && e.dir === t.dir);
Ad.displayName = "Streamdown";
var G3 = ({ children: e, className: t, minZoom: n = 0.5, maxZoom: r = 3, zoomStep: i = 0.1, showControls: a = !0, initialZoom: s = 1, fullscreen: u = !1 }) => {
  let { RotateCcwIcon: o, ZoomInIcon: c, ZoomOutIcon: d } = lt(), h = ie(), p = bt(), f = ke(null), g = ke(null), [y, C] = Ae(s), [k, I] = Ae({ x: 0, y: 0 }), [_, v] = Ae(!1), [M, S] = Ae({ x: 0, y: 0 }), [B, O] = Ae({ x: 0, y: 0 }), j = $e((W) => {
    C((le) => Math.max(n, Math.min(r, le + W)));
  }, [n, r]), w = $e(() => {
    j(i);
  }, [j, i]), z = $e(() => {
    j(-i);
  }, [j, i]), $ = $e(() => {
    C(s), I({ x: 0, y: 0 });
  }, [s]), X = $e((W) => {
    W.preventDefault();
    let le = W.deltaY > 0 ? -i : i;
    j(le);
  }, [j, i]), V = $e((W) => {
    if (W.button !== 0 || W.isPrimary === !1) return;
    v(!0), S({ x: W.clientX, y: W.clientY }), O(k);
    let le = W.currentTarget;
    le instanceof HTMLElement && le.setPointerCapture(W.pointerId);
  }, [k]), H = $e((W) => {
    if (!_) return;
    W.preventDefault();
    let le = W.clientX - M.x, Ne = W.clientY - M.y;
    I({ x: B.x + le, y: B.y + Ne });
  }, [_, M, B]), G = $e((W) => {
    v(!1);
    let le = W.currentTarget;
    le instanceof HTMLElement && le.releasePointerCapture(W.pointerId);
  }, []);
  return Me(() => {
    let W = f.current;
    if (W) return W.addEventListener("wheel", X, { passive: !1 }), () => {
      W.removeEventListener("wheel", X);
    };
  }, [X]), Me(() => {
    let W = g.current;
    if (W && _) return document.body.style.userSelect = "none", W.addEventListener("pointermove", H, { passive: !1 }), W.addEventListener("pointerup", G), W.addEventListener("pointercancel", G), () => {
      document.body.style.userSelect = "", W.removeEventListener("pointermove", H), W.removeEventListener("pointerup", G), W.removeEventListener("pointercancel", G);
    };
  }, [_, H, G]), re("div", { className: h("relative flex flex-col", u ? "h-full w-full" : "min-h-28 w-full", t), ref: f, style: { cursor: _ ? "grabbing" : "grab" }, children: [a ? re("div", { className: h("absolute z-10 flex flex-col gap-1 rounded-md border border-border bg-background/80 p-1 supports-[backdrop-filter]:bg-background/70 supports-[backdrop-filter]:backdrop-blur-sm", u ? "bottom-4 left-4" : "bottom-2 left-2"), children: [A("button", { "aria-label": p.zoomIn, className: h("flex items-center justify-center rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"), disabled: y >= r, onClick: w, title: p.zoomIn, type: "button", children: A(c, { "aria-hidden": "true", size: 16 }) }), A("button", { "aria-label": p.zoomOut, className: h("flex items-center justify-center rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"), disabled: y <= n, onClick: z, title: p.zoomOut, type: "button", children: A(d, { "aria-hidden": "true", size: 16 }) }), A("button", { "aria-label": p.resetView, className: h("flex items-center justify-center rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"), onClick: $, title: p.resetView, type: "button", children: A(o, { "aria-hidden": "true", size: 16 }) })] }) : null, A("div", { className: h("flex-1 origin-center transition-transform duration-150 ease-out", u ? "flex h-full w-full items-center justify-center" : "flex w-full items-center justify-center"), onPointerDown: V, ref: g, role: "application", style: { transform: `translate(${k.x}px, ${k.y}px) scale(${y})`, transformOrigin: "center center", touchAction: "none", willChange: "transform" }, children: e })] });
}, _d = ({ chart: e, className: t, config: n, fullscreen: r = !1, showControls: i = !0 }) => {
  let a = ie(), [s, u] = Ae(null), [o, c] = Ae(!1), [d, h] = Ae(""), [p, f] = Ae(""), [g, y] = Ae(0), { mermaid: C } = Ce(De), k = za(), I = C?.errorComponent, { shouldRender: _, containerRef: v } = lx({ immediate: r });
  if (Me(() => {
    if (_) {
      if (!k) {
        u("Mermaid plugin not available. Please add the mermaid plugin to enable diagram rendering.");
        return;
      }
      (async () => {
        try {
          u(null), c(!0);
          let S = k.getMermaid(n), B = e.split("").reduce((w, z) => (w << 5) - w + z.charCodeAt(0) | 0, 0), O = `mermaid-${Math.abs(B)}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, { svg: j } = await S.render(O, e);
          h(j), f(j);
        } catch (S) {
          if (!(p || d)) {
            let B = S instanceof Error ? S.message : "Failed to render Mermaid chart";
            u(B);
          }
        } finally {
          c(!1);
        }
      })();
    }
  }, [e, n, g, _, k]), !(_ || d || p)) return A("div", { className: a("my-4 min-h-[200px]", t), ref: v });
  if (o && !d && !p) return A("div", { className: a("my-4 flex justify-center p-4", t), ref: v, children: re("div", { className: a("flex items-center space-x-2 text-muted-foreground"), children: [A("div", { className: a("h-4 w-4 animate-spin rounded-full border-current border-b-2") }), A("span", { className: a("text-sm"), children: "Loading diagram..." })] }) });
  if (s && !d && !p)
    return I ? A("div", { ref: v, children: A(I, { chart: e, error: s, retry: () => y((B) => B + 1) }) }) : re("div", { className: a("rounded-md bg-red-50 p-4", t), ref: v, children: [re("p", { className: a("font-mono text-red-700 text-sm"), children: ["Mermaid Error: ", s] }), re("details", { className: a("mt-2"), children: [A("summary", { className: a("cursor-pointer text-red-600 text-xs"), children: "Show Code" }), A("pre", { className: a("mt-2 overflow-x-auto rounded bg-red-100 p-2 text-red-800 text-xs"), children: e })] })] });
  let M = d || p;
  return A("div", { className: a("size-full", t), "data-streamdown": "mermaid", ref: v, children: A(G3, { className: a(r ? "size-full overflow-hidden" : "overflow-hidden", t), fullscreen: r, maxZoom: 3, minZoom: 0.5, showControls: i, zoomStep: 0.1, children: A("div", { "aria-label": "Mermaid chart", className: a("flex justify-center", r ? "size-full items-center" : null), dangerouslySetInnerHTML: { __html: M }, role: "img" }) }) });
};
const J3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Block: Qa,
  CodeBlock: Bc,
  CodeBlockContainer: Dc,
  CodeBlockCopyButton: Mr,
  CodeBlockDownloadButton: Hc,
  CodeBlockHeader: vc,
  CodeBlockSkeleton: Gi,
  Streamdown: Ad,
  StreamdownContext: De,
  TableCopyDropdown: qa,
  TableDownloadDropdown: Va,
  createAnimatePlugin: Ma,
  defaultRehypePlugins: Br,
  defaultRemarkPlugins: kd,
  defaultTranslations: va,
  defaultUrlTransform: pd,
  detectTextDirection: Ga,
  escapeMarkdownTableCell: yr,
  extractTableDataFromElement: $a,
  normalizeHtmlIndentation: Td,
  parseMarkdownIntoBlocks: md,
  tableDataToCSV: ja,
  tableDataToMarkdown: Ya,
  tableDataToTSV: $c,
  useIsCodeFenceIncomplete: Lc
}, Symbol.toStringTag, { value: "Module" })), Q3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Mermaid: _d
}, Symbol.toStringTag, { value: "Module" }));
export {
  Z3 as E,
  De as S,
  Lx as c,
  J3 as i,
  A as j
};

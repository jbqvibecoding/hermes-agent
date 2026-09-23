const ct = globalThis.__HERMES_PLUGIN_SDK__, e = ct?.React;
if (!e)
  throw new Error(
    "hermes-crew: the dashboard plugin SDK is not on the page, so there is no React to borrow."
  );
const {
  Children: lt,
  Fragment: dt,
  Profiler: ut,
  StrictMode: mt,
  Suspense: Ae,
  cloneElement: pt,
  createContext: ft,
  createElement: Se,
  createRef: ht,
  forwardRef: Oe,
  isValidElement: gt,
  lazy: Re,
  memo: yt,
  startTransition: vt,
  use: wt,
  useActionState: Et,
  useCallback: we,
  useContext: bt,
  useDebugValue: kt,
  useDeferredValue: St,
  useEffect: U,
  useId: Nt,
  useImperativeHandle: Ct,
  useInsertionEffect: Mt,
  useLayoutEffect: xe,
  useMemo: me,
  useOptimistic: Tt,
  useReducer: _t,
  useRef: q,
  useState: S,
  useSyncExternalStore: At,
  useTransition: Ot,
  version: Rt
} = e, xt = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Children: lt,
  Fragment: dt,
  Profiler: ut,
  StrictMode: mt,
  Suspense: Ae,
  cloneElement: pt,
  createContext: ft,
  createElement: Se,
  createRef: ht,
  default: e,
  forwardRef: Oe,
  isValidElement: gt,
  lazy: Re,
  memo: yt,
  startTransition: vt,
  use: wt,
  useActionState: Et,
  useCallback: we,
  useContext: bt,
  useDebugValue: kt,
  useDeferredValue: St,
  useEffect: U,
  useId: Nt,
  useImperativeHandle: Ct,
  useInsertionEffect: Mt,
  useLayoutEffect: xe,
  useMemo: me,
  useOptimistic: Tt,
  useReducer: _t,
  useRef: q,
  useState: S,
  useSyncExternalStore: At,
  useTransition: Ot,
  version: Rt
}, Symbol.toStringTag, { value: "Module" }));
class ge extends Error {
  constructor(n, r, c = !1) {
    super(r), this.code = n, this.retryable = c, this.name = "CrewError";
  }
  code;
  retryable;
}
function We(t) {
  return !t || t.role !== "agent" ? "" : t.parts.filter((n) => n.type === "text").map((n) => n.text).join("").trim();
}
function be(t) {
  return We(
    [...t].reverse().find((n) => n.role === "agent" && !n.streaming)
  );
}
function Le(t) {
  return t.parts.filter((n) => n.type === "text").map((n) => n.text).join("");
}
const Pe = 6e4, It = 3e4, Ne = "optimistic-user:", ve = "optimistic-agent:";
function Dt(t, n = {}) {
  const { enabled: r = !0, notify: c } = n, [f, E] = S([]), [u, M] = S(""), [d, s] = S(""), [k, i] = S([]), [a, p] = S([]), [h, m] = S([]), [O, A] = S([]), [R, $] = S(), [G, v] = S("connecting"), [D, V] = S([]), [ee, J] = S(r), [le, F] = S(), [X, j] = S(() => /* @__PURE__ */ new Set()), [ne, re] = S(""), [oe, fe] = S(0), H = q(/* @__PURE__ */ new Map()), K = q(u), Q = q(/* @__PURE__ */ new Set()), z = q(/* @__PURE__ */ new Map()), Y = q(c), ue = me(
    () => f.find((b) => b.id === u),
    [f, u]
  ), ie = d || (u ? `dm:${u}` : ""), x = !!(u && !X.has(u));
  U(() => {
    K.current = u;
  }, [u]), U(() => {
    Y.current = c;
  }, [c]);
  const I = we(async (b = !1) => {
    const N = await t.listAgents();
    for (const l of Q.current)
      N.some((w) => w.id === l) || Q.current.delete(l);
    const P = N.filter((l) => !Q.current.has(l.id)), y = K.current, C = P.find((l) => l.id === y), g = H.current.get(y);
    C?.lastMessagePreview && g && !g.messages.some((l) => l.streaming) && be(g.messages) !== C.lastMessagePreview && (H.current.set(y, { ...g, cachedAt: 0 }), fe((w) => w + 1));
    const o = !!g?.messages.some((l) => l.streaming);
    return E((l) => P.map((w) => {
      const T = l.find((ce) => ce.id === w.id), _ = be(H.current.get(w.id)?.messages ?? []), W = !!_ || w.id === y && o;
      return {
        ...w,
        lastMessagePreview: W ? _ || T?.lastMessagePreview : w.lastMessagePreview ?? T?.lastMessagePreview
      };
    })), M((l) => l && P.some((w) => w.id === l) || b ? l : P[0]?.id || ""), P;
  }, [t]), B = we(async () => {
    const b = await t.listModelProviders();
    return V(b.providers), b.providers;
  }, [t]);
  return U(() => {
    if (!r) {
      E([]), V([]), M(""), s(""), p([]), m([]), A([]), $(void 0), v("disconnected"), J(!1), F(void 0);
      return;
    }
    let b = !0;
    return J(!0), Promise.all([I(), B()]).then(() => {
      b && (v("connected"), J(!1));
    }).catch((N) => {
      b && (v("error"), F(N instanceof Error ? N.message : "Could not load the crew"), J(!1));
    }), () => {
      b = !1;
    };
  }, [r, I, B]), U(() => {
    if (!r) return;
    const b = () => {
      document.visibilityState === "hidden" || !navigator.onLine || I().catch(() => {
      });
    }, N = () => {
      document.visibilityState === "visible" && b();
    }, P = window.setInterval(b, It);
    return window.addEventListener("focus", b), window.addEventListener("online", b), document.addEventListener("visibilitychange", N), () => {
      window.clearInterval(P), window.removeEventListener("focus", b), window.removeEventListener("online", b), document.removeEventListener("visibilitychange", N);
    };
  }, [r, I]), U(() => {
    s("");
  }, [u]), U(() => {
    if (!r) return;
    const b = H.current.get(u);
    if (b ? (p(b.messages), m(b.activities), A(b.approvals), $(b.computer), i(b.conversations)) : (p([]), m([]), A([]), $(void 0), i([])), re(""), !u) return;
    const N = b ? Date.now() - b.cachedAt : Number.POSITIVE_INFINITY;
    if (b && N < Pe && !d) {
      b.messages.some((g) => g.streaming) && re(u);
      const C = window.setTimeout(() => fe((g) => g + 1), Pe - N);
      return () => window.clearTimeout(C);
    }
    const P = new AbortController();
    let y = !0;
    return Promise.all([
      t.listConversations(u, P.signal),
      t.listApprovalRequests(u, P.signal),
      t.getComputer(u, P.signal)
    ]).then(async ([C, g, o]) => {
      const l = d ? C.find((Z) => Z.id === d) ?? C[0] : C[0], w = l ? await t.getConversation(l.id, P.signal) : void 0;
      if (!y || Q.current.has(u)) return;
      const T = H.current.get(u)?.messages ?? [], _ = (w?.messages ?? []).map((Z) => {
        const de = z.current.get(Z.id);
        return de ? { ...Z, id: de } : Z;
      }), W = T.filter(
        (Z) => Z.id.startsWith(Ne) || Z.id.startsWith(ve)
      ), ce = [
        ..._,
        ...W.filter((Z) => !_.some((de) => de.id === Z.id))
      ], te = be(ce), pe = w?.activities ?? [];
      H.current.set(u, {
        messages: ce,
        activities: pe,
        approvals: g,
        conversations: C,
        computer: o,
        cachedAt: Date.now()
      }), j((Z) => new Set(Z).add(u)), p(ce), m(pe), A(g), $(o), i(C), re(u), te && E((Z) => Z.map((de) => de.id === u ? { ...de, lastMessagePreview: te } : de));
    }).catch((C) => {
      !y || Q.current.has(u) || C instanceof DOMException && C.name === "AbortError" || (H.current.set(u, {
        messages: [],
        activities: [],
        approvals: [],
        conversations: [],
        cachedAt: Date.now()
      }), j((g) => new Set(g).add(u)), p([]), F(C instanceof Error ? C.message : "Could not load this teammate"));
    }), () => {
      y = !1, P.abort();
    };
  }, [t, r, oe, u, d]), U(() => {
    if (!r || !u || R?.status === "online") return;
    let b = !0;
    const N = async () => {
      try {
        const y = await t.getComputer(u);
        if (!b || K.current !== u) return;
        $(y);
        const C = H.current.get(u);
        C && H.current.set(u, { ...C, computer: y });
      } catch {
      }
    }, P = window.setInterval(() => {
      N();
    }, 2e3);
    return N(), () => {
      b = !1, window.clearInterval(P);
    };
  }, [t, R?.status, r, u]), U(() => {
    if (!r || !ie || ne !== u) return;
    let b = !0;
    const N = u, P = (g) => {
      const o = H.current.get(N);
      H.current.set(N, {
        messages: o?.messages ?? [],
        activities: o?.activities ?? [],
        approvals: o?.approvals ?? [],
        conversations: o?.conversations ?? [],
        computer: o?.computer,
        cachedAt: Date.now(),
        ...g
      });
    }, y = (g) => p((o) => {
      const l = g(o);
      return P({ messages: l }), l;
    }), C = t.subscribeToConversationEvents(ie, (g) => {
      if (b) {
        if (g.type === "message.created" && y((o) => {
          let l = g.message;
          const w = z.current.get(g.message.id);
          if (w && (l = { ...g.message, id: w }), g.message.role === "user" && !w) {
            const _ = new Set(z.current.values()), W = o.find((ce) => ce.id.startsWith(Ne) && !_.has(ce.id) && Le(ce) === Le(g.message));
            W && (z.current.set(g.message.id, W.id), l = { ...g.message, id: W.id });
          }
          if (g.message.role === "agent" && !w) {
            const _ = new Set(z.current.values()), W = o.find((ce) => ce.id.startsWith(ve) && !_.has(ce.id));
            W && (z.current.set(g.message.id, W.id), l = { ...g.message, id: W.id });
          }
          return o.find((_) => _.id === l.id) ? o.map((_) => _.id === l.id ? l : _) : [...o, l];
        }), g.type === "message.delta" && y((o) => {
          let l = z.current.get(g.messageId);
          if (!l) {
            const w = new Set(z.current.values()), T = o.find((_) => _.id.startsWith(ve) && !w.has(_.id));
            T && (l = T.id, z.current.set(g.messageId, l));
          }
          return l ??= g.messageId, o.some((w) => w.id === l) ? o.map((w) => w.id === l ? {
            ...w,
            parts: w.parts.map((T, _) => _ === 0 && T.type === "text" ? { ...T, text: T.text + g.delta } : T)
          } : w) : [...o, {
            id: l,
            conversationId: ie,
            role: "agent",
            parts: [{ type: "text", text: g.delta }],
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            streaming: !0
          }];
        }), g.type === "message.completed") {
          const o = z.current.get(g.messageId) ?? g.messageId;
          g.notify === !1 ? y((l) => l.flatMap((w) => w.id !== o ? [w] : w.id.startsWith(ve) ? [{
            ...w,
            parts: w.parts.map((T) => T.type === "text" ? { ...T, text: "" } : T),
            streaming: !0
          }] : [])) : (y((l) => {
            const w = l.filter((_) => _.id === o || _.role !== "agent" || !_.streaming).map((_) => _.id === o ? { ..._, streaming: !1 } : _), T = be(w);
            return T && E((_) => _.map((W) => W.id === N ? { ...W, lastMessagePreview: T } : W)), w;
          }), Y.current?.({
            title: `${ue?.name ?? "Your teammate"} finished`,
            body: "There is something new to read."
          }));
        }
        if (g.type === "message.dropped") {
          const o = z.current.get(g.messageId) ?? g.messageId;
          y((l) => l.filter((w) => w.id !== o));
        }
        g.type === "message.updated" && (y((o) => {
          const l = z.current.get(g.message.id), w = l ? { ...g.message, id: l } : g.message, T = o.find((W) => W.id === w.id), _ = g.message.role === "agent" && !g.message.streaming ? o.filter((W) => W.id === w.id || W.role !== "agent" || !W.streaming) : o;
          return T ? _.map((W) => W.id === w.id ? w : W) : [..._, w];
        }), g.message.role === "agent" && !g.message.streaming && E((o) => o.map((l) => l.id === N ? { ...l, lastMessagePreview: We(g.message) || void 0 } : l))), g.type === "approval.updated" && (A((o) => {
          const l = o.some((w) => w.id === g.approval.id) ? o.map((w) => w.id === g.approval.id ? g.approval : w) : [g.approval, ...o];
          return P({ approvals: l }), l;
        }), g.approval.status === "pending" && Y.current?.({
          title: `${ue?.name ?? "Your teammate"} needs you`,
          body: g.approval.title
        })), g.type === "activity.updated" && m((o) => {
          const l = o.some((w) => w.id === g.activity.id) ? o.map((w) => w.id === g.activity.id ? g.activity : w) : [...o, g.activity];
          return P({ activities: l }), l;
        }), g.type === "agent.status" && E((o) => o.map((l) => l.id === g.agentId ? { ...l, status: g.status } : l)), g.type === "connection.changed" && v(g.state);
      }
    });
    return () => {
      b = !1, C.unsubscribe();
    };
  }, [t, ie, r, ne, ue?.name, u]), {
    agents: f,
    conversations: k,
    modelProviders: D,
    selectedAgent: ue,
    selectedAgentId: u,
    setSelectedAgentId: M,
    selectedThreadId: ie,
    setSelectedThreadId: s,
    messages: a,
    activities: h,
    approvals: O,
    computer: R,
    connection: G,
    loading: ee,
    conversationLoading: x,
    error: le,
    refreshAgents: I,
    refreshModelProviders: B,
    dismissError: () => F(void 0),
    createAgent: async (b) => {
      const N = await t.createAgent(b);
      return await I(!0), M(N.id), N;
    },
    updateAgent: async (b, N) => {
      await t.updateAgent(b, N), await I(!0);
    },
    duplicateAgent: async (b) => {
      const N = await t.duplicateAgent(b);
      await I(!0), M(N.id);
    },
    deleteAgent: async (b) => {
      const N = f.find((o) => o.id === b), P = u;
      if (!N || Q.current.has(b)) return;
      const y = f.findIndex((o) => o.id === b), C = f.filter((o) => o.id !== b), g = P === b ? C[Math.min(Math.max(y, 0), Math.max(C.length - 1, 0))]?.id ?? "" : P;
      Q.current.add(b), E(C), M(g);
      try {
        try {
          await t.deleteAgent(b);
        } catch (o) {
          if (!(o instanceof ge && o.code === "not_found")) throw o;
        }
        H.current.delete(b), j((o) => {
          const l = new Set(o);
          return l.delete(b), l;
        }), await I();
      } catch (o) {
        throw Q.current.delete(b), E((l) => {
          if (l.some((T) => T.id === b)) return l;
          const w = [...l];
          return w.splice(Math.min(y, w.length), 0, N), w;
        }), M((l) => l || (P === b ? b : l)), F(o instanceof Error ? o.message : "Could not remove this teammate"), o;
      }
    },
    sendMessage: async (b) => {
      if (!ie || !u) return;
      const N = u, P = ie, y = `${Date.now()}:${Math.random().toString(36).slice(2)}`, C = `${Ne}${y}`, g = `${ve}${y}`, o = (/* @__PURE__ */ new Date()).toISOString(), l = {
        id: C,
        conversationId: P,
        role: "user",
        parts: [{ type: "text", text: b }],
        createdAt: o
      }, w = {
        id: g,
        conversationId: P,
        role: "agent",
        parts: [{ type: "text", text: "" }],
        createdAt: o,
        streaming: !0
      }, T = H.current.get(N) ?? {
        messages: [],
        activities: [],
        approvals: [],
        conversations: [],
        cachedAt: Date.now()
      }, _ = [...T.messages].reverse().find((te) => te.role === "agent" && te.streaming), ce = [..._ ? T.messages.map((te) => te.id === _.id ? { ...te, streaming: !1, interrupted: !0 } : te) : T.messages, l, w];
      K.current === N && m([]), H.current.set(N, { ...T, messages: ce, activities: [], cachedAt: Date.now() }), K.current === N && (p(ce), re(N));
      try {
        const te = await t.sendMessage({ conversationId: P, text: b });
        z.current.set(te.id, C);
        const pe = te.id.match(/^(.+):user(?:$|:)/)?.[1];
        pe && (z.current.set(`${pe}:user`, C), z.current.set(`${pe}:agent`, _?.id ?? g));
        const Z = H.current.get(N) ?? T, de = { ...te, id: C }, he = Z.messages.map((Ee) => Ee.id === C ? de : Ee).filter((Ee, st, ot) => ot.findIndex((it) => it.id === Ee.id) === st);
        H.current.set(N, { ...Z, messages: he, cachedAt: Date.now() }), K.current === N && p(he);
      } catch (te) {
        const pe = H.current.get(N) ?? T, Z = pe.messages.filter((he) => he.id !== g), de = Z.some((he) => he.id === C) ? Z : [...Z, l];
        throw H.current.set(N, { ...pe, messages: de, cachedAt: Date.now() }), K.current === N && p(de), _ || F(te instanceof Error ? te.message : "Could not send that"), te;
      }
    },
    respondToApproval: async (b, N, P, y) => {
      const C = u, g = await t.respondToApproval({ requestId: b, decision: N, note: P, contentHash: y }), o = H.current.get(C), l = (o?.approvals ?? []).map((w) => w.id === g.id ? g : w);
      o && H.current.set(C, { ...o, approvals: l, cachedAt: Date.now() }), K.current === C && A(l);
    },
    openComputer: async (b) => {
      if (!u) throw new Error("No teammate is selected");
      try {
        return await (b === "open" ? t.openComputer(u) : t.takeOverComputer(u));
      } catch (N) {
        throw F(N instanceof Error ? N.message : "Could not open that computer"), N;
      }
    },
    reconnect: async () => {
      v("connecting");
      try {
        await t.reconnect(), await I(), v("connected");
      } catch (b) {
        v("error"), F(b instanceof Error ? b.message : "Reconnect failed");
      }
    }
  };
}
const Lt = (t) => t.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), Ge = (...t) => t.filter((n, r, c) => !!n && n.trim() !== "" && c.indexOf(n) === r).join(" ").trim();
var Pt = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};
const $t = Oe(
  ({
    color: t = "currentColor",
    size: n = 24,
    strokeWidth: r = 2,
    absoluteStrokeWidth: c,
    className: f = "",
    children: E,
    iconNode: u,
    ...M
  }, d) => Se(
    "svg",
    {
      ref: d,
      ...Pt,
      width: n,
      height: n,
      stroke: t,
      strokeWidth: c ? Number(r) * 24 / Number(n) : r,
      className: Ge("lucide", f),
      ...M
    },
    [
      ...u.map(([s, k]) => Se(s, k)),
      ...Array.isArray(E) ? E : [E]
    ]
  )
);
const L = (t, n) => {
  const r = Oe(
    ({ className: c, ...f }, E) => Se($t, {
      ref: E,
      iconNode: n,
      className: Ge(`lucide-${Lt(t)}`, c),
      ...f
    })
  );
  return r.displayName = `${t}`, r;
};
const zt = L("ArrowDown", [
  ["path", { d: "M12 5v14", key: "s699le" }],
  ["path", { d: "m19 12-7 7-7-7", key: "1idqje" }]
]);
const Ut = L("Ban", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m4.9 4.9 14.2 14.2", key: "1m5liu" }]
]);
const Ht = L("Bot", [
  ["path", { d: "M12 8V4H8", key: "hb8ula" }],
  ["rect", { width: "16", height: "12", x: "4", y: "8", rx: "2", key: "enze0r" }],
  ["path", { d: "M2 14h2", key: "vft8re" }],
  ["path", { d: "M20 14h2", key: "4cs60a" }],
  ["path", { d: "M15 13v2", key: "1xurst" }],
  ["path", { d: "M9 13v2", key: "rq6x2g" }]
]);
const Ie = L("Check", [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]]);
const jt = L("ChevronDown", [
  ["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]
]);
const Me = L("ChevronRight", [
  ["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]
]);
const qt = L("ChevronsRight", [
  ["path", { d: "m6 17 5-5-5-5", key: "xnjwq" }],
  ["path", { d: "m13 17 5-5-5-5", key: "17xmmf" }]
]);
const Te = L("CircleCheck", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
]);
const Vt = L("CircleHelp", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3", key: "1u773s" }],
  ["path", { d: "M12 17h.01", key: "p32p05" }]
]);
const Ke = L("Clock", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["polyline", { points: "12 6 12 12 16 14", key: "68esgv" }]
]);
const _e = L("Cloud", [
  ["path", { d: "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z", key: "p7xjir" }]
]);
const Ft = L("Copy", [
  ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2", key: "17jyea" }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2", key: "zix9uf" }]
]);
const Bt = L("CornerDownRight", [
  ["polyline", { points: "15 10 20 15 15 20", key: "1q7qjw" }],
  ["path", { d: "M4 4v7a4 4 0 0 0 4 4h12", key: "z08zvw" }]
]);
const Wt = L("Earth", [
  ["path", { d: "M21.54 15H17a2 2 0 0 0-2 2v4.54", key: "1djwo0" }],
  [
    "path",
    {
      d: "M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17",
      key: "1tzkfa"
    }
  ],
  ["path", { d: "M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05", key: "14pb5j" }],
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }]
]);
const Gt = L("Ellipsis", [
  ["circle", { cx: "12", cy: "12", r: "1", key: "41hilf" }],
  ["circle", { cx: "19", cy: "12", r: "1", key: "1wjl8i" }],
  ["circle", { cx: "5", cy: "12", r: "1", key: "1pcz8c" }]
]);
const Kt = L("FileText", [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "M10 9H8", key: "b1mrlr" }],
  ["path", { d: "M16 13H8", key: "t4e002" }],
  ["path", { d: "M16 17H8", key: "z1uh3a" }]
]);
const $e = L("Hand", [
  ["path", { d: "M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2", key: "1fvzgz" }],
  ["path", { d: "M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2", key: "1kc0my" }],
  ["path", { d: "M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8", key: "10h0bg" }],
  [
    "path",
    {
      d: "M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15",
      key: "1s1gnw"
    }
  ]
]);
const Yt = L("KeyRound", [
  [
    "path",
    {
      d: "M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z",
      key: "1s6t7t"
    }
  ],
  ["circle", { cx: "16.5", cy: "7.5", r: ".5", fill: "currentColor", key: "w0ekpg" }]
]);
const De = L("LoaderCircle", [
  ["path", { d: "M21 12a9 9 0 1 1-6.219-8.56", key: "13zald" }]
]);
const Xt = L("Lock", [
  ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2", key: "1w4ew1" }],
  ["path", { d: "M7 11V7a5 5 0 0 1 10 0v4", key: "fwvmzm" }]
]);
const Jt = L("Maximize2", [
  ["polyline", { points: "15 3 21 3 21 9", key: "mznyad" }],
  ["polyline", { points: "9 21 3 21 3 15", key: "1avn1i" }],
  ["line", { x1: "21", x2: "14", y1: "3", y2: "10", key: "ota7mn" }],
  ["line", { x1: "3", x2: "10", y1: "21", y2: "14", key: "1atl0r" }]
]);
const Zt = L("Minimize2", [
  ["polyline", { points: "4 14 10 14 10 20", key: "11kfnr" }],
  ["polyline", { points: "20 10 14 10 14 4", key: "rlmsce" }],
  ["line", { x1: "14", x2: "21", y1: "10", y2: "3", key: "o5lafz" }],
  ["line", { x1: "3", x2: "10", y1: "21", y2: "14", key: "1atl0r" }]
]);
const Ye = L("Monitor", [
  ["rect", { width: "20", height: "14", x: "2", y: "3", rx: "2", key: "48i651" }],
  ["line", { x1: "8", x2: "16", y1: "21", y2: "21", key: "1svkeh" }],
  ["line", { x1: "12", x2: "12", y1: "17", y2: "21", key: "vw1qmm" }]
]);
const Qt = L("Pencil", [
  [
    "path",
    {
      d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
      key: "1a8usu"
    }
  ],
  ["path", { d: "m15 5 4 4", key: "1mk7zo" }]
]);
const Xe = L("Plus", [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "M12 5v14", key: "s699le" }]
]);
const en = L("RotateCcw", [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }]
]);
const Je = L("Search", [
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
  ["path", { d: "m21 21-4.3-4.3", key: "1qie3q" }]
]);
const ze = L("Settings2", [
  ["path", { d: "M20 7h-9", key: "3s1dr2" }],
  ["path", { d: "M14 17H5", key: "gfn3mx" }],
  ["circle", { cx: "17", cy: "17", r: "3", key: "18b49y" }],
  ["circle", { cx: "7", cy: "7", r: "3", key: "dfmy0x" }]
]);
const Ze = L("ShieldAlert", [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      key: "oel41y"
    }
  ],
  ["path", { d: "M12 8v4", key: "1got3b" }],
  ["path", { d: "M12 16h.01", key: "1drbdi" }]
]);
const tn = L("ShieldCheck", [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      key: "oel41y"
    }
  ],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
]);
const nn = L("ShieldX", [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      key: "oel41y"
    }
  ],
  ["path", { d: "m14.5 9.5-5 5", key: "17q4r4" }],
  ["path", { d: "m9.5 9.5 5 5", key: "18nt4w" }]
]);
const rn = L("Terminal", [
  ["polyline", { points: "4 17 10 11 4 5", key: "akl6gq" }],
  ["line", { x1: "12", x2: "20", y1: "19", y2: "19", key: "q2wloq" }]
]);
const Qe = L("Trash2", [
  ["path", { d: "M3 6h18", key: "d0wm0j" }],
  ["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", key: "4alrt4" }],
  ["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2", key: "v07s0e" }],
  ["line", { x1: "10", x2: "10", y1: "11", y2: "17", key: "1uufr5" }],
  ["line", { x1: "14", x2: "14", y1: "11", y2: "17", key: "xtxkd" }]
]);
const an = L("TriangleAlert", [
  [
    "path",
    {
      d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
      key: "wmoenq"
    }
  ],
  ["path", { d: "M12 9v4", key: "juzpu7" }],
  ["path", { d: "M12 17h.01", key: "p32p05" }]
]);
const sn = L("Users", [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }],
  ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }],
  ["path", { d: "M16 3.13a4 4 0 0 1 0 7.75", key: "1da9ce" }]
]);
function on(t) {
  let n = 0;
  for (let r = 0; r < t.length; r += 1) n = (n * 31 + t.charCodeAt(r)) % 360;
  return n;
}
function et({ agent: t, size: n = 36 }) {
  const r = on(t.id || t.name);
  return /* @__PURE__ */ e.createElement(
    "span",
    {
      className: "agent-avatar",
      role: "img",
      "aria-label": `${t.name} avatar`,
      style: {
        width: n,
        height: n,
        fontSize: Math.round(n * 0.52),
        background: `hsl(${r} 62% 46% / 0.16)`,
        color: `hsl(${r} 62% 46%)`
      }
    },
    t.avatar || t.name.trim().slice(0, 1).toUpperCase()
  );
}
const cn = Re(async () => ({ default: (await import("./chunk-mermaid-HWGCJPDP-CrqSIQim.js").then((t) => t.i)).Streamdown })), Ue = {
  working: "Working",
  idle: "Idle",
  waiting_for_approval: "Needs you",
  offline: "No profile"
};
function ln({
  agents: t,
  sections: n,
  rooms: r,
  selectedAgentId: c,
  selectedThreadId: f,
  search: E,
  onSearch: u,
  onSelectAgent: M,
  onSelectThread: d,
  onAction: s,
  onCreate: k,
  onToggleSection: i
}) {
  const [a, p] = S();
  U(() => {
    if (!a) return;
    const v = () => p(void 0);
    return window.addEventListener("pointerdown", v), () => window.removeEventListener("pointerdown", v);
  }, [a]);
  const h = (v, D) => {
    p(void 0), s(v, D);
  }, m = E.trim().toLowerCase(), O = (v) => !m || `${v.name} ${v.role}`.toLowerCase().includes(m), A = me(() => new Map(t.map((v) => [v.id, v])), [t]), R = n.map((v) => ({
    section: v,
    members: v.bot_ids.map((D) => A.get(D)).filter((D) => !!D && O(D))
  })).filter((v) => v.members.length > 0), $ = !m && R.length > 1, G = (v) => /* @__PURE__ */ e.createElement(
    "div",
    {
      key: v.id,
      className: `agent-row ${c === v.id && !f.startsWith("group:") ? "selected" : ""} ${v.status === "working" ? "is-working" : ""}`
    },
    /* @__PURE__ */ e.createElement("button", { className: "agent-select", onClick: () => M(v.id) }, /* @__PURE__ */ e.createElement(et, { agent: v }), /* @__PURE__ */ e.createElement("span", { className: "agent-copy" }, /* @__PURE__ */ e.createElement("strong", null, /* @__PURE__ */ e.createElement("span", null, v.name), /* @__PURE__ */ e.createElement("span", { className: `agent-status ${v.status}`, title: Ue[v.status], "aria-label": Ue[v.status] })), v.lastMessagePreview && /* @__PURE__ */ e.createElement("span", { className: "agent-preview agent-preview-entering" }, /* @__PURE__ */ e.createElement(Ae, { fallback: v.lastMessagePreview }, /* @__PURE__ */ e.createElement(cn, { className: "agent-preview-markdown", mode: "static", controls: !1, linkSafety: { enabled: !0 }, skipHtml: !0 }, v.lastMessagePreview))))),
    /* @__PURE__ */ e.createElement(
      "button",
      {
        className: "agent-more",
        "aria-label": `More actions for ${v.name}`,
        onPointerDown: (D) => D.stopPropagation(),
        onClick: () => p((D) => D === v.id ? void 0 : v.id)
      },
      /* @__PURE__ */ e.createElement(Gt, { size: 15 })
    ),
    a === v.id && /* @__PURE__ */ e.createElement("div", { className: "agent-menu", role: "menu", onPointerDown: (D) => D.stopPropagation() }, /* @__PURE__ */ e.createElement("button", { role: "menuitem", onClick: () => h(v, "edit") }, /* @__PURE__ */ e.createElement(Qt, { size: 13 }), " Edit"), /* @__PURE__ */ e.createElement("button", { role: "menuitem", onClick: () => h(v, "duplicate") }, /* @__PURE__ */ e.createElement(Ft, { size: 13 }), " Duplicate"), /* @__PURE__ */ e.createElement("div", null), /* @__PURE__ */ e.createElement("button", { role: "menuitem", className: "danger-text", onClick: () => h(v, "delete") }, /* @__PURE__ */ e.createElement(Qe, { size: 13 }), " Remove from crew"))
  );
  return /* @__PURE__ */ e.createElement("aside", { className: "agent-sidebar" }, /* @__PURE__ */ e.createElement("div", { className: "sidebar-titlebar" }, /* @__PURE__ */ e.createElement("span", { className: "sidebar-title" }, "Crew"), /* @__PURE__ */ e.createElement("button", { className: "brand-add", "aria-label": "Hire a teammate", onClick: k }, /* @__PURE__ */ e.createElement(Xe, { size: 18 }))), /* @__PURE__ */ e.createElement("label", { className: "search" }, /* @__PURE__ */ e.createElement(Je, { size: 15 }), /* @__PURE__ */ e.createElement("input", { "aria-label": "Search the crew", placeholder: "Search your crew", value: E, onChange: (v) => u(v.target.value) })), /* @__PURE__ */ e.createElement("div", { className: "agent-list" }, t.length === 0 && /* @__PURE__ */ e.createElement("div", { className: "agent-list-empty" }, "No teammates yet"), t.length > 0 && R.length === 0 && /* @__PURE__ */ e.createElement("div", { className: "agent-list-empty" }, "No teammates found"), $ ? R.map(({ section: v, members: D }) => /* @__PURE__ */ e.createElement("section", { className: "agent-section", key: v.id }, /* @__PURE__ */ e.createElement(
    "button",
    {
      className: `agent-section-header ${v.collapsed ? "is-collapsed" : ""}`,
      "aria-expanded": !v.collapsed,
      onClick: () => i(v.id, !v.collapsed)
    },
    /* @__PURE__ */ e.createElement(Me, { size: 13, className: "agent-section-chevron" }),
    /* @__PURE__ */ e.createElement("span", null, v.name),
    /* @__PURE__ */ e.createElement("small", null, D.length)
  ), !v.collapsed && D.map(G))) : R.flatMap((v) => v.members).map(G), r.length > 0 && /* @__PURE__ */ e.createElement("section", { className: "agent-section", key: "__rooms__" }, /* @__PURE__ */ e.createElement("div", { className: "agent-section-header is-static" }, /* @__PURE__ */ e.createElement("span", null, "Rooms"), /* @__PURE__ */ e.createElement("small", null, r.length)), r.map((v) => /* @__PURE__ */ e.createElement("div", { key: v.id, className: `agent-row ${f === v.id ? "selected" : ""}` }, /* @__PURE__ */ e.createElement("button", { className: "agent-select", onClick: () => d(v.id) }, /* @__PURE__ */ e.createElement("span", { className: "agent-avatar", role: "img", "aria-label": `${v.title} room` }, v.emoji || "👥"), /* @__PURE__ */ e.createElement("span", { className: "agent-copy" }, /* @__PURE__ */ e.createElement("strong", null, /* @__PURE__ */ e.createElement("span", null, v.title)), /* @__PURE__ */ e.createElement("span", { className: "agent-preview" }, v.lastMessagePreview || v.subtitle))))))));
}
function dn({
  open: t,
  agents: n,
  rooms: r,
  onClose: c,
  onSelectAgent: f,
  onSelectThread: E,
  onCreateAgent: u,
  onComputer: M
}) {
  const [d, s] = S(""), k = q(null);
  U(() => {
    t && (s(""), window.setTimeout(() => k.current?.focus(), 0));
  }, [t]);
  const a = me(() => [
    { id: "create", label: "Hire a teammate", detail: "Add someone to the crew", icon: Xe, run: u },
    { id: "computer", label: "Open their computer", detail: "The current teammate's screen", icon: Ye, run: M },
    ...n.map((h) => ({
      id: `agent-${h.id}`,
      label: h.name,
      detail: `${h.role} · ${h.status.replaceAll("_", " ")}`,
      icon: Ht,
      run: () => f(h.id)
    })),
    ...r.map((h) => ({
      id: `room-${h.id}`,
      label: h.title,
      detail: h.subtitle || "Room",
      icon: sn,
      run: () => E(h.id)
    }))
  ], [n, r, M, u, f, E]).filter((h) => `${h.label} ${h.detail}`.toLowerCase().includes(d.toLowerCase()));
  if (!t) return null;
  const p = (h) => {
    h.run(), c();
  };
  return /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "palette-backdrop",
      role: "presentation",
      onMouseDown: (h) => {
        h.target === h.currentTarget && c();
      }
    },
    /* @__PURE__ */ e.createElement("section", { className: "command-palette", role: "dialog", "aria-modal": "true", "aria-label": "Command palette" }, /* @__PURE__ */ e.createElement("label", null, /* @__PURE__ */ e.createElement(Je, { size: 17 }), /* @__PURE__ */ e.createElement(
      "input",
      {
        ref: k,
        "aria-label": "Search the crew and commands",
        placeholder: "Search your crew…",
        value: d,
        onChange: (h) => s(h.target.value),
        onKeyDown: (h) => {
          h.key === "Escape" && c(), h.key === "Enter" && a[0] && p(a[0]);
        }
      }
    ), /* @__PURE__ */ e.createElement("kbd", null, "esc")), /* @__PURE__ */ e.createElement("div", { className: "palette-results" }, a.length ? a.map((h, m) => {
      const O = h.icon;
      return /* @__PURE__ */ e.createElement("button", { key: h.id, className: m === 0 ? "active" : "", onClick: () => p(h) }, /* @__PURE__ */ e.createElement("span", null, /* @__PURE__ */ e.createElement(O, { size: 16 })), /* @__PURE__ */ e.createElement("div", null, /* @__PURE__ */ e.createElement("strong", null, h.label), /* @__PURE__ */ e.createElement("small", null, h.detail)), m === 0 && /* @__PURE__ */ e.createElement("kbd", null, "↵"));
    }) : /* @__PURE__ */ e.createElement("p", null, "Nothing matches that")), /* @__PURE__ */ e.createElement("footer", null, /* @__PURE__ */ e.createElement("span", null, "Crew"), /* @__PURE__ */ e.createElement("span", null, /* @__PURE__ */ e.createElement("kbd", null, "⌘"), /* @__PURE__ */ e.createElement("kbd", null, "K"), " to open")))
  );
}
function ye({ label: t, kind: n = "", children: r }) {
  return /* @__PURE__ */ e.createElement("div", { className: `crew-chip ${n}` }, t && /* @__PURE__ */ e.createElement("div", { className: "crew-chip-label" }, t), r);
}
function un({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ye, { kind: "report" }, (t.lines ?? []).map((n, r) => /* @__PURE__ */ e.createElement("div", { className: "crew-report-line", key: r }, /* @__PURE__ */ e.createElement("span", { className: "crew-report-check" }, /* @__PURE__ */ e.createElement(Ie, { size: 13 })), /* @__PURE__ */ e.createElement("span", { className: "crew-report-system" }, n.system), /* @__PURE__ */ e.createElement("span", { className: "crew-report-arrow" }, "→"), /* @__PURE__ */ e.createElement("span", null, n.result, n.count && /* @__PURE__ */ e.createElement("span", { className: "crew-report-count" }, " · ", n.count)))), t.closing && /* @__PURE__ */ e.createElement("div", { className: "crew-report-closing" }, t.closing));
}
function mn({ payload: t, onDecide: n }) {
  const r = t.status === "approved" || t.status === "discarded";
  return /* @__PURE__ */ e.createElement("div", { className: `crew-chip approval ${r ? "resolved" : ""}` }, /* @__PURE__ */ e.createElement("div", { className: "crew-chip-label" }, /* @__PURE__ */ e.createElement(Ze, { size: 13 }), " ", r ? "Decided" : "Needs you"), /* @__PURE__ */ e.createElement("div", { className: "crew-approval-action" }, t.action), t.detail && /* @__PURE__ */ e.createElement("div", { className: "crew-approval-detail" }, t.detail), r ? /* @__PURE__ */ e.createElement("div", { className: "crew-approval-outcome" }, t.status === "approved" ? "Approved" : "Discarded") : /* @__PURE__ */ e.createElement("div", { className: "crew-approval-buttons" }, /* @__PURE__ */ e.createElement("button", { className: "crew-btn danger", onClick: () => n(String(t.approval_id), "deny") }, "Discard"), /* @__PURE__ */ e.createElement("button", { className: "crew-btn primary", onClick: () => n(String(t.approval_id), "allow") }, "Approve")));
}
function pn({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ye, { label: "You decided" }, /* @__PURE__ */ e.createElement("div", { className: "crew-approval-action" }, t.action), /* @__PURE__ */ e.createElement("div", { className: "crew-approval-outcome" }, t.status === "approved" ? "Approved" : "Discarded"));
}
function fn({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ye, { label: "Memory updated" }, /* @__PURE__ */ e.createElement("div", { className: "crew-memory-rule" }, t.rule), t.diff && /* @__PURE__ */ e.createElement("pre", { className: "crew-memory-diff" }, t.diff));
}
function hn({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ye, { label: "Routine created" }, /* @__PURE__ */ e.createElement("div", { className: "crew-routine-name" }, /* @__PURE__ */ e.createElement(Ke, { size: 13 }), " ", t.name), /* @__PURE__ */ e.createElement("div", { className: "crew-routine-when" }, t.human || t.cron));
}
function gn({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ye, { label: `Handed over by @${t.from_name || t.from || "a teammate"}` }, /* @__PURE__ */ e.createElement("div", { className: "crew-botref-body" }, /* @__PURE__ */ e.createElement(Bt, { size: 13 }), " ", t.content));
}
function yn({ payload: t, onOpenScreen: n }) {
  return /* @__PURE__ */ e.createElement(ye, { label: "Needs you at the keyboard" }, /* @__PURE__ */ e.createElement("div", { className: "crew-login-site" }, /* @__PURE__ */ e.createElement(Yt, { size: 13 }), " Sign in to ", t.site || "a site"), t.why && /* @__PURE__ */ e.createElement("div", { className: "crew-login-why" }, t.why), /* @__PURE__ */ e.createElement("button", { className: "crew-btn", onClick: n }, "Take the wheel"));
}
function vn({ payload: t, screenshotUrl: n }) {
  const r = t.url ?? (t.bot_id && t.file ? n(t.bot_id, t.file) : void 0);
  return r ? /* @__PURE__ */ e.createElement("figure", { className: "crew-shot" }, /* @__PURE__ */ e.createElement("img", { src: r, alt: t.caption || "the teammate's screen", loading: "lazy" }), t.caption && /* @__PURE__ */ e.createElement("figcaption", null, t.caption)) : null;
}
function wn({ kind: t, payload: n, handlers: r }) {
  const c = n ?? {};
  switch (t) {
    case "report":
      return /* @__PURE__ */ e.createElement(un, { payload: c });
    case "approval_request":
      return /* @__PURE__ */ e.createElement(mn, { payload: c, onDecide: r.onDecide });
    case "approval_resolved":
      return /* @__PURE__ */ e.createElement(pn, { payload: c });
    case "memory_updated":
      return /* @__PURE__ */ e.createElement(fn, { payload: c });
    case "routine_created":
      return /* @__PURE__ */ e.createElement(hn, { payload: c });
    case "bot_ref":
      return /* @__PURE__ */ e.createElement(gn, { payload: c });
    case "login_request":
      return /* @__PURE__ */ e.createElement(yn, { payload: c, onOpenScreen: r.onOpenScreen });
    case "screenshot":
      return /* @__PURE__ */ e.createElement(vn, { payload: c, screenshotUrl: r.screenshotUrl });
    default:
      return null;
  }
}
const En = Re(async () => ({ default: (await import("./chunk-mermaid-HWGCJPDP-CrqSIQim.js").then((t) => t.i)).Streamdown })), bn = {
  browser: Wt,
  terminal: rn,
  file: Kt,
  handoff: _e,
  status: _e
};
function kn(t) {
  return t.parts.filter((n) => n.type === "text").map((n) => n.text).join("");
}
const Sn = (t) => {
  const n = Math.max(0, Math.floor(t / 1e3)), r = Math.floor(n / 60);
  return r ? `${r}m ${n % 60}s` : `${n}s`;
};
function Nn() {
  return /* @__PURE__ */ e.createElement("svg", { "aria-hidden": "true", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ e.createElement("path", { d: "m5 12 7-7 7 7" }), /* @__PURE__ */ e.createElement("path", { d: "M12 19V5" }));
}
function Cn() {
  return /* @__PURE__ */ e.createElement("svg", { className: "stop-icon", "aria-hidden": "true", viewBox: "0 0 24 24" }, /* @__PURE__ */ e.createElement("rect", { x: "7.5", y: "7.5", width: "9", height: "9", rx: "1.5", fill: "currentColor" }));
}
function Mn(t) {
  if (!(t.target instanceof Element)) return;
  const n = t.target.closest("a[href]");
  if (!(!n || !t.currentTarget.contains(n)))
    try {
      const r = new URL(n.href);
      if (r.protocol !== "http:" && r.protocol !== "https:") return;
      t.preventDefault(), window.open(r.toString(), "_blank", "noopener,noreferrer");
    } catch {
    }
}
function Tn({ agent: t, label: n, activities: r, startedAt: c }) {
  const [f, E] = S(0), [u, M] = S(!1);
  return U(() => {
    E(Date.now());
    const d = window.setInterval(() => E(Date.now()), 1e3);
    return () => window.clearInterval(d);
  }, []), /* @__PURE__ */ e.createElement("details", { className: "agent-working-details", open: u }, /* @__PURE__ */ e.createElement(
    "summary",
    {
      role: "status",
      "aria-label": `${t?.name ?? "This teammate"} is working: ${n}`,
      onClick: (d) => {
        d.preventDefault(), M((s) => !s);
      }
    },
    /* @__PURE__ */ e.createElement("span", { className: "agent-working-progress" }, "Working for ", Sn(f - Date.parse(c))),
    /* @__PURE__ */ e.createElement(Me, { className: "agent-working-chevron", size: 15 })
  ), r.length > 0 && /* @__PURE__ */ e.createElement("div", { className: "agent-working-tools" }, r.map((d) => {
    const s = bn[d.kind] ?? _e;
    return /* @__PURE__ */ e.createElement("details", { className: `agent-tool-detail ${d.status}`, key: d.id }, /* @__PURE__ */ e.createElement("summary", null, /* @__PURE__ */ e.createElement(s, { size: 14 }), /* @__PURE__ */ e.createElement("span", null, d.title), /* @__PURE__ */ e.createElement(Me, { size: 13 })), /* @__PURE__ */ e.createElement("div", null, d.output ?? (d.status === "running" ? "Waiting for result…" : "No output")));
  })));
}
function _n({ message: t, agent: n, senderName: r, activities: c, chips: f, entering: E = !1 }) {
  const u = kn(t), M = q(null), d = q(!!t.streaming), s = c.filter((h) => h.conversationId === t.conversationId), k = [...s].reverse().find((h) => h.status === "running") ?? s.at(-1), i = t.role === "agent" && !!t.streaming, a = u.trim() || k?.title || "Working", p = t.parts.filter((h) => h.type === "chip");
  return xe(() => {
    const h = M.current, m = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (h && t.role === "agent" && d.current && !t.streaming && !m) {
      const O = h.querySelector(".message-body");
      O && typeof O.animate == "function" && O.animate(
        [{ opacity: 0, transform: "translate3d(-6px,4px,0)" }, { opacity: 1, transform: "translate3d(0,0,0)" }],
        { duration: 260, easing: "cubic-bezier(.2,.82,.3,1)" }
      );
    }
    d.current = !!t.streaming;
  }, [E, t.role, t.streaming]), /* @__PURE__ */ e.createElement("div", { className: `message ${t.role} ${E ? "message-entering" : ""}`, ref: M }, t.interrupted && /* @__PURE__ */ e.createElement("div", { className: "agent-interrupted" }, "Interrupted"), r && t.role === "agent" && /* @__PURE__ */ e.createElement("div", { className: "message-sender" }, r), !i && (u || t.streaming && !p.length) && /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "message-body",
      onClick: t.role === "agent" ? Mn : void 0
    },
    t.role === "agent" ? /* @__PURE__ */ e.createElement(Ae, { fallback: /* @__PURE__ */ e.createElement("span", { className: "agent-markdown-fallback" }, u) }, /* @__PURE__ */ e.createElement(
      En,
      {
        className: "agent-markdown",
        mode: t.streaming ? "streaming" : "static",
        parseIncompleteMarkdown: t.streaming,
        animated: t.streaming,
        controls: { code: { copy: !0, download: !1 }, table: !1, image: !1 },
        tableMaxHeight: "none",
        linkSafety: { enabled: !1 },
        skipHtml: !0
      },
      u
    )) : u
  ), i && /* @__PURE__ */ e.createElement(
    Tn,
    {
      agent: n,
      label: a,
      activities: s,
      startedAt: t.createdAt
    }
  ), p.map((h, m) => /* @__PURE__ */ e.createElement(
    wn,
    {
      key: `${t.id}:${m}`,
      kind: h.kind,
      payload: h.payload,
      handlers: f
    }
  )));
}
function An({
  agent: t,
  thread: n,
  agentsById: r,
  messages: c,
  activities: f,
  chips: E,
  loading: u = !1,
  focusRequest: M = 0,
  onSend: d,
  onToggleDetails: s
}) {
  const [k, i] = S(""), [a, p] = S(!1), [h, m] = S(!1), [O, A] = S(!1), [R, $] = S(!1), G = q(null), v = q(null), D = q(null), V = q(!1), ee = q(!0), J = q(!1), le = q(0), F = q(0), X = q(void 0), j = q(void 0), ne = q(/* @__PURE__ */ new Set()), re = q(n?.id ?? ""), oe = q(u), [fe, H] = S(() => /* @__PURE__ */ new Set()), K = n?.title || t?.name || "Crew", Q = n?.kind === "group", z = n?.id ?? t?.id ?? "";
  xe(() => {
    const x = re.current !== z || oe.current;
    if (re.current = z, oe.current = u, u || x) {
      ne.current = new Set(c.map((B) => B.id)), H(/* @__PURE__ */ new Set());
      return;
    }
    const I = c.filter((B) => !ne.current.has(B.id)).map((B) => B.id);
    for (const B of I) ne.current.add(B);
    H(new Set(I));
  }, [z, u, c]);
  function Y(x) {
    const I = G.current;
    !I || typeof I.scrollTo != "function" || (ee.current = !0, J.current = !0, A(!1), X.current && window.clearTimeout(X.current), le.current = Math.max(
      le.current,
      Date.now() + (x === "smooth" ? 650 : 150)
    ), I.scrollTo({ top: I.scrollHeight, behavior: x }), X.current = window.setTimeout(() => {
      X.current = void 0, J.current = !1;
    }, x === "smooth" ? 400 : 0));
  }
  U(() => {
    ee.current = !0, J.current = !1, F.current = 0, A(!1), requestAnimationFrame(() => Y("auto"));
  }, [z]), U(() => {
    ee.current && Y("smooth");
  }, [c]), U(() => {
    const x = G.current, I = v.current;
    if (!x || !I || typeof ResizeObserver > "u") return;
    const B = new ResizeObserver(() => {
      ee.current && Y("auto");
    });
    return B.observe(I), () => B.disconnect();
  }, [z, u]), U(() => () => {
    j.current && window.clearTimeout(j.current), X.current && window.clearTimeout(X.current);
  }, []), U(() => {
    M > 0 && D.current?.focus();
  }, [z, M]);
  function ue() {
    J.current || Date.now() < le.current || ($(!0), j.current && window.clearTimeout(j.current), j.current = window.setTimeout(() => {
      j.current = void 0, $(!1);
    }, 700));
  }
  async function ie(x) {
    x.preventDefault();
    const I = k.trim();
    if (!(!I || V.current)) {
      V.current = !0, i(""), p(!0);
      try {
        await d(I);
      } finally {
        V.current = !1, p(!1);
      }
    }
  }
  return /* @__PURE__ */ e.createElement("main", { className: "conversation" }, /* @__PURE__ */ e.createElement("header", { className: `conversation-header ${h ? "scrolled" : ""}` }, /* @__PURE__ */ e.createElement("h1", null, n?.emoji && /* @__PURE__ */ e.createElement("span", { className: "conversation-emoji" }, n.emoji), K), n?.subtitle && /* @__PURE__ */ e.createElement("p", { className: "conversation-subtitle" }, n.subtitle), /* @__PURE__ */ e.createElement("div", { className: "header-actions" }, !Q && /* @__PURE__ */ e.createElement("button", { className: "computer-trigger", "aria-label": "Open this teammate's computer", onClick: s }, /* @__PURE__ */ e.createElement(Ye, { size: 18 })))), /* @__PURE__ */ e.createElement("div", { className: "conversation-scroll-shell" }, u ? /* @__PURE__ */ e.createElement("div", { className: "conversation-skeleton", role: "status", "aria-label": "Loading this thread" }, /* @__PURE__ */ e.createElement("div", { className: "skeleton-message skeleton-agent" }, /* @__PURE__ */ e.createElement("span", { className: "skeleton-line skeleton-line-wide" }), /* @__PURE__ */ e.createElement("span", { className: "skeleton-line" })), /* @__PURE__ */ e.createElement("div", { className: "skeleton-message skeleton-user" }, /* @__PURE__ */ e.createElement("span", { className: "skeleton-bubble" })), /* @__PURE__ */ e.createElement("div", { className: "skeleton-message skeleton-agent" }, /* @__PURE__ */ e.createElement("span", { className: "skeleton-line skeleton-line-short" }))) : /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement(
    "div",
    {
      className: `message-scroll ${R ? "scrollbar-visible" : ""}`,
      ref: G,
      onWheelCapture: (x) => {
        x.deltaY < 0 && (J.current = !1);
      },
      onScroll: (x) => {
        const I = x.currentTarget, B = I.scrollHeight - I.scrollTop - I.clientHeight, b = B <= 24, N = I.scrollTop < F.current - 1;
        F.current = I.scrollTop, m(I.scrollTop > 0), N && B > 72 ? (J.current = !1, ee.current = !1, A(!0)) : !J.current && b ? (ee.current = !0, A(!1)) : !J.current && B > 72 && (ee.current = !1, A(!0)), ue();
      },
      onPointerMove: (x) => {
        x.currentTarget.getBoundingClientRect().right - x.clientX <= 14 ? $(!0) : j.current || $(!1);
      },
      onPointerLeave: () => $(!1)
    },
    /* @__PURE__ */ e.createElement("div", { className: "message-content", ref: v }, c.length === 0 && t && /* @__PURE__ */ e.createElement("div", { className: "conversation-intro" }, /* @__PURE__ */ e.createElement(et, { agent: t, size: 54 }), /* @__PURE__ */ e.createElement("h2", null, t.name), /* @__PURE__ */ e.createElement("p", null, t.role)), c.map((x) => /* @__PURE__ */ e.createElement(
      _n,
      {
        key: x.id,
        message: x,
        agent: t,
        senderName: Q ? r.get(x.sender ?? "")?.name : void 0,
        activities: f,
        chips: E,
        entering: fe.has(x.id) || x.id.startsWith("optimistic-user:")
      }
    )))
  ), O && /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "scroll-to-bottom",
      "aria-label": "Scroll to the latest message",
      onClick: () => Y("smooth")
    },
    /* @__PURE__ */ e.createElement(zt, { size: 20 })
  ))), /* @__PURE__ */ e.createElement("form", { className: "composer", onSubmit: ie }, /* @__PURE__ */ e.createElement(
    "textarea",
    {
      ref: D,
      "aria-label": `Message ${K}`,
      placeholder: Q ? "Ask the room…" : `Message ${K}…`,
      value: k,
      onChange: (x) => i(x.target.value),
      onKeyDown: (x) => {
        x.key === "Enter" && !x.shiftKey && !x.nativeEvent.isComposing && x.keyCode !== 229 && (x.preventDefault(), x.currentTarget.form?.requestSubmit());
      }
    }
  ), /* @__PURE__ */ e.createElement("div", { className: "composer-bottom" }, /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "submit-button",
      "data-state": a ? "stopping" : "send",
      "aria-label": a ? "Sending" : "Send message",
      disabled: !k.trim() || a
    },
    a ? /* @__PURE__ */ e.createElement(Cn, null) : /* @__PURE__ */ e.createElement(Nn, null)
  ))));
}
const On = [
  { id: "all", label: "Everything", types: [] },
  {
    id: "stopped",
    label: "Stopped",
    types: ["tool.refused", "tool.held", "approval.expired", "crew.bot_declined"]
  },
  { id: "failed", label: "Went wrong", types: ["tool.failed"] },
  { id: "decisions", label: "Your decisions", types: ["approval.decided", "grant.changed"] }
], Rn = {
  "tool.allowed": Te,
  "tool.refused": nn,
  "tool.held": $e,
  "tool.failed": an,
  "approval.decided": Te,
  "approval.expired": Ke,
  "grant.changed": ze,
  "crew.policy_loaded": ze,
  "crew.bot_declined": $e
}, xn = {
  "tool.allowed": "ran",
  "tool.refused": "refused",
  "tool.held": "held for you",
  "tool.failed": "failed",
  "approval.decided": "you decided",
  "approval.expired": "lapsed",
  "grant.changed": "you changed a permission",
  "crew.policy_loaded": "rules in force",
  "crew.bot_declined": "declined it itself"
};
function In(t) {
  const n = new Date(t);
  return `${n.toLocaleDateString(void 0, { month: "short", day: "numeric" })} ${n.toLocaleTimeString(void 0, { hour: "2-digit", minute: "2-digit" })}`;
}
function Dn({ events: t, loading: n, viewId: r, onChangeView: c, onLoadMore: f, hasMore: E }) {
  const [u, M] = S(() => /* @__PURE__ */ new Set()), d = me(() => t.slice().sort((s, k) => k.id - s.id), [t]);
  return /* @__PURE__ */ e.createElement("section", { className: "audit-timeline" }, /* @__PURE__ */ e.createElement("div", { className: "audit-views", role: "tablist", "aria-label": "What to show" }, On.map((s) => /* @__PURE__ */ e.createElement(
    "button",
    {
      key: s.id,
      role: "tab",
      type: "button",
      "aria-selected": r === s.id,
      className: `audit-view ${r === s.id ? "is-current" : ""}`,
      onClick: () => c(s.id, s.types)
    },
    s.label
  ))), d.length === 0 && !n && /* @__PURE__ */ e.createElement("p", { className: "audit-empty" }, "Nothing recorded yet."), /* @__PURE__ */ e.createElement("ol", { className: "audit-rows" }, d.map((s) => {
    const k = Rn[s.event_type] ?? Te, i = u.has(s.id), a = s.event_type === "tool.refused" || s.event_type === "tool.held";
    return /* @__PURE__ */ e.createElement(
      "li",
      {
        key: s.id,
        className: `audit-row ${a ? "is-stopped" : ""} ${s.event_type === "tool.failed" ? "is-failed" : ""}`
      },
      /* @__PURE__ */ e.createElement(
        "button",
        {
          type: "button",
          className: "audit-head",
          "aria-expanded": i,
          onClick: () => M((p) => {
            const h = new Set(p);
            return h.delete(s.id) || h.add(s.id), h;
          })
        },
        /* @__PURE__ */ e.createElement(k, { size: 14 }),
        /* @__PURE__ */ e.createElement("span", { className: "audit-subject" }, s.subject || s.tool || s.event_type),
        /* @__PURE__ */ e.createElement("span", { className: "audit-kind" }, xn[s.event_type] ?? s.event_type),
        /* @__PURE__ */ e.createElement("time", { className: "audit-when", dateTime: new Date(s.created_at).toISOString() }, In(s.created_at))
      ),
      i && /* @__PURE__ */ e.createElement("dl", { className: "audit-detail" }, s.tool && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Tool"), /* @__PURE__ */ e.createElement("dd", null, /* @__PURE__ */ e.createElement("code", null, s.tool))), s.detail && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Why"), /* @__PURE__ */ e.createElement("dd", null, s.detail)), s.actor !== "_system" && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Who"), /* @__PURE__ */ e.createElement("dd", null, s.actor === "_operator" ? "you" : s.actor)), s.duration_ms !== null && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Took"), /* @__PURE__ */ e.createElement("dd", null, s.duration_ms, " ms")), s.args_digest && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Arguments"), /* @__PURE__ */ e.createElement("dd", null, /* @__PURE__ */ e.createElement("code", null, s.args_digest))))
    );
  })), E && /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "secondary-button",
      disabled: n,
      onClick: f
    },
    n ? "Loading…" : "Show older"
  ));
}
const Ln = [
  { mode: "deny", label: "Never", icon: Ut },
  { mode: "ask", label: "Ask me", icon: Vt },
  { mode: "allow", label: "Allow", icon: tn }
];
function Pn({ agentName: t, grants: n, busy: r, onSetGrant: c, onClearGrant: f }) {
  const [E, u] = S(""), [M, d] = S(!1), s = me(() => {
    const i = E.trim().toLowerCase(), a = n.filter((h) => M && h.source !== "grant" ? !1 : i ? h.tool.toLowerCase().includes(i) || h.toolset.toLowerCase().includes(i) : !0), p = /* @__PURE__ */ new Map();
    for (const h of a) {
      const m = h.toolset || "other";
      p.set(m, [...p.get(m) ?? [], h]);
    }
    return [...p.entries()].sort(([h], [m]) => h.localeCompare(m));
  }, [n, E, M]), k = n.filter((i) => i.mode === "ask").length;
  return /* @__PURE__ */ e.createElement("section", { className: "permissions-panel" }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow" }, /* @__PURE__ */ e.createElement(Xt, { size: 14 }), " What ", t, " can do"), /* @__PURE__ */ e.createElement("p", { className: "permissions-summary" }, n.length, " tools · ", k, " need your say-so"), /* @__PURE__ */ e.createElement("div", { className: "permissions-filters" }, /* @__PURE__ */ e.createElement(
    "input",
    {
      type: "search",
      "aria-label": "Filter tools",
      placeholder: "Filter tools…",
      value: E,
      onChange: (i) => u(i.target.value)
    }
  ), /* @__PURE__ */ e.createElement("label", null, /* @__PURE__ */ e.createElement(
    "input",
    {
      type: "checkbox",
      checked: M,
      onChange: (i) => d(i.target.checked)
    }
  ), "Only what I changed")), s.length === 0 && /* @__PURE__ */ e.createElement("p", { className: "permissions-empty" }, "Nothing matches."), s.map(([i, a]) => /* @__PURE__ */ e.createElement("div", { className: "permissions-group", key: i }, /* @__PURE__ */ e.createElement("h4", null, i), a.map((p) => /* @__PURE__ */ e.createElement(
    "div",
    {
      className: `permissions-row ${p.protected ? "is-protected" : ""} ${p.available === !1 ? "is-unavailable" : ""}`,
      key: p.tool
    },
    /* @__PURE__ */ e.createElement("div", { className: "permissions-tool" }, /* @__PURE__ */ e.createElement("code", null, p.tool), /* @__PURE__ */ e.createElement("span", { className: "permissions-why" }, p.why)),
    /* @__PURE__ */ e.createElement("div", { className: "permissions-modes", role: "group", "aria-label": `What ${t} may do with ${p.tool}` }, Ln.map(({ mode: h, label: m, icon: O }) => /* @__PURE__ */ e.createElement(
      "button",
      {
        key: h,
        type: "button",
        className: `permissions-mode ${p.mode === h ? "is-current" : ""}`,
        "aria-pressed": p.mode === h,
        disabled: r || p.protected,
        title: p.protected ? "This teammate always keeps this one" : m,
        onClick: () => {
          c(p.tool, h);
        }
      },
      /* @__PURE__ */ e.createElement(O, { size: 13 }),
      " ",
      m
    )), p.source === "grant" && !p.protected && /* @__PURE__ */ e.createElement(
      "button",
      {
        type: "button",
        className: "permissions-reset",
        "aria-label": `Reset ${p.tool} to the default`,
        disabled: r,
        onClick: () => {
          f(p.tool);
        }
      },
      /* @__PURE__ */ e.createElement(en, { size: 13 })
    ))
  )))));
}
function er(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
function $n(t) {
  if (Object.prototype.hasOwnProperty.call(t, "__esModule")) return t;
  var n = t.default;
  if (typeof n == "function") {
    var r = function c() {
      var f = !1;
      try {
        f = this instanceof c;
      } catch {
      }
      return f ? Reflect.construct(n, arguments, this.constructor) : n.apply(this, arguments);
    };
    r.prototype = n.prototype;
  } else r = {};
  return Object.defineProperty(r, "__esModule", { value: !0 }), Object.keys(t).forEach(function(c) {
    var f = Object.getOwnPropertyDescriptor(t, c);
    Object.defineProperty(r, c, f.get ? f : {
      enumerable: !0,
      get: function() {
        return t[c];
      }
    });
  }), r;
}
var ke = { exports: {} }, ae = {};
const tt = /* @__PURE__ */ $n(xt);
var He;
function zn() {
  if (He) return ae;
  He = 1;
  var t = tt;
  function n(d) {
    var s = "https://react.dev/errors/" + d;
    if (1 < arguments.length) {
      s += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var k = 2; k < arguments.length; k++)
        s += "&args[]=" + encodeURIComponent(arguments[k]);
    }
    return "Minified React error #" + d + "; visit " + s + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function r() {
  }
  var c = {
    d: {
      f: r,
      r: function() {
        throw Error(n(522));
      },
      D: r,
      C: r,
      L: r,
      m: r,
      X: r,
      S: r,
      M: r
    },
    p: 0,
    findDOMNode: null
  }, f = /* @__PURE__ */ Symbol.for("react.portal");
  function E(d, s, k) {
    var i = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: f,
      key: i == null ? null : "" + i,
      children: d,
      containerInfo: s,
      implementation: k
    };
  }
  var u = t.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function M(d, s) {
    if (d === "font") return "";
    if (typeof s == "string")
      return s === "use-credentials" ? s : "";
  }
  return ae.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = c, ae.createPortal = function(d, s) {
    var k = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!s || s.nodeType !== 1 && s.nodeType !== 9 && s.nodeType !== 11)
      throw Error(n(299));
    return E(d, s, null, k);
  }, ae.flushSync = function(d) {
    var s = u.T, k = c.p;
    try {
      if (u.T = null, c.p = 2, d) return d();
    } finally {
      u.T = s, c.p = k, c.d.f();
    }
  }, ae.preconnect = function(d, s) {
    typeof d == "string" && (s ? (s = s.crossOrigin, s = typeof s == "string" ? s === "use-credentials" ? s : "" : void 0) : s = null, c.d.C(d, s));
  }, ae.prefetchDNS = function(d) {
    typeof d == "string" && c.d.D(d);
  }, ae.preinit = function(d, s) {
    if (typeof d == "string" && s && typeof s.as == "string") {
      var k = s.as, i = M(k, s.crossOrigin), a = typeof s.integrity == "string" ? s.integrity : void 0, p = typeof s.fetchPriority == "string" ? s.fetchPriority : void 0;
      k === "style" ? c.d.S(
        d,
        typeof s.precedence == "string" ? s.precedence : void 0,
        {
          crossOrigin: i,
          integrity: a,
          fetchPriority: p
        }
      ) : k === "script" && c.d.X(d, {
        crossOrigin: i,
        integrity: a,
        fetchPriority: p,
        nonce: typeof s.nonce == "string" ? s.nonce : void 0
      });
    }
  }, ae.preinitModule = function(d, s) {
    if (typeof d == "string")
      if (typeof s == "object" && s !== null) {
        if (s.as == null || s.as === "script") {
          var k = M(
            s.as,
            s.crossOrigin
          );
          c.d.M(d, {
            crossOrigin: k,
            integrity: typeof s.integrity == "string" ? s.integrity : void 0,
            nonce: typeof s.nonce == "string" ? s.nonce : void 0
          });
        }
      } else s == null && c.d.M(d);
  }, ae.preload = function(d, s) {
    if (typeof d == "string" && typeof s == "object" && s !== null && typeof s.as == "string") {
      var k = s.as, i = M(k, s.crossOrigin);
      c.d.L(d, k, {
        crossOrigin: i,
        integrity: typeof s.integrity == "string" ? s.integrity : void 0,
        nonce: typeof s.nonce == "string" ? s.nonce : void 0,
        type: typeof s.type == "string" ? s.type : void 0,
        fetchPriority: typeof s.fetchPriority == "string" ? s.fetchPriority : void 0,
        referrerPolicy: typeof s.referrerPolicy == "string" ? s.referrerPolicy : void 0,
        imageSrcSet: typeof s.imageSrcSet == "string" ? s.imageSrcSet : void 0,
        imageSizes: typeof s.imageSizes == "string" ? s.imageSizes : void 0,
        media: typeof s.media == "string" ? s.media : void 0
      });
    }
  }, ae.preloadModule = function(d, s) {
    if (typeof d == "string")
      if (s) {
        var k = M(s.as, s.crossOrigin);
        c.d.m(d, {
          as: typeof s.as == "string" && s.as !== "script" ? s.as : void 0,
          crossOrigin: k,
          integrity: typeof s.integrity == "string" ? s.integrity : void 0
        });
      } else c.d.m(d);
  }, ae.requestFormReset = function(d) {
    c.d.r(d);
  }, ae.unstable_batchedUpdates = function(d, s) {
    return d(s);
  }, ae.useFormState = function(d, s, k) {
    return u.H.useFormState(d, s, k);
  }, ae.useFormStatus = function() {
    return u.H.useHostTransitionStatus();
  }, ae.version = "19.2.7", ae;
}
var se = {};
var je;
function Un() {
  return je || (je = 1, process.env.NODE_ENV !== "production" && (function() {
    function t() {
    }
    function n(i) {
      return "" + i;
    }
    function r(i, a, p) {
      var h = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
      try {
        n(h);
        var m = !1;
      } catch {
        m = !0;
      }
      return m && (console.error(
        "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
        typeof Symbol == "function" && Symbol.toStringTag && h[Symbol.toStringTag] || h.constructor.name || "Object"
      ), n(h)), {
        $$typeof: s,
        key: h == null ? null : "" + h,
        children: i,
        containerInfo: a,
        implementation: p
      };
    }
    function c(i, a) {
      if (i === "font") return "";
      if (typeof a == "string")
        return a === "use-credentials" ? a : "";
    }
    function f(i) {
      return i === null ? "`null`" : i === void 0 ? "`undefined`" : i === "" ? "an empty string" : 'something with type "' + typeof i + '"';
    }
    function E(i) {
      return i === null ? "`null`" : i === void 0 ? "`undefined`" : i === "" ? "an empty string" : typeof i == "string" ? JSON.stringify(i) : typeof i == "number" ? "`" + i + "`" : 'something with type "' + typeof i + '"';
    }
    function u() {
      var i = k.H;
      return i === null && console.error(
        `Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:
1. You might have mismatching versions of React and the renderer (such as React DOM)
2. You might be breaking the Rules of Hooks
3. You might have more than one copy of React in the same app
See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.`
      ), i;
    }
    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart == "function" && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
    var M = tt, d = {
      d: {
        f: t,
        r: function() {
          throw Error(
            "Invalid form element. requestFormReset must be passed a form that was rendered by React."
          );
        },
        D: t,
        C: t,
        L: t,
        m: t,
        X: t,
        S: t,
        M: t
      },
      p: 0,
      findDOMNode: null
    }, s = /* @__PURE__ */ Symbol.for("react.portal"), k = M.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    typeof Map == "function" && Map.prototype != null && typeof Map.prototype.forEach == "function" && typeof Set == "function" && Set.prototype != null && typeof Set.prototype.clear == "function" && typeof Set.prototype.forEach == "function" || console.error(
      "React depends on Map and Set built-in types. Make sure that you load a polyfill in older browsers. https://reactjs.org/link/react-polyfills"
    ), se.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = d, se.createPortal = function(i, a) {
      var p = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
      if (!a || a.nodeType !== 1 && a.nodeType !== 9 && a.nodeType !== 11)
        throw Error("Target container is not a DOM element.");
      return r(i, a, null, p);
    }, se.flushSync = function(i) {
      var a = k.T, p = d.p;
      try {
        if (k.T = null, d.p = 2, i)
          return i();
      } finally {
        k.T = a, d.p = p, d.d.f() && console.error(
          "flushSync was called from inside a lifecycle method. React cannot flush when React is already rendering. Consider moving this call to a scheduler task or micro task."
        );
      }
    }, se.preconnect = function(i, a) {
      typeof i == "string" && i ? a != null && typeof a != "object" ? console.error(
        "ReactDOM.preconnect(): Expected the `options` argument (second) to be an object but encountered %s instead. The only supported option at this time is `crossOrigin` which accepts a string.",
        E(a)
      ) : a != null && typeof a.crossOrigin != "string" && console.error(
        "ReactDOM.preconnect(): Expected the `crossOrigin` option (second argument) to be a string but encountered %s instead. Try removing this option or passing a string value instead.",
        f(a.crossOrigin)
      ) : console.error(
        "ReactDOM.preconnect(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
        f(i)
      ), typeof i == "string" && (a ? (a = a.crossOrigin, a = typeof a == "string" ? a === "use-credentials" ? a : "" : void 0) : a = null, d.d.C(i, a));
    }, se.prefetchDNS = function(i) {
      if (typeof i != "string" || !i)
        console.error(
          "ReactDOM.prefetchDNS(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
          f(i)
        );
      else if (1 < arguments.length) {
        var a = arguments[1];
        typeof a == "object" && a.hasOwnProperty("crossOrigin") ? console.error(
          "ReactDOM.prefetchDNS(): Expected only one argument, `href`, but encountered %s as a second argument instead. This argument is reserved for future options and is currently disallowed. It looks like the you are attempting to set a crossOrigin property for this DNS lookup hint. Browsers do not perform DNS queries using CORS and setting this attribute on the resource hint has no effect. Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.",
          E(a)
        ) : console.error(
          "ReactDOM.prefetchDNS(): Expected only one argument, `href`, but encountered %s as a second argument instead. This argument is reserved for future options and is currently disallowed. Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.",
          E(a)
        );
      }
      typeof i == "string" && d.d.D(i);
    }, se.preinit = function(i, a) {
      if (typeof i == "string" && i ? a == null || typeof a != "object" ? console.error(
        "ReactDOM.preinit(): Expected the `options` argument (second) to be an object with an `as` property describing the type of resource to be preinitialized but encountered %s instead.",
        E(a)
      ) : a.as !== "style" && a.as !== "script" && console.error(
        'ReactDOM.preinit(): Expected the `as` property in the `options` argument (second) to contain a valid value describing the type of resource to be preinitialized but encountered %s instead. Valid values for `as` are "style" and "script".',
        E(a.as)
      ) : console.error(
        "ReactDOM.preinit(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
        f(i)
      ), typeof i == "string" && a && typeof a.as == "string") {
        var p = a.as, h = c(p, a.crossOrigin), m = typeof a.integrity == "string" ? a.integrity : void 0, O = typeof a.fetchPriority == "string" ? a.fetchPriority : void 0;
        p === "style" ? d.d.S(
          i,
          typeof a.precedence == "string" ? a.precedence : void 0,
          {
            crossOrigin: h,
            integrity: m,
            fetchPriority: O
          }
        ) : p === "script" && d.d.X(i, {
          crossOrigin: h,
          integrity: m,
          fetchPriority: O,
          nonce: typeof a.nonce == "string" ? a.nonce : void 0
        });
      }
    }, se.preinitModule = function(i, a) {
      var p = "";
      typeof i == "string" && i || (p += " The `href` argument encountered was " + f(i) + "."), a !== void 0 && typeof a != "object" ? p += " The `options` argument encountered was " + f(a) + "." : a && "as" in a && a.as !== "script" && (p += " The `as` option encountered was " + E(a.as) + "."), p ? console.error(
        "ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` string and, optionally, an `options` object with a valid `as` property.%s",
        p
      ) : (p = a && typeof a.as == "string" ? a.as : "script", p) === "script" || (p = E(p), console.error(
        'ReactDOM.preinitModule(): Currently the only supported "as" type for this function is "script" but received "%s" instead. This warning was generated for `href` "%s". In the future other module types will be supported, aligning with the import-attributes proposal. Learn more here: (https://github.com/tc39/proposal-import-attributes)',
        p,
        i
      )), typeof i == "string" && (typeof a == "object" && a !== null ? (a.as == null || a.as === "script") && (p = c(
        a.as,
        a.crossOrigin
      ), d.d.M(i, {
        crossOrigin: p,
        integrity: typeof a.integrity == "string" ? a.integrity : void 0,
        nonce: typeof a.nonce == "string" ? a.nonce : void 0
      })) : a == null && d.d.M(i));
    }, se.preload = function(i, a) {
      var p = "";
      if (typeof i == "string" && i || (p += " The `href` argument encountered was " + f(i) + "."), a == null || typeof a != "object" ? p += " The `options` argument encountered was " + f(a) + "." : typeof a.as == "string" && a.as || (p += " The `as` option encountered was " + f(a.as) + "."), p && console.error(
        'ReactDOM.preload(): Expected two arguments, a non-empty `href` string and an `options` object with an `as` property valid for a `<link rel="preload" as="..." />` tag.%s',
        p
      ), typeof i == "string" && typeof a == "object" && a !== null && typeof a.as == "string") {
        p = a.as;
        var h = c(
          p,
          a.crossOrigin
        );
        d.d.L(i, p, {
          crossOrigin: h,
          integrity: typeof a.integrity == "string" ? a.integrity : void 0,
          nonce: typeof a.nonce == "string" ? a.nonce : void 0,
          type: typeof a.type == "string" ? a.type : void 0,
          fetchPriority: typeof a.fetchPriority == "string" ? a.fetchPriority : void 0,
          referrerPolicy: typeof a.referrerPolicy == "string" ? a.referrerPolicy : void 0,
          imageSrcSet: typeof a.imageSrcSet == "string" ? a.imageSrcSet : void 0,
          imageSizes: typeof a.imageSizes == "string" ? a.imageSizes : void 0,
          media: typeof a.media == "string" ? a.media : void 0
        });
      }
    }, se.preloadModule = function(i, a) {
      var p = "";
      typeof i == "string" && i || (p += " The `href` argument encountered was " + f(i) + "."), a !== void 0 && typeof a != "object" ? p += " The `options` argument encountered was " + f(a) + "." : a && "as" in a && typeof a.as != "string" && (p += " The `as` option encountered was " + f(a.as) + "."), p && console.error(
        'ReactDOM.preloadModule(): Expected two arguments, a non-empty `href` string and, optionally, an `options` object with an `as` property valid for a `<link rel="modulepreload" as="..." />` tag.%s',
        p
      ), typeof i == "string" && (a ? (p = c(
        a.as,
        a.crossOrigin
      ), d.d.m(i, {
        as: typeof a.as == "string" && a.as !== "script" ? a.as : void 0,
        crossOrigin: p,
        integrity: typeof a.integrity == "string" ? a.integrity : void 0
      })) : d.d.m(i));
    }, se.requestFormReset = function(i) {
      d.d.r(i);
    }, se.unstable_batchedUpdates = function(i, a) {
      return i(a);
    }, se.useFormState = function(i, a, p) {
      return u().useFormState(i, a, p);
    }, se.useFormStatus = function() {
      return u().useHostTransitionStatus();
    }, se.version = "19.2.7", typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop == "function" && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
  })()), se;
}
var qe;
function Hn() {
  if (qe) return ke.exports;
  qe = 1;
  function t() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function")) {
      if (process.env.NODE_ENV !== "production")
        throw new Error("^_^");
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(t);
      } catch (n) {
        console.error(n);
      }
    }
  }
  return process.env.NODE_ENV === "production" ? (t(), ke.exports = zn()) : ke.exports = Un(), ke.exports;
}
var nt = Hn();
function jn(t) {
  if (t.width <= 0 || t.height <= 0) return !1;
  try {
    const n = t.getContext("2d", { willReadFrequently: !0 });
    if (!n) return !1;
    const r = [0, Math.floor(t.width / 2), t.width - 1], c = [0, Math.floor(t.height / 2), t.height - 1], f = r.flatMap((E) => c.map((u) => n.getImageData(E, u, 1, 1).data));
    if (f.every((E) => E[3] === 0)) return !1;
    for (let E = 0; E < 3; E += 1) {
      const u = f.map((M) => M[E]);
      if (Math.max(...u) - Math.min(...u) > 6) return !0;
    }
    return !1;
  } catch {
    return !1;
  }
}
function rt({
  session: t,
  viewOnly: n,
  compact: r = !1,
  onReconnect: c,
  onDisconnect: f
}) {
  const E = q(null), u = q(f), [M, d] = S("connecting"), [s, k] = S();
  return U(() => {
    u.current = f;
  }, [f]), U(() => {
    if (!E.current) return;
    let i = !1, a = !1, p = !1, h = !1, m, O, A, R;
    (r ? E.current.closest(".computer-preview") : null)?.style.removeProperty("aspect-ratio"), d("connecting"), k(void 0);
    const G = () => {
      m && window.clearInterval(m), O && window.clearTimeout(O), m = void 0, O = void 0;
    }, v = () => {
      A && window.clearTimeout(A), A = void 0;
    }, D = () => {
      h || (h = !0, u.current?.());
    }, V = (j) => {
      i || a || (a = !0, v(), G(), k(j), d("disconnected"), D(), R?.disconnect());
    }, ee = () => {
      const j = E.current?.querySelector("canvas");
      return j ? jn(j) : !1;
    }, J = () => {
      i || a || (v(), p = !0, m = window.setInterval(() => {
        !i && ee() && (G(), d("connected"));
      }, 100), O = window.setTimeout(() => {
        ee() || V("This computer connected but never drew a frame.");
      }, 8e3));
    }, le = (j) => {
      if (i || a) return;
      v(), G();
      const ne = j.detail?.clean;
      k((re) => re ?? (p && ne ? "This computer stopped before drawing a frame." : ne ? "This computer disconnected." : "The connection to this computer was lost.")), d("disconnected"), D();
    }, F = (j) => {
      V(j.detail?.reason ?? "Screen security negotiation failed.");
    }, X = () => V("This computer's screen is asking for a VNC password.");
    return A = window.setTimeout(() => V("This computer's screen did not answer."), 15e3), import("./chunk-rfb-DFY61DWN.js").then(({ default: j }) => {
      i || a || !E.current || (R = new j(E.current, t.url, { shared: !0, wsProtocols: t.protocols }), R.viewOnly = n, R.scaleViewport = !0, R.resizeSession = !1, r && (R.background = "transparent"), R.addEventListener("connect", J), R.addEventListener("disconnect", le), R.addEventListener("securityfailure", F), R.addEventListener("credentialsrequired", X));
    }).catch(() => V("Could not load the screen client.")), () => {
      i = !0, v(), G(), R?.removeEventListener("connect", J), R?.removeEventListener("disconnect", le), R?.removeEventListener("securityfailure", F), R?.removeEventListener("credentialsrequired", X), R?.disconnect();
    };
  }, [r, t, n]), /* @__PURE__ */ e.createElement("div", { className: `vnc-viewport ${r ? "is-compact" : ""}` }, /* @__PURE__ */ e.createElement("div", { ref: E, className: "vnc-target" }), M !== "connected" && /* @__PURE__ */ e.createElement("div", { className: "vnc-status", role: "status" }, M === "connecting" ? /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement(De, { size: r ? 14 : 18, className: "spin" }), !r && "Connecting…") : /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("span", null, r ? "Screen unavailable" : s), c && /* @__PURE__ */ e.createElement("button", { className: "secondary-button", onClick: c }, "Reconnect"))));
}
function qn({
  session: t,
  failure: n,
  title: r,
  onClose: c,
  onReconnect: f
}) {
  return nt.createPortal(/* @__PURE__ */ e.createElement("div", { className: "vnc-desktop", role: "dialog", "aria-label": r }, /* @__PURE__ */ e.createElement("div", { className: "vnc-titlebar", "aria-hidden": "true" }), /* @__PURE__ */ e.createElement("button", { className: "vnc-close", "aria-label": "Close this screen", onClick: c }, /* @__PURE__ */ e.createElement(Zt, { size: 18 })), t ? /* @__PURE__ */ e.createElement(rt, { session: t, viewOnly: !1, onReconnect: f }) : /* @__PURE__ */ e.createElement("div", { className: "vnc-viewport" }, /* @__PURE__ */ e.createElement("div", { className: "vnc-status", role: "status" }, n ? /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("span", null, n), /* @__PURE__ */ e.createElement("button", { className: "secondary-button", onClick: f }, "Reconnect")) : /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement(De, { size: 18, className: "spin" }), " Connecting…")))), document.body);
}
function Vn({
  open: t,
  width: n,
  onResize: r,
  agentName: c,
  computer: f,
  approvals: E,
  routines: u,
  grants: M,
  grantsBusy: d,
  audit: s,
  auditLoading: k,
  auditView: i,
  auditHasMore: a,
  onApproval: p,
  onComputerAction: h,
  onDeleteRoutine: m,
  onSetGrant: O,
  onClearGrant: A,
  onChangeAuditView: R,
  onLoadMoreAudit: $,
  onClose: G
}) {
  const [v, D] = S(""), [V, ee] = S(""), [J, le] = S(!1), [F, X] = S(() => /* @__PURE__ */ new Map()), [j, ne] = S(""), [re, oe] = S(() => /* @__PURE__ */ new Set()), [fe, H] = S(), [K, Q] = S(!1), [z, Y] = S(), ue = E.filter((y) => y.status === "pending"), ie = F.get(f?.id ?? ""), x = re.has(f?.id ?? ""), I = q(h);
  U(() => {
    I.current = h;
  }, [h]), U(() => {
    const y = f?.id;
    if (!t || K || f?.status !== "online" || !y || ie || x) return;
    let C = !0;
    return ne(y), I.current("open").then((g) => {
      C && (X((o) => new Map(o).set(y, g)), ne(""));
    }).catch(() => {
      C && (oe((g) => new Set(g).add(y)), ne(""));
    }), () => {
      C = !1;
    };
  }, [f?.id, f?.status, K, t, x, ie]);
  async function B(y) {
    Q(!0), H(void 0), Y(void 0), le(!0);
    const C = f?.id;
    C && re.has(C) && (oe((g) => {
      const o = new Set(g);
      return o.delete(C), o;
    }), X((g) => {
      const o = new Map(g);
      return o.delete(C), o;
    }));
    try {
      H(await h(y));
    } catch (g) {
      Y(g instanceof Error ? g.message : "Could not reach that computer.");
    } finally {
      le(!1);
    }
  }
  function b() {
    Q(!1), H(void 0), Y(void 0);
  }
  const N = () => window.innerWidth <= 1030 ? Math.min(730, window.innerWidth - 40) : Math.min(730, window.innerWidth - (window.innerWidth <= 1180 ? 672 : 732));
  U(() => {
    const y = () => {
      const C = Math.max(280, N());
      n > C && r(C);
    };
    return y(), window.addEventListener("resize", y), () => window.removeEventListener("resize", y);
  }, [r, n]);
  const P = (y) => r(Math.max(280, Math.min(N(), window.innerWidth - y)));
  return /* @__PURE__ */ e.createElement("aside", { className: `detail-panel ${t ? "is-open" : "is-closing"}`, style: { width: n } }, /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "detail-resize-handle",
      role: "separator",
      "aria-label": "Resize the details panel",
      "aria-orientation": "vertical",
      "aria-valuemin": 280,
      "aria-valuemax": Math.max(280, N()),
      "aria-valuenow": n,
      tabIndex: 0,
      onKeyDown: (y) => {
        y.key === "ArrowLeft" ? (y.preventDefault(), r(Math.min(N(), n + 16))) : y.key === "ArrowRight" && (y.preventDefault(), r(Math.max(280, n - 16)));
      },
      onPointerDown: (y) => {
        y.currentTarget.setPointerCapture(y.pointerId), P(y.clientX);
      },
      onPointerMove: (y) => {
        y.currentTarget.hasPointerCapture(y.pointerId) && P(y.clientX);
      }
    }
  ), /* @__PURE__ */ e.createElement("header", null, /* @__PURE__ */ e.createElement("button", { className: "icon-button", "aria-label": "Close the details panel", onClick: G }, /* @__PURE__ */ e.createElement(qt, { size: 18 }))), ue.map((y) => /* @__PURE__ */ e.createElement("section", { className: "approval-card", key: y.id }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow warning" }, /* @__PURE__ */ e.createElement(Ze, { size: 14 }), " Waiting for you", y.source && y.source !== y.agentId && /* @__PURE__ */ e.createElement("span", { className: "approval-source" }, y.source), y.ref && /* @__PURE__ */ e.createElement("code", { className: "approval-ref", title: "Reply with this in the thread to decide without opening the panel" }, y.ref)), /* @__PURE__ */ e.createElement("h3", null, y.title), y.description && /* @__PURE__ */ e.createElement("p", null, y.description), y.scope.length > 0 && /* @__PURE__ */ e.createElement("div", { className: "scope" }, /* @__PURE__ */ e.createElement("span", null, "This allows:"), y.scope.map((C) => /* @__PURE__ */ e.createElement("div", { key: C }, /* @__PURE__ */ e.createElement(Ie, { size: 13 }), C))), /* @__PURE__ */ e.createElement(
    "textarea",
    {
      "aria-label": "Note for this decision",
      placeholder: "Add a note (optional)",
      value: v,
      onChange: (C) => D(C.target.value)
    }
  ), /* @__PURE__ */ e.createElement("div", { className: "approval-actions" }, /* @__PURE__ */ e.createElement("button", { className: "secondary-button danger-text", onClick: () => {
    p(y.id, "deny", v, y.contentHash);
  } }, "Discard"), /* @__PURE__ */ e.createElement("button", { className: "primary-button", onClick: () => {
    p(y.id, "allow", v, y.contentHash);
  } }, "Approve")))), /* @__PURE__ */ e.createElement("section", { className: "screen-section" }, /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "screen-trigger",
      disabled: J || f?.status !== "online",
      "aria-label": `Open ${c}'s screen`,
      onClick: () => {
        B("open");
      }
    },
    /* @__PURE__ */ e.createElement("span", { className: "computer-preview" }, [...F].map(([y, C]) => /* @__PURE__ */ e.createElement(
      "span",
      {
        className: `computer-preview-stream ${y === f?.id ? "is-active" : ""}`,
        key: y
      },
      /* @__PURE__ */ e.createElement(
        rt,
        {
          session: C,
          viewOnly: !0,
          compact: !0,
          onDisconnect: () => oe((g) => new Set(g).add(y))
        }
      )
    )), !F.has(f?.id ?? "") && (j === f?.id ? /* @__PURE__ */ e.createElement("span", { className: "computer-preview-loading", role: "status", "aria-label": `Loading ${c}'s screen` }, /* @__PURE__ */ e.createElement(De, { size: 18, className: "spin" })) : re.has(f?.id ?? "") ? /* @__PURE__ */ e.createElement("span", { className: "computer-preview-loading", role: "status" }, "Screen unavailable") : /* @__PURE__ */ e.createElement("span", { className: "computer-screen-off", "aria-hidden": "true" })), /* @__PURE__ */ e.createElement("span", { className: "screen-hover-action" }, /* @__PURE__ */ e.createElement(Jt, { size: 14 }), " Open"))
  ), /* @__PURE__ */ e.createElement("div", { className: "screen-caption" }, /* @__PURE__ */ e.createElement("span", null, c, "'s screen"), /* @__PURE__ */ e.createElement("span", { className: `screen-state ${f?.status ?? "offline"}` }, f?.status === "online" ? "Running" : f?.status === "starting" ? "Starting…" : "Off")), f && f.status !== "online" && /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "secondary-button",
      disabled: J,
      onClick: () => {
        B("takeover");
      }
    },
    "Start this computer"
  ), f?.error && /* @__PURE__ */ e.createElement("p", { className: "screen-error" }, f.error)), u.length > 0 && /* @__PURE__ */ e.createElement("section", { className: "routines-section" }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow" }, "Routines"), u.map((y) => /* @__PURE__ */ e.createElement("div", { className: "routine-row", key: y.id }, /* @__PURE__ */ e.createElement("div", null, /* @__PURE__ */ e.createElement("strong", null, y.name), /* @__PURE__ */ e.createElement("span", null, y.schedule)), /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "icon-button",
      "aria-label": `Cancel the routine ${y.name}`,
      onClick: () => {
        m(y.id);
      }
    },
    /* @__PURE__ */ e.createElement(Qe, { size: 14 })
  )))), /* @__PURE__ */ e.createElement("section", { className: "drawer-section" }, /* @__PURE__ */ e.createElement("div", { className: "drawer-tabs", role: "tablist", "aria-label": "More about this teammate" }, /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": V === "permissions",
      className: V === "permissions" ? "is-current" : "",
      onClick: () => ee((y) => y === "permissions" ? "" : "permissions")
    },
    "Permissions"
  ), /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": V === "audit",
      className: V === "audit" ? "is-current" : "",
      onClick: () => ee((y) => y === "audit" ? "" : "audit")
    },
    "History"
  )), V === "permissions" && /* @__PURE__ */ e.createElement(
    Pn,
    {
      agentName: c,
      grants: M,
      busy: d,
      onSetGrant: O,
      onClearGrant: A
    }
  ), V === "audit" && /* @__PURE__ */ e.createElement(
    Dn,
    {
      events: s,
      loading: k,
      viewId: i,
      hasMore: a,
      onChangeView: R,
      onLoadMore: $
    }
  )), K && /* @__PURE__ */ e.createElement(
    qn,
    {
      session: fe,
      failure: z,
      title: `${c}'s computer`,
      onClose: b,
      onReconnect: () => {
        B("takeover");
      }
    }
  ));
}
function Fn({
  value: t,
  options: n,
  ariaLabel: r,
  placeholder: c = "Select",
  onChange: f,
  onOpen: E
}) {
  const [u, M] = S(!1), [d, s] = S(), k = q(null), i = q(null), a = n.find((m) => m.value === t);
  U(() => {
    if (!u) return;
    const m = () => {
      const A = k.current?.getBoundingClientRect();
      if (!A) return;
      const R = 5, $ = 8, G = Math.max(A.width, 180), v = Math.min(220, n.length * 32 + 10), D = window.innerHeight - A.bottom - $, V = D < v && A.top - $ > D;
      s({
        position: "fixed",
        zIndex: 100,
        left: Math.max($, Math.min(A.right - G, window.innerWidth - G - $)),
        top: V ? Math.max($, A.top - v - R) : A.bottom + R,
        width: G,
        maxHeight: V ? Math.min(220, A.top - R - $) : Math.min(220, D)
      });
    }, O = (A) => {
      const R = A.target;
      !k.current?.contains(R) && !i.current?.contains(R) && M(!1);
    };
    return m(), window.addEventListener("pointerdown", O), window.addEventListener("resize", m), window.addEventListener("scroll", m, !0), () => {
      window.removeEventListener("pointerdown", O), window.removeEventListener("resize", m), window.removeEventListener("scroll", m, !0);
    };
  }, [u, n.length]);
  const p = (m) => {
    const O = n.filter(($) => !$.disabled && !$.action);
    if (!O.length) return;
    const A = O.findIndex(($) => $.value === t), R = A < 0 ? m > 0 ? 0 : O.length - 1 : (A + m + O.length) % O.length;
    f(O[R].value);
  }, h = () => M((m) => (m || E?.(), !m));
  return /* @__PURE__ */ e.createElement("div", { className: `crew-select ${u ? "open" : ""}`, ref: k }, /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "crew-select-trigger",
      "aria-label": r,
      "aria-haspopup": "listbox",
      "aria-expanded": u,
      onClick: h,
      onKeyDown: (m) => {
        if (m.key === "Escape") {
          M(!1);
          return;
        }
        (m.key === "ArrowDown" || m.key === "ArrowUp") && (m.preventDefault(), p(m.key === "ArrowDown" ? 1 : -1), u || E?.(), M(!0));
      }
    },
    /* @__PURE__ */ e.createElement("span", null, a?.label ?? c),
    /* @__PURE__ */ e.createElement("span", { className: "crew-select-chevron" }, /* @__PURE__ */ e.createElement(jt, { size: 15 }))
  ), u && d && nt.createPortal(
    /* @__PURE__ */ e.createElement(
      "div",
      {
        className: "crew-select-menu crew-select-menu-portal",
        ref: i,
        style: d,
        role: "listbox",
        "aria-label": r
      },
      n.map((m) => /* @__PURE__ */ e.createElement(
        "button",
        {
          type: "button",
          className: `${m.action ? "crew-select-action" : ""} ${m.action || m.icon ? "crew-select-has-icon" : ""}`,
          role: "option",
          "aria-selected": !m.action && m.value === t,
          disabled: m.disabled,
          key: m.value,
          onClick: () => {
            m.action?.(), m.action || f(m.value), M(!1);
          }
        },
        (m.action || m.icon) && /* @__PURE__ */ e.createElement("span", { className: "crew-select-check", "aria-hidden": "true" }, m.icon),
        /* @__PURE__ */ e.createElement("span", { className: "crew-select-label", title: m.label }, m.label),
        !m.action && /* @__PURE__ */ e.createElement("span", { className: "crew-select-check", "aria-hidden": "true" }, m.value === t && /* @__PURE__ */ e.createElement(Ie, { size: 14 }))
      ))
    ),
    document.body
  ));
}
const Bn = ["🤖", "🔎", "📥", "📈", "🎖️", "🧭", "🛠️", "📚", "🧪", "✍️", "🗂️", "🛰️"];
function Ve({
  editing: t,
  providers: n,
  busy: r,
  error: c,
  onSubmit: f,
  onClose: E
}) {
  const [u, M] = S(t?.name ?? ""), [d, s] = S(t?.role ?? ""), [k, i] = S(t?.avatar || "🤖"), [a, p] = S("");
  U(() => {
    const m = (O) => {
      O.key === "Escape" && E();
    };
    return window.addEventListener("keydown", m), () => window.removeEventListener("keydown", m);
  }, [E]);
  const h = !!u.trim() && !r;
  return /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "palette-backdrop",
      role: "presentation",
      onMouseDown: (m) => {
        m.target === m.currentTarget && E();
      }
    },
    /* @__PURE__ */ e.createElement(
      "form",
      {
        className: "crew-dialog",
        role: "dialog",
        "aria-modal": "true",
        "aria-label": t ? `Edit ${t.name}` : "Hire a teammate",
        onSubmit: (m) => {
          m.preventDefault(), h && f({ name: u.trim(), role: d.trim(), emoji: k, modelProviderId: a });
        }
      },
      /* @__PURE__ */ e.createElement("h2", null, t ? `Edit ${t.name}` : "Hire a teammate"),
      /* @__PURE__ */ e.createElement("label", { className: "crew-field" }, /* @__PURE__ */ e.createElement("span", null, "Name"), /* @__PURE__ */ e.createElement(
        "input",
        {
          autoFocus: !t,
          value: u,
          disabled: !!t,
          placeholder: "Scout",
          onChange: (m) => M(m.target.value)
        }
      ), t && /* @__PURE__ */ e.createElement("small", null, "A teammate's name is its profile directory, so it cannot be changed here.")),
      /* @__PURE__ */ e.createElement("label", { className: "crew-field" }, /* @__PURE__ */ e.createElement("span", null, "Their job, in one line"), /* @__PURE__ */ e.createElement(
        "input",
        {
          autoFocus: !!t,
          value: d,
          placeholder: "Turns a one-line question into a decision-ready brief with sources",
          onChange: (m) => s(m.target.value)
        }
      )),
      /* @__PURE__ */ e.createElement("div", { className: "crew-field" }, /* @__PURE__ */ e.createElement("span", null, "Face"), /* @__PURE__ */ e.createElement("div", { className: "crew-emoji-row" }, Bn.map((m) => /* @__PURE__ */ e.createElement(
        "button",
        {
          type: "button",
          key: m,
          className: `crew-emoji ${m === k ? "selected" : ""}`,
          "aria-label": `Use ${m}`,
          "aria-pressed": m === k,
          onClick: () => i(m)
        },
        m
      )))),
      !t && n.length > 0 && /* @__PURE__ */ e.createElement("div", { className: "crew-field" }, /* @__PURE__ */ e.createElement("span", null, "Model"), /* @__PURE__ */ e.createElement(
        Fn,
        {
          ariaLabel: "Model provider",
          placeholder: "Same as your default profile",
          value: a,
          options: [
            // Cloning the default profile is what gives a new teammate working
            // credentials immediately, so it is the option that needs no
            // explanation and therefore the one that comes first.
            { value: "", label: "Same as your default profile" },
            ...n.map((m) => ({
              value: m.id,
              label: m.defaultModel ? `${m.name} · ${m.defaultModel}` : m.name
            }))
          ],
          onChange: p
        }
      )),
      c && /* @__PURE__ */ e.createElement("p", { className: "crew-dialog-error" }, c),
      /* @__PURE__ */ e.createElement("div", { className: "crew-dialog-actions" }, /* @__PURE__ */ e.createElement("button", { type: "button", className: "secondary-button", onClick: E }, "Cancel"), /* @__PURE__ */ e.createElement("button", { className: "primary-button", disabled: !h }, r ? "Working…" : t ? "Save" : "Hire"))
    )
  );
}
const at = "hermes-crew:detail-width";
function Wn() {
  try {
    const t = window.localStorage?.getItem(at), n = t ? Number.parseInt(t, 10) : Number.NaN;
    return Number.isFinite(n) ? Math.max(280, n) : 360;
  } catch {
    return 360;
  }
}
function Gn({ client: t, notify: n }) {
  const r = Dt(t, { notify: n }), [c, f] = S(""), [E, u] = S([]), [M, d] = S([]), [s, k] = S([]), [i, a] = S(!1), [p, h] = S([]), [m, O] = S(!1), [A, R] = S({ id: "all", types: [] }), [$, G] = S(null), [v, D] = S(!1), [V, ee] = S(Wn), [J, le] = S(!1), [F, X] = S(), [j, ne] = S(!1), [re, oe] = S(), [fe, H] = S(0), { agents: K, conversations: Q, selectedAgent: z, selectedAgentId: Y, selectedThreadId: ue } = r, ie = me(() => Q.filter((o) => o.kind === "group"), [Q]), x = me(() => new Map(K.map((o) => [o.id, o])), [K]), I = me(
    () => Q.find((o) => o.id === ue),
    [Q, ue]
  ), B = r.approvals.filter((o) => o.status === "pending").length;
  U(() => {
    try {
      window.localStorage?.setItem(at, String(V));
    } catch {
    }
  }, [V]);
  const b = we(() => {
    t.listSections().then(u).catch(() => u([]));
  }, [t]);
  U(b, [b, K.length]), U(() => {
    if (!Y) {
      d([]);
      return;
    }
    let o = !0;
    return t.listRoutines(Y).then((l) => {
      o && d(l);
    }).catch(() => {
      o && d([]);
    }), () => {
      o = !1;
    };
  }, [t, Y]), U(() => {
    if (!Y) {
      k([]);
      return;
    }
    let o = !0;
    return t.listGrants(Y).then((l) => {
      o && k(l);
    }).catch(() => {
      o && k([]);
    }), () => {
      o = !1;
    };
  }, [t, Y]);
  const N = we((o, l) => {
    if (!Y) {
      h([]), G(null);
      return;
    }
    O(!0), t.listAuditEvents({
      agentId: Y,
      eventTypes: o,
      beforeId: l,
      limit: 50
    }).then((w) => {
      h((T) => l ? [...T, ...w.events] : w.events), G(w.nextBeforeId);
    }).catch(() => {
      l || (h([]), G(null));
    }).finally(() => O(!1));
  }, [t, Y]);
  U(() => {
    N(A.types);
  }, [N, A]), U(() => {
    B > 0 && D(!0);
  }, [B]), U(() => {
    const o = (l) => {
      (l.metaKey || l.ctrlKey) && l.key.toLowerCase() === "k" && (l.preventDefault(), le((w) => !w));
    };
    return window.addEventListener("keydown", o), () => window.removeEventListener("keydown", o);
  }, []);
  const P = (o, l) => {
    const w = E.map((T) => T.id === o ? { ...T, collapsed: l } : T);
    u(w), t.saveSections(w).then(u).catch(b);
  }, y = (o, l) => {
    if (l === "edit") {
      oe(void 0), X({ editing: o });
      return;
    }
    if (l === "duplicate") {
      r.duplicateAgent(o.id).catch(() => {
      });
      return;
    }
    window.confirm(`Remove ${o.name} from the crew? Their profile, memory and skills stay on disk.`) && r.deleteAgent(o.id).catch(() => {
    });
  }, C = async (o) => {
    ne(!0), oe(void 0);
    try {
      F?.editing ? await r.updateAgent(F.editing.id, { role: o.role, emoji: o.emoji }) : await r.createAgent({
        name: o.name,
        role: o.role,
        emoji: o.emoji,
        modelProviderId: o.modelProviderId || void 0
      }), X(void 0), b();
    } catch (l) {
      oe(l instanceof Error ? l.message : "That did not work.");
    } finally {
      ne(!1);
    }
  }, g = me(() => ({
    onDecide: (o, l) => {
      r.respondToApproval(o, l).catch(() => {
      });
    },
    // A login request is the one chip that is an instruction to the operator,
    // so its button does the thing rather than pointing at where the thing is.
    onOpenScreen: () => {
      D(!0), r.openComputer("takeover").catch(() => {
      });
    },
    screenshotUrl: (o, l) => t.screenshotUrl(o, l)
  }), [t, r]);
  return r.loading ? /* @__PURE__ */ e.createElement("div", { className: "crew-workspace is-loading", role: "status" }, "Loading your crew…") : K.length ? /* @__PURE__ */ e.createElement("div", { className: "crew-workspace" }, /* @__PURE__ */ e.createElement(
    ln,
    {
      agents: K,
      sections: E,
      rooms: ie,
      selectedAgentId: Y,
      selectedThreadId: ue,
      search: c,
      onSearch: f,
      onSelectAgent: (o) => {
        r.setSelectedAgentId(o), H((l) => l + 1);
      },
      onSelectThread: (o) => {
        r.setSelectedThreadId(o), H((l) => l + 1);
      },
      onAction: y,
      onCreate: () => {
        oe(void 0), X({});
      },
      onToggleSection: P
    }
  ), /* @__PURE__ */ e.createElement(
    An,
    {
      agent: z,
      thread: I,
      agentsById: x,
      messages: r.messages,
      activities: r.activities,
      chips: g,
      loading: r.conversationLoading,
      focusRequest: fe,
      onSend: (o) => r.sendMessage(o).catch(() => {
      }),
      onToggleDetails: () => D((o) => !o)
    }
  ), v && z && /* @__PURE__ */ e.createElement(
    Vn,
    {
      open: v,
      width: V,
      onResize: ee,
      agentName: z.name,
      computer: r.computer,
      approvals: r.approvals,
      routines: M,
      grants: s,
      grantsBusy: i,
      audit: p,
      auditLoading: m,
      auditView: A.id,
      auditHasMore: $ !== null,
      onApproval: (o, l, w, T) => r.respondToApproval(o, l, w, T),
      onComputerAction: (o) => r.openComputer(o),
      onDeleteRoutine: async (o) => {
        await t.deleteRoutine(z.id, o), d((l) => l.filter((w) => w.id !== o));
      },
      onSetGrant: async (o, l) => {
        a(!0);
        try {
          const w = await t.setGrant({ agentId: z.id, tool: o, mode: l });
          k((T) => T.map((_) => _.tool === o ? { ..._, ...w } : _));
        } finally {
          a(!1);
        }
      },
      onClearGrant: async (o) => {
        a(!0);
        try {
          const l = await t.clearGrant(z.id, o);
          k((w) => w.map((T) => T.tool === o ? { ...T, ...l } : T));
        } finally {
          a(!1);
        }
      },
      onChangeAuditView: (o, l) => R({ id: o, types: l }),
      onLoadMoreAudit: () => {
        $ !== null && N(A.types, $);
      },
      onClose: () => D(!1)
    }
  ), /* @__PURE__ */ e.createElement(
    dn,
    {
      open: J,
      agents: K,
      rooms: ie,
      onClose: () => le(!1),
      onSelectAgent: r.setSelectedAgentId,
      onSelectThread: r.setSelectedThreadId,
      onCreateAgent: () => {
        oe(void 0), X({});
      },
      onComputer: () => D(!0)
    }
  ), F && /* @__PURE__ */ e.createElement(
    Ve,
    {
      editing: F.editing,
      providers: r.modelProviders,
      busy: j,
      error: re,
      onSubmit: C,
      onClose: () => X(void 0)
    }
  ), r.error && /* @__PURE__ */ e.createElement("div", { className: "crew-toast", role: "alert" }, /* @__PURE__ */ e.createElement("span", null, r.error), /* @__PURE__ */ e.createElement("button", { className: "icon-button", "aria-label": "Dismiss", onClick: r.dismissError }, "×"))) : /* @__PURE__ */ e.createElement("div", { className: "crew-workspace is-empty" }, /* @__PURE__ */ e.createElement("div", { className: "crew-empty-card" }, /* @__PURE__ */ e.createElement("h2", null, "No teammates yet"), /* @__PURE__ */ e.createElement("p", null, "A teammate is a Hermes profile with a thread, a memory and a computer of its own. Give one a name and a one-line job to start."), /* @__PURE__ */ e.createElement("button", { className: "primary-button", onClick: () => {
    oe(void 0), X({});
  } }, "Hire your first teammate")), F && /* @__PURE__ */ e.createElement(
    Ve,
    {
      providers: r.modelProviders,
      busy: j,
      error: re,
      onSubmit: C,
      onClose: () => X(void 0)
    }
  ));
}
const Ce = 500, Kn = 15e3;
function Yn(t, n) {
  return t === 401 || t === 403 ? new ge("unauthorized", n) : t === 404 ? new ge("not_found", n) : t === 409 ? new ge("conflict", n) : new ge("unknown", n, t >= 500);
}
function Xn(t) {
  const n = new URL(t, globalThis.location?.href ?? "http://127.0.0.1");
  return n.protocol = n.protocol === "https:" ? "wss:" : "ws:", n.pathname = `${n.pathname.replace(/\/+$/, "")}/v1/events`, n.toString();
}
class Jn {
  baseUrl;
  resolveEventsUrl;
  fetchImpl;
  headers;
  /**
   * One socket for the whole crew, shared by every subscriber.
   *
   * The backend tails the database globally rather than per thread, so opening
   * a socket per conversation would mean N copies of every frame. Subscribers
   * filter by thread id on arrival.
   */
  socket;
  listeners = /* @__PURE__ */ new Set();
  reconnectDelay = Ce;
  reconnectTimer;
  opening = !1;
  closed = !1;
  constructor(n) {
    this.baseUrl = n.baseUrl.replace(/\/+$/, "");
    const r = n.eventsUrl ?? Xn(this.baseUrl);
    this.resolveEventsUrl = typeof r == "function" ? r : async () => r, this.fetchImpl = n.fetchImpl ?? ((c, f) => fetch(c, f)), this.headers = n.headers ?? (() => ({}));
  }
  async request(n, r = {}) {
    let c;
    try {
      c = await this.fetchImpl(`${this.baseUrl}${n}`, {
        ...r,
        headers: {
          ...r.body ? { "Content-Type": "application/json" } : {},
          ...this.headers(),
          ...r.headers ?? {}
        }
      });
    } catch (f) {
      throw f instanceof DOMException && f.name === "AbortError" ? f : new ge("network", "Could not reach the crew backend.", !0);
    }
    if (!c.ok) {
      const f = await c.json().then((E) => E?.detail).catch(() => {
      });
      throw Yn(c.status, f ?? `Crew request failed (${c.status})`);
    }
    if (c.status !== 204)
      return await c.json();
  }
  listModelProviders(n) {
    return this.request("/v1/model-providers", { signal: n });
  }
  listAgents(n) {
    return this.request("/v1/agents", { signal: n });
  }
  getAgent(n, r) {
    return this.request(`/v1/agents/${encodeURIComponent(n)}`, { signal: r });
  }
  createAgent(n, r) {
    return this.request("/v1/agents", {
      method: "POST",
      body: JSON.stringify(n),
      signal: r
    });
  }
  updateAgent(n, r, c) {
    return this.request(`/v1/agents/${encodeURIComponent(n)}`, {
      method: "PATCH",
      body: JSON.stringify(r),
      signal: c
    });
  }
  async deleteAgent(n, r) {
    await this.request(`/v1/agents/${encodeURIComponent(n)}`, {
      method: "DELETE",
      signal: r
    });
  }
  duplicateAgent(n, r) {
    return this.request(`/v1/agents/${encodeURIComponent(n)}/duplicate`, {
      method: "POST",
      signal: r
    });
  }
  listConversations(n, r) {
    const c = n ? `?agentId=${encodeURIComponent(n)}` : "";
    return this.request(`/v1/conversations${c}`, { signal: r });
  }
  getConversation(n, r) {
    return this.request(
      `/v1/conversations/${encodeURIComponent(n)}`,
      { signal: r }
    );
  }
  sendMessage(n) {
    return this.request(
      `/v1/conversations/${encodeURIComponent(n.conversationId)}/messages`,
      { method: "POST", body: JSON.stringify({ text: n.text }), signal: n.signal }
    );
  }
  listApprovalRequests(n, r) {
    const c = n ? `?agentId=${encodeURIComponent(n)}` : "";
    return this.request(`/v1/approvals${c}`, { signal: r });
  }
  respondToApproval(n, r) {
    return this.request(
      `/v1/approvals/${encodeURIComponent(n.requestId)}/respond`,
      {
        method: "POST",
        body: JSON.stringify({
          decision: n.decision,
          note: n.note ?? "",
          // The hash of the card the operator actually read. The server
          // refuses a decision made against a stale one rather than
          // recording consent to something else.
          contentHash: n.contentHash ?? ""
        }),
        signal: r
      }
    );
  }
  getComputer(n, r) {
    return this.request(`/v1/agents/${encodeURIComponent(n)}/computer`, {
      signal: r
    });
  }
  openComputer(n, r) {
    return this.request(
      `/v1/agents/${encodeURIComponent(n)}/computer/open`,
      { method: "POST", signal: r }
    );
  }
  takeOverComputer(n, r) {
    return this.request(
      `/v1/agents/${encodeURIComponent(n)}/computer/takeover`,
      { method: "POST", signal: r }
    );
  }
  async reconnect(n) {
    this.closeSocket(), this.reconnectDelay = Ce, this.listeners.size && this.openSocket(), await this.listAgents(n);
  }
  listSections(n) {
    return this.request("/sections", { signal: n }).then((r) => r.sections);
  }
  saveSections(n, r) {
    return this.request("/sections", {
      method: "PUT",
      body: JSON.stringify(n),
      signal: r
    }).then((c) => c.sections);
  }
  listRoutines(n, r) {
    return this.request(
      `/bots/${encodeURIComponent(n)}/routines`,
      { signal: r }
    ).then((c) => c.routines);
  }
  async deleteRoutine(n, r, c) {
    await this.request(
      `/bots/${encodeURIComponent(n)}/routines/${encodeURIComponent(r)}`,
      { method: "DELETE", signal: c }
    );
  }
  listGrants(n, r) {
    return this.request(
      `/bots/${encodeURIComponent(n)}/grants`,
      { signal: r }
    ).then((c) => c.grants);
  }
  setGrant(n, r) {
    return this.request(
      `/bots/${encodeURIComponent(n.agentId)}/grants/${encodeURIComponent(n.tool)}`,
      { method: "PUT", body: JSON.stringify({ mode: n.mode, note: n.note ?? "" }), signal: r }
    );
  }
  clearGrant(n, r, c) {
    return this.request(
      `/bots/${encodeURIComponent(n)}/grants/${encodeURIComponent(r)}`,
      { method: "DELETE", signal: c }
    );
  }
  listAuditEvents(n = {}, r) {
    const c = new URLSearchParams();
    n.agentId && c.set("bot_id", n.agentId), n.eventTypes?.length && c.set("event_type", n.eventTypes.join(",")), n.beforeId && c.set("before_id", String(n.beforeId)), n.limit && c.set("limit", String(n.limit));
    const f = c.toString();
    return this.request(`/audit${f ? `?${f}` : ""}`, { signal: r });
  }
  screenshotUrl(n, r) {
    return `${this.baseUrl}/screenshots/${encodeURIComponent(n)}/${encodeURIComponent(r)}`;
  }
  subscribeToConversationEvents(n, r) {
    const c = (f) => {
      "threadId" in f && f.threadId && f.threadId !== n || r(f);
    };
    return this.listeners.add(c), this.closed = !1, this.openSocket(), {
      unsubscribe: () => {
        this.listeners.delete(c), this.listeners.size || (this.closed = !0, this.closeSocket());
      }
    };
  }
  emit(n) {
    for (const r of [...this.listeners]) r(n);
  }
  openSocket() {
    this.socket || this.opening || this.closed || (this.opening = !0, this.resolveEventsUrl().then((n) => {
      this.opening = !1, this.attach(n);
    }).catch(() => {
      this.opening = !1, this.scheduleReconnect();
    }));
  }
  attach(n) {
    if (this.socket || this.closed) return;
    let r;
    try {
      r = new WebSocket(n);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = r, r.onopen = () => {
      this.reconnectDelay = Ce, this.emit({ type: "connection.changed", state: "connected" });
    }, r.onmessage = (c) => {
      try {
        this.emit(JSON.parse(String(c.data)));
      } catch {
      }
    }, r.onclose = () => {
      this.socket = void 0, !this.closed && (this.emit({ type: "connection.changed", state: "connecting" }), this.scheduleReconnect());
    }, r.onerror = () => r.close();
  }
  scheduleReconnect() {
    this.reconnectTimer || this.closed || (this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = void 0, this.reconnectDelay = Math.min(this.reconnectDelay * 2, Kn), this.openSocket();
    }, this.reconnectDelay));
  }
  closeSocket() {
    this.reconnectTimer && (clearTimeout(this.reconnectTimer), this.reconnectTimer = void 0), this.opening = !1;
    const n = this.socket;
    this.socket = void 0, n && (n.onclose = null, n.onerror = null, n.close());
  }
}
const Fe = "/api/plugins/hermes-crew", Be = window.__HERMES_PLUGIN_SDK__, Zn = new Jn({
  baseUrl: Fe,
  // The SDK's authed fetch, not the global one. Its own contract says plugins
  // must not hand-read the session token, and this is what keeps loopback,
  // gated-OAuth and server-internal modes all working from one bundle.
  fetchImpl: (t, n) => Be.authedFetch(t, n),
  // A resolver, not a string: in gated mode `buildWsUrl` mints a single-use
  // ticket, so the URL has to be rebuilt for every connect and reconnect.
  eventsUrl: () => Be.buildWsUrl(`${Fe}/v1/events`)
});
function Qn(t) {
  try {
    if (typeof Notification > "u" || Notification.permission !== "granted" || document.visibilityState === "visible") return;
    new Notification(t.title, { body: t.body });
  } catch {
  }
}
function tr() {
  return /* @__PURE__ */ e.createElement(Gn, { client: Zn, notify: Qn });
}
export {
  tr as C,
  e as R,
  Ae as S,
  S as a,
  U as b,
  Nt as c,
  me as d,
  q as e,
  xe as f,
  er as g,
  Se as h,
  gt as i,
  pt as j,
  ft as k,
  we as l,
  yt as m,
  Re as n,
  nt as r,
  bt as u
};

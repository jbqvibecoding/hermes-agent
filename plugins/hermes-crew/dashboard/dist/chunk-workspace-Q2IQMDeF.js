const ut = globalThis.__HERMES_PLUGIN_SDK__, e = ut?.React;
if (!e)
  throw new Error(
    "hermes-crew: the dashboard plugin SDK is not on the page, so there is no React to borrow."
  );
const {
  Children: mt,
  Fragment: pt,
  Profiler: ht,
  StrictMode: ft,
  Suspense: Re,
  cloneElement: gt,
  createContext: yt,
  createElement: Se,
  createRef: vt,
  forwardRef: De,
  isValidElement: wt,
  lazy: Le,
  memo: Et,
  startTransition: bt,
  use: kt,
  useActionState: Nt,
  useCallback: ye,
  useContext: St,
  useDebugValue: Ct,
  useDeferredValue: Mt,
  useEffect: z,
  useId: Tt,
  useImperativeHandle: _t,
  useInsertionEffect: xt,
  useLayoutEffect: $e,
  useMemo: he,
  useOptimistic: At,
  useReducer: It,
  useRef: G,
  useState: N,
  useSyncExternalStore: Ot,
  useTransition: Rt,
  version: Dt
} = e, Lt = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Children: mt,
  Fragment: pt,
  Profiler: ht,
  StrictMode: ft,
  Suspense: Re,
  cloneElement: gt,
  createContext: yt,
  createElement: Se,
  createRef: vt,
  default: e,
  forwardRef: De,
  isValidElement: wt,
  lazy: Le,
  memo: Et,
  startTransition: bt,
  use: kt,
  useActionState: Nt,
  useCallback: ye,
  useContext: St,
  useDebugValue: Ct,
  useDeferredValue: Mt,
  useEffect: z,
  useId: Tt,
  useImperativeHandle: _t,
  useInsertionEffect: xt,
  useLayoutEffect: $e,
  useMemo: he,
  useOptimistic: At,
  useReducer: It,
  useRef: G,
  useState: N,
  useSyncExternalStore: Ot,
  useTransition: Rt,
  version: Dt
}, Symbol.toStringTag, { value: "Module" }));
class ge extends Error {
  constructor(n, r, o = !1) {
    super(r), this.code = n, this.retryable = o, this.name = "CrewError";
  }
  code;
  retryable;
}
function Ke(t) {
  return !t || t.role !== "agent" ? "" : t.parts.filter((n) => n.type === "text").map((n) => n.text).join("").trim();
}
function ke(t) {
  return Ke(
    [...t].reverse().find((n) => n.role === "agent" && !n.streaming)
  );
}
function Pe(t) {
  return t.parts.filter((n) => n.type === "text").map((n) => n.text).join("");
}
const ze = 6e4, $t = 3e4, Te = "optimistic-user:", we = "optimistic-agent:";
function Pt(t, n = {}) {
  const { enabled: r = !0, notify: o } = n, [m, E] = N([]), [d, M] = N(""), [l, s] = N(""), [k, c] = N([]), [a, p] = N([]), [f, u] = N([]), [R, I] = N([]), [L, q] = N(), [J, v] = N("connecting"), [U, te] = N([]), [ee, Z] = N(r), [F, X] = N(), [se, B] = N(() => /* @__PURE__ */ new Set()), [oe, re] = N(""), [me, pe] = N(0), j = G(/* @__PURE__ */ new Map()), ne = G(d), Q = G(/* @__PURE__ */ new Set()), V = G(/* @__PURE__ */ new Map()), ue = G(o), ie = he(
    () => m.find((b) => b.id === d),
    [m, d]
  ), ce = l || (d ? `dm:${d}` : ""), x = !!(d && !se.has(d));
  z(() => {
    ne.current = d;
  }, [d]), z(() => {
    ue.current = o;
  }, [o]);
  const T = ye(async (b = !1) => {
    const C = await t.listAgents();
    for (const h of Q.current)
      C.some((w) => w.id === h) || Q.current.delete(h);
    const $ = C.filter((h) => !Q.current.has(h.id)), H = ne.current, A = $.find((h) => h.id === H), g = j.current.get(H);
    A?.lastMessagePreview && g && !g.messages.some((h) => h.streaming) && ke(g.messages) !== A.lastMessagePreview && (j.current.set(H, { ...g, cachedAt: 0 }), pe((w) => w + 1));
    const i = !!g?.messages.some((h) => h.streaming);
    return E((h) => $.map((w) => {
      const O = h.find((y) => y.id === w.id), D = ke(j.current.get(w.id)?.messages ?? []), W = !!D || w.id === H && i;
      return {
        ...w,
        lastMessagePreview: W ? D || O?.lastMessagePreview : w.lastMessagePreview ?? O?.lastMessagePreview
      };
    })), M((h) => h && $.some((w) => w.id === h) || b ? h : $[0]?.id || ""), $;
  }, [t]), Y = ye(async () => {
    const b = await t.listModelProviders();
    return te(b.providers), b.providers;
  }, [t]);
  return z(() => {
    if (!r) {
      E([]), te([]), M(""), s(""), p([]), u([]), I([]), q(void 0), v("disconnected"), Z(!1), X(void 0);
      return;
    }
    let b = !0;
    return Z(!0), Promise.all([T(), Y()]).then(() => {
      b && (v("connected"), Z(!1));
    }).catch((C) => {
      b && (v("error"), X(C instanceof Error ? C.message : "Could not load the crew"), Z(!1));
    }), () => {
      b = !1;
    };
  }, [r, T, Y]), z(() => {
    if (!r) return;
    const b = () => {
      document.visibilityState === "hidden" || !navigator.onLine || T().catch(() => {
      });
    }, C = () => {
      document.visibilityState === "visible" && b();
    }, $ = window.setInterval(b, $t);
    return window.addEventListener("focus", b), window.addEventListener("online", b), document.addEventListener("visibilitychange", C), () => {
      window.clearInterval($), window.removeEventListener("focus", b), window.removeEventListener("online", b), document.removeEventListener("visibilitychange", C);
    };
  }, [r, T]), z(() => {
    s("");
  }, [d]), z(() => {
    if (!r) return;
    const b = j.current.get(d);
    if (b ? (p(b.messages), u(b.activities), I(b.approvals), q(b.computer), c(b.conversations)) : (p([]), u([]), I([]), q(void 0), c([])), re(""), !d) return;
    const C = b ? Date.now() - b.cachedAt : Number.POSITIVE_INFINITY;
    if (b && C < ze && !l) {
      b.messages.some((g) => g.streaming) && re(d);
      const A = window.setTimeout(() => pe((g) => g + 1), ze - C);
      return () => window.clearTimeout(A);
    }
    const $ = new AbortController();
    let H = !0;
    return Promise.all([
      t.listConversations(d, $.signal),
      t.listApprovalRequests(d, $.signal),
      t.getComputer(d, $.signal)
    ]).then(async ([A, g, i]) => {
      const h = l ? A.find((P) => P.id === l) ?? A[0] : A[0], w = h ? await t.getConversation(h.id, $.signal) : void 0;
      if (!H || Q.current.has(d)) return;
      const O = j.current.get(d)?.messages ?? [], D = (w?.messages ?? []).map((P) => {
        const ae = V.current.get(P.id);
        return ae ? { ...P, id: ae } : P;
      }), W = O.filter(
        (P) => P.id.startsWith(Te) || P.id.startsWith(we)
      ), y = [
        ...D,
        ...W.filter((P) => !D.some((ae) => ae.id === P.id))
      ], S = ke(y), K = w?.activities ?? [];
      j.current.set(d, {
        messages: y,
        activities: K,
        approvals: g,
        conversations: A,
        computer: i,
        cachedAt: Date.now()
      }), B((P) => new Set(P).add(d)), p(y), u(K), I(g), q(i), c(A), re(d), S && E((P) => P.map((ae) => ae.id === d ? { ...ae, lastMessagePreview: S } : ae));
    }).catch((A) => {
      !H || Q.current.has(d) || A instanceof DOMException && A.name === "AbortError" || (j.current.set(d, {
        messages: [],
        activities: [],
        approvals: [],
        conversations: [],
        cachedAt: Date.now()
      }), B((g) => new Set(g).add(d)), p([]), X(A instanceof Error ? A.message : "Could not load this teammate"));
    }), () => {
      H = !1, $.abort();
    };
  }, [t, r, me, d, l]), z(() => {
    if (!r || !d || L?.status === "online") return;
    let b = !0;
    const C = async () => {
      try {
        const H = await t.getComputer(d);
        if (!b || ne.current !== d) return;
        q(H);
        const A = j.current.get(d);
        A && j.current.set(d, { ...A, computer: H });
      } catch {
      }
    }, $ = window.setInterval(() => {
      C();
    }, 2e3);
    return C(), () => {
      b = !1, window.clearInterval($);
    };
  }, [t, L?.status, r, d]), z(() => {
    if (!r || !ce || oe !== d) return;
    let b = !0;
    const C = d, $ = (g) => {
      const i = j.current.get(C);
      j.current.set(C, {
        messages: i?.messages ?? [],
        activities: i?.activities ?? [],
        approvals: i?.approvals ?? [],
        conversations: i?.conversations ?? [],
        computer: i?.computer,
        cachedAt: Date.now(),
        ...g
      });
    }, H = (g) => p((i) => {
      const h = g(i);
      return $({ messages: h }), h;
    }), A = t.subscribeToConversationEvents(ce, (g) => {
      if (b) {
        if (g.type === "message.created" && H((i) => {
          let h = g.message;
          const w = V.current.get(g.message.id);
          if (w && (h = { ...g.message, id: w }), g.message.role === "user" && !w) {
            const D = new Set(V.current.values()), W = i.find((y) => y.id.startsWith(Te) && !D.has(y.id) && Pe(y) === Pe(g.message));
            W && (V.current.set(g.message.id, W.id), h = { ...g.message, id: W.id });
          }
          if (g.message.role === "agent" && !w) {
            const D = new Set(V.current.values()), W = i.find((y) => y.id.startsWith(we) && !D.has(y.id));
            W && (V.current.set(g.message.id, W.id), h = { ...g.message, id: W.id });
          }
          return i.find((D) => D.id === h.id) ? i.map((D) => D.id === h.id ? h : D) : [...i, h];
        }), g.type === "message.delta" && H((i) => {
          let h = V.current.get(g.messageId);
          if (!h) {
            const w = new Set(V.current.values()), O = i.find((D) => D.id.startsWith(we) && !w.has(D.id));
            O && (h = O.id, V.current.set(g.messageId, h));
          }
          return h ??= g.messageId, i.some((w) => w.id === h) ? i.map((w) => w.id === h ? {
            ...w,
            parts: w.parts.map((O, D) => D === 0 && O.type === "text" ? { ...O, text: O.text + g.delta } : O)
          } : w) : [...i, {
            id: h,
            conversationId: ce,
            role: "agent",
            parts: [{ type: "text", text: g.delta }],
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            streaming: !0
          }];
        }), g.type === "message.completed") {
          const i = V.current.get(g.messageId) ?? g.messageId;
          g.notify === !1 ? H((h) => h.flatMap((w) => w.id !== i ? [w] : w.id.startsWith(we) ? [{
            ...w,
            parts: w.parts.map((O) => O.type === "text" ? { ...O, text: "" } : O),
            streaming: !0
          }] : [])) : (H((h) => {
            const w = h.filter((D) => D.id === i || D.role !== "agent" || !D.streaming).map((D) => D.id === i ? { ...D, streaming: !1 } : D), O = ke(w);
            return O && E((D) => D.map((W) => W.id === C ? { ...W, lastMessagePreview: O } : W)), w;
          }), ue.current?.({
            title: `${ie?.name ?? "Your teammate"} finished`,
            body: "There is something new to read."
          }));
        }
        if (g.type === "message.dropped") {
          const i = V.current.get(g.messageId) ?? g.messageId;
          H((h) => h.filter((w) => w.id !== i));
        }
        g.type === "message.updated" && (H((i) => {
          const h = V.current.get(g.message.id), w = h ? { ...g.message, id: h } : g.message, O = i.find((W) => W.id === w.id), D = g.message.role === "agent" && !g.message.streaming ? i.filter((W) => W.id === w.id || W.role !== "agent" || !W.streaming) : i;
          return O ? D.map((W) => W.id === w.id ? w : W) : [...D, w];
        }), g.message.role === "agent" && !g.message.streaming && E((i) => i.map((h) => h.id === C ? { ...h, lastMessagePreview: Ke(g.message) || void 0 } : h))), g.type === "approval.updated" && (I((i) => {
          const h = i.some((w) => w.id === g.approval.id) ? i.map((w) => w.id === g.approval.id ? g.approval : w) : [g.approval, ...i];
          return $({ approvals: h }), h;
        }), g.approval.status === "pending" && ue.current?.({
          title: `${ie?.name ?? "Your teammate"} needs you`,
          body: g.approval.title
        })), g.type === "activity.updated" && u((i) => {
          const h = i.some((w) => w.id === g.activity.id) ? i.map((w) => w.id === g.activity.id ? g.activity : w) : [...i, g.activity];
          return $({ activities: h }), h;
        }), g.type === "agent.status" && E((i) => i.map((h) => h.id === g.agentId ? { ...h, status: g.status } : h)), g.type === "connection.changed" && v(g.state);
      }
    });
    return () => {
      b = !1, A.unsubscribe();
    };
  }, [t, ce, r, oe, ie?.name, d]), {
    agents: m,
    conversations: k,
    modelProviders: U,
    selectedAgent: ie,
    selectedAgentId: d,
    setSelectedAgentId: M,
    selectedThreadId: ce,
    setSelectedThreadId: s,
    messages: a,
    activities: f,
    approvals: R,
    computer: L,
    connection: J,
    loading: ee,
    conversationLoading: x,
    error: F,
    refreshAgents: T,
    refreshModelProviders: Y,
    dismissError: () => X(void 0),
    createAgent: async (b) => {
      const C = await t.createAgent(b);
      return await T(!0), M(C.id), C;
    },
    updateAgent: async (b, C) => {
      await t.updateAgent(b, C), await T(!0);
    },
    duplicateAgent: async (b) => {
      const C = await t.duplicateAgent(b);
      await T(!0), M(C.id);
    },
    deleteAgent: async (b) => {
      const C = m.find((i) => i.id === b), $ = d;
      if (!C || Q.current.has(b)) return;
      const H = m.findIndex((i) => i.id === b), A = m.filter((i) => i.id !== b), g = $ === b ? A[Math.min(Math.max(H, 0), Math.max(A.length - 1, 0))]?.id ?? "" : $;
      Q.current.add(b), E(A), M(g);
      try {
        try {
          await t.deleteAgent(b);
        } catch (i) {
          if (!(i instanceof ge && i.code === "not_found")) throw i;
        }
        j.current.delete(b), B((i) => {
          const h = new Set(i);
          return h.delete(b), h;
        }), await T();
      } catch (i) {
        throw Q.current.delete(b), E((h) => {
          if (h.some((O) => O.id === b)) return h;
          const w = [...h];
          return w.splice(Math.min(H, w.length), 0, C), w;
        }), M((h) => h || ($ === b ? b : h)), X(i instanceof Error ? i.message : "Could not remove this teammate"), i;
      }
    },
    sendMessage: async (b) => {
      if (!ce || !d) return;
      const C = d, $ = ce, H = `${Date.now()}:${Math.random().toString(36).slice(2)}`, A = `${Te}${H}`, g = `${we}${H}`, i = (/* @__PURE__ */ new Date()).toISOString(), h = {
        id: A,
        conversationId: $,
        role: "user",
        parts: [{ type: "text", text: b }],
        createdAt: i
      }, w = {
        id: g,
        conversationId: $,
        role: "agent",
        parts: [{ type: "text", text: "" }],
        createdAt: i,
        streaming: !0
      }, O = j.current.get(C) ?? {
        messages: [],
        activities: [],
        approvals: [],
        conversations: [],
        cachedAt: Date.now()
      }, D = [...O.messages].reverse().find((S) => S.role === "agent" && S.streaming), y = [...D ? O.messages.map((S) => S.id === D.id ? { ...S, streaming: !1, interrupted: !0 } : S) : O.messages, h, w];
      ne.current === C && u([]), j.current.set(C, { ...O, messages: y, activities: [], cachedAt: Date.now() }), ne.current === C && (p(y), re(C));
      try {
        const S = await t.sendMessage({ conversationId: $, text: b });
        V.current.set(S.id, A);
        const K = S.id.match(/^(.+):user(?:$|:)/)?.[1];
        K && (V.current.set(`${K}:user`, A), V.current.set(`${K}:agent`, D?.id ?? g));
        const P = j.current.get(C) ?? O, ae = { ...S, id: A }, fe = P.messages.map((be) => be.id === A ? ae : be).filter((be, ct, lt) => lt.findIndex((dt) => dt.id === be.id) === ct);
        j.current.set(C, { ...P, messages: fe, cachedAt: Date.now() }), ne.current === C && p(fe);
      } catch (S) {
        const K = j.current.get(C) ?? O, P = K.messages.filter((fe) => fe.id !== g), ae = P.some((fe) => fe.id === A) ? P : [...P, h];
        throw j.current.set(C, { ...K, messages: ae, cachedAt: Date.now() }), ne.current === C && p(ae), D || X(S instanceof Error ? S.message : "Could not send that"), S;
      }
    },
    respondToApproval: async (b, C, $, H) => {
      const A = d, g = await t.respondToApproval({ requestId: b, decision: C, note: $, contentHash: H }), i = j.current.get(A), h = (i?.approvals ?? []).map((w) => w.id === g.id ? g : w);
      i && j.current.set(A, { ...i, approvals: h, cachedAt: Date.now() }), ne.current === A && I(h);
    },
    openComputer: async (b) => {
      if (!d) throw new Error("No teammate is selected");
      try {
        return await (b === "open" ? t.openComputer(d) : t.takeOverComputer(d));
      } catch (C) {
        throw X(C instanceof Error ? C.message : "Could not open that computer"), C;
      }
    },
    reconnect: async () => {
      v("connecting");
      try {
        await t.reconnect(), await T(), v("connected");
      } catch (b) {
        v("error"), X(b instanceof Error ? b.message : "Reconnect failed");
      }
    }
  };
}
const zt = (t) => t.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), Ye = (...t) => t.filter((n, r, o) => !!n && n.trim() !== "" && o.indexOf(n) === r).join(" ").trim();
var Ut = {
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
const qt = De(
  ({
    color: t = "currentColor",
    size: n = 24,
    strokeWidth: r = 2,
    absoluteStrokeWidth: o,
    className: m = "",
    children: E,
    iconNode: d,
    ...M
  }, l) => Se(
    "svg",
    {
      ref: l,
      ...Ut,
      width: n,
      height: n,
      stroke: t,
      strokeWidth: o ? Number(r) * 24 / Number(n) : r,
      className: Ye("lucide", m),
      ...M
    },
    [
      ...d.map(([s, k]) => Se(s, k)),
      ...Array.isArray(E) ? E : [E]
    ]
  )
);
const _ = (t, n) => {
  const r = De(
    ({ className: o, ...m }, E) => Se(qt, {
      ref: E,
      iconNode: n,
      className: Ye(`lucide-${zt(t)}`, o),
      ...m
    })
  );
  return r.displayName = `${t}`, r;
};
const Ht = _("Archive", [
  ["rect", { width: "20", height: "5", x: "2", y: "3", rx: "1", key: "1wp1u1" }],
  ["path", { d: "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8", key: "1s80jp" }],
  ["path", { d: "M10 12h4", key: "a56b0p" }]
]);
const jt = _("ArrowDown", [
  ["path", { d: "M12 5v14", key: "s699le" }],
  ["path", { d: "m19 12-7 7-7-7", key: "1idqje" }]
]);
const Vt = _("Ban", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m4.9 4.9 14.2 14.2", key: "1m5liu" }]
]);
const Ft = _("Bot", [
  ["path", { d: "M12 8V4H8", key: "hb8ula" }],
  ["rect", { width: "16", height: "12", x: "4", y: "8", rx: "2", key: "enze0r" }],
  ["path", { d: "M2 14h2", key: "vft8re" }],
  ["path", { d: "M20 14h2", key: "4cs60a" }],
  ["path", { d: "M15 13v2", key: "1xurst" }],
  ["path", { d: "M9 13v2", key: "rq6x2g" }]
]);
const Ce = _("Check", [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]]);
const Bt = _("ChevronDown", [
  ["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]
]);
const xe = _("ChevronRight", [
  ["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]
]);
const Wt = _("ChevronsRight", [
  ["path", { d: "m6 17 5-5-5-5", key: "xnjwq" }],
  ["path", { d: "m13 17 5-5-5-5", key: "17xmmf" }]
]);
const Ae = _("CircleCheck", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
]);
const Xe = _("CircleDashed", [
  ["path", { d: "M10.1 2.182a10 10 0 0 1 3.8 0", key: "5ilxe3" }],
  ["path", { d: "M13.9 21.818a10 10 0 0 1-3.8 0", key: "11zvb9" }],
  ["path", { d: "M17.609 3.721a10 10 0 0 1 2.69 2.7", key: "1iw5b2" }],
  ["path", { d: "M2.182 13.9a10 10 0 0 1 0-3.8", key: "c0bmvh" }],
  ["path", { d: "M20.279 17.609a10 10 0 0 1-2.7 2.69", key: "1ruxm7" }],
  ["path", { d: "M21.818 10.1a10 10 0 0 1 0 3.8", key: "qkgqxc" }],
  ["path", { d: "M3.721 6.391a10 10 0 0 1 2.7-2.69", key: "1mcia2" }],
  ["path", { d: "M6.391 20.279a10 10 0 0 1-2.69-2.7", key: "1fvljs" }]
]);
const Gt = _("CircleHelp", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3", key: "1u773s" }],
  ["path", { d: "M12 17h.01", key: "p32p05" }]
]);
const Je = _("Clock", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["polyline", { points: "12 6 12 12 16 14", key: "68esgv" }]
]);
const Ie = _("Cloud", [
  ["path", { d: "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z", key: "p7xjir" }]
]);
const Kt = _("Copy", [
  ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2", key: "17jyea" }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2", key: "zix9uf" }]
]);
const Yt = _("CornerDownRight", [
  ["polyline", { points: "15 10 20 15 15 20", key: "1q7qjw" }],
  ["path", { d: "M4 4v7a4 4 0 0 0 4 4h12", key: "z08zvw" }]
]);
const Xt = _("Database", [
  ["ellipse", { cx: "12", cy: "5", rx: "9", ry: "3", key: "msslwz" }],
  ["path", { d: "M3 5V19A9 3 0 0 0 21 19V5", key: "1wlel7" }],
  ["path", { d: "M3 12A9 3 0 0 0 21 12", key: "mv7ke4" }]
]);
const Jt = _("Download", [
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
  ["polyline", { points: "7 10 12 15 17 10", key: "2ggqvy" }],
  ["line", { x1: "12", x2: "12", y1: "15", y2: "3", key: "1vk2je" }]
]);
const Zt = _("Earth", [
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
const Qt = _("Ellipsis", [
  ["circle", { cx: "12", cy: "12", r: "1", key: "41hilf" }],
  ["circle", { cx: "19", cy: "12", r: "1", key: "1wjl8i" }],
  ["circle", { cx: "5", cy: "12", r: "1", key: "1pcz8c" }]
]);
const en = _("FileCode2", [
  ["path", { d: "M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4", key: "1pf5j1" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "m5 12-3 3 3 3", key: "oke12k" }],
  ["path", { d: "m9 18 3-3-3-3", key: "112psh" }]
]);
const tn = _("FileSpreadsheet", [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "M8 13h2", key: "yr2amv" }],
  ["path", { d: "M14 13h2", key: "un5t4a" }],
  ["path", { d: "M8 17h2", key: "2yhykz" }],
  ["path", { d: "M14 17h2", key: "10kma7" }]
]);
const Ee = _("FileText", [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "M10 9H8", key: "b1mrlr" }],
  ["path", { d: "M16 13H8", key: "t4e002" }],
  ["path", { d: "M16 17H8", key: "z1uh3a" }]
]);
const Ze = _("File", [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }]
]);
const nn = _("Globe", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20", key: "13o1zl" }],
  ["path", { d: "M2 12h20", key: "9i4pu4" }]
]);
const Ue = _("Hand", [
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
const rn = _("Hourglass", [
  ["path", { d: "M5 22h14", key: "ehvnwv" }],
  ["path", { d: "M5 2h14", key: "pdyrp9" }],
  [
    "path",
    {
      d: "M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22",
      key: "1d314k"
    }
  ],
  [
    "path",
    { d: "M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2", key: "1vvvr6" }
  ]
]);
const an = _("Image", [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2", key: "1m3agn" }],
  ["circle", { cx: "9", cy: "9", r: "2", key: "af1f0g" }],
  ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21", key: "1xmnt7" }]
]);
const sn = _("KeyRound", [
  [
    "path",
    {
      d: "M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z",
      key: "1s6t7t"
    }
  ],
  ["circle", { cx: "16.5", cy: "7.5", r: ".5", fill: "currentColor", key: "w0ekpg" }]
]);
const Me = _("LoaderCircle", [
  ["path", { d: "M21 12a9 9 0 1 1-6.219-8.56", key: "13zald" }]
]);
const on = _("Lock", [
  ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2", key: "1w4ew1" }],
  ["path", { d: "M7 11V7a5 5 0 0 1 10 0v4", key: "fwvmzm" }]
]);
const cn = _("Mail", [
  ["rect", { width: "20", height: "16", x: "2", y: "4", rx: "2", key: "18n3k1" }],
  ["path", { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7", key: "1ocrg3" }]
]);
const ln = _("Maximize2", [
  ["polyline", { points: "15 3 21 3 21 9", key: "mznyad" }],
  ["polyline", { points: "9 21 3 21 3 15", key: "1avn1i" }],
  ["line", { x1: "21", x2: "14", y1: "3", y2: "10", key: "ota7mn" }],
  ["line", { x1: "3", x2: "10", y1: "21", y2: "14", key: "1atl0r" }]
]);
const dn = _("Minimize2", [
  ["polyline", { points: "4 14 10 14 10 20", key: "11kfnr" }],
  ["polyline", { points: "20 10 14 10 14 4", key: "rlmsce" }],
  ["line", { x1: "14", x2: "21", y1: "10", y2: "3", key: "o5lafz" }],
  ["line", { x1: "3", x2: "10", y1: "21", y2: "14", key: "1atl0r" }]
]);
const Qe = _("Monitor", [
  ["rect", { width: "20", height: "14", x: "2", y: "3", rx: "2", key: "48i651" }],
  ["line", { x1: "8", x2: "16", y1: "21", y2: "21", key: "1svkeh" }],
  ["line", { x1: "12", x2: "12", y1: "17", y2: "21", key: "vw1qmm" }]
]);
const un = _("Pencil", [
  [
    "path",
    {
      d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
      key: "1a8usu"
    }
  ],
  ["path", { d: "m15 5 4 4", key: "1mk7zo" }]
]);
const et = _("Plus", [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "M12 5v14", key: "s699le" }]
]);
const mn = _("Presentation", [
  ["path", { d: "M2 3h20", key: "91anmk" }],
  ["path", { d: "M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3", key: "2k9sn8" }],
  ["path", { d: "m7 21 5-5 5 5", key: "bip4we" }]
]);
const pn = _("RotateCcw", [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }]
]);
const tt = _("Search", [
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
  ["path", { d: "m21 21-4.3-4.3", key: "1qie3q" }]
]);
const qe = _("Settings2", [
  ["path", { d: "M20 7h-9", key: "3s1dr2" }],
  ["path", { d: "M14 17H5", key: "gfn3mx" }],
  ["circle", { cx: "17", cy: "17", r: "3", key: "18b49y" }],
  ["circle", { cx: "7", cy: "7", r: "3", key: "dfmy0x" }]
]);
const Oe = _("ShieldAlert", [
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
const hn = _("ShieldCheck", [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      key: "oel41y"
    }
  ],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
]);
const fn = _("ShieldX", [
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
const gn = _("Terminal", [
  ["polyline", { points: "4 17 10 11 4 5", key: "akl6gq" }],
  ["line", { x1: "12", x2: "20", y1: "19", y2: "19", key: "q2wloq" }]
]);
const nt = _("Trash2", [
  ["path", { d: "M3 6h18", key: "d0wm0j" }],
  ["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", key: "4alrt4" }],
  ["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2", key: "v07s0e" }],
  ["line", { x1: "10", x2: "10", y1: "11", y2: "17", key: "1uufr5" }],
  ["line", { x1: "14", x2: "14", y1: "11", y2: "17", key: "xtxkd" }]
]);
const yn = _("TriangleAlert", [
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
const vn = _("User", [
  ["path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", key: "975kel" }],
  ["circle", { cx: "12", cy: "7", r: "4", key: "17ys0d" }]
]);
const wn = _("Users", [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }],
  ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }],
  ["path", { d: "M16 3.13a4 4 0 0 1 0 7.75", key: "1da9ce" }]
]);
const En = _("X", [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
]);
function bn(t) {
  let n = 0;
  for (let r = 0; r < t.length; r += 1) n = (n * 31 + t.charCodeAt(r)) % 360;
  return n;
}
function rt({ agent: t, size: n = 36 }) {
  const r = bn(t.id || t.name);
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
const kn = Le(async () => ({ default: (await import("./chunk-mermaid-HWGCJPDP-997U8gC9.js").then((t) => t.i)).Streamdown })), He = {
  working: "Working",
  idle: "Idle",
  waiting_for_approval: "Needs you",
  offline: "No profile"
};
function Nn({
  agents: t,
  sections: n,
  rooms: r,
  selectedAgentId: o,
  selectedThreadId: m,
  search: E,
  onSearch: d,
  onSelectAgent: M,
  onSelectThread: l,
  onAction: s,
  onCreate: k,
  onToggleSection: c
}) {
  const [a, p] = N();
  z(() => {
    if (!a) return;
    const v = () => p(void 0);
    return window.addEventListener("pointerdown", v), () => window.removeEventListener("pointerdown", v);
  }, [a]);
  const f = (v, U) => {
    p(void 0), s(v, U);
  }, u = E.trim().toLowerCase(), R = (v) => !u || `${v.name} ${v.role}`.toLowerCase().includes(u), I = he(() => new Map(t.map((v) => [v.id, v])), [t]), L = n.map((v) => ({
    section: v,
    members: v.bot_ids.map((U) => I.get(U)).filter((U) => !!U && R(U))
  })).filter((v) => v.members.length > 0), q = !u && L.length > 1, J = (v) => /* @__PURE__ */ e.createElement(
    "div",
    {
      key: v.id,
      className: `agent-row ${o === v.id && !m.startsWith("group:") ? "selected" : ""} ${v.status === "working" ? "is-working" : ""}`
    },
    /* @__PURE__ */ e.createElement("button", { className: "agent-select", onClick: () => M(v.id) }, /* @__PURE__ */ e.createElement(rt, { agent: v }), /* @__PURE__ */ e.createElement("span", { className: "agent-copy" }, /* @__PURE__ */ e.createElement("strong", null, /* @__PURE__ */ e.createElement("span", null, v.name), /* @__PURE__ */ e.createElement("span", { className: `agent-status ${v.status}`, title: He[v.status], "aria-label": He[v.status] })), v.lastMessagePreview && /* @__PURE__ */ e.createElement("span", { className: "agent-preview agent-preview-entering" }, /* @__PURE__ */ e.createElement(Re, { fallback: v.lastMessagePreview }, /* @__PURE__ */ e.createElement(kn, { className: "agent-preview-markdown", mode: "static", controls: !1, linkSafety: { enabled: !0 }, skipHtml: !0 }, v.lastMessagePreview))))),
    /* @__PURE__ */ e.createElement(
      "button",
      {
        className: "agent-more",
        "aria-label": `More actions for ${v.name}`,
        onPointerDown: (U) => U.stopPropagation(),
        onClick: () => p((U) => U === v.id ? void 0 : v.id)
      },
      /* @__PURE__ */ e.createElement(Qt, { size: 15 })
    ),
    a === v.id && /* @__PURE__ */ e.createElement("div", { className: "agent-menu", role: "menu", onPointerDown: (U) => U.stopPropagation() }, /* @__PURE__ */ e.createElement("button", { role: "menuitem", onClick: () => f(v, "edit") }, /* @__PURE__ */ e.createElement(un, { size: 13 }), " Edit"), /* @__PURE__ */ e.createElement("button", { role: "menuitem", onClick: () => f(v, "duplicate") }, /* @__PURE__ */ e.createElement(Kt, { size: 13 }), " Duplicate"), /* @__PURE__ */ e.createElement("div", null), /* @__PURE__ */ e.createElement("button", { role: "menuitem", className: "danger-text", onClick: () => f(v, "delete") }, /* @__PURE__ */ e.createElement(nt, { size: 13 }), " Remove from crew"))
  );
  return /* @__PURE__ */ e.createElement("aside", { className: "agent-sidebar" }, /* @__PURE__ */ e.createElement("div", { className: "sidebar-titlebar" }, /* @__PURE__ */ e.createElement("span", { className: "sidebar-title" }, "Crew"), /* @__PURE__ */ e.createElement("button", { className: "brand-add", "aria-label": "Hire a teammate", onClick: k }, /* @__PURE__ */ e.createElement(et, { size: 18 }))), /* @__PURE__ */ e.createElement("label", { className: "search" }, /* @__PURE__ */ e.createElement(tt, { size: 15 }), /* @__PURE__ */ e.createElement("input", { "aria-label": "Search the crew", placeholder: "Search your crew", value: E, onChange: (v) => d(v.target.value) })), /* @__PURE__ */ e.createElement("div", { className: "agent-list" }, t.length === 0 && /* @__PURE__ */ e.createElement("div", { className: "agent-list-empty" }, "No teammates yet"), t.length > 0 && L.length === 0 && /* @__PURE__ */ e.createElement("div", { className: "agent-list-empty" }, "No teammates found"), q ? L.map(({ section: v, members: U }) => /* @__PURE__ */ e.createElement("section", { className: "agent-section", key: v.id }, /* @__PURE__ */ e.createElement(
    "button",
    {
      className: `agent-section-header ${v.collapsed ? "is-collapsed" : ""}`,
      "aria-expanded": !v.collapsed,
      onClick: () => c(v.id, !v.collapsed)
    },
    /* @__PURE__ */ e.createElement(xe, { size: 13, className: "agent-section-chevron" }),
    /* @__PURE__ */ e.createElement("span", null, v.name),
    /* @__PURE__ */ e.createElement("small", null, U.length)
  ), !v.collapsed && U.map(J))) : L.flatMap((v) => v.members).map(J), r.length > 0 && /* @__PURE__ */ e.createElement("section", { className: "agent-section", key: "__rooms__" }, /* @__PURE__ */ e.createElement("div", { className: "agent-section-header is-static" }, /* @__PURE__ */ e.createElement("span", null, "Rooms"), /* @__PURE__ */ e.createElement("small", null, r.length)), r.map((v) => /* @__PURE__ */ e.createElement("div", { key: v.id, className: `agent-row ${m === v.id ? "selected" : ""}` }, /* @__PURE__ */ e.createElement("button", { className: "agent-select", onClick: () => l(v.id) }, /* @__PURE__ */ e.createElement("span", { className: "agent-avatar", role: "img", "aria-label": `${v.title} room` }, v.emoji || "👥"), /* @__PURE__ */ e.createElement("span", { className: "agent-copy" }, /* @__PURE__ */ e.createElement("strong", null, /* @__PURE__ */ e.createElement("span", null, v.title)), /* @__PURE__ */ e.createElement("span", { className: "agent-preview" }, v.lastMessagePreview || v.subtitle))))))));
}
function Sn({
  open: t,
  agents: n,
  rooms: r,
  onClose: o,
  onSelectAgent: m,
  onSelectThread: E,
  onCreateAgent: d,
  onComputer: M
}) {
  const [l, s] = N(""), k = G(null);
  z(() => {
    t && (s(""), window.setTimeout(() => k.current?.focus(), 0));
  }, [t]);
  const a = he(() => [
    { id: "create", label: "Hire a teammate", detail: "Add someone to the crew", icon: et, run: d },
    { id: "computer", label: "Open their computer", detail: "The current teammate's screen", icon: Qe, run: M },
    ...n.map((f) => ({
      id: `agent-${f.id}`,
      label: f.name,
      detail: `${f.role} · ${f.status.replaceAll("_", " ")}`,
      icon: Ft,
      run: () => m(f.id)
    })),
    ...r.map((f) => ({
      id: `room-${f.id}`,
      label: f.title,
      detail: f.subtitle || "Room",
      icon: wn,
      run: () => E(f.id)
    }))
  ], [n, r, M, d, m, E]).filter((f) => `${f.label} ${f.detail}`.toLowerCase().includes(l.toLowerCase()));
  if (!t) return null;
  const p = (f) => {
    f.run(), o();
  };
  return /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "palette-backdrop",
      role: "presentation",
      onMouseDown: (f) => {
        f.target === f.currentTarget && o();
      }
    },
    /* @__PURE__ */ e.createElement("section", { className: "command-palette", role: "dialog", "aria-modal": "true", "aria-label": "Command palette" }, /* @__PURE__ */ e.createElement("label", null, /* @__PURE__ */ e.createElement(tt, { size: 17 }), /* @__PURE__ */ e.createElement(
      "input",
      {
        ref: k,
        "aria-label": "Search the crew and commands",
        placeholder: "Search your crew…",
        value: l,
        onChange: (f) => s(f.target.value),
        onKeyDown: (f) => {
          f.key === "Escape" && o(), f.key === "Enter" && a[0] && p(a[0]);
        }
      }
    ), /* @__PURE__ */ e.createElement("kbd", null, "esc")), /* @__PURE__ */ e.createElement("div", { className: "palette-results" }, a.length ? a.map((f, u) => {
      const R = f.icon;
      return /* @__PURE__ */ e.createElement("button", { key: f.id, className: u === 0 ? "active" : "", onClick: () => p(f) }, /* @__PURE__ */ e.createElement("span", null, /* @__PURE__ */ e.createElement(R, { size: 16 })), /* @__PURE__ */ e.createElement("div", null, /* @__PURE__ */ e.createElement("strong", null, f.label), /* @__PURE__ */ e.createElement("small", null, f.detail)), u === 0 && /* @__PURE__ */ e.createElement("kbd", null, "↵"));
    }) : /* @__PURE__ */ e.createElement("p", null, "Nothing matches that")), /* @__PURE__ */ e.createElement("footer", null, /* @__PURE__ */ e.createElement("span", null, "Crew"), /* @__PURE__ */ e.createElement("span", null, /* @__PURE__ */ e.createElement("kbd", null, "⌘"), /* @__PURE__ */ e.createElement("kbd", null, "K"), " to open")))
  );
}
function ve({ label: t, kind: n = "", children: r }) {
  return /* @__PURE__ */ e.createElement("div", { className: `crew-chip ${n}` }, t && /* @__PURE__ */ e.createElement("div", { className: "crew-chip-label" }, t), r);
}
function Cn({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ve, { kind: "report" }, (t.lines ?? []).map((n, r) => /* @__PURE__ */ e.createElement("div", { className: "crew-report-line", key: r }, /* @__PURE__ */ e.createElement("span", { className: "crew-report-check" }, /* @__PURE__ */ e.createElement(Ce, { size: 13 })), /* @__PURE__ */ e.createElement("span", { className: "crew-report-system" }, n.system), /* @__PURE__ */ e.createElement("span", { className: "crew-report-arrow" }, "→"), /* @__PURE__ */ e.createElement("span", null, n.result, n.count && /* @__PURE__ */ e.createElement("span", { className: "crew-report-count" }, " · ", n.count)))), t.closing && /* @__PURE__ */ e.createElement("div", { className: "crew-report-closing" }, t.closing));
}
function Mn({ payload: t, onDecide: n }) {
  const r = t.status === "approved" || t.status === "discarded";
  return /* @__PURE__ */ e.createElement("div", { className: `crew-chip approval ${r ? "resolved" : ""}` }, /* @__PURE__ */ e.createElement("div", { className: "crew-chip-label" }, /* @__PURE__ */ e.createElement(Oe, { size: 13 }), " ", r ? "Decided" : "Needs you"), /* @__PURE__ */ e.createElement("div", { className: "crew-approval-action" }, t.action), t.detail && /* @__PURE__ */ e.createElement("div", { className: "crew-approval-detail" }, t.detail), r ? /* @__PURE__ */ e.createElement("div", { className: "crew-approval-outcome" }, t.status === "approved" ? "Approved" : "Discarded") : /* @__PURE__ */ e.createElement("div", { className: "crew-approval-buttons" }, /* @__PURE__ */ e.createElement("button", { className: "crew-btn danger", onClick: () => n(String(t.approval_id), "deny") }, "Discard"), /* @__PURE__ */ e.createElement("button", { className: "crew-btn primary", onClick: () => n(String(t.approval_id), "allow") }, "Approve")));
}
function Tn({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ve, { label: "You decided" }, /* @__PURE__ */ e.createElement("div", { className: "crew-approval-action" }, t.action), /* @__PURE__ */ e.createElement("div", { className: "crew-approval-outcome" }, t.status === "approved" ? "Approved" : "Discarded"));
}
function _n({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ve, { label: "Memory updated" }, /* @__PURE__ */ e.createElement("div", { className: "crew-memory-rule" }, t.rule), t.diff && /* @__PURE__ */ e.createElement("pre", { className: "crew-memory-diff" }, t.diff));
}
function xn({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ve, { label: "Routine created" }, /* @__PURE__ */ e.createElement("div", { className: "crew-routine-name" }, /* @__PURE__ */ e.createElement(Je, { size: 13 }), " ", t.name), /* @__PURE__ */ e.createElement("div", { className: "crew-routine-when" }, t.human || t.cron));
}
function An({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ve, { label: `Handed over by @${t.from_name || t.from || "a teammate"}` }, /* @__PURE__ */ e.createElement("div", { className: "crew-botref-body" }, /* @__PURE__ */ e.createElement(Yt, { size: 13 }), " ", t.content));
}
function In({ payload: t, onOpenScreen: n }) {
  return /* @__PURE__ */ e.createElement(ve, { label: "Needs you at the keyboard" }, /* @__PURE__ */ e.createElement("div", { className: "crew-login-site" }, /* @__PURE__ */ e.createElement(sn, { size: 13 }), " Sign in to ", t.site || "a site"), t.why && /* @__PURE__ */ e.createElement("div", { className: "crew-login-why" }, t.why), /* @__PURE__ */ e.createElement("button", { className: "crew-btn", onClick: n }, "Take the wheel"));
}
function On({ payload: t, screenshotUrl: n }) {
  const r = t.url ?? (t.bot_id && t.file ? n(t.bot_id, t.file) : void 0);
  return r ? /* @__PURE__ */ e.createElement("figure", { className: "crew-shot" }, /* @__PURE__ */ e.createElement("img", { src: r, alt: t.caption || "the teammate's screen", loading: "lazy" }), t.caption && /* @__PURE__ */ e.createElement("figcaption", null, t.caption)) : null;
}
function Rn({ kind: t, payload: n, handlers: r }) {
  const o = n ?? {};
  switch (t) {
    case "report":
      return /* @__PURE__ */ e.createElement(Cn, { payload: o });
    case "approval_request":
      return /* @__PURE__ */ e.createElement(Mn, { payload: o, onDecide: r.onDecide });
    case "approval_resolved":
      return /* @__PURE__ */ e.createElement(Tn, { payload: o });
    case "memory_updated":
      return /* @__PURE__ */ e.createElement(_n, { payload: o });
    case "routine_created":
      return /* @__PURE__ */ e.createElement(xn, { payload: o });
    case "bot_ref":
      return /* @__PURE__ */ e.createElement(An, { payload: o });
    case "login_request":
      return /* @__PURE__ */ e.createElement(In, { payload: o, onOpenScreen: r.onOpenScreen });
    case "screenshot":
      return /* @__PURE__ */ e.createElement(On, { payload: o, screenshotUrl: r.screenshotUrl });
    default:
      return null;
  }
}
const Dn = Le(async () => ({ default: (await import("./chunk-mermaid-HWGCJPDP-997U8gC9.js").then((t) => t.i)).Streamdown })), Ln = {
  browser: Zt,
  terminal: gn,
  file: Ee,
  handoff: Ie,
  status: Ie
};
function $n(t) {
  return t.parts.filter((n) => n.type === "text").map((n) => n.text).join("");
}
const Pn = (t) => {
  const n = Math.max(0, Math.floor(t / 1e3)), r = Math.floor(n / 60);
  return r ? `${r}m ${n % 60}s` : `${n}s`;
};
function zn() {
  return /* @__PURE__ */ e.createElement("svg", { "aria-hidden": "true", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ e.createElement("path", { d: "m5 12 7-7 7 7" }), /* @__PURE__ */ e.createElement("path", { d: "M12 19V5" }));
}
function Un() {
  return /* @__PURE__ */ e.createElement("svg", { className: "stop-icon", "aria-hidden": "true", viewBox: "0 0 24 24" }, /* @__PURE__ */ e.createElement("rect", { x: "7.5", y: "7.5", width: "9", height: "9", rx: "1.5", fill: "currentColor" }));
}
function qn(t) {
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
function Hn({ agent: t, label: n, activities: r, startedAt: o }) {
  const [m, E] = N(0), [d, M] = N(!1);
  return z(() => {
    E(Date.now());
    const l = window.setInterval(() => E(Date.now()), 1e3);
    return () => window.clearInterval(l);
  }, []), /* @__PURE__ */ e.createElement("details", { className: "agent-working-details", open: d }, /* @__PURE__ */ e.createElement(
    "summary",
    {
      role: "status",
      "aria-label": `${t?.name ?? "This teammate"} is working: ${n}`,
      onClick: (l) => {
        l.preventDefault(), M((s) => !s);
      }
    },
    /* @__PURE__ */ e.createElement("span", { className: "agent-working-progress" }, "Working for ", Pn(m - Date.parse(o))),
    /* @__PURE__ */ e.createElement(xe, { className: "agent-working-chevron", size: 15 })
  ), r.length > 0 && /* @__PURE__ */ e.createElement("div", { className: "agent-working-tools" }, r.map((l) => {
    const s = Ln[l.kind] ?? Ie;
    return /* @__PURE__ */ e.createElement("details", { className: `agent-tool-detail ${l.status}`, key: l.id }, /* @__PURE__ */ e.createElement("summary", null, /* @__PURE__ */ e.createElement(s, { size: 14 }), /* @__PURE__ */ e.createElement("span", null, l.title), /* @__PURE__ */ e.createElement(xe, { size: 13 })), /* @__PURE__ */ e.createElement("div", null, l.output ?? (l.status === "running" ? "Waiting for result…" : "No output")));
  })));
}
function jn({ message: t, agent: n, senderName: r, activities: o, chips: m, entering: E = !1 }) {
  const d = $n(t), M = G(null), l = G(!!t.streaming), s = o.filter((f) => f.conversationId === t.conversationId), k = [...s].reverse().find((f) => f.status === "running") ?? s.at(-1), c = t.role === "agent" && !!t.streaming, a = d.trim() || k?.title || "Working", p = t.parts.filter((f) => f.type === "chip");
  return $e(() => {
    const f = M.current, u = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (f && t.role === "agent" && l.current && !t.streaming && !u) {
      const R = f.querySelector(".message-body");
      R && typeof R.animate == "function" && R.animate(
        [{ opacity: 0, transform: "translate3d(-6px,4px,0)" }, { opacity: 1, transform: "translate3d(0,0,0)" }],
        { duration: 260, easing: "cubic-bezier(.2,.82,.3,1)" }
      );
    }
    l.current = !!t.streaming;
  }, [E, t.role, t.streaming]), /* @__PURE__ */ e.createElement("div", { className: `message ${t.role} ${E ? "message-entering" : ""}`, ref: M }, t.interrupted && /* @__PURE__ */ e.createElement("div", { className: "agent-interrupted" }, "Interrupted"), r && t.role === "agent" && /* @__PURE__ */ e.createElement("div", { className: "message-sender" }, r), !c && (d || t.streaming && !p.length) && /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "message-body",
      onClick: t.role === "agent" ? qn : void 0
    },
    t.role === "agent" ? /* @__PURE__ */ e.createElement(Re, { fallback: /* @__PURE__ */ e.createElement("span", { className: "agent-markdown-fallback" }, d) }, /* @__PURE__ */ e.createElement(
      Dn,
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
      d
    )) : d
  ), c && /* @__PURE__ */ e.createElement(
    Hn,
    {
      agent: n,
      label: a,
      activities: s,
      startedAt: t.createdAt
    }
  ), p.map((f, u) => /* @__PURE__ */ e.createElement(
    Rn,
    {
      key: `${t.id}:${u}`,
      kind: f.kind,
      payload: f.payload,
      handlers: m
    }
  )));
}
function Vn({
  agent: t,
  thread: n,
  agentsById: r,
  messages: o,
  activities: m,
  chips: E,
  loading: d = !1,
  focusRequest: M = 0,
  onSend: l,
  onToggleDetails: s
}) {
  const [k, c] = N(""), [a, p] = N(!1), [f, u] = N(!1), [R, I] = N(!1), [L, q] = N(!1), J = G(null), v = G(null), U = G(null), te = G(!1), ee = G(!0), Z = G(!1), F = G(0), X = G(0), se = G(void 0), B = G(void 0), oe = G(/* @__PURE__ */ new Set()), re = G(n?.id ?? ""), me = G(d), [pe, j] = N(() => /* @__PURE__ */ new Set()), ne = n?.title || t?.name || "Crew", Q = n?.kind === "group", V = n?.id ?? t?.id ?? "";
  $e(() => {
    const x = re.current !== V || me.current;
    if (re.current = V, me.current = d, d || x) {
      oe.current = new Set(o.map((Y) => Y.id)), j(/* @__PURE__ */ new Set());
      return;
    }
    const T = o.filter((Y) => !oe.current.has(Y.id)).map((Y) => Y.id);
    for (const Y of T) oe.current.add(Y);
    j(new Set(T));
  }, [V, d, o]);
  function ue(x) {
    const T = J.current;
    !T || typeof T.scrollTo != "function" || (ee.current = !0, Z.current = !0, I(!1), se.current && window.clearTimeout(se.current), F.current = Math.max(
      F.current,
      Date.now() + (x === "smooth" ? 650 : 150)
    ), T.scrollTo({ top: T.scrollHeight, behavior: x }), se.current = window.setTimeout(() => {
      se.current = void 0, Z.current = !1;
    }, x === "smooth" ? 400 : 0));
  }
  z(() => {
    ee.current = !0, Z.current = !1, X.current = 0, I(!1), requestAnimationFrame(() => ue("auto"));
  }, [V]), z(() => {
    ee.current && ue("smooth");
  }, [o]), z(() => {
    const x = J.current, T = v.current;
    if (!x || !T || typeof ResizeObserver > "u") return;
    const Y = new ResizeObserver(() => {
      ee.current && ue("auto");
    });
    return Y.observe(T), () => Y.disconnect();
  }, [V, d]), z(() => () => {
    B.current && window.clearTimeout(B.current), se.current && window.clearTimeout(se.current);
  }, []), z(() => {
    M > 0 && U.current?.focus();
  }, [V, M]);
  function ie() {
    Z.current || Date.now() < F.current || (q(!0), B.current && window.clearTimeout(B.current), B.current = window.setTimeout(() => {
      B.current = void 0, q(!1);
    }, 700));
  }
  async function ce(x) {
    x.preventDefault();
    const T = k.trim();
    if (!(!T || te.current)) {
      te.current = !0, c(""), p(!0);
      try {
        await l(T);
      } finally {
        te.current = !1, p(!1);
      }
    }
  }
  return /* @__PURE__ */ e.createElement("main", { className: "conversation" }, /* @__PURE__ */ e.createElement("header", { className: `conversation-header ${f ? "scrolled" : ""}` }, /* @__PURE__ */ e.createElement("h1", null, n?.emoji && /* @__PURE__ */ e.createElement("span", { className: "conversation-emoji" }, n.emoji), ne), n?.subtitle && /* @__PURE__ */ e.createElement("p", { className: "conversation-subtitle" }, n.subtitle), /* @__PURE__ */ e.createElement("div", { className: "header-actions" }, !Q && /* @__PURE__ */ e.createElement("button", { className: "computer-trigger", "aria-label": "Open this teammate's computer", onClick: s }, /* @__PURE__ */ e.createElement(Qe, { size: 18 })))), /* @__PURE__ */ e.createElement("div", { className: "conversation-scroll-shell" }, d ? /* @__PURE__ */ e.createElement("div", { className: "conversation-skeleton", role: "status", "aria-label": "Loading this thread" }, /* @__PURE__ */ e.createElement("div", { className: "skeleton-message skeleton-agent" }, /* @__PURE__ */ e.createElement("span", { className: "skeleton-line skeleton-line-wide" }), /* @__PURE__ */ e.createElement("span", { className: "skeleton-line" })), /* @__PURE__ */ e.createElement("div", { className: "skeleton-message skeleton-user" }, /* @__PURE__ */ e.createElement("span", { className: "skeleton-bubble" })), /* @__PURE__ */ e.createElement("div", { className: "skeleton-message skeleton-agent" }, /* @__PURE__ */ e.createElement("span", { className: "skeleton-line skeleton-line-short" }))) : /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement(
    "div",
    {
      className: `message-scroll ${L ? "scrollbar-visible" : ""}`,
      ref: J,
      onWheelCapture: (x) => {
        x.deltaY < 0 && (Z.current = !1);
      },
      onScroll: (x) => {
        const T = x.currentTarget, Y = T.scrollHeight - T.scrollTop - T.clientHeight, b = Y <= 24, C = T.scrollTop < X.current - 1;
        X.current = T.scrollTop, u(T.scrollTop > 0), C && Y > 72 ? (Z.current = !1, ee.current = !1, I(!0)) : !Z.current && b ? (ee.current = !0, I(!1)) : !Z.current && Y > 72 && (ee.current = !1, I(!0)), ie();
      },
      onPointerMove: (x) => {
        x.currentTarget.getBoundingClientRect().right - x.clientX <= 14 ? q(!0) : B.current || q(!1);
      },
      onPointerLeave: () => q(!1)
    },
    /* @__PURE__ */ e.createElement("div", { className: "message-content", ref: v }, o.length === 0 && t && /* @__PURE__ */ e.createElement("div", { className: "conversation-intro" }, /* @__PURE__ */ e.createElement(rt, { agent: t, size: 54 }), /* @__PURE__ */ e.createElement("h2", null, t.name), /* @__PURE__ */ e.createElement("p", null, t.role)), o.map((x) => /* @__PURE__ */ e.createElement(
      jn,
      {
        key: x.id,
        message: x,
        agent: t,
        senderName: Q ? r.get(x.sender ?? "")?.name : void 0,
        activities: m,
        chips: E,
        entering: pe.has(x.id) || x.id.startsWith("optimistic-user:")
      }
    )))
  ), R && /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "scroll-to-bottom",
      "aria-label": "Scroll to the latest message",
      onClick: () => ue("smooth")
    },
    /* @__PURE__ */ e.createElement(jt, { size: 20 })
  ))), /* @__PURE__ */ e.createElement("form", { className: "composer", onSubmit: ce }, /* @__PURE__ */ e.createElement(
    "textarea",
    {
      ref: U,
      "aria-label": `Message ${ne}`,
      placeholder: Q ? "Ask the room…" : `Message ${ne}…`,
      value: k,
      onChange: (x) => c(x.target.value),
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
    a ? /* @__PURE__ */ e.createElement(Un, null) : /* @__PURE__ */ e.createElement(zn, null)
  ))));
}
const Fn = [
  { id: "all", label: "Everything", types: [] },
  {
    id: "stopped",
    label: "Stopped",
    types: ["tool.refused", "tool.held", "approval.expired", "crew.bot_declined"]
  },
  { id: "failed", label: "Went wrong", types: ["tool.failed"] },
  { id: "decisions", label: "Your decisions", types: ["approval.decided", "grant.changed"] }
], Bn = {
  "tool.allowed": Ae,
  "tool.refused": fn,
  "tool.held": Ue,
  "tool.failed": yn,
  "approval.decided": Ae,
  "approval.expired": Je,
  "grant.changed": qe,
  "crew.policy_loaded": qe,
  "crew.bot_declined": Ue
}, Wn = {
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
function Gn(t) {
  const n = new Date(t);
  return `${n.toLocaleDateString(void 0, { month: "short", day: "numeric" })} ${n.toLocaleTimeString(void 0, { hour: "2-digit", minute: "2-digit" })}`;
}
function Kn({ events: t, loading: n, viewId: r, onChangeView: o, onLoadMore: m, hasMore: E }) {
  const [d, M] = N(() => /* @__PURE__ */ new Set()), l = he(() => t.slice().sort((s, k) => k.id - s.id), [t]);
  return /* @__PURE__ */ e.createElement("section", { className: "audit-timeline" }, /* @__PURE__ */ e.createElement("div", { className: "audit-views", role: "tablist", "aria-label": "What to show" }, Fn.map((s) => /* @__PURE__ */ e.createElement(
    "button",
    {
      key: s.id,
      role: "tab",
      type: "button",
      "aria-selected": r === s.id,
      className: `audit-view ${r === s.id ? "is-current" : ""}`,
      onClick: () => o(s.id, s.types)
    },
    s.label
  ))), l.length === 0 && !n && /* @__PURE__ */ e.createElement("p", { className: "audit-empty" }, "Nothing recorded yet."), /* @__PURE__ */ e.createElement("ol", { className: "audit-rows" }, l.map((s) => {
    const k = Bn[s.event_type] ?? Ae, c = d.has(s.id), a = s.event_type === "tool.refused" || s.event_type === "tool.held";
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
          "aria-expanded": c,
          onClick: () => M((p) => {
            const f = new Set(p);
            return f.delete(s.id) || f.add(s.id), f;
          })
        },
        /* @__PURE__ */ e.createElement(k, { size: 14 }),
        /* @__PURE__ */ e.createElement("span", { className: "audit-subject" }, s.subject || s.tool || s.event_type),
        /* @__PURE__ */ e.createElement("span", { className: "audit-kind" }, Wn[s.event_type] ?? s.event_type),
        /* @__PURE__ */ e.createElement("time", { className: "audit-when", dateTime: new Date(s.created_at).toISOString() }, Gn(s.created_at))
      ),
      c && /* @__PURE__ */ e.createElement("dl", { className: "audit-detail" }, s.tool && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Tool"), /* @__PURE__ */ e.createElement("dd", null, /* @__PURE__ */ e.createElement("code", null, s.tool))), s.detail && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Why"), /* @__PURE__ */ e.createElement("dd", null, s.detail)), s.actor !== "_system" && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Who"), /* @__PURE__ */ e.createElement("dd", null, s.actor === "_operator" ? "you" : s.actor)), s.duration_ms !== null && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Took"), /* @__PURE__ */ e.createElement("dd", null, s.duration_ms, " ms")), s.args_digest && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Arguments"), /* @__PURE__ */ e.createElement("dd", null, /* @__PURE__ */ e.createElement("code", null, s.args_digest))))
    );
  })), E && /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "secondary-button",
      disabled: n,
      onClick: m
    },
    n ? "Loading…" : "Show older"
  ));
}
const Yn = {
  slides: mn,
  document: Ee,
  sheet: tn,
  image: an,
  data: Xt,
  text: Ee,
  code: en,
  archive: Ht,
  file: Ze
};
function Xn(t) {
  if (t === 0) return "0 bytes";
  const n = ["bytes", "KB", "MB", "GB"];
  let r = t, o = 0;
  for (; r >= 1024 && o < n.length - 1; )
    r /= 1024, o += 1;
  return `${o === 0 ? r : r.toFixed(r < 10 ? 1 : 0)} ${n[o]}`;
}
function Jn(t) {
  const n = new Date(t);
  return Number.isNaN(n.getTime()) ? "" : (/* @__PURE__ */ new Date()).toDateString() === n.toDateString() ? n.toLocaleTimeString(void 0, { hour: "2-digit", minute: "2-digit" }) : n.toLocaleDateString(void 0, { month: "short", day: "numeric" });
}
function Zn({ agentName: t, artifacts: n, urlFor: r }) {
  return n.length === 0 ? /* @__PURE__ */ e.createElement("p", { className: "files-empty" }, t, " has not produced any files yet.") : /* @__PURE__ */ e.createElement("ul", { className: "files-list" }, n.map((o) => {
    const m = Yn[o.kind] ?? Ze, E = o.size === 0;
    return /* @__PURE__ */ e.createElement("li", { className: `files-row ${E ? "is-empty" : ""}`, key: o.id }, /* @__PURE__ */ e.createElement(
      "a",
      {
        href: r(o),
        download: o.name,
        className: "files-link"
      },
      /* @__PURE__ */ e.createElement(m, { size: 15 }),
      /* @__PURE__ */ e.createElement("span", { className: "files-name", title: o.path }, o.name),
      /* @__PURE__ */ e.createElement("span", { className: "files-meta" }, Xn(o.size), E && /* @__PURE__ */ e.createElement("span", { className: "files-warning", title: "Nothing was written to this file" }, "didn't finish")),
      /* @__PURE__ */ e.createElement("span", { className: "files-when" }, Jn(o.updatedAt)),
      /* @__PURE__ */ e.createElement(Jt, { size: 13, className: "files-download" })
    ));
  }));
}
const Qn = {
  pending: Xe,
  running: Me,
  succeeded: Ce,
  failed: En,
  waiting: rn
}, er = {
  web: nn,
  file: Ee,
  mail: cn,
  user: vn
};
function tr({ step: t }) {
  const n = Qn[t.status] ?? Xe;
  return /* @__PURE__ */ e.createElement("li", { className: `plan-step is-${t.status}` }, /* @__PURE__ */ e.createElement(n, { size: 13, className: t.status === "running" ? "spin" : void 0 }), /* @__PURE__ */ e.createElement("span", { className: "plan-step-title" }, t.title), t.detail && /* @__PURE__ */ e.createElement("span", { className: "plan-step-detail" }, t.detail));
}
function nr({ item: t }) {
  const n = er[t.kind] ?? Ee, r = t.url ? /* @__PURE__ */ e.createElement("a", { href: t.url, target: "_blank", rel: "noreferrer noopener" }, t.title) : /* @__PURE__ */ e.createElement("span", null, t.title);
  return /* @__PURE__ */ e.createElement("li", { className: "evidence-row" }, /* @__PURE__ */ e.createElement("div", { className: "evidence-head" }, /* @__PURE__ */ e.createElement(n, { size: 12 }), r), /* @__PURE__ */ e.createElement("p", { className: "evidence-excerpt" }, t.excerpt));
}
function rr({ agentName: t, tasks: n }) {
  return n.length === 0 ? /* @__PURE__ */ e.createElement("p", { className: "plan-empty" }, t, " has no scheduled or long-running work.") : /* @__PURE__ */ e.createElement("div", { className: "plan-list" }, n.map((r) => /* @__PURE__ */ e.createElement("section", { className: "plan-task", key: r.id }, /* @__PURE__ */ e.createElement("div", { className: "plan-task-head" }, /* @__PURE__ */ e.createElement("span", { className: "plan-task-title" }, r.title || r.kind), /* @__PURE__ */ e.createElement("span", { className: `plan-task-status is-${r.status}` }, r.status.replace("_", " "))), r.attempts > 1 && /* @__PURE__ */ e.createElement("p", { className: "plan-task-attempts" }, "picked up ", r.attempts, " times"), r.error && /* @__PURE__ */ e.createElement("p", { className: "plan-task-error" }, r.error), r.plan.length > 0 && /* @__PURE__ */ e.createElement("ol", { className: "plan-steps" }, r.plan.map((o) => /* @__PURE__ */ e.createElement(tr, { step: o, key: o.id }))), r.evidence.length > 0 && /* @__PURE__ */ e.createElement("details", { className: "evidence" }, /* @__PURE__ */ e.createElement("summary", null, "What it read (", r.evidence.length, ")"), /* @__PURE__ */ e.createElement("ul", { className: "evidence-list" }, r.evidence.map((o, m) => /* @__PURE__ */ e.createElement(nr, { item: o, key: `${o.title}-${m}` })))))));
}
const ar = [
  { mode: "deny", label: "Never", icon: Vt },
  { mode: "ask", label: "Ask me", icon: Gt },
  { mode: "allow", label: "Allow", icon: hn }
];
function sr({ agentName: t, grants: n, busy: r, onSetGrant: o, onClearGrant: m }) {
  const [E, d] = N(""), [M, l] = N(!1), s = he(() => {
    const c = E.trim().toLowerCase(), a = n.filter((f) => M && f.source !== "grant" ? !1 : c ? f.tool.toLowerCase().includes(c) || f.toolset.toLowerCase().includes(c) : !0), p = /* @__PURE__ */ new Map();
    for (const f of a) {
      const u = f.toolset || "other";
      p.set(u, [...p.get(u) ?? [], f]);
    }
    return [...p.entries()].sort(([f], [u]) => f.localeCompare(u));
  }, [n, E, M]), k = n.filter((c) => c.mode === "ask").length;
  return /* @__PURE__ */ e.createElement("section", { className: "permissions-panel" }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow" }, /* @__PURE__ */ e.createElement(on, { size: 14 }), " What ", t, " can do"), /* @__PURE__ */ e.createElement("p", { className: "permissions-summary" }, n.length, " tools · ", k, " need your say-so"), /* @__PURE__ */ e.createElement("div", { className: "permissions-filters" }, /* @__PURE__ */ e.createElement(
    "input",
    {
      type: "search",
      "aria-label": "Filter tools",
      placeholder: "Filter tools…",
      value: E,
      onChange: (c) => d(c.target.value)
    }
  ), /* @__PURE__ */ e.createElement("label", null, /* @__PURE__ */ e.createElement(
    "input",
    {
      type: "checkbox",
      checked: M,
      onChange: (c) => l(c.target.checked)
    }
  ), "Only what I changed")), s.length === 0 && /* @__PURE__ */ e.createElement("p", { className: "permissions-empty" }, "Nothing matches."), s.map(([c, a]) => /* @__PURE__ */ e.createElement("div", { className: "permissions-group", key: c }, /* @__PURE__ */ e.createElement("h4", null, c), a.map((p) => /* @__PURE__ */ e.createElement(
    "div",
    {
      className: `permissions-row ${p.protected ? "is-protected" : ""} ${p.available === !1 ? "is-unavailable" : ""}`,
      key: p.tool
    },
    /* @__PURE__ */ e.createElement("div", { className: "permissions-tool" }, /* @__PURE__ */ e.createElement("code", null, p.tool), /* @__PURE__ */ e.createElement("span", { className: "permissions-why" }, p.why)),
    /* @__PURE__ */ e.createElement("div", { className: "permissions-modes", role: "group", "aria-label": `What ${t} may do with ${p.tool}` }, ar.map(({ mode: f, label: u, icon: R }) => /* @__PURE__ */ e.createElement(
      "button",
      {
        key: f,
        type: "button",
        className: `permissions-mode ${p.mode === f ? "is-current" : ""}`,
        "aria-pressed": p.mode === f,
        disabled: r || p.protected,
        title: p.protected ? "This teammate always keeps this one" : u,
        onClick: () => {
          o(p.tool, f);
        }
      },
      /* @__PURE__ */ e.createElement(R, { size: 13 }),
      " ",
      u
    )), p.source === "grant" && !p.protected && /* @__PURE__ */ e.createElement(
      "button",
      {
        type: "button",
        className: "permissions-reset",
        "aria-label": `Reset ${p.tool} to the default`,
        disabled: r,
        onClick: () => {
          m(p.tool);
        }
      },
      /* @__PURE__ */ e.createElement(pn, { size: 13 })
    ))
  )))));
}
function Nr(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
function or(t) {
  if (Object.prototype.hasOwnProperty.call(t, "__esModule")) return t;
  var n = t.default;
  if (typeof n == "function") {
    var r = function o() {
      var m = !1;
      try {
        m = this instanceof o;
      } catch {
      }
      return m ? Reflect.construct(n, arguments, this.constructor) : n.apply(this, arguments);
    };
    r.prototype = n.prototype;
  } else r = {};
  return Object.defineProperty(r, "__esModule", { value: !0 }), Object.keys(t).forEach(function(o) {
    var m = Object.getOwnPropertyDescriptor(t, o);
    Object.defineProperty(r, o, m.get ? m : {
      enumerable: !0,
      get: function() {
        return t[o];
      }
    });
  }), r;
}
var Ne = { exports: {} }, le = {};
const at = /* @__PURE__ */ or(Lt);
var je;
function ir() {
  if (je) return le;
  je = 1;
  var t = at;
  function n(l) {
    var s = "https://react.dev/errors/" + l;
    if (1 < arguments.length) {
      s += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var k = 2; k < arguments.length; k++)
        s += "&args[]=" + encodeURIComponent(arguments[k]);
    }
    return "Minified React error #" + l + "; visit " + s + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function r() {
  }
  var o = {
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
  }, m = /* @__PURE__ */ Symbol.for("react.portal");
  function E(l, s, k) {
    var c = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: m,
      key: c == null ? null : "" + c,
      children: l,
      containerInfo: s,
      implementation: k
    };
  }
  var d = t.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function M(l, s) {
    if (l === "font") return "";
    if (typeof s == "string")
      return s === "use-credentials" ? s : "";
  }
  return le.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = o, le.createPortal = function(l, s) {
    var k = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!s || s.nodeType !== 1 && s.nodeType !== 9 && s.nodeType !== 11)
      throw Error(n(299));
    return E(l, s, null, k);
  }, le.flushSync = function(l) {
    var s = d.T, k = o.p;
    try {
      if (d.T = null, o.p = 2, l) return l();
    } finally {
      d.T = s, o.p = k, o.d.f();
    }
  }, le.preconnect = function(l, s) {
    typeof l == "string" && (s ? (s = s.crossOrigin, s = typeof s == "string" ? s === "use-credentials" ? s : "" : void 0) : s = null, o.d.C(l, s));
  }, le.prefetchDNS = function(l) {
    typeof l == "string" && o.d.D(l);
  }, le.preinit = function(l, s) {
    if (typeof l == "string" && s && typeof s.as == "string") {
      var k = s.as, c = M(k, s.crossOrigin), a = typeof s.integrity == "string" ? s.integrity : void 0, p = typeof s.fetchPriority == "string" ? s.fetchPriority : void 0;
      k === "style" ? o.d.S(
        l,
        typeof s.precedence == "string" ? s.precedence : void 0,
        {
          crossOrigin: c,
          integrity: a,
          fetchPriority: p
        }
      ) : k === "script" && o.d.X(l, {
        crossOrigin: c,
        integrity: a,
        fetchPriority: p,
        nonce: typeof s.nonce == "string" ? s.nonce : void 0
      });
    }
  }, le.preinitModule = function(l, s) {
    if (typeof l == "string")
      if (typeof s == "object" && s !== null) {
        if (s.as == null || s.as === "script") {
          var k = M(
            s.as,
            s.crossOrigin
          );
          o.d.M(l, {
            crossOrigin: k,
            integrity: typeof s.integrity == "string" ? s.integrity : void 0,
            nonce: typeof s.nonce == "string" ? s.nonce : void 0
          });
        }
      } else s == null && o.d.M(l);
  }, le.preload = function(l, s) {
    if (typeof l == "string" && typeof s == "object" && s !== null && typeof s.as == "string") {
      var k = s.as, c = M(k, s.crossOrigin);
      o.d.L(l, k, {
        crossOrigin: c,
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
  }, le.preloadModule = function(l, s) {
    if (typeof l == "string")
      if (s) {
        var k = M(s.as, s.crossOrigin);
        o.d.m(l, {
          as: typeof s.as == "string" && s.as !== "script" ? s.as : void 0,
          crossOrigin: k,
          integrity: typeof s.integrity == "string" ? s.integrity : void 0
        });
      } else o.d.m(l);
  }, le.requestFormReset = function(l) {
    o.d.r(l);
  }, le.unstable_batchedUpdates = function(l, s) {
    return l(s);
  }, le.useFormState = function(l, s, k) {
    return d.H.useFormState(l, s, k);
  }, le.useFormStatus = function() {
    return d.H.useHostTransitionStatus();
  }, le.version = "19.2.7", le;
}
var de = {};
var Ve;
function cr() {
  return Ve || (Ve = 1, process.env.NODE_ENV !== "production" && (function() {
    function t() {
    }
    function n(c) {
      return "" + c;
    }
    function r(c, a, p) {
      var f = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
      try {
        n(f);
        var u = !1;
      } catch {
        u = !0;
      }
      return u && (console.error(
        "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
        typeof Symbol == "function" && Symbol.toStringTag && f[Symbol.toStringTag] || f.constructor.name || "Object"
      ), n(f)), {
        $$typeof: s,
        key: f == null ? null : "" + f,
        children: c,
        containerInfo: a,
        implementation: p
      };
    }
    function o(c, a) {
      if (c === "font") return "";
      if (typeof a == "string")
        return a === "use-credentials" ? a : "";
    }
    function m(c) {
      return c === null ? "`null`" : c === void 0 ? "`undefined`" : c === "" ? "an empty string" : 'something with type "' + typeof c + '"';
    }
    function E(c) {
      return c === null ? "`null`" : c === void 0 ? "`undefined`" : c === "" ? "an empty string" : typeof c == "string" ? JSON.stringify(c) : typeof c == "number" ? "`" + c + "`" : 'something with type "' + typeof c + '"';
    }
    function d() {
      var c = k.H;
      return c === null && console.error(
        `Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:
1. You might have mismatching versions of React and the renderer (such as React DOM)
2. You might be breaking the Rules of Hooks
3. You might have more than one copy of React in the same app
See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.`
      ), c;
    }
    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart == "function" && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
    var M = at, l = {
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
    ), de.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = l, de.createPortal = function(c, a) {
      var p = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
      if (!a || a.nodeType !== 1 && a.nodeType !== 9 && a.nodeType !== 11)
        throw Error("Target container is not a DOM element.");
      return r(c, a, null, p);
    }, de.flushSync = function(c) {
      var a = k.T, p = l.p;
      try {
        if (k.T = null, l.p = 2, c)
          return c();
      } finally {
        k.T = a, l.p = p, l.d.f() && console.error(
          "flushSync was called from inside a lifecycle method. React cannot flush when React is already rendering. Consider moving this call to a scheduler task or micro task."
        );
      }
    }, de.preconnect = function(c, a) {
      typeof c == "string" && c ? a != null && typeof a != "object" ? console.error(
        "ReactDOM.preconnect(): Expected the `options` argument (second) to be an object but encountered %s instead. The only supported option at this time is `crossOrigin` which accepts a string.",
        E(a)
      ) : a != null && typeof a.crossOrigin != "string" && console.error(
        "ReactDOM.preconnect(): Expected the `crossOrigin` option (second argument) to be a string but encountered %s instead. Try removing this option or passing a string value instead.",
        m(a.crossOrigin)
      ) : console.error(
        "ReactDOM.preconnect(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
        m(c)
      ), typeof c == "string" && (a ? (a = a.crossOrigin, a = typeof a == "string" ? a === "use-credentials" ? a : "" : void 0) : a = null, l.d.C(c, a));
    }, de.prefetchDNS = function(c) {
      if (typeof c != "string" || !c)
        console.error(
          "ReactDOM.prefetchDNS(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
          m(c)
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
      typeof c == "string" && l.d.D(c);
    }, de.preinit = function(c, a) {
      if (typeof c == "string" && c ? a == null || typeof a != "object" ? console.error(
        "ReactDOM.preinit(): Expected the `options` argument (second) to be an object with an `as` property describing the type of resource to be preinitialized but encountered %s instead.",
        E(a)
      ) : a.as !== "style" && a.as !== "script" && console.error(
        'ReactDOM.preinit(): Expected the `as` property in the `options` argument (second) to contain a valid value describing the type of resource to be preinitialized but encountered %s instead. Valid values for `as` are "style" and "script".',
        E(a.as)
      ) : console.error(
        "ReactDOM.preinit(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
        m(c)
      ), typeof c == "string" && a && typeof a.as == "string") {
        var p = a.as, f = o(p, a.crossOrigin), u = typeof a.integrity == "string" ? a.integrity : void 0, R = typeof a.fetchPriority == "string" ? a.fetchPriority : void 0;
        p === "style" ? l.d.S(
          c,
          typeof a.precedence == "string" ? a.precedence : void 0,
          {
            crossOrigin: f,
            integrity: u,
            fetchPriority: R
          }
        ) : p === "script" && l.d.X(c, {
          crossOrigin: f,
          integrity: u,
          fetchPriority: R,
          nonce: typeof a.nonce == "string" ? a.nonce : void 0
        });
      }
    }, de.preinitModule = function(c, a) {
      var p = "";
      typeof c == "string" && c || (p += " The `href` argument encountered was " + m(c) + "."), a !== void 0 && typeof a != "object" ? p += " The `options` argument encountered was " + m(a) + "." : a && "as" in a && a.as !== "script" && (p += " The `as` option encountered was " + E(a.as) + "."), p ? console.error(
        "ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` string and, optionally, an `options` object with a valid `as` property.%s",
        p
      ) : (p = a && typeof a.as == "string" ? a.as : "script", p) === "script" || (p = E(p), console.error(
        'ReactDOM.preinitModule(): Currently the only supported "as" type for this function is "script" but received "%s" instead. This warning was generated for `href` "%s". In the future other module types will be supported, aligning with the import-attributes proposal. Learn more here: (https://github.com/tc39/proposal-import-attributes)',
        p,
        c
      )), typeof c == "string" && (typeof a == "object" && a !== null ? (a.as == null || a.as === "script") && (p = o(
        a.as,
        a.crossOrigin
      ), l.d.M(c, {
        crossOrigin: p,
        integrity: typeof a.integrity == "string" ? a.integrity : void 0,
        nonce: typeof a.nonce == "string" ? a.nonce : void 0
      })) : a == null && l.d.M(c));
    }, de.preload = function(c, a) {
      var p = "";
      if (typeof c == "string" && c || (p += " The `href` argument encountered was " + m(c) + "."), a == null || typeof a != "object" ? p += " The `options` argument encountered was " + m(a) + "." : typeof a.as == "string" && a.as || (p += " The `as` option encountered was " + m(a.as) + "."), p && console.error(
        'ReactDOM.preload(): Expected two arguments, a non-empty `href` string and an `options` object with an `as` property valid for a `<link rel="preload" as="..." />` tag.%s',
        p
      ), typeof c == "string" && typeof a == "object" && a !== null && typeof a.as == "string") {
        p = a.as;
        var f = o(
          p,
          a.crossOrigin
        );
        l.d.L(c, p, {
          crossOrigin: f,
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
    }, de.preloadModule = function(c, a) {
      var p = "";
      typeof c == "string" && c || (p += " The `href` argument encountered was " + m(c) + "."), a !== void 0 && typeof a != "object" ? p += " The `options` argument encountered was " + m(a) + "." : a && "as" in a && typeof a.as != "string" && (p += " The `as` option encountered was " + m(a.as) + "."), p && console.error(
        'ReactDOM.preloadModule(): Expected two arguments, a non-empty `href` string and, optionally, an `options` object with an `as` property valid for a `<link rel="modulepreload" as="..." />` tag.%s',
        p
      ), typeof c == "string" && (a ? (p = o(
        a.as,
        a.crossOrigin
      ), l.d.m(c, {
        as: typeof a.as == "string" && a.as !== "script" ? a.as : void 0,
        crossOrigin: p,
        integrity: typeof a.integrity == "string" ? a.integrity : void 0
      })) : l.d.m(c));
    }, de.requestFormReset = function(c) {
      l.d.r(c);
    }, de.unstable_batchedUpdates = function(c, a) {
      return c(a);
    }, de.useFormState = function(c, a, p) {
      return d().useFormState(c, a, p);
    }, de.useFormStatus = function() {
      return d().useHostTransitionStatus();
    }, de.version = "19.2.7", typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop == "function" && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
  })()), de;
}
var Fe;
function lr() {
  if (Fe) return Ne.exports;
  Fe = 1;
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
  return process.env.NODE_ENV === "production" ? (t(), Ne.exports = ir()) : Ne.exports = cr(), Ne.exports;
}
var st = lr();
function dr(t) {
  if (t.width <= 0 || t.height <= 0) return !1;
  try {
    const n = t.getContext("2d", { willReadFrequently: !0 });
    if (!n) return !1;
    const r = [0, Math.floor(t.width / 2), t.width - 1], o = [0, Math.floor(t.height / 2), t.height - 1], m = r.flatMap((E) => o.map((d) => n.getImageData(E, d, 1, 1).data));
    if (m.every((E) => E[3] === 0)) return !1;
    for (let E = 0; E < 3; E += 1) {
      const d = m.map((M) => M[E]);
      if (Math.max(...d) - Math.min(...d) > 6) return !0;
    }
    return !1;
  } catch {
    return !1;
  }
}
function ot({
  session: t,
  viewOnly: n,
  compact: r = !1,
  onReconnect: o,
  onDisconnect: m
}) {
  const E = G(null), d = G(m), [M, l] = N("connecting"), [s, k] = N();
  return z(() => {
    d.current = m;
  }, [m]), z(() => {
    if (!E.current) return;
    let c = !1, a = !1, p = !1, f = !1, u, R, I, L;
    (r ? E.current.closest(".computer-preview") : null)?.style.removeProperty("aspect-ratio"), l("connecting"), k(void 0);
    const J = () => {
      u && window.clearInterval(u), R && window.clearTimeout(R), u = void 0, R = void 0;
    }, v = () => {
      I && window.clearTimeout(I), I = void 0;
    }, U = () => {
      f || (f = !0, d.current?.());
    }, te = (B) => {
      c || a || (a = !0, v(), J(), k(B), l("disconnected"), U(), L?.disconnect());
    }, ee = () => {
      const B = E.current?.querySelector("canvas");
      return B ? dr(B) : !1;
    }, Z = () => {
      c || a || (v(), p = !0, u = window.setInterval(() => {
        !c && ee() && (J(), l("connected"));
      }, 100), R = window.setTimeout(() => {
        ee() || te("This computer connected but never drew a frame.");
      }, 8e3));
    }, F = (B) => {
      if (c || a) return;
      v(), J();
      const oe = B.detail?.clean;
      k((re) => re ?? (p && oe ? "This computer stopped before drawing a frame." : oe ? "This computer disconnected." : "The connection to this computer was lost.")), l("disconnected"), U();
    }, X = (B) => {
      te(B.detail?.reason ?? "Screen security negotiation failed.");
    }, se = () => te("This computer's screen is asking for a VNC password.");
    return I = window.setTimeout(() => te("This computer's screen did not answer."), 15e3), import("./chunk-rfb-DFY61DWN.js").then(({ default: B }) => {
      c || a || !E.current || (L = new B(E.current, t.url, { shared: !0, wsProtocols: t.protocols }), L.viewOnly = n, L.scaleViewport = !0, L.resizeSession = !1, r && (L.background = "transparent"), L.addEventListener("connect", Z), L.addEventListener("disconnect", F), L.addEventListener("securityfailure", X), L.addEventListener("credentialsrequired", se));
    }).catch(() => te("Could not load the screen client.")), () => {
      c = !0, v(), J(), L?.removeEventListener("connect", Z), L?.removeEventListener("disconnect", F), L?.removeEventListener("securityfailure", X), L?.removeEventListener("credentialsrequired", se), L?.disconnect();
    };
  }, [r, t, n]), /* @__PURE__ */ e.createElement("div", { className: `vnc-viewport ${r ? "is-compact" : ""}` }, /* @__PURE__ */ e.createElement("div", { ref: E, className: "vnc-target" }), M !== "connected" && /* @__PURE__ */ e.createElement("div", { className: "vnc-status", role: "status" }, M === "connecting" ? /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement(Me, { size: r ? 14 : 18, className: "spin" }), !r && "Connecting…") : /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("span", null, r ? "Screen unavailable" : s), o && /* @__PURE__ */ e.createElement("button", { className: "secondary-button", onClick: o }, "Reconnect"))));
}
function ur({
  session: t,
  failure: n,
  title: r,
  onClose: o,
  onReconnect: m
}) {
  return st.createPortal(/* @__PURE__ */ e.createElement("div", { className: "vnc-desktop", role: "dialog", "aria-label": r }, /* @__PURE__ */ e.createElement("div", { className: "vnc-titlebar", "aria-hidden": "true" }), /* @__PURE__ */ e.createElement("button", { className: "vnc-close", "aria-label": "Close this screen", onClick: o }, /* @__PURE__ */ e.createElement(dn, { size: 18 })), t ? /* @__PURE__ */ e.createElement(ot, { session: t, viewOnly: !1, onReconnect: m }) : /* @__PURE__ */ e.createElement("div", { className: "vnc-viewport" }, /* @__PURE__ */ e.createElement("div", { className: "vnc-status", role: "status" }, n ? /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("span", null, n), /* @__PURE__ */ e.createElement("button", { className: "secondary-button", onClick: m }, "Reconnect")) : /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement(Me, { size: 18, className: "spin" }), " Connecting…")))), document.body);
}
function mr({
  open: t,
  width: n,
  onResize: r,
  agentName: o,
  computer: m,
  approvals: E,
  routines: d,
  grants: M,
  grantsBusy: l,
  audit: s,
  auditLoading: k,
  auditView: c,
  auditHasMore: a,
  artifacts: p,
  artifactUrl: f,
  tasks: u,
  onApproval: R,
  onComputerAction: I,
  onDeleteRoutine: L,
  onSetGrant: q,
  onClearGrant: J,
  onChangeAuditView: v,
  onLoadMoreAudit: U,
  onClose: te
}) {
  const [ee, Z] = N(""), [F, X] = N(""), [se, B] = N(!1), [oe, re] = N(() => /* @__PURE__ */ new Map()), [me, pe] = N(""), [j, ne] = N(() => /* @__PURE__ */ new Set()), [Q, V] = N(), [ue, ie] = N(!1), [ce, x] = N(), T = E.filter((i) => i.status === "pending"), Y = oe.get(m?.id ?? ""), b = j.has(m?.id ?? ""), C = G(I);
  z(() => {
    C.current = I;
  }, [I]), z(() => {
    const i = m?.id;
    if (!t || ue || m?.status !== "online" || !i || Y || b) return;
    let h = !0;
    return pe(i), C.current("open").then((w) => {
      h && (re((O) => new Map(O).set(i, w)), pe(""));
    }).catch(() => {
      h && (ne((w) => new Set(w).add(i)), pe(""));
    }), () => {
      h = !1;
    };
  }, [m?.id, m?.status, ue, t, b, Y]);
  async function $(i) {
    ie(!0), V(void 0), x(void 0), B(!0);
    const h = m?.id;
    h && j.has(h) && (ne((w) => {
      const O = new Set(w);
      return O.delete(h), O;
    }), re((w) => {
      const O = new Map(w);
      return O.delete(h), O;
    }));
    try {
      V(await I(i));
    } catch (w) {
      x(w instanceof Error ? w.message : "Could not reach that computer.");
    } finally {
      B(!1);
    }
  }
  function H() {
    ie(!1), V(void 0), x(void 0);
  }
  const A = () => window.innerWidth <= 1030 ? Math.min(730, window.innerWidth - 40) : Math.min(730, window.innerWidth - (window.innerWidth <= 1180 ? 672 : 732));
  z(() => {
    const i = () => {
      const h = Math.max(280, A());
      n > h && r(h);
    };
    return i(), window.addEventListener("resize", i), () => window.removeEventListener("resize", i);
  }, [r, n]);
  const g = (i) => r(Math.max(280, Math.min(A(), window.innerWidth - i)));
  return /* @__PURE__ */ e.createElement("aside", { className: `detail-panel ${t ? "is-open" : "is-closing"}`, style: { width: n } }, /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "detail-resize-handle",
      role: "separator",
      "aria-label": "Resize the details panel",
      "aria-orientation": "vertical",
      "aria-valuemin": 280,
      "aria-valuemax": Math.max(280, A()),
      "aria-valuenow": n,
      tabIndex: 0,
      onKeyDown: (i) => {
        i.key === "ArrowLeft" ? (i.preventDefault(), r(Math.min(A(), n + 16))) : i.key === "ArrowRight" && (i.preventDefault(), r(Math.max(280, n - 16)));
      },
      onPointerDown: (i) => {
        i.currentTarget.setPointerCapture(i.pointerId), g(i.clientX);
      },
      onPointerMove: (i) => {
        i.currentTarget.hasPointerCapture(i.pointerId) && g(i.clientX);
      }
    }
  ), /* @__PURE__ */ e.createElement("header", null, /* @__PURE__ */ e.createElement("button", { className: "icon-button", "aria-label": "Close the details panel", onClick: te }, /* @__PURE__ */ e.createElement(Wt, { size: 18 }))), E.filter((i) => i.outcome === "outcome_unknown").map((i) => /* @__PURE__ */ e.createElement("section", { className: "approval-card is-uncertain", key: `unknown-${i.id}` }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow warning" }, /* @__PURE__ */ e.createElement(Oe, { size: 14 }), " Outcome unknown"), /* @__PURE__ */ e.createElement("h3", null, i.title), /* @__PURE__ */ e.createElement("p", null, "You allowed this and the process stopped before anything recorded whether it went through. It may have. Check before allowing it again."))), T.map((i) => /* @__PURE__ */ e.createElement("section", { className: "approval-card", key: i.id }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow warning" }, /* @__PURE__ */ e.createElement(Oe, { size: 14 }), " Waiting for you", i.source && i.source !== i.agentId && /* @__PURE__ */ e.createElement("span", { className: "approval-source" }, i.source), i.ref && /* @__PURE__ */ e.createElement("code", { className: "approval-ref", title: "Reply with this in the thread to decide without opening the panel" }, i.ref)), /* @__PURE__ */ e.createElement("h3", null, i.title), i.description && /* @__PURE__ */ e.createElement("p", null, i.description), i.scope.length > 0 && /* @__PURE__ */ e.createElement("div", { className: "scope" }, /* @__PURE__ */ e.createElement("span", null, "This allows:"), i.scope.map((h) => /* @__PURE__ */ e.createElement("div", { key: h }, /* @__PURE__ */ e.createElement(Ce, { size: 13 }), h))), /* @__PURE__ */ e.createElement(
    "textarea",
    {
      "aria-label": "Note for this decision",
      placeholder: "Add a note (optional)",
      value: ee,
      onChange: (h) => Z(h.target.value)
    }
  ), /* @__PURE__ */ e.createElement("div", { className: "approval-actions" }, /* @__PURE__ */ e.createElement("button", { className: "secondary-button danger-text", onClick: () => {
    R(i.id, "deny", ee, i.contentHash);
  } }, "Discard"), /* @__PURE__ */ e.createElement("button", { className: "primary-button", onClick: () => {
    R(i.id, "allow", ee, i.contentHash);
  } }, "Approve")))), /* @__PURE__ */ e.createElement("section", { className: "screen-section" }, /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "screen-trigger",
      disabled: se || m?.status !== "online",
      "aria-label": `Open ${o}'s screen`,
      onClick: () => {
        $("open");
      }
    },
    /* @__PURE__ */ e.createElement("span", { className: "computer-preview" }, [...oe].map(([i, h]) => /* @__PURE__ */ e.createElement(
      "span",
      {
        className: `computer-preview-stream ${i === m?.id ? "is-active" : ""}`,
        key: i
      },
      /* @__PURE__ */ e.createElement(
        ot,
        {
          session: h,
          viewOnly: !0,
          compact: !0,
          onDisconnect: () => ne((w) => new Set(w).add(i))
        }
      )
    )), !oe.has(m?.id ?? "") && (me === m?.id ? /* @__PURE__ */ e.createElement("span", { className: "computer-preview-loading", role: "status", "aria-label": `Loading ${o}'s screen` }, /* @__PURE__ */ e.createElement(Me, { size: 18, className: "spin" })) : j.has(m?.id ?? "") ? /* @__PURE__ */ e.createElement("span", { className: "computer-preview-loading", role: "status" }, "Screen unavailable") : /* @__PURE__ */ e.createElement("span", { className: "computer-screen-off", "aria-hidden": "true" })), /* @__PURE__ */ e.createElement("span", { className: "screen-hover-action" }, /* @__PURE__ */ e.createElement(ln, { size: 14 }), " Open"))
  ), /* @__PURE__ */ e.createElement("div", { className: "screen-caption" }, /* @__PURE__ */ e.createElement("span", null, o, "'s screen"), /* @__PURE__ */ e.createElement("span", { className: `screen-state ${m?.status ?? "offline"}` }, m?.status === "online" ? "Running" : m?.status === "starting" ? "Starting…" : "Off")), m && m.status !== "online" && /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "secondary-button",
      disabled: se,
      onClick: () => {
        $("takeover");
      }
    },
    "Start this computer"
  ), m?.error && /* @__PURE__ */ e.createElement("p", { className: "screen-error" }, m.error)), d.length > 0 && /* @__PURE__ */ e.createElement("section", { className: "routines-section" }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow" }, "Routines"), d.map((i) => /* @__PURE__ */ e.createElement("div", { className: "routine-row", key: i.id }, /* @__PURE__ */ e.createElement("div", null, /* @__PURE__ */ e.createElement("strong", null, i.name), /* @__PURE__ */ e.createElement("span", null, i.schedule)), /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "icon-button",
      "aria-label": `Cancel the routine ${i.name}`,
      onClick: () => {
        L(i.id);
      }
    },
    /* @__PURE__ */ e.createElement(nt, { size: 14 })
  )))), /* @__PURE__ */ e.createElement("section", { className: "drawer-section" }, /* @__PURE__ */ e.createElement("div", { className: "drawer-tabs", role: "tablist", "aria-label": "More about this teammate" }, /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": F === "work",
      className: F === "work" ? "is-current" : "",
      onClick: () => X((i) => i === "work" ? "" : "work")
    },
    "Work"
  ), /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": F === "files",
      className: F === "files" ? "is-current" : "",
      onClick: () => X((i) => i === "files" ? "" : "files")
    },
    "Files",
    p.length > 0 && /* @__PURE__ */ e.createElement("span", { className: "drawer-count" }, p.length)
  ), /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": F === "permissions",
      className: F === "permissions" ? "is-current" : "",
      onClick: () => X((i) => i === "permissions" ? "" : "permissions")
    },
    "Permissions"
  ), /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": F === "audit",
      className: F === "audit" ? "is-current" : "",
      onClick: () => X((i) => i === "audit" ? "" : "audit")
    },
    "History"
  )), F === "work" && /* @__PURE__ */ e.createElement(rr, { agentName: o, tasks: u }), F === "files" && /* @__PURE__ */ e.createElement(
    Zn,
    {
      agentName: o,
      artifacts: p,
      urlFor: f
    }
  ), F === "permissions" && /* @__PURE__ */ e.createElement(
    sr,
    {
      agentName: o,
      grants: M,
      busy: l,
      onSetGrant: q,
      onClearGrant: J
    }
  ), F === "audit" && /* @__PURE__ */ e.createElement(
    Kn,
    {
      events: s,
      loading: k,
      viewId: c,
      hasMore: a,
      onChangeView: v,
      onLoadMore: U
    }
  )), ue && /* @__PURE__ */ e.createElement(
    ur,
    {
      session: Q,
      failure: ce,
      title: `${o}'s computer`,
      onClose: H,
      onReconnect: () => {
        $("takeover");
      }
    }
  ));
}
function pr({
  value: t,
  options: n,
  ariaLabel: r,
  placeholder: o = "Select",
  onChange: m,
  onOpen: E
}) {
  const [d, M] = N(!1), [l, s] = N(), k = G(null), c = G(null), a = n.find((u) => u.value === t);
  z(() => {
    if (!d) return;
    const u = () => {
      const I = k.current?.getBoundingClientRect();
      if (!I) return;
      const L = 5, q = 8, J = Math.max(I.width, 180), v = Math.min(220, n.length * 32 + 10), U = window.innerHeight - I.bottom - q, te = U < v && I.top - q > U;
      s({
        position: "fixed",
        zIndex: 100,
        left: Math.max(q, Math.min(I.right - J, window.innerWidth - J - q)),
        top: te ? Math.max(q, I.top - v - L) : I.bottom + L,
        width: J,
        maxHeight: te ? Math.min(220, I.top - L - q) : Math.min(220, U)
      });
    }, R = (I) => {
      const L = I.target;
      !k.current?.contains(L) && !c.current?.contains(L) && M(!1);
    };
    return u(), window.addEventListener("pointerdown", R), window.addEventListener("resize", u), window.addEventListener("scroll", u, !0), () => {
      window.removeEventListener("pointerdown", R), window.removeEventListener("resize", u), window.removeEventListener("scroll", u, !0);
    };
  }, [d, n.length]);
  const p = (u) => {
    const R = n.filter((q) => !q.disabled && !q.action);
    if (!R.length) return;
    const I = R.findIndex((q) => q.value === t), L = I < 0 ? u > 0 ? 0 : R.length - 1 : (I + u + R.length) % R.length;
    m(R[L].value);
  }, f = () => M((u) => (u || E?.(), !u));
  return /* @__PURE__ */ e.createElement("div", { className: `crew-select ${d ? "open" : ""}`, ref: k }, /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "crew-select-trigger",
      "aria-label": r,
      "aria-haspopup": "listbox",
      "aria-expanded": d,
      onClick: f,
      onKeyDown: (u) => {
        if (u.key === "Escape") {
          M(!1);
          return;
        }
        (u.key === "ArrowDown" || u.key === "ArrowUp") && (u.preventDefault(), p(u.key === "ArrowDown" ? 1 : -1), d || E?.(), M(!0));
      }
    },
    /* @__PURE__ */ e.createElement("span", null, a?.label ?? o),
    /* @__PURE__ */ e.createElement("span", { className: "crew-select-chevron" }, /* @__PURE__ */ e.createElement(Bt, { size: 15 }))
  ), d && l && st.createPortal(
    /* @__PURE__ */ e.createElement(
      "div",
      {
        className: "crew-select-menu crew-select-menu-portal",
        ref: c,
        style: l,
        role: "listbox",
        "aria-label": r
      },
      n.map((u) => /* @__PURE__ */ e.createElement(
        "button",
        {
          type: "button",
          className: `${u.action ? "crew-select-action" : ""} ${u.action || u.icon ? "crew-select-has-icon" : ""}`,
          role: "option",
          "aria-selected": !u.action && u.value === t,
          disabled: u.disabled,
          key: u.value,
          onClick: () => {
            u.action?.(), u.action || m(u.value), M(!1);
          }
        },
        (u.action || u.icon) && /* @__PURE__ */ e.createElement("span", { className: "crew-select-check", "aria-hidden": "true" }, u.icon),
        /* @__PURE__ */ e.createElement("span", { className: "crew-select-label", title: u.label }, u.label),
        !u.action && /* @__PURE__ */ e.createElement("span", { className: "crew-select-check", "aria-hidden": "true" }, u.value === t && /* @__PURE__ */ e.createElement(Ce, { size: 14 }))
      ))
    ),
    document.body
  ));
}
const hr = ["🤖", "🔎", "📥", "📈", "🎖️", "🧭", "🛠️", "📚", "🧪", "✍️", "🗂️", "🛰️"];
function Be({
  editing: t,
  providers: n,
  busy: r,
  error: o,
  onSubmit: m,
  onClose: E
}) {
  const [d, M] = N(t?.name ?? ""), [l, s] = N(t?.role ?? ""), [k, c] = N(t?.avatar || "🤖"), [a, p] = N("");
  z(() => {
    const u = (R) => {
      R.key === "Escape" && E();
    };
    return window.addEventListener("keydown", u), () => window.removeEventListener("keydown", u);
  }, [E]);
  const f = !!d.trim() && !r;
  return /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "palette-backdrop",
      role: "presentation",
      onMouseDown: (u) => {
        u.target === u.currentTarget && E();
      }
    },
    /* @__PURE__ */ e.createElement(
      "form",
      {
        className: "crew-dialog",
        role: "dialog",
        "aria-modal": "true",
        "aria-label": t ? `Edit ${t.name}` : "Hire a teammate",
        onSubmit: (u) => {
          u.preventDefault(), f && m({ name: d.trim(), role: l.trim(), emoji: k, modelProviderId: a });
        }
      },
      /* @__PURE__ */ e.createElement("h2", null, t ? `Edit ${t.name}` : "Hire a teammate"),
      /* @__PURE__ */ e.createElement("label", { className: "crew-field" }, /* @__PURE__ */ e.createElement("span", null, "Name"), /* @__PURE__ */ e.createElement(
        "input",
        {
          autoFocus: !t,
          value: d,
          disabled: !!t,
          placeholder: "Scout",
          onChange: (u) => M(u.target.value)
        }
      ), t && /* @__PURE__ */ e.createElement("small", null, "A teammate's name is its profile directory, so it cannot be changed here.")),
      /* @__PURE__ */ e.createElement("label", { className: "crew-field" }, /* @__PURE__ */ e.createElement("span", null, "Their job, in one line"), /* @__PURE__ */ e.createElement(
        "input",
        {
          autoFocus: !!t,
          value: l,
          placeholder: "Turns a one-line question into a decision-ready brief with sources",
          onChange: (u) => s(u.target.value)
        }
      )),
      /* @__PURE__ */ e.createElement("div", { className: "crew-field" }, /* @__PURE__ */ e.createElement("span", null, "Face"), /* @__PURE__ */ e.createElement("div", { className: "crew-emoji-row" }, hr.map((u) => /* @__PURE__ */ e.createElement(
        "button",
        {
          type: "button",
          key: u,
          className: `crew-emoji ${u === k ? "selected" : ""}`,
          "aria-label": `Use ${u}`,
          "aria-pressed": u === k,
          onClick: () => c(u)
        },
        u
      )))),
      !t && n.length > 0 && /* @__PURE__ */ e.createElement("div", { className: "crew-field" }, /* @__PURE__ */ e.createElement("span", null, "Model"), /* @__PURE__ */ e.createElement(
        pr,
        {
          ariaLabel: "Model provider",
          placeholder: "Same as your default profile",
          value: a,
          options: [
            // Cloning the default profile is what gives a new teammate working
            // credentials immediately, so it is the option that needs no
            // explanation and therefore the one that comes first.
            { value: "", label: "Same as your default profile" },
            ...n.map((u) => ({
              value: u.id,
              label: u.defaultModel ? `${u.name} · ${u.defaultModel}` : u.name
            }))
          ],
          onChange: p
        }
      )),
      o && /* @__PURE__ */ e.createElement("p", { className: "crew-dialog-error" }, o),
      /* @__PURE__ */ e.createElement("div", { className: "crew-dialog-actions" }, /* @__PURE__ */ e.createElement("button", { type: "button", className: "secondary-button", onClick: E }, "Cancel"), /* @__PURE__ */ e.createElement("button", { className: "primary-button", disabled: !f }, r ? "Working…" : t ? "Save" : "Hire"))
    )
  );
}
const it = "hermes-crew:detail-width";
function fr() {
  try {
    const t = window.localStorage?.getItem(it), n = t ? Number.parseInt(t, 10) : Number.NaN;
    return Number.isFinite(n) ? Math.max(280, n) : 360;
  } catch {
    return 360;
  }
}
function gr({ client: t, notify: n }) {
  const r = Pt(t, { notify: n }), [o, m] = N(""), [E, d] = N([]), [M, l] = N([]), [s, k] = N([]), [c, a] = N(!1), [p, f] = N([]), [u, R] = N(!1), [I, L] = N({ id: "all", types: [] }), [q, J] = N(null), [v, U] = N([]), [te, ee] = N([]), [Z, F] = N(!1), [X, se] = N(fr), [B, oe] = N(!1), [re, me] = N(), [pe, j] = N(!1), [ne, Q] = N(), [V, ue] = N(0), { agents: ie, conversations: ce, selectedAgent: x, selectedAgentId: T, selectedThreadId: Y } = r, b = he(() => ce.filter((y) => y.kind === "group"), [ce]), C = he(() => new Map(ie.map((y) => [y.id, y])), [ie]), $ = he(
    () => ce.find((y) => y.id === Y),
    [ce, Y]
  ), H = r.approvals.filter((y) => y.status === "pending").length;
  z(() => {
    try {
      window.localStorage?.setItem(it, String(X));
    } catch {
    }
  }, [X]);
  const A = ye(() => {
    t.listSections().then(d).catch(() => d([]));
  }, [t]);
  z(A, [A, ie.length]), z(() => {
    if (!T) {
      l([]);
      return;
    }
    let y = !0;
    return t.listRoutines(T).then((S) => {
      y && l(S);
    }).catch(() => {
      y && l([]);
    }), () => {
      y = !1;
    };
  }, [t, T]), z(() => {
    if (!T) {
      k([]);
      return;
    }
    let y = !0;
    return t.listGrants(T).then((S) => {
      y && k(S);
    }).catch(() => {
      y && k([]);
    }), () => {
      y = !1;
    };
  }, [t, T]);
  const g = ye(() => {
    if (!T) {
      U([]);
      return;
    }
    t.listArtifacts(T).then(U).catch(() => U([]));
  }, [t, T]);
  z(g, [g]);
  const i = x?.status;
  z(() => {
    i !== "working" && g();
  }, [i, g]), z(() => {
    if (!T) {
      ee([]);
      return;
    }
    let y = !0;
    return t.listTasks(T).then((S) => {
      y && ee(S);
    }).catch(() => {
      y && ee([]);
    }), () => {
      y = !1;
    };
  }, [t, T, i]);
  const h = ye((y, S) => {
    if (!T) {
      f([]), J(null);
      return;
    }
    R(!0), t.listAuditEvents({
      agentId: T,
      eventTypes: y,
      beforeId: S,
      limit: 50
    }).then((K) => {
      f((P) => S ? [...P, ...K.events] : K.events), J(K.nextBeforeId);
    }).catch(() => {
      S || (f([]), J(null));
    }).finally(() => R(!1));
  }, [t, T]);
  z(() => {
    h(I.types);
  }, [h, I]), z(() => {
    H > 0 && F(!0);
  }, [H]), z(() => {
    const y = (S) => {
      (S.metaKey || S.ctrlKey) && S.key.toLowerCase() === "k" && (S.preventDefault(), oe((K) => !K));
    };
    return window.addEventListener("keydown", y), () => window.removeEventListener("keydown", y);
  }, []);
  const w = (y, S) => {
    const K = E.map((P) => P.id === y ? { ...P, collapsed: S } : P);
    d(K), t.saveSections(K).then(d).catch(A);
  }, O = (y, S) => {
    if (S === "edit") {
      Q(void 0), me({ editing: y });
      return;
    }
    if (S === "duplicate") {
      r.duplicateAgent(y.id).catch(() => {
      });
      return;
    }
    window.confirm(`Remove ${y.name} from the crew? Their profile, memory and skills stay on disk.`) && r.deleteAgent(y.id).catch(() => {
    });
  }, D = async (y) => {
    j(!0), Q(void 0);
    try {
      re?.editing ? await r.updateAgent(re.editing.id, { role: y.role, emoji: y.emoji }) : await r.createAgent({
        name: y.name,
        role: y.role,
        emoji: y.emoji,
        modelProviderId: y.modelProviderId || void 0
      }), me(void 0), A();
    } catch (S) {
      Q(S instanceof Error ? S.message : "That did not work.");
    } finally {
      j(!1);
    }
  }, W = he(() => ({
    onDecide: (y, S) => {
      r.respondToApproval(y, S).catch(() => {
      });
    },
    // A login request is the one chip that is an instruction to the operator,
    // so its button does the thing rather than pointing at where the thing is.
    onOpenScreen: () => {
      F(!0), r.openComputer("takeover").catch(() => {
      });
    },
    screenshotUrl: (y, S) => t.screenshotUrl(y, S)
  }), [t, r]);
  return r.loading ? /* @__PURE__ */ e.createElement("div", { className: "crew-workspace is-loading", role: "status" }, "Loading your crew…") : ie.length ? /* @__PURE__ */ e.createElement("div", { className: "crew-workspace" }, /* @__PURE__ */ e.createElement(
    Nn,
    {
      agents: ie,
      sections: E,
      rooms: b,
      selectedAgentId: T,
      selectedThreadId: Y,
      search: o,
      onSearch: m,
      onSelectAgent: (y) => {
        r.setSelectedAgentId(y), ue((S) => S + 1);
      },
      onSelectThread: (y) => {
        r.setSelectedThreadId(y), ue((S) => S + 1);
      },
      onAction: O,
      onCreate: () => {
        Q(void 0), me({});
      },
      onToggleSection: w
    }
  ), /* @__PURE__ */ e.createElement(
    Vn,
    {
      agent: x,
      thread: $,
      agentsById: C,
      messages: r.messages,
      activities: r.activities,
      chips: W,
      loading: r.conversationLoading,
      focusRequest: V,
      onSend: (y) => r.sendMessage(y).catch(() => {
      }),
      onToggleDetails: () => F((y) => !y)
    }
  ), Z && x && /* @__PURE__ */ e.createElement(
    mr,
    {
      open: Z,
      width: X,
      onResize: se,
      agentName: x.name,
      computer: r.computer,
      approvals: r.approvals,
      routines: M,
      grants: s,
      grantsBusy: c,
      audit: p,
      auditLoading: u,
      auditView: I.id,
      auditHasMore: q !== null,
      artifacts: v,
      artifactUrl: (y) => t.artifactUrl(y),
      tasks: te,
      onApproval: (y, S, K, P) => r.respondToApproval(y, S, K, P),
      onComputerAction: (y) => r.openComputer(y),
      onDeleteRoutine: async (y) => {
        await t.deleteRoutine(x.id, y), l((S) => S.filter((K) => K.id !== y));
      },
      onSetGrant: async (y, S) => {
        a(!0);
        try {
          const K = await t.setGrant({ agentId: x.id, tool: y, mode: S });
          k((P) => P.map((ae) => ae.tool === y ? { ...ae, ...K } : ae));
        } finally {
          a(!1);
        }
      },
      onClearGrant: async (y) => {
        a(!0);
        try {
          const S = await t.clearGrant(x.id, y);
          k((K) => K.map((P) => P.tool === y ? { ...P, ...S } : P));
        } finally {
          a(!1);
        }
      },
      onChangeAuditView: (y, S) => L({ id: y, types: S }),
      onLoadMoreAudit: () => {
        q !== null && h(I.types, q);
      },
      onClose: () => F(!1)
    }
  ), /* @__PURE__ */ e.createElement(
    Sn,
    {
      open: B,
      agents: ie,
      rooms: b,
      onClose: () => oe(!1),
      onSelectAgent: r.setSelectedAgentId,
      onSelectThread: r.setSelectedThreadId,
      onCreateAgent: () => {
        Q(void 0), me({});
      },
      onComputer: () => F(!0)
    }
  ), re && /* @__PURE__ */ e.createElement(
    Be,
    {
      editing: re.editing,
      providers: r.modelProviders,
      busy: pe,
      error: ne,
      onSubmit: D,
      onClose: () => me(void 0)
    }
  ), r.error && /* @__PURE__ */ e.createElement("div", { className: "crew-toast", role: "alert" }, /* @__PURE__ */ e.createElement("span", null, r.error), /* @__PURE__ */ e.createElement("button", { className: "icon-button", "aria-label": "Dismiss", onClick: r.dismissError }, "×"))) : /* @__PURE__ */ e.createElement("div", { className: "crew-workspace is-empty" }, /* @__PURE__ */ e.createElement("div", { className: "crew-empty-card" }, /* @__PURE__ */ e.createElement("h2", null, "No teammates yet"), /* @__PURE__ */ e.createElement("p", null, "A teammate is a Hermes profile with a thread, a memory and a computer of its own. Give one a name and a one-line job to start."), /* @__PURE__ */ e.createElement("button", { className: "primary-button", onClick: () => {
    Q(void 0), me({});
  } }, "Hire your first teammate")), re && /* @__PURE__ */ e.createElement(
    Be,
    {
      providers: r.modelProviders,
      busy: pe,
      error: ne,
      onSubmit: D,
      onClose: () => me(void 0)
    }
  ));
}
const _e = 500, yr = 15e3;
function vr(t, n) {
  return t === 401 || t === 403 ? new ge("unauthorized", n) : t === 404 ? new ge("not_found", n) : t === 409 ? new ge("conflict", n) : new ge("unknown", n, t >= 500);
}
function wr(t) {
  const n = new URL(t, globalThis.location?.href ?? "http://127.0.0.1");
  return n.protocol = n.protocol === "https:" ? "wss:" : "ws:", n.pathname = `${n.pathname.replace(/\/+$/, "")}/v1/events`, n.toString();
}
class Er {
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
  reconnectDelay = _e;
  reconnectTimer;
  opening = !1;
  closed = !1;
  constructor(n) {
    this.baseUrl = n.baseUrl.replace(/\/+$/, "");
    const r = n.eventsUrl ?? wr(this.baseUrl);
    this.resolveEventsUrl = typeof r == "function" ? r : async () => r, this.fetchImpl = n.fetchImpl ?? ((o, m) => fetch(o, m)), this.headers = n.headers ?? (() => ({}));
  }
  async request(n, r = {}) {
    let o;
    try {
      o = await this.fetchImpl(`${this.baseUrl}${n}`, {
        ...r,
        headers: {
          ...r.body ? { "Content-Type": "application/json" } : {},
          ...this.headers(),
          ...r.headers ?? {}
        }
      });
    } catch (m) {
      throw m instanceof DOMException && m.name === "AbortError" ? m : new ge("network", "Could not reach the crew backend.", !0);
    }
    if (!o.ok) {
      const m = await o.json().then((E) => E?.detail).catch(() => {
      });
      throw vr(o.status, m ?? `Crew request failed (${o.status})`);
    }
    if (o.status !== 204)
      return await o.json();
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
  updateAgent(n, r, o) {
    return this.request(`/v1/agents/${encodeURIComponent(n)}`, {
      method: "PATCH",
      body: JSON.stringify(r),
      signal: o
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
    const o = n ? `?agentId=${encodeURIComponent(n)}` : "";
    return this.request(`/v1/conversations${o}`, { signal: r });
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
    const o = n ? `?agentId=${encodeURIComponent(n)}` : "";
    return this.request(`/v1/approvals${o}`, { signal: r });
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
    this.closeSocket(), this.reconnectDelay = _e, this.listeners.size && this.openSocket(), await this.listAgents(n);
  }
  listSections(n) {
    return this.request("/sections", { signal: n }).then((r) => r.sections);
  }
  saveSections(n, r) {
    return this.request("/sections", {
      method: "PUT",
      body: JSON.stringify(n),
      signal: r
    }).then((o) => o.sections);
  }
  listRoutines(n, r) {
    return this.request(
      `/bots/${encodeURIComponent(n)}/routines`,
      { signal: r }
    ).then((o) => o.routines);
  }
  async deleteRoutine(n, r, o) {
    await this.request(
      `/bots/${encodeURIComponent(n)}/routines/${encodeURIComponent(r)}`,
      { method: "DELETE", signal: o }
    );
  }
  listGrants(n, r) {
    return this.request(
      `/bots/${encodeURIComponent(n)}/grants`,
      { signal: r }
    ).then((o) => o.grants);
  }
  setGrant(n, r) {
    return this.request(
      `/bots/${encodeURIComponent(n.agentId)}/grants/${encodeURIComponent(n.tool)}`,
      { method: "PUT", body: JSON.stringify({ mode: n.mode, note: n.note ?? "" }), signal: r }
    );
  }
  clearGrant(n, r, o) {
    return this.request(
      `/bots/${encodeURIComponent(n)}/grants/${encodeURIComponent(r)}`,
      { method: "DELETE", signal: o }
    );
  }
  listAuditEvents(n = {}, r) {
    const o = new URLSearchParams();
    n.agentId && o.set("bot_id", n.agentId), n.eventTypes?.length && o.set("event_type", n.eventTypes.join(",")), n.beforeId && o.set("before_id", String(n.beforeId)), n.limit && o.set("limit", String(n.limit));
    const m = o.toString();
    return this.request(`/audit${m ? `?${m}` : ""}`, { signal: r });
  }
  listTasks(n, r) {
    return this.request(
      `/bots/${encodeURIComponent(n)}/tasks`,
      { signal: r }
    ).then((o) => o.tasks);
  }
  listArtifacts(n, r) {
    return this.request(
      `/bots/${encodeURIComponent(n)}/files`,
      { signal: r }
    ).then((o) => o.files);
  }
  artifactUrl(n) {
    const r = n.downloadPath.split("/").map(encodeURIComponent).join("/");
    return `${this.baseUrl}${r}`;
  }
  screenshotUrl(n, r) {
    return `${this.baseUrl}/screenshots/${encodeURIComponent(n)}/${encodeURIComponent(r)}`;
  }
  subscribeToConversationEvents(n, r) {
    const o = (m) => {
      "threadId" in m && m.threadId && m.threadId !== n || r(m);
    };
    return this.listeners.add(o), this.closed = !1, this.openSocket(), {
      unsubscribe: () => {
        this.listeners.delete(o), this.listeners.size || (this.closed = !0, this.closeSocket());
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
      this.reconnectDelay = _e, this.emit({ type: "connection.changed", state: "connected" });
    }, r.onmessage = (o) => {
      try {
        this.emit(JSON.parse(String(o.data)));
      } catch {
      }
    }, r.onclose = () => {
      this.socket = void 0, !this.closed && (this.emit({ type: "connection.changed", state: "connecting" }), this.scheduleReconnect());
    }, r.onerror = () => r.close();
  }
  scheduleReconnect() {
    this.reconnectTimer || this.closed || (this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = void 0, this.reconnectDelay = Math.min(this.reconnectDelay * 2, yr), this.openSocket();
    }, this.reconnectDelay));
  }
  closeSocket() {
    this.reconnectTimer && (clearTimeout(this.reconnectTimer), this.reconnectTimer = void 0), this.opening = !1;
    const n = this.socket;
    this.socket = void 0, n && (n.onclose = null, n.onerror = null, n.close());
  }
}
const We = "/api/plugins/hermes-crew", Ge = window.__HERMES_PLUGIN_SDK__, br = new Er({
  baseUrl: We,
  // The SDK's authed fetch, not the global one. Its own contract says plugins
  // must not hand-read the session token, and this is what keeps loopback,
  // gated-OAuth and server-internal modes all working from one bundle.
  fetchImpl: (t, n) => Ge.authedFetch(t, n),
  // A resolver, not a string: in gated mode `buildWsUrl` mints a single-use
  // ticket, so the URL has to be rebuilt for every connect and reconnect.
  eventsUrl: () => Ge.buildWsUrl(`${We}/v1/events`)
});
function kr(t) {
  try {
    if (typeof Notification > "u" || Notification.permission !== "granted" || document.visibilityState === "visible") return;
    new Notification(t.title, { body: t.body });
  } catch {
  }
}
function Sr() {
  return /* @__PURE__ */ e.createElement(gr, { client: br, notify: kr });
}
export {
  Sr as C,
  e as R,
  Re as S,
  N as a,
  z as b,
  Tt as c,
  he as d,
  G as e,
  $e as f,
  Nr as g,
  Se as h,
  wt as i,
  gt as j,
  yt as k,
  ye as l,
  Et as m,
  Le as n,
  st as r,
  St as u
};

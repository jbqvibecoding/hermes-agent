const dt = globalThis.__HERMES_PLUGIN_SDK__, e = dt?.React;
if (!e)
  throw new Error(
    "hermes-crew: the dashboard plugin SDK is not on the page, so there is no React to borrow."
  );
const {
  Children: ut,
  Fragment: mt,
  Profiler: pt,
  StrictMode: ft,
  Suspense: xe,
  cloneElement: ht,
  createContext: gt,
  createElement: Se,
  createRef: yt,
  forwardRef: Oe,
  isValidElement: vt,
  lazy: Re,
  memo: wt,
  startTransition: Et,
  use: bt,
  useActionState: kt,
  useCallback: ye,
  useContext: St,
  useDebugValue: Nt,
  useDeferredValue: Ct,
  useEffect: q,
  useId: Mt,
  useImperativeHandle: Tt,
  useInsertionEffect: _t,
  useLayoutEffect: Ie,
  useMemo: fe,
  useOptimistic: At,
  useReducer: xt,
  useRef: G,
  useState: N,
  useSyncExternalStore: Ot,
  useTransition: Rt,
  version: It
} = e, Dt = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Children: ut,
  Fragment: mt,
  Profiler: pt,
  StrictMode: ft,
  Suspense: xe,
  cloneElement: ht,
  createContext: gt,
  createElement: Se,
  createRef: yt,
  default: e,
  forwardRef: Oe,
  isValidElement: vt,
  lazy: Re,
  memo: wt,
  startTransition: Et,
  use: bt,
  useActionState: kt,
  useCallback: ye,
  useContext: St,
  useDebugValue: Nt,
  useDeferredValue: Ct,
  useEffect: q,
  useId: Mt,
  useImperativeHandle: Tt,
  useInsertionEffect: _t,
  useLayoutEffect: Ie,
  useMemo: fe,
  useOptimistic: At,
  useReducer: xt,
  useRef: G,
  useState: N,
  useSyncExternalStore: Ot,
  useTransition: Rt,
  version: It
}, Symbol.toStringTag, { value: "Module" }));
class ge extends Error {
  constructor(n, r, o = !1) {
    super(r), this.code = n, this.retryable = o, this.name = "CrewError";
  }
  code;
  retryable;
}
function Ge(t) {
  return !t || t.role !== "agent" ? "" : t.parts.filter((n) => n.type === "text").map((n) => n.text).join("").trim();
}
function be(t) {
  return Ge(
    [...t].reverse().find((n) => n.role === "agent" && !n.streaming)
  );
}
function $e(t) {
  return t.parts.filter((n) => n.type === "text").map((n) => n.text).join("");
}
const Pe = 6e4, Lt = 3e4, Ne = "optimistic-user:", we = "optimistic-agent:";
function $t(t, n = {}) {
  const { enabled: r = !0, notify: o } = n, [m, w] = N([]), [u, M] = N(""), [l, s] = N(""), [k, c] = N([]), [a, p] = N([]), [g, d] = N([]), [_, x] = N([]), [O, H] = N(), [K, v] = N("connecting"), [P, X] = N([]), [Z, B] = N(r), [ce, Q] = N(), [ne, j] = N(() => /* @__PURE__ */ new Set()), [ee, le] = N(""), [me, pe] = N(0), $ = G(/* @__PURE__ */ new Map()), re = G(u), te = G(/* @__PURE__ */ new Set()), z = G(/* @__PURE__ */ new Map()), ae = G(o), se = fe(
    () => m.find((b) => b.id === u),
    [m, u]
  ), W = l || (u ? `dm:${u}` : ""), R = !!(u && !ne.has(u));
  q(() => {
    re.current = u;
  }, [u]), q(() => {
    ae.current = o;
  }, [o]);
  const I = ye(async (b = !1) => {
    const C = await t.listAgents();
    for (const h of te.current)
      C.some((E) => E.id === h) || te.current.delete(h);
    const D = C.filter((h) => !te.current.has(h.id)), L = re.current, A = D.find((h) => h.id === L), i = $.current.get(L);
    A?.lastMessagePreview && i && !i.messages.some((h) => h.streaming) && be(i.messages) !== A.lastMessagePreview && ($.current.set(L, { ...i, cachedAt: 0 }), pe((E) => E + 1));
    const y = !!i?.messages.some((h) => h.streaming);
    return w((h) => D.map((E) => {
      const U = h.find((F) => F.id === E.id), f = be($.current.get(E.id)?.messages ?? []), S = !!f || E.id === L && y;
      return {
        ...E,
        lastMessagePreview: S ? f || U?.lastMessagePreview : E.lastMessagePreview ?? U?.lastMessagePreview
      };
    })), M((h) => h && D.some((E) => E.id === h) || b ? h : D[0]?.id || ""), D;
  }, [t]), Y = ye(async () => {
    const b = await t.listModelProviders();
    return X(b.providers), b.providers;
  }, [t]);
  return q(() => {
    if (!r) {
      w([]), X([]), M(""), s(""), p([]), d([]), x([]), H(void 0), v("disconnected"), B(!1), Q(void 0);
      return;
    }
    let b = !0;
    return B(!0), Promise.all([I(), Y()]).then(() => {
      b && (v("connected"), B(!1));
    }).catch((C) => {
      b && (v("error"), Q(C instanceof Error ? C.message : "Could not load the crew"), B(!1));
    }), () => {
      b = !1;
    };
  }, [r, I, Y]), q(() => {
    if (!r) return;
    const b = () => {
      document.visibilityState === "hidden" || !navigator.onLine || I().catch(() => {
      });
    }, C = () => {
      document.visibilityState === "visible" && b();
    }, D = window.setInterval(b, Lt);
    return window.addEventListener("focus", b), window.addEventListener("online", b), document.addEventListener("visibilitychange", C), () => {
      window.clearInterval(D), window.removeEventListener("focus", b), window.removeEventListener("online", b), document.removeEventListener("visibilitychange", C);
    };
  }, [r, I]), q(() => {
    s("");
  }, [u]), q(() => {
    if (!r) return;
    const b = $.current.get(u);
    if (b ? (p(b.messages), d(b.activities), x(b.approvals), H(b.computer), c(b.conversations)) : (p([]), d([]), x([]), H(void 0), c([])), le(""), !u) return;
    const C = b ? Date.now() - b.cachedAt : Number.POSITIVE_INFINITY;
    if (b && C < Pe && !l) {
      b.messages.some((i) => i.streaming) && le(u);
      const A = window.setTimeout(() => pe((i) => i + 1), Pe - C);
      return () => window.clearTimeout(A);
    }
    const D = new AbortController();
    let L = !0;
    return Promise.all([
      t.listConversations(u, D.signal),
      t.listApprovalRequests(u, D.signal),
      t.getComputer(u, D.signal)
    ]).then(async ([A, i, y]) => {
      const h = l ? A.find((J) => J.id === l) ?? A[0] : A[0], E = h ? await t.getConversation(h.id, D.signal) : void 0;
      if (!L || te.current.has(u)) return;
      const U = $.current.get(u)?.messages ?? [], f = (E?.messages ?? []).map((J) => {
        const ue = z.current.get(J.id);
        return ue ? { ...J, id: ue } : J;
      }), S = U.filter(
        (J) => J.id.startsWith(Ne) || J.id.startsWith(we)
      ), F = [
        ...f,
        ...S.filter((J) => !f.some((ue) => ue.id === J.id))
      ], V = be(F), de = E?.activities ?? [];
      $.current.set(u, {
        messages: F,
        activities: de,
        approvals: i,
        conversations: A,
        computer: y,
        cachedAt: Date.now()
      }), j((J) => new Set(J).add(u)), p(F), d(de), x(i), H(y), c(A), le(u), V && w((J) => J.map((ue) => ue.id === u ? { ...ue, lastMessagePreview: V } : ue));
    }).catch((A) => {
      !L || te.current.has(u) || A instanceof DOMException && A.name === "AbortError" || ($.current.set(u, {
        messages: [],
        activities: [],
        approvals: [],
        conversations: [],
        cachedAt: Date.now()
      }), j((i) => new Set(i).add(u)), p([]), Q(A instanceof Error ? A.message : "Could not load this teammate"));
    }), () => {
      L = !1, D.abort();
    };
  }, [t, r, me, u, l]), q(() => {
    if (!r || !u || O?.status === "online") return;
    let b = !0;
    const C = async () => {
      try {
        const L = await t.getComputer(u);
        if (!b || re.current !== u) return;
        H(L);
        const A = $.current.get(u);
        A && $.current.set(u, { ...A, computer: L });
      } catch {
      }
    }, D = window.setInterval(() => {
      C();
    }, 2e3);
    return C(), () => {
      b = !1, window.clearInterval(D);
    };
  }, [t, O?.status, r, u]), q(() => {
    if (!r || !W || ee !== u) return;
    let b = !0;
    const C = u, D = (i) => {
      const y = $.current.get(C);
      $.current.set(C, {
        messages: y?.messages ?? [],
        activities: y?.activities ?? [],
        approvals: y?.approvals ?? [],
        conversations: y?.conversations ?? [],
        computer: y?.computer,
        cachedAt: Date.now(),
        ...i
      });
    }, L = (i) => p((y) => {
      const h = i(y);
      return D({ messages: h }), h;
    }), A = t.subscribeToConversationEvents(W, (i) => {
      if (b) {
        if (i.type === "message.created" && L((y) => {
          let h = i.message;
          const E = z.current.get(i.message.id);
          if (E && (h = { ...i.message, id: E }), i.message.role === "user" && !E) {
            const f = new Set(z.current.values()), S = y.find((F) => F.id.startsWith(Ne) && !f.has(F.id) && $e(F) === $e(i.message));
            S && (z.current.set(i.message.id, S.id), h = { ...i.message, id: S.id });
          }
          if (i.message.role === "agent" && !E) {
            const f = new Set(z.current.values()), S = y.find((F) => F.id.startsWith(we) && !f.has(F.id));
            S && (z.current.set(i.message.id, S.id), h = { ...i.message, id: S.id });
          }
          return y.find((f) => f.id === h.id) ? y.map((f) => f.id === h.id ? h : f) : [...y, h];
        }), i.type === "message.delta" && L((y) => {
          let h = z.current.get(i.messageId);
          if (!h) {
            const E = new Set(z.current.values()), U = y.find((f) => f.id.startsWith(we) && !E.has(f.id));
            U && (h = U.id, z.current.set(i.messageId, h));
          }
          return h ??= i.messageId, y.some((E) => E.id === h) ? y.map((E) => E.id === h ? {
            ...E,
            parts: E.parts.map((U, f) => f === 0 && U.type === "text" ? { ...U, text: U.text + i.delta } : U)
          } : E) : [...y, {
            id: h,
            conversationId: W,
            role: "agent",
            parts: [{ type: "text", text: i.delta }],
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            streaming: !0
          }];
        }), i.type === "message.completed") {
          const y = z.current.get(i.messageId) ?? i.messageId;
          i.notify === !1 ? L((h) => h.flatMap((E) => E.id !== y ? [E] : E.id.startsWith(we) ? [{
            ...E,
            parts: E.parts.map((U) => U.type === "text" ? { ...U, text: "" } : U),
            streaming: !0
          }] : [])) : (L((h) => {
            const E = h.filter((f) => f.id === y || f.role !== "agent" || !f.streaming).map((f) => f.id === y ? { ...f, streaming: !1 } : f), U = be(E);
            return U && w((f) => f.map((S) => S.id === C ? { ...S, lastMessagePreview: U } : S)), E;
          }), ae.current?.({
            title: `${se?.name ?? "Your teammate"} finished`,
            body: "There is something new to read."
          }));
        }
        if (i.type === "message.dropped") {
          const y = z.current.get(i.messageId) ?? i.messageId;
          L((h) => h.filter((E) => E.id !== y));
        }
        i.type === "message.updated" && (L((y) => {
          const h = z.current.get(i.message.id), E = h ? { ...i.message, id: h } : i.message, U = y.find((S) => S.id === E.id), f = i.message.role === "agent" && !i.message.streaming ? y.filter((S) => S.id === E.id || S.role !== "agent" || !S.streaming) : y;
          return U ? f.map((S) => S.id === E.id ? E : S) : [...f, E];
        }), i.message.role === "agent" && !i.message.streaming && w((y) => y.map((h) => h.id === C ? { ...h, lastMessagePreview: Ge(i.message) || void 0 } : h))), i.type === "approval.updated" && (x((y) => {
          const h = y.some((E) => E.id === i.approval.id) ? y.map((E) => E.id === i.approval.id ? i.approval : E) : [i.approval, ...y];
          return D({ approvals: h }), h;
        }), i.approval.status === "pending" && ae.current?.({
          title: `${se?.name ?? "Your teammate"} needs you`,
          body: i.approval.title
        })), i.type === "activity.updated" && d((y) => {
          const h = y.some((E) => E.id === i.activity.id) ? y.map((E) => E.id === i.activity.id ? i.activity : E) : [...y, i.activity];
          return D({ activities: h }), h;
        }), i.type === "agent.status" && w((y) => y.map((h) => h.id === i.agentId ? { ...h, status: i.status } : h)), i.type === "connection.changed" && v(i.state);
      }
    });
    return () => {
      b = !1, A.unsubscribe();
    };
  }, [t, W, r, ee, se?.name, u]), {
    agents: m,
    conversations: k,
    modelProviders: P,
    selectedAgent: se,
    selectedAgentId: u,
    setSelectedAgentId: M,
    selectedThreadId: W,
    setSelectedThreadId: s,
    messages: a,
    activities: g,
    approvals: _,
    computer: O,
    connection: K,
    loading: Z,
    conversationLoading: R,
    error: ce,
    refreshAgents: I,
    refreshModelProviders: Y,
    dismissError: () => Q(void 0),
    createAgent: async (b) => {
      const C = await t.createAgent(b);
      return await I(!0), M(C.id), C;
    },
    updateAgent: async (b, C) => {
      await t.updateAgent(b, C), await I(!0);
    },
    duplicateAgent: async (b) => {
      const C = await t.duplicateAgent(b);
      await I(!0), M(C.id);
    },
    deleteAgent: async (b) => {
      const C = m.find((y) => y.id === b), D = u;
      if (!C || te.current.has(b)) return;
      const L = m.findIndex((y) => y.id === b), A = m.filter((y) => y.id !== b), i = D === b ? A[Math.min(Math.max(L, 0), Math.max(A.length - 1, 0))]?.id ?? "" : D;
      te.current.add(b), w(A), M(i);
      try {
        try {
          await t.deleteAgent(b);
        } catch (y) {
          if (!(y instanceof ge && y.code === "not_found")) throw y;
        }
        $.current.delete(b), j((y) => {
          const h = new Set(y);
          return h.delete(b), h;
        }), await I();
      } catch (y) {
        throw te.current.delete(b), w((h) => {
          if (h.some((U) => U.id === b)) return h;
          const E = [...h];
          return E.splice(Math.min(L, E.length), 0, C), E;
        }), M((h) => h || (D === b ? b : h)), Q(y instanceof Error ? y.message : "Could not remove this teammate"), y;
      }
    },
    sendMessage: async (b) => {
      if (!W || !u) return;
      const C = u, D = W, L = `${Date.now()}:${Math.random().toString(36).slice(2)}`, A = `${Ne}${L}`, i = `${we}${L}`, y = (/* @__PURE__ */ new Date()).toISOString(), h = {
        id: A,
        conversationId: D,
        role: "user",
        parts: [{ type: "text", text: b }],
        createdAt: y
      }, E = {
        id: i,
        conversationId: D,
        role: "agent",
        parts: [{ type: "text", text: "" }],
        createdAt: y,
        streaming: !0
      }, U = $.current.get(C) ?? {
        messages: [],
        activities: [],
        approvals: [],
        conversations: [],
        cachedAt: Date.now()
      }, f = [...U.messages].reverse().find((V) => V.role === "agent" && V.streaming), F = [...f ? U.messages.map((V) => V.id === f.id ? { ...V, streaming: !1, interrupted: !0 } : V) : U.messages, h, E];
      re.current === C && d([]), $.current.set(C, { ...U, messages: F, activities: [], cachedAt: Date.now() }), re.current === C && (p(F), le(C));
      try {
        const V = await t.sendMessage({ conversationId: D, text: b });
        z.current.set(V.id, A);
        const de = V.id.match(/^(.+):user(?:$|:)/)?.[1];
        de && (z.current.set(`${de}:user`, A), z.current.set(`${de}:agent`, f?.id ?? i));
        const J = $.current.get(C) ?? U, ue = { ...V, id: A }, he = J.messages.map((Ee) => Ee.id === A ? ue : Ee).filter((Ee, it, ct) => ct.findIndex((lt) => lt.id === Ee.id) === it);
        $.current.set(C, { ...J, messages: he, cachedAt: Date.now() }), re.current === C && p(he);
      } catch (V) {
        const de = $.current.get(C) ?? U, J = de.messages.filter((he) => he.id !== i), ue = J.some((he) => he.id === A) ? J : [...J, h];
        throw $.current.set(C, { ...de, messages: ue, cachedAt: Date.now() }), re.current === C && p(ue), f || Q(V instanceof Error ? V.message : "Could not send that"), V;
      }
    },
    respondToApproval: async (b, C, D, L) => {
      const A = u, i = await t.respondToApproval({ requestId: b, decision: C, note: D, contentHash: L }), y = $.current.get(A), h = (y?.approvals ?? []).map((E) => E.id === i.id ? i : E);
      y && $.current.set(A, { ...y, approvals: h, cachedAt: Date.now() }), re.current === A && x(h);
    },
    openComputer: async (b) => {
      if (!u) throw new Error("No teammate is selected");
      try {
        return await (b === "open" ? t.openComputer(u) : t.takeOverComputer(u));
      } catch (C) {
        throw Q(C instanceof Error ? C.message : "Could not open that computer"), C;
      }
    },
    reconnect: async () => {
      v("connecting");
      try {
        await t.reconnect(), await I(), v("connected");
      } catch (b) {
        v("error"), Q(b instanceof Error ? b.message : "Reconnect failed");
      }
    }
  };
}
const Pt = (t) => t.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), Ke = (...t) => t.filter((n, r, o) => !!n && n.trim() !== "" && o.indexOf(n) === r).join(" ").trim();
var zt = {
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
const Ut = Oe(
  ({
    color: t = "currentColor",
    size: n = 24,
    strokeWidth: r = 2,
    absoluteStrokeWidth: o,
    className: m = "",
    children: w,
    iconNode: u,
    ...M
  }, l) => Se(
    "svg",
    {
      ref: l,
      ...zt,
      width: n,
      height: n,
      stroke: t,
      strokeWidth: o ? Number(r) * 24 / Number(n) : r,
      className: Ke("lucide", m),
      ...M
    },
    [
      ...u.map(([s, k]) => Se(s, k)),
      ...Array.isArray(w) ? w : [w]
    ]
  )
);
const T = (t, n) => {
  const r = Oe(
    ({ className: o, ...m }, w) => Se(Ut, {
      ref: w,
      iconNode: n,
      className: Ke(`lucide-${Pt(t)}`, o),
      ...m
    })
  );
  return r.displayName = `${t}`, r;
};
const qt = T("Archive", [
  ["rect", { width: "20", height: "5", x: "2", y: "3", rx: "1", key: "1wp1u1" }],
  ["path", { d: "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8", key: "1s80jp" }],
  ["path", { d: "M10 12h4", key: "a56b0p" }]
]);
const Ht = T("ArrowDown", [
  ["path", { d: "M12 5v14", key: "s699le" }],
  ["path", { d: "m19 12-7 7-7-7", key: "1idqje" }]
]);
const jt = T("Ban", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m4.9 4.9 14.2 14.2", key: "1m5liu" }]
]);
const Ft = T("Bot", [
  ["path", { d: "M12 8V4H8", key: "hb8ula" }],
  ["rect", { width: "16", height: "12", x: "4", y: "8", rx: "2", key: "enze0r" }],
  ["path", { d: "M2 14h2", key: "vft8re" }],
  ["path", { d: "M20 14h2", key: "4cs60a" }],
  ["path", { d: "M15 13v2", key: "1xurst" }],
  ["path", { d: "M9 13v2", key: "rq6x2g" }]
]);
const De = T("Check", [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]]);
const Vt = T("ChevronDown", [
  ["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]
]);
const Me = T("ChevronRight", [
  ["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]
]);
const Bt = T("ChevronsRight", [
  ["path", { d: "m6 17 5-5-5-5", key: "xnjwq" }],
  ["path", { d: "m13 17 5-5-5-5", key: "17xmmf" }]
]);
const Te = T("CircleCheck", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
]);
const Wt = T("CircleHelp", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3", key: "1u773s" }],
  ["path", { d: "M12 17h.01", key: "p32p05" }]
]);
const Ye = T("Clock", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["polyline", { points: "12 6 12 12 16 14", key: "68esgv" }]
]);
const _e = T("Cloud", [
  ["path", { d: "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z", key: "p7xjir" }]
]);
const Gt = T("Copy", [
  ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2", key: "17jyea" }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2", key: "zix9uf" }]
]);
const Kt = T("CornerDownRight", [
  ["polyline", { points: "15 10 20 15 15 20", key: "1q7qjw" }],
  ["path", { d: "M4 4v7a4 4 0 0 0 4 4h12", key: "z08zvw" }]
]);
const Yt = T("Database", [
  ["ellipse", { cx: "12", cy: "5", rx: "9", ry: "3", key: "msslwz" }],
  ["path", { d: "M3 5V19A9 3 0 0 0 21 19V5", key: "1wlel7" }],
  ["path", { d: "M3 12A9 3 0 0 0 21 12", key: "mv7ke4" }]
]);
const Xt = T("Download", [
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
  ["polyline", { points: "7 10 12 15 17 10", key: "2ggqvy" }],
  ["line", { x1: "12", x2: "12", y1: "15", y2: "3", key: "1vk2je" }]
]);
const Jt = T("Earth", [
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
const Zt = T("Ellipsis", [
  ["circle", { cx: "12", cy: "12", r: "1", key: "41hilf" }],
  ["circle", { cx: "19", cy: "12", r: "1", key: "1wjl8i" }],
  ["circle", { cx: "5", cy: "12", r: "1", key: "1pcz8c" }]
]);
const Qt = T("FileCode2", [
  ["path", { d: "M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4", key: "1pf5j1" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "m5 12-3 3 3 3", key: "oke12k" }],
  ["path", { d: "m9 18 3-3-3-3", key: "112psh" }]
]);
const en = T("FileSpreadsheet", [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "M8 13h2", key: "yr2amv" }],
  ["path", { d: "M14 13h2", key: "un5t4a" }],
  ["path", { d: "M8 17h2", key: "2yhykz" }],
  ["path", { d: "M14 17h2", key: "10kma7" }]
]);
const Ae = T("FileText", [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "M10 9H8", key: "b1mrlr" }],
  ["path", { d: "M16 13H8", key: "t4e002" }],
  ["path", { d: "M16 17H8", key: "z1uh3a" }]
]);
const Xe = T("File", [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }]
]);
const ze = T("Hand", [
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
const tn = T("Image", [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2", key: "1m3agn" }],
  ["circle", { cx: "9", cy: "9", r: "2", key: "af1f0g" }],
  ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21", key: "1xmnt7" }]
]);
const nn = T("KeyRound", [
  [
    "path",
    {
      d: "M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z",
      key: "1s6t7t"
    }
  ],
  ["circle", { cx: "16.5", cy: "7.5", r: ".5", fill: "currentColor", key: "w0ekpg" }]
]);
const Le = T("LoaderCircle", [
  ["path", { d: "M21 12a9 9 0 1 1-6.219-8.56", key: "13zald" }]
]);
const rn = T("Lock", [
  ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2", key: "1w4ew1" }],
  ["path", { d: "M7 11V7a5 5 0 0 1 10 0v4", key: "fwvmzm" }]
]);
const an = T("Maximize2", [
  ["polyline", { points: "15 3 21 3 21 9", key: "mznyad" }],
  ["polyline", { points: "9 21 3 21 3 15", key: "1avn1i" }],
  ["line", { x1: "21", x2: "14", y1: "3", y2: "10", key: "ota7mn" }],
  ["line", { x1: "3", x2: "10", y1: "21", y2: "14", key: "1atl0r" }]
]);
const sn = T("Minimize2", [
  ["polyline", { points: "4 14 10 14 10 20", key: "11kfnr" }],
  ["polyline", { points: "20 10 14 10 14 4", key: "rlmsce" }],
  ["line", { x1: "14", x2: "21", y1: "10", y2: "3", key: "o5lafz" }],
  ["line", { x1: "3", x2: "10", y1: "21", y2: "14", key: "1atl0r" }]
]);
const Je = T("Monitor", [
  ["rect", { width: "20", height: "14", x: "2", y: "3", rx: "2", key: "48i651" }],
  ["line", { x1: "8", x2: "16", y1: "21", y2: "21", key: "1svkeh" }],
  ["line", { x1: "12", x2: "12", y1: "17", y2: "21", key: "vw1qmm" }]
]);
const on = T("Pencil", [
  [
    "path",
    {
      d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
      key: "1a8usu"
    }
  ],
  ["path", { d: "m15 5 4 4", key: "1mk7zo" }]
]);
const Ze = T("Plus", [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "M12 5v14", key: "s699le" }]
]);
const cn = T("Presentation", [
  ["path", { d: "M2 3h20", key: "91anmk" }],
  ["path", { d: "M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3", key: "2k9sn8" }],
  ["path", { d: "m7 21 5-5 5 5", key: "bip4we" }]
]);
const ln = T("RotateCcw", [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }]
]);
const Qe = T("Search", [
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
  ["path", { d: "m21 21-4.3-4.3", key: "1qie3q" }]
]);
const Ue = T("Settings2", [
  ["path", { d: "M20 7h-9", key: "3s1dr2" }],
  ["path", { d: "M14 17H5", key: "gfn3mx" }],
  ["circle", { cx: "17", cy: "17", r: "3", key: "18b49y" }],
  ["circle", { cx: "7", cy: "7", r: "3", key: "dfmy0x" }]
]);
const et = T("ShieldAlert", [
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
const dn = T("ShieldCheck", [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      key: "oel41y"
    }
  ],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
]);
const un = T("ShieldX", [
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
const mn = T("Terminal", [
  ["polyline", { points: "4 17 10 11 4 5", key: "akl6gq" }],
  ["line", { x1: "12", x2: "20", y1: "19", y2: "19", key: "q2wloq" }]
]);
const tt = T("Trash2", [
  ["path", { d: "M3 6h18", key: "d0wm0j" }],
  ["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", key: "4alrt4" }],
  ["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2", key: "v07s0e" }],
  ["line", { x1: "10", x2: "10", y1: "11", y2: "17", key: "1uufr5" }],
  ["line", { x1: "14", x2: "14", y1: "11", y2: "17", key: "xtxkd" }]
]);
const pn = T("TriangleAlert", [
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
const fn = T("Users", [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }],
  ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }],
  ["path", { d: "M16 3.13a4 4 0 0 1 0 7.75", key: "1da9ce" }]
]);
function hn(t) {
  let n = 0;
  for (let r = 0; r < t.length; r += 1) n = (n * 31 + t.charCodeAt(r)) % 360;
  return n;
}
function nt({ agent: t, size: n = 36 }) {
  const r = hn(t.id || t.name);
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
const gn = Re(async () => ({ default: (await import("./chunk-mermaid-HWGCJPDP-BSuaqT2c.js").then((t) => t.i)).Streamdown })), qe = {
  working: "Working",
  idle: "Idle",
  waiting_for_approval: "Needs you",
  offline: "No profile"
};
function yn({
  agents: t,
  sections: n,
  rooms: r,
  selectedAgentId: o,
  selectedThreadId: m,
  search: w,
  onSearch: u,
  onSelectAgent: M,
  onSelectThread: l,
  onAction: s,
  onCreate: k,
  onToggleSection: c
}) {
  const [a, p] = N();
  q(() => {
    if (!a) return;
    const v = () => p(void 0);
    return window.addEventListener("pointerdown", v), () => window.removeEventListener("pointerdown", v);
  }, [a]);
  const g = (v, P) => {
    p(void 0), s(v, P);
  }, d = w.trim().toLowerCase(), _ = (v) => !d || `${v.name} ${v.role}`.toLowerCase().includes(d), x = fe(() => new Map(t.map((v) => [v.id, v])), [t]), O = n.map((v) => ({
    section: v,
    members: v.bot_ids.map((P) => x.get(P)).filter((P) => !!P && _(P))
  })).filter((v) => v.members.length > 0), H = !d && O.length > 1, K = (v) => /* @__PURE__ */ e.createElement(
    "div",
    {
      key: v.id,
      className: `agent-row ${o === v.id && !m.startsWith("group:") ? "selected" : ""} ${v.status === "working" ? "is-working" : ""}`
    },
    /* @__PURE__ */ e.createElement("button", { className: "agent-select", onClick: () => M(v.id) }, /* @__PURE__ */ e.createElement(nt, { agent: v }), /* @__PURE__ */ e.createElement("span", { className: "agent-copy" }, /* @__PURE__ */ e.createElement("strong", null, /* @__PURE__ */ e.createElement("span", null, v.name), /* @__PURE__ */ e.createElement("span", { className: `agent-status ${v.status}`, title: qe[v.status], "aria-label": qe[v.status] })), v.lastMessagePreview && /* @__PURE__ */ e.createElement("span", { className: "agent-preview agent-preview-entering" }, /* @__PURE__ */ e.createElement(xe, { fallback: v.lastMessagePreview }, /* @__PURE__ */ e.createElement(gn, { className: "agent-preview-markdown", mode: "static", controls: !1, linkSafety: { enabled: !0 }, skipHtml: !0 }, v.lastMessagePreview))))),
    /* @__PURE__ */ e.createElement(
      "button",
      {
        className: "agent-more",
        "aria-label": `More actions for ${v.name}`,
        onPointerDown: (P) => P.stopPropagation(),
        onClick: () => p((P) => P === v.id ? void 0 : v.id)
      },
      /* @__PURE__ */ e.createElement(Zt, { size: 15 })
    ),
    a === v.id && /* @__PURE__ */ e.createElement("div", { className: "agent-menu", role: "menu", onPointerDown: (P) => P.stopPropagation() }, /* @__PURE__ */ e.createElement("button", { role: "menuitem", onClick: () => g(v, "edit") }, /* @__PURE__ */ e.createElement(on, { size: 13 }), " Edit"), /* @__PURE__ */ e.createElement("button", { role: "menuitem", onClick: () => g(v, "duplicate") }, /* @__PURE__ */ e.createElement(Gt, { size: 13 }), " Duplicate"), /* @__PURE__ */ e.createElement("div", null), /* @__PURE__ */ e.createElement("button", { role: "menuitem", className: "danger-text", onClick: () => g(v, "delete") }, /* @__PURE__ */ e.createElement(tt, { size: 13 }), " Remove from crew"))
  );
  return /* @__PURE__ */ e.createElement("aside", { className: "agent-sidebar" }, /* @__PURE__ */ e.createElement("div", { className: "sidebar-titlebar" }, /* @__PURE__ */ e.createElement("span", { className: "sidebar-title" }, "Crew"), /* @__PURE__ */ e.createElement("button", { className: "brand-add", "aria-label": "Hire a teammate", onClick: k }, /* @__PURE__ */ e.createElement(Ze, { size: 18 }))), /* @__PURE__ */ e.createElement("label", { className: "search" }, /* @__PURE__ */ e.createElement(Qe, { size: 15 }), /* @__PURE__ */ e.createElement("input", { "aria-label": "Search the crew", placeholder: "Search your crew", value: w, onChange: (v) => u(v.target.value) })), /* @__PURE__ */ e.createElement("div", { className: "agent-list" }, t.length === 0 && /* @__PURE__ */ e.createElement("div", { className: "agent-list-empty" }, "No teammates yet"), t.length > 0 && O.length === 0 && /* @__PURE__ */ e.createElement("div", { className: "agent-list-empty" }, "No teammates found"), H ? O.map(({ section: v, members: P }) => /* @__PURE__ */ e.createElement("section", { className: "agent-section", key: v.id }, /* @__PURE__ */ e.createElement(
    "button",
    {
      className: `agent-section-header ${v.collapsed ? "is-collapsed" : ""}`,
      "aria-expanded": !v.collapsed,
      onClick: () => c(v.id, !v.collapsed)
    },
    /* @__PURE__ */ e.createElement(Me, { size: 13, className: "agent-section-chevron" }),
    /* @__PURE__ */ e.createElement("span", null, v.name),
    /* @__PURE__ */ e.createElement("small", null, P.length)
  ), !v.collapsed && P.map(K))) : O.flatMap((v) => v.members).map(K), r.length > 0 && /* @__PURE__ */ e.createElement("section", { className: "agent-section", key: "__rooms__" }, /* @__PURE__ */ e.createElement("div", { className: "agent-section-header is-static" }, /* @__PURE__ */ e.createElement("span", null, "Rooms"), /* @__PURE__ */ e.createElement("small", null, r.length)), r.map((v) => /* @__PURE__ */ e.createElement("div", { key: v.id, className: `agent-row ${m === v.id ? "selected" : ""}` }, /* @__PURE__ */ e.createElement("button", { className: "agent-select", onClick: () => l(v.id) }, /* @__PURE__ */ e.createElement("span", { className: "agent-avatar", role: "img", "aria-label": `${v.title} room` }, v.emoji || "👥"), /* @__PURE__ */ e.createElement("span", { className: "agent-copy" }, /* @__PURE__ */ e.createElement("strong", null, /* @__PURE__ */ e.createElement("span", null, v.title)), /* @__PURE__ */ e.createElement("span", { className: "agent-preview" }, v.lastMessagePreview || v.subtitle))))))));
}
function vn({
  open: t,
  agents: n,
  rooms: r,
  onClose: o,
  onSelectAgent: m,
  onSelectThread: w,
  onCreateAgent: u,
  onComputer: M
}) {
  const [l, s] = N(""), k = G(null);
  q(() => {
    t && (s(""), window.setTimeout(() => k.current?.focus(), 0));
  }, [t]);
  const a = fe(() => [
    { id: "create", label: "Hire a teammate", detail: "Add someone to the crew", icon: Ze, run: u },
    { id: "computer", label: "Open their computer", detail: "The current teammate's screen", icon: Je, run: M },
    ...n.map((g) => ({
      id: `agent-${g.id}`,
      label: g.name,
      detail: `${g.role} · ${g.status.replaceAll("_", " ")}`,
      icon: Ft,
      run: () => m(g.id)
    })),
    ...r.map((g) => ({
      id: `room-${g.id}`,
      label: g.title,
      detail: g.subtitle || "Room",
      icon: fn,
      run: () => w(g.id)
    }))
  ], [n, r, M, u, m, w]).filter((g) => `${g.label} ${g.detail}`.toLowerCase().includes(l.toLowerCase()));
  if (!t) return null;
  const p = (g) => {
    g.run(), o();
  };
  return /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "palette-backdrop",
      role: "presentation",
      onMouseDown: (g) => {
        g.target === g.currentTarget && o();
      }
    },
    /* @__PURE__ */ e.createElement("section", { className: "command-palette", role: "dialog", "aria-modal": "true", "aria-label": "Command palette" }, /* @__PURE__ */ e.createElement("label", null, /* @__PURE__ */ e.createElement(Qe, { size: 17 }), /* @__PURE__ */ e.createElement(
      "input",
      {
        ref: k,
        "aria-label": "Search the crew and commands",
        placeholder: "Search your crew…",
        value: l,
        onChange: (g) => s(g.target.value),
        onKeyDown: (g) => {
          g.key === "Escape" && o(), g.key === "Enter" && a[0] && p(a[0]);
        }
      }
    ), /* @__PURE__ */ e.createElement("kbd", null, "esc")), /* @__PURE__ */ e.createElement("div", { className: "palette-results" }, a.length ? a.map((g, d) => {
      const _ = g.icon;
      return /* @__PURE__ */ e.createElement("button", { key: g.id, className: d === 0 ? "active" : "", onClick: () => p(g) }, /* @__PURE__ */ e.createElement("span", null, /* @__PURE__ */ e.createElement(_, { size: 16 })), /* @__PURE__ */ e.createElement("div", null, /* @__PURE__ */ e.createElement("strong", null, g.label), /* @__PURE__ */ e.createElement("small", null, g.detail)), d === 0 && /* @__PURE__ */ e.createElement("kbd", null, "↵"));
    }) : /* @__PURE__ */ e.createElement("p", null, "Nothing matches that")), /* @__PURE__ */ e.createElement("footer", null, /* @__PURE__ */ e.createElement("span", null, "Crew"), /* @__PURE__ */ e.createElement("span", null, /* @__PURE__ */ e.createElement("kbd", null, "⌘"), /* @__PURE__ */ e.createElement("kbd", null, "K"), " to open")))
  );
}
function ve({ label: t, kind: n = "", children: r }) {
  return /* @__PURE__ */ e.createElement("div", { className: `crew-chip ${n}` }, t && /* @__PURE__ */ e.createElement("div", { className: "crew-chip-label" }, t), r);
}
function wn({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ve, { kind: "report" }, (t.lines ?? []).map((n, r) => /* @__PURE__ */ e.createElement("div", { className: "crew-report-line", key: r }, /* @__PURE__ */ e.createElement("span", { className: "crew-report-check" }, /* @__PURE__ */ e.createElement(De, { size: 13 })), /* @__PURE__ */ e.createElement("span", { className: "crew-report-system" }, n.system), /* @__PURE__ */ e.createElement("span", { className: "crew-report-arrow" }, "→"), /* @__PURE__ */ e.createElement("span", null, n.result, n.count && /* @__PURE__ */ e.createElement("span", { className: "crew-report-count" }, " · ", n.count)))), t.closing && /* @__PURE__ */ e.createElement("div", { className: "crew-report-closing" }, t.closing));
}
function En({ payload: t, onDecide: n }) {
  const r = t.status === "approved" || t.status === "discarded";
  return /* @__PURE__ */ e.createElement("div", { className: `crew-chip approval ${r ? "resolved" : ""}` }, /* @__PURE__ */ e.createElement("div", { className: "crew-chip-label" }, /* @__PURE__ */ e.createElement(et, { size: 13 }), " ", r ? "Decided" : "Needs you"), /* @__PURE__ */ e.createElement("div", { className: "crew-approval-action" }, t.action), t.detail && /* @__PURE__ */ e.createElement("div", { className: "crew-approval-detail" }, t.detail), r ? /* @__PURE__ */ e.createElement("div", { className: "crew-approval-outcome" }, t.status === "approved" ? "Approved" : "Discarded") : /* @__PURE__ */ e.createElement("div", { className: "crew-approval-buttons" }, /* @__PURE__ */ e.createElement("button", { className: "crew-btn danger", onClick: () => n(String(t.approval_id), "deny") }, "Discard"), /* @__PURE__ */ e.createElement("button", { className: "crew-btn primary", onClick: () => n(String(t.approval_id), "allow") }, "Approve")));
}
function bn({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ve, { label: "You decided" }, /* @__PURE__ */ e.createElement("div", { className: "crew-approval-action" }, t.action), /* @__PURE__ */ e.createElement("div", { className: "crew-approval-outcome" }, t.status === "approved" ? "Approved" : "Discarded"));
}
function kn({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ve, { label: "Memory updated" }, /* @__PURE__ */ e.createElement("div", { className: "crew-memory-rule" }, t.rule), t.diff && /* @__PURE__ */ e.createElement("pre", { className: "crew-memory-diff" }, t.diff));
}
function Sn({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ve, { label: "Routine created" }, /* @__PURE__ */ e.createElement("div", { className: "crew-routine-name" }, /* @__PURE__ */ e.createElement(Ye, { size: 13 }), " ", t.name), /* @__PURE__ */ e.createElement("div", { className: "crew-routine-when" }, t.human || t.cron));
}
function Nn({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ve, { label: `Handed over by @${t.from_name || t.from || "a teammate"}` }, /* @__PURE__ */ e.createElement("div", { className: "crew-botref-body" }, /* @__PURE__ */ e.createElement(Kt, { size: 13 }), " ", t.content));
}
function Cn({ payload: t, onOpenScreen: n }) {
  return /* @__PURE__ */ e.createElement(ve, { label: "Needs you at the keyboard" }, /* @__PURE__ */ e.createElement("div", { className: "crew-login-site" }, /* @__PURE__ */ e.createElement(nn, { size: 13 }), " Sign in to ", t.site || "a site"), t.why && /* @__PURE__ */ e.createElement("div", { className: "crew-login-why" }, t.why), /* @__PURE__ */ e.createElement("button", { className: "crew-btn", onClick: n }, "Take the wheel"));
}
function Mn({ payload: t, screenshotUrl: n }) {
  const r = t.url ?? (t.bot_id && t.file ? n(t.bot_id, t.file) : void 0);
  return r ? /* @__PURE__ */ e.createElement("figure", { className: "crew-shot" }, /* @__PURE__ */ e.createElement("img", { src: r, alt: t.caption || "the teammate's screen", loading: "lazy" }), t.caption && /* @__PURE__ */ e.createElement("figcaption", null, t.caption)) : null;
}
function Tn({ kind: t, payload: n, handlers: r }) {
  const o = n ?? {};
  switch (t) {
    case "report":
      return /* @__PURE__ */ e.createElement(wn, { payload: o });
    case "approval_request":
      return /* @__PURE__ */ e.createElement(En, { payload: o, onDecide: r.onDecide });
    case "approval_resolved":
      return /* @__PURE__ */ e.createElement(bn, { payload: o });
    case "memory_updated":
      return /* @__PURE__ */ e.createElement(kn, { payload: o });
    case "routine_created":
      return /* @__PURE__ */ e.createElement(Sn, { payload: o });
    case "bot_ref":
      return /* @__PURE__ */ e.createElement(Nn, { payload: o });
    case "login_request":
      return /* @__PURE__ */ e.createElement(Cn, { payload: o, onOpenScreen: r.onOpenScreen });
    case "screenshot":
      return /* @__PURE__ */ e.createElement(Mn, { payload: o, screenshotUrl: r.screenshotUrl });
    default:
      return null;
  }
}
const _n = Re(async () => ({ default: (await import("./chunk-mermaid-HWGCJPDP-BSuaqT2c.js").then((t) => t.i)).Streamdown })), An = {
  browser: Jt,
  terminal: mn,
  file: Ae,
  handoff: _e,
  status: _e
};
function xn(t) {
  return t.parts.filter((n) => n.type === "text").map((n) => n.text).join("");
}
const On = (t) => {
  const n = Math.max(0, Math.floor(t / 1e3)), r = Math.floor(n / 60);
  return r ? `${r}m ${n % 60}s` : `${n}s`;
};
function Rn() {
  return /* @__PURE__ */ e.createElement("svg", { "aria-hidden": "true", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ e.createElement("path", { d: "m5 12 7-7 7 7" }), /* @__PURE__ */ e.createElement("path", { d: "M12 19V5" }));
}
function In() {
  return /* @__PURE__ */ e.createElement("svg", { className: "stop-icon", "aria-hidden": "true", viewBox: "0 0 24 24" }, /* @__PURE__ */ e.createElement("rect", { x: "7.5", y: "7.5", width: "9", height: "9", rx: "1.5", fill: "currentColor" }));
}
function Dn(t) {
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
function Ln({ agent: t, label: n, activities: r, startedAt: o }) {
  const [m, w] = N(0), [u, M] = N(!1);
  return q(() => {
    w(Date.now());
    const l = window.setInterval(() => w(Date.now()), 1e3);
    return () => window.clearInterval(l);
  }, []), /* @__PURE__ */ e.createElement("details", { className: "agent-working-details", open: u }, /* @__PURE__ */ e.createElement(
    "summary",
    {
      role: "status",
      "aria-label": `${t?.name ?? "This teammate"} is working: ${n}`,
      onClick: (l) => {
        l.preventDefault(), M((s) => !s);
      }
    },
    /* @__PURE__ */ e.createElement("span", { className: "agent-working-progress" }, "Working for ", On(m - Date.parse(o))),
    /* @__PURE__ */ e.createElement(Me, { className: "agent-working-chevron", size: 15 })
  ), r.length > 0 && /* @__PURE__ */ e.createElement("div", { className: "agent-working-tools" }, r.map((l) => {
    const s = An[l.kind] ?? _e;
    return /* @__PURE__ */ e.createElement("details", { className: `agent-tool-detail ${l.status}`, key: l.id }, /* @__PURE__ */ e.createElement("summary", null, /* @__PURE__ */ e.createElement(s, { size: 14 }), /* @__PURE__ */ e.createElement("span", null, l.title), /* @__PURE__ */ e.createElement(Me, { size: 13 })), /* @__PURE__ */ e.createElement("div", null, l.output ?? (l.status === "running" ? "Waiting for result…" : "No output")));
  })));
}
function $n({ message: t, agent: n, senderName: r, activities: o, chips: m, entering: w = !1 }) {
  const u = xn(t), M = G(null), l = G(!!t.streaming), s = o.filter((g) => g.conversationId === t.conversationId), k = [...s].reverse().find((g) => g.status === "running") ?? s.at(-1), c = t.role === "agent" && !!t.streaming, a = u.trim() || k?.title || "Working", p = t.parts.filter((g) => g.type === "chip");
  return Ie(() => {
    const g = M.current, d = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (g && t.role === "agent" && l.current && !t.streaming && !d) {
      const _ = g.querySelector(".message-body");
      _ && typeof _.animate == "function" && _.animate(
        [{ opacity: 0, transform: "translate3d(-6px,4px,0)" }, { opacity: 1, transform: "translate3d(0,0,0)" }],
        { duration: 260, easing: "cubic-bezier(.2,.82,.3,1)" }
      );
    }
    l.current = !!t.streaming;
  }, [w, t.role, t.streaming]), /* @__PURE__ */ e.createElement("div", { className: `message ${t.role} ${w ? "message-entering" : ""}`, ref: M }, t.interrupted && /* @__PURE__ */ e.createElement("div", { className: "agent-interrupted" }, "Interrupted"), r && t.role === "agent" && /* @__PURE__ */ e.createElement("div", { className: "message-sender" }, r), !c && (u || t.streaming && !p.length) && /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "message-body",
      onClick: t.role === "agent" ? Dn : void 0
    },
    t.role === "agent" ? /* @__PURE__ */ e.createElement(xe, { fallback: /* @__PURE__ */ e.createElement("span", { className: "agent-markdown-fallback" }, u) }, /* @__PURE__ */ e.createElement(
      _n,
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
  ), c && /* @__PURE__ */ e.createElement(
    Ln,
    {
      agent: n,
      label: a,
      activities: s,
      startedAt: t.createdAt
    }
  ), p.map((g, d) => /* @__PURE__ */ e.createElement(
    Tn,
    {
      key: `${t.id}:${d}`,
      kind: g.kind,
      payload: g.payload,
      handlers: m
    }
  )));
}
function Pn({
  agent: t,
  thread: n,
  agentsById: r,
  messages: o,
  activities: m,
  chips: w,
  loading: u = !1,
  focusRequest: M = 0,
  onSend: l,
  onToggleDetails: s
}) {
  const [k, c] = N(""), [a, p] = N(!1), [g, d] = N(!1), [_, x] = N(!1), [O, H] = N(!1), K = G(null), v = G(null), P = G(null), X = G(!1), Z = G(!0), B = G(!1), ce = G(0), Q = G(0), ne = G(void 0), j = G(void 0), ee = G(/* @__PURE__ */ new Set()), le = G(n?.id ?? ""), me = G(u), [pe, $] = N(() => /* @__PURE__ */ new Set()), re = n?.title || t?.name || "Crew", te = n?.kind === "group", z = n?.id ?? t?.id ?? "";
  Ie(() => {
    const R = le.current !== z || me.current;
    if (le.current = z, me.current = u, u || R) {
      ee.current = new Set(o.map((Y) => Y.id)), $(/* @__PURE__ */ new Set());
      return;
    }
    const I = o.filter((Y) => !ee.current.has(Y.id)).map((Y) => Y.id);
    for (const Y of I) ee.current.add(Y);
    $(new Set(I));
  }, [z, u, o]);
  function ae(R) {
    const I = K.current;
    !I || typeof I.scrollTo != "function" || (Z.current = !0, B.current = !0, x(!1), ne.current && window.clearTimeout(ne.current), ce.current = Math.max(
      ce.current,
      Date.now() + (R === "smooth" ? 650 : 150)
    ), I.scrollTo({ top: I.scrollHeight, behavior: R }), ne.current = window.setTimeout(() => {
      ne.current = void 0, B.current = !1;
    }, R === "smooth" ? 400 : 0));
  }
  q(() => {
    Z.current = !0, B.current = !1, Q.current = 0, x(!1), requestAnimationFrame(() => ae("auto"));
  }, [z]), q(() => {
    Z.current && ae("smooth");
  }, [o]), q(() => {
    const R = K.current, I = v.current;
    if (!R || !I || typeof ResizeObserver > "u") return;
    const Y = new ResizeObserver(() => {
      Z.current && ae("auto");
    });
    return Y.observe(I), () => Y.disconnect();
  }, [z, u]), q(() => () => {
    j.current && window.clearTimeout(j.current), ne.current && window.clearTimeout(ne.current);
  }, []), q(() => {
    M > 0 && P.current?.focus();
  }, [z, M]);
  function se() {
    B.current || Date.now() < ce.current || (H(!0), j.current && window.clearTimeout(j.current), j.current = window.setTimeout(() => {
      j.current = void 0, H(!1);
    }, 700));
  }
  async function W(R) {
    R.preventDefault();
    const I = k.trim();
    if (!(!I || X.current)) {
      X.current = !0, c(""), p(!0);
      try {
        await l(I);
      } finally {
        X.current = !1, p(!1);
      }
    }
  }
  return /* @__PURE__ */ e.createElement("main", { className: "conversation" }, /* @__PURE__ */ e.createElement("header", { className: `conversation-header ${g ? "scrolled" : ""}` }, /* @__PURE__ */ e.createElement("h1", null, n?.emoji && /* @__PURE__ */ e.createElement("span", { className: "conversation-emoji" }, n.emoji), re), n?.subtitle && /* @__PURE__ */ e.createElement("p", { className: "conversation-subtitle" }, n.subtitle), /* @__PURE__ */ e.createElement("div", { className: "header-actions" }, !te && /* @__PURE__ */ e.createElement("button", { className: "computer-trigger", "aria-label": "Open this teammate's computer", onClick: s }, /* @__PURE__ */ e.createElement(Je, { size: 18 })))), /* @__PURE__ */ e.createElement("div", { className: "conversation-scroll-shell" }, u ? /* @__PURE__ */ e.createElement("div", { className: "conversation-skeleton", role: "status", "aria-label": "Loading this thread" }, /* @__PURE__ */ e.createElement("div", { className: "skeleton-message skeleton-agent" }, /* @__PURE__ */ e.createElement("span", { className: "skeleton-line skeleton-line-wide" }), /* @__PURE__ */ e.createElement("span", { className: "skeleton-line" })), /* @__PURE__ */ e.createElement("div", { className: "skeleton-message skeleton-user" }, /* @__PURE__ */ e.createElement("span", { className: "skeleton-bubble" })), /* @__PURE__ */ e.createElement("div", { className: "skeleton-message skeleton-agent" }, /* @__PURE__ */ e.createElement("span", { className: "skeleton-line skeleton-line-short" }))) : /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement(
    "div",
    {
      className: `message-scroll ${O ? "scrollbar-visible" : ""}`,
      ref: K,
      onWheelCapture: (R) => {
        R.deltaY < 0 && (B.current = !1);
      },
      onScroll: (R) => {
        const I = R.currentTarget, Y = I.scrollHeight - I.scrollTop - I.clientHeight, b = Y <= 24, C = I.scrollTop < Q.current - 1;
        Q.current = I.scrollTop, d(I.scrollTop > 0), C && Y > 72 ? (B.current = !1, Z.current = !1, x(!0)) : !B.current && b ? (Z.current = !0, x(!1)) : !B.current && Y > 72 && (Z.current = !1, x(!0)), se();
      },
      onPointerMove: (R) => {
        R.currentTarget.getBoundingClientRect().right - R.clientX <= 14 ? H(!0) : j.current || H(!1);
      },
      onPointerLeave: () => H(!1)
    },
    /* @__PURE__ */ e.createElement("div", { className: "message-content", ref: v }, o.length === 0 && t && /* @__PURE__ */ e.createElement("div", { className: "conversation-intro" }, /* @__PURE__ */ e.createElement(nt, { agent: t, size: 54 }), /* @__PURE__ */ e.createElement("h2", null, t.name), /* @__PURE__ */ e.createElement("p", null, t.role)), o.map((R) => /* @__PURE__ */ e.createElement(
      $n,
      {
        key: R.id,
        message: R,
        agent: t,
        senderName: te ? r.get(R.sender ?? "")?.name : void 0,
        activities: m,
        chips: w,
        entering: pe.has(R.id) || R.id.startsWith("optimistic-user:")
      }
    )))
  ), _ && /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "scroll-to-bottom",
      "aria-label": "Scroll to the latest message",
      onClick: () => ae("smooth")
    },
    /* @__PURE__ */ e.createElement(Ht, { size: 20 })
  ))), /* @__PURE__ */ e.createElement("form", { className: "composer", onSubmit: W }, /* @__PURE__ */ e.createElement(
    "textarea",
    {
      ref: P,
      "aria-label": `Message ${re}`,
      placeholder: te ? "Ask the room…" : `Message ${re}…`,
      value: k,
      onChange: (R) => c(R.target.value),
      onKeyDown: (R) => {
        R.key === "Enter" && !R.shiftKey && !R.nativeEvent.isComposing && R.keyCode !== 229 && (R.preventDefault(), R.currentTarget.form?.requestSubmit());
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
    a ? /* @__PURE__ */ e.createElement(In, null) : /* @__PURE__ */ e.createElement(Rn, null)
  ))));
}
const zn = [
  { id: "all", label: "Everything", types: [] },
  {
    id: "stopped",
    label: "Stopped",
    types: ["tool.refused", "tool.held", "approval.expired", "crew.bot_declined"]
  },
  { id: "failed", label: "Went wrong", types: ["tool.failed"] },
  { id: "decisions", label: "Your decisions", types: ["approval.decided", "grant.changed"] }
], Un = {
  "tool.allowed": Te,
  "tool.refused": un,
  "tool.held": ze,
  "tool.failed": pn,
  "approval.decided": Te,
  "approval.expired": Ye,
  "grant.changed": Ue,
  "crew.policy_loaded": Ue,
  "crew.bot_declined": ze
}, qn = {
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
function Hn(t) {
  const n = new Date(t);
  return `${n.toLocaleDateString(void 0, { month: "short", day: "numeric" })} ${n.toLocaleTimeString(void 0, { hour: "2-digit", minute: "2-digit" })}`;
}
function jn({ events: t, loading: n, viewId: r, onChangeView: o, onLoadMore: m, hasMore: w }) {
  const [u, M] = N(() => /* @__PURE__ */ new Set()), l = fe(() => t.slice().sort((s, k) => k.id - s.id), [t]);
  return /* @__PURE__ */ e.createElement("section", { className: "audit-timeline" }, /* @__PURE__ */ e.createElement("div", { className: "audit-views", role: "tablist", "aria-label": "What to show" }, zn.map((s) => /* @__PURE__ */ e.createElement(
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
    const k = Un[s.event_type] ?? Te, c = u.has(s.id), a = s.event_type === "tool.refused" || s.event_type === "tool.held";
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
            const g = new Set(p);
            return g.delete(s.id) || g.add(s.id), g;
          })
        },
        /* @__PURE__ */ e.createElement(k, { size: 14 }),
        /* @__PURE__ */ e.createElement("span", { className: "audit-subject" }, s.subject || s.tool || s.event_type),
        /* @__PURE__ */ e.createElement("span", { className: "audit-kind" }, qn[s.event_type] ?? s.event_type),
        /* @__PURE__ */ e.createElement("time", { className: "audit-when", dateTime: new Date(s.created_at).toISOString() }, Hn(s.created_at))
      ),
      c && /* @__PURE__ */ e.createElement("dl", { className: "audit-detail" }, s.tool && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Tool"), /* @__PURE__ */ e.createElement("dd", null, /* @__PURE__ */ e.createElement("code", null, s.tool))), s.detail && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Why"), /* @__PURE__ */ e.createElement("dd", null, s.detail)), s.actor !== "_system" && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Who"), /* @__PURE__ */ e.createElement("dd", null, s.actor === "_operator" ? "you" : s.actor)), s.duration_ms !== null && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Took"), /* @__PURE__ */ e.createElement("dd", null, s.duration_ms, " ms")), s.args_digest && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Arguments"), /* @__PURE__ */ e.createElement("dd", null, /* @__PURE__ */ e.createElement("code", null, s.args_digest))))
    );
  })), w && /* @__PURE__ */ e.createElement(
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
const Fn = {
  slides: cn,
  document: Ae,
  sheet: en,
  image: tn,
  data: Yt,
  text: Ae,
  code: Qt,
  archive: qt,
  file: Xe
};
function Vn(t) {
  if (t === 0) return "0 bytes";
  const n = ["bytes", "KB", "MB", "GB"];
  let r = t, o = 0;
  for (; r >= 1024 && o < n.length - 1; )
    r /= 1024, o += 1;
  return `${o === 0 ? r : r.toFixed(r < 10 ? 1 : 0)} ${n[o]}`;
}
function Bn(t) {
  const n = new Date(t);
  return Number.isNaN(n.getTime()) ? "" : (/* @__PURE__ */ new Date()).toDateString() === n.toDateString() ? n.toLocaleTimeString(void 0, { hour: "2-digit", minute: "2-digit" }) : n.toLocaleDateString(void 0, { month: "short", day: "numeric" });
}
function Wn({ agentName: t, artifacts: n, urlFor: r }) {
  return n.length === 0 ? /* @__PURE__ */ e.createElement("p", { className: "files-empty" }, t, " has not produced any files yet.") : /* @__PURE__ */ e.createElement("ul", { className: "files-list" }, n.map((o) => {
    const m = Fn[o.kind] ?? Xe, w = o.size === 0;
    return /* @__PURE__ */ e.createElement("li", { className: `files-row ${w ? "is-empty" : ""}`, key: o.id }, /* @__PURE__ */ e.createElement(
      "a",
      {
        href: r(o),
        download: o.name,
        className: "files-link"
      },
      /* @__PURE__ */ e.createElement(m, { size: 15 }),
      /* @__PURE__ */ e.createElement("span", { className: "files-name", title: o.path }, o.name),
      /* @__PURE__ */ e.createElement("span", { className: "files-meta" }, Vn(o.size), w && /* @__PURE__ */ e.createElement("span", { className: "files-warning", title: "Nothing was written to this file" }, "didn't finish")),
      /* @__PURE__ */ e.createElement("span", { className: "files-when" }, Bn(o.updatedAt)),
      /* @__PURE__ */ e.createElement(Xt, { size: 13, className: "files-download" })
    ));
  }));
}
const Gn = [
  { mode: "deny", label: "Never", icon: jt },
  { mode: "ask", label: "Ask me", icon: Wt },
  { mode: "allow", label: "Allow", icon: dn }
];
function Kn({ agentName: t, grants: n, busy: r, onSetGrant: o, onClearGrant: m }) {
  const [w, u] = N(""), [M, l] = N(!1), s = fe(() => {
    const c = w.trim().toLowerCase(), a = n.filter((g) => M && g.source !== "grant" ? !1 : c ? g.tool.toLowerCase().includes(c) || g.toolset.toLowerCase().includes(c) : !0), p = /* @__PURE__ */ new Map();
    for (const g of a) {
      const d = g.toolset || "other";
      p.set(d, [...p.get(d) ?? [], g]);
    }
    return [...p.entries()].sort(([g], [d]) => g.localeCompare(d));
  }, [n, w, M]), k = n.filter((c) => c.mode === "ask").length;
  return /* @__PURE__ */ e.createElement("section", { className: "permissions-panel" }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow" }, /* @__PURE__ */ e.createElement(rn, { size: 14 }), " What ", t, " can do"), /* @__PURE__ */ e.createElement("p", { className: "permissions-summary" }, n.length, " tools · ", k, " need your say-so"), /* @__PURE__ */ e.createElement("div", { className: "permissions-filters" }, /* @__PURE__ */ e.createElement(
    "input",
    {
      type: "search",
      "aria-label": "Filter tools",
      placeholder: "Filter tools…",
      value: w,
      onChange: (c) => u(c.target.value)
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
    /* @__PURE__ */ e.createElement("div", { className: "permissions-modes", role: "group", "aria-label": `What ${t} may do with ${p.tool}` }, Gn.map(({ mode: g, label: d, icon: _ }) => /* @__PURE__ */ e.createElement(
      "button",
      {
        key: g,
        type: "button",
        className: `permissions-mode ${p.mode === g ? "is-current" : ""}`,
        "aria-pressed": p.mode === g,
        disabled: r || p.protected,
        title: p.protected ? "This teammate always keeps this one" : d,
        onClick: () => {
          o(p.tool, g);
        }
      },
      /* @__PURE__ */ e.createElement(_, { size: 13 }),
      " ",
      d
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
      /* @__PURE__ */ e.createElement(ln, { size: 13 })
    ))
  )))));
}
function mr(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
function Yn(t) {
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
var ke = { exports: {} }, oe = {};
const rt = /* @__PURE__ */ Yn(Dt);
var He;
function Xn() {
  if (He) return oe;
  He = 1;
  var t = rt;
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
  function w(l, s, k) {
    var c = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: m,
      key: c == null ? null : "" + c,
      children: l,
      containerInfo: s,
      implementation: k
    };
  }
  var u = t.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function M(l, s) {
    if (l === "font") return "";
    if (typeof s == "string")
      return s === "use-credentials" ? s : "";
  }
  return oe.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = o, oe.createPortal = function(l, s) {
    var k = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!s || s.nodeType !== 1 && s.nodeType !== 9 && s.nodeType !== 11)
      throw Error(n(299));
    return w(l, s, null, k);
  }, oe.flushSync = function(l) {
    var s = u.T, k = o.p;
    try {
      if (u.T = null, o.p = 2, l) return l();
    } finally {
      u.T = s, o.p = k, o.d.f();
    }
  }, oe.preconnect = function(l, s) {
    typeof l == "string" && (s ? (s = s.crossOrigin, s = typeof s == "string" ? s === "use-credentials" ? s : "" : void 0) : s = null, o.d.C(l, s));
  }, oe.prefetchDNS = function(l) {
    typeof l == "string" && o.d.D(l);
  }, oe.preinit = function(l, s) {
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
  }, oe.preinitModule = function(l, s) {
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
  }, oe.preload = function(l, s) {
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
  }, oe.preloadModule = function(l, s) {
    if (typeof l == "string")
      if (s) {
        var k = M(s.as, s.crossOrigin);
        o.d.m(l, {
          as: typeof s.as == "string" && s.as !== "script" ? s.as : void 0,
          crossOrigin: k,
          integrity: typeof s.integrity == "string" ? s.integrity : void 0
        });
      } else o.d.m(l);
  }, oe.requestFormReset = function(l) {
    o.d.r(l);
  }, oe.unstable_batchedUpdates = function(l, s) {
    return l(s);
  }, oe.useFormState = function(l, s, k) {
    return u.H.useFormState(l, s, k);
  }, oe.useFormStatus = function() {
    return u.H.useHostTransitionStatus();
  }, oe.version = "19.2.7", oe;
}
var ie = {};
var je;
function Jn() {
  return je || (je = 1, process.env.NODE_ENV !== "production" && (function() {
    function t() {
    }
    function n(c) {
      return "" + c;
    }
    function r(c, a, p) {
      var g = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
      try {
        n(g);
        var d = !1;
      } catch {
        d = !0;
      }
      return d && (console.error(
        "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
        typeof Symbol == "function" && Symbol.toStringTag && g[Symbol.toStringTag] || g.constructor.name || "Object"
      ), n(g)), {
        $$typeof: s,
        key: g == null ? null : "" + g,
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
    function w(c) {
      return c === null ? "`null`" : c === void 0 ? "`undefined`" : c === "" ? "an empty string" : typeof c == "string" ? JSON.stringify(c) : typeof c == "number" ? "`" + c + "`" : 'something with type "' + typeof c + '"';
    }
    function u() {
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
    var M = rt, l = {
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
    ), ie.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = l, ie.createPortal = function(c, a) {
      var p = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
      if (!a || a.nodeType !== 1 && a.nodeType !== 9 && a.nodeType !== 11)
        throw Error("Target container is not a DOM element.");
      return r(c, a, null, p);
    }, ie.flushSync = function(c) {
      var a = k.T, p = l.p;
      try {
        if (k.T = null, l.p = 2, c)
          return c();
      } finally {
        k.T = a, l.p = p, l.d.f() && console.error(
          "flushSync was called from inside a lifecycle method. React cannot flush when React is already rendering. Consider moving this call to a scheduler task or micro task."
        );
      }
    }, ie.preconnect = function(c, a) {
      typeof c == "string" && c ? a != null && typeof a != "object" ? console.error(
        "ReactDOM.preconnect(): Expected the `options` argument (second) to be an object but encountered %s instead. The only supported option at this time is `crossOrigin` which accepts a string.",
        w(a)
      ) : a != null && typeof a.crossOrigin != "string" && console.error(
        "ReactDOM.preconnect(): Expected the `crossOrigin` option (second argument) to be a string but encountered %s instead. Try removing this option or passing a string value instead.",
        m(a.crossOrigin)
      ) : console.error(
        "ReactDOM.preconnect(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
        m(c)
      ), typeof c == "string" && (a ? (a = a.crossOrigin, a = typeof a == "string" ? a === "use-credentials" ? a : "" : void 0) : a = null, l.d.C(c, a));
    }, ie.prefetchDNS = function(c) {
      if (typeof c != "string" || !c)
        console.error(
          "ReactDOM.prefetchDNS(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
          m(c)
        );
      else if (1 < arguments.length) {
        var a = arguments[1];
        typeof a == "object" && a.hasOwnProperty("crossOrigin") ? console.error(
          "ReactDOM.prefetchDNS(): Expected only one argument, `href`, but encountered %s as a second argument instead. This argument is reserved for future options and is currently disallowed. It looks like the you are attempting to set a crossOrigin property for this DNS lookup hint. Browsers do not perform DNS queries using CORS and setting this attribute on the resource hint has no effect. Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.",
          w(a)
        ) : console.error(
          "ReactDOM.prefetchDNS(): Expected only one argument, `href`, but encountered %s as a second argument instead. This argument is reserved for future options and is currently disallowed. Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.",
          w(a)
        );
      }
      typeof c == "string" && l.d.D(c);
    }, ie.preinit = function(c, a) {
      if (typeof c == "string" && c ? a == null || typeof a != "object" ? console.error(
        "ReactDOM.preinit(): Expected the `options` argument (second) to be an object with an `as` property describing the type of resource to be preinitialized but encountered %s instead.",
        w(a)
      ) : a.as !== "style" && a.as !== "script" && console.error(
        'ReactDOM.preinit(): Expected the `as` property in the `options` argument (second) to contain a valid value describing the type of resource to be preinitialized but encountered %s instead. Valid values for `as` are "style" and "script".',
        w(a.as)
      ) : console.error(
        "ReactDOM.preinit(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
        m(c)
      ), typeof c == "string" && a && typeof a.as == "string") {
        var p = a.as, g = o(p, a.crossOrigin), d = typeof a.integrity == "string" ? a.integrity : void 0, _ = typeof a.fetchPriority == "string" ? a.fetchPriority : void 0;
        p === "style" ? l.d.S(
          c,
          typeof a.precedence == "string" ? a.precedence : void 0,
          {
            crossOrigin: g,
            integrity: d,
            fetchPriority: _
          }
        ) : p === "script" && l.d.X(c, {
          crossOrigin: g,
          integrity: d,
          fetchPriority: _,
          nonce: typeof a.nonce == "string" ? a.nonce : void 0
        });
      }
    }, ie.preinitModule = function(c, a) {
      var p = "";
      typeof c == "string" && c || (p += " The `href` argument encountered was " + m(c) + "."), a !== void 0 && typeof a != "object" ? p += " The `options` argument encountered was " + m(a) + "." : a && "as" in a && a.as !== "script" && (p += " The `as` option encountered was " + w(a.as) + "."), p ? console.error(
        "ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` string and, optionally, an `options` object with a valid `as` property.%s",
        p
      ) : (p = a && typeof a.as == "string" ? a.as : "script", p) === "script" || (p = w(p), console.error(
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
    }, ie.preload = function(c, a) {
      var p = "";
      if (typeof c == "string" && c || (p += " The `href` argument encountered was " + m(c) + "."), a == null || typeof a != "object" ? p += " The `options` argument encountered was " + m(a) + "." : typeof a.as == "string" && a.as || (p += " The `as` option encountered was " + m(a.as) + "."), p && console.error(
        'ReactDOM.preload(): Expected two arguments, a non-empty `href` string and an `options` object with an `as` property valid for a `<link rel="preload" as="..." />` tag.%s',
        p
      ), typeof c == "string" && typeof a == "object" && a !== null && typeof a.as == "string") {
        p = a.as;
        var g = o(
          p,
          a.crossOrigin
        );
        l.d.L(c, p, {
          crossOrigin: g,
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
    }, ie.preloadModule = function(c, a) {
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
    }, ie.requestFormReset = function(c) {
      l.d.r(c);
    }, ie.unstable_batchedUpdates = function(c, a) {
      return c(a);
    }, ie.useFormState = function(c, a, p) {
      return u().useFormState(c, a, p);
    }, ie.useFormStatus = function() {
      return u().useHostTransitionStatus();
    }, ie.version = "19.2.7", typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop == "function" && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
  })()), ie;
}
var Fe;
function Zn() {
  if (Fe) return ke.exports;
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
  return process.env.NODE_ENV === "production" ? (t(), ke.exports = Xn()) : ke.exports = Jn(), ke.exports;
}
var at = Zn();
function Qn(t) {
  if (t.width <= 0 || t.height <= 0) return !1;
  try {
    const n = t.getContext("2d", { willReadFrequently: !0 });
    if (!n) return !1;
    const r = [0, Math.floor(t.width / 2), t.width - 1], o = [0, Math.floor(t.height / 2), t.height - 1], m = r.flatMap((w) => o.map((u) => n.getImageData(w, u, 1, 1).data));
    if (m.every((w) => w[3] === 0)) return !1;
    for (let w = 0; w < 3; w += 1) {
      const u = m.map((M) => M[w]);
      if (Math.max(...u) - Math.min(...u) > 6) return !0;
    }
    return !1;
  } catch {
    return !1;
  }
}
function st({
  session: t,
  viewOnly: n,
  compact: r = !1,
  onReconnect: o,
  onDisconnect: m
}) {
  const w = G(null), u = G(m), [M, l] = N("connecting"), [s, k] = N();
  return q(() => {
    u.current = m;
  }, [m]), q(() => {
    if (!w.current) return;
    let c = !1, a = !1, p = !1, g = !1, d, _, x, O;
    (r ? w.current.closest(".computer-preview") : null)?.style.removeProperty("aspect-ratio"), l("connecting"), k(void 0);
    const K = () => {
      d && window.clearInterval(d), _ && window.clearTimeout(_), d = void 0, _ = void 0;
    }, v = () => {
      x && window.clearTimeout(x), x = void 0;
    }, P = () => {
      g || (g = !0, u.current?.());
    }, X = (j) => {
      c || a || (a = !0, v(), K(), k(j), l("disconnected"), P(), O?.disconnect());
    }, Z = () => {
      const j = w.current?.querySelector("canvas");
      return j ? Qn(j) : !1;
    }, B = () => {
      c || a || (v(), p = !0, d = window.setInterval(() => {
        !c && Z() && (K(), l("connected"));
      }, 100), _ = window.setTimeout(() => {
        Z() || X("This computer connected but never drew a frame.");
      }, 8e3));
    }, ce = (j) => {
      if (c || a) return;
      v(), K();
      const ee = j.detail?.clean;
      k((le) => le ?? (p && ee ? "This computer stopped before drawing a frame." : ee ? "This computer disconnected." : "The connection to this computer was lost.")), l("disconnected"), P();
    }, Q = (j) => {
      X(j.detail?.reason ?? "Screen security negotiation failed.");
    }, ne = () => X("This computer's screen is asking for a VNC password.");
    return x = window.setTimeout(() => X("This computer's screen did not answer."), 15e3), import("./chunk-rfb-DFY61DWN.js").then(({ default: j }) => {
      c || a || !w.current || (O = new j(w.current, t.url, { shared: !0, wsProtocols: t.protocols }), O.viewOnly = n, O.scaleViewport = !0, O.resizeSession = !1, r && (O.background = "transparent"), O.addEventListener("connect", B), O.addEventListener("disconnect", ce), O.addEventListener("securityfailure", Q), O.addEventListener("credentialsrequired", ne));
    }).catch(() => X("Could not load the screen client.")), () => {
      c = !0, v(), K(), O?.removeEventListener("connect", B), O?.removeEventListener("disconnect", ce), O?.removeEventListener("securityfailure", Q), O?.removeEventListener("credentialsrequired", ne), O?.disconnect();
    };
  }, [r, t, n]), /* @__PURE__ */ e.createElement("div", { className: `vnc-viewport ${r ? "is-compact" : ""}` }, /* @__PURE__ */ e.createElement("div", { ref: w, className: "vnc-target" }), M !== "connected" && /* @__PURE__ */ e.createElement("div", { className: "vnc-status", role: "status" }, M === "connecting" ? /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement(Le, { size: r ? 14 : 18, className: "spin" }), !r && "Connecting…") : /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("span", null, r ? "Screen unavailable" : s), o && /* @__PURE__ */ e.createElement("button", { className: "secondary-button", onClick: o }, "Reconnect"))));
}
function er({
  session: t,
  failure: n,
  title: r,
  onClose: o,
  onReconnect: m
}) {
  return at.createPortal(/* @__PURE__ */ e.createElement("div", { className: "vnc-desktop", role: "dialog", "aria-label": r }, /* @__PURE__ */ e.createElement("div", { className: "vnc-titlebar", "aria-hidden": "true" }), /* @__PURE__ */ e.createElement("button", { className: "vnc-close", "aria-label": "Close this screen", onClick: o }, /* @__PURE__ */ e.createElement(sn, { size: 18 })), t ? /* @__PURE__ */ e.createElement(st, { session: t, viewOnly: !1, onReconnect: m }) : /* @__PURE__ */ e.createElement("div", { className: "vnc-viewport" }, /* @__PURE__ */ e.createElement("div", { className: "vnc-status", role: "status" }, n ? /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("span", null, n), /* @__PURE__ */ e.createElement("button", { className: "secondary-button", onClick: m }, "Reconnect")) : /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement(Le, { size: 18, className: "spin" }), " Connecting…")))), document.body);
}
function tr({
  open: t,
  width: n,
  onResize: r,
  agentName: o,
  computer: m,
  approvals: w,
  routines: u,
  grants: M,
  grantsBusy: l,
  audit: s,
  auditLoading: k,
  auditView: c,
  auditHasMore: a,
  artifacts: p,
  artifactUrl: g,
  onApproval: d,
  onComputerAction: _,
  onDeleteRoutine: x,
  onSetGrant: O,
  onClearGrant: H,
  onChangeAuditView: K,
  onLoadMoreAudit: v,
  onClose: P
}) {
  const [X, Z] = N(""), [B, ce] = N(""), [Q, ne] = N(!1), [j, ee] = N(() => /* @__PURE__ */ new Map()), [le, me] = N(""), [pe, $] = N(() => /* @__PURE__ */ new Set()), [re, te] = N(), [z, ae] = N(!1), [se, W] = N(), R = w.filter((i) => i.status === "pending"), I = j.get(m?.id ?? ""), Y = pe.has(m?.id ?? ""), b = G(_);
  q(() => {
    b.current = _;
  }, [_]), q(() => {
    const i = m?.id;
    if (!t || z || m?.status !== "online" || !i || I || Y) return;
    let y = !0;
    return me(i), b.current("open").then((h) => {
      y && (ee((E) => new Map(E).set(i, h)), me(""));
    }).catch(() => {
      y && ($((h) => new Set(h).add(i)), me(""));
    }), () => {
      y = !1;
    };
  }, [m?.id, m?.status, z, t, Y, I]);
  async function C(i) {
    ae(!0), te(void 0), W(void 0), ne(!0);
    const y = m?.id;
    y && pe.has(y) && ($((h) => {
      const E = new Set(h);
      return E.delete(y), E;
    }), ee((h) => {
      const E = new Map(h);
      return E.delete(y), E;
    }));
    try {
      te(await _(i));
    } catch (h) {
      W(h instanceof Error ? h.message : "Could not reach that computer.");
    } finally {
      ne(!1);
    }
  }
  function D() {
    ae(!1), te(void 0), W(void 0);
  }
  const L = () => window.innerWidth <= 1030 ? Math.min(730, window.innerWidth - 40) : Math.min(730, window.innerWidth - (window.innerWidth <= 1180 ? 672 : 732));
  q(() => {
    const i = () => {
      const y = Math.max(280, L());
      n > y && r(y);
    };
    return i(), window.addEventListener("resize", i), () => window.removeEventListener("resize", i);
  }, [r, n]);
  const A = (i) => r(Math.max(280, Math.min(L(), window.innerWidth - i)));
  return /* @__PURE__ */ e.createElement("aside", { className: `detail-panel ${t ? "is-open" : "is-closing"}`, style: { width: n } }, /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "detail-resize-handle",
      role: "separator",
      "aria-label": "Resize the details panel",
      "aria-orientation": "vertical",
      "aria-valuemin": 280,
      "aria-valuemax": Math.max(280, L()),
      "aria-valuenow": n,
      tabIndex: 0,
      onKeyDown: (i) => {
        i.key === "ArrowLeft" ? (i.preventDefault(), r(Math.min(L(), n + 16))) : i.key === "ArrowRight" && (i.preventDefault(), r(Math.max(280, n - 16)));
      },
      onPointerDown: (i) => {
        i.currentTarget.setPointerCapture(i.pointerId), A(i.clientX);
      },
      onPointerMove: (i) => {
        i.currentTarget.hasPointerCapture(i.pointerId) && A(i.clientX);
      }
    }
  ), /* @__PURE__ */ e.createElement("header", null, /* @__PURE__ */ e.createElement("button", { className: "icon-button", "aria-label": "Close the details panel", onClick: P }, /* @__PURE__ */ e.createElement(Bt, { size: 18 }))), R.map((i) => /* @__PURE__ */ e.createElement("section", { className: "approval-card", key: i.id }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow warning" }, /* @__PURE__ */ e.createElement(et, { size: 14 }), " Waiting for you", i.source && i.source !== i.agentId && /* @__PURE__ */ e.createElement("span", { className: "approval-source" }, i.source), i.ref && /* @__PURE__ */ e.createElement("code", { className: "approval-ref", title: "Reply with this in the thread to decide without opening the panel" }, i.ref)), /* @__PURE__ */ e.createElement("h3", null, i.title), i.description && /* @__PURE__ */ e.createElement("p", null, i.description), i.scope.length > 0 && /* @__PURE__ */ e.createElement("div", { className: "scope" }, /* @__PURE__ */ e.createElement("span", null, "This allows:"), i.scope.map((y) => /* @__PURE__ */ e.createElement("div", { key: y }, /* @__PURE__ */ e.createElement(De, { size: 13 }), y))), /* @__PURE__ */ e.createElement(
    "textarea",
    {
      "aria-label": "Note for this decision",
      placeholder: "Add a note (optional)",
      value: X,
      onChange: (y) => Z(y.target.value)
    }
  ), /* @__PURE__ */ e.createElement("div", { className: "approval-actions" }, /* @__PURE__ */ e.createElement("button", { className: "secondary-button danger-text", onClick: () => {
    d(i.id, "deny", X, i.contentHash);
  } }, "Discard"), /* @__PURE__ */ e.createElement("button", { className: "primary-button", onClick: () => {
    d(i.id, "allow", X, i.contentHash);
  } }, "Approve")))), /* @__PURE__ */ e.createElement("section", { className: "screen-section" }, /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "screen-trigger",
      disabled: Q || m?.status !== "online",
      "aria-label": `Open ${o}'s screen`,
      onClick: () => {
        C("open");
      }
    },
    /* @__PURE__ */ e.createElement("span", { className: "computer-preview" }, [...j].map(([i, y]) => /* @__PURE__ */ e.createElement(
      "span",
      {
        className: `computer-preview-stream ${i === m?.id ? "is-active" : ""}`,
        key: i
      },
      /* @__PURE__ */ e.createElement(
        st,
        {
          session: y,
          viewOnly: !0,
          compact: !0,
          onDisconnect: () => $((h) => new Set(h).add(i))
        }
      )
    )), !j.has(m?.id ?? "") && (le === m?.id ? /* @__PURE__ */ e.createElement("span", { className: "computer-preview-loading", role: "status", "aria-label": `Loading ${o}'s screen` }, /* @__PURE__ */ e.createElement(Le, { size: 18, className: "spin" })) : pe.has(m?.id ?? "") ? /* @__PURE__ */ e.createElement("span", { className: "computer-preview-loading", role: "status" }, "Screen unavailable") : /* @__PURE__ */ e.createElement("span", { className: "computer-screen-off", "aria-hidden": "true" })), /* @__PURE__ */ e.createElement("span", { className: "screen-hover-action" }, /* @__PURE__ */ e.createElement(an, { size: 14 }), " Open"))
  ), /* @__PURE__ */ e.createElement("div", { className: "screen-caption" }, /* @__PURE__ */ e.createElement("span", null, o, "'s screen"), /* @__PURE__ */ e.createElement("span", { className: `screen-state ${m?.status ?? "offline"}` }, m?.status === "online" ? "Running" : m?.status === "starting" ? "Starting…" : "Off")), m && m.status !== "online" && /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "secondary-button",
      disabled: Q,
      onClick: () => {
        C("takeover");
      }
    },
    "Start this computer"
  ), m?.error && /* @__PURE__ */ e.createElement("p", { className: "screen-error" }, m.error)), u.length > 0 && /* @__PURE__ */ e.createElement("section", { className: "routines-section" }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow" }, "Routines"), u.map((i) => /* @__PURE__ */ e.createElement("div", { className: "routine-row", key: i.id }, /* @__PURE__ */ e.createElement("div", null, /* @__PURE__ */ e.createElement("strong", null, i.name), /* @__PURE__ */ e.createElement("span", null, i.schedule)), /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "icon-button",
      "aria-label": `Cancel the routine ${i.name}`,
      onClick: () => {
        x(i.id);
      }
    },
    /* @__PURE__ */ e.createElement(tt, { size: 14 })
  )))), /* @__PURE__ */ e.createElement("section", { className: "drawer-section" }, /* @__PURE__ */ e.createElement("div", { className: "drawer-tabs", role: "tablist", "aria-label": "More about this teammate" }, /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": B === "files",
      className: B === "files" ? "is-current" : "",
      onClick: () => ce((i) => i === "files" ? "" : "files")
    },
    "Files",
    p.length > 0 && /* @__PURE__ */ e.createElement("span", { className: "drawer-count" }, p.length)
  ), /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": B === "permissions",
      className: B === "permissions" ? "is-current" : "",
      onClick: () => ce((i) => i === "permissions" ? "" : "permissions")
    },
    "Permissions"
  ), /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": B === "audit",
      className: B === "audit" ? "is-current" : "",
      onClick: () => ce((i) => i === "audit" ? "" : "audit")
    },
    "History"
  )), B === "files" && /* @__PURE__ */ e.createElement(
    Wn,
    {
      agentName: o,
      artifacts: p,
      urlFor: g
    }
  ), B === "permissions" && /* @__PURE__ */ e.createElement(
    Kn,
    {
      agentName: o,
      grants: M,
      busy: l,
      onSetGrant: O,
      onClearGrant: H
    }
  ), B === "audit" && /* @__PURE__ */ e.createElement(
    jn,
    {
      events: s,
      loading: k,
      viewId: c,
      hasMore: a,
      onChangeView: K,
      onLoadMore: v
    }
  )), z && /* @__PURE__ */ e.createElement(
    er,
    {
      session: re,
      failure: se,
      title: `${o}'s computer`,
      onClose: D,
      onReconnect: () => {
        C("takeover");
      }
    }
  ));
}
function nr({
  value: t,
  options: n,
  ariaLabel: r,
  placeholder: o = "Select",
  onChange: m,
  onOpen: w
}) {
  const [u, M] = N(!1), [l, s] = N(), k = G(null), c = G(null), a = n.find((d) => d.value === t);
  q(() => {
    if (!u) return;
    const d = () => {
      const x = k.current?.getBoundingClientRect();
      if (!x) return;
      const O = 5, H = 8, K = Math.max(x.width, 180), v = Math.min(220, n.length * 32 + 10), P = window.innerHeight - x.bottom - H, X = P < v && x.top - H > P;
      s({
        position: "fixed",
        zIndex: 100,
        left: Math.max(H, Math.min(x.right - K, window.innerWidth - K - H)),
        top: X ? Math.max(H, x.top - v - O) : x.bottom + O,
        width: K,
        maxHeight: X ? Math.min(220, x.top - O - H) : Math.min(220, P)
      });
    }, _ = (x) => {
      const O = x.target;
      !k.current?.contains(O) && !c.current?.contains(O) && M(!1);
    };
    return d(), window.addEventListener("pointerdown", _), window.addEventListener("resize", d), window.addEventListener("scroll", d, !0), () => {
      window.removeEventListener("pointerdown", _), window.removeEventListener("resize", d), window.removeEventListener("scroll", d, !0);
    };
  }, [u, n.length]);
  const p = (d) => {
    const _ = n.filter((H) => !H.disabled && !H.action);
    if (!_.length) return;
    const x = _.findIndex((H) => H.value === t), O = x < 0 ? d > 0 ? 0 : _.length - 1 : (x + d + _.length) % _.length;
    m(_[O].value);
  }, g = () => M((d) => (d || w?.(), !d));
  return /* @__PURE__ */ e.createElement("div", { className: `crew-select ${u ? "open" : ""}`, ref: k }, /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "crew-select-trigger",
      "aria-label": r,
      "aria-haspopup": "listbox",
      "aria-expanded": u,
      onClick: g,
      onKeyDown: (d) => {
        if (d.key === "Escape") {
          M(!1);
          return;
        }
        (d.key === "ArrowDown" || d.key === "ArrowUp") && (d.preventDefault(), p(d.key === "ArrowDown" ? 1 : -1), u || w?.(), M(!0));
      }
    },
    /* @__PURE__ */ e.createElement("span", null, a?.label ?? o),
    /* @__PURE__ */ e.createElement("span", { className: "crew-select-chevron" }, /* @__PURE__ */ e.createElement(Vt, { size: 15 }))
  ), u && l && at.createPortal(
    /* @__PURE__ */ e.createElement(
      "div",
      {
        className: "crew-select-menu crew-select-menu-portal",
        ref: c,
        style: l,
        role: "listbox",
        "aria-label": r
      },
      n.map((d) => /* @__PURE__ */ e.createElement(
        "button",
        {
          type: "button",
          className: `${d.action ? "crew-select-action" : ""} ${d.action || d.icon ? "crew-select-has-icon" : ""}`,
          role: "option",
          "aria-selected": !d.action && d.value === t,
          disabled: d.disabled,
          key: d.value,
          onClick: () => {
            d.action?.(), d.action || m(d.value), M(!1);
          }
        },
        (d.action || d.icon) && /* @__PURE__ */ e.createElement("span", { className: "crew-select-check", "aria-hidden": "true" }, d.icon),
        /* @__PURE__ */ e.createElement("span", { className: "crew-select-label", title: d.label }, d.label),
        !d.action && /* @__PURE__ */ e.createElement("span", { className: "crew-select-check", "aria-hidden": "true" }, d.value === t && /* @__PURE__ */ e.createElement(De, { size: 14 }))
      ))
    ),
    document.body
  ));
}
const rr = ["🤖", "🔎", "📥", "📈", "🎖️", "🧭", "🛠️", "📚", "🧪", "✍️", "🗂️", "🛰️"];
function Ve({
  editing: t,
  providers: n,
  busy: r,
  error: o,
  onSubmit: m,
  onClose: w
}) {
  const [u, M] = N(t?.name ?? ""), [l, s] = N(t?.role ?? ""), [k, c] = N(t?.avatar || "🤖"), [a, p] = N("");
  q(() => {
    const d = (_) => {
      _.key === "Escape" && w();
    };
    return window.addEventListener("keydown", d), () => window.removeEventListener("keydown", d);
  }, [w]);
  const g = !!u.trim() && !r;
  return /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "palette-backdrop",
      role: "presentation",
      onMouseDown: (d) => {
        d.target === d.currentTarget && w();
      }
    },
    /* @__PURE__ */ e.createElement(
      "form",
      {
        className: "crew-dialog",
        role: "dialog",
        "aria-modal": "true",
        "aria-label": t ? `Edit ${t.name}` : "Hire a teammate",
        onSubmit: (d) => {
          d.preventDefault(), g && m({ name: u.trim(), role: l.trim(), emoji: k, modelProviderId: a });
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
          onChange: (d) => M(d.target.value)
        }
      ), t && /* @__PURE__ */ e.createElement("small", null, "A teammate's name is its profile directory, so it cannot be changed here.")),
      /* @__PURE__ */ e.createElement("label", { className: "crew-field" }, /* @__PURE__ */ e.createElement("span", null, "Their job, in one line"), /* @__PURE__ */ e.createElement(
        "input",
        {
          autoFocus: !!t,
          value: l,
          placeholder: "Turns a one-line question into a decision-ready brief with sources",
          onChange: (d) => s(d.target.value)
        }
      )),
      /* @__PURE__ */ e.createElement("div", { className: "crew-field" }, /* @__PURE__ */ e.createElement("span", null, "Face"), /* @__PURE__ */ e.createElement("div", { className: "crew-emoji-row" }, rr.map((d) => /* @__PURE__ */ e.createElement(
        "button",
        {
          type: "button",
          key: d,
          className: `crew-emoji ${d === k ? "selected" : ""}`,
          "aria-label": `Use ${d}`,
          "aria-pressed": d === k,
          onClick: () => c(d)
        },
        d
      )))),
      !t && n.length > 0 && /* @__PURE__ */ e.createElement("div", { className: "crew-field" }, /* @__PURE__ */ e.createElement("span", null, "Model"), /* @__PURE__ */ e.createElement(
        nr,
        {
          ariaLabel: "Model provider",
          placeholder: "Same as your default profile",
          value: a,
          options: [
            // Cloning the default profile is what gives a new teammate working
            // credentials immediately, so it is the option that needs no
            // explanation and therefore the one that comes first.
            { value: "", label: "Same as your default profile" },
            ...n.map((d) => ({
              value: d.id,
              label: d.defaultModel ? `${d.name} · ${d.defaultModel}` : d.name
            }))
          ],
          onChange: p
        }
      )),
      o && /* @__PURE__ */ e.createElement("p", { className: "crew-dialog-error" }, o),
      /* @__PURE__ */ e.createElement("div", { className: "crew-dialog-actions" }, /* @__PURE__ */ e.createElement("button", { type: "button", className: "secondary-button", onClick: w }, "Cancel"), /* @__PURE__ */ e.createElement("button", { className: "primary-button", disabled: !g }, r ? "Working…" : t ? "Save" : "Hire"))
    )
  );
}
const ot = "hermes-crew:detail-width";
function ar() {
  try {
    const t = window.localStorage?.getItem(ot), n = t ? Number.parseInt(t, 10) : Number.NaN;
    return Number.isFinite(n) ? Math.max(280, n) : 360;
  } catch {
    return 360;
  }
}
function sr({ client: t, notify: n }) {
  const r = $t(t, { notify: n }), [o, m] = N(""), [w, u] = N([]), [M, l] = N([]), [s, k] = N([]), [c, a] = N(!1), [p, g] = N([]), [d, _] = N(!1), [x, O] = N({ id: "all", types: [] }), [H, K] = N(null), [v, P] = N([]), [X, Z] = N(!1), [B, ce] = N(ar), [Q, ne] = N(!1), [j, ee] = N(), [le, me] = N(!1), [pe, $] = N(), [re, te] = N(0), { agents: z, conversations: ae, selectedAgent: se, selectedAgentId: W, selectedThreadId: R } = r, I = fe(() => ae.filter((f) => f.kind === "group"), [ae]), Y = fe(() => new Map(z.map((f) => [f.id, f])), [z]), b = fe(
    () => ae.find((f) => f.id === R),
    [ae, R]
  ), C = r.approvals.filter((f) => f.status === "pending").length;
  q(() => {
    try {
      window.localStorage?.setItem(ot, String(B));
    } catch {
    }
  }, [B]);
  const D = ye(() => {
    t.listSections().then(u).catch(() => u([]));
  }, [t]);
  q(D, [D, z.length]), q(() => {
    if (!W) {
      l([]);
      return;
    }
    let f = !0;
    return t.listRoutines(W).then((S) => {
      f && l(S);
    }).catch(() => {
      f && l([]);
    }), () => {
      f = !1;
    };
  }, [t, W]), q(() => {
    if (!W) {
      k([]);
      return;
    }
    let f = !0;
    return t.listGrants(W).then((S) => {
      f && k(S);
    }).catch(() => {
      f && k([]);
    }), () => {
      f = !1;
    };
  }, [t, W]);
  const L = ye(() => {
    if (!W) {
      P([]);
      return;
    }
    t.listArtifacts(W).then(P).catch(() => P([]));
  }, [t, W]);
  q(L, [L]);
  const A = se?.status;
  q(() => {
    A !== "working" && L();
  }, [A, L]);
  const i = ye((f, S) => {
    if (!W) {
      g([]), K(null);
      return;
    }
    _(!0), t.listAuditEvents({
      agentId: W,
      eventTypes: f,
      beforeId: S,
      limit: 50
    }).then((F) => {
      g((V) => S ? [...V, ...F.events] : F.events), K(F.nextBeforeId);
    }).catch(() => {
      S || (g([]), K(null));
    }).finally(() => _(!1));
  }, [t, W]);
  q(() => {
    i(x.types);
  }, [i, x]), q(() => {
    C > 0 && Z(!0);
  }, [C]), q(() => {
    const f = (S) => {
      (S.metaKey || S.ctrlKey) && S.key.toLowerCase() === "k" && (S.preventDefault(), ne((F) => !F));
    };
    return window.addEventListener("keydown", f), () => window.removeEventListener("keydown", f);
  }, []);
  const y = (f, S) => {
    const F = w.map((V) => V.id === f ? { ...V, collapsed: S } : V);
    u(F), t.saveSections(F).then(u).catch(D);
  }, h = (f, S) => {
    if (S === "edit") {
      $(void 0), ee({ editing: f });
      return;
    }
    if (S === "duplicate") {
      r.duplicateAgent(f.id).catch(() => {
      });
      return;
    }
    window.confirm(`Remove ${f.name} from the crew? Their profile, memory and skills stay on disk.`) && r.deleteAgent(f.id).catch(() => {
    });
  }, E = async (f) => {
    me(!0), $(void 0);
    try {
      j?.editing ? await r.updateAgent(j.editing.id, { role: f.role, emoji: f.emoji }) : await r.createAgent({
        name: f.name,
        role: f.role,
        emoji: f.emoji,
        modelProviderId: f.modelProviderId || void 0
      }), ee(void 0), D();
    } catch (S) {
      $(S instanceof Error ? S.message : "That did not work.");
    } finally {
      me(!1);
    }
  }, U = fe(() => ({
    onDecide: (f, S) => {
      r.respondToApproval(f, S).catch(() => {
      });
    },
    // A login request is the one chip that is an instruction to the operator,
    // so its button does the thing rather than pointing at where the thing is.
    onOpenScreen: () => {
      Z(!0), r.openComputer("takeover").catch(() => {
      });
    },
    screenshotUrl: (f, S) => t.screenshotUrl(f, S)
  }), [t, r]);
  return r.loading ? /* @__PURE__ */ e.createElement("div", { className: "crew-workspace is-loading", role: "status" }, "Loading your crew…") : z.length ? /* @__PURE__ */ e.createElement("div", { className: "crew-workspace" }, /* @__PURE__ */ e.createElement(
    yn,
    {
      agents: z,
      sections: w,
      rooms: I,
      selectedAgentId: W,
      selectedThreadId: R,
      search: o,
      onSearch: m,
      onSelectAgent: (f) => {
        r.setSelectedAgentId(f), te((S) => S + 1);
      },
      onSelectThread: (f) => {
        r.setSelectedThreadId(f), te((S) => S + 1);
      },
      onAction: h,
      onCreate: () => {
        $(void 0), ee({});
      },
      onToggleSection: y
    }
  ), /* @__PURE__ */ e.createElement(
    Pn,
    {
      agent: se,
      thread: b,
      agentsById: Y,
      messages: r.messages,
      activities: r.activities,
      chips: U,
      loading: r.conversationLoading,
      focusRequest: re,
      onSend: (f) => r.sendMessage(f).catch(() => {
      }),
      onToggleDetails: () => Z((f) => !f)
    }
  ), X && se && /* @__PURE__ */ e.createElement(
    tr,
    {
      open: X,
      width: B,
      onResize: ce,
      agentName: se.name,
      computer: r.computer,
      approvals: r.approvals,
      routines: M,
      grants: s,
      grantsBusy: c,
      audit: p,
      auditLoading: d,
      auditView: x.id,
      auditHasMore: H !== null,
      artifacts: v,
      artifactUrl: (f) => t.artifactUrl(f),
      onApproval: (f, S, F, V) => r.respondToApproval(f, S, F, V),
      onComputerAction: (f) => r.openComputer(f),
      onDeleteRoutine: async (f) => {
        await t.deleteRoutine(se.id, f), l((S) => S.filter((F) => F.id !== f));
      },
      onSetGrant: async (f, S) => {
        a(!0);
        try {
          const F = await t.setGrant({ agentId: se.id, tool: f, mode: S });
          k((V) => V.map((de) => de.tool === f ? { ...de, ...F } : de));
        } finally {
          a(!1);
        }
      },
      onClearGrant: async (f) => {
        a(!0);
        try {
          const S = await t.clearGrant(se.id, f);
          k((F) => F.map((V) => V.tool === f ? { ...V, ...S } : V));
        } finally {
          a(!1);
        }
      },
      onChangeAuditView: (f, S) => O({ id: f, types: S }),
      onLoadMoreAudit: () => {
        H !== null && i(x.types, H);
      },
      onClose: () => Z(!1)
    }
  ), /* @__PURE__ */ e.createElement(
    vn,
    {
      open: Q,
      agents: z,
      rooms: I,
      onClose: () => ne(!1),
      onSelectAgent: r.setSelectedAgentId,
      onSelectThread: r.setSelectedThreadId,
      onCreateAgent: () => {
        $(void 0), ee({});
      },
      onComputer: () => Z(!0)
    }
  ), j && /* @__PURE__ */ e.createElement(
    Ve,
    {
      editing: j.editing,
      providers: r.modelProviders,
      busy: le,
      error: pe,
      onSubmit: E,
      onClose: () => ee(void 0)
    }
  ), r.error && /* @__PURE__ */ e.createElement("div", { className: "crew-toast", role: "alert" }, /* @__PURE__ */ e.createElement("span", null, r.error), /* @__PURE__ */ e.createElement("button", { className: "icon-button", "aria-label": "Dismiss", onClick: r.dismissError }, "×"))) : /* @__PURE__ */ e.createElement("div", { className: "crew-workspace is-empty" }, /* @__PURE__ */ e.createElement("div", { className: "crew-empty-card" }, /* @__PURE__ */ e.createElement("h2", null, "No teammates yet"), /* @__PURE__ */ e.createElement("p", null, "A teammate is a Hermes profile with a thread, a memory and a computer of its own. Give one a name and a one-line job to start."), /* @__PURE__ */ e.createElement("button", { className: "primary-button", onClick: () => {
    $(void 0), ee({});
  } }, "Hire your first teammate")), j && /* @__PURE__ */ e.createElement(
    Ve,
    {
      providers: r.modelProviders,
      busy: le,
      error: pe,
      onSubmit: E,
      onClose: () => ee(void 0)
    }
  ));
}
const Ce = 500, or = 15e3;
function ir(t, n) {
  return t === 401 || t === 403 ? new ge("unauthorized", n) : t === 404 ? new ge("not_found", n) : t === 409 ? new ge("conflict", n) : new ge("unknown", n, t >= 500);
}
function cr(t) {
  const n = new URL(t, globalThis.location?.href ?? "http://127.0.0.1");
  return n.protocol = n.protocol === "https:" ? "wss:" : "ws:", n.pathname = `${n.pathname.replace(/\/+$/, "")}/v1/events`, n.toString();
}
class lr {
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
    const r = n.eventsUrl ?? cr(this.baseUrl);
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
      const m = await o.json().then((w) => w?.detail).catch(() => {
      });
      throw ir(o.status, m ?? `Crew request failed (${o.status})`);
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
      this.reconnectDelay = Ce, this.emit({ type: "connection.changed", state: "connected" });
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
      this.reconnectTimer = void 0, this.reconnectDelay = Math.min(this.reconnectDelay * 2, or), this.openSocket();
    }, this.reconnectDelay));
  }
  closeSocket() {
    this.reconnectTimer && (clearTimeout(this.reconnectTimer), this.reconnectTimer = void 0), this.opening = !1;
    const n = this.socket;
    this.socket = void 0, n && (n.onclose = null, n.onerror = null, n.close());
  }
}
const Be = "/api/plugins/hermes-crew", We = window.__HERMES_PLUGIN_SDK__, dr = new lr({
  baseUrl: Be,
  // The SDK's authed fetch, not the global one. Its own contract says plugins
  // must not hand-read the session token, and this is what keeps loopback,
  // gated-OAuth and server-internal modes all working from one bundle.
  fetchImpl: (t, n) => We.authedFetch(t, n),
  // A resolver, not a string: in gated mode `buildWsUrl` mints a single-use
  // ticket, so the URL has to be rebuilt for every connect and reconnect.
  eventsUrl: () => We.buildWsUrl(`${Be}/v1/events`)
});
function ur(t) {
  try {
    if (typeof Notification > "u" || Notification.permission !== "granted" || document.visibilityState === "visible") return;
    new Notification(t.title, { body: t.body });
  } catch {
  }
}
function pr() {
  return /* @__PURE__ */ e.createElement(sr, { client: dr, notify: ur });
}
export {
  pr as C,
  e as R,
  xe as S,
  N as a,
  q as b,
  Mt as c,
  fe as d,
  G as e,
  Ie as f,
  mr as g,
  Se as h,
  vt as i,
  ht as j,
  gt as k,
  ye as l,
  wt as m,
  Re as n,
  at as r,
  St as u
};

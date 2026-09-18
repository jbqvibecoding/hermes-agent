const at = globalThis.__HERMES_PLUGIN_SDK__, e = at?.React;
if (!e)
  throw new Error(
    "hermes-crew: the dashboard plugin SDK is not on the page, so there is no React to borrow."
  );
const {
  Children: st,
  Fragment: ot,
  Profiler: it,
  StrictMode: ct,
  Suspense: _e,
  cloneElement: lt,
  createContext: dt,
  createElement: ke,
  createRef: ut,
  forwardRef: Oe,
  isValidElement: mt,
  lazy: Re,
  memo: pt,
  startTransition: ft,
  use: ht,
  useActionState: gt,
  useCallback: Se,
  useContext: yt,
  useDebugValue: vt,
  useDeferredValue: wt,
  useEffect: q,
  useId: Et,
  useImperativeHandle: bt,
  useInsertionEffect: kt,
  useLayoutEffect: Ae,
  useMemo: fe,
  useOptimistic: St,
  useReducer: Nt,
  useRef: W,
  useState: N,
  useSyncExternalStore: Ct,
  useTransition: Mt,
  version: Tt
} = e, _t = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Children: st,
  Fragment: ot,
  Profiler: it,
  StrictMode: ct,
  Suspense: _e,
  cloneElement: lt,
  createContext: dt,
  createElement: ke,
  createRef: ut,
  default: e,
  forwardRef: Oe,
  isValidElement: mt,
  lazy: Re,
  memo: pt,
  startTransition: ft,
  use: ht,
  useActionState: gt,
  useCallback: Se,
  useContext: yt,
  useDebugValue: vt,
  useDeferredValue: wt,
  useEffect: q,
  useId: Et,
  useImperativeHandle: bt,
  useInsertionEffect: kt,
  useLayoutEffect: Ae,
  useMemo: fe,
  useOptimistic: St,
  useReducer: Nt,
  useRef: W,
  useState: N,
  useSyncExternalStore: Ct,
  useTransition: Mt,
  version: Tt
}, Symbol.toStringTag, { value: "Module" }));
class ge extends Error {
  constructor(r, n, i = !1) {
    super(n), this.code = r, this.retryable = i, this.name = "CrewError";
  }
  code;
  retryable;
}
function Fe(t) {
  return !t || t.role !== "agent" ? "" : t.parts.filter((r) => r.type === "text").map((r) => r.text).join("").trim();
}
function Ee(t) {
  return Fe(
    [...t].reverse().find((r) => r.role === "agent" && !r.streaming)
  );
}
function xe(t) {
  return t.parts.filter((r) => r.type === "text").map((r) => r.text).join("");
}
const Pe = 6e4, Ot = 3e4, Ne = "optimistic-user:", ve = "optimistic-agent:";
function Rt(t, r = {}) {
  const { enabled: n = !0, notify: i } = r, [u, v] = N([]), [d, M] = N(""), [c, s] = N(""), [b, o] = N([]), [a, p] = N([]), [y, l] = N([]), [T, R] = N([]), [O, x] = N(), [j, f] = N("connecting"), [D, V] = N([]), [Z, Y] = N(n), [ee, X] = N(), [te, B] = N(() => /* @__PURE__ */ new Set()), [ce, ne] = N(""), [ue, me] = N(0), H = W(/* @__PURE__ */ new Map()), k = W(d), P = W(/* @__PURE__ */ new Set()), m = W(/* @__PURE__ */ new Map()), _ = W(i), oe = fe(
    () => u.find((E) => E.id === d),
    [u, d]
  ), le = c || (d ? `dm:${d}` : ""), L = !!(d && !te.has(d));
  q(() => {
    k.current = d;
  }, [d]), q(() => {
    _.current = i;
  }, [i]);
  const $ = Se(async (E = !1) => {
    const C = await t.listAgents();
    for (const g of P.current)
      C.some((S) => S.id === g) || P.current.delete(g);
    const U = C.filter((g) => !P.current.has(g.id)), F = k.current, I = U.find((g) => g.id === F), h = H.current.get(F);
    I?.lastMessagePreview && h && !h.messages.some((g) => g.streaming) && Ee(h.messages) !== I.lastMessagePreview && (H.current.set(F, { ...h, cachedAt: 0 }), me((S) => S + 1));
    const w = !!h?.messages.some((g) => g.streaming);
    return v((g) => U.map((S) => {
      const z = g.find((ie) => ie.id === S.id), A = Ee(H.current.get(S.id)?.messages ?? []), K = !!A || S.id === F && w;
      return {
        ...S,
        lastMessagePreview: K ? A || z?.lastMessagePreview : S.lastMessagePreview ?? z?.lastMessagePreview
      };
    })), M((g) => g && U.some((S) => S.id === g) || E ? g : U[0]?.id || ""), U;
  }, [t]), Q = Se(async () => {
    const E = await t.listModelProviders();
    return V(E.providers), E.providers;
  }, [t]);
  return q(() => {
    if (!n) {
      v([]), V([]), M(""), s(""), p([]), l([]), R([]), x(void 0), f("disconnected"), Y(!1), X(void 0);
      return;
    }
    let E = !0;
    return Y(!0), Promise.all([$(), Q()]).then(() => {
      E && (f("connected"), Y(!1));
    }).catch((C) => {
      E && (f("error"), X(C instanceof Error ? C.message : "Could not load the crew"), Y(!1));
    }), () => {
      E = !1;
    };
  }, [n, $, Q]), q(() => {
    if (!n) return;
    const E = () => {
      document.visibilityState === "hidden" || !navigator.onLine || $().catch(() => {
      });
    }, C = () => {
      document.visibilityState === "visible" && E();
    }, U = window.setInterval(E, Ot);
    return window.addEventListener("focus", E), window.addEventListener("online", E), document.addEventListener("visibilitychange", C), () => {
      window.clearInterval(U), window.removeEventListener("focus", E), window.removeEventListener("online", E), document.removeEventListener("visibilitychange", C);
    };
  }, [n, $]), q(() => {
    s("");
  }, [d]), q(() => {
    if (!n) return;
    const E = H.current.get(d);
    if (E ? (p(E.messages), l(E.activities), R(E.approvals), x(E.computer), o(E.conversations)) : (p([]), l([]), R([]), x(void 0), o([])), ne(""), !d) return;
    const C = E ? Date.now() - E.cachedAt : Number.POSITIVE_INFINITY;
    if (E && C < Pe && !c) {
      E.messages.some((h) => h.streaming) && ne(d);
      const I = window.setTimeout(() => me((h) => h + 1), Pe - C);
      return () => window.clearTimeout(I);
    }
    const U = new AbortController();
    let F = !0;
    return Promise.all([
      t.listConversations(d, U.signal),
      t.listApprovalRequests(d, U.signal),
      t.getComputer(d, U.signal)
    ]).then(async ([I, h, w]) => {
      const g = c ? I.find((J) => J.id === c) ?? I[0] : I[0], S = g ? await t.getConversation(g.id, U.signal) : void 0;
      if (!F || P.current.has(d)) return;
      const z = H.current.get(d)?.messages ?? [], A = (S?.messages ?? []).map((J) => {
        const de = m.current.get(J.id);
        return de ? { ...J, id: de } : J;
      }), K = z.filter(
        (J) => J.id.startsWith(Ne) || J.id.startsWith(ve)
      ), ie = [
        ...A,
        ...K.filter((J) => !A.some((de) => de.id === J.id))
      ], re = Ee(ie), pe = S?.activities ?? [];
      H.current.set(d, {
        messages: ie,
        activities: pe,
        approvals: h,
        conversations: I,
        computer: w,
        cachedAt: Date.now()
      }), B((J) => new Set(J).add(d)), p(ie), l(pe), R(h), x(w), o(I), ne(d), re && v((J) => J.map((de) => de.id === d ? { ...de, lastMessagePreview: re } : de));
    }).catch((I) => {
      !F || P.current.has(d) || I instanceof DOMException && I.name === "AbortError" || (H.current.set(d, {
        messages: [],
        activities: [],
        approvals: [],
        conversations: [],
        cachedAt: Date.now()
      }), B((h) => new Set(h).add(d)), p([]), X(I instanceof Error ? I.message : "Could not load this teammate"));
    }), () => {
      F = !1, U.abort();
    };
  }, [t, n, ue, d, c]), q(() => {
    if (!n || !d || O?.status === "online") return;
    let E = !0;
    const C = async () => {
      try {
        const F = await t.getComputer(d);
        if (!E || k.current !== d) return;
        x(F);
        const I = H.current.get(d);
        I && H.current.set(d, { ...I, computer: F });
      } catch {
      }
    }, U = window.setInterval(() => {
      C();
    }, 2e3);
    return C(), () => {
      E = !1, window.clearInterval(U);
    };
  }, [t, O?.status, n, d]), q(() => {
    if (!n || !le || ce !== d) return;
    let E = !0;
    const C = d, U = (h) => {
      const w = H.current.get(C);
      H.current.set(C, {
        messages: w?.messages ?? [],
        activities: w?.activities ?? [],
        approvals: w?.approvals ?? [],
        conversations: w?.conversations ?? [],
        computer: w?.computer,
        cachedAt: Date.now(),
        ...h
      });
    }, F = (h) => p((w) => {
      const g = h(w);
      return U({ messages: g }), g;
    }), I = t.subscribeToConversationEvents(le, (h) => {
      if (E) {
        if (h.type === "message.created" && F((w) => {
          let g = h.message;
          const S = m.current.get(h.message.id);
          if (S && (g = { ...h.message, id: S }), h.message.role === "user" && !S) {
            const A = new Set(m.current.values()), K = w.find((ie) => ie.id.startsWith(Ne) && !A.has(ie.id) && xe(ie) === xe(h.message));
            K && (m.current.set(h.message.id, K.id), g = { ...h.message, id: K.id });
          }
          if (h.message.role === "agent" && !S) {
            const A = new Set(m.current.values()), K = w.find((ie) => ie.id.startsWith(ve) && !A.has(ie.id));
            K && (m.current.set(h.message.id, K.id), g = { ...h.message, id: K.id });
          }
          return w.find((A) => A.id === g.id) ? w.map((A) => A.id === g.id ? g : A) : [...w, g];
        }), h.type === "message.delta" && F((w) => {
          let g = m.current.get(h.messageId);
          if (!g) {
            const S = new Set(m.current.values()), z = w.find((A) => A.id.startsWith(ve) && !S.has(A.id));
            z && (g = z.id, m.current.set(h.messageId, g));
          }
          return g ??= h.messageId, w.some((S) => S.id === g) ? w.map((S) => S.id === g ? {
            ...S,
            parts: S.parts.map((z, A) => A === 0 && z.type === "text" ? { ...z, text: z.text + h.delta } : z)
          } : S) : [...w, {
            id: g,
            conversationId: le,
            role: "agent",
            parts: [{ type: "text", text: h.delta }],
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            streaming: !0
          }];
        }), h.type === "message.completed") {
          const w = m.current.get(h.messageId) ?? h.messageId;
          h.notify === !1 ? F((g) => g.flatMap((S) => S.id !== w ? [S] : S.id.startsWith(ve) ? [{
            ...S,
            parts: S.parts.map((z) => z.type === "text" ? { ...z, text: "" } : z),
            streaming: !0
          }] : [])) : (F((g) => {
            const S = g.filter((A) => A.id === w || A.role !== "agent" || !A.streaming).map((A) => A.id === w ? { ...A, streaming: !1 } : A), z = Ee(S);
            return z && v((A) => A.map((K) => K.id === C ? { ...K, lastMessagePreview: z } : K)), S;
          }), _.current?.({
            title: `${oe?.name ?? "Your teammate"} finished`,
            body: "There is something new to read."
          }));
        }
        if (h.type === "message.dropped") {
          const w = m.current.get(h.messageId) ?? h.messageId;
          F((g) => g.filter((S) => S.id !== w));
        }
        h.type === "message.updated" && (F((w) => {
          const g = m.current.get(h.message.id), S = g ? { ...h.message, id: g } : h.message, z = w.find((K) => K.id === S.id), A = h.message.role === "agent" && !h.message.streaming ? w.filter((K) => K.id === S.id || K.role !== "agent" || !K.streaming) : w;
          return z ? A.map((K) => K.id === S.id ? S : K) : [...A, S];
        }), h.message.role === "agent" && !h.message.streaming && v((w) => w.map((g) => g.id === C ? { ...g, lastMessagePreview: Fe(h.message) || void 0 } : g))), h.type === "approval.updated" && (R((w) => {
          const g = w.some((S) => S.id === h.approval.id) ? w.map((S) => S.id === h.approval.id ? h.approval : S) : [h.approval, ...w];
          return U({ approvals: g }), g;
        }), h.approval.status === "pending" && _.current?.({
          title: `${oe?.name ?? "Your teammate"} needs you`,
          body: h.approval.title
        })), h.type === "activity.updated" && l((w) => {
          const g = w.some((S) => S.id === h.activity.id) ? w.map((S) => S.id === h.activity.id ? h.activity : S) : [...w, h.activity];
          return U({ activities: g }), g;
        }), h.type === "agent.status" && v((w) => w.map((g) => g.id === h.agentId ? { ...g, status: h.status } : g)), h.type === "connection.changed" && f(h.state);
      }
    });
    return () => {
      E = !1, I.unsubscribe();
    };
  }, [t, le, n, ce, oe?.name, d]), {
    agents: u,
    conversations: b,
    modelProviders: D,
    selectedAgent: oe,
    selectedAgentId: d,
    setSelectedAgentId: M,
    selectedThreadId: le,
    setSelectedThreadId: s,
    messages: a,
    activities: y,
    approvals: T,
    computer: O,
    connection: j,
    loading: Z,
    conversationLoading: L,
    error: ee,
    refreshAgents: $,
    refreshModelProviders: Q,
    dismissError: () => X(void 0),
    createAgent: async (E) => {
      const C = await t.createAgent(E);
      return await $(!0), M(C.id), C;
    },
    updateAgent: async (E, C) => {
      await t.updateAgent(E, C), await $(!0);
    },
    duplicateAgent: async (E) => {
      const C = await t.duplicateAgent(E);
      await $(!0), M(C.id);
    },
    deleteAgent: async (E) => {
      const C = u.find((w) => w.id === E), U = d;
      if (!C || P.current.has(E)) return;
      const F = u.findIndex((w) => w.id === E), I = u.filter((w) => w.id !== E), h = U === E ? I[Math.min(Math.max(F, 0), Math.max(I.length - 1, 0))]?.id ?? "" : U;
      P.current.add(E), v(I), M(h);
      try {
        try {
          await t.deleteAgent(E);
        } catch (w) {
          if (!(w instanceof ge && w.code === "not_found")) throw w;
        }
        H.current.delete(E), B((w) => {
          const g = new Set(w);
          return g.delete(E), g;
        }), await $();
      } catch (w) {
        throw P.current.delete(E), v((g) => {
          if (g.some((z) => z.id === E)) return g;
          const S = [...g];
          return S.splice(Math.min(F, S.length), 0, C), S;
        }), M((g) => g || (U === E ? E : g)), X(w instanceof Error ? w.message : "Could not remove this teammate"), w;
      }
    },
    sendMessage: async (E) => {
      if (!le || !d) return;
      const C = d, U = le, F = `${Date.now()}:${Math.random().toString(36).slice(2)}`, I = `${Ne}${F}`, h = `${ve}${F}`, w = (/* @__PURE__ */ new Date()).toISOString(), g = {
        id: I,
        conversationId: U,
        role: "user",
        parts: [{ type: "text", text: E }],
        createdAt: w
      }, S = {
        id: h,
        conversationId: U,
        role: "agent",
        parts: [{ type: "text", text: "" }],
        createdAt: w,
        streaming: !0
      }, z = H.current.get(C) ?? {
        messages: [],
        activities: [],
        approvals: [],
        conversations: [],
        cachedAt: Date.now()
      }, A = [...z.messages].reverse().find((re) => re.role === "agent" && re.streaming), ie = [...A ? z.messages.map((re) => re.id === A.id ? { ...re, streaming: !1, interrupted: !0 } : re) : z.messages, g, S];
      k.current === C && l([]), H.current.set(C, { ...z, messages: ie, activities: [], cachedAt: Date.now() }), k.current === C && (p(ie), ne(C));
      try {
        const re = await t.sendMessage({ conversationId: U, text: E });
        m.current.set(re.id, I);
        const pe = re.id.match(/^(.+):user(?:$|:)/)?.[1];
        pe && (m.current.set(`${pe}:user`, I), m.current.set(`${pe}:agent`, A?.id ?? h));
        const J = H.current.get(C) ?? z, de = { ...re, id: I }, he = J.messages.map((we) => we.id === I ? de : we).filter((we, tt, rt) => rt.findIndex((nt) => nt.id === we.id) === tt);
        H.current.set(C, { ...J, messages: he, cachedAt: Date.now() }), k.current === C && p(he);
      } catch (re) {
        const pe = H.current.get(C) ?? z, J = pe.messages.filter((he) => he.id !== h), de = J.some((he) => he.id === I) ? J : [...J, g];
        throw H.current.set(C, { ...pe, messages: de, cachedAt: Date.now() }), k.current === C && p(de), A || X(re instanceof Error ? re.message : "Could not send that"), re;
      }
    },
    respondToApproval: async (E, C, U) => {
      const F = d, I = await t.respondToApproval({ requestId: E, decision: C, note: U }), h = H.current.get(F), w = (h?.approvals ?? []).map((g) => g.id === I.id ? I : g);
      h && H.current.set(F, { ...h, approvals: w, cachedAt: Date.now() }), k.current === F && R(w);
    },
    openComputer: async (E) => {
      if (!d) throw new Error("No teammate is selected");
      try {
        return await (E === "open" ? t.openComputer(d) : t.takeOverComputer(d));
      } catch (C) {
        throw X(C instanceof Error ? C.message : "Could not open that computer"), C;
      }
    },
    reconnect: async () => {
      f("connecting");
      try {
        await t.reconnect(), await $(), f("connected");
      } catch (E) {
        f("error"), X(E instanceof Error ? E.message : "Reconnect failed");
      }
    }
  };
}
const At = (t) => t.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), Be = (...t) => t.filter((r, n, i) => !!r && r.trim() !== "" && i.indexOf(r) === n).join(" ").trim();
var Dt = {
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
const It = Oe(
  ({
    color: t = "currentColor",
    size: r = 24,
    strokeWidth: n = 2,
    absoluteStrokeWidth: i,
    className: u = "",
    children: v,
    iconNode: d,
    ...M
  }, c) => ke(
    "svg",
    {
      ref: c,
      ...Dt,
      width: r,
      height: r,
      stroke: t,
      strokeWidth: i ? Number(n) * 24 / Number(r) : n,
      className: Be("lucide", u),
      ...M
    },
    [
      ...d.map(([s, b]) => ke(s, b)),
      ...Array.isArray(v) ? v : [v]
    ]
  )
);
const G = (t, r) => {
  const n = Oe(
    ({ className: i, ...u }, v) => ke(It, {
      ref: v,
      iconNode: r,
      className: Be(`lucide-${At(t)}`, i),
      ...u
    })
  );
  return n.displayName = `${t}`, n;
};
const xt = G("ArrowDown", [
  ["path", { d: "M12 5v14", key: "s699le" }],
  ["path", { d: "m19 12-7 7-7-7", key: "1idqje" }]
]);
const Pt = G("Bot", [
  ["path", { d: "M12 8V4H8", key: "hb8ula" }],
  ["rect", { width: "16", height: "12", x: "4", y: "8", rx: "2", key: "enze0r" }],
  ["path", { d: "M2 14h2", key: "vft8re" }],
  ["path", { d: "M20 14h2", key: "4cs60a" }],
  ["path", { d: "M15 13v2", key: "1xurst" }],
  ["path", { d: "M9 13v2", key: "rq6x2g" }]
]);
const De = G("Check", [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]]);
const Lt = G("ChevronDown", [
  ["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]
]);
const Me = G("ChevronRight", [
  ["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]
]);
const $t = G("ChevronsRight", [
  ["path", { d: "m6 17 5-5-5-5", key: "xnjwq" }],
  ["path", { d: "m13 17 5-5-5-5", key: "17xmmf" }]
]);
const zt = G("Clock", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["polyline", { points: "12 6 12 12 16 14", key: "68esgv" }]
]);
const Te = G("Cloud", [
  ["path", { d: "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z", key: "p7xjir" }]
]);
const Ut = G("Copy", [
  ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2", key: "17jyea" }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2", key: "zix9uf" }]
]);
const qt = G("CornerDownRight", [
  ["polyline", { points: "15 10 20 15 15 20", key: "1q7qjw" }],
  ["path", { d: "M4 4v7a4 4 0 0 0 4 4h12", key: "z08zvw" }]
]);
const jt = G("Earth", [
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
const Ht = G("Ellipsis", [
  ["circle", { cx: "12", cy: "12", r: "1", key: "41hilf" }],
  ["circle", { cx: "19", cy: "12", r: "1", key: "1wjl8i" }],
  ["circle", { cx: "5", cy: "12", r: "1", key: "1pcz8c" }]
]);
const Ft = G("FileText", [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "M10 9H8", key: "b1mrlr" }],
  ["path", { d: "M16 13H8", key: "t4e002" }],
  ["path", { d: "M16 17H8", key: "z1uh3a" }]
]);
const Bt = G("KeyRound", [
  [
    "path",
    {
      d: "M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z",
      key: "1s6t7t"
    }
  ],
  ["circle", { cx: "16.5", cy: "7.5", r: ".5", fill: "currentColor", key: "w0ekpg" }]
]);
const Ie = G("LoaderCircle", [
  ["path", { d: "M21 12a9 9 0 1 1-6.219-8.56", key: "13zald" }]
]);
const Wt = G("Maximize2", [
  ["polyline", { points: "15 3 21 3 21 9", key: "mznyad" }],
  ["polyline", { points: "9 21 3 21 3 15", key: "1avn1i" }],
  ["line", { x1: "21", x2: "14", y1: "3", y2: "10", key: "ota7mn" }],
  ["line", { x1: "3", x2: "10", y1: "21", y2: "14", key: "1atl0r" }]
]);
const Vt = G("Minimize2", [
  ["polyline", { points: "4 14 10 14 10 20", key: "11kfnr" }],
  ["polyline", { points: "20 10 14 10 14 4", key: "rlmsce" }],
  ["line", { x1: "14", x2: "21", y1: "10", y2: "3", key: "o5lafz" }],
  ["line", { x1: "3", x2: "10", y1: "21", y2: "14", key: "1atl0r" }]
]);
const We = G("Monitor", [
  ["rect", { width: "20", height: "14", x: "2", y: "3", rx: "2", key: "48i651" }],
  ["line", { x1: "8", x2: "16", y1: "21", y2: "21", key: "1svkeh" }],
  ["line", { x1: "12", x2: "12", y1: "17", y2: "21", key: "vw1qmm" }]
]);
const Kt = G("Pencil", [
  [
    "path",
    {
      d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
      key: "1a8usu"
    }
  ],
  ["path", { d: "m15 5 4 4", key: "1mk7zo" }]
]);
const Ve = G("Plus", [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "M12 5v14", key: "s699le" }]
]);
const Ke = G("Search", [
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
  ["path", { d: "m21 21-4.3-4.3", key: "1qie3q" }]
]);
const Ge = G("ShieldAlert", [
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
const Gt = G("Terminal", [
  ["polyline", { points: "4 17 10 11 4 5", key: "akl6gq" }],
  ["line", { x1: "12", x2: "20", y1: "19", y2: "19", key: "q2wloq" }]
]);
const Ye = G("Trash2", [
  ["path", { d: "M3 6h18", key: "d0wm0j" }],
  ["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", key: "4alrt4" }],
  ["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2", key: "v07s0e" }],
  ["line", { x1: "10", x2: "10", y1: "11", y2: "17", key: "1uufr5" }],
  ["line", { x1: "14", x2: "14", y1: "11", y2: "17", key: "xtxkd" }]
]);
const Yt = G("Users", [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }],
  ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }],
  ["path", { d: "M16 3.13a4 4 0 0 1 0 7.75", key: "1da9ce" }]
]);
function Xt(t) {
  let r = 0;
  for (let n = 0; n < t.length; n += 1) r = (r * 31 + t.charCodeAt(n)) % 360;
  return r;
}
function Xe({ agent: t, size: r = 36 }) {
  const n = Xt(t.id || t.name);
  return /* @__PURE__ */ e.createElement(
    "span",
    {
      className: "agent-avatar",
      role: "img",
      "aria-label": `${t.name} avatar`,
      style: {
        width: r,
        height: r,
        fontSize: Math.round(r * 0.52),
        background: `hsl(${n} 62% 46% / 0.16)`,
        color: `hsl(${n} 62% 46%)`
      }
    },
    t.avatar || t.name.trim().slice(0, 1).toUpperCase()
  );
}
const Jt = Re(async () => ({ default: (await import("./chunk-mermaid-HWGCJPDP-DYUstSSj.js").then((t) => t.i)).Streamdown })), Le = {
  working: "Working",
  idle: "Idle",
  waiting_for_approval: "Needs you",
  offline: "No profile"
};
function Zt({
  agents: t,
  sections: r,
  rooms: n,
  selectedAgentId: i,
  selectedThreadId: u,
  search: v,
  onSearch: d,
  onSelectAgent: M,
  onSelectThread: c,
  onAction: s,
  onCreate: b,
  onToggleSection: o
}) {
  const [a, p] = N();
  q(() => {
    if (!a) return;
    const f = () => p(void 0);
    return window.addEventListener("pointerdown", f), () => window.removeEventListener("pointerdown", f);
  }, [a]);
  const y = (f, D) => {
    p(void 0), s(f, D);
  }, l = v.trim().toLowerCase(), T = (f) => !l || `${f.name} ${f.role}`.toLowerCase().includes(l), R = fe(() => new Map(t.map((f) => [f.id, f])), [t]), O = r.map((f) => ({
    section: f,
    members: f.bot_ids.map((D) => R.get(D)).filter((D) => !!D && T(D))
  })).filter((f) => f.members.length > 0), x = !l && O.length > 1, j = (f) => /* @__PURE__ */ e.createElement(
    "div",
    {
      key: f.id,
      className: `agent-row ${i === f.id && !u.startsWith("group:") ? "selected" : ""} ${f.status === "working" ? "is-working" : ""}`
    },
    /* @__PURE__ */ e.createElement("button", { className: "agent-select", onClick: () => M(f.id) }, /* @__PURE__ */ e.createElement(Xe, { agent: f }), /* @__PURE__ */ e.createElement("span", { className: "agent-copy" }, /* @__PURE__ */ e.createElement("strong", null, /* @__PURE__ */ e.createElement("span", null, f.name), /* @__PURE__ */ e.createElement("span", { className: `agent-status ${f.status}`, title: Le[f.status], "aria-label": Le[f.status] })), f.lastMessagePreview && /* @__PURE__ */ e.createElement("span", { className: "agent-preview agent-preview-entering" }, /* @__PURE__ */ e.createElement(_e, { fallback: f.lastMessagePreview }, /* @__PURE__ */ e.createElement(Jt, { className: "agent-preview-markdown", mode: "static", controls: !1, linkSafety: { enabled: !0 }, skipHtml: !0 }, f.lastMessagePreview))))),
    /* @__PURE__ */ e.createElement(
      "button",
      {
        className: "agent-more",
        "aria-label": `More actions for ${f.name}`,
        onPointerDown: (D) => D.stopPropagation(),
        onClick: () => p((D) => D === f.id ? void 0 : f.id)
      },
      /* @__PURE__ */ e.createElement(Ht, { size: 15 })
    ),
    a === f.id && /* @__PURE__ */ e.createElement("div", { className: "agent-menu", role: "menu", onPointerDown: (D) => D.stopPropagation() }, /* @__PURE__ */ e.createElement("button", { role: "menuitem", onClick: () => y(f, "edit") }, /* @__PURE__ */ e.createElement(Kt, { size: 13 }), " Edit"), /* @__PURE__ */ e.createElement("button", { role: "menuitem", onClick: () => y(f, "duplicate") }, /* @__PURE__ */ e.createElement(Ut, { size: 13 }), " Duplicate"), /* @__PURE__ */ e.createElement("div", null), /* @__PURE__ */ e.createElement("button", { role: "menuitem", className: "danger-text", onClick: () => y(f, "delete") }, /* @__PURE__ */ e.createElement(Ye, { size: 13 }), " Remove from crew"))
  );
  return /* @__PURE__ */ e.createElement("aside", { className: "agent-sidebar" }, /* @__PURE__ */ e.createElement("div", { className: "sidebar-titlebar" }, /* @__PURE__ */ e.createElement("span", { className: "sidebar-title" }, "Crew"), /* @__PURE__ */ e.createElement("button", { className: "brand-add", "aria-label": "Hire a teammate", onClick: b }, /* @__PURE__ */ e.createElement(Ve, { size: 18 }))), /* @__PURE__ */ e.createElement("label", { className: "search" }, /* @__PURE__ */ e.createElement(Ke, { size: 15 }), /* @__PURE__ */ e.createElement("input", { "aria-label": "Search the crew", placeholder: "Search your crew", value: v, onChange: (f) => d(f.target.value) })), /* @__PURE__ */ e.createElement("div", { className: "agent-list" }, t.length === 0 && /* @__PURE__ */ e.createElement("div", { className: "agent-list-empty" }, "No teammates yet"), t.length > 0 && O.length === 0 && /* @__PURE__ */ e.createElement("div", { className: "agent-list-empty" }, "No teammates found"), x ? O.map(({ section: f, members: D }) => /* @__PURE__ */ e.createElement("section", { className: "agent-section", key: f.id }, /* @__PURE__ */ e.createElement(
    "button",
    {
      className: `agent-section-header ${f.collapsed ? "is-collapsed" : ""}`,
      "aria-expanded": !f.collapsed,
      onClick: () => o(f.id, !f.collapsed)
    },
    /* @__PURE__ */ e.createElement(Me, { size: 13, className: "agent-section-chevron" }),
    /* @__PURE__ */ e.createElement("span", null, f.name),
    /* @__PURE__ */ e.createElement("small", null, D.length)
  ), !f.collapsed && D.map(j))) : O.flatMap((f) => f.members).map(j), n.length > 0 && /* @__PURE__ */ e.createElement("section", { className: "agent-section", key: "__rooms__" }, /* @__PURE__ */ e.createElement("div", { className: "agent-section-header is-static" }, /* @__PURE__ */ e.createElement("span", null, "Rooms"), /* @__PURE__ */ e.createElement("small", null, n.length)), n.map((f) => /* @__PURE__ */ e.createElement("div", { key: f.id, className: `agent-row ${u === f.id ? "selected" : ""}` }, /* @__PURE__ */ e.createElement("button", { className: "agent-select", onClick: () => c(f.id) }, /* @__PURE__ */ e.createElement("span", { className: "agent-avatar", role: "img", "aria-label": `${f.title} room` }, f.emoji || "👥"), /* @__PURE__ */ e.createElement("span", { className: "agent-copy" }, /* @__PURE__ */ e.createElement("strong", null, /* @__PURE__ */ e.createElement("span", null, f.title)), /* @__PURE__ */ e.createElement("span", { className: "agent-preview" }, f.lastMessagePreview || f.subtitle))))))));
}
function Qt({
  open: t,
  agents: r,
  rooms: n,
  onClose: i,
  onSelectAgent: u,
  onSelectThread: v,
  onCreateAgent: d,
  onComputer: M
}) {
  const [c, s] = N(""), b = W(null);
  q(() => {
    t && (s(""), window.setTimeout(() => b.current?.focus(), 0));
  }, [t]);
  const a = fe(() => [
    { id: "create", label: "Hire a teammate", detail: "Add someone to the crew", icon: Ve, run: d },
    { id: "computer", label: "Open their computer", detail: "The current teammate's screen", icon: We, run: M },
    ...r.map((y) => ({
      id: `agent-${y.id}`,
      label: y.name,
      detail: `${y.role} · ${y.status.replaceAll("_", " ")}`,
      icon: Pt,
      run: () => u(y.id)
    })),
    ...n.map((y) => ({
      id: `room-${y.id}`,
      label: y.title,
      detail: y.subtitle || "Room",
      icon: Yt,
      run: () => v(y.id)
    }))
  ], [r, n, M, d, u, v]).filter((y) => `${y.label} ${y.detail}`.toLowerCase().includes(c.toLowerCase()));
  if (!t) return null;
  const p = (y) => {
    y.run(), i();
  };
  return /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "palette-backdrop",
      role: "presentation",
      onMouseDown: (y) => {
        y.target === y.currentTarget && i();
      }
    },
    /* @__PURE__ */ e.createElement("section", { className: "command-palette", role: "dialog", "aria-modal": "true", "aria-label": "Command palette" }, /* @__PURE__ */ e.createElement("label", null, /* @__PURE__ */ e.createElement(Ke, { size: 17 }), /* @__PURE__ */ e.createElement(
      "input",
      {
        ref: b,
        "aria-label": "Search the crew and commands",
        placeholder: "Search your crew…",
        value: c,
        onChange: (y) => s(y.target.value),
        onKeyDown: (y) => {
          y.key === "Escape" && i(), y.key === "Enter" && a[0] && p(a[0]);
        }
      }
    ), /* @__PURE__ */ e.createElement("kbd", null, "esc")), /* @__PURE__ */ e.createElement("div", { className: "palette-results" }, a.length ? a.map((y, l) => {
      const T = y.icon;
      return /* @__PURE__ */ e.createElement("button", { key: y.id, className: l === 0 ? "active" : "", onClick: () => p(y) }, /* @__PURE__ */ e.createElement("span", null, /* @__PURE__ */ e.createElement(T, { size: 16 })), /* @__PURE__ */ e.createElement("div", null, /* @__PURE__ */ e.createElement("strong", null, y.label), /* @__PURE__ */ e.createElement("small", null, y.detail)), l === 0 && /* @__PURE__ */ e.createElement("kbd", null, "↵"));
    }) : /* @__PURE__ */ e.createElement("p", null, "Nothing matches that")), /* @__PURE__ */ e.createElement("footer", null, /* @__PURE__ */ e.createElement("span", null, "Crew"), /* @__PURE__ */ e.createElement("span", null, /* @__PURE__ */ e.createElement("kbd", null, "⌘"), /* @__PURE__ */ e.createElement("kbd", null, "K"), " to open")))
  );
}
function ye({ label: t, kind: r = "", children: n }) {
  return /* @__PURE__ */ e.createElement("div", { className: `crew-chip ${r}` }, t && /* @__PURE__ */ e.createElement("div", { className: "crew-chip-label" }, t), n);
}
function er({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ye, { kind: "report" }, (t.lines ?? []).map((r, n) => /* @__PURE__ */ e.createElement("div", { className: "crew-report-line", key: n }, /* @__PURE__ */ e.createElement("span", { className: "crew-report-check" }, /* @__PURE__ */ e.createElement(De, { size: 13 })), /* @__PURE__ */ e.createElement("span", { className: "crew-report-system" }, r.system), /* @__PURE__ */ e.createElement("span", { className: "crew-report-arrow" }, "→"), /* @__PURE__ */ e.createElement("span", null, r.result, r.count && /* @__PURE__ */ e.createElement("span", { className: "crew-report-count" }, " · ", r.count)))), t.closing && /* @__PURE__ */ e.createElement("div", { className: "crew-report-closing" }, t.closing));
}
function tr({ payload: t, onDecide: r }) {
  const n = t.status === "approved" || t.status === "discarded";
  return /* @__PURE__ */ e.createElement("div", { className: `crew-chip approval ${n ? "resolved" : ""}` }, /* @__PURE__ */ e.createElement("div", { className: "crew-chip-label" }, /* @__PURE__ */ e.createElement(Ge, { size: 13 }), " ", n ? "Decided" : "Needs you"), /* @__PURE__ */ e.createElement("div", { className: "crew-approval-action" }, t.action), t.detail && /* @__PURE__ */ e.createElement("div", { className: "crew-approval-detail" }, t.detail), n ? /* @__PURE__ */ e.createElement("div", { className: "crew-approval-outcome" }, t.status === "approved" ? "Approved" : "Discarded") : /* @__PURE__ */ e.createElement("div", { className: "crew-approval-buttons" }, /* @__PURE__ */ e.createElement("button", { className: "crew-btn danger", onClick: () => r(String(t.approval_id), "deny") }, "Discard"), /* @__PURE__ */ e.createElement("button", { className: "crew-btn primary", onClick: () => r(String(t.approval_id), "allow") }, "Approve")));
}
function rr({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ye, { label: "You decided" }, /* @__PURE__ */ e.createElement("div", { className: "crew-approval-action" }, t.action), /* @__PURE__ */ e.createElement("div", { className: "crew-approval-outcome" }, t.status === "approved" ? "Approved" : "Discarded"));
}
function nr({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ye, { label: "Memory updated" }, /* @__PURE__ */ e.createElement("div", { className: "crew-memory-rule" }, t.rule), t.diff && /* @__PURE__ */ e.createElement("pre", { className: "crew-memory-diff" }, t.diff));
}
function ar({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ye, { label: "Routine created" }, /* @__PURE__ */ e.createElement("div", { className: "crew-routine-name" }, /* @__PURE__ */ e.createElement(zt, { size: 13 }), " ", t.name), /* @__PURE__ */ e.createElement("div", { className: "crew-routine-when" }, t.human || t.cron));
}
function sr({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ye, { label: `Handed over by @${t.from_name || t.from || "a teammate"}` }, /* @__PURE__ */ e.createElement("div", { className: "crew-botref-body" }, /* @__PURE__ */ e.createElement(qt, { size: 13 }), " ", t.content));
}
function or({ payload: t, onOpenScreen: r }) {
  return /* @__PURE__ */ e.createElement(ye, { label: "Needs you at the keyboard" }, /* @__PURE__ */ e.createElement("div", { className: "crew-login-site" }, /* @__PURE__ */ e.createElement(Bt, { size: 13 }), " Sign in to ", t.site || "a site"), t.why && /* @__PURE__ */ e.createElement("div", { className: "crew-login-why" }, t.why), /* @__PURE__ */ e.createElement("button", { className: "crew-btn", onClick: r }, "Take the wheel"));
}
function ir({ payload: t, screenshotUrl: r }) {
  const n = t.url ?? (t.bot_id && t.file ? r(t.bot_id, t.file) : void 0);
  return n ? /* @__PURE__ */ e.createElement("figure", { className: "crew-shot" }, /* @__PURE__ */ e.createElement("img", { src: n, alt: t.caption || "the teammate's screen", loading: "lazy" }), t.caption && /* @__PURE__ */ e.createElement("figcaption", null, t.caption)) : null;
}
function cr({ kind: t, payload: r, handlers: n }) {
  const i = r ?? {};
  switch (t) {
    case "report":
      return /* @__PURE__ */ e.createElement(er, { payload: i });
    case "approval_request":
      return /* @__PURE__ */ e.createElement(tr, { payload: i, onDecide: n.onDecide });
    case "approval_resolved":
      return /* @__PURE__ */ e.createElement(rr, { payload: i });
    case "memory_updated":
      return /* @__PURE__ */ e.createElement(nr, { payload: i });
    case "routine_created":
      return /* @__PURE__ */ e.createElement(ar, { payload: i });
    case "bot_ref":
      return /* @__PURE__ */ e.createElement(sr, { payload: i });
    case "login_request":
      return /* @__PURE__ */ e.createElement(or, { payload: i, onOpenScreen: n.onOpenScreen });
    case "screenshot":
      return /* @__PURE__ */ e.createElement(ir, { payload: i, screenshotUrl: n.screenshotUrl });
    default:
      return null;
  }
}
const lr = Re(async () => ({ default: (await import("./chunk-mermaid-HWGCJPDP-DYUstSSj.js").then((t) => t.i)).Streamdown })), dr = {
  browser: jt,
  terminal: Gt,
  file: Ft,
  handoff: Te,
  status: Te
};
function ur(t) {
  return t.parts.filter((r) => r.type === "text").map((r) => r.text).join("");
}
const mr = (t) => {
  const r = Math.max(0, Math.floor(t / 1e3)), n = Math.floor(r / 60);
  return n ? `${n}m ${r % 60}s` : `${r}s`;
};
function pr() {
  return /* @__PURE__ */ e.createElement("svg", { "aria-hidden": "true", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ e.createElement("path", { d: "m5 12 7-7 7 7" }), /* @__PURE__ */ e.createElement("path", { d: "M12 19V5" }));
}
function fr() {
  return /* @__PURE__ */ e.createElement("svg", { className: "stop-icon", "aria-hidden": "true", viewBox: "0 0 24 24" }, /* @__PURE__ */ e.createElement("rect", { x: "7.5", y: "7.5", width: "9", height: "9", rx: "1.5", fill: "currentColor" }));
}
function hr(t) {
  if (!(t.target instanceof Element)) return;
  const r = t.target.closest("a[href]");
  if (!(!r || !t.currentTarget.contains(r)))
    try {
      const n = new URL(r.href);
      if (n.protocol !== "http:" && n.protocol !== "https:") return;
      t.preventDefault(), window.open(n.toString(), "_blank", "noopener,noreferrer");
    } catch {
    }
}
function gr({ agent: t, label: r, activities: n, startedAt: i }) {
  const [u, v] = N(0), [d, M] = N(!1);
  return q(() => {
    v(Date.now());
    const c = window.setInterval(() => v(Date.now()), 1e3);
    return () => window.clearInterval(c);
  }, []), /* @__PURE__ */ e.createElement("details", { className: "agent-working-details", open: d }, /* @__PURE__ */ e.createElement(
    "summary",
    {
      role: "status",
      "aria-label": `${t?.name ?? "This teammate"} is working: ${r}`,
      onClick: (c) => {
        c.preventDefault(), M((s) => !s);
      }
    },
    /* @__PURE__ */ e.createElement("span", { className: "agent-working-progress" }, "Working for ", mr(u - Date.parse(i))),
    /* @__PURE__ */ e.createElement(Me, { className: "agent-working-chevron", size: 15 })
  ), n.length > 0 && /* @__PURE__ */ e.createElement("div", { className: "agent-working-tools" }, n.map((c) => {
    const s = dr[c.kind] ?? Te;
    return /* @__PURE__ */ e.createElement("details", { className: `agent-tool-detail ${c.status}`, key: c.id }, /* @__PURE__ */ e.createElement("summary", null, /* @__PURE__ */ e.createElement(s, { size: 14 }), /* @__PURE__ */ e.createElement("span", null, c.title), /* @__PURE__ */ e.createElement(Me, { size: 13 })), /* @__PURE__ */ e.createElement("div", null, c.output ?? (c.status === "running" ? "Waiting for result…" : "No output")));
  })));
}
function yr({ message: t, agent: r, senderName: n, activities: i, chips: u, entering: v = !1 }) {
  const d = ur(t), M = W(null), c = W(!!t.streaming), s = i.filter((y) => y.conversationId === t.conversationId), b = [...s].reverse().find((y) => y.status === "running") ?? s.at(-1), o = t.role === "agent" && !!t.streaming, a = d.trim() || b?.title || "Working", p = t.parts.filter((y) => y.type === "chip");
  return Ae(() => {
    const y = M.current, l = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (y && t.role === "agent" && c.current && !t.streaming && !l) {
      const T = y.querySelector(".message-body");
      T && typeof T.animate == "function" && T.animate(
        [{ opacity: 0, transform: "translate3d(-6px,4px,0)" }, { opacity: 1, transform: "translate3d(0,0,0)" }],
        { duration: 260, easing: "cubic-bezier(.2,.82,.3,1)" }
      );
    }
    c.current = !!t.streaming;
  }, [v, t.role, t.streaming]), /* @__PURE__ */ e.createElement("div", { className: `message ${t.role} ${v ? "message-entering" : ""}`, ref: M }, t.interrupted && /* @__PURE__ */ e.createElement("div", { className: "agent-interrupted" }, "Interrupted"), n && t.role === "agent" && /* @__PURE__ */ e.createElement("div", { className: "message-sender" }, n), !o && (d || t.streaming && !p.length) && /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "message-body",
      onClick: t.role === "agent" ? hr : void 0
    },
    t.role === "agent" ? /* @__PURE__ */ e.createElement(_e, { fallback: /* @__PURE__ */ e.createElement("span", { className: "agent-markdown-fallback" }, d) }, /* @__PURE__ */ e.createElement(
      lr,
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
  ), o && /* @__PURE__ */ e.createElement(
    gr,
    {
      agent: r,
      label: a,
      activities: s,
      startedAt: t.createdAt
    }
  ), p.map((y, l) => /* @__PURE__ */ e.createElement(
    cr,
    {
      key: `${t.id}:${l}`,
      kind: y.kind,
      payload: y.payload,
      handlers: u
    }
  )));
}
function vr({
  agent: t,
  thread: r,
  agentsById: n,
  messages: i,
  activities: u,
  chips: v,
  loading: d = !1,
  focusRequest: M = 0,
  onSend: c,
  onToggleDetails: s
}) {
  const [b, o] = N(""), [a, p] = N(!1), [y, l] = N(!1), [T, R] = N(!1), [O, x] = N(!1), j = W(null), f = W(null), D = W(null), V = W(!1), Z = W(!0), Y = W(!1), ee = W(0), X = W(0), te = W(void 0), B = W(void 0), ce = W(/* @__PURE__ */ new Set()), ne = W(r?.id ?? ""), ue = W(d), [me, H] = N(() => /* @__PURE__ */ new Set()), k = r?.title || t?.name || "Crew", P = r?.kind === "group", m = r?.id ?? t?.id ?? "";
  Ae(() => {
    const L = ne.current !== m || ue.current;
    if (ne.current = m, ue.current = d, d || L) {
      ce.current = new Set(i.map((Q) => Q.id)), H(/* @__PURE__ */ new Set());
      return;
    }
    const $ = i.filter((Q) => !ce.current.has(Q.id)).map((Q) => Q.id);
    for (const Q of $) ce.current.add(Q);
    H(new Set($));
  }, [m, d, i]);
  function _(L) {
    const $ = j.current;
    !$ || typeof $.scrollTo != "function" || (Z.current = !0, Y.current = !0, R(!1), te.current && window.clearTimeout(te.current), ee.current = Math.max(
      ee.current,
      Date.now() + (L === "smooth" ? 650 : 150)
    ), $.scrollTo({ top: $.scrollHeight, behavior: L }), te.current = window.setTimeout(() => {
      te.current = void 0, Y.current = !1;
    }, L === "smooth" ? 400 : 0));
  }
  q(() => {
    Z.current = !0, Y.current = !1, X.current = 0, R(!1), requestAnimationFrame(() => _("auto"));
  }, [m]), q(() => {
    Z.current && _("smooth");
  }, [i]), q(() => {
    const L = j.current, $ = f.current;
    if (!L || !$ || typeof ResizeObserver > "u") return;
    const Q = new ResizeObserver(() => {
      Z.current && _("auto");
    });
    return Q.observe($), () => Q.disconnect();
  }, [m, d]), q(() => () => {
    B.current && window.clearTimeout(B.current), te.current && window.clearTimeout(te.current);
  }, []), q(() => {
    M > 0 && D.current?.focus();
  }, [m, M]);
  function oe() {
    Y.current || Date.now() < ee.current || (x(!0), B.current && window.clearTimeout(B.current), B.current = window.setTimeout(() => {
      B.current = void 0, x(!1);
    }, 700));
  }
  async function le(L) {
    L.preventDefault();
    const $ = b.trim();
    if (!(!$ || V.current)) {
      V.current = !0, o(""), p(!0);
      try {
        await c($);
      } finally {
        V.current = !1, p(!1);
      }
    }
  }
  return /* @__PURE__ */ e.createElement("main", { className: "conversation" }, /* @__PURE__ */ e.createElement("header", { className: `conversation-header ${y ? "scrolled" : ""}` }, /* @__PURE__ */ e.createElement("h1", null, r?.emoji && /* @__PURE__ */ e.createElement("span", { className: "conversation-emoji" }, r.emoji), k), r?.subtitle && /* @__PURE__ */ e.createElement("p", { className: "conversation-subtitle" }, r.subtitle), /* @__PURE__ */ e.createElement("div", { className: "header-actions" }, !P && /* @__PURE__ */ e.createElement("button", { className: "computer-trigger", "aria-label": "Open this teammate's computer", onClick: s }, /* @__PURE__ */ e.createElement(We, { size: 18 })))), /* @__PURE__ */ e.createElement("div", { className: "conversation-scroll-shell" }, d ? /* @__PURE__ */ e.createElement("div", { className: "conversation-skeleton", role: "status", "aria-label": "Loading this thread" }, /* @__PURE__ */ e.createElement("div", { className: "skeleton-message skeleton-agent" }, /* @__PURE__ */ e.createElement("span", { className: "skeleton-line skeleton-line-wide" }), /* @__PURE__ */ e.createElement("span", { className: "skeleton-line" })), /* @__PURE__ */ e.createElement("div", { className: "skeleton-message skeleton-user" }, /* @__PURE__ */ e.createElement("span", { className: "skeleton-bubble" })), /* @__PURE__ */ e.createElement("div", { className: "skeleton-message skeleton-agent" }, /* @__PURE__ */ e.createElement("span", { className: "skeleton-line skeleton-line-short" }))) : /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement(
    "div",
    {
      className: `message-scroll ${O ? "scrollbar-visible" : ""}`,
      ref: j,
      onWheelCapture: (L) => {
        L.deltaY < 0 && (Y.current = !1);
      },
      onScroll: (L) => {
        const $ = L.currentTarget, Q = $.scrollHeight - $.scrollTop - $.clientHeight, E = Q <= 24, C = $.scrollTop < X.current - 1;
        X.current = $.scrollTop, l($.scrollTop > 0), C && Q > 72 ? (Y.current = !1, Z.current = !1, R(!0)) : !Y.current && E ? (Z.current = !0, R(!1)) : !Y.current && Q > 72 && (Z.current = !1, R(!0)), oe();
      },
      onPointerMove: (L) => {
        L.currentTarget.getBoundingClientRect().right - L.clientX <= 14 ? x(!0) : B.current || x(!1);
      },
      onPointerLeave: () => x(!1)
    },
    /* @__PURE__ */ e.createElement("div", { className: "message-content", ref: f }, i.length === 0 && t && /* @__PURE__ */ e.createElement("div", { className: "conversation-intro" }, /* @__PURE__ */ e.createElement(Xe, { agent: t, size: 54 }), /* @__PURE__ */ e.createElement("h2", null, t.name), /* @__PURE__ */ e.createElement("p", null, t.role)), i.map((L) => /* @__PURE__ */ e.createElement(
      yr,
      {
        key: L.id,
        message: L,
        agent: t,
        senderName: P ? n.get(L.sender ?? "")?.name : void 0,
        activities: u,
        chips: v,
        entering: me.has(L.id) || L.id.startsWith("optimistic-user:")
      }
    )))
  ), T && /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "scroll-to-bottom",
      "aria-label": "Scroll to the latest message",
      onClick: () => _("smooth")
    },
    /* @__PURE__ */ e.createElement(xt, { size: 20 })
  ))), /* @__PURE__ */ e.createElement("form", { className: "composer", onSubmit: le }, /* @__PURE__ */ e.createElement(
    "textarea",
    {
      ref: D,
      "aria-label": `Message ${k}`,
      placeholder: P ? "Ask the room…" : `Message ${k}…`,
      value: b,
      onChange: (L) => o(L.target.value),
      onKeyDown: (L) => {
        L.key === "Enter" && !L.shiftKey && !L.nativeEvent.isComposing && L.keyCode !== 229 && (L.preventDefault(), L.currentTarget.form?.requestSubmit());
      }
    }
  ), /* @__PURE__ */ e.createElement("div", { className: "composer-bottom" }, /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "submit-button",
      "data-state": a ? "stopping" : "send",
      "aria-label": a ? "Sending" : "Send message",
      disabled: !b.trim() || a
    },
    a ? /* @__PURE__ */ e.createElement(fr, null) : /* @__PURE__ */ e.createElement(pr, null)
  ))));
}
function Lr(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
function wr(t) {
  if (Object.prototype.hasOwnProperty.call(t, "__esModule")) return t;
  var r = t.default;
  if (typeof r == "function") {
    var n = function i() {
      var u = !1;
      try {
        u = this instanceof i;
      } catch {
      }
      return u ? Reflect.construct(r, arguments, this.constructor) : r.apply(this, arguments);
    };
    n.prototype = r.prototype;
  } else n = {};
  return Object.defineProperty(n, "__esModule", { value: !0 }), Object.keys(t).forEach(function(i) {
    var u = Object.getOwnPropertyDescriptor(t, i);
    Object.defineProperty(n, i, u.get ? u : {
      enumerable: !0,
      get: function() {
        return t[i];
      }
    });
  }), n;
}
var be = { exports: {} }, ae = {};
const Je = /* @__PURE__ */ wr(_t);
var $e;
function Er() {
  if ($e) return ae;
  $e = 1;
  var t = Je;
  function r(c) {
    var s = "https://react.dev/errors/" + c;
    if (1 < arguments.length) {
      s += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var b = 2; b < arguments.length; b++)
        s += "&args[]=" + encodeURIComponent(arguments[b]);
    }
    return "Minified React error #" + c + "; visit " + s + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function n() {
  }
  var i = {
    d: {
      f: n,
      r: function() {
        throw Error(r(522));
      },
      D: n,
      C: n,
      L: n,
      m: n,
      X: n,
      S: n,
      M: n
    },
    p: 0,
    findDOMNode: null
  }, u = /* @__PURE__ */ Symbol.for("react.portal");
  function v(c, s, b) {
    var o = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: u,
      key: o == null ? null : "" + o,
      children: c,
      containerInfo: s,
      implementation: b
    };
  }
  var d = t.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function M(c, s) {
    if (c === "font") return "";
    if (typeof s == "string")
      return s === "use-credentials" ? s : "";
  }
  return ae.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = i, ae.createPortal = function(c, s) {
    var b = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!s || s.nodeType !== 1 && s.nodeType !== 9 && s.nodeType !== 11)
      throw Error(r(299));
    return v(c, s, null, b);
  }, ae.flushSync = function(c) {
    var s = d.T, b = i.p;
    try {
      if (d.T = null, i.p = 2, c) return c();
    } finally {
      d.T = s, i.p = b, i.d.f();
    }
  }, ae.preconnect = function(c, s) {
    typeof c == "string" && (s ? (s = s.crossOrigin, s = typeof s == "string" ? s === "use-credentials" ? s : "" : void 0) : s = null, i.d.C(c, s));
  }, ae.prefetchDNS = function(c) {
    typeof c == "string" && i.d.D(c);
  }, ae.preinit = function(c, s) {
    if (typeof c == "string" && s && typeof s.as == "string") {
      var b = s.as, o = M(b, s.crossOrigin), a = typeof s.integrity == "string" ? s.integrity : void 0, p = typeof s.fetchPriority == "string" ? s.fetchPriority : void 0;
      b === "style" ? i.d.S(
        c,
        typeof s.precedence == "string" ? s.precedence : void 0,
        {
          crossOrigin: o,
          integrity: a,
          fetchPriority: p
        }
      ) : b === "script" && i.d.X(c, {
        crossOrigin: o,
        integrity: a,
        fetchPriority: p,
        nonce: typeof s.nonce == "string" ? s.nonce : void 0
      });
    }
  }, ae.preinitModule = function(c, s) {
    if (typeof c == "string")
      if (typeof s == "object" && s !== null) {
        if (s.as == null || s.as === "script") {
          var b = M(
            s.as,
            s.crossOrigin
          );
          i.d.M(c, {
            crossOrigin: b,
            integrity: typeof s.integrity == "string" ? s.integrity : void 0,
            nonce: typeof s.nonce == "string" ? s.nonce : void 0
          });
        }
      } else s == null && i.d.M(c);
  }, ae.preload = function(c, s) {
    if (typeof c == "string" && typeof s == "object" && s !== null && typeof s.as == "string") {
      var b = s.as, o = M(b, s.crossOrigin);
      i.d.L(c, b, {
        crossOrigin: o,
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
  }, ae.preloadModule = function(c, s) {
    if (typeof c == "string")
      if (s) {
        var b = M(s.as, s.crossOrigin);
        i.d.m(c, {
          as: typeof s.as == "string" && s.as !== "script" ? s.as : void 0,
          crossOrigin: b,
          integrity: typeof s.integrity == "string" ? s.integrity : void 0
        });
      } else i.d.m(c);
  }, ae.requestFormReset = function(c) {
    i.d.r(c);
  }, ae.unstable_batchedUpdates = function(c, s) {
    return c(s);
  }, ae.useFormState = function(c, s, b) {
    return d.H.useFormState(c, s, b);
  }, ae.useFormStatus = function() {
    return d.H.useHostTransitionStatus();
  }, ae.version = "19.2.7", ae;
}
var se = {};
var ze;
function br() {
  return ze || (ze = 1, process.env.NODE_ENV !== "production" && (function() {
    function t() {
    }
    function r(o) {
      return "" + o;
    }
    function n(o, a, p) {
      var y = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
      try {
        r(y);
        var l = !1;
      } catch {
        l = !0;
      }
      return l && (console.error(
        "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
        typeof Symbol == "function" && Symbol.toStringTag && y[Symbol.toStringTag] || y.constructor.name || "Object"
      ), r(y)), {
        $$typeof: s,
        key: y == null ? null : "" + y,
        children: o,
        containerInfo: a,
        implementation: p
      };
    }
    function i(o, a) {
      if (o === "font") return "";
      if (typeof a == "string")
        return a === "use-credentials" ? a : "";
    }
    function u(o) {
      return o === null ? "`null`" : o === void 0 ? "`undefined`" : o === "" ? "an empty string" : 'something with type "' + typeof o + '"';
    }
    function v(o) {
      return o === null ? "`null`" : o === void 0 ? "`undefined`" : o === "" ? "an empty string" : typeof o == "string" ? JSON.stringify(o) : typeof o == "number" ? "`" + o + "`" : 'something with type "' + typeof o + '"';
    }
    function d() {
      var o = b.H;
      return o === null && console.error(
        `Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:
1. You might have mismatching versions of React and the renderer (such as React DOM)
2. You might be breaking the Rules of Hooks
3. You might have more than one copy of React in the same app
See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.`
      ), o;
    }
    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart == "function" && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
    var M = Je, c = {
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
    }, s = /* @__PURE__ */ Symbol.for("react.portal"), b = M.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    typeof Map == "function" && Map.prototype != null && typeof Map.prototype.forEach == "function" && typeof Set == "function" && Set.prototype != null && typeof Set.prototype.clear == "function" && typeof Set.prototype.forEach == "function" || console.error(
      "React depends on Map and Set built-in types. Make sure that you load a polyfill in older browsers. https://reactjs.org/link/react-polyfills"
    ), se.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = c, se.createPortal = function(o, a) {
      var p = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
      if (!a || a.nodeType !== 1 && a.nodeType !== 9 && a.nodeType !== 11)
        throw Error("Target container is not a DOM element.");
      return n(o, a, null, p);
    }, se.flushSync = function(o) {
      var a = b.T, p = c.p;
      try {
        if (b.T = null, c.p = 2, o)
          return o();
      } finally {
        b.T = a, c.p = p, c.d.f() && console.error(
          "flushSync was called from inside a lifecycle method. React cannot flush when React is already rendering. Consider moving this call to a scheduler task or micro task."
        );
      }
    }, se.preconnect = function(o, a) {
      typeof o == "string" && o ? a != null && typeof a != "object" ? console.error(
        "ReactDOM.preconnect(): Expected the `options` argument (second) to be an object but encountered %s instead. The only supported option at this time is `crossOrigin` which accepts a string.",
        v(a)
      ) : a != null && typeof a.crossOrigin != "string" && console.error(
        "ReactDOM.preconnect(): Expected the `crossOrigin` option (second argument) to be a string but encountered %s instead. Try removing this option or passing a string value instead.",
        u(a.crossOrigin)
      ) : console.error(
        "ReactDOM.preconnect(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
        u(o)
      ), typeof o == "string" && (a ? (a = a.crossOrigin, a = typeof a == "string" ? a === "use-credentials" ? a : "" : void 0) : a = null, c.d.C(o, a));
    }, se.prefetchDNS = function(o) {
      if (typeof o != "string" || !o)
        console.error(
          "ReactDOM.prefetchDNS(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
          u(o)
        );
      else if (1 < arguments.length) {
        var a = arguments[1];
        typeof a == "object" && a.hasOwnProperty("crossOrigin") ? console.error(
          "ReactDOM.prefetchDNS(): Expected only one argument, `href`, but encountered %s as a second argument instead. This argument is reserved for future options and is currently disallowed. It looks like the you are attempting to set a crossOrigin property for this DNS lookup hint. Browsers do not perform DNS queries using CORS and setting this attribute on the resource hint has no effect. Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.",
          v(a)
        ) : console.error(
          "ReactDOM.prefetchDNS(): Expected only one argument, `href`, but encountered %s as a second argument instead. This argument is reserved for future options and is currently disallowed. Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.",
          v(a)
        );
      }
      typeof o == "string" && c.d.D(o);
    }, se.preinit = function(o, a) {
      if (typeof o == "string" && o ? a == null || typeof a != "object" ? console.error(
        "ReactDOM.preinit(): Expected the `options` argument (second) to be an object with an `as` property describing the type of resource to be preinitialized but encountered %s instead.",
        v(a)
      ) : a.as !== "style" && a.as !== "script" && console.error(
        'ReactDOM.preinit(): Expected the `as` property in the `options` argument (second) to contain a valid value describing the type of resource to be preinitialized but encountered %s instead. Valid values for `as` are "style" and "script".',
        v(a.as)
      ) : console.error(
        "ReactDOM.preinit(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
        u(o)
      ), typeof o == "string" && a && typeof a.as == "string") {
        var p = a.as, y = i(p, a.crossOrigin), l = typeof a.integrity == "string" ? a.integrity : void 0, T = typeof a.fetchPriority == "string" ? a.fetchPriority : void 0;
        p === "style" ? c.d.S(
          o,
          typeof a.precedence == "string" ? a.precedence : void 0,
          {
            crossOrigin: y,
            integrity: l,
            fetchPriority: T
          }
        ) : p === "script" && c.d.X(o, {
          crossOrigin: y,
          integrity: l,
          fetchPriority: T,
          nonce: typeof a.nonce == "string" ? a.nonce : void 0
        });
      }
    }, se.preinitModule = function(o, a) {
      var p = "";
      typeof o == "string" && o || (p += " The `href` argument encountered was " + u(o) + "."), a !== void 0 && typeof a != "object" ? p += " The `options` argument encountered was " + u(a) + "." : a && "as" in a && a.as !== "script" && (p += " The `as` option encountered was " + v(a.as) + "."), p ? console.error(
        "ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` string and, optionally, an `options` object with a valid `as` property.%s",
        p
      ) : (p = a && typeof a.as == "string" ? a.as : "script", p) === "script" || (p = v(p), console.error(
        'ReactDOM.preinitModule(): Currently the only supported "as" type for this function is "script" but received "%s" instead. This warning was generated for `href` "%s". In the future other module types will be supported, aligning with the import-attributes proposal. Learn more here: (https://github.com/tc39/proposal-import-attributes)',
        p,
        o
      )), typeof o == "string" && (typeof a == "object" && a !== null ? (a.as == null || a.as === "script") && (p = i(
        a.as,
        a.crossOrigin
      ), c.d.M(o, {
        crossOrigin: p,
        integrity: typeof a.integrity == "string" ? a.integrity : void 0,
        nonce: typeof a.nonce == "string" ? a.nonce : void 0
      })) : a == null && c.d.M(o));
    }, se.preload = function(o, a) {
      var p = "";
      if (typeof o == "string" && o || (p += " The `href` argument encountered was " + u(o) + "."), a == null || typeof a != "object" ? p += " The `options` argument encountered was " + u(a) + "." : typeof a.as == "string" && a.as || (p += " The `as` option encountered was " + u(a.as) + "."), p && console.error(
        'ReactDOM.preload(): Expected two arguments, a non-empty `href` string and an `options` object with an `as` property valid for a `<link rel="preload" as="..." />` tag.%s',
        p
      ), typeof o == "string" && typeof a == "object" && a !== null && typeof a.as == "string") {
        p = a.as;
        var y = i(
          p,
          a.crossOrigin
        );
        c.d.L(o, p, {
          crossOrigin: y,
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
    }, se.preloadModule = function(o, a) {
      var p = "";
      typeof o == "string" && o || (p += " The `href` argument encountered was " + u(o) + "."), a !== void 0 && typeof a != "object" ? p += " The `options` argument encountered was " + u(a) + "." : a && "as" in a && typeof a.as != "string" && (p += " The `as` option encountered was " + u(a.as) + "."), p && console.error(
        'ReactDOM.preloadModule(): Expected two arguments, a non-empty `href` string and, optionally, an `options` object with an `as` property valid for a `<link rel="modulepreload" as="..." />` tag.%s',
        p
      ), typeof o == "string" && (a ? (p = i(
        a.as,
        a.crossOrigin
      ), c.d.m(o, {
        as: typeof a.as == "string" && a.as !== "script" ? a.as : void 0,
        crossOrigin: p,
        integrity: typeof a.integrity == "string" ? a.integrity : void 0
      })) : c.d.m(o));
    }, se.requestFormReset = function(o) {
      c.d.r(o);
    }, se.unstable_batchedUpdates = function(o, a) {
      return o(a);
    }, se.useFormState = function(o, a, p) {
      return d().useFormState(o, a, p);
    }, se.useFormStatus = function() {
      return d().useHostTransitionStatus();
    }, se.version = "19.2.7", typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop == "function" && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
  })()), se;
}
var Ue;
function kr() {
  if (Ue) return be.exports;
  Ue = 1;
  function t() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function")) {
      if (process.env.NODE_ENV !== "production")
        throw new Error("^_^");
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(t);
      } catch (r) {
        console.error(r);
      }
    }
  }
  return process.env.NODE_ENV === "production" ? (t(), be.exports = Er()) : be.exports = br(), be.exports;
}
var Ze = kr();
function Sr(t) {
  if (t.width <= 0 || t.height <= 0) return !1;
  try {
    const r = t.getContext("2d", { willReadFrequently: !0 });
    if (!r) return !1;
    const n = [0, Math.floor(t.width / 2), t.width - 1], i = [0, Math.floor(t.height / 2), t.height - 1], u = n.flatMap((v) => i.map((d) => r.getImageData(v, d, 1, 1).data));
    if (u.every((v) => v[3] === 0)) return !1;
    for (let v = 0; v < 3; v += 1) {
      const d = u.map((M) => M[v]);
      if (Math.max(...d) - Math.min(...d) > 6) return !0;
    }
    return !1;
  } catch {
    return !1;
  }
}
function Qe({
  session: t,
  viewOnly: r,
  compact: n = !1,
  onReconnect: i,
  onDisconnect: u
}) {
  const v = W(null), d = W(u), [M, c] = N("connecting"), [s, b] = N();
  return q(() => {
    d.current = u;
  }, [u]), q(() => {
    if (!v.current) return;
    let o = !1, a = !1, p = !1, y = !1, l, T, R, O;
    (n ? v.current.closest(".computer-preview") : null)?.style.removeProperty("aspect-ratio"), c("connecting"), b(void 0);
    const j = () => {
      l && window.clearInterval(l), T && window.clearTimeout(T), l = void 0, T = void 0;
    }, f = () => {
      R && window.clearTimeout(R), R = void 0;
    }, D = () => {
      y || (y = !0, d.current?.());
    }, V = (B) => {
      o || a || (a = !0, f(), j(), b(B), c("disconnected"), D(), O?.disconnect());
    }, Z = () => {
      const B = v.current?.querySelector("canvas");
      return B ? Sr(B) : !1;
    }, Y = () => {
      o || a || (f(), p = !0, l = window.setInterval(() => {
        !o && Z() && (j(), c("connected"));
      }, 100), T = window.setTimeout(() => {
        Z() || V("This computer connected but never drew a frame.");
      }, 8e3));
    }, ee = (B) => {
      if (o || a) return;
      f(), j();
      const ce = B.detail?.clean;
      b((ne) => ne ?? (p && ce ? "This computer stopped before drawing a frame." : ce ? "This computer disconnected." : "The connection to this computer was lost.")), c("disconnected"), D();
    }, X = (B) => {
      V(B.detail?.reason ?? "Screen security negotiation failed.");
    }, te = () => V("This computer's screen is asking for a VNC password.");
    return R = window.setTimeout(() => V("This computer's screen did not answer."), 15e3), import("./chunk-rfb-DFY61DWN.js").then(({ default: B }) => {
      o || a || !v.current || (O = new B(v.current, t.url, { shared: !0, wsProtocols: t.protocols }), O.viewOnly = r, O.scaleViewport = !0, O.resizeSession = !1, n && (O.background = "transparent"), O.addEventListener("connect", Y), O.addEventListener("disconnect", ee), O.addEventListener("securityfailure", X), O.addEventListener("credentialsrequired", te));
    }).catch(() => V("Could not load the screen client.")), () => {
      o = !0, f(), j(), O?.removeEventListener("connect", Y), O?.removeEventListener("disconnect", ee), O?.removeEventListener("securityfailure", X), O?.removeEventListener("credentialsrequired", te), O?.disconnect();
    };
  }, [n, t, r]), /* @__PURE__ */ e.createElement("div", { className: `vnc-viewport ${n ? "is-compact" : ""}` }, /* @__PURE__ */ e.createElement("div", { ref: v, className: "vnc-target" }), M !== "connected" && /* @__PURE__ */ e.createElement("div", { className: "vnc-status", role: "status" }, M === "connecting" ? /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement(Ie, { size: n ? 14 : 18, className: "spin" }), !n && "Connecting…") : /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("span", null, n ? "Screen unavailable" : s), i && /* @__PURE__ */ e.createElement("button", { className: "secondary-button", onClick: i }, "Reconnect"))));
}
function Nr({
  session: t,
  failure: r,
  title: n,
  onClose: i,
  onReconnect: u
}) {
  return Ze.createPortal(/* @__PURE__ */ e.createElement("div", { className: "vnc-desktop", role: "dialog", "aria-label": n }, /* @__PURE__ */ e.createElement("div", { className: "vnc-titlebar", "aria-hidden": "true" }), /* @__PURE__ */ e.createElement("button", { className: "vnc-close", "aria-label": "Close this screen", onClick: i }, /* @__PURE__ */ e.createElement(Vt, { size: 18 })), t ? /* @__PURE__ */ e.createElement(Qe, { session: t, viewOnly: !1, onReconnect: u }) : /* @__PURE__ */ e.createElement("div", { className: "vnc-viewport" }, /* @__PURE__ */ e.createElement("div", { className: "vnc-status", role: "status" }, r ? /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("span", null, r), /* @__PURE__ */ e.createElement("button", { className: "secondary-button", onClick: u }, "Reconnect")) : /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement(Ie, { size: 18, className: "spin" }), " Connecting…")))), document.body);
}
function Cr({
  open: t,
  width: r,
  onResize: n,
  agentName: i,
  computer: u,
  approvals: v,
  routines: d,
  onApproval: M,
  onComputerAction: c,
  onDeleteRoutine: s,
  onClose: b
}) {
  const [o, a] = N(""), [p, y] = N(!1), [l, T] = N(() => /* @__PURE__ */ new Map()), [R, O] = N(""), [x, j] = N(() => /* @__PURE__ */ new Set()), [f, D] = N(), [V, Z] = N(!1), [Y, ee] = N(), X = v.filter((k) => k.status === "pending"), te = l.get(u?.id ?? ""), B = x.has(u?.id ?? ""), ce = W(c);
  q(() => {
    ce.current = c;
  }, [c]), q(() => {
    const k = u?.id;
    if (!t || V || u?.status !== "online" || !k || te || B) return;
    let P = !0;
    return O(k), ce.current("open").then((m) => {
      P && (T((_) => new Map(_).set(k, m)), O(""));
    }).catch(() => {
      P && (j((m) => new Set(m).add(k)), O(""));
    }), () => {
      P = !1;
    };
  }, [u?.id, u?.status, V, t, B, te]);
  async function ne(k) {
    Z(!0), D(void 0), ee(void 0), y(!0);
    const P = u?.id;
    P && x.has(P) && (j((m) => {
      const _ = new Set(m);
      return _.delete(P), _;
    }), T((m) => {
      const _ = new Map(m);
      return _.delete(P), _;
    }));
    try {
      D(await c(k));
    } catch (m) {
      ee(m instanceof Error ? m.message : "Could not reach that computer.");
    } finally {
      y(!1);
    }
  }
  function ue() {
    Z(!1), D(void 0), ee(void 0);
  }
  const me = () => window.innerWidth <= 1030 ? Math.min(730, window.innerWidth - 40) : Math.min(730, window.innerWidth - (window.innerWidth <= 1180 ? 672 : 732));
  q(() => {
    const k = () => {
      const P = Math.max(280, me());
      r > P && n(P);
    };
    return k(), window.addEventListener("resize", k), () => window.removeEventListener("resize", k);
  }, [n, r]);
  const H = (k) => n(Math.max(280, Math.min(me(), window.innerWidth - k)));
  return /* @__PURE__ */ e.createElement("aside", { className: `detail-panel ${t ? "is-open" : "is-closing"}`, style: { width: r } }, /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "detail-resize-handle",
      role: "separator",
      "aria-label": "Resize the details panel",
      "aria-orientation": "vertical",
      "aria-valuemin": 280,
      "aria-valuemax": Math.max(280, me()),
      "aria-valuenow": r,
      tabIndex: 0,
      onKeyDown: (k) => {
        k.key === "ArrowLeft" ? (k.preventDefault(), n(Math.min(me(), r + 16))) : k.key === "ArrowRight" && (k.preventDefault(), n(Math.max(280, r - 16)));
      },
      onPointerDown: (k) => {
        k.currentTarget.setPointerCapture(k.pointerId), H(k.clientX);
      },
      onPointerMove: (k) => {
        k.currentTarget.hasPointerCapture(k.pointerId) && H(k.clientX);
      }
    }
  ), /* @__PURE__ */ e.createElement("header", null, /* @__PURE__ */ e.createElement("button", { className: "icon-button", "aria-label": "Close the details panel", onClick: b }, /* @__PURE__ */ e.createElement($t, { size: 18 }))), X.map((k) => /* @__PURE__ */ e.createElement("section", { className: "approval-card", key: k.id }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow warning" }, /* @__PURE__ */ e.createElement(Ge, { size: 14 }), " Waiting for you"), /* @__PURE__ */ e.createElement("h3", null, k.title), k.description && /* @__PURE__ */ e.createElement("p", null, k.description), k.scope.length > 0 && /* @__PURE__ */ e.createElement("div", { className: "scope" }, /* @__PURE__ */ e.createElement("span", null, "This allows:"), k.scope.map((P) => /* @__PURE__ */ e.createElement("div", { key: P }, /* @__PURE__ */ e.createElement(De, { size: 13 }), P))), /* @__PURE__ */ e.createElement(
    "textarea",
    {
      "aria-label": "Note for this decision",
      placeholder: "Add a note (optional)",
      value: o,
      onChange: (P) => a(P.target.value)
    }
  ), /* @__PURE__ */ e.createElement("div", { className: "approval-actions" }, /* @__PURE__ */ e.createElement("button", { className: "secondary-button danger-text", onClick: () => {
    M(k.id, "deny", o);
  } }, "Discard"), /* @__PURE__ */ e.createElement("button", { className: "primary-button", onClick: () => {
    M(k.id, "allow", o);
  } }, "Approve")))), /* @__PURE__ */ e.createElement("section", { className: "screen-section" }, /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "screen-trigger",
      disabled: p || u?.status !== "online",
      "aria-label": `Open ${i}'s screen`,
      onClick: () => {
        ne("open");
      }
    },
    /* @__PURE__ */ e.createElement("span", { className: "computer-preview" }, [...l].map(([k, P]) => /* @__PURE__ */ e.createElement(
      "span",
      {
        className: `computer-preview-stream ${k === u?.id ? "is-active" : ""}`,
        key: k
      },
      /* @__PURE__ */ e.createElement(
        Qe,
        {
          session: P,
          viewOnly: !0,
          compact: !0,
          onDisconnect: () => j((m) => new Set(m).add(k))
        }
      )
    )), !l.has(u?.id ?? "") && (R === u?.id ? /* @__PURE__ */ e.createElement("span", { className: "computer-preview-loading", role: "status", "aria-label": `Loading ${i}'s screen` }, /* @__PURE__ */ e.createElement(Ie, { size: 18, className: "spin" })) : x.has(u?.id ?? "") ? /* @__PURE__ */ e.createElement("span", { className: "computer-preview-loading", role: "status" }, "Screen unavailable") : /* @__PURE__ */ e.createElement("span", { className: "computer-screen-off", "aria-hidden": "true" })), /* @__PURE__ */ e.createElement("span", { className: "screen-hover-action" }, /* @__PURE__ */ e.createElement(Wt, { size: 14 }), " Open"))
  ), /* @__PURE__ */ e.createElement("div", { className: "screen-caption" }, /* @__PURE__ */ e.createElement("span", null, i, "'s screen"), /* @__PURE__ */ e.createElement("span", { className: `screen-state ${u?.status ?? "offline"}` }, u?.status === "online" ? "Running" : u?.status === "starting" ? "Starting…" : "Off")), u && u.status !== "online" && /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "secondary-button",
      disabled: p,
      onClick: () => {
        ne("takeover");
      }
    },
    "Start this computer"
  ), u?.error && /* @__PURE__ */ e.createElement("p", { className: "screen-error" }, u.error)), d.length > 0 && /* @__PURE__ */ e.createElement("section", { className: "routines-section" }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow" }, "Routines"), d.map((k) => /* @__PURE__ */ e.createElement("div", { className: "routine-row", key: k.id }, /* @__PURE__ */ e.createElement("div", null, /* @__PURE__ */ e.createElement("strong", null, k.name), /* @__PURE__ */ e.createElement("span", null, k.schedule)), /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "icon-button",
      "aria-label": `Cancel the routine ${k.name}`,
      onClick: () => {
        s(k.id);
      }
    },
    /* @__PURE__ */ e.createElement(Ye, { size: 14 })
  )))), V && /* @__PURE__ */ e.createElement(
    Nr,
    {
      session: f,
      failure: Y,
      title: `${i}'s computer`,
      onClose: ue,
      onReconnect: () => {
        ne("takeover");
      }
    }
  ));
}
function Mr({
  value: t,
  options: r,
  ariaLabel: n,
  placeholder: i = "Select",
  onChange: u,
  onOpen: v
}) {
  const [d, M] = N(!1), [c, s] = N(), b = W(null), o = W(null), a = r.find((l) => l.value === t);
  q(() => {
    if (!d) return;
    const l = () => {
      const R = b.current?.getBoundingClientRect();
      if (!R) return;
      const O = 5, x = 8, j = Math.max(R.width, 180), f = Math.min(220, r.length * 32 + 10), D = window.innerHeight - R.bottom - x, V = D < f && R.top - x > D;
      s({
        position: "fixed",
        zIndex: 100,
        left: Math.max(x, Math.min(R.right - j, window.innerWidth - j - x)),
        top: V ? Math.max(x, R.top - f - O) : R.bottom + O,
        width: j,
        maxHeight: V ? Math.min(220, R.top - O - x) : Math.min(220, D)
      });
    }, T = (R) => {
      const O = R.target;
      !b.current?.contains(O) && !o.current?.contains(O) && M(!1);
    };
    return l(), window.addEventListener("pointerdown", T), window.addEventListener("resize", l), window.addEventListener("scroll", l, !0), () => {
      window.removeEventListener("pointerdown", T), window.removeEventListener("resize", l), window.removeEventListener("scroll", l, !0);
    };
  }, [d, r.length]);
  const p = (l) => {
    const T = r.filter((x) => !x.disabled && !x.action);
    if (!T.length) return;
    const R = T.findIndex((x) => x.value === t), O = R < 0 ? l > 0 ? 0 : T.length - 1 : (R + l + T.length) % T.length;
    u(T[O].value);
  }, y = () => M((l) => (l || v?.(), !l));
  return /* @__PURE__ */ e.createElement("div", { className: `crew-select ${d ? "open" : ""}`, ref: b }, /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "crew-select-trigger",
      "aria-label": n,
      "aria-haspopup": "listbox",
      "aria-expanded": d,
      onClick: y,
      onKeyDown: (l) => {
        if (l.key === "Escape") {
          M(!1);
          return;
        }
        (l.key === "ArrowDown" || l.key === "ArrowUp") && (l.preventDefault(), p(l.key === "ArrowDown" ? 1 : -1), d || v?.(), M(!0));
      }
    },
    /* @__PURE__ */ e.createElement("span", null, a?.label ?? i),
    /* @__PURE__ */ e.createElement("span", { className: "crew-select-chevron" }, /* @__PURE__ */ e.createElement(Lt, { size: 15 }))
  ), d && c && Ze.createPortal(
    /* @__PURE__ */ e.createElement(
      "div",
      {
        className: "crew-select-menu crew-select-menu-portal",
        ref: o,
        style: c,
        role: "listbox",
        "aria-label": n
      },
      r.map((l) => /* @__PURE__ */ e.createElement(
        "button",
        {
          type: "button",
          className: `${l.action ? "crew-select-action" : ""} ${l.action || l.icon ? "crew-select-has-icon" : ""}`,
          role: "option",
          "aria-selected": !l.action && l.value === t,
          disabled: l.disabled,
          key: l.value,
          onClick: () => {
            l.action?.(), l.action || u(l.value), M(!1);
          }
        },
        (l.action || l.icon) && /* @__PURE__ */ e.createElement("span", { className: "crew-select-check", "aria-hidden": "true" }, l.icon),
        /* @__PURE__ */ e.createElement("span", { className: "crew-select-label", title: l.label }, l.label),
        !l.action && /* @__PURE__ */ e.createElement("span", { className: "crew-select-check", "aria-hidden": "true" }, l.value === t && /* @__PURE__ */ e.createElement(De, { size: 14 }))
      ))
    ),
    document.body
  ));
}
const Tr = ["🤖", "🔎", "📥", "📈", "🎖️", "🧭", "🛠️", "📚", "🧪", "✍️", "🗂️", "🛰️"];
function qe({
  editing: t,
  providers: r,
  busy: n,
  error: i,
  onSubmit: u,
  onClose: v
}) {
  const [d, M] = N(t?.name ?? ""), [c, s] = N(t?.role ?? ""), [b, o] = N(t?.avatar || "🤖"), [a, p] = N("");
  q(() => {
    const l = (T) => {
      T.key === "Escape" && v();
    };
    return window.addEventListener("keydown", l), () => window.removeEventListener("keydown", l);
  }, [v]);
  const y = !!d.trim() && !n;
  return /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "palette-backdrop",
      role: "presentation",
      onMouseDown: (l) => {
        l.target === l.currentTarget && v();
      }
    },
    /* @__PURE__ */ e.createElement(
      "form",
      {
        className: "crew-dialog",
        role: "dialog",
        "aria-modal": "true",
        "aria-label": t ? `Edit ${t.name}` : "Hire a teammate",
        onSubmit: (l) => {
          l.preventDefault(), y && u({ name: d.trim(), role: c.trim(), emoji: b, modelProviderId: a });
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
          onChange: (l) => M(l.target.value)
        }
      ), t && /* @__PURE__ */ e.createElement("small", null, "A teammate's name is its profile directory, so it cannot be changed here.")),
      /* @__PURE__ */ e.createElement("label", { className: "crew-field" }, /* @__PURE__ */ e.createElement("span", null, "Their job, in one line"), /* @__PURE__ */ e.createElement(
        "input",
        {
          autoFocus: !!t,
          value: c,
          placeholder: "Turns a one-line question into a decision-ready brief with sources",
          onChange: (l) => s(l.target.value)
        }
      )),
      /* @__PURE__ */ e.createElement("div", { className: "crew-field" }, /* @__PURE__ */ e.createElement("span", null, "Face"), /* @__PURE__ */ e.createElement("div", { className: "crew-emoji-row" }, Tr.map((l) => /* @__PURE__ */ e.createElement(
        "button",
        {
          type: "button",
          key: l,
          className: `crew-emoji ${l === b ? "selected" : ""}`,
          "aria-label": `Use ${l}`,
          "aria-pressed": l === b,
          onClick: () => o(l)
        },
        l
      )))),
      !t && r.length > 0 && /* @__PURE__ */ e.createElement("div", { className: "crew-field" }, /* @__PURE__ */ e.createElement("span", null, "Model"), /* @__PURE__ */ e.createElement(
        Mr,
        {
          ariaLabel: "Model provider",
          placeholder: "Same as your default profile",
          value: a,
          options: [
            // Cloning the default profile is what gives a new teammate working
            // credentials immediately, so it is the option that needs no
            // explanation and therefore the one that comes first.
            { value: "", label: "Same as your default profile" },
            ...r.map((l) => ({
              value: l.id,
              label: l.defaultModel ? `${l.name} · ${l.defaultModel}` : l.name
            }))
          ],
          onChange: p
        }
      )),
      i && /* @__PURE__ */ e.createElement("p", { className: "crew-dialog-error" }, i),
      /* @__PURE__ */ e.createElement("div", { className: "crew-dialog-actions" }, /* @__PURE__ */ e.createElement("button", { type: "button", className: "secondary-button", onClick: v }, "Cancel"), /* @__PURE__ */ e.createElement("button", { className: "primary-button", disabled: !y }, n ? "Working…" : t ? "Save" : "Hire"))
    )
  );
}
const et = "hermes-crew:detail-width";
function _r() {
  try {
    const t = window.localStorage?.getItem(et), r = t ? Number.parseInt(t, 10) : Number.NaN;
    return Number.isFinite(r) ? Math.max(280, r) : 360;
  } catch {
    return 360;
  }
}
function Or({ client: t, notify: r }) {
  const n = Rt(t, { notify: r }), [i, u] = N(""), [v, d] = N([]), [M, c] = N([]), [s, b] = N(!1), [o, a] = N(_r), [p, y] = N(!1), [l, T] = N(), [R, O] = N(!1), [x, j] = N(), [f, D] = N(0), { agents: V, conversations: Z, selectedAgent: Y, selectedAgentId: ee, selectedThreadId: X } = n, te = fe(() => Z.filter((m) => m.kind === "group"), [Z]), B = fe(() => new Map(V.map((m) => [m.id, m])), [V]), ce = fe(
    () => Z.find((m) => m.id === X),
    [Z, X]
  ), ne = n.approvals.filter((m) => m.status === "pending").length;
  q(() => {
    try {
      window.localStorage?.setItem(et, String(o));
    } catch {
    }
  }, [o]);
  const ue = Se(() => {
    t.listSections().then(d).catch(() => d([]));
  }, [t]);
  q(ue, [ue, V.length]), q(() => {
    if (!ee) {
      c([]);
      return;
    }
    let m = !0;
    return t.listRoutines(ee).then((_) => {
      m && c(_);
    }).catch(() => {
      m && c([]);
    }), () => {
      m = !1;
    };
  }, [t, ee]), q(() => {
    ne > 0 && b(!0);
  }, [ne]), q(() => {
    const m = (_) => {
      (_.metaKey || _.ctrlKey) && _.key.toLowerCase() === "k" && (_.preventDefault(), y((oe) => !oe));
    };
    return window.addEventListener("keydown", m), () => window.removeEventListener("keydown", m);
  }, []);
  const me = (m, _) => {
    const oe = v.map((le) => le.id === m ? { ...le, collapsed: _ } : le);
    d(oe), t.saveSections(oe).then(d).catch(ue);
  }, H = (m, _) => {
    if (_ === "edit") {
      j(void 0), T({ editing: m });
      return;
    }
    if (_ === "duplicate") {
      n.duplicateAgent(m.id).catch(() => {
      });
      return;
    }
    window.confirm(`Remove ${m.name} from the crew? Their profile, memory and skills stay on disk.`) && n.deleteAgent(m.id).catch(() => {
    });
  }, k = async (m) => {
    O(!0), j(void 0);
    try {
      l?.editing ? await n.updateAgent(l.editing.id, { role: m.role, emoji: m.emoji }) : await n.createAgent({
        name: m.name,
        role: m.role,
        emoji: m.emoji,
        modelProviderId: m.modelProviderId || void 0
      }), T(void 0), ue();
    } catch (_) {
      j(_ instanceof Error ? _.message : "That did not work.");
    } finally {
      O(!1);
    }
  }, P = fe(() => ({
    onDecide: (m, _) => {
      n.respondToApproval(m, _).catch(() => {
      });
    },
    // A login request is the one chip that is an instruction to the operator,
    // so its button does the thing rather than pointing at where the thing is.
    onOpenScreen: () => {
      b(!0), n.openComputer("takeover").catch(() => {
      });
    },
    screenshotUrl: (m, _) => t.screenshotUrl(m, _)
  }), [t, n]);
  return n.loading ? /* @__PURE__ */ e.createElement("div", { className: "crew-workspace is-loading", role: "status" }, "Loading your crew…") : V.length ? /* @__PURE__ */ e.createElement("div", { className: "crew-workspace" }, /* @__PURE__ */ e.createElement(
    Zt,
    {
      agents: V,
      sections: v,
      rooms: te,
      selectedAgentId: ee,
      selectedThreadId: X,
      search: i,
      onSearch: u,
      onSelectAgent: (m) => {
        n.setSelectedAgentId(m), D((_) => _ + 1);
      },
      onSelectThread: (m) => {
        n.setSelectedThreadId(m), D((_) => _ + 1);
      },
      onAction: H,
      onCreate: () => {
        j(void 0), T({});
      },
      onToggleSection: me
    }
  ), /* @__PURE__ */ e.createElement(
    vr,
    {
      agent: Y,
      thread: ce,
      agentsById: B,
      messages: n.messages,
      activities: n.activities,
      chips: P,
      loading: n.conversationLoading,
      focusRequest: f,
      onSend: (m) => n.sendMessage(m).catch(() => {
      }),
      onToggleDetails: () => b((m) => !m)
    }
  ), s && Y && /* @__PURE__ */ e.createElement(
    Cr,
    {
      open: s,
      width: o,
      onResize: a,
      agentName: Y.name,
      computer: n.computer,
      approvals: n.approvals,
      routines: M,
      onApproval: (m, _, oe) => n.respondToApproval(m, _, oe),
      onComputerAction: (m) => n.openComputer(m),
      onDeleteRoutine: async (m) => {
        await t.deleteRoutine(Y.id, m), c((_) => _.filter((oe) => oe.id !== m));
      },
      onClose: () => b(!1)
    }
  ), /* @__PURE__ */ e.createElement(
    Qt,
    {
      open: p,
      agents: V,
      rooms: te,
      onClose: () => y(!1),
      onSelectAgent: n.setSelectedAgentId,
      onSelectThread: n.setSelectedThreadId,
      onCreateAgent: () => {
        j(void 0), T({});
      },
      onComputer: () => b(!0)
    }
  ), l && /* @__PURE__ */ e.createElement(
    qe,
    {
      editing: l.editing,
      providers: n.modelProviders,
      busy: R,
      error: x,
      onSubmit: k,
      onClose: () => T(void 0)
    }
  ), n.error && /* @__PURE__ */ e.createElement("div", { className: "crew-toast", role: "alert" }, /* @__PURE__ */ e.createElement("span", null, n.error), /* @__PURE__ */ e.createElement("button", { className: "icon-button", "aria-label": "Dismiss", onClick: n.dismissError }, "×"))) : /* @__PURE__ */ e.createElement("div", { className: "crew-workspace is-empty" }, /* @__PURE__ */ e.createElement("div", { className: "crew-empty-card" }, /* @__PURE__ */ e.createElement("h2", null, "No teammates yet"), /* @__PURE__ */ e.createElement("p", null, "A teammate is a Hermes profile with a thread, a memory and a computer of its own. Give one a name and a one-line job to start."), /* @__PURE__ */ e.createElement("button", { className: "primary-button", onClick: () => {
    j(void 0), T({});
  } }, "Hire your first teammate")), l && /* @__PURE__ */ e.createElement(
    qe,
    {
      providers: n.modelProviders,
      busy: R,
      error: x,
      onSubmit: k,
      onClose: () => T(void 0)
    }
  ));
}
const Ce = 500, Rr = 15e3;
function Ar(t, r) {
  return t === 401 || t === 403 ? new ge("unauthorized", r) : t === 404 ? new ge("not_found", r) : t === 409 ? new ge("conflict", r) : new ge("unknown", r, t >= 500);
}
function Dr(t) {
  const r = new URL(t, globalThis.location?.href ?? "http://127.0.0.1");
  return r.protocol = r.protocol === "https:" ? "wss:" : "ws:", r.pathname = `${r.pathname.replace(/\/+$/, "")}/v1/events`, r.toString();
}
class Ir {
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
  constructor(r) {
    this.baseUrl = r.baseUrl.replace(/\/+$/, "");
    const n = r.eventsUrl ?? Dr(this.baseUrl);
    this.resolveEventsUrl = typeof n == "function" ? n : async () => n, this.fetchImpl = r.fetchImpl ?? ((i, u) => fetch(i, u)), this.headers = r.headers ?? (() => ({}));
  }
  async request(r, n = {}) {
    let i;
    try {
      i = await this.fetchImpl(`${this.baseUrl}${r}`, {
        ...n,
        headers: {
          ...n.body ? { "Content-Type": "application/json" } : {},
          ...this.headers(),
          ...n.headers ?? {}
        }
      });
    } catch (u) {
      throw u instanceof DOMException && u.name === "AbortError" ? u : new ge("network", "Could not reach the crew backend.", !0);
    }
    if (!i.ok) {
      const u = await i.json().then((v) => v?.detail).catch(() => {
      });
      throw Ar(i.status, u ?? `Crew request failed (${i.status})`);
    }
    if (i.status !== 204)
      return await i.json();
  }
  listModelProviders(r) {
    return this.request("/v1/model-providers", { signal: r });
  }
  listAgents(r) {
    return this.request("/v1/agents", { signal: r });
  }
  getAgent(r, n) {
    return this.request(`/v1/agents/${encodeURIComponent(r)}`, { signal: n });
  }
  createAgent(r, n) {
    return this.request("/v1/agents", {
      method: "POST",
      body: JSON.stringify(r),
      signal: n
    });
  }
  updateAgent(r, n, i) {
    return this.request(`/v1/agents/${encodeURIComponent(r)}`, {
      method: "PATCH",
      body: JSON.stringify(n),
      signal: i
    });
  }
  async deleteAgent(r, n) {
    await this.request(`/v1/agents/${encodeURIComponent(r)}`, {
      method: "DELETE",
      signal: n
    });
  }
  duplicateAgent(r, n) {
    return this.request(`/v1/agents/${encodeURIComponent(r)}/duplicate`, {
      method: "POST",
      signal: n
    });
  }
  listConversations(r, n) {
    const i = r ? `?agentId=${encodeURIComponent(r)}` : "";
    return this.request(`/v1/conversations${i}`, { signal: n });
  }
  getConversation(r, n) {
    return this.request(
      `/v1/conversations/${encodeURIComponent(r)}`,
      { signal: n }
    );
  }
  sendMessage(r) {
    return this.request(
      `/v1/conversations/${encodeURIComponent(r.conversationId)}/messages`,
      { method: "POST", body: JSON.stringify({ text: r.text }), signal: r.signal }
    );
  }
  listApprovalRequests(r, n) {
    const i = r ? `?agentId=${encodeURIComponent(r)}` : "";
    return this.request(`/v1/approvals${i}`, { signal: n });
  }
  respondToApproval(r, n) {
    return this.request(
      `/v1/approvals/${encodeURIComponent(r.requestId)}/respond`,
      {
        method: "POST",
        body: JSON.stringify({ decision: r.decision, note: r.note ?? "" }),
        signal: n
      }
    );
  }
  getComputer(r, n) {
    return this.request(`/v1/agents/${encodeURIComponent(r)}/computer`, {
      signal: n
    });
  }
  openComputer(r, n) {
    return this.request(
      `/v1/agents/${encodeURIComponent(r)}/computer/open`,
      { method: "POST", signal: n }
    );
  }
  takeOverComputer(r, n) {
    return this.request(
      `/v1/agents/${encodeURIComponent(r)}/computer/takeover`,
      { method: "POST", signal: n }
    );
  }
  async reconnect(r) {
    this.closeSocket(), this.reconnectDelay = Ce, this.listeners.size && this.openSocket(), await this.listAgents(r);
  }
  listSections(r) {
    return this.request("/sections", { signal: r }).then((n) => n.sections);
  }
  saveSections(r, n) {
    return this.request("/sections", {
      method: "PUT",
      body: JSON.stringify(r),
      signal: n
    }).then((i) => i.sections);
  }
  listRoutines(r, n) {
    return this.request(
      `/bots/${encodeURIComponent(r)}/routines`,
      { signal: n }
    ).then((i) => i.routines);
  }
  async deleteRoutine(r, n, i) {
    await this.request(
      `/bots/${encodeURIComponent(r)}/routines/${encodeURIComponent(n)}`,
      { method: "DELETE", signal: i }
    );
  }
  screenshotUrl(r, n) {
    return `${this.baseUrl}/screenshots/${encodeURIComponent(r)}/${encodeURIComponent(n)}`;
  }
  subscribeToConversationEvents(r, n) {
    const i = (u) => {
      "threadId" in u && u.threadId && u.threadId !== r || n(u);
    };
    return this.listeners.add(i), this.closed = !1, this.openSocket(), {
      unsubscribe: () => {
        this.listeners.delete(i), this.listeners.size || (this.closed = !0, this.closeSocket());
      }
    };
  }
  emit(r) {
    for (const n of [...this.listeners]) n(r);
  }
  openSocket() {
    this.socket || this.opening || this.closed || (this.opening = !0, this.resolveEventsUrl().then((r) => {
      this.opening = !1, this.attach(r);
    }).catch(() => {
      this.opening = !1, this.scheduleReconnect();
    }));
  }
  attach(r) {
    if (this.socket || this.closed) return;
    let n;
    try {
      n = new WebSocket(r);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = n, n.onopen = () => {
      this.reconnectDelay = Ce, this.emit({ type: "connection.changed", state: "connected" });
    }, n.onmessage = (i) => {
      try {
        this.emit(JSON.parse(String(i.data)));
      } catch {
      }
    }, n.onclose = () => {
      this.socket = void 0, !this.closed && (this.emit({ type: "connection.changed", state: "connecting" }), this.scheduleReconnect());
    }, n.onerror = () => n.close();
  }
  scheduleReconnect() {
    this.reconnectTimer || this.closed || (this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = void 0, this.reconnectDelay = Math.min(this.reconnectDelay * 2, Rr), this.openSocket();
    }, this.reconnectDelay));
  }
  closeSocket() {
    this.reconnectTimer && (clearTimeout(this.reconnectTimer), this.reconnectTimer = void 0), this.opening = !1;
    const r = this.socket;
    this.socket = void 0, r && (r.onclose = null, r.onerror = null, r.close());
  }
}
const je = "/api/plugins/hermes-crew", He = window.__HERMES_PLUGIN_SDK__, xr = new Ir({
  baseUrl: je,
  // The SDK's authed fetch, not the global one. Its own contract says plugins
  // must not hand-read the session token, and this is what keeps loopback,
  // gated-OAuth and server-internal modes all working from one bundle.
  fetchImpl: (t, r) => He.authedFetch(t, r),
  // A resolver, not a string: in gated mode `buildWsUrl` mints a single-use
  // ticket, so the URL has to be rebuilt for every connect and reconnect.
  eventsUrl: () => He.buildWsUrl(`${je}/v1/events`)
});
function Pr(t) {
  try {
    if (typeof Notification > "u" || Notification.permission !== "granted" || document.visibilityState === "visible") return;
    new Notification(t.title, { body: t.body });
  } catch {
  }
}
function $r() {
  return /* @__PURE__ */ e.createElement(Or, { client: xr, notify: Pr });
}
export {
  $r as C,
  e as R,
  _e as S,
  N as a,
  q as b,
  Et as c,
  fe as d,
  W as e,
  Ae as f,
  Lr as g,
  ke as h,
  mt as i,
  lt as j,
  dt as k,
  Se as l,
  pt as m,
  Re as n,
  Ze as r,
  yt as u
};

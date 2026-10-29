const St = globalThis.__HERMES_PLUGIN_SDK__, e = St?.React;
if (!e)
  throw new Error(
    "hermes-crew: the dashboard plugin SDK is not on the page, so there is no React to borrow."
  );
const {
  Children: Ct,
  Fragment: Mt,
  Profiler: Tt,
  StrictMode: _t,
  Suspense: De,
  cloneElement: xt,
  createContext: It,
  createElement: Ie,
  createRef: Rt,
  forwardRef: He,
  isValidElement: At,
  lazy: Pe,
  memo: Ot,
  startTransition: Dt,
  use: Pt,
  useActionState: $t,
  useCallback: Ee,
  useContext: Lt,
  useDebugValue: zt,
  useDeferredValue: Ut,
  useEffect: U,
  useId: qt,
  useImperativeHandle: Ht,
  useInsertionEffect: jt,
  useLayoutEffect: je,
  useMemo: fe,
  useOptimistic: Ft,
  useReducer: Vt,
  useRef: Y,
  useState: N,
  useSyncExternalStore: ct,
  useTransition: Bt,
  version: Wt
} = e, Gt = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Children: Ct,
  Fragment: Mt,
  Profiler: Tt,
  StrictMode: _t,
  Suspense: De,
  cloneElement: xt,
  createContext: It,
  createElement: Ie,
  createRef: Rt,
  default: e,
  forwardRef: He,
  isValidElement: At,
  lazy: Pe,
  memo: Ot,
  startTransition: Dt,
  use: Pt,
  useActionState: $t,
  useCallback: Ee,
  useContext: Lt,
  useDebugValue: zt,
  useDeferredValue: Ut,
  useEffect: U,
  useId: qt,
  useImperativeHandle: Ht,
  useInsertionEffect: jt,
  useLayoutEffect: je,
  useMemo: fe,
  useOptimistic: Ft,
  useReducer: Vt,
  useRef: Y,
  useState: N,
  useSyncExternalStore: ct,
  useTransition: Bt,
  version: Wt
}, Symbol.toStringTag, { value: "Module" })), Kt = {
  isActive: () => document.visibilityState !== "hidden",
  isOnline: () => navigator.onLine,
  subscribe(t) {
    const n = () => t("focus"), a = () => t("online"), r = () => {
      document.visibilityState === "visible" && t("visible");
    };
    return window.addEventListener("focus", n), window.addEventListener("online", a), document.addEventListener("visibilitychange", r), () => {
      window.removeEventListener("focus", n), window.removeEventListener("online", a), document.removeEventListener("visibilitychange", r);
    };
  }
}, Yt = {
  isActive: () => !0,
  isOnline: () => !0,
  subscribe: () => () => {
  }
};
function Xt() {
  return typeof document < "u" && typeof window < "u" && typeof document.addEventListener == "function" ? Kt : Yt;
}
class we extends Error {
  constructor(n, a, r = !1) {
    super(a), this.code = n, this.retryable = r, this.name = "CrewError";
  }
  code;
  retryable;
}
function lt(t) {
  return !t || t.role !== "agent" ? "" : t.parts.filter((n) => n.type === "text").map((n) => n.text).join("").trim();
}
function _e(t) {
  return lt(
    [...t].reverse().find((n) => n.role === "agent" && !n.streaming)
  );
}
function Be(t) {
  return t.parts.filter((n) => n.type === "text").map((n) => n.text).join("");
}
const We = 6e4, Jt = 3e4, $e = "optimistic-user:", Ne = "optimistic-agent:";
function Zt(t, n = {}) {
  const { enabled: a = !0, notify: r, platform: c = Xt() } = n, [u, h] = N([]), [m, l] = N(""), [o, b] = N(""), [i, s] = N([]), [y, g] = N([]), [d, O] = N([]), [$, R] = N([]), [P, H] = N(), [J, B] = N("connecting"), [S, j] = N([]), [te, K] = N(a), [de, Z] = N(), [E, D] = N(() => /* @__PURE__ */ new Set()), [ne, pe] = N(""), [he, oe] = N(0), W = Y(/* @__PURE__ */ new Map()), se = Y(m), ae = Y(/* @__PURE__ */ new Set()), G = Y(/* @__PURE__ */ new Map()), ie = Y(r), me = fe(
    () => u.find((v) => v.id === m),
    [u, m]
  ), ue = o || (m ? `dm:${m}` : ""), ve = !!(m && !E.has(m));
  U(() => {
    se.current = m;
  }, [m]), U(() => {
    ie.current = r;
  }, [r]);
  const _ = Ee(async (v = !1) => {
    const T = await t.listAgents();
    for (const w of ae.current)
      T.some((M) => M.id === w) || ae.current.delete(w);
    const q = T.filter((w) => !ae.current.has(w.id)), V = se.current, L = q.find((w) => w.id === V), k = W.current.get(V);
    L?.lastMessagePreview && k && !k.messages.some((w) => w.streaming) && _e(k.messages) !== L.lastMessagePreview && (W.current.set(V, { ...k, cachedAt: 0 }), oe((M) => M + 1));
    const C = !!k?.messages.some((w) => w.streaming);
    return h((w) => q.map((M) => {
      const p = w.find((X) => X.id === M.id), x = _e(W.current.get(M.id)?.messages ?? []), z = !!x || M.id === V && C;
      return {
        ...M,
        lastMessagePreview: z ? x || p?.lastMessagePreview : M.lastMessagePreview ?? p?.lastMessagePreview
      };
    })), l((w) => w && q.some((M) => M.id === w) || v ? w : q[0]?.id || ""), q;
  }, [t]), F = Ee(async () => {
    const v = await t.listModelProviders();
    return j(v.providers), v.providers;
  }, [t]);
  return U(() => {
    if (!a) {
      h([]), j([]), l(""), b(""), g([]), O([]), R([]), H(void 0), B("disconnected"), K(!1), Z(void 0);
      return;
    }
    let v = !0;
    return K(!0), Promise.all([_(), F()]).then(() => {
      v && (B("connected"), K(!1));
    }).catch((T) => {
      v && (B("error"), Z(T instanceof Error ? T.message : "Could not load the crew"), K(!1));
    }), () => {
      v = !1;
    };
  }, [a, _, F]), U(() => {
    if (!a) return;
    const v = () => {
      !c.isActive() || !c.isOnline() || _().catch(() => {
      });
    }, T = setInterval(v, Jt), q = c.subscribe(v);
    return () => {
      clearInterval(T), q();
    };
  }, [a, _, c]), U(() => {
    b("");
  }, [m]), U(() => {
    if (!a) return;
    const v = W.current.get(m);
    if (v ? (g(v.messages), O(v.activities), R(v.approvals), H(v.computer), s(v.conversations)) : (g([]), O([]), R([]), H(void 0), s([])), pe(""), !m) return;
    const T = v ? Date.now() - v.cachedAt : Number.POSITIVE_INFINITY;
    if (v && T < We && !o) {
      v.messages.some((k) => k.streaming) && pe(m);
      const L = setTimeout(() => oe((k) => k + 1), We - T);
      return () => clearTimeout(L);
    }
    const q = new AbortController();
    let V = !0;
    return Promise.all([
      t.listConversations(m, q.signal),
      t.listApprovalRequests(m, q.signal),
      t.getComputer(m, q.signal)
    ]).then(async ([L, k, C]) => {
      const w = o ? L.find((f) => f.id === o) ?? L[0] : L[0], M = w ? await t.getConversation(w.id, q.signal) : void 0;
      if (!V || ae.current.has(m)) return;
      const p = W.current.get(m)?.messages ?? [], x = (M?.messages ?? []).map((f) => {
        const I = G.current.get(f.id);
        return I ? { ...f, id: I } : f;
      }), z = p.filter(
        (f) => f.id.startsWith($e) || f.id.startsWith(Ne)
      ), X = [
        ...x,
        ...z.filter((f) => !x.some((I) => I.id === f.id))
      ], ee = _e(X), ge = M?.activities ?? [];
      W.current.set(m, {
        messages: X,
        activities: ge,
        approvals: k,
        conversations: L,
        computer: C,
        cachedAt: Date.now()
      }), D((f) => new Set(f).add(m)), g(X), O(ge), R(k), H(C), s(L), pe(m), ee && h((f) => f.map((I) => I.id === m ? { ...I, lastMessagePreview: ee } : I));
    }).catch((L) => {
      !V || ae.current.has(m) || L instanceof DOMException && L.name === "AbortError" || (W.current.set(m, {
        messages: [],
        activities: [],
        approvals: [],
        conversations: [],
        cachedAt: Date.now()
      }), D((k) => new Set(k).add(m)), g([]), Z(L instanceof Error ? L.message : "Could not load this teammate"));
    }), () => {
      V = !1, q.abort();
    };
  }, [t, a, he, m, o]), U(() => {
    if (!a || !m || P?.status === "online") return;
    let v = !0;
    const T = async () => {
      try {
        const V = await t.getComputer(m);
        if (!v || se.current !== m) return;
        H(V);
        const L = W.current.get(m);
        L && W.current.set(m, { ...L, computer: V });
      } catch {
      }
    }, q = setInterval(() => {
      T();
    }, 2e3);
    return T(), () => {
      v = !1, clearInterval(q);
    };
  }, [t, P?.status, a, m]), U(() => {
    if (!a || !ue || ne !== m) return;
    let v = !0;
    const T = m, q = (k) => {
      const C = W.current.get(T);
      W.current.set(T, {
        messages: C?.messages ?? [],
        activities: C?.activities ?? [],
        approvals: C?.approvals ?? [],
        conversations: C?.conversations ?? [],
        computer: C?.computer,
        cachedAt: Date.now(),
        ...k
      });
    }, V = (k) => g((C) => {
      const w = k(C);
      return q({ messages: w }), w;
    }), L = t.subscribeToConversationEvents(ue, (k) => {
      if (v) {
        if (k.type === "message.created" && V((C) => {
          let w = k.message;
          const M = G.current.get(k.message.id);
          if (M && (w = { ...k.message, id: M }), k.message.role === "user" && !M) {
            const x = new Set(G.current.values()), z = C.find((X) => X.id.startsWith($e) && !x.has(X.id) && Be(X) === Be(k.message));
            z && (G.current.set(k.message.id, z.id), w = { ...k.message, id: z.id });
          }
          if (k.message.role === "agent" && !M) {
            const x = new Set(G.current.values()), z = C.find((X) => X.id.startsWith(Ne) && !x.has(X.id));
            z && (G.current.set(k.message.id, z.id), w = { ...k.message, id: z.id });
          }
          return C.find((x) => x.id === w.id) ? C.map((x) => x.id === w.id ? w : x) : [...C, w];
        }), k.type === "message.delta" && V((C) => {
          let w = G.current.get(k.messageId);
          if (!w) {
            const M = new Set(G.current.values()), p = C.find((x) => x.id.startsWith(Ne) && !M.has(x.id));
            p && (w = p.id, G.current.set(k.messageId, w));
          }
          return w ??= k.messageId, C.some((M) => M.id === w) ? C.map((M) => M.id === w ? {
            ...M,
            parts: M.parts.map((p, x) => x === 0 && p.type === "text" ? { ...p, text: p.text + k.delta } : p)
          } : M) : [...C, {
            id: w,
            conversationId: ue,
            role: "agent",
            parts: [{ type: "text", text: k.delta }],
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            streaming: !0
          }];
        }), k.type === "message.completed") {
          const C = G.current.get(k.messageId) ?? k.messageId;
          k.notify === !1 ? V((w) => w.flatMap((M) => M.id !== C ? [M] : M.id.startsWith(Ne) ? [{
            ...M,
            parts: M.parts.map((p) => p.type === "text" ? { ...p, text: "" } : p),
            streaming: !0
          }] : [])) : (V((w) => {
            const M = w.filter((x) => x.id === C || x.role !== "agent" || !x.streaming).map((x) => x.id === C ? { ...x, streaming: !1 } : x), p = _e(M);
            return p && h((x) => x.map((z) => z.id === T ? { ...z, lastMessagePreview: p } : z)), M;
          }), ie.current?.({
            title: `${me?.name ?? "Your teammate"} finished`,
            body: "There is something new to read."
          }));
        }
        if (k.type === "message.dropped") {
          const C = G.current.get(k.messageId) ?? k.messageId;
          V((w) => w.filter((M) => M.id !== C));
        }
        k.type === "message.updated" && (V((C) => {
          const w = G.current.get(k.message.id), M = w ? { ...k.message, id: w } : k.message, p = C.find((z) => z.id === M.id), x = k.message.role === "agent" && !k.message.streaming ? C.filter((z) => z.id === M.id || z.role !== "agent" || !z.streaming) : C;
          return p ? x.map((z) => z.id === M.id ? M : z) : [...x, M];
        }), k.message.role === "agent" && !k.message.streaming && h((C) => C.map((w) => w.id === T ? { ...w, lastMessagePreview: lt(k.message) || void 0 } : w))), k.type === "approval.updated" && (R((C) => {
          const w = C.some((M) => M.id === k.approval.id) ? C.map((M) => M.id === k.approval.id ? k.approval : M) : [k.approval, ...C];
          return q({ approvals: w }), w;
        }), k.approval.status === "pending" && ie.current?.({
          title: `${me?.name ?? "Your teammate"} needs you`,
          body: k.approval.title
        })), k.type === "activity.updated" && O((C) => {
          const w = C.some((M) => M.id === k.activity.id) ? C.map((M) => M.id === k.activity.id ? k.activity : M) : [...C, k.activity];
          return q({ activities: w }), w;
        }), k.type === "agent.status" && h((C) => C.map((w) => w.id === k.agentId ? { ...w, status: k.status } : w)), k.type === "connection.changed" && B(k.state);
      }
    });
    return () => {
      v = !1, L.unsubscribe();
    };
  }, [t, ue, a, ne, me?.name, m]), {
    agents: u,
    conversations: i,
    modelProviders: S,
    selectedAgent: me,
    selectedAgentId: m,
    setSelectedAgentId: l,
    selectedThreadId: ue,
    setSelectedThreadId: b,
    messages: y,
    activities: d,
    approvals: $,
    computer: P,
    connection: J,
    loading: te,
    conversationLoading: ve,
    error: de,
    refreshAgents: _,
    refreshModelProviders: F,
    dismissError: () => Z(void 0),
    createAgent: async (v) => {
      const T = await t.createAgent(v);
      return await _(!0), l(T.id), T;
    },
    updateAgent: async (v, T) => {
      await t.updateAgent(v, T), await _(!0);
    },
    duplicateAgent: async (v) => {
      const T = await t.duplicateAgent(v);
      await _(!0), l(T.id);
    },
    deleteAgent: async (v) => {
      const T = u.find((C) => C.id === v), q = m;
      if (!T || ae.current.has(v)) return;
      const V = u.findIndex((C) => C.id === v), L = u.filter((C) => C.id !== v), k = q === v ? L[Math.min(Math.max(V, 0), Math.max(L.length - 1, 0))]?.id ?? "" : q;
      ae.current.add(v), h(L), l(k);
      try {
        try {
          await t.deleteAgent(v);
        } catch (C) {
          if (!(C instanceof we && C.code === "not_found")) throw C;
        }
        W.current.delete(v), D((C) => {
          const w = new Set(C);
          return w.delete(v), w;
        }), await _();
      } catch (C) {
        throw ae.current.delete(v), h((w) => {
          if (w.some((p) => p.id === v)) return w;
          const M = [...w];
          return M.splice(Math.min(V, M.length), 0, T), M;
        }), l((w) => w || (q === v ? v : w)), Z(C instanceof Error ? C.message : "Could not remove this teammate"), C;
      }
    },
    sendMessage: async (v) => {
      if (!ue || !m) return;
      const T = m, q = ue, V = `${Date.now()}:${Math.random().toString(36).slice(2)}`, L = `${$e}${V}`, k = `${Ne}${V}`, C = (/* @__PURE__ */ new Date()).toISOString(), w = {
        id: L,
        conversationId: q,
        role: "user",
        parts: [{ type: "text", text: v }],
        createdAt: C
      }, M = {
        id: k,
        conversationId: q,
        role: "agent",
        parts: [{ type: "text", text: "" }],
        createdAt: C,
        streaming: !0
      }, p = W.current.get(T) ?? {
        messages: [],
        activities: [],
        approvals: [],
        conversations: [],
        cachedAt: Date.now()
      }, x = [...p.messages].reverse().find((ee) => ee.role === "agent" && ee.streaming), X = [...x ? p.messages.map((ee) => ee.id === x.id ? { ...ee, streaming: !1, interrupted: !0 } : ee) : p.messages, w, M];
      se.current === T && O([]), W.current.set(T, { ...p, messages: X, activities: [], cachedAt: Date.now() }), se.current === T && (g(X), pe(T));
      try {
        const ee = await t.sendMessage({ conversationId: q, text: v });
        G.current.set(ee.id, L);
        const ge = ee.id.match(/^(.+):user(?:$|:)/)?.[1];
        ge && (G.current.set(`${ge}:user`, L), G.current.set(`${ge}:agent`, x?.id ?? k));
        const f = W.current.get(T) ?? p, I = { ...ee, id: L }, Q = f.messages.map((re) => re.id === L ? I : re).filter((re, ke, kt) => kt.findIndex((Nt) => Nt.id === re.id) === ke);
        W.current.set(T, { ...f, messages: Q, cachedAt: Date.now() }), se.current === T && g(Q);
      } catch (ee) {
        const ge = W.current.get(T) ?? p, f = ge.messages.filter((Q) => Q.id !== k), I = f.some((Q) => Q.id === L) ? f : [...f, w];
        throw W.current.set(T, { ...ge, messages: I, cachedAt: Date.now() }), se.current === T && g(I), x || Z(ee instanceof Error ? ee.message : "Could not send that"), ee;
      }
    },
    respondToApproval: async (v, T, q, V) => {
      const L = m, k = await t.respondToApproval({ requestId: v, decision: T, note: q, contentHash: V }), C = W.current.get(L), w = (C?.approvals ?? []).map((M) => M.id === k.id ? k : M);
      C && W.current.set(L, { ...C, approvals: w, cachedAt: Date.now() }), se.current === L && R(w);
    },
    openComputer: async (v) => {
      if (!m) throw new Error("No teammate is selected");
      try {
        return await (v === "open" ? t.openComputer(m) : t.takeOverComputer(m));
      } catch (T) {
        throw Z(T instanceof Error ? T.message : "Could not open that computer"), T;
      }
    },
    reconnect: async () => {
      B("connecting");
      try {
        await t.reconnect(), await _(), B("connected");
      } catch (v) {
        B("error"), Z(v instanceof Error ? v.message : "Reconnect failed");
      }
    }
  };
}
const Qt = (t) => t.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), dt = (...t) => t.filter((n, a, r) => !!n && n.trim() !== "" && r.indexOf(n) === a).join(" ").trim();
var en = {
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
const tn = He(
  ({
    color: t = "currentColor",
    size: n = 24,
    strokeWidth: a = 2,
    absoluteStrokeWidth: r,
    className: c = "",
    children: u,
    iconNode: h,
    ...m
  }, l) => Ie(
    "svg",
    {
      ref: l,
      ...en,
      width: n,
      height: n,
      stroke: t,
      strokeWidth: r ? Number(a) * 24 / Number(n) : a,
      className: dt("lucide", c),
      ...m
    },
    [
      ...h.map(([o, b]) => Ie(o, b)),
      ...Array.isArray(u) ? u : [u]
    ]
  )
);
const A = (t, n) => {
  const a = He(
    ({ className: r, ...c }, u) => Ie(tn, {
      ref: u,
      iconNode: n,
      className: dt(`lucide-${Qt(t)}`, r),
      ...c
    })
  );
  return a.displayName = `${t}`, a;
};
const nn = A("Archive", [
  ["rect", { width: "20", height: "5", x: "2", y: "3", rx: "1", key: "1wp1u1" }],
  ["path", { d: "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8", key: "1s80jp" }],
  ["path", { d: "M10 12h4", key: "a56b0p" }]
]);
const an = A("ArrowDown", [
  ["path", { d: "M12 5v14", key: "s699le" }],
  ["path", { d: "m19 12-7 7-7-7", key: "1idqje" }]
]);
const rn = A("Ban", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m4.9 4.9 14.2 14.2", key: "1m5liu" }]
]);
const sn = A("BookText", [
  [
    "path",
    {
      d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20",
      key: "k3hazp"
    }
  ],
  ["path", { d: "M8 11h8", key: "vwpz6n" }],
  ["path", { d: "M8 7h6", key: "1f0q6e" }]
]);
const on = A("Bot", [
  ["path", { d: "M12 8V4H8", key: "hb8ula" }],
  ["rect", { width: "16", height: "12", x: "4", y: "8", rx: "2", key: "enze0r" }],
  ["path", { d: "M2 14h2", key: "vft8re" }],
  ["path", { d: "M20 14h2", key: "4cs60a" }],
  ["path", { d: "M15 13v2", key: "1xurst" }],
  ["path", { d: "M9 13v2", key: "rq6x2g" }]
]);
const Me = A("Check", [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]]);
const cn = A("ChevronDown", [
  ["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]
]);
const Re = A("ChevronRight", [
  ["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]
]);
const ln = A("ChevronsRight", [
  ["path", { d: "m6 17 5-5-5-5", key: "xnjwq" }],
  ["path", { d: "m13 17 5-5-5-5", key: "17xmmf" }]
]);
const ze = A("CircleCheck", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
]);
const ut = A("CircleDashed", [
  ["path", { d: "M10.1 2.182a10 10 0 0 1 3.8 0", key: "5ilxe3" }],
  ["path", { d: "M13.9 21.818a10 10 0 0 1-3.8 0", key: "11zvb9" }],
  ["path", { d: "M17.609 3.721a10 10 0 0 1 2.69 2.7", key: "1iw5b2" }],
  ["path", { d: "M2.182 13.9a10 10 0 0 1 0-3.8", key: "c0bmvh" }],
  ["path", { d: "M20.279 17.609a10 10 0 0 1-2.7 2.69", key: "1ruxm7" }],
  ["path", { d: "M21.818 10.1a10 10 0 0 1 0 3.8", key: "qkgqxc" }],
  ["path", { d: "M3.721 6.391a10 10 0 0 1 2.7-2.69", key: "1mcia2" }],
  ["path", { d: "M6.391 20.279a10 10 0 0 1-2.69-2.7", key: "1fvljs" }]
]);
const dn = A("CircleHelp", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3", key: "1u773s" }],
  ["path", { d: "M12 17h.01", key: "p32p05" }]
]);
const mt = A("Clock", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["polyline", { points: "12 6 12 12 16 14", key: "68esgv" }]
]);
const Ue = A("Cloud", [
  ["path", { d: "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z", key: "p7xjir" }]
]);
const un = A("Copy", [
  ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2", key: "17jyea" }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2", key: "zix9uf" }]
]);
const mn = A("CornerDownRight", [
  ["polyline", { points: "15 10 20 15 15 20", key: "1q7qjw" }],
  ["path", { d: "M4 4v7a4 4 0 0 0 4 4h12", key: "z08zvw" }]
]);
const pn = A("Database", [
  ["ellipse", { cx: "12", cy: "5", rx: "9", ry: "3", key: "msslwz" }],
  ["path", { d: "M3 5V19A9 3 0 0 0 21 19V5", key: "1wlel7" }],
  ["path", { d: "M3 12A9 3 0 0 0 21 12", key: "mv7ke4" }]
]);
const hn = A("Download", [
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
  ["polyline", { points: "7 10 12 15 17 10", key: "2ggqvy" }],
  ["line", { x1: "12", x2: "12", y1: "15", y2: "3", key: "1vk2je" }]
]);
const fn = A("Earth", [
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
const gn = A("Ellipsis", [
  ["circle", { cx: "12", cy: "12", r: "1", key: "41hilf" }],
  ["circle", { cx: "19", cy: "12", r: "1", key: "1wjl8i" }],
  ["circle", { cx: "5", cy: "12", r: "1", key: "1pcz8c" }]
]);
const yn = A("Eye", [
  [
    "path",
    {
      d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
      key: "1nclc0"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }]
]);
const vn = A("FileCode2", [
  ["path", { d: "M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4", key: "1pf5j1" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "m5 12-3 3 3 3", key: "oke12k" }],
  ["path", { d: "m9 18 3-3-3-3", key: "112psh" }]
]);
const En = A("FileSpreadsheet", [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "M8 13h2", key: "yr2amv" }],
  ["path", { d: "M14 13h2", key: "un5t4a" }],
  ["path", { d: "M8 17h2", key: "2yhykz" }],
  ["path", { d: "M14 17h2", key: "10kma7" }]
]);
const be = A("FileText", [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "M10 9H8", key: "b1mrlr" }],
  ["path", { d: "M16 13H8", key: "t4e002" }],
  ["path", { d: "M16 17H8", key: "z1uh3a" }]
]);
const pt = A("File", [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }]
]);
const wn = A("Globe", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20", key: "13o1zl" }],
  ["path", { d: "M2 12h20", key: "9i4pu4" }]
]);
const Ge = A("Hand", [
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
const bn = A("Hourglass", [
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
const kn = A("Image", [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2", key: "1m3agn" }],
  ["circle", { cx: "9", cy: "9", r: "2", key: "af1f0g" }],
  ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21", key: "1xmnt7" }]
]);
const Ke = A("KeyRound", [
  [
    "path",
    {
      d: "M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z",
      key: "1s6t7t"
    }
  ],
  ["circle", { cx: "16.5", cy: "7.5", r: ".5", fill: "currentColor", key: "w0ekpg" }]
]);
const Te = A("LoaderCircle", [
  ["path", { d: "M21 12a9 9 0 1 1-6.219-8.56", key: "13zald" }]
]);
const Nn = A("Lock", [
  ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2", key: "1w4ew1" }],
  ["path", { d: "M7 11V7a5 5 0 0 1 10 0v4", key: "fwvmzm" }]
]);
const Sn = A("Mail", [
  ["rect", { width: "20", height: "16", x: "2", y: "4", rx: "2", key: "18n3k1" }],
  ["path", { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7", key: "1ocrg3" }]
]);
const Cn = A("Maximize2", [
  ["polyline", { points: "15 3 21 3 21 9", key: "mznyad" }],
  ["polyline", { points: "9 21 3 21 3 15", key: "1avn1i" }],
  ["line", { x1: "21", x2: "14", y1: "3", y2: "10", key: "ota7mn" }],
  ["line", { x1: "3", x2: "10", y1: "21", y2: "14", key: "1atl0r" }]
]);
const Mn = A("MessageSquare", [
  ["path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", key: "1lielz" }]
]);
const Tn = A("Minimize2", [
  ["polyline", { points: "4 14 10 14 10 20", key: "11kfnr" }],
  ["polyline", { points: "20 10 14 10 14 4", key: "rlmsce" }],
  ["line", { x1: "14", x2: "21", y1: "10", y2: "3", key: "o5lafz" }],
  ["line", { x1: "3", x2: "10", y1: "21", y2: "14", key: "1atl0r" }]
]);
const ht = A("Monitor", [
  ["rect", { width: "20", height: "14", x: "2", y: "3", rx: "2", key: "48i651" }],
  ["line", { x1: "8", x2: "16", y1: "21", y2: "21", key: "1svkeh" }],
  ["line", { x1: "12", x2: "12", y1: "17", y2: "21", key: "vw1qmm" }]
]);
const _n = A("Pencil", [
  [
    "path",
    {
      d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
      key: "1a8usu"
    }
  ],
  ["path", { d: "m15 5 4 4", key: "1mk7zo" }]
]);
const Ae = A("Plus", [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "M12 5v14", key: "s699le" }]
]);
const xn = A("Presentation", [
  ["path", { d: "M2 3h20", key: "91anmk" }],
  ["path", { d: "M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3", key: "2k9sn8" }],
  ["path", { d: "m7 21 5-5 5 5", key: "bip4we" }]
]);
const In = A("RefreshCw", [
  ["path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8", key: "v9h5vc" }],
  ["path", { d: "M21 3v5h-5", key: "1q7to0" }],
  ["path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16", key: "3uifl3" }],
  ["path", { d: "M8 16H3v5", key: "1cv678" }]
]);
const Rn = A("RotateCcw", [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }]
]);
const Fe = A("Search", [
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
  ["path", { d: "m21 21-4.3-4.3", key: "1qie3q" }]
]);
const Ye = A("Settings2", [
  ["path", { d: "M20 7h-9", key: "3s1dr2" }],
  ["path", { d: "M14 17H5", key: "gfn3mx" }],
  ["circle", { cx: "17", cy: "17", r: "3", key: "18b49y" }],
  ["circle", { cx: "7", cy: "7", r: "3", key: "dfmy0x" }]
]);
const qe = A("ShieldAlert", [
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
const An = A("ShieldCheck", [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      key: "oel41y"
    }
  ],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
]);
const On = A("ShieldX", [
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
const Dn = A("Terminal", [
  ["polyline", { points: "4 17 10 11 4 5", key: "akl6gq" }],
  ["line", { x1: "12", x2: "20", y1: "19", y2: "19", key: "q2wloq" }]
]);
const Ve = A("Trash2", [
  ["path", { d: "M3 6h18", key: "d0wm0j" }],
  ["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", key: "4alrt4" }],
  ["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2", key: "v07s0e" }],
  ["line", { x1: "10", x2: "10", y1: "11", y2: "17", key: "1uufr5" }],
  ["line", { x1: "14", x2: "14", y1: "11", y2: "17", key: "xtxkd" }]
]);
const Oe = A("TriangleAlert", [
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
const Pn = A("User", [
  ["path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", key: "975kel" }],
  ["circle", { cx: "12", cy: "7", r: "4", key: "17ys0d" }]
]);
const ft = A("Users", [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }],
  ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }],
  ["path", { d: "M16 3.13a4 4 0 0 1 0 7.75", key: "1da9ce" }]
]);
const $n = A("X", [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
]);
function Ln(t) {
  let n = 0;
  for (let a = 0; a < t.length; a += 1) n = (n * 31 + t.charCodeAt(a)) % 360;
  return n;
}
function gt({ agent: t, size: n = 36 }) {
  const a = Ln(t.id || t.name);
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
        background: `hsl(${a} 62% 46% / 0.16)`,
        color: `hsl(${a} 62% 46%)`
      }
    },
    t.avatar || t.name.trim().slice(0, 1).toUpperCase()
  );
}
const zn = Pe(async () => ({ default: (await import("./chunk-mermaid-HWGCJPDP-CLfmBW3m.js").then((t) => t.i)).Streamdown })), Xe = {
  working: "Working",
  idle: "Idle",
  waiting_for_approval: "Needs you",
  offline: "No profile"
};
function Un({
  agents: t,
  sections: n,
  rooms: a,
  selectedAgentId: r,
  selectedThreadId: c,
  search: u,
  onSearch: h,
  onSelectAgent: m,
  onSelectThread: l,
  onAction: o,
  onCreate: b,
  onToggleSection: i,
  view: s = "chat",
  onChangeView: y
}) {
  const [g, d] = N();
  U(() => {
    if (!g) return;
    const S = () => d(void 0);
    return window.addEventListener("pointerdown", S), () => window.removeEventListener("pointerdown", S);
  }, [g]);
  const O = (S, j) => {
    d(void 0), o(S, j);
  }, $ = u.trim().toLowerCase(), R = (S) => !$ || `${S.name} ${S.role}`.toLowerCase().includes($), P = fe(() => new Map(t.map((S) => [S.id, S])), [t]), H = n.map((S) => ({
    section: S,
    members: S.bot_ids.map((j) => P.get(j)).filter((j) => !!j && R(j))
  })).filter((S) => S.members.length > 0), J = !$ && H.length > 1, B = (S) => /* @__PURE__ */ e.createElement(
    "div",
    {
      key: S.id,
      className: `agent-row ${r === S.id && !c.startsWith("group:") ? "selected" : ""} ${S.status === "working" ? "is-working" : ""}`
    },
    /* @__PURE__ */ e.createElement("button", { className: "agent-select", onClick: () => m(S.id) }, /* @__PURE__ */ e.createElement(gt, { agent: S }), /* @__PURE__ */ e.createElement("span", { className: "agent-copy" }, /* @__PURE__ */ e.createElement("strong", null, /* @__PURE__ */ e.createElement("span", null, S.name), /* @__PURE__ */ e.createElement("span", { className: `agent-status ${S.status}`, title: Xe[S.status], "aria-label": Xe[S.status] })), S.workingOn ? /* @__PURE__ */ e.createElement("span", { className: "agent-preview agent-working-on" }, S.workingOn) : S.lastMessagePreview && /* @__PURE__ */ e.createElement("span", { className: "agent-preview agent-preview-entering" }, /* @__PURE__ */ e.createElement(De, { fallback: S.lastMessagePreview }, /* @__PURE__ */ e.createElement(zn, { className: "agent-preview-markdown", mode: "static", controls: !1, linkSafety: { enabled: !0 }, skipHtml: !0 }, S.lastMessagePreview))))),
    /* @__PURE__ */ e.createElement(
      "button",
      {
        className: "agent-more",
        "aria-label": `More actions for ${S.name}`,
        onPointerDown: (j) => j.stopPropagation(),
        onClick: () => d((j) => j === S.id ? void 0 : S.id)
      },
      /* @__PURE__ */ e.createElement(gn, { size: 15 })
    ),
    g === S.id && /* @__PURE__ */ e.createElement("div", { className: "agent-menu", role: "menu", onPointerDown: (j) => j.stopPropagation() }, /* @__PURE__ */ e.createElement("button", { role: "menuitem", onClick: () => O(S, "edit") }, /* @__PURE__ */ e.createElement(_n, { size: 13 }), " Edit"), /* @__PURE__ */ e.createElement("button", { role: "menuitem", onClick: () => O(S, "duplicate") }, /* @__PURE__ */ e.createElement(un, { size: 13 }), " Duplicate"), /* @__PURE__ */ e.createElement("div", null), /* @__PURE__ */ e.createElement("button", { role: "menuitem", className: "danger-text", onClick: () => O(S, "delete") }, /* @__PURE__ */ e.createElement(Ve, { size: 13 }), " Remove from crew"))
  );
  return /* @__PURE__ */ e.createElement("aside", { className: "agent-sidebar" }, /* @__PURE__ */ e.createElement("div", { className: "sidebar-titlebar" }, /* @__PURE__ */ e.createElement("span", { className: "sidebar-title" }, "Crew"), /* @__PURE__ */ e.createElement("button", { className: "brand-add", "aria-label": "Hire a teammate", onClick: b }, /* @__PURE__ */ e.createElement(Ae, { size: 18 }))), y && /* @__PURE__ */ e.createElement("div", { className: "sidebar-views", role: "tablist", "aria-label": "Workspace view" }, /* @__PURE__ */ e.createElement(
    "button",
    {
      role: "tab",
      "aria-selected": s === "chat",
      className: s === "chat" ? "is-current" : "",
      onClick: () => y("chat")
    },
    /* @__PURE__ */ e.createElement(Mn, { size: 13 }),
    " Threads"
  ), /* @__PURE__ */ e.createElement(
    "button",
    {
      role: "tab",
      "aria-selected": s === "spaces",
      className: s === "spaces" ? "is-current" : "",
      onClick: () => y("spaces")
    },
    /* @__PURE__ */ e.createElement(sn, { size: 13 }),
    " Documents"
  )), /* @__PURE__ */ e.createElement("label", { className: "search" }, /* @__PURE__ */ e.createElement(Fe, { size: 15 }), /* @__PURE__ */ e.createElement("input", { "aria-label": "Search the crew", placeholder: "Search your crew", value: u, onChange: (S) => h(S.target.value) })), /* @__PURE__ */ e.createElement("div", { className: "agent-list" }, t.length === 0 && /* @__PURE__ */ e.createElement("div", { className: "agent-list-empty" }, "No teammates yet"), t.length > 0 && H.length === 0 && /* @__PURE__ */ e.createElement("div", { className: "agent-list-empty" }, "No teammates found"), J ? H.map(({ section: S, members: j }) => /* @__PURE__ */ e.createElement("section", { className: "agent-section", key: S.id }, /* @__PURE__ */ e.createElement(
    "button",
    {
      className: `agent-section-header ${S.collapsed ? "is-collapsed" : ""}`,
      "aria-expanded": !S.collapsed,
      onClick: () => i(S.id, !S.collapsed)
    },
    /* @__PURE__ */ e.createElement(Re, { size: 13, className: "agent-section-chevron" }),
    /* @__PURE__ */ e.createElement("span", null, S.name),
    /* @__PURE__ */ e.createElement("small", null, j.length)
  ), !S.collapsed && j.map(B))) : H.flatMap((S) => S.members).map(B), a.length > 0 && /* @__PURE__ */ e.createElement("section", { className: "agent-section", key: "__rooms__" }, /* @__PURE__ */ e.createElement("div", { className: "agent-section-header is-static" }, /* @__PURE__ */ e.createElement("span", null, "Rooms"), /* @__PURE__ */ e.createElement("small", null, a.length)), a.map((S) => /* @__PURE__ */ e.createElement("div", { key: S.id, className: `agent-row ${c === S.id ? "selected" : ""}` }, /* @__PURE__ */ e.createElement("button", { className: "agent-select", onClick: () => l(S.id) }, /* @__PURE__ */ e.createElement("span", { className: "agent-avatar", role: "img", "aria-label": `${S.title} room` }, S.emoji || "👥"), /* @__PURE__ */ e.createElement("span", { className: "agent-copy" }, /* @__PURE__ */ e.createElement("strong", null, /* @__PURE__ */ e.createElement("span", null, S.title)), /* @__PURE__ */ e.createElement("span", { className: "agent-preview" }, S.lastMessagePreview || S.subtitle))))))));
}
function qn({
  open: t,
  agents: n,
  rooms: a,
  onClose: r,
  onSelectAgent: c,
  onSelectThread: u,
  onCreateAgent: h,
  onComputer: m
}) {
  const [l, o] = N(""), b = Y(null);
  U(() => {
    t && (o(""), window.setTimeout(() => b.current?.focus(), 0));
  }, [t]);
  const s = fe(() => [
    { id: "create", label: "Hire a teammate", detail: "Add someone to the crew", icon: Ae, run: h },
    { id: "computer", label: "Open their computer", detail: "The current teammate's screen", icon: ht, run: m },
    ...n.map((g) => ({
      id: `agent-${g.id}`,
      label: g.name,
      detail: `${g.role} · ${g.status.replaceAll("_", " ")}`,
      icon: on,
      run: () => c(g.id)
    })),
    ...a.map((g) => ({
      id: `room-${g.id}`,
      label: g.title,
      detail: g.subtitle || "Room",
      icon: ft,
      run: () => u(g.id)
    }))
  ], [n, a, m, h, c, u]).filter((g) => `${g.label} ${g.detail}`.toLowerCase().includes(l.toLowerCase()));
  if (!t) return null;
  const y = (g) => {
    g.run(), r();
  };
  return /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "palette-backdrop",
      role: "presentation",
      onMouseDown: (g) => {
        g.target === g.currentTarget && r();
      }
    },
    /* @__PURE__ */ e.createElement("section", { className: "command-palette", role: "dialog", "aria-modal": "true", "aria-label": "Command palette" }, /* @__PURE__ */ e.createElement("label", null, /* @__PURE__ */ e.createElement(Fe, { size: 17 }), /* @__PURE__ */ e.createElement(
      "input",
      {
        ref: b,
        "aria-label": "Search the crew and commands",
        placeholder: "Search your crew…",
        value: l,
        onChange: (g) => o(g.target.value),
        onKeyDown: (g) => {
          g.key === "Escape" && r(), g.key === "Enter" && s[0] && y(s[0]);
        }
      }
    ), /* @__PURE__ */ e.createElement("kbd", null, "esc")), /* @__PURE__ */ e.createElement("div", { className: "palette-results" }, s.length ? s.map((g, d) => {
      const O = g.icon;
      return /* @__PURE__ */ e.createElement("button", { key: g.id, className: d === 0 ? "active" : "", onClick: () => y(g) }, /* @__PURE__ */ e.createElement("span", null, /* @__PURE__ */ e.createElement(O, { size: 16 })), /* @__PURE__ */ e.createElement("div", null, /* @__PURE__ */ e.createElement("strong", null, g.label), /* @__PURE__ */ e.createElement("small", null, g.detail)), d === 0 && /* @__PURE__ */ e.createElement("kbd", null, "↵"));
    }) : /* @__PURE__ */ e.createElement("p", null, "Nothing matches that")), /* @__PURE__ */ e.createElement("footer", null, /* @__PURE__ */ e.createElement("span", null, "Crew"), /* @__PURE__ */ e.createElement("span", null, /* @__PURE__ */ e.createElement("kbd", null, "⌘"), /* @__PURE__ */ e.createElement("kbd", null, "K"), " to open")))
  );
}
const Hn = /(?<![\w.-])@([\w一-鿿][\w一-鿿-]{0,63})/g;
function Se(t) {
  return t.replace(/[\s_-]+/g, "").trim().toLowerCase();
}
function jn(t, n, a) {
  if (!n?.length || !t) return [{ text: t }];
  const r = /* @__PURE__ */ new Map();
  for (const h of n) r.has(Se(h)) || r.set(Se(h), h);
  for (const h of a)
    n.includes(h.id) && (r.has(Se(h.name)) || r.set(Se(h.name), h.id));
  const c = [];
  let u = 0;
  for (const h of t.matchAll(Hn)) {
    const m = r.get(Se(h[1]));
    !m || h.index === void 0 || (h.index > u && c.push({ text: t.slice(u, h.index) }), c.push({ text: h[0], agentId: m }), u = h.index + h[0].length);
  }
  return u < t.length && c.push({ text: t.slice(u) }), c.length ? c : [{ text: t }];
}
function ye({ label: t, kind: n = "", children: a }) {
  return /* @__PURE__ */ e.createElement("div", { className: `crew-chip ${n}` }, t && /* @__PURE__ */ e.createElement("div", { className: "crew-chip-label" }, t), a);
}
function Fn({ turnId: t, handlers: n }) {
  const [a, r] = N(!1), [c, u] = N(null), [h, m] = N(""), [l, o] = N("");
  async function b() {
    if (r((s) => !s), c === null)
      try {
        u(await n.loadEffects(t));
      } catch {
        m("Could not load what changed.");
      }
  }
  async function i(s) {
    o(s.id);
    try {
      await n.undoEffect(s.id), u(await n.loadEffects(t));
    } catch {
      m("Could not undo that.");
    } finally {
      o("");
    }
  }
  return t ? /* @__PURE__ */ e.createElement("div", { className: "crew-changed" }, /* @__PURE__ */ e.createElement("button", { type: "button", className: "crew-changed-toggle", onClick: () => {
    b();
  } }, "What changed"), a && /* @__PURE__ */ e.createElement("div", { className: "crew-changed-list" }, h && /* @__PURE__ */ e.createElement("div", { className: "crew-changed-problem" }, h), c?.length === 0 && !h && /* @__PURE__ */ e.createElement("div", { className: "crew-changed-empty" }, "Nothing outside this conversation."), (c ?? []).map((s) => /* @__PURE__ */ e.createElement(
    "div",
    {
      className: `crew-changed-line${s.undone_at ? " is-undone" : ""}`,
      key: s.id || s.text
    },
    /* @__PURE__ */ e.createElement("span", { className: "crew-changed-kind" }, s.kind),
    /* @__PURE__ */ e.createElement("span", { className: "crew-changed-text" }, s.text),
    s.undoable && /* @__PURE__ */ e.createElement(
      "button",
      {
        type: "button",
        className: "crew-changed-undo",
        disabled: l === s.id,
        onClick: () => {
          i(s);
        }
      },
      l === s.id ? "Undoing…" : "Undo"
    ),
    s.undone_at ? /* @__PURE__ */ e.createElement("span", { className: "crew-changed-undone" }, "undone") : null
  )))) : null;
}
function Vn(t) {
  return !Number.isFinite(t) || t < 1 ? "just now" : t < 24 ? `${Math.floor(t)}h` : `${Math.floor(t / 24)}d`;
}
function Bn({ payload: t, handlers: n }) {
  const [a, r] = N(""), [c, u] = N(""), [h, m] = N([]), l = t.items ?? [], o = t.could_not ?? [];
  async function b(i) {
    if (i.ref) {
      r(i.subject), u("");
      try {
        await n.onResumeRoutine(i.ref.id), m((s) => [...s, i.subject]);
      } catch (s) {
        u(s instanceof Error ? s.message : "Could not resume that.");
      } finally {
        r("");
      }
    }
  }
  return /* @__PURE__ */ e.createElement(ye, { kind: "standstill", label: "Still waiting" }, l.map((i) => /* @__PURE__ */ e.createElement("div", { className: "crew-stuck-line", key: i.subject }, /* @__PURE__ */ e.createElement("span", { className: "crew-stuck-age" }, Vn(i.stuck_for_hours)), /* @__PURE__ */ e.createElement("span", { className: "crew-stuck-summary" }, i.summary), i.kind === "routine_suspended" && i.ref && (h.includes(i.subject) ? /* @__PURE__ */ e.createElement("span", { className: "crew-stuck-done" }, "resumed") : /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "crew-stuck-action",
      disabled: a === i.subject,
      onClick: () => {
        b(i);
      }
    },
    a === i.subject ? "Resuming…" : "Resume"
  )), i.ref && i.ref.kind !== "task" && i.kind !== "routine_suspended" && /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "crew-stuck-open",
      onClick: n.onOpenDetails
    },
    "Open"
  ))), c && /* @__PURE__ */ e.createElement("div", { className: "crew-stuck-gap" }, c), o.map((i) => /* @__PURE__ */ e.createElement("div", { className: "crew-stuck-gap", key: i.source }, "Could not check ", i.source, " — ", i.why)), t.spoke === !1 && /* @__PURE__ */ e.createElement("div", { className: "crew-stuck-quiet" }, "I could not write this up, so here it is as I found it."));
}
function Wn({ payload: t, turnId: n, handlers: a }) {
  return /* @__PURE__ */ e.createElement(ye, { kind: "report" }, (t.lines ?? []).map((r, c) => /* @__PURE__ */ e.createElement("div", { className: "crew-report-line", key: c }, /* @__PURE__ */ e.createElement("span", { className: "crew-report-check" }, /* @__PURE__ */ e.createElement(Me, { size: 13 })), /* @__PURE__ */ e.createElement("span", { className: "crew-report-system" }, r.system), /* @__PURE__ */ e.createElement("span", { className: "crew-report-arrow" }, "→"), /* @__PURE__ */ e.createElement("span", null, r.result, r.count && /* @__PURE__ */ e.createElement("span", { className: "crew-report-count" }, " · ", r.count)))), t.closing && /* @__PURE__ */ e.createElement("div", { className: "crew-report-closing" }, t.closing), n && /* @__PURE__ */ e.createElement(Fn, { turnId: n, handlers: a }));
}
function Gn({ payload: t, onDecide: n }) {
  const a = t.status === "approved" || t.status === "discarded";
  return /* @__PURE__ */ e.createElement("div", { className: `crew-chip approval ${a ? "resolved" : ""}` }, /* @__PURE__ */ e.createElement("div", { className: "crew-chip-label" }, /* @__PURE__ */ e.createElement(qe, { size: 13 }), " ", a ? "Decided" : "Needs you"), /* @__PURE__ */ e.createElement("div", { className: "crew-approval-action" }, t.action), t.detail && /* @__PURE__ */ e.createElement("div", { className: "crew-approval-detail" }, t.detail), a ? /* @__PURE__ */ e.createElement("div", { className: "crew-approval-outcome" }, t.status === "approved" ? "Approved" : "Discarded") : /* @__PURE__ */ e.createElement("div", { className: "crew-approval-buttons" }, /* @__PURE__ */ e.createElement("button", { className: "crew-btn danger", onClick: () => n(String(t.approval_id), "deny") }, "Discard"), /* @__PURE__ */ e.createElement("button", { className: "crew-btn primary", onClick: () => n(String(t.approval_id), "allow") }, "Approve")));
}
function Kn({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ye, { label: "You decided" }, /* @__PURE__ */ e.createElement("div", { className: "crew-approval-action" }, t.action), /* @__PURE__ */ e.createElement("div", { className: "crew-approval-outcome" }, t.status === "approved" ? "Approved" : "Discarded"));
}
function Yn({ payload: t }) {
  return t.proposal ? /* @__PURE__ */ e.createElement(ye, { label: t.kind === "conflicting" ? "Rules disagree" : "Rule may be stale" }, /* @__PURE__ */ e.createElement("div", { className: "crew-memory-note" }, t.note), /* @__PURE__ */ e.createElement("ul", { className: "crew-memory-entries" }, (t.entries || []).map((n, a) => /* @__PURE__ */ e.createElement("li", { key: a }, n))), t.why && /* @__PURE__ */ e.createElement("div", { className: "crew-memory-why" }, t.why)) : t.tidied ? /* @__PURE__ */ e.createElement(ye, { label: "Memory tidied" }, /* @__PURE__ */ e.createElement("div", { className: "crew-memory-note" }, t.note)) : /* @__PURE__ */ e.createElement(ye, { label: "Memory updated" }, /* @__PURE__ */ e.createElement("div", { className: "crew-memory-rule" }, t.rule), t.diff && /* @__PURE__ */ e.createElement("pre", { className: "crew-memory-diff" }, t.diff));
}
function Xn({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ye, { label: "Routine created" }, /* @__PURE__ */ e.createElement("div", { className: "crew-routine-name" }, /* @__PURE__ */ e.createElement(mt, { size: 13 }), " ", t.name), /* @__PURE__ */ e.createElement("div", { className: "crew-routine-when" }, t.human || t.cron));
}
function Jn({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ye, { label: `Handed over by @${t.from_name || t.from || "a teammate"}` }, /* @__PURE__ */ e.createElement("div", { className: "crew-botref-body" }, /* @__PURE__ */ e.createElement(mn, { size: 13 }), " ", t.content));
}
function Zn({ payload: t, onOpenScreen: n, onSubmitSecret: a }) {
  const [r, c] = N(""), [u, h] = N(""), m = t.filled ? "sent" : u;
  if (t.field && t.ref) {
    const l = t.ref, o = async () => {
      if (r) {
        h("sending");
        try {
          await a(l, r), c(""), h("sent");
        } catch {
          c(""), h("failed");
        }
      }
    };
    return /* @__PURE__ */ e.createElement(ye, { label: "Needs one thing from you" }, /* @__PURE__ */ e.createElement("div", { className: "crew-login-site" }, /* @__PURE__ */ e.createElement(Ke, { size: 13 }), " The ", t.field, " for ", t.site || "a site"), t.why && /* @__PURE__ */ e.createElement("div", { className: "crew-login-why" }, t.why), m === "sent" ? /* @__PURE__ */ e.createElement("div", { className: "crew-login-why" }, "Typed into the page. ", t.site, " should move on now.") : /* @__PURE__ */ e.createElement("form", { className: "crew-secret-row", onSubmit: (b) => {
      b.preventDefault(), o();
    } }, /* @__PURE__ */ e.createElement(
      "input",
      {
        type: "password",
        autoComplete: "off",
        placeholder: t.field,
        value: r,
        onChange: (b) => c(b.target.value)
      }
    ), /* @__PURE__ */ e.createElement("button", { className: "crew-btn", type: "submit", disabled: !r || m === "sending" }, m === "sending" ? "Typing…" : "Type it in")), m === "failed" && /* @__PURE__ */ e.createElement("div", { className: "crew-login-why" }, "That did not reach the screen — nothing was typed. Try taking the wheel instead."));
  }
  return /* @__PURE__ */ e.createElement(ye, { label: "Needs you at the keyboard" }, /* @__PURE__ */ e.createElement("div", { className: "crew-login-site" }, /* @__PURE__ */ e.createElement(Ke, { size: 13 }), " Sign in to ", t.site || "a site"), t.why && /* @__PURE__ */ e.createElement("div", { className: "crew-login-why" }, t.why), /* @__PURE__ */ e.createElement("button", { className: "crew-btn", onClick: n }, "Take the wheel"));
}
function Qn({ payload: t, screenshotUrl: n }) {
  const a = t.url ?? (t.bot_id && t.file ? n(t.bot_id, t.file) : void 0);
  return a ? /* @__PURE__ */ e.createElement("figure", { className: "crew-shot" }, /* @__PURE__ */ e.createElement("img", { src: a, alt: t.caption || "the teammate's screen", loading: "lazy" }), t.caption && /* @__PURE__ */ e.createElement("figcaption", null, t.caption)) : null;
}
function ea({ kind: t, payload: n, turnId: a, handlers: r }) {
  const c = n ?? {};
  switch (t) {
    case "report":
      return /* @__PURE__ */ e.createElement(Wn, { payload: c, turnId: a, handlers: r });
    case "standstill":
      return /* @__PURE__ */ e.createElement(Bn, { payload: c, handlers: r });
    case "approval_request":
      return /* @__PURE__ */ e.createElement(Gn, { payload: c, onDecide: r.onDecide });
    case "approval_resolved":
      return /* @__PURE__ */ e.createElement(Kn, { payload: c });
    case "memory_updated":
      return /* @__PURE__ */ e.createElement(Yn, { payload: c });
    case "routine_created":
      return /* @__PURE__ */ e.createElement(Xn, { payload: c });
    case "bot_ref":
      return /* @__PURE__ */ e.createElement(Jn, { payload: c });
    case "login_request":
      return /* @__PURE__ */ e.createElement(Zn, { payload: c, onOpenScreen: r.onOpenScreen, onSubmitSecret: r.onSubmitSecret });
    case "screenshot":
      return /* @__PURE__ */ e.createElement(Qn, { payload: c, screenshotUrl: r.screenshotUrl });
    default:
      return null;
  }
}
const ta = Pe(async () => ({ default: (await import("./chunk-mermaid-HWGCJPDP-CLfmBW3m.js").then((t) => t.i)).Streamdown })), na = {
  browser: fn,
  terminal: Dn,
  file: be,
  handoff: Ue,
  status: Ue
};
function aa(t) {
  return t.parts.filter((n) => n.type === "text").map((n) => n.text).join("");
}
const ra = (t) => {
  const n = Math.max(0, Math.floor(t / 1e3)), a = Math.floor(n / 60);
  return a ? `${a}m ${n % 60}s` : `${n}s`;
};
function sa() {
  return /* @__PURE__ */ e.createElement("svg", { "aria-hidden": "true", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ e.createElement("path", { d: "m5 12 7-7 7 7" }), /* @__PURE__ */ e.createElement("path", { d: "M12 19V5" }));
}
function oa() {
  return /* @__PURE__ */ e.createElement("svg", { className: "stop-icon", "aria-hidden": "true", viewBox: "0 0 24 24" }, /* @__PURE__ */ e.createElement("rect", { x: "7.5", y: "7.5", width: "9", height: "9", rx: "1.5", fill: "currentColor" }));
}
function ia(t) {
  if (!(t.target instanceof Element)) return;
  const n = t.target.closest("a[href]");
  if (!(!n || !t.currentTarget.contains(n)))
    try {
      const a = new URL(n.href);
      if (a.protocol !== "http:" && a.protocol !== "https:") return;
      t.preventDefault(), window.open(a.toString(), "_blank", "noopener,noreferrer");
    } catch {
    }
}
function ca({ agent: t, label: n, activities: a, startedAt: r }) {
  const [c, u] = N(0), [h, m] = N(!1);
  return U(() => {
    u(Date.now());
    const l = window.setInterval(() => u(Date.now()), 1e3);
    return () => window.clearInterval(l);
  }, []), /* @__PURE__ */ e.createElement("details", { className: "agent-working-details", open: h }, /* @__PURE__ */ e.createElement(
    "summary",
    {
      role: "status",
      "aria-label": `${t?.name ?? "This teammate"} is working: ${n}`,
      onClick: (l) => {
        l.preventDefault(), m((o) => !o);
      }
    },
    /* @__PURE__ */ e.createElement("span", { className: "agent-working-progress" }, "Working for ", ra(c - Date.parse(r))),
    /* @__PURE__ */ e.createElement(Re, { className: "agent-working-chevron", size: 15 })
  ), a.length > 0 && /* @__PURE__ */ e.createElement("div", { className: "agent-working-tools" }, a.map((l) => {
    const o = na[l.kind] ?? Ue;
    return /* @__PURE__ */ e.createElement("details", { className: `agent-tool-detail ${l.status}`, key: l.id }, /* @__PURE__ */ e.createElement("summary", null, /* @__PURE__ */ e.createElement(o, { size: 14 }), /* @__PURE__ */ e.createElement("span", null, l.title), /* @__PURE__ */ e.createElement(Re, { size: 13 })), /* @__PURE__ */ e.createElement("div", null, l.output ?? (l.status === "running" ? "Waiting for result…" : "No output")));
  })));
}
function la({
  message: t,
  agent: n,
  senderName: a,
  activities: r,
  chips: c,
  entering: u = !1,
  room: h = []
}) {
  const m = aa(t), l = Y(null), o = Y(!!t.streaming), b = r.filter((d) => d.conversationId === t.conversationId), i = [...b].reverse().find((d) => d.status === "running") ?? b.at(-1), s = t.role === "agent" && !!t.streaming, y = m.trim() || i?.title || "Working", g = t.parts.filter((d) => d.type === "chip");
  return je(() => {
    const d = l.current, O = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (d && t.role === "agent" && o.current && !t.streaming && !O) {
      const $ = d.querySelector(".message-body");
      $ && typeof $.animate == "function" && $.animate(
        [{ opacity: 0, transform: "translate3d(-6px,4px,0)" }, { opacity: 1, transform: "translate3d(0,0,0)" }],
        { duration: 260, easing: "cubic-bezier(.2,.82,.3,1)" }
      );
    }
    o.current = !!t.streaming;
  }, [u, t.role, t.streaming]), /* @__PURE__ */ e.createElement("div", { className: `message ${t.role} ${u ? "message-entering" : ""}`, ref: l }, t.interrupted && /* @__PURE__ */ e.createElement("div", { className: "agent-interrupted" }, "Interrupted"), a && t.role === "agent" && /* @__PURE__ */ e.createElement("div", { className: "message-sender" }, a), !s && (m || t.streaming && !g.length) && /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "message-body",
      onClick: t.role === "agent" ? ia : void 0
    },
    t.role === "agent" ? /* @__PURE__ */ e.createElement(De, { fallback: /* @__PURE__ */ e.createElement("span", { className: "agent-markdown-fallback" }, m) }, /* @__PURE__ */ e.createElement(
      ta,
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
      m
    )) : jn(m, t.mentions, h).map((d, O) => d.agentId ? /* @__PURE__ */ e.createElement("mark", { key: O, className: "mention", title: `Asked ${h.find(($) => $.id === d.agentId)?.name ?? d.agentId} directly` }, d.text) : /* @__PURE__ */ e.createElement("span", { key: O }, d.text))
  ), s && /* @__PURE__ */ e.createElement(
    ca,
    {
      agent: n,
      label: y,
      activities: b,
      startedAt: t.createdAt
    }
  ), g.map((d, O) => /* @__PURE__ */ e.createElement(
    ea,
    {
      key: `${t.id}:${O}`,
      kind: d.kind,
      payload: d.payload,
      turnId: d.turnId,
      handlers: c
    }
  )));
}
function da({
  agent: t,
  thread: n,
  agentsById: a,
  messages: r,
  activities: c,
  chips: u,
  loading: h = !1,
  focusRequest: m = 0,
  draft: l,
  onSend: o,
  onToggleDetails: b
}) {
  const [i, s] = N(""), [y, g] = N(!1), [d, O] = N(!1), [$, R] = N(!1), [P, H] = N(!1), J = Y(null), B = Y(null), S = Y(null), j = Y(!1), te = Y(!0), K = Y(!1), de = Y(0), Z = Y(0), E = Y(void 0), D = Y(void 0), ne = Y(/* @__PURE__ */ new Set()), pe = Y(n?.id ?? ""), he = Y(h), [oe, W] = N(() => /* @__PURE__ */ new Set()), se = n?.title || t?.name || "Crew", ae = n?.kind === "group", G = (n?.members ?? []).map((_) => a.get(_)).filter((_) => !!_), ie = n?.id ?? t?.id ?? "";
  je(() => {
    const _ = pe.current !== ie || he.current;
    if (pe.current = ie, he.current = h, h || _) {
      ne.current = new Set(r.map((v) => v.id)), W(/* @__PURE__ */ new Set());
      return;
    }
    const F = r.filter((v) => !ne.current.has(v.id)).map((v) => v.id);
    for (const v of F) ne.current.add(v);
    W(new Set(F));
  }, [ie, h, r]);
  function me(_) {
    const F = J.current;
    !F || typeof F.scrollTo != "function" || (te.current = !0, K.current = !0, R(!1), E.current && window.clearTimeout(E.current), de.current = Math.max(
      de.current,
      Date.now() + (_ === "smooth" ? 650 : 150)
    ), F.scrollTo({ top: F.scrollHeight, behavior: _ }), E.current = window.setTimeout(() => {
      E.current = void 0, K.current = !1;
    }, _ === "smooth" ? 400 : 0));
  }
  U(() => {
    te.current = !0, K.current = !1, Z.current = 0, R(!1), requestAnimationFrame(() => me("auto"));
  }, [ie]), U(() => {
    te.current && me("smooth");
  }, [r]), U(() => {
    const _ = J.current, F = B.current;
    if (!_ || !F || typeof ResizeObserver > "u") return;
    const v = new ResizeObserver(() => {
      te.current && me("auto");
    });
    return v.observe(F), () => v.disconnect();
  }, [ie, h]), U(() => () => {
    D.current && window.clearTimeout(D.current), E.current && window.clearTimeout(E.current);
  }, []), U(() => {
    m > 0 && S.current?.focus();
  }, [ie, m]), U(() => {
    if (!l?.nonce) return;
    s(l.text);
    const _ = S.current;
    _?.focus(), _?.setSelectionRange(l.text.length, l.text.length);
  }, [l?.nonce]);
  function ue() {
    K.current || Date.now() < de.current || (H(!0), D.current && window.clearTimeout(D.current), D.current = window.setTimeout(() => {
      D.current = void 0, H(!1);
    }, 700));
  }
  async function ve(_) {
    _.preventDefault();
    const F = i.trim();
    if (!(!F || j.current)) {
      j.current = !0, s(""), g(!0);
      try {
        await o(F);
      } finally {
        j.current = !1, g(!1);
      }
    }
  }
  return /* @__PURE__ */ e.createElement("main", { className: "conversation" }, /* @__PURE__ */ e.createElement("header", { className: `conversation-header ${d ? "scrolled" : ""}` }, /* @__PURE__ */ e.createElement("h1", null, n?.emoji && /* @__PURE__ */ e.createElement("span", { className: "conversation-emoji" }, n.emoji), se), n?.subtitle && /* @__PURE__ */ e.createElement("p", { className: "conversation-subtitle" }, n.subtitle), /* @__PURE__ */ e.createElement("div", { className: "header-actions" }, !ae && /* @__PURE__ */ e.createElement("button", { className: "computer-trigger", "aria-label": "Open this teammate's computer", onClick: b }, /* @__PURE__ */ e.createElement(ht, { size: 18 })))), /* @__PURE__ */ e.createElement("div", { className: "conversation-scroll-shell" }, h ? /* @__PURE__ */ e.createElement("div", { className: "conversation-skeleton", role: "status", "aria-label": "Loading this thread" }, /* @__PURE__ */ e.createElement("div", { className: "skeleton-message skeleton-agent" }, /* @__PURE__ */ e.createElement("span", { className: "skeleton-line skeleton-line-wide" }), /* @__PURE__ */ e.createElement("span", { className: "skeleton-line" })), /* @__PURE__ */ e.createElement("div", { className: "skeleton-message skeleton-user" }, /* @__PURE__ */ e.createElement("span", { className: "skeleton-bubble" })), /* @__PURE__ */ e.createElement("div", { className: "skeleton-message skeleton-agent" }, /* @__PURE__ */ e.createElement("span", { className: "skeleton-line skeleton-line-short" }))) : /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement(
    "div",
    {
      className: `message-scroll ${P ? "scrollbar-visible" : ""}`,
      ref: J,
      onWheelCapture: (_) => {
        _.deltaY < 0 && (K.current = !1);
      },
      onScroll: (_) => {
        const F = _.currentTarget, v = F.scrollHeight - F.scrollTop - F.clientHeight, T = v <= 24, q = F.scrollTop < Z.current - 1;
        Z.current = F.scrollTop, O(F.scrollTop > 0), q && v > 72 ? (K.current = !1, te.current = !1, R(!0)) : !K.current && T ? (te.current = !0, R(!1)) : !K.current && v > 72 && (te.current = !1, R(!0)), ue();
      },
      onPointerMove: (_) => {
        _.currentTarget.getBoundingClientRect().right - _.clientX <= 14 ? H(!0) : D.current || H(!1);
      },
      onPointerLeave: () => H(!1)
    },
    /* @__PURE__ */ e.createElement("div", { className: "message-content", ref: B }, r.length === 0 && t && /* @__PURE__ */ e.createElement("div", { className: "conversation-intro" }, /* @__PURE__ */ e.createElement(gt, { agent: t, size: 54 }), /* @__PURE__ */ e.createElement("h2", null, t.name), /* @__PURE__ */ e.createElement("p", null, t.role)), r.map((_) => /* @__PURE__ */ e.createElement(
      la,
      {
        key: _.id,
        message: _,
        agent: t,
        senderName: ae ? a.get(_.sender ?? "")?.name : void 0,
        room: G,
        activities: c,
        chips: u,
        entering: oe.has(_.id) || _.id.startsWith("optimistic-user:")
      }
    )))
  ), $ && /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "scroll-to-bottom",
      "aria-label": "Scroll to the latest message",
      onClick: () => me("smooth")
    },
    /* @__PURE__ */ e.createElement(an, { size: 20 })
  ))), /* @__PURE__ */ e.createElement("form", { className: "composer", onSubmit: ve }, /* @__PURE__ */ e.createElement(
    "textarea",
    {
      ref: S,
      "aria-label": `Message ${se}`,
      placeholder: ae ? "Ask the room…" : `Message ${se}…`,
      value: i,
      onChange: (_) => s(_.target.value),
      onKeyDown: (_) => {
        _.key === "Enter" && !_.shiftKey && !_.nativeEvent.isComposing && _.keyCode !== 229 && (_.preventDefault(), _.currentTarget.form?.requestSubmit());
      }
    }
  ), /* @__PURE__ */ e.createElement("div", { className: "composer-bottom" }, /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "submit-button",
      "data-state": y ? "stopping" : "send",
      "aria-label": y ? "Sending" : "Send message",
      disabled: !i.trim() || y
    },
    y ? /* @__PURE__ */ e.createElement(oa, null) : /* @__PURE__ */ e.createElement(sa, null)
  ))));
}
const ua = [
  { id: "all", label: "Everything", types: [] },
  {
    id: "stopped",
    label: "Stopped",
    types: ["tool.refused", "tool.held", "approval.expired", "crew.bot_declined"]
  },
  { id: "failed", label: "Went wrong", types: ["tool.failed"] },
  { id: "decisions", label: "Your decisions", types: ["approval.decided", "grant.changed"] }
], ma = {
  "tool.allowed": ze,
  "tool.refused": On,
  "tool.held": Ge,
  "tool.failed": Oe,
  "approval.decided": ze,
  "approval.expired": mt,
  "grant.changed": Ye,
  "crew.policy_loaded": Ye,
  "crew.bot_declined": Ge
}, pa = {
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
function ha(t) {
  const n = new Date(t);
  return `${n.toLocaleDateString(void 0, { month: "short", day: "numeric" })} ${n.toLocaleTimeString(void 0, { hour: "2-digit", minute: "2-digit" })}`;
}
function fa({ events: t, loading: n, viewId: a, onChangeView: r, onLoadMore: c, hasMore: u }) {
  const [h, m] = N(() => /* @__PURE__ */ new Set()), l = fe(() => t.slice().sort((o, b) => b.id - o.id), [t]);
  return /* @__PURE__ */ e.createElement("section", { className: "audit-timeline" }, /* @__PURE__ */ e.createElement("div", { className: "audit-views", role: "tablist", "aria-label": "What to show" }, ua.map((o) => /* @__PURE__ */ e.createElement(
    "button",
    {
      key: o.id,
      role: "tab",
      type: "button",
      "aria-selected": a === o.id,
      className: `audit-view ${a === o.id ? "is-current" : ""}`,
      onClick: () => r(o.id, o.types)
    },
    o.label
  ))), l.length === 0 && !n && /* @__PURE__ */ e.createElement("p", { className: "audit-empty" }, "Nothing recorded yet."), /* @__PURE__ */ e.createElement("ol", { className: "audit-rows" }, l.map((o) => {
    const b = ma[o.event_type] ?? ze, i = h.has(o.id), s = o.event_type === "tool.refused" || o.event_type === "tool.held";
    return /* @__PURE__ */ e.createElement(
      "li",
      {
        key: o.id,
        className: `audit-row ${s ? "is-stopped" : ""} ${o.event_type === "tool.failed" ? "is-failed" : ""}`
      },
      /* @__PURE__ */ e.createElement(
        "button",
        {
          type: "button",
          className: "audit-head",
          "aria-expanded": i,
          onClick: () => m((y) => {
            const g = new Set(y);
            return g.delete(o.id) || g.add(o.id), g;
          })
        },
        /* @__PURE__ */ e.createElement(b, { size: 14 }),
        /* @__PURE__ */ e.createElement("span", { className: "audit-subject" }, o.subject || o.tool || o.event_type),
        /* @__PURE__ */ e.createElement("span", { className: "audit-kind" }, pa[o.event_type] ?? o.event_type),
        /* @__PURE__ */ e.createElement("time", { className: "audit-when", dateTime: new Date(o.created_at).toISOString() }, ha(o.created_at))
      ),
      i && /* @__PURE__ */ e.createElement("dl", { className: "audit-detail" }, o.tool && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Tool"), /* @__PURE__ */ e.createElement("dd", null, /* @__PURE__ */ e.createElement("code", null, o.tool))), o.detail && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Why"), /* @__PURE__ */ e.createElement("dd", null, o.detail)), o.actor !== "_system" && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Who"), /* @__PURE__ */ e.createElement("dd", null, o.actor === "_operator" ? "you" : o.actor)), o.duration_ms !== null && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Took"), /* @__PURE__ */ e.createElement("dd", null, o.duration_ms, " ms")), o.args_digest && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Arguments"), /* @__PURE__ */ e.createElement("dd", null, /* @__PURE__ */ e.createElement("code", null, o.args_digest))))
    );
  })), u && /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "secondary-button",
      disabled: n,
      onClick: c
    },
    n ? "Loading…" : "Show older"
  ));
}
const ga = {
  slides: xn,
  document: be,
  sheet: En,
  image: kn,
  data: pn,
  text: be,
  code: vn,
  archive: nn,
  file: pt
};
function ya(t) {
  if (t === 0) return "0 bytes";
  const n = ["bytes", "KB", "MB", "GB"];
  let a = t, r = 0;
  for (; a >= 1024 && r < n.length - 1; )
    a /= 1024, r += 1;
  return `${r === 0 ? a : a.toFixed(a < 10 ? 1 : 0)} ${n[r]}`;
}
function va(t) {
  const n = new Date(t);
  return Number.isNaN(n.getTime()) ? "" : (/* @__PURE__ */ new Date()).toDateString() === n.toDateString() ? n.toLocaleTimeString(void 0, { hour: "2-digit", minute: "2-digit" }) : n.toLocaleDateString(void 0, { month: "short", day: "numeric" });
}
function Ea({ agentName: t, artifacts: n, urlFor: a }) {
  return n.length === 0 ? /* @__PURE__ */ e.createElement("p", { className: "files-empty" }, t, " has not produced any files yet.") : /* @__PURE__ */ e.createElement("ul", { className: "files-list" }, n.map((r) => {
    const c = ga[r.kind] ?? pt, u = r.size === 0;
    return /* @__PURE__ */ e.createElement("li", { className: `files-row ${u ? "is-empty" : ""}`, key: r.id }, /* @__PURE__ */ e.createElement(
      "a",
      {
        href: a(r),
        download: r.name,
        className: "files-link"
      },
      /* @__PURE__ */ e.createElement(c, { size: 15 }),
      /* @__PURE__ */ e.createElement("span", { className: "files-name", title: r.path }, r.name),
      /* @__PURE__ */ e.createElement("span", { className: "files-meta" }, ya(r.size), u && /* @__PURE__ */ e.createElement("span", { className: "files-warning", title: "Nothing was written to this file" }, "didn't finish")),
      /* @__PURE__ */ e.createElement("span", { className: "files-when" }, va(r.updatedAt)),
      /* @__PURE__ */ e.createElement(hn, { size: 13, className: "files-download" })
    ));
  }));
}
const wa = {
  pending: ut,
  running: Te,
  succeeded: Me,
  failed: $n,
  waiting: bn
}, ba = {
  web: wn,
  file: be,
  mail: Sn,
  user: Pn
};
function ka({ step: t }) {
  const n = wa[t.status] ?? ut;
  return /* @__PURE__ */ e.createElement("li", { className: `plan-step is-${t.status}` }, /* @__PURE__ */ e.createElement(n, { size: 13, className: t.status === "running" ? "spin" : void 0 }), /* @__PURE__ */ e.createElement("span", { className: "plan-step-title" }, t.title), t.detail && /* @__PURE__ */ e.createElement("span", { className: "plan-step-detail" }, t.detail));
}
function Na({ item: t }) {
  const n = ba[t.kind] ?? be, a = t.url ? /* @__PURE__ */ e.createElement("a", { href: t.url, target: "_blank", rel: "noreferrer noopener" }, t.title) : /* @__PURE__ */ e.createElement("span", null, t.title);
  return /* @__PURE__ */ e.createElement("li", { className: "evidence-row" }, /* @__PURE__ */ e.createElement("div", { className: "evidence-head" }, /* @__PURE__ */ e.createElement(n, { size: 12 }), a), /* @__PURE__ */ e.createElement("p", { className: "evidence-excerpt" }, t.excerpt));
}
function Sa({ agentName: t, tasks: n }) {
  return n.length === 0 ? /* @__PURE__ */ e.createElement("p", { className: "plan-empty" }, t, " has no scheduled or long-running work.") : /* @__PURE__ */ e.createElement("div", { className: "plan-list" }, n.map((a) => /* @__PURE__ */ e.createElement("section", { className: "plan-task", key: a.id }, /* @__PURE__ */ e.createElement("div", { className: "plan-task-head" }, /* @__PURE__ */ e.createElement("span", { className: "plan-task-title" }, a.title || a.kind), /* @__PURE__ */ e.createElement("span", { className: `plan-task-status is-${a.status}` }, a.status.replace("_", " "))), a.attempts > 1 && /* @__PURE__ */ e.createElement("p", { className: "plan-task-attempts" }, "picked up ", a.attempts, " times"), a.error && /* @__PURE__ */ e.createElement("p", { className: "plan-task-error" }, a.error), a.plan.length > 0 && /* @__PURE__ */ e.createElement("ol", { className: "plan-steps" }, a.plan.map((r) => /* @__PURE__ */ e.createElement(ka, { step: r, key: r.id }))), a.evidence.length > 0 && /* @__PURE__ */ e.createElement("details", { className: "evidence" }, /* @__PURE__ */ e.createElement("summary", null, "What it read (", a.evidence.length, ")"), /* @__PURE__ */ e.createElement("ul", { className: "evidence-list" }, a.evidence.map((r, c) => /* @__PURE__ */ e.createElement(Na, { item: r, key: `${r.title}-${c}` })))))));
}
const Ca = [
  { mode: "deny", label: "Never", icon: rn },
  { mode: "ask", label: "Ask me", icon: dn },
  { mode: "allow", label: "Allow", icon: An }
];
function Ma({ agentName: t, grants: n, busy: a, onSetGrant: r, onClearGrant: c }) {
  const [u, h] = N(""), [m, l] = N(!1), o = fe(() => {
    const i = u.trim().toLowerCase(), s = n.filter((g) => m && g.source !== "grant" ? !1 : i ? g.tool.toLowerCase().includes(i) || g.toolset.toLowerCase().includes(i) : !0), y = /* @__PURE__ */ new Map();
    for (const g of s) {
      const d = g.toolset || "other";
      y.set(d, [...y.get(d) ?? [], g]);
    }
    return [...y.entries()].sort(([g], [d]) => g.localeCompare(d));
  }, [n, u, m]), b = n.filter((i) => i.mode === "ask").length;
  return /* @__PURE__ */ e.createElement("section", { className: "permissions-panel" }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow" }, /* @__PURE__ */ e.createElement(Nn, { size: 14 }), " What ", t, " can do"), /* @__PURE__ */ e.createElement("p", { className: "permissions-summary" }, n.length, " tools · ", b, " need your say-so"), /* @__PURE__ */ e.createElement("div", { className: "permissions-filters" }, /* @__PURE__ */ e.createElement(
    "input",
    {
      type: "search",
      "aria-label": "Filter tools",
      placeholder: "Filter tools…",
      value: u,
      onChange: (i) => h(i.target.value)
    }
  ), /* @__PURE__ */ e.createElement("label", null, /* @__PURE__ */ e.createElement(
    "input",
    {
      type: "checkbox",
      checked: m,
      onChange: (i) => l(i.target.checked)
    }
  ), "Only what I changed")), o.length === 0 && /* @__PURE__ */ e.createElement("p", { className: "permissions-empty" }, "Nothing matches."), o.map(([i, s]) => /* @__PURE__ */ e.createElement("div", { className: "permissions-group", key: i }, /* @__PURE__ */ e.createElement("h4", null, i), s.map((y) => /* @__PURE__ */ e.createElement(
    "div",
    {
      className: `permissions-row ${y.protected ? "is-protected" : ""} ${y.available === !1 ? "is-unavailable" : ""}`,
      key: y.tool
    },
    /* @__PURE__ */ e.createElement("div", { className: "permissions-tool" }, /* @__PURE__ */ e.createElement("code", null, y.tool), /* @__PURE__ */ e.createElement("span", { className: "permissions-why" }, y.why)),
    /* @__PURE__ */ e.createElement("div", { className: "permissions-modes", role: "group", "aria-label": `What ${t} may do with ${y.tool}` }, Ca.map(({ mode: g, label: d, icon: O }) => /* @__PURE__ */ e.createElement(
      "button",
      {
        key: g,
        type: "button",
        className: `permissions-mode ${y.mode === g ? "is-current" : ""}`,
        "aria-pressed": y.mode === g,
        disabled: a || y.protected,
        title: y.protected ? "This teammate always keeps this one" : d,
        onClick: () => {
          r(y.tool, g);
        }
      },
      /* @__PURE__ */ e.createElement(O, { size: 13 }),
      " ",
      d
    )), y.source === "grant" && !y.protected && /* @__PURE__ */ e.createElement(
      "button",
      {
        type: "button",
        className: "permissions-reset",
        "aria-label": `Reset ${y.tool} to the default`,
        disabled: a,
        onClick: () => {
          c(y.tool);
        }
      },
      /* @__PURE__ */ e.createElement(Rn, { size: 13 })
    ))
  )))));
}
const Ta = [
  [/support|ticket|helpdesk|customer/, [
    "Every weekday at 9am, go through the ticket queue and tell me which ones have been waiting longest.",
    "Each Friday afternoon, summarise what people asked about this week and what kept coming up."
  ]],
  [/sales|crm|lead|account/, [
    "Every Monday at 8:30, list the deals that have had no contact in two weeks.",
    "On the first of each month, put together a one-page summary of how last month closed."
  ]],
  [/research|analy|market|competit/, [
    "Every weekday morning, check what our competitors published overnight and tell me only what is new.",
    "Each Wednesday, pull the numbers for the dashboard and flag anything that moved more than 10%."
  ]],
  [/engineer|develop|code|deploy|ops|infra/, [
    "Every weekday at 9am, check for failed builds overnight and tell me what broke.",
    "Each Monday, list the dependencies that have security updates waiting."
  ]],
  [/write|content|edit|market|social/, [
    "Every Tuesday, draft the newsletter from what shipped since the last one.",
    "Each morning, check the comments on last week's posts and tell me if anything needs a reply."
  ]],
  [/finance|invoice|bookkeep|account|expense/, [
    "Every Monday at 9am, list the invoices that are past due and by how long.",
    "On the last working day of the month, put the expense summary together."
  ]]
], _a = [
  "Every weekday at 9am, tell me what changed overnight that I should know about.",
  "Each Friday afternoon, write up what you got done this week."
];
function xa(t) {
  const n = (t || "").toLowerCase();
  for (const [a, r] of Ta)
    if (a.test(n)) return r;
  return _a;
}
function tr(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
function Ia(t) {
  if (Object.prototype.hasOwnProperty.call(t, "__esModule")) return t;
  var n = t.default;
  if (typeof n == "function") {
    var a = function r() {
      var c = !1;
      try {
        c = this instanceof r;
      } catch {
      }
      return c ? Reflect.construct(n, arguments, this.constructor) : n.apply(this, arguments);
    };
    a.prototype = n.prototype;
  } else a = {};
  return Object.defineProperty(a, "__esModule", { value: !0 }), Object.keys(t).forEach(function(r) {
    var c = Object.getOwnPropertyDescriptor(t, r);
    Object.defineProperty(a, r, c.get ? c : {
      enumerable: !0,
      get: function() {
        return t[r];
      }
    });
  }), a;
}
var xe = { exports: {} }, ce = {};
const yt = /* @__PURE__ */ Ia(Gt);
var Je;
function Ra() {
  if (Je) return ce;
  Je = 1;
  var t = yt;
  function n(l) {
    var o = "https://react.dev/errors/" + l;
    if (1 < arguments.length) {
      o += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var b = 2; b < arguments.length; b++)
        o += "&args[]=" + encodeURIComponent(arguments[b]);
    }
    return "Minified React error #" + l + "; visit " + o + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function a() {
  }
  var r = {
    d: {
      f: a,
      r: function() {
        throw Error(n(522));
      },
      D: a,
      C: a,
      L: a,
      m: a,
      X: a,
      S: a,
      M: a
    },
    p: 0,
    findDOMNode: null
  }, c = /* @__PURE__ */ Symbol.for("react.portal");
  function u(l, o, b) {
    var i = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: c,
      key: i == null ? null : "" + i,
      children: l,
      containerInfo: o,
      implementation: b
    };
  }
  var h = t.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function m(l, o) {
    if (l === "font") return "";
    if (typeof o == "string")
      return o === "use-credentials" ? o : "";
  }
  return ce.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = r, ce.createPortal = function(l, o) {
    var b = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!o || o.nodeType !== 1 && o.nodeType !== 9 && o.nodeType !== 11)
      throw Error(n(299));
    return u(l, o, null, b);
  }, ce.flushSync = function(l) {
    var o = h.T, b = r.p;
    try {
      if (h.T = null, r.p = 2, l) return l();
    } finally {
      h.T = o, r.p = b, r.d.f();
    }
  }, ce.preconnect = function(l, o) {
    typeof l == "string" && (o ? (o = o.crossOrigin, o = typeof o == "string" ? o === "use-credentials" ? o : "" : void 0) : o = null, r.d.C(l, o));
  }, ce.prefetchDNS = function(l) {
    typeof l == "string" && r.d.D(l);
  }, ce.preinit = function(l, o) {
    if (typeof l == "string" && o && typeof o.as == "string") {
      var b = o.as, i = m(b, o.crossOrigin), s = typeof o.integrity == "string" ? o.integrity : void 0, y = typeof o.fetchPriority == "string" ? o.fetchPriority : void 0;
      b === "style" ? r.d.S(
        l,
        typeof o.precedence == "string" ? o.precedence : void 0,
        {
          crossOrigin: i,
          integrity: s,
          fetchPriority: y
        }
      ) : b === "script" && r.d.X(l, {
        crossOrigin: i,
        integrity: s,
        fetchPriority: y,
        nonce: typeof o.nonce == "string" ? o.nonce : void 0
      });
    }
  }, ce.preinitModule = function(l, o) {
    if (typeof l == "string")
      if (typeof o == "object" && o !== null) {
        if (o.as == null || o.as === "script") {
          var b = m(
            o.as,
            o.crossOrigin
          );
          r.d.M(l, {
            crossOrigin: b,
            integrity: typeof o.integrity == "string" ? o.integrity : void 0,
            nonce: typeof o.nonce == "string" ? o.nonce : void 0
          });
        }
      } else o == null && r.d.M(l);
  }, ce.preload = function(l, o) {
    if (typeof l == "string" && typeof o == "object" && o !== null && typeof o.as == "string") {
      var b = o.as, i = m(b, o.crossOrigin);
      r.d.L(l, b, {
        crossOrigin: i,
        integrity: typeof o.integrity == "string" ? o.integrity : void 0,
        nonce: typeof o.nonce == "string" ? o.nonce : void 0,
        type: typeof o.type == "string" ? o.type : void 0,
        fetchPriority: typeof o.fetchPriority == "string" ? o.fetchPriority : void 0,
        referrerPolicy: typeof o.referrerPolicy == "string" ? o.referrerPolicy : void 0,
        imageSrcSet: typeof o.imageSrcSet == "string" ? o.imageSrcSet : void 0,
        imageSizes: typeof o.imageSizes == "string" ? o.imageSizes : void 0,
        media: typeof o.media == "string" ? o.media : void 0
      });
    }
  }, ce.preloadModule = function(l, o) {
    if (typeof l == "string")
      if (o) {
        var b = m(o.as, o.crossOrigin);
        r.d.m(l, {
          as: typeof o.as == "string" && o.as !== "script" ? o.as : void 0,
          crossOrigin: b,
          integrity: typeof o.integrity == "string" ? o.integrity : void 0
        });
      } else r.d.m(l);
  }, ce.requestFormReset = function(l) {
    r.d.r(l);
  }, ce.unstable_batchedUpdates = function(l, o) {
    return l(o);
  }, ce.useFormState = function(l, o, b) {
    return h.H.useFormState(l, o, b);
  }, ce.useFormStatus = function() {
    return h.H.useHostTransitionStatus();
  }, ce.version = "19.2.7", ce;
}
var le = {};
var Ze;
function Aa() {
  return Ze || (Ze = 1, process.env.NODE_ENV !== "production" && (function() {
    function t() {
    }
    function n(i) {
      return "" + i;
    }
    function a(i, s, y) {
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
        $$typeof: o,
        key: g == null ? null : "" + g,
        children: i,
        containerInfo: s,
        implementation: y
      };
    }
    function r(i, s) {
      if (i === "font") return "";
      if (typeof s == "string")
        return s === "use-credentials" ? s : "";
    }
    function c(i) {
      return i === null ? "`null`" : i === void 0 ? "`undefined`" : i === "" ? "an empty string" : 'something with type "' + typeof i + '"';
    }
    function u(i) {
      return i === null ? "`null`" : i === void 0 ? "`undefined`" : i === "" ? "an empty string" : typeof i == "string" ? JSON.stringify(i) : typeof i == "number" ? "`" + i + "`" : 'something with type "' + typeof i + '"';
    }
    function h() {
      var i = b.H;
      return i === null && console.error(
        `Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:
1. You might have mismatching versions of React and the renderer (such as React DOM)
2. You might be breaking the Rules of Hooks
3. You might have more than one copy of React in the same app
See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.`
      ), i;
    }
    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart == "function" && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
    var m = yt, l = {
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
    }, o = /* @__PURE__ */ Symbol.for("react.portal"), b = m.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    typeof Map == "function" && Map.prototype != null && typeof Map.prototype.forEach == "function" && typeof Set == "function" && Set.prototype != null && typeof Set.prototype.clear == "function" && typeof Set.prototype.forEach == "function" || console.error(
      "React depends on Map and Set built-in types. Make sure that you load a polyfill in older browsers. https://reactjs.org/link/react-polyfills"
    ), le.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = l, le.createPortal = function(i, s) {
      var y = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
      if (!s || s.nodeType !== 1 && s.nodeType !== 9 && s.nodeType !== 11)
        throw Error("Target container is not a DOM element.");
      return a(i, s, null, y);
    }, le.flushSync = function(i) {
      var s = b.T, y = l.p;
      try {
        if (b.T = null, l.p = 2, i)
          return i();
      } finally {
        b.T = s, l.p = y, l.d.f() && console.error(
          "flushSync was called from inside a lifecycle method. React cannot flush when React is already rendering. Consider moving this call to a scheduler task or micro task."
        );
      }
    }, le.preconnect = function(i, s) {
      typeof i == "string" && i ? s != null && typeof s != "object" ? console.error(
        "ReactDOM.preconnect(): Expected the `options` argument (second) to be an object but encountered %s instead. The only supported option at this time is `crossOrigin` which accepts a string.",
        u(s)
      ) : s != null && typeof s.crossOrigin != "string" && console.error(
        "ReactDOM.preconnect(): Expected the `crossOrigin` option (second argument) to be a string but encountered %s instead. Try removing this option or passing a string value instead.",
        c(s.crossOrigin)
      ) : console.error(
        "ReactDOM.preconnect(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
        c(i)
      ), typeof i == "string" && (s ? (s = s.crossOrigin, s = typeof s == "string" ? s === "use-credentials" ? s : "" : void 0) : s = null, l.d.C(i, s));
    }, le.prefetchDNS = function(i) {
      if (typeof i != "string" || !i)
        console.error(
          "ReactDOM.prefetchDNS(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
          c(i)
        );
      else if (1 < arguments.length) {
        var s = arguments[1];
        typeof s == "object" && s.hasOwnProperty("crossOrigin") ? console.error(
          "ReactDOM.prefetchDNS(): Expected only one argument, `href`, but encountered %s as a second argument instead. This argument is reserved for future options and is currently disallowed. It looks like the you are attempting to set a crossOrigin property for this DNS lookup hint. Browsers do not perform DNS queries using CORS and setting this attribute on the resource hint has no effect. Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.",
          u(s)
        ) : console.error(
          "ReactDOM.prefetchDNS(): Expected only one argument, `href`, but encountered %s as a second argument instead. This argument is reserved for future options and is currently disallowed. Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.",
          u(s)
        );
      }
      typeof i == "string" && l.d.D(i);
    }, le.preinit = function(i, s) {
      if (typeof i == "string" && i ? s == null || typeof s != "object" ? console.error(
        "ReactDOM.preinit(): Expected the `options` argument (second) to be an object with an `as` property describing the type of resource to be preinitialized but encountered %s instead.",
        u(s)
      ) : s.as !== "style" && s.as !== "script" && console.error(
        'ReactDOM.preinit(): Expected the `as` property in the `options` argument (second) to contain a valid value describing the type of resource to be preinitialized but encountered %s instead. Valid values for `as` are "style" and "script".',
        u(s.as)
      ) : console.error(
        "ReactDOM.preinit(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
        c(i)
      ), typeof i == "string" && s && typeof s.as == "string") {
        var y = s.as, g = r(y, s.crossOrigin), d = typeof s.integrity == "string" ? s.integrity : void 0, O = typeof s.fetchPriority == "string" ? s.fetchPriority : void 0;
        y === "style" ? l.d.S(
          i,
          typeof s.precedence == "string" ? s.precedence : void 0,
          {
            crossOrigin: g,
            integrity: d,
            fetchPriority: O
          }
        ) : y === "script" && l.d.X(i, {
          crossOrigin: g,
          integrity: d,
          fetchPriority: O,
          nonce: typeof s.nonce == "string" ? s.nonce : void 0
        });
      }
    }, le.preinitModule = function(i, s) {
      var y = "";
      typeof i == "string" && i || (y += " The `href` argument encountered was " + c(i) + "."), s !== void 0 && typeof s != "object" ? y += " The `options` argument encountered was " + c(s) + "." : s && "as" in s && s.as !== "script" && (y += " The `as` option encountered was " + u(s.as) + "."), y ? console.error(
        "ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` string and, optionally, an `options` object with a valid `as` property.%s",
        y
      ) : (y = s && typeof s.as == "string" ? s.as : "script", y) === "script" || (y = u(y), console.error(
        'ReactDOM.preinitModule(): Currently the only supported "as" type for this function is "script" but received "%s" instead. This warning was generated for `href` "%s". In the future other module types will be supported, aligning with the import-attributes proposal. Learn more here: (https://github.com/tc39/proposal-import-attributes)',
        y,
        i
      )), typeof i == "string" && (typeof s == "object" && s !== null ? (s.as == null || s.as === "script") && (y = r(
        s.as,
        s.crossOrigin
      ), l.d.M(i, {
        crossOrigin: y,
        integrity: typeof s.integrity == "string" ? s.integrity : void 0,
        nonce: typeof s.nonce == "string" ? s.nonce : void 0
      })) : s == null && l.d.M(i));
    }, le.preload = function(i, s) {
      var y = "";
      if (typeof i == "string" && i || (y += " The `href` argument encountered was " + c(i) + "."), s == null || typeof s != "object" ? y += " The `options` argument encountered was " + c(s) + "." : typeof s.as == "string" && s.as || (y += " The `as` option encountered was " + c(s.as) + "."), y && console.error(
        'ReactDOM.preload(): Expected two arguments, a non-empty `href` string and an `options` object with an `as` property valid for a `<link rel="preload" as="..." />` tag.%s',
        y
      ), typeof i == "string" && typeof s == "object" && s !== null && typeof s.as == "string") {
        y = s.as;
        var g = r(
          y,
          s.crossOrigin
        );
        l.d.L(i, y, {
          crossOrigin: g,
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
    }, le.preloadModule = function(i, s) {
      var y = "";
      typeof i == "string" && i || (y += " The `href` argument encountered was " + c(i) + "."), s !== void 0 && typeof s != "object" ? y += " The `options` argument encountered was " + c(s) + "." : s && "as" in s && typeof s.as != "string" && (y += " The `as` option encountered was " + c(s.as) + "."), y && console.error(
        'ReactDOM.preloadModule(): Expected two arguments, a non-empty `href` string and, optionally, an `options` object with an `as` property valid for a `<link rel="modulepreload" as="..." />` tag.%s',
        y
      ), typeof i == "string" && (s ? (y = r(
        s.as,
        s.crossOrigin
      ), l.d.m(i, {
        as: typeof s.as == "string" && s.as !== "script" ? s.as : void 0,
        crossOrigin: y,
        integrity: typeof s.integrity == "string" ? s.integrity : void 0
      })) : l.d.m(i));
    }, le.requestFormReset = function(i) {
      l.d.r(i);
    }, le.unstable_batchedUpdates = function(i, s) {
      return i(s);
    }, le.useFormState = function(i, s, y) {
      return h().useFormState(i, s, y);
    }, le.useFormStatus = function() {
      return h().useHostTransitionStatus();
    }, le.version = "19.2.7", typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop == "function" && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
  })()), le;
}
var Qe;
function Oa() {
  if (Qe) return xe.exports;
  Qe = 1;
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
  return process.env.NODE_ENV === "production" ? (t(), xe.exports = Ra()) : xe.exports = Aa(), xe.exports;
}
var vt = Oa();
function Da(t) {
  if (t.width <= 0 || t.height <= 0) return !1;
  try {
    const n = t.getContext("2d", { willReadFrequently: !0 });
    if (!n) return !1;
    const a = [0, Math.floor(t.width / 2), t.width - 1], r = [0, Math.floor(t.height / 2), t.height - 1], c = a.flatMap((u) => r.map((h) => n.getImageData(u, h, 1, 1).data));
    if (c.every((u) => u[3] === 0)) return !1;
    for (let u = 0; u < 3; u += 1) {
      const h = c.map((m) => m[u]);
      if (Math.max(...h) - Math.min(...h) > 6) return !0;
    }
    return !1;
  } catch {
    return !1;
  }
}
function Et({
  session: t,
  viewOnly: n,
  compact: a = !1,
  onReconnect: r,
  onDisconnect: c
}) {
  const u = Y(null), h = Y(c), [m, l] = N("connecting"), [o, b] = N();
  return U(() => {
    h.current = c;
  }, [c]), U(() => {
    if (!u.current) return;
    let i = !1, s = !1, y = !1, g = !1, d, O, $, R;
    (a ? u.current.closest(".computer-preview") : null)?.style.removeProperty("aspect-ratio"), l("connecting"), b(void 0);
    const H = () => {
      d && window.clearInterval(d), O && window.clearTimeout(O), d = void 0, O = void 0;
    }, J = () => {
      $ && window.clearTimeout($), $ = void 0;
    }, B = () => {
      g || (g = !0, h.current?.());
    }, S = (E) => {
      i || s || (s = !0, J(), H(), b(E), l("disconnected"), B(), R?.disconnect());
    }, j = () => {
      const E = u.current?.querySelector("canvas");
      return E ? Da(E) : !1;
    }, te = () => {
      i || s || (J(), y = !0, d = window.setInterval(() => {
        !i && j() && (H(), l("connected"));
      }, 100), O = window.setTimeout(() => {
        j() || S("This computer connected but never drew a frame.");
      }, 8e3));
    }, K = (E) => {
      if (i || s) return;
      J(), H();
      const D = E.detail?.clean;
      b((ne) => ne ?? (y && D ? "This computer stopped before drawing a frame." : D ? "This computer disconnected." : "The connection to this computer was lost.")), l("disconnected"), B();
    }, de = (E) => {
      S(E.detail?.reason ?? "Screen security negotiation failed.");
    }, Z = () => S("This computer's screen is asking for a VNC password.");
    return $ = window.setTimeout(() => S("This computer's screen did not answer."), 15e3), import("./chunk-rfb-DFY61DWN.js").then(({ default: E }) => {
      i || s || !u.current || (R = new E(u.current, t.url, { shared: !0, wsProtocols: t.protocols }), R.viewOnly = n, R.scaleViewport = !0, R.resizeSession = !1, a && (R.background = "transparent"), R.addEventListener("connect", te), R.addEventListener("disconnect", K), R.addEventListener("securityfailure", de), R.addEventListener("credentialsrequired", Z));
    }).catch(() => S("Could not load the screen client.")), () => {
      i = !0, J(), H(), R?.removeEventListener("connect", te), R?.removeEventListener("disconnect", K), R?.removeEventListener("securityfailure", de), R?.removeEventListener("credentialsrequired", Z), R?.disconnect();
    };
  }, [a, t, n]), /* @__PURE__ */ e.createElement("div", { className: `vnc-viewport ${a ? "is-compact" : ""}` }, /* @__PURE__ */ e.createElement("div", { ref: u, className: "vnc-target" }), m !== "connected" && /* @__PURE__ */ e.createElement("div", { className: "vnc-status", role: "status" }, m === "connecting" ? /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement(Te, { size: a ? 14 : 18, className: "spin" }), !a && "Connecting…") : /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("span", null, a ? "Screen unavailable" : o), r && /* @__PURE__ */ e.createElement("button", { className: "secondary-button", onClick: r }, "Reconnect"))));
}
function Pa({
  session: t,
  failure: n,
  title: a,
  onClose: r,
  onReconnect: c
}) {
  return vt.createPortal(/* @__PURE__ */ e.createElement("div", { className: "vnc-desktop", role: "dialog", "aria-label": a }, /* @__PURE__ */ e.createElement("div", { className: "vnc-titlebar", "aria-hidden": "true" }), /* @__PURE__ */ e.createElement("button", { className: "vnc-close", "aria-label": "Close this screen", onClick: r }, /* @__PURE__ */ e.createElement(Tn, { size: 18 })), t ? /* @__PURE__ */ e.createElement(Et, { session: t, viewOnly: !1, onReconnect: c }) : /* @__PURE__ */ e.createElement("div", { className: "vnc-viewport" }, /* @__PURE__ */ e.createElement("div", { className: "vnc-status", role: "status" }, n ? /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("span", null, n), /* @__PURE__ */ e.createElement("button", { className: "secondary-button", onClick: c }, "Reconnect")) : /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement(Te, { size: 18, className: "spin" }), " Connecting…")))), document.body);
}
function $a({
  open: t,
  width: n,
  onResize: a,
  agentName: r,
  agentRole: c,
  computer: u,
  approvals: h,
  routines: m,
  grants: l,
  grantsBusy: o,
  audit: b,
  auditLoading: i,
  auditView: s,
  auditHasMore: y,
  artifacts: g,
  artifactUrl: d,
  tasks: O,
  proactive: $,
  onSetProactive: R,
  onApproval: P,
  onComputerAction: H,
  onDeleteRoutine: J,
  onDraft: B,
  onSetGrant: S,
  onClearGrant: j,
  onChangeAuditView: te,
  onLoadMoreAudit: K,
  onClose: de
}) {
  const [Z, E] = N(""), [D, ne] = N(""), [pe, he] = N(!1), [oe, W] = N(() => /* @__PURE__ */ new Map()), [se, ae] = N(""), [G, ie] = N(() => /* @__PURE__ */ new Set()), [me, ue] = N(), [ve, _] = N(!1), [F, v] = N(), T = h.filter((p) => p.status === "pending"), q = oe.get(u?.id ?? ""), V = G.has(u?.id ?? ""), L = Y(H);
  U(() => {
    L.current = H;
  }, [H]), U(() => {
    const p = u?.id;
    if (!t || ve || u?.status !== "online" || !p || q || V) return;
    let x = !0;
    return ae(p), L.current("open").then((z) => {
      x && (W((X) => new Map(X).set(p, z)), ae(""));
    }).catch(() => {
      x && (ie((z) => new Set(z).add(p)), ae(""));
    }), () => {
      x = !1;
    };
  }, [u?.id, u?.status, ve, t, V, q]);
  async function k(p) {
    _(!0), ue(void 0), v(void 0), he(!0);
    const x = u?.id;
    x && G.has(x) && (ie((z) => {
      const X = new Set(z);
      return X.delete(x), X;
    }), W((z) => {
      const X = new Map(z);
      return X.delete(x), X;
    }));
    try {
      ue(await H(p));
    } catch (z) {
      v(z instanceof Error ? z.message : "Could not reach that computer.");
    } finally {
      he(!1);
    }
  }
  function C() {
    _(!1), ue(void 0), v(void 0);
  }
  const w = () => window.innerWidth <= 1030 ? Math.min(730, window.innerWidth - 40) : Math.min(730, window.innerWidth - (window.innerWidth <= 1180 ? 672 : 732));
  U(() => {
    const p = () => {
      const x = Math.max(280, w());
      n > x && a(x);
    };
    return p(), window.addEventListener("resize", p), () => window.removeEventListener("resize", p);
  }, [a, n]);
  const M = (p) => a(Math.max(280, Math.min(w(), window.innerWidth - p)));
  return /* @__PURE__ */ e.createElement("aside", { className: `detail-panel ${t ? "is-open" : "is-closing"}`, style: { width: n } }, /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "detail-resize-handle",
      role: "separator",
      "aria-label": "Resize the details panel",
      "aria-orientation": "vertical",
      "aria-valuemin": 280,
      "aria-valuemax": Math.max(280, w()),
      "aria-valuenow": n,
      tabIndex: 0,
      onKeyDown: (p) => {
        p.key === "ArrowLeft" ? (p.preventDefault(), a(Math.min(w(), n + 16))) : p.key === "ArrowRight" && (p.preventDefault(), a(Math.max(280, n - 16)));
      },
      onPointerDown: (p) => {
        p.currentTarget.setPointerCapture(p.pointerId), M(p.clientX);
      },
      onPointerMove: (p) => {
        p.currentTarget.hasPointerCapture(p.pointerId) && M(p.clientX);
      }
    }
  ), /* @__PURE__ */ e.createElement("header", null, /* @__PURE__ */ e.createElement("button", { className: "icon-button", "aria-label": "Close the details panel", onClick: de }, /* @__PURE__ */ e.createElement(ln, { size: 18 }))), h.filter((p) => p.outcome === "outcome_unknown").map((p) => /* @__PURE__ */ e.createElement("section", { className: "approval-card is-uncertain", key: `unknown-${p.id}` }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow warning" }, /* @__PURE__ */ e.createElement(qe, { size: 14 }), " Outcome unknown"), /* @__PURE__ */ e.createElement("h3", null, p.title), /* @__PURE__ */ e.createElement("p", null, "You allowed this and the process stopped before anything recorded whether it went through. It may have. Check before allowing it again."))), T.map((p) => /* @__PURE__ */ e.createElement("section", { className: "approval-card", key: p.id }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow warning" }, /* @__PURE__ */ e.createElement(qe, { size: 14 }), " Waiting for you", p.source && p.source !== p.agentId && /* @__PURE__ */ e.createElement("span", { className: "approval-source" }, p.source), p.ref && /* @__PURE__ */ e.createElement("code", { className: "approval-ref", title: "Reply with this in the thread to decide without opening the panel" }, p.ref)), /* @__PURE__ */ e.createElement("h3", null, p.title), p.description && /* @__PURE__ */ e.createElement("p", null, p.description), p.scope.length > 0 && /* @__PURE__ */ e.createElement("div", { className: "scope" }, /* @__PURE__ */ e.createElement("span", null, "This allows:"), p.scope.map((x) => /* @__PURE__ */ e.createElement("div", { key: x }, /* @__PURE__ */ e.createElement(Me, { size: 13 }), x))), /* @__PURE__ */ e.createElement(
    "textarea",
    {
      "aria-label": "Note for this decision",
      placeholder: "Add a note (optional)",
      value: Z,
      onChange: (x) => E(x.target.value)
    }
  ), /* @__PURE__ */ e.createElement("div", { className: "approval-actions" }, /* @__PURE__ */ e.createElement("button", { className: "secondary-button danger-text", onClick: () => {
    P(p.id, "deny", Z, p.contentHash);
  } }, "Discard"), /* @__PURE__ */ e.createElement("button", { className: "primary-button", onClick: () => {
    P(p.id, "allow", Z, p.contentHash);
  } }, "Approve")))), /* @__PURE__ */ e.createElement("section", { className: "screen-section" }, /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "screen-trigger",
      disabled: pe || u?.status !== "online",
      "aria-label": `Open ${r}'s screen`,
      onClick: () => {
        k("open");
      }
    },
    /* @__PURE__ */ e.createElement("span", { className: "computer-preview" }, [...oe].map(([p, x]) => /* @__PURE__ */ e.createElement(
      "span",
      {
        className: `computer-preview-stream ${p === u?.id ? "is-active" : ""}`,
        key: p
      },
      /* @__PURE__ */ e.createElement(
        Et,
        {
          session: x,
          viewOnly: !0,
          compact: !0,
          onDisconnect: () => ie((z) => new Set(z).add(p))
        }
      )
    )), !oe.has(u?.id ?? "") && (se === u?.id ? /* @__PURE__ */ e.createElement("span", { className: "computer-preview-loading", role: "status", "aria-label": `Loading ${r}'s screen` }, /* @__PURE__ */ e.createElement(Te, { size: 18, className: "spin" })) : G.has(u?.id ?? "") ? /* @__PURE__ */ e.createElement("span", { className: "computer-preview-loading", role: "status" }, "Screen unavailable") : /* @__PURE__ */ e.createElement("span", { className: "computer-screen-off", "aria-hidden": "true" })), /* @__PURE__ */ e.createElement("span", { className: "screen-hover-action" }, /* @__PURE__ */ e.createElement(Cn, { size: 14 }), " Open"))
  ), /* @__PURE__ */ e.createElement("div", { className: "screen-caption" }, /* @__PURE__ */ e.createElement("span", null, r, "'s screen"), /* @__PURE__ */ e.createElement("span", { className: `screen-state ${u?.status ?? "offline"}` }, u?.status === "online" ? "Running" : u?.status === "starting" ? "Starting…" : "Off")), u && u.status !== "online" && /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "secondary-button",
      disabled: pe,
      onClick: () => {
        k("takeover");
      }
    },
    "Start this computer"
  ), u?.error && /* @__PURE__ */ e.createElement("p", { className: "screen-error" }, u.error)), /* @__PURE__ */ e.createElement("section", { className: "proactive-section" }, /* @__PURE__ */ e.createElement("label", { className: "proactive-row" }, /* @__PURE__ */ e.createElement(
    "input",
    {
      type: "checkbox",
      checked: $,
      onChange: (p) => {
        R(p.target.checked);
      }
    }
  ), /* @__PURE__ */ e.createElement("span", null, /* @__PURE__ */ e.createElement("strong", null, "Speak up unprompted"), /* @__PURE__ */ e.createElement("span", null, "Bring up work that is stuck, a few times a day, in this thread.")))), /* @__PURE__ */ e.createElement("section", { className: "routines-section" }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow" }, "Routines"), m.map((p) => /* @__PURE__ */ e.createElement("div", { className: "routine-row", key: p.id }, /* @__PURE__ */ e.createElement("div", null, /* @__PURE__ */ e.createElement("strong", null, p.name), /* @__PURE__ */ e.createElement("span", null, p.schedule)), /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "icon-button",
      "aria-label": `Cancel the routine ${p.name}`,
      onClick: () => {
        J(p.id);
      }
    },
    /* @__PURE__ */ e.createElement(Ve, { size: 14 })
  ))), m.length === 0 && /* @__PURE__ */ e.createElement("div", { className: "routine-empty" }, /* @__PURE__ */ e.createElement("p", null, "Nothing on a schedule yet. Ask for something like:"), xa(c).map((p) => /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "routine-suggestion",
      key: p,
      onClick: () => B(p)
    },
    p
  )))), /* @__PURE__ */ e.createElement("section", { className: "drawer-section" }, /* @__PURE__ */ e.createElement("div", { className: "drawer-tabs", role: "tablist", "aria-label": "More about this teammate" }, /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": D === "work",
      className: D === "work" ? "is-current" : "",
      onClick: () => ne((p) => p === "work" ? "" : "work")
    },
    "Work"
  ), /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": D === "files",
      className: D === "files" ? "is-current" : "",
      onClick: () => ne((p) => p === "files" ? "" : "files")
    },
    "Files",
    g.length > 0 && /* @__PURE__ */ e.createElement("span", { className: "drawer-count" }, g.length)
  ), /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": D === "permissions",
      className: D === "permissions" ? "is-current" : "",
      onClick: () => ne((p) => p === "permissions" ? "" : "permissions")
    },
    "Permissions"
  ), /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": D === "audit",
      className: D === "audit" ? "is-current" : "",
      onClick: () => ne((p) => p === "audit" ? "" : "audit")
    },
    "History"
  )), D === "work" && /* @__PURE__ */ e.createElement(Sa, { agentName: r, tasks: O }), D === "files" && /* @__PURE__ */ e.createElement(
    Ea,
    {
      agentName: r,
      artifacts: g,
      urlFor: d
    }
  ), D === "permissions" && /* @__PURE__ */ e.createElement(
    Ma,
    {
      agentName: r,
      grants: l,
      busy: o,
      onSetGrant: S,
      onClearGrant: j
    }
  ), D === "audit" && /* @__PURE__ */ e.createElement(
    fa,
    {
      events: b,
      loading: i,
      viewId: s,
      hasMore: y,
      onChangeView: te,
      onLoadMore: K
    }
  )), ve && /* @__PURE__ */ e.createElement(
    Pa,
    {
      session: me,
      failure: F,
      title: `${r}'s computer`,
      onClose: C,
      onReconnect: () => {
        k("takeover");
      }
    }
  ));
}
const et = 160, tt = 1e5, La = 800, za = 1e4, nt = "This page changed elsewhere. Your draft is safe — copy it before loading the latest version.", Ce = (t) => ({
  title: t.title,
  content: t.content,
  parent_id: t.parent_id
}), at = (t, n) => t.title === n.title && t.content === n.content && t.parent_id === n.parent_id, rt = (t) => !!t && typeof t == "object" && ("kind" in t && t.kind === "conflict" || "status" in t && t.status === 409);
class Ua {
  constructor(n) {
    this.save = n;
  }
  save;
  state = { status: "saved" };
  listeners = /* @__PURE__ */ new Set();
  timer;
  controller;
  pending;
  generation = 0;
  /** For `useSyncExternalStore`. */
  getSnapshot = () => this.state;
  subscribe = (n) => (this.listeners.add(n), () => {
    this.listeners.delete(n);
  });
  publish(n) {
    this.state = { ...this.state, ...n };
    for (const a of this.listeners) a();
  }
  get changed() {
    return !!(this.state.page && this.state.draft && !at(Ce(this.state.page), this.state.draft));
  }
  /** Whether there is anything a reload would lose. */
  get dirty() {
    return !!this.pending || this.changed || this.state.status === "error" || this.state.status === "conflict";
  }
  /**
   * A page arrived from the server — opened, or pushed while open.
   *
   * The three branches are the whole subtlety. A *different* page resets
   * everything. A newer revision of the *same* page while the draft is clean
   * is just the latest version. A newer revision while the draft is dirty is a
   * conflict, and the draft stays exactly where it is.
   */
  receive(n) {
    if (this.state.page?.id !== n.id) {
      this.generation++, clearTimeout(this.timer), this.controller?.abort(), this.pending = void 0, this.publish({
        page: n,
        draft: Ce(n),
        remote: n,
        status: "saved",
        error: void 0
      });
      return;
    }
    if (!(n.revision <= (this.state.remote?.revision ?? 0))) {
      if (this.pending) {
        this.publish({ remote: n });
        return;
      }
      if (this.dirty) {
        clearTimeout(this.timer), this.publish({ remote: n, status: "conflict", error: nt });
        return;
      }
      this.publish({
        page: n,
        remote: n,
        draft: Ce(n),
        status: "saved",
        error: void 0
      });
    }
  }
  /** A keystroke. */
  edit(n) {
    this.state.draft && (this.publish({ draft: { ...this.state.draft, ...n } }), !(this.state.status === "error" || this.state.status === "conflict") && (this.publish({
      status: this.pending ? "saving" : this.changed ? "dirty" : "saved",
      error: void 0
    }), this.schedule()));
  }
  schedule() {
    clearTimeout(this.timer), this.changed && !this.pending && this.state.status !== "error" && this.state.status !== "conflict" && (this.timer = setTimeout(() => {
      this.flush();
    }, La));
  }
  /**
   * Save now. `retry` is the operator asking again after an error — it is the
   * only way out of the `error` state, which is what keeps a failed save from
   * looping.
   */
  async flush(n = !1) {
    if (clearTimeout(this.timer), this.pending)
      return await this.pending, this.changed ? this.flush(n) : this.state.status === "saved";
    if (!this.state.page || !this.state.draft || this.state.status === "conflict" || this.state.status === "error" && !n)
      return !1;
    if (!this.changed && this.state.status !== "error")
      return this.publish({ status: "saved", error: void 0 }), !0;
    const a = this.state.page, r = { ...this.state.draft }, c = this.generation;
    if (!r.title.trim() || r.title.length > et || r.content.length > tt)
      return this.publish({
        status: "error",
        error: `Use a title up to ${et} characters and a document up to ${tt.toLocaleString("en-US")} characters. Your draft is still here.`
      }), !1;
    this.controller = new AbortController();
    const u = this.controller;
    this.publish({ status: "saving", error: void 0 });
    const h = (async () => {
      let l;
      try {
        const o = await Promise.race([
          this.save(
            a.id,
            {
              title: r.title,
              content: r.content,
              parent_id: r.parent_id,
              move: !0,
              expected_revision: a.revision
            },
            u.signal
          ),
          new Promise((s, y) => {
            l = setTimeout(() => {
              u.abort(), y(new Error("Saving timed out. Your draft is safe; retry when connected."));
            }, za);
          })
        ]);
        if (c !== this.generation) return !1;
        const b = at(this.state.draft, r), i = this.state.remote && this.state.remote.revision > o.revision ? this.state.remote : o;
        return this.publish({
          page: o,
          remote: i,
          draft: b ? Ce(o) : this.state.draft
        }), this.publish({
          status: i.revision > o.revision ? "conflict" : this.changed ? "dirty" : "saved",
          error: i.revision > o.revision ? "A newer revision exists. Your draft is preserved." : void 0
        }), this.state.status !== "conflict";
      } catch (o) {
        return c !== this.generation || this.publish({
          status: rt(o) ? "conflict" : "error",
          error: rt(o) ? nt : o instanceof Error ? o.message : "Could not save. Your draft is safe."
        }), !1;
      } finally {
        clearTimeout(l), c === this.generation && (this.pending = void 0, this.publish({}), this.schedule());
      }
    })();
    this.pending = h;
    const m = await h;
    return m && c === this.generation && this.changed ? this.flush(n) : m;
  }
  /**
   * Take the server's version and drop the draft. The explicit way out of a
   * conflict, and the only thing in here that discards work — so it is never
   * called on a timer.
   */
  useLatest() {
    const n = this.state.remote;
    n && (this.generation++, clearTimeout(this.timer), this.controller?.abort(), this.pending = void 0, this.publish({
      page: n,
      draft: Ce(n),
      remote: n,
      status: "saved",
      error: void 0
    }));
  }
  dispose() {
    this.generation++, clearTimeout(this.timer), this.controller?.abort(), this.pending = void 0, this.listeners.clear();
  }
}
const qa = Pe(async () => ({ default: (await import("./chunk-mermaid-HWGCJPDP-CLfmBW3m.js").then((t) => t.i)).Streamdown }));
function Ha(t) {
  const n = new Map(
    t.map((r) => [r.id, { page: r, children: [] }])
  ), a = [];
  for (const r of n.values()) {
    const c = r.page.parent_id ? n.get(r.page.parent_id) : void 0;
    c && c !== r ? c.children.push(r) : a.push(r);
  }
  return a;
}
const ja = {
  saved: "Saved",
  dirty: "Unsaved changes",
  saving: "Saving…",
  error: "Not saved",
  conflict: "Changed elsewhere"
};
function Fa({ state: t }) {
  const n = t.status === "saving" ? Te : t.status === "saved" ? Me : Oe;
  return /* @__PURE__ */ e.createElement("span", { className: `space-save space-save-${t.status}` }, /* @__PURE__ */ e.createElement(n, { size: 13, className: t.status === "saving" ? "space-spin" : void 0 }), ja[t.status]);
}
function Va({ client: t, agents: n }) {
  const [a, r] = N([]), [c, u] = N(""), [h, m] = N([]), [l, o] = N(""), [b, i] = N(""), [s, y] = N(!1), [g, d] = N(""), [O, $] = N(!1), R = fe(
    () => new Ua((E, D, ne) => t.patchPage(c, E, D, ne)),
    [t, c]
  );
  U(() => () => R.dispose(), [R]);
  const P = ct(R.subscribe, R.getSnapshot), H = a.find((E) => E.id === c), J = Ee(async () => {
    try {
      const E = await t.listSpaces();
      r(E), u((D) => E.some((ne) => ne.id === D) ? D : E[0]?.id ?? "");
    } catch (E) {
      d(E instanceof Error ? E.message : "Could not load Spaces.");
    }
  }, [t]), B = Ee(async () => {
    if (!c) return m([]);
    try {
      m(await t.listPages(c, b));
    } catch (E) {
      d(E instanceof Error ? E.message : "Could not load this Space.");
    }
  }, [t, c, b]);
  U(() => {
    J();
  }, [J]), U(() => {
    const E = setTimeout(() => {
      B();
    }, b ? 200 : 0);
    return () => clearTimeout(E);
  }, [B, b]), U(() => {
    if (!c || !l) return;
    let E = !0;
    return t.getPage(c, l).then((D) => {
      E && R.receive(D);
    }).catch((D) => {
      E && d(D instanceof Error ? D.message : "Could not open that page.");
    }), () => {
      E = !1;
    };
  }, [R, t, l, c]), U(() => {
    const E = (D) => {
      R.dirty && D.preventDefault();
    };
    return window.addEventListener("beforeunload", E), () => window.removeEventListener("beforeunload", E);
  }, [R]);
  const S = async () => {
    if (c)
      try {
        const E = await t.createPage(c, { title: "Untitled", content: "" });
        await B(), o(E.id);
      } catch (E) {
        d(E instanceof Error ? E.message : "Could not create the page.");
      }
  }, j = async () => {
    const E = window.prompt("Name this Space")?.trim();
    if (E)
      try {
        const D = await t.createSpace(E);
        await J(), u(D.id), o("");
      } catch (D) {
        d(D instanceof Error ? D.message : "Could not create the Space.");
      }
  }, te = async (E) => {
    window.confirm(`Delete “${E.title}”? Its sub-pages move up a level.`) && (await t.deletePage(c, E.id), E.id === l && o(""), await B());
  }, K = async (E, D) => {
    await t.setSpaceMember(c, E, D), await J();
  }, de = async () => {
    const E = P.draft;
    if (E)
      try {
        await navigator.clipboard.writeText(`# ${E.title}

${E.content}`), $(!0), setTimeout(() => $(!1), 2500);
      } catch {
        d("Could not reach the clipboard. Select the text and copy it.");
      }
  }, Z = fe(() => Ha(h), [h]);
  return /* @__PURE__ */ e.createElement("div", { className: "spaces-panel" }, /* @__PURE__ */ e.createElement("aside", { className: "spaces-library" }, /* @__PURE__ */ e.createElement("header", { className: "spaces-library-head" }, /* @__PURE__ */ e.createElement(
    "select",
    {
      className: "spaces-picker",
      value: c,
      onChange: (E) => {
        u(E.target.value), o("");
      },
      "aria-label": "Space"
    },
    a.length === 0 && /* @__PURE__ */ e.createElement("option", { value: "" }, "No Spaces yet"),
    a.map((E) => /* @__PURE__ */ e.createElement("option", { key: E.id, value: E.id }, E.name))
  ), /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "spaces-icon-button",
      onClick: () => {
        j();
      },
      title: "New Space",
      "aria-label": "New Space"
    },
    /* @__PURE__ */ e.createElement(Ae, { size: 15 })
  )), /* @__PURE__ */ e.createElement("div", { className: "spaces-search" }, /* @__PURE__ */ e.createElement(Fe, { size: 14 }), /* @__PURE__ */ e.createElement(
    "input",
    {
      value: b,
      onChange: (E) => i(E.target.value),
      placeholder: "Search this Space",
      "aria-label": "Search this Space"
    }
  )), /* @__PURE__ */ e.createElement("nav", { className: "spaces-tree", "aria-label": "Pages" }, Z.length === 0 && /* @__PURE__ */ e.createElement("p", { className: "spaces-empty" }, b ? "Nothing matches." : "No pages yet."), Z.map((E) => /* @__PURE__ */ e.createElement(
    wt,
    {
      key: E.page.id,
      node: E,
      depth: 0,
      activeId: l,
      onOpen: o,
      onDelete: te
    }
  ))), /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "spaces-new-page",
      onClick: () => {
        S();
      },
      disabled: !c
    },
    /* @__PURE__ */ e.createElement(Ae, { size: 14 }),
    " New page"
  ), H && /* @__PURE__ */ e.createElement("section", { className: "spaces-members" }, /* @__PURE__ */ e.createElement("h4", null, /* @__PURE__ */ e.createElement(ft, { size: 13 }), " Who can read this"), n.length === 0 && /* @__PURE__ */ e.createElement("p", { className: "spaces-empty" }, "No teammates yet."), n.map((E) => {
    const D = H.bot_ids.includes(E.id);
    return /* @__PURE__ */ e.createElement("label", { key: E.id, className: "spaces-member" }, /* @__PURE__ */ e.createElement(
      "input",
      {
        type: "checkbox",
        checked: D,
        onChange: () => {
          K(E.id, !D);
        }
      }
    ), /* @__PURE__ */ e.createElement("span", null, E.avatar, " ", E.name));
  }), /* @__PURE__ */ e.createElement("p", { className: "spaces-note" }, "A teammate you remove stops being able to read this on its very next tool call, not its next turn."))), /* @__PURE__ */ e.createElement("section", { className: "spaces-editor" }, g && /* @__PURE__ */ e.createElement("p", { className: "spaces-problem", role: "status" }, g, /* @__PURE__ */ e.createElement("button", { type: "button", onClick: () => d("") }, "Dismiss")), !P.page && /* @__PURE__ */ e.createElement("div", { className: "spaces-placeholder" }, /* @__PURE__ */ e.createElement(be, { size: 28 }), /* @__PURE__ */ e.createElement("p", null, "Pick a page, or start one.")), P.page && P.draft && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("header", { className: "spaces-editor-head" }, /* @__PURE__ */ e.createElement(
    "input",
    {
      className: "spaces-title",
      value: P.draft.title,
      onChange: (E) => R.edit({ title: E.target.value }),
      "aria-label": "Page title"
    }
  ), /* @__PURE__ */ e.createElement("div", { className: "spaces-editor-actions" }, /* @__PURE__ */ e.createElement(Fa, { state: P }), /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "spaces-icon-button",
      "aria-pressed": s,
      title: s ? "Edit" : "Preview",
      onClick: () => y((E) => !E)
    },
    /* @__PURE__ */ e.createElement(yn, { size: 15 })
  ))), P.status === "conflict" && /* @__PURE__ */ e.createElement("div", { className: "spaces-conflict", role: "alert" }, /* @__PURE__ */ e.createElement(Oe, { size: 16 }), /* @__PURE__ */ e.createElement("div", null, /* @__PURE__ */ e.createElement("strong", null, P.error), /* @__PURE__ */ e.createElement("p", null, "Nothing has been overwritten and nothing will be saved until you choose.")), /* @__PURE__ */ e.createElement("div", { className: "spaces-conflict-actions" }, /* @__PURE__ */ e.createElement("button", { type: "button", onClick: () => {
    de();
  } }, O ? "Copied" : "Copy my draft"), /* @__PURE__ */ e.createElement("button", { type: "button", className: "primary", onClick: () => R.useLatest() }, "Load the latest"))), P.status === "error" && /* @__PURE__ */ e.createElement("div", { className: "spaces-conflict spaces-conflict-error", role: "alert" }, /* @__PURE__ */ e.createElement(Oe, { size: 16 }), /* @__PURE__ */ e.createElement("div", null, /* @__PURE__ */ e.createElement("strong", null, P.error)), /* @__PURE__ */ e.createElement("div", { className: "spaces-conflict-actions" }, /* @__PURE__ */ e.createElement("button", { type: "button", className: "primary", onClick: () => {
    R.flush(!0);
  } }, /* @__PURE__ */ e.createElement(In, { size: 13 }), " Try again"))), s ? /* @__PURE__ */ e.createElement("div", { className: "spaces-preview" }, /* @__PURE__ */ e.createElement(De, { fallback: /* @__PURE__ */ e.createElement("p", { className: "spaces-empty" }, "Rendering…") }, /* @__PURE__ */ e.createElement(qa, { mode: "static", controls: !1, linkSafety: { enabled: !0 }, skipHtml: !0 }, P.draft.content))) : /* @__PURE__ */ e.createElement(
    "textarea",
    {
      className: "spaces-body",
      value: P.draft.content,
      spellCheck: !0,
      onChange: (E) => R.edit({ content: E.target.value }),
      "aria-label": "Page content",
      placeholder: "Markdown."
    }
  ), /* @__PURE__ */ e.createElement("footer", { className: "spaces-editor-foot" }, /* @__PURE__ */ e.createElement("span", null, "Revision ", P.page.revision), P.page.created_by && /* @__PURE__ */ e.createElement("span", null, "Started by ", P.page.created_by)))));
}
function wt({
  node: t,
  depth: n,
  activeId: a,
  onOpen: r,
  onDelete: c
}) {
  const [u, h] = N(!0), m = t.children.length > 0;
  return /* @__PURE__ */ e.createElement("div", { className: "spaces-tree-node" }, /* @__PURE__ */ e.createElement(
    "div",
    {
      className: `spaces-tree-row${t.page.id === a ? " is-active" : ""}`,
      style: { paddingLeft: 8 + n * 14 }
    },
    /* @__PURE__ */ e.createElement(
      "button",
      {
        type: "button",
        className: `spaces-twisty${m ? "" : " is-leaf"}`,
        onClick: () => h((l) => !l),
        "aria-label": u ? "Collapse" : "Expand",
        "aria-expanded": m ? u : void 0,
        disabled: !m
      },
      /* @__PURE__ */ e.createElement(Re, { size: 13, className: u ? "spaces-twisty-open" : void 0 })
    ),
    /* @__PURE__ */ e.createElement("button", { type: "button", className: "spaces-tree-title", onClick: () => r(t.page.id) }, t.page.title),
    /* @__PURE__ */ e.createElement(
      "button",
      {
        type: "button",
        className: "spaces-icon-button spaces-row-delete",
        onClick: () => c(t.page),
        title: `Delete ${t.page.title}`,
        "aria-label": `Delete ${t.page.title}`
      },
      /* @__PURE__ */ e.createElement(Ve, { size: 13 })
    )
  ), u && t.children.map((l) => /* @__PURE__ */ e.createElement(
    wt,
    {
      key: l.page.id,
      node: l,
      depth: n + 1,
      activeId: a,
      onOpen: r,
      onDelete: c
    }
  )));
}
function Ba({
  value: t,
  options: n,
  ariaLabel: a,
  placeholder: r = "Select",
  onChange: c,
  onOpen: u
}) {
  const [h, m] = N(!1), [l, o] = N(), b = Y(null), i = Y(null), s = n.find((d) => d.value === t);
  U(() => {
    if (!h) return;
    const d = () => {
      const $ = b.current?.getBoundingClientRect();
      if (!$) return;
      const R = 5, P = 8, H = Math.max($.width, 180), J = Math.min(220, n.length * 32 + 10), B = window.innerHeight - $.bottom - P, S = B < J && $.top - P > B;
      o({
        position: "fixed",
        zIndex: 100,
        left: Math.max(P, Math.min($.right - H, window.innerWidth - H - P)),
        top: S ? Math.max(P, $.top - J - R) : $.bottom + R,
        width: H,
        maxHeight: S ? Math.min(220, $.top - R - P) : Math.min(220, B)
      });
    }, O = ($) => {
      const R = $.target;
      !b.current?.contains(R) && !i.current?.contains(R) && m(!1);
    };
    return d(), window.addEventListener("pointerdown", O), window.addEventListener("resize", d), window.addEventListener("scroll", d, !0), () => {
      window.removeEventListener("pointerdown", O), window.removeEventListener("resize", d), window.removeEventListener("scroll", d, !0);
    };
  }, [h, n.length]);
  const y = (d) => {
    const O = n.filter((P) => !P.disabled && !P.action);
    if (!O.length) return;
    const $ = O.findIndex((P) => P.value === t), R = $ < 0 ? d > 0 ? 0 : O.length - 1 : ($ + d + O.length) % O.length;
    c(O[R].value);
  }, g = () => m((d) => (d || u?.(), !d));
  return /* @__PURE__ */ e.createElement("div", { className: `crew-select ${h ? "open" : ""}`, ref: b }, /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "crew-select-trigger",
      "aria-label": a,
      "aria-haspopup": "listbox",
      "aria-expanded": h,
      onClick: g,
      onKeyDown: (d) => {
        if (d.key === "Escape") {
          m(!1);
          return;
        }
        (d.key === "ArrowDown" || d.key === "ArrowUp") && (d.preventDefault(), y(d.key === "ArrowDown" ? 1 : -1), h || u?.(), m(!0));
      }
    },
    /* @__PURE__ */ e.createElement("span", null, s?.label ?? r),
    /* @__PURE__ */ e.createElement("span", { className: "crew-select-chevron" }, /* @__PURE__ */ e.createElement(cn, { size: 15 }))
  ), h && l && vt.createPortal(
    /* @__PURE__ */ e.createElement(
      "div",
      {
        className: "crew-select-menu crew-select-menu-portal",
        ref: i,
        style: l,
        role: "listbox",
        "aria-label": a
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
            d.action?.(), d.action || c(d.value), m(!1);
          }
        },
        (d.action || d.icon) && /* @__PURE__ */ e.createElement("span", { className: "crew-select-check", "aria-hidden": "true" }, d.icon),
        /* @__PURE__ */ e.createElement("span", { className: "crew-select-label", title: d.label }, d.label),
        !d.action && /* @__PURE__ */ e.createElement("span", { className: "crew-select-check", "aria-hidden": "true" }, d.value === t && /* @__PURE__ */ e.createElement(Me, { size: 14 }))
      ))
    ),
    document.body
  ));
}
const Wa = ["🤖", "🔎", "📥", "📈", "🎖️", "🧭", "🛠️", "📚", "🧪", "✍️", "🗂️", "🛰️"];
function st({
  editing: t,
  providers: n,
  busy: a,
  error: r,
  onSubmit: c,
  onClose: u
}) {
  const [h, m] = N(t?.name ?? ""), [l, o] = N(t?.role ?? ""), [b, i] = N(t?.avatar || "🤖"), [s, y] = N("");
  U(() => {
    const d = (O) => {
      O.key === "Escape" && u();
    };
    return window.addEventListener("keydown", d), () => window.removeEventListener("keydown", d);
  }, [u]);
  const g = !!h.trim() && !a;
  return /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "palette-backdrop",
      role: "presentation",
      onMouseDown: (d) => {
        d.target === d.currentTarget && u();
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
          d.preventDefault(), g && c({ name: h.trim(), role: l.trim(), emoji: b, modelProviderId: s });
        }
      },
      /* @__PURE__ */ e.createElement("h2", null, t ? `Edit ${t.name}` : "Hire a teammate"),
      /* @__PURE__ */ e.createElement("label", { className: "crew-field" }, /* @__PURE__ */ e.createElement("span", null, "Name"), /* @__PURE__ */ e.createElement(
        "input",
        {
          autoFocus: !t,
          value: h,
          disabled: !!t,
          placeholder: "Scout",
          onChange: (d) => m(d.target.value)
        }
      ), t && /* @__PURE__ */ e.createElement("small", null, "A teammate's name is its profile directory, so it cannot be changed here.")),
      /* @__PURE__ */ e.createElement("label", { className: "crew-field" }, /* @__PURE__ */ e.createElement("span", null, "Their job, in one line"), /* @__PURE__ */ e.createElement(
        "input",
        {
          autoFocus: !!t,
          value: l,
          placeholder: "Turns a one-line question into a decision-ready brief with sources",
          onChange: (d) => o(d.target.value)
        }
      )),
      /* @__PURE__ */ e.createElement("div", { className: "crew-field" }, /* @__PURE__ */ e.createElement("span", null, "Face"), /* @__PURE__ */ e.createElement("div", { className: "crew-emoji-row" }, Wa.map((d) => /* @__PURE__ */ e.createElement(
        "button",
        {
          type: "button",
          key: d,
          className: `crew-emoji ${d === b ? "selected" : ""}`,
          "aria-label": `Use ${d}`,
          "aria-pressed": d === b,
          onClick: () => i(d)
        },
        d
      )))),
      !t && n.length > 0 && /* @__PURE__ */ e.createElement("div", { className: "crew-field" }, /* @__PURE__ */ e.createElement("span", null, "Model"), /* @__PURE__ */ e.createElement(
        Ba,
        {
          ariaLabel: "Model provider",
          placeholder: "Same as your default profile",
          value: s,
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
          onChange: y
        }
      )),
      r && /* @__PURE__ */ e.createElement("p", { className: "crew-dialog-error" }, r),
      /* @__PURE__ */ e.createElement("div", { className: "crew-dialog-actions" }, /* @__PURE__ */ e.createElement("button", { type: "button", className: "secondary-button", onClick: u }, "Cancel"), /* @__PURE__ */ e.createElement("button", { className: "primary-button", disabled: !g }, a ? "Working…" : t ? "Save" : "Hire"))
    )
  );
}
const bt = "hermes-crew:detail-width";
function Ga() {
  try {
    const t = window.localStorage?.getItem(bt), n = t ? Number.parseInt(t, 10) : Number.NaN;
    return Number.isFinite(n) ? Math.max(280, n) : 360;
  } catch {
    return 360;
  }
}
function Ka({ client: t, notify: n }) {
  const a = Zt(t, { notify: n }), [r, c] = N(""), [u, h] = N([]), [m, l] = N([]), [o, b] = N([]), [i, s] = N(!1), [y, g] = N([]), [d, O] = N(!1), [$, R] = N({ id: "all", types: [] }), [P, H] = N(null), [J, B] = N([]), [S, j] = N([]), [te, K] = N(!1), [de, Z] = N("chat"), [E, D] = N(Ga), [ne, pe] = N(!1), [he, oe] = N(), [W, se] = N(!1), [ae, G] = N(), [ie, me] = N(0), [ue, ve] = N({ text: "", nonce: 0 }), { agents: _, conversations: F, selectedAgent: v, selectedAgentId: T, selectedThreadId: q } = a, V = fe(() => F.filter((f) => f.kind === "group"), [F]), L = fe(() => new Map(_.map((f) => [f.id, f])), [_]), k = fe(
    () => F.find((f) => f.id === q),
    [F, q]
  ), C = a.approvals.filter((f) => f.status === "pending").length;
  U(() => {
    try {
      window.localStorage?.setItem(bt, String(E));
    } catch {
    }
  }, [E]);
  const w = Ee(() => {
    t.listSections().then(h).catch(() => h([]));
  }, [t]);
  U(w, [w, _.length]), U(() => {
    if (!T) {
      l([]);
      return;
    }
    let f = !0;
    return t.listRoutines(T).then((I) => {
      f && l(I);
    }).catch(() => {
      f && l([]);
    }), () => {
      f = !1;
    };
  }, [t, T]), U(() => {
    if (!T) {
      b([]);
      return;
    }
    let f = !0;
    return t.listGrants(T).then((I) => {
      f && b(I);
    }).catch(() => {
      f && b([]);
    }), () => {
      f = !1;
    };
  }, [t, T]);
  const M = Ee(() => {
    if (!T) {
      B([]);
      return;
    }
    t.listArtifacts(T).then(B).catch(() => B([]));
  }, [t, T]);
  U(M, [M]);
  const p = v?.status;
  U(() => {
    p !== "working" && M();
  }, [p, M]), U(() => {
    if (!T) {
      j([]);
      return;
    }
    let f = !0;
    return t.listTasks(T).then((I) => {
      f && j(I);
    }).catch(() => {
      f && j([]);
    }), () => {
      f = !1;
    };
  }, [t, T, p]);
  const x = Ee((f, I) => {
    if (!T) {
      g([]), H(null);
      return;
    }
    O(!0), t.listAuditEvents({
      agentId: T,
      eventTypes: f,
      beforeId: I,
      limit: 50
    }).then((Q) => {
      g((re) => I ? [...re, ...Q.events] : Q.events), H(Q.nextBeforeId);
    }).catch(() => {
      I || (g([]), H(null));
    }).finally(() => O(!1));
  }, [t, T]);
  U(() => {
    x($.types);
  }, [x, $]), U(() => {
    C > 0 && K(!0);
  }, [C]), U(() => {
    const f = (I) => {
      (I.metaKey || I.ctrlKey) && I.key.toLowerCase() === "k" && (I.preventDefault(), pe((Q) => !Q));
    };
    return window.addEventListener("keydown", f), () => window.removeEventListener("keydown", f);
  }, []);
  const z = (f, I) => {
    const Q = u.map((re) => re.id === f ? { ...re, collapsed: I } : re);
    h(Q), t.saveSections(Q).then(h).catch(w);
  }, X = (f, I) => {
    if (I === "edit") {
      G(void 0), oe({ editing: f });
      return;
    }
    if (I === "duplicate") {
      a.duplicateAgent(f.id).catch(() => {
      });
      return;
    }
    window.confirm(`Remove ${f.name} from the crew? Their profile, memory and skills stay on disk.`) && a.deleteAgent(f.id).catch(() => {
    });
  }, ee = async (f) => {
    se(!0), G(void 0);
    try {
      he?.editing ? await a.updateAgent(he.editing.id, { role: f.role, emoji: f.emoji }) : await a.createAgent({
        name: f.name,
        role: f.role,
        emoji: f.emoji,
        modelProviderId: f.modelProviderId || void 0
      }), oe(void 0), w();
    } catch (I) {
      G(I instanceof Error ? I.message : "That did not work.");
    } finally {
      se(!1);
    }
  }, ge = fe(() => ({
    onDecide: (f, I) => {
      a.respondToApproval(f, I).catch(() => {
      });
    },
    // A login request is the one chip that is an instruction to the operator,
    // so its button does the thing rather than pointing at where the thing is.
    onOpenScreen: () => {
      K(!0), a.openComputer("takeover").catch(() => {
      });
    },
    onSubmitSecret: async (f, I) => {
      v && await t.submitSecret(v.id, f, I);
    },
    screenshotUrl: (f, I) => t.screenshotUrl(f, I),
    // Not caught here: `WhatChanged` has to tell "nothing changed" apart from
    // "we could not find out", and swallowing the rejection would collapse the
    // second into the first — the exact silence the panel exists to remove.
    loadEffects: async (f) => (await t.listTurnEffects(f)).effects,
    // Not caught: the chip has to tell "resumed" from "the route refused",
    // and a 409 (a one-shot whose time has passed) is a real answer.
    onResumeRoutine: async (f) => {
      v && await t.setRoutineEnabled(v.id, f, !0);
    },
    onOpenDetails: () => K(!0),
    undoEffect: async (f) => {
      await t.undoEffect(f);
    }
  }), [t, a]);
  return a.loading ? /* @__PURE__ */ e.createElement("div", { className: "crew-workspace is-loading", role: "status" }, "Loading your crew…") : _.length ? /* @__PURE__ */ e.createElement("div", { className: "crew-workspace" }, /* @__PURE__ */ e.createElement(
    Un,
    {
      agents: _,
      sections: u,
      rooms: V,
      selectedAgentId: T,
      selectedThreadId: q,
      search: r,
      onSearch: c,
      onSelectAgent: (f) => {
        a.setSelectedAgentId(f), me((I) => I + 1);
      },
      onSelectThread: (f) => {
        a.setSelectedThreadId(f), me((I) => I + 1);
      },
      onAction: X,
      onCreate: () => {
        G(void 0), oe({});
      },
      onToggleSection: z,
      view: de,
      onChangeView: Z
    }
  ), de === "spaces" ? /* @__PURE__ */ e.createElement(Va, { client: t, agents: _ }) : /* @__PURE__ */ e.createElement(
    da,
    {
      agent: v,
      thread: k,
      agentsById: L,
      messages: a.messages,
      activities: a.activities,
      chips: ge,
      loading: a.conversationLoading,
      focusRequest: ie,
      draft: ue,
      onSend: (f) => a.sendMessage(f).catch(() => {
      }),
      onToggleDetails: () => K((f) => !f)
    }
  ), te && v && /* @__PURE__ */ e.createElement(
    $a,
    {
      open: te,
      width: E,
      onResize: D,
      agentName: v.name,
      agentRole: v.role,
      computer: a.computer,
      approvals: a.approvals,
      routines: m,
      grants: o,
      grantsBusy: i,
      audit: y,
      auditLoading: d,
      auditView: $.id,
      auditHasMore: P !== null,
      artifacts: J,
      artifactUrl: (f) => t.artifactUrl(f),
      tasks: S,
      proactive: v.proactive !== !1,
      onSetProactive: (f) => a.updateAgent(v.id, { proactive: f }),
      onApproval: (f, I, Q, re) => a.respondToApproval(f, I, Q, re),
      onComputerAction: (f) => a.openComputer(f),
      onDraft: (f) => ve((I) => ({ text: f, nonce: I.nonce + 1 })),
      onDeleteRoutine: async (f) => {
        await t.deleteRoutine(v.id, f), l((I) => I.filter((Q) => Q.id !== f));
      },
      onSetGrant: async (f, I) => {
        s(!0);
        try {
          const Q = await t.setGrant({ agentId: v.id, tool: f, mode: I });
          b((re) => re.map((ke) => ke.tool === f ? { ...ke, ...Q } : ke));
        } finally {
          s(!1);
        }
      },
      onClearGrant: async (f) => {
        s(!0);
        try {
          const I = await t.clearGrant(v.id, f);
          b((Q) => Q.map((re) => re.tool === f ? { ...re, ...I } : re));
        } finally {
          s(!1);
        }
      },
      onChangeAuditView: (f, I) => R({ id: f, types: I }),
      onLoadMoreAudit: () => {
        P !== null && x($.types, P);
      },
      onClose: () => K(!1)
    }
  ), /* @__PURE__ */ e.createElement(
    qn,
    {
      open: ne,
      agents: _,
      rooms: V,
      onClose: () => pe(!1),
      onSelectAgent: a.setSelectedAgentId,
      onSelectThread: a.setSelectedThreadId,
      onCreateAgent: () => {
        G(void 0), oe({});
      },
      onComputer: () => K(!0)
    }
  ), he && /* @__PURE__ */ e.createElement(
    st,
    {
      editing: he.editing,
      providers: a.modelProviders,
      busy: W,
      error: ae,
      onSubmit: ee,
      onClose: () => oe(void 0)
    }
  ), a.error && /* @__PURE__ */ e.createElement("div", { className: "crew-toast", role: "alert" }, /* @__PURE__ */ e.createElement("span", null, a.error), /* @__PURE__ */ e.createElement("button", { className: "icon-button", "aria-label": "Dismiss", onClick: a.dismissError }, "×"))) : /* @__PURE__ */ e.createElement("div", { className: "crew-workspace is-empty" }, /* @__PURE__ */ e.createElement("div", { className: "crew-empty-card" }, /* @__PURE__ */ e.createElement("h2", null, "No teammates yet"), /* @__PURE__ */ e.createElement("p", null, "A teammate is a Hermes profile with a thread, a memory and a computer of its own. Give one a name and a one-line job to start."), /* @__PURE__ */ e.createElement("button", { className: "primary-button", onClick: () => {
    G(void 0), oe({});
  } }, "Hire your first teammate")), he && /* @__PURE__ */ e.createElement(
    st,
    {
      providers: a.modelProviders,
      busy: W,
      error: ae,
      onSubmit: ee,
      onClose: () => oe(void 0)
    }
  ));
}
const Le = 500, Ya = 15e3;
function Xa(t, n) {
  return t === 401 || t === 403 ? new we("unauthorized", n) : t === 404 ? new we("not_found", n) : t === 409 ? new we("conflict", n) : new we("unknown", n, t >= 500);
}
function Ja(t) {
  const n = new URL(t, globalThis.location?.href ?? "http://127.0.0.1");
  return n.protocol = n.protocol === "https:" ? "wss:" : "ws:", n.pathname = `${n.pathname.replace(/\/+$/, "")}/v1/events`, n.toString();
}
class Za {
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
  reconnectDelay = Le;
  reconnectTimer;
  opening = !1;
  closed = !1;
  constructor(n) {
    this.baseUrl = n.baseUrl.replace(/\/+$/, "");
    const a = n.eventsUrl ?? Ja(this.baseUrl);
    this.resolveEventsUrl = typeof a == "function" ? a : async () => a, this.fetchImpl = n.fetchImpl ?? ((r, c) => fetch(r, c)), this.headers = n.headers ?? (() => ({}));
  }
  async request(n, a = {}) {
    let r;
    try {
      r = await this.fetchImpl(`${this.baseUrl}${n}`, {
        ...a,
        headers: {
          ...a.body ? { "Content-Type": "application/json" } : {},
          ...this.headers(),
          ...a.headers ?? {}
        }
      });
    } catch (c) {
      throw c instanceof DOMException && c.name === "AbortError" ? c : new we("network", "Could not reach the crew backend.", !0);
    }
    if (!r.ok) {
      const c = await r.json().then((u) => u?.detail).catch(() => {
      });
      throw Xa(r.status, c ?? `Crew request failed (${r.status})`);
    }
    if (r.status !== 204)
      return await r.json();
  }
  listModelProviders(n) {
    return this.request("/v1/model-providers", { signal: n });
  }
  listAgents(n) {
    return this.request("/v1/agents", { signal: n });
  }
  getAgent(n, a) {
    return this.request(`/v1/agents/${encodeURIComponent(n)}`, { signal: a });
  }
  createAgent(n, a) {
    return this.request("/v1/agents", {
      method: "POST",
      body: JSON.stringify(n),
      signal: a
    });
  }
  /**
   * Hand one field to the teammate's page. The value is an argument and
   * nothing else — it is not cached, not retried, and the response carries
   * no echo of it.
   */
  submitSecret(n, a, r, c) {
    return this.request(
      `/bots/${encodeURIComponent(n)}/secret`,
      { method: "POST", body: JSON.stringify({ ref: a, value: r }), signal: c }
    );
  }
  // -- Spaces ---------------------------------------------------------------
  //
  // `request` already turns a 409 into `CrewError{kind:"conflict"}`, which is
  // what `PageAutosave` keys its terminal conflict state off. Nothing here may
  // swallow it.
  listSpaces(n) {
    return this.request("/spaces", { signal: n }).then((a) => a.spaces);
  }
  createSpace(n, a) {
    return this.request("/spaces", {
      method: "POST",
      body: JSON.stringify({ name: n }),
      signal: a
    });
  }
  async deleteSpace(n, a) {
    await this.request(`/spaces/${encodeURIComponent(n)}`, {
      method: "DELETE",
      signal: a
    });
  }
  async setSpaceMember(n, a, r, c) {
    await this.request(
      `/spaces/${encodeURIComponent(n)}/members/${encodeURIComponent(a)}`,
      { method: r ? "PUT" : "DELETE", signal: c }
    );
  }
  listPages(n, a = "", r) {
    const c = a.trim() ? `?query=${encodeURIComponent(a.trim())}` : "";
    return this.request(
      `/spaces/${encodeURIComponent(n)}/pages${c}`,
      { signal: r }
    ).then((u) => u.pages);
  }
  getPage(n, a, r) {
    return this.request(
      `/spaces/${encodeURIComponent(n)}/pages/${encodeURIComponent(a)}`,
      { signal: r }
    );
  }
  createPage(n, a, r) {
    return this.request(`/spaces/${encodeURIComponent(n)}/pages`, {
      method: "POST",
      body: JSON.stringify(a),
      signal: r
    });
  }
  patchPage(n, a, r, c) {
    return this.request(
      `/spaces/${encodeURIComponent(n)}/pages/${encodeURIComponent(a)}`,
      { method: "PATCH", body: JSON.stringify(r), signal: c }
    );
  }
  listTurnEffects(n, a) {
    return this.request(
      `/turns/${encodeURIComponent(n)}/effects`,
      { signal: a }
    );
  }
  /** Put one change back. 409 means there is no inverse for it. */
  undoEffect(n, a) {
    return this.request(
      `/effects/${encodeURIComponent(n)}/undo`,
      { method: "POST", signal: a }
    );
  }
  async deletePage(n, a, r) {
    await this.request(
      `/spaces/${encodeURIComponent(n)}/pages/${encodeURIComponent(a)}`,
      { method: "DELETE", signal: r }
    );
  }
  updateAgent(n, a, r) {
    return this.request(`/v1/agents/${encodeURIComponent(n)}`, {
      method: "PATCH",
      body: JSON.stringify(a),
      signal: r
    });
  }
  async deleteAgent(n, a) {
    await this.request(`/v1/agents/${encodeURIComponent(n)}`, {
      method: "DELETE",
      signal: a
    });
  }
  duplicateAgent(n, a) {
    return this.request(`/v1/agents/${encodeURIComponent(n)}/duplicate`, {
      method: "POST",
      signal: a
    });
  }
  listConversations(n, a) {
    const r = n ? `?agentId=${encodeURIComponent(n)}` : "";
    return this.request(`/v1/conversations${r}`, { signal: a });
  }
  getConversation(n, a) {
    return this.request(
      `/v1/conversations/${encodeURIComponent(n)}`,
      { signal: a }
    );
  }
  sendMessage(n) {
    return this.request(
      `/v1/conversations/${encodeURIComponent(n.conversationId)}/messages`,
      { method: "POST", body: JSON.stringify({ text: n.text }), signal: n.signal }
    );
  }
  listApprovalRequests(n, a) {
    const r = n ? `?agentId=${encodeURIComponent(n)}` : "";
    return this.request(`/v1/approvals${r}`, { signal: a });
  }
  respondToApproval(n, a) {
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
        signal: a
      }
    );
  }
  getComputer(n, a) {
    return this.request(`/v1/agents/${encodeURIComponent(n)}/computer`, {
      signal: a
    });
  }
  openComputer(n, a) {
    return this.request(
      `/v1/agents/${encodeURIComponent(n)}/computer/open`,
      { method: "POST", signal: a }
    );
  }
  takeOverComputer(n, a) {
    return this.request(
      `/v1/agents/${encodeURIComponent(n)}/computer/takeover`,
      { method: "POST", signal: a }
    );
  }
  async reconnect(n) {
    this.closeSocket(), this.reconnectDelay = Le, this.listeners.size && this.openSocket(), await this.listAgents(n);
  }
  listSections(n) {
    return this.request("/sections", { signal: n }).then((a) => a.sections);
  }
  saveSections(n, a) {
    return this.request("/sections", {
      method: "PUT",
      body: JSON.stringify(n),
      signal: a
    }).then((r) => r.sections);
  }
  listRoutines(n, a) {
    return this.request(
      `/bots/${encodeURIComponent(n)}/routines`,
      { signal: a }
    ).then((r) => r.routines);
  }
  /**
   * Pause or resume a routine.
   *
   * The route has existed since the first crew commit with no caller anywhere,
   * so "always-on" meant "on, with no off switch" — the standstill chip's
   * Resume button is its first consumer. 409 is a real answer, not a failure
   * to look: it means resuming a one-shot whose time has passed.
   */
  setRoutineEnabled(n, a, r, c) {
    return this.request(
      `/bots/${encodeURIComponent(n)}/routines/${encodeURIComponent(a)}`,
      { method: "PATCH", body: JSON.stringify({ enabled: r }), signal: c }
    );
  }
  async deleteRoutine(n, a, r) {
    await this.request(
      `/bots/${encodeURIComponent(n)}/routines/${encodeURIComponent(a)}`,
      { method: "DELETE", signal: r }
    );
  }
  listGrants(n, a) {
    return this.request(
      `/bots/${encodeURIComponent(n)}/grants`,
      { signal: a }
    ).then((r) => r.grants);
  }
  setGrant(n, a) {
    return this.request(
      `/bots/${encodeURIComponent(n.agentId)}/grants/${encodeURIComponent(n.tool)}`,
      { method: "PUT", body: JSON.stringify({ mode: n.mode, note: n.note ?? "" }), signal: a }
    );
  }
  clearGrant(n, a, r) {
    return this.request(
      `/bots/${encodeURIComponent(n)}/grants/${encodeURIComponent(a)}`,
      { method: "DELETE", signal: r }
    );
  }
  listAuditEvents(n = {}, a) {
    const r = new URLSearchParams();
    n.agentId && r.set("bot_id", n.agentId), n.eventTypes?.length && r.set("event_type", n.eventTypes.join(",")), n.beforeId && r.set("before_id", String(n.beforeId)), n.limit && r.set("limit", String(n.limit));
    const c = r.toString();
    return this.request(`/audit${c ? `?${c}` : ""}`, { signal: a });
  }
  listTasks(n, a) {
    return this.request(
      `/bots/${encodeURIComponent(n)}/tasks`,
      { signal: a }
    ).then((r) => r.tasks);
  }
  listArtifacts(n, a) {
    return this.request(
      `/bots/${encodeURIComponent(n)}/files`,
      { signal: a }
    ).then((r) => r.files);
  }
  artifactUrl(n) {
    const a = n.downloadPath.split("/").map(encodeURIComponent).join("/");
    return `${this.baseUrl}${a}`;
  }
  screenshotUrl(n, a) {
    return `${this.baseUrl}/screenshots/${encodeURIComponent(n)}/${encodeURIComponent(a)}`;
  }
  subscribeToConversationEvents(n, a) {
    const r = (c) => {
      "threadId" in c && c.threadId && c.threadId !== n || a(c);
    };
    return this.listeners.add(r), this.closed = !1, this.openSocket(), {
      unsubscribe: () => {
        this.listeners.delete(r), this.listeners.size || (this.closed = !0, this.closeSocket());
      }
    };
  }
  emit(n) {
    for (const a of [...this.listeners]) a(n);
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
    let a;
    try {
      a = new WebSocket(n);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = a, a.onopen = () => {
      this.reconnectDelay = Le, this.emit({ type: "connection.changed", state: "connected" });
    }, a.onmessage = (r) => {
      try {
        this.emit(JSON.parse(String(r.data)));
      } catch {
      }
    }, a.onclose = () => {
      this.socket = void 0, !this.closed && (this.emit({ type: "connection.changed", state: "connecting" }), this.scheduleReconnect());
    }, a.onerror = () => a.close();
  }
  scheduleReconnect() {
    this.reconnectTimer || this.closed || (this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = void 0, this.reconnectDelay = Math.min(this.reconnectDelay * 2, Ya), this.openSocket();
    }, this.reconnectDelay));
  }
  closeSocket() {
    this.reconnectTimer && (clearTimeout(this.reconnectTimer), this.reconnectTimer = void 0), this.opening = !1;
    const n = this.socket;
    this.socket = void 0, n && (n.onclose = null, n.onerror = null, n.close());
  }
}
const ot = "/api/plugins/hermes-crew", it = window.__HERMES_PLUGIN_SDK__, Qa = new Za({
  baseUrl: ot,
  // The SDK's authed fetch, not the global one. Its own contract says plugins
  // must not hand-read the session token, and this is what keeps loopback,
  // gated-OAuth and server-internal modes all working from one bundle.
  fetchImpl: (t, n) => it.authedFetch(t, n),
  // A resolver, not a string: in gated mode `buildWsUrl` mints a single-use
  // ticket, so the URL has to be rebuilt for every connect and reconnect.
  eventsUrl: () => it.buildWsUrl(`${ot}/v1/events`)
});
function er(t) {
  try {
    if (typeof Notification > "u" || Notification.permission !== "granted" || document.visibilityState === "visible") return;
    new Notification(t.title, { body: t.body });
  } catch {
  }
}
function nr() {
  return /* @__PURE__ */ e.createElement(Ka, { client: Qa, notify: er });
}
export {
  nr as C,
  e as R,
  De as S,
  N as a,
  U as b,
  qt as c,
  fe as d,
  Y as e,
  je as f,
  tr as g,
  Ie as h,
  At as i,
  xt as j,
  It as k,
  Ee as l,
  Ot as m,
  Pe as n,
  vt as r,
  Lt as u
};

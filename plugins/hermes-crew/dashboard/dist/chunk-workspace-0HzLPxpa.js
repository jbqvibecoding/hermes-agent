const pt = globalThis.__HERMES_PLUGIN_SDK__, e = pt?.React;
if (!e)
  throw new Error(
    "hermes-crew: the dashboard plugin SDK is not on the page, so there is no React to borrow."
  );
const {
  Children: ht,
  Fragment: ft,
  Profiler: gt,
  StrictMode: yt,
  Suspense: De,
  cloneElement: vt,
  createContext: wt,
  createElement: Ce,
  createRef: Et,
  forwardRef: Le,
  isValidElement: bt,
  lazy: $e,
  memo: kt,
  startTransition: Nt,
  use: St,
  useActionState: Ct,
  useCallback: we,
  useContext: Mt,
  useDebugValue: Tt,
  useDeferredValue: _t,
  useEffect: P,
  useId: xt,
  useImperativeHandle: At,
  useInsertionEffect: Ot,
  useLayoutEffect: Pe,
  useMemo: fe,
  useOptimistic: It,
  useReducer: Rt,
  useRef: G,
  useState: C,
  useSyncExternalStore: Dt,
  useTransition: Lt,
  version: $t
} = e, Pt = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Children: ht,
  Fragment: ft,
  Profiler: gt,
  StrictMode: yt,
  Suspense: De,
  cloneElement: vt,
  createContext: wt,
  createElement: Ce,
  createRef: Et,
  default: e,
  forwardRef: Le,
  isValidElement: bt,
  lazy: $e,
  memo: kt,
  startTransition: Nt,
  use: St,
  useActionState: Ct,
  useCallback: we,
  useContext: Mt,
  useDebugValue: Tt,
  useDeferredValue: _t,
  useEffect: P,
  useId: xt,
  useImperativeHandle: At,
  useInsertionEffect: Ot,
  useLayoutEffect: Pe,
  useMemo: fe,
  useOptimistic: It,
  useReducer: Rt,
  useRef: G,
  useState: C,
  useSyncExternalStore: Dt,
  useTransition: Lt,
  version: $t
}, Symbol.toStringTag, { value: "Module" }));
class ve extends Error {
  constructor(n, r, s = !1) {
    super(r), this.code = n, this.retryable = s, this.name = "CrewError";
  }
  code;
  retryable;
}
function Xe(t) {
  return !t || t.role !== "agent" ? "" : t.parts.filter((n) => n.type === "text").map((n) => n.text).join("").trim();
}
function Ne(t) {
  return Xe(
    [...t].reverse().find((n) => n.role === "agent" && !n.streaming)
  );
}
function ze(t) {
  return t.parts.filter((n) => n.type === "text").map((n) => n.text).join("");
}
const Ue = 6e4, zt = 3e4, _e = "optimistic-user:", Ee = "optimistic-agent:";
function Ut(t, n = {}) {
  const { enabled: r = !0, notify: s } = n, [f, u] = C([]), [c, T] = C(""), [m, o] = C(""), [S, i] = C([]), [a, h] = C([]), [g, l] = C([]), [I, R] = C([]), [O, j] = C(), [B, E] = C("connecting"), [z, re] = C([]), [de, te] = C(r), [X, J] = C(), [me, K] = C(() => /* @__PURE__ */ new Set()), [F, Z] = C(""), [le, he] = C(0), V = G(/* @__PURE__ */ new Map()), ae = G(c), Q = G(/* @__PURE__ */ new Set()), Y = G(/* @__PURE__ */ new Map()), pe = G(s), se = fe(
    () => f.find((p) => p.id === c),
    [f, c]
  ), oe = m || (c ? `dm:${c}` : ""), ue = !!(c && !me.has(c));
  P(() => {
    ae.current = c;
  }, [c]), P(() => {
    pe.current = s;
  }, [s]);
  const ee = we(async (p = !1) => {
    const N = await t.listAgents();
    for (const y of Q.current)
      N.some((k) => k.id === y) || Q.current.delete(y);
    const $ = N.filter((y) => !Q.current.has(y.id)), U = ae.current, D = $.find((y) => y.id === U), v = V.current.get(U);
    D?.lastMessagePreview && v && !v.messages.some((y) => y.streaming) && Ne(v.messages) !== D.lastMessagePreview && (V.current.set(U, { ...v, cachedAt: 0 }), he((k) => k + 1));
    const b = !!v?.messages.some((y) => y.streaming);
    return u((y) => $.map((k) => {
      const L = y.find((H) => H.id === k.id), d = Ne(V.current.get(k.id)?.messages ?? []), A = !!d || k.id === U && b;
      return {
        ...k,
        lastMessagePreview: A ? d || L?.lastMessagePreview : k.lastMessagePreview ?? L?.lastMessagePreview
      };
    })), T((y) => y && $.some((k) => k.id === y) || p ? y : $[0]?.id || ""), $;
  }, [t]), _ = we(async () => {
    const p = await t.listModelProviders();
    return re(p.providers), p.providers;
  }, [t]);
  return P(() => {
    if (!r) {
      u([]), re([]), T(""), o(""), h([]), l([]), R([]), j(void 0), E("disconnected"), te(!1), J(void 0);
      return;
    }
    let p = !0;
    return te(!0), Promise.all([ee(), _()]).then(() => {
      p && (E("connected"), te(!1));
    }).catch((N) => {
      p && (E("error"), J(N instanceof Error ? N.message : "Could not load the crew"), te(!1));
    }), () => {
      p = !1;
    };
  }, [r, ee, _]), P(() => {
    if (!r) return;
    const p = () => {
      document.visibilityState === "hidden" || !navigator.onLine || ee().catch(() => {
      });
    }, N = () => {
      document.visibilityState === "visible" && p();
    }, $ = window.setInterval(p, zt);
    return window.addEventListener("focus", p), window.addEventListener("online", p), document.addEventListener("visibilitychange", N), () => {
      window.clearInterval($), window.removeEventListener("focus", p), window.removeEventListener("online", p), document.removeEventListener("visibilitychange", N);
    };
  }, [r, ee]), P(() => {
    o("");
  }, [c]), P(() => {
    if (!r) return;
    const p = V.current.get(c);
    if (p ? (h(p.messages), l(p.activities), R(p.approvals), j(p.computer), i(p.conversations)) : (h([]), l([]), R([]), j(void 0), i([])), Z(""), !c) return;
    const N = p ? Date.now() - p.cachedAt : Number.POSITIVE_INFINITY;
    if (p && N < Ue && !m) {
      p.messages.some((v) => v.streaming) && Z(c);
      const D = window.setTimeout(() => he((v) => v + 1), Ue - N);
      return () => window.clearTimeout(D);
    }
    const $ = new AbortController();
    let U = !0;
    return Promise.all([
      t.listConversations(c, $.signal),
      t.listApprovalRequests(c, $.signal),
      t.getComputer(c, $.signal)
    ]).then(async ([D, v, b]) => {
      const y = m ? D.find((M) => M.id === m) ?? D[0] : D[0], k = y ? await t.getConversation(y.id, $.signal) : void 0;
      if (!U || Q.current.has(c)) return;
      const L = V.current.get(c)?.messages ?? [], d = (k?.messages ?? []).map((M) => {
        const q = Y.current.get(M.id);
        return q ? { ...M, id: q } : M;
      }), A = L.filter(
        (M) => M.id.startsWith(_e) || M.id.startsWith(Ee)
      ), H = [
        ...d,
        ...A.filter((M) => !d.some((q) => q.id === M.id))
      ], W = Ne(H), w = k?.activities ?? [];
      V.current.set(c, {
        messages: H,
        activities: w,
        approvals: v,
        conversations: D,
        computer: b,
        cachedAt: Date.now()
      }), K((M) => new Set(M).add(c)), h(H), l(w), R(v), j(b), i(D), Z(c), W && u((M) => M.map((q) => q.id === c ? { ...q, lastMessagePreview: W } : q));
    }).catch((D) => {
      !U || Q.current.has(c) || D instanceof DOMException && D.name === "AbortError" || (V.current.set(c, {
        messages: [],
        activities: [],
        approvals: [],
        conversations: [],
        cachedAt: Date.now()
      }), K((v) => new Set(v).add(c)), h([]), J(D instanceof Error ? D.message : "Could not load this teammate"));
    }), () => {
      U = !1, $.abort();
    };
  }, [t, r, le, c, m]), P(() => {
    if (!r || !c || O?.status === "online") return;
    let p = !0;
    const N = async () => {
      try {
        const U = await t.getComputer(c);
        if (!p || ae.current !== c) return;
        j(U);
        const D = V.current.get(c);
        D && V.current.set(c, { ...D, computer: U });
      } catch {
      }
    }, $ = window.setInterval(() => {
      N();
    }, 2e3);
    return N(), () => {
      p = !1, window.clearInterval($);
    };
  }, [t, O?.status, r, c]), P(() => {
    if (!r || !oe || F !== c) return;
    let p = !0;
    const N = c, $ = (v) => {
      const b = V.current.get(N);
      V.current.set(N, {
        messages: b?.messages ?? [],
        activities: b?.activities ?? [],
        approvals: b?.approvals ?? [],
        conversations: b?.conversations ?? [],
        computer: b?.computer,
        cachedAt: Date.now(),
        ...v
      });
    }, U = (v) => h((b) => {
      const y = v(b);
      return $({ messages: y }), y;
    }), D = t.subscribeToConversationEvents(oe, (v) => {
      if (p) {
        if (v.type === "message.created" && U((b) => {
          let y = v.message;
          const k = Y.current.get(v.message.id);
          if (k && (y = { ...v.message, id: k }), v.message.role === "user" && !k) {
            const d = new Set(Y.current.values()), A = b.find((H) => H.id.startsWith(_e) && !d.has(H.id) && ze(H) === ze(v.message));
            A && (Y.current.set(v.message.id, A.id), y = { ...v.message, id: A.id });
          }
          if (v.message.role === "agent" && !k) {
            const d = new Set(Y.current.values()), A = b.find((H) => H.id.startsWith(Ee) && !d.has(H.id));
            A && (Y.current.set(v.message.id, A.id), y = { ...v.message, id: A.id });
          }
          return b.find((d) => d.id === y.id) ? b.map((d) => d.id === y.id ? y : d) : [...b, y];
        }), v.type === "message.delta" && U((b) => {
          let y = Y.current.get(v.messageId);
          if (!y) {
            const k = new Set(Y.current.values()), L = b.find((d) => d.id.startsWith(Ee) && !k.has(d.id));
            L && (y = L.id, Y.current.set(v.messageId, y));
          }
          return y ??= v.messageId, b.some((k) => k.id === y) ? b.map((k) => k.id === y ? {
            ...k,
            parts: k.parts.map((L, d) => d === 0 && L.type === "text" ? { ...L, text: L.text + v.delta } : L)
          } : k) : [...b, {
            id: y,
            conversationId: oe,
            role: "agent",
            parts: [{ type: "text", text: v.delta }],
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            streaming: !0
          }];
        }), v.type === "message.completed") {
          const b = Y.current.get(v.messageId) ?? v.messageId;
          v.notify === !1 ? U((y) => y.flatMap((k) => k.id !== b ? [k] : k.id.startsWith(Ee) ? [{
            ...k,
            parts: k.parts.map((L) => L.type === "text" ? { ...L, text: "" } : L),
            streaming: !0
          }] : [])) : (U((y) => {
            const k = y.filter((d) => d.id === b || d.role !== "agent" || !d.streaming).map((d) => d.id === b ? { ...d, streaming: !1 } : d), L = Ne(k);
            return L && u((d) => d.map((A) => A.id === N ? { ...A, lastMessagePreview: L } : A)), k;
          }), pe.current?.({
            title: `${se?.name ?? "Your teammate"} finished`,
            body: "There is something new to read."
          }));
        }
        if (v.type === "message.dropped") {
          const b = Y.current.get(v.messageId) ?? v.messageId;
          U((y) => y.filter((k) => k.id !== b));
        }
        v.type === "message.updated" && (U((b) => {
          const y = Y.current.get(v.message.id), k = y ? { ...v.message, id: y } : v.message, L = b.find((A) => A.id === k.id), d = v.message.role === "agent" && !v.message.streaming ? b.filter((A) => A.id === k.id || A.role !== "agent" || !A.streaming) : b;
          return L ? d.map((A) => A.id === k.id ? k : A) : [...d, k];
        }), v.message.role === "agent" && !v.message.streaming && u((b) => b.map((y) => y.id === N ? { ...y, lastMessagePreview: Xe(v.message) || void 0 } : y))), v.type === "approval.updated" && (R((b) => {
          const y = b.some((k) => k.id === v.approval.id) ? b.map((k) => k.id === v.approval.id ? v.approval : k) : [v.approval, ...b];
          return $({ approvals: y }), y;
        }), v.approval.status === "pending" && pe.current?.({
          title: `${se?.name ?? "Your teammate"} needs you`,
          body: v.approval.title
        })), v.type === "activity.updated" && l((b) => {
          const y = b.some((k) => k.id === v.activity.id) ? b.map((k) => k.id === v.activity.id ? v.activity : k) : [...b, v.activity];
          return $({ activities: y }), y;
        }), v.type === "agent.status" && u((b) => b.map((y) => y.id === v.agentId ? { ...y, status: v.status } : y)), v.type === "connection.changed" && E(v.state);
      }
    });
    return () => {
      p = !1, D.unsubscribe();
    };
  }, [t, oe, r, F, se?.name, c]), {
    agents: f,
    conversations: S,
    modelProviders: z,
    selectedAgent: se,
    selectedAgentId: c,
    setSelectedAgentId: T,
    selectedThreadId: oe,
    setSelectedThreadId: o,
    messages: a,
    activities: g,
    approvals: I,
    computer: O,
    connection: B,
    loading: de,
    conversationLoading: ue,
    error: X,
    refreshAgents: ee,
    refreshModelProviders: _,
    dismissError: () => J(void 0),
    createAgent: async (p) => {
      const N = await t.createAgent(p);
      return await ee(!0), T(N.id), N;
    },
    updateAgent: async (p, N) => {
      await t.updateAgent(p, N), await ee(!0);
    },
    duplicateAgent: async (p) => {
      const N = await t.duplicateAgent(p);
      await ee(!0), T(N.id);
    },
    deleteAgent: async (p) => {
      const N = f.find((b) => b.id === p), $ = c;
      if (!N || Q.current.has(p)) return;
      const U = f.findIndex((b) => b.id === p), D = f.filter((b) => b.id !== p), v = $ === p ? D[Math.min(Math.max(U, 0), Math.max(D.length - 1, 0))]?.id ?? "" : $;
      Q.current.add(p), u(D), T(v);
      try {
        try {
          await t.deleteAgent(p);
        } catch (b) {
          if (!(b instanceof ve && b.code === "not_found")) throw b;
        }
        V.current.delete(p), K((b) => {
          const y = new Set(b);
          return y.delete(p), y;
        }), await ee();
      } catch (b) {
        throw Q.current.delete(p), u((y) => {
          if (y.some((L) => L.id === p)) return y;
          const k = [...y];
          return k.splice(Math.min(U, k.length), 0, N), k;
        }), T((y) => y || ($ === p ? p : y)), J(b instanceof Error ? b.message : "Could not remove this teammate"), b;
      }
    },
    sendMessage: async (p) => {
      if (!oe || !c) return;
      const N = c, $ = oe, U = `${Date.now()}:${Math.random().toString(36).slice(2)}`, D = `${_e}${U}`, v = `${Ee}${U}`, b = (/* @__PURE__ */ new Date()).toISOString(), y = {
        id: D,
        conversationId: $,
        role: "user",
        parts: [{ type: "text", text: p }],
        createdAt: b
      }, k = {
        id: v,
        conversationId: $,
        role: "agent",
        parts: [{ type: "text", text: "" }],
        createdAt: b,
        streaming: !0
      }, L = V.current.get(N) ?? {
        messages: [],
        activities: [],
        approvals: [],
        conversations: [],
        cachedAt: Date.now()
      }, d = [...L.messages].reverse().find((W) => W.role === "agent" && W.streaming), H = [...d ? L.messages.map((W) => W.id === d.id ? { ...W, streaming: !1, interrupted: !0 } : W) : L.messages, y, k];
      ae.current === N && l([]), V.current.set(N, { ...L, messages: H, activities: [], cachedAt: Date.now() }), ae.current === N && (h(H), Z(N));
      try {
        const W = await t.sendMessage({ conversationId: $, text: p });
        Y.current.set(W.id, D);
        const w = W.id.match(/^(.+):user(?:$|:)/)?.[1];
        w && (Y.current.set(`${w}:user`, D), Y.current.set(`${w}:agent`, d?.id ?? v));
        const M = V.current.get(N) ?? L, q = { ...W, id: D }, ne = M.messages.map((ye) => ye.id === D ? q : ye).filter((ye, dt, mt) => mt.findIndex((ut) => ut.id === ye.id) === dt);
        V.current.set(N, { ...M, messages: ne, cachedAt: Date.now() }), ae.current === N && h(ne);
      } catch (W) {
        const w = V.current.get(N) ?? L, M = w.messages.filter((ne) => ne.id !== v), q = M.some((ne) => ne.id === D) ? M : [...M, y];
        throw V.current.set(N, { ...w, messages: q, cachedAt: Date.now() }), ae.current === N && h(q), d || J(W instanceof Error ? W.message : "Could not send that"), W;
      }
    },
    respondToApproval: async (p, N, $, U) => {
      const D = c, v = await t.respondToApproval({ requestId: p, decision: N, note: $, contentHash: U }), b = V.current.get(D), y = (b?.approvals ?? []).map((k) => k.id === v.id ? v : k);
      b && V.current.set(D, { ...b, approvals: y, cachedAt: Date.now() }), ae.current === D && R(y);
    },
    openComputer: async (p) => {
      if (!c) throw new Error("No teammate is selected");
      try {
        return await (p === "open" ? t.openComputer(c) : t.takeOverComputer(c));
      } catch (N) {
        throw J(N instanceof Error ? N.message : "Could not open that computer"), N;
      }
    },
    reconnect: async () => {
      E("connecting");
      try {
        await t.reconnect(), await ee(), E("connected");
      } catch (p) {
        E("error"), J(p instanceof Error ? p.message : "Reconnect failed");
      }
    }
  };
}
const Ht = (t) => t.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), Je = (...t) => t.filter((n, r, s) => !!n && n.trim() !== "" && s.indexOf(n) === r).join(" ").trim();
var qt = {
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
const jt = Le(
  ({
    color: t = "currentColor",
    size: n = 24,
    strokeWidth: r = 2,
    absoluteStrokeWidth: s,
    className: f = "",
    children: u,
    iconNode: c,
    ...T
  }, m) => Ce(
    "svg",
    {
      ref: m,
      ...qt,
      width: n,
      height: n,
      stroke: t,
      strokeWidth: s ? Number(r) * 24 / Number(n) : r,
      className: Je("lucide", f),
      ...T
    },
    [
      ...c.map(([o, S]) => Ce(o, S)),
      ...Array.isArray(u) ? u : [u]
    ]
  )
);
const x = (t, n) => {
  const r = Le(
    ({ className: s, ...f }, u) => Ce(jt, {
      ref: u,
      iconNode: n,
      className: Je(`lucide-${Ht(t)}`, s),
      ...f
    })
  );
  return r.displayName = `${t}`, r;
};
const Ft = x("Archive", [
  ["rect", { width: "20", height: "5", x: "2", y: "3", rx: "1", key: "1wp1u1" }],
  ["path", { d: "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8", key: "1s80jp" }],
  ["path", { d: "M10 12h4", key: "a56b0p" }]
]);
const Vt = x("ArrowDown", [
  ["path", { d: "M12 5v14", key: "s699le" }],
  ["path", { d: "m19 12-7 7-7-7", key: "1idqje" }]
]);
const Bt = x("Ban", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m4.9 4.9 14.2 14.2", key: "1m5liu" }]
]);
const Wt = x("Bot", [
  ["path", { d: "M12 8V4H8", key: "hb8ula" }],
  ["rect", { width: "16", height: "12", x: "4", y: "8", rx: "2", key: "enze0r" }],
  ["path", { d: "M2 14h2", key: "vft8re" }],
  ["path", { d: "M20 14h2", key: "4cs60a" }],
  ["path", { d: "M15 13v2", key: "1xurst" }],
  ["path", { d: "M9 13v2", key: "rq6x2g" }]
]);
const Me = x("Check", [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]]);
const Gt = x("ChevronDown", [
  ["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]
]);
const Ae = x("ChevronRight", [
  ["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]
]);
const Kt = x("ChevronsRight", [
  ["path", { d: "m6 17 5-5-5-5", key: "xnjwq" }],
  ["path", { d: "m13 17 5-5-5-5", key: "17xmmf" }]
]);
const Oe = x("CircleCheck", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
]);
const Ze = x("CircleDashed", [
  ["path", { d: "M10.1 2.182a10 10 0 0 1 3.8 0", key: "5ilxe3" }],
  ["path", { d: "M13.9 21.818a10 10 0 0 1-3.8 0", key: "11zvb9" }],
  ["path", { d: "M17.609 3.721a10 10 0 0 1 2.69 2.7", key: "1iw5b2" }],
  ["path", { d: "M2.182 13.9a10 10 0 0 1 0-3.8", key: "c0bmvh" }],
  ["path", { d: "M20.279 17.609a10 10 0 0 1-2.7 2.69", key: "1ruxm7" }],
  ["path", { d: "M21.818 10.1a10 10 0 0 1 0 3.8", key: "qkgqxc" }],
  ["path", { d: "M3.721 6.391a10 10 0 0 1 2.7-2.69", key: "1mcia2" }],
  ["path", { d: "M6.391 20.279a10 10 0 0 1-2.69-2.7", key: "1fvljs" }]
]);
const Yt = x("CircleHelp", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3", key: "1u773s" }],
  ["path", { d: "M12 17h.01", key: "p32p05" }]
]);
const Qe = x("Clock", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["polyline", { points: "12 6 12 12 16 14", key: "68esgv" }]
]);
const Ie = x("Cloud", [
  ["path", { d: "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z", key: "p7xjir" }]
]);
const Xt = x("Copy", [
  ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2", key: "17jyea" }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2", key: "zix9uf" }]
]);
const Jt = x("CornerDownRight", [
  ["polyline", { points: "15 10 20 15 15 20", key: "1q7qjw" }],
  ["path", { d: "M4 4v7a4 4 0 0 0 4 4h12", key: "z08zvw" }]
]);
const Zt = x("Database", [
  ["ellipse", { cx: "12", cy: "5", rx: "9", ry: "3", key: "msslwz" }],
  ["path", { d: "M3 5V19A9 3 0 0 0 21 19V5", key: "1wlel7" }],
  ["path", { d: "M3 12A9 3 0 0 0 21 12", key: "mv7ke4" }]
]);
const Qt = x("Download", [
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
  ["polyline", { points: "7 10 12 15 17 10", key: "2ggqvy" }],
  ["line", { x1: "12", x2: "12", y1: "15", y2: "3", key: "1vk2je" }]
]);
const en = x("Earth", [
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
const tn = x("Ellipsis", [
  ["circle", { cx: "12", cy: "12", r: "1", key: "41hilf" }],
  ["circle", { cx: "19", cy: "12", r: "1", key: "1wjl8i" }],
  ["circle", { cx: "5", cy: "12", r: "1", key: "1pcz8c" }]
]);
const nn = x("FileCode2", [
  ["path", { d: "M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4", key: "1pf5j1" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "m5 12-3 3 3 3", key: "oke12k" }],
  ["path", { d: "m9 18 3-3-3-3", key: "112psh" }]
]);
const rn = x("FileSpreadsheet", [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "M8 13h2", key: "yr2amv" }],
  ["path", { d: "M14 13h2", key: "un5t4a" }],
  ["path", { d: "M8 17h2", key: "2yhykz" }],
  ["path", { d: "M14 17h2", key: "10kma7" }]
]);
const ke = x("FileText", [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "M10 9H8", key: "b1mrlr" }],
  ["path", { d: "M16 13H8", key: "t4e002" }],
  ["path", { d: "M16 17H8", key: "z1uh3a" }]
]);
const et = x("File", [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }]
]);
const an = x("Globe", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20", key: "13o1zl" }],
  ["path", { d: "M2 12h20", key: "9i4pu4" }]
]);
const He = x("Hand", [
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
const sn = x("Hourglass", [
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
const on = x("Image", [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2", key: "1m3agn" }],
  ["circle", { cx: "9", cy: "9", r: "2", key: "af1f0g" }],
  ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21", key: "1xmnt7" }]
]);
const qe = x("KeyRound", [
  [
    "path",
    {
      d: "M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z",
      key: "1s6t7t"
    }
  ],
  ["circle", { cx: "16.5", cy: "7.5", r: ".5", fill: "currentColor", key: "w0ekpg" }]
]);
const Te = x("LoaderCircle", [
  ["path", { d: "M21 12a9 9 0 1 1-6.219-8.56", key: "13zald" }]
]);
const cn = x("Lock", [
  ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2", key: "1w4ew1" }],
  ["path", { d: "M7 11V7a5 5 0 0 1 10 0v4", key: "fwvmzm" }]
]);
const ln = x("Mail", [
  ["rect", { width: "20", height: "16", x: "2", y: "4", rx: "2", key: "18n3k1" }],
  ["path", { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7", key: "1ocrg3" }]
]);
const dn = x("Maximize2", [
  ["polyline", { points: "15 3 21 3 21 9", key: "mznyad" }],
  ["polyline", { points: "9 21 3 21 3 15", key: "1avn1i" }],
  ["line", { x1: "21", x2: "14", y1: "3", y2: "10", key: "ota7mn" }],
  ["line", { x1: "3", x2: "10", y1: "21", y2: "14", key: "1atl0r" }]
]);
const mn = x("Minimize2", [
  ["polyline", { points: "4 14 10 14 10 20", key: "11kfnr" }],
  ["polyline", { points: "20 10 14 10 14 4", key: "rlmsce" }],
  ["line", { x1: "14", x2: "21", y1: "10", y2: "3", key: "o5lafz" }],
  ["line", { x1: "3", x2: "10", y1: "21", y2: "14", key: "1atl0r" }]
]);
const tt = x("Monitor", [
  ["rect", { width: "20", height: "14", x: "2", y: "3", rx: "2", key: "48i651" }],
  ["line", { x1: "8", x2: "16", y1: "21", y2: "21", key: "1svkeh" }],
  ["line", { x1: "12", x2: "12", y1: "17", y2: "21", key: "vw1qmm" }]
]);
const un = x("Pencil", [
  [
    "path",
    {
      d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
      key: "1a8usu"
    }
  ],
  ["path", { d: "m15 5 4 4", key: "1mk7zo" }]
]);
const nt = x("Plus", [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "M12 5v14", key: "s699le" }]
]);
const pn = x("Presentation", [
  ["path", { d: "M2 3h20", key: "91anmk" }],
  ["path", { d: "M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3", key: "2k9sn8" }],
  ["path", { d: "m7 21 5-5 5 5", key: "bip4we" }]
]);
const hn = x("RotateCcw", [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }]
]);
const rt = x("Search", [
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
  ["path", { d: "m21 21-4.3-4.3", key: "1qie3q" }]
]);
const je = x("Settings2", [
  ["path", { d: "M20 7h-9", key: "3s1dr2" }],
  ["path", { d: "M14 17H5", key: "gfn3mx" }],
  ["circle", { cx: "17", cy: "17", r: "3", key: "18b49y" }],
  ["circle", { cx: "7", cy: "7", r: "3", key: "dfmy0x" }]
]);
const Re = x("ShieldAlert", [
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
const fn = x("ShieldCheck", [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      key: "oel41y"
    }
  ],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
]);
const gn = x("ShieldX", [
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
const yn = x("Terminal", [
  ["polyline", { points: "4 17 10 11 4 5", key: "akl6gq" }],
  ["line", { x1: "12", x2: "20", y1: "19", y2: "19", key: "q2wloq" }]
]);
const at = x("Trash2", [
  ["path", { d: "M3 6h18", key: "d0wm0j" }],
  ["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", key: "4alrt4" }],
  ["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2", key: "v07s0e" }],
  ["line", { x1: "10", x2: "10", y1: "11", y2: "17", key: "1uufr5" }],
  ["line", { x1: "14", x2: "14", y1: "11", y2: "17", key: "xtxkd" }]
]);
const vn = x("TriangleAlert", [
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
const wn = x("User", [
  ["path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", key: "975kel" }],
  ["circle", { cx: "12", cy: "7", r: "4", key: "17ys0d" }]
]);
const En = x("Users", [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }],
  ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }],
  ["path", { d: "M16 3.13a4 4 0 0 1 0 7.75", key: "1da9ce" }]
]);
const bn = x("X", [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
]);
function kn(t) {
  let n = 0;
  for (let r = 0; r < t.length; r += 1) n = (n * 31 + t.charCodeAt(r)) % 360;
  return n;
}
function st({ agent: t, size: n = 36 }) {
  const r = kn(t.id || t.name);
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
const Nn = $e(async () => ({ default: (await import("./chunk-mermaid-HWGCJPDP-Bw7Uyv9k.js").then((t) => t.i)).Streamdown })), Fe = {
  working: "Working",
  idle: "Idle",
  waiting_for_approval: "Needs you",
  offline: "No profile"
};
function Sn({
  agents: t,
  sections: n,
  rooms: r,
  selectedAgentId: s,
  selectedThreadId: f,
  search: u,
  onSearch: c,
  onSelectAgent: T,
  onSelectThread: m,
  onAction: o,
  onCreate: S,
  onToggleSection: i
}) {
  const [a, h] = C();
  P(() => {
    if (!a) return;
    const E = () => h(void 0);
    return window.addEventListener("pointerdown", E), () => window.removeEventListener("pointerdown", E);
  }, [a]);
  const g = (E, z) => {
    h(void 0), o(E, z);
  }, l = u.trim().toLowerCase(), I = (E) => !l || `${E.name} ${E.role}`.toLowerCase().includes(l), R = fe(() => new Map(t.map((E) => [E.id, E])), [t]), O = n.map((E) => ({
    section: E,
    members: E.bot_ids.map((z) => R.get(z)).filter((z) => !!z && I(z))
  })).filter((E) => E.members.length > 0), j = !l && O.length > 1, B = (E) => /* @__PURE__ */ e.createElement(
    "div",
    {
      key: E.id,
      className: `agent-row ${s === E.id && !f.startsWith("group:") ? "selected" : ""} ${E.status === "working" ? "is-working" : ""}`
    },
    /* @__PURE__ */ e.createElement("button", { className: "agent-select", onClick: () => T(E.id) }, /* @__PURE__ */ e.createElement(st, { agent: E }), /* @__PURE__ */ e.createElement("span", { className: "agent-copy" }, /* @__PURE__ */ e.createElement("strong", null, /* @__PURE__ */ e.createElement("span", null, E.name), /* @__PURE__ */ e.createElement("span", { className: `agent-status ${E.status}`, title: Fe[E.status], "aria-label": Fe[E.status] })), E.workingOn ? /* @__PURE__ */ e.createElement("span", { className: "agent-preview agent-working-on" }, E.workingOn) : E.lastMessagePreview && /* @__PURE__ */ e.createElement("span", { className: "agent-preview agent-preview-entering" }, /* @__PURE__ */ e.createElement(De, { fallback: E.lastMessagePreview }, /* @__PURE__ */ e.createElement(Nn, { className: "agent-preview-markdown", mode: "static", controls: !1, linkSafety: { enabled: !0 }, skipHtml: !0 }, E.lastMessagePreview))))),
    /* @__PURE__ */ e.createElement(
      "button",
      {
        className: "agent-more",
        "aria-label": `More actions for ${E.name}`,
        onPointerDown: (z) => z.stopPropagation(),
        onClick: () => h((z) => z === E.id ? void 0 : E.id)
      },
      /* @__PURE__ */ e.createElement(tn, { size: 15 })
    ),
    a === E.id && /* @__PURE__ */ e.createElement("div", { className: "agent-menu", role: "menu", onPointerDown: (z) => z.stopPropagation() }, /* @__PURE__ */ e.createElement("button", { role: "menuitem", onClick: () => g(E, "edit") }, /* @__PURE__ */ e.createElement(un, { size: 13 }), " Edit"), /* @__PURE__ */ e.createElement("button", { role: "menuitem", onClick: () => g(E, "duplicate") }, /* @__PURE__ */ e.createElement(Xt, { size: 13 }), " Duplicate"), /* @__PURE__ */ e.createElement("div", null), /* @__PURE__ */ e.createElement("button", { role: "menuitem", className: "danger-text", onClick: () => g(E, "delete") }, /* @__PURE__ */ e.createElement(at, { size: 13 }), " Remove from crew"))
  );
  return /* @__PURE__ */ e.createElement("aside", { className: "agent-sidebar" }, /* @__PURE__ */ e.createElement("div", { className: "sidebar-titlebar" }, /* @__PURE__ */ e.createElement("span", { className: "sidebar-title" }, "Crew"), /* @__PURE__ */ e.createElement("button", { className: "brand-add", "aria-label": "Hire a teammate", onClick: S }, /* @__PURE__ */ e.createElement(nt, { size: 18 }))), /* @__PURE__ */ e.createElement("label", { className: "search" }, /* @__PURE__ */ e.createElement(rt, { size: 15 }), /* @__PURE__ */ e.createElement("input", { "aria-label": "Search the crew", placeholder: "Search your crew", value: u, onChange: (E) => c(E.target.value) })), /* @__PURE__ */ e.createElement("div", { className: "agent-list" }, t.length === 0 && /* @__PURE__ */ e.createElement("div", { className: "agent-list-empty" }, "No teammates yet"), t.length > 0 && O.length === 0 && /* @__PURE__ */ e.createElement("div", { className: "agent-list-empty" }, "No teammates found"), j ? O.map(({ section: E, members: z }) => /* @__PURE__ */ e.createElement("section", { className: "agent-section", key: E.id }, /* @__PURE__ */ e.createElement(
    "button",
    {
      className: `agent-section-header ${E.collapsed ? "is-collapsed" : ""}`,
      "aria-expanded": !E.collapsed,
      onClick: () => i(E.id, !E.collapsed)
    },
    /* @__PURE__ */ e.createElement(Ae, { size: 13, className: "agent-section-chevron" }),
    /* @__PURE__ */ e.createElement("span", null, E.name),
    /* @__PURE__ */ e.createElement("small", null, z.length)
  ), !E.collapsed && z.map(B))) : O.flatMap((E) => E.members).map(B), r.length > 0 && /* @__PURE__ */ e.createElement("section", { className: "agent-section", key: "__rooms__" }, /* @__PURE__ */ e.createElement("div", { className: "agent-section-header is-static" }, /* @__PURE__ */ e.createElement("span", null, "Rooms"), /* @__PURE__ */ e.createElement("small", null, r.length)), r.map((E) => /* @__PURE__ */ e.createElement("div", { key: E.id, className: `agent-row ${f === E.id ? "selected" : ""}` }, /* @__PURE__ */ e.createElement("button", { className: "agent-select", onClick: () => m(E.id) }, /* @__PURE__ */ e.createElement("span", { className: "agent-avatar", role: "img", "aria-label": `${E.title} room` }, E.emoji || "👥"), /* @__PURE__ */ e.createElement("span", { className: "agent-copy" }, /* @__PURE__ */ e.createElement("strong", null, /* @__PURE__ */ e.createElement("span", null, E.title)), /* @__PURE__ */ e.createElement("span", { className: "agent-preview" }, E.lastMessagePreview || E.subtitle))))))));
}
function Cn({
  open: t,
  agents: n,
  rooms: r,
  onClose: s,
  onSelectAgent: f,
  onSelectThread: u,
  onCreateAgent: c,
  onComputer: T
}) {
  const [m, o] = C(""), S = G(null);
  P(() => {
    t && (o(""), window.setTimeout(() => S.current?.focus(), 0));
  }, [t]);
  const a = fe(() => [
    { id: "create", label: "Hire a teammate", detail: "Add someone to the crew", icon: nt, run: c },
    { id: "computer", label: "Open their computer", detail: "The current teammate's screen", icon: tt, run: T },
    ...n.map((g) => ({
      id: `agent-${g.id}`,
      label: g.name,
      detail: `${g.role} · ${g.status.replaceAll("_", " ")}`,
      icon: Wt,
      run: () => f(g.id)
    })),
    ...r.map((g) => ({
      id: `room-${g.id}`,
      label: g.title,
      detail: g.subtitle || "Room",
      icon: En,
      run: () => u(g.id)
    }))
  ], [n, r, T, c, f, u]).filter((g) => `${g.label} ${g.detail}`.toLowerCase().includes(m.toLowerCase()));
  if (!t) return null;
  const h = (g) => {
    g.run(), s();
  };
  return /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "palette-backdrop",
      role: "presentation",
      onMouseDown: (g) => {
        g.target === g.currentTarget && s();
      }
    },
    /* @__PURE__ */ e.createElement("section", { className: "command-palette", role: "dialog", "aria-modal": "true", "aria-label": "Command palette" }, /* @__PURE__ */ e.createElement("label", null, /* @__PURE__ */ e.createElement(rt, { size: 17 }), /* @__PURE__ */ e.createElement(
      "input",
      {
        ref: S,
        "aria-label": "Search the crew and commands",
        placeholder: "Search your crew…",
        value: m,
        onChange: (g) => o(g.target.value),
        onKeyDown: (g) => {
          g.key === "Escape" && s(), g.key === "Enter" && a[0] && h(a[0]);
        }
      }
    ), /* @__PURE__ */ e.createElement("kbd", null, "esc")), /* @__PURE__ */ e.createElement("div", { className: "palette-results" }, a.length ? a.map((g, l) => {
      const I = g.icon;
      return /* @__PURE__ */ e.createElement("button", { key: g.id, className: l === 0 ? "active" : "", onClick: () => h(g) }, /* @__PURE__ */ e.createElement("span", null, /* @__PURE__ */ e.createElement(I, { size: 16 })), /* @__PURE__ */ e.createElement("div", null, /* @__PURE__ */ e.createElement("strong", null, g.label), /* @__PURE__ */ e.createElement("small", null, g.detail)), l === 0 && /* @__PURE__ */ e.createElement("kbd", null, "↵"));
    }) : /* @__PURE__ */ e.createElement("p", null, "Nothing matches that")), /* @__PURE__ */ e.createElement("footer", null, /* @__PURE__ */ e.createElement("span", null, "Crew"), /* @__PURE__ */ e.createElement("span", null, /* @__PURE__ */ e.createElement("kbd", null, "⌘"), /* @__PURE__ */ e.createElement("kbd", null, "K"), " to open")))
  );
}
const Mn = /(?<![\w.-])@([\w一-鿿][\w一-鿿-]{0,63})/g;
function be(t) {
  return t.replace(/[\s_-]+/g, "").trim().toLowerCase();
}
function Tn(t, n, r) {
  if (!n?.length || !t) return [{ text: t }];
  const s = /* @__PURE__ */ new Map();
  for (const c of n) s.has(be(c)) || s.set(be(c), c);
  for (const c of r)
    n.includes(c.id) && (s.has(be(c.name)) || s.set(be(c.name), c.id));
  const f = [];
  let u = 0;
  for (const c of t.matchAll(Mn)) {
    const T = s.get(be(c[1]));
    !T || c.index === void 0 || (c.index > u && f.push({ text: t.slice(u, c.index) }), f.push({ text: c[0], agentId: T }), u = c.index + c[0].length);
  }
  return u < t.length && f.push({ text: t.slice(u) }), f.length ? f : [{ text: t }];
}
function ge({ label: t, kind: n = "", children: r }) {
  return /* @__PURE__ */ e.createElement("div", { className: `crew-chip ${n}` }, t && /* @__PURE__ */ e.createElement("div", { className: "crew-chip-label" }, t), r);
}
function _n({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ge, { kind: "report" }, (t.lines ?? []).map((n, r) => /* @__PURE__ */ e.createElement("div", { className: "crew-report-line", key: r }, /* @__PURE__ */ e.createElement("span", { className: "crew-report-check" }, /* @__PURE__ */ e.createElement(Me, { size: 13 })), /* @__PURE__ */ e.createElement("span", { className: "crew-report-system" }, n.system), /* @__PURE__ */ e.createElement("span", { className: "crew-report-arrow" }, "→"), /* @__PURE__ */ e.createElement("span", null, n.result, n.count && /* @__PURE__ */ e.createElement("span", { className: "crew-report-count" }, " · ", n.count)))), t.closing && /* @__PURE__ */ e.createElement("div", { className: "crew-report-closing" }, t.closing));
}
function xn({ payload: t, onDecide: n }) {
  const r = t.status === "approved" || t.status === "discarded";
  return /* @__PURE__ */ e.createElement("div", { className: `crew-chip approval ${r ? "resolved" : ""}` }, /* @__PURE__ */ e.createElement("div", { className: "crew-chip-label" }, /* @__PURE__ */ e.createElement(Re, { size: 13 }), " ", r ? "Decided" : "Needs you"), /* @__PURE__ */ e.createElement("div", { className: "crew-approval-action" }, t.action), t.detail && /* @__PURE__ */ e.createElement("div", { className: "crew-approval-detail" }, t.detail), r ? /* @__PURE__ */ e.createElement("div", { className: "crew-approval-outcome" }, t.status === "approved" ? "Approved" : "Discarded") : /* @__PURE__ */ e.createElement("div", { className: "crew-approval-buttons" }, /* @__PURE__ */ e.createElement("button", { className: "crew-btn danger", onClick: () => n(String(t.approval_id), "deny") }, "Discard"), /* @__PURE__ */ e.createElement("button", { className: "crew-btn primary", onClick: () => n(String(t.approval_id), "allow") }, "Approve")));
}
function An({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ge, { label: "You decided" }, /* @__PURE__ */ e.createElement("div", { className: "crew-approval-action" }, t.action), /* @__PURE__ */ e.createElement("div", { className: "crew-approval-outcome" }, t.status === "approved" ? "Approved" : "Discarded"));
}
function On({ payload: t }) {
  return t.proposal ? /* @__PURE__ */ e.createElement(ge, { label: t.kind === "conflicting" ? "Rules disagree" : "Rule may be stale" }, /* @__PURE__ */ e.createElement("div", { className: "crew-memory-note" }, t.note), /* @__PURE__ */ e.createElement("ul", { className: "crew-memory-entries" }, (t.entries || []).map((n, r) => /* @__PURE__ */ e.createElement("li", { key: r }, n))), t.why && /* @__PURE__ */ e.createElement("div", { className: "crew-memory-why" }, t.why)) : t.tidied ? /* @__PURE__ */ e.createElement(ge, { label: "Memory tidied" }, /* @__PURE__ */ e.createElement("div", { className: "crew-memory-note" }, t.note)) : /* @__PURE__ */ e.createElement(ge, { label: "Memory updated" }, /* @__PURE__ */ e.createElement("div", { className: "crew-memory-rule" }, t.rule), t.diff && /* @__PURE__ */ e.createElement("pre", { className: "crew-memory-diff" }, t.diff));
}
function In({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ge, { label: "Routine created" }, /* @__PURE__ */ e.createElement("div", { className: "crew-routine-name" }, /* @__PURE__ */ e.createElement(Qe, { size: 13 }), " ", t.name), /* @__PURE__ */ e.createElement("div", { className: "crew-routine-when" }, t.human || t.cron));
}
function Rn({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ge, { label: `Handed over by @${t.from_name || t.from || "a teammate"}` }, /* @__PURE__ */ e.createElement("div", { className: "crew-botref-body" }, /* @__PURE__ */ e.createElement(Jt, { size: 13 }), " ", t.content));
}
function Dn({ payload: t, onOpenScreen: n, onSubmitSecret: r }) {
  const [s, f] = C(""), [u, c] = C("");
  if (t.field && t.ref) {
    const T = t.ref, m = async () => {
      if (s) {
        c("sending");
        try {
          await r(T, s), f(""), c("sent");
        } catch {
          f(""), c("failed");
        }
      }
    };
    return /* @__PURE__ */ e.createElement(ge, { label: "Needs one thing from you" }, /* @__PURE__ */ e.createElement("div", { className: "crew-login-site" }, /* @__PURE__ */ e.createElement(qe, { size: 13 }), " The ", t.field, " for ", t.site || "a site"), t.why && /* @__PURE__ */ e.createElement("div", { className: "crew-login-why" }, t.why), u === "sent" ? /* @__PURE__ */ e.createElement("div", { className: "crew-login-why" }, "Typed into the page. ", t.site, " should move on now.") : /* @__PURE__ */ e.createElement("form", { className: "crew-secret-row", onSubmit: (o) => {
      o.preventDefault(), m();
    } }, /* @__PURE__ */ e.createElement(
      "input",
      {
        type: "password",
        autoComplete: "off",
        placeholder: t.field,
        value: s,
        onChange: (o) => f(o.target.value)
      }
    ), /* @__PURE__ */ e.createElement("button", { className: "crew-btn", type: "submit", disabled: !s || u === "sending" }, u === "sending" ? "Typing…" : "Type it in")), u === "failed" && /* @__PURE__ */ e.createElement("div", { className: "crew-login-why" }, "That did not reach the screen — nothing was typed. Try taking the wheel instead."));
  }
  return /* @__PURE__ */ e.createElement(ge, { label: "Needs you at the keyboard" }, /* @__PURE__ */ e.createElement("div", { className: "crew-login-site" }, /* @__PURE__ */ e.createElement(qe, { size: 13 }), " Sign in to ", t.site || "a site"), t.why && /* @__PURE__ */ e.createElement("div", { className: "crew-login-why" }, t.why), /* @__PURE__ */ e.createElement("button", { className: "crew-btn", onClick: n }, "Take the wheel"));
}
function Ln({ payload: t, screenshotUrl: n }) {
  const r = t.url ?? (t.bot_id && t.file ? n(t.bot_id, t.file) : void 0);
  return r ? /* @__PURE__ */ e.createElement("figure", { className: "crew-shot" }, /* @__PURE__ */ e.createElement("img", { src: r, alt: t.caption || "the teammate's screen", loading: "lazy" }), t.caption && /* @__PURE__ */ e.createElement("figcaption", null, t.caption)) : null;
}
function $n({ kind: t, payload: n, handlers: r }) {
  const s = n ?? {};
  switch (t) {
    case "report":
      return /* @__PURE__ */ e.createElement(_n, { payload: s });
    case "approval_request":
      return /* @__PURE__ */ e.createElement(xn, { payload: s, onDecide: r.onDecide });
    case "approval_resolved":
      return /* @__PURE__ */ e.createElement(An, { payload: s });
    case "memory_updated":
      return /* @__PURE__ */ e.createElement(On, { payload: s });
    case "routine_created":
      return /* @__PURE__ */ e.createElement(In, { payload: s });
    case "bot_ref":
      return /* @__PURE__ */ e.createElement(Rn, { payload: s });
    case "login_request":
      return /* @__PURE__ */ e.createElement(Dn, { payload: s, onOpenScreen: r.onOpenScreen, onSubmitSecret: r.onSubmitSecret });
    case "screenshot":
      return /* @__PURE__ */ e.createElement(Ln, { payload: s, screenshotUrl: r.screenshotUrl });
    default:
      return null;
  }
}
const Pn = $e(async () => ({ default: (await import("./chunk-mermaid-HWGCJPDP-Bw7Uyv9k.js").then((t) => t.i)).Streamdown })), zn = {
  browser: en,
  terminal: yn,
  file: ke,
  handoff: Ie,
  status: Ie
};
function Un(t) {
  return t.parts.filter((n) => n.type === "text").map((n) => n.text).join("");
}
const Hn = (t) => {
  const n = Math.max(0, Math.floor(t / 1e3)), r = Math.floor(n / 60);
  return r ? `${r}m ${n % 60}s` : `${n}s`;
};
function qn() {
  return /* @__PURE__ */ e.createElement("svg", { "aria-hidden": "true", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ e.createElement("path", { d: "m5 12 7-7 7 7" }), /* @__PURE__ */ e.createElement("path", { d: "M12 19V5" }));
}
function jn() {
  return /* @__PURE__ */ e.createElement("svg", { className: "stop-icon", "aria-hidden": "true", viewBox: "0 0 24 24" }, /* @__PURE__ */ e.createElement("rect", { x: "7.5", y: "7.5", width: "9", height: "9", rx: "1.5", fill: "currentColor" }));
}
function Fn(t) {
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
function Vn({ agent: t, label: n, activities: r, startedAt: s }) {
  const [f, u] = C(0), [c, T] = C(!1);
  return P(() => {
    u(Date.now());
    const m = window.setInterval(() => u(Date.now()), 1e3);
    return () => window.clearInterval(m);
  }, []), /* @__PURE__ */ e.createElement("details", { className: "agent-working-details", open: c }, /* @__PURE__ */ e.createElement(
    "summary",
    {
      role: "status",
      "aria-label": `${t?.name ?? "This teammate"} is working: ${n}`,
      onClick: (m) => {
        m.preventDefault(), T((o) => !o);
      }
    },
    /* @__PURE__ */ e.createElement("span", { className: "agent-working-progress" }, "Working for ", Hn(f - Date.parse(s))),
    /* @__PURE__ */ e.createElement(Ae, { className: "agent-working-chevron", size: 15 })
  ), r.length > 0 && /* @__PURE__ */ e.createElement("div", { className: "agent-working-tools" }, r.map((m) => {
    const o = zn[m.kind] ?? Ie;
    return /* @__PURE__ */ e.createElement("details", { className: `agent-tool-detail ${m.status}`, key: m.id }, /* @__PURE__ */ e.createElement("summary", null, /* @__PURE__ */ e.createElement(o, { size: 14 }), /* @__PURE__ */ e.createElement("span", null, m.title), /* @__PURE__ */ e.createElement(Ae, { size: 13 })), /* @__PURE__ */ e.createElement("div", null, m.output ?? (m.status === "running" ? "Waiting for result…" : "No output")));
  })));
}
function Bn({
  message: t,
  agent: n,
  senderName: r,
  activities: s,
  chips: f,
  entering: u = !1,
  room: c = []
}) {
  const T = Un(t), m = G(null), o = G(!!t.streaming), S = s.filter((l) => l.conversationId === t.conversationId), i = [...S].reverse().find((l) => l.status === "running") ?? S.at(-1), a = t.role === "agent" && !!t.streaming, h = T.trim() || i?.title || "Working", g = t.parts.filter((l) => l.type === "chip");
  return Pe(() => {
    const l = m.current, I = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (l && t.role === "agent" && o.current && !t.streaming && !I) {
      const R = l.querySelector(".message-body");
      R && typeof R.animate == "function" && R.animate(
        [{ opacity: 0, transform: "translate3d(-6px,4px,0)" }, { opacity: 1, transform: "translate3d(0,0,0)" }],
        { duration: 260, easing: "cubic-bezier(.2,.82,.3,1)" }
      );
    }
    o.current = !!t.streaming;
  }, [u, t.role, t.streaming]), /* @__PURE__ */ e.createElement("div", { className: `message ${t.role} ${u ? "message-entering" : ""}`, ref: m }, t.interrupted && /* @__PURE__ */ e.createElement("div", { className: "agent-interrupted" }, "Interrupted"), r && t.role === "agent" && /* @__PURE__ */ e.createElement("div", { className: "message-sender" }, r), !a && (T || t.streaming && !g.length) && /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "message-body",
      onClick: t.role === "agent" ? Fn : void 0
    },
    t.role === "agent" ? /* @__PURE__ */ e.createElement(De, { fallback: /* @__PURE__ */ e.createElement("span", { className: "agent-markdown-fallback" }, T) }, /* @__PURE__ */ e.createElement(
      Pn,
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
      T
    )) : Tn(T, t.mentions, c).map((l, I) => l.agentId ? /* @__PURE__ */ e.createElement("mark", { key: I, className: "mention", title: `Asked ${c.find((R) => R.id === l.agentId)?.name ?? l.agentId} directly` }, l.text) : /* @__PURE__ */ e.createElement("span", { key: I }, l.text))
  ), a && /* @__PURE__ */ e.createElement(
    Vn,
    {
      agent: n,
      label: h,
      activities: S,
      startedAt: t.createdAt
    }
  ), g.map((l, I) => /* @__PURE__ */ e.createElement(
    $n,
    {
      key: `${t.id}:${I}`,
      kind: l.kind,
      payload: l.payload,
      handlers: f
    }
  )));
}
function Wn({
  agent: t,
  thread: n,
  agentsById: r,
  messages: s,
  activities: f,
  chips: u,
  loading: c = !1,
  focusRequest: T = 0,
  draft: m,
  onSend: o,
  onToggleDetails: S
}) {
  const [i, a] = C(""), [h, g] = C(!1), [l, I] = C(!1), [R, O] = C(!1), [j, B] = C(!1), E = G(null), z = G(null), re = G(null), de = G(!1), te = G(!0), X = G(!1), J = G(0), me = G(0), K = G(void 0), F = G(void 0), Z = G(/* @__PURE__ */ new Set()), le = G(n?.id ?? ""), he = G(c), [V, ae] = C(() => /* @__PURE__ */ new Set()), Q = n?.title || t?.name || "Crew", Y = n?.kind === "group", pe = (n?.members ?? []).map((_) => r.get(_)).filter((_) => !!_), se = n?.id ?? t?.id ?? "";
  Pe(() => {
    const _ = le.current !== se || he.current;
    if (le.current = se, he.current = c, c || _) {
      Z.current = new Set(s.map((N) => N.id)), ae(/* @__PURE__ */ new Set());
      return;
    }
    const p = s.filter((N) => !Z.current.has(N.id)).map((N) => N.id);
    for (const N of p) Z.current.add(N);
    ae(new Set(p));
  }, [se, c, s]);
  function oe(_) {
    const p = E.current;
    !p || typeof p.scrollTo != "function" || (te.current = !0, X.current = !0, O(!1), K.current && window.clearTimeout(K.current), J.current = Math.max(
      J.current,
      Date.now() + (_ === "smooth" ? 650 : 150)
    ), p.scrollTo({ top: p.scrollHeight, behavior: _ }), K.current = window.setTimeout(() => {
      K.current = void 0, X.current = !1;
    }, _ === "smooth" ? 400 : 0));
  }
  P(() => {
    te.current = !0, X.current = !1, me.current = 0, O(!1), requestAnimationFrame(() => oe("auto"));
  }, [se]), P(() => {
    te.current && oe("smooth");
  }, [s]), P(() => {
    const _ = E.current, p = z.current;
    if (!_ || !p || typeof ResizeObserver > "u") return;
    const N = new ResizeObserver(() => {
      te.current && oe("auto");
    });
    return N.observe(p), () => N.disconnect();
  }, [se, c]), P(() => () => {
    F.current && window.clearTimeout(F.current), K.current && window.clearTimeout(K.current);
  }, []), P(() => {
    T > 0 && re.current?.focus();
  }, [se, T]), P(() => {
    if (!m?.nonce) return;
    a(m.text);
    const _ = re.current;
    _?.focus(), _?.setSelectionRange(m.text.length, m.text.length);
  }, [m?.nonce]);
  function ue() {
    X.current || Date.now() < J.current || (B(!0), F.current && window.clearTimeout(F.current), F.current = window.setTimeout(() => {
      F.current = void 0, B(!1);
    }, 700));
  }
  async function ee(_) {
    _.preventDefault();
    const p = i.trim();
    if (!(!p || de.current)) {
      de.current = !0, a(""), g(!0);
      try {
        await o(p);
      } finally {
        de.current = !1, g(!1);
      }
    }
  }
  return /* @__PURE__ */ e.createElement("main", { className: "conversation" }, /* @__PURE__ */ e.createElement("header", { className: `conversation-header ${l ? "scrolled" : ""}` }, /* @__PURE__ */ e.createElement("h1", null, n?.emoji && /* @__PURE__ */ e.createElement("span", { className: "conversation-emoji" }, n.emoji), Q), n?.subtitle && /* @__PURE__ */ e.createElement("p", { className: "conversation-subtitle" }, n.subtitle), /* @__PURE__ */ e.createElement("div", { className: "header-actions" }, !Y && /* @__PURE__ */ e.createElement("button", { className: "computer-trigger", "aria-label": "Open this teammate's computer", onClick: S }, /* @__PURE__ */ e.createElement(tt, { size: 18 })))), /* @__PURE__ */ e.createElement("div", { className: "conversation-scroll-shell" }, c ? /* @__PURE__ */ e.createElement("div", { className: "conversation-skeleton", role: "status", "aria-label": "Loading this thread" }, /* @__PURE__ */ e.createElement("div", { className: "skeleton-message skeleton-agent" }, /* @__PURE__ */ e.createElement("span", { className: "skeleton-line skeleton-line-wide" }), /* @__PURE__ */ e.createElement("span", { className: "skeleton-line" })), /* @__PURE__ */ e.createElement("div", { className: "skeleton-message skeleton-user" }, /* @__PURE__ */ e.createElement("span", { className: "skeleton-bubble" })), /* @__PURE__ */ e.createElement("div", { className: "skeleton-message skeleton-agent" }, /* @__PURE__ */ e.createElement("span", { className: "skeleton-line skeleton-line-short" }))) : /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement(
    "div",
    {
      className: `message-scroll ${j ? "scrollbar-visible" : ""}`,
      ref: E,
      onWheelCapture: (_) => {
        _.deltaY < 0 && (X.current = !1);
      },
      onScroll: (_) => {
        const p = _.currentTarget, N = p.scrollHeight - p.scrollTop - p.clientHeight, $ = N <= 24, U = p.scrollTop < me.current - 1;
        me.current = p.scrollTop, I(p.scrollTop > 0), U && N > 72 ? (X.current = !1, te.current = !1, O(!0)) : !X.current && $ ? (te.current = !0, O(!1)) : !X.current && N > 72 && (te.current = !1, O(!0)), ue();
      },
      onPointerMove: (_) => {
        _.currentTarget.getBoundingClientRect().right - _.clientX <= 14 ? B(!0) : F.current || B(!1);
      },
      onPointerLeave: () => B(!1)
    },
    /* @__PURE__ */ e.createElement("div", { className: "message-content", ref: z }, s.length === 0 && t && /* @__PURE__ */ e.createElement("div", { className: "conversation-intro" }, /* @__PURE__ */ e.createElement(st, { agent: t, size: 54 }), /* @__PURE__ */ e.createElement("h2", null, t.name), /* @__PURE__ */ e.createElement("p", null, t.role)), s.map((_) => /* @__PURE__ */ e.createElement(
      Bn,
      {
        key: _.id,
        message: _,
        agent: t,
        senderName: Y ? r.get(_.sender ?? "")?.name : void 0,
        room: pe,
        activities: f,
        chips: u,
        entering: V.has(_.id) || _.id.startsWith("optimistic-user:")
      }
    )))
  ), R && /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "scroll-to-bottom",
      "aria-label": "Scroll to the latest message",
      onClick: () => oe("smooth")
    },
    /* @__PURE__ */ e.createElement(Vt, { size: 20 })
  ))), /* @__PURE__ */ e.createElement("form", { className: "composer", onSubmit: ee }, /* @__PURE__ */ e.createElement(
    "textarea",
    {
      ref: re,
      "aria-label": `Message ${Q}`,
      placeholder: Y ? "Ask the room…" : `Message ${Q}…`,
      value: i,
      onChange: (_) => a(_.target.value),
      onKeyDown: (_) => {
        _.key === "Enter" && !_.shiftKey && !_.nativeEvent.isComposing && _.keyCode !== 229 && (_.preventDefault(), _.currentTarget.form?.requestSubmit());
      }
    }
  ), /* @__PURE__ */ e.createElement("div", { className: "composer-bottom" }, /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "submit-button",
      "data-state": h ? "stopping" : "send",
      "aria-label": h ? "Sending" : "Send message",
      disabled: !i.trim() || h
    },
    h ? /* @__PURE__ */ e.createElement(jn, null) : /* @__PURE__ */ e.createElement(qn, null)
  ))));
}
const Gn = [
  { id: "all", label: "Everything", types: [] },
  {
    id: "stopped",
    label: "Stopped",
    types: ["tool.refused", "tool.held", "approval.expired", "crew.bot_declined"]
  },
  { id: "failed", label: "Went wrong", types: ["tool.failed"] },
  { id: "decisions", label: "Your decisions", types: ["approval.decided", "grant.changed"] }
], Kn = {
  "tool.allowed": Oe,
  "tool.refused": gn,
  "tool.held": He,
  "tool.failed": vn,
  "approval.decided": Oe,
  "approval.expired": Qe,
  "grant.changed": je,
  "crew.policy_loaded": je,
  "crew.bot_declined": He
}, Yn = {
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
function Xn(t) {
  const n = new Date(t);
  return `${n.toLocaleDateString(void 0, { month: "short", day: "numeric" })} ${n.toLocaleTimeString(void 0, { hour: "2-digit", minute: "2-digit" })}`;
}
function Jn({ events: t, loading: n, viewId: r, onChangeView: s, onLoadMore: f, hasMore: u }) {
  const [c, T] = C(() => /* @__PURE__ */ new Set()), m = fe(() => t.slice().sort((o, S) => S.id - o.id), [t]);
  return /* @__PURE__ */ e.createElement("section", { className: "audit-timeline" }, /* @__PURE__ */ e.createElement("div", { className: "audit-views", role: "tablist", "aria-label": "What to show" }, Gn.map((o) => /* @__PURE__ */ e.createElement(
    "button",
    {
      key: o.id,
      role: "tab",
      type: "button",
      "aria-selected": r === o.id,
      className: `audit-view ${r === o.id ? "is-current" : ""}`,
      onClick: () => s(o.id, o.types)
    },
    o.label
  ))), m.length === 0 && !n && /* @__PURE__ */ e.createElement("p", { className: "audit-empty" }, "Nothing recorded yet."), /* @__PURE__ */ e.createElement("ol", { className: "audit-rows" }, m.map((o) => {
    const S = Kn[o.event_type] ?? Oe, i = c.has(o.id), a = o.event_type === "tool.refused" || o.event_type === "tool.held";
    return /* @__PURE__ */ e.createElement(
      "li",
      {
        key: o.id,
        className: `audit-row ${a ? "is-stopped" : ""} ${o.event_type === "tool.failed" ? "is-failed" : ""}`
      },
      /* @__PURE__ */ e.createElement(
        "button",
        {
          type: "button",
          className: "audit-head",
          "aria-expanded": i,
          onClick: () => T((h) => {
            const g = new Set(h);
            return g.delete(o.id) || g.add(o.id), g;
          })
        },
        /* @__PURE__ */ e.createElement(S, { size: 14 }),
        /* @__PURE__ */ e.createElement("span", { className: "audit-subject" }, o.subject || o.tool || o.event_type),
        /* @__PURE__ */ e.createElement("span", { className: "audit-kind" }, Yn[o.event_type] ?? o.event_type),
        /* @__PURE__ */ e.createElement("time", { className: "audit-when", dateTime: new Date(o.created_at).toISOString() }, Xn(o.created_at))
      ),
      i && /* @__PURE__ */ e.createElement("dl", { className: "audit-detail" }, o.tool && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Tool"), /* @__PURE__ */ e.createElement("dd", null, /* @__PURE__ */ e.createElement("code", null, o.tool))), o.detail && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Why"), /* @__PURE__ */ e.createElement("dd", null, o.detail)), o.actor !== "_system" && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Who"), /* @__PURE__ */ e.createElement("dd", null, o.actor === "_operator" ? "you" : o.actor)), o.duration_ms !== null && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Took"), /* @__PURE__ */ e.createElement("dd", null, o.duration_ms, " ms")), o.args_digest && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Arguments"), /* @__PURE__ */ e.createElement("dd", null, /* @__PURE__ */ e.createElement("code", null, o.args_digest))))
    );
  })), u && /* @__PURE__ */ e.createElement(
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
const Zn = {
  slides: pn,
  document: ke,
  sheet: rn,
  image: on,
  data: Zt,
  text: ke,
  code: nn,
  archive: Ft,
  file: et
};
function Qn(t) {
  if (t === 0) return "0 bytes";
  const n = ["bytes", "KB", "MB", "GB"];
  let r = t, s = 0;
  for (; r >= 1024 && s < n.length - 1; )
    r /= 1024, s += 1;
  return `${s === 0 ? r : r.toFixed(r < 10 ? 1 : 0)} ${n[s]}`;
}
function er(t) {
  const n = new Date(t);
  return Number.isNaN(n.getTime()) ? "" : (/* @__PURE__ */ new Date()).toDateString() === n.toDateString() ? n.toLocaleTimeString(void 0, { hour: "2-digit", minute: "2-digit" }) : n.toLocaleDateString(void 0, { month: "short", day: "numeric" });
}
function tr({ agentName: t, artifacts: n, urlFor: r }) {
  return n.length === 0 ? /* @__PURE__ */ e.createElement("p", { className: "files-empty" }, t, " has not produced any files yet.") : /* @__PURE__ */ e.createElement("ul", { className: "files-list" }, n.map((s) => {
    const f = Zn[s.kind] ?? et, u = s.size === 0;
    return /* @__PURE__ */ e.createElement("li", { className: `files-row ${u ? "is-empty" : ""}`, key: s.id }, /* @__PURE__ */ e.createElement(
      "a",
      {
        href: r(s),
        download: s.name,
        className: "files-link"
      },
      /* @__PURE__ */ e.createElement(f, { size: 15 }),
      /* @__PURE__ */ e.createElement("span", { className: "files-name", title: s.path }, s.name),
      /* @__PURE__ */ e.createElement("span", { className: "files-meta" }, Qn(s.size), u && /* @__PURE__ */ e.createElement("span", { className: "files-warning", title: "Nothing was written to this file" }, "didn't finish")),
      /* @__PURE__ */ e.createElement("span", { className: "files-when" }, er(s.updatedAt)),
      /* @__PURE__ */ e.createElement(Qt, { size: 13, className: "files-download" })
    ));
  }));
}
const nr = {
  pending: Ze,
  running: Te,
  succeeded: Me,
  failed: bn,
  waiting: sn
}, rr = {
  web: an,
  file: ke,
  mail: ln,
  user: wn
};
function ar({ step: t }) {
  const n = nr[t.status] ?? Ze;
  return /* @__PURE__ */ e.createElement("li", { className: `plan-step is-${t.status}` }, /* @__PURE__ */ e.createElement(n, { size: 13, className: t.status === "running" ? "spin" : void 0 }), /* @__PURE__ */ e.createElement("span", { className: "plan-step-title" }, t.title), t.detail && /* @__PURE__ */ e.createElement("span", { className: "plan-step-detail" }, t.detail));
}
function sr({ item: t }) {
  const n = rr[t.kind] ?? ke, r = t.url ? /* @__PURE__ */ e.createElement("a", { href: t.url, target: "_blank", rel: "noreferrer noopener" }, t.title) : /* @__PURE__ */ e.createElement("span", null, t.title);
  return /* @__PURE__ */ e.createElement("li", { className: "evidence-row" }, /* @__PURE__ */ e.createElement("div", { className: "evidence-head" }, /* @__PURE__ */ e.createElement(n, { size: 12 }), r), /* @__PURE__ */ e.createElement("p", { className: "evidence-excerpt" }, t.excerpt));
}
function or({ agentName: t, tasks: n }) {
  return n.length === 0 ? /* @__PURE__ */ e.createElement("p", { className: "plan-empty" }, t, " has no scheduled or long-running work.") : /* @__PURE__ */ e.createElement("div", { className: "plan-list" }, n.map((r) => /* @__PURE__ */ e.createElement("section", { className: "plan-task", key: r.id }, /* @__PURE__ */ e.createElement("div", { className: "plan-task-head" }, /* @__PURE__ */ e.createElement("span", { className: "plan-task-title" }, r.title || r.kind), /* @__PURE__ */ e.createElement("span", { className: `plan-task-status is-${r.status}` }, r.status.replace("_", " "))), r.attempts > 1 && /* @__PURE__ */ e.createElement("p", { className: "plan-task-attempts" }, "picked up ", r.attempts, " times"), r.error && /* @__PURE__ */ e.createElement("p", { className: "plan-task-error" }, r.error), r.plan.length > 0 && /* @__PURE__ */ e.createElement("ol", { className: "plan-steps" }, r.plan.map((s) => /* @__PURE__ */ e.createElement(ar, { step: s, key: s.id }))), r.evidence.length > 0 && /* @__PURE__ */ e.createElement("details", { className: "evidence" }, /* @__PURE__ */ e.createElement("summary", null, "What it read (", r.evidence.length, ")"), /* @__PURE__ */ e.createElement("ul", { className: "evidence-list" }, r.evidence.map((s, f) => /* @__PURE__ */ e.createElement(sr, { item: s, key: `${s.title}-${f}` })))))));
}
const ir = [
  { mode: "deny", label: "Never", icon: Bt },
  { mode: "ask", label: "Ask me", icon: Yt },
  { mode: "allow", label: "Allow", icon: fn }
];
function cr({ agentName: t, grants: n, busy: r, onSetGrant: s, onClearGrant: f }) {
  const [u, c] = C(""), [T, m] = C(!1), o = fe(() => {
    const i = u.trim().toLowerCase(), a = n.filter((g) => T && g.source !== "grant" ? !1 : i ? g.tool.toLowerCase().includes(i) || g.toolset.toLowerCase().includes(i) : !0), h = /* @__PURE__ */ new Map();
    for (const g of a) {
      const l = g.toolset || "other";
      h.set(l, [...h.get(l) ?? [], g]);
    }
    return [...h.entries()].sort(([g], [l]) => g.localeCompare(l));
  }, [n, u, T]), S = n.filter((i) => i.mode === "ask").length;
  return /* @__PURE__ */ e.createElement("section", { className: "permissions-panel" }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow" }, /* @__PURE__ */ e.createElement(cn, { size: 14 }), " What ", t, " can do"), /* @__PURE__ */ e.createElement("p", { className: "permissions-summary" }, n.length, " tools · ", S, " need your say-so"), /* @__PURE__ */ e.createElement("div", { className: "permissions-filters" }, /* @__PURE__ */ e.createElement(
    "input",
    {
      type: "search",
      "aria-label": "Filter tools",
      placeholder: "Filter tools…",
      value: u,
      onChange: (i) => c(i.target.value)
    }
  ), /* @__PURE__ */ e.createElement("label", null, /* @__PURE__ */ e.createElement(
    "input",
    {
      type: "checkbox",
      checked: T,
      onChange: (i) => m(i.target.checked)
    }
  ), "Only what I changed")), o.length === 0 && /* @__PURE__ */ e.createElement("p", { className: "permissions-empty" }, "Nothing matches."), o.map(([i, a]) => /* @__PURE__ */ e.createElement("div", { className: "permissions-group", key: i }, /* @__PURE__ */ e.createElement("h4", null, i), a.map((h) => /* @__PURE__ */ e.createElement(
    "div",
    {
      className: `permissions-row ${h.protected ? "is-protected" : ""} ${h.available === !1 ? "is-unavailable" : ""}`,
      key: h.tool
    },
    /* @__PURE__ */ e.createElement("div", { className: "permissions-tool" }, /* @__PURE__ */ e.createElement("code", null, h.tool), /* @__PURE__ */ e.createElement("span", { className: "permissions-why" }, h.why)),
    /* @__PURE__ */ e.createElement("div", { className: "permissions-modes", role: "group", "aria-label": `What ${t} may do with ${h.tool}` }, ir.map(({ mode: g, label: l, icon: I }) => /* @__PURE__ */ e.createElement(
      "button",
      {
        key: g,
        type: "button",
        className: `permissions-mode ${h.mode === g ? "is-current" : ""}`,
        "aria-pressed": h.mode === g,
        disabled: r || h.protected,
        title: h.protected ? "This teammate always keeps this one" : l,
        onClick: () => {
          s(h.tool, g);
        }
      },
      /* @__PURE__ */ e.createElement(I, { size: 13 }),
      " ",
      l
    )), h.source === "grant" && !h.protected && /* @__PURE__ */ e.createElement(
      "button",
      {
        type: "button",
        className: "permissions-reset",
        "aria-label": `Reset ${h.tool} to the default`,
        disabled: r,
        onClick: () => {
          f(h.tool);
        }
      },
      /* @__PURE__ */ e.createElement(hn, { size: 13 })
    ))
  )))));
}
const lr = [
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
], dr = [
  "Every weekday at 9am, tell me what changed overnight that I should know about.",
  "Each Friday afternoon, write up what you got done this week."
];
function mr(t) {
  const n = (t || "").toLowerCase();
  for (const [r, s] of lr)
    if (r.test(n)) return s;
  return dr;
}
function xr(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
function ur(t) {
  if (Object.prototype.hasOwnProperty.call(t, "__esModule")) return t;
  var n = t.default;
  if (typeof n == "function") {
    var r = function s() {
      var f = !1;
      try {
        f = this instanceof s;
      } catch {
      }
      return f ? Reflect.construct(n, arguments, this.constructor) : n.apply(this, arguments);
    };
    r.prototype = n.prototype;
  } else r = {};
  return Object.defineProperty(r, "__esModule", { value: !0 }), Object.keys(t).forEach(function(s) {
    var f = Object.getOwnPropertyDescriptor(t, s);
    Object.defineProperty(r, s, f.get ? f : {
      enumerable: !0,
      get: function() {
        return t[s];
      }
    });
  }), r;
}
var Se = { exports: {} }, ie = {};
const ot = /* @__PURE__ */ ur(Pt);
var Ve;
function pr() {
  if (Ve) return ie;
  Ve = 1;
  var t = ot;
  function n(m) {
    var o = "https://react.dev/errors/" + m;
    if (1 < arguments.length) {
      o += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var S = 2; S < arguments.length; S++)
        o += "&args[]=" + encodeURIComponent(arguments[S]);
    }
    return "Minified React error #" + m + "; visit " + o + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function r() {
  }
  var s = {
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
  function u(m, o, S) {
    var i = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: f,
      key: i == null ? null : "" + i,
      children: m,
      containerInfo: o,
      implementation: S
    };
  }
  var c = t.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function T(m, o) {
    if (m === "font") return "";
    if (typeof o == "string")
      return o === "use-credentials" ? o : "";
  }
  return ie.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = s, ie.createPortal = function(m, o) {
    var S = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!o || o.nodeType !== 1 && o.nodeType !== 9 && o.nodeType !== 11)
      throw Error(n(299));
    return u(m, o, null, S);
  }, ie.flushSync = function(m) {
    var o = c.T, S = s.p;
    try {
      if (c.T = null, s.p = 2, m) return m();
    } finally {
      c.T = o, s.p = S, s.d.f();
    }
  }, ie.preconnect = function(m, o) {
    typeof m == "string" && (o ? (o = o.crossOrigin, o = typeof o == "string" ? o === "use-credentials" ? o : "" : void 0) : o = null, s.d.C(m, o));
  }, ie.prefetchDNS = function(m) {
    typeof m == "string" && s.d.D(m);
  }, ie.preinit = function(m, o) {
    if (typeof m == "string" && o && typeof o.as == "string") {
      var S = o.as, i = T(S, o.crossOrigin), a = typeof o.integrity == "string" ? o.integrity : void 0, h = typeof o.fetchPriority == "string" ? o.fetchPriority : void 0;
      S === "style" ? s.d.S(
        m,
        typeof o.precedence == "string" ? o.precedence : void 0,
        {
          crossOrigin: i,
          integrity: a,
          fetchPriority: h
        }
      ) : S === "script" && s.d.X(m, {
        crossOrigin: i,
        integrity: a,
        fetchPriority: h,
        nonce: typeof o.nonce == "string" ? o.nonce : void 0
      });
    }
  }, ie.preinitModule = function(m, o) {
    if (typeof m == "string")
      if (typeof o == "object" && o !== null) {
        if (o.as == null || o.as === "script") {
          var S = T(
            o.as,
            o.crossOrigin
          );
          s.d.M(m, {
            crossOrigin: S,
            integrity: typeof o.integrity == "string" ? o.integrity : void 0,
            nonce: typeof o.nonce == "string" ? o.nonce : void 0
          });
        }
      } else o == null && s.d.M(m);
  }, ie.preload = function(m, o) {
    if (typeof m == "string" && typeof o == "object" && o !== null && typeof o.as == "string") {
      var S = o.as, i = T(S, o.crossOrigin);
      s.d.L(m, S, {
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
  }, ie.preloadModule = function(m, o) {
    if (typeof m == "string")
      if (o) {
        var S = T(o.as, o.crossOrigin);
        s.d.m(m, {
          as: typeof o.as == "string" && o.as !== "script" ? o.as : void 0,
          crossOrigin: S,
          integrity: typeof o.integrity == "string" ? o.integrity : void 0
        });
      } else s.d.m(m);
  }, ie.requestFormReset = function(m) {
    s.d.r(m);
  }, ie.unstable_batchedUpdates = function(m, o) {
    return m(o);
  }, ie.useFormState = function(m, o, S) {
    return c.H.useFormState(m, o, S);
  }, ie.useFormStatus = function() {
    return c.H.useHostTransitionStatus();
  }, ie.version = "19.2.7", ie;
}
var ce = {};
var Be;
function hr() {
  return Be || (Be = 1, process.env.NODE_ENV !== "production" && (function() {
    function t() {
    }
    function n(i) {
      return "" + i;
    }
    function r(i, a, h) {
      var g = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
      try {
        n(g);
        var l = !1;
      } catch {
        l = !0;
      }
      return l && (console.error(
        "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
        typeof Symbol == "function" && Symbol.toStringTag && g[Symbol.toStringTag] || g.constructor.name || "Object"
      ), n(g)), {
        $$typeof: o,
        key: g == null ? null : "" + g,
        children: i,
        containerInfo: a,
        implementation: h
      };
    }
    function s(i, a) {
      if (i === "font") return "";
      if (typeof a == "string")
        return a === "use-credentials" ? a : "";
    }
    function f(i) {
      return i === null ? "`null`" : i === void 0 ? "`undefined`" : i === "" ? "an empty string" : 'something with type "' + typeof i + '"';
    }
    function u(i) {
      return i === null ? "`null`" : i === void 0 ? "`undefined`" : i === "" ? "an empty string" : typeof i == "string" ? JSON.stringify(i) : typeof i == "number" ? "`" + i + "`" : 'something with type "' + typeof i + '"';
    }
    function c() {
      var i = S.H;
      return i === null && console.error(
        `Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:
1. You might have mismatching versions of React and the renderer (such as React DOM)
2. You might be breaking the Rules of Hooks
3. You might have more than one copy of React in the same app
See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.`
      ), i;
    }
    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart == "function" && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
    var T = ot, m = {
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
    }, o = /* @__PURE__ */ Symbol.for("react.portal"), S = T.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    typeof Map == "function" && Map.prototype != null && typeof Map.prototype.forEach == "function" && typeof Set == "function" && Set.prototype != null && typeof Set.prototype.clear == "function" && typeof Set.prototype.forEach == "function" || console.error(
      "React depends on Map and Set built-in types. Make sure that you load a polyfill in older browsers. https://reactjs.org/link/react-polyfills"
    ), ce.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = m, ce.createPortal = function(i, a) {
      var h = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
      if (!a || a.nodeType !== 1 && a.nodeType !== 9 && a.nodeType !== 11)
        throw Error("Target container is not a DOM element.");
      return r(i, a, null, h);
    }, ce.flushSync = function(i) {
      var a = S.T, h = m.p;
      try {
        if (S.T = null, m.p = 2, i)
          return i();
      } finally {
        S.T = a, m.p = h, m.d.f() && console.error(
          "flushSync was called from inside a lifecycle method. React cannot flush when React is already rendering. Consider moving this call to a scheduler task or micro task."
        );
      }
    }, ce.preconnect = function(i, a) {
      typeof i == "string" && i ? a != null && typeof a != "object" ? console.error(
        "ReactDOM.preconnect(): Expected the `options` argument (second) to be an object but encountered %s instead. The only supported option at this time is `crossOrigin` which accepts a string.",
        u(a)
      ) : a != null && typeof a.crossOrigin != "string" && console.error(
        "ReactDOM.preconnect(): Expected the `crossOrigin` option (second argument) to be a string but encountered %s instead. Try removing this option or passing a string value instead.",
        f(a.crossOrigin)
      ) : console.error(
        "ReactDOM.preconnect(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
        f(i)
      ), typeof i == "string" && (a ? (a = a.crossOrigin, a = typeof a == "string" ? a === "use-credentials" ? a : "" : void 0) : a = null, m.d.C(i, a));
    }, ce.prefetchDNS = function(i) {
      if (typeof i != "string" || !i)
        console.error(
          "ReactDOM.prefetchDNS(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
          f(i)
        );
      else if (1 < arguments.length) {
        var a = arguments[1];
        typeof a == "object" && a.hasOwnProperty("crossOrigin") ? console.error(
          "ReactDOM.prefetchDNS(): Expected only one argument, `href`, but encountered %s as a second argument instead. This argument is reserved for future options and is currently disallowed. It looks like the you are attempting to set a crossOrigin property for this DNS lookup hint. Browsers do not perform DNS queries using CORS and setting this attribute on the resource hint has no effect. Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.",
          u(a)
        ) : console.error(
          "ReactDOM.prefetchDNS(): Expected only one argument, `href`, but encountered %s as a second argument instead. This argument is reserved for future options and is currently disallowed. Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.",
          u(a)
        );
      }
      typeof i == "string" && m.d.D(i);
    }, ce.preinit = function(i, a) {
      if (typeof i == "string" && i ? a == null || typeof a != "object" ? console.error(
        "ReactDOM.preinit(): Expected the `options` argument (second) to be an object with an `as` property describing the type of resource to be preinitialized but encountered %s instead.",
        u(a)
      ) : a.as !== "style" && a.as !== "script" && console.error(
        'ReactDOM.preinit(): Expected the `as` property in the `options` argument (second) to contain a valid value describing the type of resource to be preinitialized but encountered %s instead. Valid values for `as` are "style" and "script".',
        u(a.as)
      ) : console.error(
        "ReactDOM.preinit(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
        f(i)
      ), typeof i == "string" && a && typeof a.as == "string") {
        var h = a.as, g = s(h, a.crossOrigin), l = typeof a.integrity == "string" ? a.integrity : void 0, I = typeof a.fetchPriority == "string" ? a.fetchPriority : void 0;
        h === "style" ? m.d.S(
          i,
          typeof a.precedence == "string" ? a.precedence : void 0,
          {
            crossOrigin: g,
            integrity: l,
            fetchPriority: I
          }
        ) : h === "script" && m.d.X(i, {
          crossOrigin: g,
          integrity: l,
          fetchPriority: I,
          nonce: typeof a.nonce == "string" ? a.nonce : void 0
        });
      }
    }, ce.preinitModule = function(i, a) {
      var h = "";
      typeof i == "string" && i || (h += " The `href` argument encountered was " + f(i) + "."), a !== void 0 && typeof a != "object" ? h += " The `options` argument encountered was " + f(a) + "." : a && "as" in a && a.as !== "script" && (h += " The `as` option encountered was " + u(a.as) + "."), h ? console.error(
        "ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` string and, optionally, an `options` object with a valid `as` property.%s",
        h
      ) : (h = a && typeof a.as == "string" ? a.as : "script", h) === "script" || (h = u(h), console.error(
        'ReactDOM.preinitModule(): Currently the only supported "as" type for this function is "script" but received "%s" instead. This warning was generated for `href` "%s". In the future other module types will be supported, aligning with the import-attributes proposal. Learn more here: (https://github.com/tc39/proposal-import-attributes)',
        h,
        i
      )), typeof i == "string" && (typeof a == "object" && a !== null ? (a.as == null || a.as === "script") && (h = s(
        a.as,
        a.crossOrigin
      ), m.d.M(i, {
        crossOrigin: h,
        integrity: typeof a.integrity == "string" ? a.integrity : void 0,
        nonce: typeof a.nonce == "string" ? a.nonce : void 0
      })) : a == null && m.d.M(i));
    }, ce.preload = function(i, a) {
      var h = "";
      if (typeof i == "string" && i || (h += " The `href` argument encountered was " + f(i) + "."), a == null || typeof a != "object" ? h += " The `options` argument encountered was " + f(a) + "." : typeof a.as == "string" && a.as || (h += " The `as` option encountered was " + f(a.as) + "."), h && console.error(
        'ReactDOM.preload(): Expected two arguments, a non-empty `href` string and an `options` object with an `as` property valid for a `<link rel="preload" as="..." />` tag.%s',
        h
      ), typeof i == "string" && typeof a == "object" && a !== null && typeof a.as == "string") {
        h = a.as;
        var g = s(
          h,
          a.crossOrigin
        );
        m.d.L(i, h, {
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
    }, ce.preloadModule = function(i, a) {
      var h = "";
      typeof i == "string" && i || (h += " The `href` argument encountered was " + f(i) + "."), a !== void 0 && typeof a != "object" ? h += " The `options` argument encountered was " + f(a) + "." : a && "as" in a && typeof a.as != "string" && (h += " The `as` option encountered was " + f(a.as) + "."), h && console.error(
        'ReactDOM.preloadModule(): Expected two arguments, a non-empty `href` string and, optionally, an `options` object with an `as` property valid for a `<link rel="modulepreload" as="..." />` tag.%s',
        h
      ), typeof i == "string" && (a ? (h = s(
        a.as,
        a.crossOrigin
      ), m.d.m(i, {
        as: typeof a.as == "string" && a.as !== "script" ? a.as : void 0,
        crossOrigin: h,
        integrity: typeof a.integrity == "string" ? a.integrity : void 0
      })) : m.d.m(i));
    }, ce.requestFormReset = function(i) {
      m.d.r(i);
    }, ce.unstable_batchedUpdates = function(i, a) {
      return i(a);
    }, ce.useFormState = function(i, a, h) {
      return c().useFormState(i, a, h);
    }, ce.useFormStatus = function() {
      return c().useHostTransitionStatus();
    }, ce.version = "19.2.7", typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop == "function" && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
  })()), ce;
}
var We;
function fr() {
  if (We) return Se.exports;
  We = 1;
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
  return process.env.NODE_ENV === "production" ? (t(), Se.exports = pr()) : Se.exports = hr(), Se.exports;
}
var it = fr();
function gr(t) {
  if (t.width <= 0 || t.height <= 0) return !1;
  try {
    const n = t.getContext("2d", { willReadFrequently: !0 });
    if (!n) return !1;
    const r = [0, Math.floor(t.width / 2), t.width - 1], s = [0, Math.floor(t.height / 2), t.height - 1], f = r.flatMap((u) => s.map((c) => n.getImageData(u, c, 1, 1).data));
    if (f.every((u) => u[3] === 0)) return !1;
    for (let u = 0; u < 3; u += 1) {
      const c = f.map((T) => T[u]);
      if (Math.max(...c) - Math.min(...c) > 6) return !0;
    }
    return !1;
  } catch {
    return !1;
  }
}
function ct({
  session: t,
  viewOnly: n,
  compact: r = !1,
  onReconnect: s,
  onDisconnect: f
}) {
  const u = G(null), c = G(f), [T, m] = C("connecting"), [o, S] = C();
  return P(() => {
    c.current = f;
  }, [f]), P(() => {
    if (!u.current) return;
    let i = !1, a = !1, h = !1, g = !1, l, I, R, O;
    (r ? u.current.closest(".computer-preview") : null)?.style.removeProperty("aspect-ratio"), m("connecting"), S(void 0);
    const B = () => {
      l && window.clearInterval(l), I && window.clearTimeout(I), l = void 0, I = void 0;
    }, E = () => {
      R && window.clearTimeout(R), R = void 0;
    }, z = () => {
      g || (g = !0, c.current?.());
    }, re = (K) => {
      i || a || (a = !0, E(), B(), S(K), m("disconnected"), z(), O?.disconnect());
    }, de = () => {
      const K = u.current?.querySelector("canvas");
      return K ? gr(K) : !1;
    }, te = () => {
      i || a || (E(), h = !0, l = window.setInterval(() => {
        !i && de() && (B(), m("connected"));
      }, 100), I = window.setTimeout(() => {
        de() || re("This computer connected but never drew a frame.");
      }, 8e3));
    }, X = (K) => {
      if (i || a) return;
      E(), B();
      const F = K.detail?.clean;
      S((Z) => Z ?? (h && F ? "This computer stopped before drawing a frame." : F ? "This computer disconnected." : "The connection to this computer was lost.")), m("disconnected"), z();
    }, J = (K) => {
      re(K.detail?.reason ?? "Screen security negotiation failed.");
    }, me = () => re("This computer's screen is asking for a VNC password.");
    return R = window.setTimeout(() => re("This computer's screen did not answer."), 15e3), import("./chunk-rfb-DFY61DWN.js").then(({ default: K }) => {
      i || a || !u.current || (O = new K(u.current, t.url, { shared: !0, wsProtocols: t.protocols }), O.viewOnly = n, O.scaleViewport = !0, O.resizeSession = !1, r && (O.background = "transparent"), O.addEventListener("connect", te), O.addEventListener("disconnect", X), O.addEventListener("securityfailure", J), O.addEventListener("credentialsrequired", me));
    }).catch(() => re("Could not load the screen client.")), () => {
      i = !0, E(), B(), O?.removeEventListener("connect", te), O?.removeEventListener("disconnect", X), O?.removeEventListener("securityfailure", J), O?.removeEventListener("credentialsrequired", me), O?.disconnect();
    };
  }, [r, t, n]), /* @__PURE__ */ e.createElement("div", { className: `vnc-viewport ${r ? "is-compact" : ""}` }, /* @__PURE__ */ e.createElement("div", { ref: u, className: "vnc-target" }), T !== "connected" && /* @__PURE__ */ e.createElement("div", { className: "vnc-status", role: "status" }, T === "connecting" ? /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement(Te, { size: r ? 14 : 18, className: "spin" }), !r && "Connecting…") : /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("span", null, r ? "Screen unavailable" : o), s && /* @__PURE__ */ e.createElement("button", { className: "secondary-button", onClick: s }, "Reconnect"))));
}
function yr({
  session: t,
  failure: n,
  title: r,
  onClose: s,
  onReconnect: f
}) {
  return it.createPortal(/* @__PURE__ */ e.createElement("div", { className: "vnc-desktop", role: "dialog", "aria-label": r }, /* @__PURE__ */ e.createElement("div", { className: "vnc-titlebar", "aria-hidden": "true" }), /* @__PURE__ */ e.createElement("button", { className: "vnc-close", "aria-label": "Close this screen", onClick: s }, /* @__PURE__ */ e.createElement(mn, { size: 18 })), t ? /* @__PURE__ */ e.createElement(ct, { session: t, viewOnly: !1, onReconnect: f }) : /* @__PURE__ */ e.createElement("div", { className: "vnc-viewport" }, /* @__PURE__ */ e.createElement("div", { className: "vnc-status", role: "status" }, n ? /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("span", null, n), /* @__PURE__ */ e.createElement("button", { className: "secondary-button", onClick: f }, "Reconnect")) : /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement(Te, { size: 18, className: "spin" }), " Connecting…")))), document.body);
}
function vr({
  open: t,
  width: n,
  onResize: r,
  agentName: s,
  agentRole: f,
  computer: u,
  approvals: c,
  routines: T,
  grants: m,
  grantsBusy: o,
  audit: S,
  auditLoading: i,
  auditView: a,
  auditHasMore: h,
  artifacts: g,
  artifactUrl: l,
  tasks: I,
  proactive: R,
  onSetProactive: O,
  onApproval: j,
  onComputerAction: B,
  onDeleteRoutine: E,
  onDraft: z,
  onSetGrant: re,
  onClearGrant: de,
  onChangeAuditView: te,
  onLoadMoreAudit: X,
  onClose: J
}) {
  const [me, K] = C(""), [F, Z] = C(""), [le, he] = C(!1), [V, ae] = C(() => /* @__PURE__ */ new Map()), [Q, Y] = C(""), [pe, se] = C(() => /* @__PURE__ */ new Set()), [oe, ue] = C(), [ee, _] = C(!1), [p, N] = C(), $ = c.filter((d) => d.status === "pending"), U = V.get(u?.id ?? ""), D = pe.has(u?.id ?? ""), v = G(B);
  P(() => {
    v.current = B;
  }, [B]), P(() => {
    const d = u?.id;
    if (!t || ee || u?.status !== "online" || !d || U || D) return;
    let A = !0;
    return Y(d), v.current("open").then((H) => {
      A && (ae((W) => new Map(W).set(d, H)), Y(""));
    }).catch(() => {
      A && (se((H) => new Set(H).add(d)), Y(""));
    }), () => {
      A = !1;
    };
  }, [u?.id, u?.status, ee, t, D, U]);
  async function b(d) {
    _(!0), ue(void 0), N(void 0), he(!0);
    const A = u?.id;
    A && pe.has(A) && (se((H) => {
      const W = new Set(H);
      return W.delete(A), W;
    }), ae((H) => {
      const W = new Map(H);
      return W.delete(A), W;
    }));
    try {
      ue(await B(d));
    } catch (H) {
      N(H instanceof Error ? H.message : "Could not reach that computer.");
    } finally {
      he(!1);
    }
  }
  function y() {
    _(!1), ue(void 0), N(void 0);
  }
  const k = () => window.innerWidth <= 1030 ? Math.min(730, window.innerWidth - 40) : Math.min(730, window.innerWidth - (window.innerWidth <= 1180 ? 672 : 732));
  P(() => {
    const d = () => {
      const A = Math.max(280, k());
      n > A && r(A);
    };
    return d(), window.addEventListener("resize", d), () => window.removeEventListener("resize", d);
  }, [r, n]);
  const L = (d) => r(Math.max(280, Math.min(k(), window.innerWidth - d)));
  return /* @__PURE__ */ e.createElement("aside", { className: `detail-panel ${t ? "is-open" : "is-closing"}`, style: { width: n } }, /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "detail-resize-handle",
      role: "separator",
      "aria-label": "Resize the details panel",
      "aria-orientation": "vertical",
      "aria-valuemin": 280,
      "aria-valuemax": Math.max(280, k()),
      "aria-valuenow": n,
      tabIndex: 0,
      onKeyDown: (d) => {
        d.key === "ArrowLeft" ? (d.preventDefault(), r(Math.min(k(), n + 16))) : d.key === "ArrowRight" && (d.preventDefault(), r(Math.max(280, n - 16)));
      },
      onPointerDown: (d) => {
        d.currentTarget.setPointerCapture(d.pointerId), L(d.clientX);
      },
      onPointerMove: (d) => {
        d.currentTarget.hasPointerCapture(d.pointerId) && L(d.clientX);
      }
    }
  ), /* @__PURE__ */ e.createElement("header", null, /* @__PURE__ */ e.createElement("button", { className: "icon-button", "aria-label": "Close the details panel", onClick: J }, /* @__PURE__ */ e.createElement(Kt, { size: 18 }))), c.filter((d) => d.outcome === "outcome_unknown").map((d) => /* @__PURE__ */ e.createElement("section", { className: "approval-card is-uncertain", key: `unknown-${d.id}` }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow warning" }, /* @__PURE__ */ e.createElement(Re, { size: 14 }), " Outcome unknown"), /* @__PURE__ */ e.createElement("h3", null, d.title), /* @__PURE__ */ e.createElement("p", null, "You allowed this and the process stopped before anything recorded whether it went through. It may have. Check before allowing it again."))), $.map((d) => /* @__PURE__ */ e.createElement("section", { className: "approval-card", key: d.id }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow warning" }, /* @__PURE__ */ e.createElement(Re, { size: 14 }), " Waiting for you", d.source && d.source !== d.agentId && /* @__PURE__ */ e.createElement("span", { className: "approval-source" }, d.source), d.ref && /* @__PURE__ */ e.createElement("code", { className: "approval-ref", title: "Reply with this in the thread to decide without opening the panel" }, d.ref)), /* @__PURE__ */ e.createElement("h3", null, d.title), d.description && /* @__PURE__ */ e.createElement("p", null, d.description), d.scope.length > 0 && /* @__PURE__ */ e.createElement("div", { className: "scope" }, /* @__PURE__ */ e.createElement("span", null, "This allows:"), d.scope.map((A) => /* @__PURE__ */ e.createElement("div", { key: A }, /* @__PURE__ */ e.createElement(Me, { size: 13 }), A))), /* @__PURE__ */ e.createElement(
    "textarea",
    {
      "aria-label": "Note for this decision",
      placeholder: "Add a note (optional)",
      value: me,
      onChange: (A) => K(A.target.value)
    }
  ), /* @__PURE__ */ e.createElement("div", { className: "approval-actions" }, /* @__PURE__ */ e.createElement("button", { className: "secondary-button danger-text", onClick: () => {
    j(d.id, "deny", me, d.contentHash);
  } }, "Discard"), /* @__PURE__ */ e.createElement("button", { className: "primary-button", onClick: () => {
    j(d.id, "allow", me, d.contentHash);
  } }, "Approve")))), /* @__PURE__ */ e.createElement("section", { className: "screen-section" }, /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "screen-trigger",
      disabled: le || u?.status !== "online",
      "aria-label": `Open ${s}'s screen`,
      onClick: () => {
        b("open");
      }
    },
    /* @__PURE__ */ e.createElement("span", { className: "computer-preview" }, [...V].map(([d, A]) => /* @__PURE__ */ e.createElement(
      "span",
      {
        className: `computer-preview-stream ${d === u?.id ? "is-active" : ""}`,
        key: d
      },
      /* @__PURE__ */ e.createElement(
        ct,
        {
          session: A,
          viewOnly: !0,
          compact: !0,
          onDisconnect: () => se((H) => new Set(H).add(d))
        }
      )
    )), !V.has(u?.id ?? "") && (Q === u?.id ? /* @__PURE__ */ e.createElement("span", { className: "computer-preview-loading", role: "status", "aria-label": `Loading ${s}'s screen` }, /* @__PURE__ */ e.createElement(Te, { size: 18, className: "spin" })) : pe.has(u?.id ?? "") ? /* @__PURE__ */ e.createElement("span", { className: "computer-preview-loading", role: "status" }, "Screen unavailable") : /* @__PURE__ */ e.createElement("span", { className: "computer-screen-off", "aria-hidden": "true" })), /* @__PURE__ */ e.createElement("span", { className: "screen-hover-action" }, /* @__PURE__ */ e.createElement(dn, { size: 14 }), " Open"))
  ), /* @__PURE__ */ e.createElement("div", { className: "screen-caption" }, /* @__PURE__ */ e.createElement("span", null, s, "'s screen"), /* @__PURE__ */ e.createElement("span", { className: `screen-state ${u?.status ?? "offline"}` }, u?.status === "online" ? "Running" : u?.status === "starting" ? "Starting…" : "Off")), u && u.status !== "online" && /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "secondary-button",
      disabled: le,
      onClick: () => {
        b("takeover");
      }
    },
    "Start this computer"
  ), u?.error && /* @__PURE__ */ e.createElement("p", { className: "screen-error" }, u.error)), /* @__PURE__ */ e.createElement("section", { className: "proactive-section" }, /* @__PURE__ */ e.createElement("label", { className: "proactive-row" }, /* @__PURE__ */ e.createElement(
    "input",
    {
      type: "checkbox",
      checked: R,
      onChange: (d) => {
        O(d.target.checked);
      }
    }
  ), /* @__PURE__ */ e.createElement("span", null, /* @__PURE__ */ e.createElement("strong", null, "Speak up unprompted"), /* @__PURE__ */ e.createElement("span", null, "Bring up work that is stuck, a few times a day, in this thread.")))), /* @__PURE__ */ e.createElement("section", { className: "routines-section" }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow" }, "Routines"), T.map((d) => /* @__PURE__ */ e.createElement("div", { className: "routine-row", key: d.id }, /* @__PURE__ */ e.createElement("div", null, /* @__PURE__ */ e.createElement("strong", null, d.name), /* @__PURE__ */ e.createElement("span", null, d.schedule)), /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "icon-button",
      "aria-label": `Cancel the routine ${d.name}`,
      onClick: () => {
        E(d.id);
      }
    },
    /* @__PURE__ */ e.createElement(at, { size: 14 })
  ))), T.length === 0 && /* @__PURE__ */ e.createElement("div", { className: "routine-empty" }, /* @__PURE__ */ e.createElement("p", null, "Nothing on a schedule yet. Ask for something like:"), mr(f).map((d) => /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "routine-suggestion",
      key: d,
      onClick: () => z(d)
    },
    d
  )))), /* @__PURE__ */ e.createElement("section", { className: "drawer-section" }, /* @__PURE__ */ e.createElement("div", { className: "drawer-tabs", role: "tablist", "aria-label": "More about this teammate" }, /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": F === "work",
      className: F === "work" ? "is-current" : "",
      onClick: () => Z((d) => d === "work" ? "" : "work")
    },
    "Work"
  ), /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": F === "files",
      className: F === "files" ? "is-current" : "",
      onClick: () => Z((d) => d === "files" ? "" : "files")
    },
    "Files",
    g.length > 0 && /* @__PURE__ */ e.createElement("span", { className: "drawer-count" }, g.length)
  ), /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": F === "permissions",
      className: F === "permissions" ? "is-current" : "",
      onClick: () => Z((d) => d === "permissions" ? "" : "permissions")
    },
    "Permissions"
  ), /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": F === "audit",
      className: F === "audit" ? "is-current" : "",
      onClick: () => Z((d) => d === "audit" ? "" : "audit")
    },
    "History"
  )), F === "work" && /* @__PURE__ */ e.createElement(or, { agentName: s, tasks: I }), F === "files" && /* @__PURE__ */ e.createElement(
    tr,
    {
      agentName: s,
      artifacts: g,
      urlFor: l
    }
  ), F === "permissions" && /* @__PURE__ */ e.createElement(
    cr,
    {
      agentName: s,
      grants: m,
      busy: o,
      onSetGrant: re,
      onClearGrant: de
    }
  ), F === "audit" && /* @__PURE__ */ e.createElement(
    Jn,
    {
      events: S,
      loading: i,
      viewId: a,
      hasMore: h,
      onChangeView: te,
      onLoadMore: X
    }
  )), ee && /* @__PURE__ */ e.createElement(
    yr,
    {
      session: oe,
      failure: p,
      title: `${s}'s computer`,
      onClose: y,
      onReconnect: () => {
        b("takeover");
      }
    }
  ));
}
function wr({
  value: t,
  options: n,
  ariaLabel: r,
  placeholder: s = "Select",
  onChange: f,
  onOpen: u
}) {
  const [c, T] = C(!1), [m, o] = C(), S = G(null), i = G(null), a = n.find((l) => l.value === t);
  P(() => {
    if (!c) return;
    const l = () => {
      const R = S.current?.getBoundingClientRect();
      if (!R) return;
      const O = 5, j = 8, B = Math.max(R.width, 180), E = Math.min(220, n.length * 32 + 10), z = window.innerHeight - R.bottom - j, re = z < E && R.top - j > z;
      o({
        position: "fixed",
        zIndex: 100,
        left: Math.max(j, Math.min(R.right - B, window.innerWidth - B - j)),
        top: re ? Math.max(j, R.top - E - O) : R.bottom + O,
        width: B,
        maxHeight: re ? Math.min(220, R.top - O - j) : Math.min(220, z)
      });
    }, I = (R) => {
      const O = R.target;
      !S.current?.contains(O) && !i.current?.contains(O) && T(!1);
    };
    return l(), window.addEventListener("pointerdown", I), window.addEventListener("resize", l), window.addEventListener("scroll", l, !0), () => {
      window.removeEventListener("pointerdown", I), window.removeEventListener("resize", l), window.removeEventListener("scroll", l, !0);
    };
  }, [c, n.length]);
  const h = (l) => {
    const I = n.filter((j) => !j.disabled && !j.action);
    if (!I.length) return;
    const R = I.findIndex((j) => j.value === t), O = R < 0 ? l > 0 ? 0 : I.length - 1 : (R + l + I.length) % I.length;
    f(I[O].value);
  }, g = () => T((l) => (l || u?.(), !l));
  return /* @__PURE__ */ e.createElement("div", { className: `crew-select ${c ? "open" : ""}`, ref: S }, /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "crew-select-trigger",
      "aria-label": r,
      "aria-haspopup": "listbox",
      "aria-expanded": c,
      onClick: g,
      onKeyDown: (l) => {
        if (l.key === "Escape") {
          T(!1);
          return;
        }
        (l.key === "ArrowDown" || l.key === "ArrowUp") && (l.preventDefault(), h(l.key === "ArrowDown" ? 1 : -1), c || u?.(), T(!0));
      }
    },
    /* @__PURE__ */ e.createElement("span", null, a?.label ?? s),
    /* @__PURE__ */ e.createElement("span", { className: "crew-select-chevron" }, /* @__PURE__ */ e.createElement(Gt, { size: 15 }))
  ), c && m && it.createPortal(
    /* @__PURE__ */ e.createElement(
      "div",
      {
        className: "crew-select-menu crew-select-menu-portal",
        ref: i,
        style: m,
        role: "listbox",
        "aria-label": r
      },
      n.map((l) => /* @__PURE__ */ e.createElement(
        "button",
        {
          type: "button",
          className: `${l.action ? "crew-select-action" : ""} ${l.action || l.icon ? "crew-select-has-icon" : ""}`,
          role: "option",
          "aria-selected": !l.action && l.value === t,
          disabled: l.disabled,
          key: l.value,
          onClick: () => {
            l.action?.(), l.action || f(l.value), T(!1);
          }
        },
        (l.action || l.icon) && /* @__PURE__ */ e.createElement("span", { className: "crew-select-check", "aria-hidden": "true" }, l.icon),
        /* @__PURE__ */ e.createElement("span", { className: "crew-select-label", title: l.label }, l.label),
        !l.action && /* @__PURE__ */ e.createElement("span", { className: "crew-select-check", "aria-hidden": "true" }, l.value === t && /* @__PURE__ */ e.createElement(Me, { size: 14 }))
      ))
    ),
    document.body
  ));
}
const Er = ["🤖", "🔎", "📥", "📈", "🎖️", "🧭", "🛠️", "📚", "🧪", "✍️", "🗂️", "🛰️"];
function Ge({
  editing: t,
  providers: n,
  busy: r,
  error: s,
  onSubmit: f,
  onClose: u
}) {
  const [c, T] = C(t?.name ?? ""), [m, o] = C(t?.role ?? ""), [S, i] = C(t?.avatar || "🤖"), [a, h] = C("");
  P(() => {
    const l = (I) => {
      I.key === "Escape" && u();
    };
    return window.addEventListener("keydown", l), () => window.removeEventListener("keydown", l);
  }, [u]);
  const g = !!c.trim() && !r;
  return /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "palette-backdrop",
      role: "presentation",
      onMouseDown: (l) => {
        l.target === l.currentTarget && u();
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
          l.preventDefault(), g && f({ name: c.trim(), role: m.trim(), emoji: S, modelProviderId: a });
        }
      },
      /* @__PURE__ */ e.createElement("h2", null, t ? `Edit ${t.name}` : "Hire a teammate"),
      /* @__PURE__ */ e.createElement("label", { className: "crew-field" }, /* @__PURE__ */ e.createElement("span", null, "Name"), /* @__PURE__ */ e.createElement(
        "input",
        {
          autoFocus: !t,
          value: c,
          disabled: !!t,
          placeholder: "Scout",
          onChange: (l) => T(l.target.value)
        }
      ), t && /* @__PURE__ */ e.createElement("small", null, "A teammate's name is its profile directory, so it cannot be changed here.")),
      /* @__PURE__ */ e.createElement("label", { className: "crew-field" }, /* @__PURE__ */ e.createElement("span", null, "Their job, in one line"), /* @__PURE__ */ e.createElement(
        "input",
        {
          autoFocus: !!t,
          value: m,
          placeholder: "Turns a one-line question into a decision-ready brief with sources",
          onChange: (l) => o(l.target.value)
        }
      )),
      /* @__PURE__ */ e.createElement("div", { className: "crew-field" }, /* @__PURE__ */ e.createElement("span", null, "Face"), /* @__PURE__ */ e.createElement("div", { className: "crew-emoji-row" }, Er.map((l) => /* @__PURE__ */ e.createElement(
        "button",
        {
          type: "button",
          key: l,
          className: `crew-emoji ${l === S ? "selected" : ""}`,
          "aria-label": `Use ${l}`,
          "aria-pressed": l === S,
          onClick: () => i(l)
        },
        l
      )))),
      !t && n.length > 0 && /* @__PURE__ */ e.createElement("div", { className: "crew-field" }, /* @__PURE__ */ e.createElement("span", null, "Model"), /* @__PURE__ */ e.createElement(
        wr,
        {
          ariaLabel: "Model provider",
          placeholder: "Same as your default profile",
          value: a,
          options: [
            // Cloning the default profile is what gives a new teammate working
            // credentials immediately, so it is the option that needs no
            // explanation and therefore the one that comes first.
            { value: "", label: "Same as your default profile" },
            ...n.map((l) => ({
              value: l.id,
              label: l.defaultModel ? `${l.name} · ${l.defaultModel}` : l.name
            }))
          ],
          onChange: h
        }
      )),
      s && /* @__PURE__ */ e.createElement("p", { className: "crew-dialog-error" }, s),
      /* @__PURE__ */ e.createElement("div", { className: "crew-dialog-actions" }, /* @__PURE__ */ e.createElement("button", { type: "button", className: "secondary-button", onClick: u }, "Cancel"), /* @__PURE__ */ e.createElement("button", { className: "primary-button", disabled: !g }, r ? "Working…" : t ? "Save" : "Hire"))
    )
  );
}
const lt = "hermes-crew:detail-width";
function br() {
  try {
    const t = window.localStorage?.getItem(lt), n = t ? Number.parseInt(t, 10) : Number.NaN;
    return Number.isFinite(n) ? Math.max(280, n) : 360;
  } catch {
    return 360;
  }
}
function kr({ client: t, notify: n }) {
  const r = Ut(t, { notify: n }), [s, f] = C(""), [u, c] = C([]), [T, m] = C([]), [o, S] = C([]), [i, a] = C(!1), [h, g] = C([]), [l, I] = C(!1), [R, O] = C({ id: "all", types: [] }), [j, B] = C(null), [E, z] = C([]), [re, de] = C([]), [te, X] = C(!1), [J, me] = C(br), [K, F] = C(!1), [Z, le] = C(), [he, V] = C(!1), [ae, Q] = C(), [Y, pe] = C(0), [se, oe] = C({ text: "", nonce: 0 }), { agents: ue, conversations: ee, selectedAgent: _, selectedAgentId: p, selectedThreadId: N } = r, $ = fe(() => ee.filter((w) => w.kind === "group"), [ee]), U = fe(() => new Map(ue.map((w) => [w.id, w])), [ue]), D = fe(
    () => ee.find((w) => w.id === N),
    [ee, N]
  ), v = r.approvals.filter((w) => w.status === "pending").length;
  P(() => {
    try {
      window.localStorage?.setItem(lt, String(J));
    } catch {
    }
  }, [J]);
  const b = we(() => {
    t.listSections().then(c).catch(() => c([]));
  }, [t]);
  P(b, [b, ue.length]), P(() => {
    if (!p) {
      m([]);
      return;
    }
    let w = !0;
    return t.listRoutines(p).then((M) => {
      w && m(M);
    }).catch(() => {
      w && m([]);
    }), () => {
      w = !1;
    };
  }, [t, p]), P(() => {
    if (!p) {
      S([]);
      return;
    }
    let w = !0;
    return t.listGrants(p).then((M) => {
      w && S(M);
    }).catch(() => {
      w && S([]);
    }), () => {
      w = !1;
    };
  }, [t, p]);
  const y = we(() => {
    if (!p) {
      z([]);
      return;
    }
    t.listArtifacts(p).then(z).catch(() => z([]));
  }, [t, p]);
  P(y, [y]);
  const k = _?.status;
  P(() => {
    k !== "working" && y();
  }, [k, y]), P(() => {
    if (!p) {
      de([]);
      return;
    }
    let w = !0;
    return t.listTasks(p).then((M) => {
      w && de(M);
    }).catch(() => {
      w && de([]);
    }), () => {
      w = !1;
    };
  }, [t, p, k]);
  const L = we((w, M) => {
    if (!p) {
      g([]), B(null);
      return;
    }
    I(!0), t.listAuditEvents({
      agentId: p,
      eventTypes: w,
      beforeId: M,
      limit: 50
    }).then((q) => {
      g((ne) => M ? [...ne, ...q.events] : q.events), B(q.nextBeforeId);
    }).catch(() => {
      M || (g([]), B(null));
    }).finally(() => I(!1));
  }, [t, p]);
  P(() => {
    L(R.types);
  }, [L, R]), P(() => {
    v > 0 && X(!0);
  }, [v]), P(() => {
    const w = (M) => {
      (M.metaKey || M.ctrlKey) && M.key.toLowerCase() === "k" && (M.preventDefault(), F((q) => !q));
    };
    return window.addEventListener("keydown", w), () => window.removeEventListener("keydown", w);
  }, []);
  const d = (w, M) => {
    const q = u.map((ne) => ne.id === w ? { ...ne, collapsed: M } : ne);
    c(q), t.saveSections(q).then(c).catch(b);
  }, A = (w, M) => {
    if (M === "edit") {
      Q(void 0), le({ editing: w });
      return;
    }
    if (M === "duplicate") {
      r.duplicateAgent(w.id).catch(() => {
      });
      return;
    }
    window.confirm(`Remove ${w.name} from the crew? Their profile, memory and skills stay on disk.`) && r.deleteAgent(w.id).catch(() => {
    });
  }, H = async (w) => {
    V(!0), Q(void 0);
    try {
      Z?.editing ? await r.updateAgent(Z.editing.id, { role: w.role, emoji: w.emoji }) : await r.createAgent({
        name: w.name,
        role: w.role,
        emoji: w.emoji,
        modelProviderId: w.modelProviderId || void 0
      }), le(void 0), b();
    } catch (M) {
      Q(M instanceof Error ? M.message : "That did not work.");
    } finally {
      V(!1);
    }
  }, W = fe(() => ({
    onDecide: (w, M) => {
      r.respondToApproval(w, M).catch(() => {
      });
    },
    // A login request is the one chip that is an instruction to the operator,
    // so its button does the thing rather than pointing at where the thing is.
    onOpenScreen: () => {
      X(!0), r.openComputer("takeover").catch(() => {
      });
    },
    onSubmitSecret: async (w, M) => {
      _ && await t.submitSecret(_.id, w, M);
    },
    screenshotUrl: (w, M) => t.screenshotUrl(w, M)
  }), [t, r]);
  return r.loading ? /* @__PURE__ */ e.createElement("div", { className: "crew-workspace is-loading", role: "status" }, "Loading your crew…") : ue.length ? /* @__PURE__ */ e.createElement("div", { className: "crew-workspace" }, /* @__PURE__ */ e.createElement(
    Sn,
    {
      agents: ue,
      sections: u,
      rooms: $,
      selectedAgentId: p,
      selectedThreadId: N,
      search: s,
      onSearch: f,
      onSelectAgent: (w) => {
        r.setSelectedAgentId(w), pe((M) => M + 1);
      },
      onSelectThread: (w) => {
        r.setSelectedThreadId(w), pe((M) => M + 1);
      },
      onAction: A,
      onCreate: () => {
        Q(void 0), le({});
      },
      onToggleSection: d
    }
  ), /* @__PURE__ */ e.createElement(
    Wn,
    {
      agent: _,
      thread: D,
      agentsById: U,
      messages: r.messages,
      activities: r.activities,
      chips: W,
      loading: r.conversationLoading,
      focusRequest: Y,
      draft: se,
      onSend: (w) => r.sendMessage(w).catch(() => {
      }),
      onToggleDetails: () => X((w) => !w)
    }
  ), te && _ && /* @__PURE__ */ e.createElement(
    vr,
    {
      open: te,
      width: J,
      onResize: me,
      agentName: _.name,
      agentRole: _.role,
      computer: r.computer,
      approvals: r.approvals,
      routines: T,
      grants: o,
      grantsBusy: i,
      audit: h,
      auditLoading: l,
      auditView: R.id,
      auditHasMore: j !== null,
      artifacts: E,
      artifactUrl: (w) => t.artifactUrl(w),
      tasks: re,
      proactive: _.proactive !== !1,
      onSetProactive: (w) => r.updateAgent(_.id, { proactive: w }),
      onApproval: (w, M, q, ne) => r.respondToApproval(w, M, q, ne),
      onComputerAction: (w) => r.openComputer(w),
      onDraft: (w) => oe((M) => ({ text: w, nonce: M.nonce + 1 })),
      onDeleteRoutine: async (w) => {
        await t.deleteRoutine(_.id, w), m((M) => M.filter((q) => q.id !== w));
      },
      onSetGrant: async (w, M) => {
        a(!0);
        try {
          const q = await t.setGrant({ agentId: _.id, tool: w, mode: M });
          S((ne) => ne.map((ye) => ye.tool === w ? { ...ye, ...q } : ye));
        } finally {
          a(!1);
        }
      },
      onClearGrant: async (w) => {
        a(!0);
        try {
          const M = await t.clearGrant(_.id, w);
          S((q) => q.map((ne) => ne.tool === w ? { ...ne, ...M } : ne));
        } finally {
          a(!1);
        }
      },
      onChangeAuditView: (w, M) => O({ id: w, types: M }),
      onLoadMoreAudit: () => {
        j !== null && L(R.types, j);
      },
      onClose: () => X(!1)
    }
  ), /* @__PURE__ */ e.createElement(
    Cn,
    {
      open: K,
      agents: ue,
      rooms: $,
      onClose: () => F(!1),
      onSelectAgent: r.setSelectedAgentId,
      onSelectThread: r.setSelectedThreadId,
      onCreateAgent: () => {
        Q(void 0), le({});
      },
      onComputer: () => X(!0)
    }
  ), Z && /* @__PURE__ */ e.createElement(
    Ge,
    {
      editing: Z.editing,
      providers: r.modelProviders,
      busy: he,
      error: ae,
      onSubmit: H,
      onClose: () => le(void 0)
    }
  ), r.error && /* @__PURE__ */ e.createElement("div", { className: "crew-toast", role: "alert" }, /* @__PURE__ */ e.createElement("span", null, r.error), /* @__PURE__ */ e.createElement("button", { className: "icon-button", "aria-label": "Dismiss", onClick: r.dismissError }, "×"))) : /* @__PURE__ */ e.createElement("div", { className: "crew-workspace is-empty" }, /* @__PURE__ */ e.createElement("div", { className: "crew-empty-card" }, /* @__PURE__ */ e.createElement("h2", null, "No teammates yet"), /* @__PURE__ */ e.createElement("p", null, "A teammate is a Hermes profile with a thread, a memory and a computer of its own. Give one a name and a one-line job to start."), /* @__PURE__ */ e.createElement("button", { className: "primary-button", onClick: () => {
    Q(void 0), le({});
  } }, "Hire your first teammate")), Z && /* @__PURE__ */ e.createElement(
    Ge,
    {
      providers: r.modelProviders,
      busy: he,
      error: ae,
      onSubmit: H,
      onClose: () => le(void 0)
    }
  ));
}
const xe = 500, Nr = 15e3;
function Sr(t, n) {
  return t === 401 || t === 403 ? new ve("unauthorized", n) : t === 404 ? new ve("not_found", n) : t === 409 ? new ve("conflict", n) : new ve("unknown", n, t >= 500);
}
function Cr(t) {
  const n = new URL(t, globalThis.location?.href ?? "http://127.0.0.1");
  return n.protocol = n.protocol === "https:" ? "wss:" : "ws:", n.pathname = `${n.pathname.replace(/\/+$/, "")}/v1/events`, n.toString();
}
class Mr {
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
  reconnectDelay = xe;
  reconnectTimer;
  opening = !1;
  closed = !1;
  constructor(n) {
    this.baseUrl = n.baseUrl.replace(/\/+$/, "");
    const r = n.eventsUrl ?? Cr(this.baseUrl);
    this.resolveEventsUrl = typeof r == "function" ? r : async () => r, this.fetchImpl = n.fetchImpl ?? ((s, f) => fetch(s, f)), this.headers = n.headers ?? (() => ({}));
  }
  async request(n, r = {}) {
    let s;
    try {
      s = await this.fetchImpl(`${this.baseUrl}${n}`, {
        ...r,
        headers: {
          ...r.body ? { "Content-Type": "application/json" } : {},
          ...this.headers(),
          ...r.headers ?? {}
        }
      });
    } catch (f) {
      throw f instanceof DOMException && f.name === "AbortError" ? f : new ve("network", "Could not reach the crew backend.", !0);
    }
    if (!s.ok) {
      const f = await s.json().then((u) => u?.detail).catch(() => {
      });
      throw Sr(s.status, f ?? `Crew request failed (${s.status})`);
    }
    if (s.status !== 204)
      return await s.json();
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
  /**
   * Hand one field to the teammate's page. The value is an argument and
   * nothing else — it is not cached, not retried, and the response carries
   * no echo of it.
   */
  submitSecret(n, r, s, f) {
    return this.request(
      `/bots/${encodeURIComponent(n)}/secret`,
      { method: "POST", body: JSON.stringify({ ref: r, value: s }), signal: f }
    );
  }
  updateAgent(n, r, s) {
    return this.request(`/v1/agents/${encodeURIComponent(n)}`, {
      method: "PATCH",
      body: JSON.stringify(r),
      signal: s
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
    const s = n ? `?agentId=${encodeURIComponent(n)}` : "";
    return this.request(`/v1/conversations${s}`, { signal: r });
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
    const s = n ? `?agentId=${encodeURIComponent(n)}` : "";
    return this.request(`/v1/approvals${s}`, { signal: r });
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
    this.closeSocket(), this.reconnectDelay = xe, this.listeners.size && this.openSocket(), await this.listAgents(n);
  }
  listSections(n) {
    return this.request("/sections", { signal: n }).then((r) => r.sections);
  }
  saveSections(n, r) {
    return this.request("/sections", {
      method: "PUT",
      body: JSON.stringify(n),
      signal: r
    }).then((s) => s.sections);
  }
  listRoutines(n, r) {
    return this.request(
      `/bots/${encodeURIComponent(n)}/routines`,
      { signal: r }
    ).then((s) => s.routines);
  }
  async deleteRoutine(n, r, s) {
    await this.request(
      `/bots/${encodeURIComponent(n)}/routines/${encodeURIComponent(r)}`,
      { method: "DELETE", signal: s }
    );
  }
  listGrants(n, r) {
    return this.request(
      `/bots/${encodeURIComponent(n)}/grants`,
      { signal: r }
    ).then((s) => s.grants);
  }
  setGrant(n, r) {
    return this.request(
      `/bots/${encodeURIComponent(n.agentId)}/grants/${encodeURIComponent(n.tool)}`,
      { method: "PUT", body: JSON.stringify({ mode: n.mode, note: n.note ?? "" }), signal: r }
    );
  }
  clearGrant(n, r, s) {
    return this.request(
      `/bots/${encodeURIComponent(n)}/grants/${encodeURIComponent(r)}`,
      { method: "DELETE", signal: s }
    );
  }
  listAuditEvents(n = {}, r) {
    const s = new URLSearchParams();
    n.agentId && s.set("bot_id", n.agentId), n.eventTypes?.length && s.set("event_type", n.eventTypes.join(",")), n.beforeId && s.set("before_id", String(n.beforeId)), n.limit && s.set("limit", String(n.limit));
    const f = s.toString();
    return this.request(`/audit${f ? `?${f}` : ""}`, { signal: r });
  }
  listTasks(n, r) {
    return this.request(
      `/bots/${encodeURIComponent(n)}/tasks`,
      { signal: r }
    ).then((s) => s.tasks);
  }
  listArtifacts(n, r) {
    return this.request(
      `/bots/${encodeURIComponent(n)}/files`,
      { signal: r }
    ).then((s) => s.files);
  }
  artifactUrl(n) {
    const r = n.downloadPath.split("/").map(encodeURIComponent).join("/");
    return `${this.baseUrl}${r}`;
  }
  screenshotUrl(n, r) {
    return `${this.baseUrl}/screenshots/${encodeURIComponent(n)}/${encodeURIComponent(r)}`;
  }
  subscribeToConversationEvents(n, r) {
    const s = (f) => {
      "threadId" in f && f.threadId && f.threadId !== n || r(f);
    };
    return this.listeners.add(s), this.closed = !1, this.openSocket(), {
      unsubscribe: () => {
        this.listeners.delete(s), this.listeners.size || (this.closed = !0, this.closeSocket());
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
      this.reconnectDelay = xe, this.emit({ type: "connection.changed", state: "connected" });
    }, r.onmessage = (s) => {
      try {
        this.emit(JSON.parse(String(s.data)));
      } catch {
      }
    }, r.onclose = () => {
      this.socket = void 0, !this.closed && (this.emit({ type: "connection.changed", state: "connecting" }), this.scheduleReconnect());
    }, r.onerror = () => r.close();
  }
  scheduleReconnect() {
    this.reconnectTimer || this.closed || (this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = void 0, this.reconnectDelay = Math.min(this.reconnectDelay * 2, Nr), this.openSocket();
    }, this.reconnectDelay));
  }
  closeSocket() {
    this.reconnectTimer && (clearTimeout(this.reconnectTimer), this.reconnectTimer = void 0), this.opening = !1;
    const n = this.socket;
    this.socket = void 0, n && (n.onclose = null, n.onerror = null, n.close());
  }
}
const Ke = "/api/plugins/hermes-crew", Ye = window.__HERMES_PLUGIN_SDK__, Tr = new Mr({
  baseUrl: Ke,
  // The SDK's authed fetch, not the global one. Its own contract says plugins
  // must not hand-read the session token, and this is what keeps loopback,
  // gated-OAuth and server-internal modes all working from one bundle.
  fetchImpl: (t, n) => Ye.authedFetch(t, n),
  // A resolver, not a string: in gated mode `buildWsUrl` mints a single-use
  // ticket, so the URL has to be rebuilt for every connect and reconnect.
  eventsUrl: () => Ye.buildWsUrl(`${Ke}/v1/events`)
});
function _r(t) {
  try {
    if (typeof Notification > "u" || Notification.permission !== "granted" || document.visibilityState === "visible") return;
    new Notification(t.title, { body: t.body });
  } catch {
  }
}
function Ar() {
  return /* @__PURE__ */ e.createElement(kr, { client: Tr, notify: _r });
}
export {
  Ar as C,
  e as R,
  De as S,
  C as a,
  P as b,
  xt as c,
  fe as d,
  G as e,
  Pe as f,
  xr as g,
  Ce as h,
  bt as i,
  vt as j,
  wt as k,
  we as l,
  kt as m,
  $e as n,
  it as r,
  Mt as u
};

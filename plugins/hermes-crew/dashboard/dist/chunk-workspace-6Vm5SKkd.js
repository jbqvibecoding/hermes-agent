const Nt = globalThis.__HERMES_PLUGIN_SDK__, e = Nt?.React;
if (!e)
  throw new Error(
    "hermes-crew: the dashboard plugin SDK is not on the page, so there is no React to borrow."
  );
const {
  Children: St,
  Fragment: Ct,
  Profiler: Mt,
  StrictMode: Tt,
  Suspense: De,
  cloneElement: _t,
  createContext: xt,
  createElement: Ie,
  createRef: It,
  forwardRef: He,
  isValidElement: At,
  lazy: Pe,
  memo: Ot,
  startTransition: Rt,
  use: Dt,
  useActionState: Pt,
  useCallback: Ee,
  useContext: $t,
  useDebugValue: Lt,
  useDeferredValue: zt,
  useEffect: U,
  useId: Ut,
  useImperativeHandle: qt,
  useInsertionEffect: Ht,
  useLayoutEffect: je,
  useMemo: fe,
  useOptimistic: jt,
  useReducer: Vt,
  useRef: K,
  useState: S,
  useSyncExternalStore: ct,
  useTransition: Ft,
  version: Bt
} = e, Wt = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Children: St,
  Fragment: Ct,
  Profiler: Mt,
  StrictMode: Tt,
  Suspense: De,
  cloneElement: _t,
  createContext: xt,
  createElement: Ie,
  createRef: It,
  default: e,
  forwardRef: He,
  isValidElement: At,
  lazy: Pe,
  memo: Ot,
  startTransition: Rt,
  use: Dt,
  useActionState: Pt,
  useCallback: Ee,
  useContext: $t,
  useDebugValue: Lt,
  useDeferredValue: zt,
  useEffect: U,
  useId: Ut,
  useImperativeHandle: qt,
  useInsertionEffect: Ht,
  useLayoutEffect: je,
  useMemo: fe,
  useOptimistic: jt,
  useReducer: Vt,
  useRef: K,
  useState: S,
  useSyncExternalStore: ct,
  useTransition: Ft,
  version: Bt
}, Symbol.toStringTag, { value: "Module" }));
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
const We = 6e4, Gt = 3e4, $e = "optimistic-user:", Ne = "optimistic-agent:";
function Kt(t, n = {}) {
  const { enabled: a = !0, notify: r } = n, [i, u] = S([]), [l, C] = S(""), [m, s] = S(""), [b, c] = S([]), [o, h] = S([]), [y, d] = S([]), [$, P] = S([]), [_, L] = S(), [V, B] = S("connecting"), [X, k] = S([]), [F, Q] = S(a), [J, ee] = S(), [re, g] = S(() => /* @__PURE__ */ new Set()), [O, te] = S(""), [ge, pe] = S(0), j = K(/* @__PURE__ */ new Map()), se = K(l), oe = K(/* @__PURE__ */ new Set()), Y = K(/* @__PURE__ */ new Map()), le = K(r), ie = fe(
    () => i.find((f) => f.id === l),
    [i, l]
  ), ce = m || (l ? `dm:${l}` : ""), ye = !!(l && !re.has(l));
  U(() => {
    se.current = l;
  }, [l]), U(() => {
    le.current = r;
  }, [r]);
  const ae = Ee(async (f = !1) => {
    const N = await t.listAgents();
    for (const E of oe.current)
      N.some((T) => T.id === E) || oe.current.delete(E);
    const R = N.filter((E) => !oe.current.has(E.id)), H = se.current, z = R.find((E) => E.id === H), w = j.current.get(H);
    z?.lastMessagePreview && w && !w.messages.some((E) => E.streaming) && _e(w.messages) !== z.lastMessagePreview && (j.current.set(H, { ...w, cachedAt: 0 }), pe((T) => T + 1));
    const M = !!w?.messages.some((E) => E.streaming);
    return u((E) => R.map((T) => {
      const q = E.find((W) => W.id === T.id), p = _e(j.current.get(T.id)?.messages ?? []), D = !!p || T.id === H && M;
      return {
        ...T,
        lastMessagePreview: D ? p || q?.lastMessagePreview : T.lastMessagePreview ?? q?.lastMessagePreview
      };
    })), C((E) => E && R.some((T) => T.id === E) || f ? E : R[0]?.id || ""), R;
  }, [t]), x = Ee(async () => {
    const f = await t.listModelProviders();
    return k(f.providers), f.providers;
  }, [t]);
  return U(() => {
    if (!a) {
      u([]), k([]), C(""), s(""), h([]), d([]), P([]), L(void 0), B("disconnected"), Q(!1), ee(void 0);
      return;
    }
    let f = !0;
    return Q(!0), Promise.all([ae(), x()]).then(() => {
      f && (B("connected"), Q(!1));
    }).catch((N) => {
      f && (B("error"), ee(N instanceof Error ? N.message : "Could not load the crew"), Q(!1));
    }), () => {
      f = !1;
    };
  }, [a, ae, x]), U(() => {
    if (!a) return;
    const f = () => {
      document.visibilityState === "hidden" || !navigator.onLine || ae().catch(() => {
      });
    }, N = () => {
      document.visibilityState === "visible" && f();
    }, R = window.setInterval(f, Gt);
    return window.addEventListener("focus", f), window.addEventListener("online", f), document.addEventListener("visibilitychange", N), () => {
      window.clearInterval(R), window.removeEventListener("focus", f), window.removeEventListener("online", f), document.removeEventListener("visibilitychange", N);
    };
  }, [a, ae]), U(() => {
    s("");
  }, [l]), U(() => {
    if (!a) return;
    const f = j.current.get(l);
    if (f ? (h(f.messages), d(f.activities), P(f.approvals), L(f.computer), c(f.conversations)) : (h([]), d([]), P([]), L(void 0), c([])), te(""), !l) return;
    const N = f ? Date.now() - f.cachedAt : Number.POSITIVE_INFINITY;
    if (f && N < We && !m) {
      f.messages.some((w) => w.streaming) && te(l);
      const z = window.setTimeout(() => pe((w) => w + 1), We - N);
      return () => window.clearTimeout(z);
    }
    const R = new AbortController();
    let H = !0;
    return Promise.all([
      t.listConversations(l, R.signal),
      t.listApprovalRequests(l, R.signal),
      t.getComputer(l, R.signal)
    ]).then(async ([z, w, M]) => {
      const E = m ? z.find((Z) => Z.id === m) ?? z[0] : z[0], T = E ? await t.getConversation(E.id, R.signal) : void 0;
      if (!H || oe.current.has(l)) return;
      const q = j.current.get(l)?.messages ?? [], p = (T?.messages ?? []).map((Z) => {
        const v = Y.current.get(Z.id);
        return v ? { ...Z, id: v } : Z;
      }), D = q.filter(
        (Z) => Z.id.startsWith($e) || Z.id.startsWith(Ne)
      ), W = [
        ...p,
        ...D.filter((Z) => !p.some((v) => v.id === Z.id))
      ], G = _e(W), he = T?.activities ?? [];
      j.current.set(l, {
        messages: W,
        activities: he,
        approvals: w,
        conversations: z,
        computer: M,
        cachedAt: Date.now()
      }), g((Z) => new Set(Z).add(l)), h(W), d(he), P(w), L(M), c(z), te(l), G && u((Z) => Z.map((v) => v.id === l ? { ...v, lastMessagePreview: G } : v));
    }).catch((z) => {
      !H || oe.current.has(l) || z instanceof DOMException && z.name === "AbortError" || (j.current.set(l, {
        messages: [],
        activities: [],
        approvals: [],
        conversations: [],
        cachedAt: Date.now()
      }), g((w) => new Set(w).add(l)), h([]), ee(z instanceof Error ? z.message : "Could not load this teammate"));
    }), () => {
      H = !1, R.abort();
    };
  }, [t, a, ge, l, m]), U(() => {
    if (!a || !l || _?.status === "online") return;
    let f = !0;
    const N = async () => {
      try {
        const H = await t.getComputer(l);
        if (!f || se.current !== l) return;
        L(H);
        const z = j.current.get(l);
        z && j.current.set(l, { ...z, computer: H });
      } catch {
      }
    }, R = window.setInterval(() => {
      N();
    }, 2e3);
    return N(), () => {
      f = !1, window.clearInterval(R);
    };
  }, [t, _?.status, a, l]), U(() => {
    if (!a || !ce || O !== l) return;
    let f = !0;
    const N = l, R = (w) => {
      const M = j.current.get(N);
      j.current.set(N, {
        messages: M?.messages ?? [],
        activities: M?.activities ?? [],
        approvals: M?.approvals ?? [],
        conversations: M?.conversations ?? [],
        computer: M?.computer,
        cachedAt: Date.now(),
        ...w
      });
    }, H = (w) => h((M) => {
      const E = w(M);
      return R({ messages: E }), E;
    }), z = t.subscribeToConversationEvents(ce, (w) => {
      if (f) {
        if (w.type === "message.created" && H((M) => {
          let E = w.message;
          const T = Y.current.get(w.message.id);
          if (T && (E = { ...w.message, id: T }), w.message.role === "user" && !T) {
            const p = new Set(Y.current.values()), D = M.find((W) => W.id.startsWith($e) && !p.has(W.id) && Be(W) === Be(w.message));
            D && (Y.current.set(w.message.id, D.id), E = { ...w.message, id: D.id });
          }
          if (w.message.role === "agent" && !T) {
            const p = new Set(Y.current.values()), D = M.find((W) => W.id.startsWith(Ne) && !p.has(W.id));
            D && (Y.current.set(w.message.id, D.id), E = { ...w.message, id: D.id });
          }
          return M.find((p) => p.id === E.id) ? M.map((p) => p.id === E.id ? E : p) : [...M, E];
        }), w.type === "message.delta" && H((M) => {
          let E = Y.current.get(w.messageId);
          if (!E) {
            const T = new Set(Y.current.values()), q = M.find((p) => p.id.startsWith(Ne) && !T.has(p.id));
            q && (E = q.id, Y.current.set(w.messageId, E));
          }
          return E ??= w.messageId, M.some((T) => T.id === E) ? M.map((T) => T.id === E ? {
            ...T,
            parts: T.parts.map((q, p) => p === 0 && q.type === "text" ? { ...q, text: q.text + w.delta } : q)
          } : T) : [...M, {
            id: E,
            conversationId: ce,
            role: "agent",
            parts: [{ type: "text", text: w.delta }],
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            streaming: !0
          }];
        }), w.type === "message.completed") {
          const M = Y.current.get(w.messageId) ?? w.messageId;
          w.notify === !1 ? H((E) => E.flatMap((T) => T.id !== M ? [T] : T.id.startsWith(Ne) ? [{
            ...T,
            parts: T.parts.map((q) => q.type === "text" ? { ...q, text: "" } : q),
            streaming: !0
          }] : [])) : (H((E) => {
            const T = E.filter((p) => p.id === M || p.role !== "agent" || !p.streaming).map((p) => p.id === M ? { ...p, streaming: !1 } : p), q = _e(T);
            return q && u((p) => p.map((D) => D.id === N ? { ...D, lastMessagePreview: q } : D)), T;
          }), le.current?.({
            title: `${ie?.name ?? "Your teammate"} finished`,
            body: "There is something new to read."
          }));
        }
        if (w.type === "message.dropped") {
          const M = Y.current.get(w.messageId) ?? w.messageId;
          H((E) => E.filter((T) => T.id !== M));
        }
        w.type === "message.updated" && (H((M) => {
          const E = Y.current.get(w.message.id), T = E ? { ...w.message, id: E } : w.message, q = M.find((D) => D.id === T.id), p = w.message.role === "agent" && !w.message.streaming ? M.filter((D) => D.id === T.id || D.role !== "agent" || !D.streaming) : M;
          return q ? p.map((D) => D.id === T.id ? T : D) : [...p, T];
        }), w.message.role === "agent" && !w.message.streaming && u((M) => M.map((E) => E.id === N ? { ...E, lastMessagePreview: lt(w.message) || void 0 } : E))), w.type === "approval.updated" && (P((M) => {
          const E = M.some((T) => T.id === w.approval.id) ? M.map((T) => T.id === w.approval.id ? w.approval : T) : [w.approval, ...M];
          return R({ approvals: E }), E;
        }), w.approval.status === "pending" && le.current?.({
          title: `${ie?.name ?? "Your teammate"} needs you`,
          body: w.approval.title
        })), w.type === "activity.updated" && d((M) => {
          const E = M.some((T) => T.id === w.activity.id) ? M.map((T) => T.id === w.activity.id ? w.activity : T) : [...M, w.activity];
          return R({ activities: E }), E;
        }), w.type === "agent.status" && u((M) => M.map((E) => E.id === w.agentId ? { ...E, status: w.status } : E)), w.type === "connection.changed" && B(w.state);
      }
    });
    return () => {
      f = !1, z.unsubscribe();
    };
  }, [t, ce, a, O, ie?.name, l]), {
    agents: i,
    conversations: b,
    modelProviders: X,
    selectedAgent: ie,
    selectedAgentId: l,
    setSelectedAgentId: C,
    selectedThreadId: ce,
    setSelectedThreadId: s,
    messages: o,
    activities: y,
    approvals: $,
    computer: _,
    connection: V,
    loading: F,
    conversationLoading: ye,
    error: J,
    refreshAgents: ae,
    refreshModelProviders: x,
    dismissError: () => ee(void 0),
    createAgent: async (f) => {
      const N = await t.createAgent(f);
      return await ae(!0), C(N.id), N;
    },
    updateAgent: async (f, N) => {
      await t.updateAgent(f, N), await ae(!0);
    },
    duplicateAgent: async (f) => {
      const N = await t.duplicateAgent(f);
      await ae(!0), C(N.id);
    },
    deleteAgent: async (f) => {
      const N = i.find((M) => M.id === f), R = l;
      if (!N || oe.current.has(f)) return;
      const H = i.findIndex((M) => M.id === f), z = i.filter((M) => M.id !== f), w = R === f ? z[Math.min(Math.max(H, 0), Math.max(z.length - 1, 0))]?.id ?? "" : R;
      oe.current.add(f), u(z), C(w);
      try {
        try {
          await t.deleteAgent(f);
        } catch (M) {
          if (!(M instanceof we && M.code === "not_found")) throw M;
        }
        j.current.delete(f), g((M) => {
          const E = new Set(M);
          return E.delete(f), E;
        }), await ae();
      } catch (M) {
        throw oe.current.delete(f), u((E) => {
          if (E.some((q) => q.id === f)) return E;
          const T = [...E];
          return T.splice(Math.min(H, T.length), 0, N), T;
        }), C((E) => E || (R === f ? f : E)), ee(M instanceof Error ? M.message : "Could not remove this teammate"), M;
      }
    },
    sendMessage: async (f) => {
      if (!ce || !l) return;
      const N = l, R = ce, H = `${Date.now()}:${Math.random().toString(36).slice(2)}`, z = `${$e}${H}`, w = `${Ne}${H}`, M = (/* @__PURE__ */ new Date()).toISOString(), E = {
        id: z,
        conversationId: R,
        role: "user",
        parts: [{ type: "text", text: f }],
        createdAt: M
      }, T = {
        id: w,
        conversationId: R,
        role: "agent",
        parts: [{ type: "text", text: "" }],
        createdAt: M,
        streaming: !0
      }, q = j.current.get(N) ?? {
        messages: [],
        activities: [],
        approvals: [],
        conversations: [],
        cachedAt: Date.now()
      }, p = [...q.messages].reverse().find((G) => G.role === "agent" && G.streaming), W = [...p ? q.messages.map((G) => G.id === p.id ? { ...G, streaming: !1, interrupted: !0 } : G) : q.messages, E, T];
      se.current === N && d([]), j.current.set(N, { ...q, messages: W, activities: [], cachedAt: Date.now() }), se.current === N && (h(W), te(N));
      try {
        const G = await t.sendMessage({ conversationId: R, text: f });
        Y.current.set(G.id, z);
        const he = G.id.match(/^(.+):user(?:$|:)/)?.[1];
        he && (Y.current.set(`${he}:user`, z), Y.current.set(`${he}:agent`, p?.id ?? w));
        const Z = j.current.get(N) ?? q, v = { ...G, id: z }, A = Z.messages.map((ne) => ne.id === z ? v : ne).filter((ne, ue, ke) => ke.findIndex((kt) => kt.id === ne.id) === ue);
        j.current.set(N, { ...Z, messages: A, cachedAt: Date.now() }), se.current === N && h(A);
      } catch (G) {
        const he = j.current.get(N) ?? q, Z = he.messages.filter((A) => A.id !== w), v = Z.some((A) => A.id === z) ? Z : [...Z, E];
        throw j.current.set(N, { ...he, messages: v, cachedAt: Date.now() }), se.current === N && h(v), p || ee(G instanceof Error ? G.message : "Could not send that"), G;
      }
    },
    respondToApproval: async (f, N, R, H) => {
      const z = l, w = await t.respondToApproval({ requestId: f, decision: N, note: R, contentHash: H }), M = j.current.get(z), E = (M?.approvals ?? []).map((T) => T.id === w.id ? w : T);
      M && j.current.set(z, { ...M, approvals: E, cachedAt: Date.now() }), se.current === z && P(E);
    },
    openComputer: async (f) => {
      if (!l) throw new Error("No teammate is selected");
      try {
        return await (f === "open" ? t.openComputer(l) : t.takeOverComputer(l));
      } catch (N) {
        throw ee(N instanceof Error ? N.message : "Could not open that computer"), N;
      }
    },
    reconnect: async () => {
      B("connecting");
      try {
        await t.reconnect(), await ae(), B("connected");
      } catch (f) {
        B("error"), ee(f instanceof Error ? f.message : "Reconnect failed");
      }
    }
  };
}
const Yt = (t) => t.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), dt = (...t) => t.filter((n, a, r) => !!n && n.trim() !== "" && r.indexOf(n) === a).join(" ").trim();
var Xt = {
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
const Jt = He(
  ({
    color: t = "currentColor",
    size: n = 24,
    strokeWidth: a = 2,
    absoluteStrokeWidth: r,
    className: i = "",
    children: u,
    iconNode: l,
    ...C
  }, m) => Ie(
    "svg",
    {
      ref: m,
      ...Xt,
      width: n,
      height: n,
      stroke: t,
      strokeWidth: r ? Number(a) * 24 / Number(n) : a,
      className: dt("lucide", i),
      ...C
    },
    [
      ...l.map(([s, b]) => Ie(s, b)),
      ...Array.isArray(u) ? u : [u]
    ]
  )
);
const I = (t, n) => {
  const a = He(
    ({ className: r, ...i }, u) => Ie(Jt, {
      ref: u,
      iconNode: n,
      className: dt(`lucide-${Yt(t)}`, r),
      ...i
    })
  );
  return a.displayName = `${t}`, a;
};
const Zt = I("Archive", [
  ["rect", { width: "20", height: "5", x: "2", y: "3", rx: "1", key: "1wp1u1" }],
  ["path", { d: "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8", key: "1s80jp" }],
  ["path", { d: "M10 12h4", key: "a56b0p" }]
]);
const Qt = I("ArrowDown", [
  ["path", { d: "M12 5v14", key: "s699le" }],
  ["path", { d: "m19 12-7 7-7-7", key: "1idqje" }]
]);
const en = I("Ban", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m4.9 4.9 14.2 14.2", key: "1m5liu" }]
]);
const tn = I("BookText", [
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
const nn = I("Bot", [
  ["path", { d: "M12 8V4H8", key: "hb8ula" }],
  ["rect", { width: "16", height: "12", x: "4", y: "8", rx: "2", key: "enze0r" }],
  ["path", { d: "M2 14h2", key: "vft8re" }],
  ["path", { d: "M20 14h2", key: "4cs60a" }],
  ["path", { d: "M15 13v2", key: "1xurst" }],
  ["path", { d: "M9 13v2", key: "rq6x2g" }]
]);
const Me = I("Check", [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]]);
const an = I("ChevronDown", [
  ["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]
]);
const Ae = I("ChevronRight", [
  ["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]
]);
const rn = I("ChevronsRight", [
  ["path", { d: "m6 17 5-5-5-5", key: "xnjwq" }],
  ["path", { d: "m13 17 5-5-5-5", key: "17xmmf" }]
]);
const ze = I("CircleCheck", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
]);
const mt = I("CircleDashed", [
  ["path", { d: "M10.1 2.182a10 10 0 0 1 3.8 0", key: "5ilxe3" }],
  ["path", { d: "M13.9 21.818a10 10 0 0 1-3.8 0", key: "11zvb9" }],
  ["path", { d: "M17.609 3.721a10 10 0 0 1 2.69 2.7", key: "1iw5b2" }],
  ["path", { d: "M2.182 13.9a10 10 0 0 1 0-3.8", key: "c0bmvh" }],
  ["path", { d: "M20.279 17.609a10 10 0 0 1-2.7 2.69", key: "1ruxm7" }],
  ["path", { d: "M21.818 10.1a10 10 0 0 1 0 3.8", key: "qkgqxc" }],
  ["path", { d: "M3.721 6.391a10 10 0 0 1 2.7-2.69", key: "1mcia2" }],
  ["path", { d: "M6.391 20.279a10 10 0 0 1-2.69-2.7", key: "1fvljs" }]
]);
const sn = I("CircleHelp", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3", key: "1u773s" }],
  ["path", { d: "M12 17h.01", key: "p32p05" }]
]);
const ut = I("Clock", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["polyline", { points: "12 6 12 12 16 14", key: "68esgv" }]
]);
const Ue = I("Cloud", [
  ["path", { d: "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z", key: "p7xjir" }]
]);
const on = I("Copy", [
  ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2", key: "17jyea" }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2", key: "zix9uf" }]
]);
const cn = I("CornerDownRight", [
  ["polyline", { points: "15 10 20 15 15 20", key: "1q7qjw" }],
  ["path", { d: "M4 4v7a4 4 0 0 0 4 4h12", key: "z08zvw" }]
]);
const ln = I("Database", [
  ["ellipse", { cx: "12", cy: "5", rx: "9", ry: "3", key: "msslwz" }],
  ["path", { d: "M3 5V19A9 3 0 0 0 21 19V5", key: "1wlel7" }],
  ["path", { d: "M3 12A9 3 0 0 0 21 12", key: "mv7ke4" }]
]);
const dn = I("Download", [
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
  ["polyline", { points: "7 10 12 15 17 10", key: "2ggqvy" }],
  ["line", { x1: "12", x2: "12", y1: "15", y2: "3", key: "1vk2je" }]
]);
const mn = I("Earth", [
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
const un = I("Ellipsis", [
  ["circle", { cx: "12", cy: "12", r: "1", key: "41hilf" }],
  ["circle", { cx: "19", cy: "12", r: "1", key: "1wjl8i" }],
  ["circle", { cx: "5", cy: "12", r: "1", key: "1pcz8c" }]
]);
const pn = I("Eye", [
  [
    "path",
    {
      d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
      key: "1nclc0"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }]
]);
const hn = I("FileCode2", [
  ["path", { d: "M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4", key: "1pf5j1" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "m5 12-3 3 3 3", key: "oke12k" }],
  ["path", { d: "m9 18 3-3-3-3", key: "112psh" }]
]);
const fn = I("FileSpreadsheet", [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "M8 13h2", key: "yr2amv" }],
  ["path", { d: "M14 13h2", key: "un5t4a" }],
  ["path", { d: "M8 17h2", key: "2yhykz" }],
  ["path", { d: "M14 17h2", key: "10kma7" }]
]);
const be = I("FileText", [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "M10 9H8", key: "b1mrlr" }],
  ["path", { d: "M16 13H8", key: "t4e002" }],
  ["path", { d: "M16 17H8", key: "z1uh3a" }]
]);
const pt = I("File", [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }]
]);
const gn = I("Globe", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20", key: "13o1zl" }],
  ["path", { d: "M2 12h20", key: "9i4pu4" }]
]);
const Ge = I("Hand", [
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
const yn = I("Hourglass", [
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
const vn = I("Image", [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2", key: "1m3agn" }],
  ["circle", { cx: "9", cy: "9", r: "2", key: "af1f0g" }],
  ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21", key: "1xmnt7" }]
]);
const Ke = I("KeyRound", [
  [
    "path",
    {
      d: "M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z",
      key: "1s6t7t"
    }
  ],
  ["circle", { cx: "16.5", cy: "7.5", r: ".5", fill: "currentColor", key: "w0ekpg" }]
]);
const Te = I("LoaderCircle", [
  ["path", { d: "M21 12a9 9 0 1 1-6.219-8.56", key: "13zald" }]
]);
const En = I("Lock", [
  ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2", key: "1w4ew1" }],
  ["path", { d: "M7 11V7a5 5 0 0 1 10 0v4", key: "fwvmzm" }]
]);
const wn = I("Mail", [
  ["rect", { width: "20", height: "16", x: "2", y: "4", rx: "2", key: "18n3k1" }],
  ["path", { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7", key: "1ocrg3" }]
]);
const bn = I("Maximize2", [
  ["polyline", { points: "15 3 21 3 21 9", key: "mznyad" }],
  ["polyline", { points: "9 21 3 21 3 15", key: "1avn1i" }],
  ["line", { x1: "21", x2: "14", y1: "3", y2: "10", key: "ota7mn" }],
  ["line", { x1: "3", x2: "10", y1: "21", y2: "14", key: "1atl0r" }]
]);
const kn = I("MessageSquare", [
  ["path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", key: "1lielz" }]
]);
const Nn = I("Minimize2", [
  ["polyline", { points: "4 14 10 14 10 20", key: "11kfnr" }],
  ["polyline", { points: "20 10 14 10 14 4", key: "rlmsce" }],
  ["line", { x1: "14", x2: "21", y1: "10", y2: "3", key: "o5lafz" }],
  ["line", { x1: "3", x2: "10", y1: "21", y2: "14", key: "1atl0r" }]
]);
const ht = I("Monitor", [
  ["rect", { width: "20", height: "14", x: "2", y: "3", rx: "2", key: "48i651" }],
  ["line", { x1: "8", x2: "16", y1: "21", y2: "21", key: "1svkeh" }],
  ["line", { x1: "12", x2: "12", y1: "17", y2: "21", key: "vw1qmm" }]
]);
const Sn = I("Pencil", [
  [
    "path",
    {
      d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
      key: "1a8usu"
    }
  ],
  ["path", { d: "m15 5 4 4", key: "1mk7zo" }]
]);
const Oe = I("Plus", [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "M12 5v14", key: "s699le" }]
]);
const Cn = I("Presentation", [
  ["path", { d: "M2 3h20", key: "91anmk" }],
  ["path", { d: "M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3", key: "2k9sn8" }],
  ["path", { d: "m7 21 5-5 5 5", key: "bip4we" }]
]);
const Mn = I("RefreshCw", [
  ["path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8", key: "v9h5vc" }],
  ["path", { d: "M21 3v5h-5", key: "1q7to0" }],
  ["path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16", key: "3uifl3" }],
  ["path", { d: "M8 16H3v5", key: "1cv678" }]
]);
const Tn = I("RotateCcw", [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }]
]);
const Ve = I("Search", [
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
  ["path", { d: "m21 21-4.3-4.3", key: "1qie3q" }]
]);
const Ye = I("Settings2", [
  ["path", { d: "M20 7h-9", key: "3s1dr2" }],
  ["path", { d: "M14 17H5", key: "gfn3mx" }],
  ["circle", { cx: "17", cy: "17", r: "3", key: "18b49y" }],
  ["circle", { cx: "7", cy: "7", r: "3", key: "dfmy0x" }]
]);
const qe = I("ShieldAlert", [
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
const _n = I("ShieldCheck", [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      key: "oel41y"
    }
  ],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
]);
const xn = I("ShieldX", [
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
const In = I("Terminal", [
  ["polyline", { points: "4 17 10 11 4 5", key: "akl6gq" }],
  ["line", { x1: "12", x2: "20", y1: "19", y2: "19", key: "q2wloq" }]
]);
const Fe = I("Trash2", [
  ["path", { d: "M3 6h18", key: "d0wm0j" }],
  ["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", key: "4alrt4" }],
  ["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2", key: "v07s0e" }],
  ["line", { x1: "10", x2: "10", y1: "11", y2: "17", key: "1uufr5" }],
  ["line", { x1: "14", x2: "14", y1: "11", y2: "17", key: "xtxkd" }]
]);
const Re = I("TriangleAlert", [
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
const An = I("User", [
  ["path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", key: "975kel" }],
  ["circle", { cx: "12", cy: "7", r: "4", key: "17ys0d" }]
]);
const ft = I("Users", [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }],
  ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }],
  ["path", { d: "M16 3.13a4 4 0 0 1 0 7.75", key: "1da9ce" }]
]);
const On = I("X", [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
]);
function Rn(t) {
  let n = 0;
  for (let a = 0; a < t.length; a += 1) n = (n * 31 + t.charCodeAt(a)) % 360;
  return n;
}
function gt({ agent: t, size: n = 36 }) {
  const a = Rn(t.id || t.name);
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
const Dn = Pe(async () => ({ default: (await import("./chunk-mermaid-HWGCJPDP-CrXQpX1p.js").then((t) => t.i)).Streamdown })), Xe = {
  working: "Working",
  idle: "Idle",
  waiting_for_approval: "Needs you",
  offline: "No profile"
};
function Pn({
  agents: t,
  sections: n,
  rooms: a,
  selectedAgentId: r,
  selectedThreadId: i,
  search: u,
  onSearch: l,
  onSelectAgent: C,
  onSelectThread: m,
  onAction: s,
  onCreate: b,
  onToggleSection: c,
  view: o = "chat",
  onChangeView: h
}) {
  const [y, d] = S();
  U(() => {
    if (!y) return;
    const k = () => d(void 0);
    return window.addEventListener("pointerdown", k), () => window.removeEventListener("pointerdown", k);
  }, [y]);
  const $ = (k, F) => {
    d(void 0), s(k, F);
  }, P = u.trim().toLowerCase(), _ = (k) => !P || `${k.name} ${k.role}`.toLowerCase().includes(P), L = fe(() => new Map(t.map((k) => [k.id, k])), [t]), V = n.map((k) => ({
    section: k,
    members: k.bot_ids.map((F) => L.get(F)).filter((F) => !!F && _(F))
  })).filter((k) => k.members.length > 0), B = !P && V.length > 1, X = (k) => /* @__PURE__ */ e.createElement(
    "div",
    {
      key: k.id,
      className: `agent-row ${r === k.id && !i.startsWith("group:") ? "selected" : ""} ${k.status === "working" ? "is-working" : ""}`
    },
    /* @__PURE__ */ e.createElement("button", { className: "agent-select", onClick: () => C(k.id) }, /* @__PURE__ */ e.createElement(gt, { agent: k }), /* @__PURE__ */ e.createElement("span", { className: "agent-copy" }, /* @__PURE__ */ e.createElement("strong", null, /* @__PURE__ */ e.createElement("span", null, k.name), /* @__PURE__ */ e.createElement("span", { className: `agent-status ${k.status}`, title: Xe[k.status], "aria-label": Xe[k.status] })), k.workingOn ? /* @__PURE__ */ e.createElement("span", { className: "agent-preview agent-working-on" }, k.workingOn) : k.lastMessagePreview && /* @__PURE__ */ e.createElement("span", { className: "agent-preview agent-preview-entering" }, /* @__PURE__ */ e.createElement(De, { fallback: k.lastMessagePreview }, /* @__PURE__ */ e.createElement(Dn, { className: "agent-preview-markdown", mode: "static", controls: !1, linkSafety: { enabled: !0 }, skipHtml: !0 }, k.lastMessagePreview))))),
    /* @__PURE__ */ e.createElement(
      "button",
      {
        className: "agent-more",
        "aria-label": `More actions for ${k.name}`,
        onPointerDown: (F) => F.stopPropagation(),
        onClick: () => d((F) => F === k.id ? void 0 : k.id)
      },
      /* @__PURE__ */ e.createElement(un, { size: 15 })
    ),
    y === k.id && /* @__PURE__ */ e.createElement("div", { className: "agent-menu", role: "menu", onPointerDown: (F) => F.stopPropagation() }, /* @__PURE__ */ e.createElement("button", { role: "menuitem", onClick: () => $(k, "edit") }, /* @__PURE__ */ e.createElement(Sn, { size: 13 }), " Edit"), /* @__PURE__ */ e.createElement("button", { role: "menuitem", onClick: () => $(k, "duplicate") }, /* @__PURE__ */ e.createElement(on, { size: 13 }), " Duplicate"), /* @__PURE__ */ e.createElement("div", null), /* @__PURE__ */ e.createElement("button", { role: "menuitem", className: "danger-text", onClick: () => $(k, "delete") }, /* @__PURE__ */ e.createElement(Fe, { size: 13 }), " Remove from crew"))
  );
  return /* @__PURE__ */ e.createElement("aside", { className: "agent-sidebar" }, /* @__PURE__ */ e.createElement("div", { className: "sidebar-titlebar" }, /* @__PURE__ */ e.createElement("span", { className: "sidebar-title" }, "Crew"), /* @__PURE__ */ e.createElement("button", { className: "brand-add", "aria-label": "Hire a teammate", onClick: b }, /* @__PURE__ */ e.createElement(Oe, { size: 18 }))), h && /* @__PURE__ */ e.createElement("div", { className: "sidebar-views", role: "tablist", "aria-label": "Workspace view" }, /* @__PURE__ */ e.createElement(
    "button",
    {
      role: "tab",
      "aria-selected": o === "chat",
      className: o === "chat" ? "is-current" : "",
      onClick: () => h("chat")
    },
    /* @__PURE__ */ e.createElement(kn, { size: 13 }),
    " Threads"
  ), /* @__PURE__ */ e.createElement(
    "button",
    {
      role: "tab",
      "aria-selected": o === "spaces",
      className: o === "spaces" ? "is-current" : "",
      onClick: () => h("spaces")
    },
    /* @__PURE__ */ e.createElement(tn, { size: 13 }),
    " Documents"
  )), /* @__PURE__ */ e.createElement("label", { className: "search" }, /* @__PURE__ */ e.createElement(Ve, { size: 15 }), /* @__PURE__ */ e.createElement("input", { "aria-label": "Search the crew", placeholder: "Search your crew", value: u, onChange: (k) => l(k.target.value) })), /* @__PURE__ */ e.createElement("div", { className: "agent-list" }, t.length === 0 && /* @__PURE__ */ e.createElement("div", { className: "agent-list-empty" }, "No teammates yet"), t.length > 0 && V.length === 0 && /* @__PURE__ */ e.createElement("div", { className: "agent-list-empty" }, "No teammates found"), B ? V.map(({ section: k, members: F }) => /* @__PURE__ */ e.createElement("section", { className: "agent-section", key: k.id }, /* @__PURE__ */ e.createElement(
    "button",
    {
      className: `agent-section-header ${k.collapsed ? "is-collapsed" : ""}`,
      "aria-expanded": !k.collapsed,
      onClick: () => c(k.id, !k.collapsed)
    },
    /* @__PURE__ */ e.createElement(Ae, { size: 13, className: "agent-section-chevron" }),
    /* @__PURE__ */ e.createElement("span", null, k.name),
    /* @__PURE__ */ e.createElement("small", null, F.length)
  ), !k.collapsed && F.map(X))) : V.flatMap((k) => k.members).map(X), a.length > 0 && /* @__PURE__ */ e.createElement("section", { className: "agent-section", key: "__rooms__" }, /* @__PURE__ */ e.createElement("div", { className: "agent-section-header is-static" }, /* @__PURE__ */ e.createElement("span", null, "Rooms"), /* @__PURE__ */ e.createElement("small", null, a.length)), a.map((k) => /* @__PURE__ */ e.createElement("div", { key: k.id, className: `agent-row ${i === k.id ? "selected" : ""}` }, /* @__PURE__ */ e.createElement("button", { className: "agent-select", onClick: () => m(k.id) }, /* @__PURE__ */ e.createElement("span", { className: "agent-avatar", role: "img", "aria-label": `${k.title} room` }, k.emoji || "👥"), /* @__PURE__ */ e.createElement("span", { className: "agent-copy" }, /* @__PURE__ */ e.createElement("strong", null, /* @__PURE__ */ e.createElement("span", null, k.title)), /* @__PURE__ */ e.createElement("span", { className: "agent-preview" }, k.lastMessagePreview || k.subtitle))))))));
}
function $n({
  open: t,
  agents: n,
  rooms: a,
  onClose: r,
  onSelectAgent: i,
  onSelectThread: u,
  onCreateAgent: l,
  onComputer: C
}) {
  const [m, s] = S(""), b = K(null);
  U(() => {
    t && (s(""), window.setTimeout(() => b.current?.focus(), 0));
  }, [t]);
  const o = fe(() => [
    { id: "create", label: "Hire a teammate", detail: "Add someone to the crew", icon: Oe, run: l },
    { id: "computer", label: "Open their computer", detail: "The current teammate's screen", icon: ht, run: C },
    ...n.map((y) => ({
      id: `agent-${y.id}`,
      label: y.name,
      detail: `${y.role} · ${y.status.replaceAll("_", " ")}`,
      icon: nn,
      run: () => i(y.id)
    })),
    ...a.map((y) => ({
      id: `room-${y.id}`,
      label: y.title,
      detail: y.subtitle || "Room",
      icon: ft,
      run: () => u(y.id)
    }))
  ], [n, a, C, l, i, u]).filter((y) => `${y.label} ${y.detail}`.toLowerCase().includes(m.toLowerCase()));
  if (!t) return null;
  const h = (y) => {
    y.run(), r();
  };
  return /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "palette-backdrop",
      role: "presentation",
      onMouseDown: (y) => {
        y.target === y.currentTarget && r();
      }
    },
    /* @__PURE__ */ e.createElement("section", { className: "command-palette", role: "dialog", "aria-modal": "true", "aria-label": "Command palette" }, /* @__PURE__ */ e.createElement("label", null, /* @__PURE__ */ e.createElement(Ve, { size: 17 }), /* @__PURE__ */ e.createElement(
      "input",
      {
        ref: b,
        "aria-label": "Search the crew and commands",
        placeholder: "Search your crew…",
        value: m,
        onChange: (y) => s(y.target.value),
        onKeyDown: (y) => {
          y.key === "Escape" && r(), y.key === "Enter" && o[0] && h(o[0]);
        }
      }
    ), /* @__PURE__ */ e.createElement("kbd", null, "esc")), /* @__PURE__ */ e.createElement("div", { className: "palette-results" }, o.length ? o.map((y, d) => {
      const $ = y.icon;
      return /* @__PURE__ */ e.createElement("button", { key: y.id, className: d === 0 ? "active" : "", onClick: () => h(y) }, /* @__PURE__ */ e.createElement("span", null, /* @__PURE__ */ e.createElement($, { size: 16 })), /* @__PURE__ */ e.createElement("div", null, /* @__PURE__ */ e.createElement("strong", null, y.label), /* @__PURE__ */ e.createElement("small", null, y.detail)), d === 0 && /* @__PURE__ */ e.createElement("kbd", null, "↵"));
    }) : /* @__PURE__ */ e.createElement("p", null, "Nothing matches that")), /* @__PURE__ */ e.createElement("footer", null, /* @__PURE__ */ e.createElement("span", null, "Crew"), /* @__PURE__ */ e.createElement("span", null, /* @__PURE__ */ e.createElement("kbd", null, "⌘"), /* @__PURE__ */ e.createElement("kbd", null, "K"), " to open")))
  );
}
const Ln = /(?<![\w.-])@([\w一-鿿][\w一-鿿-]{0,63})/g;
function Se(t) {
  return t.replace(/[\s_-]+/g, "").trim().toLowerCase();
}
function zn(t, n, a) {
  if (!n?.length || !t) return [{ text: t }];
  const r = /* @__PURE__ */ new Map();
  for (const l of n) r.has(Se(l)) || r.set(Se(l), l);
  for (const l of a)
    n.includes(l.id) && (r.has(Se(l.name)) || r.set(Se(l.name), l.id));
  const i = [];
  let u = 0;
  for (const l of t.matchAll(Ln)) {
    const C = r.get(Se(l[1]));
    !C || l.index === void 0 || (l.index > u && i.push({ text: t.slice(u, l.index) }), i.push({ text: l[0], agentId: C }), u = l.index + l[0].length);
  }
  return u < t.length && i.push({ text: t.slice(u) }), i.length ? i : [{ text: t }];
}
function ve({ label: t, kind: n = "", children: a }) {
  return /* @__PURE__ */ e.createElement("div", { className: `crew-chip ${n}` }, t && /* @__PURE__ */ e.createElement("div", { className: "crew-chip-label" }, t), a);
}
function Un({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ve, { kind: "report" }, (t.lines ?? []).map((n, a) => /* @__PURE__ */ e.createElement("div", { className: "crew-report-line", key: a }, /* @__PURE__ */ e.createElement("span", { className: "crew-report-check" }, /* @__PURE__ */ e.createElement(Me, { size: 13 })), /* @__PURE__ */ e.createElement("span", { className: "crew-report-system" }, n.system), /* @__PURE__ */ e.createElement("span", { className: "crew-report-arrow" }, "→"), /* @__PURE__ */ e.createElement("span", null, n.result, n.count && /* @__PURE__ */ e.createElement("span", { className: "crew-report-count" }, " · ", n.count)))), t.closing && /* @__PURE__ */ e.createElement("div", { className: "crew-report-closing" }, t.closing));
}
function qn({ payload: t, onDecide: n }) {
  const a = t.status === "approved" || t.status === "discarded";
  return /* @__PURE__ */ e.createElement("div", { className: `crew-chip approval ${a ? "resolved" : ""}` }, /* @__PURE__ */ e.createElement("div", { className: "crew-chip-label" }, /* @__PURE__ */ e.createElement(qe, { size: 13 }), " ", a ? "Decided" : "Needs you"), /* @__PURE__ */ e.createElement("div", { className: "crew-approval-action" }, t.action), t.detail && /* @__PURE__ */ e.createElement("div", { className: "crew-approval-detail" }, t.detail), a ? /* @__PURE__ */ e.createElement("div", { className: "crew-approval-outcome" }, t.status === "approved" ? "Approved" : "Discarded") : /* @__PURE__ */ e.createElement("div", { className: "crew-approval-buttons" }, /* @__PURE__ */ e.createElement("button", { className: "crew-btn danger", onClick: () => n(String(t.approval_id), "deny") }, "Discard"), /* @__PURE__ */ e.createElement("button", { className: "crew-btn primary", onClick: () => n(String(t.approval_id), "allow") }, "Approve")));
}
function Hn({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ve, { label: "You decided" }, /* @__PURE__ */ e.createElement("div", { className: "crew-approval-action" }, t.action), /* @__PURE__ */ e.createElement("div", { className: "crew-approval-outcome" }, t.status === "approved" ? "Approved" : "Discarded"));
}
function jn({ payload: t }) {
  return t.proposal ? /* @__PURE__ */ e.createElement(ve, { label: t.kind === "conflicting" ? "Rules disagree" : "Rule may be stale" }, /* @__PURE__ */ e.createElement("div", { className: "crew-memory-note" }, t.note), /* @__PURE__ */ e.createElement("ul", { className: "crew-memory-entries" }, (t.entries || []).map((n, a) => /* @__PURE__ */ e.createElement("li", { key: a }, n))), t.why && /* @__PURE__ */ e.createElement("div", { className: "crew-memory-why" }, t.why)) : t.tidied ? /* @__PURE__ */ e.createElement(ve, { label: "Memory tidied" }, /* @__PURE__ */ e.createElement("div", { className: "crew-memory-note" }, t.note)) : /* @__PURE__ */ e.createElement(ve, { label: "Memory updated" }, /* @__PURE__ */ e.createElement("div", { className: "crew-memory-rule" }, t.rule), t.diff && /* @__PURE__ */ e.createElement("pre", { className: "crew-memory-diff" }, t.diff));
}
function Vn({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ve, { label: "Routine created" }, /* @__PURE__ */ e.createElement("div", { className: "crew-routine-name" }, /* @__PURE__ */ e.createElement(ut, { size: 13 }), " ", t.name), /* @__PURE__ */ e.createElement("div", { className: "crew-routine-when" }, t.human || t.cron));
}
function Fn({ payload: t }) {
  return /* @__PURE__ */ e.createElement(ve, { label: `Handed over by @${t.from_name || t.from || "a teammate"}` }, /* @__PURE__ */ e.createElement("div", { className: "crew-botref-body" }, /* @__PURE__ */ e.createElement(cn, { size: 13 }), " ", t.content));
}
function Bn({ payload: t, onOpenScreen: n, onSubmitSecret: a }) {
  const [r, i] = S(""), [u, l] = S(""), C = t.filled ? "sent" : u;
  if (t.field && t.ref) {
    const m = t.ref, s = async () => {
      if (r) {
        l("sending");
        try {
          await a(m, r), i(""), l("sent");
        } catch {
          i(""), l("failed");
        }
      }
    };
    return /* @__PURE__ */ e.createElement(ve, { label: "Needs one thing from you" }, /* @__PURE__ */ e.createElement("div", { className: "crew-login-site" }, /* @__PURE__ */ e.createElement(Ke, { size: 13 }), " The ", t.field, " for ", t.site || "a site"), t.why && /* @__PURE__ */ e.createElement("div", { className: "crew-login-why" }, t.why), C === "sent" ? /* @__PURE__ */ e.createElement("div", { className: "crew-login-why" }, "Typed into the page. ", t.site, " should move on now.") : /* @__PURE__ */ e.createElement("form", { className: "crew-secret-row", onSubmit: (b) => {
      b.preventDefault(), s();
    } }, /* @__PURE__ */ e.createElement(
      "input",
      {
        type: "password",
        autoComplete: "off",
        placeholder: t.field,
        value: r,
        onChange: (b) => i(b.target.value)
      }
    ), /* @__PURE__ */ e.createElement("button", { className: "crew-btn", type: "submit", disabled: !r || C === "sending" }, C === "sending" ? "Typing…" : "Type it in")), C === "failed" && /* @__PURE__ */ e.createElement("div", { className: "crew-login-why" }, "That did not reach the screen — nothing was typed. Try taking the wheel instead."));
  }
  return /* @__PURE__ */ e.createElement(ve, { label: "Needs you at the keyboard" }, /* @__PURE__ */ e.createElement("div", { className: "crew-login-site" }, /* @__PURE__ */ e.createElement(Ke, { size: 13 }), " Sign in to ", t.site || "a site"), t.why && /* @__PURE__ */ e.createElement("div", { className: "crew-login-why" }, t.why), /* @__PURE__ */ e.createElement("button", { className: "crew-btn", onClick: n }, "Take the wheel"));
}
function Wn({ payload: t, screenshotUrl: n }) {
  const a = t.url ?? (t.bot_id && t.file ? n(t.bot_id, t.file) : void 0);
  return a ? /* @__PURE__ */ e.createElement("figure", { className: "crew-shot" }, /* @__PURE__ */ e.createElement("img", { src: a, alt: t.caption || "the teammate's screen", loading: "lazy" }), t.caption && /* @__PURE__ */ e.createElement("figcaption", null, t.caption)) : null;
}
function Gn({ kind: t, payload: n, handlers: a }) {
  const r = n ?? {};
  switch (t) {
    case "report":
      return /* @__PURE__ */ e.createElement(Un, { payload: r });
    case "approval_request":
      return /* @__PURE__ */ e.createElement(qn, { payload: r, onDecide: a.onDecide });
    case "approval_resolved":
      return /* @__PURE__ */ e.createElement(Hn, { payload: r });
    case "memory_updated":
      return /* @__PURE__ */ e.createElement(jn, { payload: r });
    case "routine_created":
      return /* @__PURE__ */ e.createElement(Vn, { payload: r });
    case "bot_ref":
      return /* @__PURE__ */ e.createElement(Fn, { payload: r });
    case "login_request":
      return /* @__PURE__ */ e.createElement(Bn, { payload: r, onOpenScreen: a.onOpenScreen, onSubmitSecret: a.onSubmitSecret });
    case "screenshot":
      return /* @__PURE__ */ e.createElement(Wn, { payload: r, screenshotUrl: a.screenshotUrl });
    default:
      return null;
  }
}
const Kn = Pe(async () => ({ default: (await import("./chunk-mermaid-HWGCJPDP-CrXQpX1p.js").then((t) => t.i)).Streamdown })), Yn = {
  browser: mn,
  terminal: In,
  file: be,
  handoff: Ue,
  status: Ue
};
function Xn(t) {
  return t.parts.filter((n) => n.type === "text").map((n) => n.text).join("");
}
const Jn = (t) => {
  const n = Math.max(0, Math.floor(t / 1e3)), a = Math.floor(n / 60);
  return a ? `${a}m ${n % 60}s` : `${n}s`;
};
function Zn() {
  return /* @__PURE__ */ e.createElement("svg", { "aria-hidden": "true", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ e.createElement("path", { d: "m5 12 7-7 7 7" }), /* @__PURE__ */ e.createElement("path", { d: "M12 19V5" }));
}
function Qn() {
  return /* @__PURE__ */ e.createElement("svg", { className: "stop-icon", "aria-hidden": "true", viewBox: "0 0 24 24" }, /* @__PURE__ */ e.createElement("rect", { x: "7.5", y: "7.5", width: "9", height: "9", rx: "1.5", fill: "currentColor" }));
}
function ea(t) {
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
function ta({ agent: t, label: n, activities: a, startedAt: r }) {
  const [i, u] = S(0), [l, C] = S(!1);
  return U(() => {
    u(Date.now());
    const m = window.setInterval(() => u(Date.now()), 1e3);
    return () => window.clearInterval(m);
  }, []), /* @__PURE__ */ e.createElement("details", { className: "agent-working-details", open: l }, /* @__PURE__ */ e.createElement(
    "summary",
    {
      role: "status",
      "aria-label": `${t?.name ?? "This teammate"} is working: ${n}`,
      onClick: (m) => {
        m.preventDefault(), C((s) => !s);
      }
    },
    /* @__PURE__ */ e.createElement("span", { className: "agent-working-progress" }, "Working for ", Jn(i - Date.parse(r))),
    /* @__PURE__ */ e.createElement(Ae, { className: "agent-working-chevron", size: 15 })
  ), a.length > 0 && /* @__PURE__ */ e.createElement("div", { className: "agent-working-tools" }, a.map((m) => {
    const s = Yn[m.kind] ?? Ue;
    return /* @__PURE__ */ e.createElement("details", { className: `agent-tool-detail ${m.status}`, key: m.id }, /* @__PURE__ */ e.createElement("summary", null, /* @__PURE__ */ e.createElement(s, { size: 14 }), /* @__PURE__ */ e.createElement("span", null, m.title), /* @__PURE__ */ e.createElement(Ae, { size: 13 })), /* @__PURE__ */ e.createElement("div", null, m.output ?? (m.status === "running" ? "Waiting for result…" : "No output")));
  })));
}
function na({
  message: t,
  agent: n,
  senderName: a,
  activities: r,
  chips: i,
  entering: u = !1,
  room: l = []
}) {
  const C = Xn(t), m = K(null), s = K(!!t.streaming), b = r.filter((d) => d.conversationId === t.conversationId), c = [...b].reverse().find((d) => d.status === "running") ?? b.at(-1), o = t.role === "agent" && !!t.streaming, h = C.trim() || c?.title || "Working", y = t.parts.filter((d) => d.type === "chip");
  return je(() => {
    const d = m.current, $ = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (d && t.role === "agent" && s.current && !t.streaming && !$) {
      const P = d.querySelector(".message-body");
      P && typeof P.animate == "function" && P.animate(
        [{ opacity: 0, transform: "translate3d(-6px,4px,0)" }, { opacity: 1, transform: "translate3d(0,0,0)" }],
        { duration: 260, easing: "cubic-bezier(.2,.82,.3,1)" }
      );
    }
    s.current = !!t.streaming;
  }, [u, t.role, t.streaming]), /* @__PURE__ */ e.createElement("div", { className: `message ${t.role} ${u ? "message-entering" : ""}`, ref: m }, t.interrupted && /* @__PURE__ */ e.createElement("div", { className: "agent-interrupted" }, "Interrupted"), a && t.role === "agent" && /* @__PURE__ */ e.createElement("div", { className: "message-sender" }, a), !o && (C || t.streaming && !y.length) && /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "message-body",
      onClick: t.role === "agent" ? ea : void 0
    },
    t.role === "agent" ? /* @__PURE__ */ e.createElement(De, { fallback: /* @__PURE__ */ e.createElement("span", { className: "agent-markdown-fallback" }, C) }, /* @__PURE__ */ e.createElement(
      Kn,
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
      C
    )) : zn(C, t.mentions, l).map((d, $) => d.agentId ? /* @__PURE__ */ e.createElement("mark", { key: $, className: "mention", title: `Asked ${l.find((P) => P.id === d.agentId)?.name ?? d.agentId} directly` }, d.text) : /* @__PURE__ */ e.createElement("span", { key: $ }, d.text))
  ), o && /* @__PURE__ */ e.createElement(
    ta,
    {
      agent: n,
      label: h,
      activities: b,
      startedAt: t.createdAt
    }
  ), y.map((d, $) => /* @__PURE__ */ e.createElement(
    Gn,
    {
      key: `${t.id}:${$}`,
      kind: d.kind,
      payload: d.payload,
      handlers: i
    }
  )));
}
function aa({
  agent: t,
  thread: n,
  agentsById: a,
  messages: r,
  activities: i,
  chips: u,
  loading: l = !1,
  focusRequest: C = 0,
  draft: m,
  onSend: s,
  onToggleDetails: b
}) {
  const [c, o] = S(""), [h, y] = S(!1), [d, $] = S(!1), [P, _] = S(!1), [L, V] = S(!1), B = K(null), X = K(null), k = K(null), F = K(!1), Q = K(!0), J = K(!1), ee = K(0), re = K(0), g = K(void 0), O = K(void 0), te = K(/* @__PURE__ */ new Set()), ge = K(n?.id ?? ""), pe = K(l), [j, se] = S(() => /* @__PURE__ */ new Set()), oe = n?.title || t?.name || "Crew", Y = n?.kind === "group", le = (n?.members ?? []).map((x) => a.get(x)).filter((x) => !!x), ie = n?.id ?? t?.id ?? "";
  je(() => {
    const x = ge.current !== ie || pe.current;
    if (ge.current = ie, pe.current = l, l || x) {
      te.current = new Set(r.map((N) => N.id)), se(/* @__PURE__ */ new Set());
      return;
    }
    const f = r.filter((N) => !te.current.has(N.id)).map((N) => N.id);
    for (const N of f) te.current.add(N);
    se(new Set(f));
  }, [ie, l, r]);
  function ce(x) {
    const f = B.current;
    !f || typeof f.scrollTo != "function" || (Q.current = !0, J.current = !0, _(!1), g.current && window.clearTimeout(g.current), ee.current = Math.max(
      ee.current,
      Date.now() + (x === "smooth" ? 650 : 150)
    ), f.scrollTo({ top: f.scrollHeight, behavior: x }), g.current = window.setTimeout(() => {
      g.current = void 0, J.current = !1;
    }, x === "smooth" ? 400 : 0));
  }
  U(() => {
    Q.current = !0, J.current = !1, re.current = 0, _(!1), requestAnimationFrame(() => ce("auto"));
  }, [ie]), U(() => {
    Q.current && ce("smooth");
  }, [r]), U(() => {
    const x = B.current, f = X.current;
    if (!x || !f || typeof ResizeObserver > "u") return;
    const N = new ResizeObserver(() => {
      Q.current && ce("auto");
    });
    return N.observe(f), () => N.disconnect();
  }, [ie, l]), U(() => () => {
    O.current && window.clearTimeout(O.current), g.current && window.clearTimeout(g.current);
  }, []), U(() => {
    C > 0 && k.current?.focus();
  }, [ie, C]), U(() => {
    if (!m?.nonce) return;
    o(m.text);
    const x = k.current;
    x?.focus(), x?.setSelectionRange(m.text.length, m.text.length);
  }, [m?.nonce]);
  function ye() {
    J.current || Date.now() < ee.current || (V(!0), O.current && window.clearTimeout(O.current), O.current = window.setTimeout(() => {
      O.current = void 0, V(!1);
    }, 700));
  }
  async function ae(x) {
    x.preventDefault();
    const f = c.trim();
    if (!(!f || F.current)) {
      F.current = !0, o(""), y(!0);
      try {
        await s(f);
      } finally {
        F.current = !1, y(!1);
      }
    }
  }
  return /* @__PURE__ */ e.createElement("main", { className: "conversation" }, /* @__PURE__ */ e.createElement("header", { className: `conversation-header ${d ? "scrolled" : ""}` }, /* @__PURE__ */ e.createElement("h1", null, n?.emoji && /* @__PURE__ */ e.createElement("span", { className: "conversation-emoji" }, n.emoji), oe), n?.subtitle && /* @__PURE__ */ e.createElement("p", { className: "conversation-subtitle" }, n.subtitle), /* @__PURE__ */ e.createElement("div", { className: "header-actions" }, !Y && /* @__PURE__ */ e.createElement("button", { className: "computer-trigger", "aria-label": "Open this teammate's computer", onClick: b }, /* @__PURE__ */ e.createElement(ht, { size: 18 })))), /* @__PURE__ */ e.createElement("div", { className: "conversation-scroll-shell" }, l ? /* @__PURE__ */ e.createElement("div", { className: "conversation-skeleton", role: "status", "aria-label": "Loading this thread" }, /* @__PURE__ */ e.createElement("div", { className: "skeleton-message skeleton-agent" }, /* @__PURE__ */ e.createElement("span", { className: "skeleton-line skeleton-line-wide" }), /* @__PURE__ */ e.createElement("span", { className: "skeleton-line" })), /* @__PURE__ */ e.createElement("div", { className: "skeleton-message skeleton-user" }, /* @__PURE__ */ e.createElement("span", { className: "skeleton-bubble" })), /* @__PURE__ */ e.createElement("div", { className: "skeleton-message skeleton-agent" }, /* @__PURE__ */ e.createElement("span", { className: "skeleton-line skeleton-line-short" }))) : /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement(
    "div",
    {
      className: `message-scroll ${L ? "scrollbar-visible" : ""}`,
      ref: B,
      onWheelCapture: (x) => {
        x.deltaY < 0 && (J.current = !1);
      },
      onScroll: (x) => {
        const f = x.currentTarget, N = f.scrollHeight - f.scrollTop - f.clientHeight, R = N <= 24, H = f.scrollTop < re.current - 1;
        re.current = f.scrollTop, $(f.scrollTop > 0), H && N > 72 ? (J.current = !1, Q.current = !1, _(!0)) : !J.current && R ? (Q.current = !0, _(!1)) : !J.current && N > 72 && (Q.current = !1, _(!0)), ye();
      },
      onPointerMove: (x) => {
        x.currentTarget.getBoundingClientRect().right - x.clientX <= 14 ? V(!0) : O.current || V(!1);
      },
      onPointerLeave: () => V(!1)
    },
    /* @__PURE__ */ e.createElement("div", { className: "message-content", ref: X }, r.length === 0 && t && /* @__PURE__ */ e.createElement("div", { className: "conversation-intro" }, /* @__PURE__ */ e.createElement(gt, { agent: t, size: 54 }), /* @__PURE__ */ e.createElement("h2", null, t.name), /* @__PURE__ */ e.createElement("p", null, t.role)), r.map((x) => /* @__PURE__ */ e.createElement(
      na,
      {
        key: x.id,
        message: x,
        agent: t,
        senderName: Y ? a.get(x.sender ?? "")?.name : void 0,
        room: le,
        activities: i,
        chips: u,
        entering: j.has(x.id) || x.id.startsWith("optimistic-user:")
      }
    )))
  ), P && /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "scroll-to-bottom",
      "aria-label": "Scroll to the latest message",
      onClick: () => ce("smooth")
    },
    /* @__PURE__ */ e.createElement(Qt, { size: 20 })
  ))), /* @__PURE__ */ e.createElement("form", { className: "composer", onSubmit: ae }, /* @__PURE__ */ e.createElement(
    "textarea",
    {
      ref: k,
      "aria-label": `Message ${oe}`,
      placeholder: Y ? "Ask the room…" : `Message ${oe}…`,
      value: c,
      onChange: (x) => o(x.target.value),
      onKeyDown: (x) => {
        x.key === "Enter" && !x.shiftKey && !x.nativeEvent.isComposing && x.keyCode !== 229 && (x.preventDefault(), x.currentTarget.form?.requestSubmit());
      }
    }
  ), /* @__PURE__ */ e.createElement("div", { className: "composer-bottom" }, /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "submit-button",
      "data-state": h ? "stopping" : "send",
      "aria-label": h ? "Sending" : "Send message",
      disabled: !c.trim() || h
    },
    h ? /* @__PURE__ */ e.createElement(Qn, null) : /* @__PURE__ */ e.createElement(Zn, null)
  ))));
}
const ra = [
  { id: "all", label: "Everything", types: [] },
  {
    id: "stopped",
    label: "Stopped",
    types: ["tool.refused", "tool.held", "approval.expired", "crew.bot_declined"]
  },
  { id: "failed", label: "Went wrong", types: ["tool.failed"] },
  { id: "decisions", label: "Your decisions", types: ["approval.decided", "grant.changed"] }
], sa = {
  "tool.allowed": ze,
  "tool.refused": xn,
  "tool.held": Ge,
  "tool.failed": Re,
  "approval.decided": ze,
  "approval.expired": ut,
  "grant.changed": Ye,
  "crew.policy_loaded": Ye,
  "crew.bot_declined": Ge
}, oa = {
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
function ia(t) {
  const n = new Date(t);
  return `${n.toLocaleDateString(void 0, { month: "short", day: "numeric" })} ${n.toLocaleTimeString(void 0, { hour: "2-digit", minute: "2-digit" })}`;
}
function ca({ events: t, loading: n, viewId: a, onChangeView: r, onLoadMore: i, hasMore: u }) {
  const [l, C] = S(() => /* @__PURE__ */ new Set()), m = fe(() => t.slice().sort((s, b) => b.id - s.id), [t]);
  return /* @__PURE__ */ e.createElement("section", { className: "audit-timeline" }, /* @__PURE__ */ e.createElement("div", { className: "audit-views", role: "tablist", "aria-label": "What to show" }, ra.map((s) => /* @__PURE__ */ e.createElement(
    "button",
    {
      key: s.id,
      role: "tab",
      type: "button",
      "aria-selected": a === s.id,
      className: `audit-view ${a === s.id ? "is-current" : ""}`,
      onClick: () => r(s.id, s.types)
    },
    s.label
  ))), m.length === 0 && !n && /* @__PURE__ */ e.createElement("p", { className: "audit-empty" }, "Nothing recorded yet."), /* @__PURE__ */ e.createElement("ol", { className: "audit-rows" }, m.map((s) => {
    const b = sa[s.event_type] ?? ze, c = l.has(s.id), o = s.event_type === "tool.refused" || s.event_type === "tool.held";
    return /* @__PURE__ */ e.createElement(
      "li",
      {
        key: s.id,
        className: `audit-row ${o ? "is-stopped" : ""} ${s.event_type === "tool.failed" ? "is-failed" : ""}`
      },
      /* @__PURE__ */ e.createElement(
        "button",
        {
          type: "button",
          className: "audit-head",
          "aria-expanded": c,
          onClick: () => C((h) => {
            const y = new Set(h);
            return y.delete(s.id) || y.add(s.id), y;
          })
        },
        /* @__PURE__ */ e.createElement(b, { size: 14 }),
        /* @__PURE__ */ e.createElement("span", { className: "audit-subject" }, s.subject || s.tool || s.event_type),
        /* @__PURE__ */ e.createElement("span", { className: "audit-kind" }, oa[s.event_type] ?? s.event_type),
        /* @__PURE__ */ e.createElement("time", { className: "audit-when", dateTime: new Date(s.created_at).toISOString() }, ia(s.created_at))
      ),
      c && /* @__PURE__ */ e.createElement("dl", { className: "audit-detail" }, s.tool && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Tool"), /* @__PURE__ */ e.createElement("dd", null, /* @__PURE__ */ e.createElement("code", null, s.tool))), s.detail && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Why"), /* @__PURE__ */ e.createElement("dd", null, s.detail)), s.actor !== "_system" && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Who"), /* @__PURE__ */ e.createElement("dd", null, s.actor === "_operator" ? "you" : s.actor)), s.duration_ms !== null && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Took"), /* @__PURE__ */ e.createElement("dd", null, s.duration_ms, " ms")), s.args_digest && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Arguments"), /* @__PURE__ */ e.createElement("dd", null, /* @__PURE__ */ e.createElement("code", null, s.args_digest))))
    );
  })), u && /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "secondary-button",
      disabled: n,
      onClick: i
    },
    n ? "Loading…" : "Show older"
  ));
}
const la = {
  slides: Cn,
  document: be,
  sheet: fn,
  image: vn,
  data: ln,
  text: be,
  code: hn,
  archive: Zt,
  file: pt
};
function da(t) {
  if (t === 0) return "0 bytes";
  const n = ["bytes", "KB", "MB", "GB"];
  let a = t, r = 0;
  for (; a >= 1024 && r < n.length - 1; )
    a /= 1024, r += 1;
  return `${r === 0 ? a : a.toFixed(a < 10 ? 1 : 0)} ${n[r]}`;
}
function ma(t) {
  const n = new Date(t);
  return Number.isNaN(n.getTime()) ? "" : (/* @__PURE__ */ new Date()).toDateString() === n.toDateString() ? n.toLocaleTimeString(void 0, { hour: "2-digit", minute: "2-digit" }) : n.toLocaleDateString(void 0, { month: "short", day: "numeric" });
}
function ua({ agentName: t, artifacts: n, urlFor: a }) {
  return n.length === 0 ? /* @__PURE__ */ e.createElement("p", { className: "files-empty" }, t, " has not produced any files yet.") : /* @__PURE__ */ e.createElement("ul", { className: "files-list" }, n.map((r) => {
    const i = la[r.kind] ?? pt, u = r.size === 0;
    return /* @__PURE__ */ e.createElement("li", { className: `files-row ${u ? "is-empty" : ""}`, key: r.id }, /* @__PURE__ */ e.createElement(
      "a",
      {
        href: a(r),
        download: r.name,
        className: "files-link"
      },
      /* @__PURE__ */ e.createElement(i, { size: 15 }),
      /* @__PURE__ */ e.createElement("span", { className: "files-name", title: r.path }, r.name),
      /* @__PURE__ */ e.createElement("span", { className: "files-meta" }, da(r.size), u && /* @__PURE__ */ e.createElement("span", { className: "files-warning", title: "Nothing was written to this file" }, "didn't finish")),
      /* @__PURE__ */ e.createElement("span", { className: "files-when" }, ma(r.updatedAt)),
      /* @__PURE__ */ e.createElement(dn, { size: 13, className: "files-download" })
    ));
  }));
}
const pa = {
  pending: mt,
  running: Te,
  succeeded: Me,
  failed: On,
  waiting: yn
}, ha = {
  web: gn,
  file: be,
  mail: wn,
  user: An
};
function fa({ step: t }) {
  const n = pa[t.status] ?? mt;
  return /* @__PURE__ */ e.createElement("li", { className: `plan-step is-${t.status}` }, /* @__PURE__ */ e.createElement(n, { size: 13, className: t.status === "running" ? "spin" : void 0 }), /* @__PURE__ */ e.createElement("span", { className: "plan-step-title" }, t.title), t.detail && /* @__PURE__ */ e.createElement("span", { className: "plan-step-detail" }, t.detail));
}
function ga({ item: t }) {
  const n = ha[t.kind] ?? be, a = t.url ? /* @__PURE__ */ e.createElement("a", { href: t.url, target: "_blank", rel: "noreferrer noopener" }, t.title) : /* @__PURE__ */ e.createElement("span", null, t.title);
  return /* @__PURE__ */ e.createElement("li", { className: "evidence-row" }, /* @__PURE__ */ e.createElement("div", { className: "evidence-head" }, /* @__PURE__ */ e.createElement(n, { size: 12 }), a), /* @__PURE__ */ e.createElement("p", { className: "evidence-excerpt" }, t.excerpt));
}
function ya({ agentName: t, tasks: n }) {
  return n.length === 0 ? /* @__PURE__ */ e.createElement("p", { className: "plan-empty" }, t, " has no scheduled or long-running work.") : /* @__PURE__ */ e.createElement("div", { className: "plan-list" }, n.map((a) => /* @__PURE__ */ e.createElement("section", { className: "plan-task", key: a.id }, /* @__PURE__ */ e.createElement("div", { className: "plan-task-head" }, /* @__PURE__ */ e.createElement("span", { className: "plan-task-title" }, a.title || a.kind), /* @__PURE__ */ e.createElement("span", { className: `plan-task-status is-${a.status}` }, a.status.replace("_", " "))), a.attempts > 1 && /* @__PURE__ */ e.createElement("p", { className: "plan-task-attempts" }, "picked up ", a.attempts, " times"), a.error && /* @__PURE__ */ e.createElement("p", { className: "plan-task-error" }, a.error), a.plan.length > 0 && /* @__PURE__ */ e.createElement("ol", { className: "plan-steps" }, a.plan.map((r) => /* @__PURE__ */ e.createElement(fa, { step: r, key: r.id }))), a.evidence.length > 0 && /* @__PURE__ */ e.createElement("details", { className: "evidence" }, /* @__PURE__ */ e.createElement("summary", null, "What it read (", a.evidence.length, ")"), /* @__PURE__ */ e.createElement("ul", { className: "evidence-list" }, a.evidence.map((r, i) => /* @__PURE__ */ e.createElement(ga, { item: r, key: `${r.title}-${i}` })))))));
}
const va = [
  { mode: "deny", label: "Never", icon: en },
  { mode: "ask", label: "Ask me", icon: sn },
  { mode: "allow", label: "Allow", icon: _n }
];
function Ea({ agentName: t, grants: n, busy: a, onSetGrant: r, onClearGrant: i }) {
  const [u, l] = S(""), [C, m] = S(!1), s = fe(() => {
    const c = u.trim().toLowerCase(), o = n.filter((y) => C && y.source !== "grant" ? !1 : c ? y.tool.toLowerCase().includes(c) || y.toolset.toLowerCase().includes(c) : !0), h = /* @__PURE__ */ new Map();
    for (const y of o) {
      const d = y.toolset || "other";
      h.set(d, [...h.get(d) ?? [], y]);
    }
    return [...h.entries()].sort(([y], [d]) => y.localeCompare(d));
  }, [n, u, C]), b = n.filter((c) => c.mode === "ask").length;
  return /* @__PURE__ */ e.createElement("section", { className: "permissions-panel" }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow" }, /* @__PURE__ */ e.createElement(En, { size: 14 }), " What ", t, " can do"), /* @__PURE__ */ e.createElement("p", { className: "permissions-summary" }, n.length, " tools · ", b, " need your say-so"), /* @__PURE__ */ e.createElement("div", { className: "permissions-filters" }, /* @__PURE__ */ e.createElement(
    "input",
    {
      type: "search",
      "aria-label": "Filter tools",
      placeholder: "Filter tools…",
      value: u,
      onChange: (c) => l(c.target.value)
    }
  ), /* @__PURE__ */ e.createElement("label", null, /* @__PURE__ */ e.createElement(
    "input",
    {
      type: "checkbox",
      checked: C,
      onChange: (c) => m(c.target.checked)
    }
  ), "Only what I changed")), s.length === 0 && /* @__PURE__ */ e.createElement("p", { className: "permissions-empty" }, "Nothing matches."), s.map(([c, o]) => /* @__PURE__ */ e.createElement("div", { className: "permissions-group", key: c }, /* @__PURE__ */ e.createElement("h4", null, c), o.map((h) => /* @__PURE__ */ e.createElement(
    "div",
    {
      className: `permissions-row ${h.protected ? "is-protected" : ""} ${h.available === !1 ? "is-unavailable" : ""}`,
      key: h.tool
    },
    /* @__PURE__ */ e.createElement("div", { className: "permissions-tool" }, /* @__PURE__ */ e.createElement("code", null, h.tool), /* @__PURE__ */ e.createElement("span", { className: "permissions-why" }, h.why)),
    /* @__PURE__ */ e.createElement("div", { className: "permissions-modes", role: "group", "aria-label": `What ${t} may do with ${h.tool}` }, va.map(({ mode: y, label: d, icon: $ }) => /* @__PURE__ */ e.createElement(
      "button",
      {
        key: y,
        type: "button",
        className: `permissions-mode ${h.mode === y ? "is-current" : ""}`,
        "aria-pressed": h.mode === y,
        disabled: a || h.protected,
        title: h.protected ? "This teammate always keeps this one" : d,
        onClick: () => {
          r(h.tool, y);
        }
      },
      /* @__PURE__ */ e.createElement($, { size: 13 }),
      " ",
      d
    )), h.source === "grant" && !h.protected && /* @__PURE__ */ e.createElement(
      "button",
      {
        type: "button",
        className: "permissions-reset",
        "aria-label": `Reset ${h.tool} to the default`,
        disabled: a,
        onClick: () => {
          i(h.tool);
        }
      },
      /* @__PURE__ */ e.createElement(Tn, { size: 13 })
    ))
  )))));
}
const wa = [
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
], ba = [
  "Every weekday at 9am, tell me what changed overnight that I should know about.",
  "Each Friday afternoon, write up what you got done this week."
];
function ka(t) {
  const n = (t || "").toLowerCase();
  for (const [a, r] of wa)
    if (a.test(n)) return r;
  return ba;
}
function Ka(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
function Na(t) {
  if (Object.prototype.hasOwnProperty.call(t, "__esModule")) return t;
  var n = t.default;
  if (typeof n == "function") {
    var a = function r() {
      var i = !1;
      try {
        i = this instanceof r;
      } catch {
      }
      return i ? Reflect.construct(n, arguments, this.constructor) : n.apply(this, arguments);
    };
    a.prototype = n.prototype;
  } else a = {};
  return Object.defineProperty(a, "__esModule", { value: !0 }), Object.keys(t).forEach(function(r) {
    var i = Object.getOwnPropertyDescriptor(t, r);
    Object.defineProperty(a, r, i.get ? i : {
      enumerable: !0,
      get: function() {
        return t[r];
      }
    });
  }), a;
}
var xe = { exports: {} }, de = {};
const yt = /* @__PURE__ */ Na(Wt);
var Je;
function Sa() {
  if (Je) return de;
  Je = 1;
  var t = yt;
  function n(m) {
    var s = "https://react.dev/errors/" + m;
    if (1 < arguments.length) {
      s += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var b = 2; b < arguments.length; b++)
        s += "&args[]=" + encodeURIComponent(arguments[b]);
    }
    return "Minified React error #" + m + "; visit " + s + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
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
  }, i = /* @__PURE__ */ Symbol.for("react.portal");
  function u(m, s, b) {
    var c = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: i,
      key: c == null ? null : "" + c,
      children: m,
      containerInfo: s,
      implementation: b
    };
  }
  var l = t.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function C(m, s) {
    if (m === "font") return "";
    if (typeof s == "string")
      return s === "use-credentials" ? s : "";
  }
  return de.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = r, de.createPortal = function(m, s) {
    var b = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!s || s.nodeType !== 1 && s.nodeType !== 9 && s.nodeType !== 11)
      throw Error(n(299));
    return u(m, s, null, b);
  }, de.flushSync = function(m) {
    var s = l.T, b = r.p;
    try {
      if (l.T = null, r.p = 2, m) return m();
    } finally {
      l.T = s, r.p = b, r.d.f();
    }
  }, de.preconnect = function(m, s) {
    typeof m == "string" && (s ? (s = s.crossOrigin, s = typeof s == "string" ? s === "use-credentials" ? s : "" : void 0) : s = null, r.d.C(m, s));
  }, de.prefetchDNS = function(m) {
    typeof m == "string" && r.d.D(m);
  }, de.preinit = function(m, s) {
    if (typeof m == "string" && s && typeof s.as == "string") {
      var b = s.as, c = C(b, s.crossOrigin), o = typeof s.integrity == "string" ? s.integrity : void 0, h = typeof s.fetchPriority == "string" ? s.fetchPriority : void 0;
      b === "style" ? r.d.S(
        m,
        typeof s.precedence == "string" ? s.precedence : void 0,
        {
          crossOrigin: c,
          integrity: o,
          fetchPriority: h
        }
      ) : b === "script" && r.d.X(m, {
        crossOrigin: c,
        integrity: o,
        fetchPriority: h,
        nonce: typeof s.nonce == "string" ? s.nonce : void 0
      });
    }
  }, de.preinitModule = function(m, s) {
    if (typeof m == "string")
      if (typeof s == "object" && s !== null) {
        if (s.as == null || s.as === "script") {
          var b = C(
            s.as,
            s.crossOrigin
          );
          r.d.M(m, {
            crossOrigin: b,
            integrity: typeof s.integrity == "string" ? s.integrity : void 0,
            nonce: typeof s.nonce == "string" ? s.nonce : void 0
          });
        }
      } else s == null && r.d.M(m);
  }, de.preload = function(m, s) {
    if (typeof m == "string" && typeof s == "object" && s !== null && typeof s.as == "string") {
      var b = s.as, c = C(b, s.crossOrigin);
      r.d.L(m, b, {
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
  }, de.preloadModule = function(m, s) {
    if (typeof m == "string")
      if (s) {
        var b = C(s.as, s.crossOrigin);
        r.d.m(m, {
          as: typeof s.as == "string" && s.as !== "script" ? s.as : void 0,
          crossOrigin: b,
          integrity: typeof s.integrity == "string" ? s.integrity : void 0
        });
      } else r.d.m(m);
  }, de.requestFormReset = function(m) {
    r.d.r(m);
  }, de.unstable_batchedUpdates = function(m, s) {
    return m(s);
  }, de.useFormState = function(m, s, b) {
    return l.H.useFormState(m, s, b);
  }, de.useFormStatus = function() {
    return l.H.useHostTransitionStatus();
  }, de.version = "19.2.7", de;
}
var me = {};
var Ze;
function Ca() {
  return Ze || (Ze = 1, process.env.NODE_ENV !== "production" && (function() {
    function t() {
    }
    function n(c) {
      return "" + c;
    }
    function a(c, o, h) {
      var y = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
      try {
        n(y);
        var d = !1;
      } catch {
        d = !0;
      }
      return d && (console.error(
        "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
        typeof Symbol == "function" && Symbol.toStringTag && y[Symbol.toStringTag] || y.constructor.name || "Object"
      ), n(y)), {
        $$typeof: s,
        key: y == null ? null : "" + y,
        children: c,
        containerInfo: o,
        implementation: h
      };
    }
    function r(c, o) {
      if (c === "font") return "";
      if (typeof o == "string")
        return o === "use-credentials" ? o : "";
    }
    function i(c) {
      return c === null ? "`null`" : c === void 0 ? "`undefined`" : c === "" ? "an empty string" : 'something with type "' + typeof c + '"';
    }
    function u(c) {
      return c === null ? "`null`" : c === void 0 ? "`undefined`" : c === "" ? "an empty string" : typeof c == "string" ? JSON.stringify(c) : typeof c == "number" ? "`" + c + "`" : 'something with type "' + typeof c + '"';
    }
    function l() {
      var c = b.H;
      return c === null && console.error(
        `Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:
1. You might have mismatching versions of React and the renderer (such as React DOM)
2. You might be breaking the Rules of Hooks
3. You might have more than one copy of React in the same app
See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.`
      ), c;
    }
    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart == "function" && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
    var C = yt, m = {
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
    }, s = /* @__PURE__ */ Symbol.for("react.portal"), b = C.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    typeof Map == "function" && Map.prototype != null && typeof Map.prototype.forEach == "function" && typeof Set == "function" && Set.prototype != null && typeof Set.prototype.clear == "function" && typeof Set.prototype.forEach == "function" || console.error(
      "React depends on Map and Set built-in types. Make sure that you load a polyfill in older browsers. https://reactjs.org/link/react-polyfills"
    ), me.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = m, me.createPortal = function(c, o) {
      var h = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
      if (!o || o.nodeType !== 1 && o.nodeType !== 9 && o.nodeType !== 11)
        throw Error("Target container is not a DOM element.");
      return a(c, o, null, h);
    }, me.flushSync = function(c) {
      var o = b.T, h = m.p;
      try {
        if (b.T = null, m.p = 2, c)
          return c();
      } finally {
        b.T = o, m.p = h, m.d.f() && console.error(
          "flushSync was called from inside a lifecycle method. React cannot flush when React is already rendering. Consider moving this call to a scheduler task or micro task."
        );
      }
    }, me.preconnect = function(c, o) {
      typeof c == "string" && c ? o != null && typeof o != "object" ? console.error(
        "ReactDOM.preconnect(): Expected the `options` argument (second) to be an object but encountered %s instead. The only supported option at this time is `crossOrigin` which accepts a string.",
        u(o)
      ) : o != null && typeof o.crossOrigin != "string" && console.error(
        "ReactDOM.preconnect(): Expected the `crossOrigin` option (second argument) to be a string but encountered %s instead. Try removing this option or passing a string value instead.",
        i(o.crossOrigin)
      ) : console.error(
        "ReactDOM.preconnect(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
        i(c)
      ), typeof c == "string" && (o ? (o = o.crossOrigin, o = typeof o == "string" ? o === "use-credentials" ? o : "" : void 0) : o = null, m.d.C(c, o));
    }, me.prefetchDNS = function(c) {
      if (typeof c != "string" || !c)
        console.error(
          "ReactDOM.prefetchDNS(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
          i(c)
        );
      else if (1 < arguments.length) {
        var o = arguments[1];
        typeof o == "object" && o.hasOwnProperty("crossOrigin") ? console.error(
          "ReactDOM.prefetchDNS(): Expected only one argument, `href`, but encountered %s as a second argument instead. This argument is reserved for future options and is currently disallowed. It looks like the you are attempting to set a crossOrigin property for this DNS lookup hint. Browsers do not perform DNS queries using CORS and setting this attribute on the resource hint has no effect. Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.",
          u(o)
        ) : console.error(
          "ReactDOM.prefetchDNS(): Expected only one argument, `href`, but encountered %s as a second argument instead. This argument is reserved for future options and is currently disallowed. Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.",
          u(o)
        );
      }
      typeof c == "string" && m.d.D(c);
    }, me.preinit = function(c, o) {
      if (typeof c == "string" && c ? o == null || typeof o != "object" ? console.error(
        "ReactDOM.preinit(): Expected the `options` argument (second) to be an object with an `as` property describing the type of resource to be preinitialized but encountered %s instead.",
        u(o)
      ) : o.as !== "style" && o.as !== "script" && console.error(
        'ReactDOM.preinit(): Expected the `as` property in the `options` argument (second) to contain a valid value describing the type of resource to be preinitialized but encountered %s instead. Valid values for `as` are "style" and "script".',
        u(o.as)
      ) : console.error(
        "ReactDOM.preinit(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
        i(c)
      ), typeof c == "string" && o && typeof o.as == "string") {
        var h = o.as, y = r(h, o.crossOrigin), d = typeof o.integrity == "string" ? o.integrity : void 0, $ = typeof o.fetchPriority == "string" ? o.fetchPriority : void 0;
        h === "style" ? m.d.S(
          c,
          typeof o.precedence == "string" ? o.precedence : void 0,
          {
            crossOrigin: y,
            integrity: d,
            fetchPriority: $
          }
        ) : h === "script" && m.d.X(c, {
          crossOrigin: y,
          integrity: d,
          fetchPriority: $,
          nonce: typeof o.nonce == "string" ? o.nonce : void 0
        });
      }
    }, me.preinitModule = function(c, o) {
      var h = "";
      typeof c == "string" && c || (h += " The `href` argument encountered was " + i(c) + "."), o !== void 0 && typeof o != "object" ? h += " The `options` argument encountered was " + i(o) + "." : o && "as" in o && o.as !== "script" && (h += " The `as` option encountered was " + u(o.as) + "."), h ? console.error(
        "ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` string and, optionally, an `options` object with a valid `as` property.%s",
        h
      ) : (h = o && typeof o.as == "string" ? o.as : "script", h) === "script" || (h = u(h), console.error(
        'ReactDOM.preinitModule(): Currently the only supported "as" type for this function is "script" but received "%s" instead. This warning was generated for `href` "%s". In the future other module types will be supported, aligning with the import-attributes proposal. Learn more here: (https://github.com/tc39/proposal-import-attributes)',
        h,
        c
      )), typeof c == "string" && (typeof o == "object" && o !== null ? (o.as == null || o.as === "script") && (h = r(
        o.as,
        o.crossOrigin
      ), m.d.M(c, {
        crossOrigin: h,
        integrity: typeof o.integrity == "string" ? o.integrity : void 0,
        nonce: typeof o.nonce == "string" ? o.nonce : void 0
      })) : o == null && m.d.M(c));
    }, me.preload = function(c, o) {
      var h = "";
      if (typeof c == "string" && c || (h += " The `href` argument encountered was " + i(c) + "."), o == null || typeof o != "object" ? h += " The `options` argument encountered was " + i(o) + "." : typeof o.as == "string" && o.as || (h += " The `as` option encountered was " + i(o.as) + "."), h && console.error(
        'ReactDOM.preload(): Expected two arguments, a non-empty `href` string and an `options` object with an `as` property valid for a `<link rel="preload" as="..." />` tag.%s',
        h
      ), typeof c == "string" && typeof o == "object" && o !== null && typeof o.as == "string") {
        h = o.as;
        var y = r(
          h,
          o.crossOrigin
        );
        m.d.L(c, h, {
          crossOrigin: y,
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
    }, me.preloadModule = function(c, o) {
      var h = "";
      typeof c == "string" && c || (h += " The `href` argument encountered was " + i(c) + "."), o !== void 0 && typeof o != "object" ? h += " The `options` argument encountered was " + i(o) + "." : o && "as" in o && typeof o.as != "string" && (h += " The `as` option encountered was " + i(o.as) + "."), h && console.error(
        'ReactDOM.preloadModule(): Expected two arguments, a non-empty `href` string and, optionally, an `options` object with an `as` property valid for a `<link rel="modulepreload" as="..." />` tag.%s',
        h
      ), typeof c == "string" && (o ? (h = r(
        o.as,
        o.crossOrigin
      ), m.d.m(c, {
        as: typeof o.as == "string" && o.as !== "script" ? o.as : void 0,
        crossOrigin: h,
        integrity: typeof o.integrity == "string" ? o.integrity : void 0
      })) : m.d.m(c));
    }, me.requestFormReset = function(c) {
      m.d.r(c);
    }, me.unstable_batchedUpdates = function(c, o) {
      return c(o);
    }, me.useFormState = function(c, o, h) {
      return l().useFormState(c, o, h);
    }, me.useFormStatus = function() {
      return l().useHostTransitionStatus();
    }, me.version = "19.2.7", typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop == "function" && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
  })()), me;
}
var Qe;
function Ma() {
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
  return process.env.NODE_ENV === "production" ? (t(), xe.exports = Sa()) : xe.exports = Ca(), xe.exports;
}
var vt = Ma();
function Ta(t) {
  if (t.width <= 0 || t.height <= 0) return !1;
  try {
    const n = t.getContext("2d", { willReadFrequently: !0 });
    if (!n) return !1;
    const a = [0, Math.floor(t.width / 2), t.width - 1], r = [0, Math.floor(t.height / 2), t.height - 1], i = a.flatMap((u) => r.map((l) => n.getImageData(u, l, 1, 1).data));
    if (i.every((u) => u[3] === 0)) return !1;
    for (let u = 0; u < 3; u += 1) {
      const l = i.map((C) => C[u]);
      if (Math.max(...l) - Math.min(...l) > 6) return !0;
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
  onDisconnect: i
}) {
  const u = K(null), l = K(i), [C, m] = S("connecting"), [s, b] = S();
  return U(() => {
    l.current = i;
  }, [i]), U(() => {
    if (!u.current) return;
    let c = !1, o = !1, h = !1, y = !1, d, $, P, _;
    (a ? u.current.closest(".computer-preview") : null)?.style.removeProperty("aspect-ratio"), m("connecting"), b(void 0);
    const V = () => {
      d && window.clearInterval(d), $ && window.clearTimeout($), d = void 0, $ = void 0;
    }, B = () => {
      P && window.clearTimeout(P), P = void 0;
    }, X = () => {
      y || (y = !0, l.current?.());
    }, k = (g) => {
      c || o || (o = !0, B(), V(), b(g), m("disconnected"), X(), _?.disconnect());
    }, F = () => {
      const g = u.current?.querySelector("canvas");
      return g ? Ta(g) : !1;
    }, Q = () => {
      c || o || (B(), h = !0, d = window.setInterval(() => {
        !c && F() && (V(), m("connected"));
      }, 100), $ = window.setTimeout(() => {
        F() || k("This computer connected but never drew a frame.");
      }, 8e3));
    }, J = (g) => {
      if (c || o) return;
      B(), V();
      const O = g.detail?.clean;
      b((te) => te ?? (h && O ? "This computer stopped before drawing a frame." : O ? "This computer disconnected." : "The connection to this computer was lost.")), m("disconnected"), X();
    }, ee = (g) => {
      k(g.detail?.reason ?? "Screen security negotiation failed.");
    }, re = () => k("This computer's screen is asking for a VNC password.");
    return P = window.setTimeout(() => k("This computer's screen did not answer."), 15e3), import("./chunk-rfb-DFY61DWN.js").then(({ default: g }) => {
      c || o || !u.current || (_ = new g(u.current, t.url, { shared: !0, wsProtocols: t.protocols }), _.viewOnly = n, _.scaleViewport = !0, _.resizeSession = !1, a && (_.background = "transparent"), _.addEventListener("connect", Q), _.addEventListener("disconnect", J), _.addEventListener("securityfailure", ee), _.addEventListener("credentialsrequired", re));
    }).catch(() => k("Could not load the screen client.")), () => {
      c = !0, B(), V(), _?.removeEventListener("connect", Q), _?.removeEventListener("disconnect", J), _?.removeEventListener("securityfailure", ee), _?.removeEventListener("credentialsrequired", re), _?.disconnect();
    };
  }, [a, t, n]), /* @__PURE__ */ e.createElement("div", { className: `vnc-viewport ${a ? "is-compact" : ""}` }, /* @__PURE__ */ e.createElement("div", { ref: u, className: "vnc-target" }), C !== "connected" && /* @__PURE__ */ e.createElement("div", { className: "vnc-status", role: "status" }, C === "connecting" ? /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement(Te, { size: a ? 14 : 18, className: "spin" }), !a && "Connecting…") : /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("span", null, a ? "Screen unavailable" : s), r && /* @__PURE__ */ e.createElement("button", { className: "secondary-button", onClick: r }, "Reconnect"))));
}
function _a({
  session: t,
  failure: n,
  title: a,
  onClose: r,
  onReconnect: i
}) {
  return vt.createPortal(/* @__PURE__ */ e.createElement("div", { className: "vnc-desktop", role: "dialog", "aria-label": a }, /* @__PURE__ */ e.createElement("div", { className: "vnc-titlebar", "aria-hidden": "true" }), /* @__PURE__ */ e.createElement("button", { className: "vnc-close", "aria-label": "Close this screen", onClick: r }, /* @__PURE__ */ e.createElement(Nn, { size: 18 })), t ? /* @__PURE__ */ e.createElement(Et, { session: t, viewOnly: !1, onReconnect: i }) : /* @__PURE__ */ e.createElement("div", { className: "vnc-viewport" }, /* @__PURE__ */ e.createElement("div", { className: "vnc-status", role: "status" }, n ? /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("span", null, n), /* @__PURE__ */ e.createElement("button", { className: "secondary-button", onClick: i }, "Reconnect")) : /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement(Te, { size: 18, className: "spin" }), " Connecting…")))), document.body);
}
function xa({
  open: t,
  width: n,
  onResize: a,
  agentName: r,
  agentRole: i,
  computer: u,
  approvals: l,
  routines: C,
  grants: m,
  grantsBusy: s,
  audit: b,
  auditLoading: c,
  auditView: o,
  auditHasMore: h,
  artifacts: y,
  artifactUrl: d,
  tasks: $,
  proactive: P,
  onSetProactive: _,
  onApproval: L,
  onComputerAction: V,
  onDeleteRoutine: B,
  onDraft: X,
  onSetGrant: k,
  onClearGrant: F,
  onChangeAuditView: Q,
  onLoadMoreAudit: J,
  onClose: ee
}) {
  const [re, g] = S(""), [O, te] = S(""), [ge, pe] = S(!1), [j, se] = S(() => /* @__PURE__ */ new Map()), [oe, Y] = S(""), [le, ie] = S(() => /* @__PURE__ */ new Set()), [ce, ye] = S(), [ae, x] = S(!1), [f, N] = S(), R = l.filter((p) => p.status === "pending"), H = j.get(u?.id ?? ""), z = le.has(u?.id ?? ""), w = K(V);
  U(() => {
    w.current = V;
  }, [V]), U(() => {
    const p = u?.id;
    if (!t || ae || u?.status !== "online" || !p || H || z) return;
    let D = !0;
    return Y(p), w.current("open").then((W) => {
      D && (se((G) => new Map(G).set(p, W)), Y(""));
    }).catch(() => {
      D && (ie((W) => new Set(W).add(p)), Y(""));
    }), () => {
      D = !1;
    };
  }, [u?.id, u?.status, ae, t, z, H]);
  async function M(p) {
    x(!0), ye(void 0), N(void 0), pe(!0);
    const D = u?.id;
    D && le.has(D) && (ie((W) => {
      const G = new Set(W);
      return G.delete(D), G;
    }), se((W) => {
      const G = new Map(W);
      return G.delete(D), G;
    }));
    try {
      ye(await V(p));
    } catch (W) {
      N(W instanceof Error ? W.message : "Could not reach that computer.");
    } finally {
      pe(!1);
    }
  }
  function E() {
    x(!1), ye(void 0), N(void 0);
  }
  const T = () => window.innerWidth <= 1030 ? Math.min(730, window.innerWidth - 40) : Math.min(730, window.innerWidth - (window.innerWidth <= 1180 ? 672 : 732));
  U(() => {
    const p = () => {
      const D = Math.max(280, T());
      n > D && a(D);
    };
    return p(), window.addEventListener("resize", p), () => window.removeEventListener("resize", p);
  }, [a, n]);
  const q = (p) => a(Math.max(280, Math.min(T(), window.innerWidth - p)));
  return /* @__PURE__ */ e.createElement("aside", { className: `detail-panel ${t ? "is-open" : "is-closing"}`, style: { width: n } }, /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "detail-resize-handle",
      role: "separator",
      "aria-label": "Resize the details panel",
      "aria-orientation": "vertical",
      "aria-valuemin": 280,
      "aria-valuemax": Math.max(280, T()),
      "aria-valuenow": n,
      tabIndex: 0,
      onKeyDown: (p) => {
        p.key === "ArrowLeft" ? (p.preventDefault(), a(Math.min(T(), n + 16))) : p.key === "ArrowRight" && (p.preventDefault(), a(Math.max(280, n - 16)));
      },
      onPointerDown: (p) => {
        p.currentTarget.setPointerCapture(p.pointerId), q(p.clientX);
      },
      onPointerMove: (p) => {
        p.currentTarget.hasPointerCapture(p.pointerId) && q(p.clientX);
      }
    }
  ), /* @__PURE__ */ e.createElement("header", null, /* @__PURE__ */ e.createElement("button", { className: "icon-button", "aria-label": "Close the details panel", onClick: ee }, /* @__PURE__ */ e.createElement(rn, { size: 18 }))), l.filter((p) => p.outcome === "outcome_unknown").map((p) => /* @__PURE__ */ e.createElement("section", { className: "approval-card is-uncertain", key: `unknown-${p.id}` }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow warning" }, /* @__PURE__ */ e.createElement(qe, { size: 14 }), " Outcome unknown"), /* @__PURE__ */ e.createElement("h3", null, p.title), /* @__PURE__ */ e.createElement("p", null, "You allowed this and the process stopped before anything recorded whether it went through. It may have. Check before allowing it again."))), R.map((p) => /* @__PURE__ */ e.createElement("section", { className: "approval-card", key: p.id }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow warning" }, /* @__PURE__ */ e.createElement(qe, { size: 14 }), " Waiting for you", p.source && p.source !== p.agentId && /* @__PURE__ */ e.createElement("span", { className: "approval-source" }, p.source), p.ref && /* @__PURE__ */ e.createElement("code", { className: "approval-ref", title: "Reply with this in the thread to decide without opening the panel" }, p.ref)), /* @__PURE__ */ e.createElement("h3", null, p.title), p.description && /* @__PURE__ */ e.createElement("p", null, p.description), p.scope.length > 0 && /* @__PURE__ */ e.createElement("div", { className: "scope" }, /* @__PURE__ */ e.createElement("span", null, "This allows:"), p.scope.map((D) => /* @__PURE__ */ e.createElement("div", { key: D }, /* @__PURE__ */ e.createElement(Me, { size: 13 }), D))), /* @__PURE__ */ e.createElement(
    "textarea",
    {
      "aria-label": "Note for this decision",
      placeholder: "Add a note (optional)",
      value: re,
      onChange: (D) => g(D.target.value)
    }
  ), /* @__PURE__ */ e.createElement("div", { className: "approval-actions" }, /* @__PURE__ */ e.createElement("button", { className: "secondary-button danger-text", onClick: () => {
    L(p.id, "deny", re, p.contentHash);
  } }, "Discard"), /* @__PURE__ */ e.createElement("button", { className: "primary-button", onClick: () => {
    L(p.id, "allow", re, p.contentHash);
  } }, "Approve")))), /* @__PURE__ */ e.createElement("section", { className: "screen-section" }, /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "screen-trigger",
      disabled: ge || u?.status !== "online",
      "aria-label": `Open ${r}'s screen`,
      onClick: () => {
        M("open");
      }
    },
    /* @__PURE__ */ e.createElement("span", { className: "computer-preview" }, [...j].map(([p, D]) => /* @__PURE__ */ e.createElement(
      "span",
      {
        className: `computer-preview-stream ${p === u?.id ? "is-active" : ""}`,
        key: p
      },
      /* @__PURE__ */ e.createElement(
        Et,
        {
          session: D,
          viewOnly: !0,
          compact: !0,
          onDisconnect: () => ie((W) => new Set(W).add(p))
        }
      )
    )), !j.has(u?.id ?? "") && (oe === u?.id ? /* @__PURE__ */ e.createElement("span", { className: "computer-preview-loading", role: "status", "aria-label": `Loading ${r}'s screen` }, /* @__PURE__ */ e.createElement(Te, { size: 18, className: "spin" })) : le.has(u?.id ?? "") ? /* @__PURE__ */ e.createElement("span", { className: "computer-preview-loading", role: "status" }, "Screen unavailable") : /* @__PURE__ */ e.createElement("span", { className: "computer-screen-off", "aria-hidden": "true" })), /* @__PURE__ */ e.createElement("span", { className: "screen-hover-action" }, /* @__PURE__ */ e.createElement(bn, { size: 14 }), " Open"))
  ), /* @__PURE__ */ e.createElement("div", { className: "screen-caption" }, /* @__PURE__ */ e.createElement("span", null, r, "'s screen"), /* @__PURE__ */ e.createElement("span", { className: `screen-state ${u?.status ?? "offline"}` }, u?.status === "online" ? "Running" : u?.status === "starting" ? "Starting…" : "Off")), u && u.status !== "online" && /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "secondary-button",
      disabled: ge,
      onClick: () => {
        M("takeover");
      }
    },
    "Start this computer"
  ), u?.error && /* @__PURE__ */ e.createElement("p", { className: "screen-error" }, u.error)), /* @__PURE__ */ e.createElement("section", { className: "proactive-section" }, /* @__PURE__ */ e.createElement("label", { className: "proactive-row" }, /* @__PURE__ */ e.createElement(
    "input",
    {
      type: "checkbox",
      checked: P,
      onChange: (p) => {
        _(p.target.checked);
      }
    }
  ), /* @__PURE__ */ e.createElement("span", null, /* @__PURE__ */ e.createElement("strong", null, "Speak up unprompted"), /* @__PURE__ */ e.createElement("span", null, "Bring up work that is stuck, a few times a day, in this thread.")))), /* @__PURE__ */ e.createElement("section", { className: "routines-section" }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow" }, "Routines"), C.map((p) => /* @__PURE__ */ e.createElement("div", { className: "routine-row", key: p.id }, /* @__PURE__ */ e.createElement("div", null, /* @__PURE__ */ e.createElement("strong", null, p.name), /* @__PURE__ */ e.createElement("span", null, p.schedule)), /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "icon-button",
      "aria-label": `Cancel the routine ${p.name}`,
      onClick: () => {
        B(p.id);
      }
    },
    /* @__PURE__ */ e.createElement(Fe, { size: 14 })
  ))), C.length === 0 && /* @__PURE__ */ e.createElement("div", { className: "routine-empty" }, /* @__PURE__ */ e.createElement("p", null, "Nothing on a schedule yet. Ask for something like:"), ka(i).map((p) => /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "routine-suggestion",
      key: p,
      onClick: () => X(p)
    },
    p
  )))), /* @__PURE__ */ e.createElement("section", { className: "drawer-section" }, /* @__PURE__ */ e.createElement("div", { className: "drawer-tabs", role: "tablist", "aria-label": "More about this teammate" }, /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": O === "work",
      className: O === "work" ? "is-current" : "",
      onClick: () => te((p) => p === "work" ? "" : "work")
    },
    "Work"
  ), /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": O === "files",
      className: O === "files" ? "is-current" : "",
      onClick: () => te((p) => p === "files" ? "" : "files")
    },
    "Files",
    y.length > 0 && /* @__PURE__ */ e.createElement("span", { className: "drawer-count" }, y.length)
  ), /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": O === "permissions",
      className: O === "permissions" ? "is-current" : "",
      onClick: () => te((p) => p === "permissions" ? "" : "permissions")
    },
    "Permissions"
  ), /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": O === "audit",
      className: O === "audit" ? "is-current" : "",
      onClick: () => te((p) => p === "audit" ? "" : "audit")
    },
    "History"
  )), O === "work" && /* @__PURE__ */ e.createElement(ya, { agentName: r, tasks: $ }), O === "files" && /* @__PURE__ */ e.createElement(
    ua,
    {
      agentName: r,
      artifacts: y,
      urlFor: d
    }
  ), O === "permissions" && /* @__PURE__ */ e.createElement(
    Ea,
    {
      agentName: r,
      grants: m,
      busy: s,
      onSetGrant: k,
      onClearGrant: F
    }
  ), O === "audit" && /* @__PURE__ */ e.createElement(
    ca,
    {
      events: b,
      loading: c,
      viewId: o,
      hasMore: h,
      onChangeView: Q,
      onLoadMore: J
    }
  )), ae && /* @__PURE__ */ e.createElement(
    _a,
    {
      session: ce,
      failure: f,
      title: `${r}'s computer`,
      onClose: E,
      onReconnect: () => {
        M("takeover");
      }
    }
  ));
}
const et = 160, tt = 1e5, Ia = 800, Aa = 1e4, nt = "This page changed elsewhere. Your draft is safe — copy it before loading the latest version.", Ce = (t) => ({
  title: t.title,
  content: t.content,
  parent_id: t.parent_id
}), at = (t, n) => t.title === n.title && t.content === n.content && t.parent_id === n.parent_id, rt = (t) => !!t && typeof t == "object" && ("kind" in t && t.kind === "conflict" || "status" in t && t.status === 409);
class Oa {
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
    }, Ia));
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
    const a = this.state.page, r = { ...this.state.draft }, i = this.generation;
    if (!r.title.trim() || r.title.length > et || r.content.length > tt)
      return this.publish({
        status: "error",
        error: `Use a title up to ${et} characters and a document up to ${tt.toLocaleString("en-US")} characters. Your draft is still here.`
      }), !1;
    this.controller = new AbortController();
    const u = this.controller;
    this.publish({ status: "saving", error: void 0 });
    const l = (async () => {
      let m;
      try {
        const s = await Promise.race([
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
          new Promise((o, h) => {
            m = setTimeout(() => {
              u.abort(), h(new Error("Saving timed out. Your draft is safe; retry when connected."));
            }, Aa);
          })
        ]);
        if (i !== this.generation) return !1;
        const b = at(this.state.draft, r), c = this.state.remote && this.state.remote.revision > s.revision ? this.state.remote : s;
        return this.publish({
          page: s,
          remote: c,
          draft: b ? Ce(s) : this.state.draft
        }), this.publish({
          status: c.revision > s.revision ? "conflict" : this.changed ? "dirty" : "saved",
          error: c.revision > s.revision ? "A newer revision exists. Your draft is preserved." : void 0
        }), this.state.status !== "conflict";
      } catch (s) {
        return i !== this.generation || this.publish({
          status: rt(s) ? "conflict" : "error",
          error: rt(s) ? nt : s instanceof Error ? s.message : "Could not save. Your draft is safe."
        }), !1;
      } finally {
        clearTimeout(m), i === this.generation && (this.pending = void 0, this.publish({}), this.schedule());
      }
    })();
    this.pending = l;
    const C = await l;
    return C && i === this.generation && this.changed ? this.flush(n) : C;
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
const Ra = Pe(async () => ({ default: (await import("./chunk-mermaid-HWGCJPDP-CrXQpX1p.js").then((t) => t.i)).Streamdown }));
function Da(t) {
  const n = new Map(
    t.map((r) => [r.id, { page: r, children: [] }])
  ), a = [];
  for (const r of n.values()) {
    const i = r.page.parent_id ? n.get(r.page.parent_id) : void 0;
    i && i !== r ? i.children.push(r) : a.push(r);
  }
  return a;
}
const Pa = {
  saved: "Saved",
  dirty: "Unsaved changes",
  saving: "Saving…",
  error: "Not saved",
  conflict: "Changed elsewhere"
};
function $a({ state: t }) {
  const n = t.status === "saving" ? Te : t.status === "saved" ? Me : Re;
  return /* @__PURE__ */ e.createElement("span", { className: `space-save space-save-${t.status}` }, /* @__PURE__ */ e.createElement(n, { size: 13, className: t.status === "saving" ? "space-spin" : void 0 }), Pa[t.status]);
}
function La({ client: t, agents: n }) {
  const [a, r] = S([]), [i, u] = S(""), [l, C] = S([]), [m, s] = S(""), [b, c] = S(""), [o, h] = S(!1), [y, d] = S(""), [$, P] = S(!1), _ = fe(
    () => new Oa((g, O, te) => t.patchPage(i, g, O, te)),
    [t, i]
  );
  U(() => () => _.dispose(), [_]);
  const L = ct(_.subscribe, _.getSnapshot), V = a.find((g) => g.id === i), B = Ee(async () => {
    try {
      const g = await t.listSpaces();
      r(g), u((O) => g.some((te) => te.id === O) ? O : g[0]?.id ?? "");
    } catch (g) {
      d(g instanceof Error ? g.message : "Could not load Spaces.");
    }
  }, [t]), X = Ee(async () => {
    if (!i) return C([]);
    try {
      C(await t.listPages(i, b));
    } catch (g) {
      d(g instanceof Error ? g.message : "Could not load this Space.");
    }
  }, [t, i, b]);
  U(() => {
    B();
  }, [B]), U(() => {
    const g = setTimeout(() => {
      X();
    }, b ? 200 : 0);
    return () => clearTimeout(g);
  }, [X, b]), U(() => {
    if (!i || !m) return;
    let g = !0;
    return t.getPage(i, m).then((O) => {
      g && _.receive(O);
    }).catch((O) => {
      g && d(O instanceof Error ? O.message : "Could not open that page.");
    }), () => {
      g = !1;
    };
  }, [_, t, m, i]), U(() => {
    const g = (O) => {
      _.dirty && O.preventDefault();
    };
    return window.addEventListener("beforeunload", g), () => window.removeEventListener("beforeunload", g);
  }, [_]);
  const k = async () => {
    if (i)
      try {
        const g = await t.createPage(i, { title: "Untitled", content: "" });
        await X(), s(g.id);
      } catch (g) {
        d(g instanceof Error ? g.message : "Could not create the page.");
      }
  }, F = async () => {
    const g = window.prompt("Name this Space")?.trim();
    if (g)
      try {
        const O = await t.createSpace(g);
        await B(), u(O.id), s("");
      } catch (O) {
        d(O instanceof Error ? O.message : "Could not create the Space.");
      }
  }, Q = async (g) => {
    window.confirm(`Delete “${g.title}”? Its sub-pages move up a level.`) && (await t.deletePage(i, g.id), g.id === m && s(""), await X());
  }, J = async (g, O) => {
    await t.setSpaceMember(i, g, O), await B();
  }, ee = async () => {
    const g = L.draft;
    if (g)
      try {
        await navigator.clipboard.writeText(`# ${g.title}

${g.content}`), P(!0), setTimeout(() => P(!1), 2500);
      } catch {
        d("Could not reach the clipboard. Select the text and copy it.");
      }
  }, re = fe(() => Da(l), [l]);
  return /* @__PURE__ */ e.createElement("div", { className: "spaces-panel" }, /* @__PURE__ */ e.createElement("aside", { className: "spaces-library" }, /* @__PURE__ */ e.createElement("header", { className: "spaces-library-head" }, /* @__PURE__ */ e.createElement(
    "select",
    {
      className: "spaces-picker",
      value: i,
      onChange: (g) => {
        u(g.target.value), s("");
      },
      "aria-label": "Space"
    },
    a.length === 0 && /* @__PURE__ */ e.createElement("option", { value: "" }, "No Spaces yet"),
    a.map((g) => /* @__PURE__ */ e.createElement("option", { key: g.id, value: g.id }, g.name))
  ), /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "spaces-icon-button",
      onClick: () => {
        F();
      },
      title: "New Space",
      "aria-label": "New Space"
    },
    /* @__PURE__ */ e.createElement(Oe, { size: 15 })
  )), /* @__PURE__ */ e.createElement("div", { className: "spaces-search" }, /* @__PURE__ */ e.createElement(Ve, { size: 14 }), /* @__PURE__ */ e.createElement(
    "input",
    {
      value: b,
      onChange: (g) => c(g.target.value),
      placeholder: "Search this Space",
      "aria-label": "Search this Space"
    }
  )), /* @__PURE__ */ e.createElement("nav", { className: "spaces-tree", "aria-label": "Pages" }, re.length === 0 && /* @__PURE__ */ e.createElement("p", { className: "spaces-empty" }, b ? "Nothing matches." : "No pages yet."), re.map((g) => /* @__PURE__ */ e.createElement(
    wt,
    {
      key: g.page.id,
      node: g,
      depth: 0,
      activeId: m,
      onOpen: s,
      onDelete: Q
    }
  ))), /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "spaces-new-page",
      onClick: () => {
        k();
      },
      disabled: !i
    },
    /* @__PURE__ */ e.createElement(Oe, { size: 14 }),
    " New page"
  ), V && /* @__PURE__ */ e.createElement("section", { className: "spaces-members" }, /* @__PURE__ */ e.createElement("h4", null, /* @__PURE__ */ e.createElement(ft, { size: 13 }), " Who can read this"), n.length === 0 && /* @__PURE__ */ e.createElement("p", { className: "spaces-empty" }, "No teammates yet."), n.map((g) => {
    const O = V.bot_ids.includes(g.id);
    return /* @__PURE__ */ e.createElement("label", { key: g.id, className: "spaces-member" }, /* @__PURE__ */ e.createElement(
      "input",
      {
        type: "checkbox",
        checked: O,
        onChange: () => {
          J(g.id, !O);
        }
      }
    ), /* @__PURE__ */ e.createElement("span", null, g.avatar, " ", g.name));
  }), /* @__PURE__ */ e.createElement("p", { className: "spaces-note" }, "A teammate you remove stops being able to read this on its very next tool call, not its next turn."))), /* @__PURE__ */ e.createElement("section", { className: "spaces-editor" }, y && /* @__PURE__ */ e.createElement("p", { className: "spaces-problem", role: "status" }, y, /* @__PURE__ */ e.createElement("button", { type: "button", onClick: () => d("") }, "Dismiss")), !L.page && /* @__PURE__ */ e.createElement("div", { className: "spaces-placeholder" }, /* @__PURE__ */ e.createElement(be, { size: 28 }), /* @__PURE__ */ e.createElement("p", null, "Pick a page, or start one.")), L.page && L.draft && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("header", { className: "spaces-editor-head" }, /* @__PURE__ */ e.createElement(
    "input",
    {
      className: "spaces-title",
      value: L.draft.title,
      onChange: (g) => _.edit({ title: g.target.value }),
      "aria-label": "Page title"
    }
  ), /* @__PURE__ */ e.createElement("div", { className: "spaces-editor-actions" }, /* @__PURE__ */ e.createElement($a, { state: L }), /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "spaces-icon-button",
      "aria-pressed": o,
      title: o ? "Edit" : "Preview",
      onClick: () => h((g) => !g)
    },
    /* @__PURE__ */ e.createElement(pn, { size: 15 })
  ))), L.status === "conflict" && /* @__PURE__ */ e.createElement("div", { className: "spaces-conflict", role: "alert" }, /* @__PURE__ */ e.createElement(Re, { size: 16 }), /* @__PURE__ */ e.createElement("div", null, /* @__PURE__ */ e.createElement("strong", null, L.error), /* @__PURE__ */ e.createElement("p", null, "Nothing has been overwritten and nothing will be saved until you choose.")), /* @__PURE__ */ e.createElement("div", { className: "spaces-conflict-actions" }, /* @__PURE__ */ e.createElement("button", { type: "button", onClick: () => {
    ee();
  } }, $ ? "Copied" : "Copy my draft"), /* @__PURE__ */ e.createElement("button", { type: "button", className: "primary", onClick: () => _.useLatest() }, "Load the latest"))), L.status === "error" && /* @__PURE__ */ e.createElement("div", { className: "spaces-conflict spaces-conflict-error", role: "alert" }, /* @__PURE__ */ e.createElement(Re, { size: 16 }), /* @__PURE__ */ e.createElement("div", null, /* @__PURE__ */ e.createElement("strong", null, L.error)), /* @__PURE__ */ e.createElement("div", { className: "spaces-conflict-actions" }, /* @__PURE__ */ e.createElement("button", { type: "button", className: "primary", onClick: () => {
    _.flush(!0);
  } }, /* @__PURE__ */ e.createElement(Mn, { size: 13 }), " Try again"))), o ? /* @__PURE__ */ e.createElement("div", { className: "spaces-preview" }, /* @__PURE__ */ e.createElement(De, { fallback: /* @__PURE__ */ e.createElement("p", { className: "spaces-empty" }, "Rendering…") }, /* @__PURE__ */ e.createElement(Ra, { mode: "static", controls: !1, linkSafety: { enabled: !0 }, skipHtml: !0 }, L.draft.content))) : /* @__PURE__ */ e.createElement(
    "textarea",
    {
      className: "spaces-body",
      value: L.draft.content,
      spellCheck: !0,
      onChange: (g) => _.edit({ content: g.target.value }),
      "aria-label": "Page content",
      placeholder: "Markdown."
    }
  ), /* @__PURE__ */ e.createElement("footer", { className: "spaces-editor-foot" }, /* @__PURE__ */ e.createElement("span", null, "Revision ", L.page.revision), L.page.created_by && /* @__PURE__ */ e.createElement("span", null, "Started by ", L.page.created_by)))));
}
function wt({
  node: t,
  depth: n,
  activeId: a,
  onOpen: r,
  onDelete: i
}) {
  const [u, l] = S(!0), C = t.children.length > 0;
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
        className: `spaces-twisty${C ? "" : " is-leaf"}`,
        onClick: () => l((m) => !m),
        "aria-label": u ? "Collapse" : "Expand",
        "aria-expanded": C ? u : void 0,
        disabled: !C
      },
      /* @__PURE__ */ e.createElement(Ae, { size: 13, className: u ? "spaces-twisty-open" : void 0 })
    ),
    /* @__PURE__ */ e.createElement("button", { type: "button", className: "spaces-tree-title", onClick: () => r(t.page.id) }, t.page.title),
    /* @__PURE__ */ e.createElement(
      "button",
      {
        type: "button",
        className: "spaces-icon-button spaces-row-delete",
        onClick: () => i(t.page),
        title: `Delete ${t.page.title}`,
        "aria-label": `Delete ${t.page.title}`
      },
      /* @__PURE__ */ e.createElement(Fe, { size: 13 })
    )
  ), u && t.children.map((m) => /* @__PURE__ */ e.createElement(
    wt,
    {
      key: m.page.id,
      node: m,
      depth: n + 1,
      activeId: a,
      onOpen: r,
      onDelete: i
    }
  )));
}
function za({
  value: t,
  options: n,
  ariaLabel: a,
  placeholder: r = "Select",
  onChange: i,
  onOpen: u
}) {
  const [l, C] = S(!1), [m, s] = S(), b = K(null), c = K(null), o = n.find((d) => d.value === t);
  U(() => {
    if (!l) return;
    const d = () => {
      const P = b.current?.getBoundingClientRect();
      if (!P) return;
      const _ = 5, L = 8, V = Math.max(P.width, 180), B = Math.min(220, n.length * 32 + 10), X = window.innerHeight - P.bottom - L, k = X < B && P.top - L > X;
      s({
        position: "fixed",
        zIndex: 100,
        left: Math.max(L, Math.min(P.right - V, window.innerWidth - V - L)),
        top: k ? Math.max(L, P.top - B - _) : P.bottom + _,
        width: V,
        maxHeight: k ? Math.min(220, P.top - _ - L) : Math.min(220, X)
      });
    }, $ = (P) => {
      const _ = P.target;
      !b.current?.contains(_) && !c.current?.contains(_) && C(!1);
    };
    return d(), window.addEventListener("pointerdown", $), window.addEventListener("resize", d), window.addEventListener("scroll", d, !0), () => {
      window.removeEventListener("pointerdown", $), window.removeEventListener("resize", d), window.removeEventListener("scroll", d, !0);
    };
  }, [l, n.length]);
  const h = (d) => {
    const $ = n.filter((L) => !L.disabled && !L.action);
    if (!$.length) return;
    const P = $.findIndex((L) => L.value === t), _ = P < 0 ? d > 0 ? 0 : $.length - 1 : (P + d + $.length) % $.length;
    i($[_].value);
  }, y = () => C((d) => (d || u?.(), !d));
  return /* @__PURE__ */ e.createElement("div", { className: `crew-select ${l ? "open" : ""}`, ref: b }, /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "crew-select-trigger",
      "aria-label": a,
      "aria-haspopup": "listbox",
      "aria-expanded": l,
      onClick: y,
      onKeyDown: (d) => {
        if (d.key === "Escape") {
          C(!1);
          return;
        }
        (d.key === "ArrowDown" || d.key === "ArrowUp") && (d.preventDefault(), h(d.key === "ArrowDown" ? 1 : -1), l || u?.(), C(!0));
      }
    },
    /* @__PURE__ */ e.createElement("span", null, o?.label ?? r),
    /* @__PURE__ */ e.createElement("span", { className: "crew-select-chevron" }, /* @__PURE__ */ e.createElement(an, { size: 15 }))
  ), l && m && vt.createPortal(
    /* @__PURE__ */ e.createElement(
      "div",
      {
        className: "crew-select-menu crew-select-menu-portal",
        ref: c,
        style: m,
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
            d.action?.(), d.action || i(d.value), C(!1);
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
const Ua = ["🤖", "🔎", "📥", "📈", "🎖️", "🧭", "🛠️", "📚", "🧪", "✍️", "🗂️", "🛰️"];
function st({
  editing: t,
  providers: n,
  busy: a,
  error: r,
  onSubmit: i,
  onClose: u
}) {
  const [l, C] = S(t?.name ?? ""), [m, s] = S(t?.role ?? ""), [b, c] = S(t?.avatar || "🤖"), [o, h] = S("");
  U(() => {
    const d = ($) => {
      $.key === "Escape" && u();
    };
    return window.addEventListener("keydown", d), () => window.removeEventListener("keydown", d);
  }, [u]);
  const y = !!l.trim() && !a;
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
          d.preventDefault(), y && i({ name: l.trim(), role: m.trim(), emoji: b, modelProviderId: o });
        }
      },
      /* @__PURE__ */ e.createElement("h2", null, t ? `Edit ${t.name}` : "Hire a teammate"),
      /* @__PURE__ */ e.createElement("label", { className: "crew-field" }, /* @__PURE__ */ e.createElement("span", null, "Name"), /* @__PURE__ */ e.createElement(
        "input",
        {
          autoFocus: !t,
          value: l,
          disabled: !!t,
          placeholder: "Scout",
          onChange: (d) => C(d.target.value)
        }
      ), t && /* @__PURE__ */ e.createElement("small", null, "A teammate's name is its profile directory, so it cannot be changed here.")),
      /* @__PURE__ */ e.createElement("label", { className: "crew-field" }, /* @__PURE__ */ e.createElement("span", null, "Their job, in one line"), /* @__PURE__ */ e.createElement(
        "input",
        {
          autoFocus: !!t,
          value: m,
          placeholder: "Turns a one-line question into a decision-ready brief with sources",
          onChange: (d) => s(d.target.value)
        }
      )),
      /* @__PURE__ */ e.createElement("div", { className: "crew-field" }, /* @__PURE__ */ e.createElement("span", null, "Face"), /* @__PURE__ */ e.createElement("div", { className: "crew-emoji-row" }, Ua.map((d) => /* @__PURE__ */ e.createElement(
        "button",
        {
          type: "button",
          key: d,
          className: `crew-emoji ${d === b ? "selected" : ""}`,
          "aria-label": `Use ${d}`,
          "aria-pressed": d === b,
          onClick: () => c(d)
        },
        d
      )))),
      !t && n.length > 0 && /* @__PURE__ */ e.createElement("div", { className: "crew-field" }, /* @__PURE__ */ e.createElement("span", null, "Model"), /* @__PURE__ */ e.createElement(
        za,
        {
          ariaLabel: "Model provider",
          placeholder: "Same as your default profile",
          value: o,
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
          onChange: h
        }
      )),
      r && /* @__PURE__ */ e.createElement("p", { className: "crew-dialog-error" }, r),
      /* @__PURE__ */ e.createElement("div", { className: "crew-dialog-actions" }, /* @__PURE__ */ e.createElement("button", { type: "button", className: "secondary-button", onClick: u }, "Cancel"), /* @__PURE__ */ e.createElement("button", { className: "primary-button", disabled: !y }, a ? "Working…" : t ? "Save" : "Hire"))
    )
  );
}
const bt = "hermes-crew:detail-width";
function qa() {
  try {
    const t = window.localStorage?.getItem(bt), n = t ? Number.parseInt(t, 10) : Number.NaN;
    return Number.isFinite(n) ? Math.max(280, n) : 360;
  } catch {
    return 360;
  }
}
function Ha({ client: t, notify: n }) {
  const a = Kt(t, { notify: n }), [r, i] = S(""), [u, l] = S([]), [C, m] = S([]), [s, b] = S([]), [c, o] = S(!1), [h, y] = S([]), [d, $] = S(!1), [P, _] = S({ id: "all", types: [] }), [L, V] = S(null), [B, X] = S([]), [k, F] = S([]), [Q, J] = S(!1), [ee, re] = S("chat"), [g, O] = S(qa), [te, ge] = S(!1), [pe, j] = S(), [se, oe] = S(!1), [Y, le] = S(), [ie, ce] = S(0), [ye, ae] = S({ text: "", nonce: 0 }), { agents: x, conversations: f, selectedAgent: N, selectedAgentId: R, selectedThreadId: H } = a, z = fe(() => f.filter((v) => v.kind === "group"), [f]), w = fe(() => new Map(x.map((v) => [v.id, v])), [x]), M = fe(
    () => f.find((v) => v.id === H),
    [f, H]
  ), E = a.approvals.filter((v) => v.status === "pending").length;
  U(() => {
    try {
      window.localStorage?.setItem(bt, String(g));
    } catch {
    }
  }, [g]);
  const T = Ee(() => {
    t.listSections().then(l).catch(() => l([]));
  }, [t]);
  U(T, [T, x.length]), U(() => {
    if (!R) {
      m([]);
      return;
    }
    let v = !0;
    return t.listRoutines(R).then((A) => {
      v && m(A);
    }).catch(() => {
      v && m([]);
    }), () => {
      v = !1;
    };
  }, [t, R]), U(() => {
    if (!R) {
      b([]);
      return;
    }
    let v = !0;
    return t.listGrants(R).then((A) => {
      v && b(A);
    }).catch(() => {
      v && b([]);
    }), () => {
      v = !1;
    };
  }, [t, R]);
  const q = Ee(() => {
    if (!R) {
      X([]);
      return;
    }
    t.listArtifacts(R).then(X).catch(() => X([]));
  }, [t, R]);
  U(q, [q]);
  const p = N?.status;
  U(() => {
    p !== "working" && q();
  }, [p, q]), U(() => {
    if (!R) {
      F([]);
      return;
    }
    let v = !0;
    return t.listTasks(R).then((A) => {
      v && F(A);
    }).catch(() => {
      v && F([]);
    }), () => {
      v = !1;
    };
  }, [t, R, p]);
  const D = Ee((v, A) => {
    if (!R) {
      y([]), V(null);
      return;
    }
    $(!0), t.listAuditEvents({
      agentId: R,
      eventTypes: v,
      beforeId: A,
      limit: 50
    }).then((ne) => {
      y((ue) => A ? [...ue, ...ne.events] : ne.events), V(ne.nextBeforeId);
    }).catch(() => {
      A || (y([]), V(null));
    }).finally(() => $(!1));
  }, [t, R]);
  U(() => {
    D(P.types);
  }, [D, P]), U(() => {
    E > 0 && J(!0);
  }, [E]), U(() => {
    const v = (A) => {
      (A.metaKey || A.ctrlKey) && A.key.toLowerCase() === "k" && (A.preventDefault(), ge((ne) => !ne));
    };
    return window.addEventListener("keydown", v), () => window.removeEventListener("keydown", v);
  }, []);
  const W = (v, A) => {
    const ne = u.map((ue) => ue.id === v ? { ...ue, collapsed: A } : ue);
    l(ne), t.saveSections(ne).then(l).catch(T);
  }, G = (v, A) => {
    if (A === "edit") {
      le(void 0), j({ editing: v });
      return;
    }
    if (A === "duplicate") {
      a.duplicateAgent(v.id).catch(() => {
      });
      return;
    }
    window.confirm(`Remove ${v.name} from the crew? Their profile, memory and skills stay on disk.`) && a.deleteAgent(v.id).catch(() => {
    });
  }, he = async (v) => {
    oe(!0), le(void 0);
    try {
      pe?.editing ? await a.updateAgent(pe.editing.id, { role: v.role, emoji: v.emoji }) : await a.createAgent({
        name: v.name,
        role: v.role,
        emoji: v.emoji,
        modelProviderId: v.modelProviderId || void 0
      }), j(void 0), T();
    } catch (A) {
      le(A instanceof Error ? A.message : "That did not work.");
    } finally {
      oe(!1);
    }
  }, Z = fe(() => ({
    onDecide: (v, A) => {
      a.respondToApproval(v, A).catch(() => {
      });
    },
    // A login request is the one chip that is an instruction to the operator,
    // so its button does the thing rather than pointing at where the thing is.
    onOpenScreen: () => {
      J(!0), a.openComputer("takeover").catch(() => {
      });
    },
    onSubmitSecret: async (v, A) => {
      N && await t.submitSecret(N.id, v, A);
    },
    screenshotUrl: (v, A) => t.screenshotUrl(v, A)
  }), [t, a]);
  return a.loading ? /* @__PURE__ */ e.createElement("div", { className: "crew-workspace is-loading", role: "status" }, "Loading your crew…") : x.length ? /* @__PURE__ */ e.createElement("div", { className: "crew-workspace" }, /* @__PURE__ */ e.createElement(
    Pn,
    {
      agents: x,
      sections: u,
      rooms: z,
      selectedAgentId: R,
      selectedThreadId: H,
      search: r,
      onSearch: i,
      onSelectAgent: (v) => {
        a.setSelectedAgentId(v), ce((A) => A + 1);
      },
      onSelectThread: (v) => {
        a.setSelectedThreadId(v), ce((A) => A + 1);
      },
      onAction: G,
      onCreate: () => {
        le(void 0), j({});
      },
      onToggleSection: W,
      view: ee,
      onChangeView: re
    }
  ), ee === "spaces" ? /* @__PURE__ */ e.createElement(La, { client: t, agents: x }) : /* @__PURE__ */ e.createElement(
    aa,
    {
      agent: N,
      thread: M,
      agentsById: w,
      messages: a.messages,
      activities: a.activities,
      chips: Z,
      loading: a.conversationLoading,
      focusRequest: ie,
      draft: ye,
      onSend: (v) => a.sendMessage(v).catch(() => {
      }),
      onToggleDetails: () => J((v) => !v)
    }
  ), Q && N && /* @__PURE__ */ e.createElement(
    xa,
    {
      open: Q,
      width: g,
      onResize: O,
      agentName: N.name,
      agentRole: N.role,
      computer: a.computer,
      approvals: a.approvals,
      routines: C,
      grants: s,
      grantsBusy: c,
      audit: h,
      auditLoading: d,
      auditView: P.id,
      auditHasMore: L !== null,
      artifacts: B,
      artifactUrl: (v) => t.artifactUrl(v),
      tasks: k,
      proactive: N.proactive !== !1,
      onSetProactive: (v) => a.updateAgent(N.id, { proactive: v }),
      onApproval: (v, A, ne, ue) => a.respondToApproval(v, A, ne, ue),
      onComputerAction: (v) => a.openComputer(v),
      onDraft: (v) => ae((A) => ({ text: v, nonce: A.nonce + 1 })),
      onDeleteRoutine: async (v) => {
        await t.deleteRoutine(N.id, v), m((A) => A.filter((ne) => ne.id !== v));
      },
      onSetGrant: async (v, A) => {
        o(!0);
        try {
          const ne = await t.setGrant({ agentId: N.id, tool: v, mode: A });
          b((ue) => ue.map((ke) => ke.tool === v ? { ...ke, ...ne } : ke));
        } finally {
          o(!1);
        }
      },
      onClearGrant: async (v) => {
        o(!0);
        try {
          const A = await t.clearGrant(N.id, v);
          b((ne) => ne.map((ue) => ue.tool === v ? { ...ue, ...A } : ue));
        } finally {
          o(!1);
        }
      },
      onChangeAuditView: (v, A) => _({ id: v, types: A }),
      onLoadMoreAudit: () => {
        L !== null && D(P.types, L);
      },
      onClose: () => J(!1)
    }
  ), /* @__PURE__ */ e.createElement(
    $n,
    {
      open: te,
      agents: x,
      rooms: z,
      onClose: () => ge(!1),
      onSelectAgent: a.setSelectedAgentId,
      onSelectThread: a.setSelectedThreadId,
      onCreateAgent: () => {
        le(void 0), j({});
      },
      onComputer: () => J(!0)
    }
  ), pe && /* @__PURE__ */ e.createElement(
    st,
    {
      editing: pe.editing,
      providers: a.modelProviders,
      busy: se,
      error: Y,
      onSubmit: he,
      onClose: () => j(void 0)
    }
  ), a.error && /* @__PURE__ */ e.createElement("div", { className: "crew-toast", role: "alert" }, /* @__PURE__ */ e.createElement("span", null, a.error), /* @__PURE__ */ e.createElement("button", { className: "icon-button", "aria-label": "Dismiss", onClick: a.dismissError }, "×"))) : /* @__PURE__ */ e.createElement("div", { className: "crew-workspace is-empty" }, /* @__PURE__ */ e.createElement("div", { className: "crew-empty-card" }, /* @__PURE__ */ e.createElement("h2", null, "No teammates yet"), /* @__PURE__ */ e.createElement("p", null, "A teammate is a Hermes profile with a thread, a memory and a computer of its own. Give one a name and a one-line job to start."), /* @__PURE__ */ e.createElement("button", { className: "primary-button", onClick: () => {
    le(void 0), j({});
  } }, "Hire your first teammate")), pe && /* @__PURE__ */ e.createElement(
    st,
    {
      providers: a.modelProviders,
      busy: se,
      error: Y,
      onSubmit: he,
      onClose: () => j(void 0)
    }
  ));
}
const Le = 500, ja = 15e3;
function Va(t, n) {
  return t === 401 || t === 403 ? new we("unauthorized", n) : t === 404 ? new we("not_found", n) : t === 409 ? new we("conflict", n) : new we("unknown", n, t >= 500);
}
function Fa(t) {
  const n = new URL(t, globalThis.location?.href ?? "http://127.0.0.1");
  return n.protocol = n.protocol === "https:" ? "wss:" : "ws:", n.pathname = `${n.pathname.replace(/\/+$/, "")}/v1/events`, n.toString();
}
class Ba {
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
    const a = n.eventsUrl ?? Fa(this.baseUrl);
    this.resolveEventsUrl = typeof a == "function" ? a : async () => a, this.fetchImpl = n.fetchImpl ?? ((r, i) => fetch(r, i)), this.headers = n.headers ?? (() => ({}));
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
    } catch (i) {
      throw i instanceof DOMException && i.name === "AbortError" ? i : new we("network", "Could not reach the crew backend.", !0);
    }
    if (!r.ok) {
      const i = await r.json().then((u) => u?.detail).catch(() => {
      });
      throw Va(r.status, i ?? `Crew request failed (${r.status})`);
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
  submitSecret(n, a, r, i) {
    return this.request(
      `/bots/${encodeURIComponent(n)}/secret`,
      { method: "POST", body: JSON.stringify({ ref: a, value: r }), signal: i }
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
  async setSpaceMember(n, a, r, i) {
    await this.request(
      `/spaces/${encodeURIComponent(n)}/members/${encodeURIComponent(a)}`,
      { method: r ? "PUT" : "DELETE", signal: i }
    );
  }
  listPages(n, a = "", r) {
    const i = a.trim() ? `?query=${encodeURIComponent(a.trim())}` : "";
    return this.request(
      `/spaces/${encodeURIComponent(n)}/pages${i}`,
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
  patchPage(n, a, r, i) {
    return this.request(
      `/spaces/${encodeURIComponent(n)}/pages/${encodeURIComponent(a)}`,
      { method: "PATCH", body: JSON.stringify(r), signal: i }
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
    const i = r.toString();
    return this.request(`/audit${i ? `?${i}` : ""}`, { signal: a });
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
    const r = (i) => {
      "threadId" in i && i.threadId && i.threadId !== n || a(i);
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
      this.reconnectTimer = void 0, this.reconnectDelay = Math.min(this.reconnectDelay * 2, ja), this.openSocket();
    }, this.reconnectDelay));
  }
  closeSocket() {
    this.reconnectTimer && (clearTimeout(this.reconnectTimer), this.reconnectTimer = void 0), this.opening = !1;
    const n = this.socket;
    this.socket = void 0, n && (n.onclose = null, n.onerror = null, n.close());
  }
}
const ot = "/api/plugins/hermes-crew", it = window.__HERMES_PLUGIN_SDK__, Wa = new Ba({
  baseUrl: ot,
  // The SDK's authed fetch, not the global one. Its own contract says plugins
  // must not hand-read the session token, and this is what keeps loopback,
  // gated-OAuth and server-internal modes all working from one bundle.
  fetchImpl: (t, n) => it.authedFetch(t, n),
  // A resolver, not a string: in gated mode `buildWsUrl` mints a single-use
  // ticket, so the URL has to be rebuilt for every connect and reconnect.
  eventsUrl: () => it.buildWsUrl(`${ot}/v1/events`)
});
function Ga(t) {
  try {
    if (typeof Notification > "u" || Notification.permission !== "granted" || document.visibilityState === "visible") return;
    new Notification(t.title, { body: t.body });
  } catch {
  }
}
function Ya() {
  return /* @__PURE__ */ e.createElement(Ha, { client: Wa, notify: Ga });
}
export {
  Ya as C,
  e as R,
  De as S,
  S as a,
  U as b,
  Ut as c,
  fe as d,
  K as e,
  je as f,
  Ka as g,
  Ie as h,
  At as i,
  _t as j,
  xt as k,
  Ee as l,
  Ot as m,
  Pe as n,
  vt as r,
  $t as u
};

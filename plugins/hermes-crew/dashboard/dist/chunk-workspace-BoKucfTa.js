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
  useCallback: ve,
  useContext: Mt,
  useDebugValue: Tt,
  useDeferredValue: _t,
  useEffect: U,
  useId: xt,
  useImperativeHandle: At,
  useInsertionEffect: It,
  useLayoutEffect: Pe,
  useMemo: he,
  useOptimistic: Ot,
  useReducer: Rt,
  useRef: B,
  useState: N,
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
  useCallback: ve,
  useContext: Mt,
  useDebugValue: Tt,
  useDeferredValue: _t,
  useEffect: U,
  useId: xt,
  useImperativeHandle: At,
  useInsertionEffect: It,
  useLayoutEffect: Pe,
  useMemo: he,
  useOptimistic: Ot,
  useReducer: Rt,
  useRef: B,
  useState: N,
  useSyncExternalStore: Dt,
  useTransition: Lt,
  version: $t
}, Symbol.toStringTag, { value: "Module" }));
class ye extends Error {
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
const Ue = 6e4, zt = 3e4, _e = "optimistic-user:", we = "optimistic-agent:";
function Ut(t, n = {}) {
  const { enabled: r = !0, notify: s } = n, [u, h] = N([]), [l, C] = N(""), [m, o] = N(""), [k, c] = N([]), [a, p] = N([]), [v, d] = N([]), [R, I] = N([]), [D, $] = N(), [K, E] = N("connecting"), [q, ee] = N([]), [ne, J] = N(r), [re, Z] = N(), [W, V] = N(() => /* @__PURE__ */ new Set()), [ue, ae] = N(""), [ce, pe] = N(0), F = B(/* @__PURE__ */ new Map()), te = B(l), Y = B(/* @__PURE__ */ new Set()), X = B(/* @__PURE__ */ new Map()), me = B(s), Q = he(
    () => u.find((w) => w.id === l),
    [u, l]
  ), se = m || (l ? `dm:${l}` : ""), oe = !!(l && !W.has(l));
  U(() => {
    te.current = l;
  }, [l]), U(() => {
    me.current = s;
  }, [s]);
  const S = ve(async (w = !1) => {
    const T = await t.listAgents();
    for (const g of Y.current)
      T.some((i) => i.id === g) || Y.current.delete(g);
    const L = T.filter((g) => !Y.current.has(g.id)), j = te.current, O = L.find((g) => g.id === j), y = F.current.get(j);
    O?.lastMessagePreview && y && !y.messages.some((g) => g.streaming) && Ne(y.messages) !== O.lastMessagePreview && (F.current.set(j, { ...y, cachedAt: 0 }), pe((i) => i + 1));
    const b = !!y?.messages.some((g) => g.streaming);
    return h((g) => L.map((i) => {
      const x = g.find((f) => f.id === i.id), _ = Ne(F.current.get(i.id)?.messages ?? []), P = !!_ || i.id === j && b;
      return {
        ...i,
        lastMessagePreview: P ? _ || x?.lastMessagePreview : i.lastMessagePreview ?? x?.lastMessagePreview
      };
    })), C((g) => g && L.some((i) => i.id === g) || w ? g : L[0]?.id || ""), L;
  }, [t]), H = ve(async () => {
    const w = await t.listModelProviders();
    return ee(w.providers), w.providers;
  }, [t]);
  return U(() => {
    if (!r) {
      h([]), ee([]), C(""), o(""), p([]), d([]), I([]), $(void 0), E("disconnected"), J(!1), Z(void 0);
      return;
    }
    let w = !0;
    return J(!0), Promise.all([S(), H()]).then(() => {
      w && (E("connected"), J(!1));
    }).catch((T) => {
      w && (E("error"), Z(T instanceof Error ? T.message : "Could not load the crew"), J(!1));
    }), () => {
      w = !1;
    };
  }, [r, S, H]), U(() => {
    if (!r) return;
    const w = () => {
      document.visibilityState === "hidden" || !navigator.onLine || S().catch(() => {
      });
    }, T = () => {
      document.visibilityState === "visible" && w();
    }, L = window.setInterval(w, zt);
    return window.addEventListener("focus", w), window.addEventListener("online", w), document.addEventListener("visibilitychange", T), () => {
      window.clearInterval(L), window.removeEventListener("focus", w), window.removeEventListener("online", w), document.removeEventListener("visibilitychange", T);
    };
  }, [r, S]), U(() => {
    o("");
  }, [l]), U(() => {
    if (!r) return;
    const w = F.current.get(l);
    if (w ? (p(w.messages), d(w.activities), I(w.approvals), $(w.computer), c(w.conversations)) : (p([]), d([]), I([]), $(void 0), c([])), ae(""), !l) return;
    const T = w ? Date.now() - w.cachedAt : Number.POSITIVE_INFINITY;
    if (w && T < Ue && !m) {
      w.messages.some((y) => y.streaming) && ae(l);
      const O = window.setTimeout(() => pe((y) => y + 1), Ue - T);
      return () => window.clearTimeout(O);
    }
    const L = new AbortController();
    let j = !0;
    return Promise.all([
      t.listConversations(l, L.signal),
      t.listApprovalRequests(l, L.signal),
      t.getComputer(l, L.signal)
    ]).then(async ([O, y, b]) => {
      const g = m ? O.find((z) => z.id === m) ?? O[0] : O[0], i = g ? await t.getConversation(g.id, L.signal) : void 0;
      if (!j || Y.current.has(l)) return;
      const x = F.current.get(l)?.messages ?? [], _ = (i?.messages ?? []).map((z) => {
        const ie = X.current.get(z.id);
        return ie ? { ...z, id: ie } : z;
      }), P = x.filter(
        (z) => z.id.startsWith(_e) || z.id.startsWith(we)
      ), f = [
        ..._,
        ...P.filter((z) => !_.some((ie) => ie.id === z.id))
      ], M = Ne(f), G = i?.activities ?? [];
      F.current.set(l, {
        messages: f,
        activities: G,
        approvals: y,
        conversations: O,
        computer: b,
        cachedAt: Date.now()
      }), V((z) => new Set(z).add(l)), p(f), d(G), I(y), $(b), c(O), ae(l), M && h((z) => z.map((ie) => ie.id === l ? { ...ie, lastMessagePreview: M } : ie));
    }).catch((O) => {
      !j || Y.current.has(l) || O instanceof DOMException && O.name === "AbortError" || (F.current.set(l, {
        messages: [],
        activities: [],
        approvals: [],
        conversations: [],
        cachedAt: Date.now()
      }), V((y) => new Set(y).add(l)), p([]), Z(O instanceof Error ? O.message : "Could not load this teammate"));
    }), () => {
      j = !1, L.abort();
    };
  }, [t, r, ce, l, m]), U(() => {
    if (!r || !l || D?.status === "online") return;
    let w = !0;
    const T = async () => {
      try {
        const j = await t.getComputer(l);
        if (!w || te.current !== l) return;
        $(j);
        const O = F.current.get(l);
        O && F.current.set(l, { ...O, computer: j });
      } catch {
      }
    }, L = window.setInterval(() => {
      T();
    }, 2e3);
    return T(), () => {
      w = !1, window.clearInterval(L);
    };
  }, [t, D?.status, r, l]), U(() => {
    if (!r || !se || ue !== l) return;
    let w = !0;
    const T = l, L = (y) => {
      const b = F.current.get(T);
      F.current.set(T, {
        messages: b?.messages ?? [],
        activities: b?.activities ?? [],
        approvals: b?.approvals ?? [],
        conversations: b?.conversations ?? [],
        computer: b?.computer,
        cachedAt: Date.now(),
        ...y
      });
    }, j = (y) => p((b) => {
      const g = y(b);
      return L({ messages: g }), g;
    }), O = t.subscribeToConversationEvents(se, (y) => {
      if (w) {
        if (y.type === "message.created" && j((b) => {
          let g = y.message;
          const i = X.current.get(y.message.id);
          if (i && (g = { ...y.message, id: i }), y.message.role === "user" && !i) {
            const _ = new Set(X.current.values()), P = b.find((f) => f.id.startsWith(_e) && !_.has(f.id) && ze(f) === ze(y.message));
            P && (X.current.set(y.message.id, P.id), g = { ...y.message, id: P.id });
          }
          if (y.message.role === "agent" && !i) {
            const _ = new Set(X.current.values()), P = b.find((f) => f.id.startsWith(we) && !_.has(f.id));
            P && (X.current.set(y.message.id, P.id), g = { ...y.message, id: P.id });
          }
          return b.find((_) => _.id === g.id) ? b.map((_) => _.id === g.id ? g : _) : [...b, g];
        }), y.type === "message.delta" && j((b) => {
          let g = X.current.get(y.messageId);
          if (!g) {
            const i = new Set(X.current.values()), x = b.find((_) => _.id.startsWith(we) && !i.has(_.id));
            x && (g = x.id, X.current.set(y.messageId, g));
          }
          return g ??= y.messageId, b.some((i) => i.id === g) ? b.map((i) => i.id === g ? {
            ...i,
            parts: i.parts.map((x, _) => _ === 0 && x.type === "text" ? { ...x, text: x.text + y.delta } : x)
          } : i) : [...b, {
            id: g,
            conversationId: se,
            role: "agent",
            parts: [{ type: "text", text: y.delta }],
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            streaming: !0
          }];
        }), y.type === "message.completed") {
          const b = X.current.get(y.messageId) ?? y.messageId;
          y.notify === !1 ? j((g) => g.flatMap((i) => i.id !== b ? [i] : i.id.startsWith(we) ? [{
            ...i,
            parts: i.parts.map((x) => x.type === "text" ? { ...x, text: "" } : x),
            streaming: !0
          }] : [])) : (j((g) => {
            const i = g.filter((_) => _.id === b || _.role !== "agent" || !_.streaming).map((_) => _.id === b ? { ..._, streaming: !1 } : _), x = Ne(i);
            return x && h((_) => _.map((P) => P.id === T ? { ...P, lastMessagePreview: x } : P)), i;
          }), me.current?.({
            title: `${Q?.name ?? "Your teammate"} finished`,
            body: "There is something new to read."
          }));
        }
        if (y.type === "message.dropped") {
          const b = X.current.get(y.messageId) ?? y.messageId;
          j((g) => g.filter((i) => i.id !== b));
        }
        y.type === "message.updated" && (j((b) => {
          const g = X.current.get(y.message.id), i = g ? { ...y.message, id: g } : y.message, x = b.find((P) => P.id === i.id), _ = y.message.role === "agent" && !y.message.streaming ? b.filter((P) => P.id === i.id || P.role !== "agent" || !P.streaming) : b;
          return x ? _.map((P) => P.id === i.id ? i : P) : [..._, i];
        }), y.message.role === "agent" && !y.message.streaming && h((b) => b.map((g) => g.id === T ? { ...g, lastMessagePreview: Xe(y.message) || void 0 } : g))), y.type === "approval.updated" && (I((b) => {
          const g = b.some((i) => i.id === y.approval.id) ? b.map((i) => i.id === y.approval.id ? y.approval : i) : [y.approval, ...b];
          return L({ approvals: g }), g;
        }), y.approval.status === "pending" && me.current?.({
          title: `${Q?.name ?? "Your teammate"} needs you`,
          body: y.approval.title
        })), y.type === "activity.updated" && d((b) => {
          const g = b.some((i) => i.id === y.activity.id) ? b.map((i) => i.id === y.activity.id ? y.activity : i) : [...b, y.activity];
          return L({ activities: g }), g;
        }), y.type === "agent.status" && h((b) => b.map((g) => g.id === y.agentId ? { ...g, status: y.status } : g)), y.type === "connection.changed" && E(y.state);
      }
    });
    return () => {
      w = !1, O.unsubscribe();
    };
  }, [t, se, r, ue, Q?.name, l]), {
    agents: u,
    conversations: k,
    modelProviders: q,
    selectedAgent: Q,
    selectedAgentId: l,
    setSelectedAgentId: C,
    selectedThreadId: se,
    setSelectedThreadId: o,
    messages: a,
    activities: v,
    approvals: R,
    computer: D,
    connection: K,
    loading: ne,
    conversationLoading: oe,
    error: re,
    refreshAgents: S,
    refreshModelProviders: H,
    dismissError: () => Z(void 0),
    createAgent: async (w) => {
      const T = await t.createAgent(w);
      return await S(!0), C(T.id), T;
    },
    updateAgent: async (w, T) => {
      await t.updateAgent(w, T), await S(!0);
    },
    duplicateAgent: async (w) => {
      const T = await t.duplicateAgent(w);
      await S(!0), C(T.id);
    },
    deleteAgent: async (w) => {
      const T = u.find((b) => b.id === w), L = l;
      if (!T || Y.current.has(w)) return;
      const j = u.findIndex((b) => b.id === w), O = u.filter((b) => b.id !== w), y = L === w ? O[Math.min(Math.max(j, 0), Math.max(O.length - 1, 0))]?.id ?? "" : L;
      Y.current.add(w), h(O), C(y);
      try {
        try {
          await t.deleteAgent(w);
        } catch (b) {
          if (!(b instanceof ye && b.code === "not_found")) throw b;
        }
        F.current.delete(w), V((b) => {
          const g = new Set(b);
          return g.delete(w), g;
        }), await S();
      } catch (b) {
        throw Y.current.delete(w), h((g) => {
          if (g.some((x) => x.id === w)) return g;
          const i = [...g];
          return i.splice(Math.min(j, i.length), 0, T), i;
        }), C((g) => g || (L === w ? w : g)), Z(b instanceof Error ? b.message : "Could not remove this teammate"), b;
      }
    },
    sendMessage: async (w) => {
      if (!se || !l) return;
      const T = l, L = se, j = `${Date.now()}:${Math.random().toString(36).slice(2)}`, O = `${_e}${j}`, y = `${we}${j}`, b = (/* @__PURE__ */ new Date()).toISOString(), g = {
        id: O,
        conversationId: L,
        role: "user",
        parts: [{ type: "text", text: w }],
        createdAt: b
      }, i = {
        id: y,
        conversationId: L,
        role: "agent",
        parts: [{ type: "text", text: "" }],
        createdAt: b,
        streaming: !0
      }, x = F.current.get(T) ?? {
        messages: [],
        activities: [],
        approvals: [],
        conversations: [],
        cachedAt: Date.now()
      }, _ = [...x.messages].reverse().find((M) => M.role === "agent" && M.streaming), f = [..._ ? x.messages.map((M) => M.id === _.id ? { ...M, streaming: !1, interrupted: !0 } : M) : x.messages, g, i];
      te.current === T && d([]), F.current.set(T, { ...x, messages: f, activities: [], cachedAt: Date.now() }), te.current === T && (p(f), ae(T));
      try {
        const M = await t.sendMessage({ conversationId: L, text: w });
        X.current.set(M.id, O);
        const G = M.id.match(/^(.+):user(?:$|:)/)?.[1];
        G && (X.current.set(`${G}:user`, O), X.current.set(`${G}:agent`, _?.id ?? y));
        const z = F.current.get(T) ?? x, ie = { ...M, id: O }, ge = z.messages.map((ke) => ke.id === O ? ie : ke).filter((ke, dt, ut) => ut.findIndex((mt) => mt.id === ke.id) === dt);
        F.current.set(T, { ...z, messages: ge, cachedAt: Date.now() }), te.current === T && p(ge);
      } catch (M) {
        const G = F.current.get(T) ?? x, z = G.messages.filter((ge) => ge.id !== y), ie = z.some((ge) => ge.id === O) ? z : [...z, g];
        throw F.current.set(T, { ...G, messages: ie, cachedAt: Date.now() }), te.current === T && p(ie), _ || Z(M instanceof Error ? M.message : "Could not send that"), M;
      }
    },
    respondToApproval: async (w, T, L, j) => {
      const O = l, y = await t.respondToApproval({ requestId: w, decision: T, note: L, contentHash: j }), b = F.current.get(O), g = (b?.approvals ?? []).map((i) => i.id === y.id ? y : i);
      b && F.current.set(O, { ...b, approvals: g, cachedAt: Date.now() }), te.current === O && I(g);
    },
    openComputer: async (w) => {
      if (!l) throw new Error("No teammate is selected");
      try {
        return await (w === "open" ? t.openComputer(l) : t.takeOverComputer(l));
      } catch (T) {
        throw Z(T instanceof Error ? T.message : "Could not open that computer"), T;
      }
    },
    reconnect: async () => {
      E("connecting");
      try {
        await t.reconnect(), await S(), E("connected");
      } catch (w) {
        E("error"), Z(w instanceof Error ? w.message : "Reconnect failed");
      }
    }
  };
}
const qt = (t) => t.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), Je = (...t) => t.filter((n, r, s) => !!n && n.trim() !== "" && s.indexOf(n) === r).join(" ").trim();
var Ht = {
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
    className: u = "",
    children: h,
    iconNode: l,
    ...C
  }, m) => Ce(
    "svg",
    {
      ref: m,
      ...Ht,
      width: n,
      height: n,
      stroke: t,
      strokeWidth: s ? Number(r) * 24 / Number(n) : r,
      className: Je("lucide", u),
      ...C
    },
    [
      ...l.map(([o, k]) => Ce(o, k)),
      ...Array.isArray(h) ? h : [h]
    ]
  )
);
const A = (t, n) => {
  const r = Le(
    ({ className: s, ...u }, h) => Ce(jt, {
      ref: h,
      iconNode: n,
      className: Je(`lucide-${qt(t)}`, s),
      ...u
    })
  );
  return r.displayName = `${t}`, r;
};
const Vt = A("Archive", [
  ["rect", { width: "20", height: "5", x: "2", y: "3", rx: "1", key: "1wp1u1" }],
  ["path", { d: "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8", key: "1s80jp" }],
  ["path", { d: "M10 12h4", key: "a56b0p" }]
]);
const Ft = A("ArrowDown", [
  ["path", { d: "M12 5v14", key: "s699le" }],
  ["path", { d: "m19 12-7 7-7-7", key: "1idqje" }]
]);
const Bt = A("Ban", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m4.9 4.9 14.2 14.2", key: "1m5liu" }]
]);
const Wt = A("Bot", [
  ["path", { d: "M12 8V4H8", key: "hb8ula" }],
  ["rect", { width: "16", height: "12", x: "4", y: "8", rx: "2", key: "enze0r" }],
  ["path", { d: "M2 14h2", key: "vft8re" }],
  ["path", { d: "M20 14h2", key: "4cs60a" }],
  ["path", { d: "M15 13v2", key: "1xurst" }],
  ["path", { d: "M9 13v2", key: "rq6x2g" }]
]);
const Me = A("Check", [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]]);
const Gt = A("ChevronDown", [
  ["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]
]);
const Ae = A("ChevronRight", [
  ["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]
]);
const Kt = A("ChevronsRight", [
  ["path", { d: "m6 17 5-5-5-5", key: "xnjwq" }],
  ["path", { d: "m13 17 5-5-5-5", key: "17xmmf" }]
]);
const Ie = A("CircleCheck", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
]);
const Ze = A("CircleDashed", [
  ["path", { d: "M10.1 2.182a10 10 0 0 1 3.8 0", key: "5ilxe3" }],
  ["path", { d: "M13.9 21.818a10 10 0 0 1-3.8 0", key: "11zvb9" }],
  ["path", { d: "M17.609 3.721a10 10 0 0 1 2.69 2.7", key: "1iw5b2" }],
  ["path", { d: "M2.182 13.9a10 10 0 0 1 0-3.8", key: "c0bmvh" }],
  ["path", { d: "M20.279 17.609a10 10 0 0 1-2.7 2.69", key: "1ruxm7" }],
  ["path", { d: "M21.818 10.1a10 10 0 0 1 0 3.8", key: "qkgqxc" }],
  ["path", { d: "M3.721 6.391a10 10 0 0 1 2.7-2.69", key: "1mcia2" }],
  ["path", { d: "M6.391 20.279a10 10 0 0 1-2.69-2.7", key: "1fvljs" }]
]);
const Yt = A("CircleHelp", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3", key: "1u773s" }],
  ["path", { d: "M12 17h.01", key: "p32p05" }]
]);
const Qe = A("Clock", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["polyline", { points: "12 6 12 12 16 14", key: "68esgv" }]
]);
const Oe = A("Cloud", [
  ["path", { d: "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z", key: "p7xjir" }]
]);
const Xt = A("Copy", [
  ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2", key: "17jyea" }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2", key: "zix9uf" }]
]);
const Jt = A("CornerDownRight", [
  ["polyline", { points: "15 10 20 15 15 20", key: "1q7qjw" }],
  ["path", { d: "M4 4v7a4 4 0 0 0 4 4h12", key: "z08zvw" }]
]);
const Zt = A("Database", [
  ["ellipse", { cx: "12", cy: "5", rx: "9", ry: "3", key: "msslwz" }],
  ["path", { d: "M3 5V19A9 3 0 0 0 21 19V5", key: "1wlel7" }],
  ["path", { d: "M3 12A9 3 0 0 0 21 12", key: "mv7ke4" }]
]);
const Qt = A("Download", [
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
  ["polyline", { points: "7 10 12 15 17 10", key: "2ggqvy" }],
  ["line", { x1: "12", x2: "12", y1: "15", y2: "3", key: "1vk2je" }]
]);
const en = A("Earth", [
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
const tn = A("Ellipsis", [
  ["circle", { cx: "12", cy: "12", r: "1", key: "41hilf" }],
  ["circle", { cx: "19", cy: "12", r: "1", key: "1wjl8i" }],
  ["circle", { cx: "5", cy: "12", r: "1", key: "1pcz8c" }]
]);
const nn = A("FileCode2", [
  ["path", { d: "M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4", key: "1pf5j1" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "m5 12-3 3 3 3", key: "oke12k" }],
  ["path", { d: "m9 18 3-3-3-3", key: "112psh" }]
]);
const rn = A("FileSpreadsheet", [
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
const et = A("File", [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }]
]);
const an = A("Globe", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20", key: "13o1zl" }],
  ["path", { d: "M2 12h20", key: "9i4pu4" }]
]);
const qe = A("Hand", [
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
const sn = A("Hourglass", [
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
const on = A("Image", [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2", key: "1m3agn" }],
  ["circle", { cx: "9", cy: "9", r: "2", key: "af1f0g" }],
  ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21", key: "1xmnt7" }]
]);
const He = A("KeyRound", [
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
const cn = A("Lock", [
  ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2", key: "1w4ew1" }],
  ["path", { d: "M7 11V7a5 5 0 0 1 10 0v4", key: "fwvmzm" }]
]);
const ln = A("Mail", [
  ["rect", { width: "20", height: "16", x: "2", y: "4", rx: "2", key: "18n3k1" }],
  ["path", { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7", key: "1ocrg3" }]
]);
const dn = A("Maximize2", [
  ["polyline", { points: "15 3 21 3 21 9", key: "mznyad" }],
  ["polyline", { points: "9 21 3 21 3 15", key: "1avn1i" }],
  ["line", { x1: "21", x2: "14", y1: "3", y2: "10", key: "ota7mn" }],
  ["line", { x1: "3", x2: "10", y1: "21", y2: "14", key: "1atl0r" }]
]);
const un = A("Minimize2", [
  ["polyline", { points: "4 14 10 14 10 20", key: "11kfnr" }],
  ["polyline", { points: "20 10 14 10 14 4", key: "rlmsce" }],
  ["line", { x1: "14", x2: "21", y1: "10", y2: "3", key: "o5lafz" }],
  ["line", { x1: "3", x2: "10", y1: "21", y2: "14", key: "1atl0r" }]
]);
const tt = A("Monitor", [
  ["rect", { width: "20", height: "14", x: "2", y: "3", rx: "2", key: "48i651" }],
  ["line", { x1: "8", x2: "16", y1: "21", y2: "21", key: "1svkeh" }],
  ["line", { x1: "12", x2: "12", y1: "17", y2: "21", key: "vw1qmm" }]
]);
const mn = A("Pencil", [
  [
    "path",
    {
      d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
      key: "1a8usu"
    }
  ],
  ["path", { d: "m15 5 4 4", key: "1mk7zo" }]
]);
const nt = A("Plus", [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "M12 5v14", key: "s699le" }]
]);
const pn = A("Presentation", [
  ["path", { d: "M2 3h20", key: "91anmk" }],
  ["path", { d: "M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3", key: "2k9sn8" }],
  ["path", { d: "m7 21 5-5 5 5", key: "bip4we" }]
]);
const hn = A("RotateCcw", [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }]
]);
const rt = A("Search", [
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
  ["path", { d: "m21 21-4.3-4.3", key: "1qie3q" }]
]);
const je = A("Settings2", [
  ["path", { d: "M20 7h-9", key: "3s1dr2" }],
  ["path", { d: "M14 17H5", key: "gfn3mx" }],
  ["circle", { cx: "17", cy: "17", r: "3", key: "18b49y" }],
  ["circle", { cx: "7", cy: "7", r: "3", key: "dfmy0x" }]
]);
const Re = A("ShieldAlert", [
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
const fn = A("ShieldCheck", [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      key: "oel41y"
    }
  ],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
]);
const gn = A("ShieldX", [
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
const yn = A("Terminal", [
  ["polyline", { points: "4 17 10 11 4 5", key: "akl6gq" }],
  ["line", { x1: "12", x2: "20", y1: "19", y2: "19", key: "q2wloq" }]
]);
const at = A("Trash2", [
  ["path", { d: "M3 6h18", key: "d0wm0j" }],
  ["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", key: "4alrt4" }],
  ["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2", key: "v07s0e" }],
  ["line", { x1: "10", x2: "10", y1: "11", y2: "17", key: "1uufr5" }],
  ["line", { x1: "14", x2: "14", y1: "11", y2: "17", key: "xtxkd" }]
]);
const vn = A("TriangleAlert", [
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
const wn = A("User", [
  ["path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", key: "975kel" }],
  ["circle", { cx: "12", cy: "7", r: "4", key: "17ys0d" }]
]);
const En = A("Users", [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }],
  ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }],
  ["path", { d: "M16 3.13a4 4 0 0 1 0 7.75", key: "1da9ce" }]
]);
const bn = A("X", [
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
const Nn = $e(async () => ({ default: (await import("./chunk-mermaid-HWGCJPDP-D3ORwgP-.js").then((t) => t.i)).Streamdown })), Ve = {
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
  selectedThreadId: u,
  search: h,
  onSearch: l,
  onSelectAgent: C,
  onSelectThread: m,
  onAction: o,
  onCreate: k,
  onToggleSection: c
}) {
  const [a, p] = N();
  U(() => {
    if (!a) return;
    const E = () => p(void 0);
    return window.addEventListener("pointerdown", E), () => window.removeEventListener("pointerdown", E);
  }, [a]);
  const v = (E, q) => {
    p(void 0), o(E, q);
  }, d = h.trim().toLowerCase(), R = (E) => !d || `${E.name} ${E.role}`.toLowerCase().includes(d), I = he(() => new Map(t.map((E) => [E.id, E])), [t]), D = n.map((E) => ({
    section: E,
    members: E.bot_ids.map((q) => I.get(q)).filter((q) => !!q && R(q))
  })).filter((E) => E.members.length > 0), $ = !d && D.length > 1, K = (E) => /* @__PURE__ */ e.createElement(
    "div",
    {
      key: E.id,
      className: `agent-row ${s === E.id && !u.startsWith("group:") ? "selected" : ""} ${E.status === "working" ? "is-working" : ""}`
    },
    /* @__PURE__ */ e.createElement("button", { className: "agent-select", onClick: () => C(E.id) }, /* @__PURE__ */ e.createElement(st, { agent: E }), /* @__PURE__ */ e.createElement("span", { className: "agent-copy" }, /* @__PURE__ */ e.createElement("strong", null, /* @__PURE__ */ e.createElement("span", null, E.name), /* @__PURE__ */ e.createElement("span", { className: `agent-status ${E.status}`, title: Ve[E.status], "aria-label": Ve[E.status] })), E.workingOn ? /* @__PURE__ */ e.createElement("span", { className: "agent-preview agent-working-on" }, E.workingOn) : E.lastMessagePreview && /* @__PURE__ */ e.createElement("span", { className: "agent-preview agent-preview-entering" }, /* @__PURE__ */ e.createElement(De, { fallback: E.lastMessagePreview }, /* @__PURE__ */ e.createElement(Nn, { className: "agent-preview-markdown", mode: "static", controls: !1, linkSafety: { enabled: !0 }, skipHtml: !0 }, E.lastMessagePreview))))),
    /* @__PURE__ */ e.createElement(
      "button",
      {
        className: "agent-more",
        "aria-label": `More actions for ${E.name}`,
        onPointerDown: (q) => q.stopPropagation(),
        onClick: () => p((q) => q === E.id ? void 0 : E.id)
      },
      /* @__PURE__ */ e.createElement(tn, { size: 15 })
    ),
    a === E.id && /* @__PURE__ */ e.createElement("div", { className: "agent-menu", role: "menu", onPointerDown: (q) => q.stopPropagation() }, /* @__PURE__ */ e.createElement("button", { role: "menuitem", onClick: () => v(E, "edit") }, /* @__PURE__ */ e.createElement(mn, { size: 13 }), " Edit"), /* @__PURE__ */ e.createElement("button", { role: "menuitem", onClick: () => v(E, "duplicate") }, /* @__PURE__ */ e.createElement(Xt, { size: 13 }), " Duplicate"), /* @__PURE__ */ e.createElement("div", null), /* @__PURE__ */ e.createElement("button", { role: "menuitem", className: "danger-text", onClick: () => v(E, "delete") }, /* @__PURE__ */ e.createElement(at, { size: 13 }), " Remove from crew"))
  );
  return /* @__PURE__ */ e.createElement("aside", { className: "agent-sidebar" }, /* @__PURE__ */ e.createElement("div", { className: "sidebar-titlebar" }, /* @__PURE__ */ e.createElement("span", { className: "sidebar-title" }, "Crew"), /* @__PURE__ */ e.createElement("button", { className: "brand-add", "aria-label": "Hire a teammate", onClick: k }, /* @__PURE__ */ e.createElement(nt, { size: 18 }))), /* @__PURE__ */ e.createElement("label", { className: "search" }, /* @__PURE__ */ e.createElement(rt, { size: 15 }), /* @__PURE__ */ e.createElement("input", { "aria-label": "Search the crew", placeholder: "Search your crew", value: h, onChange: (E) => l(E.target.value) })), /* @__PURE__ */ e.createElement("div", { className: "agent-list" }, t.length === 0 && /* @__PURE__ */ e.createElement("div", { className: "agent-list-empty" }, "No teammates yet"), t.length > 0 && D.length === 0 && /* @__PURE__ */ e.createElement("div", { className: "agent-list-empty" }, "No teammates found"), $ ? D.map(({ section: E, members: q }) => /* @__PURE__ */ e.createElement("section", { className: "agent-section", key: E.id }, /* @__PURE__ */ e.createElement(
    "button",
    {
      className: `agent-section-header ${E.collapsed ? "is-collapsed" : ""}`,
      "aria-expanded": !E.collapsed,
      onClick: () => c(E.id, !E.collapsed)
    },
    /* @__PURE__ */ e.createElement(Ae, { size: 13, className: "agent-section-chevron" }),
    /* @__PURE__ */ e.createElement("span", null, E.name),
    /* @__PURE__ */ e.createElement("small", null, q.length)
  ), !E.collapsed && q.map(K))) : D.flatMap((E) => E.members).map(K), r.length > 0 && /* @__PURE__ */ e.createElement("section", { className: "agent-section", key: "__rooms__" }, /* @__PURE__ */ e.createElement("div", { className: "agent-section-header is-static" }, /* @__PURE__ */ e.createElement("span", null, "Rooms"), /* @__PURE__ */ e.createElement("small", null, r.length)), r.map((E) => /* @__PURE__ */ e.createElement("div", { key: E.id, className: `agent-row ${u === E.id ? "selected" : ""}` }, /* @__PURE__ */ e.createElement("button", { className: "agent-select", onClick: () => m(E.id) }, /* @__PURE__ */ e.createElement("span", { className: "agent-avatar", role: "img", "aria-label": `${E.title} room` }, E.emoji || "👥"), /* @__PURE__ */ e.createElement("span", { className: "agent-copy" }, /* @__PURE__ */ e.createElement("strong", null, /* @__PURE__ */ e.createElement("span", null, E.title)), /* @__PURE__ */ e.createElement("span", { className: "agent-preview" }, E.lastMessagePreview || E.subtitle))))))));
}
function Cn({
  open: t,
  agents: n,
  rooms: r,
  onClose: s,
  onSelectAgent: u,
  onSelectThread: h,
  onCreateAgent: l,
  onComputer: C
}) {
  const [m, o] = N(""), k = B(null);
  U(() => {
    t && (o(""), window.setTimeout(() => k.current?.focus(), 0));
  }, [t]);
  const a = he(() => [
    { id: "create", label: "Hire a teammate", detail: "Add someone to the crew", icon: nt, run: l },
    { id: "computer", label: "Open their computer", detail: "The current teammate's screen", icon: tt, run: C },
    ...n.map((v) => ({
      id: `agent-${v.id}`,
      label: v.name,
      detail: `${v.role} · ${v.status.replaceAll("_", " ")}`,
      icon: Wt,
      run: () => u(v.id)
    })),
    ...r.map((v) => ({
      id: `room-${v.id}`,
      label: v.title,
      detail: v.subtitle || "Room",
      icon: En,
      run: () => h(v.id)
    }))
  ], [n, r, C, l, u, h]).filter((v) => `${v.label} ${v.detail}`.toLowerCase().includes(m.toLowerCase()));
  if (!t) return null;
  const p = (v) => {
    v.run(), s();
  };
  return /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "palette-backdrop",
      role: "presentation",
      onMouseDown: (v) => {
        v.target === v.currentTarget && s();
      }
    },
    /* @__PURE__ */ e.createElement("section", { className: "command-palette", role: "dialog", "aria-modal": "true", "aria-label": "Command palette" }, /* @__PURE__ */ e.createElement("label", null, /* @__PURE__ */ e.createElement(rt, { size: 17 }), /* @__PURE__ */ e.createElement(
      "input",
      {
        ref: k,
        "aria-label": "Search the crew and commands",
        placeholder: "Search your crew…",
        value: m,
        onChange: (v) => o(v.target.value),
        onKeyDown: (v) => {
          v.key === "Escape" && s(), v.key === "Enter" && a[0] && p(a[0]);
        }
      }
    ), /* @__PURE__ */ e.createElement("kbd", null, "esc")), /* @__PURE__ */ e.createElement("div", { className: "palette-results" }, a.length ? a.map((v, d) => {
      const R = v.icon;
      return /* @__PURE__ */ e.createElement("button", { key: v.id, className: d === 0 ? "active" : "", onClick: () => p(v) }, /* @__PURE__ */ e.createElement("span", null, /* @__PURE__ */ e.createElement(R, { size: 16 })), /* @__PURE__ */ e.createElement("div", null, /* @__PURE__ */ e.createElement("strong", null, v.label), /* @__PURE__ */ e.createElement("small", null, v.detail)), d === 0 && /* @__PURE__ */ e.createElement("kbd", null, "↵"));
    }) : /* @__PURE__ */ e.createElement("p", null, "Nothing matches that")), /* @__PURE__ */ e.createElement("footer", null, /* @__PURE__ */ e.createElement("span", null, "Crew"), /* @__PURE__ */ e.createElement("span", null, /* @__PURE__ */ e.createElement("kbd", null, "⌘"), /* @__PURE__ */ e.createElement("kbd", null, "K"), " to open")))
  );
}
const Mn = /(?<![\w.-])@([\w一-鿿][\w一-鿿-]{0,63})/g;
function Ee(t) {
  return t.replace(/[\s_-]+/g, "").trim().toLowerCase();
}
function Tn(t, n, r) {
  if (!n?.length || !t) return [{ text: t }];
  const s = /* @__PURE__ */ new Map();
  for (const l of n) s.has(Ee(l)) || s.set(Ee(l), l);
  for (const l of r)
    n.includes(l.id) && (s.has(Ee(l.name)) || s.set(Ee(l.name), l.id));
  const u = [];
  let h = 0;
  for (const l of t.matchAll(Mn)) {
    const C = s.get(Ee(l[1]));
    !C || l.index === void 0 || (l.index > h && u.push({ text: t.slice(h, l.index) }), u.push({ text: l[0], agentId: C }), h = l.index + l[0].length);
  }
  return h < t.length && u.push({ text: t.slice(h) }), u.length ? u : [{ text: t }];
}
function fe({ label: t, kind: n = "", children: r }) {
  return /* @__PURE__ */ e.createElement("div", { className: `crew-chip ${n}` }, t && /* @__PURE__ */ e.createElement("div", { className: "crew-chip-label" }, t), r);
}
function _n({ payload: t }) {
  return /* @__PURE__ */ e.createElement(fe, { kind: "report" }, (t.lines ?? []).map((n, r) => /* @__PURE__ */ e.createElement("div", { className: "crew-report-line", key: r }, /* @__PURE__ */ e.createElement("span", { className: "crew-report-check" }, /* @__PURE__ */ e.createElement(Me, { size: 13 })), /* @__PURE__ */ e.createElement("span", { className: "crew-report-system" }, n.system), /* @__PURE__ */ e.createElement("span", { className: "crew-report-arrow" }, "→"), /* @__PURE__ */ e.createElement("span", null, n.result, n.count && /* @__PURE__ */ e.createElement("span", { className: "crew-report-count" }, " · ", n.count)))), t.closing && /* @__PURE__ */ e.createElement("div", { className: "crew-report-closing" }, t.closing));
}
function xn({ payload: t, onDecide: n }) {
  const r = t.status === "approved" || t.status === "discarded";
  return /* @__PURE__ */ e.createElement("div", { className: `crew-chip approval ${r ? "resolved" : ""}` }, /* @__PURE__ */ e.createElement("div", { className: "crew-chip-label" }, /* @__PURE__ */ e.createElement(Re, { size: 13 }), " ", r ? "Decided" : "Needs you"), /* @__PURE__ */ e.createElement("div", { className: "crew-approval-action" }, t.action), t.detail && /* @__PURE__ */ e.createElement("div", { className: "crew-approval-detail" }, t.detail), r ? /* @__PURE__ */ e.createElement("div", { className: "crew-approval-outcome" }, t.status === "approved" ? "Approved" : "Discarded") : /* @__PURE__ */ e.createElement("div", { className: "crew-approval-buttons" }, /* @__PURE__ */ e.createElement("button", { className: "crew-btn danger", onClick: () => n(String(t.approval_id), "deny") }, "Discard"), /* @__PURE__ */ e.createElement("button", { className: "crew-btn primary", onClick: () => n(String(t.approval_id), "allow") }, "Approve")));
}
function An({ payload: t }) {
  return /* @__PURE__ */ e.createElement(fe, { label: "You decided" }, /* @__PURE__ */ e.createElement("div", { className: "crew-approval-action" }, t.action), /* @__PURE__ */ e.createElement("div", { className: "crew-approval-outcome" }, t.status === "approved" ? "Approved" : "Discarded"));
}
function In({ payload: t }) {
  return t.proposal ? /* @__PURE__ */ e.createElement(fe, { label: t.kind === "conflicting" ? "Rules disagree" : "Rule may be stale" }, /* @__PURE__ */ e.createElement("div", { className: "crew-memory-note" }, t.note), /* @__PURE__ */ e.createElement("ul", { className: "crew-memory-entries" }, (t.entries || []).map((n, r) => /* @__PURE__ */ e.createElement("li", { key: r }, n))), t.why && /* @__PURE__ */ e.createElement("div", { className: "crew-memory-why" }, t.why)) : t.tidied ? /* @__PURE__ */ e.createElement(fe, { label: "Memory tidied" }, /* @__PURE__ */ e.createElement("div", { className: "crew-memory-note" }, t.note)) : /* @__PURE__ */ e.createElement(fe, { label: "Memory updated" }, /* @__PURE__ */ e.createElement("div", { className: "crew-memory-rule" }, t.rule), t.diff && /* @__PURE__ */ e.createElement("pre", { className: "crew-memory-diff" }, t.diff));
}
function On({ payload: t }) {
  return /* @__PURE__ */ e.createElement(fe, { label: "Routine created" }, /* @__PURE__ */ e.createElement("div", { className: "crew-routine-name" }, /* @__PURE__ */ e.createElement(Qe, { size: 13 }), " ", t.name), /* @__PURE__ */ e.createElement("div", { className: "crew-routine-when" }, t.human || t.cron));
}
function Rn({ payload: t }) {
  return /* @__PURE__ */ e.createElement(fe, { label: `Handed over by @${t.from_name || t.from || "a teammate"}` }, /* @__PURE__ */ e.createElement("div", { className: "crew-botref-body" }, /* @__PURE__ */ e.createElement(Jt, { size: 13 }), " ", t.content));
}
function Dn({ payload: t, onOpenScreen: n, onSubmitSecret: r }) {
  const [s, u] = N(""), [h, l] = N("");
  if (t.field && t.ref) {
    const C = t.ref, m = async () => {
      if (s) {
        l("sending");
        try {
          await r(C, s), u(""), l("sent");
        } catch {
          u(""), l("failed");
        }
      }
    };
    return /* @__PURE__ */ e.createElement(fe, { label: "Needs one thing from you" }, /* @__PURE__ */ e.createElement("div", { className: "crew-login-site" }, /* @__PURE__ */ e.createElement(He, { size: 13 }), " The ", t.field, " for ", t.site || "a site"), t.why && /* @__PURE__ */ e.createElement("div", { className: "crew-login-why" }, t.why), h === "sent" ? /* @__PURE__ */ e.createElement("div", { className: "crew-login-why" }, "Typed into the page. ", t.site, " should move on now.") : /* @__PURE__ */ e.createElement("form", { className: "crew-secret-row", onSubmit: (o) => {
      o.preventDefault(), m();
    } }, /* @__PURE__ */ e.createElement(
      "input",
      {
        type: "password",
        autoComplete: "off",
        placeholder: t.field,
        value: s,
        onChange: (o) => u(o.target.value)
      }
    ), /* @__PURE__ */ e.createElement("button", { className: "crew-btn", type: "submit", disabled: !s || h === "sending" }, h === "sending" ? "Typing…" : "Type it in")), h === "failed" && /* @__PURE__ */ e.createElement("div", { className: "crew-login-why" }, "That did not reach the screen — nothing was typed. Try taking the wheel instead."));
  }
  return /* @__PURE__ */ e.createElement(fe, { label: "Needs you at the keyboard" }, /* @__PURE__ */ e.createElement("div", { className: "crew-login-site" }, /* @__PURE__ */ e.createElement(He, { size: 13 }), " Sign in to ", t.site || "a site"), t.why && /* @__PURE__ */ e.createElement("div", { className: "crew-login-why" }, t.why), /* @__PURE__ */ e.createElement("button", { className: "crew-btn", onClick: n }, "Take the wheel"));
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
      return /* @__PURE__ */ e.createElement(In, { payload: s });
    case "routine_created":
      return /* @__PURE__ */ e.createElement(On, { payload: s });
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
const Pn = $e(async () => ({ default: (await import("./chunk-mermaid-HWGCJPDP-D3ORwgP-.js").then((t) => t.i)).Streamdown })), zn = {
  browser: en,
  terminal: yn,
  file: be,
  handoff: Oe,
  status: Oe
};
function Un(t) {
  return t.parts.filter((n) => n.type === "text").map((n) => n.text).join("");
}
const qn = (t) => {
  const n = Math.max(0, Math.floor(t / 1e3)), r = Math.floor(n / 60);
  return r ? `${r}m ${n % 60}s` : `${n}s`;
};
function Hn() {
  return /* @__PURE__ */ e.createElement("svg", { "aria-hidden": "true", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ e.createElement("path", { d: "m5 12 7-7 7 7" }), /* @__PURE__ */ e.createElement("path", { d: "M12 19V5" }));
}
function jn() {
  return /* @__PURE__ */ e.createElement("svg", { className: "stop-icon", "aria-hidden": "true", viewBox: "0 0 24 24" }, /* @__PURE__ */ e.createElement("rect", { x: "7.5", y: "7.5", width: "9", height: "9", rx: "1.5", fill: "currentColor" }));
}
function Vn(t) {
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
function Fn({ agent: t, label: n, activities: r, startedAt: s }) {
  const [u, h] = N(0), [l, C] = N(!1);
  return U(() => {
    h(Date.now());
    const m = window.setInterval(() => h(Date.now()), 1e3);
    return () => window.clearInterval(m);
  }, []), /* @__PURE__ */ e.createElement("details", { className: "agent-working-details", open: l }, /* @__PURE__ */ e.createElement(
    "summary",
    {
      role: "status",
      "aria-label": `${t?.name ?? "This teammate"} is working: ${n}`,
      onClick: (m) => {
        m.preventDefault(), C((o) => !o);
      }
    },
    /* @__PURE__ */ e.createElement("span", { className: "agent-working-progress" }, "Working for ", qn(u - Date.parse(s))),
    /* @__PURE__ */ e.createElement(Ae, { className: "agent-working-chevron", size: 15 })
  ), r.length > 0 && /* @__PURE__ */ e.createElement("div", { className: "agent-working-tools" }, r.map((m) => {
    const o = zn[m.kind] ?? Oe;
    return /* @__PURE__ */ e.createElement("details", { className: `agent-tool-detail ${m.status}`, key: m.id }, /* @__PURE__ */ e.createElement("summary", null, /* @__PURE__ */ e.createElement(o, { size: 14 }), /* @__PURE__ */ e.createElement("span", null, m.title), /* @__PURE__ */ e.createElement(Ae, { size: 13 })), /* @__PURE__ */ e.createElement("div", null, m.output ?? (m.status === "running" ? "Waiting for result…" : "No output")));
  })));
}
function Bn({
  message: t,
  agent: n,
  senderName: r,
  activities: s,
  chips: u,
  entering: h = !1,
  room: l = []
}) {
  const C = Un(t), m = B(null), o = B(!!t.streaming), k = s.filter((d) => d.conversationId === t.conversationId), c = [...k].reverse().find((d) => d.status === "running") ?? k.at(-1), a = t.role === "agent" && !!t.streaming, p = C.trim() || c?.title || "Working", v = t.parts.filter((d) => d.type === "chip");
  return Pe(() => {
    const d = m.current, R = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (d && t.role === "agent" && o.current && !t.streaming && !R) {
      const I = d.querySelector(".message-body");
      I && typeof I.animate == "function" && I.animate(
        [{ opacity: 0, transform: "translate3d(-6px,4px,0)" }, { opacity: 1, transform: "translate3d(0,0,0)" }],
        { duration: 260, easing: "cubic-bezier(.2,.82,.3,1)" }
      );
    }
    o.current = !!t.streaming;
  }, [h, t.role, t.streaming]), /* @__PURE__ */ e.createElement("div", { className: `message ${t.role} ${h ? "message-entering" : ""}`, ref: m }, t.interrupted && /* @__PURE__ */ e.createElement("div", { className: "agent-interrupted" }, "Interrupted"), r && t.role === "agent" && /* @__PURE__ */ e.createElement("div", { className: "message-sender" }, r), !a && (C || t.streaming && !v.length) && /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "message-body",
      onClick: t.role === "agent" ? Vn : void 0
    },
    t.role === "agent" ? /* @__PURE__ */ e.createElement(De, { fallback: /* @__PURE__ */ e.createElement("span", { className: "agent-markdown-fallback" }, C) }, /* @__PURE__ */ e.createElement(
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
      C
    )) : Tn(C, t.mentions, l).map((d, R) => d.agentId ? /* @__PURE__ */ e.createElement("mark", { key: R, className: "mention", title: `Asked ${l.find((I) => I.id === d.agentId)?.name ?? d.agentId} directly` }, d.text) : /* @__PURE__ */ e.createElement("span", { key: R }, d.text))
  ), a && /* @__PURE__ */ e.createElement(
    Fn,
    {
      agent: n,
      label: p,
      activities: k,
      startedAt: t.createdAt
    }
  ), v.map((d, R) => /* @__PURE__ */ e.createElement(
    $n,
    {
      key: `${t.id}:${R}`,
      kind: d.kind,
      payload: d.payload,
      handlers: u
    }
  )));
}
function Wn({
  agent: t,
  thread: n,
  agentsById: r,
  messages: s,
  activities: u,
  chips: h,
  loading: l = !1,
  focusRequest: C = 0,
  onSend: m,
  onToggleDetails: o
}) {
  const [k, c] = N(""), [a, p] = N(!1), [v, d] = N(!1), [R, I] = N(!1), [D, $] = N(!1), K = B(null), E = B(null), q = B(null), ee = B(!1), ne = B(!0), J = B(!1), re = B(0), Z = B(0), W = B(void 0), V = B(void 0), ue = B(/* @__PURE__ */ new Set()), ae = B(n?.id ?? ""), ce = B(l), [pe, F] = N(() => /* @__PURE__ */ new Set()), te = n?.title || t?.name || "Crew", Y = n?.kind === "group", X = (n?.members ?? []).map((S) => r.get(S)).filter((S) => !!S), me = n?.id ?? t?.id ?? "";
  Pe(() => {
    const S = ae.current !== me || ce.current;
    if (ae.current = me, ce.current = l, l || S) {
      ue.current = new Set(s.map((w) => w.id)), F(/* @__PURE__ */ new Set());
      return;
    }
    const H = s.filter((w) => !ue.current.has(w.id)).map((w) => w.id);
    for (const w of H) ue.current.add(w);
    F(new Set(H));
  }, [me, l, s]);
  function Q(S) {
    const H = K.current;
    !H || typeof H.scrollTo != "function" || (ne.current = !0, J.current = !0, I(!1), W.current && window.clearTimeout(W.current), re.current = Math.max(
      re.current,
      Date.now() + (S === "smooth" ? 650 : 150)
    ), H.scrollTo({ top: H.scrollHeight, behavior: S }), W.current = window.setTimeout(() => {
      W.current = void 0, J.current = !1;
    }, S === "smooth" ? 400 : 0));
  }
  U(() => {
    ne.current = !0, J.current = !1, Z.current = 0, I(!1), requestAnimationFrame(() => Q("auto"));
  }, [me]), U(() => {
    ne.current && Q("smooth");
  }, [s]), U(() => {
    const S = K.current, H = E.current;
    if (!S || !H || typeof ResizeObserver > "u") return;
    const w = new ResizeObserver(() => {
      ne.current && Q("auto");
    });
    return w.observe(H), () => w.disconnect();
  }, [me, l]), U(() => () => {
    V.current && window.clearTimeout(V.current), W.current && window.clearTimeout(W.current);
  }, []), U(() => {
    C > 0 && q.current?.focus();
  }, [me, C]);
  function se() {
    J.current || Date.now() < re.current || ($(!0), V.current && window.clearTimeout(V.current), V.current = window.setTimeout(() => {
      V.current = void 0, $(!1);
    }, 700));
  }
  async function oe(S) {
    S.preventDefault();
    const H = k.trim();
    if (!(!H || ee.current)) {
      ee.current = !0, c(""), p(!0);
      try {
        await m(H);
      } finally {
        ee.current = !1, p(!1);
      }
    }
  }
  return /* @__PURE__ */ e.createElement("main", { className: "conversation" }, /* @__PURE__ */ e.createElement("header", { className: `conversation-header ${v ? "scrolled" : ""}` }, /* @__PURE__ */ e.createElement("h1", null, n?.emoji && /* @__PURE__ */ e.createElement("span", { className: "conversation-emoji" }, n.emoji), te), n?.subtitle && /* @__PURE__ */ e.createElement("p", { className: "conversation-subtitle" }, n.subtitle), /* @__PURE__ */ e.createElement("div", { className: "header-actions" }, !Y && /* @__PURE__ */ e.createElement("button", { className: "computer-trigger", "aria-label": "Open this teammate's computer", onClick: o }, /* @__PURE__ */ e.createElement(tt, { size: 18 })))), /* @__PURE__ */ e.createElement("div", { className: "conversation-scroll-shell" }, l ? /* @__PURE__ */ e.createElement("div", { className: "conversation-skeleton", role: "status", "aria-label": "Loading this thread" }, /* @__PURE__ */ e.createElement("div", { className: "skeleton-message skeleton-agent" }, /* @__PURE__ */ e.createElement("span", { className: "skeleton-line skeleton-line-wide" }), /* @__PURE__ */ e.createElement("span", { className: "skeleton-line" })), /* @__PURE__ */ e.createElement("div", { className: "skeleton-message skeleton-user" }, /* @__PURE__ */ e.createElement("span", { className: "skeleton-bubble" })), /* @__PURE__ */ e.createElement("div", { className: "skeleton-message skeleton-agent" }, /* @__PURE__ */ e.createElement("span", { className: "skeleton-line skeleton-line-short" }))) : /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement(
    "div",
    {
      className: `message-scroll ${D ? "scrollbar-visible" : ""}`,
      ref: K,
      onWheelCapture: (S) => {
        S.deltaY < 0 && (J.current = !1);
      },
      onScroll: (S) => {
        const H = S.currentTarget, w = H.scrollHeight - H.scrollTop - H.clientHeight, T = w <= 24, L = H.scrollTop < Z.current - 1;
        Z.current = H.scrollTop, d(H.scrollTop > 0), L && w > 72 ? (J.current = !1, ne.current = !1, I(!0)) : !J.current && T ? (ne.current = !0, I(!1)) : !J.current && w > 72 && (ne.current = !1, I(!0)), se();
      },
      onPointerMove: (S) => {
        S.currentTarget.getBoundingClientRect().right - S.clientX <= 14 ? $(!0) : V.current || $(!1);
      },
      onPointerLeave: () => $(!1)
    },
    /* @__PURE__ */ e.createElement("div", { className: "message-content", ref: E }, s.length === 0 && t && /* @__PURE__ */ e.createElement("div", { className: "conversation-intro" }, /* @__PURE__ */ e.createElement(st, { agent: t, size: 54 }), /* @__PURE__ */ e.createElement("h2", null, t.name), /* @__PURE__ */ e.createElement("p", null, t.role)), s.map((S) => /* @__PURE__ */ e.createElement(
      Bn,
      {
        key: S.id,
        message: S,
        agent: t,
        senderName: Y ? r.get(S.sender ?? "")?.name : void 0,
        room: X,
        activities: u,
        chips: h,
        entering: pe.has(S.id) || S.id.startsWith("optimistic-user:")
      }
    )))
  ), R && /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "scroll-to-bottom",
      "aria-label": "Scroll to the latest message",
      onClick: () => Q("smooth")
    },
    /* @__PURE__ */ e.createElement(Ft, { size: 20 })
  ))), /* @__PURE__ */ e.createElement("form", { className: "composer", onSubmit: oe }, /* @__PURE__ */ e.createElement(
    "textarea",
    {
      ref: q,
      "aria-label": `Message ${te}`,
      placeholder: Y ? "Ask the room…" : `Message ${te}…`,
      value: k,
      onChange: (S) => c(S.target.value),
      onKeyDown: (S) => {
        S.key === "Enter" && !S.shiftKey && !S.nativeEvent.isComposing && S.keyCode !== 229 && (S.preventDefault(), S.currentTarget.form?.requestSubmit());
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
    a ? /* @__PURE__ */ e.createElement(jn, null) : /* @__PURE__ */ e.createElement(Hn, null)
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
  "tool.allowed": Ie,
  "tool.refused": gn,
  "tool.held": qe,
  "tool.failed": vn,
  "approval.decided": Ie,
  "approval.expired": Qe,
  "grant.changed": je,
  "crew.policy_loaded": je,
  "crew.bot_declined": qe
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
function Jn({ events: t, loading: n, viewId: r, onChangeView: s, onLoadMore: u, hasMore: h }) {
  const [l, C] = N(() => /* @__PURE__ */ new Set()), m = he(() => t.slice().sort((o, k) => k.id - o.id), [t]);
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
    const k = Kn[o.event_type] ?? Ie, c = l.has(o.id), a = o.event_type === "tool.refused" || o.event_type === "tool.held";
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
          "aria-expanded": c,
          onClick: () => C((p) => {
            const v = new Set(p);
            return v.delete(o.id) || v.add(o.id), v;
          })
        },
        /* @__PURE__ */ e.createElement(k, { size: 14 }),
        /* @__PURE__ */ e.createElement("span", { className: "audit-subject" }, o.subject || o.tool || o.event_type),
        /* @__PURE__ */ e.createElement("span", { className: "audit-kind" }, Yn[o.event_type] ?? o.event_type),
        /* @__PURE__ */ e.createElement("time", { className: "audit-when", dateTime: new Date(o.created_at).toISOString() }, Xn(o.created_at))
      ),
      c && /* @__PURE__ */ e.createElement("dl", { className: "audit-detail" }, o.tool && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Tool"), /* @__PURE__ */ e.createElement("dd", null, /* @__PURE__ */ e.createElement("code", null, o.tool))), o.detail && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Why"), /* @__PURE__ */ e.createElement("dd", null, o.detail)), o.actor !== "_system" && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Who"), /* @__PURE__ */ e.createElement("dd", null, o.actor === "_operator" ? "you" : o.actor)), o.duration_ms !== null && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Took"), /* @__PURE__ */ e.createElement("dd", null, o.duration_ms, " ms")), o.args_digest && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Arguments"), /* @__PURE__ */ e.createElement("dd", null, /* @__PURE__ */ e.createElement("code", null, o.args_digest))))
    );
  })), h && /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "secondary-button",
      disabled: n,
      onClick: u
    },
    n ? "Loading…" : "Show older"
  ));
}
const Zn = {
  slides: pn,
  document: be,
  sheet: rn,
  image: on,
  data: Zt,
  text: be,
  code: nn,
  archive: Vt,
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
    const u = Zn[s.kind] ?? et, h = s.size === 0;
    return /* @__PURE__ */ e.createElement("li", { className: `files-row ${h ? "is-empty" : ""}`, key: s.id }, /* @__PURE__ */ e.createElement(
      "a",
      {
        href: r(s),
        download: s.name,
        className: "files-link"
      },
      /* @__PURE__ */ e.createElement(u, { size: 15 }),
      /* @__PURE__ */ e.createElement("span", { className: "files-name", title: s.path }, s.name),
      /* @__PURE__ */ e.createElement("span", { className: "files-meta" }, Qn(s.size), h && /* @__PURE__ */ e.createElement("span", { className: "files-warning", title: "Nothing was written to this file" }, "didn't finish")),
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
  file: be,
  mail: ln,
  user: wn
};
function ar({ step: t }) {
  const n = nr[t.status] ?? Ze;
  return /* @__PURE__ */ e.createElement("li", { className: `plan-step is-${t.status}` }, /* @__PURE__ */ e.createElement(n, { size: 13, className: t.status === "running" ? "spin" : void 0 }), /* @__PURE__ */ e.createElement("span", { className: "plan-step-title" }, t.title), t.detail && /* @__PURE__ */ e.createElement("span", { className: "plan-step-detail" }, t.detail));
}
function sr({ item: t }) {
  const n = rr[t.kind] ?? be, r = t.url ? /* @__PURE__ */ e.createElement("a", { href: t.url, target: "_blank", rel: "noreferrer noopener" }, t.title) : /* @__PURE__ */ e.createElement("span", null, t.title);
  return /* @__PURE__ */ e.createElement("li", { className: "evidence-row" }, /* @__PURE__ */ e.createElement("div", { className: "evidence-head" }, /* @__PURE__ */ e.createElement(n, { size: 12 }), r), /* @__PURE__ */ e.createElement("p", { className: "evidence-excerpt" }, t.excerpt));
}
function or({ agentName: t, tasks: n }) {
  return n.length === 0 ? /* @__PURE__ */ e.createElement("p", { className: "plan-empty" }, t, " has no scheduled or long-running work.") : /* @__PURE__ */ e.createElement("div", { className: "plan-list" }, n.map((r) => /* @__PURE__ */ e.createElement("section", { className: "plan-task", key: r.id }, /* @__PURE__ */ e.createElement("div", { className: "plan-task-head" }, /* @__PURE__ */ e.createElement("span", { className: "plan-task-title" }, r.title || r.kind), /* @__PURE__ */ e.createElement("span", { className: `plan-task-status is-${r.status}` }, r.status.replace("_", " "))), r.attempts > 1 && /* @__PURE__ */ e.createElement("p", { className: "plan-task-attempts" }, "picked up ", r.attempts, " times"), r.error && /* @__PURE__ */ e.createElement("p", { className: "plan-task-error" }, r.error), r.plan.length > 0 && /* @__PURE__ */ e.createElement("ol", { className: "plan-steps" }, r.plan.map((s) => /* @__PURE__ */ e.createElement(ar, { step: s, key: s.id }))), r.evidence.length > 0 && /* @__PURE__ */ e.createElement("details", { className: "evidence" }, /* @__PURE__ */ e.createElement("summary", null, "What it read (", r.evidence.length, ")"), /* @__PURE__ */ e.createElement("ul", { className: "evidence-list" }, r.evidence.map((s, u) => /* @__PURE__ */ e.createElement(sr, { item: s, key: `${s.title}-${u}` })))))));
}
const ir = [
  { mode: "deny", label: "Never", icon: Bt },
  { mode: "ask", label: "Ask me", icon: Yt },
  { mode: "allow", label: "Allow", icon: fn }
];
function cr({ agentName: t, grants: n, busy: r, onSetGrant: s, onClearGrant: u }) {
  const [h, l] = N(""), [C, m] = N(!1), o = he(() => {
    const c = h.trim().toLowerCase(), a = n.filter((v) => C && v.source !== "grant" ? !1 : c ? v.tool.toLowerCase().includes(c) || v.toolset.toLowerCase().includes(c) : !0), p = /* @__PURE__ */ new Map();
    for (const v of a) {
      const d = v.toolset || "other";
      p.set(d, [...p.get(d) ?? [], v]);
    }
    return [...p.entries()].sort(([v], [d]) => v.localeCompare(d));
  }, [n, h, C]), k = n.filter((c) => c.mode === "ask").length;
  return /* @__PURE__ */ e.createElement("section", { className: "permissions-panel" }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow" }, /* @__PURE__ */ e.createElement(cn, { size: 14 }), " What ", t, " can do"), /* @__PURE__ */ e.createElement("p", { className: "permissions-summary" }, n.length, " tools · ", k, " need your say-so"), /* @__PURE__ */ e.createElement("div", { className: "permissions-filters" }, /* @__PURE__ */ e.createElement(
    "input",
    {
      type: "search",
      "aria-label": "Filter tools",
      placeholder: "Filter tools…",
      value: h,
      onChange: (c) => l(c.target.value)
    }
  ), /* @__PURE__ */ e.createElement("label", null, /* @__PURE__ */ e.createElement(
    "input",
    {
      type: "checkbox",
      checked: C,
      onChange: (c) => m(c.target.checked)
    }
  ), "Only what I changed")), o.length === 0 && /* @__PURE__ */ e.createElement("p", { className: "permissions-empty" }, "Nothing matches."), o.map(([c, a]) => /* @__PURE__ */ e.createElement("div", { className: "permissions-group", key: c }, /* @__PURE__ */ e.createElement("h4", null, c), a.map((p) => /* @__PURE__ */ e.createElement(
    "div",
    {
      className: `permissions-row ${p.protected ? "is-protected" : ""} ${p.available === !1 ? "is-unavailable" : ""}`,
      key: p.tool
    },
    /* @__PURE__ */ e.createElement("div", { className: "permissions-tool" }, /* @__PURE__ */ e.createElement("code", null, p.tool), /* @__PURE__ */ e.createElement("span", { className: "permissions-why" }, p.why)),
    /* @__PURE__ */ e.createElement("div", { className: "permissions-modes", role: "group", "aria-label": `What ${t} may do with ${p.tool}` }, ir.map(({ mode: v, label: d, icon: R }) => /* @__PURE__ */ e.createElement(
      "button",
      {
        key: v,
        type: "button",
        className: `permissions-mode ${p.mode === v ? "is-current" : ""}`,
        "aria-pressed": p.mode === v,
        disabled: r || p.protected,
        title: p.protected ? "This teammate always keeps this one" : d,
        onClick: () => {
          s(p.tool, v);
        }
      },
      /* @__PURE__ */ e.createElement(R, { size: 13 }),
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
          u(p.tool);
        }
      },
      /* @__PURE__ */ e.createElement(hn, { size: 13 })
    ))
  )))));
}
function Mr(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
function lr(t) {
  if (Object.prototype.hasOwnProperty.call(t, "__esModule")) return t;
  var n = t.default;
  if (typeof n == "function") {
    var r = function s() {
      var u = !1;
      try {
        u = this instanceof s;
      } catch {
      }
      return u ? Reflect.construct(n, arguments, this.constructor) : n.apply(this, arguments);
    };
    r.prototype = n.prototype;
  } else r = {};
  return Object.defineProperty(r, "__esModule", { value: !0 }), Object.keys(t).forEach(function(s) {
    var u = Object.getOwnPropertyDescriptor(t, s);
    Object.defineProperty(r, s, u.get ? u : {
      enumerable: !0,
      get: function() {
        return t[s];
      }
    });
  }), r;
}
var Se = { exports: {} }, le = {};
const ot = /* @__PURE__ */ lr(Pt);
var Fe;
function dr() {
  if (Fe) return le;
  Fe = 1;
  var t = ot;
  function n(m) {
    var o = "https://react.dev/errors/" + m;
    if (1 < arguments.length) {
      o += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var k = 2; k < arguments.length; k++)
        o += "&args[]=" + encodeURIComponent(arguments[k]);
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
  }, u = /* @__PURE__ */ Symbol.for("react.portal");
  function h(m, o, k) {
    var c = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: u,
      key: c == null ? null : "" + c,
      children: m,
      containerInfo: o,
      implementation: k
    };
  }
  var l = t.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function C(m, o) {
    if (m === "font") return "";
    if (typeof o == "string")
      return o === "use-credentials" ? o : "";
  }
  return le.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = s, le.createPortal = function(m, o) {
    var k = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!o || o.nodeType !== 1 && o.nodeType !== 9 && o.nodeType !== 11)
      throw Error(n(299));
    return h(m, o, null, k);
  }, le.flushSync = function(m) {
    var o = l.T, k = s.p;
    try {
      if (l.T = null, s.p = 2, m) return m();
    } finally {
      l.T = o, s.p = k, s.d.f();
    }
  }, le.preconnect = function(m, o) {
    typeof m == "string" && (o ? (o = o.crossOrigin, o = typeof o == "string" ? o === "use-credentials" ? o : "" : void 0) : o = null, s.d.C(m, o));
  }, le.prefetchDNS = function(m) {
    typeof m == "string" && s.d.D(m);
  }, le.preinit = function(m, o) {
    if (typeof m == "string" && o && typeof o.as == "string") {
      var k = o.as, c = C(k, o.crossOrigin), a = typeof o.integrity == "string" ? o.integrity : void 0, p = typeof o.fetchPriority == "string" ? o.fetchPriority : void 0;
      k === "style" ? s.d.S(
        m,
        typeof o.precedence == "string" ? o.precedence : void 0,
        {
          crossOrigin: c,
          integrity: a,
          fetchPriority: p
        }
      ) : k === "script" && s.d.X(m, {
        crossOrigin: c,
        integrity: a,
        fetchPriority: p,
        nonce: typeof o.nonce == "string" ? o.nonce : void 0
      });
    }
  }, le.preinitModule = function(m, o) {
    if (typeof m == "string")
      if (typeof o == "object" && o !== null) {
        if (o.as == null || o.as === "script") {
          var k = C(
            o.as,
            o.crossOrigin
          );
          s.d.M(m, {
            crossOrigin: k,
            integrity: typeof o.integrity == "string" ? o.integrity : void 0,
            nonce: typeof o.nonce == "string" ? o.nonce : void 0
          });
        }
      } else o == null && s.d.M(m);
  }, le.preload = function(m, o) {
    if (typeof m == "string" && typeof o == "object" && o !== null && typeof o.as == "string") {
      var k = o.as, c = C(k, o.crossOrigin);
      s.d.L(m, k, {
        crossOrigin: c,
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
  }, le.preloadModule = function(m, o) {
    if (typeof m == "string")
      if (o) {
        var k = C(o.as, o.crossOrigin);
        s.d.m(m, {
          as: typeof o.as == "string" && o.as !== "script" ? o.as : void 0,
          crossOrigin: k,
          integrity: typeof o.integrity == "string" ? o.integrity : void 0
        });
      } else s.d.m(m);
  }, le.requestFormReset = function(m) {
    s.d.r(m);
  }, le.unstable_batchedUpdates = function(m, o) {
    return m(o);
  }, le.useFormState = function(m, o, k) {
    return l.H.useFormState(m, o, k);
  }, le.useFormStatus = function() {
    return l.H.useHostTransitionStatus();
  }, le.version = "19.2.7", le;
}
var de = {};
var Be;
function ur() {
  return Be || (Be = 1, process.env.NODE_ENV !== "production" && (function() {
    function t() {
    }
    function n(c) {
      return "" + c;
    }
    function r(c, a, p) {
      var v = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
      try {
        n(v);
        var d = !1;
      } catch {
        d = !0;
      }
      return d && (console.error(
        "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
        typeof Symbol == "function" && Symbol.toStringTag && v[Symbol.toStringTag] || v.constructor.name || "Object"
      ), n(v)), {
        $$typeof: o,
        key: v == null ? null : "" + v,
        children: c,
        containerInfo: a,
        implementation: p
      };
    }
    function s(c, a) {
      if (c === "font") return "";
      if (typeof a == "string")
        return a === "use-credentials" ? a : "";
    }
    function u(c) {
      return c === null ? "`null`" : c === void 0 ? "`undefined`" : c === "" ? "an empty string" : 'something with type "' + typeof c + '"';
    }
    function h(c) {
      return c === null ? "`null`" : c === void 0 ? "`undefined`" : c === "" ? "an empty string" : typeof c == "string" ? JSON.stringify(c) : typeof c == "number" ? "`" + c + "`" : 'something with type "' + typeof c + '"';
    }
    function l() {
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
    var C = ot, m = {
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
    }, o = /* @__PURE__ */ Symbol.for("react.portal"), k = C.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    typeof Map == "function" && Map.prototype != null && typeof Map.prototype.forEach == "function" && typeof Set == "function" && Set.prototype != null && typeof Set.prototype.clear == "function" && typeof Set.prototype.forEach == "function" || console.error(
      "React depends on Map and Set built-in types. Make sure that you load a polyfill in older browsers. https://reactjs.org/link/react-polyfills"
    ), de.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = m, de.createPortal = function(c, a) {
      var p = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
      if (!a || a.nodeType !== 1 && a.nodeType !== 9 && a.nodeType !== 11)
        throw Error("Target container is not a DOM element.");
      return r(c, a, null, p);
    }, de.flushSync = function(c) {
      var a = k.T, p = m.p;
      try {
        if (k.T = null, m.p = 2, c)
          return c();
      } finally {
        k.T = a, m.p = p, m.d.f() && console.error(
          "flushSync was called from inside a lifecycle method. React cannot flush when React is already rendering. Consider moving this call to a scheduler task or micro task."
        );
      }
    }, de.preconnect = function(c, a) {
      typeof c == "string" && c ? a != null && typeof a != "object" ? console.error(
        "ReactDOM.preconnect(): Expected the `options` argument (second) to be an object but encountered %s instead. The only supported option at this time is `crossOrigin` which accepts a string.",
        h(a)
      ) : a != null && typeof a.crossOrigin != "string" && console.error(
        "ReactDOM.preconnect(): Expected the `crossOrigin` option (second argument) to be a string but encountered %s instead. Try removing this option or passing a string value instead.",
        u(a.crossOrigin)
      ) : console.error(
        "ReactDOM.preconnect(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
        u(c)
      ), typeof c == "string" && (a ? (a = a.crossOrigin, a = typeof a == "string" ? a === "use-credentials" ? a : "" : void 0) : a = null, m.d.C(c, a));
    }, de.prefetchDNS = function(c) {
      if (typeof c != "string" || !c)
        console.error(
          "ReactDOM.prefetchDNS(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
          u(c)
        );
      else if (1 < arguments.length) {
        var a = arguments[1];
        typeof a == "object" && a.hasOwnProperty("crossOrigin") ? console.error(
          "ReactDOM.prefetchDNS(): Expected only one argument, `href`, but encountered %s as a second argument instead. This argument is reserved for future options and is currently disallowed. It looks like the you are attempting to set a crossOrigin property for this DNS lookup hint. Browsers do not perform DNS queries using CORS and setting this attribute on the resource hint has no effect. Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.",
          h(a)
        ) : console.error(
          "ReactDOM.prefetchDNS(): Expected only one argument, `href`, but encountered %s as a second argument instead. This argument is reserved for future options and is currently disallowed. Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.",
          h(a)
        );
      }
      typeof c == "string" && m.d.D(c);
    }, de.preinit = function(c, a) {
      if (typeof c == "string" && c ? a == null || typeof a != "object" ? console.error(
        "ReactDOM.preinit(): Expected the `options` argument (second) to be an object with an `as` property describing the type of resource to be preinitialized but encountered %s instead.",
        h(a)
      ) : a.as !== "style" && a.as !== "script" && console.error(
        'ReactDOM.preinit(): Expected the `as` property in the `options` argument (second) to contain a valid value describing the type of resource to be preinitialized but encountered %s instead. Valid values for `as` are "style" and "script".',
        h(a.as)
      ) : console.error(
        "ReactDOM.preinit(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
        u(c)
      ), typeof c == "string" && a && typeof a.as == "string") {
        var p = a.as, v = s(p, a.crossOrigin), d = typeof a.integrity == "string" ? a.integrity : void 0, R = typeof a.fetchPriority == "string" ? a.fetchPriority : void 0;
        p === "style" ? m.d.S(
          c,
          typeof a.precedence == "string" ? a.precedence : void 0,
          {
            crossOrigin: v,
            integrity: d,
            fetchPriority: R
          }
        ) : p === "script" && m.d.X(c, {
          crossOrigin: v,
          integrity: d,
          fetchPriority: R,
          nonce: typeof a.nonce == "string" ? a.nonce : void 0
        });
      }
    }, de.preinitModule = function(c, a) {
      var p = "";
      typeof c == "string" && c || (p += " The `href` argument encountered was " + u(c) + "."), a !== void 0 && typeof a != "object" ? p += " The `options` argument encountered was " + u(a) + "." : a && "as" in a && a.as !== "script" && (p += " The `as` option encountered was " + h(a.as) + "."), p ? console.error(
        "ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` string and, optionally, an `options` object with a valid `as` property.%s",
        p
      ) : (p = a && typeof a.as == "string" ? a.as : "script", p) === "script" || (p = h(p), console.error(
        'ReactDOM.preinitModule(): Currently the only supported "as" type for this function is "script" but received "%s" instead. This warning was generated for `href` "%s". In the future other module types will be supported, aligning with the import-attributes proposal. Learn more here: (https://github.com/tc39/proposal-import-attributes)',
        p,
        c
      )), typeof c == "string" && (typeof a == "object" && a !== null ? (a.as == null || a.as === "script") && (p = s(
        a.as,
        a.crossOrigin
      ), m.d.M(c, {
        crossOrigin: p,
        integrity: typeof a.integrity == "string" ? a.integrity : void 0,
        nonce: typeof a.nonce == "string" ? a.nonce : void 0
      })) : a == null && m.d.M(c));
    }, de.preload = function(c, a) {
      var p = "";
      if (typeof c == "string" && c || (p += " The `href` argument encountered was " + u(c) + "."), a == null || typeof a != "object" ? p += " The `options` argument encountered was " + u(a) + "." : typeof a.as == "string" && a.as || (p += " The `as` option encountered was " + u(a.as) + "."), p && console.error(
        'ReactDOM.preload(): Expected two arguments, a non-empty `href` string and an `options` object with an `as` property valid for a `<link rel="preload" as="..." />` tag.%s',
        p
      ), typeof c == "string" && typeof a == "object" && a !== null && typeof a.as == "string") {
        p = a.as;
        var v = s(
          p,
          a.crossOrigin
        );
        m.d.L(c, p, {
          crossOrigin: v,
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
      typeof c == "string" && c || (p += " The `href` argument encountered was " + u(c) + "."), a !== void 0 && typeof a != "object" ? p += " The `options` argument encountered was " + u(a) + "." : a && "as" in a && typeof a.as != "string" && (p += " The `as` option encountered was " + u(a.as) + "."), p && console.error(
        'ReactDOM.preloadModule(): Expected two arguments, a non-empty `href` string and, optionally, an `options` object with an `as` property valid for a `<link rel="modulepreload" as="..." />` tag.%s',
        p
      ), typeof c == "string" && (a ? (p = s(
        a.as,
        a.crossOrigin
      ), m.d.m(c, {
        as: typeof a.as == "string" && a.as !== "script" ? a.as : void 0,
        crossOrigin: p,
        integrity: typeof a.integrity == "string" ? a.integrity : void 0
      })) : m.d.m(c));
    }, de.requestFormReset = function(c) {
      m.d.r(c);
    }, de.unstable_batchedUpdates = function(c, a) {
      return c(a);
    }, de.useFormState = function(c, a, p) {
      return l().useFormState(c, a, p);
    }, de.useFormStatus = function() {
      return l().useHostTransitionStatus();
    }, de.version = "19.2.7", typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop == "function" && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
  })()), de;
}
var We;
function mr() {
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
  return process.env.NODE_ENV === "production" ? (t(), Se.exports = dr()) : Se.exports = ur(), Se.exports;
}
var it = mr();
function pr(t) {
  if (t.width <= 0 || t.height <= 0) return !1;
  try {
    const n = t.getContext("2d", { willReadFrequently: !0 });
    if (!n) return !1;
    const r = [0, Math.floor(t.width / 2), t.width - 1], s = [0, Math.floor(t.height / 2), t.height - 1], u = r.flatMap((h) => s.map((l) => n.getImageData(h, l, 1, 1).data));
    if (u.every((h) => h[3] === 0)) return !1;
    for (let h = 0; h < 3; h += 1) {
      const l = u.map((C) => C[h]);
      if (Math.max(...l) - Math.min(...l) > 6) return !0;
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
  onDisconnect: u
}) {
  const h = B(null), l = B(u), [C, m] = N("connecting"), [o, k] = N();
  return U(() => {
    l.current = u;
  }, [u]), U(() => {
    if (!h.current) return;
    let c = !1, a = !1, p = !1, v = !1, d, R, I, D;
    (r ? h.current.closest(".computer-preview") : null)?.style.removeProperty("aspect-ratio"), m("connecting"), k(void 0);
    const K = () => {
      d && window.clearInterval(d), R && window.clearTimeout(R), d = void 0, R = void 0;
    }, E = () => {
      I && window.clearTimeout(I), I = void 0;
    }, q = () => {
      v || (v = !0, l.current?.());
    }, ee = (V) => {
      c || a || (a = !0, E(), K(), k(V), m("disconnected"), q(), D?.disconnect());
    }, ne = () => {
      const V = h.current?.querySelector("canvas");
      return V ? pr(V) : !1;
    }, J = () => {
      c || a || (E(), p = !0, d = window.setInterval(() => {
        !c && ne() && (K(), m("connected"));
      }, 100), R = window.setTimeout(() => {
        ne() || ee("This computer connected but never drew a frame.");
      }, 8e3));
    }, re = (V) => {
      if (c || a) return;
      E(), K();
      const ue = V.detail?.clean;
      k((ae) => ae ?? (p && ue ? "This computer stopped before drawing a frame." : ue ? "This computer disconnected." : "The connection to this computer was lost.")), m("disconnected"), q();
    }, Z = (V) => {
      ee(V.detail?.reason ?? "Screen security negotiation failed.");
    }, W = () => ee("This computer's screen is asking for a VNC password.");
    return I = window.setTimeout(() => ee("This computer's screen did not answer."), 15e3), import("./chunk-rfb-DFY61DWN.js").then(({ default: V }) => {
      c || a || !h.current || (D = new V(h.current, t.url, { shared: !0, wsProtocols: t.protocols }), D.viewOnly = n, D.scaleViewport = !0, D.resizeSession = !1, r && (D.background = "transparent"), D.addEventListener("connect", J), D.addEventListener("disconnect", re), D.addEventListener("securityfailure", Z), D.addEventListener("credentialsrequired", W));
    }).catch(() => ee("Could not load the screen client.")), () => {
      c = !0, E(), K(), D?.removeEventListener("connect", J), D?.removeEventListener("disconnect", re), D?.removeEventListener("securityfailure", Z), D?.removeEventListener("credentialsrequired", W), D?.disconnect();
    };
  }, [r, t, n]), /* @__PURE__ */ e.createElement("div", { className: `vnc-viewport ${r ? "is-compact" : ""}` }, /* @__PURE__ */ e.createElement("div", { ref: h, className: "vnc-target" }), C !== "connected" && /* @__PURE__ */ e.createElement("div", { className: "vnc-status", role: "status" }, C === "connecting" ? /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement(Te, { size: r ? 14 : 18, className: "spin" }), !r && "Connecting…") : /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("span", null, r ? "Screen unavailable" : o), s && /* @__PURE__ */ e.createElement("button", { className: "secondary-button", onClick: s }, "Reconnect"))));
}
function hr({
  session: t,
  failure: n,
  title: r,
  onClose: s,
  onReconnect: u
}) {
  return it.createPortal(/* @__PURE__ */ e.createElement("div", { className: "vnc-desktop", role: "dialog", "aria-label": r }, /* @__PURE__ */ e.createElement("div", { className: "vnc-titlebar", "aria-hidden": "true" }), /* @__PURE__ */ e.createElement("button", { className: "vnc-close", "aria-label": "Close this screen", onClick: s }, /* @__PURE__ */ e.createElement(un, { size: 18 })), t ? /* @__PURE__ */ e.createElement(ct, { session: t, viewOnly: !1, onReconnect: u }) : /* @__PURE__ */ e.createElement("div", { className: "vnc-viewport" }, /* @__PURE__ */ e.createElement("div", { className: "vnc-status", role: "status" }, n ? /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("span", null, n), /* @__PURE__ */ e.createElement("button", { className: "secondary-button", onClick: u }, "Reconnect")) : /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement(Te, { size: 18, className: "spin" }), " Connecting…")))), document.body);
}
function fr({
  open: t,
  width: n,
  onResize: r,
  agentName: s,
  computer: u,
  approvals: h,
  routines: l,
  grants: C,
  grantsBusy: m,
  audit: o,
  auditLoading: k,
  auditView: c,
  auditHasMore: a,
  artifacts: p,
  artifactUrl: v,
  tasks: d,
  proactive: R,
  onSetProactive: I,
  onApproval: D,
  onComputerAction: $,
  onDeleteRoutine: K,
  onSetGrant: E,
  onClearGrant: q,
  onChangeAuditView: ee,
  onLoadMoreAudit: ne,
  onClose: J
}) {
  const [re, Z] = N(""), [W, V] = N(""), [ue, ae] = N(!1), [ce, pe] = N(() => /* @__PURE__ */ new Map()), [F, te] = N(""), [Y, X] = N(() => /* @__PURE__ */ new Set()), [me, Q] = N(), [se, oe] = N(!1), [S, H] = N(), w = h.filter((i) => i.status === "pending"), T = ce.get(u?.id ?? ""), L = Y.has(u?.id ?? ""), j = B($);
  U(() => {
    j.current = $;
  }, [$]), U(() => {
    const i = u?.id;
    if (!t || se || u?.status !== "online" || !i || T || L) return;
    let x = !0;
    return te(i), j.current("open").then((_) => {
      x && (pe((P) => new Map(P).set(i, _)), te(""));
    }).catch(() => {
      x && (X((_) => new Set(_).add(i)), te(""));
    }), () => {
      x = !1;
    };
  }, [u?.id, u?.status, se, t, L, T]);
  async function O(i) {
    oe(!0), Q(void 0), H(void 0), ae(!0);
    const x = u?.id;
    x && Y.has(x) && (X((_) => {
      const P = new Set(_);
      return P.delete(x), P;
    }), pe((_) => {
      const P = new Map(_);
      return P.delete(x), P;
    }));
    try {
      Q(await $(i));
    } catch (_) {
      H(_ instanceof Error ? _.message : "Could not reach that computer.");
    } finally {
      ae(!1);
    }
  }
  function y() {
    oe(!1), Q(void 0), H(void 0);
  }
  const b = () => window.innerWidth <= 1030 ? Math.min(730, window.innerWidth - 40) : Math.min(730, window.innerWidth - (window.innerWidth <= 1180 ? 672 : 732));
  U(() => {
    const i = () => {
      const x = Math.max(280, b());
      n > x && r(x);
    };
    return i(), window.addEventListener("resize", i), () => window.removeEventListener("resize", i);
  }, [r, n]);
  const g = (i) => r(Math.max(280, Math.min(b(), window.innerWidth - i)));
  return /* @__PURE__ */ e.createElement("aside", { className: `detail-panel ${t ? "is-open" : "is-closing"}`, style: { width: n } }, /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "detail-resize-handle",
      role: "separator",
      "aria-label": "Resize the details panel",
      "aria-orientation": "vertical",
      "aria-valuemin": 280,
      "aria-valuemax": Math.max(280, b()),
      "aria-valuenow": n,
      tabIndex: 0,
      onKeyDown: (i) => {
        i.key === "ArrowLeft" ? (i.preventDefault(), r(Math.min(b(), n + 16))) : i.key === "ArrowRight" && (i.preventDefault(), r(Math.max(280, n - 16)));
      },
      onPointerDown: (i) => {
        i.currentTarget.setPointerCapture(i.pointerId), g(i.clientX);
      },
      onPointerMove: (i) => {
        i.currentTarget.hasPointerCapture(i.pointerId) && g(i.clientX);
      }
    }
  ), /* @__PURE__ */ e.createElement("header", null, /* @__PURE__ */ e.createElement("button", { className: "icon-button", "aria-label": "Close the details panel", onClick: J }, /* @__PURE__ */ e.createElement(Kt, { size: 18 }))), h.filter((i) => i.outcome === "outcome_unknown").map((i) => /* @__PURE__ */ e.createElement("section", { className: "approval-card is-uncertain", key: `unknown-${i.id}` }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow warning" }, /* @__PURE__ */ e.createElement(Re, { size: 14 }), " Outcome unknown"), /* @__PURE__ */ e.createElement("h3", null, i.title), /* @__PURE__ */ e.createElement("p", null, "You allowed this and the process stopped before anything recorded whether it went through. It may have. Check before allowing it again."))), w.map((i) => /* @__PURE__ */ e.createElement("section", { className: "approval-card", key: i.id }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow warning" }, /* @__PURE__ */ e.createElement(Re, { size: 14 }), " Waiting for you", i.source && i.source !== i.agentId && /* @__PURE__ */ e.createElement("span", { className: "approval-source" }, i.source), i.ref && /* @__PURE__ */ e.createElement("code", { className: "approval-ref", title: "Reply with this in the thread to decide without opening the panel" }, i.ref)), /* @__PURE__ */ e.createElement("h3", null, i.title), i.description && /* @__PURE__ */ e.createElement("p", null, i.description), i.scope.length > 0 && /* @__PURE__ */ e.createElement("div", { className: "scope" }, /* @__PURE__ */ e.createElement("span", null, "This allows:"), i.scope.map((x) => /* @__PURE__ */ e.createElement("div", { key: x }, /* @__PURE__ */ e.createElement(Me, { size: 13 }), x))), /* @__PURE__ */ e.createElement(
    "textarea",
    {
      "aria-label": "Note for this decision",
      placeholder: "Add a note (optional)",
      value: re,
      onChange: (x) => Z(x.target.value)
    }
  ), /* @__PURE__ */ e.createElement("div", { className: "approval-actions" }, /* @__PURE__ */ e.createElement("button", { className: "secondary-button danger-text", onClick: () => {
    D(i.id, "deny", re, i.contentHash);
  } }, "Discard"), /* @__PURE__ */ e.createElement("button", { className: "primary-button", onClick: () => {
    D(i.id, "allow", re, i.contentHash);
  } }, "Approve")))), /* @__PURE__ */ e.createElement("section", { className: "screen-section" }, /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "screen-trigger",
      disabled: ue || u?.status !== "online",
      "aria-label": `Open ${s}'s screen`,
      onClick: () => {
        O("open");
      }
    },
    /* @__PURE__ */ e.createElement("span", { className: "computer-preview" }, [...ce].map(([i, x]) => /* @__PURE__ */ e.createElement(
      "span",
      {
        className: `computer-preview-stream ${i === u?.id ? "is-active" : ""}`,
        key: i
      },
      /* @__PURE__ */ e.createElement(
        ct,
        {
          session: x,
          viewOnly: !0,
          compact: !0,
          onDisconnect: () => X((_) => new Set(_).add(i))
        }
      )
    )), !ce.has(u?.id ?? "") && (F === u?.id ? /* @__PURE__ */ e.createElement("span", { className: "computer-preview-loading", role: "status", "aria-label": `Loading ${s}'s screen` }, /* @__PURE__ */ e.createElement(Te, { size: 18, className: "spin" })) : Y.has(u?.id ?? "") ? /* @__PURE__ */ e.createElement("span", { className: "computer-preview-loading", role: "status" }, "Screen unavailable") : /* @__PURE__ */ e.createElement("span", { className: "computer-screen-off", "aria-hidden": "true" })), /* @__PURE__ */ e.createElement("span", { className: "screen-hover-action" }, /* @__PURE__ */ e.createElement(dn, { size: 14 }), " Open"))
  ), /* @__PURE__ */ e.createElement("div", { className: "screen-caption" }, /* @__PURE__ */ e.createElement("span", null, s, "'s screen"), /* @__PURE__ */ e.createElement("span", { className: `screen-state ${u?.status ?? "offline"}` }, u?.status === "online" ? "Running" : u?.status === "starting" ? "Starting…" : "Off")), u && u.status !== "online" && /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "secondary-button",
      disabled: ue,
      onClick: () => {
        O("takeover");
      }
    },
    "Start this computer"
  ), u?.error && /* @__PURE__ */ e.createElement("p", { className: "screen-error" }, u.error)), /* @__PURE__ */ e.createElement("section", { className: "proactive-section" }, /* @__PURE__ */ e.createElement("label", { className: "proactive-row" }, /* @__PURE__ */ e.createElement(
    "input",
    {
      type: "checkbox",
      checked: R,
      onChange: (i) => {
        I(i.target.checked);
      }
    }
  ), /* @__PURE__ */ e.createElement("span", null, /* @__PURE__ */ e.createElement("strong", null, "Speak up unprompted"), /* @__PURE__ */ e.createElement("span", null, "Bring up work that is stuck, a few times a day, in this thread.")))), l.length > 0 && /* @__PURE__ */ e.createElement("section", { className: "routines-section" }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow" }, "Routines"), l.map((i) => /* @__PURE__ */ e.createElement("div", { className: "routine-row", key: i.id }, /* @__PURE__ */ e.createElement("div", null, /* @__PURE__ */ e.createElement("strong", null, i.name), /* @__PURE__ */ e.createElement("span", null, i.schedule)), /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "icon-button",
      "aria-label": `Cancel the routine ${i.name}`,
      onClick: () => {
        K(i.id);
      }
    },
    /* @__PURE__ */ e.createElement(at, { size: 14 })
  )))), /* @__PURE__ */ e.createElement("section", { className: "drawer-section" }, /* @__PURE__ */ e.createElement("div", { className: "drawer-tabs", role: "tablist", "aria-label": "More about this teammate" }, /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": W === "work",
      className: W === "work" ? "is-current" : "",
      onClick: () => V((i) => i === "work" ? "" : "work")
    },
    "Work"
  ), /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": W === "files",
      className: W === "files" ? "is-current" : "",
      onClick: () => V((i) => i === "files" ? "" : "files")
    },
    "Files",
    p.length > 0 && /* @__PURE__ */ e.createElement("span", { className: "drawer-count" }, p.length)
  ), /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": W === "permissions",
      className: W === "permissions" ? "is-current" : "",
      onClick: () => V((i) => i === "permissions" ? "" : "permissions")
    },
    "Permissions"
  ), /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": W === "audit",
      className: W === "audit" ? "is-current" : "",
      onClick: () => V((i) => i === "audit" ? "" : "audit")
    },
    "History"
  )), W === "work" && /* @__PURE__ */ e.createElement(or, { agentName: s, tasks: d }), W === "files" && /* @__PURE__ */ e.createElement(
    tr,
    {
      agentName: s,
      artifacts: p,
      urlFor: v
    }
  ), W === "permissions" && /* @__PURE__ */ e.createElement(
    cr,
    {
      agentName: s,
      grants: C,
      busy: m,
      onSetGrant: E,
      onClearGrant: q
    }
  ), W === "audit" && /* @__PURE__ */ e.createElement(
    Jn,
    {
      events: o,
      loading: k,
      viewId: c,
      hasMore: a,
      onChangeView: ee,
      onLoadMore: ne
    }
  )), se && /* @__PURE__ */ e.createElement(
    hr,
    {
      session: me,
      failure: S,
      title: `${s}'s computer`,
      onClose: y,
      onReconnect: () => {
        O("takeover");
      }
    }
  ));
}
function gr({
  value: t,
  options: n,
  ariaLabel: r,
  placeholder: s = "Select",
  onChange: u,
  onOpen: h
}) {
  const [l, C] = N(!1), [m, o] = N(), k = B(null), c = B(null), a = n.find((d) => d.value === t);
  U(() => {
    if (!l) return;
    const d = () => {
      const I = k.current?.getBoundingClientRect();
      if (!I) return;
      const D = 5, $ = 8, K = Math.max(I.width, 180), E = Math.min(220, n.length * 32 + 10), q = window.innerHeight - I.bottom - $, ee = q < E && I.top - $ > q;
      o({
        position: "fixed",
        zIndex: 100,
        left: Math.max($, Math.min(I.right - K, window.innerWidth - K - $)),
        top: ee ? Math.max($, I.top - E - D) : I.bottom + D,
        width: K,
        maxHeight: ee ? Math.min(220, I.top - D - $) : Math.min(220, q)
      });
    }, R = (I) => {
      const D = I.target;
      !k.current?.contains(D) && !c.current?.contains(D) && C(!1);
    };
    return d(), window.addEventListener("pointerdown", R), window.addEventListener("resize", d), window.addEventListener("scroll", d, !0), () => {
      window.removeEventListener("pointerdown", R), window.removeEventListener("resize", d), window.removeEventListener("scroll", d, !0);
    };
  }, [l, n.length]);
  const p = (d) => {
    const R = n.filter(($) => !$.disabled && !$.action);
    if (!R.length) return;
    const I = R.findIndex(($) => $.value === t), D = I < 0 ? d > 0 ? 0 : R.length - 1 : (I + d + R.length) % R.length;
    u(R[D].value);
  }, v = () => C((d) => (d || h?.(), !d));
  return /* @__PURE__ */ e.createElement("div", { className: `crew-select ${l ? "open" : ""}`, ref: k }, /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "crew-select-trigger",
      "aria-label": r,
      "aria-haspopup": "listbox",
      "aria-expanded": l,
      onClick: v,
      onKeyDown: (d) => {
        if (d.key === "Escape") {
          C(!1);
          return;
        }
        (d.key === "ArrowDown" || d.key === "ArrowUp") && (d.preventDefault(), p(d.key === "ArrowDown" ? 1 : -1), l || h?.(), C(!0));
      }
    },
    /* @__PURE__ */ e.createElement("span", null, a?.label ?? s),
    /* @__PURE__ */ e.createElement("span", { className: "crew-select-chevron" }, /* @__PURE__ */ e.createElement(Gt, { size: 15 }))
  ), l && m && it.createPortal(
    /* @__PURE__ */ e.createElement(
      "div",
      {
        className: "crew-select-menu crew-select-menu-portal",
        ref: c,
        style: m,
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
            d.action?.(), d.action || u(d.value), C(!1);
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
const yr = ["🤖", "🔎", "📥", "📈", "🎖️", "🧭", "🛠️", "📚", "🧪", "✍️", "🗂️", "🛰️"];
function Ge({
  editing: t,
  providers: n,
  busy: r,
  error: s,
  onSubmit: u,
  onClose: h
}) {
  const [l, C] = N(t?.name ?? ""), [m, o] = N(t?.role ?? ""), [k, c] = N(t?.avatar || "🤖"), [a, p] = N("");
  U(() => {
    const d = (R) => {
      R.key === "Escape" && h();
    };
    return window.addEventListener("keydown", d), () => window.removeEventListener("keydown", d);
  }, [h]);
  const v = !!l.trim() && !r;
  return /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "palette-backdrop",
      role: "presentation",
      onMouseDown: (d) => {
        d.target === d.currentTarget && h();
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
          d.preventDefault(), v && u({ name: l.trim(), role: m.trim(), emoji: k, modelProviderId: a });
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
          onChange: (d) => o(d.target.value)
        }
      )),
      /* @__PURE__ */ e.createElement("div", { className: "crew-field" }, /* @__PURE__ */ e.createElement("span", null, "Face"), /* @__PURE__ */ e.createElement("div", { className: "crew-emoji-row" }, yr.map((d) => /* @__PURE__ */ e.createElement(
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
        gr,
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
      s && /* @__PURE__ */ e.createElement("p", { className: "crew-dialog-error" }, s),
      /* @__PURE__ */ e.createElement("div", { className: "crew-dialog-actions" }, /* @__PURE__ */ e.createElement("button", { type: "button", className: "secondary-button", onClick: h }, "Cancel"), /* @__PURE__ */ e.createElement("button", { className: "primary-button", disabled: !v }, r ? "Working…" : t ? "Save" : "Hire"))
    )
  );
}
const lt = "hermes-crew:detail-width";
function vr() {
  try {
    const t = window.localStorage?.getItem(lt), n = t ? Number.parseInt(t, 10) : Number.NaN;
    return Number.isFinite(n) ? Math.max(280, n) : 360;
  } catch {
    return 360;
  }
}
function wr({ client: t, notify: n }) {
  const r = Ut(t, { notify: n }), [s, u] = N(""), [h, l] = N([]), [C, m] = N([]), [o, k] = N([]), [c, a] = N(!1), [p, v] = N([]), [d, R] = N(!1), [I, D] = N({ id: "all", types: [] }), [$, K] = N(null), [E, q] = N([]), [ee, ne] = N([]), [J, re] = N(!1), [Z, W] = N(vr), [V, ue] = N(!1), [ae, ce] = N(), [pe, F] = N(!1), [te, Y] = N(), [X, me] = N(0), { agents: Q, conversations: se, selectedAgent: oe, selectedAgentId: S, selectedThreadId: H } = r, w = he(() => se.filter((f) => f.kind === "group"), [se]), T = he(() => new Map(Q.map((f) => [f.id, f])), [Q]), L = he(
    () => se.find((f) => f.id === H),
    [se, H]
  ), j = r.approvals.filter((f) => f.status === "pending").length;
  U(() => {
    try {
      window.localStorage?.setItem(lt, String(Z));
    } catch {
    }
  }, [Z]);
  const O = ve(() => {
    t.listSections().then(l).catch(() => l([]));
  }, [t]);
  U(O, [O, Q.length]), U(() => {
    if (!S) {
      m([]);
      return;
    }
    let f = !0;
    return t.listRoutines(S).then((M) => {
      f && m(M);
    }).catch(() => {
      f && m([]);
    }), () => {
      f = !1;
    };
  }, [t, S]), U(() => {
    if (!S) {
      k([]);
      return;
    }
    let f = !0;
    return t.listGrants(S).then((M) => {
      f && k(M);
    }).catch(() => {
      f && k([]);
    }), () => {
      f = !1;
    };
  }, [t, S]);
  const y = ve(() => {
    if (!S) {
      q([]);
      return;
    }
    t.listArtifacts(S).then(q).catch(() => q([]));
  }, [t, S]);
  U(y, [y]);
  const b = oe?.status;
  U(() => {
    b !== "working" && y();
  }, [b, y]), U(() => {
    if (!S) {
      ne([]);
      return;
    }
    let f = !0;
    return t.listTasks(S).then((M) => {
      f && ne(M);
    }).catch(() => {
      f && ne([]);
    }), () => {
      f = !1;
    };
  }, [t, S, b]);
  const g = ve((f, M) => {
    if (!S) {
      v([]), K(null);
      return;
    }
    R(!0), t.listAuditEvents({
      agentId: S,
      eventTypes: f,
      beforeId: M,
      limit: 50
    }).then((G) => {
      v((z) => M ? [...z, ...G.events] : G.events), K(G.nextBeforeId);
    }).catch(() => {
      M || (v([]), K(null));
    }).finally(() => R(!1));
  }, [t, S]);
  U(() => {
    g(I.types);
  }, [g, I]), U(() => {
    j > 0 && re(!0);
  }, [j]), U(() => {
    const f = (M) => {
      (M.metaKey || M.ctrlKey) && M.key.toLowerCase() === "k" && (M.preventDefault(), ue((G) => !G));
    };
    return window.addEventListener("keydown", f), () => window.removeEventListener("keydown", f);
  }, []);
  const i = (f, M) => {
    const G = h.map((z) => z.id === f ? { ...z, collapsed: M } : z);
    l(G), t.saveSections(G).then(l).catch(O);
  }, x = (f, M) => {
    if (M === "edit") {
      Y(void 0), ce({ editing: f });
      return;
    }
    if (M === "duplicate") {
      r.duplicateAgent(f.id).catch(() => {
      });
      return;
    }
    window.confirm(`Remove ${f.name} from the crew? Their profile, memory and skills stay on disk.`) && r.deleteAgent(f.id).catch(() => {
    });
  }, _ = async (f) => {
    F(!0), Y(void 0);
    try {
      ae?.editing ? await r.updateAgent(ae.editing.id, { role: f.role, emoji: f.emoji }) : await r.createAgent({
        name: f.name,
        role: f.role,
        emoji: f.emoji,
        modelProviderId: f.modelProviderId || void 0
      }), ce(void 0), O();
    } catch (M) {
      Y(M instanceof Error ? M.message : "That did not work.");
    } finally {
      F(!1);
    }
  }, P = he(() => ({
    onDecide: (f, M) => {
      r.respondToApproval(f, M).catch(() => {
      });
    },
    // A login request is the one chip that is an instruction to the operator,
    // so its button does the thing rather than pointing at where the thing is.
    onOpenScreen: () => {
      re(!0), r.openComputer("takeover").catch(() => {
      });
    },
    onSubmitSecret: async (f, M) => {
      oe && await t.submitSecret(oe.id, f, M);
    },
    screenshotUrl: (f, M) => t.screenshotUrl(f, M)
  }), [t, r]);
  return r.loading ? /* @__PURE__ */ e.createElement("div", { className: "crew-workspace is-loading", role: "status" }, "Loading your crew…") : Q.length ? /* @__PURE__ */ e.createElement("div", { className: "crew-workspace" }, /* @__PURE__ */ e.createElement(
    Sn,
    {
      agents: Q,
      sections: h,
      rooms: w,
      selectedAgentId: S,
      selectedThreadId: H,
      search: s,
      onSearch: u,
      onSelectAgent: (f) => {
        r.setSelectedAgentId(f), me((M) => M + 1);
      },
      onSelectThread: (f) => {
        r.setSelectedThreadId(f), me((M) => M + 1);
      },
      onAction: x,
      onCreate: () => {
        Y(void 0), ce({});
      },
      onToggleSection: i
    }
  ), /* @__PURE__ */ e.createElement(
    Wn,
    {
      agent: oe,
      thread: L,
      agentsById: T,
      messages: r.messages,
      activities: r.activities,
      chips: P,
      loading: r.conversationLoading,
      focusRequest: X,
      onSend: (f) => r.sendMessage(f).catch(() => {
      }),
      onToggleDetails: () => re((f) => !f)
    }
  ), J && oe && /* @__PURE__ */ e.createElement(
    fr,
    {
      open: J,
      width: Z,
      onResize: W,
      agentName: oe.name,
      computer: r.computer,
      approvals: r.approvals,
      routines: C,
      grants: o,
      grantsBusy: c,
      audit: p,
      auditLoading: d,
      auditView: I.id,
      auditHasMore: $ !== null,
      artifacts: E,
      artifactUrl: (f) => t.artifactUrl(f),
      tasks: ee,
      proactive: oe.proactive !== !1,
      onSetProactive: (f) => r.updateAgent(oe.id, { proactive: f }),
      onApproval: (f, M, G, z) => r.respondToApproval(f, M, G, z),
      onComputerAction: (f) => r.openComputer(f),
      onDeleteRoutine: async (f) => {
        await t.deleteRoutine(oe.id, f), m((M) => M.filter((G) => G.id !== f));
      },
      onSetGrant: async (f, M) => {
        a(!0);
        try {
          const G = await t.setGrant({ agentId: oe.id, tool: f, mode: M });
          k((z) => z.map((ie) => ie.tool === f ? { ...ie, ...G } : ie));
        } finally {
          a(!1);
        }
      },
      onClearGrant: async (f) => {
        a(!0);
        try {
          const M = await t.clearGrant(oe.id, f);
          k((G) => G.map((z) => z.tool === f ? { ...z, ...M } : z));
        } finally {
          a(!1);
        }
      },
      onChangeAuditView: (f, M) => D({ id: f, types: M }),
      onLoadMoreAudit: () => {
        $ !== null && g(I.types, $);
      },
      onClose: () => re(!1)
    }
  ), /* @__PURE__ */ e.createElement(
    Cn,
    {
      open: V,
      agents: Q,
      rooms: w,
      onClose: () => ue(!1),
      onSelectAgent: r.setSelectedAgentId,
      onSelectThread: r.setSelectedThreadId,
      onCreateAgent: () => {
        Y(void 0), ce({});
      },
      onComputer: () => re(!0)
    }
  ), ae && /* @__PURE__ */ e.createElement(
    Ge,
    {
      editing: ae.editing,
      providers: r.modelProviders,
      busy: pe,
      error: te,
      onSubmit: _,
      onClose: () => ce(void 0)
    }
  ), r.error && /* @__PURE__ */ e.createElement("div", { className: "crew-toast", role: "alert" }, /* @__PURE__ */ e.createElement("span", null, r.error), /* @__PURE__ */ e.createElement("button", { className: "icon-button", "aria-label": "Dismiss", onClick: r.dismissError }, "×"))) : /* @__PURE__ */ e.createElement("div", { className: "crew-workspace is-empty" }, /* @__PURE__ */ e.createElement("div", { className: "crew-empty-card" }, /* @__PURE__ */ e.createElement("h2", null, "No teammates yet"), /* @__PURE__ */ e.createElement("p", null, "A teammate is a Hermes profile with a thread, a memory and a computer of its own. Give one a name and a one-line job to start."), /* @__PURE__ */ e.createElement("button", { className: "primary-button", onClick: () => {
    Y(void 0), ce({});
  } }, "Hire your first teammate")), ae && /* @__PURE__ */ e.createElement(
    Ge,
    {
      providers: r.modelProviders,
      busy: pe,
      error: te,
      onSubmit: _,
      onClose: () => ce(void 0)
    }
  ));
}
const xe = 500, Er = 15e3;
function br(t, n) {
  return t === 401 || t === 403 ? new ye("unauthorized", n) : t === 404 ? new ye("not_found", n) : t === 409 ? new ye("conflict", n) : new ye("unknown", n, t >= 500);
}
function kr(t) {
  const n = new URL(t, globalThis.location?.href ?? "http://127.0.0.1");
  return n.protocol = n.protocol === "https:" ? "wss:" : "ws:", n.pathname = `${n.pathname.replace(/\/+$/, "")}/v1/events`, n.toString();
}
class Nr {
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
    const r = n.eventsUrl ?? kr(this.baseUrl);
    this.resolveEventsUrl = typeof r == "function" ? r : async () => r, this.fetchImpl = n.fetchImpl ?? ((s, u) => fetch(s, u)), this.headers = n.headers ?? (() => ({}));
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
    } catch (u) {
      throw u instanceof DOMException && u.name === "AbortError" ? u : new ye("network", "Could not reach the crew backend.", !0);
    }
    if (!s.ok) {
      const u = await s.json().then((h) => h?.detail).catch(() => {
      });
      throw br(s.status, u ?? `Crew request failed (${s.status})`);
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
  submitSecret(n, r, s, u) {
    return this.request(
      `/bots/${encodeURIComponent(n)}/secret`,
      { method: "POST", body: JSON.stringify({ ref: r, value: s }), signal: u }
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
    const u = s.toString();
    return this.request(`/audit${u ? `?${u}` : ""}`, { signal: r });
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
    const s = (u) => {
      "threadId" in u && u.threadId && u.threadId !== n || r(u);
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
      this.reconnectTimer = void 0, this.reconnectDelay = Math.min(this.reconnectDelay * 2, Er), this.openSocket();
    }, this.reconnectDelay));
  }
  closeSocket() {
    this.reconnectTimer && (clearTimeout(this.reconnectTimer), this.reconnectTimer = void 0), this.opening = !1;
    const n = this.socket;
    this.socket = void 0, n && (n.onclose = null, n.onerror = null, n.close());
  }
}
const Ke = "/api/plugins/hermes-crew", Ye = window.__HERMES_PLUGIN_SDK__, Sr = new Nr({
  baseUrl: Ke,
  // The SDK's authed fetch, not the global one. Its own contract says plugins
  // must not hand-read the session token, and this is what keeps loopback,
  // gated-OAuth and server-internal modes all working from one bundle.
  fetchImpl: (t, n) => Ye.authedFetch(t, n),
  // A resolver, not a string: in gated mode `buildWsUrl` mints a single-use
  // ticket, so the URL has to be rebuilt for every connect and reconnect.
  eventsUrl: () => Ye.buildWsUrl(`${Ke}/v1/events`)
});
function Cr(t) {
  try {
    if (typeof Notification > "u" || Notification.permission !== "granted" || document.visibilityState === "visible") return;
    new Notification(t.title, { body: t.body });
  } catch {
  }
}
function Tr() {
  return /* @__PURE__ */ e.createElement(wr, { client: Sr, notify: Cr });
}
export {
  Tr as C,
  e as R,
  De as S,
  N as a,
  U as b,
  xt as c,
  he as d,
  B as e,
  Pe as f,
  Mr as g,
  Ce as h,
  bt as i,
  vt as j,
  wt as k,
  ve as l,
  kt as m,
  $e as n,
  it as r,
  Mt as u
};

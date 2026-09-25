const mt = globalThis.__HERMES_PLUGIN_SDK__, e = mt?.React;
if (!e)
  throw new Error(
    "hermes-crew: the dashboard plugin SDK is not on the page, so there is no React to borrow."
  );
const {
  Children: pt,
  Fragment: ht,
  Profiler: ft,
  StrictMode: gt,
  Suspense: Re,
  cloneElement: yt,
  createContext: vt,
  createElement: Se,
  createRef: wt,
  forwardRef: De,
  isValidElement: Et,
  lazy: Le,
  memo: bt,
  startTransition: kt,
  use: Nt,
  useActionState: St,
  useCallback: ve,
  useContext: Ct,
  useDebugValue: Mt,
  useDeferredValue: Tt,
  useEffect: q,
  useId: _t,
  useImperativeHandle: xt,
  useInsertionEffect: At,
  useLayoutEffect: $e,
  useMemo: he,
  useOptimistic: Ot,
  useReducer: It,
  useRef: W,
  useState: N,
  useSyncExternalStore: Rt,
  useTransition: Dt,
  version: Lt
} = e, $t = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Children: pt,
  Fragment: ht,
  Profiler: ft,
  StrictMode: gt,
  Suspense: Re,
  cloneElement: yt,
  createContext: vt,
  createElement: Se,
  createRef: wt,
  default: e,
  forwardRef: De,
  isValidElement: Et,
  lazy: Le,
  memo: bt,
  startTransition: kt,
  use: Nt,
  useActionState: St,
  useCallback: ve,
  useContext: Ct,
  useDebugValue: Mt,
  useDeferredValue: Tt,
  useEffect: q,
  useId: _t,
  useImperativeHandle: xt,
  useInsertionEffect: At,
  useLayoutEffect: $e,
  useMemo: he,
  useOptimistic: Ot,
  useReducer: It,
  useRef: W,
  useState: N,
  useSyncExternalStore: Rt,
  useTransition: Dt,
  version: Lt
}, Symbol.toStringTag, { value: "Module" }));
class ye extends Error {
  constructor(n, r, o = !1) {
    super(r), this.code = n, this.retryable = o, this.name = "CrewError";
  }
  code;
  retryable;
}
function Ye(t) {
  return !t || t.role !== "agent" ? "" : t.parts.filter((n) => n.type === "text").map((n) => n.text).join("").trim();
}
function ke(t) {
  return Ye(
    [...t].reverse().find((n) => n.role === "agent" && !n.streaming)
  );
}
function Pe(t) {
  return t.parts.filter((n) => n.type === "text").map((n) => n.text).join("");
}
const ze = 6e4, Pt = 3e4, Te = "optimistic-user:", we = "optimistic-agent:";
function zt(t, n = {}) {
  const { enabled: r = !0, notify: o } = n, [l, v] = N([]), [d, C] = N(""), [u, s] = N(""), [k, c] = N([]), [a, p] = N([]), [h, m] = N([]), [L, R] = N([]), [D, $] = N(), [X, w] = N("connecting"), [H, ee] = N([]), [ne, Z] = N(r), [re, Q] = N(), [G, V] = N(() => /* @__PURE__ */ new Set()), [ue, ae] = N(""), [ce, pe] = N(0), F = W(/* @__PURE__ */ new Map()), te = W(d), J = W(/* @__PURE__ */ new Set()), B = W(/* @__PURE__ */ new Map()), me = W(o), oe = he(
    () => l.find((b) => b.id === d),
    [l, d]
  ), se = u || (d ? `dm:${d}` : ""), O = !!(d && !G.has(d));
  q(() => {
    te.current = d;
  }, [d]), q(() => {
    me.current = o;
  }, [o]);
  const x = ve(async (b = !1) => {
    const M = await t.listAgents();
    for (const g of J.current)
      M.some((i) => i.id === g) || J.current.delete(g);
    const U = M.filter((g) => !J.current.has(g.id)), j = te.current, I = U.find((g) => g.id === j), y = F.current.get(j);
    I?.lastMessagePreview && y && !y.messages.some((g) => g.streaming) && ke(y.messages) !== I.lastMessagePreview && (F.current.set(j, { ...y, cachedAt: 0 }), pe((i) => i + 1));
    const E = !!y?.messages.some((g) => g.streaming);
    return v((g) => U.map((i) => {
      const _ = g.find((f) => f.id === i.id), T = ke(F.current.get(i.id)?.messages ?? []), P = !!T || i.id === j && E;
      return {
        ...i,
        lastMessagePreview: P ? T || _?.lastMessagePreview : i.lastMessagePreview ?? _?.lastMessagePreview
      };
    })), C((g) => g && U.some((i) => i.id === g) || b ? g : U[0]?.id || ""), U;
  }, [t]), K = ve(async () => {
    const b = await t.listModelProviders();
    return ee(b.providers), b.providers;
  }, [t]);
  return q(() => {
    if (!r) {
      v([]), ee([]), C(""), s(""), p([]), m([]), R([]), $(void 0), w("disconnected"), Z(!1), Q(void 0);
      return;
    }
    let b = !0;
    return Z(!0), Promise.all([x(), K()]).then(() => {
      b && (w("connected"), Z(!1));
    }).catch((M) => {
      b && (w("error"), Q(M instanceof Error ? M.message : "Could not load the crew"), Z(!1));
    }), () => {
      b = !1;
    };
  }, [r, x, K]), q(() => {
    if (!r) return;
    const b = () => {
      document.visibilityState === "hidden" || !navigator.onLine || x().catch(() => {
      });
    }, M = () => {
      document.visibilityState === "visible" && b();
    }, U = window.setInterval(b, Pt);
    return window.addEventListener("focus", b), window.addEventListener("online", b), document.addEventListener("visibilitychange", M), () => {
      window.clearInterval(U), window.removeEventListener("focus", b), window.removeEventListener("online", b), document.removeEventListener("visibilitychange", M);
    };
  }, [r, x]), q(() => {
    s("");
  }, [d]), q(() => {
    if (!r) return;
    const b = F.current.get(d);
    if (b ? (p(b.messages), m(b.activities), R(b.approvals), $(b.computer), c(b.conversations)) : (p([]), m([]), R([]), $(void 0), c([])), ae(""), !d) return;
    const M = b ? Date.now() - b.cachedAt : Number.POSITIVE_INFINITY;
    if (b && M < ze && !u) {
      b.messages.some((y) => y.streaming) && ae(d);
      const I = window.setTimeout(() => pe((y) => y + 1), ze - M);
      return () => window.clearTimeout(I);
    }
    const U = new AbortController();
    let j = !0;
    return Promise.all([
      t.listConversations(d, U.signal),
      t.listApprovalRequests(d, U.signal),
      t.getComputer(d, U.signal)
    ]).then(async ([I, y, E]) => {
      const g = u ? I.find((z) => z.id === u) ?? I[0] : I[0], i = g ? await t.getConversation(g.id, U.signal) : void 0;
      if (!j || J.current.has(d)) return;
      const _ = F.current.get(d)?.messages ?? [], T = (i?.messages ?? []).map((z) => {
        const ie = B.current.get(z.id);
        return ie ? { ...z, id: ie } : z;
      }), P = _.filter(
        (z) => z.id.startsWith(Te) || z.id.startsWith(we)
      ), f = [
        ...T,
        ...P.filter((z) => !T.some((ie) => ie.id === z.id))
      ], S = ke(f), Y = i?.activities ?? [];
      F.current.set(d, {
        messages: f,
        activities: Y,
        approvals: y,
        conversations: I,
        computer: E,
        cachedAt: Date.now()
      }), V((z) => new Set(z).add(d)), p(f), m(Y), R(y), $(E), c(I), ae(d), S && v((z) => z.map((ie) => ie.id === d ? { ...ie, lastMessagePreview: S } : ie));
    }).catch((I) => {
      !j || J.current.has(d) || I instanceof DOMException && I.name === "AbortError" || (F.current.set(d, {
        messages: [],
        activities: [],
        approvals: [],
        conversations: [],
        cachedAt: Date.now()
      }), V((y) => new Set(y).add(d)), p([]), Q(I instanceof Error ? I.message : "Could not load this teammate"));
    }), () => {
      j = !1, U.abort();
    };
  }, [t, r, ce, d, u]), q(() => {
    if (!r || !d || D?.status === "online") return;
    let b = !0;
    const M = async () => {
      try {
        const j = await t.getComputer(d);
        if (!b || te.current !== d) return;
        $(j);
        const I = F.current.get(d);
        I && F.current.set(d, { ...I, computer: j });
      } catch {
      }
    }, U = window.setInterval(() => {
      M();
    }, 2e3);
    return M(), () => {
      b = !1, window.clearInterval(U);
    };
  }, [t, D?.status, r, d]), q(() => {
    if (!r || !se || ue !== d) return;
    let b = !0;
    const M = d, U = (y) => {
      const E = F.current.get(M);
      F.current.set(M, {
        messages: E?.messages ?? [],
        activities: E?.activities ?? [],
        approvals: E?.approvals ?? [],
        conversations: E?.conversations ?? [],
        computer: E?.computer,
        cachedAt: Date.now(),
        ...y
      });
    }, j = (y) => p((E) => {
      const g = y(E);
      return U({ messages: g }), g;
    }), I = t.subscribeToConversationEvents(se, (y) => {
      if (b) {
        if (y.type === "message.created" && j((E) => {
          let g = y.message;
          const i = B.current.get(y.message.id);
          if (i && (g = { ...y.message, id: i }), y.message.role === "user" && !i) {
            const T = new Set(B.current.values()), P = E.find((f) => f.id.startsWith(Te) && !T.has(f.id) && Pe(f) === Pe(y.message));
            P && (B.current.set(y.message.id, P.id), g = { ...y.message, id: P.id });
          }
          if (y.message.role === "agent" && !i) {
            const T = new Set(B.current.values()), P = E.find((f) => f.id.startsWith(we) && !T.has(f.id));
            P && (B.current.set(y.message.id, P.id), g = { ...y.message, id: P.id });
          }
          return E.find((T) => T.id === g.id) ? E.map((T) => T.id === g.id ? g : T) : [...E, g];
        }), y.type === "message.delta" && j((E) => {
          let g = B.current.get(y.messageId);
          if (!g) {
            const i = new Set(B.current.values()), _ = E.find((T) => T.id.startsWith(we) && !i.has(T.id));
            _ && (g = _.id, B.current.set(y.messageId, g));
          }
          return g ??= y.messageId, E.some((i) => i.id === g) ? E.map((i) => i.id === g ? {
            ...i,
            parts: i.parts.map((_, T) => T === 0 && _.type === "text" ? { ..._, text: _.text + y.delta } : _)
          } : i) : [...E, {
            id: g,
            conversationId: se,
            role: "agent",
            parts: [{ type: "text", text: y.delta }],
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            streaming: !0
          }];
        }), y.type === "message.completed") {
          const E = B.current.get(y.messageId) ?? y.messageId;
          y.notify === !1 ? j((g) => g.flatMap((i) => i.id !== E ? [i] : i.id.startsWith(we) ? [{
            ...i,
            parts: i.parts.map((_) => _.type === "text" ? { ..._, text: "" } : _),
            streaming: !0
          }] : [])) : (j((g) => {
            const i = g.filter((T) => T.id === E || T.role !== "agent" || !T.streaming).map((T) => T.id === E ? { ...T, streaming: !1 } : T), _ = ke(i);
            return _ && v((T) => T.map((P) => P.id === M ? { ...P, lastMessagePreview: _ } : P)), i;
          }), me.current?.({
            title: `${oe?.name ?? "Your teammate"} finished`,
            body: "There is something new to read."
          }));
        }
        if (y.type === "message.dropped") {
          const E = B.current.get(y.messageId) ?? y.messageId;
          j((g) => g.filter((i) => i.id !== E));
        }
        y.type === "message.updated" && (j((E) => {
          const g = B.current.get(y.message.id), i = g ? { ...y.message, id: g } : y.message, _ = E.find((P) => P.id === i.id), T = y.message.role === "agent" && !y.message.streaming ? E.filter((P) => P.id === i.id || P.role !== "agent" || !P.streaming) : E;
          return _ ? T.map((P) => P.id === i.id ? i : P) : [...T, i];
        }), y.message.role === "agent" && !y.message.streaming && v((E) => E.map((g) => g.id === M ? { ...g, lastMessagePreview: Ye(y.message) || void 0 } : g))), y.type === "approval.updated" && (R((E) => {
          const g = E.some((i) => i.id === y.approval.id) ? E.map((i) => i.id === y.approval.id ? y.approval : i) : [y.approval, ...E];
          return U({ approvals: g }), g;
        }), y.approval.status === "pending" && me.current?.({
          title: `${oe?.name ?? "Your teammate"} needs you`,
          body: y.approval.title
        })), y.type === "activity.updated" && m((E) => {
          const g = E.some((i) => i.id === y.activity.id) ? E.map((i) => i.id === y.activity.id ? y.activity : i) : [...E, y.activity];
          return U({ activities: g }), g;
        }), y.type === "agent.status" && v((E) => E.map((g) => g.id === y.agentId ? { ...g, status: y.status } : g)), y.type === "connection.changed" && w(y.state);
      }
    });
    return () => {
      b = !1, I.unsubscribe();
    };
  }, [t, se, r, ue, oe?.name, d]), {
    agents: l,
    conversations: k,
    modelProviders: H,
    selectedAgent: oe,
    selectedAgentId: d,
    setSelectedAgentId: C,
    selectedThreadId: se,
    setSelectedThreadId: s,
    messages: a,
    activities: h,
    approvals: L,
    computer: D,
    connection: X,
    loading: ne,
    conversationLoading: O,
    error: re,
    refreshAgents: x,
    refreshModelProviders: K,
    dismissError: () => Q(void 0),
    createAgent: async (b) => {
      const M = await t.createAgent(b);
      return await x(!0), C(M.id), M;
    },
    updateAgent: async (b, M) => {
      await t.updateAgent(b, M), await x(!0);
    },
    duplicateAgent: async (b) => {
      const M = await t.duplicateAgent(b);
      await x(!0), C(M.id);
    },
    deleteAgent: async (b) => {
      const M = l.find((E) => E.id === b), U = d;
      if (!M || J.current.has(b)) return;
      const j = l.findIndex((E) => E.id === b), I = l.filter((E) => E.id !== b), y = U === b ? I[Math.min(Math.max(j, 0), Math.max(I.length - 1, 0))]?.id ?? "" : U;
      J.current.add(b), v(I), C(y);
      try {
        try {
          await t.deleteAgent(b);
        } catch (E) {
          if (!(E instanceof ye && E.code === "not_found")) throw E;
        }
        F.current.delete(b), V((E) => {
          const g = new Set(E);
          return g.delete(b), g;
        }), await x();
      } catch (E) {
        throw J.current.delete(b), v((g) => {
          if (g.some((_) => _.id === b)) return g;
          const i = [...g];
          return i.splice(Math.min(j, i.length), 0, M), i;
        }), C((g) => g || (U === b ? b : g)), Q(E instanceof Error ? E.message : "Could not remove this teammate"), E;
      }
    },
    sendMessage: async (b) => {
      if (!se || !d) return;
      const M = d, U = se, j = `${Date.now()}:${Math.random().toString(36).slice(2)}`, I = `${Te}${j}`, y = `${we}${j}`, E = (/* @__PURE__ */ new Date()).toISOString(), g = {
        id: I,
        conversationId: U,
        role: "user",
        parts: [{ type: "text", text: b }],
        createdAt: E
      }, i = {
        id: y,
        conversationId: U,
        role: "agent",
        parts: [{ type: "text", text: "" }],
        createdAt: E,
        streaming: !0
      }, _ = F.current.get(M) ?? {
        messages: [],
        activities: [],
        approvals: [],
        conversations: [],
        cachedAt: Date.now()
      }, T = [..._.messages].reverse().find((S) => S.role === "agent" && S.streaming), f = [...T ? _.messages.map((S) => S.id === T.id ? { ...S, streaming: !1, interrupted: !0 } : S) : _.messages, g, i];
      te.current === M && m([]), F.current.set(M, { ..._, messages: f, activities: [], cachedAt: Date.now() }), te.current === M && (p(f), ae(M));
      try {
        const S = await t.sendMessage({ conversationId: U, text: b });
        B.current.set(S.id, I);
        const Y = S.id.match(/^(.+):user(?:$|:)/)?.[1];
        Y && (B.current.set(`${Y}:user`, I), B.current.set(`${Y}:agent`, T?.id ?? y));
        const z = F.current.get(M) ?? _, ie = { ...S, id: I }, ge = z.messages.map((be) => be.id === I ? ie : be).filter((be, lt, dt) => dt.findIndex((ut) => ut.id === be.id) === lt);
        F.current.set(M, { ...z, messages: ge, cachedAt: Date.now() }), te.current === M && p(ge);
      } catch (S) {
        const Y = F.current.get(M) ?? _, z = Y.messages.filter((ge) => ge.id !== y), ie = z.some((ge) => ge.id === I) ? z : [...z, g];
        throw F.current.set(M, { ...Y, messages: ie, cachedAt: Date.now() }), te.current === M && p(ie), T || Q(S instanceof Error ? S.message : "Could not send that"), S;
      }
    },
    respondToApproval: async (b, M, U, j) => {
      const I = d, y = await t.respondToApproval({ requestId: b, decision: M, note: U, contentHash: j }), E = F.current.get(I), g = (E?.approvals ?? []).map((i) => i.id === y.id ? y : i);
      E && F.current.set(I, { ...E, approvals: g, cachedAt: Date.now() }), te.current === I && R(g);
    },
    openComputer: async (b) => {
      if (!d) throw new Error("No teammate is selected");
      try {
        return await (b === "open" ? t.openComputer(d) : t.takeOverComputer(d));
      } catch (M) {
        throw Q(M instanceof Error ? M.message : "Could not open that computer"), M;
      }
    },
    reconnect: async () => {
      w("connecting");
      try {
        await t.reconnect(), await x(), w("connected");
      } catch (b) {
        w("error"), Q(b instanceof Error ? b.message : "Reconnect failed");
      }
    }
  };
}
const Ut = (t) => t.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), Xe = (...t) => t.filter((n, r, o) => !!n && n.trim() !== "" && o.indexOf(n) === r).join(" ").trim();
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
const Ht = De(
  ({
    color: t = "currentColor",
    size: n = 24,
    strokeWidth: r = 2,
    absoluteStrokeWidth: o,
    className: l = "",
    children: v,
    iconNode: d,
    ...C
  }, u) => Se(
    "svg",
    {
      ref: u,
      ...qt,
      width: n,
      height: n,
      stroke: t,
      strokeWidth: o ? Number(r) * 24 / Number(n) : r,
      className: Xe("lucide", l),
      ...C
    },
    [
      ...d.map(([s, k]) => Se(s, k)),
      ...Array.isArray(v) ? v : [v]
    ]
  )
);
const A = (t, n) => {
  const r = De(
    ({ className: o, ...l }, v) => Se(Ht, {
      ref: v,
      iconNode: n,
      className: Xe(`lucide-${Ut(t)}`, o),
      ...l
    })
  );
  return r.displayName = `${t}`, r;
};
const jt = A("Archive", [
  ["rect", { width: "20", height: "5", x: "2", y: "3", rx: "1", key: "1wp1u1" }],
  ["path", { d: "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8", key: "1s80jp" }],
  ["path", { d: "M10 12h4", key: "a56b0p" }]
]);
const Vt = A("ArrowDown", [
  ["path", { d: "M12 5v14", key: "s699le" }],
  ["path", { d: "m19 12-7 7-7-7", key: "1idqje" }]
]);
const Ft = A("Ban", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m4.9 4.9 14.2 14.2", key: "1m5liu" }]
]);
const Bt = A("Bot", [
  ["path", { d: "M12 8V4H8", key: "hb8ula" }],
  ["rect", { width: "16", height: "12", x: "4", y: "8", rx: "2", key: "enze0r" }],
  ["path", { d: "M2 14h2", key: "vft8re" }],
  ["path", { d: "M20 14h2", key: "4cs60a" }],
  ["path", { d: "M15 13v2", key: "1xurst" }],
  ["path", { d: "M9 13v2", key: "rq6x2g" }]
]);
const Ce = A("Check", [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]]);
const Wt = A("ChevronDown", [
  ["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]
]);
const xe = A("ChevronRight", [
  ["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]
]);
const Gt = A("ChevronsRight", [
  ["path", { d: "m6 17 5-5-5-5", key: "xnjwq" }],
  ["path", { d: "m13 17 5-5-5-5", key: "17xmmf" }]
]);
const Ae = A("CircleCheck", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
]);
const Je = A("CircleDashed", [
  ["path", { d: "M10.1 2.182a10 10 0 0 1 3.8 0", key: "5ilxe3" }],
  ["path", { d: "M13.9 21.818a10 10 0 0 1-3.8 0", key: "11zvb9" }],
  ["path", { d: "M17.609 3.721a10 10 0 0 1 2.69 2.7", key: "1iw5b2" }],
  ["path", { d: "M2.182 13.9a10 10 0 0 1 0-3.8", key: "c0bmvh" }],
  ["path", { d: "M20.279 17.609a10 10 0 0 1-2.7 2.69", key: "1ruxm7" }],
  ["path", { d: "M21.818 10.1a10 10 0 0 1 0 3.8", key: "qkgqxc" }],
  ["path", { d: "M3.721 6.391a10 10 0 0 1 2.7-2.69", key: "1mcia2" }],
  ["path", { d: "M6.391 20.279a10 10 0 0 1-2.69-2.7", key: "1fvljs" }]
]);
const Kt = A("CircleHelp", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3", key: "1u773s" }],
  ["path", { d: "M12 17h.01", key: "p32p05" }]
]);
const Ze = A("Clock", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["polyline", { points: "12 6 12 12 16 14", key: "68esgv" }]
]);
const Oe = A("Cloud", [
  ["path", { d: "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z", key: "p7xjir" }]
]);
const Yt = A("Copy", [
  ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2", key: "17jyea" }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2", key: "zix9uf" }]
]);
const Xt = A("CornerDownRight", [
  ["polyline", { points: "15 10 20 15 15 20", key: "1q7qjw" }],
  ["path", { d: "M4 4v7a4 4 0 0 0 4 4h12", key: "z08zvw" }]
]);
const Jt = A("Database", [
  ["ellipse", { cx: "12", cy: "5", rx: "9", ry: "3", key: "msslwz" }],
  ["path", { d: "M3 5V19A9 3 0 0 0 21 19V5", key: "1wlel7" }],
  ["path", { d: "M3 12A9 3 0 0 0 21 12", key: "mv7ke4" }]
]);
const Zt = A("Download", [
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
  ["polyline", { points: "7 10 12 15 17 10", key: "2ggqvy" }],
  ["line", { x1: "12", x2: "12", y1: "15", y2: "3", key: "1vk2je" }]
]);
const Qt = A("Earth", [
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
const en = A("Ellipsis", [
  ["circle", { cx: "12", cy: "12", r: "1", key: "41hilf" }],
  ["circle", { cx: "19", cy: "12", r: "1", key: "1wjl8i" }],
  ["circle", { cx: "5", cy: "12", r: "1", key: "1pcz8c" }]
]);
const tn = A("FileCode2", [
  ["path", { d: "M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4", key: "1pf5j1" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "m5 12-3 3 3 3", key: "oke12k" }],
  ["path", { d: "m9 18 3-3-3-3", key: "112psh" }]
]);
const nn = A("FileSpreadsheet", [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "M8 13h2", key: "yr2amv" }],
  ["path", { d: "M14 13h2", key: "un5t4a" }],
  ["path", { d: "M8 17h2", key: "2yhykz" }],
  ["path", { d: "M14 17h2", key: "10kma7" }]
]);
const Ee = A("FileText", [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "M10 9H8", key: "b1mrlr" }],
  ["path", { d: "M16 13H8", key: "t4e002" }],
  ["path", { d: "M16 17H8", key: "z1uh3a" }]
]);
const Qe = A("File", [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }]
]);
const rn = A("Globe", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20", key: "13o1zl" }],
  ["path", { d: "M2 12h20", key: "9i4pu4" }]
]);
const Ue = A("Hand", [
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
const an = A("Hourglass", [
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
const sn = A("Image", [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2", key: "1m3agn" }],
  ["circle", { cx: "9", cy: "9", r: "2", key: "af1f0g" }],
  ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21", key: "1xmnt7" }]
]);
const qe = A("KeyRound", [
  [
    "path",
    {
      d: "M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z",
      key: "1s6t7t"
    }
  ],
  ["circle", { cx: "16.5", cy: "7.5", r: ".5", fill: "currentColor", key: "w0ekpg" }]
]);
const Me = A("LoaderCircle", [
  ["path", { d: "M21 12a9 9 0 1 1-6.219-8.56", key: "13zald" }]
]);
const on = A("Lock", [
  ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2", key: "1w4ew1" }],
  ["path", { d: "M7 11V7a5 5 0 0 1 10 0v4", key: "fwvmzm" }]
]);
const cn = A("Mail", [
  ["rect", { width: "20", height: "16", x: "2", y: "4", rx: "2", key: "18n3k1" }],
  ["path", { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7", key: "1ocrg3" }]
]);
const ln = A("Maximize2", [
  ["polyline", { points: "15 3 21 3 21 9", key: "mznyad" }],
  ["polyline", { points: "9 21 3 21 3 15", key: "1avn1i" }],
  ["line", { x1: "21", x2: "14", y1: "3", y2: "10", key: "ota7mn" }],
  ["line", { x1: "3", x2: "10", y1: "21", y2: "14", key: "1atl0r" }]
]);
const dn = A("Minimize2", [
  ["polyline", { points: "4 14 10 14 10 20", key: "11kfnr" }],
  ["polyline", { points: "20 10 14 10 14 4", key: "rlmsce" }],
  ["line", { x1: "14", x2: "21", y1: "10", y2: "3", key: "o5lafz" }],
  ["line", { x1: "3", x2: "10", y1: "21", y2: "14", key: "1atl0r" }]
]);
const et = A("Monitor", [
  ["rect", { width: "20", height: "14", x: "2", y: "3", rx: "2", key: "48i651" }],
  ["line", { x1: "8", x2: "16", y1: "21", y2: "21", key: "1svkeh" }],
  ["line", { x1: "12", x2: "12", y1: "17", y2: "21", key: "vw1qmm" }]
]);
const un = A("Pencil", [
  [
    "path",
    {
      d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
      key: "1a8usu"
    }
  ],
  ["path", { d: "m15 5 4 4", key: "1mk7zo" }]
]);
const tt = A("Plus", [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "M12 5v14", key: "s699le" }]
]);
const mn = A("Presentation", [
  ["path", { d: "M2 3h20", key: "91anmk" }],
  ["path", { d: "M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3", key: "2k9sn8" }],
  ["path", { d: "m7 21 5-5 5 5", key: "bip4we" }]
]);
const pn = A("RotateCcw", [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }]
]);
const nt = A("Search", [
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
  ["path", { d: "m21 21-4.3-4.3", key: "1qie3q" }]
]);
const He = A("Settings2", [
  ["path", { d: "M20 7h-9", key: "3s1dr2" }],
  ["path", { d: "M14 17H5", key: "gfn3mx" }],
  ["circle", { cx: "17", cy: "17", r: "3", key: "18b49y" }],
  ["circle", { cx: "7", cy: "7", r: "3", key: "dfmy0x" }]
]);
const Ie = A("ShieldAlert", [
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
const hn = A("ShieldCheck", [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      key: "oel41y"
    }
  ],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
]);
const fn = A("ShieldX", [
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
const gn = A("Terminal", [
  ["polyline", { points: "4 17 10 11 4 5", key: "akl6gq" }],
  ["line", { x1: "12", x2: "20", y1: "19", y2: "19", key: "q2wloq" }]
]);
const rt = A("Trash2", [
  ["path", { d: "M3 6h18", key: "d0wm0j" }],
  ["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", key: "4alrt4" }],
  ["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2", key: "v07s0e" }],
  ["line", { x1: "10", x2: "10", y1: "11", y2: "17", key: "1uufr5" }],
  ["line", { x1: "14", x2: "14", y1: "11", y2: "17", key: "xtxkd" }]
]);
const yn = A("TriangleAlert", [
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
const vn = A("User", [
  ["path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", key: "975kel" }],
  ["circle", { cx: "12", cy: "7", r: "4", key: "17ys0d" }]
]);
const wn = A("Users", [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }],
  ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }],
  ["path", { d: "M16 3.13a4 4 0 0 1 0 7.75", key: "1da9ce" }]
]);
const En = A("X", [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
]);
function bn(t) {
  let n = 0;
  for (let r = 0; r < t.length; r += 1) n = (n * 31 + t.charCodeAt(r)) % 360;
  return n;
}
function at({ agent: t, size: n = 36 }) {
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
const kn = Le(async () => ({ default: (await import("./chunk-mermaid-HWGCJPDP-CyT0uvue.js").then((t) => t.i)).Streamdown })), je = {
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
  selectedThreadId: l,
  search: v,
  onSearch: d,
  onSelectAgent: C,
  onSelectThread: u,
  onAction: s,
  onCreate: k,
  onToggleSection: c
}) {
  const [a, p] = N();
  q(() => {
    if (!a) return;
    const w = () => p(void 0);
    return window.addEventListener("pointerdown", w), () => window.removeEventListener("pointerdown", w);
  }, [a]);
  const h = (w, H) => {
    p(void 0), s(w, H);
  }, m = v.trim().toLowerCase(), L = (w) => !m || `${w.name} ${w.role}`.toLowerCase().includes(m), R = he(() => new Map(t.map((w) => [w.id, w])), [t]), D = n.map((w) => ({
    section: w,
    members: w.bot_ids.map((H) => R.get(H)).filter((H) => !!H && L(H))
  })).filter((w) => w.members.length > 0), $ = !m && D.length > 1, X = (w) => /* @__PURE__ */ e.createElement(
    "div",
    {
      key: w.id,
      className: `agent-row ${o === w.id && !l.startsWith("group:") ? "selected" : ""} ${w.status === "working" ? "is-working" : ""}`
    },
    /* @__PURE__ */ e.createElement("button", { className: "agent-select", onClick: () => C(w.id) }, /* @__PURE__ */ e.createElement(at, { agent: w }), /* @__PURE__ */ e.createElement("span", { className: "agent-copy" }, /* @__PURE__ */ e.createElement("strong", null, /* @__PURE__ */ e.createElement("span", null, w.name), /* @__PURE__ */ e.createElement("span", { className: `agent-status ${w.status}`, title: je[w.status], "aria-label": je[w.status] })), w.lastMessagePreview && /* @__PURE__ */ e.createElement("span", { className: "agent-preview agent-preview-entering" }, /* @__PURE__ */ e.createElement(Re, { fallback: w.lastMessagePreview }, /* @__PURE__ */ e.createElement(kn, { className: "agent-preview-markdown", mode: "static", controls: !1, linkSafety: { enabled: !0 }, skipHtml: !0 }, w.lastMessagePreview))))),
    /* @__PURE__ */ e.createElement(
      "button",
      {
        className: "agent-more",
        "aria-label": `More actions for ${w.name}`,
        onPointerDown: (H) => H.stopPropagation(),
        onClick: () => p((H) => H === w.id ? void 0 : w.id)
      },
      /* @__PURE__ */ e.createElement(en, { size: 15 })
    ),
    a === w.id && /* @__PURE__ */ e.createElement("div", { className: "agent-menu", role: "menu", onPointerDown: (H) => H.stopPropagation() }, /* @__PURE__ */ e.createElement("button", { role: "menuitem", onClick: () => h(w, "edit") }, /* @__PURE__ */ e.createElement(un, { size: 13 }), " Edit"), /* @__PURE__ */ e.createElement("button", { role: "menuitem", onClick: () => h(w, "duplicate") }, /* @__PURE__ */ e.createElement(Yt, { size: 13 }), " Duplicate"), /* @__PURE__ */ e.createElement("div", null), /* @__PURE__ */ e.createElement("button", { role: "menuitem", className: "danger-text", onClick: () => h(w, "delete") }, /* @__PURE__ */ e.createElement(rt, { size: 13 }), " Remove from crew"))
  );
  return /* @__PURE__ */ e.createElement("aside", { className: "agent-sidebar" }, /* @__PURE__ */ e.createElement("div", { className: "sidebar-titlebar" }, /* @__PURE__ */ e.createElement("span", { className: "sidebar-title" }, "Crew"), /* @__PURE__ */ e.createElement("button", { className: "brand-add", "aria-label": "Hire a teammate", onClick: k }, /* @__PURE__ */ e.createElement(tt, { size: 18 }))), /* @__PURE__ */ e.createElement("label", { className: "search" }, /* @__PURE__ */ e.createElement(nt, { size: 15 }), /* @__PURE__ */ e.createElement("input", { "aria-label": "Search the crew", placeholder: "Search your crew", value: v, onChange: (w) => d(w.target.value) })), /* @__PURE__ */ e.createElement("div", { className: "agent-list" }, t.length === 0 && /* @__PURE__ */ e.createElement("div", { className: "agent-list-empty" }, "No teammates yet"), t.length > 0 && D.length === 0 && /* @__PURE__ */ e.createElement("div", { className: "agent-list-empty" }, "No teammates found"), $ ? D.map(({ section: w, members: H }) => /* @__PURE__ */ e.createElement("section", { className: "agent-section", key: w.id }, /* @__PURE__ */ e.createElement(
    "button",
    {
      className: `agent-section-header ${w.collapsed ? "is-collapsed" : ""}`,
      "aria-expanded": !w.collapsed,
      onClick: () => c(w.id, !w.collapsed)
    },
    /* @__PURE__ */ e.createElement(xe, { size: 13, className: "agent-section-chevron" }),
    /* @__PURE__ */ e.createElement("span", null, w.name),
    /* @__PURE__ */ e.createElement("small", null, H.length)
  ), !w.collapsed && H.map(X))) : D.flatMap((w) => w.members).map(X), r.length > 0 && /* @__PURE__ */ e.createElement("section", { className: "agent-section", key: "__rooms__" }, /* @__PURE__ */ e.createElement("div", { className: "agent-section-header is-static" }, /* @__PURE__ */ e.createElement("span", null, "Rooms"), /* @__PURE__ */ e.createElement("small", null, r.length)), r.map((w) => /* @__PURE__ */ e.createElement("div", { key: w.id, className: `agent-row ${l === w.id ? "selected" : ""}` }, /* @__PURE__ */ e.createElement("button", { className: "agent-select", onClick: () => u(w.id) }, /* @__PURE__ */ e.createElement("span", { className: "agent-avatar", role: "img", "aria-label": `${w.title} room` }, w.emoji || "👥"), /* @__PURE__ */ e.createElement("span", { className: "agent-copy" }, /* @__PURE__ */ e.createElement("strong", null, /* @__PURE__ */ e.createElement("span", null, w.title)), /* @__PURE__ */ e.createElement("span", { className: "agent-preview" }, w.lastMessagePreview || w.subtitle))))))));
}
function Sn({
  open: t,
  agents: n,
  rooms: r,
  onClose: o,
  onSelectAgent: l,
  onSelectThread: v,
  onCreateAgent: d,
  onComputer: C
}) {
  const [u, s] = N(""), k = W(null);
  q(() => {
    t && (s(""), window.setTimeout(() => k.current?.focus(), 0));
  }, [t]);
  const a = he(() => [
    { id: "create", label: "Hire a teammate", detail: "Add someone to the crew", icon: tt, run: d },
    { id: "computer", label: "Open their computer", detail: "The current teammate's screen", icon: et, run: C },
    ...n.map((h) => ({
      id: `agent-${h.id}`,
      label: h.name,
      detail: `${h.role} · ${h.status.replaceAll("_", " ")}`,
      icon: Bt,
      run: () => l(h.id)
    })),
    ...r.map((h) => ({
      id: `room-${h.id}`,
      label: h.title,
      detail: h.subtitle || "Room",
      icon: wn,
      run: () => v(h.id)
    }))
  ], [n, r, C, d, l, v]).filter((h) => `${h.label} ${h.detail}`.toLowerCase().includes(u.toLowerCase()));
  if (!t) return null;
  const p = (h) => {
    h.run(), o();
  };
  return /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "palette-backdrop",
      role: "presentation",
      onMouseDown: (h) => {
        h.target === h.currentTarget && o();
      }
    },
    /* @__PURE__ */ e.createElement("section", { className: "command-palette", role: "dialog", "aria-modal": "true", "aria-label": "Command palette" }, /* @__PURE__ */ e.createElement("label", null, /* @__PURE__ */ e.createElement(nt, { size: 17 }), /* @__PURE__ */ e.createElement(
      "input",
      {
        ref: k,
        "aria-label": "Search the crew and commands",
        placeholder: "Search your crew…",
        value: u,
        onChange: (h) => s(h.target.value),
        onKeyDown: (h) => {
          h.key === "Escape" && o(), h.key === "Enter" && a[0] && p(a[0]);
        }
      }
    ), /* @__PURE__ */ e.createElement("kbd", null, "esc")), /* @__PURE__ */ e.createElement("div", { className: "palette-results" }, a.length ? a.map((h, m) => {
      const L = h.icon;
      return /* @__PURE__ */ e.createElement("button", { key: h.id, className: m === 0 ? "active" : "", onClick: () => p(h) }, /* @__PURE__ */ e.createElement("span", null, /* @__PURE__ */ e.createElement(L, { size: 16 })), /* @__PURE__ */ e.createElement("div", null, /* @__PURE__ */ e.createElement("strong", null, h.label), /* @__PURE__ */ e.createElement("small", null, h.detail)), m === 0 && /* @__PURE__ */ e.createElement("kbd", null, "↵"));
    }) : /* @__PURE__ */ e.createElement("p", null, "Nothing matches that")), /* @__PURE__ */ e.createElement("footer", null, /* @__PURE__ */ e.createElement("span", null, "Crew"), /* @__PURE__ */ e.createElement("span", null, /* @__PURE__ */ e.createElement("kbd", null, "⌘"), /* @__PURE__ */ e.createElement("kbd", null, "K"), " to open")))
  );
}
function fe({ label: t, kind: n = "", children: r }) {
  return /* @__PURE__ */ e.createElement("div", { className: `crew-chip ${n}` }, t && /* @__PURE__ */ e.createElement("div", { className: "crew-chip-label" }, t), r);
}
function Cn({ payload: t }) {
  return /* @__PURE__ */ e.createElement(fe, { kind: "report" }, (t.lines ?? []).map((n, r) => /* @__PURE__ */ e.createElement("div", { className: "crew-report-line", key: r }, /* @__PURE__ */ e.createElement("span", { className: "crew-report-check" }, /* @__PURE__ */ e.createElement(Ce, { size: 13 })), /* @__PURE__ */ e.createElement("span", { className: "crew-report-system" }, n.system), /* @__PURE__ */ e.createElement("span", { className: "crew-report-arrow" }, "→"), /* @__PURE__ */ e.createElement("span", null, n.result, n.count && /* @__PURE__ */ e.createElement("span", { className: "crew-report-count" }, " · ", n.count)))), t.closing && /* @__PURE__ */ e.createElement("div", { className: "crew-report-closing" }, t.closing));
}
function Mn({ payload: t, onDecide: n }) {
  const r = t.status === "approved" || t.status === "discarded";
  return /* @__PURE__ */ e.createElement("div", { className: `crew-chip approval ${r ? "resolved" : ""}` }, /* @__PURE__ */ e.createElement("div", { className: "crew-chip-label" }, /* @__PURE__ */ e.createElement(Ie, { size: 13 }), " ", r ? "Decided" : "Needs you"), /* @__PURE__ */ e.createElement("div", { className: "crew-approval-action" }, t.action), t.detail && /* @__PURE__ */ e.createElement("div", { className: "crew-approval-detail" }, t.detail), r ? /* @__PURE__ */ e.createElement("div", { className: "crew-approval-outcome" }, t.status === "approved" ? "Approved" : "Discarded") : /* @__PURE__ */ e.createElement("div", { className: "crew-approval-buttons" }, /* @__PURE__ */ e.createElement("button", { className: "crew-btn danger", onClick: () => n(String(t.approval_id), "deny") }, "Discard"), /* @__PURE__ */ e.createElement("button", { className: "crew-btn primary", onClick: () => n(String(t.approval_id), "allow") }, "Approve")));
}
function Tn({ payload: t }) {
  return /* @__PURE__ */ e.createElement(fe, { label: "You decided" }, /* @__PURE__ */ e.createElement("div", { className: "crew-approval-action" }, t.action), /* @__PURE__ */ e.createElement("div", { className: "crew-approval-outcome" }, t.status === "approved" ? "Approved" : "Discarded"));
}
function _n({ payload: t }) {
  return t.proposal ? /* @__PURE__ */ e.createElement(fe, { label: t.kind === "conflicting" ? "Rules disagree" : "Rule may be stale" }, /* @__PURE__ */ e.createElement("div", { className: "crew-memory-note" }, t.note), /* @__PURE__ */ e.createElement("ul", { className: "crew-memory-entries" }, (t.entries || []).map((n, r) => /* @__PURE__ */ e.createElement("li", { key: r }, n))), t.why && /* @__PURE__ */ e.createElement("div", { className: "crew-memory-why" }, t.why)) : t.tidied ? /* @__PURE__ */ e.createElement(fe, { label: "Memory tidied" }, /* @__PURE__ */ e.createElement("div", { className: "crew-memory-note" }, t.note)) : /* @__PURE__ */ e.createElement(fe, { label: "Memory updated" }, /* @__PURE__ */ e.createElement("div", { className: "crew-memory-rule" }, t.rule), t.diff && /* @__PURE__ */ e.createElement("pre", { className: "crew-memory-diff" }, t.diff));
}
function xn({ payload: t }) {
  return /* @__PURE__ */ e.createElement(fe, { label: "Routine created" }, /* @__PURE__ */ e.createElement("div", { className: "crew-routine-name" }, /* @__PURE__ */ e.createElement(Ze, { size: 13 }), " ", t.name), /* @__PURE__ */ e.createElement("div", { className: "crew-routine-when" }, t.human || t.cron));
}
function An({ payload: t }) {
  return /* @__PURE__ */ e.createElement(fe, { label: `Handed over by @${t.from_name || t.from || "a teammate"}` }, /* @__PURE__ */ e.createElement("div", { className: "crew-botref-body" }, /* @__PURE__ */ e.createElement(Xt, { size: 13 }), " ", t.content));
}
function On({ payload: t, onOpenScreen: n, onSubmitSecret: r }) {
  const [o, l] = N(""), [v, d] = N("");
  if (t.field && t.ref) {
    const C = t.ref, u = async () => {
      if (o) {
        d("sending");
        try {
          await r(C, o), l(""), d("sent");
        } catch {
          l(""), d("failed");
        }
      }
    };
    return /* @__PURE__ */ e.createElement(fe, { label: "Needs one thing from you" }, /* @__PURE__ */ e.createElement("div", { className: "crew-login-site" }, /* @__PURE__ */ e.createElement(qe, { size: 13 }), " The ", t.field, " for ", t.site || "a site"), t.why && /* @__PURE__ */ e.createElement("div", { className: "crew-login-why" }, t.why), v === "sent" ? /* @__PURE__ */ e.createElement("div", { className: "crew-login-why" }, "Typed into the page. ", t.site, " should move on now.") : /* @__PURE__ */ e.createElement("form", { className: "crew-secret-row", onSubmit: (s) => {
      s.preventDefault(), u();
    } }, /* @__PURE__ */ e.createElement(
      "input",
      {
        type: "password",
        autoComplete: "off",
        placeholder: t.field,
        value: o,
        onChange: (s) => l(s.target.value)
      }
    ), /* @__PURE__ */ e.createElement("button", { className: "crew-btn", type: "submit", disabled: !o || v === "sending" }, v === "sending" ? "Typing…" : "Type it in")), v === "failed" && /* @__PURE__ */ e.createElement("div", { className: "crew-login-why" }, "That did not reach the screen — nothing was typed. Try taking the wheel instead."));
  }
  return /* @__PURE__ */ e.createElement(fe, { label: "Needs you at the keyboard" }, /* @__PURE__ */ e.createElement("div", { className: "crew-login-site" }, /* @__PURE__ */ e.createElement(qe, { size: 13 }), " Sign in to ", t.site || "a site"), t.why && /* @__PURE__ */ e.createElement("div", { className: "crew-login-why" }, t.why), /* @__PURE__ */ e.createElement("button", { className: "crew-btn", onClick: n }, "Take the wheel"));
}
function In({ payload: t, screenshotUrl: n }) {
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
      return /* @__PURE__ */ e.createElement(On, { payload: o, onOpenScreen: r.onOpenScreen, onSubmitSecret: r.onSubmitSecret });
    case "screenshot":
      return /* @__PURE__ */ e.createElement(In, { payload: o, screenshotUrl: r.screenshotUrl });
    default:
      return null;
  }
}
const Dn = Le(async () => ({ default: (await import("./chunk-mermaid-HWGCJPDP-CyT0uvue.js").then((t) => t.i)).Streamdown })), Ln = {
  browser: Qt,
  terminal: gn,
  file: Ee,
  handoff: Oe,
  status: Oe
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
  const [l, v] = N(0), [d, C] = N(!1);
  return q(() => {
    v(Date.now());
    const u = window.setInterval(() => v(Date.now()), 1e3);
    return () => window.clearInterval(u);
  }, []), /* @__PURE__ */ e.createElement("details", { className: "agent-working-details", open: d }, /* @__PURE__ */ e.createElement(
    "summary",
    {
      role: "status",
      "aria-label": `${t?.name ?? "This teammate"} is working: ${n}`,
      onClick: (u) => {
        u.preventDefault(), C((s) => !s);
      }
    },
    /* @__PURE__ */ e.createElement("span", { className: "agent-working-progress" }, "Working for ", Pn(l - Date.parse(o))),
    /* @__PURE__ */ e.createElement(xe, { className: "agent-working-chevron", size: 15 })
  ), r.length > 0 && /* @__PURE__ */ e.createElement("div", { className: "agent-working-tools" }, r.map((u) => {
    const s = Ln[u.kind] ?? Oe;
    return /* @__PURE__ */ e.createElement("details", { className: `agent-tool-detail ${u.status}`, key: u.id }, /* @__PURE__ */ e.createElement("summary", null, /* @__PURE__ */ e.createElement(s, { size: 14 }), /* @__PURE__ */ e.createElement("span", null, u.title), /* @__PURE__ */ e.createElement(xe, { size: 13 })), /* @__PURE__ */ e.createElement("div", null, u.output ?? (u.status === "running" ? "Waiting for result…" : "No output")));
  })));
}
function jn({ message: t, agent: n, senderName: r, activities: o, chips: l, entering: v = !1 }) {
  const d = $n(t), C = W(null), u = W(!!t.streaming), s = o.filter((h) => h.conversationId === t.conversationId), k = [...s].reverse().find((h) => h.status === "running") ?? s.at(-1), c = t.role === "agent" && !!t.streaming, a = d.trim() || k?.title || "Working", p = t.parts.filter((h) => h.type === "chip");
  return $e(() => {
    const h = C.current, m = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (h && t.role === "agent" && u.current && !t.streaming && !m) {
      const L = h.querySelector(".message-body");
      L && typeof L.animate == "function" && L.animate(
        [{ opacity: 0, transform: "translate3d(-6px,4px,0)" }, { opacity: 1, transform: "translate3d(0,0,0)" }],
        { duration: 260, easing: "cubic-bezier(.2,.82,.3,1)" }
      );
    }
    u.current = !!t.streaming;
  }, [v, t.role, t.streaming]), /* @__PURE__ */ e.createElement("div", { className: `message ${t.role} ${v ? "message-entering" : ""}`, ref: C }, t.interrupted && /* @__PURE__ */ e.createElement("div", { className: "agent-interrupted" }, "Interrupted"), r && t.role === "agent" && /* @__PURE__ */ e.createElement("div", { className: "message-sender" }, r), !c && (d || t.streaming && !p.length) && /* @__PURE__ */ e.createElement(
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
  ), p.map((h, m) => /* @__PURE__ */ e.createElement(
    Rn,
    {
      key: `${t.id}:${m}`,
      kind: h.kind,
      payload: h.payload,
      handlers: l
    }
  )));
}
function Vn({
  agent: t,
  thread: n,
  agentsById: r,
  messages: o,
  activities: l,
  chips: v,
  loading: d = !1,
  focusRequest: C = 0,
  onSend: u,
  onToggleDetails: s
}) {
  const [k, c] = N(""), [a, p] = N(!1), [h, m] = N(!1), [L, R] = N(!1), [D, $] = N(!1), X = W(null), w = W(null), H = W(null), ee = W(!1), ne = W(!0), Z = W(!1), re = W(0), Q = W(0), G = W(void 0), V = W(void 0), ue = W(/* @__PURE__ */ new Set()), ae = W(n?.id ?? ""), ce = W(d), [pe, F] = N(() => /* @__PURE__ */ new Set()), te = n?.title || t?.name || "Crew", J = n?.kind === "group", B = n?.id ?? t?.id ?? "";
  $e(() => {
    const O = ae.current !== B || ce.current;
    if (ae.current = B, ce.current = d, d || O) {
      ue.current = new Set(o.map((K) => K.id)), F(/* @__PURE__ */ new Set());
      return;
    }
    const x = o.filter((K) => !ue.current.has(K.id)).map((K) => K.id);
    for (const K of x) ue.current.add(K);
    F(new Set(x));
  }, [B, d, o]);
  function me(O) {
    const x = X.current;
    !x || typeof x.scrollTo != "function" || (ne.current = !0, Z.current = !0, R(!1), G.current && window.clearTimeout(G.current), re.current = Math.max(
      re.current,
      Date.now() + (O === "smooth" ? 650 : 150)
    ), x.scrollTo({ top: x.scrollHeight, behavior: O }), G.current = window.setTimeout(() => {
      G.current = void 0, Z.current = !1;
    }, O === "smooth" ? 400 : 0));
  }
  q(() => {
    ne.current = !0, Z.current = !1, Q.current = 0, R(!1), requestAnimationFrame(() => me("auto"));
  }, [B]), q(() => {
    ne.current && me("smooth");
  }, [o]), q(() => {
    const O = X.current, x = w.current;
    if (!O || !x || typeof ResizeObserver > "u") return;
    const K = new ResizeObserver(() => {
      ne.current && me("auto");
    });
    return K.observe(x), () => K.disconnect();
  }, [B, d]), q(() => () => {
    V.current && window.clearTimeout(V.current), G.current && window.clearTimeout(G.current);
  }, []), q(() => {
    C > 0 && H.current?.focus();
  }, [B, C]);
  function oe() {
    Z.current || Date.now() < re.current || ($(!0), V.current && window.clearTimeout(V.current), V.current = window.setTimeout(() => {
      V.current = void 0, $(!1);
    }, 700));
  }
  async function se(O) {
    O.preventDefault();
    const x = k.trim();
    if (!(!x || ee.current)) {
      ee.current = !0, c(""), p(!0);
      try {
        await u(x);
      } finally {
        ee.current = !1, p(!1);
      }
    }
  }
  return /* @__PURE__ */ e.createElement("main", { className: "conversation" }, /* @__PURE__ */ e.createElement("header", { className: `conversation-header ${h ? "scrolled" : ""}` }, /* @__PURE__ */ e.createElement("h1", null, n?.emoji && /* @__PURE__ */ e.createElement("span", { className: "conversation-emoji" }, n.emoji), te), n?.subtitle && /* @__PURE__ */ e.createElement("p", { className: "conversation-subtitle" }, n.subtitle), /* @__PURE__ */ e.createElement("div", { className: "header-actions" }, !J && /* @__PURE__ */ e.createElement("button", { className: "computer-trigger", "aria-label": "Open this teammate's computer", onClick: s }, /* @__PURE__ */ e.createElement(et, { size: 18 })))), /* @__PURE__ */ e.createElement("div", { className: "conversation-scroll-shell" }, d ? /* @__PURE__ */ e.createElement("div", { className: "conversation-skeleton", role: "status", "aria-label": "Loading this thread" }, /* @__PURE__ */ e.createElement("div", { className: "skeleton-message skeleton-agent" }, /* @__PURE__ */ e.createElement("span", { className: "skeleton-line skeleton-line-wide" }), /* @__PURE__ */ e.createElement("span", { className: "skeleton-line" })), /* @__PURE__ */ e.createElement("div", { className: "skeleton-message skeleton-user" }, /* @__PURE__ */ e.createElement("span", { className: "skeleton-bubble" })), /* @__PURE__ */ e.createElement("div", { className: "skeleton-message skeleton-agent" }, /* @__PURE__ */ e.createElement("span", { className: "skeleton-line skeleton-line-short" }))) : /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement(
    "div",
    {
      className: `message-scroll ${D ? "scrollbar-visible" : ""}`,
      ref: X,
      onWheelCapture: (O) => {
        O.deltaY < 0 && (Z.current = !1);
      },
      onScroll: (O) => {
        const x = O.currentTarget, K = x.scrollHeight - x.scrollTop - x.clientHeight, b = K <= 24, M = x.scrollTop < Q.current - 1;
        Q.current = x.scrollTop, m(x.scrollTop > 0), M && K > 72 ? (Z.current = !1, ne.current = !1, R(!0)) : !Z.current && b ? (ne.current = !0, R(!1)) : !Z.current && K > 72 && (ne.current = !1, R(!0)), oe();
      },
      onPointerMove: (O) => {
        O.currentTarget.getBoundingClientRect().right - O.clientX <= 14 ? $(!0) : V.current || $(!1);
      },
      onPointerLeave: () => $(!1)
    },
    /* @__PURE__ */ e.createElement("div", { className: "message-content", ref: w }, o.length === 0 && t && /* @__PURE__ */ e.createElement("div", { className: "conversation-intro" }, /* @__PURE__ */ e.createElement(at, { agent: t, size: 54 }), /* @__PURE__ */ e.createElement("h2", null, t.name), /* @__PURE__ */ e.createElement("p", null, t.role)), o.map((O) => /* @__PURE__ */ e.createElement(
      jn,
      {
        key: O.id,
        message: O,
        agent: t,
        senderName: J ? r.get(O.sender ?? "")?.name : void 0,
        activities: l,
        chips: v,
        entering: pe.has(O.id) || O.id.startsWith("optimistic-user:")
      }
    )))
  ), L && /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "scroll-to-bottom",
      "aria-label": "Scroll to the latest message",
      onClick: () => me("smooth")
    },
    /* @__PURE__ */ e.createElement(Vt, { size: 20 })
  ))), /* @__PURE__ */ e.createElement("form", { className: "composer", onSubmit: se }, /* @__PURE__ */ e.createElement(
    "textarea",
    {
      ref: H,
      "aria-label": `Message ${te}`,
      placeholder: J ? "Ask the room…" : `Message ${te}…`,
      value: k,
      onChange: (O) => c(O.target.value),
      onKeyDown: (O) => {
        O.key === "Enter" && !O.shiftKey && !O.nativeEvent.isComposing && O.keyCode !== 229 && (O.preventDefault(), O.currentTarget.form?.requestSubmit());
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
  "approval.expired": Ze,
  "grant.changed": He,
  "crew.policy_loaded": He,
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
function Kn({ events: t, loading: n, viewId: r, onChangeView: o, onLoadMore: l, hasMore: v }) {
  const [d, C] = N(() => /* @__PURE__ */ new Set()), u = he(() => t.slice().sort((s, k) => k.id - s.id), [t]);
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
  ))), u.length === 0 && !n && /* @__PURE__ */ e.createElement("p", { className: "audit-empty" }, "Nothing recorded yet."), /* @__PURE__ */ e.createElement("ol", { className: "audit-rows" }, u.map((s) => {
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
          onClick: () => C((p) => {
            const h = new Set(p);
            return h.delete(s.id) || h.add(s.id), h;
          })
        },
        /* @__PURE__ */ e.createElement(k, { size: 14 }),
        /* @__PURE__ */ e.createElement("span", { className: "audit-subject" }, s.subject || s.tool || s.event_type),
        /* @__PURE__ */ e.createElement("span", { className: "audit-kind" }, Wn[s.event_type] ?? s.event_type),
        /* @__PURE__ */ e.createElement("time", { className: "audit-when", dateTime: new Date(s.created_at).toISOString() }, Gn(s.created_at))
      ),
      c && /* @__PURE__ */ e.createElement("dl", { className: "audit-detail" }, s.tool && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Tool"), /* @__PURE__ */ e.createElement("dd", null, /* @__PURE__ */ e.createElement("code", null, s.tool))), s.detail && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Why"), /* @__PURE__ */ e.createElement("dd", null, s.detail)), s.actor !== "_system" && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Who"), /* @__PURE__ */ e.createElement("dd", null, s.actor === "_operator" ? "you" : s.actor)), s.duration_ms !== null && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Took"), /* @__PURE__ */ e.createElement("dd", null, s.duration_ms, " ms")), s.args_digest && /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("dt", null, "Arguments"), /* @__PURE__ */ e.createElement("dd", null, /* @__PURE__ */ e.createElement("code", null, s.args_digest))))
    );
  })), v && /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "secondary-button",
      disabled: n,
      onClick: l
    },
    n ? "Loading…" : "Show older"
  ));
}
const Yn = {
  slides: mn,
  document: Ee,
  sheet: nn,
  image: sn,
  data: Jt,
  text: Ee,
  code: tn,
  archive: jt,
  file: Qe
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
    const l = Yn[o.kind] ?? Qe, v = o.size === 0;
    return /* @__PURE__ */ e.createElement("li", { className: `files-row ${v ? "is-empty" : ""}`, key: o.id }, /* @__PURE__ */ e.createElement(
      "a",
      {
        href: r(o),
        download: o.name,
        className: "files-link"
      },
      /* @__PURE__ */ e.createElement(l, { size: 15 }),
      /* @__PURE__ */ e.createElement("span", { className: "files-name", title: o.path }, o.name),
      /* @__PURE__ */ e.createElement("span", { className: "files-meta" }, Xn(o.size), v && /* @__PURE__ */ e.createElement("span", { className: "files-warning", title: "Nothing was written to this file" }, "didn't finish")),
      /* @__PURE__ */ e.createElement("span", { className: "files-when" }, Jn(o.updatedAt)),
      /* @__PURE__ */ e.createElement(Zt, { size: 13, className: "files-download" })
    ));
  }));
}
const Qn = {
  pending: Je,
  running: Me,
  succeeded: Ce,
  failed: En,
  waiting: an
}, er = {
  web: rn,
  file: Ee,
  mail: cn,
  user: vn
};
function tr({ step: t }) {
  const n = Qn[t.status] ?? Je;
  return /* @__PURE__ */ e.createElement("li", { className: `plan-step is-${t.status}` }, /* @__PURE__ */ e.createElement(n, { size: 13, className: t.status === "running" ? "spin" : void 0 }), /* @__PURE__ */ e.createElement("span", { className: "plan-step-title" }, t.title), t.detail && /* @__PURE__ */ e.createElement("span", { className: "plan-step-detail" }, t.detail));
}
function nr({ item: t }) {
  const n = er[t.kind] ?? Ee, r = t.url ? /* @__PURE__ */ e.createElement("a", { href: t.url, target: "_blank", rel: "noreferrer noopener" }, t.title) : /* @__PURE__ */ e.createElement("span", null, t.title);
  return /* @__PURE__ */ e.createElement("li", { className: "evidence-row" }, /* @__PURE__ */ e.createElement("div", { className: "evidence-head" }, /* @__PURE__ */ e.createElement(n, { size: 12 }), r), /* @__PURE__ */ e.createElement("p", { className: "evidence-excerpt" }, t.excerpt));
}
function rr({ agentName: t, tasks: n }) {
  return n.length === 0 ? /* @__PURE__ */ e.createElement("p", { className: "plan-empty" }, t, " has no scheduled or long-running work.") : /* @__PURE__ */ e.createElement("div", { className: "plan-list" }, n.map((r) => /* @__PURE__ */ e.createElement("section", { className: "plan-task", key: r.id }, /* @__PURE__ */ e.createElement("div", { className: "plan-task-head" }, /* @__PURE__ */ e.createElement("span", { className: "plan-task-title" }, r.title || r.kind), /* @__PURE__ */ e.createElement("span", { className: `plan-task-status is-${r.status}` }, r.status.replace("_", " "))), r.attempts > 1 && /* @__PURE__ */ e.createElement("p", { className: "plan-task-attempts" }, "picked up ", r.attempts, " times"), r.error && /* @__PURE__ */ e.createElement("p", { className: "plan-task-error" }, r.error), r.plan.length > 0 && /* @__PURE__ */ e.createElement("ol", { className: "plan-steps" }, r.plan.map((o) => /* @__PURE__ */ e.createElement(tr, { step: o, key: o.id }))), r.evidence.length > 0 && /* @__PURE__ */ e.createElement("details", { className: "evidence" }, /* @__PURE__ */ e.createElement("summary", null, "What it read (", r.evidence.length, ")"), /* @__PURE__ */ e.createElement("ul", { className: "evidence-list" }, r.evidence.map((o, l) => /* @__PURE__ */ e.createElement(nr, { item: o, key: `${o.title}-${l}` })))))));
}
const ar = [
  { mode: "deny", label: "Never", icon: Ft },
  { mode: "ask", label: "Ask me", icon: Kt },
  { mode: "allow", label: "Allow", icon: hn }
];
function sr({ agentName: t, grants: n, busy: r, onSetGrant: o, onClearGrant: l }) {
  const [v, d] = N(""), [C, u] = N(!1), s = he(() => {
    const c = v.trim().toLowerCase(), a = n.filter((h) => C && h.source !== "grant" ? !1 : c ? h.tool.toLowerCase().includes(c) || h.toolset.toLowerCase().includes(c) : !0), p = /* @__PURE__ */ new Map();
    for (const h of a) {
      const m = h.toolset || "other";
      p.set(m, [...p.get(m) ?? [], h]);
    }
    return [...p.entries()].sort(([h], [m]) => h.localeCompare(m));
  }, [n, v, C]), k = n.filter((c) => c.mode === "ask").length;
  return /* @__PURE__ */ e.createElement("section", { className: "permissions-panel" }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow" }, /* @__PURE__ */ e.createElement(on, { size: 14 }), " What ", t, " can do"), /* @__PURE__ */ e.createElement("p", { className: "permissions-summary" }, n.length, " tools · ", k, " need your say-so"), /* @__PURE__ */ e.createElement("div", { className: "permissions-filters" }, /* @__PURE__ */ e.createElement(
    "input",
    {
      type: "search",
      "aria-label": "Filter tools",
      placeholder: "Filter tools…",
      value: v,
      onChange: (c) => d(c.target.value)
    }
  ), /* @__PURE__ */ e.createElement("label", null, /* @__PURE__ */ e.createElement(
    "input",
    {
      type: "checkbox",
      checked: C,
      onChange: (c) => u(c.target.checked)
    }
  ), "Only what I changed")), s.length === 0 && /* @__PURE__ */ e.createElement("p", { className: "permissions-empty" }, "Nothing matches."), s.map(([c, a]) => /* @__PURE__ */ e.createElement("div", { className: "permissions-group", key: c }, /* @__PURE__ */ e.createElement("h4", null, c), a.map((p) => /* @__PURE__ */ e.createElement(
    "div",
    {
      className: `permissions-row ${p.protected ? "is-protected" : ""} ${p.available === !1 ? "is-unavailable" : ""}`,
      key: p.tool
    },
    /* @__PURE__ */ e.createElement("div", { className: "permissions-tool" }, /* @__PURE__ */ e.createElement("code", null, p.tool), /* @__PURE__ */ e.createElement("span", { className: "permissions-why" }, p.why)),
    /* @__PURE__ */ e.createElement("div", { className: "permissions-modes", role: "group", "aria-label": `What ${t} may do with ${p.tool}` }, ar.map(({ mode: h, label: m, icon: L }) => /* @__PURE__ */ e.createElement(
      "button",
      {
        key: h,
        type: "button",
        className: `permissions-mode ${p.mode === h ? "is-current" : ""}`,
        "aria-pressed": p.mode === h,
        disabled: r || p.protected,
        title: p.protected ? "This teammate always keeps this one" : m,
        onClick: () => {
          o(p.tool, h);
        }
      },
      /* @__PURE__ */ e.createElement(L, { size: 13 }),
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
          l(p.tool);
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
      var l = !1;
      try {
        l = this instanceof o;
      } catch {
      }
      return l ? Reflect.construct(n, arguments, this.constructor) : n.apply(this, arguments);
    };
    r.prototype = n.prototype;
  } else r = {};
  return Object.defineProperty(r, "__esModule", { value: !0 }), Object.keys(t).forEach(function(o) {
    var l = Object.getOwnPropertyDescriptor(t, o);
    Object.defineProperty(r, o, l.get ? l : {
      enumerable: !0,
      get: function() {
        return t[o];
      }
    });
  }), r;
}
var Ne = { exports: {} }, le = {};
const st = /* @__PURE__ */ or($t);
var Ve;
function ir() {
  if (Ve) return le;
  Ve = 1;
  var t = st;
  function n(u) {
    var s = "https://react.dev/errors/" + u;
    if (1 < arguments.length) {
      s += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var k = 2; k < arguments.length; k++)
        s += "&args[]=" + encodeURIComponent(arguments[k]);
    }
    return "Minified React error #" + u + "; visit " + s + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
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
  }, l = /* @__PURE__ */ Symbol.for("react.portal");
  function v(u, s, k) {
    var c = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: l,
      key: c == null ? null : "" + c,
      children: u,
      containerInfo: s,
      implementation: k
    };
  }
  var d = t.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function C(u, s) {
    if (u === "font") return "";
    if (typeof s == "string")
      return s === "use-credentials" ? s : "";
  }
  return le.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = o, le.createPortal = function(u, s) {
    var k = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!s || s.nodeType !== 1 && s.nodeType !== 9 && s.nodeType !== 11)
      throw Error(n(299));
    return v(u, s, null, k);
  }, le.flushSync = function(u) {
    var s = d.T, k = o.p;
    try {
      if (d.T = null, o.p = 2, u) return u();
    } finally {
      d.T = s, o.p = k, o.d.f();
    }
  }, le.preconnect = function(u, s) {
    typeof u == "string" && (s ? (s = s.crossOrigin, s = typeof s == "string" ? s === "use-credentials" ? s : "" : void 0) : s = null, o.d.C(u, s));
  }, le.prefetchDNS = function(u) {
    typeof u == "string" && o.d.D(u);
  }, le.preinit = function(u, s) {
    if (typeof u == "string" && s && typeof s.as == "string") {
      var k = s.as, c = C(k, s.crossOrigin), a = typeof s.integrity == "string" ? s.integrity : void 0, p = typeof s.fetchPriority == "string" ? s.fetchPriority : void 0;
      k === "style" ? o.d.S(
        u,
        typeof s.precedence == "string" ? s.precedence : void 0,
        {
          crossOrigin: c,
          integrity: a,
          fetchPriority: p
        }
      ) : k === "script" && o.d.X(u, {
        crossOrigin: c,
        integrity: a,
        fetchPriority: p,
        nonce: typeof s.nonce == "string" ? s.nonce : void 0
      });
    }
  }, le.preinitModule = function(u, s) {
    if (typeof u == "string")
      if (typeof s == "object" && s !== null) {
        if (s.as == null || s.as === "script") {
          var k = C(
            s.as,
            s.crossOrigin
          );
          o.d.M(u, {
            crossOrigin: k,
            integrity: typeof s.integrity == "string" ? s.integrity : void 0,
            nonce: typeof s.nonce == "string" ? s.nonce : void 0
          });
        }
      } else s == null && o.d.M(u);
  }, le.preload = function(u, s) {
    if (typeof u == "string" && typeof s == "object" && s !== null && typeof s.as == "string") {
      var k = s.as, c = C(k, s.crossOrigin);
      o.d.L(u, k, {
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
  }, le.preloadModule = function(u, s) {
    if (typeof u == "string")
      if (s) {
        var k = C(s.as, s.crossOrigin);
        o.d.m(u, {
          as: typeof s.as == "string" && s.as !== "script" ? s.as : void 0,
          crossOrigin: k,
          integrity: typeof s.integrity == "string" ? s.integrity : void 0
        });
      } else o.d.m(u);
  }, le.requestFormReset = function(u) {
    o.d.r(u);
  }, le.unstable_batchedUpdates = function(u, s) {
    return u(s);
  }, le.useFormState = function(u, s, k) {
    return d.H.useFormState(u, s, k);
  }, le.useFormStatus = function() {
    return d.H.useHostTransitionStatus();
  }, le.version = "19.2.7", le;
}
var de = {};
var Fe;
function cr() {
  return Fe || (Fe = 1, process.env.NODE_ENV !== "production" && (function() {
    function t() {
    }
    function n(c) {
      return "" + c;
    }
    function r(c, a, p) {
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
    function l(c) {
      return c === null ? "`null`" : c === void 0 ? "`undefined`" : c === "" ? "an empty string" : 'something with type "' + typeof c + '"';
    }
    function v(c) {
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
    var C = st, u = {
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
    }, s = /* @__PURE__ */ Symbol.for("react.portal"), k = C.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    typeof Map == "function" && Map.prototype != null && typeof Map.prototype.forEach == "function" && typeof Set == "function" && Set.prototype != null && typeof Set.prototype.clear == "function" && typeof Set.prototype.forEach == "function" || console.error(
      "React depends on Map and Set built-in types. Make sure that you load a polyfill in older browsers. https://reactjs.org/link/react-polyfills"
    ), de.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = u, de.createPortal = function(c, a) {
      var p = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
      if (!a || a.nodeType !== 1 && a.nodeType !== 9 && a.nodeType !== 11)
        throw Error("Target container is not a DOM element.");
      return r(c, a, null, p);
    }, de.flushSync = function(c) {
      var a = k.T, p = u.p;
      try {
        if (k.T = null, u.p = 2, c)
          return c();
      } finally {
        k.T = a, u.p = p, u.d.f() && console.error(
          "flushSync was called from inside a lifecycle method. React cannot flush when React is already rendering. Consider moving this call to a scheduler task or micro task."
        );
      }
    }, de.preconnect = function(c, a) {
      typeof c == "string" && c ? a != null && typeof a != "object" ? console.error(
        "ReactDOM.preconnect(): Expected the `options` argument (second) to be an object but encountered %s instead. The only supported option at this time is `crossOrigin` which accepts a string.",
        v(a)
      ) : a != null && typeof a.crossOrigin != "string" && console.error(
        "ReactDOM.preconnect(): Expected the `crossOrigin` option (second argument) to be a string but encountered %s instead. Try removing this option or passing a string value instead.",
        l(a.crossOrigin)
      ) : console.error(
        "ReactDOM.preconnect(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
        l(c)
      ), typeof c == "string" && (a ? (a = a.crossOrigin, a = typeof a == "string" ? a === "use-credentials" ? a : "" : void 0) : a = null, u.d.C(c, a));
    }, de.prefetchDNS = function(c) {
      if (typeof c != "string" || !c)
        console.error(
          "ReactDOM.prefetchDNS(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
          l(c)
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
      typeof c == "string" && u.d.D(c);
    }, de.preinit = function(c, a) {
      if (typeof c == "string" && c ? a == null || typeof a != "object" ? console.error(
        "ReactDOM.preinit(): Expected the `options` argument (second) to be an object with an `as` property describing the type of resource to be preinitialized but encountered %s instead.",
        v(a)
      ) : a.as !== "style" && a.as !== "script" && console.error(
        'ReactDOM.preinit(): Expected the `as` property in the `options` argument (second) to contain a valid value describing the type of resource to be preinitialized but encountered %s instead. Valid values for `as` are "style" and "script".',
        v(a.as)
      ) : console.error(
        "ReactDOM.preinit(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
        l(c)
      ), typeof c == "string" && a && typeof a.as == "string") {
        var p = a.as, h = o(p, a.crossOrigin), m = typeof a.integrity == "string" ? a.integrity : void 0, L = typeof a.fetchPriority == "string" ? a.fetchPriority : void 0;
        p === "style" ? u.d.S(
          c,
          typeof a.precedence == "string" ? a.precedence : void 0,
          {
            crossOrigin: h,
            integrity: m,
            fetchPriority: L
          }
        ) : p === "script" && u.d.X(c, {
          crossOrigin: h,
          integrity: m,
          fetchPriority: L,
          nonce: typeof a.nonce == "string" ? a.nonce : void 0
        });
      }
    }, de.preinitModule = function(c, a) {
      var p = "";
      typeof c == "string" && c || (p += " The `href` argument encountered was " + l(c) + "."), a !== void 0 && typeof a != "object" ? p += " The `options` argument encountered was " + l(a) + "." : a && "as" in a && a.as !== "script" && (p += " The `as` option encountered was " + v(a.as) + "."), p ? console.error(
        "ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` string and, optionally, an `options` object with a valid `as` property.%s",
        p
      ) : (p = a && typeof a.as == "string" ? a.as : "script", p) === "script" || (p = v(p), console.error(
        'ReactDOM.preinitModule(): Currently the only supported "as" type for this function is "script" but received "%s" instead. This warning was generated for `href` "%s". In the future other module types will be supported, aligning with the import-attributes proposal. Learn more here: (https://github.com/tc39/proposal-import-attributes)',
        p,
        c
      )), typeof c == "string" && (typeof a == "object" && a !== null ? (a.as == null || a.as === "script") && (p = o(
        a.as,
        a.crossOrigin
      ), u.d.M(c, {
        crossOrigin: p,
        integrity: typeof a.integrity == "string" ? a.integrity : void 0,
        nonce: typeof a.nonce == "string" ? a.nonce : void 0
      })) : a == null && u.d.M(c));
    }, de.preload = function(c, a) {
      var p = "";
      if (typeof c == "string" && c || (p += " The `href` argument encountered was " + l(c) + "."), a == null || typeof a != "object" ? p += " The `options` argument encountered was " + l(a) + "." : typeof a.as == "string" && a.as || (p += " The `as` option encountered was " + l(a.as) + "."), p && console.error(
        'ReactDOM.preload(): Expected two arguments, a non-empty `href` string and an `options` object with an `as` property valid for a `<link rel="preload" as="..." />` tag.%s',
        p
      ), typeof c == "string" && typeof a == "object" && a !== null && typeof a.as == "string") {
        p = a.as;
        var h = o(
          p,
          a.crossOrigin
        );
        u.d.L(c, p, {
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
    }, de.preloadModule = function(c, a) {
      var p = "";
      typeof c == "string" && c || (p += " The `href` argument encountered was " + l(c) + "."), a !== void 0 && typeof a != "object" ? p += " The `options` argument encountered was " + l(a) + "." : a && "as" in a && typeof a.as != "string" && (p += " The `as` option encountered was " + l(a.as) + "."), p && console.error(
        'ReactDOM.preloadModule(): Expected two arguments, a non-empty `href` string and, optionally, an `options` object with an `as` property valid for a `<link rel="modulepreload" as="..." />` tag.%s',
        p
      ), typeof c == "string" && (a ? (p = o(
        a.as,
        a.crossOrigin
      ), u.d.m(c, {
        as: typeof a.as == "string" && a.as !== "script" ? a.as : void 0,
        crossOrigin: p,
        integrity: typeof a.integrity == "string" ? a.integrity : void 0
      })) : u.d.m(c));
    }, de.requestFormReset = function(c) {
      u.d.r(c);
    }, de.unstable_batchedUpdates = function(c, a) {
      return c(a);
    }, de.useFormState = function(c, a, p) {
      return d().useFormState(c, a, p);
    }, de.useFormStatus = function() {
      return d().useHostTransitionStatus();
    }, de.version = "19.2.7", typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop == "function" && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
  })()), de;
}
var Be;
function lr() {
  if (Be) return Ne.exports;
  Be = 1;
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
var ot = lr();
function dr(t) {
  if (t.width <= 0 || t.height <= 0) return !1;
  try {
    const n = t.getContext("2d", { willReadFrequently: !0 });
    if (!n) return !1;
    const r = [0, Math.floor(t.width / 2), t.width - 1], o = [0, Math.floor(t.height / 2), t.height - 1], l = r.flatMap((v) => o.map((d) => n.getImageData(v, d, 1, 1).data));
    if (l.every((v) => v[3] === 0)) return !1;
    for (let v = 0; v < 3; v += 1) {
      const d = l.map((C) => C[v]);
      if (Math.max(...d) - Math.min(...d) > 6) return !0;
    }
    return !1;
  } catch {
    return !1;
  }
}
function it({
  session: t,
  viewOnly: n,
  compact: r = !1,
  onReconnect: o,
  onDisconnect: l
}) {
  const v = W(null), d = W(l), [C, u] = N("connecting"), [s, k] = N();
  return q(() => {
    d.current = l;
  }, [l]), q(() => {
    if (!v.current) return;
    let c = !1, a = !1, p = !1, h = !1, m, L, R, D;
    (r ? v.current.closest(".computer-preview") : null)?.style.removeProperty("aspect-ratio"), u("connecting"), k(void 0);
    const X = () => {
      m && window.clearInterval(m), L && window.clearTimeout(L), m = void 0, L = void 0;
    }, w = () => {
      R && window.clearTimeout(R), R = void 0;
    }, H = () => {
      h || (h = !0, d.current?.());
    }, ee = (V) => {
      c || a || (a = !0, w(), X(), k(V), u("disconnected"), H(), D?.disconnect());
    }, ne = () => {
      const V = v.current?.querySelector("canvas");
      return V ? dr(V) : !1;
    }, Z = () => {
      c || a || (w(), p = !0, m = window.setInterval(() => {
        !c && ne() && (X(), u("connected"));
      }, 100), L = window.setTimeout(() => {
        ne() || ee("This computer connected but never drew a frame.");
      }, 8e3));
    }, re = (V) => {
      if (c || a) return;
      w(), X();
      const ue = V.detail?.clean;
      k((ae) => ae ?? (p && ue ? "This computer stopped before drawing a frame." : ue ? "This computer disconnected." : "The connection to this computer was lost.")), u("disconnected"), H();
    }, Q = (V) => {
      ee(V.detail?.reason ?? "Screen security negotiation failed.");
    }, G = () => ee("This computer's screen is asking for a VNC password.");
    return R = window.setTimeout(() => ee("This computer's screen did not answer."), 15e3), import("./chunk-rfb-DFY61DWN.js").then(({ default: V }) => {
      c || a || !v.current || (D = new V(v.current, t.url, { shared: !0, wsProtocols: t.protocols }), D.viewOnly = n, D.scaleViewport = !0, D.resizeSession = !1, r && (D.background = "transparent"), D.addEventListener("connect", Z), D.addEventListener("disconnect", re), D.addEventListener("securityfailure", Q), D.addEventListener("credentialsrequired", G));
    }).catch(() => ee("Could not load the screen client.")), () => {
      c = !0, w(), X(), D?.removeEventListener("connect", Z), D?.removeEventListener("disconnect", re), D?.removeEventListener("securityfailure", Q), D?.removeEventListener("credentialsrequired", G), D?.disconnect();
    };
  }, [r, t, n]), /* @__PURE__ */ e.createElement("div", { className: `vnc-viewport ${r ? "is-compact" : ""}` }, /* @__PURE__ */ e.createElement("div", { ref: v, className: "vnc-target" }), C !== "connected" && /* @__PURE__ */ e.createElement("div", { className: "vnc-status", role: "status" }, C === "connecting" ? /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement(Me, { size: r ? 14 : 18, className: "spin" }), !r && "Connecting…") : /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("span", null, r ? "Screen unavailable" : s), o && /* @__PURE__ */ e.createElement("button", { className: "secondary-button", onClick: o }, "Reconnect"))));
}
function ur({
  session: t,
  failure: n,
  title: r,
  onClose: o,
  onReconnect: l
}) {
  return ot.createPortal(/* @__PURE__ */ e.createElement("div", { className: "vnc-desktop", role: "dialog", "aria-label": r }, /* @__PURE__ */ e.createElement("div", { className: "vnc-titlebar", "aria-hidden": "true" }), /* @__PURE__ */ e.createElement("button", { className: "vnc-close", "aria-label": "Close this screen", onClick: o }, /* @__PURE__ */ e.createElement(dn, { size: 18 })), t ? /* @__PURE__ */ e.createElement(it, { session: t, viewOnly: !1, onReconnect: l }) : /* @__PURE__ */ e.createElement("div", { className: "vnc-viewport" }, /* @__PURE__ */ e.createElement("div", { className: "vnc-status", role: "status" }, n ? /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement("span", null, n), /* @__PURE__ */ e.createElement("button", { className: "secondary-button", onClick: l }, "Reconnect")) : /* @__PURE__ */ e.createElement(e.Fragment, null, /* @__PURE__ */ e.createElement(Me, { size: 18, className: "spin" }), " Connecting…")))), document.body);
}
function mr({
  open: t,
  width: n,
  onResize: r,
  agentName: o,
  computer: l,
  approvals: v,
  routines: d,
  grants: C,
  grantsBusy: u,
  audit: s,
  auditLoading: k,
  auditView: c,
  auditHasMore: a,
  artifacts: p,
  artifactUrl: h,
  tasks: m,
  proactive: L,
  onSetProactive: R,
  onApproval: D,
  onComputerAction: $,
  onDeleteRoutine: X,
  onSetGrant: w,
  onClearGrant: H,
  onChangeAuditView: ee,
  onLoadMoreAudit: ne,
  onClose: Z
}) {
  const [re, Q] = N(""), [G, V] = N(""), [ue, ae] = N(!1), [ce, pe] = N(() => /* @__PURE__ */ new Map()), [F, te] = N(""), [J, B] = N(() => /* @__PURE__ */ new Set()), [me, oe] = N(), [se, O] = N(!1), [x, K] = N(), b = v.filter((i) => i.status === "pending"), M = ce.get(l?.id ?? ""), U = J.has(l?.id ?? ""), j = W($);
  q(() => {
    j.current = $;
  }, [$]), q(() => {
    const i = l?.id;
    if (!t || se || l?.status !== "online" || !i || M || U) return;
    let _ = !0;
    return te(i), j.current("open").then((T) => {
      _ && (pe((P) => new Map(P).set(i, T)), te(""));
    }).catch(() => {
      _ && (B((T) => new Set(T).add(i)), te(""));
    }), () => {
      _ = !1;
    };
  }, [l?.id, l?.status, se, t, U, M]);
  async function I(i) {
    O(!0), oe(void 0), K(void 0), ae(!0);
    const _ = l?.id;
    _ && J.has(_) && (B((T) => {
      const P = new Set(T);
      return P.delete(_), P;
    }), pe((T) => {
      const P = new Map(T);
      return P.delete(_), P;
    }));
    try {
      oe(await $(i));
    } catch (T) {
      K(T instanceof Error ? T.message : "Could not reach that computer.");
    } finally {
      ae(!1);
    }
  }
  function y() {
    O(!1), oe(void 0), K(void 0);
  }
  const E = () => window.innerWidth <= 1030 ? Math.min(730, window.innerWidth - 40) : Math.min(730, window.innerWidth - (window.innerWidth <= 1180 ? 672 : 732));
  q(() => {
    const i = () => {
      const _ = Math.max(280, E());
      n > _ && r(_);
    };
    return i(), window.addEventListener("resize", i), () => window.removeEventListener("resize", i);
  }, [r, n]);
  const g = (i) => r(Math.max(280, Math.min(E(), window.innerWidth - i)));
  return /* @__PURE__ */ e.createElement("aside", { className: `detail-panel ${t ? "is-open" : "is-closing"}`, style: { width: n } }, /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "detail-resize-handle",
      role: "separator",
      "aria-label": "Resize the details panel",
      "aria-orientation": "vertical",
      "aria-valuemin": 280,
      "aria-valuemax": Math.max(280, E()),
      "aria-valuenow": n,
      tabIndex: 0,
      onKeyDown: (i) => {
        i.key === "ArrowLeft" ? (i.preventDefault(), r(Math.min(E(), n + 16))) : i.key === "ArrowRight" && (i.preventDefault(), r(Math.max(280, n - 16)));
      },
      onPointerDown: (i) => {
        i.currentTarget.setPointerCapture(i.pointerId), g(i.clientX);
      },
      onPointerMove: (i) => {
        i.currentTarget.hasPointerCapture(i.pointerId) && g(i.clientX);
      }
    }
  ), /* @__PURE__ */ e.createElement("header", null, /* @__PURE__ */ e.createElement("button", { className: "icon-button", "aria-label": "Close the details panel", onClick: Z }, /* @__PURE__ */ e.createElement(Gt, { size: 18 }))), v.filter((i) => i.outcome === "outcome_unknown").map((i) => /* @__PURE__ */ e.createElement("section", { className: "approval-card is-uncertain", key: `unknown-${i.id}` }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow warning" }, /* @__PURE__ */ e.createElement(Ie, { size: 14 }), " Outcome unknown"), /* @__PURE__ */ e.createElement("h3", null, i.title), /* @__PURE__ */ e.createElement("p", null, "You allowed this and the process stopped before anything recorded whether it went through. It may have. Check before allowing it again."))), b.map((i) => /* @__PURE__ */ e.createElement("section", { className: "approval-card", key: i.id }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow warning" }, /* @__PURE__ */ e.createElement(Ie, { size: 14 }), " Waiting for you", i.source && i.source !== i.agentId && /* @__PURE__ */ e.createElement("span", { className: "approval-source" }, i.source), i.ref && /* @__PURE__ */ e.createElement("code", { className: "approval-ref", title: "Reply with this in the thread to decide without opening the panel" }, i.ref)), /* @__PURE__ */ e.createElement("h3", null, i.title), i.description && /* @__PURE__ */ e.createElement("p", null, i.description), i.scope.length > 0 && /* @__PURE__ */ e.createElement("div", { className: "scope" }, /* @__PURE__ */ e.createElement("span", null, "This allows:"), i.scope.map((_) => /* @__PURE__ */ e.createElement("div", { key: _ }, /* @__PURE__ */ e.createElement(Ce, { size: 13 }), _))), /* @__PURE__ */ e.createElement(
    "textarea",
    {
      "aria-label": "Note for this decision",
      placeholder: "Add a note (optional)",
      value: re,
      onChange: (_) => Q(_.target.value)
    }
  ), /* @__PURE__ */ e.createElement("div", { className: "approval-actions" }, /* @__PURE__ */ e.createElement("button", { className: "secondary-button danger-text", onClick: () => {
    D(i.id, "deny", re, i.contentHash);
  } }, "Discard"), /* @__PURE__ */ e.createElement("button", { className: "primary-button", onClick: () => {
    D(i.id, "allow", re, i.contentHash);
  } }, "Approve")))), /* @__PURE__ */ e.createElement("section", { className: "screen-section" }, /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "screen-trigger",
      disabled: ue || l?.status !== "online",
      "aria-label": `Open ${o}'s screen`,
      onClick: () => {
        I("open");
      }
    },
    /* @__PURE__ */ e.createElement("span", { className: "computer-preview" }, [...ce].map(([i, _]) => /* @__PURE__ */ e.createElement(
      "span",
      {
        className: `computer-preview-stream ${i === l?.id ? "is-active" : ""}`,
        key: i
      },
      /* @__PURE__ */ e.createElement(
        it,
        {
          session: _,
          viewOnly: !0,
          compact: !0,
          onDisconnect: () => B((T) => new Set(T).add(i))
        }
      )
    )), !ce.has(l?.id ?? "") && (F === l?.id ? /* @__PURE__ */ e.createElement("span", { className: "computer-preview-loading", role: "status", "aria-label": `Loading ${o}'s screen` }, /* @__PURE__ */ e.createElement(Me, { size: 18, className: "spin" })) : J.has(l?.id ?? "") ? /* @__PURE__ */ e.createElement("span", { className: "computer-preview-loading", role: "status" }, "Screen unavailable") : /* @__PURE__ */ e.createElement("span", { className: "computer-screen-off", "aria-hidden": "true" })), /* @__PURE__ */ e.createElement("span", { className: "screen-hover-action" }, /* @__PURE__ */ e.createElement(ln, { size: 14 }), " Open"))
  ), /* @__PURE__ */ e.createElement("div", { className: "screen-caption" }, /* @__PURE__ */ e.createElement("span", null, o, "'s screen"), /* @__PURE__ */ e.createElement("span", { className: `screen-state ${l?.status ?? "offline"}` }, l?.status === "online" ? "Running" : l?.status === "starting" ? "Starting…" : "Off")), l && l.status !== "online" && /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "secondary-button",
      disabled: ue,
      onClick: () => {
        I("takeover");
      }
    },
    "Start this computer"
  ), l?.error && /* @__PURE__ */ e.createElement("p", { className: "screen-error" }, l.error)), /* @__PURE__ */ e.createElement("section", { className: "proactive-section" }, /* @__PURE__ */ e.createElement("label", { className: "proactive-row" }, /* @__PURE__ */ e.createElement(
    "input",
    {
      type: "checkbox",
      checked: L,
      onChange: (i) => {
        R(i.target.checked);
      }
    }
  ), /* @__PURE__ */ e.createElement("span", null, /* @__PURE__ */ e.createElement("strong", null, "Speak up unprompted"), /* @__PURE__ */ e.createElement("span", null, "Bring up work that is stuck, a few times a day, in this thread.")))), d.length > 0 && /* @__PURE__ */ e.createElement("section", { className: "routines-section" }, /* @__PURE__ */ e.createElement("div", { className: "eyebrow" }, "Routines"), d.map((i) => /* @__PURE__ */ e.createElement("div", { className: "routine-row", key: i.id }, /* @__PURE__ */ e.createElement("div", null, /* @__PURE__ */ e.createElement("strong", null, i.name), /* @__PURE__ */ e.createElement("span", null, i.schedule)), /* @__PURE__ */ e.createElement(
    "button",
    {
      className: "icon-button",
      "aria-label": `Cancel the routine ${i.name}`,
      onClick: () => {
        X(i.id);
      }
    },
    /* @__PURE__ */ e.createElement(rt, { size: 14 })
  )))), /* @__PURE__ */ e.createElement("section", { className: "drawer-section" }, /* @__PURE__ */ e.createElement("div", { className: "drawer-tabs", role: "tablist", "aria-label": "More about this teammate" }, /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": G === "work",
      className: G === "work" ? "is-current" : "",
      onClick: () => V((i) => i === "work" ? "" : "work")
    },
    "Work"
  ), /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": G === "files",
      className: G === "files" ? "is-current" : "",
      onClick: () => V((i) => i === "files" ? "" : "files")
    },
    "Files",
    p.length > 0 && /* @__PURE__ */ e.createElement("span", { className: "drawer-count" }, p.length)
  ), /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": G === "permissions",
      className: G === "permissions" ? "is-current" : "",
      onClick: () => V((i) => i === "permissions" ? "" : "permissions")
    },
    "Permissions"
  ), /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": G === "audit",
      className: G === "audit" ? "is-current" : "",
      onClick: () => V((i) => i === "audit" ? "" : "audit")
    },
    "History"
  )), G === "work" && /* @__PURE__ */ e.createElement(rr, { agentName: o, tasks: m }), G === "files" && /* @__PURE__ */ e.createElement(
    Zn,
    {
      agentName: o,
      artifacts: p,
      urlFor: h
    }
  ), G === "permissions" && /* @__PURE__ */ e.createElement(
    sr,
    {
      agentName: o,
      grants: C,
      busy: u,
      onSetGrant: w,
      onClearGrant: H
    }
  ), G === "audit" && /* @__PURE__ */ e.createElement(
    Kn,
    {
      events: s,
      loading: k,
      viewId: c,
      hasMore: a,
      onChangeView: ee,
      onLoadMore: ne
    }
  )), se && /* @__PURE__ */ e.createElement(
    ur,
    {
      session: me,
      failure: x,
      title: `${o}'s computer`,
      onClose: y,
      onReconnect: () => {
        I("takeover");
      }
    }
  ));
}
function pr({
  value: t,
  options: n,
  ariaLabel: r,
  placeholder: o = "Select",
  onChange: l,
  onOpen: v
}) {
  const [d, C] = N(!1), [u, s] = N(), k = W(null), c = W(null), a = n.find((m) => m.value === t);
  q(() => {
    if (!d) return;
    const m = () => {
      const R = k.current?.getBoundingClientRect();
      if (!R) return;
      const D = 5, $ = 8, X = Math.max(R.width, 180), w = Math.min(220, n.length * 32 + 10), H = window.innerHeight - R.bottom - $, ee = H < w && R.top - $ > H;
      s({
        position: "fixed",
        zIndex: 100,
        left: Math.max($, Math.min(R.right - X, window.innerWidth - X - $)),
        top: ee ? Math.max($, R.top - w - D) : R.bottom + D,
        width: X,
        maxHeight: ee ? Math.min(220, R.top - D - $) : Math.min(220, H)
      });
    }, L = (R) => {
      const D = R.target;
      !k.current?.contains(D) && !c.current?.contains(D) && C(!1);
    };
    return m(), window.addEventListener("pointerdown", L), window.addEventListener("resize", m), window.addEventListener("scroll", m, !0), () => {
      window.removeEventListener("pointerdown", L), window.removeEventListener("resize", m), window.removeEventListener("scroll", m, !0);
    };
  }, [d, n.length]);
  const p = (m) => {
    const L = n.filter(($) => !$.disabled && !$.action);
    if (!L.length) return;
    const R = L.findIndex(($) => $.value === t), D = R < 0 ? m > 0 ? 0 : L.length - 1 : (R + m + L.length) % L.length;
    l(L[D].value);
  }, h = () => C((m) => (m || v?.(), !m));
  return /* @__PURE__ */ e.createElement("div", { className: `crew-select ${d ? "open" : ""}`, ref: k }, /* @__PURE__ */ e.createElement(
    "button",
    {
      type: "button",
      className: "crew-select-trigger",
      "aria-label": r,
      "aria-haspopup": "listbox",
      "aria-expanded": d,
      onClick: h,
      onKeyDown: (m) => {
        if (m.key === "Escape") {
          C(!1);
          return;
        }
        (m.key === "ArrowDown" || m.key === "ArrowUp") && (m.preventDefault(), p(m.key === "ArrowDown" ? 1 : -1), d || v?.(), C(!0));
      }
    },
    /* @__PURE__ */ e.createElement("span", null, a?.label ?? o),
    /* @__PURE__ */ e.createElement("span", { className: "crew-select-chevron" }, /* @__PURE__ */ e.createElement(Wt, { size: 15 }))
  ), d && u && ot.createPortal(
    /* @__PURE__ */ e.createElement(
      "div",
      {
        className: "crew-select-menu crew-select-menu-portal",
        ref: c,
        style: u,
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
            m.action?.(), m.action || l(m.value), C(!1);
          }
        },
        (m.action || m.icon) && /* @__PURE__ */ e.createElement("span", { className: "crew-select-check", "aria-hidden": "true" }, m.icon),
        /* @__PURE__ */ e.createElement("span", { className: "crew-select-label", title: m.label }, m.label),
        !m.action && /* @__PURE__ */ e.createElement("span", { className: "crew-select-check", "aria-hidden": "true" }, m.value === t && /* @__PURE__ */ e.createElement(Ce, { size: 14 }))
      ))
    ),
    document.body
  ));
}
const hr = ["🤖", "🔎", "📥", "📈", "🎖️", "🧭", "🛠️", "📚", "🧪", "✍️", "🗂️", "🛰️"];
function We({
  editing: t,
  providers: n,
  busy: r,
  error: o,
  onSubmit: l,
  onClose: v
}) {
  const [d, C] = N(t?.name ?? ""), [u, s] = N(t?.role ?? ""), [k, c] = N(t?.avatar || "🤖"), [a, p] = N("");
  q(() => {
    const m = (L) => {
      L.key === "Escape" && v();
    };
    return window.addEventListener("keydown", m), () => window.removeEventListener("keydown", m);
  }, [v]);
  const h = !!d.trim() && !r;
  return /* @__PURE__ */ e.createElement(
    "div",
    {
      className: "palette-backdrop",
      role: "presentation",
      onMouseDown: (m) => {
        m.target === m.currentTarget && v();
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
          m.preventDefault(), h && l({ name: d.trim(), role: u.trim(), emoji: k, modelProviderId: a });
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
          onChange: (m) => C(m.target.value)
        }
      ), t && /* @__PURE__ */ e.createElement("small", null, "A teammate's name is its profile directory, so it cannot be changed here.")),
      /* @__PURE__ */ e.createElement("label", { className: "crew-field" }, /* @__PURE__ */ e.createElement("span", null, "Their job, in one line"), /* @__PURE__ */ e.createElement(
        "input",
        {
          autoFocus: !!t,
          value: u,
          placeholder: "Turns a one-line question into a decision-ready brief with sources",
          onChange: (m) => s(m.target.value)
        }
      )),
      /* @__PURE__ */ e.createElement("div", { className: "crew-field" }, /* @__PURE__ */ e.createElement("span", null, "Face"), /* @__PURE__ */ e.createElement("div", { className: "crew-emoji-row" }, hr.map((m) => /* @__PURE__ */ e.createElement(
        "button",
        {
          type: "button",
          key: m,
          className: `crew-emoji ${m === k ? "selected" : ""}`,
          "aria-label": `Use ${m}`,
          "aria-pressed": m === k,
          onClick: () => c(m)
        },
        m
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
            ...n.map((m) => ({
              value: m.id,
              label: m.defaultModel ? `${m.name} · ${m.defaultModel}` : m.name
            }))
          ],
          onChange: p
        }
      )),
      o && /* @__PURE__ */ e.createElement("p", { className: "crew-dialog-error" }, o),
      /* @__PURE__ */ e.createElement("div", { className: "crew-dialog-actions" }, /* @__PURE__ */ e.createElement("button", { type: "button", className: "secondary-button", onClick: v }, "Cancel"), /* @__PURE__ */ e.createElement("button", { className: "primary-button", disabled: !h }, r ? "Working…" : t ? "Save" : "Hire"))
    )
  );
}
const ct = "hermes-crew:detail-width";
function fr() {
  try {
    const t = window.localStorage?.getItem(ct), n = t ? Number.parseInt(t, 10) : Number.NaN;
    return Number.isFinite(n) ? Math.max(280, n) : 360;
  } catch {
    return 360;
  }
}
function gr({ client: t, notify: n }) {
  const r = zt(t, { notify: n }), [o, l] = N(""), [v, d] = N([]), [C, u] = N([]), [s, k] = N([]), [c, a] = N(!1), [p, h] = N([]), [m, L] = N(!1), [R, D] = N({ id: "all", types: [] }), [$, X] = N(null), [w, H] = N([]), [ee, ne] = N([]), [Z, re] = N(!1), [Q, G] = N(fr), [V, ue] = N(!1), [ae, ce] = N(), [pe, F] = N(!1), [te, J] = N(), [B, me] = N(0), { agents: oe, conversations: se, selectedAgent: O, selectedAgentId: x, selectedThreadId: K } = r, b = he(() => se.filter((f) => f.kind === "group"), [se]), M = he(() => new Map(oe.map((f) => [f.id, f])), [oe]), U = he(
    () => se.find((f) => f.id === K),
    [se, K]
  ), j = r.approvals.filter((f) => f.status === "pending").length;
  q(() => {
    try {
      window.localStorage?.setItem(ct, String(Q));
    } catch {
    }
  }, [Q]);
  const I = ve(() => {
    t.listSections().then(d).catch(() => d([]));
  }, [t]);
  q(I, [I, oe.length]), q(() => {
    if (!x) {
      u([]);
      return;
    }
    let f = !0;
    return t.listRoutines(x).then((S) => {
      f && u(S);
    }).catch(() => {
      f && u([]);
    }), () => {
      f = !1;
    };
  }, [t, x]), q(() => {
    if (!x) {
      k([]);
      return;
    }
    let f = !0;
    return t.listGrants(x).then((S) => {
      f && k(S);
    }).catch(() => {
      f && k([]);
    }), () => {
      f = !1;
    };
  }, [t, x]);
  const y = ve(() => {
    if (!x) {
      H([]);
      return;
    }
    t.listArtifacts(x).then(H).catch(() => H([]));
  }, [t, x]);
  q(y, [y]);
  const E = O?.status;
  q(() => {
    E !== "working" && y();
  }, [E, y]), q(() => {
    if (!x) {
      ne([]);
      return;
    }
    let f = !0;
    return t.listTasks(x).then((S) => {
      f && ne(S);
    }).catch(() => {
      f && ne([]);
    }), () => {
      f = !1;
    };
  }, [t, x, E]);
  const g = ve((f, S) => {
    if (!x) {
      h([]), X(null);
      return;
    }
    L(!0), t.listAuditEvents({
      agentId: x,
      eventTypes: f,
      beforeId: S,
      limit: 50
    }).then((Y) => {
      h((z) => S ? [...z, ...Y.events] : Y.events), X(Y.nextBeforeId);
    }).catch(() => {
      S || (h([]), X(null));
    }).finally(() => L(!1));
  }, [t, x]);
  q(() => {
    g(R.types);
  }, [g, R]), q(() => {
    j > 0 && re(!0);
  }, [j]), q(() => {
    const f = (S) => {
      (S.metaKey || S.ctrlKey) && S.key.toLowerCase() === "k" && (S.preventDefault(), ue((Y) => !Y));
    };
    return window.addEventListener("keydown", f), () => window.removeEventListener("keydown", f);
  }, []);
  const i = (f, S) => {
    const Y = v.map((z) => z.id === f ? { ...z, collapsed: S } : z);
    d(Y), t.saveSections(Y).then(d).catch(I);
  }, _ = (f, S) => {
    if (S === "edit") {
      J(void 0), ce({ editing: f });
      return;
    }
    if (S === "duplicate") {
      r.duplicateAgent(f.id).catch(() => {
      });
      return;
    }
    window.confirm(`Remove ${f.name} from the crew? Their profile, memory and skills stay on disk.`) && r.deleteAgent(f.id).catch(() => {
    });
  }, T = async (f) => {
    F(!0), J(void 0);
    try {
      ae?.editing ? await r.updateAgent(ae.editing.id, { role: f.role, emoji: f.emoji }) : await r.createAgent({
        name: f.name,
        role: f.role,
        emoji: f.emoji,
        modelProviderId: f.modelProviderId || void 0
      }), ce(void 0), I();
    } catch (S) {
      J(S instanceof Error ? S.message : "That did not work.");
    } finally {
      F(!1);
    }
  }, P = he(() => ({
    onDecide: (f, S) => {
      r.respondToApproval(f, S).catch(() => {
      });
    },
    // A login request is the one chip that is an instruction to the operator,
    // so its button does the thing rather than pointing at where the thing is.
    onOpenScreen: () => {
      re(!0), r.openComputer("takeover").catch(() => {
      });
    },
    onSubmitSecret: async (f, S) => {
      O && await t.submitSecret(O.id, f, S);
    },
    screenshotUrl: (f, S) => t.screenshotUrl(f, S)
  }), [t, r]);
  return r.loading ? /* @__PURE__ */ e.createElement("div", { className: "crew-workspace is-loading", role: "status" }, "Loading your crew…") : oe.length ? /* @__PURE__ */ e.createElement("div", { className: "crew-workspace" }, /* @__PURE__ */ e.createElement(
    Nn,
    {
      agents: oe,
      sections: v,
      rooms: b,
      selectedAgentId: x,
      selectedThreadId: K,
      search: o,
      onSearch: l,
      onSelectAgent: (f) => {
        r.setSelectedAgentId(f), me((S) => S + 1);
      },
      onSelectThread: (f) => {
        r.setSelectedThreadId(f), me((S) => S + 1);
      },
      onAction: _,
      onCreate: () => {
        J(void 0), ce({});
      },
      onToggleSection: i
    }
  ), /* @__PURE__ */ e.createElement(
    Vn,
    {
      agent: O,
      thread: U,
      agentsById: M,
      messages: r.messages,
      activities: r.activities,
      chips: P,
      loading: r.conversationLoading,
      focusRequest: B,
      onSend: (f) => r.sendMessage(f).catch(() => {
      }),
      onToggleDetails: () => re((f) => !f)
    }
  ), Z && O && /* @__PURE__ */ e.createElement(
    mr,
    {
      open: Z,
      width: Q,
      onResize: G,
      agentName: O.name,
      computer: r.computer,
      approvals: r.approvals,
      routines: C,
      grants: s,
      grantsBusy: c,
      audit: p,
      auditLoading: m,
      auditView: R.id,
      auditHasMore: $ !== null,
      artifacts: w,
      artifactUrl: (f) => t.artifactUrl(f),
      tasks: ee,
      proactive: O.proactive !== !1,
      onSetProactive: (f) => r.updateAgent(O.id, { proactive: f }),
      onApproval: (f, S, Y, z) => r.respondToApproval(f, S, Y, z),
      onComputerAction: (f) => r.openComputer(f),
      onDeleteRoutine: async (f) => {
        await t.deleteRoutine(O.id, f), u((S) => S.filter((Y) => Y.id !== f));
      },
      onSetGrant: async (f, S) => {
        a(!0);
        try {
          const Y = await t.setGrant({ agentId: O.id, tool: f, mode: S });
          k((z) => z.map((ie) => ie.tool === f ? { ...ie, ...Y } : ie));
        } finally {
          a(!1);
        }
      },
      onClearGrant: async (f) => {
        a(!0);
        try {
          const S = await t.clearGrant(O.id, f);
          k((Y) => Y.map((z) => z.tool === f ? { ...z, ...S } : z));
        } finally {
          a(!1);
        }
      },
      onChangeAuditView: (f, S) => D({ id: f, types: S }),
      onLoadMoreAudit: () => {
        $ !== null && g(R.types, $);
      },
      onClose: () => re(!1)
    }
  ), /* @__PURE__ */ e.createElement(
    Sn,
    {
      open: V,
      agents: oe,
      rooms: b,
      onClose: () => ue(!1),
      onSelectAgent: r.setSelectedAgentId,
      onSelectThread: r.setSelectedThreadId,
      onCreateAgent: () => {
        J(void 0), ce({});
      },
      onComputer: () => re(!0)
    }
  ), ae && /* @__PURE__ */ e.createElement(
    We,
    {
      editing: ae.editing,
      providers: r.modelProviders,
      busy: pe,
      error: te,
      onSubmit: T,
      onClose: () => ce(void 0)
    }
  ), r.error && /* @__PURE__ */ e.createElement("div", { className: "crew-toast", role: "alert" }, /* @__PURE__ */ e.createElement("span", null, r.error), /* @__PURE__ */ e.createElement("button", { className: "icon-button", "aria-label": "Dismiss", onClick: r.dismissError }, "×"))) : /* @__PURE__ */ e.createElement("div", { className: "crew-workspace is-empty" }, /* @__PURE__ */ e.createElement("div", { className: "crew-empty-card" }, /* @__PURE__ */ e.createElement("h2", null, "No teammates yet"), /* @__PURE__ */ e.createElement("p", null, "A teammate is a Hermes profile with a thread, a memory and a computer of its own. Give one a name and a one-line job to start."), /* @__PURE__ */ e.createElement("button", { className: "primary-button", onClick: () => {
    J(void 0), ce({});
  } }, "Hire your first teammate")), ae && /* @__PURE__ */ e.createElement(
    We,
    {
      providers: r.modelProviders,
      busy: pe,
      error: te,
      onSubmit: T,
      onClose: () => ce(void 0)
    }
  ));
}
const _e = 500, yr = 15e3;
function vr(t, n) {
  return t === 401 || t === 403 ? new ye("unauthorized", n) : t === 404 ? new ye("not_found", n) : t === 409 ? new ye("conflict", n) : new ye("unknown", n, t >= 500);
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
    this.resolveEventsUrl = typeof r == "function" ? r : async () => r, this.fetchImpl = n.fetchImpl ?? ((o, l) => fetch(o, l)), this.headers = n.headers ?? (() => ({}));
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
    } catch (l) {
      throw l instanceof DOMException && l.name === "AbortError" ? l : new ye("network", "Could not reach the crew backend.", !0);
    }
    if (!o.ok) {
      const l = await o.json().then((v) => v?.detail).catch(() => {
      });
      throw vr(o.status, l ?? `Crew request failed (${o.status})`);
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
  /**
   * Hand one field to the teammate's page. The value is an argument and
   * nothing else — it is not cached, not retried, and the response carries
   * no echo of it.
   */
  submitSecret(n, r, o, l) {
    return this.request(
      `/bots/${encodeURIComponent(n)}/secret`,
      { method: "POST", body: JSON.stringify({ ref: r, value: o }), signal: l }
    );
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
    const l = o.toString();
    return this.request(`/audit${l ? `?${l}` : ""}`, { signal: r });
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
    const o = (l) => {
      "threadId" in l && l.threadId && l.threadId !== n || r(l);
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
const Ge = "/api/plugins/hermes-crew", Ke = window.__HERMES_PLUGIN_SDK__, br = new Er({
  baseUrl: Ge,
  // The SDK's authed fetch, not the global one. Its own contract says plugins
  // must not hand-read the session token, and this is what keeps loopback,
  // gated-OAuth and server-internal modes all working from one bundle.
  fetchImpl: (t, n) => Ke.authedFetch(t, n),
  // A resolver, not a string: in gated mode `buildWsUrl` mints a single-use
  // ticket, so the URL has to be rebuilt for every connect and reconnect.
  eventsUrl: () => Ke.buildWsUrl(`${Ge}/v1/events`)
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
  q as b,
  _t as c,
  he as d,
  W as e,
  $e as f,
  Nr as g,
  Se as h,
  Et as i,
  yt as j,
  vt as k,
  ve as l,
  bt as m,
  Le as n,
  ot as r,
  Ct as u
};

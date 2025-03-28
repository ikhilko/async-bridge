import S from "uuid-random";
const z = "1.2.0";
function G(...s) {
  return s.length === 0 ? (n) => n : (s = s.filter((n) => typeof n == "function"), s.length === 1 ? s[0] : s.reduce(
    (n, r) => (...i) => n(r(...i))
  ));
}
const M = /* @__PURE__ */ (() => {
  const s = "[webview-bridge]";
  return {
    log: (...n) => console.log(s, ...n),
    warn: (...n) => console.warn(s, ...n),
    error: (...n) => console.error(s, ...n)
  };
})(), I = (s) => {
  M.error(
    `Cannot make a response. To be able to response to action '${s.type}' please dispatch it using 'dispatchAsync' bridge method.`
  );
}, J = (s, n) => M.warn(
  `Cannot dispatch action '${n.type}. 'Please provide post message implementation calling 'bridge.setPostMessage' first.`
), P = "@@INTERNAL_SYNC_MESSAGE", $ = (s, n) => {
  let r = (s == null ? void 0 : s.postMessage) ?? J, i = [];
  const h = (e) => (i.push(e), () => {
    i = i.filter((t) => t !== e);
  });
  let c = {};
  const u = (e, t) => {
    const a = S();
    return c[e] = c[e] ?? {}, c[e][a] = t, () => {
      delete c[e][a];
    };
  }, f = (e) => {
    const { meta: t, type: a } = e;
    if (!t.external)
      try {
        const o = JSON.stringify(e);
        r(o, e);
      } catch (o) {
        throw o;
      }
    if (t.type === "request" && t.external && c[a]) {
      let o = !1;
      const g = (d) => {
        const { type: w = e.type, payload: v, meta: E } = d ?? {};
        if (o) {
          M.warn("You're trying to resolve async request that is already done.");
          return;
        }
        o = !0, x({
          type: w,
          payload: v,
          meta: {
            ...E,
            id: e.id
          }
        });
      }, B = (d) => {
        if (o) {
          M.warn("You're trying to reject async request that is already done.");
          return;
        }
        o = !0;
        const w = d instanceof Error, v = typeof d == "string", E = !(w || v || !d), { type: O, payload: T, meta: _ = {} } = E ? d : {};
        let b;
        switch (!0) {
          case w:
            b = {
              message: d.toString()
            };
            break;
          case v:
            b = {
              message: d
            };
            break;
          default:
            b = T;
        }
        x({
          type: O ?? e.type,
          payload: b,
          meta: { ..._, id: e.id, error: !0 }
        });
      }, N = () => I(e), L = t.async ? g : N, Y = t.async ? B : N;
      Object.values(c[a]).forEach((d) => d(e, L, Y));
    }
  };
  let l = {};
  const A = [() => (e) => (t) => (i.forEach((a) => {
    a(t);
  }), e(t)), ...n].map((e) => e(l)), m = G(...A)(f), y = (e) => {
    const { type: t, payload: a = {} } = e, o = S(), g = {
      ...e.meta ?? {},
      external: !1,
      type: "request"
      /* REQUEST */
    };
    return m({ id: o, type: t, payload: a, meta: g });
  }, x = (e) => {
    const { type: t, payload: a = {}, meta: o = {} } = e, g = S();
    return m({
      id: g,
      type: t,
      payload: a,
      meta: {
        ...o,
        external: !1,
        type: "response"
        /* RESPONSE */
      }
    });
  }, q = (e) => y({
    ...e,
    meta: { ...e.meta ?? {}, async: !0 }
  }), C = (e) => m({
    ...e,
    meta: {
      ...e.meta ?? {},
      external: !0
    }
  }), D = (e) => {
    try {
      const t = typeof e == "string" ? JSON.parse(e) : e;
      C(t);
    } catch (t) {
      throw t;
    }
  }, k = (e) => {
    r = e;
  }, j = async (e = 5e3) => {
    const t = await Promise.race([
      (async () => {
        const { version: a } = await l.dispatchAsync({
          type: P,
          payload: { version: l.version }
        });
        return a;
      })(),
      new Promise((a) => {
        setTimeout(() => a(!1), e);
      })
    ]);
    if (t === !1)
      throw new Error(
        "Error: AsyncBridge.sync timeout. AsyncBridge was not able to receive response from the other side."
      );
    return {
      version: l.version,
      otherSideVersion: t
    };
  };
  return u(P, ({ payload: e }, t) => {
    t({ payload: { version: l.version } });
  }), l = {
    version: z,
    sync: j,
    dispatch: y,
    dispatchAsync: q,
    setPostMessage: k,
    subscribe: h,
    onMessage: D,
    listenEvent: u
  }, l;
}, U = () => {
  const s = {};
  return (n) => (r) => {
    var i, h, c, u, f, l;
    if ((i = r == null ? void 0 : r.meta) != null && i.async && ((h = r == null ? void 0 : r.meta) == null ? void 0 : h.type) === "request" && !((c = r == null ? void 0 : r.meta) != null && c.external)) {
      const p = r == null ? void 0 : r.id;
      return new Promise((A, m) => {
        s[p] = {
          resolve: (y) => {
            A(y), delete s[p];
          },
          reject: (y) => {
            m(y), delete s[p];
          }
        }, n(r);
      });
    } else if (((u = r == null ? void 0 : r.meta) == null ? void 0 : u.type) === "response" && ((f = r == null ? void 0 : r.meta) != null && f.external)) {
      const p = (l = r == null ? void 0 : r.meta) == null ? void 0 : l.id;
      if (s[p])
        r.meta.error ? s[p].reject(r.payload) : s[p].resolve(r.payload);
      else
        return n(r);
    } else
      return n(r);
  };
};
function H(s = {}, n = []) {
  return $(s, [U, ...n]);
}
export {
  G as compose,
  H as createAsyncBridge
};
//# sourceMappingURL=index.js.map

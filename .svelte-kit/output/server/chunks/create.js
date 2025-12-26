import { i as derived, w as writable, j as get, r as readable } from "./exports.js";
import "dequal";
import "clsx";
function createAuthStore() {
  function getInitialToken() {
    return null;
  }
  const { subscribe, set } = writable(getInitialToken());
  return {
    subscribe,
    setToken: (token) => {
      set(token);
    },
    clearToken: () => {
      set(null);
    }
  };
}
const authToken = createAuthStore();
const isAuthenticated = derived(authToken, ($token) => $token !== null);
const defaultPreferences = {
  colorScheme: "system",
  language: "en"
};
function createPreferencesStore() {
  function getInitial() {
    return defaultPreferences;
  }
  const { subscribe, set, update } = writable(getInitial());
  return {
    subscribe,
    setColorScheme: (scheme) => {
      update((prefs) => {
        const updated = { ...prefs, colorScheme: scheme };
        return updated;
      });
    },
    setLanguage: (language) => {
      update((prefs) => {
        const updated = { ...prefs, language };
        return updated;
      });
    },
    reset: () => {
      set(defaultPreferences);
    }
  };
}
const preferences = createPreferencesStore();
const effectiveTheme = derived(preferences, ($prefs) => {
  if ($prefs.colorScheme === "system") {
    return "light";
  }
  return $prefs.colorScheme;
});
const initialState$1 = {
  list: [],
  loading: false,
  error: null,
  currentSessionId: null,
  currentMessages: [],
  currentLoading: false
};
function createConversationsStore() {
  const { subscribe, update } = writable(initialState$1);
  async function fetchWithAuth(url, options = {}) {
    const token = get(authToken);
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
  }
  return {
    subscribe,
    async fetchList(options = {}) {
      update((s) => ({ ...s, loading: true, error: null }));
      try {
        const params = new URLSearchParams();
        if (options.showArchived) params.set("showArchived", "true");
        const res = await fetchWithAuth(`/api/conversations?${params}`);
        if (!res.ok) throw new Error("Failed to fetch conversations");
        const data = await res.json();
        update((s) => ({ ...s, list: data.conversations, loading: false }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        update((s) => ({ ...s, error: message, loading: false }));
      }
    },
    async fetchDetails(sessionId) {
      update((s) => ({ ...s, currentSessionId: sessionId, currentLoading: true }));
      try {
        const res = await fetchWithAuth(`/api/conversations/${sessionId}`);
        if (!res.ok) throw new Error("Failed to fetch conversation");
        const data = await res.json();
        update((s) => ({ ...s, currentMessages: data.messages, currentLoading: false }));
        return data;
      } catch {
        update((s) => ({ ...s, currentLoading: false }));
        return null;
      }
    },
    async start(request) {
      try {
        const res = await fetchWithAuth("/api/conversations/start", {
          method: "POST",
          body: JSON.stringify(request)
        });
        if (!res.ok) throw new Error("Failed to start conversation");
        return await res.json();
      } catch {
        return null;
      }
    },
    async stop(streamingId) {
      try {
        const res = await fetchWithAuth(`/api/conversations/${streamingId}/stop`, {
          method: "POST"
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    async rename(sessionId, name) {
      try {
        const res = await fetchWithAuth(`/api/conversations/${sessionId}/rename`, {
          method: "PUT",
          body: JSON.stringify({ customName: name })
        });
        if (res.ok) {
          update((s) => ({
            ...s,
            list: s.list.map(
              (c) => c.sessionId === sessionId ? { ...c, sessionInfo: { ...c.sessionInfo, custom_name: name } } : c
            )
          }));
        }
        return res.ok;
      } catch {
        return false;
      }
    },
    async updateSession(sessionId, updates) {
      try {
        const res = await fetchWithAuth(`/api/conversations/${sessionId}/update`, {
          method: "PUT",
          body: JSON.stringify(updates)
        });
        if (res.ok) {
          update((s) => ({
            ...s,
            list: s.list.map(
              (c) => c.sessionId === sessionId ? { ...c, sessionInfo: { ...c.sessionInfo, ...updates } } : c
            )
          }));
        }
        return res.ok;
      } catch {
        return false;
      }
    },
    addMessage(message) {
      update((s) => ({
        ...s,
        currentMessages: [...s.currentMessages, message]
      }));
    },
    updateConversationStatus(sessionId, status) {
      update((s) => ({
        ...s,
        list: s.list.map((c) => c.sessionId === sessionId ? { ...c, status } : c)
      }));
    },
    updateToolMetrics(sessionId, metrics) {
      update((s) => ({
        ...s,
        list: s.list.map((c) => c.sessionId === sessionId ? { ...c, toolMetrics: metrics } : c)
      }));
    },
    clearCurrent() {
      update((s) => ({
        ...s,
        currentSessionId: null,
        currentMessages: [],
        currentLoading: false
      }));
    }
  };
}
const conversations = createConversationsStore();
derived(
  conversations,
  ($c) => $c.list.filter((c) => c.status === "ongoing")
);
derived(
  conversations,
  ($c) => $c.list.filter((c) => c.status === "completed")
);
derived(
  conversations,
  ($c) => $c.list.find((c) => c.sessionId === $c.currentSessionId)
);
const initialState = {
  streams: /* @__PURE__ */ new Map(),
  permissions: []
};
function createStreamStore() {
  const { subscribe, update } = writable(initialState);
  const eventSources = /* @__PURE__ */ new Map();
  function setStreamStatus(streamingId, status, error) {
    update((s) => {
      const streams = new Map(s.streams);
      streams.set(streamingId, { streamingId, status, error: error ?? null });
      return { ...s, streams };
    });
  }
  return {
    subscribe,
    connect(streamingId, onEvent) {
      if (eventSources.has(streamingId)) {
        return () => this.disconnect(streamingId);
      }
      setStreamStatus(streamingId, "connecting");
      const token = get(authToken);
      const url = `/api/stream/${streamingId}`;
      const es = new EventSource(`${url}?token=${token}`);
      eventSources.set(streamingId, es);
      es.onopen = () => {
        setStreamStatus(streamingId, "connected");
      };
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "permission_request") {
            update((s) => ({
              ...s,
              permissions: [...s.permissions, data.data]
            }));
          }
          if (data.type === "assistant" || data.type === "user") {
            const message = {
              uuid: crypto.randomUUID(),
              type: data.type,
              message: data.message,
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              sessionId: data.session_id
            };
            conversations.addMessage(message);
          }
          if (data.type === "closed" || data.type === "result") {
            setStreamStatus(streamingId, "disconnected");
            this.disconnect(streamingId);
          }
          onEvent?.(data);
        } catch {
        }
      };
      es.onerror = () => {
        setStreamStatus(streamingId, "error", "Connection lost");
        this.disconnect(streamingId);
      };
      return () => this.disconnect(streamingId);
    },
    disconnect(streamingId) {
      const es = eventSources.get(streamingId);
      if (es) {
        es.close();
        eventSources.delete(streamingId);
      }
      setStreamStatus(streamingId, "disconnected");
    },
    disconnectAll() {
      for (const [id] of eventSources) {
        this.disconnect(id);
      }
    },
    resolvePermission(requestId) {
      update((s) => ({
        ...s,
        permissions: s.permissions.filter((p) => p.id !== requestId)
      }));
    },
    getStatus(streamingId) {
      const state = get({ subscribe });
      return state.streams.get(streamingId)?.status ?? "disconnected";
    }
  };
}
const streamStore = createStreamStore();
derived(
  streamStore,
  ($s) => $s.permissions.filter((p) => p.status === "pending")
);
derived(
  streamStore,
  ($s) => Array.from($s.streams.values()).some((s) => s.status === "connected")
);
function styleToString(style) {
  return Object.keys(style).reduce((str, key) => {
    if (style[key] === void 0)
      return str;
    return str + `${key}:${style[key]};`;
  }, "");
}
({
  style: styleToString({
    position: "absolute",
    opacity: 0,
    "pointer-events": "none",
    margin: 0,
    transform: "translateX(-100%)"
  })
});
function noop() {
}
function omit(obj, ...keys) {
  const result = {};
  for (const key of Object.keys(obj)) {
    if (!keys.includes(key)) {
      result[key] = obj[key];
    }
  }
  return result;
}
function removeUndefined(obj) {
  const result = {};
  for (const key in obj) {
    const value = obj[key];
    if (value !== void 0) {
      result[key] = value;
    }
  }
  return result;
}
function lightable(value) {
  function subscribe(run) {
    run(value);
    return () => {
    };
  }
  return { subscribe };
}
const hiddenAction = (obj) => {
  return new Proxy(obj, {
    get(target, prop, receiver) {
      return Reflect.get(target, prop, receiver);
    },
    ownKeys(target) {
      return Reflect.ownKeys(target).filter((key) => key !== "action");
    }
  });
};
const isFunctionWithParams = (fn) => {
  return typeof fn === "function";
};
makeElement("empty");
function makeElement(name, args) {
  const { stores, action, returned } = {};
  const derivedStore = (() => {
    if (stores && returned) {
      return derived(stores, (values) => {
        const result = returned(values);
        if (isFunctionWithParams(result)) {
          const fn = (...args2) => {
            return hiddenAction(removeUndefined({
              ...result(...args2),
              [`data-melt-${name}`]: "",
              action: action ?? noop
            }));
          };
          fn.action = action ?? noop;
          return fn;
        }
        return hiddenAction(removeUndefined({
          ...result,
          [`data-melt-${name}`]: "",
          action: action ?? noop
        }));
      });
    } else {
      const returnedFn = returned;
      const result = returnedFn?.();
      if (isFunctionWithParams(result)) {
        const resultFn = (...args2) => {
          return hiddenAction(removeUndefined({
            ...result(...args2),
            [`data-melt-${name}`]: "",
            action: action ?? noop
          }));
        };
        resultFn.action = action ?? noop;
        return lightable(resultFn);
      }
      return lightable(hiddenAction(removeUndefined({
        ...result,
        [`data-melt-${name}`]: "",
        action: action ?? noop
      })));
    }
  })();
  const actionFn = action ?? (() => {
  });
  actionFn.subscribe = derivedStore.subscribe;
  return actionFn;
}
({
  disabled: readable(false),
  required: readable(false),
  name: readable(void 0),
  type: readable(void 0)
});
const defaults = {
  isDateDisabled: void 0,
  isDateUnavailable: void 0,
  value: void 0,
  preventDeselect: false,
  numberOfMonths: 1,
  pagedNavigation: false,
  weekStartsOn: 0,
  fixedWeeks: false,
  calendarLabel: "Event Date",
  locale: "en",
  minValue: void 0,
  maxValue: void 0,
  disabled: false,
  readonly: false,
  weekdayFormat: "narrow"
};
({
  ...omit(defaults, "isDateDisabled", "isDateUnavailable", "value", "locale", "disabled", "readonly", "minValue", "maxValue", "weekdayFormat")
});
export {
  conversations as c,
  effectiveTheme as e,
  isAuthenticated as i,
  streamStore as s
};

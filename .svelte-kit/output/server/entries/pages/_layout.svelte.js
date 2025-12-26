import { a as attr_class, s as store_get, u as unsubscribe_stores, e as ensure_array_like, h as head } from "../../chunks/index.js";
import { p as page } from "../../chunks/stores.js";
import { e as effectiveTheme, c as conversations, i as isAuthenticated } from "../../chunks/create.js";
import { g as goto } from "../../chunks/client.js";
import { B as Button } from "../../chunks/Button.js";
import "dequal";
import { V as escape_html } from "../../chunks/context.js";
import "clsx";
function AppShell($$renderer, $$props) {
  var $$store_subs;
  let { sidebar, children } = $$props;
  let sidebarOpen = true;
  $$renderer.push(`<div${attr_class("flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900", void 0, {
    "dark": store_get($$store_subs ??= {}, "$effectiveTheme", effectiveTheme) === "dark"
  })}>`);
  if (sidebar) {
    $$renderer.push("<!--[-->");
    $$renderer.push(`<aside${attr_class("flex h-full w-72 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 transition-transform duration-200", void 0, {
      "-translate-x-full": !sidebarOpen,
      "translate-x-0": sidebarOpen
    })}>`);
    sidebar($$renderer);
    $$renderer.push(`<!----></aside>`);
  } else {
    $$renderer.push("<!--[!-->");
  }
  $$renderer.push(`<!--]--> <main class="flex flex-1 flex-col overflow-hidden">`);
  children($$renderer);
  $$renderer.push(`<!----></main></div>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
}
function Sidebar($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { currentSessionId } = $$props;
    function formatDate(dateStr) {
      const date = new Date(dateStr);
      const now = /* @__PURE__ */ new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1e3 * 60 * 60 * 24));
      if (days === 0) return "Today";
      if (days === 1) return "Yesterday";
      if (days < 7) return `${days} days ago`;
      return date.toLocaleDateString();
    }
    function getDisplayName(conv) {
      if (conv.sessionInfo?.custom_name) return conv.sessionInfo.custom_name;
      return conv.summary || "Untitled conversation";
    }
    function handleNewChat() {
      goto();
    }
    $$renderer2.push(`<div class="flex h-full flex-col"><div class="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700"><h1 class="text-lg font-semibold text-gray-900 dark:text-gray-100">CUI</h1> `);
    Button($$renderer2, {
      variant: "primary",
      size: "sm",
      onclick: handleNewChat,
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->New Chat`);
      }
    });
    $$renderer2.push(`<!----></div> <div class="flex-1 overflow-y-auto p-2">`);
    if (store_get($$store_subs ??= {}, "$conversations", conversations).loading) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex items-center justify-center py-8"><div class="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      if (store_get($$store_subs ??= {}, "$conversations", conversations).list.length === 0) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<p class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">No conversations yet</p>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<ul class="space-y-1"><!--[-->`);
        const each_array = ensure_array_like(store_get($$store_subs ??= {}, "$conversations", conversations).list);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let conv = each_array[$$index];
          $$renderer2.push(`<li><button${attr_class("w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700", void 0, {
            "bg-gray-100": conv.sessionId === currentSessionId,
            "dark:bg-gray-700": conv.sessionId === currentSessionId
          })}><div class="flex items-center gap-2">`);
          if (conv.status === "ongoing") {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<span class="h-2 w-2 rounded-full bg-green-500"></span>`);
          } else {
            $$renderer2.push("<!--[!-->");
          }
          $$renderer2.push(`<!--]--> <span class="flex-1 truncate text-sm font-medium text-gray-900 dark:text-gray-100">${escape_html(getDisplayName(conv))}</span></div> <div class="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><span>${escape_html(formatDate(conv.updatedAt))}</span> <span class="truncate">${escape_html(conv.projectPath.split("/").pop())}</span></div></button></li>`);
        }
        $$renderer2.push(`<!--]--></ul>`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { children } = $$props;
    const currentSessionId = store_get($$store_subs ??= {}, "$page", page).url.pathname.startsWith("/c/") ? store_get($$store_subs ??= {}, "$page", page).params.sessionId : void 0;
    head("12qhfyh", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>CUI</title>`);
      });
    });
    if (!store_get($$store_subs ??= {}, "$isAuthenticated", isAuthenticated)) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900"><div class="text-center"><h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">CUI</h1> <p class="mt-2 text-gray-600 dark:text-gray-400">Please use the authenticated URL to access CUI.</p></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      {
        let sidebar = function($$renderer3) {
          Sidebar($$renderer3, { currentSessionId });
        };
        AppShell($$renderer2, {
          sidebar,
          children: ($$renderer3) => {
            children($$renderer3);
            $$renderer3.push(`<!---->`);
          }
        });
      }
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _layout as default
};

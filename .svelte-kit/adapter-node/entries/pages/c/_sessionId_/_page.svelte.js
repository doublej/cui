import { s as store_get, u as unsubscribe_stores } from "../../../../chunks/index.js";
import { X as ssr_context } from "../../../../chunks/context.js";
import "clsx";
import { p as page } from "../../../../chunks/stores.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/state.svelte.js";
import "dequal";
import "../../../../chunks/create.js";
function onDestroy(fn) {
  /** @type {SSRContext} */
  ssr_context.r.on_destroy(fn);
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    store_get($$store_subs ??= {}, "$page", page).params.sessionId;
    onDestroy(() => {
    });
    $$renderer2.push(`<div class="flex h-full flex-col">`);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex flex-1 items-center justify-center"><div class="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};

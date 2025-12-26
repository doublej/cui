import { b as attr, a as attr_class, c as bind_props, d as stringify } from "../../chunks/index.js";
import { V as escape_html } from "../../chunks/context.js";
import { g as goto } from "../../chunks/client.js";
import { B as Button } from "../../chunks/Button.js";
import "dequal";
import { c as conversations, s as streamStore } from "../../chunks/create.js";
function Input($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      value = "",
      placeholder = "",
      type = "text",
      disabled = false,
      readonly = false,
      class: className = "",
      oninput,
      onkeydown
    } = $$props;
    const baseStyles = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400";
    $$renderer2.push(`<input${attr("type", type)}${attr("value", value)}${attr("placeholder", placeholder)}${attr("disabled", disabled, true)}${attr("readonly", readonly, true)}${attr_class(`${stringify(baseStyles)} ${stringify(className)}`)}/>`);
    bind_props($$props, { value });
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let workingDirectory = "";
    let initialPrompt = "";
    let isStarting = false;
    let error = null;
    async function handleStart() {
      if (!initialPrompt.trim()) return;
      isStarting = true;
      error = null;
      try {
        const response = await conversations.start({
          workingDirectory: workingDirectory || process.cwd?.() || ".",
          initialPrompt: initialPrompt.trim()
        });
        if (response) {
          streamStore.connect(response.streamingId);
          goto(`/c/${response.sessionId}`);
        } else {
          error = "Failed to start conversation";
        }
      } catch (err) {
        error = err instanceof Error ? err.message : "Failed to start conversation";
      } finally {
        isStarting = false;
      }
    }
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<div class="flex h-full flex-col"><div class="flex flex-1 items-center justify-center p-8"><div class="w-full max-w-xl space-y-6"><div class="text-center"><h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">What can I help you with?</h1> <p class="mt-2 text-gray-600 dark:text-gray-400">Start a new conversation with Claude</p></div> <div class="space-y-4">`);
      Input($$renderer3, {
        placeholder: "Working directory (optional)",
        disabled: isStarting,
        get value() {
          return workingDirectory;
        },
        set value($$value) {
          workingDirectory = $$value;
          $$settled = false;
        }
      });
      $$renderer3.push(`<!----> <div class="relative"><textarea placeholder="Ask Claude anything..."${attr("disabled", isStarting, true)}${attr("rows", 4)} class="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400 resize-none">`);
      const $$body = escape_html(initialPrompt);
      if ($$body) {
        $$renderer3.push(`${$$body}`);
      }
      $$renderer3.push(`</textarea></div> `);
      if (error) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<p class="text-sm text-red-600 dark:text-red-400">${escape_html(error)}</p>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> `);
      Button($$renderer3, {
        variant: "primary",
        size: "lg",
        disabled: !initialPrompt.trim() || isStarting,
        onclick: handleStart,
        class: "w-full",
        children: ($$renderer4) => {
          if (isStarting) {
            $$renderer4.push("<!--[-->");
            $$renderer4.push(`Starting...`);
          } else {
            $$renderer4.push("<!--[!-->");
            $$renderer4.push(`Start Conversation`);
          }
          $$renderer4.push(`<!--]-->`);
        }
      });
      $$renderer3.push(`<!----></div></div></div></div>`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
  });
}
export {
  _page as default
};

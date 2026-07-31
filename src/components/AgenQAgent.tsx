"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const AGENQ_AGENT_ID = "2b69b018-c154-4547-8a36-80e01ce62fa4";
const AGENQ_MOUNT_KEY = `agent-mount-state-${AGENQ_AGENT_ID}`;

const AGENQ_CONFIG = {
  agentId: AGENQ_AGENT_ID,
  projectId: "364626e9-82d3-4d31-b994-439d77a29f31",
  customerCode: "SUPER-USER",
  backendProtocol: "backend-v2",
  apiBaseUrl: "https://general-backend.aws.agenq.com",
  authEndpoint: "/api/agenq/token",
};

export function AgenQAgent() {
  const mounted = useRef(false);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/login") return;

    const timer = window.setInterval(() => {
      if (!(window as any).AGENQ?.render || mounted.current) return;
      mounted.current = true;

      // Ensure widget starts CLOSED — clear any leftover "OPEN" state from localStorage
      try {
        localStorage.setItem(AGENQ_MOUNT_KEY, "CLOSED");
      } catch (_) {}

      // Render the SDK with initialState CLOSED so it doesn't auto-expand
      (window as any).AGENQ.render({
        ...AGENQ_CONFIG,
        initialState: "CLOSED",
      } as any);
    }, 150);

    return () => window.clearInterval(timer);
  }, [pathname]);

  if (pathname === "/login") return null;

  return (
    <>
      <div id="agenq-root" />
      <Script
        src="https://cdn.agenqglobal.com/agenq-client-sdk.js"
        strategy="afterInteractive"
      />
    </>
  );
}

/**
 * Programmatically open the AgenQ widget by finding and clicking its launcher button.
 * Uses a heuristic scoring search to locate the launcher (even inside Shadow DOM)
 * and clicks it, reproducing the exact behavior of clicking the agent circle widget.
 */
export function triggerAgenQOpen() {
  console.log("🚀 triggerAgenQOpen called. Searching for AgenQ launcher element...");

  interface Candidate {
    element: HTMLElement;
    score: number;
  }

  const candidates: Candidate[] = [];

  function evaluateElement(el: HTMLElement) {
    let score = 0;

    // 1. Position and geometry analysis
    try {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);

      if (style.position === "fixed" || style.position === "absolute") {
        // Floating launcher is at the bottom right
        const isBottomRight = rect.bottom > window.innerHeight - 200 && rect.right > window.innerWidth - 200;
        const isSmallBubble = rect.width >= 30 && rect.width <= 120 && rect.height >= 30 && rect.height <= 120;

        if (isBottomRight) {
          score += 50;
        }
        if (isSmallBubble) {
          score += 30;
        }
      }
    } catch (_) {}

    // 2. Avatar/image verification
    if (el.tagName === "IMG") {
      const src = (el as HTMLImageElement).src || "";
      if (src.includes("nina") || src.includes("cloye") || src.includes("agent")) {
        score += 60;
      }
    }

    // 3. Class, ID, and attribute matching
    const id = el.id || "";
    const className = typeof el.className === "string" ? el.className : "";
    const hasAgenqAttr = Array.from(el.attributes).some(attr =>
      attr.name.includes("agenq") || attr.value.includes("agenq")
    );

    if (id.includes("agenq") || className.includes("agenq") || hasAgenqAttr) {
      score += 40;
    }

    // 4. Parenting check
    let parent = el.parentElement;
    let isInsideAgenqRoot = false;
    while (parent) {
      if (parent.id === "agenq-root") {
        isInsideAgenqRoot = true;
        break;
      }
      parent = parent.parentElement;
    }
    if (isInsideAgenqRoot) {
      score += 30;
    }

    // 5. Clickable tag bonus
    if (el.tagName === "BUTTON" || el.getAttribute("role") === "button" || el.onclick) {
      score += 20;
    }

    if (score > 0) {
      candidates.push({ element: el, score });
    }
  }

  // Recursive traversal of light DOM and shadow roots
  function traverse(node: Node) {
    if (node instanceof HTMLElement) {
      evaluateElement(node);
    }

    if (node instanceof HTMLElement || node instanceof Document || node instanceof ShadowRoot) {
      const children = node.childNodes;
      for (let i = 0; i < children.length; i++) {
        traverse(children[i]);
      }

      if (node instanceof HTMLElement && node.shadowRoot) {
        traverse(node.shadowRoot);
      }
    }
  }

  // Search the entire document starting from the body
  traverse(document.body);

  // Sort candidates by score descending
  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length > 0) {
    const best = candidates[0];
    console.log("🎯 Best candidate found with score", best.score, ":", best.element);

    // If the match is a child element (like an image), traverse up to 4 levels to find its button parent
    let clickTarget = best.element;
    let parent = best.element.parentElement;
    let depth = 0;
    while (parent && depth < 4 && parent !== document.body) {
      const parentStyle = window.getComputedStyle(parent);
      if (
        parent.tagName === "BUTTON" ||
        parent.getAttribute("role") === "button" ||
        parent.onclick ||
        parentStyle.cursor === "pointer"
      ) {
        clickTarget = parent;
        break;
      }
      parent = parent.parentElement;
      depth++;
    }

    console.log("👆 Dispatching click to:", clickTarget);
    clickTarget.click();
    clickTarget.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    return;
  }

  console.warn("⚠️ Heuristics search did not locate candidate. Retrying with fallbacks...");

  // Selectors fallback
  const selectors = [
    "[agenq-id] button",
    "[agenq-id]",
    "#agenq-root button",
    "#agenq-root img",
    "#agenq-root div",
  ];
  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el) {
      el.click();
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      return;
    }
  }
}

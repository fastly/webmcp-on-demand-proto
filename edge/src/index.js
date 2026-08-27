/**
 * WebMCP on Demand — Fastly Compute Edge Worker
 *
 * Intercepts HTML responses from the origin, detects <form> elements and
 * their child fields, then injects WebMCP declarative attributes so AI
 * agents can interact with the site structurally — zero code changes on
 * the origin.
 */

import { HTMLRewritingStream } from "fastly:html-rewriter";
import { classifyForm, generateToolName } from "./classifier.js";
import {
  generateToolDescription,
  generateParamDescription,
} from "./descriptions.js";
import { generateBadgeHTML } from "./badge.js";

// ─── Sensitive-field exclusions ──────────────────────────────────────────────
// Fields an agent must never be told to fill: credentials, payment data,
// government IDs, and one-time codes.
const SENSITIVE_TYPES = new Set(["password", "file"]);
const SENSITIVE_NAME = /pass|pwd|card|cvv|cvc|csc|ssn|secret|token|otp|pin|routing|iban/i;
const SENSITIVE_AUTOCOMPLETE = /^(cc-|new-password|current-password|one-time-code)/i;

// ─── Main handler ────────────────────────────────────────────────────────────

addEventListener("fetch", (event) => event.respondWith(handleRequest(event)));

async function handleRequest(event) {
  const request = event.request;

  // Fetch the origin response
  const originResponse = await fetch(request, { backend: "origin" });

  // Only rewrite HTML responses. Parse the media type rather than
  // substring-matching the whole header value.
  const contentType = originResponse.headers.get("content-type") || "";
  const mediaType = contentType.split(";")[0].trim().toLowerCase();
  if (mediaType !== "text/html") {
    return originResponse;
  }

  // If the origin opts out of origin isolation, Chrome disables the WebMCP
  // API on the page — injected attributes would be inert, so pass through.
  const oac = (originResponse.headers.get("origin-agent-cluster") || "").trim();
  if (oac === "?0") {
    return originResponse;
  }

  // ── Create the rewriter ──────────────────────────────────────────────
  // Form-level attributes are injected when the <form> element is
  // encountered, using form-level signals (action/method/id/class/role/aria).
  // Since the streaming model can't look ahead at children, this is
  // sufficient for well-structured HTML.

  const rewriter = new HTMLRewritingStream();

  // ── Handle <form> elements ───────────────────────────────────────────

  rewriter.onElement("form", (el) => {
    const action = el.getAttribute("action") || "";
    const method = el.getAttribute("method") || "GET";
    const id = el.getAttribute("id") || "";
    const className = el.getAttribute("class") || "";
    const role = el.getAttribute("role") || "";
    const ariaLabel = el.getAttribute("aria-label") || "";

    const formAttrs = { action, method, id, className, role, ariaLabel };

    // We do a preliminary classification based on form-level signals.
    // For our well-structured origin pages this is accurate.  For less
    // structured pages the child-field signals would refine it, but in a
    // streaming model we classify eagerly.
    const { category, autoSubmit } = classifyForm(formAttrs, collectFieldHintsFromFormAttrs(formAttrs));

    // Generate and inject attributes
    const toolName = generateToolName(category, formAttrs);
    const toolDesc = generateToolDescription(category, formAttrs, []);

    el.setAttribute("toolname", toolName);
    el.setAttribute("tooldescription", toolDesc);

    if (autoSubmit) {
      el.setAttribute("toolautosubmit", "");
    }
  });

  // ── Handle form fields ───────────────────────────────────────────────

  rewriter.onElement("form input", (el) => handleField(el));
  rewriter.onElement("form select", (el) => handleField(el));
  rewriter.onElement("form textarea", (el) => handleField(el));

  function handleField(el) {
    const tag = el.tag;
    const type = el.getAttribute("type") || "";
    const name = el.getAttribute("name") || "";
    const id = el.getAttribute("id") || "";
    const placeholder = el.getAttribute("placeholder") || "";
    const ariaLabel = el.getAttribute("aria-label") || "";
    // Note: el.hasAttribute() is unavailable on descendant-matched elements
    // in Viceroy, so we use getAttribute() !== null instead.
    const required = el.getAttribute("required") !== null;
    const pattern = el.getAttribute("pattern") || "";
    const min = el.getAttribute("min");
    const max = el.getAttribute("max");
    const maxlength = el.getAttribute("maxlength") || "";
    const disabled = el.getAttribute("disabled") !== null;
    const autocomplete = el.getAttribute("autocomplete") || "";

    // Skip hidden inputs and disabled fields — they're not agent-interactive
    if (type === "hidden" || disabled) return;

    // Skip submit buttons
    if (type === "submit") return;

    // Never describe credential or payment fields as agent-fillable
    // parameters — annotating them invites an agent to populate them.
    // Fails closed on type, name/id vocabulary, and autocomplete tokens.
    if (SENSITIVE_TYPES.has(type)) return;
    if (SENSITIVE_NAME.test(name) || SENSITIVE_NAME.test(id)) return;
    if (SENSITIVE_AUTOCOMPLETE.test(autocomplete)) return;

    // Build field metadata for the description generator
    const field = {
      tag,
      type: type || (tag === "select" ? "select" : tag === "textarea" ? "textarea" : "text"),
      name,
      id,
      placeholder,
      ariaLabel,
      labelText: "", // We can't read label text in the streaming model
      required,
      pattern,
      min,
      max,
      maxlength,
      options: null, // Select options aren't available in streaming either
    };

    // Try to infer label text from common patterns
    // Since we can't read <label> elements in a streaming model (they
    // appear as separate elements), we use other signals
    field.labelText = inferLabelText(field);

    const description = generateParamDescription(field);
    el.setAttribute("toolparamdescription", description);
  }

  // ── Inject badge before </body> ──────────────────────────────────────
  // The badge uses inline <style>/<script>, which a strict origin CSP will
  // block. Skip it rather than weakening the origin's policy; the form
  // attribute injection above is unaffected either way.
  const hasCSP = originResponse.headers.get("content-security-policy") !== null;
  if (!hasCSP) {
    rewriter.onElement("body", (el) => {
      el.append(generateBadgeHTML());
    });
  }

  // ── Pipe and respond ─────────────────────────────────────────────────

  const transformedBody = originResponse.body.pipeThrough(rewriter);

  // Clone headers and remove content-length since the body size has changed
  const headers = new Headers(originResponse.headers);
  headers.delete("content-length");

  // Inject the WebMCP origin trial token so Chrome 149+ enables the API.
  // Token is per-origin; register at:
  // https://developer.chrome.com/origintrials/#/register_trial/4163014905550602241
  const OT_TOKEN = "REPLACE_WITH_REAL_TOKEN"; // move to a config store / env for real use
  if (OT_TOKEN && !OT_TOKEN.startsWith("REPLACE")) {
    // set, not append — an origin-supplied Origin-Trial header would
    // otherwise produce ambiguous duplicate tokens
    headers.set("Origin-Trial", OT_TOKEN);
  }

  return new Response(transformedBody, {
    status: originResponse.status,
    headers,
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * In a streaming rewriter we can't look ahead at child elements when we
 * process the <form> tag.  However, we can make reasonable guesses about
 * field types from the form's attributes (action, role, etc.) to help with
 * classification.  This returns synthetic "field hints" that the classifier
 * can use alongside form-level signals.
 */
function collectFieldHintsFromFormAttrs(formAttrs) {
  const hints = [];
  const { action, ariaLabel } = formAttrs;
  const combined = `${action} ${ariaLabel}`.toLowerCase();

  // Guess likely field types from form context
  if (combined.includes("search") || combined.includes("filter")) {
    hints.push({ tag: "input", type: "text", name: "query" });
  }
  if (combined.includes("login") || combined.includes("signin")) {
    hints.push({ tag: "input", type: "email", name: "email" });
    hints.push({ tag: "input", type: "password", name: "password" });
  }
  if (combined.includes("contact") || combined.includes("support")) {
    hints.push({ tag: "input", type: "email", name: "email" });
    hints.push({ tag: "textarea", type: "textarea", name: "message" });
  }
  if (combined.includes("book") || combined.includes("checkout")) {
    hints.push({ tag: "input", type: "text", name: "name" });
    hints.push({ tag: "input", type: "email", name: "email" });
  }
  if (combined.includes("subscribe") || combined.includes("newsletter")) {
    hints.push({ tag: "input", type: "email", name: "email" });
  }

  return hints;
}

/**
 * Infer a human-readable label for a field using its available attributes.
 * This compensates for the streaming model's inability to read <label> elements.
 */
function inferLabelText(field) {
  if (field.ariaLabel) return field.ariaLabel;

  // Humanise the name or id
  const source = field.name || field.id || "";
  if (!source) return "";

  return source
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

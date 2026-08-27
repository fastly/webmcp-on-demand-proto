/**
 * Form classification engine.
 *
 * Examines a form element's attributes plus signals collected from its child
 * inputs to classify the form into a category.  Each category drives the
 * generated toolname, tooldescription, and whether toolautosubmit is applied.
 */

// ─── Categories ──────────────────────────────────────────────────────────────

export const CATEGORIES = {
  SEARCH: "search",
  FILTER: "filter",
  LOGIN: "login",
  CONTACT: "contact",
  BOOKING: "booking",
  NEWSLETTER: "newsletter",
  GENERIC: "generic",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function lower(str) {
  return (str || "").toLowerCase();
}

function includes(haystack, ...needles) {
  const h = lower(haystack);
  return needles.some((n) => h.includes(n));
}

// ─── Classify a form ─────────────────────────────────────────────────────────

/**
 * @param {object} formAttrs  – attributes read from the <form> element
 *   action, method, id, className, role, ariaLabel
 * @param {object[]} fields   – collected child field metadata
 *   [{ tag, type, name, id, placeholder, ariaLabel, labelText }]
 * @returns {{ category: string, autoSubmit: boolean }}
 */
export function classifyForm(formAttrs, fields) {
  const { action, method, id, className, role, ariaLabel } = formAttrs;
  const methodUp = (method || "GET").toUpperCase();

  // toolautosubmit removes the agent's user-confirmation step, so it is only
  // safe for idempotent, read-only submissions. A POST form is never
  // auto-submittable, no matter how search-like it looks.
  const isIdempotent = methodUp === "GET";

  // Collect field-level signals
  const fieldTypes = new Set(fields.map((f) => lower(f.type)));
  const fieldNames = fields.map((f) => lower(f.name)).join(" ");
  const hasPassword = fieldTypes.has("password");
  const hasEmail = fieldTypes.has("email") || fieldNames.includes("email");
  const hasTextarea = fields.some((f) => lower(f.tag) === "textarea");
  const hasDateInput = fieldTypes.has("date");

  // ── Login (checked first — a sensitive-category match must win over a
  //    cosmetic substring match like class="search-box login") ────────────
  if (hasPassword && (hasEmail || fieldNames.includes("user"))) {
    return { category: CATEGORIES.LOGIN, autoSubmit: false };
  }

  if (
    includes(action, "login", "signin", "sign-in", "auth") ||
    includes(id, "login", "signin") ||
    includes(className, "login", "signin")
  ) {
    return { category: CATEGORIES.LOGIN, autoSubmit: false };
  }

  // ── Booking / Checkout (also before search/filter, same reasoning) ─────
  if (
    includes(action, "book", "checkout", "confirm", "order", "pay") ||
    includes(id, "book", "checkout", "order") ||
    includes(className, "book", "checkout", "order") ||
    includes(ariaLabel, "book", "checkout", "order") ||
    fieldNames.includes("card_number") ||
    fieldNames.includes("cvv") ||
    fieldNames.includes("card_exp")
  ) {
    return { category: CATEGORIES.BOOKING, autoSubmit: false };
  }

  // ── Filter (check BEFORE search — filter forms may POST to a /search URL) ─
  if (
    includes(action, "filter") ||
    includes(id, "filter") ||
    includes(className, "filter") ||
    includes(ariaLabel, "filter")
  ) {
    return { category: CATEGORIES.FILTER, autoSubmit: isIdempotent };
  }

  // ── Search ─────────────────────────────────────────────────────────────
  if (
    role === "search" ||
    includes(action, "search") ||
    includes(id, "search") ||
    includes(className, "search") ||
    includes(ariaLabel, "search")
  ) {
    return { category: CATEGORIES.SEARCH, autoSubmit: isIdempotent };
  }

  // ── Contact / Support ──────────────────────────────────────────────────
  if (
    (hasEmail && hasTextarea) ||
    includes(action, "contact", "support", "feedback", "help") ||
    includes(id, "contact", "support") ||
    includes(className, "contact", "support") ||
    includes(ariaLabel, "support", "contact")
  ) {
    return { category: CATEGORIES.CONTACT, autoSubmit: false };
  }

  // ── Newsletter / Subscribe ─────────────────────────────────────────────
  if (
    includes(action, "subscribe", "newsletter") ||
    includes(id, "subscribe", "newsletter") ||
    includes(className, "subscribe", "newsletter") ||
    (fields.length <= 2 && hasEmail && !hasTextarea && !hasPassword)
  ) {
    return { category: CATEGORIES.NEWSLETTER, autoSubmit: false };
  }

  // ── Generic fallback ──────────────────────────────────────────────────
  return { category: CATEGORIES.GENERIC, autoSubmit: false };
}

// ─── Generate tool name ──────────────────────────────────────────────────────

/**
 * Produces a snake_case toolname from the classification + the form's
 * action or id.
 */
export function generateToolName(category, formAttrs) {
  const { action, id } = formAttrs;

  // Extract a slug from the action path
  let slug = "";
  if (action) {
    // "/search" → "search",  "/support/submit" → "support_submit"
    slug = action
      .replace(/^https?:\/\/[^/]+/, "")  // strip host if full URL
      .replace(/^\/+/, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/_+$/, "")
      .toLowerCase();
  }

  if (!slug && id) {
    slug = id.replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase();
  }

  // Map category to a verb-style prefix
  const prefixes = {
    [CATEGORIES.SEARCH]: "search",
    [CATEGORIES.FILTER]: "filter",
    [CATEGORIES.LOGIN]: "login",
    [CATEGORIES.CONTACT]: "contact",
    [CATEGORIES.BOOKING]: "book",
    [CATEGORIES.NEWSLETTER]: "subscribe",
    [CATEGORIES.GENERIC]: "submit",
  };

  const prefix = prefixes[category] || "submit";

  // Avoid redundancy ("search_search", "contact_support_submit" → just use "contact_support")
  if (slug) {
    // If the slug already starts with the prefix, just return the slug
    if (slug.startsWith(prefix)) return slug;
    // If the prefix is part of the slug already, just return the slug
    if (slug.includes(prefix)) return slug;
    return `${prefix}_${slug}`;
  }

  return prefix;
}

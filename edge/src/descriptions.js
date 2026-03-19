/**
 * Description generators for WebMCP tool and parameter annotations.
 *
 * Produces human-readable, LLM-friendly descriptions based on heuristic
 * signals from the HTML form and its fields.
 */

import { CATEGORIES } from "./classifier.js";

// ─── Form-level descriptions ─────────────────────────────────────────────────

const FORM_DESCRIPTIONS = {
  [CATEGORIES.SEARCH]:
    "Search for results by providing search criteria. Submitting this form will query the site and return matching results.",
  [CATEGORIES.FILTER]:
    "Filter or sort the currently displayed results. Adjust the criteria and submit to narrow down the list.",
  [CATEGORIES.LOGIN]:
    "Log in to the website with user credentials. Requires a username or email and a password.",
  [CATEGORIES.CONTACT]:
    "Submit a support or contact request. Fill in your details and describe your issue to reach the site's support team.",
  [CATEGORIES.BOOKING]:
    "Complete a booking or checkout. Provide the required personal and payment details to finalize the transaction.",
  [CATEGORIES.NEWSLETTER]:
    "Subscribe to a newsletter or mailing list by providing your email address.",
  [CATEGORIES.GENERIC]:
    "Submit information through this form.",
};

/**
 * Generate a rich tool description for a classified form.
 *
 * @param {string} category – one of CATEGORIES values
 * @param {object} formAttrs – { action, method, ariaLabel, ... }
 * @param {object[]} fields  – collected field metadata
 * @returns {string}
 */
export function generateToolDescription(category, formAttrs, fields) {
  const { ariaLabel, action } = formAttrs;

  let base = FORM_DESCRIPTIONS[category] || FORM_DESCRIPTIONS[CATEGORIES.GENERIC];

  // If the form has an aria-label, use it to enrich the description
  if (ariaLabel) {
    base = `${capitalise(ariaLabel)}. ${base}`;
  }

  // Add context about what action the form targets
  if (action && action !== "#") {
    base += ` (submits to ${action})`;
  }

  return base;
}

// ─── Parameter-level descriptions ────────────────────────────────────────────

/**
 * Build a toolparamdescription for a single form field.
 *
 * @param {object} field – { tag, type, name, id, placeholder, ariaLabel,
 *                           labelText, required, pattern, min, max, options }
 * @returns {string}
 */
export function generateParamDescription(field) {
  const parts = [];

  // 1. Start with the label text or aria-label (most descriptive source)
  const humanName = field.labelText || field.ariaLabel || humanise(field.name);
  if (humanName) {
    parts.push(humanName);
  }

  // 2. Type-specific hints
  const typeHints = getTypeHint(field);
  if (typeHints) parts.push(typeHints);

  // 3. Placeholder as example
  if (field.placeholder) {
    parts.push(`e.g. "${field.placeholder}"`);
  }

  // 4. Constraints
  const constraints = [];
  if (field.required) constraints.push("required");
  if (field.pattern) constraints.push(`must match pattern ${field.pattern}`);
  if (field.min !== null && field.min !== undefined) constraints.push(`min: ${field.min}`);
  if (field.max !== null && field.max !== undefined) constraints.push(`max: ${field.max}`);
  if (field.maxlength) constraints.push(`max length: ${field.maxlength}`);
  if (constraints.length) {
    parts.push(`(${constraints.join(", ")})`);
  }

  // 5. Select options
  if (field.options && field.options.length > 0) {
    const optStr = field.options.map((o) => `"${o}"`).join(", ");
    parts.push(`Options: [${optStr}]`);
  }

  return parts.join(". ").replace(/\.\./g, ".").trim() || humanName || field.name || "Form field";
}

/**
 * Decide whether toolparamtitle should be set.
 * Only set it if the field's `name` is cryptic.
 *
 * @param {string} name – the field's name attribute
 * @returns {string|null} – a clean title, or null if name is already fine
 */
export function maybeParamTitle(name) {
  if (!name) return null;

  // Names ≤ 2 chars, or containing only non-alpha chars are cryptic
  const isCryptic = name.length <= 2 || /^[^a-zA-Z]*$/.test(name) || /^fld_|^f_|^q$/i.test(name);

  if (!isCryptic) return null;

  // Try to produce a better title — this is best-effort
  return humanise(name).toLowerCase().replace(/\s+/g, "_");
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function capitalise(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function humanise(str) {
  if (!str) return "";
  return str
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function getTypeHint(field) {
  const tag = (field.tag || "").toLowerCase();
  const type = (field.type || "text").toLowerCase();

  if (tag === "textarea") return "Free-text message or description";
  if (tag === "select") return "Choose from a dropdown";

  switch (type) {
    case "email":
      return "Email address";
    case "tel":
      return "Phone number";
    case "date":
      return "Date value (YYYY-MM-DD format)";
    case "number":
      return "Numeric value";
    case "password":
      return "Password (sensitive)";
    case "url":
      return "URL / web address";
    case "search":
      return "Search query text";
    default:
      return null;
  }
}

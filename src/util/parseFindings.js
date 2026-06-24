// parseFindings.js — turn a model's reply into clean finding() objects.
//
// Real models (and even our mock) return JSON as text. That text can be wrapped
// in ```json fences, have stray prose, or be malformed. This parser fails SOFT:
// if it cannot understand the reply, it returns a single "info" finding noting
// the parse problem instead of throwing — so one bad stage never crashes the
// whole review.

import { finding, SEVERITY } from "../review/result.js";

const VALID_SEVERITIES = new Set(Object.values(SEVERITY));

/**
 * @param {string} text       - raw model reply (expected: JSON with findings)
 * @param {string} dimension  - which dimension this stage covered (for context)
 * @returns {Array<object>}   - array of finding() objects (possibly empty)
 */
export function parseFindings(text, dimension = "") {
  const json = extractJson(text);
  if (json === null) {
    return [
      finding(
        SEVERITY.INFO,
        `Unparseable ${dimension} response`,
        "The model reply was not valid JSON; no findings extracted for this stage.",
        "parse-failure"
      ),
    ];
  }

  const rawFindings = Array.isArray(json) ? json : json.findings;
  if (!Array.isArray(rawFindings)) return [];

  return rawFindings
    .filter((f) => f && (f.title || f.detail))
    .map((f) =>
      finding(
        normalizeSeverity(f.severity),
        String(f.title ?? "(untitled finding)"),
        String(f.detail ?? ""),
        String(f.evidence ?? "")
      )
    );
}

/** Pull a JSON value out of text, tolerating ```json fences and surrounding prose. */
function extractJson(text = "") {
  if (typeof text !== "string") return null;

  // Strip code fences if present.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;

  // Try the whole thing first, then the widest {...} or [...] slice.
  for (const slice of [candidate, widest(candidate, "{", "}"), widest(candidate, "[", "]")]) {
    if (!slice) continue;
    try {
      return JSON.parse(slice);
    } catch {
      /* keep trying */
    }
  }
  return null;
}

function widest(s, open, close) {
  const a = s.indexOf(open);
  const b = s.lastIndexOf(close);
  return a !== -1 && b > a ? s.slice(a, b + 1) : null;
}

function normalizeSeverity(sev) {
  const s = String(sev ?? "").toLowerCase().trim();
  return VALID_SEVERITIES.has(s) ? s : SEVERITY.INFO;
}

// Letting someone bold a line of a product description.
//
// Descriptions live in WooCommerce as HTML, and the storefront already renders
// <strong>, <em>, paragraphs, lists and headings. What was missing was a way to
// write any of it: the admin had a plain textarea, so every description came
// out as one undifferentiated paragraph with "How to use:" buried mid-sentence.
//
// Rather than fit a rich-text editor, the box stays plain text and uses two
// markers — **bold** and _italic_ — which are converted on the way in and out.
// That keeps the description readable in the CSV export, diffable, and free of
// editor markup, and it adds no dependency.
//
// The one rule that matters: NOTHING IS EVER FLATTENED. A description holding
// structure these markers cannot express — a list, a heading, a table — is
// handed back as raw HTML and edited as HTML, because silently dropping a
// customer-facing bullet list to make an editor simpler is not a trade worth
// making.

// What the marker syntax can represent, round trip.
const SIMPLE_TAGS = new Set(["p", "br", "strong", "b", "em", "i"]);

/**
 * True when a description can be shown as marker text without losing anything.
 *
 * Attributes count against it: <p class="x"> carries styling we would drop.
 */
export function isSimpleHtml(html) {
  const s = String(html || "");
  if (!s.trim()) return true;
  const tags = s.match(/<\s*\/?\s*([a-zA-Z0-9]+)([^>]*)>/g) || [];
  for (const tag of tags) {
    const m = tag.match(/<\s*\/?\s*([a-zA-Z0-9]+)([^>]*)>/);
    if (!m) return false;
    if (!SIMPLE_TAGS.has(m[1].toLowerCase())) return false;
    // A trailing slash on <br /> is fine; anything else is an attribute.
    if (m[2].replace(/\/\s*$/, "").trim()) return false;
  }
  return true;
}

const ENTITIES = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
  "&#039;": "'", "&#39;": "'", "&apos;": "'", "&nbsp;": " ",
};

function decodeEntities(text) {
  return String(text ?? "")
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp|#0?39);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : _;
    });
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * HTML as the admin edits it.
 *
 * Returns { text, raw }. `raw` is true when the description could not be
 * represented as markers and is being edited as HTML instead, so the form can
 * say so rather than letting someone wonder why there are tags in the box.
 */
export function htmlToEditable(html) {
  const s = String(html || "");
  if (!s.trim()) return { text: "", raw: false };
  if (!isSimpleHtml(s)) return { text: s.trim(), raw: true };

  const text = s
    .replace(/<\s*(strong|b)\s*>/gi, "**")
    .replace(/<\s*\/\s*(strong|b)\s*>/gi, "**")
    .replace(/<\s*(em|i)\s*>/gi, "_")
    .replace(/<\s*\/\s*(em|i)\s*>/gi, "_")
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    // A paragraph break is a blank line.
    .replace(/<\s*\/\s*p\s*>\s*<\s*p\s*>/gi, "\n\n")
    .replace(/<\s*\/?\s*p\s*>/gi, "")
    .trim();

  return { text: decodeEntities(text).replace(/\n{3,}/g, "\n\n"), raw: false };
}

/**
 * Marker text back to the HTML WooCommerce stores.
 *
 * Escaping happens first so a description containing "<" or "&" cannot inject
 * markup, and the markers are applied afterwards so they survive escaping.
 */
export function editableToHtml(text, { raw = false } = {}) {
  const s = String(text ?? "");
  if (!s.trim()) return "";
  // A description being edited as HTML is stored exactly as typed; it was
  // never converted, so there is nothing to convert back.
  if (raw) return s.trim();

  const inline = (chunk) =>
    escapeHtml(chunk)
      // Non-greedy, and no match across a line break, so an unclosed marker
      // cannot swallow the rest of the description.
      .replace(/\*\*([^\n*][^\n]*?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^_\w])_([^\n_][^\n]*?)_(?![\w])/g, "$1<em>$2</em>");

  return s
    .trim()
    .split(/\n{2,}/)
    .map((para) => `<p>${inline(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/**
 * Wraps the selected part of a textarea in a marker, or unwraps it if it is
 * already wrapped — what a Bold button does.
 *
 * Returns the new value and where the selection should end up, so the caret
 * does not jump to the end of the box on every click.
 */
export function toggleMarker(value, start, end, marker = "**") {
  const s = String(value ?? "");
  const before = s.slice(0, start);
  const selected = s.slice(start, end);
  const after = s.slice(end);
  const n = marker.length;

  // Already wrapped, either inside the selection or just outside it.
  if (selected.startsWith(marker) && selected.endsWith(marker) && selected.length > n * 2) {
    const inner = selected.slice(n, -n);
    return { value: before + inner + after, start, end: start + inner.length };
  }
  if (before.endsWith(marker) && after.startsWith(marker)) {
    return {
      value: before.slice(0, -n) + selected + after.slice(n),
      start: start - n,
      end: end - n,
    };
  }

  // Nothing selected: drop in an empty pair and put the caret between them.
  if (!selected) {
    return { value: `${before}${marker}${marker}${after}`, start: start + n, end: start + n };
  }
  return {
    value: `${before}${marker}${selected}${marker}${after}`,
    start: start + n,
    end: end + n,
  };
}

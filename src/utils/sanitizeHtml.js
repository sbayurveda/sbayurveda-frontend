// WooCommerce product descriptions contain real structured content (headings
// like "Key Ingredients"/"Directions For Use", bullet lists, paragraphs) full
// of noisy editor markup (data-start attributes, wrapping <span> tags, inline
// styles). We want to keep the structure but strip everything else down to a
// small safe tag allowlist before rendering as HTML.

const ALLOWED_TAGS = new Set([
  "H1", "H2", "H3", "H4", "H5", "H6",
  "P", "UL", "OL", "LI",
  "STRONG", "EM", "B", "I", "BR",
]);

export function sanitizeDescriptionHtml(html) {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");

  function clean(node) {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const tag = child.tagName;

      if (tag === "SCRIPT" || tag === "STYLE") {
        child.remove();
        return;
      }

      clean(child);

      if (ALLOWED_TAGS.has(tag)) {
        Array.from(child.attributes).forEach((attr) => child.removeAttribute(attr.name));
      } else {
        // Unwrap: keep the text/children, drop the wrapping tag itself
        // (e.g. the editor's <span class="hover:entity-accent ...">).
        while (child.firstChild) child.parentNode.insertBefore(child.firstChild, child);
        child.remove();
      }
    });
  }

  clean(doc.body);
  return doc.body.innerHTML.trim();
}

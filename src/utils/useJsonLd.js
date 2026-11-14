import { useEffect } from "react";

// Injects a <script type="application/ld+json"> tag into <head> for the
// lifetime of the calling component, removing it on unmount/route change —
// same pattern as NotFound.jsx's dynamic <meta name="robots"> handling.
export function useJsonLd(schema) {
  useEffect(() => {
    if (!schema) return;

    // The prerendered page already carries a Product block in <head>, built
    // at deploy time so a crawler sees price and availability before any
    // JavaScript runs. Once this component mounts, that block is stale and —
    // worse — a second Product entity on the same page: Google's Rich Results
    // Test reported two products with different names ("Triguna Amlantak
    // Syrup (200ml)" from the prerender, "Amlantak Syrup (200ml)" from here,
    // which strips the brand prefix) and had to guess which one the page is
    // about. Drop it so exactly one remains.
    const prerendered = document.head.querySelector(
      'script[type="application/ld+json"][data-prerendered]'
    );
    if (prerendered) prerendered.remove();

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
    return () => document.head.removeChild(script);
  }, [schema]);
}

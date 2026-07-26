import { useEffect } from "react";

// Injects a <script type="application/ld+json"> tag into <head> for the
// lifetime of the calling component, removing it on unmount/route change —
// same pattern as NotFound.jsx's dynamic <meta name="robots"> handling.
export function useJsonLd(schema) {
  useEffect(() => {
    if (!schema) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
    return () => document.head.removeChild(script);
  }, [schema]);
}

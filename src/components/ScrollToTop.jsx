import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// React Router doesn't reset scroll position between page navigations like a
// normal multi-page site does — without this, clicking a product from deep
// down a listing page lands you on the product page still scrolled down.
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

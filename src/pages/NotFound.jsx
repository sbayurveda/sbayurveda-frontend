import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Leaf } from "lucide-react";

export default function NotFound() {
  useEffect(() => {
    // Static hosting can't return a real HTTP 404 for client-side routes (the
    // server always serves index.html), so we signal "don't index this" to
    // crawlers the one way we can from here, to avoid soft-404 penalties.
    // index.html already ships a robots meta tag, so update it in place
    // rather than appending a second, conflicting one.
    const meta = document.querySelector('meta[name="robots"]');
    const prevContent = meta?.content;
    if (meta) meta.content = "noindex";
    const prevTitle = document.title;
    document.title = "Page Not Found — SB Ayurveda";
    return () => {
      if (meta) meta.content = prevContent;
      document.title = prevTitle;
    };
  }, []);

  return (
    <div className="container-px max-w-lg mx-auto py-24 text-center">
      <Leaf size={40} className="mx-auto text-ayur-green mb-4" />
      <h1 className="text-3xl font-bold text-gray-800 mb-2">404</h1>
      <p className="text-gray-500 mb-6">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary px-6 py-3 text-sm">
        Back to Home
      </Link>
    </div>
  );
}

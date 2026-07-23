import { RefreshCw, AlertTriangle } from "lucide-react";
import { useCatalogStore } from "../context/catalogStore";

export default function CatalogStatusBanner() {
  const status = useCatalogStore((s) => s.status);
  const error = useCatalogStore((s) => s.error);
  const fetchCatalog = useCatalogStore((s) => s.fetchCatalog);

  if (status === "loading") {
    return (
      <div className="bg-ayur-cream text-ayur-green-dark text-xs sm:text-sm font-medium py-2 px-4 flex items-center justify-center gap-2">
        <RefreshCw size={14} className="animate-spin" />
        Loading latest products from the store...
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="bg-red-50 text-red-700 text-xs sm:text-sm font-medium py-2 px-4 flex items-center justify-center gap-2">
        <AlertTriangle size={14} />
        Couldn't load products ({error}).
        <button
          onClick={() => fetchCatalog({ force: true })}
          className="underline font-semibold hover:text-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  return null;
}

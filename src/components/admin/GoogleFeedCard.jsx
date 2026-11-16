import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Loader2, ExternalLink, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { fetchSiteRebuild, startSiteRebuild, AdminAuthError } from "../../api/adminApi";

// The Google Shopping feed is written when the public site is built, not when
// a price is saved. There is a nightly rebuild, but after changing a price
// nobody wants to wait until 03:00 to see it reach Google — so this runs the
// same build now.
//
// It cannot make Google read the feed sooner; Google fetches on its own
// schedule. The card says so rather than implying the price is live on
// Shopping the moment the button goes green.

function when(iso) {
  if (!iso) return "";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const mins = Math.round((Date.now() - then.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} ${hrs === 1 ? "hour" : "hours"} ago`;
  return then.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function GoogleFeedCard({ onAuthError }) {
  const [state, setState] = useState(null);
  const [starting, setStarting] = useState(false);
  // A running build is polled; anything else is left alone until the owner
  // acts, so an idle settings page is not calling the server every 8 seconds.
  const timer = useRef(null);

  const load = useCallback(
    () =>
      fetchSiteRebuild()
        .then(setState)
        .catch((err) => {
          if (err instanceof AdminAuthError) onAuthError?.(err);
          // Any other failure just leaves the card showing what it last knew.
        }),
    [onAuthError],
  );

  useEffect(() => { load(); }, [load]);

  const running = state?.run?.state === "running";
  useEffect(() => {
    clearInterval(timer.current);
    if (running) timer.current = setInterval(load, 8000);
    return () => clearInterval(timer.current);
  }, [running, load]);

  // The cooldown ticks down on the server; re-reading it when it should have
  // expired re-enables the button without the owner reloading the page.
  useEffect(() => {
    const left = state?.cooldownMsRemaining || 0;
    if (left <= 0) return undefined;
    const t = setTimeout(load, left + 500);
    return () => clearTimeout(t);
  }, [state?.cooldownMsRemaining, load]);

  async function rebuild() {
    setStarting(true);
    try {
      const out = await startSiteRebuild();
      toast.success(out.message || "Rebuilding.");
      await load();
    } catch (err) {
      if (err instanceof AdminAuthError) onAuthError?.(err);
      else toast.error(err.message);
    } finally {
      setStarting(false);
    }
  }

  const blocked = !state?.configured || running || starting || (state?.cooldownMsRemaining || 0) > 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl lg:col-span-2">
      <header className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[13.5px] font-semibold flex items-center gap-1.5">
            <RefreshCw size={14} className="text-ayur-green" /> Google Shopping feed
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Changed a price? Refresh to put it in the feed now, instead of waiting for the
            3am rebuild.
          </p>
        </div>

        <button
          type="button"
          onClick={rebuild}
          disabled={blocked}
          className="btn-primary px-3.5 py-2 text-[12.5px] inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {running || starting
            ? <Loader2 size={13} className="animate-spin" />
            : <RefreshCw size={13} />}
          {running ? "Rebuilding…" : starting ? "Starting…" : "Refresh feed"}
        </button>
      </header>

      <div className="px-4 py-3 space-y-2">
        <p className="text-[12.5px] text-slate-600">{state?.message || "Checking…"}</p>

        {state?.configured === false && (
          <p className="text-[11.5px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex gap-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>
              The server needs a <code className="font-mono">GITHUB_TOKEN</code> with
              {" "}Actions&nbsp;write access to the website repository before this button can work.
            </span>
          </p>
        )}

        {state?.run && (
          <p className="text-[11.5px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              Last rebuild {when(state.run.startedAt)}
              {state.run.trigger === "schedule" && " (nightly)"}
              {state.run.trigger === "push" && " (site update)"}
            </span>
            {state.run.url && (
              <a
                href={state.run.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-ayur-green hover:underline"
              >
                View on GitHub <ExternalLink size={11} />
              </a>
            )}
          </p>
        )}

        <p className="text-[11px] text-slate-400 leading-relaxed">
          This updates the feed file on the website. Google reads it at 5am daily — to pull it
          in straight away, open Merchant Center → Data sources and click Update on the feed.
        </p>
      </div>
    </div>
  );
}

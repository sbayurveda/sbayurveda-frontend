import { useState } from "react";
import { Lock, Loader2, ShieldAlert } from "lucide-react";
import { adminLogin, isAdminApiConfigured } from "../../api/adminApi";

export default function AdminLogin({ onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      await adminLogin(username.trim(), password);
      onSuccess();
    } catch (err) {
      setError(err.message || "Could not sign in.");
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  if (!isAdminApiConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <ShieldAlert className="mx-auto text-amber-500 mb-3" size={36} />
          <h1 className="text-lg font-bold text-slate-800 mb-2">Admin isn't available</h1>
          <p className="text-sm text-slate-500">
            This build has no API server configured, so there are no orders to show.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-full bg-ayur-green/10 flex items-center justify-center mb-3">
            <Lock className="text-ayur-green" size={22} />
          </div>
          <h1 className="text-lg font-bold text-slate-800">SB Ayurveda Admin</h1>
          <p className="text-xs text-slate-500 mt-1">Order history &amp; dispatch</p>
        </div>

        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-ayur-green/30"
        />

        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-ayur-green/30"
        />

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !username.trim() || !password}
          className="w-full btn-primary py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : null}
          {busy ? "Signing in..." : "Sign in"}
        </button>

        <p className="text-[11px] text-slate-400 text-center mt-4 leading-relaxed">
          This page shows real customer contact details. Don't leave it open on a
          shared computer — signing out or closing the tab ends the session.
        </p>
      </form>
    </div>
  );
}

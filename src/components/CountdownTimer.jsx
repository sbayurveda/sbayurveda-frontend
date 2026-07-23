import { useEffect, useState } from "react";

function getRemaining(endTime) {
  const diff = Math.max(endTime - Date.now(), 0);
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { hours, minutes, seconds, diff };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

export default function CountdownTimer({ hours: initialHours = 6, className = "" }) {
  const [endTime] = useState(() => Date.now() + initialHours * 3600000);
  const [time, setTime] = useState(() => getRemaining(endTime));

  useEffect(() => {
    const id = setInterval(() => setTime(getRemaining(endTime)), 1000);
    return () => clearInterval(id);
  }, [endTime]);

  return (
    <div className={`flex items-center gap-1.5 font-mono font-bold ${className}`}>
      {[time.hours, time.minutes, time.seconds].map((v, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="bg-white/20 rounded px-1.5 py-0.5">{pad(v)}</span>
          {i < 2 && <span>:</span>}
        </span>
      ))}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

type ConnectionState = { sheets: boolean; supabase: boolean };

export default function ConnectionStatus() {
  const [status, setStatus] = useState<ConnectionState | null>(null);

  useEffect(() => {
    fetch("/api/connection-status")
      .then((res) => res.json())
      .then((data: ConnectionState) => setStatus({ sheets: !!data.sheets, supabase: !!data.supabase }))
      .catch(() => setStatus({ sheets: false, supabase: false }));
  }, []);

  if (!status) {
    return <p className="text-xs text-neutral-400 truncate">Checking Sheets and Supabase…</p>;
  }

  return (
    <p className="text-xs text-neutral-400 leading-snug" title="Connection status">
      <span className="block">Sheets {status.sheets ? "connected" : "not configured"}</span>
      <span className="block">Supabase {status.supabase ? "connected" : "not configured"}</span>
    </p>
  );
}

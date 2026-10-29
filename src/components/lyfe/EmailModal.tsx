"use client";

import { useState } from "react";
import { Eye, X } from "lucide-react";

export default function EmailModal({
  name,
  subject,
  body,
}: {
  name: string;
  subject: string;
  body: string;
}) {
  const [open, setOpen] = useState(false);

  if (!body) return <span className="text-xs text-neutral-400">No email drafted</span>;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
      >
        <Eye className="h-3.5 w-3.5" strokeWidth={2} />
        View email
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-neutral-400">Email to {name}</p>
                <p className="text-base font-semibold text-neutral-900 mt-0.5">{subject || "(no subject)"}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-neutral-400 hover:text-neutral-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-neutral-700 whitespace-pre-line leading-relaxed">{body}</p>
          </div>
        </div>
      )}
    </>
  );
}

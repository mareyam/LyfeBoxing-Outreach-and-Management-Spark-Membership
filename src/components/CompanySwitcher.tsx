"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronDown, Pencil } from "lucide-react";

const PLACEHOLDER_COMPANIES = ["Company B", "Company C", "Company D"];

export default function CompanySwitcher() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function selectLyfeBoxing() {
    setOpen(false);
    router.push("/lyfe-boxing");
  }

  return (
    <div className="relative flex-1 min-w-0">
      <div className="flex items-start gap-2">
        <button
          onClick={selectLyfeBoxing}
          onContextMenu={(e) => {
            e.preventDefault();
            setOpen((o) => !o);
          }}
          className="flex-1 min-w-0 flex items-center gap-2 text-left"
        >
          <div className="h-8 w-8 shrink-0 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <Building2 className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <span className="flex items-center gap-1 text-sm font-semibold text-neutral-900 truncate">
              Lyfe Boxing
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </span>
            <p className="text-xs text-neutral-400 truncate">Google Sheets connected</p>
          </div>
        </button>
        <button
          title="Edit workspace"
          className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 hover:bg-blue-50 hover:text-blue-600"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-10 rounded-lg border border-neutral-200 bg-white shadow-md py-1">
          <button
            onClick={selectLyfeBoxing}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
          >
            <Building2 className="h-4 w-4 shrink-0 text-blue-600" strokeWidth={1.75} />
            <span className="flex-1 text-left truncate">Lyfe Boxing</span>
            <Check className="h-4 w-4 shrink-0 text-blue-600" strokeWidth={2} />
          </button>
          {PLACEHOLDER_COMPANIES.map((label) => (
            <div
              key={label}
              title="Coming soon"
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-300 cursor-not-allowed select-none"
            >
              <Building2 className="h-4 w-4 shrink-0 text-neutral-200" strokeWidth={1.75} />
              <span className="flex-1 text-left truncate">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

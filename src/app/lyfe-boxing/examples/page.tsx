"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Card } from "@/components/ui";

type ExampleRow = {
  id: string;
  lead: string | null;
  step: string | null;
  original: string | null;
  final: string | null;
  example_date: string | null;
  created_at: string | null;
};

export default function ExamplesPage() {
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [message, setMessage] = useState("");
  const [examples, setExamples] = useState<ExampleRow[]>([]);

  useEffect(() => {
    fetch("/api/examples")
      .then(async (res) => {
        const data = await res.json();
        if (data.notConfigured) {
          setState("missing");
          setMessage(data.error ?? "Supabase isn't configured.");
          return;
        }
        if (!res.ok) {
          setState("error");
          setMessage(data.error ?? "Couldn't load saved examples.");
          return;
        }
        setExamples(data.examples ?? []);
        setState("ready");
      })
      .catch(() => {
        setState("error");
        setMessage("Couldn't load saved examples.");
      });
  }, []);

  return (
    <div className="max-w-[1600px]">
      <div className="mb-2 flex items-center gap-1.5 text-sm text-neutral-400">
        <Link href="/lyfe-boxing" className="hover:text-blue-600">
          Home
        </Link>
        <span>›</span>
        <span className="text-neutral-600 font-medium">Saved examples</span>
      </div>
      <div className="mb-6">
        <h1 className="text-[28px] leading-tight font-semibold text-neutral-900 tracking-tight">Saved examples</h1>
        <p className="text-base text-neutral-500 mt-2 max-w-2xl">
          Edited emails the team kept as examples. This page only reads them.
        </p>
      </div>
      {state === "loading" && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading saved examples">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      )}
      {state === "missing" && (
        <Card className="text-center py-12">
          <BookOpen className="h-8 w-8 text-neutral-300 mx-auto" strokeWidth={1.5} />
          <p className="font-semibold text-neutral-900 mt-3">Supabase isn&apos;t configured</p>
          <p className="text-sm text-neutral-500 mt-1 max-w-md mx-auto">{message}</p>
        </Card>
      )}
      {state === "error" && (
        <Card className="border-red-200 bg-red-50">
          <p className="font-semibold text-neutral-900">Couldn&apos;t load saved examples</p>
          <p className="text-sm text-neutral-600 mt-1">{message}</p>
        </Card>
      )}
      {state === "ready" && examples.length === 0 && (
        <Card className="text-center py-12">
          <BookOpen className="h-8 w-8 text-neutral-300 mx-auto" strokeWidth={1.5} />
          <p className="font-semibold text-neutral-900 mt-3">No saved examples yet</p>
          <p className="text-sm text-neutral-500 mt-1 max-w-md mx-auto">
            When an edited draft is stored in the examples table, it will show up here.
          </p>
        </Card>
      )}
      {state === "ready" && examples.length > 0 && (
        <div className="space-y-4">
          {examples.map((example) => (
            <Card key={example.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <p className="font-semibold text-neutral-900">{example.lead || "Untitled lead"}</p>
                <p className="text-xs text-neutral-400">
                  {example.step ? `Step ${example.step}` : "Step unknown"}
                  {example.example_date ? ` · ${example.example_date}` : ""}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">Original</p>
                  <p className="text-sm text-neutral-600 whitespace-pre-wrap">{example.original || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">Final</p>
                  <p className="text-sm text-neutral-900 whitespace-pre-wrap">{example.final || "—"}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

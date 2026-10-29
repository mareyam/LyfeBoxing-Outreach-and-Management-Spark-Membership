import { faqs, supportChatLog } from "@/lib/data";
import { Card, PageHeader } from "@/components/ui";

export default function Page() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Support Assistant"
        subtitle="Answers FAQs via RAG over the knowledge base, and books appointments directly in chat."
        tool="Pinecone/Qdrant (RAG) + Cal.com API"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <p className="text-base font-medium text-neutral-900 mb-3">
            Live chat example
          </p>
          <div className="space-y-2">
            {supportChatLog.map((m, i) => (
              <div
                key={i}
                className={`text-base rounded-lg px-3 py-2 max-w-[85%] ${
                  m.from === "agent"
                    ? "bg-neutral-100 text-neutral-800"
                    : "bg-neutral-900 text-white ml-auto"
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-base font-medium text-neutral-900 mb-3">
            Knowledge base (FAQs)
          </p>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <div key={i}>
                <p className="text-base font-medium text-neutral-800">{f.q}</p>
                <p className="text-base text-neutral-500 mt-0.5">{f.a}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

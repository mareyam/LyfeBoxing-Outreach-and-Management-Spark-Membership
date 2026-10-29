import Link from "next/link";
import {
  Megaphone,
  CircleDollarSign,
  UserMinus,
  Sparkles,
  AlertCircle,
  TrendingUp,
  FileBarChart,
  CalendarDays,
} from "lucide-react";
import { Card } from "@/components/ui";
import { sheetsConfigured } from "@/lib/sheets/client";
import { SetupNeeded } from "@/components/lyfe/SheetStates";

const cards = [
  { href: "/lyfe-boxing/campaigns", label: "Campaigns", desc: "Draft and queue Email/SMS campaigns.", Icon: Megaphone },
  { href: "/lyfe-boxing/past-due", label: "Past Due", desc: "Members behind on payment, with email status.", Icon: CircleDollarSign },
  { href: "/lyfe-boxing/cancelled", label: "Cancelled / Win-back", desc: "Members cancelled 14+ days ago.", Icon: UserMinus },
  { href: "/lyfe-boxing/trial-conversion", label: "Trial Conversion", desc: "Trial and 1-day members to convert.", Icon: Sparkles },
  { href: "/lyfe-boxing/at-risk", label: "At Risk", desc: "No attendance in 10+ days.", Icon: AlertCircle },
  { href: "/lyfe-boxing/upgrade-candidates", label: "Upgrade Candidates", desc: "Members outgrowing their plan.", Icon: TrendingUp },
  { href: "/lyfe-boxing/weekly-summary", label: "Weekly Summary", desc: "A screenshot-ready recap for Alex.", Icon: FileBarChart },
  { href: "/lyfe-boxing/calendar", label: "Calendar", desc: "Appointments and booking requests.", Icon: CalendarDays },
];

export default function LyfeBoxingDashboard() {
  const configured = sheetsConfigured();

  return (
    <div className="max-w-5xl">
      <h1 className="text-[28px] leading-tight font-semibold text-neutral-900 tracking-tight">
        Lyfe Boxing Operations
      </h1>
      <p className="text-base text-neutral-500 mt-2 max-w-2xl">
        Reads from the &quot;Spark Memberships&quot; Google Sheet. This site never
        sends email or SMS directly — campaigns are written here as drafts,
        and your assistant sends ticked campaigns through Spark at 3 PM and
        12 AM PKT.
      </p>

      {!configured && (
        <div className="mt-6">
          <SetupNeeded />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        {cards.map(({ href, label, desc, Icon }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full transition-all group-hover:shadow-md group-hover:border-neutral-300">
              <div className="h-10 w-10 rounded-xl bg-neutral-900 flex items-center justify-center">
                <Icon className="h-5 w-5 text-white" strokeWidth={1.75} />
              </div>
              <p className="text-base font-semibold text-neutral-900 mt-4">{label}</p>
              <p className="text-sm text-neutral-500 mt-1.5">{desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

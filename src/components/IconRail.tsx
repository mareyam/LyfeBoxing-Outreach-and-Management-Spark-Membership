"use client";

import {
  Dumbbell,
  Search,
  Users,
  Mail,
  CheckSquare,
  FileText,
  BarChart2,
  GraduationCap,
  Target,
  MoreHorizontal,
  KeyRound,
  Activity,
  Droplet,
  UsersRound,
} from "lucide-react";

const topIcons = [Users, Mail, CheckSquare, FileText, BarChart2, GraduationCap, Target];
const bottomIcons = [MoreHorizontal, KeyRound, Activity, Droplet];

export default function IconRail() {
  return (
    <div className="w-14 shrink-0 bg-white h-full flex flex-col items-center py-4 gap-1">
      <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-3">
        <Dumbbell className="h-4 w-4" strokeWidth={2} />
      </div>

      <button className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-500 hover:text-blue-700 mb-1.5">
        <Search className="h-4 w-4" strokeWidth={1.75} />
      </button>

      {topIcons.map((Icon, i) => (
        <button
          key={i}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-neutral-400 hover:bg-blue-50 hover:text-blue-600"
        >
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </button>
      ))}

      <MoreHorizontal className="h-4 w-4 text-neutral-300 my-1.5" strokeWidth={1.75} />

      {bottomIcons.map((Icon, i) => (
        <button
          key={i}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-neutral-400 hover:bg-blue-50 hover:text-blue-600"
        >
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </button>
      ))}

      <MoreHorizontal className="h-4 w-4 text-neutral-300 my-1.5" strokeWidth={1.75} />

      <div className="relative group">
        <button
          title="Lyfe Boxing"
          className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600"
        >
          <Dumbbell className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap rounded-md bg-blue-600 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-10">
          Lyfe Boxing
        </span>
      </div>
      <button className="h-8 w-8 flex items-center justify-center rounded-lg text-neutral-400 hover:bg-blue-50 hover:text-blue-600">
        <UsersRound className="h-4 w-4" strokeWidth={1.75} />
      </button>

      <div className="flex-1" />

      <div className="h-8 w-8 shrink-0 rounded-full bg-blue-600 text-white text-[10px] font-semibold flex items-center justify-center">
        LB
      </div>
    </div>
  );
}

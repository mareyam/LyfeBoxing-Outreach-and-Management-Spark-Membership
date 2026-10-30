import { redirect } from "next/navigation";

// Summary was merged into Weekly Summary — keep the old URL working.
export default function Page() {
  redirect("/lyfe-boxing/weekly-summary");
}

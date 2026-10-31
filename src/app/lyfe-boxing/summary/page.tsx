import { redirect } from "next/navigation";

// Summary was merged into Monthly Summary, now the app's default page — keep the old URL working.
export default function Page() {
  redirect("/lyfe-boxing");
}

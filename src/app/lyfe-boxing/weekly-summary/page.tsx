import { redirect } from "next/navigation";

// Weekly Summary is now the app's default page, renamed Monthly Summary — keep the old URL working.
export default function Page() {
  redirect("/lyfe-boxing");
}

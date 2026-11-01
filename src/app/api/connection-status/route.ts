import { connection, NextResponse } from "next/server";

/** Whether the server has the env vars for each data source. Values are never returned. */
export async function GET() {
  await connection();
  const sheets = Boolean(
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID &&
      process.env.GOOGLE_SHEETS_CLIENT_EMAIL &&
      process.env.GOOGLE_SHEETS_PRIVATE_KEY
  );
  const supabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  return NextResponse.json({ sheets, supabase });
}

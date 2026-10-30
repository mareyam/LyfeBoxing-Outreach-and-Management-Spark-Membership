This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

The Lyfe Boxing dashboard lives at `/lyfe-boxing` and reads the Spark Memberships Google Sheet. Send does not deliver email itself: it saves the draft, sets the row to `Queued`, then POSTs to the Grok webhook.

## Environment variables

Set these on the Vercel project (Production) and in `.env.local` for local dev. `.env.local` is gitignored — do not commit secrets. Names and placeholders are listed in `.env.example`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `GROK_WEBHOOK_URL` | Yes, for Send | URL the server POSTs when a row is queued. Body: `{ tab, rows, kind, site: "lyfe-boxing", queuedAt }`. |
| `GROK_WEBHOOK_AUTH` | Yes, for Send | Full `Authorization` header value sent with that POST (for example `Bearer <token>`). |
| `SITE_PASSWORD` | No | When set, every page and `/api` route asks for this password on `/login` and then stores an HttpOnly cookie. The check lives in `src/proxy.ts` (Next.js 16's middleware). When unset, the site stays open. `/api/cron/*` skips the password and uses `CRON_SECRET` instead. |
| `ANTHROPIC_API_KEY` | Yes, for AI drafts | Claude key used by campaign "Generate with AI", lead "Generate draft", and the lead-sequence cron. |
| `TRIAL_BOOKING_URL` | No | Exact trial-booking link inserted into every lead draft. If unset, drafts use the Trial link stored on the Playbook sheet tab. |
| `CRON_SECRET` | Yes, for the cron | Shared secret. Vercel Cron calls `GET /api/cron/lead-sequence` with `Authorization: Bearer <CRON_SECRET>` once daily at 9 AM New York (`0 13 * * *` in `vercel.json`). The route returns 401 without it. |
| `AUTO_SEND_STEP1` | No | Default off. Set to `true` or `1` to let the cron queue day-1 drafts and call the Grok webhook. Later steps are never auto-sent. |

Lead follow-up reads the `Leads` and `Digest` tabs. The cron writes `Email Draft` / `Email Status` and advances `Sequence Step` and `Next Follow-up Date`. It does not send mail itself. Grok writes `Last Contacted` after a successful send. The Playbook page stores tone, offers, prices, FAQs, and the trial link on a `Playbook` tab (created automatically). Edits that differ from the AI original are appended to an `Examples` tab and the five newest are included in later prompts.

Google Sheets (`GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SHEETS_CLIENT_EMAIL`, `GOOGLE_SHEETS_PRIVATE_KEY`) are also required for live data. See `.env.example`.

If `GROK_WEBHOOK_URL` or `GROK_WEBHOOK_AUTH` is missing, Send still writes `Queued` and the UI shows **Webhook not configured**.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

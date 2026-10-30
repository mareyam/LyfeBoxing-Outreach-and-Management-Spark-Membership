import assert from "node:assert/strict";
import { createServer, type IncomingMessage } from "node:http";
import { notifyGrok, WebhookNotConfiguredError } from "./notifyGrok";

type Hit = { auth: string | undefined; body: Record<string, unknown> };

async function listen() {
  const hits: Hit[] = [];
  let status = 200;
  const server = createServer(async (req: IncomingMessage, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    hits.push({
      auth: req.headers.authorization,
      body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
    });
    res.writeHead(status);
    res.end("ok");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no port");
  return {
    url: `http://127.0.0.1:${address.port}/hook`,
    hits: () => hits,
    setStatus(next: number) {
      status = next;
    },
    close: () => new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}

async function main() {
  delete process.env.GROK_WEBHOOK_URL;
  delete process.env.GROK_WEBHOOK_AUTH;
  await assert.rejects(() => notifyGrok({ tab: "Campaigns", rows: [2], kind: "campaign" }), (err: unknown) => {
    assert.ok(err instanceof WebhookNotConfiguredError);
    assert.equal((err as Error).message, "Webhook not configured");
    return true;
  });

  const server = await listen();
  process.env.GROK_WEBHOOK_URL = server.url;
  process.env.GROK_WEBHOOK_AUTH = "test-secret";

  await notifyGrok({ tab: "Campaigns", rows: [35, 36], kind: "winback" });
  assert.equal(server.hits().length, 1);
  assert.equal(server.hits()[0].auth, "Bearer test-secret");
  const body = server.hits()[0].body;
  assert.deepEqual(body.rows, [35, 36]);
  assert.equal(body.tab, "Campaigns");
  assert.equal(body.kind, "winback");
  assert.equal(body.site, "lyfe-boxing");
  assert.equal(typeof body.queuedAt, "string");
  assert.equal(Object.hasOwn(body, "row"), false);

  server.setStatus(401);
  await assert.rejects(() => notifyGrok({ tab: "Past Due", rows: [4], kind: "past-due" }), /Webhook responded 401/);
  assert.equal(server.hits().length, 2, "4xx is not retried");

  server.setStatus(502);
  await assert.rejects(() => notifyGrok({ tab: "Campaigns", rows: [9], kind: "campaign" }), /Webhook responded 502/);
  assert.equal(server.hits().length, 4, "5xx is retried once");

  await server.close();

  process.env.GROK_WEBHOOK_URL = "http://127.0.0.1:1/hook";
  await assert.rejects(() => notifyGrok({ tab: "Campaigns", rows: [1], kind: "campaign" }), /Couldn't reach the webhook/);

  console.log("notifyGrok tests passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

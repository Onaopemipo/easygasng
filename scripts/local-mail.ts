import "./environment";
import { getDb } from "../apps/web/lib/db";
if (process.env.NODE_ENV === "production" || process.env.DATABASE_URL)
  throw new Error(
    "Local email preview is disabled outside the local development database.",
  );
const recipient = process.argv[2]?.trim().toLowerCase();
if (!recipient || !recipient.includes("@"))
  throw new Error("Usage: npm run mail:preview -- recipient@example.test");
const db = await getDb();
const messages = (
  await db.query(
    "SELECT subject,body,created_at FROM message_outbox WHERE recipient=$1 AND status='pending' ORDER BY created_at DESC LIMIT 10",
    [recipient],
  )
).rows;
for (const m of messages)
  console.log(
    `\n${new Date(m.created_at).toISOString()} · ${m.subject}\n${m.body}\n`,
  );
if (!messages.length) console.log("No pending local email for this recipient.");
console.log(
  "Local preview only. No email was sent or marked delivered. Stop the development server before using this command.",
);
process.exit(0);

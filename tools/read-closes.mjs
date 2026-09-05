/**
 * Read the Evening Close store from your own machine.
 *
 * Runs locally only. It is deliberately not an endpoint on the live site,
 * because an admin route that reads everyone's journal is an attack surface
 * and a promise you would then have to keep.
 *
 *   npx netlify login          once, opens the browser
 *   npx netlify link           once, connects this folder to the site
 *   npx netlify dev:exec node tools/read-closes.mjs           accounts and counts
 *   npx netlify dev:exec node tools/read-closes.mjs <email>   one account in full
 *
 * Reading the live store needs NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID in the
 * environment, or a linked folder, which is what `netlify link` sets up.
 */

import { getStore } from "@netlify/blobs";
import { createHmac } from "node:crypto";
import process from "node:process";

const args = process.argv.slice(2);
const target = args[0];

const secret = process.env.SESSION_SECRET;
if (!secret) {
  console.error(
    "SESSION_SECRET is not set. It is the key that maps an email to its storage id,\n" +
      "so reading the log needs the same value the live site uses.",
  );
  process.exit(1);
}

// Must match userId() in netlify/lib/auth.mjs.
const userId = (email) =>
  createHmac("sha256", secret).update("uid:" + email).digest("hex").slice(0, 32);

const opts = {};
if (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_AUTH_TOKEN) {
  opts.siteID = process.env.NETLIFY_SITE_ID;
  opts.token = process.env.NETLIFY_AUTH_TOKEN;
}

let users, logs;
try {
  users = getStore({ name: "evening-close-users", ...opts });
  logs = getStore({ name: "evening-close-logs", ...opts });
} catch {
  console.error(
    "Cannot reach the blob store from here.\n\n" +
      "For the live site, run `npx netlify login` then `npx netlify link` once,\n" +
      "then run this through the CLI so it picks up the site credentials:\n\n" +
      "  npx netlify dev:exec node tools/read-closes.mjs\n\n" +
      "The store that `netlify dev` creates on your laptop is separate from the\n" +
      "live one and is only reachable from inside `netlify dev`.\n",
  );
  process.exit(1);
}

const { blobs } = await users.list();
if (!blobs.length) {
  console.log("No accounts yet.");
  process.exit(0);
}

if (!target) {
  console.log(`${blobs.length} account(s):\n`);
  for (const { key: email } of blobs) {
    const record = await users.get(email, { type: "json" });
    const log = await logs.get(userId(email), { type: "json" });
    const entries = log && Array.isArray(log.entries) ? log.entries : [];
    const last = entries[0] ? entries[0].createdAt.slice(0, 10) : "never";
    console.log(
      `  ${email.padEnd(34)} ${String(entries.length).padStart(3)} closes   ` +
        `last ${last}   joined ${String(record?.createdAt || "").slice(0, 10)}`,
    );
  }
  console.log(`\nOne account in full:  node tools/read-closes.mjs <email>`);
  process.exit(0);
}

const email = target.trim().toLowerCase();
const log = await logs.get(userId(email), { type: "json" });
const entries = log && Array.isArray(log.entries) ? log.entries : [];

if (!entries.length) {
  console.log(`No closes for ${email}.`);
  process.exit(0);
}

console.log(`${entries.length} close(s) for ${email}\n`);
for (const e of entries) {
  console.log("=".repeat(74));
  console.log(
    `${e.createdAt}   ${e.mentorName}${e.energy ? `   energy ${e.energy}/5` : ""}`,
  );
  console.log("=".repeat(74));
  console.log("\nWHAT THEY WROTE\n");
  console.log(e.text);
  console.log("\nWHAT CAME BACK\n");
  console.log(e.response);
  console.log();
}

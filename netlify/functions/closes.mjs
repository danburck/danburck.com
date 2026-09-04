/** The user's own log of past closes. One JSON blob per account. */

import { currentEmail, userId, logs, json, fail, guarded } from "../lib/auth.mjs";
import { lensFor } from "../lib/coaching.mjs";

const KEEP = 200;

async function read(uid) {
  const log = await logs().get(uid, { type: "json" });
  return log && Array.isArray(log.entries) ? log.entries : [];
}

export default guarded(async (req) => {
  const email = currentEmail(req);
  if (!email) return fail("Sign in first.", 401);
  const uid = userId(email);

  if (req.method === "GET") {
    return json({ entries: await read(uid) }, 200, { "cache-control": "no-store" });
  }

  if (req.method === "POST") {
    let payload;
    try {
      payload = await req.json();
    } catch {
      return fail("Send JSON.");
    }

    const text = String(payload.text || "").trim();
    const response = String(payload.response || "").trim();
    if (!text || !response) return fail("A close needs both the entry and the response.");

    const mentorId = String(payload.mentor || "energyled");
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      text: text.slice(0, 8000),
      response: response.slice(0, 12000),
      mentor: mentorId,
      mentorName: lensFor(mentorId).name,
      energy: Number(payload.energy) || 0,
      createdAt: new Date().toISOString(),
    };

    const entries = [entry, ...(await read(uid))].slice(0, KEEP);
    await logs().setJSON(uid, { entries });
    return json({ entry });
  }

  if (req.method === "DELETE") {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return fail("Which close?");
    const entries = (await read(uid)).filter((e) => e.id !== id);
    await logs().setJSON(uid, { entries });
    return json({ ok: true });
  }

  return fail("Method not allowed.", 405);
});

export const config = { path: "/api/closes" };

/** Sign up, sign in, sign out, and "who am I" for the Evening Close. */

import {
  users,
  normalizeEmail,
  hashPassword,
  verifyPassword,
  makeToken,
  cookieHeader,
  currentEmail,
  json,
  fail,
  guarded,
} from "../lib/auth.mjs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function body(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export default guarded(async (req) => {
  const action = new URL(req.url).pathname.split("/").pop();

  if (action === "session") {
    const email = currentEmail(req);
    return email ? json({ email }) : json({ email: null }, 200);
  }

  if (action === "signout") {
    return json({ ok: true }, 200, { "set-cookie": cookieHeader(null) });
  }

  if (req.method !== "POST") return fail("Use POST.", 405);

  const { email: rawEmail, password, invite } = await body(req);
  const email = normalizeEmail(rawEmail);

  if (!EMAIL_RE.test(email)) return fail("That email address does not look right.");
  if (typeof password !== "string" || password.length < 8) {
    return fail("Use a password of at least 8 characters.");
  }

  const store = users();

  if (action === "signup") {
    const required = process.env.EVENING_CLOSE_INVITE_CODE;
    if (required && String(invite || "").trim() !== required) {
      return fail("That invite code is not right.", 403);
    }
    const existing = await store.get(email, { type: "json" });
    if (existing) {
      return fail("There is already an account on that email. Sign in instead.", 409);
    }
    await store.setJSON(email, {
      password: hashPassword(password),
      createdAt: new Date().toISOString(),
    });
    return json({ email }, 200, { "set-cookie": cookieHeader(makeToken(email)) });
  }

  if (action === "signin") {
    const record = await store.get(email, { type: "json" });
    // Same message either way, so the endpoint does not confirm which emails exist.
    if (!record || !verifyPassword(password, record.password)) {
      return fail("That email and password do not match.", 401);
    }
    return json({ email }, 200, { "set-cookie": cookieHeader(makeToken(email)) });
  }

  return fail("Unknown action.", 404);
});

export const config = {
  path: ["/api/signup", "/api/signin", "/api/signout", "/api/session"],
};

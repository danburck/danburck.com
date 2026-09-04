/** Sign up, confirm, sign in, sign out, and "who am I" for the Evening Close. */

import {
  users,
  normalizeEmail,
  hashPassword,
  verifyPassword,
  makeToken,
  readToken,
  cookieHeader,
  currentEmail,
  json,
  fail,
  guarded,
  CONFIRM,
} from "../lib/auth.mjs";
import { sendConfirmation, mailConfigured, MailNotConfigured } from "../lib/email.mjs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function body(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

/** The confirmation link, on whatever host this request arrived at. */
function confirmLink(req, email) {
  const base = new URL(req.url);
  return `${base.origin}/api/confirm?token=${encodeURIComponent(makeToken(email, CONFIRM))}`;
}

/**
 * Sends the confirmation mail. When no provider is configured this returns the
 * link instead, but ONLY if EVENING_CLOSE_DEV_SHOW_LINK is set, which you would
 * only ever set on your own machine. Without it an unconfigured site refuses to
 * create accounts rather than quietly letting unconfirmed people in.
 */
async function deliver(req, email) {
  const link = confirmLink(req, email);
  if (mailConfigured()) {
    await sendConfirmation(email, link);
    return { sent: true };
  }
  if (process.env.EVENING_CLOSE_DEV_SHOW_LINK) {
    console.log("confirmation link for", email, link);
    return { sent: false, devLink: link };
  }
  throw new MailNotConfigured();
}

export default guarded(async (req) => {
  const action = new URL(req.url).pathname.split("/").pop();
  const store = users();

  /* ---------- who am I ---------- */

  if (action === "session") {
    const email = currentEmail(req);
    return email ? json({ email }) : json({ email: null });
  }

  if (action === "signout") {
    return json({ ok: true }, 200, { "set-cookie": cookieHeader(null) });
  }

  /* ---------- confirming, from the emailed link ---------- */

  if (action === "confirm") {
    const token = new URL(req.url).searchParams.get("token");
    const email = readToken(token, CONFIRM);
    const back = (q) =>
      new Response(null, { status: 302, headers: { location: "/evening-close/?" + q } });

    if (!email) return back("confirm=invalid");

    const record = await store.get(email, { type: "json" });
    if (!record) return back("confirm=invalid");

    if (!record.confirmed) {
      await store.setJSON(email, {
        ...record,
        confirmed: true,
        confirmedAt: new Date().toISOString(),
      });
    }
    // 302 so the token leaves the address bar and the browser history entry.
    return new Response(null, {
      status: 302,
      headers: { location: "/evening-close/?confirm=ok", "set-cookie": cookieHeader(makeToken(email)) },
    });
  }

  if (req.method !== "POST") return fail("Use POST.", 405);

  const { email: rawEmail, password, invite } = await body(req);
  const email = normalizeEmail(rawEmail);

  /* ---------- resending the confirmation ---------- */

  if (action === "resend") {
    if (!EMAIL_RE.test(email)) return fail("That email address does not look right.");
    const record = await store.get(email, { type: "json" });
    // Never reveals whether the account exists or is already confirmed.
    if (record && !record.confirmed) {
      try {
        const out = await deliver(req, email);
        return json({ ok: true, ...out });
      } catch (e) {
        if (e instanceof MailNotConfigured) {
          return fail(
            "This site cannot send email yet. Set RESEND_API_KEY in the Netlify environment variables.",
            500,
          );
        }
        console.error("resend failed", e);
        return fail("The email would not send. Try again in a minute.", 502);
      }
    }
    return json({ ok: true });
  }

  if (!EMAIL_RE.test(email)) return fail("That email address does not look right.");
  if (typeof password !== "string" || password.length < 8) {
    return fail("Use a password of at least 8 characters.");
  }

  /* ---------- signing up ---------- */

  if (action === "signup") {
    const required = process.env.EVENING_CLOSE_INVITE_CODE;
    if (required && String(invite || "").trim() !== required) {
      // 400 not 403: Netlify treats a 403 from a function as "not handled" and
      // falls through to static file resolution, which turns it into a 404.
      return fail("That invite code is not right.", 400);
    }

    const existing = await store.get(email, { type: "json" });
    if (existing) {
      return fail("There is already an account on that email. Sign in instead.", 409);
    }

    let out;
    try {
      // Send before writing the account, so a mail failure does not leave an
      // account nobody can ever confirm or sign in to.
      out = await deliver(req, email);
    } catch (e) {
      if (e instanceof MailNotConfigured) {
        return fail(
          "This site cannot send email yet, so accounts cannot be confirmed. Set RESEND_API_KEY in the Netlify environment variables.",
          500,
        );
      }
      console.error("confirmation send failed", e);
      return fail("We could not send the confirmation email. Check the address and try again.", 502);
    }

    await store.setJSON(email, {
      password: hashPassword(password),
      confirmed: false,
      createdAt: new Date().toISOString(),
    });

    // No cookie. Confirming the email is what signs you in.
    return json({ email, pending: true, ...out });
  }

  /* ---------- signing in ---------- */

  if (action === "signin") {
    const record = await store.get(email, { type: "json" });
    // Same message either way, so the endpoint does not confirm which emails exist.
    if (!record || !verifyPassword(password, record.password)) {
      return fail("That email and password do not match.", 401);
    }
    if (!record.confirmed) {
      // 401 rather than the semantically nicer 403, for the same reason.
      return fail("Confirm your email first. Check your inbox for the link.", 401);
    }
    return json({ email }, 200, { "set-cookie": cookieHeader(makeToken(email)) });
  }

  return fail("Unknown action.", 404);
});

export const config = {
  path: [
    "/api/signup",
    "/api/signin",
    "/api/signout",
    "/api/session",
    "/api/confirm",
    "/api/resend",
  ],
};

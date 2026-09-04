/**
 * Shared auth and storage for the Evening Close.
 *
 * Deliberately dependency free beyond Netlify Blobs: passwords are hashed with
 * scrypt from node:crypto, and the session is a short signed token in an
 * HttpOnly cookie. No auth library, no external identity service.
 */

import { getStore } from "@netlify/blobs";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHmac,
} from "node:crypto";

export const COOKIE = "ec_session";
const SESSION_DAYS = 30;

/* ---------------- stores ---------------- */

export function users() {
  return getStore("evening-close-users");
}
export function logs() {
  return getStore("evening-close-logs");
}

export function normalizeEmail(raw) {
  return String(raw || "").trim().toLowerCase();
}

/** A stable, opaque id for an email. Keeps the address out of blob keys. */
export function userId(email) {
  return createHmac("sha256", secret()).update("uid:" + email).digest("hex").slice(0, 32);
}

/* ---------------- passwords ---------------- */

export function hashPassword(password) {
  const salt = randomBytes(16);
  const key = scryptSync(String(password), salt, 64);
  return "scrypt$" + salt.toString("hex") + "$" + key.toString("hex");
}

export function verifyPassword(password, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  let actual;
  try {
    actual = scryptSync(String(password), salt, expected.length);
  } catch {
    return false;
  }
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/* ---------------- sessions ---------------- */

export class ConfigError extends Error {}

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new ConfigError(
      "SESSION_SECRET is not set on this site. Add it in Netlify under Site configuration, Environment variables.",
    );
  }
  return s;
}

const b64url = (buf) => Buffer.from(buf).toString("base64url");

export function makeToken(email) {
  const payload = b64url(
    JSON.stringify({ e: email, x: Date.now() + SESSION_DAYS * 864e5 }),
  );
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return payload + "." + sig;
}

export function readToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 2) return null;
  const expected = createHmac("sha256", secret())
    .update(parts[0])
    .digest("base64url");
  const a = Buffer.from(parts[1]);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!payload || typeof payload.e !== "string" || !(payload.x > Date.now())) {
    return null;
  }
  return payload.e;
}

export function cookieHeader(token) {
  const base = `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax`;
  return token
    ? `${base}; Max-Age=${SESSION_DAYS * 86400}`
    : `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function readCookie(req, name) {
  const raw = req.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > -1 && part.slice(0, i).trim() === name) {
      return part.slice(i + 1).trim();
    }
  }
  return null;
}

/** The signed-in email, or null. */
export function currentEmail(req) {
  return readToken(readCookie(req, COOKIE));
}

/* ---------------- responses ---------------- */

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

export function fail(error, status = 400, headers = {}) {
  return json({ error }, status, headers);
}

/** Wraps a handler so a missing SESSION_SECRET reports itself instead of a blank 500. */
export function guarded(handler) {
  return async (req, context) => {
    try {
      return await handler(req, context);
    } catch (e) {
      if (e instanceof ConfigError) return fail(e.message, 500);
      console.error(e);
      return fail("Something went wrong on our side. Try again.", 500);
    }
  };
}

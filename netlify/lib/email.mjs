/**
 * Sending the confirmation email.
 *
 * Resend, over plain fetch. One POST does not justify a dependency, and this
 * is the only mail the app ever sends. To swap providers, replace send()
 * below; nothing else in the codebase knows what a mail provider is.
 */

const ENDPOINT = "https://api.resend.com/emails";

export class MailNotConfigured extends Error {}

export function mailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

/** Where confirmation mail comes from. Verify the domain in Resend before
 *  sharing the link, or delivery to anyone but you will fail. */
function from() {
  return process.env.EVENING_CLOSE_FROM_EMAIL || "Energy Led <onboarding@resend.dev>";
}

function body(link) {
  const text = [
    "Confirm your email to open The Evening Close.",
    "",
    link,
    "",
    "The link is good for 24 hours. If you did not ask for this, ignore it and nothing happens.",
  ].join("\n");

  const html = `<!doctype html>
<div style="background:#0A0A0B;color:#FAF9F6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;padding:40px 24px">
  <div style="max-width:460px;margin:0 auto">
    <p style="font-size:12px;letter-spacing:.28em;text-transform:uppercase;color:#8C8C82;margin:0 0 28px">
      <span style="color:#FFFB29">&#9679;</span>&nbsp; Energy Led
    </p>
    <h1 style="font-family:Georgia,serif;font-weight:400;font-size:28px;line-height:1.15;margin:0 0 16px">
      Confirm your email to open The Evening Close.
    </h1>
    <p style="font-size:15px;line-height:1.6;color:#C6C5BE;margin:0 0 28px">
      One click and you are in. The link is good for 24 hours.
    </p>
    <a href="${link}" style="display:inline-block;background:#FFFB29;color:#0A0A0B;text-decoration:none;
      font-size:15px;font-weight:500;padding:14px 22px;border-radius:6px">Confirm and open &rarr;</a>
    <p style="font-size:12px;line-height:1.6;color:#5E5E58;margin:32px 0 0">
      If you did not ask for this, ignore it and nothing happens.
    </p>
  </div>
</div>`;

  return { text, html };
}

/**
 * Sends the confirmation email. Throws MailNotConfigured when there is no
 * provider key, so the caller can decide rather than failing silently.
 */
export async function sendConfirmation(to, link) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new MailNotConfigured("RESEND_API_KEY is not set.");

  const { text, html } = body(link);
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: from(),
      to: [to],
      subject: "Confirm your email for The Evening Close",
      text,
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend rejected the send (${res.status}): ${detail.slice(0, 300)}`);
  }
  return true;
}

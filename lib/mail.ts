import nodemailer from "nodemailer";
import { Resend } from "resend";
import { HERO, REPS } from "./site";

export type MailPayload = {
  citizenName: string;
  citizenEmail: string;
  city: string;
  extraTo?: string;
  subject: string;
  body: string;
};

export type MailResult = {
  ok: boolean;
  demo: boolean;
  provider: "resend" | "smtp" | "none";
  to: string[];
  id?: string;
  error?: string;
};

function constructedTo() {
  return REPS.map((r) => r.email);
}

export function recipients(extra?: string) {
  const set = new Set<string>();
  const demo = process.env.DEMO_MAIL_TO?.trim();
  if (demo) set.add(demo);
  for (const e of constructedTo()) set.add(e);
  if (process.env.ALLOW_CUSTOM_RECIPIENT === "true" && extra?.includes("@")) {
    set.add(extra.trim());
  }
  return [...set];
}

export async function sendCivicMail(payload: MailPayload): Promise<MailResult> {
  const to = recipients(payload.extraTo);
  const text = [
    payload.body,
    "",
    "—",
    `From: ${payload.citizenName} <${payload.citizenEmail}>`,
    `City: ${payload.city || "unspecified"}`,
    `Site: ${HERO.name} · ${HERO.address} (TEMPLATE quantities)`,
    "This is opt-in civic mail from a resident, not a solicitation.",
  ].join("\n");

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.RESEND_FROM || "Compute Works <works@example.com>";
    const { data, error } = await resend.emails.send({
      from,
      to,
      replyTo: payload.citizenEmail,
      subject: payload.subject,
      text,
    });
    if (error) {
      return { ok: false, demo: false, provider: "resend", to, error: error.message };
    }
    return { ok: true, demo: false, provider: "resend", to, id: data?.id };
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: to.join(", "),
      replyTo: payload.citizenEmail,
      subject: payload.subject,
      text,
    });
    return { ok: true, demo: false, provider: "smtp", to, id: info.messageId };
  }

  return {
    ok: false,
    demo: true,
    provider: "none",
    to,
    error:
      "No RESEND_API_KEY or SMTP_* configured. Letter recorded in the response for the demo desk. Set env to actually send.",
  };
}

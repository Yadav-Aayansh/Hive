import type { Mail } from "./mailer";

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const INK = "#F7F5F3";
const BODY = "#B3ACA5";
const FAINT = "#8A837C";
const PAGE = "#12100E";
const CARD = "#1C1917";
const LINE = "#34302C";
const BRAND = "#E8AC3A";
const ON_BRAND = "#3A2A15";

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char] ?? char,
  );
}

function shell(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${PAGE};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${PAGE};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="width:520px;max-width:100%;background-color:${CARD};border:1px solid ${LINE};border-radius:18px;">
<tr><td style="padding:28px 32px 0 32px;">
<span style="font-family:${FONT};font-size:13px;font-weight:700;letter-spacing:3px;color:${BRAND};">&#11042; HIVE</span>
</td></tr>
${body}
</table>
</td></tr>
</table>
</body>
</html>`;
}

function heading(text: string): string {
  return `<tr><td style="padding:22px 32px 0 32px;">
<h1 style="margin:0;font-family:${FONT};font-size:22px;line-height:1.3;font-weight:650;letter-spacing:-0.4px;color:${INK};">${escapeHtml(text)}</h1>
</td></tr>`;
}

function paragraph(text: string): string {
  return `<tr><td style="padding:10px 32px 0 32px;">
<p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.65;color:${BODY};">${escapeHtml(text)}</p>
</td></tr>`;
}

function action(label: string, href: string): string {
  return `<tr><td style="padding:24px 32px 0 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td bgcolor="${BRAND}" style="border-radius:26px;">
<a href="${href}" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:15px;font-weight:600;line-height:1;color:${ON_BRAND};text-decoration:none;border-radius:26px;">${escapeHtml(label)}</a>
</td></tr></table>
</td></tr>`;
}

function fallback(href: string): string {
  return `<tr><td style="padding:18px 32px 0 32px;">
<p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.6;color:${FAINT};">Or paste this into your browser<br>
<a href="${href}" style="color:${BRAND};text-decoration:none;word-break:break-all;">${href}</a></p>
</td></tr>`;
}

function footnote(text: string): string {
  return `<tr><td style="padding:24px 32px 28px 32px;">
<div style="border-top:1px solid ${LINE};padding-top:16px;">
<p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.6;color:${FAINT};">${escapeHtml(text)}</p>
</div>
</td></tr>`;
}

export function passwordResetMail(
  fullName: string,
  link: string,
): Omit<Mail, "to"> {
  const intro = `Hi ${fullName}, use the button below to set a new password. The link works once and expires in 30 minutes.`;
  const note = "Not you? Ignore this email, nothing has changed.";

  return {
    subject: "Reset your Hive password",
    text: `Reset your password\n\n${intro}\n\n${link}\n\n${note}\n\nHive`,
    html: shell(
      "Reset your Hive password",
      heading("Reset your password") +
        paragraph(intro) +
        action("Set a new password", link) +
        fallback(link) +
        footnote(note),
    ),
  };
}

import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import sharp from "sharp";
import SVGtoPDF from "svg-to-pdfkit";
import type { ResultType } from "../entity/EventRegistration";

const WIDTH = 841.89;
const HEIGHT = 595.28;
const CENTER = WIDTH / 2;

const BASE_14 = new Set([
  "Helvetica",
  "Helvetica-Bold",
  "Times-Roman",
  "Times-Bold",
  "Times-Italic",
]);

interface Variant {
  title: string;
  band: string;
  lead: string;
  ink: string;
  accent: string;
  wash: string;
}

const VARIANTS: Record<ResultType, Variant> = {
  winner: {
    title: "Certificate of Achievement",
    band: "FIRST PLACE",
    lead: "for securing first place at",
    ink: "#8A6A12",
    accent: "#C79A2E",
    wash: "#FBF4E2",
  },
  runner_up: {
    title: "Certificate of Achievement",
    band: "RUNNER-UP",
    lead: "for securing runner-up at",
    ink: "#4A5568",
    accent: "#8A97A8",
    wash: "#F1F4F8",
  },
  participant: {
    title: "Certificate of Participation",
    band: "PARTICIPANT",
    lead: "for participating in",
    ink: "#0F5F58",
    accent: "#199A8E",
    wash: "#E7F4F2",
  },
};

export interface CertificateRenderData {
  serial: string;
  result: ResultType;
  issuedAt: Date;
  recipientName: string;
  rollNo: string | null;
  branch: string | null;
  eventTitle: string;
  eventDate: Date | null;
  venue: string | null;
  clubName: string;
  collegeName: string;
  collegeDomain: string;
  logo: Buffer | null;
  verifyUrl: string;
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function escapeXml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[char] ?? char,
  );
}

function fontCallback(family: string): string {
  const name = family.replace(/["']/g, "").split(",")[0].trim();

  return BASE_14.has(name) ? name : "Helvetica";
}

function fitSize(
  probe: PDFKit.PDFDocument,
  text: string,
  font: string,
  maxWidth: number,
  start: number,
  spacing = 0,
  min = 9,
): number {
  let size = start;

  while (size > min) {
    const width =
      probe.font(font).fontSize(size).widthOfString(text) +
      Math.max(text.length - 1, 0) * spacing;

    if (width <= maxWidth) {
      break;
    }

    size -= 0.25;
  }

  return size;
}

function centered(
  text: string,
  y: number,
  font: string,
  size: number,
  spacing: number,
  fill: string,
): string {
  return `<text x="${CENTER}" y="${y}" font-family="${font}" font-size="${size}" letter-spacing="${spacing}" fill="${fill}" text-anchor="middle">${escapeXml(text)}</text>`;
}

function hexagon(cx: number, cy: number, radius: number, ratio: number) {
  return Array.from({ length: 6 }, (_unused, index) => {
    const angle = (Math.PI / 180) * (60 * index - 90);

    return `${(cx + radius * ratio * Math.cos(angle)).toFixed(2)},${(cy + radius * ratio * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
}

function emblem(cx: number, cy: number, radius: number, variant: Variant) {
  return `<polygon points="${hexagon(cx, cy, radius, 1)}" fill="${variant.accent}" fill-opacity="0.14" stroke="${variant.accent}" stroke-width="1.4"/><polygon points="${hexagon(cx, cy, radius, 0.52)}" fill="${variant.ink}" fill-opacity="0.85"/>`;
}

async function qrPath(text: string, size: number): Promise<string> {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const modules = qr.modules.size;
  const unit = size / modules;
  let path = "";

  for (let row = 0; row < modules; row += 1) {
    for (let column = 0; column < modules; column += 1) {
      if (qr.modules.data[row * modules + column]) {
        path += `M${(column * unit).toFixed(3)} ${(row * unit).toFixed(3)}h${unit.toFixed(3)}v${unit.toFixed(3)}h-${unit.toFixed(3)}z`;
      }
    }
  }

  return path;
}

async function logoTag(logo: Buffer): Promise<string> {
  const png = await sharp(logo)
    .resize({ width: 104, height: 104, fit: "inside" })
    .png()
    .toBuffer();

  return `<image x="${CENTER - 26}" y="56" width="52" height="52" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${png.toString("base64")}"/>`;
}

async function buildSvg(
  data: CertificateRenderData,
  probe: PDFKit.PDFDocument,
): Promise<string> {
  const variant = VARIANTS[data.result];
  const heading = variant.title.toUpperCase();

  const headingSize = fitSize(probe, heading, "Times-Bold", 560, 27, 3);
  const nameSize = fitSize(probe, data.recipientName, "Times-Bold", 600, 42);
  const eventSize = fitSize(probe, data.eventTitle, "Times-Bold", 620, 21, 0.6);

  const qrSize = 68;
  const qrX = WIDTH - 62 - qrSize;
  const qrY = 452;

  const identity = [data.rollNo, data.branch].filter(Boolean).join("  ·  ");
  const occasion = [
    data.eventDate ? DATE_FORMAT.format(data.eventDate) : null,
    data.venue,
  ]
    .filter(Boolean)
    .join("  ·  ");

  const mark = data.logo
    ? await logoTag(data.logo)
    : emblem(CENTER, 82, 26, variant);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="#FFFFFF"/>
  <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="${variant.wash}" fill-opacity="0.55"/>
  <rect x="26" y="26" width="${WIDTH - 52}" height="${HEIGHT - 52}" fill="#FFFFFF" stroke="${variant.accent}" stroke-width="2.2"/>
  <rect x="33" y="33" width="${WIDTH - 66}" height="${HEIGHT - 66}" fill="none" stroke="${variant.accent}" stroke-width="0.6" stroke-opacity="0.7"/>

  <g stroke="${variant.accent}" stroke-width="1" stroke-opacity="0.5" fill="none">
    <path d="M40 62 v-22 h22"/><path d="M${WIDTH - 40} 62 v-22 h-22"/>
    <path d="M40 ${HEIGHT - 62} v22 h22"/><path d="M${WIDTH - 40} ${HEIGHT - 62} v22 h-22"/>
  </g>

  <g opacity="0.03">${emblem(CENTER, 330, 150, variant)}</g>

  ${mark}

  ${centered(data.collegeName.toUpperCase(), 133, "Helvetica-Bold", 13, 3.4, "#1A202C")}
  ${centered(data.collegeDomain, 148, "Helvetica", 8, 1.6, "#7A8899")}
  <line x1="${CENTER - 90}" y1="160" x2="${CENTER + 90}" y2="160" stroke="${variant.accent}" stroke-width="0.9"/>

  ${centered(heading, 199, "Times-Bold", headingSize, 3, variant.ink)}

  <rect x="${CENTER - 78}" y="214" width="156" height="21" rx="10.5" fill="${variant.ink}"/>
  ${centered(variant.band, 228.5, "Helvetica-Bold", 9.5, 2.4, "#FFFFFF")}

  ${centered("This is to certify that", 274, "Times-Italic", 12, 0.4, "#4A5568")}
  ${centered(data.recipientName, 318, "Times-Bold", nameSize, 0, "#1A202C")}
  <line x1="${CENTER - 200}" y1="330" x2="${CENTER + 200}" y2="330" stroke="${variant.accent}" stroke-width="0.7" stroke-opacity="0.8"/>
  ${identity ? centered(identity, 346, "Helvetica", 8.5, 1, "#7A8899") : ""}

  ${centered(variant.lead, 378, "Times-Italic", 12, 0.4, "#4A5568")}
  ${centered(data.eventTitle, 404, "Times-Bold", eventSize, 0.6, "#1A202C")}
  ${centered(`organised by ${data.clubName}`, 424, "Helvetica", 10, 0.5, "#2D3748")}
  ${occasion ? centered(occasion, 440, "Helvetica", 8.5, 0.8, "#7A8899") : ""}

  <text x="62" y="486" font-family="Helvetica-Bold" font-size="7.5" letter-spacing="1.6" fill="#7A8899">SERIAL</text>
  <text x="62" y="500" font-family="Helvetica" font-size="10" fill="#1A202C">${escapeXml(data.serial)}</text>
  <text x="62" y="516" font-family="Helvetica-Bold" font-size="7.5" letter-spacing="1.6" fill="#7A8899">ISSUED</text>
  <text x="62" y="530" font-family="Helvetica" font-size="10" fill="#1A202C">${escapeXml(DATE_FORMAT.format(data.issuedAt))}</text>

  <line x1="${CENTER - 82}" y1="508" x2="${CENTER + 82}" y2="508" stroke="#1A202C" stroke-width="0.7"/>
  ${centered("Authorised Signatory", 522, "Helvetica", 8.5, 1.2, "#4A5568")}
  ${centered(data.clubName, 534, "Helvetica", 7.5, 0.8, "#7A8899")}

  <g transform="translate(${qrX} ${qrY})"><path d="${await qrPath(data.verifyUrl, qrSize)}" fill="#1A202C"/></g>
  <text x="${qrX + qrSize / 2}" y="${qrY + qrSize + 13}" font-family="Helvetica" font-size="7.5" letter-spacing="0.8" fill="#7A8899" text-anchor="middle">Scan to verify</text>
</svg>`;
}

export async function renderCertificate(
  data: CertificateRenderData,
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: [WIDTH, HEIGHT],
    margin: 0,
    info: {
      Title: `${data.recipientName} — ${data.eventTitle}`,
      Author: data.collegeName,
      Subject: `Certificate ${data.serial}`,
    },
  });

  const chunks: Buffer[] = [];

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  SVGtoPDF(doc, await buildSvg(data, doc), 0, 0, {
    assumePt: true,
    fontCallback,
  });
  doc.end();

  return done;
}

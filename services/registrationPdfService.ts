import type { Content, TableCell, TDocumentDefinitions } from "pdfmake/interfaces";
import { DEFAULT_EVENT_TIME_ZONE } from "../utils/eventDateTime";

export type RegistrationPrintRow = {
  playerId?: string | null;
  name: string;
  email?: string | null;
  birthYear?: number | null;
  registeredAt: string;
  checkedIn?: boolean;
};

export type RegistrationPrintInput = {
  eventName: string;
  eventDate: string;
  slots: number;
  rows: RegistrationPrintRow[];
  generatedAt?: Date;
};

const dateTime = (value: string | Date) => new Intl.DateTimeFormat("de-DE", {
  timeZone: DEFAULT_EVENT_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
}).format(new Date(value));

// pdfmake wraps at spaces. Explicit breaks keep a long email or single surname
// inside the fixed A4 name column without truncating participant data.
const wrapLongTokens = (value: string, width = 26) => value
  .trim()
  .replace(new RegExp(`\\S{${width + 1},}`, "gu"), (token) => token.match(new RegExp(`.{1,${width}}`, "gu"))?.join("\n") || token);

const checkbox = (checkedIn: boolean): Content => ({
  canvas: [
    { type: "rect", x: 0, y: 0, w: 10, h: 10, lineColor: "#334155", lineWidth: 0.9 },
    ...(checkedIn ? [
      { type: "line" as const, x1: 2, y1: 5, x2: 4.3, y2: 7.5, lineColor: "#0f172a", lineWidth: 1.5 },
      { type: "line" as const, x1: 4.3, y1: 7.5, x2: 8.5, y2: 2, lineColor: "#0f172a", lineWidth: 1.5 },
    ] : []),
  ],
  margin: [8, 2, 0, 0],
});

const summaryCell = (label: string, value: number): TableCell => ({
  stack: [
    { text: String(value), bold: true, fontSize: 15, color: "#111827" },
    { text: label, fontSize: 8, color: "#475569", margin: [0, 2, 0, 0] },
  ],
  margin: [8, 7, 8, 7],
});

export const createRegistrationPrintDocument = (input: RegistrationPrintInput): TDocumentDefinitions => {
  const generatedAt = input.generatedAt || new Date();
  const registered = input.rows.length;
  const slots = Math.max(0, input.slots);
  const free = Math.max(0, slots - registered);
  const body: TableCell[][] = [[
    { text: "Reg Nr", style: "tableHead" },
    { text: "Check", style: "tableHead", alignment: "center" },
    { text: "Spieler-ID", style: "tableHead" },
    { text: "Name / E-Mail", style: "tableHead" },
    { text: "Geburtsjahr", style: "tableHead" },
    { text: "Registriert am", style: "tableHead" },
  ]];

  input.rows.forEach((row, index) => {
    body.push([
      { text: String(index + 1).padStart(3, "0"), alignment: "center", color: "#334155" },
      checkbox(!!row.checkedIn),
      { text: wrapLongTokens(row.playerId || "-", 14) },
      {
        stack: [
          { text: wrapLongTokens(row.name || "-"), bold: true, color: "#111827" },
          ...(row.email ? [{ text: wrapLongTokens(row.email), fontSize: 7.5, color: "#475569", margin: [0, 2, 0, 0] as [number, number, number, number] }] : []),
        ],
      },
      { text: row.birthYear ? String(row.birthYear) : "-", alignment: "center" },
      { text: dateTime(row.registeredAt), fontSize: 8 },
    ]);
  });

  return {
    pageSize: "A4",
    pageOrientation: "portrait",
    pageMargins: [34, 35, 34, 40],
    info: { title: `${input.eventName} - Registrierungen`, subject: "Teilnehmerliste zum Abhaken" },
    defaultStyle: { font: "Roboto", fontSize: 9, color: "#1f2937" },
    styles: {
      kicker: { fontSize: 8, bold: true, color: "#475569" },
      eventName: { fontSize: 16, bold: true, color: "#111827", lineHeight: 1.15 },
      tableHead: { fontSize: 8, bold: true, color: "#111827" },
    },
    content: [
      { text: "REGISTRIERUNGSLISTE", style: "kicker", margin: [0, 0, 0, 5] },
      { text: wrapLongTokens(input.eventName, 45), style: "eventName", margin: [0, 0, 0, 5] },
      { text: `Eventdatum: ${dateTime(input.eventDate)}`, fontSize: 9, margin: [0, 0, 0, 15] },
      {
        table: {
          widths: ["*", "*", "*"],
          body: [[
            summaryCell("Anzahl Slots", slots),
            summaryCell("Registrierte Spieler", registered),
            summaryCell("Freie Plätze", free),
          ]],
        },
        layout: {
          hLineColor: () => "#cbd5e1", vLineColor: () => "#cbd5e1",
          hLineWidth: () => 0.6, vLineWidth: () => 0.6,
          paddingLeft: () => 0, paddingRight: () => 0,
          paddingTop: () => 0, paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 18],
      },
      {
        table: {
          headerRows: 1,
          keepWithHeaderRows: 1,
          widths: [38, 36, 78, "*", 68, 94],
          body,
        },
        layout: {
          fillColor: (rowIndex: number) => rowIndex === 0 ? "#e9eef2" : rowIndex % 2 === 0 ? "#f8fafc" : null,
          hLineColor: () => "#cbd5e1", vLineColor: () => "#e2e8f0",
          hLineWidth: (index: number) => index === 0 ? 0.8 : 0.4,
          vLineWidth: () => 0.35,
          paddingLeft: () => 5, paddingRight: () => 5,
          paddingTop: () => 6, paddingBottom: () => 6,
        },
      },
    ],
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: `Stand: ${dateTime(generatedAt)}`, alignment: "left" },
        { text: `Seite ${currentPage} / ${pageCount}`, alignment: "right" },
      ],
      margin: [34, 8, 34, 0],
      fontSize: 7.5,
      color: "#64748b",
    }),
  };
};

export const downloadRegistrationPrintPdf = async (input: RegistrationPrintInput) => {
  const [pdfMakeModule, fontModule] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);
  const pdfMake = pdfMakeModule.default || pdfMakeModule;
  const fonts = fontModule.default || fontModule;
  const safeName = input.eventName.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 60) || "event";
  pdfMake.createPdf(createRegistrationPrintDocument(input), undefined, undefined, fonts.vfs || fonts)
    .download(`${safeName}-registrierungen.pdf`);
};

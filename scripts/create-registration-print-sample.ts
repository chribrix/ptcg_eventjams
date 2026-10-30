import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createRegistrationPrintDocument, type RegistrationPrintRow } from "../services/registrationPdfService";

const names = [
  "Alexandra Beispielmann",
  "Max Mustermann",
  "Samira Musterfeld",
  "Jan-Christopher Testspieler mit einem langen Nachnamen",
  "Robin Beispiel",
  "Kim Testperson",
];

const rows: RegistrationPrintRow[] = Array.from({ length: 36 }, (_, index) => ({
  playerId: String(6000000 + index),
  name: names[index % names.length]!,
  email: index === 3
    ? "jan-christopher.testspieler-mit-langer-emailadresse@example-organisation.de"
    : `testspieler${index + 1}@example.org`,
  birthYear: 1990 + index % 20,
  registeredAt: new Date(Date.UTC(2026, 9, 20 + index % 8, 10, index % 60)).toISOString(),
  checkedIn: index < 3,
}));

const document = createRegistrationPrintDocument({
  eventName: "Crows and Owls Prerelease (Delta-Herrschaft) - Mustertermin",
  eventDate: "2026-10-30T14:00:00.000Z",
  slots: 48,
  rows,
  generatedAt: new Date("2026-10-30T15:00:00.000Z"),
});

const pdfMakeModule = await import("pdfmake/build/pdfmake");
const fontModule = await import("pdfmake/build/vfs_fonts");
const pdfMake = pdfMakeModule.default || pdfMakeModule;
const fonts = fontModule.default || fontModule;
const output = resolve("output/pdf/registrierungen-a4-beispiel.pdf");
await mkdir(resolve("output/pdf"), { recursive: true });
const buffer = await new Promise<Buffer>((resolveBuffer) => {
  pdfMake.createPdf(document, undefined, undefined, fonts.vfs || fonts).getBuffer(resolveBuffer);
});
await writeFile(output, buffer);
process.stdout.write(`${output}\n`);

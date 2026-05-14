import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const ROOT = process.cwd();

const INCLUDED_DIRS = [
  "assets",
  "components",
  "composables",
  "layouts",
  "pages",
  "server",
  "tests",
  "utils",
];

const INCLUDED_EXTENSIONS = new Set([
  ".css",
  ".js",
  ".json",
  ".mjs",
  ".ts",
  ".vue",
]);

const IGNORED_FILES = new Set([
  "material-theme.json",
  "pages/events/register/[id].vue.backup",
  "tests/unit/customEventOverrides.test.ts",
  "tests/unit/eventDisplay.test.ts",
  "utils/eventColors.ts",
  "utils/eventDisplay.ts",
]);

const IGNORED_DIR_NAMES = new Set([
  ".git",
  ".nuxt",
  "coverage",
  "dist",
  "node_modules",
]);

const RAW_COLOR_PATTERN =
  /#[0-9A-Fa-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g;

const TAILWIND_COLOR_PATTERN =
  /\b(?:bg|text|border|ring|from|to|via|placeholder|decoration|caret|accent)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950)\b|\b(?:bg|text|border|ring|from|to|via)-white\b|\b(?:text|bg|border)-black\b|(?:white|black)\/[0-9]{1,3}\b/g;

const EVENT_COLOR_ALLOWLIST = [
  /event-type-badge/,
  /type-league_cup/,
  /type-league_challenge/,
  /type-local_tournament/,
  /type-store_tournament/,
  /type-premier_challenge/,
  /type-special_event/,
  /type-custom/,
  /type-prerelease/,
  /type-pre_release/,
  /type-midseason_showdown/,
  /type-regional_championships/,
  /game-pokemon/,
  /game-riftbound/,
  /game-generic/,
  /format-standard/,
  /format-expanded/,
  /format-unlimited/,
  /\.host\b/,
];

function stripVarExpressions(line) {
  return line.replace(/var\([^)]*\)/g, "var()");
}

function walk(dirPath) {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (IGNORED_DIR_NAMES.has(entry.name)) {
      continue;
    }

    const absolutePath = join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(absolutePath));
      continue;
    }

    const relativePath = relative(ROOT, absolutePath);

    if (!INCLUDED_EXTENSIONS.has(extname(entry.name))) {
      continue;
    }

    if (IGNORED_FILES.has(relativePath)) {
      continue;
    }

    files.push(relativePath);
  }

  return files;
}

function isEventColorLine(filePath, line) {
  if (filePath !== "assets/css/tailwind.css") {
    return false;
  }

  return EVENT_COLOR_ALLOWLIST.some((pattern) => pattern.test(line));
}

function collectFindings(filePath) {
  const absolutePath = join(ROOT, filePath);
  const content = readFileSync(absolutePath, "utf8");
  const lines = content.split("\n");
  const findings = [];

  lines.forEach((line, index) => {
    if (isEventColorLine(filePath, line)) {
      return;
    }

    if (/^\s*--(?:app|admin|event)-/.test(line)) {
      return;
    }

    const sanitizedLine = stripVarExpressions(line);
    const rawMatches = [...sanitizedLine.matchAll(RAW_COLOR_PATTERN)];
    const tailwindMatches = [...line.matchAll(TAILWIND_COLOR_PATTERN)];

    for (const match of rawMatches) {
      findings.push({
        filePath,
        lineNumber: index + 1,
        token: match[0],
        type: "raw",
      });
    }

    for (const match of tailwindMatches) {
      findings.push({
        filePath,
        lineNumber: index + 1,
        token: match[0],
        type: "tailwind",
      });
    }
  });

  return findings;
}

function formatTopFiles(findings) {
  const counts = new Map();

  for (const finding of findings) {
    counts.set(finding.filePath, (counts.get(finding.filePath) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([filePath, count]) => `${String(count).padStart(4, " ")}  ${filePath}`);
}

function main() {
  const files = INCLUDED_DIRS.flatMap((dir) => walk(join(ROOT, dir)));
  const findings = files.flatMap((filePath) => collectFindings(filePath));

  if (findings.length === 0) {
    console.log("No non-centralized color definitions found.");
    return;
  }

  const rawCount = findings.filter((finding) => finding.type === "raw").length;
  const tailwindCount = findings.length - rawCount;

  console.log(
    `Found ${findings.length} non-centralized color references (${rawCount} raw, ${tailwindCount} Tailwind utility references).`,
  );
  console.log("");
  console.log("Top files:");
  console.log(formatTopFiles(findings).join("\n"));
  console.log("");
  console.log("First 80 findings:");

  for (const finding of findings.slice(0, 80)) {
    console.log(
      `${finding.filePath}:${finding.lineNumber} [${finding.type}] ${finding.token}`,
    );
  }

  process.exitCode = 1;
}

main();

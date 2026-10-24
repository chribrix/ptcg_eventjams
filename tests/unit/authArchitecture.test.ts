import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const serverRoot = join(process.cwd(), "server");
const authServicePath = join(serverRoot, "services", "auth", "authService.ts");

const collectTypeScriptFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return collectTypeScriptFiles(path);
      return entry.isFile() && path.endsWith(".ts") ? [path] : [];
    }),
  );
  return nested.flat();
};

describe("server auth architecture", () => {
  it("keeps direct Supabase user resolution inside the auth service boundary", async () => {
    const files = await collectTypeScriptFiles(serverRoot);
    const violations: string[] = [];

    for (const file of files) {
      if (file === authServicePath) continue;
      const source = await readFile(file, "utf8");
      if (
        source.includes('from "#supabase/server"') ||
        source.includes("from '#supabase/server'") ||
        source.includes('import { getServerSupabaseUserSafely') ||
        source.includes("auth.getUser(accessToken)")
      ) {
        violations.push(file.replace(`${process.cwd()}/`, ""));
      }
    }

    expect(violations).toEqual([]);
  });
});

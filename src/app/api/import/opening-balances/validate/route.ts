import { handler, parseBody } from "@/lib/server/http";
import { importSchema } from "@/lib/schemas";
import type { ImportRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export const POST = handler(
  async ({ req, repo }) => repo.validateImport((await parseBody(req, importSchema)).rows as ImportRow[]),
  { action: "import.run" },
);

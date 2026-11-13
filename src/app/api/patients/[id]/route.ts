import { handler, parseBody } from "@/lib/server/http";
import { patientSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type P = { id: string };

export const GET = handler<P>(async ({ repo, params }) => repo.getPatient(params.id));

export const PATCH = handler<P>(
  async ({ req, repo, actor, params }) => repo.updatePatient(actor, params.id, await parseBody(req, patientSchema)),
  { action: "patient.edit" },
);

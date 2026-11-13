import { handler, parseBody } from "@/lib/server/http";
import { patientSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const POST = handler(async ({ req, repo, actor }) => repo.createPatient(actor, await parseBody(req, patientSchema)), {
  action: "patient.create",
});

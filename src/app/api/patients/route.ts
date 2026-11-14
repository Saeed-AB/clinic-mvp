import { handler, parseBody } from "@/lib/server/http";
import { patientSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = handler(async ({ repo, search }) => {
  const gender = search.get("gender");
  const indicator = search.get("indicator");
  const sort = search.get("sort");
  return repo.listPatients({
    q: search.get("q"),
    gender: gender === "male" || gender === "female" ? gender : null,
    indicator: indicator === "debt" || indicator === "settled" || indicator === "credit" ? indicator : null,
    sort: sort === "fileNumber" || sort === "balance" ? sort : "name",
  });
});

export const POST = handler(async ({ req, repo, actor }) => repo.createPatient(actor, await parseBody(req, patientSchema)), {
  action: "patient.create",
});

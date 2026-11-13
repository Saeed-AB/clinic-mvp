import { handler } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** للنسخة التجريبية فقط: إعادة البيانات الوهمية. يُحذف عند ربط Supabase */
export const POST = handler(
  async ({ repo }) => {
    await repo.resetDemoData();
    return { reset: true };
  },
  { action: "settings.manage" },
);

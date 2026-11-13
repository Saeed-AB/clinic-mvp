# نظام العيادات — الإصدار الأول (واجهة)

نظام سحابي بسيط تسجل فيه العيادة زيارات المرضى اليومية ومدفوعاتهم، وتتابع ديونهم بدقة بدل الدفتر.
هذه النسخة **واجهة كاملة** مع طبقة API تعمل ببيانات وهمية؛ ربط Supabase مرحلة لاحقة.

## التشغيل محليًا

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
npm test           # اختبارات منطق الأرصدة والصلاحيات
```

حسابات التجربة: `admin / admin123` (مدير)، `reception / reception123` (مسجل).

## التقنيات
Next.js (App Router) · TypeScript · Tailwind CSS · Radix Dialog (نوافذ جانبية) · react-hook-form + zod · zustand · axios · exceljs

## البنية

```
src/
  app/(auth)/login           تسجيل الدخول
  app/(app)/...              الصفحات العشر
  app/api/**/route.ts        كل الـ endpoints (Route Handlers)
  components/drawers         النوافذ الجانبية: زيارة جديدة، مريض جديد، تسجيل سداد
  lib/domain                 قواعد المال والصلاحيات والتواريخ (دوال نقية + اختبارات)
  lib/data/repository.ts     العقد بين الـ API ومصدر البيانات
  lib/data/mock              المخزن الوهمي والبيانات التجريبية
  lib/services               استدعاءات axios من الواجهة
  middleware.ts              حماية الصفحات حسب الدور
```

المسار: الصفحة ← `lib/services` (axios) ← `/api/*` ← `Repository` ← `MockRepository`.

## الانتقال إلى Supabase
1. تصميم الجداول من `src/lib/types.ts` و `docs/api.md`.
2. كتابة `SupabaseRepository` ينفذ نفس واجهة `Repository`.
3. تعديل `src/lib/data/index.ts` لإرجاعه عند `DATA_SOURCE=supabase`.
4. استبدال الجلسة الموقعة بـ Supabase Auth داخل `lib/server/http.ts` و `middleware.ts`.
5. حذف `/api/dev/reset` وشريط "نسخة تجريبية".

الواجهة والـ services ومسارات الـ API لا تتغير.

## ملاحظات النسخة التجريبية
- البيانات في ذاكرة الخادم، فترجع لحالتها الأصلية عند إعادة تشغيل الدالة على Netlify.
- يمكن للمدير إعادة ضبطها من الإعدادات.

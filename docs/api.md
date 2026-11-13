# عقد الـ API

كل الردود بالشكل `{ "data": ... }` عند النجاح، أو `{ "error": { "code", "message" } }` عند الفشل.
الرموز: 400 بيانات غير صحيحة · 401 غير مسجل · 403 غير مسموح · 404 غير موجود · 409 تعارض.
كل الطلبات تحتاج جلسة (cookie) ما عدا تسجيل الدخول.

| المورد | Method و المسار | الصلاحية | الجسم / المعاملات |
| --- | --- | --- | --- |
| الدخول | POST `/api/auth/login` | الجميع | `{ username, password }` |
| | POST `/api/auth/logout` · GET `/api/auth/me` | مسجل دخول | |
| القوائم | GET `/api/lookups` | الجميع | العيادة، الأطباء، الخدمات، طرق الدفع، رقم الملف التالي |
| الرئيسية | GET `/api/dashboard?date=` | الجميع (إجمالي الديون للمدير) | |
| المرضى | GET `/api/patients/search?q=` | الجميع | رقم ملف أو جوال |
| | GET `/api/patients/by-phone?phone=` | الجميع | |
| | GET `/api/patients/check-file-number?n=&exclude=` | الجميع | |
| | POST `/api/patients` | الجميع (رقم الملف المعدّل للمدير) | `{ name, gender, age?, phone?, area?, notes?, fileNumber? }` |
| | GET · PATCH `/api/patients/:id` | الجميع | |
| | GET `/api/patients/:id/ledger` | الجميع | سجل الحركات مع الرصيد بعد كل حركة |
| | POST `/api/patients/:id/settlements` | الجميع | `{ amount, methodId, receiptNo?, note? }` |
| | POST `/api/patients/:id/opening-balance` | المدير | `{ amount, note? }` |
| الزيارات | GET `/api/visits?date=&status=&doctorId=` | الجميع | |
| | POST `/api/visits` | الجميع | `{ patientId \| newPatient, date, doctorId, services[], payment? }` |
| | GET `/api/visits/:id` | الجميع | |
| | POST `/api/visits/:id/check-in` · `/close` | الجميع | |
| | POST `/api/visits/:id/cancel` | المدير | `{ reason }` |
| | POST `/api/visits/:id/services` | الجميع، وبعد الإغلاق المدير | `{ serviceId, price }` |
| | PATCH `/api/visits/:id/services/:sid` | الجميع، وبعد الإغلاق المدير | `{ price }` |
| | POST `/api/visits/:id/services/:sid/cancel` | الجميع، وبعد الإغلاق المدير | `{ reason }` |
| | PATCH `/api/visits/:id/discount` | الجميع، وبعد الإغلاق المدير | `{ value, type: "amount" \| "percent" }` |
| | POST `/api/visits/:id/payments` | الجميع، وبعد الإغلاق المدير | `{ amount, methodId, receiptNo? }` |
| الدفعات | POST `/api/payments/:id/cancel` | قبل الإغلاق الجميع، بعده وللسداد المدير | `{ reason }` |
| المدينون | GET `/api/debtors?q=&sort=amount\|oldest&inactiveDays=` | الجميع | |
| | GET `/api/debtors/export` | المدير | نفس المعاملات |
| الإقفال | GET `/api/daily-closing?date=` | المسجل يومه فقط | |
| الإعدادات | GET `/api/settings` · GET/PATCH `/api/settings/clinic` | المدير | |
| | GET/POST `/api/settings/{services,doctors,payment-methods,users}` · PATCH `/:id` | المدير | إضافة وتعديل وإيقاف، بدون حذف |
| | POST `/api/settings/users/:id/reset-password` | المدير | يرجع كلمة مرور مؤقتة |
| الاستيراد | POST `/api/import/opening-balances/validate` · POST `/api/import/opening-balances` | المدير | `{ rows: [...] }` |
| التجربة | POST `/api/dev/reset` | المدير | يُحذف عند ربط Supabase |

كل عملية كتابة تسجل سطرًا في AuditLog داخل الـ Repository (بدون endpoint لعرضه في هذا الإصدار).

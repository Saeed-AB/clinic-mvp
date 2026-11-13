// مخططات zod مشتركة بين النماذج في الواجهة والتحقق في الـ Route Handlers.

import { z } from "zod";

const money = z.coerce
  .number({ invalid_type_error: "أدخل رقمًا صحيحًا" })
  .int("المبلغ بدون كسور")
  .min(0, "المبلغ لا يكون سالبًا");

const positiveMoney = z.coerce
  .number({ invalid_type_error: "أدخل رقمًا صحيحًا" })
  .int("المبلغ بدون كسور")
  .positive("المبلغ يجب أن يكون أكبر من صفر");

const optionalText = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

const optionalInt = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
  z.number({ invalid_type_error: "أدخل رقمًا" }).int().nullable(),
);

export const phoneSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .refine((v) => !v || /^[\d+\s-]{6,15}$/.test(v), "رقم الجوال غير صحيح");

export const patientSchema = z.object({
  name: z
    .string({ required_error: "الاسم مطلوب" })
    .trim()
    .min(1, "الاسم مطلوب")
    .refine((v) => v.split(/\s+/).filter(Boolean).length >= 2, "اكتب الاسم الرباعي (اسمان على الأقل)"),
  gender: z.enum(["male", "female"], { errorMap: () => ({ message: "اختر الجنس" }) }),
  age: optionalInt.refine((v) => v == null || (v >= 0 && v <= 120), "العمر بين 0 و 120"),
  phone: phoneSchema,
  area: optionalText,
  notes: optionalText,
  fileNumber: optionalInt.refine((v) => v == null || v > 0, "رقم الملف غير صحيح"),
});
export type PatientForm = z.input<typeof patientSchema>;

export const paymentSchema = z.object({
  amount: positiveMoney,
  methodId: z.string().min(1, "اختر طريقة الدفع"),
  receiptNo: optionalText,
  note: optionalText,
});

export const visitSchema = z
  .object({
    patientId: z.string().optional().nullable(),
    newPatient: patientSchema.optional().nullable(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "التاريخ غير صحيح"),
    doctorId: z.string().min(1, "اختر الطبيب"),
    services: z.array(z.object({ serviceId: z.string().min(1), price: money })).default([]),
    payment: paymentSchema.optional().nullable(),
  })
  .refine((v) => v.patientId || v.newPatient, { message: "اختر المريض أو أضف مريضًا جديدًا", path: ["patientId"] });

export const serviceLineSchema = z.object({ serviceId: z.string().min(1, "اختر الخدمة"), price: money });
export const priceSchema = z.object({ price: money });
export const reasonSchema = z.object({ reason: z.string().trim().min(3, "اذكر سبب الإلغاء (3 أحرف على الأقل)").max(300) });
export const discountSchema = z.object({ value: z.coerce.number().min(0, "الخصم لا يكون سالبًا"), type: z.enum(["amount", "percent"]) });
export const openingBalanceSchema = z.object({ amount: positiveMoney, note: optionalText });
export const loginSchema = z.object({
  username: z.string().trim().min(1, "اسم المستخدم مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export const clinicSchema = z.object({
  name: z.string().trim().min(1, "اسم العيادة مطلوب"),
  address: z.string().trim().default(""),
  phone: z.string().trim().default(""),
  currency: z.enum(["YER", "SAR", "USD"]),
  fileNumberStart: z.coerce.number().int().positive("رقم البداية غير صحيح"),
});

export const serviceSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "اسم الخدمة مطلوب"),
  defaultPrice: money,
  active: z.boolean().optional(),
  isEntryFee: z.boolean().optional(),
});
export const doctorSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "اسم الطبيب مطلوب"),
  specialty: z.string().trim().optional(),
  active: z.boolean().optional(),
});
export const paymentMethodSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "الاسم مطلوب"),
  active: z.boolean().optional(),
});
export const userSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "الاسم مطلوب"),
  username: z
    .string()
    .trim()
    .min(3, "اسم المستخدم 3 أحرف على الأقل")
    .regex(/^[a-zA-Z0-9._-]+$/, "حروف إنجليزية وأرقام فقط"),
  role: z.enum(["admin", "receptionist"]),
  active: z.boolean().optional(),
  password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل").optional(),
});

export const importRowSchema = z.object({
  fileNumber: z.number().int().nullable().optional(),
  name: z.string().default(""),
  gender: z.string(),
  age: z.number().nullable().optional(),
  phone: z.string().nullable().optional(),
  amount: z.number(),
  note: z.string().nullable().optional(),
});
export const importSchema = z.object({ rows: z.array(importRowSchema).min(1, "لا توجد أسطر").max(2000) });

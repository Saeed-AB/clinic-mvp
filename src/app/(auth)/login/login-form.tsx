"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Info } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/api/client";
import { loginSchema } from "@/lib/schemas";
import { authService } from "@/lib/services/auth";

type Form = { username: string; password: string };

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(loginSchema), mode: "onBlur" });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await authService.login(values.username, values.password);
      const next = params.get("next");
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  const fill = (u: string, p: string) => {
    setValue("username", u, { shouldValidate: true });
    setValue("password", p, { shouldValidate: true });
  };

  return (
    <>
      <Card className="p-5 sm:p-6">
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {error ? (
            <p role="alert" className="rounded-lg bg-debt-soft px-3 py-2.5 text-sm text-debt">
              {error}
            </p>
          ) : null}
          <Field label="اسم المستخدم" htmlFor="username" error={errors.username?.message}>
            <Input id="username" autoComplete="username" autoFocus dir="ltr" className="text-start" aria-invalid={!!errors.username} {...register("username")} />
          </Field>
          <Field label="كلمة المرور" htmlFor="password" error={errors.password?.message}>
            <div className="relative">
              <Input
                id="password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                dir="ltr"
                className="pe-3 ps-10 text-start"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute top-1/2 left-1.5 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>
          <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
            دخول
          </Button>
          <p className="text-center text-xs text-muted-foreground">نسيت كلمة المرور؟ تواصل مع مدير العيادة لإعادة تعيينها.</p>
        </form>
      </Card>

      <div className="mt-4 rounded-xl border border-dashed border-border bg-surface/60 p-4 text-sm">
        <p className="mb-2 flex items-center gap-1.5 font-medium">
          <Info className="size-4 text-primary" /> حسابات التجربة
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => fill("admin", "admin123")} className="rounded-lg border border-border bg-surface p-2.5 text-start hover:border-primary">
            <span className="block font-medium">المدير</span>
            <span className="num text-xs text-muted-foreground">admin / admin123</span>
          </button>
          <button type="button" onClick={() => fill("reception", "reception123")} className="rounded-lg border border-border bg-surface p-2.5 text-start hover:border-primary">
            <span className="block font-medium">المسجل</span>
            <span className="num text-xs text-muted-foreground">reception / reception123</span>
          </button>
        </div>
      </div>
    </>
  );
}

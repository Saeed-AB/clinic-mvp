import axios, { AxiosError } from "axios";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  timeout: 20000,
});

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ error?: { code: string; message: string } }>) => {
    const status = error.response?.status;
    const body = error.response?.data?.error;
    if (status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      fetch("/api/auth/logout", { method: "POST", credentials: "include" })
        .catch(() => null)
        .finally(() => {
          window.location.href = `/login?next=${next}`;
        });
    }
    if (body) return Promise.reject(new ApiError(body.code, body.message, status));
    if (error.code === "ECONNABORTED") return Promise.reject(new ApiError("TIMEOUT", "استغرق الطلب وقتًا طويلًا، تحقق من الاتصال وحاول مرة أخرى"));
    return Promise.reject(new ApiError("NETWORK", "تعذر الاتصال بالخادم، تحقق من الإنترنت وحاول مرة أخرى", status));
  },
);

/** يرجع data من شكل الرد الموحد { data } */
export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await api.get<{ data: T }>(url, { params });
  return res.data.data;
}
export async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.post<{ data: T }>(url, body ?? {});
  return res.data.data;
}
export async function patch<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.patch<{ data: T }>(url, body ?? {});
  return res.data.data;
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "حدث خطأ غير متوقع";
}

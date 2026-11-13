import { get, patch, post } from "../api/client";
import type { Settings } from "../data/repository";
import type { Clinic, Doctor, PaymentMethod, PublicUser, Service } from "../types";

export type SettingsResource = "services" | "doctors" | "payment-methods" | "users";

export const settingsService = {
  all: () => get<Settings>("/settings"),
  updateClinic: (input: Omit<Clinic, "id">) => patch<Clinic>("/settings/clinic", input),
  create: <T = Service | Doctor | PaymentMethod | PublicUser>(resource: SettingsResource, input: unknown) =>
    post<T>(`/settings/${resource}`, input),
  update: <T = Service | Doctor | PaymentMethod | PublicUser>(resource: SettingsResource, id: string, input: unknown) =>
    patch<T>(`/settings/${resource}/${id}`, input),
  resetPassword: (userId: string) => post<{ temporaryPassword: string }>(`/settings/users/${userId}/reset-password`),
  resetDemo: () => post<{ reset: boolean }>("/dev/reset"),
};

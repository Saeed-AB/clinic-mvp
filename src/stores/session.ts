"use client";

import { create } from "zustand";
import { can, type Action, type PermissionContext } from "@/lib/domain/permissions";
import type { PublicUser } from "@/lib/types";

interface SessionState {
  user: PublicUser | null;
  setUser: (u: PublicUser | null) => void;
}

export const useSession = create<SessionState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));

export function useCan(action: Action, ctx?: PermissionContext): boolean {
  const role = useSession((s) => s.user?.role);
  return can(role, action, ctx);
}

export function useIsAdmin(): boolean {
  return useSession((s) => s.user?.role === "admin");
}

"use client";

import { create } from "zustand";

export type DrawerKind = "visit" | "patient" | "settlement" | null;

export interface DrawerPayload {
  patientId?: string;
  /** نافذة المريض بوضع التعديل */
  editPatientId?: string;
  /** جوال معبأ مسبقًا (من البحث بدون نتيجة) */
  phone?: string;
}

interface DrawerState {
  open: DrawerKind;
  payload: DrawerPayload;
  /** يزيد بعد كل عملية كتابة، فتعيد الصفحات تحميل بياناتها */
  version: number;
  openDrawer: (kind: Exclude<DrawerKind, null>, payload?: DrawerPayload) => void;
  close: () => void;
  bump: () => void;
}

export const useDrawers = create<DrawerState>((set) => ({
  open: null,
  payload: {},
  version: 0,
  openDrawer: (open, payload = {}) => set({ open, payload }),
  close: () => set({ open: null }),
  bump: () => set((s) => ({ version: s.version + 1 })),
}));

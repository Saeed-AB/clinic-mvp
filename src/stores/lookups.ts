"use client";

import { create } from "zustand";
import type { Lookups } from "@/lib/data/repository";
import { lookupsService } from "@/lib/services/lookups";

interface LookupsState {
  data: Lookups | null;
  loading: boolean;
  load: (force?: boolean) => Promise<Lookups | null>;
}

/** القوائم المرجعية (أطباء، خدمات، طرق دفع، بيانات العيادة) مخزنة مرة واحدة وتتحدث عند الحاجة */
export const useLookups = create<LookupsState>((set, get) => ({
  data: null,
  loading: false,
  load: async (force = false) => {
    if (get().data && !force) return get().data;
    set({ loading: true });
    try {
      const data = await lookupsService.get();
      set({ data, loading: false });
      return data;
    } catch {
      set({ loading: false });
      return null;
    }
  },
}));

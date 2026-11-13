import { get } from "../api/client";
import type { Lookups } from "../data/repository";

export const lookupsService = {
  get: () => get<Lookups>("/lookups"),
};

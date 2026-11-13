import { get, post } from "../api/client";
import type { PublicUser } from "../types";

export const authService = {
  login: (username: string, password: string) => post<PublicUser>("/auth/login", { username, password }),
  logout: () => post<{ loggedOut: boolean }>("/auth/logout"),
  me: () => get<PublicUser>("/auth/me"),
};

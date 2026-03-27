import { create } from "zustand";
import type { User } from "@workspace/api-client-react";

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  updateUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("jamber_token"),
  user: null,
  setAuth: (token, user) => {
    localStorage.setItem("jamber_token", token);
    set({ token, user });
  },
  updateUser: (user) => set({ user }),
  logout: () => {
    localStorage.removeItem("jamber_token");
    set({ token: null, user: null });
  },
}));

"use client";
import { useState, useEffect, useCallback, useRef } from "react";

interface UseSessionResult {
  token: string;
  user: string;
  isValidating: boolean;
  login: (token: string, user: string) => void;
  logout: () => void;
  validate: () => Promise<boolean>;
}

export function useSession(): UseSessionResult {
  const [token, setToken] = useState("");
  const [user, setUser] = useState("");
  const [isValidating, setIsValidating] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const validate = useCallback(async (): Promise<boolean> => {
    const t = localStorage.getItem("cj-token") || "";
    if (!t) {
      setIsValidating(false);
      return false;
    }
    try {
      const res = await fetch("/api/data", {
        headers: { authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        setToken(t);
        setUser(localStorage.getItem("cj-user") || "");
        setIsValidating(false);
        return true;
      }
    } catch {}
    localStorage.clear();
    setToken("");
    setUser("");
    setIsValidating(false);
    return false;
  }, []);

  const login = useCallback((newToken: string, newUser: string) => {
    localStorage.setItem("cj-token", newToken);
    localStorage.setItem("cj-user", newUser);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth", {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });
    } catch {}
    localStorage.clear();
    setToken("");
    setUser("");
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    validate();
    intervalRef.current = setInterval(() => {
      validate();
    }, 5 * 60 * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [validate]);

  return { token, user, isValidating, login, logout, validate };
}

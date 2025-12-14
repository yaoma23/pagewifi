// lib/authContext.tsx
import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export type User = {
  id: string;
  email: string;
  role?: "owner" | "renter" | null;
};

type AuthContextType = {
  user: User | null;
  signup: (email: string, password: string, role: "owner" | "renter") => Promise<User | null>;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // --- helper: get role from your users table ---
  const fetchUserRole = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", id)
        .limit(1);

      if (error) {
        console.error("Error fetching role:", error.message);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      return data[0]?.role ?? null;
    } catch (err) {
      console.error("Unexpected error fetching role:", err);
      return null;
    }
  };

  // --- check session on mount ---
  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error) {
          console.warn('Session load error:', error.message);
          setUser(null);
          return;
        }

        const sessionUser = data?.session?.user;
        if (sessionUser) {
          const role = await fetchUserRole(sessionUser.id);
          if (isMounted) {
            setUser({
              id: sessionUser.id,
              email: sessionUser.email ?? "",
              role,
            });
          }
        } else {
          if (isMounted) {
            setUser(null);
          }
        }
      } catch (err) {
        console.warn('Session load failed:', err);
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSession();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;

      const sessionUser = session?.user;
      if (sessionUser) {
        // Only fetch role if we don't have it or if the user changed
        if (!user || user.id !== sessionUser.id) {
          const role = await fetchUserRole(sessionUser.id);
          if (isMounted) {
            setUser({
              id: sessionUser.id,
              email: sessionUser.email ?? "",
              role,
            });
          }
        }
      } else {
        if (isMounted) {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // --- SIGNUP ---
  const signup = async (email: string, password: string, role: "owner" | "renter") => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      if (data.user) {
        // insert into your users table
        const { error: insertError } = await supabase
          .from("users")
          .insert([{ id: data.user.id, email, role }]);

        if (insertError) {
          // If user creation failed, we might want to cleanup auth user, but for now just throw
          throw insertError;
        }

        const newUser: User = { id: data.user.id, email, role };
        setUser(newUser);
        return newUser;
      }
      return null;
    } catch (err) {
      console.error("Signup error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIN ---
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.user) {
        const role = await fetchUserRole(data.user.id);
        const loggedInUser: User = { id: data.user.id, email: data.user.email ?? "", role };
        setUser(loggedInUser);
        return loggedInUser;
      }
      return null;
    } catch (err) {
      console.error("Login error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };


  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };


  return (
    <AuthContext.Provider value={{ user, signup, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};

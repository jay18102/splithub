import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const DEMO_PERSONAS = [
  { name: "Jay Sharma", email: "jay@splitsub.dev", role: "Owner (Netflix & Spotify)", upi: "jay@okhdfcbank" },
  { name: "Rahul Verma", email: "rahul@splitsub.dev", role: "Owner (YouTube) & Member", upi: "rahul@okaxis" },
  { name: "Amit Patel", email: "amit@splitsub.dev", role: "Member (Netflix/Spotify)", upi: "amit@paytm" },
  { name: "Priya Singh", email: "priya@splitsub.dev", role: "Owner (Google One)", upi: "priya@ibl" },
  { name: "Sneha Iyer", email: "sneha@splitsub.dev", role: "Member", upi: "sneha@ybl" },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('splitsub_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const userData = await api.getMe();
          setUser(userData);
        } catch (err) {
          console.error("Token verification failed:", err);
          logout();
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    localStorage.setItem('splitsub_token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    return res;
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    localStorage.setItem('splitsub_token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('splitsub_token');
    setToken(null);
    setUser(null);
  };

  const switchPersona = async (email) => {
    setLoading(true);
    try {
      await login(email, 'password123');
    } finally {
      setLoading(false);
    }
  };

  const updateUser = (updated) => {
    setUser((prev) => ({ ...prev, ...updated }));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, switchPersona, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

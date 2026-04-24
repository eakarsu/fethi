import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      const u = localStorage.getItem('user');
      if (u) setUser(JSON.parse(u));
    }
  }, [token]);

  const login = (userData, tokenData) => {
    localStorage.setItem('token', tokenData);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(tokenData);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const apiFetch = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...options.headers },
    });
    if (res.status === 401 || res.status === 403) { logout(); throw new Error('Session expired'); }
    return res;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

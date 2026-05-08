import { createContext, useContext, useState, ReactNode } from 'react';

type AuthContextValue = {
    token: string | null;
    username: string | null;
    login: (token: string) => void;
    logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeUsername(token: string): string | null {
    try {
        return JSON.parse(atob(token.split('.')[1])).username ?? null;
    } catch {
        return null;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
    const [username, setUsername] = useState<string | null>(() => {
        const t = localStorage.getItem('auth_token');
        return t ? decodeUsername(t) : null;
    });

    const login = (newToken: string) => {
        localStorage.setItem('auth_token', newToken);
        setToken(newToken);
        setUsername(decodeUsername(newToken));
    };

    const logout = () => {
        localStorage.removeItem('auth_token');
        setToken(null);
        setUsername(null);
    };

    return <AuthContext.Provider value={{ token, username, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}

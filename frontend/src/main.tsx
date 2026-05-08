import './i18n/index';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Home } from './Home.tsx';
import { Login } from './Login.tsx';
import { Register } from './Register.tsx';
import { AuthProvider } from './AuthContext.tsx';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/" element={<Home />} />
                    <Route path="/board/:boardId" element={<App />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    </StrictMode>,
)

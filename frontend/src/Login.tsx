import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext.tsx';
import { useColorScheme } from './useColorScheme.ts';
import { useTranslation } from 'react-i18next';
import { LangSwitcher } from './LangSwitcher.tsx';
import { ThemeSwitcher } from './ThemeSwitcher.tsx';

export function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    useColorScheme(); // keeps theme applied on this page
    const { t } = useTranslation();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? t('login.loginFailed')); return; }
        login(data.token);
        navigate('/');
    };

    return (
        <main style={{ writingMode: 'horizontal-tb' }}>
            <nav><strong>{t('nav.appName')}</strong></nav>
            <article>
                <h3>{t('login.title')}</h3>
                <form onSubmit={submit}>
                    <p><fieldset>
                        <input placeholder={t('login.usernamePlaceholder')} value={username} onChange={e => setUsername(e.target.value)} autoFocus />
                    </fieldset></p>
                    <p><fieldset>
                        <input type="password" placeholder={t('login.passwordPlaceholder')} value={password} onChange={e => setPassword(e.target.value)} />
                    </fieldset></p>
                    {error && <p><mark>{error}</mark></p>}
                    <p><button type="submit">{t('login.submit')}</button></p>
                </form>
                <p><small>{t('login.noAccount')} <Link to="/register">{t('nav.register')}</Link></small></p>
            </article>
            <footer>
                <p>
                    <ThemeSwitcher />
                    {" · "}
                    <LangSwitcher />
                </p>
            </footer>
        </main>
    );
}

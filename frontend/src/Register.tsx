import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext.tsx';
import { useColorScheme } from './useColorScheme.ts';
import { useTranslation } from 'react-i18next';
import { LangSwitcher } from './LangSwitcher.tsx';

export function Register() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const { scheme, toggle: toggleColorScheme } = useColorScheme();
    const { t } = useTranslation();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? t('register.registerFailed')); return; }
        login(data.token);
        navigate('/');
    };

    return (
        <main style={{ writingMode: 'horizontal-tb' }}>
            <nav><strong>{t('nav.appName')}</strong></nav>
            <article>
                <h3>{t('register.title')}</h3>
                <form onSubmit={submit}>
                    <p><fieldset>
                        <input placeholder={t('register.usernamePlaceholder')} value={username} onChange={e => setUsername(e.target.value)} autoFocus />
                    </fieldset></p>
                    <p><fieldset>
                        <input type="password" placeholder={t('register.passwordPlaceholder')} value={password} onChange={e => setPassword(e.target.value)} />
                    </fieldset></p>
                    {error && <p><mark>{error}</mark></p>}
                    <p><button type="submit">{t('register.submit')}</button></p>
                </form>
                <p><small>{t('register.hasAccount')} <Link to="/login">{t('nav.login')}</Link></small></p>
            </article>
            <footer>
                <p>
                    <a href="#" onClick={toggleColorScheme}>{scheme === 'dark' ? t('footer.lightMode') : t('footer.darkMode')}</a>
                    {" · "}
                    <LangSwitcher />
                </p>
            </footer>
        </main>
    );
}

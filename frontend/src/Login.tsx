import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext.tsx';
import { useColorScheme } from './useColorScheme.ts';

export function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const { scheme, toggle: toggleColorScheme } = useColorScheme();
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
        if (!res.ok) { setError(data.error ?? 'ログインに失敗しました'); return; }
        login(data.token);
        navigate('/');
    };

    return (
        <main style={{ writingMode: 'horizontal-tb' }}>
            <nav><strong>✔︎ やることリスト</strong></nav>
            <article>
                <h3>ログイン</h3>
                <form onSubmit={submit}>
                    <p><fieldset>
                        <input placeholder="ユーザー名" value={username} onChange={e => setUsername(e.target.value)} autoFocus />
                    </fieldset></p>
                    <p><fieldset>
                        <input type="password" placeholder="パスワード" value={password} onChange={e => setPassword(e.target.value)} />
                    </fieldset></p>
                    {error && <p><mark>{error}</mark></p>}
                    <p><button type="submit">ログイン</button></p>
                </form>
                <p><small>アカウントをお持ちでない方は <Link to="/register">新規登録</Link></small></p>
            </article>
            <footer>
                <p><a href="#" onClick={toggleColorScheme}>{scheme === 'dark' ? '☀ ライトモード' : '🌙 ダークモード'}</a></p>
            </footer>
        </main>
    );
}

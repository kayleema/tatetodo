import {useEffect, useRef, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {FooterText} from "./FooterText.tsx";
import {useColorScheme} from "./useColorScheme.ts";
import {useAuth} from "./AuthContext.tsx";
import {useTranslation} from 'react-i18next';
import {LangSwitcher} from './LangSwitcher.tsx';
import {ThemeSwitcher} from './ThemeSwitcher.tsx';
import {HeroCard} from './HeroCard.tsx';
import {MCPCard} from "./MCPCard.tsx";

type BoardMeta = { boardId: string; ownerUsername: string; isPublic: boolean; createdAt: string };

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
}

async function apiCreateBoard(boardId: string | undefined, token: string): Promise<string> {
    const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(boardId ? { boardId } : {}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? '作成に失敗しました');
    return data.boardId;
}

export function Home() {
    const nameInputRef = useRef<HTMLInputElement>(null);
    const [writingModeHorizontal, setWritingModeHorizontal] = useState(
        () => localStorage.getItem('writingModeHorizontal') !== 'false'
    );
    const navigate = useNavigate();
    const { scheme } = useColorScheme();
    const { token, username, logout } = useAuth();
    const { t } = useTranslation();
    const [boards, setBoards] = useState<BoardMeta[]>([]);
    const [loadingBoards, setLoadingBoards] = useState(false);
    const [boardError, setBoardError] = useState('');
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    useEffect(() => {
        const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e as BeforeInstallPromptEvent); };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const fetchBoards = () => {
        if (!token) { setBoards([]); return; }
        setLoadingBoards(true);
        fetch('/api/boards', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => r.json())
            .then(setBoards)
            .catch(() => {})
            .finally(() => setLoadingBoards(false));
    };

    useEffect(fetchBoards, [token]);

    const openOrCreate = async () => {
        const name = nameInputRef.current?.value.trim();
        if (!name) return;
        if (!token) { navigate(`/board/${name}`); return; }
        setBoardError('');
        try {
            await apiCreateBoard(name, token);
            navigate(`/board/${name}`);
        } catch (e: any) {
            if (e.message.includes('already exists')) {
                navigate(`/board/${name}`);
            } else {
                setBoardError(e.message);
            }
        }
    };

    const install = async () => {
        if (!installPrompt) return;
        await installPrompt.prompt();
        setInstallPrompt(null);
    };

    const createRandom = async () => {
        if (!token) { navigate(`/board/${crypto.randomUUID()}`); return; }
        setBoardError('');
        try {
            const boardId = await apiCreateBoard(undefined, token);
            navigate(`/board/${boardId}`);
        } catch (e: any) {
            setBoardError(e.message);
        }
    };

    return (
        <main style={{ writingMode: writingModeHorizontal ? "horizontal-tb" : "vertical-rl" }}>
            <nav>
                <strong>{t('nav.appName')}</strong>
                {token
                    ? <span>{t('nav.hello', { username })}  · <a href="#" onClick={e => { e.preventDefault(); logout(); }}>{ t('nav.logout')}</a></span>
                    : <span><Link to="/login">{t('nav.login')}</Link> · <Link to="/register">{t('nav.register')}</Link></span>
                }
            </nav>

            <HeroCard scheme={scheme} />

            {token && (
                <article>
                    <h3 style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        {t('home.myBoards')}
                        <button className="secondary" onClick={fetchBoards} style={{fontSize: '0.8rem'}} disabled={loadingBoards}>{t('home.refresh')}</button>
                    </h3>
                    {loadingBoards
                        ? <p><small>{t('home.loading')}</small></p>
                        : boards.length === 0 && <p><small>{t('home.noBoards')}</small></p>
                    }
                    <ul>
                        {boards.map(b => (
                            <li key={b.boardId} style={{cursor: 'pointer', flexDirection: 'column', alignItems: 'stretch', gap: '2px'}}
                                onClick={() => navigate(`/board/${b.boardId}`)}>
                                <fieldset>
                                    <input value={b.boardId} readOnly style={{cursor: 'pointer', flexGrow: 1}}/>
                                    <button className="secondary" onClick={e => {
                                        e.stopPropagation();
                                        navigate(`/board/${b.boardId}`);
                                    }}>{t('home.open')}</button>
                                </fieldset>
                                {b.ownerUsername !== username && (
                                    <small style={{paddingInline: '10px'}}>（{t('home.sharedBy', { owner: b.ownerUsername })}）</small>
                                )}
                            </li>
                        ))}
                    </ul>
                </article>
            )}

            <article>
                <h3>{t('home.openOrCreate')}</h3>
                <p>
                    <form onSubmit={e => { e.preventDefault(); openOrCreate(); }}>
                        <fieldset>
                            <input placeholder={t('home.listName')} ref={nameInputRef} />
                            <button type="submit">{t('home.openList')}</button>
                        </fieldset>
                    </form>
                </p>
                {boardError && <p><mark>{boardError}</mark></p>}
            </article>

            <article>
                <h3>{t('home.createRandom')}</h3>
                <p><button onClick={createRandom}>{t('home.createList')}</button></p>
            </article>

            {!isStandalone && (
                <article>
                    <h3>{t('home.pwaTitle')}</h3>
                    <p>{t('home.pwaDesc')}</p>
                    {installPrompt
                        ? <p><button onClick={install}>{t('home.pwaInstall')}</button></p>
                        : <p><small>{t('home.pwaIos')}</small></p>
                    }
                </article>
            )}

            <MCPCard token={token} writingModeHorizontal={writingModeHorizontal} />

            <footer>
                <p>
                    <a href="#" onClick={() => setWritingModeHorizontal(v => {
                        const next = !v;
                        localStorage.setItem('writingModeHorizontal', String(next));
                        return next;
                    })}>{t('footer.toggleWritingMode')}</a>
                    {" · "}
                    <ThemeSwitcher />
                    {" · "}
                    <LangSwitcher />
                </p>
                <FooterText />
            </footer>
        </main>
    );
}

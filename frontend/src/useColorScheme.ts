import { useState, useEffect } from 'react';

export type ColorScheme = 'light' | 'dark' | 'parchment' | 'hacker' | 'sakura' | 'neon';

const STORAGE_KEY = 'colorScheme';
const VALID: ColorScheme[] = ['light', 'dark', 'parchment', 'hacker', 'sakura', 'neon'];

// Apply immediately on module load to prevent flash of wrong theme
const savedOnLoad = localStorage.getItem(STORAGE_KEY) as ColorScheme | null;
if (savedOnLoad && VALID.includes(savedOnLoad)) document.documentElement.setAttribute('data-theme', savedOnLoad);

function getInitial(): ColorScheme {
    const saved = localStorage.getItem(STORAGE_KEY) as ColorScheme | null;
    if (saved && VALID.includes(saved)) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const THEME_EVENT = 'themechange';

function broadcast(s: ColorScheme) {
    document.documentElement.setAttribute('data-theme', s);
    localStorage.setItem(STORAGE_KEY, s);
    window.dispatchEvent(new CustomEvent<ColorScheme>(THEME_EVENT, { detail: s }));
}

export function useColorScheme() {
    const [scheme, setSchemeState] = useState<ColorScheme>(getInitial);

    useEffect(() => {
        const handler = (e: Event) => setSchemeState((e as CustomEvent<ColorScheme>).detail);
        window.addEventListener(THEME_EVENT, handler);
        return () => window.removeEventListener(THEME_EVENT, handler);
    }, []);

    const setScheme = (s: ColorScheme) => { setSchemeState(s); broadcast(s); };

    return { scheme, setScheme };
}

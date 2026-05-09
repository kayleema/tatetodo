import { useState, useEffect } from 'react';

export type ColorScheme = 'light' | 'dark' | 'parchment';

const STORAGE_KEY = 'colorScheme';
const VALID: ColorScheme[] = ['light', 'dark', 'parchment'];

// Apply immediately on module load to prevent flash of wrong theme
const savedOnLoad = localStorage.getItem(STORAGE_KEY) as ColorScheme | null;
if (savedOnLoad && VALID.includes(savedOnLoad)) document.documentElement.setAttribute('data-theme', savedOnLoad);

function getInitial(): ColorScheme {
    const saved = localStorage.getItem(STORAGE_KEY) as ColorScheme | null;
    if (saved && VALID.includes(saved)) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useColorScheme() {
    const [scheme, setSchemeState] = useState<ColorScheme>(getInitial);

    const setScheme = (s: ColorScheme) => setSchemeState(s);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', scheme);
        localStorage.setItem(STORAGE_KEY, scheme);
    }, [scheme]);

    return { scheme, setScheme };
}

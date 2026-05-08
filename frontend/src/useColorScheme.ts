import { useState, useEffect } from 'react';

type ColorScheme = 'light' | 'dark';

const STORAGE_KEY = 'colorScheme';

// Apply immediately on module load to prevent flash of wrong theme
const savedOnLoad = localStorage.getItem(STORAGE_KEY) as ColorScheme | null;
if (savedOnLoad) document.documentElement.setAttribute('data-theme', savedOnLoad);

function getInitial(): ColorScheme {
    const saved = localStorage.getItem(STORAGE_KEY) as ColorScheme | null;
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useColorScheme() {
    const [scheme, setScheme] = useState<ColorScheme>(getInitial);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', scheme);
        localStorage.setItem(STORAGE_KEY, scheme);
    }, [scheme]);

    const toggle = () => setScheme(s => s === 'dark' ? 'light' : 'dark');

    return { scheme, toggle };
}

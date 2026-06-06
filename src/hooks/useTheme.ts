import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

export function useTheme() {
  const theme = useAppStore((s) => s.settings.theme);

  useEffect(() => {
    const root = document.documentElement;
    const apply = (mode: 'dark' | 'light') => {
      root.setAttribute('data-theme', mode);
    };
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      apply(mq.matches ? 'dark' : 'light');
      const handler = (e: MediaQueryListEvent) =>
        apply(e.matches ? 'dark' : 'light');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    apply(theme);
  }, [theme]);
}

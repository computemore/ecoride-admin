import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'ecoride_admin_sidebar_mobile_open';

function isDesktopViewport(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(min-width: 1024px)').matches;
}

export function useSidebar() {
  const [isDesktop, setIsDesktop] = useState(isDesktopViewport);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === null) return false;
      return raw === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktop(media.matches);

    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, isMobileOpen ? '1' : '0');
    } catch {
      // ignore
    }
  }, [isMobileOpen]);

  useEffect(() => {
    if (isDesktop) {
      setIsMobileOpen(false);
    }
  }, [isDesktop]);

  const isOverlay = useMemo(() => !isDesktop, [isDesktop]);
  const isSidebarOpen = useMemo(() => (isDesktop ? true : isMobileOpen), [isDesktop, isMobileOpen]);

  const openSidebar = () => setIsMobileOpen(true);
  const closeSidebar = () => setIsMobileOpen(false);
  const toggleSidebar = () => setIsMobileOpen((v) => !v);

  return {
    isDesktop,
    isOverlay,
    isSidebarOpen,
    openSidebar,
    closeSidebar,
    toggleSidebar,
  };
}

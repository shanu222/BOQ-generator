'use client';

import { useEffect } from 'react';
import { useProjectStore } from '@/store/project-store';

export function useKeyboardShortcuts() {
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const touchSaved = useProjectStore((s) => s.touchSaved);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (key === 'z' && !e.shiftKey) {
        if (typing) return;
        e.preventDefault();
        undo();
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        if (typing) return;
        e.preventDefault();
        redo();
      } else if (key === 's') {
        e.preventDefault();
        touchSaved();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, touchSaved]);
}

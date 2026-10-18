'use client';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { LANGUE_COOKIE, type Langue } from './langue';

const Ctx = createContext<{ langue: Langue; changer: (l: Langue) => void }>({ langue: 'fr', changer: () => {} });

export function LangueProvider({ initiale, children }: { initiale: Langue; children: ReactNode }) {
  const [langue, setLangue] = useState<Langue>(initiale);
  const router = useRouter();
  const changer = useCallback((l: Langue) => {
    setLangue(l);
    document.cookie = `${LANGUE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = l;
    router.refresh();     // les composants serveur relisent le témoin
  }, [router]);
  return <Ctx.Provider value={{ langue, changer }}>{children}</Ctx.Provider>;
}

export function useLangue() {
  return useContext(Ctx);
}

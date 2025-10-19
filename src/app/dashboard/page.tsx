import dynamic from 'next/dynamic';

// Rend le dashboard uniquement côté client (pas de SSR ni de pré-rendu)
const DashboardClient = dynamic(() => import('./DashboardClient'), { ssr: false });

export default function Page() {
  return <DashboardClient />;
}
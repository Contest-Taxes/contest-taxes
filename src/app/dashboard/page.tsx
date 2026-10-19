export const dynamic = 'force-dynamic'; // empêche le pré-rendu statique

import DashboardClient from './DashboardClient';

export default function Page() {
  return <DashboardClient />;
}
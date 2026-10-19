export const dynamic = 'force-dynamic'; // empêche le pré-rendu statique

import AuthClient from './AuthClient';

export default function Page() {
  return <AuthClient />;
}
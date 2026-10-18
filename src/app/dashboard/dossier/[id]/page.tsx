export const dynamic = 'force-dynamic';

import DossierClient from './DossierClient';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DossierClient id={id} />;
}

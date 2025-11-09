'use client';

import { FinesTable } from '../../components/FinesTable';

export default function AdminPage() {
  return (
    <main>
      <h2 style={{ marginTop: 0 }}>Fines</h2>
      <FinesTable />
    </main>
  );
}

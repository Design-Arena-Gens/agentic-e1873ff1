export type FineStatus = 'unpaid' | 'paid';

export type FineRecord = {
  id: string;
  plate: string;
  createdAt: number;
  imageDataUrl?: string;
  status: FineStatus;
};

const STORAGE_KEY = 'auto-fines-v1';

export function getFines(): FineRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FineRecord[]) : [];
  } catch {
    return [];
  }
}

function setFines(fines: FineRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fines));
  window.dispatchEvent(new CustomEvent('fines-updated'));
}

export function addFine(fine: FineRecord) {
  const fines = getFines();
  fines.unshift(fine);
  setFines(fines);
}

export function updateFine(id: string, partial: Partial<FineRecord>) {
  const fines = getFines();
  const idx = fines.findIndex(f => f.id === id);
  if (idx >= 0) {
    fines[idx] = { ...fines[idx], ...partial };
    setFines(fines);
  }
}

export function markPaid(id: string) {
  updateFine(id, { status: 'paid' });
}

export function exportCSV(): string {
  const fines = getFines();
  const header = ['id', 'plate', 'createdAt', 'status'];
  const rows = fines.map(f => [f.id, f.plate, new Date(f.createdAt).toISOString(), f.status]);
  return [header.join(','), ...rows.map(r => r.map(s => `"${String(s).replace(/"/g, '""')}"`).join(','))].join('\n');
}

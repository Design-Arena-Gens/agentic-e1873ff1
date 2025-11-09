"use client";

import { useEffect, useMemo, useState } from 'react';
import { FineRecord, getFines, markPaid, updateFine, exportCSV } from '../utils/finesStore';

export function FinesTable() {
  const [fines, setFines] = useState<FineRecord[]>([]);

  useEffect(() => {
    setFines(getFines());
    const onUpdate = () => setFines(getFines());
    window.addEventListener('fines-updated', onUpdate as EventListener);
    return () => window.removeEventListener('fines-updated', onUpdate as EventListener);
  }, []);

  function onPlateChange(id: string, plate: string) {
    updateFine(id, { plate });
  }

  function onExport() {
    const csv = exportCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fines.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ opacity: 0.85 }}>{fines.length} record(s)</div>
        <button onClick={onExport} style={btnStyle}>Export CSV</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thTd}>Image</th>
              <th style={thTd}>Plate</th>
              <th style={thTd}>Created</th>
              <th style={thTd}>Status</th>
              <th style={thTd}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {fines.map(f => (
              <tr key={f.id}>
                <td style={thTd}>
                  {f.imageDataUrl ? (
                    <img src={f.imageDataUrl} alt="snapshot" style={{ width: 160, borderRadius: 6, border: '1px solid #2a3b64' }} />
                  ) : (
                    <span style={{ opacity: 0.6 }}>No image</span>
                  )}
                </td>
                <td style={thTd}>
                  <input
                    value={f.plate}
                    onChange={e => onPlateChange(f.id, e.target.value.toUpperCase())}
                    style={{ width: 160, background: '#0f182d', color: '#e7e9ee', border: '1px solid #2a3b64', borderRadius: 6, padding: '6px 8px' }}
                  />
                </td>
                <td style={thTd}>{new Date(f.createdAt).toLocaleString()}</td>
                <td style={thTd}>
                  <span style={{ padding: '2px 8px', borderRadius: 999, background: f.status === 'paid' ? '#1d3a25' : '#3a1d1d', border: '1px solid #2a3b64' }}>
                    {f.status}
                  </span>
                </td>
                <td style={thTd}>
                  {f.status === 'unpaid' && (
                    <button onClick={() => markPaid(f.id)} style={btnStyle}>Mark paid</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thTd: React.CSSProperties = { borderBottom: '1px solid #223058', textAlign: 'left', padding: 8 };
const btnStyle: React.CSSProperties = { background: '#17223a', color: '#d9e8ff', border: '1px solid #2a3b64', borderRadius: 8, padding: '6px 10px' };

'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

const LiveDetector = dynamic(() => import('./ui/LiveDetector'), { ssr: false });

export default function Page() {
  return (
    <main>
      <section style={{ marginBottom: 16 }}>
        <p style={{ opacity: 0.9 }}>
          Draw a no-parking zone, start the camera or upload an image. Detected vehicles inside the zone will trigger fines with OCR plate extraction.
        </p>
      </section>
      <LiveDetector />
      <div style={{ marginTop: 16 }}>
        <Link href="/admin" style={{ color: '#9ad1ff' }}>Go to Admin ?</Link>
      </div>
    </main>
  );
}

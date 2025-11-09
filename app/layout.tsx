export const metadata = {
  title: "Auto Fine Detector",
  description: "Detect vehicles in no-parking zones and auto-create fines",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#0b1020', color: '#e7e9ee' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px' }}>
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <h1 style={{ margin: 0, fontSize: 22 }}>Auto Fine Detector</h1>
            <nav style={{ display: 'flex', gap: 16 }}>
              <a href="/" style={{ color: '#b9d3ff' }}>Live</a>
              <a href="/admin" style={{ color: '#b9d3ff' }}>Admin</a>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}

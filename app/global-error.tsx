'use client';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
          <div>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ color: '#6b7280', marginBottom: 20 }}>Please try again in a moment.</p>
            <button
              onClick={() => reset()}
              style={{ padding: '10px 18px', borderRadius: 8, border: 0, background: '#111827', color: '#fff', cursor: 'pointer' }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}

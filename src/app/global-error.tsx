'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Global Error]', error);
    }
  }, [error]);

  return (
    <html lang="pl">
      <body style={{ margin: 0, fontFamily: '"Outfit", system-ui, -apple-system, "Segoe UI", sans-serif', background: '#0f1a15', color: '#e8ede9' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            textAlign: 'center',
            gap: '1.5rem',
          }}
          data-testid="common-global-error"
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 40,
            }}
          >
            ⚠️
          </div>

          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Krytyczny błąd aplikacji</h1>
            <p style={{ color: '#9ca3af', maxWidth: 400, margin: '0 auto' }}>
              Przepraszamy, wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę.
            </p>
          </div>

          <button
            onClick={reset}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#5bb89a',
              color: '#000',
              border: 'none',
              borderRadius: 12,
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
            data-testid="common-global-error-retry-btn"
          >
            Odśwież stronę
          </button>
        </div>
      </body>
    </html>
  );
}

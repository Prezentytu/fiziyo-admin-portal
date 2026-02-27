import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';
import { ApolloWrapper } from '@/lib/apollo/provider';
import { Toaster } from '@/components/ui/sonner';
import { AccessibilityProvider } from '@/contexts/AccessibilityContext';
import './globals.css';

const inter = Inter({
  subsets: ['latin-ext'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'FiziYo Admin',
  description: 'Panel administracyjny dla fizjoterapeutów',
};

// Inline script to apply accessibility preferences before React hydration (prevents FOUC)
const accessibilityScript = `
(function() {
  try {
    var prefs = JSON.parse(localStorage.getItem('fiziyo-accessibility'));
    if (prefs) {
      var root = document.documentElement;
      // Apply theme
      if (prefs.theme === 'light') {
        root.classList.add('light-theme');
      } else if (prefs.theme === 'dark') {
        root.classList.add('dark-theme');
      } else {
        // System preference
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.add(prefersDark ? 'dark-theme' : 'light-theme');
      }
      // Apply font size
      var sizes = { small: '14px', normal: '16px', large: '18px', xlarge: '20px' };
      if (sizes[prefs.fontSize]) {
        root.style.fontSize = sizes[prefs.fontSize];
        root.style.setProperty('--base-font-size', sizes[prefs.fontSize]);
      }
      // Apply high contrast
      if (prefs.highContrast) root.classList.add('high-contrast');
      // Apply reduced motion
      if (prefs.reducedMotion) root.classList.add('reduced-motion');
    }
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="pl" suppressHydrationWarning className={`${inter.variable}`}>
        <head>
          <script dangerouslySetInnerHTML={{ __html: accessibilityScript }} />
        </head>
        <body className="font-sans antialiased text-foreground bg-background selection:bg-primary/20 selection:text-primary">
          <AccessibilityProvider>
            <ApolloWrapper>{children}</ApolloWrapper>
          </AccessibilityProvider>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}

import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import { ApolloWrapper } from '@/lib/apollo/provider';
import { Toaster } from '@/components/ui/sonner';
import { ClerkProviderWithRedirects } from '@/components/auth/ClerkProviderWithRedirects';
import { AccessibilityProvider } from '@/contexts/AccessibilityContext';
import './globals.css';

const productionAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://portal.fiziyo.pl';
const developmentAppUrl =
  process.env.NEXT_PUBLIC_DEV_APP_URL ?? 'https://dev.portal.fiziyo.pl';
const allowClerkPreviewRedirects =
  process.env.NEXT_PUBLIC_ENABLE_CLERK_PREVIEW_REDIRECTS === 'true';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
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
      var sizes = { small: '16px', normal: '18px', large: '20px', xlarge: '22px' };
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
    <ClerkProviderWithRedirects
      productionAppUrl={productionAppUrl}
      developmentAppUrl={developmentAppUrl}
      allowPreviewRedirects={allowClerkPreviewRedirects}
    >
      <html lang="pl" suppressHydrationWarning className={jetbrainsMono.variable}>
        <head>
          <script dangerouslySetInnerHTML={{ __html: accessibilityScript }} />
        </head>
        <body className="font-sans antialiased text-foreground bg-background">
          <AccessibilityProvider>
            <ApolloWrapper>{children}</ApolloWrapper>
          </AccessibilityProvider>
          <Toaster />
        </body>
      </html>
    </ClerkProviderWithRedirects>
  );
}

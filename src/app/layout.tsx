import type { Metadata } from 'next';
import { Outfit, JetBrains_Mono } from 'next/font/google';
import { ApolloWrapper } from '@/lib/apollo/provider';
import { Toaster } from '@/components/ui/sonner';
import { ClerkProviderWithRedirects } from '@/components/auth/ClerkProviderWithRedirects';
import { AccessibilityProvider } from '@/contexts/AccessibilityContext';
import { DEFAULT_PREFERENCES, FONT_SIZE_VALUES, getAccessibilityScript } from '@/lib/accessibilityPreferences';
import { DesignVariantProvider } from '@/redesign/DesignVariantProvider';
import { DESIGN_PREFERENCE, getDesignVariantScript } from '@/redesign/preferences';
import './globals.css';

const productionAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://portal.fiziyo.pl';
const developmentAppUrl =
  process.env.NEXT_PUBLIC_DEV_APP_URL ?? 'https://dev.portal.fiziyo.pl';
const allowClerkPreviewRedirects =
  process.env.NEXT_PUBLIC_ENABLE_CLERK_PREVIEW_REDIRECTS === 'true';

const outfit = Outfit({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

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

const accessibilityScript = getAccessibilityScript();
const designVariantScript = getDesignVariantScript();

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
      <html
        lang="pl"
        suppressHydrationWarning
        data-fiziyo-design={DESIGN_PREFERENCE.defaultVariant}
        className={`light-theme ${outfit.variable} ${jetbrainsMono.variable}`}
        style={{ fontSize: FONT_SIZE_VALUES[DEFAULT_PREFERENCES.fontSize].css }}
      >
        <head>
          <script dangerouslySetInnerHTML={{ __html: accessibilityScript }} />
          {designVariantScript && <script dangerouslySetInnerHTML={{ __html: designVariantScript }} />}
        </head>
        <body className="font-sans antialiased text-foreground bg-background">
          <AccessibilityProvider>
            <DesignVariantProvider>
              <ApolloWrapper>{children}</ApolloWrapper>
              <Toaster />
            </DesignVariantProvider>
          </AccessibilityProvider>
        </body>
      </html>
    </ClerkProviderWithRedirects>
  );
}

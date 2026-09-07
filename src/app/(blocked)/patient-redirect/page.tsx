'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, LogOut, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { clearBackendToken } from '@/lib/tokenCache';

const IOS_APP_URL = 'https://apps.apple.com/app/fiziyo/id0000000000'; // TODO: Replace with production App Store URL.
const ANDROID_APP_URL = 'https://play.google.com/store/apps/details?id=pl.fiziyo.app'; // TODO: Replace with production Google Play URL.
const MOBILE_DOWNLOAD_URL = 'https://app.fiziyo.pl/download'; // TODO: Replace with canonical download landing URL.
const SUPPORT_MAILTO_URL = 'mailto:kontakt@fiziyo.pl?subject=Problem%20z%20logowaniem%20do%20panelu';

type DeviceType = 'ios' | 'android' | 'desktop';

function detectDeviceType(): DeviceType {
  if (typeof navigator === 'undefined') {
    return 'desktop';
  }

  const userAgent = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios';
  }

  if (/android/.test(userAgent)) {
    return 'android';
  }

  return 'desktop';
}

export default function PatientRedirectPage() {
  const router = useRouter();
  const { signOut } = useClerk();

  const deviceType = useMemo(() => detectDeviceType(), []);

  const handleSignOut = async () => {
    clearBackendToken();
    await signOut();
    router.replace('/login');
  };

  const showBothStoreButtons = deviceType === 'desktop';
  const showIosButton = showBothStoreButtons || deviceType === 'ios';
  const showAndroidButton = showBothStoreButtons || deviceType === 'android';

  return (
    <Card className="w-full border-border bg-surface">
      <CardHeader className="space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
          <Smartphone className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-2xl text-foreground">FiziYo na Twoim telefonie</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Konto pacjenta korzysta z aplikacji mobilnej. Otworz aplikacje, aby kontynuowac.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-3">
          {showIosButton && (
            <Button asChild className="w-full" data-testid="patient-redirect-ios-btn">
              <a data-testid="common-page-btn-70" href={IOS_APP_URL} target="_blank" rel="noreferrer">
                Otworz w App Store
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          )}
          {showAndroidButton && (
            <Button asChild className="w-full" variant="secondary" data-testid="patient-redirect-android-btn">
              <a data-testid="common-page-btn-78" href={ANDROID_APP_URL} target="_blank" rel="noreferrer">
                Otworz w Google Play
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          )}
        </div>

        {deviceType === 'desktop' && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-3 text-sm text-muted-foreground">Zeskanuj kod QR telefonem:</p>
            <div className="inline-flex rounded-lg bg-white p-2" data-testid="patient-redirect-qr">
              <QRCodeSVG value={MOBILE_DOWNLOAD_URL} size={160} />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Logujesz sie jako fizjoterapeuta?</p>
          <a
            href={SUPPORT_MAILTO_URL}
            className="text-sm font-medium text-primary hover:underline"
            data-testid="patient-redirect-support-link"
          >
            Skontaktuj sie z supportem
          </a>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleSignOut}
          data-testid="patient-redirect-signout-btn"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Wyloguj sie
        </Button>
      </CardContent>
    </Card>
  );
}

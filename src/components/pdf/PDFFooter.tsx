import { View, Text, Image } from '@react-pdf/renderer';
import { pdfStyles } from './styles';

interface PDFFooterProps {
  generatedAt: string;
  qrCodeDataUrl?: string;
  therapistName?: string;
}

/**
 * App Banner Footer - Wersja Marketingowa
 *
 * Strategia: Papier = DEMO, Aplikacja = PREMIUM
 * Podkreślamy to, czego papier NIE potrafi:
 * - Timer (nie musisz liczyć)
 * - Wideo (bezpieczeństwo)
 * - Historia (śledzenie postępów)
 */
export function PDFFooter({ generatedAt, qrCodeDataUrl, therapistName }: PDFFooterProps) {

  // WERSJA Z QR KODEM - APP PROMO BANNER
  if (qrCodeDataUrl) {
    return (
      <View style={pdfStyles.appBanner} fixed>
        {/* QR Code */}
        <View style={pdfStyles.appBannerQR}>
          <Image src={qrCodeDataUrl} style={pdfStyles.appBannerQRImage} />
        </View>

        {/* Marketing Content */}
        <View style={pdfStyles.appBannerContent}>
          {/* Tytuł */}
          <Text style={pdfStyles.appBannerTitle}>
            URUCHOM ASYSTENTA TRENINGU
          </Text>

          {/* Subtitle */}
          <Text style={pdfStyles.appBannerSubtitle}>
            Papier to tylko ściąga. Zeskanuj kod, aby pobrać bezpłatną aplikację
            i ćwiczyć bezpieczniej w domu.
          </Text>

          {/* Features - Co daje apka? (BEZ lektora i czatu!) */}
          <View style={pdfStyles.appBannerFeatures}>
            <Text style={pdfStyles.appBannerFeature}>• Timer (ćwicz bez liczenia w głowie)</Text>
            <Text style={pdfStyles.appBannerFeature}>• Wideo instruktażowe HD</Text>
            <Text style={pdfStyles.appBannerFeature}>• Śledzenie postępów i regularności</Text>
          </View>

          {/* Legal Note */}
          <Text style={pdfStyles.appBannerLegal}>
            Wygenerowano: {generatedAt} • Zatwierdził: {therapistName || 'Fizjoterapeuta'}
          </Text>
        </View>
      </View>
    );
  }

  // WERSJA BEZ QR (FALLBACK) - Prosta stopka
  return (
    <View style={pdfStyles.footer} fixed>
      <Text style={pdfStyles.footerText}>
        Dokument wygenerowano: {generatedAt}
        {therapistName && ` • ${therapistName}`}
      </Text>
      <Text style={pdfStyles.footerBrand}>
        FiziYo
      </Text>
    </View>
  );
}

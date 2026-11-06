import { View, Text, Image as PdfImage } from '@react-pdf/renderer';
import { pdfStyles } from './styles';

interface PDFFooterProps {
  generatedAt: string;
  qrCodeDataUrl?: string;
  therapistName?: string;
  joinUrl?: string;
}

/**
 * App Banner Footer: QR i link https; bez aplikacji strona /start prowadzi do sklepu.
 */
export function PDFFooter({ generatedAt, qrCodeDataUrl, therapistName, joinUrl }: PDFFooterProps) {
  if (qrCodeDataUrl) {
    return (
      <View style={pdfStyles.appBanner} fixed>
        <View style={pdfStyles.appBannerQR}>
          <PdfImage src={qrCodeDataUrl} style={pdfStyles.appBannerQRImage} />
        </View>

        <View style={pdfStyles.appBannerContent}>
          <Text style={pdfStyles.appBannerTitle}>OTWÓRZ PLAN W FIZIYO</Text>
          <Text style={pdfStyles.appBannerSubtitle}>
            Zeskanuj kod telefonem albo wpisz link, zainstaluj FiziYo i załóż konto na e-mail lub telefon podany w gabinecie.
          </Text>
          <View style={pdfStyles.appBannerFeatures}>
            <Text style={pdfStyles.appBannerFeature}>• Timer (ćwicz bez liczenia w głowie)</Text>
            <Text style={pdfStyles.appBannerFeature}>• Wideo instruktażowe HD</Text>
            <Text style={pdfStyles.appBannerFeature}>• Śledzenie postępów i regularności</Text>
          </View>
          {joinUrl ? <Text style={pdfStyles.appBannerJoinUrl}>{joinUrl}</Text> : null}
          <Text style={pdfStyles.appBannerLegal}>
            Wygenerowano: {generatedAt} • Zatwierdził: {therapistName || 'Fizjoterapeuta'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={pdfStyles.footer} fixed>
      <Text style={pdfStyles.footerText}>
        Dokument wygenerowano: {generatedAt}
        {therapistName && ` • ${therapistName}`}
        {joinUrl ? ` • ${joinUrl}` : ''}
      </Text>
      <Text style={pdfStyles.footerBrand}>FiziYo</Text>
    </View>
  );
}

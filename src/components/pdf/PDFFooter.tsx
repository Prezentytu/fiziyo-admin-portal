import { View, Text, Image as PdfImage } from '@react-pdf/renderer';
import { pdfStyles } from './styles';

interface PDFFooterProps {
  generatedAt: string;
  qrCodeDataUrl?: string;
  therapistName?: string;
  joinUrl?: string;
}

/**
 * App Banner Footer — QR + https join URL so a patient without the app can still open a browser.
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
            Zeskanuj kod albo wpisz link. Bez apki zobaczysz instrukcję; z apką — timer i wideo.
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

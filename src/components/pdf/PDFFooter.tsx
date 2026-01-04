import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from './styles';

interface PDFFooterProps {
  generatedAt: string;
}

export function PDFFooter({ generatedAt }: PDFFooterProps) {
  return (
    <View style={pdfStyles.footer} fixed>
      <Text style={pdfStyles.footerText}>
        Dokument wygenerowano: {generatedAt}
      </Text>
      <Text style={pdfStyles.footerBrand}>
        FiziYo - Twój asystent rehabilitacji
      </Text>
    </View>
  );
}

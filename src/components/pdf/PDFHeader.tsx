import { View, Text, Image } from '@react-pdf/renderer';
import { pdfStyles } from './styles';
import type { PDFOrganization } from './types';

interface PDFHeaderProps {
  organization: PDFOrganization;
  date: string;
}

/**
 * Clinical Letterhead Header
 * Logo po lewej, dane kontaktowe po prawej
 * Bez kolorowych teł - oszczędność tuszu
 */
export function PDFHeader({ organization, date }: PDFHeaderProps) {
  const initials = organization.name?.slice(0, 2).toUpperCase() || 'FZ';

  return (
    <View style={pdfStyles.header}>
      {/* LEWA STRONA: Logo + Nazwa */}
      <View style={pdfStyles.headerLeft}>
        {organization.logoUrl ? (
          <Image src={organization.logoUrl} style={pdfStyles.logo} />
        ) : (
          <View style={pdfStyles.logoPlaceholder}>
            <Text style={pdfStyles.logoPlaceholderText}>{initials}</Text>
          </View>
        )}
        <View style={pdfStyles.organizationInfo}>
          <Text style={pdfStyles.organizationName}>{organization.name}</Text>
          <Text style={pdfStyles.organizationSubtitle}>
            CENTRUM REHABILITACJI
          </Text>
        </View>
      </View>

      {/* PRAWA STRONA: Dane kontaktowe */}
      <View style={pdfStyles.headerRight}>
        {organization.address && (
          <Text style={pdfStyles.headerContact}>{organization.address}</Text>
        )}
        {organization.phone && (
          <Text style={pdfStyles.headerContact}>tel. {organization.phone}</Text>
        )}
        {organization.email && (
          <Text style={pdfStyles.headerContact}>{organization.email}</Text>
        )}
        {organization.website && (
          <Text style={pdfStyles.headerWebsite}>{organization.website}</Text>
        )}
        {!organization.website && !organization.email && !organization.phone && (
          <Text style={pdfStyles.headerContact}>{date}</Text>
        )}
      </View>
    </View>
  );
}

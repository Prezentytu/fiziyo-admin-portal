import { View, Text, Image } from '@react-pdf/renderer';
import { pdfStyles } from './styles';
import type { PDFOrganization } from './types';

interface PDFHeaderProps {
  organization: PDFOrganization;
  date: string;
}

export function PDFHeader({ organization, date }: PDFHeaderProps) {
  const initials = organization.name?.slice(0, 2).toUpperCase() || 'FZ';

  // Formatuj dane kontaktowe
  const contactParts: string[] = [];
  if (organization.address) contactParts.push(organization.address);
  if (organization.phone) contactParts.push(`tel. ${organization.phone}`);
  
  return (
    <View style={pdfStyles.header}>
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
          {contactParts.length > 0 && (
            <Text style={pdfStyles.organizationDetails}>
              {contactParts.join(' | ')}
            </Text>
          )}
          {organization.email && (
            <Text style={pdfStyles.organizationDetails}>{organization.email}</Text>
          )}
        </View>
      </View>
      <View style={pdfStyles.headerRight}>
        <Text style={pdfStyles.date}>{date}</Text>
      </View>
    </View>
  );
}

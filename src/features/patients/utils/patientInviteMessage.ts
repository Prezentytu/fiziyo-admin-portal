/**
 * Wiadomość z linkiem do aplikacji (QR z dialogu „Dostęp” i z karty sukcesu kreatora).
 * Konto pacjenta łączy się z kartą w gabinecie po e-mailu albo telefonie, więc wiadomość mówi, czym je założyć.
 */
export function patientInviteShareData({
  patientName,
  organizationName,
  joinUrl,
}: {
  patientName: string;
  organizationName?: string | null;
  joinUrl: string;
}): { title: string; text: string; url: string } {
  const clinic = organizationName?.trim() || 'Twój gabinet fizjoterapii';
  return {
    title: `FiziYo: plan ćwiczeń dla ${patientName}`,
    text: `${clinic} zaprasza do planu ćwiczeń w aplikacji FiziYo. Zainstaluj aplikację, załóż konto na e-mail albo numer telefonu podany w gabinecie i otwórz link.`,
    url: joinUrl,
  };
}

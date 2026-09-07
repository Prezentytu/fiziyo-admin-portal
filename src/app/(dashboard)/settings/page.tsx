import type { Metadata } from 'next';
import { SettingsPageView } from '@/components/settings/SettingsPageView';

export const metadata: Metadata = { title: 'Ustawienia' };

export default function Page() {
  return <SettingsPageView />;
}

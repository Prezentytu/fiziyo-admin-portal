import type { Metadata } from 'next';
import { OnboardingPage } from '@/components/onboarding/OnboardingPage';

export const metadata: Metadata = { title: 'Onboarding' };

export default function Page() {
  return <OnboardingPage />;
}

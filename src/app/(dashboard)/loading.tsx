import { DashboardRouteLoading } from '@/components/layout/DashboardRouteLoading';

/**
 * Globalny fallback dla wszystkich tras w (dashboard).
 * Pokazywany natychmiast przy wejściu/nawigacji, zanim załaduje się page.
 */
export default function DashboardLoading() {
  return <DashboardRouteLoading />;
}

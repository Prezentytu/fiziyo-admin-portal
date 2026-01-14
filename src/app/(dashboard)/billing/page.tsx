import { redirect } from "next/navigation";

/**
 * Redirect /billing to /finances
 * Billing page has been moved to /finances for better UX.
 */
export default function BillingPage() {
  redirect("/finances");
}

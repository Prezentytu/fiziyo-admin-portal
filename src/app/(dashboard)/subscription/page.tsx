import { redirect } from "next/navigation";

/**
 * Redirect /subscription to /billing
 * This page has been consolidated into /billing for better organization.
 */
export default function SubscriptionPage() {
  redirect("/billing");
}

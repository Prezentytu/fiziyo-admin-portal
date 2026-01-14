import { redirect } from "next/navigation";

/**
 * Redirect /subscription to /finances
 * This page has been consolidated into /finances for better organization.
 */
export default function SubscriptionPage() {
  redirect("/finances");
}

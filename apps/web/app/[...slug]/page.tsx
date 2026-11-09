import { cookies } from "next/headers";
import { actor, AppError } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { protectedCustomerRoutes } from "../../../../packages/business-rules/src/customer-navigation";
import Site from "@/components/site";
import { notFound, redirect } from "next/navigation";
const routes = [
  "gas-order",
  "policies",
  "refund",
  "cancellation",
  "service-terms",
  "warranty",
  "credit-terms",
  "loyalty-terms",
  "services",
  "bookings",
  "combined-checkout",
  "notifications",
  "recurring",
  "purchase-credit",
  "account-settings",
  "support",
  "consumption",
  "forgot-password",
  "reset-password",
  "verify-email",
  "accept-invitation",
  "products",
  "how-it-works",
  "about",
  "business",
  "help",
  "account",
  "login",
  "register",
  "cart",
  "checkout",
  "track",
  "orders",
  "wallet",
  "rewards",
  "schedules",
  "refill",
  "privacy",
  "terms",
  "delivery",
  "contact",
];
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  if (
    !routes.includes(slug[0]) ||
    slug.length > 2 ||
    (slug.length === 2 && !["products", "services"].includes(slug[0]))
  )
    notFound();
  let initialUser: any = null;
  if (
    [
      ...protectedCustomerRoutes,
      "/track",
      "/checkout",
      "/combined-checkout",
    ].includes("/" + slug[0])
  ) {
    try {
      const u = await actor(
        await getDb(),
        (await cookies()).get("easygas_session")?.value ?? null,
      );
      initialUser = {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        branchId: u.branch_id,
      };
    } catch (e) {
      if (e instanceof AppError && e.status === 401)
        redirect("/login?returnTo=" + encodeURIComponent("/" + slug[0]));
      throw e;
    }
  }
  return <Site initialUser={initialUser} />;
}

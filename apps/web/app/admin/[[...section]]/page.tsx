import Admin from "@/components/admin";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { dispatch } from "@/lib/service";
import { AppError } from "@/lib/auth";
import { navigationItems } from "../../../../../packages/business-rules/src/admin-navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section } = await params;
  const key = section?.[0] ?? "dashboard";
  if ((section?.length ?? 0) > 1 || !navigationItems.some((i) => i.id === key))
    notFound();
  let access: any;
  try {
    access = await dispatch(
      "navigation.access",
      (await cookies()).get("easygas_session")?.value ?? null,
    );
  } catch (error) {
    if (error instanceof AppError && error.status === 401) redirect("/login");
    if (error instanceof AppError && error.status === 403) notFound();
    throw error;
  }
  if (
    key === "dashboard" &&
    ["driver", "technician", "service_manager", "safety_officer"].includes(
      access.user.role,
    )
  )
    redirect(
      access.user.role === "driver" ? "/admin/deliveries" : "/admin/bookings",
    );
  if (!access.allowed.includes(key)) notFound();
  const initialCollapsed =
    (await cookies()).get(`easygas_nav_${access.user.id}`)?.value === "1";
  return (
    <Admin
      section={key}
      initialAccess={access}
      initialCollapsed={initialCollapsed}
    />
  );
}

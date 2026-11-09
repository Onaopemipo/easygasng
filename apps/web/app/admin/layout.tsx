import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { actor } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    const jar = await cookies();
    user = await actor(
      await getDb(),
      jar.get("easygas_session")?.value ?? null,
    );
  } catch {
    redirect("/login");
  }
  if (["customer", "commercial"].includes(user.role)) redirect("/account");
  return children;
}

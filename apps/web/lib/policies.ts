import { z } from "zod";
import { type SQL } from "./db";
import { allow, type Actor } from "./auth";
export const legalConfig = z
  .object({
    title: z.string().trim().min(3).max(150),
    content: z.string().max(20000),
    published: z.boolean(),
    effectiveAt: z.iso.datetime().nullable(),
  })
  .strict()
  .refine(
    (v) =>
      !v.published ||
      (v.content.trim().length >= 100 && v.effectiveAt !== null),
    "Published policies require reviewed content and an effective date.",
  );
export async function policyAction(
  tx: SQL,
  action: string,
  user: Actor | null,
  input: unknown,
): Promise<any> {
  if (action === "policies")
    return (
      await tx.query(
        "SELECT kind,title,content,version,effective_at FROM legal_documents WHERE published=true AND effective_at<=now() ORDER BY title",
      )
    ).rows;
  if (action === "policies.manage") {
    if (!user) return undefined;
    allow(user, ["owner", "administrator"]);
    return (await tx.query("SELECT * FROM legal_documents ORDER BY title"))
      .rows;
  }
  return undefined;
}

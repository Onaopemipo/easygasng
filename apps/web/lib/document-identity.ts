import { z } from "zod";
import { one, type SQL } from "./db";
const text = z
  .string()
  .trim()
  .min(1)
  .max(250)
  .refine((v) => !/[<>\u0000-\u001f]/.test(v), "Use plain text only.");
export const documentIdentitySchema = z
  .object({
    legalName: text,
    address: text,
    phone: z.string().regex(/^\+?[0-9 ()-]{7,30}$/),
    email: z.union([z.literal(""), z.email().max(150)]),
    website: z.union([
      z.literal(""),
      z
        .url()
        .max(200)
        .refine((v) => {
          const u = new URL(v);
          return (
            u.protocol === "https:" &&
            !u.username &&
            !u.password &&
            !u.search &&
            !u.hash
          );
        }, "Use the approved public HTTPS website."),
    ]),
    registrationNumber: z.union([z.literal(""), text]),
    taxId: z.union([z.literal(""), text]),
    verificationReference: text,
  })
  .strict();
export async function documentIdentity(tx: SQL, branch: string) {
  const approved = await one(
    tx,
    "SELECT value,version FROM settings WHERE key='document.identity' AND scope=$1",
    [branch],
  );
  const parsed = documentIdentitySchema.safeParse(approved?.value);
  if (parsed.success && Number(approved?.version) > 1) {
    const v = parsed.data;
    return {
      name: v.legalName,
      address: v.address,
      phone: v.phone,
      email: v.email,
      website: v.website,
      registrationNumber: v.registrationNumber,
      taxId: v.taxId,
      identityVersion: Number(approved!.version),
    };
  }
  const old = (
    await one(
      tx,
      "SELECT value FROM settings WHERE key='website.content' AND scope=$1",
      [branch],
    )
  )?.value;
  return {
    name: "EasyGas Energy Solutions",
    address: old?.address ?? "",
    phone: old?.phonePrimary ?? "",
    email: z.email().safeParse(old?.email).success ? old.email : "",
    identityWarning:
      "Optional legal identity has not been independently approved.",
  };
}
export const newDocumentTemplateVersion = () =>
  process.env.EASYGAS_DOCUMENT_TEMPLATE_V2 === "true" ? 2 : 1;

/** Customer-facing reports retain quoted prices and actual quantities; internal acquisition costs stay in canonical finance records. */
export function serviceDocument(body: any) {
  if (!body || typeof body !== "object") return body;
  return {
    ...body,
    ...(Array.isArray(body.materials)
      ? {
          materials: body.materials.map(
            ({ unit_cost_kobo, unitCostKobo, ...m }: any) => m,
          ),
        }
      : {}),
  };
}

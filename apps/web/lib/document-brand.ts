/** Trusted brand assets only. Never accept asset paths or HTML from message data. */
export const documentBrand = {
  green: "#07592e",
  lime: "#91c900",
  orange: "#ff7900",
  ink: "#10251c",
  logo: "/assets/easygas-logo-hd.png",
  logoCid: "easygas-brand-logo",
  tagline: "More Cooking. Less Worry.",
} as const;

export function escapeMailHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}

/** Text remains the source of truth; only HTTPS links become clickable. */
export function brandedMailHtml(subject: string, body: string): string {
  const content = body
    .split(/(https:\/\/[^\s<>"']+)/g)
    .map((part) => {
      const safe = escapeMailHtml(part);
      return part.startsWith("https://")
        ? `<a href="${safe}" style="color:${documentBrand.green};text-decoration:underline;overflow-wrap:anywhere">${safe}</a>`
        : safe;
    })
    .join("")
    .replace(/\r?\n/g, "<br>");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeMailHtml(subject)}</title></head><body style="margin:0;background:#f2f8f1;color:#10251c;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #e5ebe6;border-radius:12px"><tr><td style="padding:28px 28px 20px;border-top:6px solid #07592e"><img src="cid:${documentBrand.logoCid}" width="240" height="80" alt="EasyGas Energy Solutions" style="display:block;width:240px;max-width:100%;height:auto"><p style="margin:12px 0 0;color:#07592e;font-size:15px">${documentBrand.tagline}</p></td></tr><tr><td style="padding:0 28px"><div style="height:4px;background:#91c900;border-right:60px solid #ff7900"></div></td></tr><tr><td style="padding:28px;font-size:16px;line-height:1.65;overflow-wrap:anywhere"><h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;color:#07592e">${escapeMailHtml(subject)}</h1>${content}</td></tr><tr><td style="padding:20px 28px;background:#f2f8f1;color:#43594c;font-size:15px;line-height:1.5">EasyGas Energy Solutions<br>Affordable · Flexible · Committed</td></tr></table></td></tr></table></body></html>`;
}

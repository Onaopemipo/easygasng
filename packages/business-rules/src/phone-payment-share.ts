export function phonePaymentShareLinks(link: {
  url: string;
  recipient?: { phone?: string; email?: string | null };
}) {
  const message =
    "Complete your EasyGas order: confirm your delivery details and pay securely. " +
    link.url;
  const phone = (link.recipient?.phone ?? "")
    .replace(/[^0-9]/g, "")
    .replace(/^0(?=[789][01]\d{8}$)/, "234");
  const email = link.recipient?.email;
  return {
    whatsapp: /^234[789][01]\d{8}$/.test(phone)
      ? "https://wa.me/" + phone + "?text=" + encodeURIComponent(message)
      : null,
    email:
      email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !/[\r\n]/.test(email)
        ? "mailto:" +
          encodeURIComponent(email) +
          "?subject=" +
          encodeURIComponent("Your EasyGas order payment link") +
          "&body=" +
          encodeURIComponent(message)
        : null,
  };
}

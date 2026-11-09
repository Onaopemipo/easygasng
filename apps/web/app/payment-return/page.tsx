import { PaymentReturn } from "../../components/hosted-payment";
export const metadata = {
  title: "Verify payment",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function Page() {
  return <PaymentReturn />;
}

import { AppDialogProvider } from "../components/app-dialog";
import { ThemeProvider } from "../components/theme-provider";
import { themeBootstrapFor } from "../../../packages/business-rules/src/theme";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./theme.css";
import "./product-ui.css";
import "./homepage.css";
import "./gas-order.css";
import "./service-details.css";
import "./easyrewards.css";


export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };
export const metadata: Metadata = {
  ...(process.env.EASYGAS_CLIENT_DEMO === "true"
    ? { robots: { index: false, follow: false } }
    : {}),
  title: {
    default: "EasyGas Energy Solutions | More Cooking, Less Worry.",
    template: "%s | EasyGas",
  },
  description:
    "Cooking gas, cylinders and kitchen essentials. A simpler way to keep your kitchen cooking with EasyGas Energy Solutions.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const themeEnabled = process.env.EASYGAS_DARK_MODE !== "false";
  return (
    <html lang="en-NG" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeBootstrapFor(themeEnabled) }}
        />
      </head>
      <body>
        {process.env.EASYGAS_CLIENT_DEMO === "true" && (
          <aside
            role="note"
            className="client-demo-notice"
            style={{
              position: "fixed",
              bottom: 8,
              left: 8,
              right: 8,
              zIndex: 1000,
              pointerEvents: "none",
              textAlign: "center",
              padding: "6px 12px",
              background: "#fff3cd",
              color: "#513b00",
              border: "1px solid #e3bd55",
              borderRadius: 8,
              fontSize: 15,
              boxShadow: "0 2px 8px #0002",
            }}
          >
            Client demo · Synthetic test data · No real orders, payments or
            messages
          </aside>
        )}
        <ThemeProvider enabled={themeEnabled}>{children}<AppDialogProvider /></ThemeProvider>
      </body>
    </html>
  );
}

import { documentMoney as money } from "../../packages/business-rules/src/financial-document";
import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { randomUUID } from "expo-crypto";
import {
  Title,
  Card,
  Copy,
  Button,
  Feedback,
  useRemote,
  type CustomerAPI,
} from "./CustomerUI";
import { lagosDay } from "../../packages/business-rules/src/customer-mobile";
import { Text } from "./typography";
import { useTheme } from "./theme";
import { NativeHostedPayment } from "./HostedPayment";
export default function Invoices({
  api,
  origin,
  token,
  userId,
}: {
  api: CustomerAPI;
  origin: string;
  token: string | null;
  userId: string;
}) {
  const { colors } = useTheme();
  const r = useRemote(api, "customer.dashboard", { widget: "invoices" });
  const [receiptPage, setReceiptPage] = useState(1);
  const receipts = useRemote(api, "documents.list", {
    type: "receipt",
    page: String(receiptPage),
  });
  const [selected, setSelected] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState("invoices");
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, [userId]);
  async function download() {
    if (!selected || !token || !FileSystem.cacheDirectory) return;
    setBusy(true);
    setError("");
    const path =
      FileSystem.cacheDirectory + "financial-document-" + randomUUID() + ".pdf";
    try {
      if (!(await Sharing.isAvailableAsync()))
        throw new Error("Sharing unavailable");
      const response = await FileSystem.downloadAsync(
        origin +
          (selected.receipt
            ? selected.downloadUrl
            : "/api/invoices/" +
              encodeURIComponent(selected.booking_id ?? selected.order_id) +
              (selected.booking_id ? "?source=service" : "")),
        path,
        { headers: { Authorization: "Bearer " + token } },
      );
      const mime =
        Object.entries(response.headers ?? {}).find(
          ([k]) => k.toLowerCase() === "content-type",
        )?.[1] ?? "";
      if (
        response.status !== 200 ||
        !mime.toLowerCase().startsWith("application/pdf")
      )
        throw new Error("Document unavailable");
      if (active.current)
        await Sharing.shareAsync(path, {
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
          dialogTitle: selected.receipt
            ? "Save or share payment receipt"
            : "Save or share your invoice",
        });
    } catch {
      if (active.current)
        setError(
          "The private document could not be downloaded or shared. Please try again.",
        );
    } finally {
      await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
      if (active.current) setBusy(false);
    }
  }
  return (
    <View style={{ gap: 14 }}>
      <Title>Invoices & Receipts</Title>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button
          label="Invoices"
          secondary={tab !== "invoices"}
          onPress={() => setTab("invoices")}
        />
        <Button
          label="Receipts"
          secondary={tab !== "receipts"}
          onPress={() => setTab("receipts")}
        />
      </View>
      <Feedback
        loading={r.loading}
        error={r.error || error}
        retry={() => {
          setError("");
          r.reload();
          receipts.reload();
        }}
      />
      {tab === "receipts" ? (
        <View style={{ gap: 12 }}>
          <Feedback
            loading={receipts.loading}
            error={receipts.error}
            retry={receipts.reload}
          />
          <Copy>
            Payment receipts come only from verified Paystack postings. Sandbox
            documents do not represent live funds. Manual credits and POS
            records remain in their existing histories.
          </Copy>
          {receipts.data?.rows?.length === 0 && (
            <Card>
              <Copy>No verified payment receipts.</Copy>
            </Card>
          )}
          {receipts.data?.rows?.map((row: any) => (
            <Card key={row.id}>
              <Title>{row.number}</Title>
              <Copy>
                {row.model.issuedAt} · {row.model.status}
              </Copy>
              <Copy>SANDBOX — NO LIVE FUNDS</Copy>
              <Button
                label="View payment receipt"
                secondary
                onPress={() => {
                  setError("");
                  setSelected({
                    receipt: true,
                    downloadUrl: row.downloadUrl,
                    model: row.model,
                  });
                }}
              />
            </Card>
          ))}
          <Button
            label="Previous receipt page"
            secondary
            disabled={receiptPage <= 1}
            onPress={() => setReceiptPage((p) => p - 1)}
          />
          <Button
            label="Next receipt page"
            secondary
            disabled={!receipts.data || receiptPage * 20 >= receipts.data.total}
            onPress={() => setReceiptPage((p) => p + 1)}
          />
        </View>
      ) : (
        <>
          {r.data?.length === 0 && (
            <Card>
              <Copy>
                No issued invoices yet. Your order history remains available in
                Orders.
              </Copy>
            </Card>
          )}
          {r.data?.map((row: any) => (
            <Card key={row.booking_id ?? row.order_id}>
              <Text
                preserveColor
                style={{ color: colors.text, fontWeight: "800" }}
              >
                {row.invoice_number}
              </Text>
              <Copy>
                {lagosDay(row.issued_at)} ·{" "}
                {row.booking_id ? "Service" : "Order"} {row.reference}
              </Copy>
              <Copy>
                Issued total {money(row.total_kobo)} · Open for current
                adjustments and balance
              </Copy>
              <Button
                label="View invoice"
                secondary
                disabled={busy}
                onPress={async () => {
                  setBusy(true);
                  setError("");
                  setSelected(null);
                  try {
                    const result = await api(
                      row.booking_id ? "invoice.service" : "invoice.order",
                      {
                        [row.booking_id ? "bookingId" : "orderId"]:
                          row.booking_id ?? row.order_id,
                      },
                    );
                    if (active.current) {
                      if (!result.invoice) throw new Error("Unavailable");
                      setSelected(result.invoice);
                    }
                  } catch {
                    if (active.current)
                      setError(
                        "This invoice is unavailable. Try again or contact support.",
                      );
                  } finally {
                    if (active.current) setBusy(false);
                  }
                }}
              />
            </Card>
          ))}
        </>
      )}
      {selected?.receipt && (
        <Card accent>
          <Title>Payment Receipt</Title>
          <Copy>{selected.model.number}</Copy>
          <Copy>SANDBOX — NO LIVE FUNDS · {selected.model.status}</Copy>
          {selected.model.lines.map((l: any, i: number) => (
            <Copy key={i}>
              {l.label}: {money(l.amountKobo)}
            </Copy>
          ))}
          {selected.model.totals.map((t: any, i: number) => (
            <Copy key={i}>
              {t.label}: {money(t.amountKobo)}
            </Copy>
          ))}
          {selected.model.notices.map((n: string, i: number) => (
            <Copy key={i}>{n}</Copy>
          ))}
          <Button
            label="Download / share receipt PDF"
            disabled={busy}
            onPress={download}
          />
        </Card>
      )}
      {selected && !selected.receipt && (
        <Card accent>
          <Title>{selected.invoice_number}</Title>
          <Copy>{selected.status.replaceAll("_", " ")}</Copy>
          <Copy>
            Effective total:{" "}
            {money(selected.effectiveTotalKobo ?? selected.total_kobo)}
          </Copy>
          <Copy>Verified paid: {money(selected.paidKobo)}</Copy>
          <Copy>
            Amount due:{" "}
            {selected.amountDueKobo === null
              ? "Finance reconciliation required"
              : money(selected.amountDueKobo)}
          </Copy>
          {!selected.booking_id && selected.amountDueKobo > 0 && (
            <NativeHostedPayment
              api={api}
              userId={userId}
              purpose="invoice"
              invoiceId={selected.id}
            />
          )}
          <Button
            label="Download / share invoice PDF"
            disabled={busy}
            onPress={download}
          />
        </Card>
      )}
      <Button
        label="Refresh documents"
        secondary
        onPress={() => {
          setSelected(null);
          setError("");
          r.reload();
          receipts.reload();
        }}
      />
    </View>
  );
}

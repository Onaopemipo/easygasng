import React, { useState } from "react";
import { View, Pressable } from "react-native";
import {
  NextIntro,
  NextText,
  NextCard,
  NextStatus,
  NextIcon,
  NextList,
  NextRow,
  NextEmpty,
  NextButton,
  NextField,
} from "./MobileNextUI";
import { useTheme } from "./theme";
import { type CustomerAPI, money } from "./CustomerUI";
import { ContextSheet } from "./ContextSheet";
import CustomerOrderRefunds from "./CustomerOrderRefunds";
import { NativeHostedPayment } from "./HostedPayment";
import TrackingSummary from "./TrackingSummary";
import OrderVisit from "./OrderVisit";
import {
  ownsCustomerOrder,
  canRequestOrderRefund,
} from "../../packages/business-rules/src/native-order-authority";
import { customerOrderStage } from "../../packages/business-rules/src/customer-orders";
import { NativeForm } from "./Workflows";
export default function MobileNextOrders({
  orders,
  user,
  selectedId,
  onSelect,
  api,
  origin,
  token,
  navigate,
  reload,
  onRepeat,
}: {
  orders: any[];
  user: any;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  api: CustomerAPI;
  origin: string;
  token: string | null;
  navigate: (screen: string) => void;
  reload: () => void;
  onRepeat?: (draft:any) => void | Promise<void>;
}) {
  const [repeatBusy,setRepeatBusy] = useState(false), [repeatError,setRepeatError] = useState("");
  async function repeatOrder(order:any) {
    if (repeatBusy || !onRepeat) return;
    setRepeatBusy(true); setRepeatError("");
    try {await onRepeat(await api("account.repeat-order",{orderId:order.id}));} catch(e:any) {setRepeatError(e.message);} finally {setRepeatBusy(false);}
  }
  const { colors } = useTheme(),
    [query, setQuery] = useState(""),
    [sheet, setSheet] = useState<string | null>(null);
  const own = orders.filter((o) => ownsCustomerOrder(user, o)),
    order = selectedId ? own.find((o) => o.id === selectedId) : null;
  if (selectedId && !order)
    return (
      <NextEmpty
        title="This order is unavailable"
        detail="It may have changed or belong to another account."
        action={
          <NextButton label="View my orders" onPress={() => onSelect(null)} />
        }
      />
    );
  if (!order)
    return (
      <View style={{ gap: 17 }}>
        <NextIntro
          title={"Every refill.\nAll in one place."}
          detail="Confirmed status, payment and next steps."
        />
        <NextField
          label="Search orders"
          value={query}
          onChange={setQuery}
          placeholder="Order reference or item"
        />
        {own
          .filter((o) =>
            (o.reference + " " + JSON.stringify(o.items || []))
              .toLowerCase()
              .includes(query.toLowerCase()),
          )
          .map((o) => (
            <Pressable
              key={o.id}
              accessibilityRole="button"
              accessibilityLabel={"Open order " + o.reference}
              onPress={() => onSelect(o.id)}
            >
              <NextCard>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <NextIcon name="flame" />
                  <NextStatus value={customerOrderStage(o)} />
                </View>
                <NextText kind="heading">
                  {o.gas_lines?.length
                    ? "Cooking gas refill"
                    : "Essentials order"}
                </NextText>
                <NextText kind="small" style={{ color: colors.muted }}>
                  {o.reference}
                </NextText>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <NextText kind="label">{money(o.total_kobo)}</NextText>
                  <NextText kind="small" style={{ color: colors.muted }}>
                    {o.payment_status?.replaceAll("_", " ")}
                  </NextText>
                </View>
              </NextCard>
            </Pressable>
          ))}
        {!own.length && (
          <NextEmpty
            title="No orders yet"
            detail="Place your first refill and follow it from here."
            action={
              <NextButton
                label="Order gas"
                onPress={() => navigate("gas-order")}
              />
            }
          />
        )}
      </View>
    );
  const paid = order.payment_status === "verified",
    canPay =
      order.payment_method === "card" &&
      !paid &&
      !["cancelled", "delivered"].includes(order.status);
  return (
    <View style={{ gap: 20 }}>
      <NextIntro
        eyebrow={order.reference}
        title={
          order.status === "delivered"
            ? "Delivered, with care."
            : order.status === "cancelled"
              ? "Your order was cancelled."
              : customerOrderStage(order) + "."
        }
      />
      <NextStatus value={customerOrderStage(order)} />
      <NextCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <NextText>Order amount</NextText>
          <NextText kind="label">{money(order.total_kobo)}</NextText>
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <NextText>Payment</NextText>
          <NextStatus value={order.payment_status} />
        </View>
        <NextText style={{ color: colors.muted }}>
          {order.address?.street}
          {"\n"}
          {order.address?.zone}
        </NextText>
        {order.confirmation_code &&
          !["cancelled", "delivered"].includes(order.status) && (
            <NextText kind="small">
              Delivery code: {order.confirmation_code}. Share it only after
              receiving all your items.
            </NextText>
          )}
      </NextCard>
      <TrackingSummary
        order={order}
        onSupport={() => navigate("conversations")}
        compact
      />
      {repeatError ? <NextText>{repeatError}</NextText> : null}
      <NextList>
        {onRepeat && ["delivered","cancelled"].includes(order.status) && <NextRow title={repeatBusy?"Preparing checkout…":"Order again"} detail="Review current prices, delivery details and payment" icon="refresh-cw" onPress={()=>repeatOrder(order)} />}
        {canPay && (
          <NextRow
            title="Continue saved payment"
            detail="Check this order’s existing payment attempt"
            icon="credit-card"
            onPress={() => setSheet("payment")}
          />
        )}
        <NextRow
          title="Invoice & payment history"
          icon="receipt"
          onPress={() => navigate("invoices")}
        />
        <NextRow
          title="Visit changes, photos & items"
          icon="package"
          onPress={() => setSheet("visit")}
        />
        <NextRow
          title="Get help with this order"
          icon="message-circle"
          onPress={() => navigate("conversations")}
        />
        {!["cancelled", "delivered", "delivery_failed"].includes(
          order.status,
        ) && (
          <NextRow
            title="Request cancellation"
            icon="message-circle"
            detail="Ask support to review this order"
            onPress={() => setSheet("cancel")}
          />
        )}
        {canRequestOrderRefund(user, order) && (
          <NextRow
            title="Request a refund"
            icon="wallet"
            onPress={() => setSheet("refund")}
          />
        )}
        <NextRow
          title="View all orders"
          icon="layers"
          onPress={() => onSelect(null)}
        />
      </NextList>
      {sheet && (
        <ContextSheet
          title={
            sheet === "payment"
              ? "Secure payment"
              : sheet === "refund"
                ? "Refund request"
                : sheet === "cancel"
                  ? "Cancellation request"
                  : "Delivery visit"
          }
          onClose={() => setSheet(null)}
        >
          {sheet === "payment" ? (
            <NativeHostedPayment
              api={api}
              userId={user.id}
              purpose="order"
              orderId={order.id}
              autoReview
              onPaid={() => {
                setSheet(null);
                reload();
              }}
            />
          ) : sheet === "cancel" ? (
            <>
              <NextText>
                Support will review your request. Your order remains active
                until EasyGas confirms cancellation.
              </NextText>
              <NativeForm
                api={api}
                action="support.create"
                title="Request cancellation"
                fields={[
                  {
                    name: "orderId",
                    label: "",
                    type: "hidden",
                    value: order.id,
                  },
                  {
                    name: "subject",
                    label: "Subject",
                    value: "Cancellation request · " + order.reference,
                  },
                  { name: "message", label: "Reason for cancellation" },
                ]}
                onDone={reload}
              />
            </>
          ) : sheet === "refund" ? (
            <CustomerOrderRefunds api={api} user={user} order={order} />
          ) : (
            <OrderVisit
              api={api}
              order={order}
              driver={false}
              user={user}
              origin={origin}
              token={token}
              onDone={reload}
            />
          )}
        </ContextSheet>
      )}
    </View>
  );
}

import React from "react";
import { canRequestOrderRefund } from "../../packages/business-rules/src/native-order-authority";
import { NativePartialRefund } from "./EasyRewards";
import { NativeForm } from "./Workflows";

export default function CustomerOrderRefunds({
  api,
  user,
  order,
}: {
  api: (action: string, input?: any) => Promise<any>;
  user: { id: string; role: string };
  order: {
    id: string;
    customer_id?: string;
    status: string;
    payment_status: string;
  };
}) {
  if (!canRequestOrderRefund(user, order)) return null;
  return (
    <>
      <NativePartialRefund
        key={`${user.id}:${order.id}`}
        api={api}
        orderId={order.id}
      />
      <NativeForm
        api={api}
        action="refund.request"
        title="Request refund as purchase credit"
        fields={[
          { name: "orderId", label: "", type: "hidden", value: order.id },
          { name: "reason", label: "Reason (at least 10 characters)" },
          {
            name: "acceptWalletCredit",
            required: true,
            label: "I agree to receive an approved refund as purchase credit",
            type: "checkbox",
          },
        ]}
      />
    </>
  );
}

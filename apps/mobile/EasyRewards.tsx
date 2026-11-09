import React, { useState, useEffect } from "react";
import {
  
  
  ActivityIndicator,
  Share,
  useColorScheme,
} from "react-native";
import { View, Pressable } from "./surfaces";
import { Text as BaseText, TextInput as BaseInput } from "./typography";
function Text(props: React.ComponentProps<typeof BaseText>) {
  const dark = useColorScheme() === "dark";
  return (
    <BaseText
      {...props}
      style={[{ color: dark ? "#e9f5ed" : "#102d21" }, props.style]}
    />
  );
}
function TextInput(props: React.ComponentProps<typeof BaseInput>) {
  const dark = useColorScheme() === "dark";
  return (
    <BaseInput
      {...props}
      style={[
        {
          color: dark ? "#e9f5ed" : "#102d21",
          backgroundColor: dark ? "#102f24" : "#fff",
          padding: 12,
          borderWidth: 1,
          borderColor: "#8eb09b",
          borderRadius: 8,
        },
        props.style,
      ]}
    />
  );
}
import { randomUUID } from "expo-crypto";
type API = (action: string, input?: any) => Promise<any>;
const card = {
  padding: 16,
  borderWidth: 1,
  borderColor: "#8eb09b",
  borderRadius: 14,
  marginBottom: 12,
};
export function NativeEasyRewards({
  api,
  onOffer,
  onOrder,
}: {
  onOrder?: (id: string) => void;
  api: API;
  onOffer: (offer: any) => void;
}) {
  const dark = useColorScheme() === "dark";
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0),
    [code, setCode] = useState(""),
    [referral, setReferral] = useState<any>(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    setError("");
    setData(null);
    api("rewards.summary")
      .then((r) => {
        if (live) setData(r);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [version]);
  const button = (title: string, fn: () => void) => (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      style={card}
      onPress={fn}
    >
      <Text>{title}</Text>
    </Pressable>
  );
  if (error)
    return (
      <View style={{ backgroundColor: dark ? "#071d16" : "#fff", padding: 12 }}>
        <Text accessibilityRole="alert">{error}</Text>
        {button("Retry rewards", () => setVersion((v) => v + 1))}
      </View>
    );
  if (!data) return <ActivityIndicator accessibilityLabel="Loading rewards" />;
  return (
    <View
      style={{
        backgroundColor: dark ? "#071d16" : "#fff",
        padding: 12,
        borderRadius: 12,
      }}
    >
      <Text accessibilityRole="header">
        EasyRewards · {data.availablePoints} available points
      </Text>
      <Text>
        Points are separate from purchase credit.{" "}
        {data.earningEnabled
          ? "Earning is enabled for eligible verified, fulfilled purchases."
          : "Earning is disabled; history is preserved."}
      </Text>
      {data.restricted && (
        <Text accessibilityRole="alert">
          Point spending is restricted pending finance review.
        </Text>
      )}
      <Text>{data.pendingAwards} award events await processing.</Text>
      <Text>
        {data.policy
          ? `Approved policy ${data.policy.version}; minimum ${data.policy.minimumPoints} points; maximum ${data.policy.maximumDiscountBps / 100}% of eligible product spend.`
          : "No approved policy."}
      </Text>
      <Text accessibilityRole="header">Reward offers</Text>
      {data.catalogue.length ? (
        data.catalogue.map((o: any) => (
          <View key={o.id} style={card}>
            <Text>
              {o.title} · {o.points} points
            </Text>
            <Text>
              {o.description} · expires{" "}
              {new Date(o.expiresAt).toLocaleDateString()}
            </Text>
            {button("Choose products for this offer", () => onOffer(o))}
          </View>
        ))
      ) : (
        <Text>No approved eligible offers are available.</Text>
      )}
      <Text accessibilityRole="header">Referral programme</Text>
      {data.policy?.referralEnabled && data.earningEnabled ? (
        <View>
          {button("Get my referral code", async () => {
            setBusy(true);
            try {
              setReferral(await api("rewards.referral", {}));
            } catch (e: any) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          })}
          {referral && <Text selectable>{referral.code}</Text>}
          {referral?.shareUrl &&
            button("Share referral link", () => {
              Share.share({ message: referral.shareUrl });
            })}
          <Text>
            Enter a referral before your first purchase. No reward is earned
            until verified fulfilment.
          </Text>
          <TextInput
            accessibilityLabel="Referral code received"
            value={code}
            onChangeText={setCode}
            maxLength={32}
          />
          {button("Apply referral code", async () => {
            setBusy(true);
            try {
              await api("rewards.referral.attribute", { code });
              setCode("");
              setVersion((v) => v + 1);
            } catch (e: any) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          })}
        </View>
      ) : (
        <Text>Referral bonuses are disabled.</Text>
      )}
      <Text accessibilityRole="header">Points history</Text>
      {data.entries.length ? (
        data.entries.map((e: any) => (
          <View style={card} key={e.id}>
            <Text>
              {e.points} points · {e.kind ?? "Historical transaction"} ·{" "}
              {new Date(e.created_at).toLocaleDateString()}
            </Text>
            <Text>{e.order_reference ?? ""}</Text>
          </View>
        ))
      ) : (
        <Text>No points transactions yet.</Text>
      )}
      {button("Refresh history", () => setVersion((v) => v + 1))}
    </View>
  );
}
export function NativePartialRefund({
  api,
  orderId,
}: {
  api: API;
  orderId: string;
}) {
  const dark = useColorScheme() === "dark";
  const [lines, setLines] = useState<any[]>([]),
    [quantities, setQuantities] = useState<Record<string, string>>({}),
    [reason, setReason] = useState(""),
    [message, setMessage] = useState(""),
    [key, setKey] = useState(randomUUID),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    api("refund.lines?orderId=" + encodeURIComponent(orderId))
      .then((r) => {
        if (live) setLines(r);
      })
      .catch((e) => {
        if (live) setMessage(e.message);
      });
    return () => {
      live = false;
    };
  }, [orderId]);
  return (
    <View style={[card, { backgroundColor: dark ? "#071d16" : "#fff" }]}>
      <Text accessibilityRole="header">Refund selected quantities</Text>
      <Text>
        If approved, refund is purchase credit. This does not record a physical
        cylinder return.
      </Text>
      {lines.map((l) => (
        <View key={l.source}>
          <Text>
            {l.source} · {l.remaining} remaining{" "}
            {l.source.startsWith("gas:") ? "grams" : "units"}
          </Text>
          <TextInput
            accessibilityLabel={"Refund quantity " + l.source}
            keyboardType="numeric"
            value={quantities[l.source] ?? ""}
            onChangeText={(v) => {
              setQuantities({ ...quantities, [l.source]: v });
              setKey(randomUUID());
            }}
          />
        </View>
      ))}
      <TextInput
        accessibilityLabel="Refund reason"
        value={reason}
        onChangeText={(v) => {
          setReason(v);
          setKey(randomUUID());
        }}
      />
      <Pressable
        accessibilityRole="button"
        disabled={busy || reason.trim().length < 10}
        onPress={async () => {
          setBusy(true);
          try {
            await api("refund.request", {
              orderId,
              reason,
              lines: Object.entries(quantities)
                .filter(([, q]) => Number(q) > 0)
                .map(([source, q]) => ({ source, quantity: Number(q) })),
              acceptWalletCredit: true,
              idempotencyKey: key,
            });
            setMessage("Request awaiting independent finance review.");
          } catch (e: any) {
            setMessage(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Text>Request selected refund as purchase credit</Text>
      </Pressable>
      {message && <Text accessibilityRole="alert">{message}</Text>}
    </View>
  );
}

export function NativeSmartOffers({
  api,
  onOffer,
}: {
  api: API;
  onOffer: (o: any) => void;
}) {
  const [offers, setOffers] = useState<any[]>([]),
    [error, setError] = useState("");
  const dark = useColorScheme() === "dark";
  useEffect(() => {
    let live = true;
    api("rewards.smart-offers")
      .then((o) => {
        if (live) setOffers(o);
      })
      .catch(() => {
        if (live)
          setError(
            "Refill reward offers are unavailable; your plan is unchanged.",
          );
      });
    return () => {
      live = false;
    };
  }, []);
  return (
    <View style={[card, { backgroundColor: dark ? "#071d16" : "#fff" }]}>
      <Text accessibilityRole="header">Smart Refill offers</Text>
      {error ? (
        <Text accessibilityRole="alert">{error}</Text>
      ) : offers.length ? (
        offers.map((o) => (
          <Pressable
            accessibilityRole="button"
            key={o.id}
            style={card}
            onPress={() => onOffer(o)}
          >
            <Text>
              {o.title} · {o.points} points · expires{" "}
              {new Date(o.expiresAt).toLocaleDateString()}
            </Text>
          </Pressable>
        ))
      ) : (
        <Text>
          No approved offer matches your verified refill profile and consent.
        </Text>
      )}
    </View>
  );
}

export function NativeRewardSelector({
  api,
  onChange,
  initialValue = {},
}: {
  api: API;
  onChange: (value: any) => void;
  initialValue?: any;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [points, setPoints] = useState(String(initialValue.rewardPoints ?? "")),
    [offer, setOffer] = useState(initialValue.rewardOfferId ?? "");
  const dark = useColorScheme() === "dark";
  useEffect(() => {
    let live = true;
    api("rewards.summary")
      .then((r) => {
        if (live) setData(r);
      })
      .catch(() => {
        if (live)
          setError(
            "Reward discounts unavailable. Continue without points or reload.",
          );
      });
    return () => {
      live = false;
    };
  }, []);
  if (error) return <Text accessibilityRole="alert">{error}</Text>;
  if (!data)
    return (
      <ActivityIndicator accessibilityLabel="Checking reward availability" />
    );
  if (!data.redemptionEnabled)
    return (
      <Text>Reward discounts are disabled. History remains available.</Text>
    );
  return (
    <View style={[card, { backgroundColor: dark ? "#071d16" : "#fff" }]}>
      <Text>
        {data.availablePoints} available points. Minimum{" "}
        {data.policy.minimumPoints}; eligible subtotal cap{" "}
        {data.policy.maximumDiscountBps / 100}%. Delivery fees excluded.
      </Text>
      {data.catalogue.map((o: any) => (
        <Pressable
          accessibilityRole="button"
          key={o.id}
          style={card}
          onPress={() => {
            setOffer(o.id);
            setPoints(String(o.points));
            onChange({ rewardPoints: o.points, rewardOfferId: o.id });
          }}
        >
          <Text>
            {offer === o.id ? "Selected: " : ""}
            {o.title} · {o.points} points
          </Text>
        </Pressable>
      ))}
      <TextInput
        accessibilityLabel="Reward points to use"
        keyboardType="numeric"
        value={points}
        onChangeText={(v) => {
          setPoints(v);
          setOffer("");
          onChange(v ? { rewardPoints: Number(v) } : {});
        }}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setPoints("");
          setOffer("");
          onChange({});
        }}
      >
        <Text>Keep my points</Text>
      </Pressable>
    </View>
  );
}

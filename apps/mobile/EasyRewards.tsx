import { selectedRefundLines } from "../../packages/business-rules/src/native-order-authority";
import { friendlyMessage } from "../../packages/business-rules/src/friendly-message";
import { EasyGasLoader } from "./EasyGasLoader";
import React, { useState, useEffect, useRef } from "react";
import { AppState, Share, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { gasMoney } from "../../packages/business-rules/src/gas-pricing";
import { lagosDay } from "../../packages/business-rules/src/customer-mobile";
import {
  canSelectReward,
  formatRewardCount,
  rewardCapabilities,
  rewardDateTime,
  rewardDelta,
  rewardEntryTitle,
  type RewardOffer,
  type RewardsSummary,
} from "../../packages/business-rules/src/rewards-overview";
import { Button, Card, Copy, Feedback, Title } from "./CustomerUI";
import { ContextSheet } from "./ContextSheet";
import { useTheme } from "./theme";
import { View, Pressable } from "./surfaces";
import { FieldCaption, Text as BaseText, TextInput as BaseInput } from "./typography";
function Text(props: React.ComponentProps<typeof BaseText>) {
  const { dark } = useTheme();
  return (
    <BaseText
      {...props}
      style={[{ color: dark ? "#e9f5ed" : "#102d21" }, props.style]}
    />
  );
}
function TextInput(props: React.ComponentProps<typeof BaseInput>) {
  return (
    <BaseInput
      {...props}
      style={[
        {
          padding: 12,
          borderWidth: 1,
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
  onBookings,
  onProducts,
  onHelp,
}: {
  api: API;
  onOffer: (offer: RewardOffer) => void;
  onOrder: (id: string) => void;
  onBookings: () => void;
  onProducts: () => void;
  onHelp: () => void;
}) {
  const { colors } = useTheme();
  const [data, setData] = useState<RewardsSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkedAt, setCheckedAt] = useState("");
  const [version, setVersion] = useState(0);
  const [referring, setReferring] = useState(false);
  const [visible, setVisible] = useState(6);
  const refresh = () => setVersion((value) => value + 1);

  useEffect(() => {
    let live = true;
    setLoading(true);
    api("rewards.summary")
      .then((result) => {
        if (!live) return;
        setData(result);
        setCheckedAt(new Date().toISOString());
        setError("");
      })
      .catch((failure) => {
        if (!live) return;
        if ([401, 403].includes(failure.status)) setData(null);
        setReferring(false);
        setError(
          failure.status === 401
            ? "Sign in to view your rewards."
            : failure.status === 403
              ? "This account can’t view EasyRewards."
              : failure.status
                ? failure.message
                : "Couldn’t connect to EasyRewards. Check your connection and try again.",
        );
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [version]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => subscription.remove();
  }, []);

  const capabilities = data ? rewardCapabilities(data) : null;
  const canAct = !error && !loading;
  return (
    <View style={overviewStyles.stack}>
      <View style={[overviewStyles.hero, { backgroundColor: colors.elevated }]}>
        <View style={overviewStyles.grow}>
          <BaseText
            preserveColor
            style={{ color: colors.primary, fontWeight: "800" }}
          >
            YOUR EASYGAS
          </BaseText>
          <Title>EasyRewards</Title>
          <Copy>
            {capabilities?.earning
              ? "Earn points on eligible purchases and see your rewards activity."
              : "View your points, programme status and rewards activity."}
          </Copy>
        </View>
        <Ionicons
          name="gift-outline"
          size={35}
          color={colors.primary}
          accessible={false}
        />
      </View>
      {error && (
        <Feedback
          error={
            data ? `${error} Last checked ${rewardDateTime(checkedAt)}.` : error
          }
          retry={refresh}
        />
      )}
      {!data && loading && (
        <EasyGasLoader accessibilityLabel="Loading rewards" />
      )}
      {data && capabilities && (
        <>
          <Card accent>
            <BaseText accessibilityRole="header" style={overviewStyles.heading}>
              Your EasyGas points
            </BaseText>
            <BaseText style={overviewStyles.points}>
              {formatRewardCount(data.availablePoints)}
            </BaseText>
            <Copy>Available points · separate from purchase credit</Copy>
            <Copy>
              Pending award events · {formatRewardCount(data.pendingAwards)}
            </Copy>
          </Card>
          {data.restricted && (
            <Feedback error="Your points need finance review following a reversal. Further spending is restricted. Contact support." />
          )}
          <Card>
            <BaseText accessibilityRole="header" style={overviewStyles.heading}>
              Your programme
            </BaseText>
            <Copy>
              {capabilities.earning && data.policy
                ? `One point per ${gasMoney(data.policy.spendPerPointKobo)} of eligible verified, completed purchases.`
                : "Reward earning is currently disabled. Your existing history is available."}
            </Copy>
            <Copy>
              {capabilities.redemption && data.policy
                ? `Redeem from ${data.policy.minimumPoints} points, up to ${data.policy.maximumDiscountBps / 100}% of eligible product spend. Delivery fees are excluded.`
                : "Checkout reward discounts are currently unavailable."}
            </Copy>
            {canAct &&
              data.policy &&
              canSelectReward(data, data.policy.minimumPoints) && (
                <Button
                  label="Shop eligible products"
                  secondary
                  onPress={onProducts}
                />
              )}
            <Copy>
              {data.policy
                ? `Approved policy version ${data.policy.version}. Eligible categories: ${data.policy.eligibleCategories.join(", ")}.`
                : "No EasyRewards policy has been approved."}
            </Copy>
            <Copy>
              No active expiry or tiers. Pending awards appear in your balance
              after posting.
            </Copy>
          </Card>
          <Card>
            <BaseText accessibilityRole="header" style={overviewStyles.heading}>
              Rewards &amp; referrals
            </BaseText>
            {!canAct ? (
              <Copy>Refresh to check current offers.</Copy>
            ) : data.catalogue.length ? (
              data.catalogue.map((offer) => (
                <View
                  key={offer.id}
                  style={[overviewStyles.entry, { borderColor: colors.border }]}
                >
                  <BaseText style={overviewStyles.heading}>
                    {offer.title}
                  </BaseText>
                  <Copy>{offer.description}</Copy>
                  <Copy>
                    {formatRewardCount(offer.points)} points · Expires{" "}
                    {lagosDay(offer.expiresAt)}
                  </Copy>
                  {canSelectReward(data, offer.points) ? (
                    <Button
                      label="Choose products for this offer"
                      secondary
                      onPress={() => onOffer(offer)}
                    />
                  ) : (
                    <Copy>
                      {capabilities.redemption
                        ? "More points are required to use this offer."
                        : "Offer redemption is currently unavailable."}
                    </Copy>
                  )}
                </View>
              ))
            ) : (
              <Copy>
                No approved offers are available for your current account.
              </Copy>
            )}
            {capabilities.referral ? (
              <Button
                label="Manage referrals"
                secondary
                disabled={!canAct}
                onPress={() => setReferring(true)}
              />
            ) : (
              <Copy>Referral bonuses are currently disabled.</Copy>
            )}
            <Button label="Ask about your points" secondary onPress={onHelp} />
          </Card>
          <Card>
            <BaseText accessibilityRole="header" style={overviewStyles.heading}>
              Points history
            </BaseText>
            {!data.entries.length ? (
              <Copy>No points transactions yet.</Copy>
            ) : (
              <>
                {data.entries.slice(0, visible).map((entry) => (
                  <View
                    key={entry.id}
                    style={[
                      overviewStyles.entry,
                      { borderColor: colors.border },
                    ]}
                  >
                    <BaseText style={overviewStyles.heading}>
                      {rewardEntryTitle(entry.kind)} ·{" "}
                      {rewardDelta(entry.points)}
                    </BaseText>
                    <Copy>{rewardDateTime(entry.created_at)}</Copy>
                    {entry.order_id && (
                      <Button
                        secondary
                        label={entry.order_reference ?? "View order"}
                        onPress={() => onOrder(entry.order_id!)}
                      />
                    )}
                    {entry.booking_id && (
                      <Button
                        secondary
                        label={
                          entry.booking_reference
                            ? `Service bookings · ${entry.booking_reference}`
                            : "View service bookings"
                        }
                        onPress={onBookings}
                      />
                    )}
                  </View>
                ))}
                {data.entries.length === data.historyLimit && (
                  <Copy>
                    History shows the most recent {data.historyLimit} entries.
                    Contact support for an older statement.
                  </Copy>
                )}
                {visible < data.entries.length && (
                  <Button
                    secondary
                    label="Show older entries"
                    onPress={() => setVisible((count) => count + 20)}
                  />
                )}
              </>
            )}
            {!error && (
              <Button
                secondary
                label={loading ? "Refreshing…" : "Refresh rewards"}
                disabled={loading}
                onPress={refresh}
              />
            )}
          </Card>
          {referring && !error && capabilities.referral && (
            <NativeReferralSheet
              api={api}
              refreshing={loading}
              close={() => setReferring(false)}
            />
          )}
        </>
      )}
    </View>
  );
}

function NativeReferralSheet({
  api,
  refreshing,
  close,
}: {
  api: API;
  refreshing: boolean;
  close: () => void;
}) {
  const { colors } = useTheme();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<{
    enabled: boolean;
    code: string | null;
    shareUrl: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const pending = useRef(false);
  const disabled = busy || refreshing;
  async function submit(
    action: "rewards.referral" | "rewards.referral.attribute",
  ) {
    if (refreshing || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (action === "rewards.referral") {
        const referral = await api(action, {});
        setResult(referral);
        if (!referral.enabled)
          setError("Referral bonuses are currently disabled.");
      } else {
        await api(action, { code });
        setCode("");
        setMessage(
          "Referral recorded. Points can post after a qualifying purchase is completed and verified.",
        );
      }
    } catch (failure) {
      setError(friendlyMessage((failure as Error).message));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <ContextSheet
      title="Manage referrals"
      onClose={() => {
        if (!pending.current) close();
      }}
    >
      <View style={overviewStyles.stack}>
        <Copy>
          Referral rewards require the referred customer’s first eligible
          verified purchase. Apply a code before your first qualifying purchase.
        </Copy>
        <Button
          secondary
          label="Get my referral code"
          disabled={disabled}
          onPress={() => submit("rewards.referral")}
        />
        {result?.code && (
          <BaseText selectable>Your code: {result.code}</BaseText>
        )}
        {result?.shareUrl && (
          <Button
            secondary
            label="Share referral link"
            disabled={disabled}
            onPress={() => {
              void Share.share({ message: result.shareUrl! }).catch(() =>
                setError("Couldn’t share the referral link. Please try again."),
              );
            }}
          />
        )}
        <FieldCaption required={true}>Code to apply</FieldCaption>
        <BaseInput
          accessibilityLabel="Code to apply, required"
          autoCapitalize="none"
          autoCorrect={false}
          value={code}
          maxLength={32}
          onChangeText={(value) => setCode(value.trim())}
          editable={!disabled}
          style={{
            minHeight: 48,
            padding: 12,
            borderWidth: 1,
            borderRadius: 12,
            borderColor: colors.border,
            backgroundColor: colors.input,
          }}
        />
        <Button
          label={busy ? "Working…" : "Apply referral code"}
          disabled={disabled || !/^[a-f0-9]{32}$/.test(code)}
          onPress={() => submit("rewards.referral.attribute")}
        />
        {error && (
          <BaseText
            preserveColor
            accessibilityRole="alert"
            style={{ color: colors.error }}
          >
            {error}
          </BaseText>
        )}
        {message && (
          <BaseText accessibilityLiveRegion="polite">{message}</BaseText>
        )}
      </View>
    </ContextSheet>
  );
}

const overviewStyles = StyleSheet.create({
  stack: { gap: 12 },
  hero: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
  },
  grow: { flex: 1, minWidth: 0 },
  heading: { fontSize: 18, fontWeight: "700" },
  points: { fontSize: 34, fontWeight: "800" },
  entry: { borderTopWidth: 1, paddingTop: 10, gap: 6 },
});
export function NativePartialRefund({
  api,
  orderId,
}: {
  api: API;
  orderId: string;
}) {
  const { colors } = useTheme();
  const [lines, setLines] = useState<any[]>([]),
    [quantities, setQuantities] = useState<Record<string, string>>({}),
    [reason, setReason] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [key, setKey] = useState(randomUUID),
    [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [submitted, setSubmitted] = useState(false),
    [retry, setRetry] = useState(0);
  const pending = useRef(false);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    setLines([]);
    setQuantities({});
    setReason("");
    setAccepted(false);
    setSubmitted(false);
    setMessage("");
    setKey(randomUUID());
    api("refund.lines?orderId=" + encodeURIComponent(orderId))
      .then((r) => {
        if (live) setLines(r);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [orderId, retry]);
  const selected = selectedRefundLines(lines, quantities);
  const valid =
    !loading &&
    !submitted &&
    !busy &&
    selected !== null &&
    accepted &&
    reason.trim().length >= 10 &&
    reason.trim().length <= 1000;
  return (
    <View style={[card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text accessibilityRole="header">Refund selected quantities</Text>
      <Text>
        If approved, refund is purchase credit. This does not record a physical
        cylinder return.
      </Text>
      {loading && <EasyGasLoader label="Loading refundable quantities" />}
      {!loading && error && lines.length === 0 && (
        <>
          <Text accessibilityRole="alert">{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRetry((n) => n + 1)}
          >
            <Text>Retry refundable quantities</Text>
          </Pressable>
        </>
      )}
      {!loading &&
        !error &&
        !lines.some((line) => Number(line.remaining) > 0) && (
          <Text>No quantities are available for a refund request.</Text>
        )}
      {lines
        .filter((line) => Number(line.remaining) > 0)
        .map((l) => (
          <View key={l.source}>
            <Text>
              {l.source} · {l.remaining} remaining{" "}
              {l.source.startsWith("gas:") ? "grams" : "units"}
            </Text>
            <TextInput
              accessibilityLabel={"Refund quantity " + l.source}
              keyboardType="numeric"
              editable={!busy && !submitted}
              value={quantities[l.source] ?? ""}
              onChangeText={(v) => {
                setQuantities({ ...quantities, [l.source]: v });
                setKey(randomUUID());
              }}
            />
          </View>
        ))}
      <FieldCaption required={true}>Refund reason</FieldCaption>
      <TextInput
        accessibilityLabel="Refund reason, required"
        editable={!busy && !submitted}
        maxLength={1000}
        value={reason}
        onChangeText={(v) => {
          setReason(v);
          setKey(randomUUID());
        }}
      />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted, disabled: busy || submitted }}
        disabled={busy || submitted}
        onPress={() => {
          setAccepted(!accepted);
          setKey(randomUUID());
        }}
      >
        <Text>
          {accepted ? "✓ " : ""}I agree to receive an approved refund as
          purchase credit
        </Text>
      </Pressable>
      {Object.values(quantities).some((value) => value.trim() !== "") &&
        selected === null && (
          <Text accessibilityRole="alert">
            Select a positive whole quantity within the remaining amount.
          </Text>
        )}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !valid }}
        disabled={!valid}
        onPress={async () => {
          if (!valid || pending.current) return;
          pending.current = true;
          setBusy(true);
          setError("");
          try {
            await api("refund.request", {
              orderId,
              reason: reason.trim(),
              lines: selected,
              acceptWalletCredit: true,
              idempotencyKey: key,
            });
            setSubmitted(true);
            setMessage("Request awaiting independent finance review.");
          } catch (e: any) {
            setError(e.message);
          } finally {
            pending.current = false;
            setBusy(false);
          }
        }}
      >
        <Text>
          {busy
            ? "Submitting refund request…"
            : "Request selected refund as purchase credit"}
        </Text>
      </Pressable>
      {error && lines.length > 0 && (
        <Text accessibilityRole="alert">{error}</Text>
      )}
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
  const { dark } = useTheme();
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
        <Text accessibilityRole="alert">{friendlyMessage(error)}</Text>
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
  const { dark } = useTheme();
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
  if (error)
    return <Text accessibilityRole="alert">{friendlyMessage(error)}</Text>;
  if (!data)
    return <EasyGasLoader accessibilityLabel="Checking reward availability" />;
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
      <FieldCaption required={false}>Reward points to use</FieldCaption>
      <TextInput
        accessibilityLabel="Reward points to use, optional"
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

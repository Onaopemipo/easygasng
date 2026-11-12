import {
  deliveryCoveragePending,
  hasConfirmedDeliveryCoverage,
} from "../../packages/business-rules/src/delivery-coverage";
import { friendlyMessage } from "../../packages/business-rules/src/friendly-message";
import {
  Card as CustomerCard,
  Copy as CustomerCopy,
  Title as CustomerTitle,
} from "./CustomerUI";
import { Ionicons } from "@expo/vector-icons";
import { AppState } from "react-native";
import { useTheme } from "./theme";
import { NativeRewardSelector } from "./EasyRewards";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { View, Pressable } from "./surfaces";
import { Text, TextInput } from "./typography";
import { NativeForm } from "./Workflows";
import {
  gasLine,
  nextGasQuantity,
  gasMoney as money,
} from "../../packages/business-rules/src/gas-pricing";
import { randomUUID } from "expo-crypto";
export default function GasOrder({
  api,
  catalogue,
  user,
  cart,
  done,
  onPlaced,
  viewServices,
}: {
  api: (a: string, d?: any) => Promise<any>;
  catalogue: any;
  user: any;
  cart: any[];
  done: () => void;
  onPlaced: () => void;
  viewServices: () => void;
}) {
  const { colors } = useTheme();
  const [quantityText, setQuantityText] = useState<Record<number, string>>({});
  const [rewardSelection, setRewardSelection] = useState<any>({});
  const [config, setConfig] = useState<any>(catalogue?.gas ?? null),
    [lines, setLines] = useState([{ capacityKg: 12.5, kg: 0 }]),
    [error, setError] = useState(""),
    [storedQuote, setQuote] = useState<any>(null),
    [key] = useState(() => randomUUID()),
    [order, setOrder] = useState<any>(null),
    [appointments, setAppointments] = useState<any[]>([]),
    [includeAppointments, setIncludeAppointments] = useState(false),
    [locationId, setLocationId] = useState(""),
    [saved, setSaved] = useState<any[]>([]),
    [picked, setPicked] = useState<any>(null);
  const [picker, setPicker] = useState<string | null>(null);
  const [street, setStreet] = useState("");
  const [catalogueRevision, refreshCatalogue] = useState(0);
  const [pricingBranch, setPricingBranch] = useState<string | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const quoteLock = useRef(false);
  const [showGuide, setShowGuide] = useState(false);
  const selectedArea = config?.locations?.find((l: any) => l.id === locationId);
  const selectedBranch = selectedArea?.branch_id;
  const pendingCoverage =
    selectedArea && !hasConfirmedDeliveryCoverage(selectedArea.coverage);
  const inputKey = JSON.stringify([
    lines,
    cart,
    locationId,
    street,
    picked?.id,
    includeAppointments,
    catalogueRevision,
  ]);
  const latestInput = useRef(inputKey);
  latestInput.current = inputKey;
  const quote = storedQuote?.inputKey === inputKey ? storedQuote : null;
  const requestedBranch = selectedBranch ?? "lagos";
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshCatalogue((n) => n + 1);
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    let live = true;
    setPricingBranch(null);
    setQuote(null);
    api("gas.catalogue?branchId=" + encodeURIComponent(requestedBranch))
      .then((value) => {
        if (!live) return;
        setConfig(value);
        setPricingBranch(requestedBranch);
        setLines((current) =>
          current.map((line) => {
            const capacities = value.policy?.capacitiesKg ?? [];
            return capacities.length && !capacities.includes(line.capacityKg)
              ? { ...line, capacityKg: capacities[0] }
              : line;
          }),
        );
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [requestedBranch, catalogueRevision]);
  useEffect(() => {
    if (user)
      SecureStore.getItemAsync("easygas.serviceDrafts." + user.id)
        .then((raw) =>
          setAppointments(
            JSON.parse(raw ?? "[]").filter((a: any) => !a.bundleId),
          ),
        )
        .catch(() => {});
  }, [user]);
  useEffect(() => {
    if (user)
      api("account.profile")
        .then((p) => {
          setSaved(p.addresses);
          const primary = p.addresses.find(
            (a: any) => a.is_default && a.location_available,
          );
          if (primary) {
            setPicked((current: any) => current ?? primary);
            setStreet((current) => current || primary.street);
            setLocationId((current) => current || primary.location_id);
          }
        })
        .catch(() => {});
  }, [user]);
  if (!config)
    return error ? (
      <View>
        <Text accessibilityRole="alert">{friendlyMessage(error)}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setError("");
            refreshCatalogue((n) => n + 1);
          }}
        >
          <Text>Retry gas prices</Text>
        </Pressable>
      </View>
    ) : (
      <Text>Loading gas prices…</Text>
    );
  const capacities: number[] = config.policy?.capacitiesKg ?? [];
  const pricingReady = pricingBranch === requestedBranch;
  const feeReady =
    Number.isSafeInteger(config.deliveryKobo) &&
    config.deliveryKobo >= 0 &&
    config.feeVersion != null;
  const physical = cart.filter(
    (i) =>
      catalogue.products.find((p: any) => p.id === i.productId)?.category !==
      "Gas refills",
  );
  const extra = physical.reduce(
    (n, i) =>
      n +
      Number(
        catalogue.products.find((p: any) => p.id === i.productId)?.price_kobo ??
          0,
      ) *
        i.quantity,
    0,
  );
  const ready =
    config.policy &&
    ["minimumKg", "maximumKg", "incrementKg", "precision"].every(
      (k) => config.policy[k] != null,
    );
  let subtotal = 0,
    quantityError = "";
  try {
    subtotal = lines.reduce(
      (n, l, i) =>
        n +
        gasLine(
          quantityText[i] ?? l.kg,
          l.capacityKg,
          config.priceKobo,
          config.policy,
        ).subtotalKobo,
      0,
    );
  } catch (e: any) {
    quantityError = e.message;
  }
  const button = (
    label: string,
    press: () => void,
    disabled = false,
    full = false,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loadingQuote }}
      disabled={disabled || loadingQuote}
      style={[
        s.button,
        {
          backgroundColor: colors.button,
          opacity: disabled || loadingQuote ? 0.55 : 1,
        },
        full && s.primaryButton,
      ]}
      onPress={press}
    >
      <Text preserveColor style={{ color: colors.onButton }}>
        {label}
      </Text>
    </Pressable>
  );
  const update = (i: number, key: string, value: number, raw?: string) => {
    if (key === "kg")
      setQuantityText((current) => ({
        ...current,
        [i]: raw ?? String(value),
      }));
    setLines(lines.map((l, n) => (n === i ? { ...l, [key]: value } : l)));
    setQuote(null);
  };
  if (order)
    return (
      <View>
        <Text style={s.title}>Order {order.reference}</Text>
        <Text>
          {money(Number(order.total_kobo))} · Payment {order.payment_status}
        </Text>
        <Text>Verified cylinder inspection is required before dispatch.</Text>
        {button("View my orders", done)}
      </View>
    );
  return (
    <View>
      <View
        style={[
          s.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={s.row}>
          <Ionicons name="flame-outline" size={26} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <CustomerTitle>Order Cooking Gas</CustomerTitle>
            <CustomerCopy>Quick, secure and home delivery</CustomerCopy>
          </View>
        </View>
        <View style={[s.priceStrip, { backgroundColor: colors.elevated }]}>
          <View style={s.priceCell}>
            <Ionicons
              name="pricetag-outline"
              size={18}
              color={colors.primary}
            />
            <View style={{ flex: 1 }}>
              <Text>
                {pricingReady && config.priceKobo > 0
                  ? money(config.priceKobo) + "/kg"
                  : "Unavailable"}
              </Text>
              <CustomerCopy>Gas price</CustomerCopy>
            </View>
          </View>
          <View style={s.priceCell}>
            <Ionicons name="car-outline" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text>
                {pricingReady && feeReady
                  ? money(config.deliveryKobo)
                  : "Unavailable"}
              </Text>
              <CustomerCopy>Flat delivery</CustomerCopy>
            </View>
          </View>
        </View>
        {!ready && (
          <Text>Ordering opens once gas quantity limits are configured.</Text>
        )}
        {lines.map((l, i) => {
          const label =
            lines.length > 1
              ? `Cylinder ${i + 1} capacity`
              : "Cylinder capacity";
          const field = `capacity-${i}`;
          const raw = quantityText[i] ?? (l.kg ? String(l.kg) : "");
          return (
            <View key={i} style={{ gap: 5, marginBottom: 10 }}>
              <Text>{label}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${label}, ${l.capacityKg} kg`}
                accessibilityState={{ expanded: picker === field }}
                disabled={loadingQuote || !capacities.length}
                style={[
                  s.control,
                  { backgroundColor: colors.input, borderColor: colors.border },
                ]}
                onPress={() => setPicker(picker === field ? null : field)}
              >
                <Text style={{ flex: 1 }}>
                  {capacities.length ? l.capacityKg + " kg" : "Unavailable"}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={colors.primary}
                />
              </Pressable>
              {picker === field &&
                capacities.map((c) => (
                  <Pressable
                    key={c}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: l.capacityKg === c }}
                    disabled={loadingQuote}
                    style={[
                      s.control,
                      {
                        borderColor: colors.border,
                        backgroundColor:
                          l.capacityKg === c ? colors.elevated : colors.surface,
                      },
                    ]}
                    onPress={() => {
                      update(i, "capacityKg", c);
                      setPicker(null);
                    }}
                  >
                    <Text>{c} kg</Text>
                  </Pressable>
                ))}
              <Text>Gas quantity (kg)</Text>
              <View
                style={[
                  s.stepper,
                  { borderColor: colors.border, backgroundColor: colors.input },
                ]}
              >
                {([-1, 0, 1] as const).map((direction) => {
                  if (direction === 0)
                    return (
                      <TextInput
                        key={0}
                        accessibilityLabel={`Cylinder ${i + 1} gas kilograms`}
                        style={s.quantity}
                        keyboardType="decimal-pad"
                        editable={!loadingQuote}
                        maxLength={12}
                        placeholder="0"
                        value={raw}
                        onChangeText={(v) => update(i, "kg", Number(v), v)}
                      />
                    );
                  const next = nextGasQuantity(
                    raw,
                    direction,
                    l.capacityKg,
                    config.policy,
                  );
                  return (
                    <Pressable
                      key={direction}
                      accessibilityRole="button"
                      accessibilityLabel={
                        direction < 0
                          ? "Decrease gas quantity"
                          : "Increase gas quantity"
                      }
                      disabled={loadingQuote || next === null}
                      style={[
                        s.stepButton,
                        { opacity: next === null ? 0.4 : 1 },
                      ]}
                      onPress={() => next !== null && update(i, "kg", next)}
                    >
                      <Text>{direction < 0 ? "−" : "+"}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {lines.length > 1 &&
                button("Remove cylinder", () => {
                  setLines(lines.filter((_, n) => n !== i));
                  setQuantityText(
                    Object.fromEntries(
                      Object.entries(quantityText)
                        .filter(([n]) => Number(n) !== i)
                        .map(([n, v]) => [
                          Number(n) > i ? Number(n) - 1 : Number(n),
                          v,
                        ]),
                    ),
                  );
                  setQuote(null);
                  setPicker(null);
                })}
            </View>
          );
        })}
        {capacities.length > 0 &&
          lines.length < 20 &&
          button("Add another cylinder", () => {
            setLines([...lines, { capacityKg: capacities[0], kg: 0 }]);
            setQuote(null);
          })}
        <Text>Delivery location</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delivery location"
          accessibilityState={{ expanded: picker === "location" }}
          disabled={loadingQuote}
          style={[
            s.control,
            { borderColor: colors.border, backgroundColor: colors.input },
          ]}
          onPress={() => setPicker(picker === "location" ? null : "location")}
        >
          <Ionicons name="location-outline" size={18} color={colors.primary} />
          <Text style={{ flex: 1 }}>
            {config.locations.find((l: any) => l.id === locationId)?.name ??
              "Select location"}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.primary} />
        </Pressable>
        {picker === "location" &&
          config.locations.map((l: any) => (
            <Pressable
              key={l.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: l.id === locationId }}
              disabled={loadingQuote}
              style={[
                s.control,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
              onPress={() => {
                setLocationId(l.id);
                setQuote(null);
                setPicker(null);
              }}
            >
              <Text>{l.name}</Text>
            </Pressable>
          ))}
        <Text>House address</Text>
        <TextInput
          accessibilityLabel="House address"
          editable={!loadingQuote}
          value={street}
          maxLength={250}
          style={[
            s.control,
            { borderColor: colors.border, backgroundColor: colors.input },
          ]}
          placeholder="House number, street, estate, area"
          onChangeText={(value) => {
            setStreet(value);
            setQuote(null);
          }}
        />
        {saved
          .filter((a) => a.location_available)
          .map((a) =>
            button(`Use ${a.label}`, () => {
              setPicked(a);
              setStreet(a.street);
              setLocationId(a.location_id);
              setQuote(null);
            }),
          )}
        {pendingCoverage && (
          <Text accessibilityRole="alert">{deliveryCoveragePending}</Text>
        )}
        <CustomerCard accent>
          <CustomerTitle>
            {quote ? "Quoted total" : "Order summary"}
          </CustomerTitle>
          {!pricingReady || !feeReady ? (
            <CustomerCopy>Current pricing unavailable.</CustomerCopy>
          ) : quantityError ? (
            <CustomerCopy>{quantityError}</CustomerCopy>
          ) : (
            <>
              <CustomerCopy>
                Gas {money(subtotal)} · Products {money(extra)}
              </CustomerCopy>
              <CustomerCopy>
                Delivery {money(config.deliveryKobo)} — charged once for this
                visit
              </CustomerCopy>
              <CustomerTitle>
                {money(
                  quote
                    ? quote.subtotalKobo +
                        quote.physicalSubtotalKobo +
                        quote.deliveryKobo
                    : subtotal + extra + config.deliveryKobo,
                )}
              </CustomerTitle>
            </>
          )}
          <CustomerCopy>
            The server confirms current pricing, availability and cylinder
            eligibility before creating an order.
          </CustomerCopy>
        </CustomerCard>
        <Text>
          Address coverage must be confirmed before dispatch. New cylinders and
          installation cost extra. Nominal capacity does not establish safe
          filling eligibility.
        </Text>
        {error && (
          <Text accessibilityRole="alert">{friendlyMessage(error)}</Text>
        )}
        {error &&
          !pricingReady &&
          button("Retry gas prices", () => {
            setError("");
            refreshCatalogue((n) => n + 1);
          })}
        {appointments.length > 0 && (
          <View>
            {button(
              includeAppointments
                ? "Exclude my staged services"
                : "Include my staged services",
              () => {
                setIncludeAppointments(!includeAppointments);
                setQuote(null);
              },
            )}
            {appointments.map((a, i) => (
              <Text key={i}>
                {a.name} ·{" "}
                {a.totalKobo === null
                  ? "Quotation required"
                  : money(a.totalKobo ?? 0)}{" "}
                · Service charges are separate.
              </Text>
            ))}
          </View>
        )}
        {button(
          loadingQuote ? "Checking quote…" : "Review order",
          async () => {
            if (quoteLock.current) return;
            quoteLock.current = true;
            setLoadingQuote(true);
            setError("");
            try {
              const result = await api("gas.quote", {
                lines,
                items: physical,
                branchId: selectedBranch,
                locationId,
              });
              if (latestInput.current === inputKey)
                setQuote({ ...result, inputKey });
            } catch (e: any) {
              setQuote(null);
              setError(e.message);
            } finally {
              quoteLock.current = false;
              setLoadingQuote(false);
            }
          },
          !ready ||
            !pricingReady ||
            !feeReady ||
            !!quantityError ||
            !selectedBranch ||
            !!pendingCoverage ||
            street.trim().length < 8,
          true,
        )}
        <Pressable
          accessibilityRole="link"
          disabled={loadingQuote}
          onPress={viewServices}
          style={s.serviceLink}
        >
          <Text
            preserveColor
            style={{ color: colors.primary, fontWeight: "700" }}
          >
            View Our Services
          </Text>
        </Pressable>
      </View>
      {quote && user && (
        <CustomerCard>
          <CustomerTitle>Review and confirm</CustomerTitle>
          <CustomerCopy>
            {street} · {selectedArea?.name}
          </CustomerCopy>
          {button("Change order details", () => setQuote(null))}
        </CustomerCard>
      )}
      {quote && user && (
        <NativeRewardSelector api={api} onChange={setRewardSelection} />
      )}
      {quote && user && (
        <NativeForm
          key={picked?.id ?? "new"}
          api={async (action, data) => {
            if (latestInput.current !== inputKey)
              throw new Error("Review the updated order before confirming.");
            const l = config.locations.find(
              (l: any) => l.id === data.address.locationId,
            );
            if (!l) throw new Error("Select an active location.");
            data.address.zone = l.name;
            const payload = {
              ...data,
              ...rewardSelection,
              items: physical,
              gasLines: lines,
              pricing: {
                priceVersion: quote.priceVersion,
                feeVersion: quote.feeVersion,
                policyVersion: quote.policyVersion,
                totalKobo:
                  quote.subtotalKobo +
                  quote.deliveryKobo +
                  quote.physicalSubtotalKobo,
              },
              idempotencyKey: key,
            };
            const result = includeAppointments
              ? await api("checkout.mixed", {
                  products: payload,
                  appointments: appointments.map((a) => a.request),
                  idempotencyKey: key,
                })
              : await api(action, payload);
            if (includeAppointments)
              await SecureStore.deleteItemAsync(
                "easygas.serviceDrafts." + user.id,
              );
            setOrder(
              result.order
                ? {
                    reference: result.order.reference,
                    total_kobo: result.order.totalKobo,
                    payment_status: result.order.paymentStatus,
                  }
                : result,
            );
            onPlaced();
            return result;
          }}
          action="checkout"
          title={`Accept total ${money(quote.subtotalKobo + quote.deliveryKobo + quote.physicalSubtotalKobo)} and confirm`}
          fields={[
            {
              name: "address.locationId",
              label: "Delivery location",
              type: "hidden",
              value: locationId,
            },
            {
              name: "address.name",
              label: "Recipient name",
              value: picked?.details?.recipient ?? user.name,
            },
            {
              name: "address.phone",
              label: "Nigerian mobile number",
              value: picked?.phone,
            },
            {
              name: "address.street",
              label: "Street address",
              value: street.trim(),
            },
            {
              name: "address.building",
              label: "House / building number",
              value: picked?.details?.building,
            },
            {
              name: "address.landmark",
              label: "Estate / landmark",
              value: picked?.details?.landmark,
            },
            {
              name: "address.directions",
              label: "Additional directions",
              value: picked?.details?.directions,
            },
            { name: "date", label: "Delivery date YYYY-MM-DD" },
            {
              name: "window",
              label: "Delivery window",
              options: catalogue.windows.map((w: string) => ({
                value: w,
                label: w,
              })),
            },
            {
              name: "paymentMethod",
              label: "Payment arrangement",
              options: [
                ...(catalogue.codEnabled
                  ? [
                      {
                        value: "cash_on_delivery",
                        label: "Cash on delivery (unverified)",
                      },
                    ]
                  : []),
                ...(catalogue.walletEnabled
                  ? [{ value: "wallet", label: "Purchase credit" }]
                  : []),
              ],
            },
          ]}
          onDone={() => {}}
        />
      )}
      {button(
        showGuide ? "Hide cylinder size guide" : "Cylinder size guide",
        () => setShowGuide(!showGuide),
      )}
      {showGuide && (!pricingReady || !feeReady || !(config.priceKobo > 0)) && (
        <CustomerCopy>Current price estimates are unavailable.</CustomerCopy>
      )}
      {showGuide &&
        pricingReady &&
        feeReady &&
        config.priceKobo > 0 &&
        capacities.map((c: number) => (
          <Text key={c}>
            {c} kg: gas {money(gasLine(c, c, config.priceKobo).subtotalKobo)} ·
            with delivery{" "}
            {money(
              gasLine(c, c, config.priceKobo).subtotalKobo +
                config.deliveryKobo,
            )}
          </Text>
        ))}
    </View>
  );
}
const s = StyleSheet.create({
  title: { fontSize: 26, fontWeight: "700", marginVertical: 16 },
  card: {
    padding: 16,
    borderWidth: 1,

    borderRadius: 16,
    marginVertical: 12,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  priceStrip: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 9,
    marginVertical: 12,
    gap: 8,
  },
  priceCell: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5 },
  control: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 5,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
  },
  stepButton: {
    width: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  quantity: { flex: 1, minHeight: 44, textAlign: "center" },
  primaryButton: {
    alignSelf: "stretch",
    alignItems: "center",
    borderRadius: 999,
    minHeight: 46,
  },
  serviceLink: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    padding: 14,
    borderRadius: 12,
    marginVertical: 6,
    alignSelf: "flex-start",
  },
});

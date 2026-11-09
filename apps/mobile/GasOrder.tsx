import {
  Card as CustomerCard,
  Copy as CustomerCopy,
  Title as CustomerTitle,
} from "./CustomerUI";
import { Image } from "react-native";
import { useTheme } from "./theme";
import { NativeRewardSelector } from "./EasyRewards";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { View, Pressable } from "./surfaces";
import { Text, TextInput } from "./typography";
import { NativeForm } from "./Workflows";
import { gasLine } from "../../packages/business-rules/src/gas-pricing";
import { randomUUID } from "expo-crypto";
export default function GasOrder({
  api,
  catalogue,
  user,
  cart,
  done,
  onPlaced,
}: {
  api: (a: string, d?: any) => Promise<any>;
  catalogue: any;
  user: any;
  cart: any[];
  done: () => void;
  onPlaced: () => void;
}) {
  const { colors } = useTheme();
  const [quantityText, setQuantityText] = useState<Record<number, string>>({});
  const [rewardSelection, setRewardSelection] = useState<any>({});
  const [config, setConfig] = useState<any>(catalogue?.gas ?? null),
    [lines, setLines] = useState([{ capacityKg: 12.5, kg: 0 }]),
    [error, setError] = useState(""),
    [quote, setQuote] = useState<any>(null),
    [key] = useState(() => randomUUID()),
    [order, setOrder] = useState<any>(null),
    [appointments, setAppointments] = useState<any[]>([]),
    [includeAppointments, setIncludeAppointments] = useState(false),
    [locationId, setLocationId] = useState(""),
    [saved, setSaved] = useState<any[]>([]),
    [picked, setPicked] = useState<any>(null);
  useEffect(() => {
    api("gas.catalogue")
      .then(setConfig)
      .catch((e) => setError(e.message));
  }, []);
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
        .then((p) => setSaved(p.addresses))
        .catch(() => {});
  }, [user]);
  const money = (n: number) => `₦${(n / 100).toLocaleString("en-NG")}`;
  if (!config) return <Text>Loading gas prices…</Text>;
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
      (k) => config.policy[k] !== null,
    );
  let subtotal = 0,
    quantityError = "";
  try {
    subtotal = lines.reduce(
      (n, l) =>
        n +
        gasLine(l.kg, l.capacityKg, config.priceKobo, config.policy)
          .subtotalKobo,
      0,
    );
  } catch (e: any) {
    quantityError = e.message;
  }
  const button = (label: string, press: () => void) => (
    <Pressable style={s.button} onPress={press}>
      <Text style={{ color: "white" }}>{label}</Text>
    </Pressable>
  );
  const update = (i: number, key: string, value: number, raw?: string) => {
    if (key === "kg")
      setQuantityText((current) => ({
        ...current,
        [i]: raw ?? String(Number(value.toFixed(3))),
      }));
    if (key === "kg" && Number.isFinite(value))
      value = Number(value.toFixed(3));
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
      <CustomerTitle>Order Gas</CustomerTitle>
      <Text>
        {money(config.priceKobo)}/kg · Flat delivery{" "}
        {money(config.deliveryKobo)}
      </Text>
      <Text>
        Home delivery across{" "}
        {config.locations.map((l: any) => l.name).join(", ")}.
      </Text>
      {!ready && (
        <Text>
          Gas quantity limits await business configuration. Ordering remains
          unavailable.
        </Text>
      )}
      {lines.map((l, i) => (
        <View style={s.card} key={i}>
          <Text>Cylinder {i + 1} capacity</Text>
          <View style={s.row}>
            {config.policy.capacitiesKg.map((c: number) => (
              <Pressable
                key={c}
                accessibilityRole="radio"
                accessibilityState={{ selected: l.capacityKg === c }}
                style={[
                  s.choice,
                  {
                    flexBasis: "21%",
                    flexGrow: 1,
                    alignItems: "center",
                    borderRadius: 14,
                    borderColor:
                      l.capacityKg === c ? colors.primary : colors.border,
                    backgroundColor:
                      l.capacityKg === c ? colors.accent : colors.surface,
                  },
                ]}
                onPress={() => update(i, "capacityKg", c)}
              >
                <Image
                  source={require("./assets/cylinder-illustration.png")}
                  resizeMode="contain"
                  style={{ width: 42, height: 64 }}
                  accessible={false}
                />
                <Text
                  preserveColor
                  style={{
                    color: l.capacityKg === c ? colors.onAccent : colors.text,
                    fontWeight: "700",
                  }}
                >
                  {c} kg {l.capacityKg === c ? "✓" : ""}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text>Requested gas (kg)</Text>
          <TextInput
            accessibilityLabel={`Cylinder ${i + 1} gas kilograms`}
            style={s.input}
            keyboardType="decimal-pad"
            value={quantityText[i] ?? (l.kg ? String(l.kg) : "")}
            onChangeText={(v) => update(i, "kg", Number(v), v)}
          />
          <View style={s.row}>
            {button("−", () =>
              update(
                i,
                "kg",
                Math.max(0, l.kg - (config.policy.incrementKg ?? 1)),
              ),
            )}
            {button("+", () =>
              update(
                i,
                "kg",
                Math.min(l.capacityKg, l.kg + (config.policy.incrementKg ?? 1)),
              ),
            )}
          </View>
          {config.policy.capacitiesKg
            .filter((c: number) => c <= l.capacityKg)
            .map((c: number) => button(`${c} kg`, () => update(i, "kg", c)))}
          {lines.length > 1 &&
            button("Remove cylinder", () => {
              setLines(lines.filter((_, n) => n !== i));
              setQuantityText({});
              setQuote(null);
            })}
        </View>
      ))}
      {lines.length < 20 &&
        button("Add another cylinder", () => {
          setLines([
            ...lines,
            { capacityKg: config.policy.capacitiesKg[0], kg: 0 },
          ]);
          setQuote(null);
        })}
      <CustomerCard accent>
        <CustomerTitle>Estimated Total</CustomerTitle>
        {quantityError ? (
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
              {money(subtotal + extra + config.deliveryKobo)}
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
      <Text>Delivery location</Text>
      <View style={s.row}>
        {config.locations.map((l: any) => (
          <Pressable
            key={l.id}
            style={s.choice}
            onPress={() => {
              setLocationId(l.id);
              setQuote(null);
            }}
          >
            <Text>
              {l.name} {locationId === l.id ? "✓" : ""}
            </Text>
          </Pressable>
        ))}
      </View>
      {saved
        .filter((a) => a.location_available)
        .map((a) =>
          button(`Use ${a.label}`, () => {
            setPicked(a);
            setLocationId(a.location_id);
            setQuote(null);
          }),
        )}
      {error && <Text accessibilityRole="alert">{error}</Text>}
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
      {ready &&
        !quantityError &&
        locationId &&
        button("Review current quotation", async () => {
          setError("");
          try {
            setQuote(
              await api("gas.quote", {
                lines,
                items: physical,
                branchId: config.locations.find((l: any) => l.id === locationId)
                  ?.branch_id,
              }),
            );
          } catch (e: any) {
            setQuote(null);
            setError(e.message);
            api("gas.catalogue")
              .then(setConfig)
              .catch(() => {});
          }
        })}
      {quote && user && (
        <NativeRewardSelector api={api} onChange={setRewardSelection} />
      )}
      {quote && user && (
        <NativeForm
          key={picked?.id ?? "new"}
          api={async (action, data) => {
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
              value: picked?.street,
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
      <Text style={s.title}>Cylinder size guide</Text>
      {config.policy.capacitiesKg.map((c: number) => (
        <Text key={c}>
          {c} kg: gas {money(gasLine(c, c, config.priceKobo).subtotalKobo)} ·
          with delivery{" "}
          {money(
            gasLine(c, c, config.priceKobo).subtotalKobo + config.deliveryKobo,
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
    borderColor: "#dce7d9",
    borderRadius: 16,
    marginVertical: 12,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { padding: 10, backgroundColor: "#edf5e9", borderRadius: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ccd8c8",
    padding: 12,
    borderRadius: 10,
    marginVertical: 8,
  },
  button: {
    backgroundColor: "#07592e",
    padding: 14,
    borderRadius: 12,
    marginVertical: 6,
    alignSelf: "flex-start",
  },
});

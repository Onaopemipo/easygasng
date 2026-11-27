import { deliveryPinAreaError } from "../../packages/business-rules/src/delivery-pin-area";
import DeliveryPinPicker from "./DeliveryPinPicker";
import { confirmedDeliveryPin } from "../../packages/business-rules/src/delivery-pin";
import { ScreenTransition } from "./ScreenTransition";
import { TextInput } from "./typography";
import React, { useEffect, useRef, useState } from "react";
import { View, Pressable, AppState, Keyboard, Switch } from "react-native";
import * as SecureStore from "expo-secure-store";
import { randomUUID } from "expo-crypto";
import { useTheme } from "./theme";
import { useCheckoutProfile } from "./useCheckoutProfile";
import {
  checkoutAddresses,
  checkoutDelivery,
  defaultCheckoutAddress,
} from "../../packages/business-rules/src/checkout-delivery";
import {
  gasLine,
  nextGasQuantity,
  gasMoney as money,
} from "../../packages/business-rules/src/gas-pricing";
import {
  nativeCheckoutContact,
  nativeCheckoutPayload,
  nativeQuoteTotal,
  sameNativeQuote,
  validateNativeLines,
} from "../../packages/business-rules/src/mobile-next-checkout";
import {
  hasConfirmedDeliveryCoverage,
  deliveryCoveragePending,
} from "../../packages/business-rules/src/delivery-coverage";
import { friendlyMessage } from "../../packages/business-rules/src/friendly-message";
import { useCheckoutPayments } from "./CheckoutPayments";
import { NativeHostedPayment } from "./HostedPayment";
import { NativeRewardSelector } from "./EasyRewards";
import { Feedback } from "./CustomerUI";
import { ContextSheet } from "./ContextSheet";
import {
  NextIntro,
  NextText,
  NextIcon,
  NextButton,
  NextCard,
  NextNotice,
  NextChoice,
  NextField,
  NextRow,
  NextList,
  NextStatus,
  useNextDock,
} from "./MobileNextUI";
import MobileNextCalendar, { lagosDate } from "./MobileNextCalendar";
import {
  readCheckoutDraft,
  saveCheckoutDraft,
  clearCheckoutDraft,
} from "./CustomerCheckoutDraft";

type Props = {
  api: (action: string, data?: any) => Promise<any>;
  catalogue: any;
  user: any;
  cart: any[];
  done: (orderId?: string) => void;
  onPlaced: (id: string) => void;
  viewServices: () => void;
  gasEnabled?: boolean;
  fromCart?: boolean;
  linked?: boolean;
  onSignIn?: (draft: any) => void;
  onStageChange?: (step: number) => void;
  initialDraft?: any;
  onLinkedRequests?: () => void;
  backRef?: React.RefObject<(() => boolean) | null>;
};
export default function GasOrder({
  api,
  catalogue,
  user,
  cart,
  done,
  onPlaced,
  viewServices,
  gasEnabled = true,
  fromCart = false,
  linked = false,
  onSignIn,
  backRef,
  initialDraft,
  onLinkedRequests,
  onStageChange,
}: Props) {
  const { colors } = useTheme(),
    { profile, loading: loadingProfile } = useCheckoutProfile(api, user?.id);
  const [step, setStep] = useState(gasEnabled ? 0 : 1),
    [config, setConfig] = useState<any>(catalogue?.gas),
    [lines, setLines] = useState(() => {
      const existing = fromCart
        ? cart.flatMap((item) => {
            const p = catalogue?.products?.find(
              (p: any) => p.id === item.productId,
            );
            return p?.category === "Gas refills"
              ? Array.from({ length: item.quantity }, () => ({
                  capacityKg: Number(p.size_kg),
                  kg: Number(p.size_kg),
                }))
              : [];
          })
        : [];
      return existing.length ? existing : [{ capacityKg: 12.5, kg: 6 }];
    }),
    [contact, setContact] = useState<any>({
      name: user?.name || "",
      phone: "",
      street: "",
      building: "",
      landmark: "",
      directions: "",
    }),
    [locationId, setLocationId] = useState(""),
    [date, setDate] = useState(""),
    [window, setWindow] = useState(""),
    [method, setMethod] = useState("card"),
    [quote, setQuote] = useState<any>(null),
    [order, setOrder] = useState<any>(null),
    [appointments, setAppointments] = useState<any[]>([]),
    [includeAppointments, setIncludeAppointments] = useState(linked),
    [rewardSelection, setRewardSelection] = useState<any>({}),
    [optional, setOptional] = useState(false),
    [picker, setPicker] = useState<string | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [pricingReady, setPricingReady] = useState(false),
    [revision, reload] = useState(0),
    [storageReady, setStorageReady] = useState(!user),
    [pending, setPending] = useState<any>(null),
    [saveDetails, setSaveDetails] = useState(false),
    [saveNote, setSaveNote] = useState(""),
    [servicePending, setServicePending] = useState(false);
  const completed = useRef(false);
  const lock = useRef(false),
    alive = useRef(true),
    key = useRef(randomUUID()),
    edited = useRef(false),
    restored = useRef(false),
    journal = useRef<any>(null),
    apiRef = useRef(api);
  apiRef.current = api;
  const area = config?.locations?.find((a: any) => a.id === locationId),
    branch = area?.branch_id ?? "lagos",
    payments = useCheckoutPayments(api, user?.id, branch, !!user && !order);
  const physical = cart.filter(
    (i) =>
      catalogue?.products?.find((p: any) => p.id === i.productId)?.category !==
      "Gas refills",
  );
  const fingerprint = JSON.stringify([
      gasEnabled
        ? lines.map((l) => ({
            kg: Number(l.kg),
            capacityKg: Number(l.capacityKg),
          }))
        : [],
      physical,
      locationId,
    ]),
    currentFingerprint = useRef(fingerprint);
  currentFingerprint.current = fingerprint;
  const ready =
    storageReady && pricingReady && (!gasEnabled || config?.policy) && !busy;
  const stateRef = useRef<any>(null);
  stateRef.current = {
    step,
    lines,
    contact,
    locationId,
    date,
    window,
    method,
    optional,
    key: key.current,
    includeAppointments,
    linked,
    rewardSelection,
    saveDetails,
  };
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const stageCallback = useRef(onStageChange);
  stageCallback.current = onStageChange;
  useEffect(() => stageCallback.current?.(step), [step]);
  useEffect(() => {
    if (!backRef) return;
    backRef.current = () => {
      if (busy || pending) return true;
      if (order) return false;
      if (step > (gasEnabled ? 0 : 1)) {
        setStep((s) => s - 1);
        return true;
      }
      return false;
    };
    return () => {
      backRef.current = null;
    };
  }, [step, order, busy, pending]);
  useEffect(() => {
    if (!user?.id) {
      setStorageReady(true);
      return;
    }
    let live = true;
    setStorageReady(false);
    readCheckoutDraft(user.id)
      .then((saved) => {
        if (!live) return;
        const repeating = initialDraft?.repeat === true && initialDraft.customerId === user.id;
        const draft = repeating && !saved?.pending ? {...initialDraft,contact:initialDraft.address,locationId:initialDraft.address.locationId,step:1} : saved?.draft ?? initialDraft;
        if (repeating && saved?.pending) setError("A previous checkout needs checking. Resolve its saved result before placing this repeat order.");
        if (draft && draft.gasEnabled === gasEnabled) {
          const d = draft;
          restored.current = true;
          edited.current = true;
          setLines(d.lines);
          setStep(Math.min(1, d.step ?? 1));
          setContact(d.contact);
          setLocationId(d.locationId);
          setDate(d.date);
          setWindow(d.window);
          setMethod(d.method);
          setIncludeAppointments(
            repeating ? false : d.linked === linked ? d.includeAppointments : linked,
          );
          setRewardSelection(d.rewardSelection || {});
          key.current = d.key || key.current;
        }
        if (
          saved?.pending?.action === "checkout.mixed" &&
          !saved.pending.payload.products
        ) {
          setServicePending(true);
          return;
        }
        if (saved?.pending) {
          journal.current = saved.pending;
          setPending(saved.pending);
          setStep(2);
        }
        if (saved?.order && !repeating) {
          completed.current = true;
          setOrder(saved.order);
        }
        setStorageReady(true);
      })
      .catch((e) => {
        if (live)
          setError(
            e.message +
              " Your saved checkout has not been discarded. Open Orders before starting another request.",
          );
      });
    return () => {
      live = false;
    };
  }, [user?.id]);
  useEffect(() => {
    if (!user?.id || !storageReady || order || pending) return;
    const timer = setTimeout(
      () =>
        (lock.current || journal.current || completed.current
          ? Promise.resolve()
          : saveCheckoutDraft({
              userId: user.id,
              draft: { ...stateRef.current, gasEnabled },
            })
        ).catch((e) => {
          if (alive.current)
            setError("Could not save this checkout securely: " + e.message);
        }),
      350,
    );
    return () => clearTimeout(timer);
  }, [
    user?.id,
    storageReady,
    order,
    pending,
    JSON.stringify(stateRef.current),
  ]);
  useEffect(() => {
    if (!profile || edited.current || restored.current) return;
    const saved = defaultCheckoutAddress(checkoutAddresses(profile)),
      d = checkoutDelivery(profile, saved, user?.name);
    setContact({ ...d });
    setLocationId(d.locationId || "");
  }, [profile]);
  useEffect(() => {
    if (!user) return;
    let live = true;
    SecureStore.getItemAsync("easygas.serviceDrafts." + user.id)
      .then((raw) => {
        if (live) setAppointments(JSON.parse(raw || "[]").slice(0, 5));
      })
      .catch(() => {
        if (live)
          setError(
            "Saved service requests could not be read. They have not been discarded.",
          );
      });
    return () => {
      live = false;
    };
  }, [user?.id]);
  useEffect(() => {
    if (order || pending) return;
    let live = true;
    setPricingReady(false);
    setQuote(null);
    apiRef
      .current("gas.catalogue?branchId=" + encodeURIComponent(branch))
      .then((c) => {
        if (!live) return;
        setConfig(c);
        setPricingReady(true);
        if (!locationId && c.locations?.length === 1 && !edited.current)
          setLocationId(c.locations[0].id);
        // Keep the customer’s quantity when policy/pricing changes; validation
        // explains the exact issue instead of silently replacing it with zero.
      })
      .catch((e) => {
        if (live) setError(friendlyMessage(e.message));
      });
    return () => {
      live = false;
    };
  }, [branch, revision, !!order, !!pending]);
  useEffect(() => {
    if (order || pending) return;
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") reload((n) => n + 1);
    });
    return () => sub.remove();
  }, [order, pending]);
  let preview: number | undefined,
    quantityError = "";
  try {
    const gas = gasEnabled
      ? validateNativeLines(lines, config?.priceKobo, config?.policy).reduce(
          (n, l) => n + l.subtotalKobo,
          0,
        )
      : 0;
    const extras = physical.reduce((n, i) => {
      const p = catalogue.products.find((p: any) => p.id === i.productId);
      if (!p?.price_kobo) throw Error("A product price is unavailable.");
      return n + Number(p.price_kobo) * i.quantity;
    }, 0);
    if (Number.isSafeInteger(config?.deliveryKobo))
      preview = gas + extras + config.deliveryKobo;
  } catch (e: any) {
    quantityError = e.message;
  }
  function patchContact(field: string, value: string) {
    edited.current = true;
    setContact((c: any) => ({
      ...c,
      [field]: value,
      ...(field === "street" ? { deliveryPin: undefined } : {}),
    }));
  }
  function updateLine(index: number, values: any) {
    setLines((l) =>
      l.map((line, i) => (i === index ? { ...line, ...values } : line)),
    );
    setQuote(null);
  }
  async function review() {
    if (lock.current) return;
    if (!user) {
      onSignIn?.({ ...stateRef.current, gasEnabled });
      return;
    }
    setError("");
    try {
      nativeCheckoutContact(contact);
      if (!area || !hasConfirmedDeliveryCoverage(area.coverage))
        throw Error(
          area ? deliveryCoveragePending : "Choose an available delivery area.",
        );
      if (
        !confirmedDeliveryPin(
          contact.deliveryPin,
          contact.street,
          area?.name ?? "",
        )
      )
        throw Error(
          "Confirm your delivery map location before reviewing the order.",
        );
      const pinAreaError = deliveryPinAreaError(contact.deliveryPin, area);
      if (pinAreaError) throw Error(pinAreaError);
      if (!date || date < lagosDate() || !window)
        throw Error(
          "Choose today or a future delivery date and a time window.",
        );
      if (gasEnabled)
        validateNativeLines(lines, config.priceKobo, config.policy);
      if (!gasEnabled && !physical.length && !appointments.length)
        throw Error("Add a product or service before checkout.");
      lock.current = true;
      setBusy(true);
      const input = fingerprint;
      const result = await apiRef.current("gas.quote", {
        lines: gasEnabled
          ? lines.map((l) => ({
              kg: Number(l.kg),
              capacityKg: Number(l.capacityKg),
            }))
          : [],
        items: physical,
        branchId: branch,
        locationId,
      });
      if (!alive.current || input !== currentFingerprint.current) return;
      setQuote({ ...result, inputKey: input });
      Keyboard.dismiss();
      setStep(2);
    } catch (e: any) {
      if (alive.current) setError(friendlyMessage(e.message));
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function confirm() {
    if (lock.current || !user) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      let request = journal.current;
      if (!request) {
        const pinError = deliveryPinAreaError(contact.deliveryPin, area);
        if (pinError || !confirmedDeliveryPin(contact.deliveryPin, contact.street, area?.name ?? "")) throw Error(pinError || "Confirm your delivery map location.");
        if (!quote || quote.inputKey !== fingerprint)
          throw Error("Review the current order before confirming.");
        if (!payments.data?.methods.includes(method))
          throw Error("Choose an available payment method.");
        const latest = await apiRef.current("gas.quote", {
          lines: gasEnabled
            ? lines.map((l) => ({
                kg: Number(l.kg),
                capacityKg: Number(l.capacityKg),
              }))
            : [],
          items: physical,
          branchId: branch,
          locationId,
        });
        if (!sameNativeQuote(quote, latest)) {
          setQuote({ ...latest, inputKey: fingerprint });
          throw Error(
            "The quotation changed. Review the revised amount before confirming.",
          );
        }
        const payload = nativeCheckoutPayload({
          lines: gasEnabled
            ? lines.map((l) => ({
                kg: Number(l.kg),
                capacityKg: Number(l.capacityKg),
              }))
            : [],
          items: physical,
          contact,
          area,
          date,
          window,
          paymentMethod: method,
          quote: latest,
          key: key.current,
          rewardSelection,
        });
        request =
          includeAppointments && appointments.length
            ? {
                action: "checkout.mixed",
                payload: {
                  products: payload,
                  appointments: appointments.map((a) => a.request),
                  idempotencyKey: key.current,
                  ...(appointments[0]?.bundleId
                    ? {
                        bundleId: appointments[0].bundleId,
                        bundleVersion: appointments[0].bundleVersion,
                        bundleTotalKobo: appointments[0].bundleTotalKobo,
                      }
                    : {}),
                },
              }
            : { action: "checkout", payload };
        await saveCheckoutDraft({
          userId: user.id,
          draft: { ...stateRef.current, gasEnabled },
          pending: request,
        });
        journal.current = request;
        setPending(request);
      }
      const response = await apiRef.current(request.action, request.payload);
      const raw = response.order ?? response,
        made = response.order
          ? {
              ...raw,
              total_kobo: raw.totalKobo,
              payment_status: raw.paymentStatus,
            }
          : raw;
      if (!made?.id)
        throw Error(
          "The server response needs review. Your original request has been retained.",
        );
      await saveCheckoutDraft({ userId: user.id, order: made });
      if (!alive.current) return;
      completed.current = true;
      setOrder(made);
      setPending(null);
      journal.current = null;
      if (request.action === "checkout.mixed")
        await SecureStore.deleteItemAsync("easygas.serviceDrafts." + user.id);
      onPlaced(made.id);
      if (saveDetails) {
        try {
          const offer = await apiRef.current("account.checkout-details", {
            orderId: made.id,
          });
          if (offer.phone || offer.address)
            await apiRef.current("account.checkout-details", {
              orderId: made.id,
              save: {
                phone: !!offer.phone,
                address: !!offer.address,
                version: offer.version,
              },
            });
        } catch {
          setSaveNote(
            "Your order is saved. Update your preferred delivery details in Account.",
          );
        }
      }
    } catch (e: any) {
      if (!alive.current) return;
      if (Number.isInteger(e.status) && e.status < 500 && journal.current) {
        journal.current = null;
        setPending(null);
        key.current = randomUUID();
        await saveCheckoutDraft({
          userId: user.id,
          draft: { ...stateRef.current, gasEnabled },
        });
      }
      setError(
        friendlyMessage(e.message) +
          (journal.current
            ? " Your order may already be saved. Retry the same request or check Orders; do not start another order."
            : ""),
      );
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function finish() {
    if (user) await clearCheckoutDraft(user.id).catch(() => {});
    done(order?.id);
  }
  const stageLabels = gasEnabled
    ? ["Refill", "Delivery", "Review"]
    : ["Items", "Delivery", "Review"];
  const usableQuote = quote?.inputKey === fingerprint ? quote : null;
  useNextDock(
    order || servicePending
      ? null
      : {
          total: usableQuote
            ? money(nativeQuoteTotal(usableQuote))
            : preview !== undefined
              ? money(preview)
              : undefined,
          label: busy
            ? "Please wait…"
            : pending
              ? "Retry saved request"
              : step === 0
                ? "Delivery details"
                : step === 1
                  ? "Review order"
                  : "Confirm order",
          disabled:
            busy ||
            !storageReady ||
            (!pending &&
              (!ready ||
                (step === 0 && !!quantityError) ||
                (step === 2 &&
                  (!usableQuote || !payments.data?.methods.includes(method))))),
          onPress: () => {
            if (pending) void confirm();
            else if (step === 0) {
              setError("");
              Keyboard.dismiss();
              setStep(1);
            } else if (step === 1) void review();
            else void confirm();
          },
        },
  );
  if (servicePending)
    return (
      <View style={{ gap: 18 }}>
        <NextNotice>
          You have a saved appointment request to recover.
        </NextNotice>
        <NextButton
          label="View linked requests"
          onPress={() => onLinkedRequests?.()}
        />
      </View>
    );
  if (order)
    return (
      <View style={{ gap: 18 }}>
        {order.payment_method === "card" &&
        order.payment_status !== "verified" ? (
          <>
            <NextIntro
              title="One last step."
              detail="Your order is saved. Review the exact amount before opening secure payment."
            />
            <NativeHostedPayment
              api={api}
              userId={user.id}
              purpose="order"
              orderId={order.id}
              autoReview
              onPaid={() =>
                setOrder((o: any) => ({ ...o, payment_status: "verified" }))
              }
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => void finish()}
              style={{
                minHeight: 48,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <NextText kind="label" style={{ color: colors.primary }}>
                View saved order
              </NextText>
            </Pressable>
          </>
        ) : (
          <>
            <View style={{ paddingTop: 24, alignItems: "center", gap: 15 }}>
              <NextIcon name="check-circle-2" size={62} />
              <NextText kind="eyebrow" style={{ color: colors.primary }}>
                {order.payment_status === "verified"
                  ? "PAYMENT CONFIRMED"
                  : "ORDER SAVED"}
              </NextText>
              <NextText kind="title" style={{ textAlign: "center" }}>
                You’re all set.
              </NextText>
              <NextText style={{ color: colors.muted, textAlign: "center" }}>
                We’ve received your order.{"\n"}You’ll see every update right
                here.
              </NextText>
            </View>
            <NextCard>
              <NextText kind="heading">{order.reference}</NextText>
              <NextStatus value={order.status || "placed"} />
              <NextText>Order total {money(order.total_kobo)}</NextText>
              <NextText style={{ color: colors.muted }}>
                {order.address?.street || contact.street}
                {"\n"}
                {order.address?.zone || area?.name}
              </NextText>
            </NextCard>
            <NextText kind="small" style={{ color: colors.muted }}>
              We’ll confirm delivery coverage and cylinder eligibility before
              dispatch.
            </NextText>
            {saveNote && <NextNotice>{saveNote}</NextNotice>}
            <NextButton
              label="Track your order"
              onPress={() => void finish()}
            />
          </>
        )}
        {!!error && <NextNotice error>{error}</NextNotice>}
      </View>
    );
  return (
    <ScreenTransition identity={String(step)} fill={false}>
      <View style={{ gap: 18 }}>
        <View
          accessibilityLabel={"Step " + (step + 1) + " of 3"}
          style={{ flexDirection: "row", gap: 14, paddingVertical: 12 }}
        >
          {stageLabels.map((label, i) => (
            <View
              key={label}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                flex: 1,
              }}
            >
              <View
                style={{
                  height: 23,
                  width: 23,
                  borderRadius: 12,
                  backgroundColor: step >= i ? colors.elevated : colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {i < step ? (
                  <NextIcon name="check" size={13} />
                ) : (
                  <NextText kind="small">{i + 1}</NextText>
                )}
              </View>
              <NextText
                kind="small"
                style={{ color: step >= i ? colors.text : colors.muted }}
              >
                {label}
              </NextText>
            </View>
          ))}
        </View>
        {!!error && <NextNotice error>{error}</NextNotice>}
        {!storageReady && (
          <NextButton secondary label="Open Orders" onPress={done} />
        )}
        <Feedback
          loading={!pending && (!storageReady || !pricingReady)}
          error={pricingReady ? "" : error}
          retry={() => reload((n) => n + 1)}
        />
        {pending ? (
          <>
            <NextIntro
              title="Your order is safe."
              detail="The last response was interrupted. Your original request and identity are saved securely on this device."
            />
            <NextNotice>
              Retry sends the same request with the same idempotency key. Order
              details stay locked until its outcome is confirmed.
            </NextNotice>
            <NextButton secondary label="View my orders" onPress={done} />
          </>
        ) : step === 0 ? (
          <>
            <NextIntro
              title={"How much do\nyou need?"}
              detail="Order the gas you need, within your cylinder’s capacity."
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <NextText kind="label">
                {pricingReady
                  ? money(config.priceKobo) + " / kg"
                  : "Current gas price"}
              </NextText>
              <NextText kind="small" style={{ color: colors.muted }}>
                Delivery{" "}
                {pricingReady ? money(config.deliveryKobo) : "unavailable"}
              </NextText>
            </View>
            {lines.map((line, i) => (
              <NextCard key={i}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <NextText kind="heading">Cylinder {i + 1}</NextText>
                  {lines.length > 1 && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={"Remove cylinder " + (i + 1)}
                      onPress={() =>
                        setLines((l) => l.filter((_, n) => n !== i))
                      }
                      style={{
                        minHeight: 44,
                        minWidth: 44,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <NextIcon name="x" />
                    </Pressable>
                  )}
                </View>
                <NextChoice
                  label="Cylinder capacity"
                  value={line.capacityKg + " kg"}
                  onPress={() => setPicker("capacity:" + i)}
                />
                <NextText kind="eyebrow" style={{ color: colors.muted }}>
                  GAS TO REFILL
                </NextText>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 10,
                    borderRadius: 14,
                    backgroundColor: colors.elevated,
                  }}
                >
                  {[-1, 1].map((direction) => (
                    <React.Fragment key={direction}>
                      {direction === 1 && (
                        <TextInput
                          accessibilityLabel={
                            "Cylinder " + (i + 1) + " gas quantity in kilograms"
                          }
                          keyboardType="decimal-pad"
                          value={String(line.kg)}
                          onChangeText={(raw) => updateLine(i, { kg: raw })}
                          style={{
                            flex: 1,
                            textAlign: "center",
                            fontSize: 25,
                            fontWeight: "600",
                            color: colors.text,
                            minHeight: 48,
                          }}
                        />
                      )}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                          (direction === -1 ? "Reduce" : "Increase") +
                          " cylinder " +
                          (i + 1) +
                          " gas"
                        }
                        onPress={() => {
                          const next = nextGasQuantity(
                            line.kg,
                            direction as -1 | 1,
                            line.capacityKg,
                            config.policy,
                          );
                          if (next !== null) updateLine(i, { kg: next });
                        }}
                        style={{
                          height: 48,
                          width: 48,
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 14,
                          backgroundColor: colors.surface,
                        }}
                      >
                        <NextIcon name={direction === -1 ? "minus" : "plus"} />
                      </Pressable>
                    </React.Fragment>
                  ))}
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {[...new Set([3, 6, line.capacityKg])]
                    .filter((kg) => {
                      try {
                        gasLine(
                          kg,
                          line.capacityKg,
                          config.priceKobo,
                          config.policy,
                        );
                        return true;
                      } catch {
                        return false;
                      }
                    })
                    .map((kg) => (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={kg + " kg"}
                        key={kg}
                        onPress={() => updateLine(i, { kg })}
                        style={{
                          minHeight: 44,
                          flex: 1,
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 13,
                          borderWidth: 1,
                          borderColor: colors.border,
                          backgroundColor:
                            Number(line.kg) === kg
                              ? colors.elevated
                              : colors.surface,
                        }}
                      >
                        <NextText kind="label">{kg} kg</NextText>
                      </Pressable>
                    ))}
                </View>
                <NextText kind="small" style={{ color: colors.muted }}>
                  Cylinder condition will be checked before filling.
                </NextText>
              </NextCard>
            ))}
            {lines.length < 20 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add another cylinder"
                disabled={!ready || !!quantityError}
                onPress={() =>
                  setLines((l) => [
                    ...l,
                    {
                      capacityKg: config.policy?.capacitiesKg?.[0] ?? 12.5,
                      kg:
                        nextGasQuantity(
                          0,
                          1,
                          config.policy?.capacitiesKg?.[0] ?? 12.5,
                          config.policy,
                        ) ?? 0,
                    },
                  ])
                }
                style={{
                  minHeight: 48,
                  flexDirection: "row",
                  gap: 10,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <NextIcon name="plus" />
                <NextText kind="label" style={{ color: colors.primary }}>
                  Add another cylinder
                </NextText>
              </Pressable>
            )}
            {!!quantityError && <NextNotice error>{quantityError}</NextNotice>}
            <NextText kind="small" style={{ color: colors.muted }}>
              One delivery fee for this visit. Cylinder purchases and
              installation are separate.
            </NextText>
          </>
        ) : step === 1 ? (
          <>
            <NextIntro
              title={"Where should\nwe deliver?"}
              detail="Your saved details, ready to go."
            />
            {!!checkoutAddresses(profile).length && (
              <NextChoice
                label="Saved address"
                value="Choose a saved place"
                onPress={() => setPicker("address")}
              />
            )}
            <NextField
              label="Recipient name"
              value={contact.name}
              onChange={(v) => patchContact("name", v)}
            />
            <NextField
              label="Mobile number"
              value={contact.phone}
              onChange={(v) => patchContact("phone", v)}
              keyboardType="phone-pad"
            />
            <NextChoice
              label="Delivery area"
              value={area?.name || "Choose your area"}
              onPress={() => setPicker("area")}
            />
            <NextField
              label="Street address"
              value={contact.street}
              onChange={(v) => patchContact("street", v)}
            />
            <DeliveryPinPicker
              area={area}
              street={contact.street}
              zone={area?.name ?? ""}
              value={contact.deliveryPin}
              disabled={busy || !ready}
              onChange={(pin) => {
                edited.current = true;
                setContact((c: any) => ({ ...c, deliveryPin: pin }));
              }}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => setOptional(!optional)}
              style={{
                minHeight: 44,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <NextIcon name="plus" size={17} />
              <NextText kind="label" style={{ color: colors.primary }}>
                {optional ? "Hide" : "Add"} delivery instructions (optional)
              </NextText>
            </Pressable>
            {optional && (
              <View style={{ gap: 15 }}>
                <NextField
                  label="House / building number"
                  value={contact.building || ""}
                  onChange={(v) => patchContact("building", v)}
                />
                <NextField
                  label="Estate / landmark"
                  value={contact.landmark || ""}
                  onChange={(v) => patchContact("landmark", v)}
                />
                <NextField
                  label="Additional directions"
                  value={contact.directions || ""}
                  onChange={(v) => patchContact("directions", v)}
                  multiline
                />
              </View>
            )}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <NextChoice
                  label="Delivery date"
                  value={date || "Choose date"}
                  onPress={() => setPicker("date")}
                />
              </View>
              <View style={{ flex: 1 }}>
                <NextChoice
                  label="Time window"
                  value={window || "Choose time"}
                  onPress={() => setPicker("window")}
                />
              </View>
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Switch
                value={saveDetails}
                onValueChange={setSaveDetails}
                accessibilityLabel="Save delivery details for future orders"
              />
              <NextText kind="small" style={{ flex: 1, color: colors.muted }}>
                Save delivery details for future orders
              </NextText>
            </View>
          </>
        ) : (
          <>
            <NextIntro
              title={"Everything\nlooking good?"}
              detail="A clear total before you confirm."
            />
            {!usableQuote ? (
              <NextNotice>
                Return to Delivery to refresh your quote before confirming.
              </NextNotice>
            ) : (
              <>
                <NextCard>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <NextText kind="heading">
                      Your {gasEnabled ? "refill" : "items"}
                    </NextText>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Edit refill"
                      onPress={() => setStep(gasEnabled ? 0 : 1)}
                      style={{ minHeight: 44, justifyContent: "center" }}
                    >
                      <NextText kind="label" style={{ color: colors.primary }}>
                        Edit
                      </NextText>
                    </Pressable>
                  </View>
                  {gasEnabled &&
                    lines.map((l, i) => (
                      <View
                        key={i}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <NextText kind="small">
                          {l.kg} kg · {l.capacityKg} kg cylinder
                        </NextText>
                        <NextText kind="small">
                          {money(
                            gasLine(
                              l.kg,
                              l.capacityKg,
                              usableQuote.priceKobo,
                              usableQuote.policy,
                            ).subtotalKobo,
                          )}
                        </NextText>
                      </View>
                    ))}
                  {usableQuote.physicalLines?.map((p: any) => (
                    <View
                      key={p.productId}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <NextText kind="small" style={{ flex: 1 }}>
                        {p.quantity} × {p.name}
                      </NextText>
                      <NextText kind="small">
                        {money(p.quantity * p.unitPriceKobo)}
                      </NextText>
                    </View>
                  ))}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <NextText kind="small">Delivery · one visit</NextText>
                    <NextText kind="small">
                      {money(usableQuote.deliveryKobo)}
                    </NextText>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      borderTopWidth: 1,
                      borderColor: colors.border,
                      paddingTop: 15,
                    }}
                  >
                    <NextText kind="label">Order total</NextText>
                    <NextText kind="heading">
                      {money(nativeQuoteTotal(usableQuote))}
                    </NextText>
                  </View>
                </NextCard>
                <NextCard>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <NextText kind="heading">Deliver to</NextText>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Edit delivery details"
                      onPress={() => setStep(1)}
                      style={{ minHeight: 44, justifyContent: "center" }}
                    >
                      <NextText kind="label" style={{ color: colors.primary }}>
                        Edit
                      </NextText>
                    </Pressable>
                  </View>
                  <NextText kind="label">{contact.name}</NextText>
                  <NextText style={{ color: colors.muted }}>
                    {contact.street}
                  </NextText>
                  <NextText kind="small" style={{ color: colors.muted }}>
                    {area?.name} · {contact.phone}
                    {"\n"}
                    {date} · {window}
                  </NextText>
                </NextCard>
                <NextText kind="heading">How would you like to pay?</NextText>
                <Feedback
                  loading={!payments.data && !payments.error}
                  error={payments.error}
                  retry={payments.refresh}
                />
                {payments.options.map((p) => (
                  <Pressable
                    key={p.value}
                    accessibilityRole="radio"
                    accessibilityLabel={p.label}
                    accessibilityState={{ checked: method === p.value }}
                    onPress={() => setMethod(p.value)}
                    style={{
                      minHeight: 76,
                      padding: 17,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor:
                        method === p.value ? colors.primary : colors.border,
                      backgroundColor:
                        method === p.value ? colors.elevated : colors.surface,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 13,
                    }}
                  >
                    <NextIcon
                      name={
                        p.value === "wallet"
                          ? "wallet"
                          : p.value === "card"
                            ? "credit-card"
                            : "banknote"
                      }
                    />
                    <View style={{ flex: 1, gap: 4 }}>
                      <NextText kind="label">
                        {p.value === "card"
                          ? "Credit / debit card"
                          : p.value === "wallet"
                            ? "EasyGas wallet"
                            : "Cash on delivery"}
                      </NextText>
                      <NextText kind="small" style={{ color: colors.muted }}>
                        {p.value === "card"
                          ? "Processing fee shown before payment"
                          : p.value === "wallet"
                            ? money(payments.data?.balanceKobo ?? 0) +
                              " available"
                            : "Subject to current branch policy"}
                      </NextText>
                    </View>
                    <View
                      style={{
                        width: 19,
                        height: 19,
                        borderRadius: 10,
                        borderWidth: method === p.value ? 5 : 1,
                        borderColor:
                          method === p.value ? colors.primary : colors.muted,
                      }}
                    />
                  </Pressable>
                ))}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setPicker("rewards")}
                  style={{
                    minHeight: 48,
                    flexDirection: "row",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <NextIcon name="gift" />
                  <NextText kind="label" style={{ color: colors.primary }}>
                    Rewards & credits (optional)
                  </NextText>
                </Pressable>
                <NextText kind="small" style={{ color: colors.muted }}>
                  Your order uses the current quote. Stock, coverage and safe
                  filling remain subject to confirmation.
                </NextText>
              </>
            )}
          </>
        )}
        {!!appointments.length && !order && !pending && (
          <NextCard>
            <NextText kind="heading">Linked service requests</NextText>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Switch
                value={includeAppointments}
                onValueChange={setIncludeAppointments}
                accessibilityLabel="Include staged service requests"
              />
              <NextText kind="small" style={{ flex: 1 }}>
                Include {appointments.length} saved service request
                {appointments.length === 1 ? "" : "s"}. Service charges are
                separate.
              </NextText>
            </View>
            {includeAppointments &&
              appointments.map((a, i) => (
                <NextText kind="small" key={i}>
                  {a.name} ·{" "}
                  {a.totalKobo == null
                    ? "Quotation required"
                    : money(a.totalKobo)}
                </NextText>
              ))}
          </NextCard>
        )}
        {picker === "date" && (
          <MobileNextCalendar
            value={date}
            onSelect={setDate}
            onClose={() => setPicker(null)}
          />
        )}
        {picker === "rewards" && (
          <ContextSheet
            title="Rewards & credits"
            onClose={() => setPicker(null)}
          >
            <NativeRewardSelector api={api} onChange={setRewardSelection} />
          </ContextSheet>
        )}
        {picker && picker !== "date" && picker !== "rewards" && (
          <ContextSheet
            title={
              picker.startsWith("capacity:")
                ? "Cylinder capacity"
                : picker === "area"
                  ? "Delivery area"
                  : picker === "address"
                    ? "Saved addresses"
                    : "Delivery window"
            }
            onClose={() => setPicker(null)}
          >
            <NextList>
              {picker.startsWith("capacity:")
                ? (config?.policy?.capacitiesKg ?? []).map(
                    (capacity: number) => (
                      <NextRow
                        key={capacity}
                        title={capacity + " kg"}
                        icon="flame"
                        onPress={() => {
                          const i = Number(picker.split(":")[1]);
                          updateLine(i, {
                            capacityKg: capacity,
                            kg: Math.min(Number(lines[i].kg), capacity),
                          });
                          setPicker(null);
                        }}
                      />
                    ),
                  )
                : picker === "area"
                  ? (config?.locations ?? []).map((a: any) => (
                      <NextRow
                        key={a.id}
                        title={a.name}
                        detail={
                          hasConfirmedDeliveryCoverage(a.coverage)
                            ? "Delivery coverage confirmed"
                            : "Coverage confirmation required"
                        }
                        icon="map-pin"
                        onPress={() => {
                          edited.current = true;
                          setLocationId(a.id);
                          setContact((c: any) => ({
                            ...c,
                            deliveryPin: undefined,
                          }));
                          setQuote(null);
                          setPicker(null);
                        }}
                      />
                    ))
                  : picker === "address"
                    ? checkoutAddresses(profile).map((a) => (
                        <NextRow
                          key={a.id}
                          title={a.label}
                          detail={a.street}
                          icon="map-pin"
                          onPress={() => {
                            edited.current = true;
                            setContact(
                              checkoutDelivery(profile, a, user?.name),
                            );
                            setLocationId(a.location_id || "");
                            setPicker(null);
                          }}
                        />
                      ))
                    : (catalogue?.windows ?? []).map((w: string) => (
                        <NextRow
                          key={w}
                          title={w}
                          icon="clock"
                          onPress={() => {
                            setWindow(w);
                            setPicker(null);
                          }}
                        />
                      ))}
            </NextList>
          </ContextSheet>
        )}
      </View>
    </ScreenTransition>
  );
}

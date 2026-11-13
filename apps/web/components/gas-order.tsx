"use client";
import { useCardCheckout, OrderCardPayment } from "./hosted-payment";
import { RewardCheckoutField } from "./easyrewards";
import {
  deliveryAreaEvent,
  readDeliveryArea,
  writeDeliveryArea,
} from "./delivery-area-preference";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "./workspace-link";
import {
  resolveAddressLocation,
  addressLocationMessage,
} from "../../../packages/business-rules/src/address-location";
import { api, Notice, Loading } from "./ui";
import { ActionLoadingIndicator } from "./easygas-loader";
import {
  ArrowRight,
  Cylinder,
  House,
  MapPin,
  ShoppingCart,
  Tag,
  Truck,
} from "lucide-react";
import {
  gasLine,
  nextGasQuantity,
  gasMoney as money,
} from "../../../packages/business-rules/src/gas-pricing";
import {
  deliveryCoveragePending,
  hasConfirmedDeliveryCoverage,
} from "../../../packages/business-rules/src/delivery-coverage";

function CoverageHelp() {
  return (
    <div role="status">
      <p>{deliveryCoveragePending}</p>
      <Link className="text-link" href="/contact">
        Contact EasyGas
      </Link>
    </div>
  );
}

export default function GasOrder({
  catalogue,
  user,
  items = [],
  onDone,
  compact = false,
}: {
  catalogue: any;
  user: any;
  items?: any[];
  onDone?: () => void;
  compact?: boolean;
}) {
  const [config, setConfig] = useState<any>(catalogue?.gas),
    [lines, setLines] = useState([{ capacityKg: 12.5, kg: 0 }]),
    [quote, setQuote] = useState<any>(null),
    [error, setError] = useState(""),
    [catalogueRevision, retryCatalogue] = useState(0),
    [busy, setBusy] = useState(false),
    [order, setOrder] = useState<any>(null),
    [rewardPoints, setRewardPoints] = useState(0),
    [rewardOfferId, setRewardOfferId] = useState(""),
    [appointments, setAppointments] = useState<any[]>([]),
    [includeAppointments, setIncludeAppointments] = useState(false),
    [saved, setSaved] = useState<any[]>([]),
    [key] = useState(() => crypto.randomUUID());
  const [address, setAddress] = useState({
      name: user?.name ?? "",
      phone: "",
      street: "",
      zone: "",
      locationId: "",
      building: "",
      landmark: "",
      directions: "",
    }),
    [date, setDate] = useState(""),
    [window, setWindow] = useState(catalogue?.windows?.[0] ?? ""),
    [method, setMethod] = useState("cash_on_delivery");
  const [compactKg, setCompactKg] = useState("");
  const [pricingBranch, setPricingBranch] = useState<string | null>(null);
  const [pricingFailed, setPricingFailed] = useState<string | null>(null);
  const compactSubmit = useRef(false);
  const requestLock = useRef(false);
  const details = useRef<HTMLDetailsElement>(null);
  const quoteKey = JSON.stringify([
    lines,
    items,
    address,
    date,
    window,
    method,
    includeAppointments,
  ]);
  const latestQuoteKey = useRef(quoteKey);
  latestQuoteKey.current = quoteKey;
  const selectedArea = config?.locations?.find(
    (l: any) => l.id === address.locationId,
  );
  const areaBranch = selectedArea?.branch_id;
  const coveragePending =
    selectedArea && !hasConfirmedDeliveryCoverage(selectedArea.coverage);
  const requestedBranch = areaBranch ?? "lagos";
  const cardEnabled = useCardCheckout(user?.id);
  useEffect(() => {
    if (!catalogue) return;
    if (
      (method === "cash_on_delivery" && catalogue.codEnabled) ||
      (method === "wallet" && catalogue.walletEnabled) ||
      (method === "card" && cardEnabled)
    )
      return;
    setMethod(
      catalogue.codEnabled
        ? "cash_on_delivery"
        : catalogue.walletEnabled
          ? "wallet"
          : cardEnabled
            ? "card"
            : "",
    );
  }, [catalogue?.codEnabled, catalogue?.walletEnabled, cardEnabled, method]);
  useEffect(() => {
    let live = true;
    setPricingBranch(null);
    setPricingFailed(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      if (live) {
        setPricingFailed(requestedBranch);
        setError("The gas catalogue request timed out. Please retry.");
        controller.abort();
      }
    }, 15000);
    api(
      "gas.catalogue?branchId=" + encodeURIComponent(requestedBranch),
      undefined,
      { signal: controller.signal },
    )
      .then((value) => {
        if (live) {
          setConfig(value);
          setPricingBranch(requestedBranch);
        }
      })
      .catch((e) => {
        if (live && !controller.signal.aborted) {
          setPricingFailed(requestedBranch);
          setError(e.message);
        }
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      live = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [catalogueRevision, requestedBranch]);
  useEffect(() => {
    const identity = user?.id ?? "guest";
    const apply = (id: string) => {
      if (!id) {
        setAddress((a) => ({ ...a, locationId: "", zone: "" }));
        return;
      }
      const location = config?.locations?.find((l: any) => l.id === id);
      if (location)
        setAddress((a) => ({
          ...a,
          locationId: location.id,
          zone: location.name,
        }));
    };
    const preferred = readDeliveryArea(identity);
    if (preferred) apply(preferred);
    const change = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.identity === identity) apply(detail.id);
    };
    globalThis.window.addEventListener(deliveryAreaEvent, change);
    return () =>
      globalThis.window.removeEventListener(deliveryAreaEvent, change);
  }, [config, user?.id]);
  useEffect(() => {
    if (user) {
      try {
        setAppointments(
          JSON.parse(
            sessionStorage.getItem("easygas.serviceDrafts." + user.id) ?? "[]",
          ).filter((a: any) => !a.bundleId),
        );
      } catch {}
    }
  }, [user?.id]);
  useEffect(() => {
    if (user)
      api("account.profile")
        .then((p) => {
          setSaved(p.addresses);
          const savedDefault = p.addresses.find(
            (a: any) => a.is_default && a.location_available,
          );
          if (savedDefault)
            setAddress((a) =>
              a.locationId
                ? a
                : {
                    ...a,
                    ...savedDefault.details,
                    name: savedDefault.details?.recipient ?? user.name,
                    phone: savedDefault.phone,
                    street: savedDefault.street,
                    zone: savedDefault.zone,
                    locationId: savedDefault.location_id,
                  },
            );
        })
        .catch(() => {});
  }, [user?.id]);
  useEffect(() => {
    if (compact) return;
    try {
      const draft = JSON.parse(
        sessionStorage.getItem("easygas.gasDraft") ?? "null",
      );
      if (draft) {
        if (
          Array.isArray(draft.lines) &&
          draft.lines.length &&
          draft.lines.length <= 10
        )
          setLines(draft.lines);
        if (typeof draft.date === "string") setDate(draft.date);
        if (typeof draft.window === "string") setWindow(draft.window);
        if (typeof draft.method === "string") setMethod(draft.method);
        setAddress((a) => ({ ...a, ...draft.address }));
        sessionStorage.removeItem("easygas.gasDraft");
      }
    } catch {}
  }, [compact]);
  useEffect(() => {
    const capacities = config?.policy?.capacitiesKg;
    if (capacities?.length)
      setLines((ls) =>
        ls.map((l) =>
          capacities.includes(l.capacityKg)
            ? l
            : { ...l, capacityKg: capacities[0] },
        ),
      );
  }, [config]);
  useEffect(
    () => setQuote(null),
    [
      JSON.stringify(lines),
      JSON.stringify(address),
      date,
      window,
      method,
      JSON.stringify(items),
      includeAppointments,
    ],
  );
  const [addressHint, setAddressHint] = useState("");
  function enterAddress(street: string) {
    const result = resolveAddressLocation(street, config?.locations ?? []);
    const locationId = result.location?.id ?? "";
    setAddress((a) => ({
      ...a,
      street,
      locationId,
      zone: result.location?.name ?? "",
    }));
    setAddressHint(
      addressLocationMessage(result.status, result.location?.name),
    );
    writeDeliveryArea(user?.id ?? "guest", locationId);
  }
  const completeAddress = (
    <>
      <label>
        Complete house address
        <textarea
          autoComplete="street-address"
          rows={2}
          maxLength={1000}
          placeholder="House/flat number, street, estate, area, city"
          value={address.street}
          required={!compact}
          onChange={(e) => enterAddress(e.target.value)}
        />
      </label>
      <span className="address-location-feedback" role="status">
        {addressHint ||
          "Include your area after a comma to select the delivery location automatically."}
      </span>
    </>
  );
  if (!config)
    return error ? (
      <section>
        <Notice type="error" message={error} />
        <button
          type="button"
          className="button secondary"
          onClick={() => {
            setError("");
            retryCatalogue((value) => value + 1);
          }}
        >
          Retry gas catalogue
        </button>
      </section>
    ) : (
      <Loading page={!compact} />
    );
  const physical = items.filter(
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
  let estimated = 0,
    estimateValid = false,
    estimateError = "";
  try {
    estimated = lines.reduce(
      (n, l) =>
        n +
        gasLine(
          compact ? compactKg : l.kg,
          l.capacityKg,
          config.priceKobo,
          config.policy &&
            ["minimumKg", "maximumKg", "incrementKg", "precision"].every(
              (k) => config.policy[k] != null,
            )
            ? config.policy
            : undefined,
        ).subtotalKobo,
      0,
    );
    estimateValid = estimated > 0;
  } catch (e: any) {
    estimateError = e.message;
  }
  const configured =
    config.policy &&
    ["minimumKg", "maximumKg", "incrementKg", "precision"].every(
      (k) => config.policy[k] != null,
    );
  const pricingLoading = pricingBranch !== requestedBranch && pricingFailed !== requestedBranch;
  const priceReady =
    pricingBranch === requestedBranch &&
    Number.isSafeInteger(config.priceKobo) &&
    config.priceKobo > 0;
  const feeReady =
    pricingBranch === requestedBranch &&
    config.feeVersion != null &&
    Number.isSafeInteger(config.deliveryKobo) &&
    config.deliveryKobo >= 0;
  const productsPriced = physical.every(
    (item) =>
      Number(
        catalogue.products.find((product: any) => product.id === item.productId)
          ?.price_kobo,
      ) > 0,
  );
  const currentQuote = quote?.inputKey === quoteKey ? quote : null;
  const canReview =
    !!areaBranch &&
    !coveragePending &&
    configured &&
    estimateValid &&
    priceReady &&
    feeReady &&
    catalogue.orderingEnabled &&
    !!method;

  function editOrder(section: string) {
    setQuote(null);
    document
      .getElementById(section)
      ?.querySelector<HTMLElement>("input, select, textarea, button")
      ?.focus();
  }

  async function review(e: FormEvent) {
    e.preventDefault();
    if (!canReview || requestLock.current) return;
    requestLock.current = true;
    setBusy(true);
    setError("");
    try {
      const q = await api(
        "gas.quote",
        {
          lines,
          items: physical,
          branchId: areaBranch,
          locationId: address.locationId,
        },
        { signal: AbortSignal.timeout(15000) },
      );
      if (latestQuoteKey.current !== quoteKey) return;
      setConfig(q);
      setQuote({
        inputKey: quoteKey,
        ...q,
        totalKobo: q.subtotalKobo + q.deliveryKobo + q.physicalSubtotalKobo,
      });
    } catch (e: any) {
      if (latestQuoteKey.current !== quoteKey) return;
      setQuote(null);
      setError(
        e.name === "TimeoutError"
          ? "The quotation timed out. Try again."
          : e.message,
      );
      if (e.code === "DELIVERY_COVERAGE_PENDING")
        retryCatalogue((revision) => revision + 1);
    } finally {
      requestLock.current = false;
      setBusy(false);
    }
  }
  async function confirm() {
    if (coveragePending || !currentQuote || requestLock.current) return;
    requestLock.current = true;
    setBusy(true);
    setError("");
    try {
      const payload = {
        items: physical,
        gasLines: lines,
        pricing: {
          priceVersion: currentQuote.priceVersion,
          feeVersion: currentQuote.feeVersion,
          policyVersion: currentQuote.policyVersion,
          totalKobo: currentQuote.totalKobo,
        },
        address,
        date,
        window,
        ...(rewardPoints ? { rewardPoints } : {}),
        ...(rewardOfferId ? { rewardOfferId } : {}),
        paymentMethod: method,
        instructions: address.directions,
        idempotencyKey: key,
      };
      const result =
        includeAppointments && appointments.length
          ? await api("checkout.mixed", {
              products: payload,
              appointments: appointments.map((a) => a.request),
              idempotencyKey: key,
            })
          : await api("checkout", payload);
      const o = result.order
        ? {
            id: result.order.id,
            reference: result.order.reference,
            total_kobo: result.order.totalKobo,
            payment_status: result.order.paymentStatus,
          }
        : result;
      if (includeAppointments)
        sessionStorage.removeItem("easygas.serviceDrafts." + user.id);
      setOrder(o);
      onDone?.();
    } catch (e: any) {
      setQuote(null);
      setError(e.message);
      retryCatalogue((revision) => revision + 1);
    } finally {
      requestLock.current = false;
      setBusy(false);
    }
  }
  if (order)
    return (
      <section className="surface">
        <h2>Order received · {order.reference}</h2>
        <p>
          {money(order.total_kobo)} · Payment {order.payment_status}. Your
          cylinder must pass operational inspection before dispatch.
        </p>
        <OrderCardPayment order={order} />
        <Link href="/orders">View and track your order</Link>
      </section>
    );
  if (compact) {
    const capacity = lines[0].capacityKg;
    const pricingReady = pricingBranch === requestedBranch;
    const feeReady =
      Number.isSafeInteger(config.deliveryKobo) &&
      config.deliveryKobo >= 0 &&
      config.feeVersion != null;
    const changeQuantity = (raw: string) => {
      setCompactKg(raw);
      setError("");
    };
    const previous = nextGasQuantity(compactKg, -1, capacity, config.policy);
    const next = nextGasQuantity(compactKg, 1, capacity, config.policy);
    const eligible =
      configured &&
      pricingReady &&
      feeReady &&
      estimateValid &&
      areaBranch &&
      !coveragePending &&
      address.street.trim().length >= 8;
    return (
      <section
        id="quick-order"
        className="quick-order compact-gas"
        aria-labelledby="compact-gas-title"
      >
        <header className="compact-gas-heading">
          <span className="compact-gas-mark">
            <Cylinder aria-hidden="true" />
          </span>
          <div>
            <h2 id="compact-gas-title">Order the gas you need</h2>
            <p>Quick, secure and home delivery</p>
          </div>
        </header>
        <div className="compact-gas-prices" aria-live="polite">
          <div>
            <Tag aria-hidden="true" />
            <span>
              <strong>
                {pricingLoading ? <ActionLoadingIndicator label="Loading gas price" /> : pricingReady && config.priceKobo > 0
                  ? money(config.priceKobo) + "/kg"
                  : "Unavailable"}
              </strong>
              <small>Gas price</small>
            </span>
          </div>
          <div>
            <Truck aria-hidden="true" />
            <span>
              <strong>
                {pricingLoading ? <ActionLoadingIndicator label="Loading delivery fee" /> : pricingReady && feeReady
                  ? money(config.deliveryKobo)
                  : "Unavailable"}
              </strong>
              <small>Flat delivery</small>
            </span>
          </div>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!eligible || compactSubmit.current) return;
            compactSubmit.current = true;
            setBusy(true);
            setError("");
            try {
              const draftLines = [
                { capacityKg: capacity, kg: Number(compactKg) },
              ];
              const q = await api(
                "gas.quote",
                {
                  lines: draftLines,
                  branchId: areaBranch,
                  locationId: address.locationId,
                },
                { signal: AbortSignal.timeout(15000) },
              );
              if (
                q.priceVersion !== config.priceVersion ||
                q.feeVersion !== config.feeVersion ||
                q.policyVersion !== config.policyVersion
              ) {
                setConfig(q);
                setError(
                  "Gas pricing or quantity limits changed. Review the updated estimate and try again.",
                );
                return;
              }
              sessionStorage.setItem(
                "easygas.gasDraft",
                JSON.stringify({
                  lines: draftLines,
                  address: { ...address, street: address.street.trim() },
                }),
              );
              globalThis.window.location.assign("/gas-order");
            } catch (e: any) {
              setError(
                e.name === "TimeoutError"
                  ? "The request timed out. Try again."
                  : e.message,
              );
            } finally {
              compactSubmit.current = false;
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={busy}>
            <label htmlFor="compact-capacity">Cylinder capacity</label>
            <div className="compact-gas-control">
              <Cylinder aria-hidden="true" />
              <select
                id="compact-capacity"
                value={capacity}
                onChange={(e) => {
                  setLines([
                    { ...lines[0], capacityKg: Number(e.target.value) },
                  ]);
                  setError("");
                }}
              >
                {config.policy?.capacitiesKg?.map((c: number) => (
                  <option key={c} value={c}>
                    {c} kg
                  </option>
                ))}
              </select>
            </div>
            <label htmlFor="compact-kg">Gas quantity (kg)</label>
            <div className="quantity-stepper compact-gas-stepper">
              <button
                type="button"
                className="icon-button"
                aria-label="Decrease gas quantity"
                disabled={previous === null}
                onClick={() =>
                  previous !== null && changeQuantity(String(previous))
                }
              >
                −
              </button>
              <input
                id="compact-kg"
                type="text"
                inputMode="decimal"
                maxLength={12}
                value={compactKg}
                placeholder="0"
                onChange={(e) => changeQuantity(e.target.value)}
                aria-describedby="compact-estimate"
              />
              <button
                type="button"
                className="icon-button"
                aria-label="Increase gas quantity"
                disabled={next === null}
                onClick={() => next !== null && changeQuantity(String(next))}
              >
                +
              </button>
            </div>
            <label htmlFor="compact-location">Delivery location</label>
            <div className="compact-gas-control">
              <MapPin aria-hidden="true" />
              <select
                id="compact-location"
                value={address.locationId}
                onChange={(e) => {
                  const location = config.locations.find(
                    (l: any) => l.id === e.target.value,
                  );
                  writeDeliveryArea(user?.id ?? "guest", e.target.value);
                  setAddress({
                    ...address,
                    locationId: e.target.value,
                    zone: location?.name ?? "",
                  });
                  setError("");
                }}
              >
                <option value="">Select location</option>
                {config.locations.map((l: any) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                    {hasConfirmedDeliveryCoverage(l.coverage)
                      ? ""
                      : " (coverage pending)"}
                  </option>
                ))}
              </select>
            </div>
            {coveragePending && <CoverageHelp />}
            <label htmlFor="compact-address">House address</label>
            <div className="compact-gas-control">
              <House aria-hidden="true" />
              <input
                id="compact-address"
                autoComplete="street-address"
                maxLength={250}
                placeholder="House/flat number, street, estate, area, city"
                value={address.street}
                onChange={(e) => {
                  setAddress({ ...address, street: e.target.value });
                  setError("");
                }}
              />
            </div>
            <div
              id="compact-estimate"
              className="gas-estimate"
              aria-live="polite"
            >
              {pricingLoading ? (
                <ActionLoadingIndicator label="Checking current prices" />
              ) : !pricingReady ? (
                "Current prices could not be loaded."
              ) : !configured || !feeReady ? (
                "Ordering is unavailable until pricing and quantity limits are configured."
              ) : compactKg && !estimateValid ? (
                estimateError
              ) : estimateValid ? (
                <p className="gas-estimate-breakdown">
                  <span>
                    Gas {money(estimated)} · Delivery{" "}
                    {money(config.deliveryKobo)}
                  </span>
                  <strong>
                    {money(estimated + config.deliveryKobo)} estimated
                  </strong>
                </p>
              ) : (
                "Enter a gas quantity to see your total."
              )}
              {estimateValid &&
                address.street.length > 0 &&
                address.street.trim().length < 8 && (
                  <small>Enter your complete house address.</small>
                )}
            </div>
            {error && <Notice type="error" message={error} />}
            {error && !pricingReady && (
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setError("");
                  retryCatalogue((n) => n + 1);
                }}
              >
                Retry prices
              </button>
            )}
            <button
              type="submit"
              className="button full compact-gas-submit"
              disabled={!eligible}
            >
              <ShoppingCart aria-hidden="true" size={20} />
              {busy ? "Checking quote…" : "Order Gas Now"}
              <ArrowRight aria-hidden="true" size={20} />
            </button>
          </fieldset>
        </form>
        <Link className="text-link compact-gas-services" href="/services">
          View Our Services
        </Link>
      </section>
    );
  }
  return (
    <section className="gas-order gas-order-workspace">
      <header className="gas-order-heading">
        <div>
          <h1>Order Cooking Gas</h1>
          <p>
            Choose your cylinder size, enter the gas quantity and arrange home
            delivery.
          </p>
        </div>
        <img
          src="/assets/cylinder-illustration.png"
          alt=""
          width="104"
          height="120"
        />
      </header>
      {!configured && (
        <Notice message="Gas ordering is awaiting business quantity limits and verified stock." />
      )}
      <form onSubmit={review} className="gas-order-grid">
        <fieldset
          className="surface gas-order-editor"
          disabled={busy}
          onInvalid={() => {
            if (details.current?.querySelector(":invalid"))
              details.current.open = true;
          }}
        >
          <section id="gas-order-lines" className="gas-order-step">
            <h2>
              <span>1</span> Cylinders and gas quantity
            </h2>
            {lines.map((line, i) => {
              const l = line;
              const previous = nextGasQuantity(
                l.kg,
                -1,
                l.capacityKg,
                config.policy,
              );
              const next = nextGasQuantity(
                l.kg,
                1,
                l.capacityKg,
                config.policy,
              );
              const update = (kg: number) =>
                setLines((current) =>
                  current.map((item, index) =>
                    index === i ? { ...item, kg } : item,
                  ),
                );
              return (
                <fieldset key={i} className="gas-cylinder-line">
                  <legend>Cylinder {i + 1}</legend>
                  <p id={`gas-capacity-${i}`}>Cylinder capacity guidance</p>
                  <div
                    className="gas-capacity-tiles"
                    role="group"
                    aria-labelledby={`gas-capacity-${i}`}
                  >
                    {config.policy.capacitiesKg.map((capacity: number) => (
                      <button
                        key={capacity}
                        type="button"
                        aria-pressed={l.capacityKg === capacity}
                        onClick={() =>
                          setLines((current) =>
                            current.map((item, index) =>
                              index === i
                                ? { ...item, capacityKg: capacity }
                                : item,
                            ),
                          )
                        }
                      >
                        <img
                          src="/assets/cylinder-illustration.png"
                          alt=""
                          width="24"
                          height="32"
                        />
                        {capacity} kg
                      </button>
                    ))}
                  </div>
                  <label>
                    Requested gas (kg)
                    <input
                      type="number"
                      min={config.policy.minimumKg ?? undefined}
                      max={Math.min(
                        l.capacityKg,
                        config.policy.maximumKg ?? l.capacityKg,
                      )}
                      step="any"
                      inputMode="decimal"
                      value={l.kg || ""}
                      required
                      onChange={(e) =>
                        setLines(
                          lines.map((x, n) =>
                            n === i ? { ...x, kg: Number(e.target.value) } : x,
                          ),
                        )
                      }
                    />
                  </label>
                  <div className="button-row gas-quantity-actions">
                    <button
                      type="button"
                      className="button secondary"
                      aria-label={`Decrease gas for cylinder ${i + 1}`}
                      disabled={previous === null}
                      onClick={() => previous !== null && update(previous)}
                    >
                      −
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      aria-label={`Increase gas for cylinder ${i + 1}`}
                      disabled={next === null}
                      onClick={() => next !== null && update(next)}
                    >
                      +
                    </button>
                    {config.policy.capacitiesKg
                      .filter((quantity: number) => {
                        if (!configured || !priceReady) return false;
                        try {
                          gasLine(
                            quantity,
                            l.capacityKg,
                            config.priceKobo,
                            config.policy,
                          );
                          return true;
                        } catch {
                          return false;
                        }
                      })
                      .map((quantity: number) => (
                        <button
                          key={quantity}
                          className="button secondary"
                          type="button"
                          aria-label={`Set gas for cylinder ${i + 1} to ${quantity} kg`}
                          aria-pressed={l.kg === quantity}
                          onClick={() => update(quantity)}
                        >
                          {quantity} kg
                        </button>
                      ))}
                    {lines.length > 1 && (
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() =>
                          setLines(lines.filter((_, n) => n !== i))
                        }
                      >
                        Remove cylinder
                      </button>
                    )}
                  </div>
                </fieldset>
              );
            })}
            <button
              className="button secondary"
              type="button"
              disabled={lines.length >= 20}
              onClick={() =>
                setLines([
                  ...lines,
                  { capacityKg: config.policy.capacitiesKg[0], kg: 0 },
                ])
              }
            >
              Add another cylinder
            </button>
            {estimateError && lines.some((line) => line.kg > 0) && (
              <p role="status">{estimateError}</p>
            )}
          </section>
          {physical.length > 0 && (
            <section className="gas-order-step">
              <h2>Included products</h2>
              <ul>
                {physical.map((item) => (
                  <li key={item.productId}>
                    {catalogue.products.find(
                      (product: any) => product.id === item.productId,
                    )?.name ?? "Product"}{" "}
                    × {item.quantity}
                  </li>
                ))}
              </ul>
              <Link href="/cart">Edit cart</Link>
            </section>
          )}
          <p>
            Address coverage must be confirmed before dispatch. Refill
            quantities remain subject to verified cylinder condition, residual
            gas and filling eligibility. A new physical cylinder and
            installation are priced separately.
          </p>
          {appointments.length > 0 && (
            <section className="surface">
              <h2>Installation and service appointments</h2>
              <label>
                <input
                  type="checkbox"
                  checked={includeAppointments}
                  onChange={(e) => setIncludeAppointments(e.target.checked)}
                />{" "}
                Include my separately configured service appointments
              </label>
              {appointments.map((a, i) => (
                <p key={i}>
                  {a.name} ·{" "}
                  {a.totalKobo === null
                    ? "Quotation required"
                    : money(a.totalKobo)}{" "}
                  · {a.label}
                </p>
              ))}
              <p>
                Service charges and call-outs remain separate from the one gas
                delivery fee. Appointment capacity and pricing are rechecked on
                confirmation.
              </p>
            </section>
          )}
          <section id="gas-order-address" className="gas-order-step">
            <h2>
              <span>2</span> Delivery details
            </h2>
            {saved.length > 0 && (
              <label>
                Use a saved address
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const a = saved.find((a) => a.id === e.target.value);
                    if (a)
                      setAddress({
                        ...address,
                        ...a.details,
                        name: a.details?.recipient ?? user.name,
                        phone: a.phone,
                        street: a.street,
                        zone: a.zone,
                        locationId: a.location_id,
                      });
                  }}
                >
                  <option value="">Enter a new address</option>
                  {saved.map((a) => (
                    <option
                      key={a.id}
                      value={a.id}
                      disabled={!a.location_available}
                    >
                      {a.label} · {a.zone}
                      {!a.location_available ? " (unavailable)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="gas-address-grid">
              <label>
                Delivery location
                <select
                  required
                  value={address.locationId}
                  onChange={(e) => {
                    const l = config.locations.find(
                      (l: any) => l.id === e.target.value,
                    );
                    setError("");
                    setAddressHint(
                      "Delivery location chosen manually. Please check it matches your address.",
                    );
                    writeDeliveryArea(user?.id ?? "guest", e.target.value);
                    setAddress({
                      ...address,
                      locationId: e.target.value,
                      zone: l?.name ?? "",
                    });
                  }}
                >
                  <option value="">Choose your location</option>
                  {config.locations.map((l: any) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                      {hasConfirmedDeliveryCoverage(l.coverage)
                        ? ""
                        : " (coverage pending)"}
                    </option>
                  ))}
                </select>
              </label>
              <div>{completeAddress}</div>
            </div>
            {coveragePending && <CoverageHelp />}
            <details ref={details} className="gas-delivery-details">
              <summary>Additional delivery details</summary>
              <div className="gas-address-grid">
                {[
                  ["name", "Recipient name"],
                  ["phone", "Recipient phone"],
                  ["building", "Building / house number"],
                  ["landmark", "Estate / landmark"],
                  ["directions", "Additional directions"],
                ].map(([k, label]) => (
                  <label key={k}>
                    {label}
                    <input
                      value={(address as any)[k]}
                      required={[
                        "name",
                        "phone",
                        "street",
                        "building",
                      ].includes(k)}
                      onChange={(e) =>
                        setAddress({ ...address, [k]: e.target.value })
                      }
                    />
                  </label>
                ))}
              </div>
            </details>
          </section>
          <section id="gas-order-schedule" className="gas-order-step">
            <h2>
              <span>3</span> Schedule and payment
            </h2>
            <div className="gas-address-grid">
              <label>
                Delivery date
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label>
                Delivery window
                <select
                  required
                  value={window}
                  onChange={(e) => setWindow(e.target.value)}
                >
                  {catalogue.windows.map((w: string) => (
                    <option key={w}>{w}</option>
                  ))}
                </select>
              </label>
            </div>
            <RewardCheckoutField
              onChange={setRewardPoints}
              onOfferChange={setRewardOfferId}
            />
            <label id="gas-order-payment">
              Payment arrangement
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                {catalogue.codEnabled && (
                  <option value="cash_on_delivery">
                    Cash on delivery · payment stays unverified
                  </option>
                )}
                {catalogue.walletEnabled && (
                  <option value="wallet">Available purchase credit</option>
                )}
                {cardEnabled && (
                  <option value="card">
                    Credit / debit card · Paystack sandbox
                  </option>
                )}
                {!catalogue.codEnabled &&
                  !catalogue.walletEnabled &&
                  !cardEnabled && (
                    <option value="">No payment arrangement enabled</option>
                  )}
              </select>
            </label>
          </section>
        </fieldset>
        <aside
          className="surface gas-order-summary"
          aria-labelledby="gas-order-summary-title"
        >
          <h2 id="gas-order-summary-title">
            <ShoppingCart aria-hidden="true" /> Order Summary
          </h2>
          <dl aria-live="polite">
            <div>
              <dt>Gas price</dt>
              <dd>
                {pricingLoading ? <ActionLoadingIndicator label="Loading gas price" /> : priceReady ? money(config.priceKobo) + " / kg" : "Unavailable"}
              </dd>
            </div>
            <div>
              <dt>Quantity</dt>
              <dd>
                {new Intl.NumberFormat("en-NG", {
                  maximumFractionDigits: 3,
                }).format(lines.reduce((sum, line) => sum + line.kg, 0))}{" "}
                kg
              </dd>
            </div>
            <div>
              <dt>Gas subtotal</dt>
              <dd>
                {currentQuote
                  ? money(currentQuote.subtotalKobo)
                  : priceReady && estimateValid
                    ? money(estimated)
                    : "—"}
              </dd>
            </div>
            {physical.length > 0 && (
              <div>
                <dt>Products</dt>
                <dd>
                  {currentQuote
                    ? money(currentQuote.physicalSubtotalKobo)
                    : productsPriced
                      ? money(extra)
                      : "Unavailable"}
                </dd>
              </div>
            )}
            <div>
              <dt>Delivery fee</dt>
              <dd>
                {pricingLoading ? <ActionLoadingIndicator label="Loading delivery fee" /> : feeReady
                  ? money(currentQuote?.deliveryKobo ?? config.deliveryKobo)
                  : "Unavailable"}
              </dd>
            </div>
            <div className="gas-summary-total">
              <dt>{currentQuote ? "Quoted total" : "Estimated total"}</dt>
              <dd>
                {currentQuote
                  ? money(currentQuote.totalKobo)
                  : priceReady && feeReady && estimateValid && productsPriced
                    ? money(estimated + extra + config.deliveryKobo)
                    : "—"}
              </dd>
            </div>
          </dl>
          {(rewardPoints > 0 || rewardOfferId) && (
            <p>Eligible rewards are applied by checkout.</p>
          )}
          {includeAppointments && appointments.length > 0 && (
            <p>Staged service charges are separate.</p>
          )}
          {error && <Notice type="error" message={error} />}
          {error && pricingBranch !== requestedBranch && (
            <button
              type="button"
              className="button secondary"
              onClick={() => retryCatalogue((value) => value + 1)}
            >
              Retry prices
            </button>
          )}
          {!user ? (
            <Link
              href="/login?returnTo=%2Fgas-order"
              className="button"
              onClick={() => {
                try {
                  sessionStorage.setItem(
                    "easygas.gasDraft",
                    JSON.stringify({ lines, address, date, window, method }),
                  );
                } catch {}
              }}
            >
              Sign in to continue
            </Link>
          ) : (
            <button
              className="button"
              type="submit"
              disabled={busy || !canReview}
            >
              {busy ? "Checking…" : "Review current quotation"}
            </button>
          )}
          {currentQuote && !coveragePending && (
            <section
              className="proposal-context gas-order-confirmation"
              aria-label="Review and confirm"
            >
              <h3>Review and confirm</h3>
              <p>
                {lines
                  .map(
                    (line) =>
                      `${line.kg} kg in a ${line.capacityKg} kg cylinder`,
                  )
                  .join(" · ")}
              </p>
              <p>
                {address.name} · {address.phone}
                <br />
                {address.street}, {address.zone}
              </p>
              <p>
                {date} · {window}
              </p>
              <p>
                {method === "card"
                  ? "Paystack card"
                  : method === "wallet"
                    ? "Purchase credit"
                    : "Cash on delivery · unverified"}
              </p>
              <div className="button-row">
                {[
                  ["Change gas", "gas-order-lines"],
                  ["Change address", "gas-order-address"],
                  ["Change schedule", "gas-order-schedule"],
                  ["Change payment", "gas-order-payment"],
                ].map(([label, id]) => (
                  <button
                    key={id}
                    type="button"
                    className="button secondary"
                    disabled={busy}
                    onClick={() => editOrder(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={confirm}
              >
                {busy ? "Confirming…" : "Accept total and confirm order"}
              </button>
            </section>
          )}
        </aside>
      </form>
      <details className="surface gas-size-guide">
        <summary>Cylinder size guide</summary>
        {priceReady && feeReady ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Capacity</th>
                  <th>Gas only</th>
                  <th>With delivery</th>
                </tr>
              </thead>
              <tbody>
                {config.policy.capacitiesKg.map((c: number) => {
                  const amount = gasLine(c, c, config.priceKobo).subtotalKobo;
                  return (
                    <tr key={c}>
                      <td>{c} kg</td>
                      <td>{money(amount)}</td>
                      <td>{money(amount + config.deliveryKobo)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Current price estimates are unavailable.</p>
        )}
        <p>
          Gas estimates exclude the cost of a new cylinder, installation and
          professional services.
        </p>
      </details>
    </section>
  );
}

"use client";
import { RewardCheckoutField } from "./easyrewards";
import {
  deliveryAreaEvent,
  readDeliveryArea,
  writeDeliveryArea,
} from "./delivery-area-preference";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  resolveAddressLocation,
  addressLocationMessage,
} from "../../../packages/business-rules/src/address-location";
import { api, money, Notice, Loading } from "./ui";
import { gasLine } from "../../../packages/business-rules/src/gas-pricing";
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
  useEffect(() => {
    api("gas.catalogue")
      .then(setConfig)
      .catch((e) => setError(e.message));
  }, []);
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
    apply(readDeliveryArea(identity));
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
    if (!config?.policy?.capacitiesKg.includes(lines[0].capacityKg))
      setLines((ls) =>
        ls.map((l) => ({
          ...l,
          capacityKg: config?.policy?.capacitiesKg[0] ?? l.capacityKg,
        })),
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
  if (!config) return <Loading />;
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
          l.kg,
          l.capacityKg,
          config.priceKobo,
          config.policy &&
            ["minimumKg", "maximumKg", "incrementKg", "precision"].every(
              (k) => config.policy[k] !== null,
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
      (k) => config.policy[k] !== null,
    );
  async function review(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const q = await api("gas.quote", {
        lines,
        items: physical,
        branchId: config.locations.find((l: any) => l.id === address.locationId)
          ?.branch_id,
      });
      setConfig(q);
      setQuote({
        ...q,
        totalKobo: q.subtotalKobo + q.deliveryKobo + q.physicalSubtotalKobo,
      });
    } catch (e: any) {
      setQuote(null);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const payload = {
        items: physical,
        gasLines: lines,
        pricing: {
          priceVersion: quote.priceVersion,
          feeVersion: quote.feeVersion,
          policyVersion: quote.policyVersion,
          totalKobo: quote.totalKobo,
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
      api("gas.catalogue")
        .then(setConfig)
        .catch(() => {});
    } finally {
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
        <Link href="/orders">View and track your order</Link>
      </section>
    );
  if (compact)
    return (
      <section id="quick-order" className="quick-order">
        <h2>Order the gas you need</h2>
        <p>
          <strong>{money(config.priceKobo)}/kg</strong> · Flat delivery{" "}
          <strong>{money(config.deliveryKobo)}</strong>
        </p>
        <p>
          Home delivery across{" "}
          {config.locations.map((l: any) => l.name).join(", ")}.
        </p>
        <label>
          Cylinder capacity
          <select
            value={lines[0].capacityKg}
            onChange={(e) =>
              setLines([{ ...lines[0], capacityKg: Number(e.target.value) }])
            }
          >
            {config.policy.capacitiesKg.map((c: number) => (
              <option key={c} value={c}>
                {c} kg
              </option>
            ))}
          </select>
        </label>
        <label>
          Gas quantity (kg)
          <div className="quantity-stepper">
            <button
              type="button"
              className="icon-button"
              aria-label="Decrease gas quantity"
              disabled={lines[0].kg <= 0}
              onClick={() =>
                setLines([
                  {
                    ...lines[0],
                    kg: Math.max(
                      0,
                      Number(
                        (
                          lines[0].kg - (config.policy.incrementKg ?? 1)
                        ).toFixed(config.policy.precision ?? 3),
                      ),
                    ),
                  },
                ])
              }
            >
              −
            </button>
            <input
              aria-label="Gas quantity (kg)"
              type="number"
              min="0"
              max={Math.min(
                lines[0].capacityKg,
                config.policy.maximumKg ?? lines[0].capacityKg,
              )}
              step={config.policy.incrementKg ?? "any"}
              value={lines[0].kg || ""}
              onChange={(e) =>
                setLines([{ ...lines[0], kg: Number(e.target.value) }])
              }
            />
            <button
              type="button"
              className="icon-button"
              aria-label="Increase gas quantity"
              disabled={
                lines[0].kg >=
                Math.min(
                  lines[0].capacityKg,
                  config.policy.maximumKg ?? lines[0].capacityKg,
                )
              }
              onClick={() =>
                setLines([
                  {
                    ...lines[0],
                    kg: Math.min(
                      lines[0].capacityKg,
                      config.policy.maximumKg ?? lines[0].capacityKg,
                      Number(
                        (
                          lines[0].kg + (config.policy.incrementKg ?? 1)
                        ).toFixed(config.policy.precision ?? 3),
                      ),
                    ),
                  },
                ])
              }
            >
              +
            </button>
          </div>
        </label>
        {completeAddress}
        <label>
          Delivery location
          <select
            value={address.locationId}
            onChange={(e) => {
              const l = config.locations.find(
                (l: any) => l.id === e.target.value,
              );
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
            <option value="">Select location</option>
            {config.locations.map((l: any) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <div className="gas-estimate" aria-live="polite">
          {lines[0].kg > 0 && !estimateValid ? (
            <Notice type="error" message={estimateError} />
          ) : estimateValid ? (
            <>
              <p className="gas-estimate-breakdown">
                <span>Gas {money(estimated)}</span>
                <span>Delivery {money(config.deliveryKobo)}</span>
              </p>
              <strong className="gas-estimate-total">
                {money(estimated + config.deliveryKobo)} estimated
              </strong>
            </>
          ) : (
            <p>Enter a gas quantity to see your total.</p>
          )}
        </div>
        {!configured && (
          <p className="availability">
            Ordering opens after business quantity limits and stock are
            confirmed.
          </p>
        )}
        <button
          type="button"
          className="button full"
          disabled={!estimateValid || !address.locationId || !configured}
          onClick={() => {
            sessionStorage.setItem(
              "easygas.gasDraft",
              JSON.stringify({ lines, address }),
            );
            window.location.assign("/gas-order");
          }}
        >
          Order Gas Now
        </button>
        <Link className="text-link" href="/services">
          View Our Services
        </Link>
      </section>
    );
  return (
    <section className="gas-order">
      <h1>Cooking gas, delivered.</h1>
      <p>
        {money(config.priceKobo)}/kg · One flat delivery fee of{" "}
        {money(config.deliveryKobo)} per order.
      </p>
      {!configured && (
        <Notice message="Gas ordering is awaiting business quantity limits and verified stock. Prices below are estimates; ordering opens after configuration." />
      )}
      <form onSubmit={review} className="surface">
        <h2>Your cylinders</h2>
        {lines.map((l, i) => (
          <fieldset key={i}>
            <legend>Cylinder {i + 1}</legend>
            <label>
              Cylinder capacity (kg)
              <select
                value={l.capacityKg}
                onChange={(e) =>
                  setLines(
                    lines.map((x, n) =>
                      n === i
                        ? { ...x, capacityKg: Number(e.target.value) }
                        : x,
                    ),
                  )
                }
              >
                {config.policy.capacitiesKg.map((c: number) => (
                  <option key={c} value={c}>
                    {c} kg
                  </option>
                ))}
              </select>
            </label>
            <label>
              Requested gas (kg)
              <input
                type="number"
                min={config.policy.minimumKg ?? undefined}
                max={Math.min(
                  l.capacityKg,
                  config.policy.maximumKg ?? l.capacityKg,
                )}
                step={config.policy.incrementKg ?? "any"}
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
            <div className="button-row">
              <button
                type="button"
                className="button secondary"
                onClick={() =>
                  setLines(
                    lines.map((x, n) =>
                      n === i
                        ? {
                            ...x,
                            kg: Math.max(
                              0,
                              x.kg - (config.policy.incrementKg ?? 1),
                            ),
                          }
                        : x,
                    ),
                  )
                }
              >
                −
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() =>
                  setLines(
                    lines.map((x, n) =>
                      n === i
                        ? {
                            ...x,
                            kg: Math.min(
                              x.capacityKg,
                              x.kg + (config.policy.incrementKg ?? 1),
                            ),
                          }
                        : x,
                    ),
                  )
                }
              >
                +
              </button>
              {config.policy.capacitiesKg
                .filter((c: number) => c <= l.capacityKg)
                .map((c: number) => (
                  <button
                    key={c}
                    className="button secondary"
                    type="button"
                    onClick={() =>
                      setLines(
                        lines.map((x, n) => (n === i ? { ...x, kg: c } : x)),
                      )
                    }
                  >
                    {c} kg
                  </button>
                ))}
              {lines.length > 1 && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setLines(lines.filter((_, n) => n !== i))}
                >
                  Remove cylinder
                </button>
              )}
            </div>
          </fieldset>
        ))}
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
        <p>
          Gas estimate {money(estimated)} + physical products {money(extra)} +
          one delivery {money(config.deliveryKobo)} ={" "}
          <strong>{money(estimated + extra + config.deliveryKobo)}</strong>
        </p>
        <p>
          Address coverage must be confirmed before dispatch. Refill quantities
          remain subject to verified cylinder condition, residual gas and
          filling eligibility. A new physical cylinder and installation are
          priced separately.
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
        <h2>Delivery address</h2>
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
        {completeAddress}
        <label>
          Delivery location
          <select
            required
            value={address.locationId}
            onChange={(e) => {
              const l = config.locations.find(
                (l: any) => l.id === e.target.value,
              );
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
              </option>
            ))}
          </select>
        </label>
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
              required={["name", "phone", "street", "building"].includes(k)}
              onChange={(e) => setAddress({ ...address, [k]: e.target.value })}
            />
          </label>
        ))}
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
        <RewardCheckoutField
          onChange={setRewardPoints}
          onOfferChange={setRewardOfferId}
        />
        <label>
          Payment arrangement
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {catalogue.codEnabled && (
              <option value="cash_on_delivery">
                Cash on delivery · payment stays unverified
              </option>
            )}
            {catalogue.walletEnabled && (
              <option value="wallet">Available purchase credit</option>
            )}
            {!catalogue.codEnabled && !catalogue.walletEnabled && (
              <option value="">No payment arrangement enabled</option>
            )}
          </select>
        </label>
        {error && <Notice type="error" message={error} />}{" "}
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
            disabled={
              busy ||
              !configured ||
              !catalogue.orderingEnabled ||
              (!catalogue.codEnabled && !catalogue.walletEnabled)
            }
          >
            {busy ? "Checking…" : "Review current quotation"}
          </button>
        )}
        {quote && (
          <div className="proposal-context">
            <h2>Confirm your quotation</h2>
            <p>
              Gas {money(quote.subtotalKobo)} · Products {money(extra)} ·
              Delivery {money(quote.deliveryKobo)}
            </p>
            <strong>Total {money(quote.totalKobo)}</strong>
            <p>
              {address.zone} · {address.building} {address.street}
            </p>
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={confirm}
            >
              Accept total and confirm order
            </button>
          </div>
        )}
      </form>
      <section className="surface">
        <h2>Cylinder size guide</h2>
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
        <p>
          Gas estimates exclude the cost of a new cylinder, installation and
          professional services.
        </p>
      </section>
    </section>
  );
}

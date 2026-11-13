import { Ionicons } from "@expo/vector-icons";
import { ContextSheet } from "./ContextSheet";
import { useTheme } from "./theme";
import { bookingPhone, bookingPhoneMessage } from "../../packages/business-rules/src/booking-contact";
import {
  activeServiceSlots, assertServiceSelection, serviceAvailabilityMessage, serviceDetailText, serviceMoney, servicePrice, serviceSlotDay, serviceSlotTime, serviceSlotsQuery, type ServiceAvailability,
} from "../../packages/business-rules/src/service-detail";
import { friendlyMessage } from "../../packages/business-rules/src/friendly-message";
import { EasyGasLoader } from "./EasyGasLoader";
import { technicianMutation, captureFieldEvent } from "./field-queue";
import { NativeHostedPayment } from "./HostedPayment";
import Constants from "expo-constants";
import {
  Button as CustomerButton,
  Feedback as CustomerFeedback,
  Card as CustomerCard,
  Row as CustomerRow,
  Copy as CustomerCopy,
  Title as CustomerTitle,
} from "./CustomerUI";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState, useRef } from "react";
import {
  AppState,
  Linking,
  StyleSheet,
  Share,
  Image,
  Switch,
} from "react-native";
import { View, Pressable } from "./surfaces";
import { Text, TextInput } from "./typography";
import { randomUUID } from "expo-crypto";
import * as Print from "expo-print";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { serviceReportHtml } from "../../packages/business-rules/src/service-report";
import { NativeForm } from "./Workflows";
type API = (action: string, data?: any) => Promise<any>;
const money = (n: any) =>
  n === null
    ? "Quotation required"
    : `₦${(Number(n) / 100).toLocaleString("en-NG")}`;
function Button({ text, press }: { text: string; press: () => void }) {
  return (
    <Pressable accessibilityRole="button" style={s.button} onPress={press}>
      <Text style={s.buttonText}>{text}</Text>
    </Pressable>
  );
}
export default function Services({
  api,
  user,
  bookingsOnly = false,
  token,
  apiUrl,
  onStage,
  onBundle,
  backRef,
  onSignIn,
  initialServiceId,
}: {
  api: API;
  user: any;
  bookingsOnly?: boolean;
  token: string | null;
  apiUrl: string;
  onStage?: () => void;
  onBundle?: (b: any) => void;
  backRef?: React.RefObject<(() => boolean) | null>;
  onSignIn?: (serviceId: string) => void;
  initialServiceId?: string;
}) {
  const [bundles, setBundles] = useState<any[]>([]),
    [bundle, setBundle] = useState<any>(null),
    [followups, setFollowups] = useState<any[]>([]),
    [followup, setFollowup] = useState<any>(null),
    [items, setItems] = useState<any[]>([]),
    [bookings, setBookings] = useState<any[]>([]),
    [selected, setSelected] = useState<any>(() =>
      initialServiceId ? { id: initialServiceId } : null,
    ),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [version, setVersion] = useState(0);
  const reload = () => setVersion((n) => n + 1);
  useEffect(() => {
    let live = true;
    setLoading(true);
    Promise.all([
      api("services.catalogue"),
      api("bundles"),
      user ? api("bookings") : Promise.resolve([]),
      user && ["customer", "commercial"].includes(user.role)
        ? api("service.followups")
        : Promise.resolve([]),
    ])
      .then(([c, offers, b, f]) => {
        if (live) {
          setItems(c);
          setBundles(offers);
          setBookings(b);
          setFollowups(f);
          setError("");
        }
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
  }, [user?.id, version]);
  const clearSelection = () => {
    setSelected(null);
    setFollowup(null);
    setBundle(null);
  };
  useEffect(() => {
    if (!backRef || !selected) return;
    backRef.current = () => {
      clearSelection();
      return true;
    };
    return () => {
      backRef.current = null;
    };
  }, [backRef, selected]);
  const currentService = items.find((item) => item.id === selected?.id);
  return (
    <View>
      {!bookingsOnly && !selected && (
        <CustomerCard accent>
          <CustomerTitle>Professional Gas Services</CustomerTitle>
          <CustomerCopy>
            Installation, maintenance and safety checks. Choose an available
            service below; appointments and quotations are confirmed by EasyGas.
          </CustomerCopy>
        </CustomerCard>
      )}
      {!bookingsOnly &&
        !selected &&
        bundles.map((b) => (
          <View style={s.card} key={b.id}>
            <Text style={s.heading}>{b.name}</Text>
            <Text style={s.body}>{b.config.description}</Text>
            {b.products.map((p: any) => (
              <Text key={p.productId}>
                {p.quantity} × {p.name}
              </Text>
            ))}
            <Text style={s.body}>
              Subtotal {money(b.totalKobo)} · Service saving{" "}
              {money(b.discountKobo)}. Product delivery additional. Additional
              quoted work priced separately.
            </Text>
            <Button
              text="Use bundle cart & choose appointment"
              press={() => {
                const service = items.find((x) => x.id === b.config.serviceId);
                if (!service) {
                  setError("This service is unavailable.");
                  return;
                }
                onBundle?.(b);
                setBundle(b);
                setSelected(service);
              }}
            />
          </View>
        ))}
      {!selected && (
        <CustomerTitle>
          {bookingsOnly ? "My service appointments" : "Book a Service"}
        </CustomerTitle>
      )}
      {loading && <EasyGasLoader color="#07592e" />}
      {error && (
        <>
          <Text accessibilityRole="alert">{friendlyMessage(error)}</Text>
          <Button text="Try again" press={reload} />
        </>
      )}
      {(!bookingsOnly || Boolean(followup)) &&
        (!selected ? (
          <>
            {items.map((item) => (
              <View key={item.id} style={{ marginBottom: 12 }}>
                <CustomerRow
                  label={item.name}
                  detail={`${item.config.description} · ${money(item.config.priceKobo)}`}
                  icon="construct-outline"
                  onPress={() => setSelected(item)}
                />
              </View>
            ))}
            {!loading && !items.length && (
              <Text style={s.body}>
                Appointments open after EasyGas configures pricing, qualified
                personnel and approved inspection requirements.
              </Text>
            )}
          </>
        ) : (
          <>
            <CustomerButton
              label="All services"
              secondary
              onPress={clearSelection}
            />
            {currentService ? (
              <>
                <NativeServiceDetail
                  key={currentService.id}
                  service={currentService}
                  apiUrl={apiUrl}
                />
                {user && ["customer", "commercial"].includes(user.role) ? (
                  <Booking
                    key={user.id + ":" + currentService.id}
                    bundleId={bundle?.id}
                    bundleVersion={bundle?.version}
                    bundleTotalKobo={bundle?.totalKobo}
                    followupId={followup?.id}
                    userId={user.id}
                    onStage={onStage}
                    service={currentService}
                    api={api}
                    apiUrl={apiUrl}
                    reloadService={reload}
                    done={() => {
                      clearSelection();
                      reload();
                    }}
                  />
                ) : !user && onSignIn ? (
                  <CustomerButton
                    label="Sign in to check appointments"
                    onPress={() => onSignIn(currentService.id)}
                  />
                ) : (
                  <CustomerCopy>
                    Sign in with a customer account to book an appointment.
                  </CustomerCopy>
                )}
              </>
            ) : (
              !loading && (
                <CustomerCopy>
                  This service is not currently listed.
                </CustomerCopy>
              )
            )}
          </>
        ))}
      {user && ["customer", "commercial"].includes(user.role) && (
        <View style={s.card}>
          <Text style={s.heading}>Service follow-ups</Text>
          {!followups.length && (
            <Text style={s.body}>No recorded follow-ups.</Text>
          )}
          {followups.map((f) => (
            <View style={s.panel} key={f.id}>
              <Text style={s.body}>
                {f.name} · {new Date(f.due_date).toLocaleDateString()}
              </Text>
              <Text style={s.body}>{f.reason}</Text>
              {f.dismissed_at || f.rebooked_id ? (
                <Text style={s.body}>
                  {f.rebooked_id ? "Linked appointment requested" : "Dismissed"}
                </Text>
              ) : (
                <>
                  <Button
                    text="Review service appointments"
                    press={() => {
                      const service = items.find((x) => x.id === f.service_id);
                      if (service) {
                        setFollowup(f);
                        setSelected(service);
                      } else setError("This service is currently unavailable.");
                    }}
                  />
                  <Button
                    text="Dismiss reminder"
                    press={() =>
                      api("service.followup.dismiss", { id: f.id })
                        .then(reload)
                        .catch((e) => setError(e.message))
                    }
                  />
                </>
              )}
            </View>
          ))}
        </View>
      )}
      {bookingsOnly &&
        (!user ? (
          <Text style={s.body}>Sign in to see your appointments.</Text>
        ) : (
          <>
            {!loading && !bookings.length && (
              <Text style={s.body}>No service appointments yet.</Text>
            )}
            {bookings.map((b) => (
              <Appointment
                key={b.id + ":" + b.version}
                b={b}
                user={user}
                api={api}
                done={reload}
                token={token}
                apiUrl={apiUrl}
              />
            ))}
          </>
        ))}
    </View>
  );
}
function NativeServiceDetail({
  service,
  apiUrl,
}: {
  service: any;
  apiUrl: string;
}) {
  const { colors } = useTheme();
  const config = service.config;
  const included = serviceDetailText(config.inclusions);
  const [expanded, setExpanded] = useState<string[]>(
    included ? ["What’s included"] : [],
  );
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [service.image_id]);
  const sections = [
    ["What’s included", included, "list-outline"],
    [
      "Exclusions",
      serviceDetailText(config.exclusions),
      "remove-circle-outline",
    ],
    [
      "Prepare for your appointment",
      serviceDetailText(config.preparation),
      "clipboard-outline",
    ],
    [
      "Service coverage",
      Array.isArray(config.zones) ? config.zones.join(", ") : "",
      "location-outline",
    ],
  ] as const;
  return (
    <View style={{ gap: 8, marginVertical: 12 }}>
      <CustomerCard>
        {service.image_id && !imageFailed ? (
          <Image
            source={{ uri: apiUrl + "/api/media/" + service.image_id }}
            accessibilityLabel={service.name}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
            style={{ height: 136, width: "100%", borderRadius: 14 }}
          />
        ) : (
          <Ionicons
            name="construct-outline"
            color={colors.primary}
            size={30}
            accessible={false}
          />
        )}
        <CustomerTitle>{service.name}</CustomerTitle>
        {!!config.description && (
          <CustomerCopy>{config.description}</CustomerCopy>
        )}
        <Text
          accessibilityRole="text"
          style={{ fontWeight: "800", fontSize: 21 }}
        >
          {servicePrice(config)}
        </Text>
        <CustomerCopy>
          Call-out {serviceMoney(config.calloutKobo) ?? "unavailable"} ·{" "}
          {Number.isInteger(config.durationMinutes) &&
          config.durationMinutes > 0
            ? `${config.durationMinutes} minutes`
            : "Duration unavailable"}
        </CustomerCopy>
        {!!serviceDetailText(config.safety) && (
          <CustomerCopy>{config.safety}</CustomerCopy>
        )}
      </CustomerCard>
      {sections.map(([title, content, icon]) => {
        const open = expanded.includes(title);
        return (
          <View
            key={title}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 14,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              onPress={() =>
                setExpanded((prior) =>
                  open
                    ? prior.filter((value) => value !== title)
                    : [...prior, title],
                )
              }
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                minHeight: 48,
                padding: 12,
              }}
            >
              <Ionicons
                name={icon}
                color={colors.primary}
                size={19}
                accessible={false}
              />
              <Text style={{ fontWeight: "700", flex: 1 }}>{title}</Text>
              <Ionicons
                name={open ? "chevron-up" : "chevron-down"}
                color={colors.muted}
                size={16}
                accessible={false}
              />
            </Pressable>
            {open && (
              <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
                <CustomerCopy>
                  {content || "Details not configured."}
                </CustomerCopy>
              </View>
            )}
          </View>
        );
      })}
      <CustomerCopy>
        {Number.isInteger(config.cancellationHours)
          ? `Self-service changes close ${config.cancellationHours} hours before arrival. `
          : ""}
        {serviceDetailText(config.warranty) ||
          "Warranty terms are not configured."}
      </CustomerCopy>
    </View>
  );
}

function Booking({
  service,
  api,
  apiUrl,
  reloadService,
  done,
  userId,
  onStage,
  followupId,
  bundleId,
  bundleVersion,
  bundleTotalKobo,
}: {
  followupId?: string;
  bundleId?: string;
  bundleVersion?: number;
  bundleTotalKobo?: number;
  service: any;
  api: API;
  apiUrl: string;
  reloadService: () => void;
  done: () => void;
  userId: string;
  onStage?: () => void;
}) {
  const [availability, setAvailability] = useState<{
    zone: string;
    value: ServiceAvailability;
  } | null>(null);
  const [error, setError] = useState("");
  const [key] = useState(randomUUID);
  const [zone, setZone] = useState("");
  const [day, setDay] = useState("");
  const [slotId, setSlotId] = useState("");
  const [details, setDetails] = useState(false);
  const [retry, setRetry] = useState(0);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [address, setAddress] = useState<any>(null);
  const [choice, setChoice] = useState<
    "area" | "date" | "time" | "address" | null
  >(null);
  useEffect(() => {
    let live = true;
    api("account.profile")
      .then((profile) => {
        if (live)
          setAddresses(
            (profile.addresses ?? []).filter(
              (item: any) => item.location_available,
            ),
          );
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [userId]);
  useEffect(() => {
    let live = true;
    let generation = 0;
    const refresh = async () => {
      const request = ++generation;
      try {
        const value = await api(serviceSlotsQuery(service, zone));
        if (live && request === generation) {
          setAvailability({ zone, value });
          setError("");
        }
      } catch (e: any) {
        if (live && request === generation) {
          setAvailability(null);
          setError(e.message);
        }
      }
    };
    void refresh();
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void refresh();
    }, 30000);
    const state = AppState.addEventListener("change", (next) => {
      if (next === "active") void refresh();
      else {
        generation++;
        setAvailability(null);
      }
    });
    return () => {
      live = false;
      clearInterval(timer);
      state.remove();
    };
  }, [service.id, service.branch_id, service.version, zone, retry]);
  const current = availability?.zone === zone ? availability.value : null;
  const slots = activeServiceSlots(current?.slots ?? []);
  const days = [...new Set(slots.map(serviceSlotDay))];
  const daySlots = slots.filter((slot) => serviceSlotDay(slot) === day);
  const selected = daySlots.find((slot) => slot.id === slotId);
  const changed =
    current?.serviceVersion != null &&
    Number(current.serviceVersion) !== Number(service.version);
  const available =
    current?.status === "available" && slots.length > 0 && !changed && !error;
  const canProceed = Boolean(available && zone && selected);
  const areaAddresses = addresses.filter(
    (item) => item.zone?.toLowerCase() === zone.toLowerCase(),
  );
  const recheck = async () => {
    const value: ServiceAvailability = await api(
      serviceSlotsQuery(service, zone),
    ).catch((failure) => {
      setAvailability(null);
      setError(failure.message);
      throw failure;
    });
    setAvailability({ zone, value });
    assertServiceSelection(value, service.version, slotId);
  };
  const adapted: API = async (_, v) => {
    const phone = bookingPhone(String(v.address?.phone ?? ""));
    if (!phone) throw new Error(bookingPhoneMessage);
    const request = {
      serviceId: service.id,
      branchId: service.branch_id,
      serviceVersion: service.version,
      slotId,
      address: { ...v.address, zone, phone },
      equipment: {
        brand: v.brand,
        type: v.equipmentType,
        burners: v.burners,
        newEquipment: v.newEquipment,
        supplyPresent: v.supplyPresent,
        concerns: v.concerns,
      },
      notes: v.notes,
      idempotencyKey: key,
      ...(followupId ? { followupId } : {}),
    };
    if (v.combineWithProducts || bundleId) {
      await recheck();
      const bundle = bundleId
        ? (await api("bundles")).find(
            (offer: any) =>
              offer.id === bundleId &&
              offer.config.serviceId === service.id &&
              offer.branch_id === service.branch_id &&
              Number(offer.version) === Number(bundleVersion) &&
              Number(offer.totalKobo) === Number(bundleTotalKobo) &&
              Number(offer.serviceVersion) === Number(service.version),
          )
        : null;
      if (bundleId && !bundle)
        throw new Error(
          "This bundle has changed or is unavailable. Return to services and review the current offer.",
        );
      const key = "easygas.serviceDrafts." + userId;
      const old = JSON.parse((await SecureStore.getItemAsync(key)) ?? "[]");
      if (old.length >= 5)
        throw new Error("A linked request supports up to five appointments.");
      await SecureStore.setItemAsync(
        key,
        JSON.stringify([
          ...old,
          {
            request,
            ...(bundleId ? { bundleId, bundleVersion, bundleTotalKobo } : {}),
            totalKobo: bundle
              ? bundle.servicePriceKobo + bundle.calloutKobo
              : service.config.pricingModel === "fixed"
                ? service.config.priceKobo + service.config.calloutKobo
                : null,
            name: service.name,
            label: selected?.starts_at,
          },
        ]),
      );
      onStage?.();
      return { message: "Appointment added to your linked request." };
    }
    try {
      return await api("booking.create", request);
    } catch (e: any) {
      if (e.status === 409) setRetry((n) => n + 1);
      throw e;
    }
  };
  const choices =
    choice === "area"
      ? service.config.zones.map((area: string) => ({
          value: area,
          label: area,
        }))
      : choice === "date"
        ? days.map((value) => ({ value, label: value }))
        : choice === "time"
          ? daySlots.map((slot) => ({
              value: slot.id,
              label: serviceSlotTime(slot),
            }))
          : [
              { value: "", label: "Enter a new address" },
              ...areaAddresses.map((item) => ({
                value: item.id,
                label: `${item.label} · ${item.street}`,
              })),
            ];
  return (
    <View style={{ gap: 12 }}>
      <CustomerCard>
        <CustomerTitle>Book this service</CustomerTitle>
        {error ? (
          <CustomerFeedback error={error} />
        ) : !current ? (
          <EasyGasLoader size="sm" variant="section" label="Checking appointment availability" />
        ) : changed ? (
          <CustomerCopy>
            Service details or pricing changed. Refresh the service and review
            the current terms.
          </CustomerCopy>
        ) : !available ? (
          <CustomerCopy>
            {
              serviceAvailabilityMessage[
                current.status === "available" ? "no_slots" : current.status
              ]
            }
          </CustomerCopy>
        ) : null}
        {(error || changed || (current && !available)) && (
          <>
            <CustomerButton
              label={
                changed ? "Refresh service details" : "Recheck availability"
              }
              secondary
              onPress={changed ? reloadService : () => setRetry((n) => n + 1)}
            />
            <CustomerButton
              label="Contact EasyGas"
              secondary
              onPress={() => {
                void Linking.openURL(apiUrl + "/contact").catch(() =>
                  setError("Couldn’t open EasyGas contact information."),
                );
              }}
            />
          </>
        )}
        {(available || zone) && (
          <>
            <CustomerButton
              label={zone || "Choose a service area"}
              secondary
              onPress={() => setChoice("area")}
            />
            <CustomerButton
              label={days.includes(day) ? day : "Select a date"}
              disabled={!available || !zone}
              secondary
              onPress={() => setChoice("date")}
            />
            <CustomerButton
              label={
                selected
                  ? serviceSlotTime(selected) + " (Lagos)"
                  : "Select a time (Lagos)"
              }
              disabled={!available || !day}
              secondary
              onPress={() => setChoice("time")}
            />
          </>
        )}
        {available && !details && (
          <CustomerButton
            label="Book service"
            disabled={!canProceed}
            onPress={() => setDetails(true)}
          />
        )}
      </CustomerCard>
      {choice && (
        <ContextSheet
          title={`Choose ${choice === "address" ? "a saved address" : choice === "area" ? "an area" : "a " + choice}`}
          onClose={() => setChoice(null)}
        >
          <View style={{ gap: 8 }}>
            {choices.map(
              ({ value, label }: { value: string; label: string }) => (
                <CustomerButton
                  key={value}
                  label={label}
                  secondary
                  onPress={() => {
                    if (choice === "area") {
                      setZone(value);
                      setDay("");
                      setSlotId("");
                      setAddress(null);
                      setError("");
                    }
                    if (choice === "date") {
                      setDay(value);
                      setSlotId("");
                    }
                    if (choice === "time") setSlotId(value);
                    if (choice === "address")
                      setAddress(
                        areaAddresses.find((item) => item.id === value) ?? null,
                      );
                    setChoice(null);
                  }}
                />
              ),
            )}
          </View>
        </ContextSheet>
      )}
      {details && (
        <>
          {!!areaAddresses.length && (
            <CustomerButton
              label={address?.label ?? "Use a saved address"}
              secondary
              onPress={() => setChoice("address")}
            />
          )}
          <NativeForm
            key={address?.id ?? "new"}
            api={adapted}
            action="booking.create"
            title="Request an appointment"
            onDone={done}
            disabled={!canProceed}
            reviewKey={service.version + ":" + zone + ":" + slotId}
            prepareReview={async (values) => {
              if (!bookingPhone(String(values.address?.phone ?? "")))
                throw new Error(bookingPhoneMessage);
              await recheck();
            }}
            review={(values) => (
              <>
                <CustomerTitle>Review your booking request</CustomerTitle>
                <CustomerCopy>
                  {service.name} · {day} ·{" "}
                  {selected && serviceSlotTime(selected)} (Lagos)
                </CustomerCopy>
                <CustomerCopy>
                  {values.address?.street}, {zone} · {values.address?.phone}
                </CustomerCopy>
                <CustomerCopy>
                  {servicePrice(service.config)} · Call-out{" "}
                  {serviceMoney(service.config.calloutKobo) ?? "unavailable"}
                </CustomerCopy>
                <CustomerCopy>
                  Submitting this request does not confirm payment or safety
                  clearance.
                </CustomerCopy>
              </>
            )}
            fields={[
              {
                name: "address.street",
                label: "Complete service address",
                type: "textarea",
                value: address?.street,
              },
              {
                name: "address.phone",
                label: "Contact mobile number",
                value: address?.phone,
              },
              { name: "brand", label: "Equipment brand, if known" },
              { name: "equipmentType", label: "Equipment type" },
              {
                name: "burners",
                label: "Burners (0 if not applicable)",
                type: "number",
                value: 0,
              },
              {
                name: "newEquipment",
                label: "New equipment",
                type: "checkbox",
              },
              {
                name: "supplyPresent",
                label: "Gas supply already present",
                type: "checkbox",
              },
              { name: "concerns", label: "Describe equipment and concerns" },
              { name: "notes", label: "Additional instructions" },
              {
                name: "combineWithProducts",
                label: "Confirm together with my product cart",
                type: "checkbox",
              },
            ]}
          />
        </>
      )}
    </View>
  );
}
export function Appointment({
  b,
  user,
  api,
  done,
  token,
  apiUrl,
}: {
  b: any;
  user: any;
  api: API;
  done: () => void;
  token: string | null;
  apiUrl: string;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [slots, setSlots] = useState<any[]>([]),
    [paymentKey] = useState(randomUUID);
  const customer = b.customer_id === user.id,
    tech = user.role === "technician",
    manager = ["owner", "manager"].includes(user.role),
    store = ["owner", "finance", "manager"].includes(user.role),
    finance = ["owner", "finance"].includes(user.role),
    q = b.quotes[0];
  const operationKeys = useRef(new Map<string, string>());
  const bound: API = (action, v) => {
    if (v === undefined) return api(action);
    const data = { bookingId: b.id, ...v };
    if (
      action.startsWith("booking.") ||
      action.startsWith("service.material.")
    ) {
      const fingerprint = action + ":" + b.id + ":" + JSON.stringify(data);
      if (!operationKeys.current.has(fingerprint))
        operationKeys.current.set(fingerprint, randomUUID());
      data.operationKey ??= operationKeys.current.get(fingerprint);
    }
    return tech
      ? technicianMutation(user.id, b, action, data, api)
      : api(action, data);
  };
  async function act(action: string, data: any) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await bound(action, data);
      done();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (customer)
      api(
        "services.slots?" +
          new URLSearchParams({
            serviceId: b.service_id,
            branchId: b.branch_id,
          }),
      )
        .then(setSlots)
        .catch(() => setSlots([]));
  }, [b.id]);
  const next =
    b.status === "pending_confirmation"
      ? "confirmed"
      : b.status === "confirmed"
        ? "assigned"
        : b.status === "assigned"
          ? "en_route"
          : b.status === "en_route"
            ? "in_progress"
            : null;
  return (
    <View style={s.card}>
      <Text style={s.heading}>{b.snapshot.name}</Text>
      <Text style={s.body}>
        {b.reference} · {b.status.replaceAll("_", " ")}
      </Text>
      <Text style={s.body}>
        {new Date(b.starts_at).toLocaleString("en-NG", {
          timeZone: "Africa/Lagos",
        })}{" "}
        (Lagos time)
      </Text>
      <Text style={s.body}>
        {b.address.street}, {b.address.zone} · {b.address.phone}
      </Text>
      <Text style={s.body}>{b.equipment.concerns}</Text>
      <Text style={s.body}>
        Total {money(b.billing.totalKobo)} · Verified paid{" "}
        {money(b.billing.paidKobo)} · Due {money(b.billing.dueKobo)}
      </Text>
      {["failed", "cancelled"].includes(b.status) && (
        <View style={s.panel}>
          <Text style={s.heading}>Financial settlement review</Text>
          <Text style={s.body}>
            The unsuccessful service outcome stays recorded. A settlement does
            not authorise work or certify safety.
          </Text>
          {b.settlements?.map((settlement: any, index: number) => (
            <View key={settlement.id}>
              <Text style={s.body}>
                Revision {settlement.revision} · {money(settlement.amount_kobo)}{" "}
                ·{" "}
                {settlement.business_approved
                  ? "Business approved"
                  : "Independent review pending"}
              </Text>
              <Text style={s.body}>{settlement.reason}</Text>
              {customer && index === 0 && settlement.accepted === null && (
                <NativeForm
                  api={(_, v) =>
                    bound("booking.settlement.consent", {
                      settlementId: settlement.id,
                      accepted: v.accepted === true,
                      notes: v.notes,
                    })
                  }
                  action="booking.settlement.consent"
                  title="Review this settlement"
                  onDone={done}
                  fields={[
                    {
                      name: "accepted",
                      label: "I agree to this exact settlement amount",
                      type: "checkbox",
                    },
                    { name: "notes", label: "Acceptance or rejection notes" },
                  ]}
                />
              )}
              {settlement.accepted !== null && (
                <Text style={s.body}>
                  Customer {settlement.accepted ? "accepted" : "rejected"}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
      {customer && b.billing.dueKobo > 0 && (
        <NativeHostedPayment
          api={api}
          userId={user.id}
          purpose="service"
          bookingId={b.id}
        />
      )}
      {error && <Text accessibilityRole="alert">{friendlyMessage(error)}</Text>}
      {next &&
        ((manager && ["confirmed", "assigned"].includes(next)) ||
          (tech && ["en_route", "in_progress"].includes(next))) && (
          <Button
            text={
              next === "in_progress"
                ? "Confirm arrival for assessment only"
                : next.replaceAll("_", " ")
            }
            press={() =>
              act("booking.transition", {
                status: next,
                reason: "Authorised appointment update from mobile",
              })
            }
          />
        )}
      {customer &&
        ["pending_confirmation", "confirmed", "assigned"].includes(
          b.status,
        ) && (
          <>
            <NativeForm
              api={bound}
              action="booking.cancel"
              title="Cancel appointment"
              onDone={done}
              fields={[{ name: "reason", label: "Cancellation reason" }]}
            />
            {slots.length > 0 && (
              <NativeForm
                api={(_, v) =>
                  bound("booking.reschedule", { ...v, version: b.version })
                }
                action="booking.reschedule"
                title="Reschedule appointment"
                onDone={done}
                fields={[
                  {
                    name: "slotId",
                    label: "Alternative appointment",
                    options: slots.map((x) => ({
                      value: x.id,
                      label: new Date(x.starts_at).toLocaleString("en-NG", {
                        timeZone: "Africa/Lagos",
                      }),
                    })),
                  },
                  { name: "reason", label: "Reason" },
                ]}
              />
            )}
          </>
        )}
      {q && (
        <View style={s.panel}>
          <Text style={s.heading}>Quotation revision {q.revision}</Text>
          <Text style={s.body}>{q.notes}</Text>
          {q.lines.map((l: any) => (
            <Text style={s.body} key={l.productId}>
              {l.quantity} × {l.name} · {money(l.unitPriceKobo)}
            </Text>
          ))}
          <Text style={s.body}>
            Maximum total {money(q.total_kobo)} ·{" "}
            {q.approved === true
              ? "Approved"
              : q.approved === false
                ? "Declined"
                : "Awaiting your decision"}
          </Text>
          {customer &&
            q.approved === null &&
            b.status === "awaiting_customer_approval" && (
              <>
                <Button
                  text="Approve this quotation"
                  press={() =>
                    act("booking.quote.decide", {
                      quoteId: q.id,
                      approved: true,
                    })
                  }
                />
                <Button
                  text="Decline quotation"
                  press={() =>
                    act("booking.quote.decide", {
                      quoteId: q.id,
                      approved: false,
                    })
                  }
                />
              </>
            )}
        </View>
      )}
      {tech &&
        ["in_progress", "awaiting_customer_approval"].includes(b.status) && (
          <Quote b={b} api={bound} done={done} />
        )}
      {b.materials.map((m: any) => (
        <View style={s.panel} key={m.id}>
          <Text style={s.heading}>
            {m.name} · {m.quantity}
          </Text>
          <Text style={s.body}>{m.state.replaceAll("_", " ")}</Text>
          {store && m.state === "reserved" && (
            <NativeForm
              api={(_, v) =>
                bound("service.material.issue", {
                  materialId: m.id,
                  unitCostKobo: Math.round(v.cost * 100),
                })
              }
              action="service.material.issue"
              title="Issue approved material"
              onDone={done}
              fields={[
                {
                  name: "cost",
                  label: "Actual unit cost in naira",
                  type: "number",
                },
              ]}
            />
          )}{" "}
          {tech && m.state === "issued" && (
            <NativeForm
              api={(_, v) =>
                bound("service.material.usage", { materialId: m.id, ...v })
              }
              action="service.material.usage"
              title="Record actual use"
              onDone={done}
              fields={[
                { name: "used", label: "Units used", type: "number" },
                {
                  name: "damaged",
                  label: "Units damaged",
                  type: "number",
                  value: 0,
                },
              ]}
            />
          )}{" "}
          {store && m.state === "usage_recorded" && (
            <NativeForm
              api={(_, v) =>
                bound("service.material.return", { materialId: m.id, ...v })
              }
              action="service.material.return"
              title="Confirm unused material returned"
              onDone={done}
              fields={[
                {
                  name: "returned",
                  label: "Unused units received",
                  type: "number",
                },
                {
                  name: "reason",
                  label: "Physical return / inspection reference",
                },
              ]}
            />
          )}
        </View>
      ))}
      {tech &&
        ["in_progress", "awaiting_customer_approval"].includes(b.status) && (
          <>
            <Text style={s.body}>
              Assessment does not authorise chargeable work. Work phase:{" "}
              {b.work_phase}. Operations approval and verified payment are
              checked by the server.
            </Text>
            <NativeForm
              api={(_, v) =>
                bound("booking.work.start", { ...v, version: b.version })
              }
              action="booking.work.start"
              title="Start Authorised Service"
              fields={[
                {
                  name: "reason",
                  label:
                    "Confirm the authorised scope and safe work conditions",
                },
              ]}
              onDone={done}
            />
            <NativeForm
              api={api}
              action="reauth"
              title="Verify password before sensitive quotation review"
              fields={[
                {
                  name: "password",
                  label: "Current password",
                  type: "password",
                },
              ]}
            />
            {q && (
              <NativeForm
                api={(_, v) =>
                  bound("booking.quote.request_review", {
                    quoteId: q.id,
                    reason: v.reason,
                  })
                }
                action="booking.quote.request_review"
                title="Submit latest quotation for business approval"
                fields={[
                  { name: "reason", label: "Reason for independent review" },
                ]}
                onDone={done}
              />
            )}
          </>
        )}
      {tech && b.status === "in_progress" && !b.report && (
        <NativeForm
          draftKey={"easygas.serviceReportDraft." + user.id + "." + b.id}
          recordVersion={b.version}
          api={(_, v) =>
            bound("booking.report", {
              outcome: v.outcome,
              responses: b.checklist
                .filter((c: any) => v[c.id])
                .map((c: any) => ({
                  id: c.id,
                  passed: v[c.id] === "passed",
                  notes: v[c.id + "_notes"],
                })),
              findings: v.findings,
              workPerformed: v.workPerformed,
              recommendations: v.recommendations,
            })
          }
          action="booking.report"
          title="Inspection and service report"
          onDone={done}
          fields={[
            {
              name: "outcome",
              label: "Overall outcome",
              options: [
                "success",
                "recommendations",
                "further_assessment",
                "unsafe",
                "unable",
              ].map((x) => ({ value: x, label: x.replaceAll("_", " ") })),
            },
            ...b.checklist.flatMap((c: any) => [
              {
                name: c.id,
                label: c.label,
                options: [
                  { value: "passed", label: "Passed" },
                  { value: "failed", label: "Failed" },
                ],
              },
              {
                name: c.id + "_notes",
                label: "Evidence / notes for " + c.label,
              },
            ]),
            { name: "findings", label: "Findings" },
            { name: "workPerformed", label: "Work actually performed" },
            {
              name: "recommendations",
              label: "Qualified recommendations / follow-up",
            },
          ]}
        />
      )}
      <BookingPhotos
        userId={tech ? user.id : undefined}
        b={b}
        token={token}
        apiUrl={apiUrl}
        upload={
          (customer || tech) &&
          !b.report &&
          !["cancelled", "failed", "completed"].includes(b.status)
        }
        done={done}
      />
      {b.report && (
        <View style={s.panel}>
          <Text style={s.heading}>Service report · {b.report.outcome}</Text>
          <Text style={s.body}>{b.report.body.findings}</Text>
          <Text style={s.body}>{b.report.body.workPerformed}</Text>
          {b.report.body.responses.map((r: any) => (
            <Text style={s.body} key={r.id}>
              {b.report.body.checklist.find((c: any) => c.id === r.id)?.label}:{" "}
              {r.passed ? "Passed" : "Failed"} — {r.notes}
            </Text>
          ))}
          <Text style={s.body}>{b.report.body.recommendations}</Text>
          <Text style={s.body}>
            {["success", "recommendations"].includes(b.report.outcome)
              ? "Documented approved charges"
              : "Documented ceiling for financial review"}{" "}
            {money(b.report.body.invoiceTotalKobo)}. Not independent regulatory
            certification.
          </Text>
          <Button
            text="Save PDF service report"
            press={async () => {
              try {
                const pdf = await Print.printToFileAsync({
                  html: serviceReportHtml(b.report.body),
                });
                if (await Sharing.isAvailableAsync())
                  await Sharing.shareAsync(pdf.uri, {
                    mimeType: "application/pdf",
                    UTI: "com.adobe.pdf",
                  });
                else setError("File sharing is unavailable on this device.");
              } catch (e: any) {
                setError(e.message);
              }
            }}
          />
          <Button
            text="Share / save service report data"
            press={() =>
              Share.share({
                title: b.reference + " service report",
                message: JSON.stringify(b.report.body, null, 2),
              }).catch((e) => setError(e.message))
            }
          />
          {customer && b.status === "awaiting_acknowledgement" && (
            <NativeForm
              api={bound}
              action="booking.acknowledge"
              title="Acknowledge documented service"
              onDone={done}
              fields={[
                {
                  name: "accepted",
                  label: "I acknowledge the documented work",
                  type: "checkbox",
                },
                { name: "notes", label: "Acknowledgement / concern" },
              ]}
            />
          )}
        </View>
      )}
      {customer && b.billing.walletEnabled && b.billing.dueKobo > 0 && (
        <NativeForm
          api={(_, v) =>
            bound("booking.wallet.pay", {
              amountKobo: Math.round(v.amount * 100),
              idempotencyKey: paymentKey,
            })
          }
          action="booking.wallet.pay"
          title="Pay approved charges with purchase credit"
          onDone={done}
          fields={[
            {
              name: "amount",
              label: "Amount in naira; partial payment allowed",
              type: "number",
            },
          ]}
        />
      )}
      {tech && !user.technician_service_only && b.billing.dueKobo > 0 && (
        <NativeForm
          api={(_, v) =>
            bound("booking.cash.record", {
              amountKobo: Math.round(v.amount * 100),
              reference: v.reference,
            })
          }
          action="booking.cash.record"
          title="Record cash actually collected"
          onDone={done}
          fields={[
            { name: "amount", label: "Amount in naira", type: "number" },
            { name: "reference", label: "Unique receipt reference" },
          ]}
        />
      )}
      {finance &&
        b.cashCollections
          .filter((c: any) => !c.verified_at)
          .map((c: any) => (
            <Button
              key={c.id}
              text={"Independently verify " + money(c.amount_kobo)}
              press={() => act("booking.cash.verify", { collectionId: c.id })}
            />
          ))}
      {customer &&
        b.billing.paidKobo > b.billing.refundedKobo &&
        ["completed", "failed", "cancelled"].includes(b.status) && (
          <NativeForm
            api={bound}
            action="booking.refund.request"
            title="Request a reviewed refund"
            onDone={done}
            fields={[
              {
                name: "refundScope",
                label: "Refund review scope",
                value:
                  b.status === "completed" && b.billing.overpaidKobo > 0
                    ? "excess"
                    : "service",
                options: [
                  { value: "service", label: "Full service refund review" },
                  {
                    value: "excess",
                    label: "Excess payment only (completed work)",
                  },
                ],
              },
              {
                name: "acceptWalletCredit",
                label:
                  "I accept restricted purchase credit for an approved refund",
                type: "checkbox",
              },
              { name: "reason", label: "Refund reason" },
            ]}
          />
        )}
      {b.status === "completed" && (tech || manager) && (
        <NativeForm
          api={bound}
          action="service.followup.create"
          title="Record documented service follow-up"
          onDone={done}
          fields={[
            { name: "dueDate", label: "Follow-up date (YYYY-MM-DD)" },
            { name: "reason", label: "Documented maintenance reason" },
          ]}
        />
      )}
      {customer && b.status === "completed" && (
        <NativeForm
          api={bound}
          action="booking.feedback"
          title="Review your completed service"
          onDone={done}
          fields={[
            { name: "rating", label: "Rating from 1 to 5", type: "number" },
            { name: "body", label: "Feedback" },
          ]}
        />
      )}
    </View>
  );
}
function Quote({ b, api, done }: { b: any; api: API; done: () => void }) {
  const [products, setProducts] = useState<any[]>([]),
    [count, setCount] = useState(0);
  useEffect(() => {
    api("products.manage")
      .then((x) => setProducts(x.products))
      .catch(() => setProducts([]));
  }, []);
  return (
    <View>
      <Button
        text="Add quoted material"
        press={() => setCount((n) => Math.min(20, n + 1))}
      />
      {count > 0 && (
        <Button
          text="Remove last material"
          press={() => setCount((n) => Math.max(0, n - 1))}
        />
      )}
      <NativeForm
        key={count}
        api={(_, v) =>
          api("booking.quote", {
            labourKobo: Math.round(v.labour * 100),
            notes: v.notes,
            lines: Array.from({ length: count }, (_, i) => ({
              productId: v["product_" + i],
              quantity: v["quantity_" + i],
            })),
          })
        }
        action="booking.quote"
        title="Propose full revised scope"
        onDone={done}
        fields={[
          {
            name: "labour",
            label: "Full labour charge in naira",
            type: "number",
          },
          { name: "notes", label: "Assessment and quotation scope" },
          ...Array.from({ length: count }, (_, i) => [
            {
              name: "product_" + i,
              label: "Material " + (i + 1),
              options: products
                .filter(
                  (p) =>
                    !["Gas refills", "Empty cylinders", "Bundles"].includes(
                      p.category,
                    ),
                )
                .map((p) => ({ value: p.id, label: p.name })),
            },
            {
              name: "quantity_" + i,
              label: "Quantity " + (i + 1),
              type: "number" as const,
              value: 1,
            },
          ]).flat(),
        ]}
      />
    </View>
  );
}
function BookingPhotos({
  userId,
  b,
  token,
  apiUrl,
  upload,
  done,
}: {
  userId?: string;
  b: any;
  token: string | null;
  apiUrl: string;
  upload: boolean;
  done: () => void;
}) {
  const [alt, setAlt] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  async function pick(camera = false) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (!consent)
        throw new Error("Confirm private evidence consent before capture.");
      if (alt.trim().length < 3)
        throw new Error("Describe the photograph before uploading it.");
      const permission = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted)
        throw new Error("Photograph permission denied; contact operations.");
      const selected = await (
        camera
          ? ImagePicker.launchCameraAsync
          : ImagePicker.launchImageLibraryAsync
      )({
        mediaTypes: ["images"],
        quality: 0.85,
        allowsMultipleSelection: false,
        base64: Boolean(userId),
      });
      if (selected.canceled) return;
      const file = selected.assets[0];
      if (userId) {
        if (!file.base64 || file.base64.length > 5500000)
          throw new Error("Choose a service photo under4 MB.");
        await captureFieldEvent(userId, "booking:" + b.id, 1, "photo", {
          bookingId: b.id,
          base64: file.base64,
          mime: file.mimeType ?? "image/jpeg",
          alt: alt.trim(),
          consent: true,
          bookingVersion: Number(b.version),
          technicianId: userId,
          serviceAction: "service.photo.upload",
          input: { bookingId: b.id },
        });
        setError(
          "Pending Sync: service photograph encrypted on this device. Reconcile pending records to upload; completion is not confirmed.",
        );
        done();
        return;
      }
      const body = new FormData();
      body.append("image", {
        uri: file.uri,
        name: file.fileName ?? "service-photo.jpg",
        type: file.mimeType ?? "image/jpeg",
      } as any);
      body.append("bookingId", b.id);
      body.append("alt", alt);
      body.append("photoConsent", "on");
      const response = await fetch(apiUrl + "/api/media", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      done();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <View>
      {b.images?.map((m: any) => (
        <View key={m.id}>
          <Image
            accessibilityLabel={m.alt}
            source={{
              uri: apiUrl + "/api/media/" + m.id,
              headers: { Authorization: "Bearer " + token },
            }}
            style={{ height: 200, width: "100%" }}
            resizeMode="contain"
          />
          <Text style={s.body}>{m.alt}</Text>
        </View>
      ))}
      {upload && (
        <>
          <Text style={s.body}>
            Private evidence — PNG, JPEG or WebP, under 8 MB. Successful work
            requires a photograph from the authorised visit. Submitted report
            evidence cannot be silently changed.
          </Text>
          <TextInput
            accessibilityLabel="Photograph description"
            style={{
              borderWidth: 1,
              borderColor: "#bbcbbb",
              borderRadius: 12,
              padding: 12,
            }}
            value={alt}
            onChangeText={setAlt}
          />
          <Switch
            accessibilityLabel="Customer consents to private service evidence"
            value={consent}
            onValueChange={setConsent}
          />
          {Constants.expoConfig?.extra?.technicianCameraEnabled && (
            <Button text="Take Photo" press={() => pick(true)} />
          )}
          <Button
            text={busy ? "Uploading…" : "Choose a service photograph"}
            press={() => pick(false)}
          />
        </>
      )}
      {error && <Text accessibilityRole="alert">{friendlyMessage(error)}</Text>}
    </View>
  );
}
const s = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#073b27",
    marginBottom: 14,
  },
  heading: { fontSize: 19, fontWeight: "700", color: "#073b27" },
  body: { fontSize: 15, lineHeight: 24, color: "#44564a", marginVertical: 7 },
  card: {
    padding: 18,
    borderWidth: 1,
    borderColor: "#e0e8df",
    backgroundColor: "#fff",
    borderRadius: 20,
    marginVertical: 12,
  },
  panel: {
    padding: 14,
    backgroundColor: "#f0f6ec",
    borderRadius: 14,
    marginVertical: 10,
  },
  button: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#07592e",
    marginVertical: 7,
    minHeight: 48,
  },
  buttonText: { color: "white", fontWeight: "700", textAlign: "center" },
});

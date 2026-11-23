import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { randomUUID } from "expo-crypto";
import GasOrder from "./GasOrder";
import {
  readCheckoutDraft,
  saveCheckoutDraft,
  clearCheckoutDraft,
} from "./CustomerCheckoutDraft";
import {
  NextIntro,
  NextText,
  NextCard,
  NextList,
  NextRow,
  NextEmpty,
  NextNotice,
  NextButton,
  useNextDock,
} from "./MobileNextUI";
import { ContextSheet } from "./ContextSheet";
import { Feedback } from "./CustomerUI";
type API = (action: string, data?: any) => Promise<any>;
export default function CombinedCheckout({
  user,
  api,
  cart,
  catalogue,
  done,
  orderGas,
}: {
  user: any;
  api: API;
  cart: any[];
  catalogue: any;
  done: (orderId?: string) => void;
  orderGas: () => void;
}) {
  if (cart.length)
    return (
      <GasOrder
        api={api}
        user={user}
        catalogue={catalogue}
        cart={cart}
        gasEnabled={cart.some(
          (i) =>
            catalogue.products.find((p: any) => p.id === i.productId)
              ?.category === "Gas refills",
        )}
        fromCart
        linked
        onPlaced={() => {}}
        done={() => done()}
        viewServices={() => {}}
      />
    );
  return (
    <ServiceRequestReview
      user={user}
      api={api}
      done={done}
      orderGas={orderGas}
    />
  );
}
function ServiceRequestReview({ user, api, done, orderGas }: any) {
  const [appointments, setAppointments] = useState<any[] | null>(null),
    [pending, setPending] = useState<any>(null),
    [result, setResult] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState<any>(null),
    [foreign, setForeign] = useState(false),
    [ready, setReady] = useState(false);
  const lock = useRef(false),
    alive = useRef(true),
    key = useRef(randomUUID()),
    journal = useRef<any>(null),
    storage = "easygas.serviceDrafts." + user?.id;
  useEffect(() => {
    alive.current = true;
    let live = true;
    if (!user) return;
    Promise.all([SecureStore.getItemAsync(storage), readCheckoutDraft(user.id)])
      .then(([raw, saved]) => {
        if (!live) return;
        const rows = JSON.parse(raw || "[]");
        if (!Array.isArray(rows))
          throw Error("The saved appointments need review.");
        setAppointments(rows.slice(0, 5));
        if (saved?.pending) {
          if (
            saved.pending.action === "checkout.mixed" &&
            !saved.pending.payload.products
          ) {
            journal.current = saved.pending;
            setPending(saved.pending);
          } else setForeign(true);
        }
        setReady(true);
      })
      .catch((e) => {
        if (live) setError(e.message + " Your saved requests were preserved.");
      });
    return () => {
      live = false;
      alive.current = false;
    };
  }, [user?.id]);
  async function confirm() {
    if (lock.current || !user) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      let request = journal.current;
      if (!request) {
        if (!appointments?.length) throw Error("Add an appointment first.");
        request = {
          action: "checkout.mixed",
          payload: {
            idempotencyKey: key.current,
            ...(appointments[0].bundleId
              ? {
                  bundleId: appointments[0].bundleId,
                  bundleVersion: appointments[0].bundleVersion,
                  bundleTotalKobo: appointments[0].bundleTotalKobo,
                }
              : {}),
            appointments: appointments.map((a) => a.request),
          },
        };
        await saveCheckoutDraft({
          userId: user.id,
          pending: request,
          draft: { kind: "service-review" },
        });
        journal.current = request;
        setPending(request);
      }
      const value = await api(request.action, request.payload);
      if (!Array.isArray(value.bookings))
        throw Error("The response needs review. Retry the saved request.");
      await SecureStore.deleteItemAsync(storage);
      await clearCheckoutDraft(user.id);
      journal.current = null;
      if (alive.current) {
        setResult(value);
        setPending(null);
      }
    } catch (e: any) {
      if (Number.isInteger(e.status) && e.status < 500 && journal.current) {
        journal.current = null;
        key.current = randomUUID();
        await clearCheckoutDraft(user.id);
        if (alive.current) setPending(null);
      }
      if (alive.current)
        setError(
          e.message +
            (journal.current
              ? " Your request may already be saved. Retry this same request."
              : ""),
        );
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  useNextDock(
    !user || result || foreign
      ? null
      : {
          label: busy
            ? "Confirming…"
            : pending
              ? "Retry saved request"
              : "Confirm appointments",
          disabled: busy || !ready || (!pending && !appointments?.length),
          onPress: () => void confirm(),
        },
  );
  if (!user)
    return (
      <NextEmpty
        title="Sign in to review your requests"
        detail="Your appointments stay linked to your own account."
      />
    );
  if (result)
    return (
      <View style={{ gap: 18 }}>
        <NextIntro
          title="Your requests are saved."
          detail="EasyGas will confirm each appointment and its approved price."
        />
        <NextList>
          {result.bookings.map((b: any) => (
            <NextRow
              key={b.id}
              icon="calendar-days"
              title={b.reference || "Service appointment"}
              detail={b.status?.replaceAll("_", " ")}
              onPress={() => done()}
            />
          ))}
        </NextList>
        <NextButton label="View appointments" onPress={() => done()} />
      </View>
    );
  return (
    <View style={{ gap: 18 }}>
      <NextIntro
        title={"Everything,\nworking together."}
        detail="Review your linked appointments before confirming."
      />
      <Feedback loading={!appointments && !error} error={error} />
      {foreign ? (
        <NextNotice>
          Another checkout has a saved outcome to recover.{" "}
          <NextText onPress={orderGas}>Open saved checkout</NextText>
        </NextNotice>
      ) : (
        <>
          <NextList>
            {appointments?.map((a, i) => (
              <NextRow
                key={a.request.idempotencyKey || i}
                icon="calendar-days"
                title={a.name}
                detail={a.label}
                onPress={() => setSelected(a)}
              />
            ))}
          </NextList>
          {ready && !appointments?.length && (
            <NextEmpty
              title="No staged appointments"
              detail="Choose an appointment in Services and add it to a linked request."
            />
          )}
          <NextText kind="small">
            Delivery and appointment charges keep separate records. A request
            does not authorise work or settle an unapproved quotation.
          </NextText>
          {!pending && (
            <NextRow
              icon="flame"
              title="Add cooking gas"
              detail="Review delivery and appointments together"
              onPress={orderGas}
            />
          )}
        </>
      )}
      {selected && (
        <ContextSheet title={selected.name} onClose={() => setSelected(null)}>
          <NextCard>
            <NextText>{selected.label}</NextText>
            <NextText>{selected.request.address?.street}</NextText>
          </NextCard>
          <NextButton
            label="Remove appointment"
            disabled={!!pending || busy}
            secondary
            onPress={async () => {
              const next = appointments!.filter((a) => a !== selected);
              await SecureStore.setItemAsync(storage, JSON.stringify(next));
              setAppointments(next);
              setSelected(null);
            }}
          />
        </ContextSheet>
      )}
    </View>
  );
}

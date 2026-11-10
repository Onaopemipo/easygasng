import { friendlyMessage } from "../../packages/business-rules/src/friendly-message";
import { NativeRewardSelector } from "./EasyRewards";
import React, { useEffect, useState } from "react";
import {  Pressable } from "react-native";
import { View } from "./surfaces";
import { Text } from "./typography";
import * as SecureStore from "expo-secure-store";
import { randomUUID } from "expo-crypto";
import { NativeForm } from "./Workflows";
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
  done: () => void;
  orderGas: () => void;
}) {
  const [rewardSelection, setRewardSelection] = useState<any>({});
  const [appointments, setAppointments] = useState<any[] | null>(null),
    [error, setError] = useState("");
  const storage = "easygas.serviceDrafts." + user?.id;
  useEffect(() => {
    SecureStore.getItemAsync(storage)
      .then((raw) => {
        const d = JSON.parse(raw ?? "[]");
        setAppointments(Array.isArray(d) ? d.slice(0, 5) : []);
      })
      .catch(() => setError("The saved appointment drafts could not be read."));
  }, [storage]);
  if (!user) return <Text>Sign in to confirm a linked request.</Text>;
  if (error) return <Text accessibilityRole="alert">{friendlyMessage(error)}</Text>;
  if (!appointments) return <Text>Loading appointment drafts…</Text>;
  return (
    <View>
      <Text style={{ fontSize: 28, fontWeight: "800", color: "#073b27" }}>
        Products & appointments
      </Text>
      <Text style={{ lineHeight: 24, marginVertical: 14 }}>
        Product delivery and service appointments keep separate completion and
        payment records. Service charges require approved pricing or a
        customer-approved quotation.
      </Text>
      <Pressable onPress={orderGas}>
        <Text style={{ color: "#07592e", paddingVertical: 12 }}>
          Add cooking gas to this linked request
        </Text>
      </Pressable>
      {appointments.map((a, i) => (
        <View
          key={a.request.idempotencyKey}
          style={{
            padding: 16,
            backgroundColor: "#edf5e9",
            borderRadius: 16,
            marginVertical: 10,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700" }}>{a.name}</Text>
          <Text>{a.label}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={async () => {
              const next = appointments.filter((_, j) => j !== i);
              await SecureStore.setItemAsync(storage, JSON.stringify(next));
              setAppointments(next);
            }}
          >
            <Text style={{ paddingVertical: 12, color: "#07592e" }}>
              Remove appointment
            </Text>
          </Pressable>
        </View>
      ))}
      {!appointments.length ? (
        <Text>Add an appointment from Professional Gas Services first.</Text>
      ) : (
        <>
          {!!cart.length && (
            <NativeRewardSelector api={api} onChange={setRewardSelection} />
          )}
          <NativeForm
            api={async (_, v) => {
              const productBase = cart.length
                ? {
                    items: cart,
                    address: v.address,
                    date: v.date,
                    window: v.window,
                    paymentMethod: v.paymentMethod,
                    ...rewardSelection,
                  }
                : undefined;
              const fingerprint = JSON.stringify({
                products: productBase,
                bundleId: appointments[0]?.bundleId,
                bundleVersion: appointments[0]?.bundleVersion,
                bundleTotalKobo: appointments[0]?.bundleTotalKobo,
                appointments: appointments.map((a) => a.request),
              });
              const pendingKey = "easygas.mixedPending." + user.id;
              const pending = JSON.parse(
                (await SecureStore.getItemAsync(pendingKey)) ?? "null",
              );
              const key =
                pending?.fingerprint === fingerprint
                  ? pending.key
                  : randomUUID();
              await SecureStore.setItemAsync(
                pendingKey,
                JSON.stringify({ key, fingerprint }),
              );
              const result = await api("checkout.mixed", {
                idempotencyKey: key,
                ...(appointments[0]?.bundleId
                  ? {
                      bundleId: appointments[0].bundleId,
                      bundleVersion: appointments[0].bundleVersion,
                      bundleTotalKobo: appointments[0].bundleTotalKobo,
                    }
                  : {}),
                appointments: appointments.map((a) => a.request),
                ...(productBase
                  ? { products: { ...productBase, idempotencyKey: key } }
                  : {}),
              });
              await SecureStore.deleteItemAsync(storage);
              await SecureStore.deleteItemAsync(pendingKey);
              done();
              return result;
            }}
            action="checkout.mixed"
            title="Confirm linked request"
            fields={
              cart.length
                ? [
                    { name: "address.name", label: "Product recipient name" },
                    {
                      name: "address.phone",
                      label: "Product delivery mobile number",
                    },
                    {
                      name: "address.street",
                      label: "Product delivery street",
                    },
                    {
                      name: "address.zone",
                      label: "Product delivery area",
                      options: catalogue.zones.map((z: string) => ({
                        value: z,
                        label: z,
                      })),
                    },
                    {
                      name: "date",
                      label: "Product delivery date (YYYY-MM-DD)",
                    },
                    {
                      name: "window",
                      label: "Product delivery window",
                      options: catalogue.windows.map((w: string) => ({
                        value: w,
                        label: w,
                      })),
                    },
                    {
                      name: "paymentMethod",
                      label: "Product payment",
                      value: "cash_on_delivery",
                      options: [
                        {
                          value: "cash_on_delivery",
                          label: "Cash on delivery",
                        },
                        ...(catalogue.walletEnabled
                          ? [
                              {
                                value: "wallet",
                                label: "Verified purchase credit",
                              },
                            ]
                          : []),
                      ],
                    },
                  ]
                : []
            }
          />
        </>
      )}
    </View>
  );
}

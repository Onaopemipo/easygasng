import Constants from "expo-constants";
import { assertMobileApiOrigin } from "../../packages/business-rules/src/mobile-origin";
import React, { useState } from "react";
import { Switch } from "react-native";
import { View, Pressable } from "./surfaces";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { FieldCaption, Text, TextInput } from "./typography";
import { captureFieldEvent, type FieldEvent } from "./field-queue";
export function DriverPhoto({
  userId,
  orderId,
}: {
  userId: string;
  orderId: string;
}) {
  const [consent, setConsent] = useState(false),
    [alt, setAlt] = useState(""),
    [message, setMessage] = useState("");
  async function choose() {
    try {
      if (!consent || alt.trim().length < 3)
        throw new Error("Record photo consent and a description first.");
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted)
        throw new Error("Photo library permission is required.");
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        base64: true,
        quality: 0.65,
        allowsMultipleSelection: false,
      });
      if (r.canceled) return;
      const p = r.assets[0];
      if (!p.base64 || p.base64.length > 5500000)
        throw new Error("Choose a photo under 4 MB.");
      await captureFieldEvent(userId, "order:" + orderId, 1, "photo", {
        orderId,
        base64: p.base64,
        mime: p.mimeType ?? "image/jpeg",
        alt: alt.trim(),
        consent: true,
      });
      setMessage(
        "Photo encrypted on this device. Synchronise pending field records to upload; this does not complete delivery.",
      );
    } catch (e: any) {
      setMessage(e.message);
    }
  }
  return (
    <View style={{ padding: 12, gap: 8 }}>
      <Text>Delivery evidence photo</Text>
      <FieldCaption required={true}>Photo description</FieldCaption>
      <TextInput
        accessibilityLabel="Photo description, required"
        value={alt}
        onChangeText={setAlt}
        placeholder="Describe the evidence (avoid unnecessary personal data)"
      />
      <FieldCaption required={true}>Customer consented to this evidence photo</FieldCaption>
      <Switch value={consent} onValueChange={setConsent} />
      <Pressable accessibilityRole="button" onPress={choose}>
        <Text style={{ color: "#087a36", fontSize: 16 }}>
          Choose and encrypt photo for this order
        </Text>
      </Pressable>
      {message && <Text accessibilityRole="alert">{message}</Text>}
    </View>
  );
}
export function photoUploader(origin: string, token: string | null) {
  return async (e: FieldEvent) => {
    assertMobileApiOrigin(
      origin,
      __DEV__,
      Constants.expoConfig?.extra?.easygasRuntime === "local-demo",
    );
    if (!token || !FileSystem.cacheDirectory)
      throw new Error("Sign in before uploading pending evidence.");
    const { orderId, bookingId, base64, alt, consent } = e.payload;
    const service = e.tripId.startsWith("booking:");
    if (
      (service
        ? typeof bookingId !== "string" || e.tripId !== "booking:" + bookingId
        : typeof orderId !== "string") ||
      typeof base64 !== "string" ||
      typeof alt !== "string" ||
      consent !== true
    )
      throw new Error("Photo metadata needs review.");
    const temp = FileSystem.cacheDirectory + `easygas-upload-${e.id}.image`;
    try {
      await FileSystem.writeAsStringAsync(temp, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const form = new FormData();
      form.append("image", {
        uri: temp,
        name: "evidence.image",
        type: String(e.payload.mime ?? "image/jpeg"),
      } as any);
      if (service) {
        form.append("bookingId", String(bookingId));
        form.append("bookingVersion", String(e.payload.bookingVersion));
      } else form.append("orderId", String(orderId));
      form.append("alt", alt);
      form.append("photoConsent", "on");
      form.append("capturedAt", e.recordedAt);
      const r = await fetch(origin + "/api/media", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-easygas-client": "native",
        },
        body: form,
      });
      if (!r.ok)
        throw new Error(
          "Photo upload needs review or a refreshed session. Encrypted evidence is retained.",
        );
      return await r.json();
    } finally {
      await FileSystem.deleteAsync(temp, { idempotent: true });
    }
  };
}

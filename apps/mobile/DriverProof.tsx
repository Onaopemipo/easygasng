import React, { useState } from "react";
import { View, Image, Switch } from "react-native";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Text, TextInput } from "./typography";
import { useTheme } from "./theme";
import { Button, Card, Copy, Title } from "./CustomerUI";
import { captureFieldEvent } from "./field-queue";
export default function DriverProof({
  userId,
  order,
  galleryApproved,
  onQueued,
}: {
  userId: string;
  order: any;
  galleryApproved: boolean;
  onQueued: () => void;
}) {
  const { colors } = useTheme();
  const [consent, setConsent] = useState(false),
    [alt, setAlt] = useState(""),
    [preview, setPreview] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function capture(camera: boolean) {
    setBusy(true);
    try {
      if (!consent || alt.trim().length < 3)
        throw new Error(
          "Confirm consent and describe the proof before capture.",
        );
      if (camera && !Constants.expoConfig?.extra?.driverCameraEnabled)
        throw new Error(
          "Camera capture is unavailable in this build. Contact dispatch.",
        );
      const permission = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted)
        throw new Error(
          "Photo permission denied. Contact dispatch; delivery cannot bypass proof.",
        );
      const result = camera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            base64: true,
            quality: 0.65,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            base64: true,
            quality: 0.65,
            allowsMultipleSelection: false,
          });
      if (result.canceled) return;
      const image = result.assets[0];
      try {
        if (!image.base64 || image.base64.length > 5300000)
          throw new Error("Choose a valid photo under4MB.");
        await captureFieldEvent(userId, "order:" + order.id, 1, "photo", {
          orderId: order.id,
          attemptId: order.attempt.id,
          base64: image.base64,
          mime: image.mimeType ?? "image/jpeg",
          alt: alt.trim(),
          consent: true,
        });
        setPreview(
          "data:" +
            (image.mimeType ?? "image/jpeg") +
            ";base64," +
            image.base64,
        );
        setMessage(
          "Pending Sync: proof encrypted on this device. Synchronise before confirming delivery.",
        );
        onQueued();
      } finally {
        if (
          FileSystem.cacheDirectory &&
          image.uri.startsWith(FileSystem.cacheDirectory)
        )
          await FileSystem.deleteAsync(image.uri, { idempotent: true }).catch(
            () => {},
          );
      }
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <Title>Proof of Delivery</Title>
      <Copy>
        Photograph the delivered cylinder/items with consent. Avoid faces and
        home interiors. Retaking adds a new historical record; it never
        overwrites prior proof.
      </Copy>
      <TextInput
        accessibilityLabel="Proof description"
        placeholder="Describe delivered items"
        value={alt}
        onChangeText={setAlt}
        style={{
          padding: 12,
          borderWidth: 1,
          borderRadius: 12,
          borderColor: colors.border,
          backgroundColor: colors.input,
          color: colors.text,
        }}
      />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Switch
          accessibilityLabel="Customer consented to delivery photo"
          value={consent}
          onValueChange={setConsent}
        />
        <Text preserveColor style={{ color: colors.text, flex: 1 }}>
          Customer consented to this photo
        </Text>
      </View>
      {preview && (
        <Image
          source={{ uri: preview }}
          accessibilityLabel={alt}
          resizeMode="contain"
          style={{ width: "100%", height: 220, borderRadius: 16 }}
        />
      )}
      <Button
        label={preview ? "Take another proof photo" : "Take Photo"}
        disabled={busy}
        onPress={() => capture(true)}
      />
      {galleryApproved && (
        <Button
          label="Choose approved photo from Gallery"
          secondary
          disabled={busy}
          onPress={() => capture(false)}
        />
      )}{" "}
      {!!message && (
        <Text
          preserveColor
          accessibilityRole="alert"
          style={{ color: colors.text }}
        >
          {message}
        </Text>
      )}
    </Card>
  );
}

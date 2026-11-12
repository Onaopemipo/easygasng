import React, { useEffect, useState } from "react";
import { Image } from "react-native";
import { Card, Copy, Button, type CustomerAPI } from "./CustomerUI";
export default function DriverPhotoHistory({
  api,
  orderId,
  attemptId,
  origin,
  token,
}: {
  api: CustomerAPI;
  orderId: string;
  attemptId?: string;
  origin: string;
  token: string | null;
}) {
  const [photos, setPhotos] = useState<any[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    setPhotos([]);
    api("delivery.photos?" + new URLSearchParams({ orderId, ...(attemptId ? { attemptId } : {}) }).toString())
      .then((result) => {
        if (current) setPhotos(result.photos);
      })
      .catch(() => {
        if (current) setError("Private proof history is unavailable.");
      });
    return () => {
      current = false;
    };
  }, [orderId, attemptId, token]);
  return (
    <>
      {!!error && <Copy>{error}</Copy>}
      {!photos.length && !error && (
        <Copy>No retained proof photographs for this order.</Copy>
      )}
      {photos.map((p) => (
        <Card key={p.id}>
          <Image
            accessible
            accessibilityLabel={p.alt}
            source={{
              uri: origin + "/api/media/" + p.id,
              headers: { Authorization: "Bearer " + token },
              cache: "reload",
            }}
            resizeMode="contain"
            style={{ height: 210, width: "100%" }}
            onError={() =>
              setError(
                "A private image could not be loaded; access may have changed.",
              )
            }
          />
          <Copy>{p.alt}</Copy>
          <Copy>
            Captured {new Date(p.captured_at).toLocaleString()}. Retained until{" "}
            {new Date(p.retain_until).toLocaleDateString()}.
          </Copy>
        </Card>
      ))}
    </>
  );
}

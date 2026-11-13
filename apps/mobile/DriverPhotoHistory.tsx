import React, { useEffect, useState } from "react";
import { Image } from "react-native";
import { Card, Copy, Feedback, type CustomerAPI } from "./CustomerUI";
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
  const [result, setResult] = useState<{ orderId: string; attemptId?: string; token: string | null; photos: any[] }>(),
    [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    setError("");
    api("delivery.photos?" + new URLSearchParams({ orderId, ...(attemptId ? { attemptId } : {}) }).toString())
      .then((result) => {
        if (current) setResult({ orderId, attemptId, token, photos: result.photos });
      })
      .catch(() => {
        if (current) setError("Private proof history is unavailable.");
      });
    return () => {
      current = false;
    };
  }, [orderId, attemptId, token]);
  const photos = result?.orderId === orderId && result.attemptId === attemptId && result.token === token ? result.photos : null;
  return (
    <>
      {!!error && <Copy>{error}</Copy>}
      <Feedback loading={!photos && !error} />
      {photos?.length === 0 && !error && (
        <Copy>No retained proof photographs for this order.</Copy>
      )}
      {photos?.map((p) => (
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

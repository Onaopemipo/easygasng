import React, { useEffect, useRef, useState } from "react";
import { View, Switch } from "react-native";
import { assertMobileApiOrigin } from "../../packages/business-rules/src/mobile-origin";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useRemote, Feedback, type CustomerAPI } from "./CustomerUI";
import { useTheme } from "./theme";
import {
  NextIntro,
  NextText,
  NextButton,
  NextRow,
  NextList,
  NextEmpty,
  NextNotice,
  NextField,
  NextCard,
  NextStatus,
} from "./MobileNextUI";
import { ContextSheet } from "./ContextSheet";
import { NativeForm } from "./Workflows";
import { Appointment } from "./Services";
export function CustomerNextQuotations({
  api,
  user,
  origin,
  token,
}: {
  api: CustomerAPI;
  user: any;
  origin: string;
  token: string | null;
}) {
  const r = useRemote(api, "bookings"),
    [selected, setSelected] = useState<string | null>(null),
    rows = Array.isArray(r.data) ? r.data : [],
    current = rows.find((b) => b.id === selected);
  return (
    <View style={{ gap: 18 }}>
      <NextIntro
        title={"Your scope.\nYour decision."}
        detail="Review appointment quotations before authorising work."
      />
      <Feedback loading={r.loading} error={r.error} retry={r.reload} />
      <NextList>
        {rows.map((b) => (
          <NextRow
            key={b.id}
            title={b.reference}
            detail={
              (b.snapshot?.name || "Service appointment") +
              " · " +
              b.status.replaceAll("_", " ")
            }
            icon="receipt"
            onPress={() => setSelected(b.id)}
          />
        ))}
      </NextList>
      {!r.loading && !rows.length && (
        <NextEmpty
          title="No service quotations yet"
          detail="Your appointment’s current quote and authorisation will appear here."
        />
      )}
      {current && (
        <ContextSheet
          title="Quotation & work authority"
          onClose={() => setSelected(null)}
        >
          <Appointment
            key={current.id + ":" + current.version}
            b={current}
            user={user}
            api={api}
            token={token}
            apiUrl={origin}
            done={r.reload}
          />
        </ContextSheet>
      )}
    </View>
  );
}
export function CustomerNextTestimonials({
  api,
  user,
  origin,
  token,
}: {
  api: CustomerAPI;
  user: any;
  origin: string;
  token: string | null;
}) {
  const r = useRemote(api, "testimonials.mine"),
    [sheet, setSheet] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [photoConsent, setPhotoConsent] = useState(false),
    [description, setDescription] = useState(""),
    [picking, setPicking] = useState(false),
    lock = useRef(false),
    alive = useRef(true),
    { colors } = useTheme();
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const data = r.data,
    rows = data?.submissions ?? [],
    transactions = [
      ...(data?.orders ?? []).map((o: any) => ({
        value: "order:" + o.id,
        label: o.reference,
      })),
      ...(data?.bookings ?? []).map((b: any) => ({
        value: "booking:" + b.id,
        label: b.reference,
      })),
    ];
  async function transition(row: any, status: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await api("testimonial.transition", {
        id: row.id,
        revision: Number(row.revision),
        status,
      });
      if (alive.current) {
        setSheet(null);
        r.reload();
      }
    } catch (e: any) {
      if (alive.current) setError(e.message);
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function photo() {
    if (
      lock.current ||
      !sheet?.row ||
      !photoConsent ||
      description.trim().length < 3
    )
      return;
    lock.current = true;
    setPicking(true);
    setError("");
    try {
      if (!token) throw Error("Sign in to attach a photo.");
      assertMobileApiOrigin(
        origin,
        __DEV__,
        Constants.expoConfig?.extra?.easygasRuntime === "local-demo",
      );
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted)
        throw Error(
          "Photo library permission was not granted. Your feedback is unchanged.",
        );
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsMultipleSelection: false,
      });
      if (picked.canceled) return;
      const asset = picked.assets[0],
        mime = asset.mimeType || "image/jpeg";
      if (!data.policy.photoFormats.includes(mime))
        throw Error("Choose a supported JPEG, PNG or WebP photo.");
      const info = asset.fileSize
        ? { size: asset.fileSize }
        : await FileSystem.getInfoAsync(asset.uri);
      const size = "size" in info ? info.size : 0;
      if (!size || size > data.policy.photoMaxMb * 1024 * 1024)
        throw Error("Choose a photo within the configured size limit.");
      const form = new FormData();
      form.append("file", {
        uri: asset.uri,
        type: mime,
        name: asset.fileName || "feedback.jpg",
      } as any);
      form.append("testimonialId", sheet.row.id);
      form.append("photoConsent", "on");
      form.append("alt", description.trim());
      const response = await fetch(origin + "/api/media", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "x-easygas-client": "native",
        },
        body: form,
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error || "Photo upload was not confirmed.");
      if (alive.current) {
        setSheet(null);
        setPhotoConsent(false);
        r.reload();
      }
    } catch (e: any) {
      if (alive.current) setError(e.message);
    } finally {
      lock.current = false;
      if (alive.current) setPicking(false);
    }
  }
  const editing = sheet?.kind === "edit" ? sheet.row : null;
  return (
    <View style={{ gap: 18 }}>
      <NextIntro
        title={"Your experience,\nin your words."}
        detail="All ratings are welcome. Publication always requires your consent and independent review."
      />
      <Feedback loading={r.loading} error={r.error} retry={r.reload} />
      {!!error && <NextNotice error>{error}</NextNotice>}
      {data && !data.policy.enabled && (
        <NextNotice>
          New feedback is currently disabled. Existing feedback and consent
          controls remain available.
        </NextNotice>
      )}
      {data?.policy.enabled && (
        <NextButton
          label="Write feedback"
          disabled={!transactions.length}
          onPress={() => setSheet({ kind: "edit" })}
        />
      )}
      <NextList>
        {rows.map((row: any) => (
          <NextRow
            key={row.id}
            title={row.display_name + " · " + row.rating + "/5"}
            detail={row.status.replaceAll("_", " ")}
            icon="message-circle"
            onPress={() => setSheet({ kind: "record", row })}
          />
        ))}
      </NextList>
      {!r.loading && !rows.length && (
        <NextEmpty
          title="No feedback yet"
          detail="A completed service or delivered, verified-paid order is required before writing feedback."
        />
      )}
      {sheet?.kind === "edit" && (
        <ContextSheet
          title={editing ? "Edit feedback" : "Write feedback"}
          onClose={() => setSheet(null)}
        >
          <NativeForm
            key={editing?.id || "new"}
            api={async (_, v) => {
              const content = {
                rating: Number(v.rating),
                body: v.body,
                nameStyle: v.nameStyle,
                displayName: v.displayName,
                consent: v.consent,
              };
              if (editing)
                return api("testimonial.edit", {
                  id: editing.id,
                  revision: Number(editing.revision),
                  content,
                });
              const [kind, id] = v.transaction.split(":");
              return api("testimonial.create", {
                [kind === "order" ? "orderId" : "bookingId"]: id,
                content,
              });
            }}
            action={editing ? "testimonial.edit" : "testimonial.create"}
            title="Your experience"
            fields={[
              ...(!editing
                ? [
                    {
                      name: "transaction",
                      label: "Completed order or appointment",
                      options: transactions,
                    },
                  ]
                : []),
              {
                name: "rating",
                label: "Rating",
                value: String(editing?.rating || 5),
                options: [5, 4, 3, 2, 1].map((n) => ({
                  value: String(n),
                  label: n + " out of 5",
                })),
              },
              {
                name: "body",
                label: "Your experience",
                type: "textarea",
                value: editing?.body || "",
              },
              {
                name: "nameStyle",
                label: "Public name style",
                value: editing?.name_style || "first",
                options: [
                  { value: "first", label: "First name" },
                  { value: "initials", label: "Initials" },
                  { value: "custom", label: "Chosen display name" },
                ],
              },
              {
                name: "displayName",
                label: "Display name",
                value:
                  editing?.display_name ||
                  user.name.split(" ")[0] ||
                  "Customer",
              },
              {
                name: "consent",
                label:
                  "I consent to publication of this feedback after independent review",
                type: "checkbox",
                required: false,
                value: !!editing?.consent,
              },
            ]}
            submitLabel="Save draft"
            onDone={() => {
              setSheet(null);
              r.reload();
            }}
          />
          <NextText kind="small" style={{ color: colors.muted }}>
            Do not include phone numbers, email, links, delivery addresses or
            private information. Saved drafts are not published.
          </NextText>
        </ContextSheet>
      )}
      {sheet?.kind === "record" && (
        <ContextSheet title="Your feedback" onClose={() => setSheet(null)}>
          {!!error && <NextNotice error>{error}</NextNotice>}
          <View style={{ gap: 18 }}>
            <NextStatus value={sheet.row.status} />
            <NextCard>
              <NextText>{sheet.row.body}</NextText>
              <NextText kind="small">{sheet.row.latest_reason}</NextText>
            </NextCard>
            {!["WITHDRAWN", "REJECTED"].includes(sheet.row.status) && (
              <NextButton
                secondary
                label="Edit feedback"
                onPress={() => setSheet({ kind: "edit", row: sheet.row })}
              />
            )}
            <NextList>
              {["DRAFT", "CHANGES_REQUESTED"].includes(sheet.row.status) &&
                sheet.row.consent && (
                  <NextRow
                    title="Submit for independent review"
                    icon="shield-check"
                    onPress={() => void transition(sheet.row, "PENDING_REVIEW")}
                  />
                )}
              {sheet.row.status !== "WITHDRAWN" && (
                <NextRow
                  title="Withdraw publication consent"
                  icon="shield-check"
                  onPress={() => void transition(sheet.row, "WITHDRAWN")}
                />
              )}
              {sheet.row.status === "DRAFT" && data.policy.imagesEnabled && (
                <NextRow
                  title="Attach a photo with consent"
                  icon="package"
                  onPress={() => {
                    setPhotoConsent(false);
                    setDescription("");
                    setSheet({ kind: "photo", row: sheet.row });
                  }}
                />
              )}
            </NextList>
            {busy && <NextText>Saving your decision…</NextText>}
          </View>
        </ContextSheet>
      )}
      {sheet?.kind === "photo" && (
        <ContextSheet
          title="Attach feedback photo"
          onClose={() => setSheet(null)}
        >
          {!!error && <NextNotice error>{error}</NextNotice>}
          <View style={{ gap: 18 }}>
            <NextField
              label="Photo description"
              value={description}
              onChange={setDescription}
            />
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Switch
                value={photoConsent}
                onValueChange={setPhotoConsent}
                accessibilityLabel="I consent to publication of this photo with my feedback"
              />
              <NextText style={{ flex: 1 }}>
                I consent to publication of this photo with my feedback after
                review.
              </NextText>
            </View>
            <NextButton
              label={picking ? "Uploading…" : "Choose and attach photo"}
              disabled={
                picking || !photoConsent || description.trim().length < 3
              }
              onPress={() => void photo()}
            />
          </View>
        </ContextSheet>
      )}
    </View>
  );
}

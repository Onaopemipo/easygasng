import { AuthShell } from "./AuthPresentation";
import { FocusedFormContext } from "./CustomerUI";
import React, { useEffect, useState } from "react";
import { View } from "./surfaces";
import { TextInput, Text } from "./typography";
import { Card, Copy, Title, Button } from "./CustomerUI";
import { NativeForm } from "./Workflows";
import { PASSWORD_MIN_LENGTH } from "../../packages/business-rules/src/password-policy";
import {
  nativeEntryLink,
  type NativeEntry,
} from "../../packages/business-rules/src/native-entry-links";
type API = (action: string, data?: any) => Promise<any>;
export function NativeEntryScreen({
  api,
  entry,
  origin,
  onEntry,
  onClose,
  onSession,
  onPolicies,
}: {
  api: API;
  entry: NativeEntry | null;
  origin: string;
  onEntry: (v: NativeEntry) => void;
  onClose: () => void;
  onSession: (r: any) => Promise<void>;
  onPolicies: () => void;
}) {
  const [link, setLink] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [code, setCode] = useState(""),
    [order, setOrder] = useState<any>(null),
    [done, setDone] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (done && !entry?.token) return;
    setLink("");
    setError("");
    setMessage("");
    setCode("");
    setOrder(null);
    setDone(false);
  }, [entry?.token, entry?.kind]);
  const token = entry?.token;
  async function submit(action: string, values: any) {
    if (!token) throw Error("Open a current account link first.");
    const input = { ...values, token };
    delete input.confirmPassword;
    if (["account.reset", "phone.complete"].includes(action)) {
      if (String(values.password || "").length < PASSWORD_MIN_LENGTH)
        throw Error("Use at least " + PASSWORD_MIN_LENGTH + " characters.");
      if (values.password !== values.confirmPassword)
        throw Error("Passwords do not match.");
    }
    const r = await api(action, input);
    if (r.ok === false)
      throw Error(r.message || "Verification was not accepted.");
    if (action === "phone.complete") {
      await onSession(r);
    }
    return r;
  }
  async function reviewPhone() {
    if (busy || !token) return;
    setBusy(true);
    setError("");
    try {
      const r = await api("phone.review", { token, code });
      if (!r.ok) throw Error(r.message || "Check your verification code.");
      setOrder(r.order);
    } catch (e: any) {
      setOrder(null);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthShell
      mode="link"
      onBack={onClose}
      title={
        entry
          ? {
              reset: "Reset password",
              verify: "Verify email",
              invitation: "Accept invitation",
              phone: "Complete your account",
            }[entry.kind]
          : "Open an account link"
      }
    >
      <FocusedFormContext.Provider value={true}>
        <Button label="Back to sign in" secondary onPress={onClose} />
        {error && <Text accessibilityRole="alert">{error}</Text>}
        {message && <Text accessibilityRole="status">{message}</Text>}
        {!token && !done && (
          <Card>
            <Copy>
              Paste the complete EasyGas link from your email or requested phone
              message. Missing, invalid, expired and already used links cannot
              establish access.
            </Copy>
            <TextInput
              accessibilityLabel="EasyGas account link"
              value={link}
              onChangeText={setLink}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Button
              label="Open account link"
              onPress={() => {
                const next = nativeEntryLink(link, origin);
                setLink("");
                if (!next?.token) {
                  setError(
                    "This is not a valid account link for this EasyGas service. Request a fresh link.",
                  );
                  return;
                }
                setError("");
                onEntry(next);
              }}
            />
          </Card>
        )}
        {token && !done && entry?.kind === "verify" && (
          <NativeForm
            api={submit}
            action="account.verify"
            title="Confirm email verification"
            fields={[]}
            submitLabel="Verify this email"
            onDone={(r) => {
              setMessage(r.message);
              setDone(true);
              onEntry({ ...entry, token: null });
            }}
          />
        )}
        {token && !done && entry?.kind === "invitation" && (
          <>
            <Copy>
              Use the temporary password provided with this invitation.
              Acceptance preserves the server’s staff-access review; it does not
              grant a role. You’ll replace the temporary password when you sign
              in.
            </Copy>
            <NativeForm
              api={submit}
              action="invitation.accept"
              title="Invitation credentials"
              fields={[
                {
                  name: "password",
                  label: "Invitation temporary password",
                  type: "password",
                },
              ]}
              submitLabel="Accept invitation"
              onDone={(r) => {
                setMessage(r.message);
                setDone(true);
                onEntry({ ...entry, token: null });
              }}
            />
          </>
        )}
        {token && !done && entry?.kind === "reset" && (
          <NativeForm
            api={submit}
            action="account.reset"
            title="Choose a new password"
            fields={[
              { name: "password", label: "New password", type: "password" },
              {
                name: "confirmPassword",
                label: "Confirm new password",
                type: "password",
              },
            ]}
            submitLabel="Reset password"
            onDone={(r) => {
              setMessage(r.message);
              setDone(true);
              onEntry({ ...entry, token: null });
            }}
          />
        )}
        {token && !done && entry?.kind === "phone" && (
          <>
            <Copy>
              Verify the phone before viewing the order. Completion keeps the
              existing customer and order.
            </Copy>
            <NativeForm
              api={submit}
              action="phone.otp"
              title="Request verification code"
              fields={[
                {
                  name: "channel",
                  label: "Requested channel",
                  value: "sms",
                  options: [
                    { value: "sms", label: "SMS" },
                    { value: "whatsapp", label: "WhatsApp" },
                  ],
                },
              ]}
              submitLabel="Request code"
              onDone={(r) => setMessage(r.message)}
            />
            <TextInput
              accessibilityLabel="Six-digit verification code"
              keyboardType="number-pad"
              value={code}
              onChangeText={(v) => {
                setCode(v);
                setOrder(null);
              }}
            />
            <Button
              label={busy ? "Checking code…" : "Review linked order"}
              onPress={() => void reviewPhone()}
              disabled={busy || !/^\d{6}$/.test(code)}
            />
            {order && (
              <Card>
                <Title>{order.reference}</Title>
                <Copy>
                  {order.status} · ₦
                  {(Number(order.total_kobo) / 100).toLocaleString("en-NG")}
                </Copy>
                <Copy>
                  {order.address?.street} · {order.delivery_date} ·{" "}
                  {order.delivery_window}
                </Copy>
                <Button
                  label="Read policies and terms"
                  secondary
                  onPress={onPolicies}
                />
                <NativeForm
                  key={code}
                  api={(a, d) => submit(a, { ...d, code })}
                  action="phone.complete"
                  title="Finish account setup"
                  fields={[
                    {
                      name: "password",
                      label: "New password",
                      type: "password",
                    },
                    {
                      name: "confirmPassword",
                      label: "Confirm new password",
                      type: "password",
                    },
                    {
                      name: "termsAccepted",
                      label: "I have read and accept the applicable terms",
                      type: "checkbox",
                    },
                  ]}
                  submitLabel="Complete account"
                />
              </Card>
            )}
          </>
        )}
      </FocusedFormContext.Provider>
    </AuthShell>
  );
}
export function NativePublicPolicies({
  api,
  onBack,
}: {
  api: API;
  onBack: () => void;
}) {
  const [rows, setRows] = useState<any[] | null>(null),
    [selected, setSelected] = useState<any>(null),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setError("");
    api("policies")
      .then((r) => {
        if (live) setRows(r);
      })
      .catch((e) => {
        if (live) {
          setRows(null);
          setError(e.message);
        }
      });
    return () => {
      live = false;
    };
  }, [attempt]);
  return (
    <View style={{ gap: 12 }}>
      <Title>{selected?.title || "Policies & terms"}</Title>
      <Button
        label={selected ? "All policies" : "Back"}
        secondary
        onPress={() => (selected ? setSelected(null) : onBack())}
      />
      {error && (
        <>
          <Text accessibilityRole="alert">{error}</Text>
          <Button
            label="Retry policies"
            onPress={() => setAttempt((v) => v + 1)}
          />
        </>
      )}
      {!rows && !error && <Copy>Loading published policies…</Copy>}
      {selected ? (
        <>
          <Copy>
            Version {selected.version} · Effective{" "}
            {new Date(selected.effective_at).toLocaleString("en-NG", {
              timeZone: "Africa/Lagos",
            })}{" "}
            (Lagos)
          </Copy>
          <Copy>{selected.content}</Copy>
        </>
      ) : rows?.length ? (
        rows.map((r) => (
          <Button
            key={r.kind}
            label={r.title}
            secondary
            onPress={() => setSelected(r)}
          />
        ))
      ) : (
        rows && (
          <Copy>
            No published policy is available yet. Publication and commercial
            acceptance remain subject to business approval.
          </Copy>
        )
      )}
    </View>
  );
}

/** Public business contact and delivery data comes from the same approved catalogue as the website. */
export function NativeServiceInfo({
  api,
  onBack,
  onPolicies,
}: {
  api: API;
  onBack: () => void;
  onPolicies: () => void;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    api("catalogue?view=homepage")
      .then((r) => {
        if (live) {
          setData(r);
          setError("");
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [attempt]);
  return (
    <View style={{ gap: 12 }}>
      <Title>About & delivery</Title>
      <Button label="Back" secondary onPress={onBack} />
      {error && (
        <>
          <Text accessibilityRole="alert">{error}</Text>
          <Button
            label="Retry business information"
            onPress={() => setAttempt((v) => v + 1)}
          />
        </>
      )}
      {data && (
        <>
          <Card>
            <Title>EasyGas Energy Solutions</Title>
            <Copy>
              {data.website?.heroHeading} {data.website?.heroEmphasis}
            </Copy>
            <Copy>{data.website?.heroSubheading}</Copy>
          </Card>
          <Card>
            <Title>How ordering works</Title>
            <Copy>
              Choose gas or products, confirm your delivery address and current
              quotation, then use an enabled payment method. Follow progress in
              Orders. Service visits have their own assessment and work-approval
              steps.
            </Copy>
            <Copy>
              {data.orderingEnabled
                ? "Ordering is enabled for eligible addresses."
                : "Ordering is currently unavailable. Contact EasyGas for information."}
            </Copy>
          </Card>
          <Card>
            <Title>Delivery information</Title>
            <Copy>
              Coverage, fees and delivery times are confirmed by the current
              quotation for your address.
            </Copy>
            {(data.gas?.locations || []).map((l: any) => (
              <Copy key={l.id}>
                {l.name}
                {l.coverage ? " · " + l.coverage : ""}
              </Copy>
            ))}
            <Copy>{(data.windows || []).join(" · ")}</Copy>
          </Card>
          <Card>
            <Title>Contact & business supply</Title>
            <Copy>
              For business supply enquiries, contact EasyGas using its published
              details.
            </Copy>
            <Copy>
              {data.website?.phonePrimary} {data.website?.phoneSecondary}
            </Copy>
            <Copy>{data.website?.email}</Copy>
            <Copy>{data.website?.address}</Copy>
          </Card>
          <Button label="Policies & terms" secondary onPress={onPolicies} />
        </>
      )}
    </View>
  );
}

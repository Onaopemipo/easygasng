"use client";
import React, {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  UserRound,
  MapPin,
  Bell,
  ShieldCheck,
  Palette,
  MessageSquare,
  Pencil,
  Plus,
  Check,
  ChevronRight,
  Monitor,
  Download,
  KeyRound,
  Mail,
  Trash2,
} from "lucide-react";
import Link from "./workspace-link";
import { api, Loading, Modal, Notice } from "./ui";
import { useCustomerResource } from "./customer-data";
import { ActionForm, DownloadPersonalData } from "./workflows";
import { ThemeSettings } from "./theme-provider";
import { CustomerTestimonials } from "./testimonials";
import { PASSWORD_MIN_LENGTH } from "../../../packages/business-rules/src/password-policy";
import styles from "./customer-account.module.css";

const sections = [
  ["profile", "Profile", UserRound],
  ["addresses", "Addresses", MapPin],
  ["notifications", "Notifications", Bell],
  ["security", "Security & privacy", ShieldCheck],
  ["appearance", "Appearance", Palette],
  ["reviews", "Your reviews", MessageSquare],
] as const;
type Section = (typeof sections)[number][0];
type Dialog = {
  kind:
    | "profile"
    | "address"
    | "remove"
    | "password"
    | "session"
    | "export"
    | "privacy";
  row?: any;
};
export function accountSection(params: Pick<URLSearchParams, "get">): Section {
  if (params.get("testimonialOrder") || params.get("testimonialBooking"))
    return "reviews";
  const value = params.get("section");
  return sections.some(([id]) => id === value) ? (value as Section) : "profile";
}
const date = (value: string) =>
  new Date(value).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  });

function Card({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.card}>
      <header className={styles.cardHeading}>
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
function Row({
  label,
  children,
  action,
}: {
  label: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={styles.row}>
      <div>
        <span className={styles.label}>{label}</span>
        <div className={styles.value}>{children}</div>
      </div>
      {action}
    </div>
  );
}
function Edit({
  onClick,
  label = "Edit",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button className={styles.subtle} onClick={onClick}>
      <Pencil size={14} />
      {label}
    </button>
  );
}
function AccountDialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <Modal title={title} onClose={onClose} className={styles.overlay}>
      {children}
    </Modal>
  );
}

export function AccountSettingsView({
  data,
  section,
  onOpen,
}: {
  data: any;
  section: Section;
  onOpen: (dialog: Dialog) => void;
}) {
  const name = data.user.name || "Your account";
  return (
    <div className={styles.workspace}>
      <header className={styles.heading}>
        <span className={styles.eyebrow}>ACCOUNT SETTINGS</span>
        <h1>Account & privacy</h1>
        <p>Make yourself at home. Manage your details and preferences.</p>
      </header>
      <div className={styles.layout}>
        <nav className={styles.nav} aria-label="Account settings">
          {sections.map(([id, label, Icon]) => (
            <Link
              key={id}
              href={`/account-settings?section=${id}`}
              aria-current={section === id ? "page" : undefined}
              scroll={false}
            >
              <Icon size={18} />
              <span>{label}</span>
              <ChevronRight size={14} />
            </Link>
          ))}
          <p>Your settings, in one place.</p>
        </nav>
        <div className={styles.content}>
          {section === "profile" && (
            <>
              <div className={styles.identity}>
                <span className={styles.avatar}>
                  {name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((s: string) => s[0])
                    .join("")
                    .toUpperCase()}
                </span>
                <div>
                  <h2>{name}</h2>
                  <p>{data.user.email}</p>
                </div>
              </div>
              <Card
                title="Personal information"
                description="The details associated with your EasyGas account."
                action={
                  <Edit
                    label="Edit profile"
                    onClick={() => onOpen({ kind: "profile" })}
                  />
                }
              >
                <Row label="Full name">{name}</Row>
                <Row
                  label="Email address"
                  action={
                    data.user.verified ? (
                      <span className={styles.badge}>
                        <Check size={12} />
                        Verified
                      </span>
                    ) : (
                      <Edit
                        label="Verify email"
                        onClick={() =>
                          onOpen({ kind: "profile", row: "verify" })
                        }
                      />
                    )
                  }
                >
                  {data.user.email}
                </Row>
                <Row label="Delivery phone">
                  {data.user.delivery_phone || data.user.contact_phone || (
                    <span className={styles.muted}>
                      Add a phone number to a delivery address
                    </span>
                  )}
                </Row>
              </Card>
              <Card
                title="Delivery details"
                description="Keep your next delivery simple."
                action={
                  <Link
                    className={styles.subtle}
                    href="/account-settings?section=addresses"
                  >
                    Manage addresses
                    <ChevronRight size={14} />
                  </Link>
                }
              >
                {data.addresses.length ? (
                  (() => {
                    const a =
                      data.addresses.find((a: any) => a.is_default) ??
                      data.addresses[0];
                    return (
                      <Row
                        label={
                          a.is_default
                            ? "Default delivery address"
                            : "Saved address"
                        }
                      >
                        <strong>{a.label}</strong>
                        <p className={styles.muted}>
                          {a.street}, {a.zone}
                        </p>
                      </Row>
                    );
                  })()
                ) : (
                  <p className={styles.emptyInline}>
                    No saved addresses yet. Add one for a faster checkout.
                  </p>
                )}
              </Card>
              {data.user.public_customer_id && (
                <details className={styles.accountDetails}>
                  <summary>Account reference</summary>
                  <p>{data.user.public_customer_id}</p>
                </details>
              )}
            </>
          )}
          {section === "addresses" && (
            <Card
              title="Saved addresses"
              description="Choose where we deliver. You can save up to 20 addresses."
              action={
                <button
                  className={styles.primary}
                  onClick={() => onOpen({ kind: "address" })}
                  disabled={data.addresses.length >= 20}
                >
                  <Plus size={16} />
                  Add address
                </button>
              }
            >
              {data.addresses.length === 0 ? (
                <div className={styles.empty}>
                  <MapPin size={30} />
                  <h3>Your next delivery starts here</h3>
                  <p>Add a home or work address to use at checkout.</p>
                </div>
              ) : (
                <div className={styles.addresses}>
                  {data.addresses.map((a: any) => (
                    <article key={a.id} className={styles.address}>
                      <div className={styles.addressTop}>
                        <MapPin size={19} />
                        <h3>{a.label}</h3>
                        {a.is_default && (
                          <span className={styles.badge}>Default</span>
                        )}
                      </div>
                      <p>{a.street}</p>
                      <p className={styles.muted}>
                        {a.zone} · {a.phone}
                      </p>
                      {!a.location_available && (
                        <p className={styles.warning}>
                          This delivery area is currently unavailable.
                        </p>
                      )}
                      <div className={styles.addressActions}>
                        <Edit
                          onClick={() => onOpen({ kind: "address", row: a })}
                        />
                        <AddressDefault address={a} />
                        <button
                          className={styles.remove}
                          aria-label={`Remove ${a.label}`}
                          onClick={() => onOpen({ kind: "remove", row: a })}
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </Card>
          )}
          {section === "notifications" && (
            <>
              <Preferences preferences={data.preferences} />
              <ChannelSettings />
            </>
          )}
          {section === "security" && (
            <>
              <Card
                title="Password"
                description="Use a unique password to keep your account secure."
                action={
                  <button
                    className={styles.subtle}
                    onClick={() => onOpen({ kind: "password" })}
                  >
                    <KeyRound size={15} />
                    Change password
                  </button>
                }
              >
                <p className={styles.emptyInline}>
                  Changing your password signs you out of all sessions.
                </p>
              </Card>
              <Card
                title="Active sessions"
                description="Review and manage where you’re signed in."
              >
                {data.sessions.map((s: any) => (
                  <div className={styles.session} key={s.id}>
                    <Monitor size={20} />
                    <div>
                      <strong>
                        {s.current
                          ? "This session"
                          : s.label || "Other session"}
                      </strong>
                      {s.current && (
                        <span className={styles.badge}>Current</span>
                      )}
                      <p>Started {date(s.created_at)} · Lagos time</p>
                    </div>
                    <button
                      className={styles.subtle}
                      onClick={() => onOpen({ kind: "session", row: s })}
                    >
                      Sign out
                    </button>
                  </div>
                ))}
              </Card>
              <Card
                title="Your data & privacy"
                description="You’re in control of your personal information."
              >
                <Row label="Personal data">
                  <span>Get a copy of your account and activity.</span>
                </Row>
                <div className={styles.privacyActions}>
                  <button
                    className={styles.subtle}
                    onClick={() => onOpen({ kind: "export" })}
                  >
                    <Download size={15} />
                    Export personal data
                  </button>
                  <button
                    className={styles.subtle}
                    onClick={() => onOpen({ kind: "privacy" })}
                  >
                    Privacy requests
                    <ChevronRight size={14} />
                  </button>
                </div>
                <p className={styles.policy}>
                  EasyGas currently retains all records. Deletion requests are
                  reviewed and recorded; they do not erase your data.
                </p>
                {data.privacyRequests.length > 0 && (
                  <details className={styles.history}>
                    <summary>
                      Request history ({data.privacyRequests.length})
                    </summary>
                    {data.privacyRequests.map((r: any) => (
                      <div key={r.id}>
                        <span>
                          {r.kind === "export"
                            ? "Personal data export"
                            : "Account deletion review"}
                        </span>
                        <span>
                          {r.status} ·{" "}
                          {new Date(r.created_at).toLocaleDateString("en-NG")}
                        </span>
                      </div>
                    ))}
                  </details>
                )}
              </Card>
            </>
          )}
          {section === "appearance" && <ThemeSettings />}
          {section === "reviews" && (
            <CustomerTestimonials dialogClassName={styles.overlay} />
          )}
        </div>
      </div>
    </div>
  );
}
function AddressDefault({ address }: { address: any }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (address.is_default || !address.location_available) return null;
  return (
    <>
      <button
        className={styles.subtle}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await api("address.default", { id: address.id });
          } catch (e: any) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Updating…" : "Set as default"}
      </button>
      {error && <Notice type="error" message={error} />}
    </>
  );
}
function Toggle({
  name,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  name?: string;
  label: string;
  description?: string;
  checked?: boolean;
  disabled?: boolean;
  onChange?: () => void;
}) {
  return (
    <label className={styles.toggleRow}>
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <input
        name={name}
        type="checkbox"
        role="switch"
        aria-label={label}
        defaultChecked={onChange ? undefined : checked}
        checked={onChange ? checked : undefined}
        disabled={disabled}
        onChange={onChange}
      />
    </label>
  );
}
export function Preferences({ preferences: p }: { preferences: any }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await api("preferences.save", {
        marketing: fd.has("marketing"),
        refillReminders: fd.has("refillReminders"),
        serviceReminders: fd.has("serviceReminders"),
        quietStart: Number(fd.get("quietStart")),
        quietEnd: Number(fd.get("quietEnd")),
      });
      setSaved(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card
      title="Communication preferences"
      description="Choose the updates you’d like to receive."
    >
      <form
        key={JSON.stringify(p)}
        onSubmit={save}
        onChange={() => setSaved(false)}
      >
        <Toggle
          name="refillReminders"
          label="Refill reminders"
          description="A timely reminder when it’s time to refill."
          checked={p.refill_reminders}
          disabled={busy}
        />
        <Toggle
          name="serviceReminders"
          label="Service follow-ups"
          description="Reminders after a service or appointment."
          checked={p.service_reminders ?? true}
          disabled={busy}
        />
        <Toggle
          name="marketing"
          label="Offers & news"
          description="Product news and occasional offers. Always optional."
          checked={p.marketing}
          disabled={busy}
        />
        <div className={styles.quiet}>
          <div>
            <strong>Quiet hours</strong>
            <p>Pause routine messages during these hours. Lagos time (WAT).</p>
          </div>
          <div className={styles.times}>
            {[
              ["quietStart", "From", p.quiet_start],
              ["quietEnd", "Until", p.quiet_end],
            ].map(([name, label, value]) => (
              <label key={name}>
                {label}
                <select name={name} defaultValue={value} disabled={busy}>
                  {Array.from({ length: 24 }, (_, n) => (
                    <option key={n} value={n}>
                      {String(n).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
        <div className={styles.formFooter}>
          {error && <Notice type="error" message={error} />}
          {saved && (
            <span role="status" className={styles.saved}>
              <Check size={14} />
              Preferences saved
            </span>
          )}
          <button className={styles.primary} disabled={busy}>
            {busy ? "Saving…" : "Save preferences"}
          </button>
        </div>
      </form>
    </Card>
  );
}
function ChannelSettings() {
  const { data, error, retry } = useCustomerResource(
    "channels.preferences",
    "account-channel-consents",
  );
  const [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState("");
  const pending = useRef<{ fingerprint: string; key: string } | null>(null);
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  useEffect(() => setConfirmed({}), [data]);
  return (
    <Card
      title="SMS & WhatsApp"
      description="Manage permission for each channel. Turning a purpose off cancels its pending messages."
    >
      {error && (
        <>
          <Notice type="error" message={error} />
          <button className={styles.subtle} onClick={retry}>
            Retry channel preferences
          </button>
        </>
      )}
      {actionError && <Notice type="error" message={actionError} />}
      {!data && !error && <Loading label="Loading channel preferences" />}
      {data &&
        ["sms", "whatsapp"].map((channel) => (
          <details className={styles.channel} key={channel}>
            <summary>
              {channel === "sms" ? "SMS" : "WhatsApp"}
              <span>Manage permissions</span>
            </summary>
            <div>
              {[
                ["transactional", "Order & delivery updates"],
                ["otp", "Verification codes"],
                ["refill", "Refill reminders"],
                ["marketing", "Offers & news"],
              ].map(([purpose, label]) => (
                <Toggle
                  key={purpose}
                  label={`${label} on ${channel === "sms" ? "SMS" : "WhatsApp"}`}
                  checked={
                    confirmed[`${channel}:${purpose}`] ??
                    data.consents.some(
                      (c: any) =>
                        c.channel === channel &&
                        c.purpose === purpose &&
                        c.enabled,
                    )
                  }
                  disabled={busy}
                  onChange={async () => {
                    setBusy(true);
                    setActionError("");
                    try {
                      const c = data.consents.find(
                        (c: any) =>
                          c.channel === channel && c.purpose === purpose,
                      );
                      const request = {
                        channel,
                        purpose,
                        enabled: !(
                          confirmed[`${channel}:${purpose}`] ??
                          c?.enabled ??
                          false
                        ),
                        evidence:
                          "Customer changed consent in account settings",
                      };
                      const fingerprint = JSON.stringify(request);
                      if (pending.current?.fingerprint !== fingerprint)
                        pending.current = {
                          fingerprint,
                          key: crypto.randomUUID(),
                        };
                      await api("channels.consent", {
                        ...request,
                        operationKey: pending.current!.key,
                      });
                      pending.current = null;
                      setConfirmed((previous) => ({
                        ...previous,
                        [`${channel}:${purpose}`]: request.enabled,
                      }));
                      retry();
                    } catch (e: any) {
                      setActionError(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              ))}
            </div>
          </details>
        ))}
    </Card>
  );
}

function PrivacyDialog({
  kind,
  done,
}: {
  kind: "export" | "privacy";
  done: () => void;
}) {
  const [verified, setVerified] = useState(false);
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (verified)
      content.current
        ?.querySelector<HTMLElement>("input,select,textarea,button")
        ?.focus();
  }, [verified]);
  return (
    <div ref={content}>
      {!verified ? (
        <>
          <p className={styles.dialogIntro}>
            Confirm your password to access your personal data and privacy
            requests.
          </p>
          <ActionForm
            contextual
            title="Verify your identity"
            action="reauth"
            fields={[
              {
                name: "password",
                label: "Current password",
                type: "password",
                autoComplete: "current-password",
              },
            ]}
            submit="Verify identity"
            onDone={() => setVerified(true)}
          />
        </>
      ) : kind === "export" ? (
        <>
          <p className={styles.dialogIntro}>
            Your download includes your profile, orders, saved addresses and
            consent history. Keep the file somewhere private.
          </p>
          <DownloadPersonalData />
        </>
      ) : (
        <>
          <p className={styles.policy}>
            EasyGas retains all records. A deletion review records your request;
            it does not erase your account or activity. You can export your data
            at any time.
          </p>
          <ActionForm
            contextual
            action="privacy.request"
            title="Privacy request"
            fields={[
              {
                name: "kind",
                label: "Request type",
                options: [
                  { value: "export", label: "Request a personal data export" },
                  {
                    value: "deletion",
                    label: "Review account deletion (records retained)",
                  },
                ],
              },
              {
                name: "reason",
                label: "How can we help?",
                type: "textarea",
                minLength: 5,
                maxLength: 1000,
              },
            ]}
            submit="Submit request"
            onDone={done}
          />
        </>
      )}
    </div>
  );
}
export function CustomerAccount({ identity }: { identity: string }) {
  const params = useSearchParams(),
    router = useRouter(),
    section = accountSection(params);
  useEffect(() => {
    if (
      window.location.hash === "#testimonials" &&
      !params.get("section") &&
      !params.get("testimonialOrder") &&
      !params.get("testimonialBooking")
    )
      router.replace("/account-settings?section=reviews#testimonials", {
        scroll: false,
      });
  }, [params, router]);
  const { data, error, retry } = useCustomerResource(
    "account.profile",
    identity,
  );
  const [dialog, setDialog] = useState<Dialog | null>(null);
  if (error)
    return (
      <div className={styles.workspace}>
        <Notice type="error" message={error} />
        <button className={styles.primary} onClick={retry}>
          Retry account settings
        </button>
      </div>
    );
  if (!data) return <Loading label="Loading account settings" />;
  const done = () => {
    setDialog(null);
    retry();
  };
  const titles: Record<Dialog["kind"], string> = {
    profile: dialog?.row === "verify" ? "Verify email address" : "Edit profile",
    address: dialog?.row ? "Edit delivery address" : "Add delivery address",
    remove: "Remove saved address?",
    password: "Change password",
    session: "Sign out of this session?",
    export: "Export personal data",
    privacy: "Privacy requests",
  };
  return (
    <>
      <AccountSettingsView data={data} section={section} onOpen={setDialog} />
      {dialog && (
        <AccountDialog
          key={`${dialog.kind}:${dialog.row?.id ?? ""}`}
          title={titles[dialog.kind]}
          onClose={() => setDialog(null)}
        >
          {dialog.kind === "profile" &&
            (dialog.row === "verify" ? (
              <>
                <p className={styles.dialogIntro}>
                  Request a verification link for {data.user.email}.
                </p>
                <ActionForm
                  contextual
                  title="Verify email"
                  action="account.verification.send"
                  fields={[]}
                  submit="Request verification email"
                />
              </>
            ) : (
              <ActionForm
                contextual
                title="Edit profile"
                action="account.update"
                fields={[
                  {
                    name: "name",
                    label: "Full name",
                    value: data.user.name,
                    minLength: 2,
                    maxLength: 100,
                    autoComplete: "name",
                  },
                ]}
                submit="Save changes"
                onDone={done}
              />
            ))}
          {dialog.kind === "address" && (
            <div className={styles.addressForm}>
              <ActionForm
                contextual
                title={titles.address}
                action="address.save"
                fields={[
                  ...(dialog.row
                    ? [
                        {
                          name: "id",
                          label: "",
                          type: "hidden",
                          value: dialog.row.id,
                        },
                      ]
                    : []),
                  {
                    name: "label",
                    label: "Address label",
                    value: dialog.row?.label,
                    minLength: 2,
                    maxLength: 40,
                  },
                  {
                    name: "street",
                    label: "Complete house address",
                    value: dialog.row?.street,
                  },
                  {
                    name: "locationId",
                    label: "Delivery location",
                    value: dialog.row?.location_id,
                    options: data.deliveryLocations.map((l: any) => ({
                      value: l.id,
                      label: l.name,
                    })),
                  },
                  {
                    name: "phone",
                    label: "Recipient phone",
                    type: "tel",
                    value:
                      dialog.row?.phone ??
                      data.user.delivery_phone ??
                      data.user.contact_phone,
                    autoComplete: "tel",
                  },
                  {
                    name: "recipient",
                    label: "Recipient name",
                    value: dialog.row?.details?.recipient ?? data.user.name,
                    required: false,
                    maxLength: 100,
                  },
                  {
                    name: "building",
                    label: "Building / house number",
                    value: dialog.row?.details?.building,
                    maxLength: 100,
                  },
                  {
                    name: "landmark",
                    label: "Estate / landmark",
                    value: dialog.row?.details?.landmark,
                    required: false,
                    maxLength: 250,
                  },
                  {
                    name: "directions",
                    label: "Additional directions",
                    value: dialog.row?.details?.directions,
                    required: false,
                    maxLength: 500,
                  },
                  ...(dialog.row?.is_default
                    ? []
                    : [
                        {
                          name: "isDefault",
                          label: "Use as default address",
                          type: "checkbox",
                          value: data.addresses.length === 0,
                        },
                      ]),
                ]}
                submit="Save address"
                onDone={done}
              />
            </div>
          )}
          {dialog.kind === "remove" && (
            <>
              <p className={styles.dialogIntro}>
                Remove <strong>{dialog.row.label}</strong> from your saved
                addresses? Your past orders will keep their delivery details.
              </p>
              <ActionForm
                contextual
                title="Remove address"
                action="address.archive"
                fields={[
                  {
                    name: "id",
                    label: "",
                    type: "hidden",
                    value: dialog.row.id,
                  },
                ]}
                submit="Remove address"
                onDone={done}
              />
            </>
          )}
          {dialog.kind === "password" && (
            <>
              <p className={styles.dialogIntro}>
                Choose a password with at least {PASSWORD_MIN_LENGTH}{" "}
                characters. You’ll sign in again after saving.
              </p>
              <ActionForm
                contextual
                title="Change password"
                action="account.password"
                fields={[
                  {
                    name: "currentPassword",
                    label: "Current password",
                    type: "password",
                    autoComplete: "current-password",
                  },
                  {
                    name: "newPassword",
                    label: "New password",
                    type: "password",
                    autoComplete: "new-password",
                  },
                ]}
                submit="Change password & sign out"
              />
            </>
          )}
          {dialog.kind === "session" && (
            <>
              <p className={styles.dialogIntro}>
                {dialog.row.current
                  ? "This will sign you out on this browser."
                  : "This will end the selected session. Your current session will stay signed in."}
              </p>
              <ActionForm
                contextual
                title="Sign out session"
                action="account.session.revoke"
                fields={[
                  {
                    name: "id",
                    label: "",
                    type: "hidden",
                    value: dialog.row.id,
                  },
                ]}
                submit="Sign out"
                onDone={done}
              />
            </>
          )}
          {(dialog.kind === "export" || dialog.kind === "privacy") && (
            <PrivacyDialog kind={dialog.kind} done={retry} />
          )}
        </AccountDialog>
      )}
    </>
  );
}

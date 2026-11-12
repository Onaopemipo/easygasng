"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  CalendarDays,
  ArrowRight,
  ChartNoAxesColumnIncreasing,
  Clock3,
  Cylinder,
  Gift,
  Lightbulb,
  Plus,
  Tag,
  TrendingUp,
} from "lucide-react";
import {
  lagosRefillDate,
  loadCookingGasProfiles,
  noSmartRefillOffers,
  refillProfileActivity,
  refillSaveError,
  smartRefillExplanation,
  supplyOptions,
  type CookingGasProfilesData,
  type RefillProfile,
  type SupplyReport,
  type SupplyState,
} from "../../../packages/business-rules/src/cooking-gas-profiles";
import { ActionForm } from "./workflows";
import Link from "./workspace-link";
import { api, Loading, Modal, Notice } from "./ui";
import styles from "./refill-profiles.module.css";

export function RefillProfiles({ smart = false }: { smart?: boolean } = {}) {
  const [data, setData] = useState<CookingGasProfilesData | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(true);
  const [creating, setCreating] = useState(false);
  const request = useRef<AbortController | null>(null);

  async function reload() {
    request.current?.abort();
    if (!navigator.onLine) {
      setError("You’re offline. Reconnect to refresh your profiles.");
      setRefreshing(false);
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setRefreshing(true);
    try {
      const next = await loadCookingGasProfiles(
        (action) => api(action, undefined, { signal: controller.signal }),
        { includeRecurring: !smart },
      );
      if (controller.signal.aborted) return;
      setData(next);
      setError("");
    } catch (cause) {
      if (controller.signal.aborted) return;
      const { status } = cause as { status?: number };
      if (status === 401 || status === 403) {
        setData(null);
        setCreating(false);
      }
      setError(
        status === 401
          ? "Sign in to view your profiles."
          : status === 403
            ? "This account can’t access Cooking Gas Profiles."
            : smart
              ? "Couldn’t refresh Smart Refill."
              : "Couldn’t refresh Cooking Gas Profiles.",
      );
    } finally {
      if (!controller.signal.aborted) setRefreshing(false);
    }
  }

  useEffect(() => {
    void reload();
    const offline = () => {
      request.current?.abort();
      setError("You’re offline. Reconnect to refresh your profiles.");
      setRefreshing(false);
    };
    window.addEventListener("focus", reload);
    window.addEventListener("online", reload);
    window.addEventListener("offline", offline);
    return () => {
      request.current?.abort();
      window.removeEventListener("focus", reload);
      window.removeEventListener("online", reload);
      window.removeEventListener("offline", offline);
    };
  }, [smart]);

  const metrics = data
    ? smart
      ? [
          {
            label: "Active gas profiles",
            value: data.profiles.filter((profile) => profile.active).length,
            Icon: Cylinder,
          },
          { label: "Smart offers", value: data.offers?.length, Icon: Gift },
          {
            label: "Refill estimates",
            value: data.profiles.some(
              (profile) => profile.active && profile.forecast.available,
            )
              ? "Available"
              : "Unavailable",
            Icon: TrendingUp,
          },
        ]
      : [
          {
            label: "Active profiles",
            value: data.profiles.filter((profile) => profile.active).length,
            Icon: ChartNoAxesColumnIncreasing,
          },
          {
            label: "Recurring refills",
            value: data.recurringCount,
            Icon: CalendarDays,
          },
          {
            label: "Smart Refill offers",
            value: data.offers?.length,
            Icon: Tag,
          },
        ]
    : [];
  return (
    <div className={`${styles.workspace} ${smart ? styles.smart : ""}`}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>YOUR KITCHEN</p>
          <h1>{smart ? "Smart Refill" : "Cooking gas profiles"}</h1>
          <p>
            {smart
              ? "Track your refill profiles and view estimates based on verified deliveries."
              : "Manage refill profiles and review estimates based on your verified deliveries."}
          </p>
        </div>
        <img
          src="/assets/cylinder-illustration.png"
          alt=""
          width={112}
          height={126}
        />
      </header>
      {error && (
        <div className={styles.refresh}>
          <Notice
            type="error"
            message={
              data
                ? `${error} Last confirmed ${lagosRefillDate(data.refreshedAt, true)}.`
                : error
            }
          />
          <button
            type="button"
            className="button secondary"
            disabled={refreshing}
            onClick={reload}
          >
            Retry
          </button>
        </div>
      )}
      {!data && refreshing && <Loading />}
      {data && (
        <>
          <section className={styles.metrics} aria-label="Profile summary">
            {metrics.map(({ label, value, Icon }) => (
              <div className={styles.card} key={label}>
                <span className={styles.icon}>
                  <Icon aria-hidden="true" size={24} />
                </span>
                <div>
                  <strong>{value ?? "Unavailable"}</strong>
                  <span>{label}</span>
                </div>
              </div>
            ))}
            <button
              type="button"
              className={smart ? "button" : "button secondary"}
              onClick={() => setCreating(true)}
              disabled={refreshing || !!error || !data.products?.length}
            >
              <Plus size={19} aria-hidden="true" /> Add consumption profile
            </button>
          </section>
          {!data.products?.length && (
            <p role="status">
              {data.products
                ? "There are no refill sizes available to add."
                : "Refill sizes are unavailable. Refresh the page to try again."}
            </p>
          )}
          <section className={`${styles.card} ${styles.offers}`}>
            <span className={styles.icon}>
              <Gift aria-hidden="true" size={25} />
            </span>
            <div>
              <h2>Smart Refill offers</h2>
              {!data.offers ? (
                <p>Smart Refill offers are unavailable.</p>
              ) : data.offers.length && !error ? (
                <ul>
                  {data.offers.map((offer) => (
                    <li key={offer.id}>
                      <Link href="/rewards">
                        {offer.title} · {offer.points} points
                      </Link>{" "}
                      · expires {lagosRefillDate(offer.expiresAt)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  {error
                    ? "Refresh to check current offer eligibility."
                    : noSmartRefillOffers}
                </p>
              )}
            </div>
            {smart ? (
              <details className={styles.offerHelp}>
                <summary>Learn more</summary>
                <p>{smartRefillExplanation}</p>
                <p>
                  Offers depend on your eligible profile and communication
                  preferences.
                </p>
              </details>
            ) : (
              <Link className="button secondary" href="/refill">
                Learn more
              </Link>
            )}
          </section>
          {!data.profiles.length && (
            <section className={styles.card}>
              <h2>No cooking gas profiles yet</h2>
              <p>
                Add a profile to track your gas supply and review estimates as
                verified refills become available.
              </p>
            </section>
          )}
          {data.profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              reload={reload}
              disabled={refreshing || !!error}
              refreshedAt={data.refreshedAt}
              smart={smart}
            />
          ))}
          {smart && (
            <div className={styles.smartLinks}>
              <Link href="/account-settings">Manage reminder preferences</Link>
              <Link href="/gas-order">
                Order gas <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </div>
          )}
          {creating && data.products && (
            <Modal
              title="Add consumption profile"
              onClose={() => setCreating(false)}
              className={styles.sheet}
            >
              <fieldset
                disabled={refreshing || !!error}
                className={styles.formFields}
              >
                {error && (
                  <p role="status">
                    Reconnect and refresh before adding a profile.
                  </p>
                )}
                <ActionForm
                  action="refill.profile.create"
                  title="Add consumption profile"
                  contextual
                  submit="Add profile"
                  fields={[
                    {
                      name: "label",
                      label: "Profile name",
                      minLength: 2,
                      maxLength: 80,
                    },
                    {
                      name: "productId",
                      label: "Refill size",
                      options: data.products.map((product) => ({
                        value: product.id,
                        label: product.name,
                      })),
                    },
                    {
                      name: "householdSize",
                      label: "People served",
                      type: "number",
                      value: 1,
                      min: 1,
                      max: 1000,
                      step: "1",
                    },
                    {
                      name: "cookingDays",
                      label: "Cooking days per week",
                      type: "number",
                      value: 7,
                      min: 1,
                      max: 7,
                      step: "1",
                    },
                  ]}
                  onDone={() => {
                    setCreating(false);
                    void reload();
                  }}
                />
              </fieldset>
            </Modal>
          )}
        </>
      )}
    </div>
  );
}

function ProfileCard({
  profile,
  reload,
  disabled,
  refreshedAt,
  smart,
}: {
  profile: RefillProfile;
  reload: () => Promise<void>;
  disabled: boolean;
  refreshedAt: string;
  smart: boolean;
}) {
  const report = profile.feedback[0];
  const [draft, setDraft] = useState<{
    state: SupplyState;
    base: string | null;
  } | null>(null);
  const [confirmed, setConfirmed] = useState<SupplyReport | null>(null);
  const [message, setMessage] = useState("");
  const [problem, setProblem] = useState("");
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const saved =
    confirmed &&
    (!report ||
      Date.parse(confirmed.created_at) > Date.parse(report.created_at))
      ? confirmed
      : report;
  const base = saved?.id ?? null;
  const choice = draft?.state ?? saved?.state ?? "";
  const conflict = !!draft && draft.base !== base;

  async function save(event: FormEvent) {
    event.preventDefault();
    if (
      !draft ||
      pending.current ||
      disabled ||
      conflict ||
      draft.state === saved?.state
    )
      return;
    pending.current = true;
    setSaving(true);
    setProblem("");
    setMessage("");
    try {
      const result = await api("refill.feedback", {
        profileId: profile.id,
        state: draft.state,
        expectedFeedbackId: draft.base,
      });
      setConfirmed(result.feedback);
      setDraft(null);
      setMessage("Gas supply updated.");
      await reload();
    } catch (cause) {
      setProblem(refillSaveError(cause));
      await reload();
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  const forecast = profile.forecast;
  const updated = (
    <p className={styles.updated}>
      <CalendarDays size={16} aria-hidden="true" />{" "}
      {saved ? "Last supply update" : "Profile added"} ·{" "}
      {lagosRefillDate(saved?.created_at ?? profile.created_at, true)}
    </p>
  );
  return (
    <>
      <article className={`${styles.card} ${styles.profile}`}>
        <header className={styles.profileHeader}>
          <span className={styles.icon}>
            <img
              src="/assets/cylinder-illustration.png"
              alt=""
              width={42}
              height={50}
            />
          </span>
          <div>
            <h2>
              {profile.label} · {profile.product_name}
            </h2>
            {profile.capacityKg != null && (
              <p>{profile.capacityKg} kg cylinder capacity</p>
            )}
            <p>
              {forecast.available
                ? `Estimated ${forecast.estimatedPercent}% remaining · ${forecast.daysLeft} days`
                : forecast.reason || "Refill estimate unavailable."}
            </p>
          </div>
          <span className={styles.badge}>
            {!profile.active
              ? "Inactive"
              : forecast.available
                ? "Estimate available"
                : "Estimate unavailable"}
          </span>
        </header>
        {forecast.available && (
          <p>
            Estimated refill {lagosRefillDate(forecast.nextDate)} ·{" "}
            {forecast.confidence} confidence · Checked{" "}
            {lagosRefillDate(refreshedAt, true)}
          </p>
        )}
        {profile.active && (
          <form className={styles.editor} onSubmit={save}>
            <div>
              {!smart && <h3>Tell us how much gas is left</h3>}
              <label>
                Current supply
                <select
                  value={choice}
                  disabled={saving || disabled}
                  onChange={(event) => {
                    const state = event.target.value as SupplyState;
                    setDraft(
                      state && state !== saved?.state ? { state, base } : null,
                    );
                    setProblem("");
                    setMessage("");
                  }}
                >
                  <option value="" disabled>
                    Choose current supply…
                  </option>
                  {supplyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <aside className={styles.tips}>
              <h3>
                <Lightbulb size={21} aria-hidden="true" /> Quick tips
              </h3>
              <p>Current supply is your own report.</p>
              <p>
                Estimates use verified single-cylinder deliveries. They aren’t
                sensor readings.
              </p>
            </aside>
            <div className={styles.editorFooter}>
              {problem && <Notice type="error" message={problem} />}
              {!problem && conflict && (
                <Notice
                  type="error"
                  message="The saved supply has changed. Reset to review the latest report."
                />
              )}
              {message && <Notice type="success" message={message} />}
              <div className={styles.editorActions}>
                {smart && updated}
                {draft && !conflict && <small>Unsaved changes</small>}
                <button
                  type="button"
                  className="button secondary"
                  disabled={!draft || saving}
                  onClick={() => {
                    setDraft(null);
                    setProblem("");
                    setMessage("");
                  }}
                >
                  Reset
                </button>
                <button
                  type="submit"
                  className="button"
                  disabled={!draft || saving || conflict || disabled}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </form>
        )}
        {profile.reminderState?.reason && (
          <p role="status">
            {profile.reminderState.reason}
            {profile.reminderState.until &&
              ` Until ${lagosRefillDate(profile.reminderState.until, true)}.`}
          </p>
        )}
        {(!smart || !profile.active) && updated}
        {profile.lastVerifiedRefill && (
          <p>
            Last verified refill ·{" "}
            {lagosRefillDate(profile.lastVerifiedRefill.date)} ·{" "}
            {profile.lastVerifiedRefill.kg} kg
            {profile.typicalIntervalDays
              ? ` · Typical interval ${profile.typicalIntervalDays} days`
              : ""}
          </p>
        )}
        {!smart && profile.history.length > 0 && (
          <details>
            <summary>Verified refill history</summary>
            <ul>
              {profile.history.map((entry) => (
                <li key={entry.orderId}>
                  {lagosRefillDate(entry.date)} · {entry.kg} kg ·{" "}
                  <Link href="/orders">View orders</Link>
                </li>
              ))}
            </ul>
          </details>
        )}
        {!smart && profile.feedback.length > 1 && (
          <details>
            <summary>Past supply reports</summary>
            <ul>
              {profile.feedback.map((entry) => (
                <li key={entry.id}>
                  {
                    supplyOptions.find(({ value }) => value === entry.state)
                      ?.label
                  }{" "}
                  · {lagosRefillDate(entry.created_at, true)}
                </li>
              ))}
            </ul>
          </details>
        )}
      </article>
      {smart && (profile.feedback.length > 0 || profile.history.length > 0) && (
        <details className={`${styles.card} ${styles.activity}`}>
          <summary aria-label={`View history for ${profile.label}`}>
            <Clock3 aria-hidden="true" />
            <span>
              <strong>Profile activity</strong>
              <small>
                {profile.label} · Supply reports and verified refills
              </small>
            </span>
            <span className={styles.activityAction}>
              View history <ArrowRight aria-hidden="true" size={18} />
            </span>
          </summary>
          <ul>
            {refillProfileActivity(profile).map((entry) => (
              <li key={entry.id}>
                <strong>{entry.label}</strong>
                <time dateTime={entry.date}>
                  {lagosRefillDate(entry.date, true)}
                </time>
                {"orderId" in entry && (
                  <Link
                    href={`/orders?orderId=${encodeURIComponent(entry.orderId)}`}
                  >
                    View order
                  </Link>
                )}
              </li>
            ))}
          </ul>
          {profile.feedback.length === 10 && (
            <p>Showing the latest 10 supply reports.</p>
          )}
        </details>
      )}
    </>
  );
}

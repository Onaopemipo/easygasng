"use client";
import { friendlyMessage } from "../../../packages/business-rules/src/friendly-message";

import { requestText } from "./app-dialog";
import { useEffect, useState, useRef } from "react";
import Link from "./workspace-link";
import { api, Loading, Modal, Notice } from "./ui";
import {
  ArrowUpRight,
  BadgeCheck,
  CircleCheck,
  CircleMinus,
  Clock,
  Coins,
  Gift,
  Info,
  Layers,
  Trophy,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { gasMoney } from "../../../packages/business-rules/src/gas-pricing";
import { lagosDay } from "../../../packages/business-rules/src/customer-mobile";
import {
  canSelectReward,
  formatRewardCount,
  rewardCapabilities,
  rewardDelta,
  rewardEntryTitle,
  rewardDateTime,
  type RewardsSummary,
} from "../../../packages/business-rules/src/rewards-overview";

export function EasyRewards() {
  const [data, setData] = useState<RewardsSummary | null>(null);
  const [checkedAt, setCheckedAt] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [visible, setVisible] = useState(6);
  const [referring, setReferring] = useState(false);
  const retry = () => setRevision((value) => value + 1);

  useEffect(() => {
    if (!navigator.onLine) {
      setError("You’re offline. Reconnect to refresh your rewards.");
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    api("rewards.summary", undefined, { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
        setCheckedAt(new Date().toISOString());
        setError("");
      })
      .catch((failure) => {
        if (controller.signal.aborted) return;
        if ([401, 403].includes(failure.status)) setData(null);
        setReferring(false);
        setError(
          failure.status === 401
            ? "Sign in to view your rewards."
            : failure.status === 403
              ? "This account can’t view EasyRewards."
              : failure.status
                ? failure.message
                : "Couldn’t connect to EasyRewards. Check your connection and try again.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    const offline = () => {
      setError("You’re offline. Reconnect to refresh your rewards.");
      setReferring(false);
      retry();
    };
    window.addEventListener("offline", offline);
    window.addEventListener("online", retry);
    window.addEventListener("focus", retry);
    return () => {
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", retry);
      window.removeEventListener("focus", retry);
    };
  }, []);

  const capabilities = data ? rewardCapabilities(data) : null;
  const canAct = !error && !loading;
  return (
    <div className="easyrewards-workspace">
      <header className="easyrewards-hero">
        <div>
          <p className="easyrewards-eyebrow">YOUR EASYGAS</p>
          <h1>EasyRewards</h1>
          <p>
            {capabilities?.earning
              ? "Earn points on eligible purchases and see your rewards activity."
              : "View your points, programme status and rewards activity."}
          </p>
        </div>
        <span className="easyrewards-hero-icon" aria-hidden="true">
          <Gift size={68} strokeWidth={1.5} />
        </span>
      </header>
      {error && (
        <div className="easyrewards-recovery">
          <Notice
            type="error"
            message={
              data
                ? `${error} Last checked ${rewardDateTime(checkedAt)}.`
                : error
            }
          />
          <button
            type="button"
            className="button secondary"
            disabled={loading}
            onClick={retry}
          >
            Retry rewards
          </button>
        </div>
      )}
      {!data && loading && <Loading />}
      {data && capabilities && (
        <>
          <section
            className="easyrewards-card easyrewards-summary"
            aria-label="Rewards overview"
          >
            <div className="easyrewards-balance">
              <span className="easyrewards-balance-icon">
                <BadgeCheck size={35} aria-hidden="true" />
              </span>
              <div>
                <h2>Your EasyGas points</h2>
                <strong className="easyrewards-points">
                  {formatRewardCount(data.availablePoints)}
                </strong>
                <p>Available points · separate from purchase credit</p>
                <p className="easyrewards-pending">
                  <Clock size={15} aria-hidden="true" /> Pending award events ·{" "}
                  {formatRewardCount(data.pendingAwards)}
                </p>
              </div>
            </div>
            <div className="easyrewards-capabilities">
              <div>
                <Coins aria-hidden="true" />
                <strong>Earn points</strong>
                <span>
                  {capabilities.earning
                    ? "Eligible verified purchases"
                    : "Currently disabled"}
                </span>
              </div>
              <div>
                <Gift aria-hidden="true" />
                <strong>Redeem rewards</strong>
                {canAct &&
                data.policy &&
                canSelectReward(data, data.policy.minimumPoints) ? (
                  <Link href="/products">Shop eligible products</Link>
                ) : (
                  <span>
                    {!canAct
                      ? "Refresh to check availability"
                      : capabilities.redemption
                        ? formatRewardCount(data.availablePoints) ===
                          "Unavailable"
                          ? "Points balance unavailable"
                          : "Minimum points required"
                        : "Currently unavailable"}
                  </span>
                )}
              </div>
              <div>
                <UsersRound aria-hidden="true" />
                <strong>Refer &amp; earn</strong>
                {canAct && capabilities.referral ? (
                  <button
                    type="button"
                    className="easyrewards-text-button"
                    onClick={() => setReferring(true)}
                  >
                    Manage referrals
                  </button>
                ) : (
                  <span>
                    {capabilities.referral
                      ? "Refresh to check availability"
                      : "Currently disabled"}
                  </span>
                )}
              </div>
            </div>
          </section>
          {data.restricted && (
            <Notice
              type="error"
              message="Your points need finance review following a reversal. Further spending is restricted. Contact support."
            />
          )}
          <div className="easyrewards-columns">
            <section
              className="easyrewards-card"
              aria-labelledby="easyrewards-programme"
            >
              <h2
                id="easyrewards-programme"
                className="easyrewards-section-title"
              >
                <Layers aria-hidden="true" /> Your programme
              </h2>
              <ul className="easyrewards-status-list">
                <li>
                  {capabilities.earning && data.policy ? (
                    <>
                      <CircleCheck aria-hidden="true" /> One point per{" "}
                      {gasMoney(data.policy.spendPerPointKobo)} of eligible
                      verified, completed purchases.
                    </>
                  ) : (
                    <>
                      <CircleMinus aria-hidden="true" /> Reward earning is
                      currently disabled. Your existing history is available.
                    </>
                  )}
                </li>
                <li>
                  {capabilities.redemption && data.policy ? (
                    <>
                      <CircleCheck aria-hidden="true" /> Redeem from{" "}
                      {data.policy.minimumPoints} points, up to{" "}
                      {data.policy.maximumDiscountBps / 100}% of eligible
                      product spend. Delivery fees are excluded.
                    </>
                  ) : (
                    <>
                      <CircleMinus aria-hidden="true" /> Checkout reward
                      discounts are currently unavailable.
                    </>
                  )}
                </li>
                <li>
                  <Info aria-hidden="true" /> Pending awards appear in your
                  balance after posting.
                </li>
              </ul>
              <details className="easyrewards-policy">
                <summary>Programme details</summary>
                <p>
                  {data.policy
                    ? `Approved policy version ${data.policy.version}. Eligible categories: ${data.policy.eligibleCategories.join(", ") || "None configured"}.`
                    : "No EasyRewards policy has been independently approved."}
                </p>
                <p>
                  No active expiry or tiers.{" "}
                  {capabilities.referral
                    ? "Referral rewards require a first verified, fulfilled purchase."
                    : "Referral bonuses are currently disabled."}
                </p>
              </details>
            </section>
            <section className="easyrewards-card">
              <h2 className="easyrewards-section-title">
                <Trophy aria-hidden="true" /> Rewards &amp; referrals
              </h2>
              {!canAct ? (
                <p>Refresh to check current offers.</p>
              ) : data.catalogue.length ? (
                <ul className="easyrewards-offers">
                  {data.catalogue.map((offer) => (
                    <li key={offer.id}>
                      <h3>{offer.title}</h3>
                      <p>{offer.description}</p>
                      <p>
                        {formatRewardCount(offer.points)} points · Expires{" "}
                        {lagosDay(offer.expiresAt)}
                      </p>
                      {canSelectReward(data, offer.points) ? (
                        <Link
                          className="button secondary"
                          href="/products"
                          onClick={() => {
                            try {
                              sessionStorage.setItem(
                                `easygas.rewardOffer.${data.customerId}`,
                                offer.id,
                              );
                            } catch {}
                          }}
                        >
                          Choose products for this offer
                        </Link>
                      ) : (
                        <small>
                          {capabilities.redemption
                            ? "More points are required to use this offer."
                            : "Offer redemption is currently unavailable."}
                        </small>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="easyrewards-no-offers">
                  <p>
                    No approved offers are available for your current account.
                  </p>
                  <Gift size={33} aria-hidden="true" />
                </div>
              )}
              {!capabilities.referral && (
                <p>Referral bonuses are currently disabled.</p>
              )}
              <Link className="easyrewards-help" href="/support">
                Ask about your points{" "}
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </section>
          </div>
          <section
            className="easyrewards-card easyrewards-history"
            aria-labelledby="easyrewards-history"
          >
            <header>
              <h2
                id="easyrewards-history"
                className="easyrewards-section-title"
              >
                <Clock aria-hidden="true" /> Points history
              </h2>
              <p>Your points transactions and updates.</p>
            </header>
            {data.entries.length ? (
              <>
                <ul className="easyrewards-entries">
                  {data.entries.slice(0, visible).map((entry) => (
                    <li key={entry.id}>
                      <div>
                        <strong>{rewardEntryTitle(entry.kind)}</strong>
                        <p>
                          <time dateTime={entry.created_at}>
                            {rewardDateTime(entry.created_at)}
                          </time>
                        </p>
                        {entry.order_id && (
                          <Link
                            href={`/orders?orderId=${encodeURIComponent(entry.order_id)}`}
                          >
                            {entry.order_reference ?? "View order"}
                          </Link>
                        )}
                        {entry.booking_id && (
                          <Link
                            href={`/bookings?bookingId=${encodeURIComponent(entry.booking_id)}`}
                          >
                            {entry.booking_reference ?? "View service booking"}
                          </Link>
                        )}
                      </div>
                      <strong>{rewardDelta(entry.points)}</strong>
                    </li>
                  ))}
                </ul>
                <div className="easyrewards-history-footer">
                  {data.entries.length === data.historyLimit && (
                    <p>
                      History shows the most recent {data.historyLimit} entries.{" "}
                      <Link href="/support">
                        Contact support for an older statement.
                      </Link>
                    </p>
                  )}
                  {visible < data.entries.length && (
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => setVisible((count) => count + 20)}
                    >
                      Show older entries
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="easyrewards-empty">
                <span>
                  <WalletCards size={28} aria-hidden="true" />
                </span>
                <h3>No points transactions yet</h3>
                <p>Your points activity will appear here after it posts.</p>
              </div>
            )}
          </section>
          {referring && !error && capabilities.referral && (
            <Modal
              title="Manage referrals"
              className="easyrewards-sheet"
              onClose={() => setReferring(false)}
            >
              <ReferralPanel refreshing={loading} />
            </Modal>
          )}
        </>
      )}
    </div>
  );
}

export function EasyRewardsReport() {
  const lifecycle = useRef<AbortController | null>(null);
  useEffect(() => {
    lifecycle.current = new AbortController();
    return () => lifecycle.current?.abort();
  }, []);
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    api("rewards.report")
      .then((r) => {
        if (active) setData(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [revision]);
  return (
    <section className="surface workflow-form">
      <h2>EasyRewards reconciliation</h2>
      {data && (
        <>
          <h3>Offer budgets</h3>
          {data.offers?.map((o: any) => (
            <p key={o.id}>
              {o.title}: {o.budgetKobo} kobo approved budget ·{" "}
              {data.offerSpending
                ?.filter((r: any) => r.offer_id === o.id)
                .map((r: any) => `${r.spent_kobo} committed (${r.claims} uses)`)
                .join("; ") || "No committed claims"}
            </p>
          ))}
          <h3>Referral risk review</h3>
          <p>
            Use Business Settings → Referral risk review for independently
            approved hold, clear or block decisions. Customer identity is
            restricted to your authorised branch.
          </p>
          {data.referrals?.map((r: any) => (
            <p key={r.attribution_id}>
              {r.customer_name} referred by {r.referrer_name} ·{" "}
              {r.attribution_id} · {r.state ?? "No hold recorded"} ·{" "}
              {r.reason ?? "No review evidence recorded"}
            </p>
          ))}
          <h3>Posting review queue</h3>
          {data.jobs
            ?.filter((j: any) => j.status === "review")
            .map((j: any) => (
              <button
                className="button secondary"
                key={j.order_id ?? j.booking_id}
                onClick={async () => {
                  const reason = await requestText(
                    "Explain what was independently reviewed and why this reward should be retried.",
                    {
                      minimumLength: 10,
                      signal: lifecycle.current?.signal,
                      title: "Retry reviewed reward",
                      confirmLabel: "Request retry",
                    },
                  );
                  if (!reason) return;
                  try {
                    await api("rewards.retry", {
                      ...(j.order_id
                        ? { orderId: j.order_id }
                        : { bookingId: j.booking_id }),
                      reason,
                    });
                    setRevision((r) => r + 1);
                  } catch (e: any) {
                    setError(e.message);
                  }
                }}
              >
                Retry reviewed source {j.order_id ?? j.booking_id}
              </button>
            ))}
        </>
      )}

      <Link href="/admin/settings">
        Review loyalty policy and independent approvals
      </Link>
      {error ? (
        <Notice type="error" message={error} />
      ) : !data ? (
        <Loading />
      ) : (
        <>
          <p>{data.valuation}</p>
          <p>{data.legacyAttribution}</p>
          {data.ledger.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Customer reference</th>
                    <th>Branch</th>
                    <th>Positive points</th>
                    <th>Negative points</th>
                    <th>Net points</th>
                    <th>Estimated discount (kobo)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ledger.map((r: any) => (
                    <tr key={`${r.customer_id}:${r.branch_id}`}>
                      <td>{r.customer_id}</td>
                      <td>{r.branch_id ?? "Unattributed"}</td>
                      <td>{r.positive_points}</td>
                      <td>{r.negative_points}</td>
                      <td>{r.net_points}</td>
                      <td>{r.estimatedDiscountKobo ?? "No approved rate"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No recorded point movements in your scope.</p>
          )}
          <h3>Issuance queue</h3>
          {data.jobs.length ? (
            <ul>
              {data.jobs.map((j: any) => (
                <li key={j.order_id ?? j.booking_id}>
                  {j.order_id ?? j.booking_id}: {j.status} · {j.attempts}{" "}
                  attempts {j.last_error ?? ""}
                </li>
              ))}
            </ul>
          ) : (
            <p>No queued awards in your scope.</p>
          )}
        </>
      )}
      <button
        className="button secondary"
        onClick={async () => {
          setError("");
          try {
            const report = await api("rewards.export", {});
            const cell = (v: any) =>
              '"' +
              (/^[\s]*[=+\-@]/.test(String(v ?? "")) ? "'" : "") +
              String(v ?? "").replaceAll('"', '""') +
              '"';
            const csv = [
              [
                "Customer reference",
                "Attributed branch",
                "Earned points",
                "Referral points",
                "Redeemed points",
                "Reversed points",
                "Adjusted points",
                "Legacy points",
                "Net points",
                "Estimated discount kobo",
                "Valuation policy version",
              ],
              ...report.ledger.map((r: any) => [
                r.customer_id,
                r.branch_id,
                r.earned_points,
                r.referral_points,
                r.redeemed_points,
                r.reversed_points,
                r.adjusted_points,
                r.legacy_points,
                r.net_points,
                r.estimatedDiscountKobo,
                r.valuationPolicyVersion,
              ]),
            ]
              .map((r) => r.map(cell).join(","))
              .join("\r\n");
            const url = URL.createObjectURL(
              new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = "easygas-rewards-reconciliation.csv";
            a.click();
            URL.revokeObjectURL(url);
          } catch (e: any) {
            setError(e.message);
          }
        }}
      >
        Export authorised reconciliation CSV
      </button>
      <button
        className="button secondary"
        onClick={() => setRevision((r) => r + 1)}
      >
        Refresh reconciliation
      </button>
    </section>
  );
}

export function RewardCheckoutField({
  onChange,
  onOfferChange,
}: {
  onChange?: (p: number) => void;
  onOfferChange?: (id: string) => void;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [points, setPoints] = useState(""),
    [offer, setOffer] = useState("");
  useEffect(() => {
    let live = true;
    api("rewards.summary")
      .then((r) => {
        if (!live) return;
        setData(r);
        try {
          const selected = sessionStorage.getItem(
            `easygas.rewardOffer.${r.customerId}`,
          );
          const o = r.catalogue.find((o: any) => o.id === selected);
          if (o) {
            setOffer(o.id);
            setPoints(String(o.points));
            onChange?.(o.points);
            onOfferChange?.(o.id);
          }
        } catch {}
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, []);
  if (error)
    return (
      <p role="status">
        Rewards unavailable. Continue without a point discount or reload to
        retry.
      </p>
    );
  if (!data) return <p role="status">Checking rewards…</p>;
  if (!data.redemptionEnabled)
    return (
      <p>Reward discounts are disabled; your history remains available.</p>
    );
  return (
    <div>
      <label>
        Reward offer (optional)
        <select
          name="rewardOfferId"
          value={offer}
          onChange={(e) => {
            const id = e.target.value;
            setOffer(id);
            onOfferChange?.(id);
            const o = data.catalogue.find((o: any) => o.id === id);
            setPoints(o ? String(o.points) : "");
            onChange?.(o?.points ?? 0);
          }}
        >
          <option value="">Use general points discount</option>
          {data.catalogue.map((o: any) => (
            <option key={o.id} value={o.id}>
              {o.title} · {o.points} points
            </option>
          ))}
        </select>
      </label>
      <label>
        Points to use · {data.availablePoints} available
        <input
          name="rewardPoints"
          type="number"
          value={points}
          readOnly={!!offer}
          min={data.policy.minimumPoints}
          max={data.availablePoints}
          step="1"
          placeholder="Optional"
          onChange={(e) => {
            setPoints(e.target.value);
            onChange?.(Number(e.target.value) || 0);
          }}
        />
      </label>
      <p>
        Minimum {data.policy.minimumPoints}; up to{" "}
        {data.policy.maximumDiscountBps / 100}% of eligible product spend. Fees
        remain unchanged. Final discount is checked on the server.
      </p>
    </div>
  );
}

function ReferralPanel({ refreshing }: { refreshing: boolean }) {
  const [result, setResult] = useState<{
    enabled: boolean;
    code: string | null;
    shareUrl: string | null;
  } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const disabled = busy || refreshing;

  async function submit(
    action: "rewards.referral" | "rewards.referral.attribute",
  ) {
    if (refreshing || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (action === "rewards.referral") {
        const referral = await api(action, {});
        setResult(referral);
        if (!referral.enabled)
          setError("Referral bonuses are currently disabled.");
      } else {
        await api(action, { code });
        setCode("");
        setMessage(
          "Referral recorded. Points can post after a qualifying purchase is completed and verified.",
        );
      }
    } catch (failure) {
      setError(friendlyMessage((failure as Error).message));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="easyrewards-referral-form">
      <p>
        Referral rewards require the referred customer’s first eligible verified
        purchase. Apply a code before your first qualifying purchase.
      </p>
      {result?.shareUrl ? (
        <a href={result.shareUrl}>{result.shareUrl}</a>
      ) : result?.code ? (
        <p>
          Your code: {result.code}. Public sharing awaits a configured HTTPS
          website domain.
        </p>
      ) : null}
      <button
        type="button"
        className="button secondary"
        disabled={disabled}
        onClick={() => submit("rewards.referral")}
      >
        Get my referral code
      </button>
      <label>
        Referral code received
        <input
          autoCapitalize="none"
          autoComplete="off"
          value={code}
          disabled={disabled}
          maxLength={32}
          onChange={(event) => setCode(event.target.value.trim())}
        />
      </label>
      <button
        type="button"
        className="button secondary"
        disabled={disabled || !/^[a-f0-9]{32}$/.test(code)}
        onClick={() => submit("rewards.referral.attribute")}
      >
        Apply referral code
      </button>
      {error && <Notice type="error" message={error} />}
      {message && <p role="status">{message}</p>}
    </div>
  );
}

export function SmartRewardOffers() {
  const [offers, setOffers] = useState<any[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    api("rewards.smart-offers")
      .then((o) => {
        if (live) setOffers(o);
      })
      .catch(() => {
        if (live)
          setError(
            "Refill reward offers are unavailable. Your existing refill plan is unchanged.",
          );
      });
    return () => {
      live = false;
    };
  }, []);
  return (
    <section className="surface workflow-form">
      <h2>Smart Refill offers</h2>
      {error ? (
        <p role="status">{friendlyMessage(error)}</p>
      ) : offers.length ? (
        offers.map((o) => (
          <p key={o.id}>
            <Link href="/rewards">
              {o.title} · {o.points} points
            </Link>{" "}
            · expires {new Date(o.expiresAt).toLocaleDateString()}
          </p>
        ))
      ) : (
        <p>
          No approved offer currently matches your verified refill profile and
          communication preferences.
        </p>
      )}
    </section>
  );
}
export function PartialRefundForm({ orderId }: { orderId: string }) {
  const [lines, setLines] = useState<any[]>([]),
    [quantities, setQuantities] = useState<Record<string, string>>({}),
    [reason, setReason] = useState(""),
    [consent, setConsent] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [key, setKey] = useState(() => crypto.randomUUID());
  useEffect(() => {
    let live = true;
    api(`refund.lines?orderId=${encodeURIComponent(orderId)}`)
      .then((r) => {
        if (live) setLines(r);
      })
      .catch((e) => {
        if (live) setMessage(e.message);
      });
    return () => {
      live = false;
    };
  }, [orderId]);
  return (
    <section className="surface workflow-form">
      <h3>Refund selected quantities</h3>
      <p>
        Amounts come from the confirmed order. Delivery is refunded only in a
        full remaining-order request. This does not record a physical cylinder
        return.
      </p>
      {lines.map((l) => (
        <label key={l.source}>
          {l.source} · {l.remaining} remaining{" "}
          {l.source.startsWith("gas:") ? "grams" : "units"}
          <input
            type="number"
            min="0"
            max={l.remaining}
            step="1"
            value={quantities[l.source] ?? ""}
            onChange={(e) => {
              setQuantities({ ...quantities, [l.source]: e.target.value });
              setKey(crypto.randomUUID());
            }}
          />
        </label>
      ))}
      <label>
        Reason
        <textarea
          value={reason}
          minLength={10}
          onChange={(e) => {
            setReason(e.target.value);
            setKey(crypto.randomUUID());
          }}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        I accept purchase credit if independently approved.
      </label>
      <button
        className="button secondary"
        type="button"
        disabled={busy || !consent || reason.trim().length < 10}
        onClick={async () => {
          setBusy(true);
          try {
            const result = await api("refund.request", {
              orderId,
              lines: Object.entries(quantities)
                .filter(([, v]) => Number(v) > 0)
                .map(([source, q]) => ({ source, quantity: Number(q) })),
              reason,
              acceptWalletCredit: true,
              idempotencyKey: key,
            });
            setMessage(
              `Refund request ${result.id} is awaiting independent finance review.`,
            );
          } catch (e: any) {
            setMessage(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Request selected refund
      </button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Loading, Notice } from "./ui";

export function EasyRewards() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    setData(null);
    api("rewards.summary")
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
  if (error)
    return (
      <section className="surface workflow-form">
        <Notice type="error" message={error} />
        <button
          className="button secondary"
          onClick={() => setRevision((r) => r + 1)}
        >
          Retry rewards
        </button>
      </section>
    );
  if (!data) return <Loading />;
  return (
    <div className="workflow-stack">
      <section className="rewards-card">
        <span>Your EasyGas points</span>
        <h2>{data.availablePoints.toLocaleString()}</h2>
        <p>Available points · separate from purchase credit</p>
        {data.policy && (
          <>
            <progress
              aria-label="Progress toward minimum redemption"
              max={data.policy.minimumPoints}
              value={Math.min(data.availablePoints, data.policy.minimumPoints)}
            />
            <p>
              {Math.min(data.availablePoints, data.policy.minimumPoints)} of{" "}
              {data.policy.minimumPoints} points toward minimum redemption
            </p>
          </>
        )}
      </section>
      {data.restricted && (
        <Notice
          type="error"
          message="Your points need finance review following a reversal. Further spending is restricted. Contact support."
        />
      )}
      <section className="surface workflow-form">
        <h2>Your programme</h2>
        <p>
          {data.pendingAwards} award events await processing; their point amount
          is not included in your available balance.
        </p>
        <p>
          {data.earningEnabled && data.policy
            ? `Earn one point per ₦${(data.policy.spendPerPointKobo / 100).toLocaleString()} of eligible verified, completed purchases.`
            : "Reward earning is currently disabled. Your existing history remains available."}
        </p>
        <p>
          {data.redemptionEnabled
            ? `Checkout discounts start at ${data.policy.minimumPoints} points and are capped at ${data.policy.maximumDiscountBps / 100}% of eligible product spend. Delivery fees are excluded.`
            : "Checkout reward discounts are currently disabled."}
        </p>
        <p>
          {data.policy
            ? `Approved policy version ${data.policy.version}. Eligible categories: ${data.policy.eligibleCategories.join(", ")}.`
            : "No EasyRewards policy has been independently approved."}
        </p>
        <p>
          No expiry or tiers are active. Pending awards are shown after
          processing; no estimated balance is included.
        </p>
      </section>
      <section className="surface workflow-form">
        <h2>Points history</h2>
        {!data.entries.length ? (
          <p>No points transactions yet.</p>
        ) : (
          <ul>
            {data.entries.map((e: any) => (
              <li key={e.id}>
                <strong>
                  {Number(e.points) > 0 ? "+" : ""}
                  {e.points} points
                </strong>{" "}
                · {e.kind ?? "Historical transaction"} ·{" "}
                {new Date(e.created_at).toLocaleDateString("en-NG")}{" "}
                {e.booking_id && (
                  <Link
                    href={`/bookings?bookingId=${encodeURIComponent(e.booking_id)}`}
                  >
                    {e.booking_reference ?? "View service booking"}
                  </Link>
                )}
                {e.order_id && (
                  <Link
                    href={`/orders?orderId=${encodeURIComponent(e.order_id)}`}
                  >
                    {e.order_reference ?? "View order"}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
        {data.entries.length === data.historyLimit && (
          <p>
            Showing the most recent {data.historyLimit} entries. Contact support
            for an older statement.
          </p>
        )}
      </section>
      <section className="surface workflow-form">
        <h2>Rewards &amp; referrals</h2>
        {!data.catalogue.length ? (
          <p>No approved offers are available for your current account.</p>
        ) : (
          data.catalogue.map((o: any) => (
            <article className="surface workflow-form" key={o.id}>
              <h3>{o.title}</h3>
              <p>{o.description}</p>
              <p>
                {o.points} points · expires{" "}
                {new Date(o.expiresAt).toLocaleDateString()}
              </p>
              <Link
                className="button secondary"
                href="/products"
                onClick={() => {
                  try {
                    sessionStorage.setItem(
                      `easygas.rewardOffer.${data.customerId}`,
                      o.id,
                    );
                  } catch {}
                }}
              >
                Choose products for this offer
              </Link>
            </article>
          ))
        )}
        <ReferralPanel
          enabled={data.policy?.referralEnabled && data.earningEnabled}
        />
        <Link href="/support">Ask about your points</Link>
      </section>
    </div>
  );
}
export function EasyRewardsReport() {
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
                  const reason = window.prompt(
                    "Reason and evidence for retry after independent review (10+ characters)",
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

function ReferralPanel({ enabled }: { enabled: boolean }) {
  const [result, setResult] = useState<any>(null),
    [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  if (!enabled) return <p>Referral bonuses are currently disabled.</p>;
  return (
    <div>
      <p>
        Bonuses require the referred customer's first eligible verified,
        fulfilled purchase. A refund reverses the bonus. Shared addresses alone
        are not treated as fraud.
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
        className="button secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            setResult(await api("rewards.referral", {}));
          } catch (e: any) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Get my referral code
      </button>
      <label>
        Referral code received
        <input
          value={code}
          maxLength={32}
          onChange={(e) => setCode(e.target.value.trim())}
        />
      </label>
      <button
        className="button secondary"
        disabled={busy || !/^[a-f0-9]{32}$/.test(code)}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await api("rewards.referral.attribute", { code });
            setError(
              "Referral recorded. No points are awarded until a qualifying purchase is completed and verified.",
            );
          } catch (e: any) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Apply referral code
      </button>
      {error && <p role="status">{error}</p>}
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
        <p role="status">{error}</p>
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

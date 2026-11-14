"use client";
import { FieldCaption } from "./field-caption";
export function RewardsPolicyFields({
  value,
  onChange,
}: {
  value: any;
  onChange: (v: any) => void;
}) {
  const offers = value.offers ?? [];
  return (
    <div className="workflow-stack">
      <h3>Service earning</h3>
      <label>
        <input
          type="checkbox"
          checked={!!value.serviceEarningEnabled}
          onChange={(e) =>
            onChange({ ...value, serviceEarningEnabled: e.target.checked })
          }
        />
        <FieldCaption required={false}>Allow verified completed service labour to earn points</FieldCaption>
      </label>
      <label>
        <FieldCaption required={false}>Eligible service IDs (comma separated)</FieldCaption>
        <input
          value={(value.eligibleServiceIds ?? []).join(", ")}
          onChange={(e) =>
            onChange({
              ...value,
              eligibleServiceIds: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </label>
      <h3>Reward catalogue &amp; campaign budgets</h3>
      <p>
        Changes require independent owner and finance approval. Budget is
        consumed by committed offer redemptions; refunds do not replenish it.
        Service callout/materials do not earn points.
      </p>
      {offers.map((o: any, i: number) => (
        <fieldset key={i}>
          <legend>Offer {i + 1}</legend>
          {["id", "title", "description", "startsAt", "expiresAt"].map((k) => (
            <label key={k}>
              <FieldCaption required={true}>{k}
              {k === "startsAt" || k === "expiresAt"
                ? " (ISO date and time)"
                : ""}</FieldCaption>
              <input
                required
                value={o[k]}
                onChange={(e) =>
                  onChange({
                    ...value,
                    offers: offers.map((x: any, j: number) =>
                      j === i ? { ...x, [k]: e.target.value } : x,
                    ),
                  })
                }
              />
            </label>
          ))}
          {[
            "points",
            "budgetKobo",
            "maximumUsesPerCustomer",
            "frequencyDays",
          ].map((k) => (
            <label key={k}>
              <FieldCaption required={true}>{k}</FieldCaption>
              <input
                type="number"
                required
                min="1"
                step="1"
                value={o[k]}
                onChange={(e) =>
                  onChange({
                    ...value,
                    offers: offers.map((x: any, j: number) =>
                      j === i ? { ...x, [k]: Number(e.target.value) } : x,
                    ),
                  })
                }
              />
            </label>
          ))}
          {["active", "smartRefill"].map((k) => (
            <label key={k}>
              <input
                type="checkbox"
                checked={o[k]}
                onChange={(e) =>
                  onChange({
                    ...value,
                    offers: offers.map((x: any, j: number) =>
                      j === i ? { ...x, [k]: e.target.checked } : x,
                    ),
                  })
                }
              />
              <FieldCaption required={false}>{k === "active"
                ? "Publish after approval"
                : "Restrict to consented, eligible Smart Refill profiles"}</FieldCaption>
            </label>
          ))}
          <button
            type="button"
            className="button secondary"
            onClick={() =>
              onChange({
                ...value,
                offers: offers.filter((_: any, j: number) => j !== i),
              })
            }
          >
            Remove offer from proposal
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        className="button secondary"
        onClick={() =>
          onChange({
            ...value,
            offers: [
              ...offers,
              {
                id: "",
                title: "",
                description: "",
                points: 0,
                budgetKobo: 0,
                maximumUsesPerCustomer: 1,
                frequencyDays: 7,
                startsAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
                active: false,
                smartRefill: false,
              },
            ],
          })
        }
      >
        Add offer to proposal
      </button>
    </div>
  );
}

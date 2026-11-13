import { EasyGasLoader } from "./EasyGasLoader";
import React, { useEffect, useState } from "react";
import { Button, Card, Copy, Title } from "./CustomerUI";
import { gasMoney } from "../../packages/business-rules/src/gas-pricing";

const metrics = [
  ["verifiedCompletedRevenueKobo", "Verified completed revenue"],
  ["grossProfitKobo", "Gross profit"],
  ["recordedExpensesKobo", "Recorded expenses"],
  ["netProfitKobo", "Net profit"],
  ["walletLiabilityKobo", "Wallet liability"],
] as const;

type Snapshot = {
  permissions: { financeWrite: boolean };
  finance: Partial<Record<(typeof metrics)[number][0], number | null>>;
};

export function FinanceOverview({ api }: { api: (action: string) => Promise<Snapshot> }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    api("business.snapshot")
      .then(result => { if (active) setSnapshot(result); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [revision]);

  if (failed) return <Card>
    <Copy>Finance records couldn’t load. Check your connection and try again.</Copy>
    <Button label="Retry" onPress={() => {
      setFailed(false);
      setRevision(value => value + 1);
    }} />
  </Card>;
  if (!snapshot) return <EasyGasLoader variant="section" label="Loading finance records" />;
  if (!snapshot.permissions.financeWrite) return <Copy>Finance records are unavailable for this account.</Copy>;

  return <Card>
    <Title>Financial summary</Title>
    <Copy>Committed records in your authorised scope.</Copy>
    {metrics.map(([key, label]) => {
      const amount = snapshot.finance[key];
      return <Card key={key}>
        <Copy>{label}</Copy>
        <Title>{amount == null ? "Unavailable" : gasMoney(amount)}</Title>
      </Card>;
    })}
  </Card>;
}

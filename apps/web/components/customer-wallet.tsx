"use client";
import React, { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { WalletFunding, paymentMoney } from "./hosted-payment";
import { DocumentLibrary } from "./document-library";
export function CustomerWallet({ data }: { data: any }) {
  const [topUp, setTopUp] = useState(false),
    [tab, setTab] = useState("activity");
  useEffect(() => {
    const update = () => setTopUp(location.hash === "#top-up");
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return (
    <section className="customer-wallet stack">
      <div className="wallet-card wallet-summary">
        <div>
          <span>Wallet balance</span>
          <h2>{paymentMoney(data.balanceKobo)}</h2>
          <p>For your EasyGas purchases.</p>
        </div>
        <button
          className="button"
          aria-expanded={topUp}
          aria-controls="wallet-top-up-panel"
          onClick={() => setTopUp(!topUp)}
        >
          {topUp ? "Close top-up" : "Top up wallet"}
        </button>
      </div>
      {topUp && (
        <div id="wallet-top-up-panel">
          <WalletFunding />
        </div>
      )}
      <div
        className="wallet-view-tabs"
        role="tablist"
        aria-label="Wallet history"
        onKeyDown={(e) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
            return;
          e.preventDefault();
          const next =
            e.key === "Home"
              ? "activity"
              : e.key === "End"
                ? "documents"
                : tab === "activity"
                  ? "documents"
                  : "activity";
          setTab(next);
          document.getElementById(`wallet-${next}-tab`)?.focus();
        }}
      >
        <button
          role="tab"
          tabIndex={tab === "activity" ? 0 : -1}
          id="wallet-activity-tab"
          aria-controls="wallet-activity"
          aria-selected={tab === "activity"}
          onClick={() => setTab("activity")}
        >
          Transactions
        </button>
        <button
          role="tab"
          tabIndex={tab === "documents" ? 0 : -1}
          id="wallet-documents-tab"
          aria-controls="wallet-documents"
          aria-selected={tab === "documents"}
          onClick={() => setTab("documents")}
        >
          Invoices & receipts
        </button>
      </div>
      {tab === "documents" ? (
        <div
          role="tabpanel"
          id="wallet-documents"
          aria-labelledby="wallet-documents-tab"
        >
          <DocumentLibrary initialType="receipt" />
        </div>
      ) : (
        <div
          role="tabpanel"
          id="wallet-activity"
          aria-labelledby="wallet-activity-tab"
          className="surface wallet-activity"
        >
          <h2>Recent transactions</h2>
          {data.entries.length ? (
            data.entries.map((e: any) => (
              <div className="cart-row" key={e.id}>
                <Wallet aria-hidden="true" />
                <span>
                  {e.kind.replaceAll("_", " ")}
                  <small>{e.reference}</small>
                </span>
                <strong>{paymentMoney(e.amount_kobo)}</strong>
              </div>
            ))
          ) : (
            <p className="muted">
              No transactions yet. Your top-ups and purchases will appear here.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

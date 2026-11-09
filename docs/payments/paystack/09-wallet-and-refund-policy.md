# Wallet and refunds

Existing wallet_entries append-only sum remains spendable closed-loop purchase credit. Verified Paystack sandbox funding credits exactly base B once, keyed by provider reference. C is not wallet value. Approved min/max funding and resulting balance cap are checked before quote and again on verification, with user lock serialising concurrent funding. No general-purpose cashout, withdrawal or customer transfer was added. Synthetic-only runtime prevents test money entering business records by default.

Existing manual/COD/wallet channels remain unchanged. Existing credit.decide refund is blocked for provider-funded payments so it cannot both issue purchase credit and later return provider funds. This is a safety hold, NOT a completed provider refund feature.

Unfinished: independently approved provider full/partial refund requests and attempts; authoritative final refund verification; fee nonrefundability treatment; wallet reversal/chargeback liability holds; points reversal; customer refund status; disputes/evidence; overpayment remediation. Do not enable wallet funding or live collections until these critical gaps and prepaid-credit merchant/business permission are closed. No unsupported balancing entry is written.

import { useEffect, useState } from "react";
import type { CheckoutProfile } from "../../packages/business-rules/src/checkout-delivery";

export function useCheckoutProfile(
  api: (action: string) => Promise<CheckoutProfile>,
  id?: string,
) {
  const [loaded, setLoaded] = useState<{ id: string; profile: CheckoutProfile | null }>();
  useEffect(() => {
    if (!id) {
      setLoaded(undefined);
      return;
    }
    let active = true;
    const timeout = setTimeout(() => {
      active = false;
      setLoaded({ id, profile: null });
    }, 15000);
    api("account.profile")
      .then((profile) => {
        if (active) setLoaded({ id, profile: profile.user?.id === id ? profile : null });
      })
      .catch(() => {
        if (active) setLoaded({ id, profile: null });
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [id]);
  return { profile: loaded?.id === id ? loaded?.profile : undefined, loading: Boolean(id && loaded?.id !== id) };
}

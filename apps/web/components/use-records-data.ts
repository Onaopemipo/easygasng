"use client";
import { useEffect, useState } from "react";
import { api } from "./ui";
export function useRecordsData(action: string | null, refresh = 0, scope = "") {
  const key = JSON.stringify([action, scope]);
  const [state, setState] = useState<{ key: string; data: any; error: string }>(
    { key, data: null, error: "" },
  );
  const [attempt, retry] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setState({ key, data: action ? null : [], error: "" });
    if (action)
      api(action, undefined, { signal: controller.signal })
        .then((data) => {
          if (active) setState({ key, data, error: "" });
        })
        .catch((error) => {
          if (active) setState({ key, data: null, error: error.message });
        });
    return () => {
      active = false;
      controller.abort();
    };
  }, [key, refresh, attempt]);
  return {
    data: state.key === key ? state.data : null,
    error: state.key === key ? state.error : "",
    retry: () => retry((n) => n + 1),
  };
}

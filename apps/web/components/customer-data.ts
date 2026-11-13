"use client";
import { useEffect, useState } from "react";
import { api } from "./ui";
export function useCustomerResource(action: string, identity: string) {
  const key = JSON.stringify([action, identity]);
  const [state, setState] = useState<{
    key: string;
    data: any;
    error: string;
    loading: boolean;
  }>({ key, data: null, error: "", loading: true });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let live = true;
    setState(previous => ({ key, data: previous.key === key ? previous.data : null, error: "", loading: true }));
    const timeout = setTimeout(() => controller.abort(), 12000);
    api(action, undefined, { signal: controller.signal })
      .then((data) => {
        if (live && !controller.signal.aborted)
          setState({ key, data, error: "", loading: false });
      })
      .catch((e) => {
        if (live)
          setState({
            key,
            data: null,
            error:
              e.name === "AbortError"
                ? "This request took too long. Please retry."
                : e.message,
            loading: false,
          });
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      live = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [action, key, version]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setVersion((v) => v + 1), 300);
    };
    const poll = action.includes("widget=navigation")
      ? setInterval(() => {
          if (!document.hidden) refresh();
        }, 30000)
      : null;
    window.addEventListener("easygas:committed", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      clearTimeout(timer);
      if (poll) clearInterval(poll);
      window.removeEventListener("easygas:committed", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [action]);
  const current = state.key === key ? state : { data: null, error: "", loading: true };
  return { ...current, loading: current.loading && current.data === null, retry: () => setVersion((v) => v + 1) };
}

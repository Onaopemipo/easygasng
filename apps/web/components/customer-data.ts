"use client";
import { useEffect, useState } from "react";
import { api } from "./ui";
export function useCustomerResource(action: string, identity: string) {
  const [state, setState] = useState<{
    data: any;
    error: string;
    loading: boolean;
  }>({ data: null, error: "", loading: true });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let live = true;
    setState({ data: null, error: "", loading: true });
    const timeout = setTimeout(() => controller.abort(), 12000);
    api(action, undefined, { signal: controller.signal })
      .then((data) => {
        if (live && !controller.signal.aborted)
          setState({ data, error: "", loading: false });
      })
      .catch((e) => {
        if (live)
          setState({
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
  }, [action, identity, version]);
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
  return { ...state, retry: () => setVersion((v) => v + 1) };
}

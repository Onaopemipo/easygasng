"use client";
import { confirmAction, appDialogActive } from "./app-dialog";
import { friendlyMessage } from "../../../packages/business-rules/src/friendly-message";
import React, { useEffect, useRef } from "react";
import {
  Flame,
  CookingPot,
  Cable,
  Gauge,
  Package,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Link from "./workspace-link";
import { SectionLoadingFallback } from "./easygas-loader";
export const money = (kobo: number | string | null) =>
  kobo === null
    ? "Pricing soon"
    : new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0,
      }).format(Number(kobo) / 100);
export function Logo() {
  return (
    <Link href="/" className="brand" aria-label="EasyGas Energy Solutions home">
      <span
        className="logo-mark"
        role="img"
        aria-label="EasyGas Energy Solutions"
      />
    </Link>
  );
}
export function ProductArt({
  product,
  large = false,
}: {
  product: any;
  large?: boolean;
}) {
  return (
    <div className={`product-art ${product.asset} ${large ? "large" : ""}`}>
      {product.image_id ? (
        <img
          src={`/api/media/${product.image_id}`}
          alt={product.name}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      ) : product.asset === "gas" ? (
        <Flame size={large ? 100 : 66} strokeWidth={1.6} aria-label="Cooking gas" />
      ) : product.asset === "cylinder" ? (
        <img
          src="/assets/cylinder-illustration.png"
          alt={`Illustration of a ${product.size_kg}kg green gas cylinder`}
          style={{
            height:
              product.size_kg === 6
                ? "78%"
                : product.size_kg >= 25
                  ? "100%"
                  : "90%",
          }}
        />
      ) : product.asset === "hose" ? (
        <svg
          viewBox="0 0 140 100"
          aria-label="Gas hose illustration"
          role="img"
        >
          <ellipse
            cx="70"
            cy="49"
            rx="47"
            ry="28"
            fill="none"
            stroke="#ed680e"
            strokeWidth="10"
          />
          <ellipse
            cx="70"
            cy="48"
            rx="38"
            ry="20"
            fill="none"
            stroke="#ff9c43"
            strokeWidth="5"
          />
          <path d="M115 56 L125 72" stroke="#fd7c19" strokeWidth="9" />
          <path d="M122 68 L129 77" stroke="#c1a260" strokeWidth="10" />
        </svg>
      ) : product.asset === "regulator" ? (
        <Gauge size={large ? 100 : 66} strokeWidth={1.3} />
      ) : product.asset === "burner" ? (
        <div className="stove">
          <span />
          <span />
        </div>
      ) : (
        <div className="kit-art">
          <CookingPot size={large ? 90 : 60} />
          <Cable size={34} />
        </div>
      )}
    </div>
  );
}
export function Empty({
  icon: Icon = Package,
  title,
  children,
}: {
  icon?: any;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={30} />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Loading({ page = false }: { page?: boolean } = {}) {
  return <div className={page ? "loading loading--page" : "loading"}><SectionLoadingFallback /></div>;
}
export function Notice({
  message,
  type = "info",
}: {
  message: string;
  type?: string;
}) {
  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={`notice ${type}`}
    >
      {type === "success" ? (
        <CheckCircle2 size={18} />
      ) : (
        <AlertCircle size={18} />
      )}
      <span>{type === "error" ? friendlyMessage(message) : message}</span>
    </div>
  );
}
export function Modal({
  title,
  onClose,
  children,
  className,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const dialog = useRef<HTMLElement>(null);
  const closing = useRef(false);
  const lifecycle = useRef<AbortController|null>(null);
  async function close() {
    if (closing.current || appDialogActive()) return;
    closing.current = true;
    if (
      dialog.current?.querySelector('[data-unsaved="true"]') &&
      !(await confirmAction("Your changes have not been saved. Keep editing to preserve them, or discard them to close this form.", { title: "Discard unsaved changes?", confirmLabel: "Discard changes", cancelLabel: "Keep editing", destructive: true, signal: lifecycle.current?.signal }))
    ) { closing.current = false; return; }
    closing.current = false;
    onClose();
  }
  useEffect(() => {
    lifecycle.current = new AbortController();
    const previous = document.activeElement as HTMLElement | null;
    const targets = () =>
      Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]",
        ) ?? [],
      );
    targets()[0]?.focus();
    const key = (event: KeyboardEvent) => {
      if (appDialogActive()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
      if (event.key === "Tab") {
        const items = targets(),
          first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      lifecycle.current?.abort();
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div className={className ? `modal-backdrop ${className}` : "modal-backdrop"} onClick={close}>
      <section
        ref={dialog}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="section-heading">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={close}
          >
            <X />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export async function api(
  action: string,
  data?: any,
  options?: { signal?: AbortSignal },
) {
  const response = await fetch(
    `/api/${action}`,
    data === undefined
      ? { cache: "no-store", signal: options?.signal }
      : {
          method: "POST",
          signal: options?.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
  );
  const result = await response.json();
  if (
    response.status === 401 &&
    !["me", "login", "register"].includes(action.split("?")[0])
  ) {
    window.dispatchEvent(new Event("easygas:unauthenticated"));
    const path = window.location.pathname;
    if (path.startsWith("/admin")) window.location.assign("/login");
  }
  if (!response.ok)
    throw Object.assign(new Error(friendlyMessage(result.error ?? "Something went wrong.")), {
      status: response.status,
      code: result.code,
    });
  if (data !== undefined) window.dispatchEvent(new Event("easygas:committed"));
  return result;
}

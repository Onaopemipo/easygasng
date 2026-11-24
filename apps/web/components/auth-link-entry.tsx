"use client";
import { useState, type FormEvent } from "react";
import { nativeEntryLink } from "../../../packages/business-rules/src/native-entry-links";
import { AuthField } from "./auth-presentation";
import { Notice } from "./ui";

/** Manual entry only. The existing validator owns origins, schemes and token syntax. */
export function AccountLinkEntry({ onCancel }: { onCancel: () => void }) {
  const [value, setValue] = useState(""),
    [error, setError] = useState("");
  function open(event: FormEvent) {
    event.preventDefault();
    const entry = nativeEntryLink(value, window.location.origin);
    const temporary = (() => {
      try {
        return (
          new URLSearchParams(new URL(value).hash.slice(1)).get("setup") ===
          "temporary"
        );
      } catch {
        return false;
      }
    })();
    setValue("");
    if (!entry?.token) {
      setError(
        "This is not a valid account link for this EasyGas service. Request a fresh link.",
      );
      return;
    }
    const path = {
      reset: "/reset-password",
      verify: "/verify-email",
      invitation: "/accept-invitation",
      phone: "/activate",
    }[entry.kind];
    // Fragment stays out of HTTP requests, logs and analytics. Target consumes it in memory.
    window.location.assign(
      path +
        (entry.kind === "phone" ? "#" : "#token=") +
        entry.token +
        (temporary && entry.kind !== "phone" ? "&setup=temporary" : ""),
    );
  }
  return (
    <>
      <form onSubmit={open}>
        <AuthField
          label="EasyGas account link"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
        {error && <Notice type="error" message={error} />}
        <button className="button" type="submit">
          Open account link
        </button>
      </form>
      <div className="eg-auth-links">
        <button className="text-link" type="button" onClick={onCancel}>
          Back to sign in
        </button>
      </div>
    </>
  );
}

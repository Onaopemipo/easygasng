"use client";
import Link from "next/link";
import React, {
  createContext,
  useContext,
  useRef,
  type ComponentProps,
} from "react";
import { retainedPublicHomeNavigation } from "../../../packages/business-rules/src/home-navigation";
import { analyticsLoaded, stopAnalytics } from "../lib/analytics-browser";

// Null means a public/customer surface outside the administration shell.
export const WorkspaceAccess = createContext<readonly string[] | null>(null);

export function workspaceLinkVisible(
  href: string,
  allowed: readonly string[] | null,
) {
  if (allowed === null || !href.startsWith("/admin")) return true;
  const path = href.split(/[?#]/)[0];
  if (path !== "/admin" && !path.startsWith("/admin/")) return true;
  const section = path.split("/")[2] || "dashboard";
  return allowed.includes(section);
}

export default function WorkspaceLink(props: ComponentProps<typeof Link>) {
  const allowed = useContext(WorkspaceAccess);
  const navigationTarget = useRef("");
  const href =
    typeof props.href === "string" ? props.href : (props.href.pathname ?? "");
  if (!workspaceLinkVisible(href, allowed)) return null;
  return (
    <Link
      {...props}
      onClick={(event) => {
        navigationTarget.current = event.currentTarget.href;
        props.onClick?.(event);
      }}
      onNavigate={(event) => {
        let prevented = false;
        props.onNavigate?.({
          preventDefault: () => {
            prevented = true;
            event.preventDefault();
          },
        });
        const destination = navigationTarget.current || href;
        if (!prevented && analyticsLoaded() && !retainedPublicHomeNavigation(window.location.href, destination)) {
          event.preventDefault();
          stopAnalytics(window);
          window.location.assign(destination);
        }
      }}
    />
  );
}

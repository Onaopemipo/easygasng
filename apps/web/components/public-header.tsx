"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  Flame,
  Package,
  Wrench,
  BookOpen,
  UsersRound,
  CircleHelp,
  Search,
  MapPin,
  ShoppingCart,
  UserRound,
  Menu,
  X,
  ArrowRight,
} from "lucide-react";
import {
  publicHeaderLinks,
  publicHeaderActive,
  publicSearchResults,
} from "../../../packages/business-rules/src/public-header";
import { Logo, api } from "./ui";
import { ThemeToggle } from "./theme-provider";
import { CustomerAccountMenu } from "./customer-workspace";
import {
  deliveryAreaEvent,
  readDeliveryArea,
  writeDeliveryArea,
} from "./delivery-area-preference";
const icons = {
  House,
  Flame,
  Package,
  Wrench,
  BookOpen,
  UsersRound,
  CircleHelp,
};
export default function PublicHeader({
  user,
  cartCount,
  catalogue,
  onLogout,
}: any) {
  const path = usePathname();
  const [hash, setHash] = useState("");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    ReturnType<typeof publicSearchResults>
  >([]);
  const [searchState, setSearchState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [partial, setPartial] = useState(false);
  const [area, setArea] = useState("");
  const identity = user?.id ?? "guest";
  const locations = catalogue?.gas?.locations ?? [];
  const trigger = useRef<HTMLButtonElement>(null),
    drawer = useRef<HTMLElement>(null),
    searchBox = useRef<HTMLDivElement>(null),
    searchInput = useRef<HTMLInputElement>(null);
  const searchRun = useRef(0);
  useEffect(() => {
    const update = () => setHash(window.location.hash);
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    setOpen(false);
    setSearchState("idle");
    searchRun.current++;
  }, [path, user?.id]);
  useEffect(() => {
    setArea(readDeliveryArea(identity));
    const change = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.identity === identity) setArea(d.id);
    };
    window.addEventListener(deliveryAreaEvent, change);
    return () => window.removeEventListener(deliveryAreaEvent, change);
  }, [identity]);
  useEffect(() => {
    if (
      !user ||
      !["customer", "commercial"].includes(user.role) ||
      readDeliveryArea(identity)
    )
      return;
    const controller = new AbortController();
    api("customer.dashboard?widget=navigation", undefined, {
      signal: controller.signal,
    })
      .then((d) => {
        if (d.address?.location_id && !readDeliveryArea(identity))
          setArea(d.address.location_id);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [identity, user?.role]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement,
      old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawer.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
      if (e.key !== "Tab") return;
      const items = Array.from(
        drawer.current?.querySelectorAll<HTMLElement>(
          "a[href],button:not([disabled])",
        ) ?? [],
      );
      const first = items[0],
        last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keys);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", keys);
      (trigger.current ?? previous)?.focus();
    };
  }, [open]);
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (!searchBox.current?.contains(e.target as Node)) {
        setSearchState("idle");
        searchRun.current++;
      }
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  async function search(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) {
      searchInput.current?.focus();
      return;
    }
    const run = ++searchRun.current;
    setSearchState("loading");
    setResults([]);
    const [products, services] = await Promise.allSettled([
      api("catalogue"),
      api("services.catalogue"),
    ]);
    if (run !== searchRun.current) return;
    if (products.status === "rejected" && services.status === "rejected") {
      setSearchState("error");
      return;
    }
    setPartial(
      products.status === "rejected" || services.status === "rejected",
    );
    setResults(
      publicSearchResults(
        query,
        products.status === "fulfilled" ? products.value.products : [],
        services.status === "fulfilled" ? services.value : [],
        products.status === "fulfilled" && products.value.preview === true,
      ),
    );
    setSearchState("ready");
  }
  function links() {
    return publicHeaderLinks.map(({ href, label, icon }) => {
      const Icon = icons[icon],
        active = publicHeaderActive(href, path, hash);
      return (
        <Link
          key={href}
          href={href}
          className={active ? "active" : ""}
          aria-current={
            active ? (href.includes("#") ? "location" : "page") : undefined
          }
          onClick={() => {
            setHash(href.includes("#") ? "#how-it-works" : "");
            setOpen(false);
          }}
        >
          <Icon size={21} />
          <span>{label}</span>
        </Link>
      );
    });
  }
  return (
    <>
      <a href="#main" className="skip">
        Skip to content
      </a>
      <header className="header public-header">
        <div className="public-header-upper">
          <Logo />
          <div
            className="public-header-search"
            ref={searchBox}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSearchState("idle");
                searchRun.current++;
                searchInput.current?.focus();
              }
            }}
          >
            <form
              role="search"
              aria-label="Search public catalogue and help"
              onSubmit={search}
            >
              <input
                ref={searchInput}
                aria-label="Search products, services or help"
                placeholder="Search products, services or help…"
                value={query}
                maxLength={120}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearchState("idle");
                  searchRun.current++;
                }}
                aria-controls="public-search-results"
                aria-expanded={searchState !== "idle"}
              />
              <button
                type="submit"
                className="icon-button"
                aria-label="Submit public search"
              >
                <Search size={22} />
              </button>
            </form>
            {searchState !== "idle" && (
              <section
                id="public-search-results"
                className="public-search-results"
                aria-label="Public search results"
              >
                <div className="public-search-summary">
                  <strong>Search results</strong>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Close search results"
                    onClick={() => {
                      setSearchState("idle");
                      searchRun.current++;
                      searchInput.current?.focus();
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
                <p role="status">
                  {searchState === "loading"
                    ? "Searching public products and services…"
                    : searchState === "error"
                      ? "Search is unavailable. Please submit again to retry."
                      : results.length
                        ? `${results.length} matching results${results.length > 12 ? "; showing the first 12" : ""}.`
                        : "No matching products, services or help pages."}
                </p>
                {partial && searchState === "ready" && (
                  <p role="status">
                    Some catalogue results are unavailable. Submit again to
                    retry.
                  </p>
                )}
                {searchState === "ready" &&
                  results.slice(0, 12).map((r) => (
                    <Link
                      key={r.href}
                      href={r.href}
                      onClick={() => setSearchState("idle")}
                    >
                      <span>
                        {r.label}
                        <small>{r.type}</small>
                      </span>
                      <ArrowRight size={16} />
                    </Link>
                  ))}
                {searchState === "ready" && (
                  <Link
                    href={`/products?q=${encodeURIComponent(query.trim())}`}
                    onClick={() => setSearchState("idle")}
                  >
                    View all matching products <ArrowRight size={16} />
                  </Link>
                )}
              </section>
            )}
          </div>
          <div className="public-header-location">
            <MapPin size={21} />
            <select
              aria-label="Header delivery location"
              value={locations.some((l: any) => l.id === area) ? area : ""}
              disabled={!locations.length}
              onChange={(e) => {
                setArea(e.target.value);
                writeDeliveryArea(identity, e.target.value);
              }}
            >
              <option value="">
                {locations.length
                  ? "Select delivery location"
                  : "Delivery areas unavailable"}
              </option>
              {locations.map((l: any) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div className="public-header-utilities">
            <Link
              href="/cart"
              className="icon-button cart-link"
              aria-label={`Shopping cart, ${cartCount} items`}
            >
              <ShoppingCart size={24} />
              {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
            </Link>
            <ThemeToggle />
            {user ? (
              <CustomerAccountMenu user={user} onLogout={onLogout} />
            ) : (
              <Link
                className="button public-header-login"
                aria-label="Login / Sign Up"
                href="/login"
              >
                <UserRound size={21} />
                <span>Login / Sign Up</span>
              </Link>
            )}
          </div>
        </div>
        <div className="public-header-lower">
          <div className="public-mobile-nav-bar">
            <span>Explore EasyGas</span>
            <button
              ref={trigger}
              className="public-nav-trigger"
              aria-label="Open main navigation"
              aria-expanded={open}
              aria-controls="public-mobile-navigation"
              onClick={() => setOpen(true)}
            >
              <Menu size={21} /> Menu
            </button>
          </div>
          <nav
            className="public-desktop-navigation"
            aria-label="Main navigation"
          >
            {links()}
            <Link className="public-business-link" href="/business">
              Business Supply
            </Link>
          </nav>
        </div>
      </header>
      {open && (
        <div className="public-drawer-overlay">
          <button
            className="public-drawer-backdrop"
            aria-label="Close navigation backdrop"
            onClick={() => setOpen(false)}
          />
          <section
            ref={drawer}
            className="public-mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Main navigation"
            id="public-mobile-navigation"
          >
            <div className="public-drawer-heading">
              <strong>Explore EasyGas</strong>
              <button
                className="icon-button"
                aria-label="Close main navigation"
                onClick={() => setOpen(false)}
              >
                <X />
              </button>
            </div>
            <nav aria-label="Mobile main navigation">
              {links()}
              <Link href="/business" onClick={() => setOpen(false)}>
                Business Supply
              </Link>
            </nav>
          </section>
        </div>
      )}
    </>
  );
}

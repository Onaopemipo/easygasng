"use client";
import { RefillProfiles } from "./refill-profiles";
import { PASSWORD_MIN_LENGTH } from "../../../packages/business-rules/src/password-policy";

import { CustomerWallet } from "./customer-wallet";
import { DocumentLibrary } from "./document-library";
import { FormInput } from "./password-input";
import {useCardCheckout, OrderCardPayment} from "./hosted-payment";
import {
  EasyRewards,
  RewardCheckoutField,
  PartialRefundForm,
} from "./easyrewards";
import {
  trackingLabels,
  trackingEventLabel,
} from "../../../packages/business-rules/src/order-tracking";
import { AddressAreaFields } from "./address-area-fields";
import PublicHeader from "./public-header";
import {
  useTrackingOrders,
  TrackingConnection,
  TrackingDetails,
} from "./order-tracking";
import { PublicTestimonials, CustomerTestimonials } from "./testimonials";

import { preload } from "react-dom";
import { ThemeToggle, ThemeSettings } from "./theme-provider";
import CustomerWorkspace, { CustomerAccountMenu } from "./customer-workspace";
import CustomerDashboard from "./customer-dashboard";
import { useCustomerResource } from "./customer-data";
import {
  customerRoute,
  customerNavigation,
  protectedCustomerRoutes,
  safeCustomerReturn,
  customerAuthHref,
  parseShoppingCart,
} from "../../../packages/business-rules/src/customer-navigation";
import GasOrder from "./gas-order";
import CustomerBookings from "./customer-bookings";
import ProfessionalServices from "./professional-services";
import CombinedCheckout from "./combined-checkout";
import { LegalDocument } from "./policies";
import { Compatibility } from "./compatibility";
import { Recommendations } from "./recommendations";
import {
  NotificationInbox,
  RecurringOrders,
  ActionForm,
  CreditWallet,
  AccountSettings,
  Recovery,
  SupportDesk,
} from "./workflows";
import {
  useState,
  useRef,
  useEffect,
  createContext,
  useContext,
  type FormEvent,
} from "react";
import Link from "./workspace-link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  MapPin,
  ShoppingCart,
  UserRound,
  ChevronDown,
  ArrowRight,
  Package,
  ShieldCheck,
  Zap,
  Headphones,
  Tag,
  CalendarDays,
  Truck,
  CreditCard,
  Gift,
  House,
  Utensils,
  Building2,
  MoreHorizontal,
  Plus,
  Minus,
  X,
  Menu,
  Check,
  ArrowLeft,
  Flame,
  Bell,
  Wallet,
  CircleHelp,
  LogOut,
  RefreshCw,
  Leaf,
  Clock,
  CheckCircle2,
  Smartphone,
} from "lucide-react";
import { Logo, ProductArt, money, Empty, Loading, Notice, Modal, api } from "./ui";
type CartItem = { productId: string; quantity: number };
const Context = createContext<any>(null);
const useShop = () => useContext(Context);
export default function Site({
  initialUser = null,
  initialCatalogue = null,
}: {
  initialUser?: any;
  initialCatalogue?: any;
}) {
  const [catalogue, setCatalogue] = useState<any>(initialCatalogue),
    [user, setUser] = useState<any>(initialUser),
    [cart, setCart] = useState<CartItem[]>([]),
    [ready, setReady] = useState(false),
    [toast, setToast] = useState(""),
    [error, setError] = useState("");
  const pathname = usePathname(),
    router = useRouter();
  useEffect(() => {
    api(pathname === "/" ? "catalogue?view=homepage" : "catalogue")
      .then(setCatalogue)
      .catch((e) => setError(e.message));
  }, [pathname === "/"]);
  // Hydrate once per mount, independently of catalogue/navigation refreshes.
  useEffect(() => {
    try {
      setCart(parseShoppingCart(localStorage.getItem("easygas.cart")));
    } catch {}
    setReady(true);
  }, []);
  const signingOut = useRef(false);
  const workspace =
    !!user &&
    ["customer", "commercial"].includes(user.role) &&
    !!customerRoute(pathname);
  const protectedPath = [
    ...protectedCustomerRoutes,
    "/track",
    "/checkout",
    "/combined-checkout",
  ].includes(pathname);
  useEffect(() => {
    let controller: AbortController | null = null,
      live = true;
    const invalidate = () => {
      controller?.abort();
      setUser(null);
      if (protectedPath)
        window.location.replace(
          "/login?returnTo=" + encodeURIComponent(safeCustomerReturn(pathname)),
        );
    };
    const refresh = () => {
      if (document.hidden || signingOut.current) return;
      controller?.abort();
      controller = new AbortController();
      const current = controller;
      api("me", undefined, { signal: current.signal })
        .then((d) => {
          if (live && !current.signal.aborted && !signingOut.current)
            setUser((previous: any) =>
              previous &&
              ["id", "name", "email", "role", "branchId"].every(
                (key) => previous[key] === d.user[key],
              )
                ? previous
                : d.user,
            );
        })
        .catch((e) => {
          if (live && !current.signal.aborted && e.status === 401) invalidate();
        });
    };
    const storage = (e: StorageEvent) => {
      if (e.key === "easygas.auth.changed") {
        invalidate();
        refresh();
      }
      if (e.key === "easygas.cart") setCart(parseShoppingCart(e.newValue));
    };
    refresh();
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("storage", storage);
    window.addEventListener("easygas:unauthenticated", invalidate);
    return () => {
      live = false;
      controller?.abort();
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("storage", storage);
      window.removeEventListener("easygas:unauthenticated", invalidate);
    };
  }, [pathname, protectedPath]);
  async function signOut() {
    if (signingOut.current) return;
    signingOut.current = true;
    try {
      await api("logout", {});
      setUser(null);
      try {
        for (const key of Object.keys(sessionStorage))
          if (key.startsWith("easygas.")) sessionStorage.removeItem(key);
        localStorage.setItem("easygas.auth.changed", String(Date.now()));
      } catch {}
      window.location.assign("/");
    } catch (e: any) {
      signingOut.current = false;
      setToast(e.message);
    }
  }
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem("easygas.cart", JSON.stringify(cart));
      } catch {}
    }
  }, [cart, ready]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  function add(product: any, quantity = 1) {
    if (product.category === "Gas refills") {
      router.push("/gas-order");
      return;
    }

    if (
      !product.published ||
      !product.price_kobo ||
      product.available < quantity
    ) {
      setToast("This product is being prepared for sale.");
      return;
    }
    setCart((items) => {
      const existing = items.find((i) => i.productId === product.id);
      const next = existing
        ? items.map((i) =>
            i.productId === product.id
              ? {
                  ...i,
                  quantity: Math.min(
                    20,
                    product.available,
                    i.quantity + quantity,
                  ),
                }
              : i,
          )
        : [...items, { productId: product.id, quantity }];
      try {
        localStorage.setItem("easygas.cart", JSON.stringify(next));
      } catch {}
      return next;
    });
    setToast(`${product.name} added to your cart`);
  }
  const ctx = {
    catalogue,
    user,
    setUser,
    cart,
    setCart,
    add,
    toast: setToast,
    signOut,
  };
  return (
    <Context.Provider value={ctx}>
      {!workspace && <Header />}
      <CustomerFrame workspace={workspace} user={user} onLogout={signOut} cartCount={cart.reduce((n, i) => n + i.quantity, 0)}>
        <main id="main">
          {!ready || (protectedPath && !user) ? (
            <Loading page />
          ) : pathname === "/account" && workspace ? (
            <CustomerDashboard user={user} />
          ) : error ? (
            <div className="container page">
              <Notice type="error" message={error} />
              <button className="button" onClick={() => location.reload()}>
                Try again
              </button>
            </div>
          ) : !catalogue ? (
            <Loading page />
          ) : pathname === "/" ? (
            <Home />
          ) : [
              "/policies",
              "/privacy",
              "/terms",
              "/refund",
              "/cancellation",
              "/service-terms",
              "/warranty",
              "/credit-terms",
              "/loyalty-terms",
            ].includes(pathname) ? (
            <div className="container page">
              <LegalDocument
                kind={
                  (
                    {
                      "/terms": "terms",
                      "/privacy": "privacy",
                      "/refund": "refund",
                      "/cancellation": "cancellation",
                      "/service-terms": "service-booking",
                      "/warranty": "warranty",
                      "/credit-terms": "purchase-credit",
                      "/loyalty-terms": "loyalty",
                    } as Record<string, string>
                  )[pathname]
                }
              />
            </div>
          ) : pathname === "/gas-order" ? (
            <div className="container page">
              <GasOrder
                catalogue={catalogue}
                user={user}
                items={cart}
                onDone={() => setCart([])}
              />
            </div>
          ) : pathname === "/combined-checkout" ? (
            <div className="container page">
              <CombinedCheckout
                user={user}
                cart={cart}
                catalogue={catalogue}
                clearCart={() => setCart([])}
              />
            </div>
          ) : pathname === "/bookings" &&
            user &&
            ["customer", "commercial"].includes(user.role) ? (
            <div className="container page">
              <CustomerBookings key={user.id} user={user} />
            </div>
          ) : pathname === "/services" ||
            pathname.startsWith("/services/") ||
            pathname === "/bookings" ? (
            <div className="container page">
              <ProfessionalServices
                onBundle={(b) => {
                  const next = b.products.map((p: any) => ({
                    productId: p.productId,
                    quantity: p.quantity,
                  }));
                  localStorage.setItem("easygas.cart", JSON.stringify(next));
                  setCart(next);
                  router.push(
                    "/services/" +
                      b.config.serviceId +
                      "?bundle=" +
                      b.id +
                      "&bundleVersion=" +
                      b.version +
                      "&bundleTotal=" +
                      b.totalKobo +
                      "&bundleService=" +
                      (b.servicePriceKobo + b.calloutKobo),
                  );
                }}
                user={user}
                mode={pathname === "/bookings" ? "bookings" : "catalogue"}
                serviceId={pathname.split("/")[2]}
              />
            </div>
          ) : pathname === "/products" ? (
            <Products />
          ) : pathname.startsWith("/products/") ? (
            <ProductDetail id={pathname.split("/")[2]} />
          ) : pathname === "/notifications" ? (
            <div className="container page">
              <NotificationInbox />
            </div>
          ) : pathname === "/recurring" ? (
            <div className="container page">
              <RecurringOrders />
            </div>
          ) : pathname === "/purchase-credit" ? (
            <div className="container page">
              <CreditWallet />
            </div>
          ) : pathname === "/account-settings" ? (
            <div className="container page">
              <ThemeSettings />
              <CustomerTestimonials />
              <AccountSettings />
            </div>
          ) : pathname === "/support" ? (
            <div className="container page">
              <SupportDesk />
            </div>
          ) : pathname === "/consumption" ? (
            <div className="container page">
              <RefillProfiles key={`${user?.id}:${user?.role}:${user?.branchId}`} />
            </div>
          ) : [
              "/forgot-password",
              "/reset-password",
              "/verify-email",
              "/accept-invitation",
            ].includes(pathname) ? (
            <Recovery
              mode={
                pathname === "/forgot-password"
                  ? "recover"
                  : pathname === "/reset-password"
                    ? "reset"
                    : pathname === "/accept-invitation"
                      ? "invite"
                      : "verify"
              }
            />
          ) : pathname === "/login" || pathname === "/register" ? (
            <Auth register={pathname === "/register"} />
          ) : pathname === "/cart" || pathname === "/checkout" ? (
            <Cart checkout={pathname === "/checkout"} />
          ) : [
              "/account",
              "/orders",
              "/track",
              "/wallet",
              "/rewards",
              "/schedules",
              "/refill",
            ].includes(pathname) ? (
            <Account section={pathname} />
          ) : (
            <ContentPage path={pathname} />
          )}
        </main>
      </CustomerFrame>
      {!workspace && <Footer />}
      {!workspace && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <Link href="/">
            <House />
            Home
          </Link>
          <Link href="/products">
            <Flame />
            Products
          </Link>
          <Link href="/orders">
            <Package />
            Orders
          </Link>
          <Link href="/account">
            <UserRound />
            Account
          </Link>
        </nav>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
    </Context.Provider>
  );
}
function CustomerFrame({ workspace, user, onLogout, children, cartCount }: any) {
  return workspace ? (
    <CustomerWorkspace key={user.id} user={user} onLogout={onLogout} cartCount={cartCount}>
      {children}
    </CustomerWorkspace>
  ) : (
    children
  );
}
function Header() {
  const { user, cart, catalogue, signOut } = useShop();
  return (
    <PublicHeader
      user={user}
      catalogue={catalogue}
      cartCount={cart.reduce(
        (n: number, item: CartItem) => n + item.quantity,
        0,
      )}
      onLogout={signOut}
    />
  );
}
function Home() {
  const { catalogue, user } = useShop();
  preload(
    catalogue.website?.heroImage ?? "/assets/easygas-cooking-hero-v1.webp",
    { as: "image", fetchPriority: "high" },
  );
  return (
    <>
      <section className="hero">
        <div
          className="hero-photo"
          role="img"
          aria-label="Illustrative image of a woman cooking in her kitchen"
          style={
            catalogue.website?.heroImage
              ? { backgroundImage: `url("${catalogue.website.heroImage}")` }
              : undefined
          }
        />
        <div className="hero-wash" />
        <div className="container hero-layout">
          <div className="hero-copy">
            <span className="eyebrow">
              AFFORDABLE <i /> FLEXIBLE <i /> COMMITTED
            </span>
            <h1>
              {catalogue.website?.heroHeading ?? "Cooking gas delivered to"}{" "}
              <em>{catalogue.website?.heroEmphasis ?? "your door!"}</em>
            </h1>
            <h2>
              {catalogue.website?.heroSubheading ?? "More Cooking. Less Worry."}
            </h2>
            <p>
              Order the amount of cooking gas you need with home delivery across{" "}
              {catalogue.gas.locations.map((l: any) => l.name).join(", ")}.
            </p>
            <div className="hero-buttons">
              <a href="#quick-order" className="button big">
                Order Now <ArrowRight size={21} />
              </a>
              <Link href="/track" className="button secondary big">
                <Package size={22} />
                Track Order
              </Link>
            </div>
            <div className="hero-trust">
              <ShieldCheck size={17} />
              <span>Your kitchen is in good hands.</span>
            </div>
          </div>
          <GasOrder catalogue={catalogue} user={user} compact />
        </div>
        <div className="benefits">
          <div className="container benefit-grid">
            {[
              [Zap, "Quick Delivery", "Gas when you need it."],
              [ShieldCheck, "Safe & Reliable", "Handled with care."],
              [Tag, "Fair Prices", "More value for your kitchen."],
              [Headphones, "Friendly Support", "Always here to help."],
            ].map(([Icon, title, desc]: any) => (
              <div className="benefit" key={title}>
                <div className="benefit-icon">
                  <Icon size={24} />
                </div>
                <div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="container home-content">
        <div className="home-main">
          <section className="surface service-home">
            <span className="eyebrow">PROFESSIONAL GAS SERVICES</span>
            <h2>
              {catalogue.website?.serviceHeading ??
                "Care for your cooking equipment."}
            </h2>
            <div className="metric-grid">
              {(catalogue.homeServices ?? []).map((service: any) => (
                <article key={service.id}>
                  {service.image_id && (
                    <img
                      src={`/api/media/${service.image_id}`}
                      alt={service.name}
                      loading="lazy"
                      width="320"
                      height="160"
                    />
                  )}
                  <h3>{service.name}</h3>
                  <p>{service.config.description}</p>
                  <Link href={`/services/${service.id}`} className="text-link">
                    View options <ArrowRight size={16} />
                  </Link>
                </article>
              ))}
              {!catalogue.homeServices?.length && (
                <p>
                  Explore our service catalogue for current availability and
                  coverage.
                </p>
              )}
            </div>
            <p>
              Cooker servicing, installations and gas safety checks by eligible
              personnel.
            </p>
            <Link className="text-link" href="/services">
              Explore services →
            </Link>
          </section>
          <section className="product-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow small">FUEL YOUR EVERYDAY</span>
                <h2>Our Products</h2>
              </div>
              <div className="testimonial-controls">
                <Link className="text-link" href="/products">
                  View all products <ArrowRight size={16} />
                </Link>
                <button
                  className="icon-button"
                  aria-label="Previous products"
                  onClick={() =>
                    document
                      .getElementById("home-products")
                      ?.scrollBy({ left: -380, behavior: "auto" })
                  }
                >
                  ←
                </button>
                <button
                  className="icon-button"
                  aria-label="Next products"
                  onClick={() =>
                    document
                      .getElementById("home-products")
                      ?.scrollBy({ left: 380, behavior: "auto" })
                  }
                >
                  →
                </button>
              </div>
            </div>
            <ProductGrid compact />
          </section>
        </div>
        <aside className="home-aside">
          <AppPromo />
          <Link href="/rewards" className="reward-promo">
            <div className="gift-badge">
              <Gift size={44} />
            </div>
            <div>
              <h3>
                A little more,
                <br />
                with every refill.
              </h3>
              <p>Discover EasyGas Rewards</p>
              <span className="text-link">
                Explore rewards <ArrowRight size={14} />
              </span>
            </div>
          </Link>
        </aside>
        <HowItWorks compact />
      </div>
      <PublicTestimonials initialRows={catalogue.testimonials ?? []} />
      <section className="coverage-home container surface">
        <div>
          <span className="eyebrow">DELIVERED TO YOUR DOOR</span>
          <h2>
            Home delivery across{" "}
            {catalogue.gas.locations.map((l: any) => l.name).join(", ")}.
          </h2>
          <p>
            Enter your delivery address to confirm current coverage,
            availability and applicable delivery windows.
          </p>
          <Link className="button" href="/gas-order">
            Order Now <ArrowRight size={18} />
          </Link>
        </div>
        <div className="coverage-promises">
          <p>
            <MapPin /> Reliable coverage
          </p>
          <p>
            <ShieldCheck /> Handled with care
          </p>
          <p>
            <Building2 /> Serving homes & businesses
          </p>
        </div>
      </section>
    </>
  );
}
function QuickOrder() {
  const { catalogue, add } = useShop(),
    [tab, setTab] = useState("gas"),
    [selected, setSelected] = useState("refill-6"),
    [address, setAddress] = useState(""),
    [date, setDate] = useState(""),
    [window, setWindow] = useState(""),
    [message, setMessage] = useState("");
  const router = useRouter();
  const products = catalogue.products.filter((p: any) =>
    tab === "gas"
      ? p.category === "Gas refills"
      : tab === "cylinders"
        ? p.category === "Empty cylinders"
        : !["Gas refills", "Empty cylinders"].includes(p.category),
  );
  const product = products.find((p: any) => p.id === selected) ?? products[0];
  if (!product)
    return (
      <section id="quick-order" className="quick-order">
        <Empty icon={Package} title="Good energy is on the way.">
          Our catalogue is being prepared. Confirmed products will appear here.
          <br />
          <Link href="/products" className="button">
            Explore Products
          </Link>
        </Empty>
      </section>
    );
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!product.published || !product.price_kobo || !product.available) {
      setMessage(
        "Ordering is being prepared. Browse the catalogue while we confirm prices and availability.",
      );
      return;
    }
    add(product);
    try {
      sessionStorage.setItem(
        "easygas.deliveryDraft",
        JSON.stringify({ address, date, window }),
      );
    } catch {}
    router.push("/cart");
  }
  return (
    <form id="quick-order" className="quick-order" onSubmit={submit}>
      <div className="segmented">
        {[
          ["gas", "Order Gas"],
          ["cylinders", "Empty Cylinders"],
          ["accessories", "Accessories"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={tab === key ? "selected" : ""}
            onClick={() => {
              setTab(key);
              setMessage("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <label>
        {tab === "gas"
          ? "Choose your cylinder size"
          : tab === "cylinders"
            ? "Choose your empty cylinder size"
            : "Choose your kitchen essential"}
      </label>
      <div className="size-options">
        {products.map((p: any) => (
          <button
            type="button"
            key={p.id}
            className={
              product.id === p.id ? "size-option selected" : "size-option"
            }
            onClick={() => setSelected(p.id)}
          >
            <ProductArt product={p} />
            <strong>
              {p.size_kg ? `${p.size_kg}kg` : p.name.replace("Gas ", "")}
            </strong>
            <span>{money(p.price_kobo)}</span>
          </button>
        ))}
      </div>
      <div className="form-label-row">
        <label htmlFor="quick-address">Delivery Address</label>
        <Link href="/delivery" className="orange-link">
          <MapPin size={13} />
          Service areas
        </Link>
      </div>
      <div className="input-icon">
        <MapPin size={18} />
        <FormInput
          id="quick-address"
          placeholder="Enter your delivery address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>
      <label>Preferred Delivery Time</label>
      <div className="form-columns">
        <div className="input-icon">
          <CalendarDays size={17} />
          <FormInput
            aria-label="Delivery date"
            type="date"
            value={date}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <select
          aria-label="Delivery window"
          value={window}
          onChange={(e) => setWindow(e.target.value)}
        >
          <option value="">Select a time</option>
          {catalogue.windows.map((w: string) => (
            <option key={w}>{w}</option>
          ))}
        </select>
      </div>
      {message && (
        <p className="inline-message" role="status">
          {message}
        </p>
      )}
      <button className="button orange full">
        <ShoppingCart size={19} />{" "}
        {product.published ? "Add to Cart" : "Check Availability"}
      </button>
      <p className="secure-note">
        <ShieldCheck size={15} />
        Careful handling · Clear pricing · Local delivery
      </p>
    </form>
  );
}
function ProductGrid({
  compact = false,
  filter = "",
  category = "All",
}: {
  compact?: boolean;
  filter?: string;
  category?: string;
}) {
  const { catalogue, add } = useShop();
  const products = catalogue.products.filter(
    (p: any) =>
      (category === "All" || p.category === category) &&
      (!compact || p.published) &&
      `${p.name} ${p.description}`.toLowerCase().includes(filter.toLowerCase()),
  );
  return products.length ? (
    <div
      id={compact ? "home-products" : undefined}
      className={`product-grid ${compact ? "compact" : ""}`}
    >
      {products.map((p: any) => (
        <article key={p.id} className="product-card">
          <Link href={`/products/${p.id}`} className="product-image-link">
            <ProductArt product={p} />
          </Link>
          <div className="product-card-bottom">
            <Link href={`/products/${p.id}`}>
              <h3>{p.name}</h3>
              <strong className={!p.price_kobo ? "unpriced" : ""}>
                {money(p.price_kobo)}
              </strong>
            </Link>
            <button
              className="add-product"
              aria-label={`Add ${p.name} to cart`}
              disabled={!p.published || !p.price_kobo || !p.available}
              title={!p.published ? "Not yet available for sale" : !p.price_kobo ? "Price not configured" : !p.available ? "Out of stock" : "Add to cart"}
              onClick={() => add(p)}
            >
              <ShoppingCart size={17} />
            </button>
          </div>
          {!compact && (
            <p className="availability">
              {!p.published ? "Not yet available for sale" : !p.price_kobo ? "Price not configured" : p.available > 0 ? "Available for delivery" : "Out of stock"}
            </p>
          )}
        </article>
      ))}
    </div>
  ) : (
    <Empty
      icon={Search}
      title={
        filter || category !== "All"
          ? "No products found"
          : "Our catalogue is being prepared."
      }
    >
      {filter || category !== "All"
        ? "Try another search or category."
        : "Confirmed products and availability will appear here."}
    </Empty>
  );
}
function HowItWorks({ compact = false }: { compact?: boolean }) {
  return (
    <section
      className={`how-it-works ${compact ? "compact" : ""}`}
      id="how-it-works"
    >
      <div className="section-heading">
        <h2>How It Works</h2>
        {!compact && <span className="eyebrow">A SIMPLER WAY TO REFILL</span>}
      </div>
      <div className="steps">
        {[
          [
            Package,
            "Choose your products",
            "Find the right refill and kitchen essentials.",
          ],
          [MapPin, "Tell us where", "Choose your address and delivery window."],
          [
            CreditCard,
            "Confirm your order",
            "Review your total and available payment method.",
          ],
          [
            Truck,
            "We deliver to you",
            "Sit back. We’ll take care of your gas.",
          ],
        ].map(([Icon, title, text]: any, i) => (
          <div className="step" key={title}>
            <div className="step-icon">
              <span>{i + 1}</span>
              <Icon size={27} />
            </div>
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
            {i < 3 && <ArrowRight className="step-arrow" size={18} />}
          </div>
        ))}
      </div>
    </section>
  );
}
function AppPromo() {
  return (
    <div className="app-promo" aria-label="Illustrative account preview">
      <div className="phone-mock">
        <div className="phone-notch" />
        <div className="phone-wordmark">
          easy<span>gas</span>
          <Flame size={17} />
        </div>
        <p>More Cooking. Less Worry.</p>
        <div className="phone-tiles">
          {[
            [Flame, "Order Gas"],
            [Package, "My Orders"],
            [Wallet, "My Wallet"],
            [Gift, "Rewards"],
          ].map(([Icon, text]: any) => (
            <div key={text}>
              <Icon size={20} />
              <small>{text}</small>
            </div>
          ))}
        </div>
        <img
          src="/assets/cylinder-illustration.png"
          alt="Illustrative EasyGas cylinder"
        />
      </div>
      <div className="app-promo-copy">
        <span className="eyebrow">ALWAYS WITH YOU</span>
        <h2>
          Your kitchen.
          <br />
          <span>In your pocket.</span>
        </h2>
        <p>Order, track and manage your refills from one simple account.</p>
        <Link href="/account" className="button white small-button">
          Explore your account <ArrowRight size={15} />
        </Link>
        <small>Illustrative account preview · Native app coming soon</small>
      </div>
    </div>
  );
}
function Products() {
  const { catalogue } = useShop();
  const urlQuery = useSearchParams().get("q") ?? "";
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("All");
  useEffect(() => {
    setQuery(urlQuery);
    setCategory("All");
  }, [urlQuery]);
  return (
    <div className="container page">
      <div className="page-heading">
        <span className="eyebrow">GOOD ENERGY STARTS HERE</span>
        <h1>Everything for your kitchen.</h1>
        <p>Cooking gas, reliable essentials and a little less worry.</p>
      </div>
      <div className="catalogue-toolbar">
        <div className="input-icon search-input">
          <Search size={19} />
          <FormInput
            aria-label="Search products"
            placeholder="Search products…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="category-tabs">
          {["All", ...(catalogue.categories ?? [])].map((c) => (
            <button
              className={category === c ? "active" : ""}
              onClick={() => setCategory(c)}
              key={c}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <ProductGrid filter={query} category={category} />
      <p className="asset-note">
        Product visuals are illustrations. Selling prices and availability are
        confirmed by EasyGas before ordering opens.
      </p>
    </div>
  );
}
function ProductDetail({ id }: { id: string }) {
  const { user: recommendationUser } = useShop();
  const { catalogue, add } = useShop(),
    [qty, setQty] = useState(1),
    p = catalogue.products.find((p: any) => p.id === id);
  if (!p)
    return (
      <div className="container page">
        <Empty title="Product not found">
          Explore our <Link href="/products">catalogue</Link> instead.
        </Empty>
      </div>
    );
  return (
    <div className="container page">
      <Link className="text-link" href="/products">
        <ArrowLeft size={16} />
        Back to products
      </Link>
      <div className="product-detail">
        <div className="detail-art">
          <ProductArt product={p} large />
          <small>
            {p.image_id ? "Product photograph" : "Illustrative product visual"}
          </small>
          <div className="service-grid">
            {p.images?.slice(1).map((m: any) => (
              <img
                className="catalogue-photo"
                key={m.id}
                src={"/api/media/" + m.id}
                alt={m.alt}
              />
            ))}
          </div>
        </div>
        <div className="detail-copy">
          {recommendationUser && <Recommendations productId={id} />}
          <span className="eyebrow">{p.category}</span>
          <h1>{p.name}</h1>
          <div className="detail-price">{money(p.price_kobo)}</div>
          <p>{p.description}</p>
          <p>SKU: {p.sku}</p>
          {p.attributes?.brand && (
            <p>
              Brand: {p.attributes.brand} · Model: {p.attributes.model}
            </p>
          )}
          {p.attributes?.specifications && <p>{p.attributes.specifications}</p>}
          {p.attributes?.warranty && <p>Warranty: {p.attributes.warranty}</p>}
          {p.attributes?.installationRequired && (
            <p>Professional installation is required.</p>
          )}
          <Compatibility productId={p.id} />
          {catalogue.products
            .filter(
              (v: any) =>
                (p.parent_id
                  ? v.parent_id === p.parent_id || v.id === p.parent_id
                  : v.parent_id === p.id) && v.id !== p.id,
            )
            .map((v: any) => (
              <Link
                className="button secondary"
                key={v.id}
                href={"/products/" + v.id}
              >
                {v.name} · {money(v.price_kobo)}
              </Link>
            ))}
          <div className="detail-benefits">
            <span>
              <ShieldCheck />
              Careful handling
            </span>
            <span>
              <Truck />
              Local delivery
            </span>
            <span>
              <Headphones />
              Here to help
            </span>
          </div>
          <Notice
            message={
              p.published && p.available
                ? "Available for delivery."
                : !p.published ? "This product is not yet available for sale." : !p.price_kobo ? "Pricing has not been configured for this product." : "This product is currently out of stock."
            }
          />
          <div className="purchase-controls">
            <div className="quantity">
              <button
                aria-label="Reduce quantity"
                onClick={() => setQty(Math.max(1, qty - 1))}
              >
                <Minus size={16} />
              </button>
              <span>{qty}</span>
              <button
                aria-label="Increase quantity"
                onClick={() => setQty(Math.min(20, qty + 1))}
              >
                <Plus size={16} />
              </button>
            </div>
            <button
              className="button"
              disabled={!p.published || !p.available || !p.price_kobo}
              onClick={() => add(p, qty)}
            >
              <ShoppingCart size={18} />
              Add to Cart
            </button>
          </div>
          <div className="safety-note">
            <ShieldCheck size={20} />
            <div>
              <h3>A little care goes a long way.</h3>
              <p>{p.safety}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function Auth({ register }: { register: boolean }) {
  const [phoneLogin,setPhoneLogin]=useState(false);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const { setUser, user, toast } = useShop(),
    router = useRouter();
  const search = useSearchParams();
  const returnTo = safeCustomerReturn(search.get("returnTo"));
  useEffect(() => {
    if (user)
      router.replace(
        ["customer", "commercial"].includes(user.role)
          ? safeCustomerReturn(
              new URLSearchParams(window.location.search).get("returnTo"),
            )
          : "/admin",
      );
  }, [user, router]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const r = await api(register ? "register" : phoneLogin ? "phone.login" : "login", values);
      const me = await api("me");
      const referralCode = register
        ? new URLSearchParams(window.location.search).get("ref")
        : null;
      if (referralCode && /^[a-f0-9]{32}$/.test(referralCode)) {
        try {
          await api("rewards.referral.attribute", { code: referralCode });
        } catch {
          toast(
            "Your account was created. The referral could not be applied; review it in EasyRewards before your first purchase.",
          );
        }
      }
      try {
        localStorage.setItem("easygas.auth.changed", String(Date.now()));
      } catch {}
      setUser(me.user);
      router.push(
        !["customer", "commercial"].includes(r.role)
          ? "/admin"
          : safeCustomerReturn(
              new URLSearchParams(window.location.search).get("returnTo"),
            ),
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page container">
      <div className="auth-story">
        <span className="eyebrow">WELCOME TO EASYGAS</span>
        <h1>
          Good food starts
          <br />
          with good energy.
        </h1>
        <p>
          Your refills, your orders, your kitchen.
          <br />
          All in one place.
        </p>
        <img
          src="/assets/cylinder-illustration.png"
          alt="Illustrative green EasyGas cylinder"
        />
      </div>
      <form className="auth-card" onSubmit={submit}>
        <span className="round-icon">
          <UserRound />
        </span>
        <h1>{register ? "Make yourself at home." : "Welcome back."}</h1>
        <p>
          {register
            ? "Create your EasyGas account."
            : "Sign in and let’s keep you cooking."}
        </p>
        {register && (
          <label>
            Full name
            <FormInput name="name" autoComplete="name" required minLength={2} />
          </label>
        )}
        {!register&&<label><FormInput type="checkbox" checked={phoneLogin} onChange={e=>setPhoneLogin(e.target.checked)}/> Sign in with my activated phone number</label>}
        <label>
          {phoneLogin&&!register?'Phone number':'Email address'}
          <FormInput name={phoneLogin&&!register?'phone':'email'} type={phoneLogin&&!register?'tel':'email'} autoComplete={phoneLogin&&!register?'tel':'email'} required />
        </label>
        <label>
          Password
          <FormInput
            name="password"
            type="password"
            autoComplete={register ? "new-password" : "current-password"}
            required
            minLength={PASSWORD_MIN_LENGTH}
          />
        </label>
        <small>Use at least {PASSWORD_MIN_LENGTH} characters.</small>
        {error && <Notice type="error" message={error} />}
        <button className="button full" disabled={busy}>
          {busy ? "Please wait…" : register ? "Create Account" : "Sign In"}
          <ArrowRight size={18} />
        </button>
        <p className="auth-switch">
          {register ? "Already have an account?" : "New to EasyGas?"}{" "}
          <Link href={customerAuthHref(!register, returnTo)}>
            {register ? "Sign in" : "Create an account"}
          </Link>
        </p>
        <Link href="/forgot-password">Forgot your password?</Link>
      </form>
    </div>
  );
}
function Cart({ checkout = false }: { checkout?: boolean }) {
  const { cart, setCart, catalogue, user } = useShop(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [order, setOrder] = useState<any>(null),
    [draft, setDraft] = useState({ address: "", date: "", window: "" }),
    [savedAddresses, setSavedAddresses] = useState<any[]>([]),
    [selectedAddress, setSelectedAddress] = useState<any>(null),
    [key] = useState(() => crypto.randomUUID());
  const cardEnabled = useCardCheckout(user?.id);
  useEffect(() => {
    try {
      const d = JSON.parse(
        sessionStorage.getItem("easygas.deliveryDraft") ?? "{}",
      );
      setDraft({
        address: d.address ?? "",
        date: d.date ?? "",
        window: d.window ?? "",
      });
    } catch {}
  }, []);
  useEffect(() => {
    let active = true;
    setSavedAddresses([]);
    setSelectedAddress(null);
    if (user)
      api("account.profile")
        .then((d) => {
          if (active) {
            setSavedAddresses(d.addresses);
            setSelectedAddress(
              d.addresses.find(
                (a: any) => a.is_default && a.location_available,
              ) ?? null,
            );
          }
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [user?.id]);
  const items = cart
      .map((i: CartItem) => ({
        ...i,
        product: catalogue.products.find((p: any) => p.id === i.productId),
      }))
      .filter((i: any) => i.product),
    total = items.reduce(
      (s: number, i: any) => s + Number(i.product.price_kobo ?? 0) * i.quantity,
      0,
    );
  const estimateAvailable =
    items.length === cart.length &&
    items.length > 0 &&
    items.every(
      (i: any) =>
        i.product.published &&
        Number(i.product.price_kobo) > 0 &&
        Number(i.product.available) >= i.quantity,
    );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const d = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const payload = {
        items: cart,
        address: {
          name: d.name,
          phone: d.phone,
          street: d.street,
          zone: d.zone,
        },
        date: d.date,
        window: d.window,
        ...(d.rewardOfferId ? { rewardOfferId: String(d.rewardOfferId) } : {}),
        ...(d.rewardPoints ? { rewardPoints: Number(d.rewardPoints) } : {}),
        paymentMethod: d.paymentMethod ?? "cash_on_delivery",
        instructions: d.instructions ?? "",
      };
      let requestKey = key;
      const fingerprint = JSON.stringify(payload);
      try {
        const pending = JSON.parse(
          sessionStorage.getItem("easygas.pendingCheckout") ?? "null",
        );
        if (pending?.fingerprint === fingerprint) requestKey = pending.key;
        sessionStorage.setItem(
          "easygas.pendingCheckout",
          JSON.stringify({ fingerprint, key: requestKey }),
        );
      } catch {}
      const o = await api("checkout", {
        ...payload,
        idempotencyKey: requestKey,
      });
      try {
        sessionStorage.removeItem("easygas.pendingCheckout");
        sessionStorage.removeItem("easygas.deliveryDraft");
      } catch {}
      setOrder(o);
      setCart([]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (order)
    return (
      <div className="container page confirmation">
        <span className="round-icon">
          <CheckCircle2 />
        </span>
        <h1>Your order is in.</h1>
        <p>
          Thanks for choosing EasyGas. Your order reference is{" "}
          <strong>{order.reference}</strong>.
        </p>
        <Notice message={order.payment_status === "verified" ? "Payment is recorded in the verified ledger." : order.payment_method === "card" ? "Your order is awaiting secure card payment." : "Payment is due on delivery. It has not been marked as paid."} />
        <OrderCardPayment order={order} />
        <Link href="/track" className="button">
          Track your order <ArrowRight size={18} />
        </Link>
      </div>
    );
  return (
    <div className="container page">
      <div className="page-heading">
        <span className="eyebrow">A LITTLE CLOSER TO COOKING</span>
        <h1>{checkout ? "Make it yours." : "Your Cart"}</h1>
        <p>
          {checkout
            ? "A few details and we’ll take it from here."
            : "Your next great meal starts here."}
        </p>
      </div>
      {!items.length ? (
        <Empty
          icon={ShoppingCart}
          title="Your cart is waiting for good things."
        >
          <Link className="button" href="/products">
            Explore Products <ArrowRight size={16} />
          </Link>
        </Empty>
      ) : (
        <div className="checkout-layout">
          <div>
            {items.map((i: any) => (
              <div className="cart-row" key={i.productId}>
                <ProductArt product={i.product} />
                <div>
                  <h3>{i.product.name}</h3>
                  <strong>{money(i.product.price_kobo)}</strong>
                  {!i.product.published && (
                    <p className="muted">Currently unavailable</p>
                  )}
                </div>
                <div className="quantity">
                  <button
                    aria-label={`Reduce ${i.product.name}`}
                    onClick={() =>
                      setCart(
                        cart.map((x: CartItem) =>
                          x.productId === i.productId
                            ? { ...x, quantity: Math.max(1, x.quantity - 1) }
                            : x,
                        ),
                      )
                    }
                  >
                    <Minus size={15} />
                  </button>
                  <span>{i.quantity}</span>
                  <button
                    aria-label={`Increase ${i.product.name}`}
                    onClick={() =>
                      setCart(
                        cart.map((x: CartItem) =>
                          x.productId === i.productId
                            ? { ...x, quantity: Math.min(20, x.quantity + 1) }
                            : x,
                        ),
                      )
                    }
                  >
                    <Plus size={15} />
                  </button>
                </div>
                <button
                  className="icon-button"
                  aria-label={`Remove ${i.product.name}`}
                  onClick={() =>
                    setCart(
                      cart.filter((x: CartItem) => x.productId !== i.productId),
                    )
                  }
                >
                  <X size={18} />
                </button>
              </div>
            ))}
            {checkout &&
              (user ? (
                <form
                  key={selectedAddress?.id ?? "manual-address"}
                  className="surface checkout-form"
                  onSubmit={submit}
                >
                  <h2>Where are we delivering?</h2>
                  {savedAddresses.length > 0 && (
                    <label>
                      Saved address
                      <select
                        value={selectedAddress?.id ?? ""}
                        onChange={(e) =>
                          setSelectedAddress(
                            savedAddresses.find(
                              (a) => a.id === e.target.value,
                            ) ?? null,
                          )
                        }
                      >
                        <option value="">Enter an address</option>
                        {savedAddresses.map((a) => (
                          <option
                            key={a.id}
                            value={a.id}
                            disabled={!a.location_available}
                          >
                            {a.label} · {a.street}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <div className="form-columns">
                    <label>
                      Recipient name
                      <FormInput
                        name="name"
                        required
                        defaultValue={user.name}
                        minLength={2}
                      />
                    </label>
                    <label>
                      Phone number
                      <FormInput
                        name="phone"
                        defaultValue={selectedAddress?.phone ?? ""}
                        type="tel"
                        required
                        placeholder="08012345678"
                      />
                    </label>
                  </div>
                  <AddressAreaFields
                    key={selectedAddress?.id ?? `new:${draft.address}`}
                    street={selectedAddress?.street ?? draft.address}
                    area={selectedAddress?.zone ?? ""}
                    areaLabel="Delivery area"
                    areas={catalogue.zones.map((z: string) => ({
                      id: z,
                      name: z,
                    }))}
                  />
                  <div className="form-columns">
                    <label>
                      Delivery date
                      <FormInput
                        name="date"
                        defaultValue={draft.date}
                        type="date"
                        required
                        min={new Date().toISOString().slice(0, 10)}
                      />
                    </label>
                    <label>
                      Delivery window
                      <select
                        name="window"
                        required
                        defaultValue={draft.window || catalogue.windows[0]}
                      >
                        {catalogue.windows.map((w: string) => (
                          <option key={w}>{w}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label>
                    Delivery instructions{" "}
                    <span className="muted">(optional)</span>
                    <textarea name="instructions" maxLength={500} />
                  </label>
                  <RewardCheckoutField />
                  <h3>Payment</h3>
                  <label>
                    Payment method
                    <select name="paymentMethod" required>
                      {cardEnabled && <option value="card">Credit / debit card · secure Paystack checkout (sandbox)</option>}
                      {catalogue.codEnabled && (
                        <option value="cash_on_delivery">
                          Cash on delivery — verified after collection
                        </option>
                      )}
                      {catalogue.walletEnabled && (
                        <option value="wallet">
                          Purchase credit wallet — full balance required
                        </option>
                      )}
                    </select>
                  </label>
                  {!catalogue.codEnabled && !catalogue.walletEnabled && !cardEnabled && (
                    <Notice message="No payment method is currently enabled." />
                  )}
                  {error && <Notice type="error" message={error} />}
                  <button
                    className="button full"
                    disabled={
                      busy ||
                      !estimateAvailable ||
                      !catalogue.orderingEnabled ||
                      (!catalogue.codEnabled && !catalogue.walletEnabled && !cardEnabled)
                    }
                  >
                    {busy ? "Placing your order…" : "Place Order"}
                    <ArrowRight size={18} />
                  </button>
                </form>
              ) : (
                <Notice message="Please sign in before placing your order." />
              ))}
          </div>
          <aside className="surface order-summary">
            <h2>Order Summary</h2>
            <Link href="/services" className="text-link">
              Add a professional service →
            </Link>
            <div>
              <span>Subtotal</span>
              <strong>
                {estimateAvailable ? money(total) : "Unavailable"}
              </strong>
            </div>
            <div>
              <span>Delivery fee</span>
              <strong>{money(catalogue.deliveryFee)}</strong>
            </div>
            <div className="total">
              <span>Total</span>
              <strong>
                {estimateAvailable
                  ? money(total + Number(catalogue.deliveryFee))
                  : "Awaiting available products"}
              </strong>
            </div>
            {!estimateAvailable && (
              <Notice message="Some products are unavailable or unpriced. Update your cart before an order total can be confirmed." />
            )}
            {!catalogue.orderingEnabled && (
              <Notice message="Online ordering is being prepared. Your cart is saved on this device." />
            )}
            {!checkout ? (
              <Link
                href={user ? "/checkout" : "/login?returnTo=%2Fcheckout"}
                className="button full"
              >
                {user ? "Continue to Checkout" : "Sign in to Checkout"}
                <ArrowRight size={18} />
              </Link>
            ) : !user ? (
              <Link href="/login?returnTo=%2Fcheckout" className="button full">
                Sign in
              </Link>
            ) : null}
            <p className="secure-note">
              <ShieldCheck size={16} />
              Prices and stock are checked again at checkout.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
function Account({ section }: { section: string }) {
  const cancelKeys = useRef<Record<string, string>>({});
  const { user, catalogue, toast } = useShop(),
    router = useRouter();
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const trackingOrderId = useSearchParams().get("orderId") ?? "";
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    if (user && section !== "/refill") {
      const action = ["/orders", "/track"].includes(section)
        ? "orders"
        : section === "/schedules"
          ? "schedules"
          : "wallet";
      api(
        action === "orders" && trackingOrderId
          ? `orders?id=${encodeURIComponent(trackingOrderId)}`
          : action,
      )
        .then((next) => {
          if (active) setData(next);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    }
    return () => {
      active = false;
    };
  }, [section, user?.id, user?.role, user?.branchId, trackingOrderId]);
  const tracking = useTrackingOrders(
    Boolean(user) && ["/orders", "/track"].includes(section),
    trackingOrderId,
    `${user?.id}:${user?.role}:${user?.branchId}`,
  );
  useEffect(() => {
    if (tracking.orders) setData(tracking.orders);
  }, [tracking.orders]);
  if (!user)
    return (
      <div className="container page">
        <Empty icon={UserRound} title="Your kitchen, all in one place.">
          Sign in to see your orders, purchase credit, and refill plans.
          <br />
          <Link className="button" href="/login">
            Sign In <ArrowRight size={16} />
          </Link>
        </Empty>
      </div>
    );
  if (section === "/refill")
    return <div className="container page"><RefillProfiles smart key={`${user.id}:${user.role}:${user.branchId}`} /></div>;
  async function createSchedule(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const d = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api("schedule.create", {
        ...d,
        intervalDays: Number(d.intervalDays),
      });
      setData(await api("schedules"));
      toast("Your refill plan has been saved.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const nav = customerNavigation.map((i) => [i.href, i.label]);
  return (
    <div className="container page account-layout customer-legacy-content">
      <section className="account-content">
        {error && <Notice type="error" message={error} />}
        <div className="page-heading">
          <span className="eyebrow">YOUR EASYGAS</span>
          <h1>
            {section === "/account"
              ? "More cooking. Less admin."
              : section === "/track"
                ? "Track your order"
                : nav.find((n) => n[0] === section)?.[1]}
          </h1>
        </div>
        {["/orders", "/track"].includes(section) && (
          <TrackingConnection tracking={tracking} />
        )}
        {section === "/orders" && <DocumentLibrary />}
        {!data ? (
          <Loading />
        ) : ["/orders", "/track"].includes(section) ? (
          data.length ? (
            <div className="order-list">
              {data.map((o: any) => (
                <article className="surface customer-order" key={o.id}>
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">{o.reference}</span>
                      <h3>
                        {(o.gas_lines ?? [])
                          .map(
                            (g: any) =>
                              `${Number(g.grams) / 1000} kg gas (${Number(g.capacity_grams) / 1000} kg cylinder)`,
                          )
                          .join(", ")}{" "}
                        {o.items
                          .map((i: any) => `${i.quantity} × ${i.name}`)
                          .join(", ")}
                      </h3>
                    </div>
                    <span className={`status ${o.status}`}>
                      {trackingLabels[o.status] ??
                        o.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p>
                    {o.address.street}, {o.address.zone}
                  </p>
                  <div className="order-meta">
                    <span>
                      <CalendarDays size={16} />
                      {o.delivery_date} · {o.delivery_window}
                    </span>
                    <strong>{money(o.total_kobo)}</strong>
                  </div>
                  <TrackingDetails order={o} />
                  <div className="tracking-timeline">
                    {o.events.map((e: any, i: number) => (
                      <div key={i}>
                        <CheckCircle2 size={18} />
                        <strong>{trackingEventLabel(e)}</strong>
                        <small>
                          {new Date(e.created_at).toLocaleString("en-NG", {
                            timeZone: "Africa/Lagos",
                          })}
                        </small>
                      </div>
                    ))}
                  </div>
                  {o.confirmation_code &&
                    !["delivered", "cancelled"].includes(o.status) && (
                      <Notice
                        message={`Delivery confirmation code: ${o.confirmation_code}. Share this with your driver only after receiving all your items.`}
                      />
                    )}
                  <p className="muted">
                    Payment: {o.payment_status}. Live driver location is not
                    available.
                  </p>
                  {o.payment_status === "verified" &&
                    o.status === "delivered" && (
                      <Link
                        className="button secondary"
                        href={`/account-settings?testimonialOrder=${encodeURIComponent(o.id)}#testimonials`}
                      >
                        Share your experience
                      </Link>
                    )}
                  {o.payment_status === "verified" &&
                    o.status === "delivered" && (
                      <>
                        <PartialRefundForm orderId={o.id} />
                        <ActionForm
                          action="refund.request"
                          title="Request a refund as purchase credit"
                          fields={[
                            {
                              name: "orderId",
                              label: "",
                              type: "hidden",
                              value: o.id,
                            },
                            {
                              name: "reason",
                              label: "Reason (at least 10 characters)",
                              type: "textarea",
                            },
                            {
                              name: "acceptWalletCredit",
                              label:
                                "I agree to receive the refund as purchase credit if approved",
                              type: "checkbox",
                            },
                          ]}
                          submit="Submit refund request"
                        />
                      </>
                    )}
                  {o.status === "placed" && (
                    <button
                      className="button secondary"
                      onClick={async () => {
                        try {
                          await api("order.transition", {
                            id: o.id,
                            operationKey: (cancelKeys.current[
                              `${o.id}:${o.tracking_version}`
                            ] ??= crypto.randomUUID()),
                            version: o.tracking_version,
                            status: "cancelled",
                            note: "Cancelled by the customer before acceptance.",
                          });
                          setData(await api("orders"));
                        } catch (e: any) {
                          setError(e.message);
                        }
                      }}
                    >
                      Cancel Order
                    </button>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <Empty icon={Truck} title="Your first delivery is still ahead.">
              Your real order updates will appear here after you place an order.
              <br />
              <Link href="/products" className="button">
                Explore Products
              </Link>
            </Empty>
          )
        ) : section === "/wallet" ? (
          <CustomerWallet data={data} />
        ) : section === "/rewards" ? (
          <EasyRewards />
        ) : section === "/schedules" ? (
          <>
            <Notice message="Refill plans save your preferred dates. They do not automatically charge you or dispatch gas; each order requires confirmation." />
            {data.map((s: any) => (
              <div key={s.id} className="surface schedule-row">
                <div>
                  <h3>{s.product_name}</h3>
                  <p>
                    Every {s.interval_days} days · Next:{" "}
                    {new Date(s.next_date).toLocaleDateString("en-NG")} ·{" "}
                    {s.status}
                  </p>
                </div>
                {s.status !== "cancelled" && (
                  <button
                    className="button secondary"
                    onClick={async () => {
                      try {
                        await api("schedule.update", {
                          id: s.id,
                          status: s.status === "paused" ? "active" : "paused",
                        });
                        setData(await api("schedules"));
                      } catch (e: any) {
                        setError(e.message);
                      }
                    }}
                  >
                    {s.status === "paused" ? "Resume" : "Pause"}
                  </button>
                )}
              </div>
            ))}
            <form className="surface product-form" onSubmit={createSchedule}>
              <h2>Plan your next refill</h2>
              <label>
                Gas refill
                <select name="productId" required>
                  <option value="">Choose an available product</option>
                  {catalogue.products
                    .filter(
                      (p: any) => p.published && p.category === "Gas refills",
                    )
                    .map((p: any) => (
                      <option value={p.id} key={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </label>
              <div className="form-columns">
                <label>
                  Frequency
                  <select name="intervalDays">
                    {[7, 14, 28, 42].map((d) => (
                      <option key={d} value={d}>
                        Every {d} days
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  First refill date
                  <FormInput
                    name="nextDate"
                    type="date"
                    min={new Date(Date.now() + 86400000)
                      .toISOString()
                      .slice(0, 10)}
                    required
                  />
                </label>
              </div>
              <button className="button" disabled={busy}>
                Save Refill Plan <CalendarDays size={17} />
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="welcome-account">
              <div>
                <h2>
                  A little less worry.
                  <br />A lot more cooking.
                </h2>
                <p>Your next refill is just a few taps away.</p>
                <Link href="/products" className="button white">
                  Order Gas <ArrowRight size={18} />
                </Link>
              </div>
              <img
                src="/assets/cylinder-illustration.png"
                alt="Illustrative cylinder"
              />
            </div>
            <div className="account-shortcuts">
              {[
                [Package, "Your orders", "/orders"],
                [Wallet, money(data.balanceKobo), "/wallet"],
                [Gift, `${data.points} points`, "/rewards"],
                [CalendarDays, "Plan a refill", "/schedules"],
              ].map(([Icon, text, href]: any) => (
                <Link href={href} className="surface" key={href}>
                  <Icon />
                  <h3>{text}</h3>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
            <Empty icon={Leaf} title="Your smart refill journey starts here.">
              After enough verified purchases, we can estimate when you may need
              your next refill.
            </Empty>
          </>
        )}
      </section>
    </div>
  );
}
function ContentPage({ path }: { path: string }) {
  const [sent, setSent] = useState(false),
    [supportOpen, setSupportOpen] = useState(false);
  const { catalogue, user } = useShop();
  const faqs = [
    [
      "How do I order cooking gas?",
      "Choose an available gas refill, add your delivery address, select a delivery window and review the final total at checkout.",
    ],
    [
      "Where do you deliver?",
      `Delivery areas are currently configured for ${catalogue.zones.join(", ")}. Coverage is checked again before an order can be placed.`,
    ],
    [
      "Can I use my own cylinder?",
      "Refill products are for eligible customer-owned cylinders. Your cylinder must meet safety requirements before it can be refilled.",
    ],
    [
      "How do refill estimates work?",
      "Smart Refill uses verified purchase intervals for a particular cylinder. It is an estimate, not a physical gas measurement.",
    ],
    [
      "Are online payments available?",
      "Only payment methods approved and enabled by the business appear at checkout. A successful screen does not count as verification of payment.",
    ],
  ];
  if (path === "/how-it-works")
    return (
      <div className="container page">
        <div className="page-heading">
          <span className="eyebrow">
            LESS RUNNING AROUND. MORE MEALS TOGETHER.
          </span>
          <h1>Good energy. Delivered simply.</h1>
          <p>From choosing your refill to opening your door.</p>
        </div>
        <HowItWorks />
        <div className="surface info-callout">
          <ShieldCheck size={40} />
          <div>
            <h2>Safety at every step.</h2>
            <p>
              Keep cylinders upright and ventilated. Only use compatible
              fittings, and arrange installation through a qualified
              professional.
            </p>
          </div>
          <Link href="/products" className="button">
            Explore Products
          </Link>
        </div>
      </div>
    );
  if (path === "/business")
    return (
      <div className="container page">
        <div className="business-hero">
          <span className="eyebrow">ENERGY THAT MEANS BUSINESS</span>
          <h1>
            Keep your kitchen cooking.
            <br />
            <em>We’ll handle the gas.</em>
          </h1>
          <p>
            From neighbourhood restaurants to busy commercial kitchens,
            <br />
            plan your energy needs with EasyGas.
          </p>
          <Link className="button" href="/contact">
            Talk about your supply <ArrowRight size={18} />
          </Link>
        </div>
        <div className="three-cards">
          {[
            [
              Utensils,
              "For your restaurant",
              "Gas supply that fits the rhythm of your kitchen.",
            ],
            [
              Building2,
              "For your business",
              "Discuss multiple locations and commercial requirements.",
            ],
            [
              CalendarDays,
              "For your schedule",
              "Plan ahead with preferred delivery dates.",
            ],
          ].map(([Icon, title, text]: any) => (
            <div className="surface" key={title}>
              <Icon className="green" size={30} />
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </div>
    );
  if (path === "/about")
    return (
      <div className="container page">
        <div className="about-layout">
          <div>
            <span className="eyebrow">AFFORDABLE. FLEXIBLE. COMMITTED.</span>
            <h1>
              A little gas.
              <br />A whole lot of possibility.
            </h1>
            <p>
              From the first cup of tea to the family meal at the end of the
              day, cooking is part of what makes a house a home.
            </p>
            <p>
              EasyGas Energy Solutions is building a simpler way to buy cooking
              gas and kitchen essentials in Nigeria, with clear pricing,
              thoughtful service and care at every step.
            </p>
            <h2>More Cooking. Less Worry.</h2>
            <Link href="/products" className="button">
              Get to know our products <ArrowRight size={18} />
            </Link>
          </div>
          <figure>
            <img
              src="/assets/delivery-illustration.png"
              alt="Illustrative gas delivery at a home"
            />
            <figcaption>Illustrative imagery</figcaption>
          </figure>
        </div>
      </div>
    );
  if (path === "/help" || path === "/contact")
    return (
      <div className="container page">
        <div className="page-heading">
          <span className="eyebrow">HERE TO HELP</span>
          <h1>A question? Let’s sort it out.</h1>
          <p>Find an answer, or send your support request from your account.</p>
        </div>
        <div className="help-layout">
          <section>
            <div className="surface contact-card">
              <h2>Contact EasyGas</h2>
              <ContactDetails />
            </div>
            {faqs.map(([q, a]) => (
              <details className="faq" key={q}>
                <summary>
                  {q}
                  <Plus size={17} />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </section>
          <section className="surface">
            <Headphones size={30} className="green" />
            <h2>Talk to our team</h2>
            {sent && <Notice type="success" message="Your support request has been saved. You can follow up from your account." />}
            {user ? <button className="button" onClick={() => setSupportOpen(true)}>New support request</button> :
              <p><Link href="/login">Sign in</Link> to send a request.</p>}
          </section>
          {supportOpen && user && <Modal title="New support request" onClose={() => setSupportOpen(false)}>
            <ActionForm contextual action="support.create" title="Request details" submit="Send request"
              fields={[{ name: "subject", label: "Subject" }, { name: "message", label: "How can we help?", type: "textarea" }]}
              onDone={() => { setSent(true); setSupportOpen(false); }} />
          </Modal>}

        </div>
      </div>
    );
  if (path === "/delivery")
    return (
      <div className="container page">
        <div className="page-heading">
          <span className="eyebrow">A LITTLE CLOSER TO HOME</span>
          <h1>Delivery, with care.</h1>
          <p>Current configured service areas in Lagos.</p>
        </div>
        <div className="three-cards">
          {catalogue.zones.map((z: string) => (
            <div className="surface" key={z}>
              <MapPin className="green" />
              <h2>{z}</h2>
              <p>Availability is checked at checkout.</p>
            </div>
          ))}
        </div>
        <div className="surface info-callout">
          <Truck size={35} />
          <div>
            <h2>Clear delivery pricing</h2>
            <p>
              Current delivery fee: {money(catalogue.deliveryFee)}. Operating
              hours: {catalogue.hours}. Available windows:{" "}
              {catalogue.windows.join(", ")}.
            </p>
          </div>
        </div>
        <LegalDocument kind="delivery" compact />
      </div>
    );
  return (
    <div className="container page">
      <span className="eyebrow">EASYGAS ENERGY SOLUTIONS</span>
      <h1>
        {path === "/privacy" ? "Privacy information" : "Terms of service"}
      </h1>
      <Notice message="The business has not yet published its approved legal policy. This platform is not ready for a public commercial launch." />
      <p>
        Your account, order and support information are stored to provide
        EasyGas services. Payment card details are not collected by this
        application.
      </p>
      <p>
        Contact the business through your signed-in support account for
        questions about your information or an order.
      </p>
      <Link href="/help" className="button secondary">
        Get help <ArrowRight size={16} />
      </Link>
    </div>
  );
}
function ContactDetails() {
  const { catalogue } = useShop();
  const c = catalogue?.website;
  if (!c) return <Link href="/contact">View contact information</Link>;
  return (
    <address className="contact-details">
      <a href={`tel:${c.phonePrimary}`}>{c.phonePrimary}</a>
      <a href={`tel:${c.phoneSecondary}`}>{c.phoneSecondary}</a>
      {c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {c.address}
      </a>
      <a href={c.instagram} target="_blank" rel="noopener noreferrer">
        Instagram: @easygasng
      </a>
      <a href={c.linktree} target="_blank" rel="noopener noreferrer">
        EasyGas links
      </a>
    </address>
  );
}
function Footer() {
  const { catalogue } = useShop();
  return (
    <footer className="site-footer">
      <div className="container footer-main">
        <div>
          <Logo />
          <p>More Cooking. Less Worry.</p>
          <p>
            Cooking gas and kitchen essentials for homes and businesses in
            supported Lagos locations.
          </p>
          <span className="footer-promise">
            AFFORDABLE · FLEXIBLE · COMMITTED
          </span>
        </div>
        <div>
          <h3>Quick Links</h3>
          <Link href="/">Home</Link>
          <Link href="/products">Products</Link>
          <Link href="/services">Services</Link>
          <Link href="/#how-it-works">How It Works</Link>
          <Link href="/about">About Us</Link>
          <Link href="/business">Business Supply</Link>
        </div>
        <div>
          <h3>Our Services</h3>
          <Link href="/gas-order">Home Delivery Gas Refills</Link>
          <Link href="/products">New Cylinder Purchase</Link>
          {catalogue?.homeServices?.map((service: any) => (
            <Link key={service.id} href={`/services/${service.id}`}>
              {service.name}
            </Link>
          ))}
          <Link href="/services">View Service Availability</Link>
        </div>
        <div>
          <h3>Support</h3>
          <Link href="/help">FAQs & Safety Tips</Link>
          <Link href="/track">Track Order</Link>
          <Link href="/contact">Contact Us</Link>
          <Link href="/delivery">Delivery Information</Link>
          <Link href="/account">Your Account</Link>
          <Link href="/account-settings#testimonials">
            Share Your Experience
          </Link>
          <Link href="/terms">Terms & Conditions</Link>
          <Link href="/privacy">Privacy Policy</Link>
        </div>
        <div>
          <h3>Contact Us</h3>
          <ContactDetails />
          <p>{catalogue?.hours}</p>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} EasyGas Energy Solutions. All rights
          reserved.
        </span>
        <div>
          <Link href="/policies">Customer Policies</Link>
          <Link href="/admin">Business Portal</Link>
          <span>Affordable · Flexible · Committed</span>
        </div>
      </div>
    </footer>
  );
}

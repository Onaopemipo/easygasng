import React, {
  useState,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { createRoot } from "react-dom/client";
import {
  Home,
  Package,
  Wallet,
  UserRound,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  MapPin,
  Bell,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search,
  SlidersHorizontal,
  X,
  Flame,
  Truck,
  ClipboardList,
  Layers,
  Gift,
  Receipt,
  CalendarDays,
  Sun,
  Moon,
  RefreshCw,
  MessageCircle,
  LogOut,
  ArrowLeft,
  MoreHorizontal,
  AlertCircle,
  Building2,
  CreditCard,
  Banknote,
  Signal,
  Wifi,
  BatteryFull,
  BriefcaseBusiness,
  LockKeyhole,
} from "lucide-react";
import {
  state,
  save,
  user,
  reset,
  subscribe,
  baseline,
  request,
  execute,
  workflowSnapshot,
  featureSections,
  workflowFeatures,
  commands,
  familyRoles,
  families,
  personaRole,
  money,
  freshDraft,
  draftTotal,
  placeDraft,
  startPayment,
  verifyPayment,
  actionFields,
  nairaInputToKobo,
  type Draft,
} from "./experience";
const personas = [
  ["customer", "Customer"],
  ["commercial", "Business customer"],
  ["owner", "Business owner"],
  ["manager", "Service manager"],
  ["finance", "Inventory & finance"],
  ["driver", "Driver"],
  ["technician", "Technician"],
  ["public", "Visitor"],
];
const Icons = [
  Flame,
  Package,
  Wrench,
  Wallet,
  UserRound,
  Gift,
  Receipt,
  Truck,
  Layers,
  ShieldCheck,
  BriefcaseBusiness,
];
const pretty = (s: any) =>
  String(s ?? "")
    .replaceAll("_", " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
const nameOf = (r: any) =>
  r?.reference || r?.name || r?.subject || r?.serial || r?.kind || "Record";
function Icon({ as: C = Flame, ...props }: any) {
  return <C size={21} strokeWidth={1.8} aria-hidden="true" {...props} />;
}
function Label({ children }: any) {
  return <span className="eyebrow">{children}</span>;
}
function Empty({
  title = "Nothing here yet",
  detail = "Your updates will appear here.",
  action,
}: any) {
  return (
    <div className="empty">
      <span className="icon-disc">
        <Icon as={Package} />
      </span>
      <h2>{title}</h2>
      <p>{detail}</p>
      {action}
    </div>
  );
}
function Status({ children }: any) {
  return (
    <span
      className={
        "status " +
        (/verified|paid|delivered|completed|eligible|active/i.test(
          String(children),
        )
          ? "positive"
          : "")
      }
    >
      {pretty(children)}
    </span>
  );
}
function Field({ label, children }: any) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Row({ icon = Package, title, detail, onClick, tail }: any) {
  return (
    <button className="list-row" onClick={onClick}>
      <span className="icon-disc">
        <Icon as={icon} />
      </span>
      <span className="row-copy">
        <b>{title}</b>
        {detail && <small>{detail}</small>}
      </span>
      {tail || <Icon as={ChevronRight} size={18} />}
    </button>
  );
}
function Sheet({ title, children, onClose }: any) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const old = document.activeElement as HTMLElement;
    ref.current?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Tab") {
        const items = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button,input,select,textarea,[tabindex="0"]',
          ) || [],
        ).filter((x) => !x.hasAttribute("disabled"));
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      old?.focus();
    };
  }, []);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section
        ref={ref}
        tabIndex={-1}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grabber" />
        <header>
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <Icon as={X} />
          </button>
        </header>
        <div className="sheet-body">{children}</div>
      </section>
    </div>
  );
}
function Details({ value }: any) {
  if (value == null) return <p className="muted">No record yet.</p>;
  if (typeof value !== "object") return <p>{pretty(value)}</p>;
  if (Array.isArray(value))
    return value.length ? (
      <div className="record-list">
        {value.slice(0, 30).map((r: any, i: number) => (
          <article className="record" key={r?.id || i}>
            <b>{typeof r === "object" ? nameOf(r) : pretty(r)}</b>
            {typeof r === "object" && (
              <Details
                value={Object.fromEntries(
                  Object.entries(r)
                    .filter(
                      ([k, v]) =>
                        !["id", "reference", "name"].includes(k) &&
                        typeof v !== "object",
                    )
                    .slice(0, 7),
                )}
              />
            )}
          </article>
        ))}
      </div>
    ) : (
      <p className="muted">
        No records yet. Complete the next action to add one.
      </p>
    );
  return (
    <dl className="details">
      {Object.entries(value)
        .filter(([k]) => !/password|secret|token|hash|operation.?key/i.test(k))
        .slice(0, 18)
        .map(([k, v]) => (
          <React.Fragment key={k}>
            <dt>{pretty(k).replace(/kobo/i, "(₦)")}</dt>
            <dd>
              {/kobo/i.test(k) && typeof v === "number"
                ? money(v)
                : Array.isArray(v)
                  ? `${v.length} records`
                  : v && typeof v === "object"
                    ? "Recorded"
                    : typeof v === "boolean"
                      ? v
                        ? "Yes"
                        : "No"
                      : pretty(v) || "—"}
            </dd>
          </React.Fragment>
        ))}
    </dl>
  );
}
function CommandForm({ command, onDone }: any) {
  const fs = actionFields(command).map((f: any) => ({
      ...f,
      money: /kobo/i.test(f.label),
      label: f.label.replace(/kobo/gi, "₦"),
    })),
    [values, setValues] = useState<any>(() =>
      Object.fromEntries(
        fs.map((f: any) => [
          f.name,
          (f.money && f.value != null ? String(f.value / 100) : f.value) ??
            (f.type === "checkbox" ? false : (f.options?.[0]?.value ?? "")),
        ]),
      ),
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false),
    key = useRef(crypto.randomUUID());
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (lock.current) return;
        lock.current = true;
        setBusy(true);
        setError("");
        try {
          const r = execute(
            command.action,
            {
              ...command.defaults,
              ...Object.fromEntries(
                fs.map((f: any) => [
                  f.name,
                  f.money ? nairaInputToKobo(values[f.name]) : values[f.name],
                ]),
              ),
            },
            key.current,
          );
          onDone(r);
        } catch (e: any) {
          setError(e.message);
        } finally {
          lock.current = false;
          setBusy(false);
        }
      }}
    >
      <p className="muted">
        Synthetic review data. Existing role and workflow requirements still
        apply.
      </p>
      {fs.map((f: any) =>
        f.type === "checkbox" ? (
          <label className="check-row" key={f.name}>
            <input
              type="checkbox"
              checked={!!values[f.name]}
              onChange={(e) =>
                setValues({ ...values, [f.name]: e.target.checked })
              }
            />
            <span>{f.label}</span>
          </label>
        ) : (
          <Field label={f.label} key={f.name}>
            {f.options ? (
              <select
                value={values[f.name]}
                required={f.required !== false}
                onChange={(e) =>
                  setValues({ ...values, [f.name]: e.target.value })
                }
              >
                {!f.options.length && (
                  <option value="">No eligible records</option>
                )}
                {f.options.map((o: any) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                required={f.required !== false}
                value={values[f.name]}
                onChange={(e) =>
                  setValues({ ...values, [f.name]: e.target.value })
                }
              />
            ) : (
              <input
                type={
                  ["number", "password", "email"].includes(f.type)
                    ? f.type
                    : "text"
                }
                required={f.required !== false}
                step={f.money ? "0.01" : undefined}
                min={f.money ? "0" : undefined}
                value={values[f.name]}
                onChange={(e) =>
                  setValues({
                    ...values,
                    [f.name]:
                      f.type === "number" && !f.money
                        ? Number(e.target.value)
                        : e.target.value,
                  })
                }
              />
            )}
          </Field>
        ),
      )}
      {error && (
        <div className="notice" role="alert">
          {error}
        </div>
      )}
      <button className="primary full" disabled={busy}>
        {busy ? "Saving…" : command.label}
      </button>
    </form>
  );
}
function App() {
  useSyncExternalStore(subscribe, () => state.version || 0);
  const [persona, setPersona] = useState(() => state.role || "customer"),
    [page, setPage] = useState("home"),
    [history, setHistory] = useState<string[]>([]),
    [dark, setDark] = useState(false),
    [review, setReview] = useState(false),
    [query, setQuery] = useState(""),
    [scenario, setScenario] = useState(state.scenario || "normal"),
    [sheet, setSheet] = useState<any>(null),
    [toast, setToast] = useState(""),
    [family, setFamily] = useState(""),
    [familyTab, setFamilyTab] = useState("Overview"),
    [draft, setDraft] = useState<Draft>(() => {
      try {
        return (
          JSON.parse(sessionStorage.getItem("next.draft") || "null") ||
          freshDraft()
        );
      } catch {
        return freshDraft();
      }
    }),
    [order, setOrder] = useState<any>(null),
    [payment, setPayment] = useState<any>(null),
    [providerOutcome, setProviderOutcome] = useState("pending"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loadState, setLoadState] = useState("ready");
  const screen = useRef<HTMLDivElement>(null),
    lock = useRef(false),
    paymentKey = useRef(crypto.randomUUID()),
    paymentKeys = useRef(new Map<string, string>());
  state.role = personaRole(persona);
  const customer = ["customer", "commercial", "public"].includes(persona);
  const allowed = families(persona);
  const snap = workflowSnapshot();
  useEffect(() => {
    sessionStorage.setItem("next.draft", JSON.stringify(draft));
  }, [draft]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4200);
    return () => clearTimeout(t);
  }, [toast]);
  function nav(p: string) {
    setHistory((h) => [...h, page]);
    setPage(p);
    setError("");
    screen.current?.scrollTo({ top: 0, behavior: "instant" as any });
    if (state.scenario === "slow-network") {
      setLoadState("loading");
      setTimeout(() => setLoadState("ready"), 1800);
    } else setLoadState("ready");
  }
  function back() {
    const p = history.at(-1) || "home";
    setHistory(history.slice(0, -1));
    setPage(p);
    setError("");
    screen.current?.scrollTo({ top: 0 });
  }
  function openFamily(id: string) {
    if (!allowed.some((f: any) => f.id === id)) {
      setError("This workspace is not available to your role.");
      return;
    }
    setFamily(id);
    setFamilyTab("Overview");
    nav("workspace");
  }
  function selectPersona(role: string) {
    setPersona(role);
    state.role = personaRole(role);
    state.scenario = "normal";
    save();
    setScenario("normal");
    setPage("home");
    setHistory([]);
    setReview(false);
    setSheet(null);
    setError("");
    setOrder(null);
    setPayment(null);
  }
  function newOrder() {
    setDraft(freshDraft());
    setOrder(null);
    setPayment(null);
    setProviderOutcome("pending");
    paymentKey.current = crypto.randomUUID();
    nav("refill");
  }
  function action(a: any) {
    setSheet({ title: a.label, command: a });
  }
  function openRecords(title: string, value: any) {
    setSheet({ title, value });
  }
  const total = draftTotal(draft);
  const step = ["refill", "delivery", "review"].indexOf(page);
  const titles: any = {
    refill: "Order gas",
    delivery: "Delivery details",
    review: "Review your order",
    payment: "Secure payment",
    provider: "Payment provider",
    "payment-check": "Payment status",
    success: "Order confirmed",
    orders: "Your orders",
    tracking: "Order details",
    services: "Services",
    wallet: "Your wallet",
    account: "Account",
    workspaces: "Workspaces",
    workspace: allowed.find((f: any) => f.id === family)?.name || "Workspace",
    notifications: "Updates",
    products: "Shop essentials",
  };
  async function confirm() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (persona === "public") {
        setError(
          "Choose the Customer review persona to confirm. Your refill details are preserved.",
        );
        return;
      }
      const o = placeDraft(draft);
      setOrder(o);
      if (draft.method === "card") {
        paymentKeys.current.set(o.id, paymentKey.current);
        const p = startPayment(o, paymentKey.current);
        setPayment(p);
        nav("payment");
      } else nav("success");
    } catch (e: any) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function verify() {
    if (lock.current || !payment) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (providerOutcome !== "paid")
        throw Error(
          "Payment was not completed. Your order is saved; return to the same payment attempt when you’re ready.",
        );
      const r = verifyPayment(
        payment.reference,
        scenario === "payment-failed" ? "failed" : "paid",
      );
      if (r.status === "verified") {
        setOrder({ ...order, payment_status: "verified" });
        nav("success");
      } else
        setError(
          "Your payment is still being confirmed. Your order is saved. Check again shortly; no new charge has been started.",
        );
    } catch (e: any) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    if (page === "payment-check") void verify();
  }, [page]);
  const tabs = customer
    ? [
        ["home", "Home", Home],
        ["orders", "Orders", Package],
        ["services", "Services", Wrench],
        ["wallet", "Wallet", Wallet],
        ["account", "Account", UserRound],
      ]
    : persona === "driver"
      ? [
          ["home", "Today", Home],
          ["orders", "Deliveries", Truck],
          ["workspaces", "Work", ClipboardList],
          ["account", "Profile", UserRound],
        ]
      : persona === "technician"
        ? [
            ["home", "Today", Home],
            ["services", "Jobs", Wrench],
            ["workspaces", "Work", Layers],
            ["account", "Profile", UserRound],
          ]
        : [
            ["home", "Overview", Home],
            ["orders", "Orders", Package],
            ["workspaces", "Work", Layers],
            ["account", "Account", UserRound],
          ];
  const activeTab = [
    "refill",
    "delivery",
    "review",
    "payment",
    "provider",
    "payment-check",
    "success",
    "tracking",
  ].includes(page)
    ? "orders"
    : page === "workspace"
      ? "workspaces"
      : page;
  function listOrders() {
    return persona === "public" || state.scenario === "empty-data"
      ? []
      : snap.orders || [];
  }
  function orderCard(o: any) {
    return (
      <button
        className="order-card"
        key={o.id}
        onClick={() => {
          setOrder(o);
          nav("tracking");
        }}
      >
        <div className="row-between">
          <span className="icon-disc">
            <Icon as={Flame} />
          </span>
          <Status>{o.status}</Status>
        </div>
        <h3>
          {o.gas_lines?.length
            ? "Cooking gas refill"
            : o.items?.length
              ? "Essentials order"
              : o.reference}
        </h3>
        <p>{o.reference}</p>
        <div className="row-between">
          <b>{money(Number(o.total_kobo))}</b>
          <span>{pretty(o.payment_status)}</span>
        </div>
      </button>
    );
  }
  function home() {
    return (
      <>
        <div className="greeting">
          <Label>
            {customer ? "MORE COOKING. LESS WORRY." : "LAGOS BRANCH"}
          </Label>
          <h1>
            {customer
              ? persona === "public"
                ? "Welcome to EasyGas."
                : "Hello, Sample."
              : persona === "driver"
                ? "Ready for the road?"
                : persona === "technician"
                  ? "Your work, in view."
                  : "A clear view of today."}
          </h1>
          <p>
            {customer
              ? "A full cylinder. One less thing to think about."
              : personas.find((r) => r[0] === persona)?.[1] + " workspace"}
          </p>
        </div>
        {customer ? (
          <>
            <section className="gas-hero">
              <div>
                <span className="hero-kicker">COOKING GAS, DELIVERED</span>
                <h2>
                  A little refill.
                  <br />A lot less worry.
                </h2>
                <p>
                  Choose your quantity.
                  <br />
                  We’ll handle the next steps.
                </p>
                <button onClick={newOrder}>Order gas</button>
              </div>
              <img
                src="/assets/cylinder-illustration.png"
                alt="EasyGas green cooking gas cylinder"
              />
            </section>
            <div className="quick-grid">
              <button onClick={() => nav("services")}>
                <span className="icon-disc">
                  <Icon as={Wrench} />
                </span>
                <b>Book a service</b>
                <span>Expert help, on your terms</span>
              </button>
              <button onClick={() => nav("wallet")}>
                <span className="icon-disc">
                  <Icon as={Wallet} />
                </span>
                <b>Your wallet</b>
                <span>
                  {persona === "public"
                    ? "Sign in to view purchase credit"
                    : money(state.wallet.balanceKobo) + " available"}
                </span>
              </button>
            </div>
            <div className="section-heading">
              <h2>Your latest order</h2>
              <button className="text-button" onClick={() => nav("orders")}>
                View all
              </button>
            </div>
            {listOrders().length ? (
              orderCard(listOrders()[0])
            ) : (
              <Empty
                title="Your first refill starts here"
                detail="We’ll keep every order and update in one place."
              />
            )}
            <div className="section-heading">
              <h2>Made for your home</h2>
            </div>
            <div className="mini-grid">
              {[
                [Receipt, "Invoices", "FEATURE-04"],
                [Flame, "Cylinders", "FEATURE-08"],
                [Gift, "Rewards", "FEATURE-08"],
                [CalendarDays, "Refill plans", "FEATURE-08"],
              ].map(([I, label, f]: any) => (
                <button
                  key={label}
                  onClick={() =>
                    openFamily(persona === "public" ? "FEATURE-35" : f)
                  }
                >
                  <Icon as={I} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <section className="work-hero">
              <Label>YOUR NEXT PRIORITY</Label>
              <h2>
                {persona === "driver"
                  ? "Trip & delivery readiness"
                  : persona === "technician"
                    ? "Appointments & work authority"
                    : persona === "finance"
                      ? "Stock & financial review"
                      : "Orders needing attention"}
              </h2>
              <p>
                {persona === "driver"
                  ? "Start a suitable vehicle trip before collecting orders."
                  : persona === "technician"
                    ? "Review the scope and approval before starting work."
                    : "See what needs action, then open the right workspace."}
              </p>
              <button
                className="primary"
                onClick={() =>
                  openFamily(
                    persona === "driver"
                      ? "FEATURE-19"
                      : persona === "technician"
                        ? "FEATURE-21"
                        : persona === "finance"
                          ? "FEATURE-24"
                          : "FEATURE-11",
                  )
                }
              >
                Open today’s work
              </button>
            </section>
            <div className="metrics">
              <article>
                <b>{listOrders().length}</b>
                <span>Scoped orders</span>
              </article>
              <article>
                <b>
                  {snap.proposals?.filter(
                    (r: any) => r.status === "pending_review",
                  ).length || 0}
                </b>
                <span>Awaiting review</span>
              </article>
            </div>
            <div className="section-heading">
              <h2>Your workspaces</h2>
              <button className="text-button" onClick={() => nav("workspaces")}>
                View all
              </button>
            </div>
            <section className="list-surface">
              {allowed.slice(0, 7).map((f: any, i: number) => (
                <Row
                  key={f.id}
                  icon={Icons[i % Icons.length]}
                  title={f.name}
                  detail={`${f.items.length} connected features`}
                  onClick={() => openFamily(f.id)}
                />
              ))}
            </section>
          </>
        )}
        <div className="help-card">
          <Icon as={MessageCircle} />
          <div>
            <b>We’re here to help</b>
            <p>Questions about an order or a service?</p>
          </div>
          <button
            className="icon-button"
            aria-label="Open support"
            onClick={() =>
              openFamily(
                customer
                  ? persona === "public"
                    ? "FEATURE-35"
                    : "FEATURE-09"
                  : "FEATURE-33",
              )
            }
          >
            <Icon as={ChevronRight} />
          </button>
        </div>
      </>
    );
  }
  function refill() {
    return (
      <>
        <div className="page-intro">
          <h1>
            How much do
            <br />
            you need?
          </h1>
          <p>Order the gas you need, within your cylinder’s capacity.</p>
        </div>
        <div className="rate-strip">
          <Icon as={Flame} />
          <b>
            ₦1,800<span> / kg</span>
          </b>
          <span>Delivery ₦5,000</span>
        </div>
        {draft.lines.map((l, i) => (
          <section className="refill-card" key={i}>
            <div className="row-between">
              <h2>Cylinder {i + 1}</h2>
              {i > 0 && (
                <button
                  className="text-button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      lines: draft.lines.filter((_, n) => i !== n),
                    })
                  }
                >
                  Remove
                </button>
              )}
            </div>
            <Field label="Cylinder capacity">
              <select
                aria-label={`Cylinder ${i + 1} capacity`}
                value={l.capacityKg}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    lines: draft.lines.map((x, n) =>
                      n === i
                        ? {
                            capacityKg: Number(e.target.value),
                            kg: Math.min(x.kg, Number(e.target.value)),
                          }
                        : x,
                    ),
                  })
                }
              >
                {[3, 6, 12.5, 25, 50].map((c) => (
                  <option key={c} value={c}>
                    {c} kg
                  </option>
                ))}
              </select>
            </Field>
            <Label>GAS TO REFILL</Label>
            <div className="quantity">
              <button
                aria-label={`Reduce cylinder ${i + 1} gas`}
                disabled={l.kg <= 0.5}
                onClick={() =>
                  setDraft({
                    ...draft,
                    lines: draft.lines.map((x, n) =>
                      n === i ? { ...x, kg: x.kg - 0.5 } : x,
                    ),
                  })
                }
              >
                <Icon as={Minus} />
              </button>
              <div>
                <strong>{l.kg}</strong>
                <span>kg</span>
              </div>
              <button
                aria-label={`Increase cylinder ${i + 1} gas`}
                disabled={l.kg >= l.capacityKg}
                onClick={() =>
                  setDraft({
                    ...draft,
                    lines: draft.lines.map((x, n) =>
                      n === i ? { ...x, kg: x.kg + 0.5 } : x,
                    ),
                  })
                }
              >
                <Icon as={Plus} />
              </button>
            </div>
            <div className="preset-row">
              {[3, 6, 12.5]
                .filter((n) => n <= l.capacityKg)
                .map((n) => (
                  <button
                    className={n === l.kg ? "selected" : ""}
                    key={n}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        lines: draft.lines.map((x, j) =>
                          j === i ? { ...x, kg: n } : x,
                        ),
                      })
                    }
                  >
                    {n} kg
                  </button>
                ))}
            </div>
            <p className="subtle">
              Cylinder condition will be checked before filling.
            </p>
          </section>
        ))}
        <button
          className="text-button add-line"
          disabled={draft.lines.length >= 20}
          onClick={() =>
            setDraft({
              ...draft,
              lines: [...draft.lines, { kg: 3, capacityKg: 6 }],
            })
          }
        >
          <Icon as={Plus} /> Add another cylinder
        </button>
        <div className="reassurance">
          <Icon as={ShieldCheck} />
          <p>
            One delivery fee for this visit. Cylinder purchases and installation
            are separate.
          </p>
        </div>
      </>
    );
  }
  function delivery() {
    return (
      <>
        <div className="page-intro">
          <h1>
            Where should
            <br />
            we deliver?
          </h1>
          <p>Your details are kept for this order as you move between steps.</p>
        </div>
        <div className="saved-address">
          <Icon as={MapPin} />
          <div>
            <b>Home · Victoria Island</b>
            <p>12 Prototype Avenue</p>
          </div>
          <button
            className="text-button"
            onClick={() =>
              setDraft({
                ...draft,
                street: "12 Prototype Avenue",
                zone: "Victoria Island",
                locationId: "victoria-island",
              })
            }
          >
            Use
          </button>
        </div>
        <Field label="Delivery area">
          <select
            value={draft.locationId}
            onChange={(e) => {
              const area = baseline.customer[
                "gas.catalogue"
              ].data.locations.find((a: any) => a.id === e.target.value);
              setDraft({ ...draft, locationId: area.id, zone: area.name });
            }}
          >
            {baseline.customer["gas.catalogue"].data.locations
              .filter((a: any) => !a.name.includes("SANDBOX"))
              .map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Street address">
          <input
            autoComplete="street-address"
            value={draft.street}
            onChange={(e) => setDraft({ ...draft, street: e.target.value })}
          />
        </Field>
        <div className="two-columns">
          <Field label="Recipient name">
            <input
              autoComplete="name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </Field>
          <Field label="Mobile number">
            <input
              type="tel"
              autoComplete="tel"
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            />
          </Field>
        </div>
        <div className="two-columns">
          <Field label="Delivery date">
            <input
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            />
          </Field>
          <Field label="Preferred window">
            <select
              value={draft.window}
              onChange={(e) => setDraft({ ...draft, window: e.target.value })}
            >
              <option>09:00–12:00</option>
              <option>14:00–18:00</option>
            </select>
          </Field>
        </div>
        <details>
          <summary>
            Add delivery instructions <span>Optional</span>
          </summary>
          <Field label="Landmark, building or directions">
            <textarea
              value={draft.instructions}
              onChange={(e) =>
                setDraft({ ...draft, instructions: e.target.value })
              }
            />
          </Field>
        </details>
        <p className="subtle">
          EasyGas confirms the address and delivery slot before dispatch.
        </p>
      </>
    );
  }
  function reviewOrder() {
    return (
      <>
        <div className="page-intro">
          <h1>
            Everything
            <br />
            looking good?
          </h1>
          <p>A clear total before you confirm.</p>
        </div>
        <section className="summary-card">
          <div className="section-heading">
            <h2>Your refill</h2>
            <button className="text-button" onClick={() => nav("refill")}>
              Edit
            </button>
          </div>
          {draft.lines.map((l, i) => (
            <div className="bill-row" key={i}>
              <span>
                {l.kg} kg · {l.capacityKg} kg cylinder
              </span>
              <b>{money(l.kg * 180000)}</b>
            </div>
          ))}
          <div className="bill-row">
            <span>Delivery · one visit</span>
            <b>{money(500000)}</b>
          </div>
          <div className="bill-row total">
            <span>Order total</span>
            <b>{money(total)}</b>
          </div>
        </section>
        <section className="summary-card">
          <div className="section-heading">
            <h2>Deliver to</h2>
            <button className="text-button" onClick={() => nav("delivery")}>
              Edit
            </button>
          </div>
          <p>
            <b>{draft.name}</b>
            <br />
            {draft.street}
            <br />
            {draft.zone} · {draft.phone}
          </p>
          <div className="date-chip">
            <Icon as={CalendarDays} />
            {draft.date} · {draft.window}
          </div>
        </section>
        <h2 className="form-heading">How would you like to pay?</h2>
        <div className="payment-options">
          {[
            [
              "card",
              "Credit / debit card",
              CreditCard,
              "Processing fee shown before payment",
            ],
            [
              "wallet",
              "EasyGas wallet",
              Wallet,
              money(state.wallet.balanceKobo) + " available",
            ],
            [
              "cash_on_delivery",
              "Cash on delivery",
              Banknote,
              "Subject to current branch policy",
            ],
          ].map(([value, label, I, detail]: any) => (
            <label
              className={
                "payment-option " + (draft.method === value ? "selected" : "")
              }
              key={value}
            >
              <input
                type="radio"
                name="method"
                value={value}
                checked={draft.method === value}
                onChange={() => setDraft({ ...draft, method: value })}
              />
              <Icon as={I} />
              <span>
                <b>{label}</b>
                <small>{detail}</small>
              </span>
            </label>
          ))}
        </div>
        <p className="subtle">
          Your order uses the current quote. Stock, coverage and safe filling
          remain subject to confirmation.
        </p>
      </>
    );
  }
  function paymentPage() {
    const fee = Number(payment?.fee_kobo || 10000);
    return (
      <>
        <div className="page-intro">
          <span className="icon-disc large">
            <Icon as={LockKeyhole} />
          </span>
          <h1>One last step.</h1>
          <p>
            Your order is saved. Review the exact amount before opening secure
            payment.
          </p>
        </div>
        <section className="summary-card">
          <div className="bill-row">
            <span>Order amount</span>
            <b>{money(Number(order?.total_kobo))}</b>
          </div>
          <div className="bill-row">
            <span>Processing fee · sample</span>
            <b>{money(fee)}</b>
          </div>
          <div className="bill-row total">
            <span>Total to pay</span>
            <b>{money(Number(order?.total_kobo) + fee)}</b>
          </div>
        </section>
        <div className="reassurance">
          <Icon as={ShieldCheck} />
          <p>
            Payment returns to the app for secure verification. You won’t need
            to sign in to a separate browser session.
          </p>
        </div>
        <p className="subtle">
          Synthetic provider preview. No real charge is made. The sample fee
          demonstrates disclosure and is not a live merchant rate.
        </p>
      </>
    );
  }
  function provider() {
    return (
      <div className="payment-provider">
        <div className="provider-mark">
          <ShieldCheck size={34} />
        </div>
        <Label>SIMULATED SECURE CHECKOUT</Label>
        <h1>
          Pay{" "}
          {money(
            Number(order?.total_kobo) + Number(payment?.fee_kobo || 10000),
          )}
        </h1>
        <p>
          This preview simulates the provider return. Your EasyGas session
          remains in the app.
        </p>
        <div className="sample-card">
          <CreditCard />
          <span>Sample card •••• 4081</span>
        </div>
        <button
          className="primary full"
          onClick={() => {
            setProviderOutcome("paid");
            nav("payment-check");
          }}
        >
          Simulate payment return
        </button>
        <button
          className="text-button"
          onClick={() => {
            setProviderOutcome("pending");
            nav("payment-check");
          }}
        >
          Return without completing payment
        </button>
      </div>
    );
  }
  function checkPayment() {
    return (
      <div className="payment-provider">
        <span className="icon-disc large">
          <Icon as={Clock} />
        </span>
        <h1>{busy ? "Confirming your payment" : "Your order is safe."}</h1>
        <p>
          {error ||
            "We’ll confirm your saved payment attempt before showing a paid status."}
        </p>
        {state.scenario === "expired-session" ? (
          <button
            className="primary full"
            onClick={() => {
              state.scenario = "normal";
              save();
              setScenario("normal");
              void verify();
            }}
          >
            Restore sample session and check
          </button>
        ) : (
          <button
            className="primary full"
            disabled={busy}
            onClick={() => void verify()}
          >
            {busy ? "Checking…" : "Check this payment again"}
          </button>
        )}
        <button className="text-button" onClick={() => nav("orders")}>
          View saved order
        </button>
      </div>
    );
  }
  function success() {
    return (
      <div className="success">
        <span className="success-orbit">
          <Check size={34} />
        </span>
        <Label>
          {order?.payment_status === "verified"
            ? "PAYMENT CONFIRMED"
            : "ORDER SAVED"}
        </Label>
        <h1>You’re all set.</h1>
        <p>
          We’ve received your order.
          <br />
          You’ll see every update right here.
        </p>
        <section className="summary-card">
          <div className="row-between">
            <b>{order?.reference}</b>
            <Status>{order?.status || "placed"}</Status>
          </div>
          <div className="bill-row">
            <span>Order total</span>
            <b>{money(Number(order?.total_kobo))}</b>
          </div>
          <p>
            {draft.street}
            <br />
            {draft.zone}
          </p>
        </section>
        <div className="reassurance">
          <Icon as={ShieldCheck} />
          <p>
            We’ll confirm delivery coverage and cylinder eligibility before
            dispatch.
          </p>
        </div>
      </div>
    );
  }
  function tracking() {
    const current = state.orders.find((o: any) => o.id === order?.id) || order;
    return current ? (
      <>
        <div className="page-intro">
          <Label>{current.reference}</Label>
          <h1>
            {current.status === "delivered"
              ? "Delivered, with care."
              : "Your refill is in motion."}
          </h1>
          <Status>{current.status}</Status>
        </div>
        <section className="summary-card">
          <div className="bill-row">
            <span>Order amount</span>
            <b>{money(Number(current.total_kobo))}</b>
          </div>
          <div className="bill-row">
            <span>Payment</span>
            <Status>{current.payment_status}</Status>
          </div>
          <p>
            {current.address?.street}
            <br />
            {current.address?.zone}
          </p>
        </section>
        <ol className="timeline">
          {[
            "placed",
            "accepted",
            "preparing",
            "assigned",
            "out_for_delivery",
            "delivered",
          ].map((s, i) => (
            <li
              className={
                i <=
                [
                  "placed",
                  "accepted",
                  "preparing",
                  "assigned",
                  "out_for_delivery",
                  "delivered",
                ].indexOf(current.status)
                  ? "done"
                  : ""
              }
              key={s}
            >
              <span>{i === 0 ? <Check size={14} /> : null}</span>
              <div>
                <b>{pretty(s)}</b>
                <p>
                  {s === "placed"
                    ? "Your request is saved."
                    : s === "accepted"
                      ? "Coverage and order review."
                      : s === "preparing"
                        ? "Cylinder checks and preparation."
                        : s === "assigned"
                          ? "A qualified driver with a suitable trip."
                          : s === "out_for_delivery"
                            ? "Observed driver updates appear when available."
                            : "Verified handover and completion."}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <section className="list-surface">
          <Row
            title="Invoice & payment history"
            icon={Receipt}
            onClick={() =>
              openRecords(
                "Order invoice",
                execute("invoice.order", { orderId: current.id }),
              )
            }
          />
          <Row
            title="Get help with this order"
            icon={MessageCircle}
            onClick={() => openFamily("FEATURE-09")}
          />
          {current.payment_status !== "verified" && customer && (
            <Row
              title="Continue saved payment"
              icon={CreditCard}
              onClick={() => {
                setOrder(current);
                try {
                  const key =
                    paymentKeys.current.get(current.id) || crypto.randomUUID();
                  paymentKeys.current.set(current.id, key);
                  setPayment(startPayment(current, key));
                  setProviderOutcome("pending");
                  nav("payment");
                } catch (e: any) {
                  setError(e.message);
                }
              }}
            />
          )}
        </section>
      </>
    ) : (
      <Empty title="Choose an order" />
    );
  }
  function services() {
    const services = snap.services || [];
    return (
      <>
        <div className="page-intro">
          <h1>
            {persona === "technician"
              ? "Good work starts here."
              : "A little expert help."}
          </h1>
          <p>
            {persona === "technician"
              ? "Your scoped appointments and work authority."
              : "Installation, maintenance and safety, in one place."}
          </p>
        </div>
        {persona === "technician" ? (
          <section className="list-surface">
            {(snap.bookings || []).map((b: any) => (
              <Row
                key={b.id}
                title={b.reference}
                detail={pretty(b.status)}
                icon={Wrench}
                onClick={() => openFamily("FEATURE-21")}
              />
            ))}
          </section>
        ) : (
          <>
            {services.map((s: any, i: number) => (
              <article className="service-card" key={s.id}>
                <span className={"service-art tone-" + (i % 3)}>
                  <Wrench size={34} />
                </span>
                <div>
                  <h2>{s.name}</h2>
                  <p>
                    {s.config?.pricingModel === "fixed"
                      ? money(
                          Number(s.config.priceKobo) +
                            Number(s.config.calloutKobo || 0),
                        )
                      : "Assessment & quotation"}
                  </p>
                  <button
                    className="text-button"
                    onClick={() => {
                      const c = commands["07"].find(
                        (a: any) => a.action === "local.service",
                      );
                      action({
                        ...c,
                        fields: c.fields.map((f: any) =>
                          f.name === "serviceId" ? { ...f, value: s.id } : f,
                        ),
                      });
                    }}
                  >
                    View service & request
                  </button>
                </div>
              </article>
            ))}
            {!services.length && (
              <Empty
                title="No services available"
                detail="Try another area or ask our support team."
              />
            )}
            <Row
              title="Your appointments"
              detail={`${snap.bookings?.length || 0} recorded`}
              icon={CalendarDays}
              onClick={() => openFamily("FEATURE-07")}
            />
          </>
        )}
      </>
    );
  }
  function wallet() {
    return (
      <>
        <div className="page-intro">
          <h1>
            Your wallet,
            <br />
            ready when you are.
          </h1>
          <p>Purchase credit and every movement, clearly recorded.</p>
        </div>
        <section className="wallet-card">
          <Label>AVAILABLE PURCHASE CREDIT</Label>
          <h2>{money(state.wallet.balanceKobo)}</h2>
          <p>For eligible EasyGas purchases</p>
          <button onClick={() => openFamily("FEATURE-06")}>Add money</button>
        </section>
        <div className="section-heading">
          <h2>Recent activity</h2>
          <button
            className="text-button"
            onClick={() => openFamily("FEATURE-06")}
          >
            See all
          </button>
        </div>
        <section className="list-surface">
          {(state.scenario === "empty-data" ? [] : state.wallet.entries || [])
            .slice(0, 12)
            .map((e: any) => (
              <Row
                key={e.id}
                icon={Number(e.amount_kobo) > 0 ? ArrowUpRight : Receipt}
                title={pretty(e.kind)}
                detail="Recorded purchase credit"
                tail={<b>{money(e.amount_kobo)}</b>}
                onClick={() => openRecords("Wallet entry", e)}
              />
            ))}
          {!state.wallet.entries?.length && (
            <Empty title="No wallet activity" />
          )}
        </section>
      </>
    );
  }
  function workspaces() {
    return (
      <>
        <div className="page-intro">
          <h1>
            Everything you need.
            <br />
            One clear place.
          </h1>
          <p>Only the workspaces available to your review role.</p>
        </div>
        <label className="search">
          <Search size={20} />
          <input
            aria-label="Search workspaces"
            placeholder="Find a workspace or feature"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <section className="list-surface">
          {allowed
            .filter((f: any) =>
              (f.name + " " + f.items.join(" "))
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((f: any, i: number) => (
              <Row
                key={f.id}
                icon={Icons[i % Icons.length]}
                title={f.name}
                detail={`${f.items.length} connected features`}
                onClick={() => openFamily(f.id)}
              />
            ))}
        </section>
      </>
    );
  }
  function workspace() {
    const f = allowed.find((f: any) => f.id === family);
    if (!f) return <Empty title="Workspace unavailable" />;
    let sections: any[] = [];
    try {
      sections = featureSections(family);
    } catch {}
    const acts = (commands[family.slice(-2)] || []).filter(
      (a: any) => !a.roles || a.roles.includes(state.role),
    );
    return (
      <>
        <div className="workspace-intro">
          <Label>{personas.find((r) => r[0] === persona)?.[1]}</Label>
          <h1>{f.name}</h1>
          <p>Current records and the next appropriate action.</p>
        </div>
        <div className="segmented" role="tablist" aria-label="Workspace view">
          {["Overview", "Actions", "Activity"].map((t) => (
            <button
              role="tab"
              aria-selected={t === familyTab}
              className={t === familyTab ? "selected" : ""}
              key={t}
              onClick={() => setFamilyTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        {familyTab === "Overview" && (
          <section className="list-surface">
            {sections.map((s: any) => (
              <Row
                key={s.id}
                icon={ClipboardList}
                title={s.name}
                detail={
                  Array.isArray(s.value)
                    ? `${s.value.length} records`
                    : "View current details"
                }
                onClick={() => openRecords(s.name, s.value)}
              />
            ))}
          </section>
        )}
        {familyTab === "Actions" && (
          <section className="list-surface">
            {acts.map((a: any) => (
              <Row
                key={a.action + a.label}
                icon={Plus}
                title={a.label}
                detail="Open a focused form"
                onClick={() => action(a)}
              />
            ))}
            {!acts.length && (
              <Empty
                title="View-only workspace"
                detail="Your role can inspect the records shown in Overview."
              />
            )}
          </section>
        )}
        {familyTab === "Activity" && (
          <section className="list-surface">
            {(state.log || []).slice(0, 20).map((r: any) => (
              <Row
                key={r.id}
                title={pretty(r.action)}
                detail={r.summary}
                icon={Clock}
                onClick={() => openRecords("Activity details", r)}
              />
            ))}
            {!state.log.length && (
              <Empty
                title="A fresh start"
                detail="Completed actions appear here."
              />
            )}
          </section>
        )}
        <p className="prototype-note">
          Local review workflow · {f.items.length} features retained
        </p>
      </>
    );
  }
  function account() {
    if (persona === "public")
      return (
        <Empty
          title="Your EasyGas account"
          detail="Your orders, saved addresses and purchase credit stay with your account. Choose a signed-in review role to explore."
          action={
            <button className="primary" onClick={() => setReview(true)}>
              Choose review role
            </button>
          }
        />
      );
    return (
      <>
        <div className="profile-heading">
          <span className="avatar large">SC</span>
          <h1>
            {customer
              ? "Sample customer"
              : personas.find((r) => r[0] === persona)?.[1]}
          </h1>
          <p>Private design review · Lagos</p>
        </div>
        <section className="list-surface">
          <Row
            icon={UserRound}
            title="Profile & security"
            onClick={() => openFamily(customer ? "FEATURE-05" : "FEATURE-36")}
          />
          <Row
            icon={MapPin}
            title="Delivery addresses"
            detail="Your saved places"
            onClick={() => openFamily(customer ? "FEATURE-05" : "FEATURE-32")}
          />
          <Row
            icon={Bell}
            title="Notifications & preferences"
            onClick={() => nav("notifications")}
          />
          <Row
            icon={dark ? Sun : Moon}
            title="Appearance"
            detail={dark ? "Dark" : "Light"}
            onClick={() => setDark(!dark)}
          />
          <Row
            icon={Layers}
            title="All workspaces"
            detail="Find every feature for your role"
            onClick={() => nav("workspaces")}
          />
          <Row
            icon={MessageCircle}
            title="Help & support"
            onClick={() => openFamily(customer ? "FEATURE-09" : "FEATURE-33")}
          />
        </section>
        <button
          className="text-button logout"
          onClick={() => selectPersona("public")}
        >
          <Icon as={LogOut} />
          Sign out of sample account
        </button>
      </>
    );
  }
  const body =
    page === "home" ? (
      home()
    ) : page === "refill" ? (
      refill()
    ) : page === "delivery" ? (
      delivery()
    ) : page === "review" ? (
      reviewOrder()
    ) : page === "payment" ? (
      paymentPage()
    ) : page === "provider" ? (
      provider()
    ) : page === "payment-check" ? (
      checkPayment()
    ) : page === "success" ? (
      success()
    ) : page === "orders" ? (
      <>
        <div className="page-intro">
          <h1>
            {customer ? "Every refill." : "Your scoped orders."}
            <br />
            All in one place.
          </h1>
          <p>Confirmed status, payment and next steps.</p>
        </div>
        <div className="order-grid">{listOrders().map(orderCard)}</div>
        {!listOrders().length && (
          <Empty
            title="No orders yet"
            detail="Place your first refill and follow it from here."
            action={
              customer && (
                <button className="primary" onClick={newOrder}>
                  Order gas
                </button>
              )
            }
          />
        )}
      </>
    ) : page === "tracking" ? (
      tracking()
    ) : page === "services" ? (
      services()
    ) : page === "wallet" ? (
      persona === "public" ? (
        <Empty
          title="Your wallet stays private"
          detail="Choose Customer in review controls to explore the signed-in wallet."
          action={
            <button className="primary" onClick={() => setReview(true)}>
              Choose review role
            </button>
          }
        />
      ) : (
        wallet()
      )
    ) : page === "workspaces" ? (
      workspaces()
    ) : page === "workspace" ? (
      workspace()
    ) : page === "account" ? (
      account()
    ) : page === "notifications" ? (
      <>
        <div className="page-intro">
          <h1>You’re up to date.</h1>
          <p>Order, service and account updates.</p>
        </div>
        <Details value={snap.notifications || []} />
      </>
    ) : (
      <Empty />
    );
  const footer =
    step >= 0 ? (
      <div className="checkout-dock">
        <div>
          <small>ORDER TOTAL</small>
          <b>{money(total)}</b>
        </div>
        <button
          className="primary"
          disabled={busy}
          onClick={() => {
            if (step === 0) nav("delivery");
            else if (step === 1) {
              try {
                if (
                  !draft.name ||
                  draft.street.trim().length < 8 ||
                  !/^0[789][01]\d{8}$/.test(draft.phone) ||
                  !draft.date
                )
                  throw Error(
                    "Please check your recipient, mobile number, address and delivery date.",
                  );
                nav("review");
              } catch (e: any) {
                setError(e.message);
              }
            } else void confirm();
          }}
        >
          {busy
            ? "Confirming…"
            : step === 0
              ? "Delivery details"
              : step === 1
                ? "Review order"
                : "Confirm order"}
        </button>
      </div>
    ) : page === "payment" ? (
      <div className="checkout-dock single">
        <button className="primary full" onClick={() => nav("provider")}>
          Accept total & continue
        </button>
      </div>
    ) : page === "success" ? (
      <div className="checkout-dock single">
        <button className="primary full" onClick={() => nav("tracking")}>
          Track your order
        </button>
      </div>
    ) : null;
  return (
    <div className={"review-root " + (dark ? "dark" : "")}>
      <div className="review-toolbar">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            nav("home");
          }}
        >
          easygas<span>Mobile Next</span>
        </a>
        <button onClick={() => setReview(true)}>
          <SlidersHorizontal size={16} /> Review controls
        </button>
      </div>
      <main className="review-stage">
        <aside className="design-caption">
          <Label>THE NEXT EASYGAS EXPERIENCE</Label>
          <h1>
            Less friction.
            <br />
            More living.
          </h1>
          <p>
            A calm, considered mobile app for customers and the people behind
            every delivery.
          </p>
          <div className="caption-tags">
            <span>One clear next step</span>
            <span>Saved progress</span>
            <span>Every role connected</span>
          </div>
          <small>
            Interactive mobile design · synthetic data
            <br />
            Existing production controls remain in force.
          </small>
        </aside>
        <div className="phone-shell">
          <div className="device-status">
            <b>9:41</b>
            <span>
              <Signal size={15} />
              <Wifi size={15} />
              <BatteryFull size={19} />
            </span>
          </div>
          <div className="app-frame">
            <header className="app-header">
              {page === "home" ? (
                <>
                  <img
                    src="/assets/easygas-logo-hd.png"
                    alt="EasyGas Energy Solutions"
                  />
                  <div>
                    <button
                      className="icon-button"
                      aria-label="Notifications"
                      onClick={() => nav("notifications")}
                    >
                      <Icon as={Bell} />
                    </button>
                    <button
                      className="avatar"
                      aria-label="Account"
                      onClick={() => nav("account")}
                    >
                      SC
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    className="icon-button"
                    aria-label="Go back"
                    onClick={back}
                  >
                    <Icon as={ChevronLeft} />
                  </button>
                  <b>{titles[page] || "EasyGas"}</b>
                  <button
                    className="icon-button"
                    aria-label="More workspaces"
                    onClick={() => nav("workspaces")}
                  >
                    <Icon as={MoreHorizontal} />
                  </button>
                </>
              )}
            </header>
            {step >= 0 && (
              <div
                className="checkout-steps"
                aria-label={`Step ${step + 1} of 3`}
              >
                {["Refill", "Delivery", "Review"].map((s, i) => (
                  <span className={i <= step ? "active" : ""} key={s}>
                    <i>{i < step ? <Check size={12} /> : i + 1}</i>
                    {s}
                  </span>
                ))}
              </div>
            )}
            <div className="screen-scroll" ref={screen} tabIndex={-1}>
              <div className="screen-content" key={page}>
                {state.scenario === "offline" && (
                  <div className="notice" role="status">
                    You’re offline in this example. Saved details remain
                    available. Reconnect before confirming changes.
                  </div>
                )}
                {loadState === "loading" ? (
                  <div
                    className="skeleton"
                    role="progressbar"
                    aria-label="Loading screen"
                  >
                    <i />
                    <i />
                    <i />
                  </div>
                ) : (
                  body
                )}
                {error && page !== "payment-check" && (
                  <div className="notice" role="alert">
                    {error}
                  </div>
                )}
              </div>
            </div>
            {footer}
            <nav className="bottom-tabs" aria-label="Main navigation">
              {tabs.map(([p, t, I]: any) => (
                <button
                  key={p}
                  aria-current={activeTab === p ? "page" : undefined}
                  className={activeTab === p ? "active" : ""}
                  onClick={() => nav(p)}
                >
                  <Icon as={I} />
                  <span>{t}</span>
                </button>
              ))}
            </nav>
          </div>
          <div className="home-indicator">
            <i />
          </div>
        </div>
        <aside className="flow-caption">
          <Label>DESIGNED AROUND THE JOURNEY</Label>
          <h2>
            Choose.
            <br />
            Confirm.
            <br />
            Carry on.
          </h2>
          <p>
            No repeated forms.
            <br />
            No wall of buttons.
            <br />
            No sign-in loop after payment.
          </p>
          <button className="text-button" onClick={newOrder}>
            Explore the refill journey <ArrowUpRight size={18} />
          </button>
          <div className="scope-count">
            <b>36</b>
            <span>
              connected feature families
              <br />
              300 retained feature items
            </span>
          </div>
        </aside>
      </main>
      <div className="review-bottom">
        {personas.find((r) => r[0] === persona)?.[1]} · Private interactive
        mobile prototype · No real orders or payments
      </div>
      {review && (
        <Sheet
          title="Review the mobile experience"
          onClose={() => setReview(false)}
        >
          <Field label="Review role">
            <select
              value={persona}
              onChange={(e) => selectPersona(e.target.value)}
            >
              {personas.map(([v, t]) => (
                <option value={v} key={v}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Exception scenario">
            <select
              value={scenario}
              onChange={(e) => {
                state.scenario = e.target.value;
                save();
                setScenario(e.target.value);
                setError("");
                setReview(false);
              }}
            >
              {[
                ["normal", "Normal connection"],
                ["slow-network", "Slow connection · skeleton"],
                ["offline", "Offline"],
                ["expired-session", "Expired session"],
                ["payment-failed", "Declined payment"],
                ["pending-payment", "Payment pending"],
                ["empty-data", "Empty records"],
                ["expired-meter", "Expired meter calibration"],
                ["outside-coverage", "Outside service coverage"],
              ].map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <div className="review-actions">
            <button
              className="secondary"
              onClick={() => {
                setDark(!dark);
                setReview(false);
              }}
            >
              {dark ? "Use light appearance" : "Use dark appearance"}
            </button>
            <button
              className="secondary"
              onClick={() => {
                setReview(false);
                nav("workspaces");
              }}
            >
              Browse all role features
            </button>
            <button
              className="secondary"
              onClick={() => {
                reset();
                selectPersona("customer");
                setDraft(freshDraft());
                setToast("Only local prototype data was reset.");
              }}
            >
              Reset synthetic data
            </button>
          </div>
          <p className="subtle">
            Review personas are available only in this isolated prototype. The
            installed app continues to use its existing secure sign-in.
          </p>
        </Sheet>
      )}
      {sheet && (
        <Sheet title={sheet.title} onClose={() => setSheet(null)}>
          {sheet.command ? (
            <CommandForm
              command={sheet.command}
              onDone={(r: any) => {
                setSheet(null);
                setToast("Saved in this local prototype.");
                save();
              }}
            />
          ) : (
            <Details value={sheet.value} />
          )}
        </Sheet>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);

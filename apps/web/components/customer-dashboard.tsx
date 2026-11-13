"use client";
import Link from "./workspace-link";
import {
  ArrowRight,
  ShoppingCart,
  CalendarDays,
  Wallet,
  Gift,
  Package,
  Clock,
  ChartColumn,
  Leaf,
  Check,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Component, type ReactNode } from "react";
import { money } from "./ui";
import { EasyGasLoader } from "./easygas-loader";
import { useCustomerResource } from "./customer-data";
class WidgetBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div role="alert">
        <p>This card could not be displayed.</p>
        <button
          className="button secondary"
          onClick={() => this.setState({ failed: false })}
        >
          Try again
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function Widget({
  resource,
  children,
}: {
  resource: ReturnType<typeof useCustomerResource>;
  children: ReactNode;
}) {
  return resource.loading ? (
    <EasyGasLoader variant="section" size="sm" label="Loading dashboard card" />
  ) : resource.error ? (
    <div className="customer-widget-error" role="alert">
      <p>{resource.error}</p>
      <button className="button secondary" onClick={resource.retry}>
        Retry <RefreshCw size={15} />
      </button>
    </div>
  ) : (
    <WidgetBoundary>{children}</WidgetBoundary>
  );
}
const date = (v: string) =>
  new Date(v).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos",
  });
export default function CustomerDashboard({ user }: { user: any }) {
  const appointment = useCustomerResource(
    "customer.dashboard?widget=appointment",
    user.id,
  );
  const orders = useCustomerResource(
      "customer.dashboard?widget=orders",
      user.id,
    ),
    wallet = useCustomerResource("wallet", user.id),
    schedules = useCustomerResource("schedules", user.id),
    activity = useCustomerResource(
      "customer.dashboard?widget=activity",
      user.id,
    ),
    history = useCustomerResource("customer.dashboard?widget=history", user.id),
    profiles = useCustomerResource("refill.profiles", user.id);
  const counts = orders.data?.counts ?? [],
    total = counts.reduce((n: number, r: any) => n + Number(r.count), 0);
  const next = schedules.data?.find((p: any) => p.status === "active");
  const reportedRefill = profiles.data?.find(
    (p: any) => p.reminderState?.suppressPrediction,
  );
  const prediction = profiles.data?.find(
    (p: any) => p.active && p.forecast?.available,
  );
  const historyRows = history.data ?? [];
  const maxKg = Math.max(1, ...historyRows.map((r: any) => Number(r.kg)));
  return (
    <div className="customer-dashboard">
      <div className="customer-welcome">
        <span className="eyebrow">YOUR EASYGAS</span>
        <h1>More cooking. Less admin.</h1>
        <p>
          Order gas, book services, manage your account and stay on track with
          your refills.
        </p>
        <Link className="text-link" href="/account-settings#testimonials">
          Share your EasyGas experience <ArrowRight size={16} />
        </Link>
      </div>
      <section className="customer-hero" aria-labelledby="customer-hero-title">
        <div>
          <span className="eyebrow">RELIABLE COOKING GAS FOR EVERY HOME</span>
          <h2 id="customer-hero-title">
            A little less worry.
            <br />A lot more cooking.
          </h2>
          <p>Order with ease. Track your usage. Get timely refill reminders.</p>
          <Link className="button white" href="/gas-order">
            Order Gas <ArrowRight size={18} />
          </Link>
        </div>
        <img
          src="/assets/cylinder-illustration.png"
          alt="Green EasyGas cooking gas cylinder"
        />
        <ul>
          {[
            "Quality gas",
            "Reliable delivery",
            "Flexible refills",
            "Expert installation",
          ].map((t) => (
            <li key={t}>
              <Check size={16} />
              {t}
            </li>
          ))}
        </ul>
      </section>
      <nav className="customer-quick-actions" aria-label="Quick actions">
        {[
          {
            Icon: ShoppingCart,
            title: "Order Gas",
            text: "Quick and easy",
            href: "/gas-order",
            tone: "green",
          },
          {
            Icon: CalendarDays,
            title: "Book a Service",
            text: "Installations & repairs",
            href: "/services",
            tone: "blue",
          },
          {
            Icon: Wallet,
            title: "Top Up Wallet",
            text: "Bank transfer or card",
            href: "/wallet#top-up",
            tone: "orange",
          },
          {
            Icon: Gift,
            title: "View Rewards",
            text: "Check your points",
            href: "/rewards",
            tone: "purple",
          },
          {
            Icon: CalendarDays,
            title: "Plan a Refill",
            text: "Stay on track",
            href: "/schedules",
            tone: "green",
          },
        ].map(({ Icon, title, text, href, tone }) => (
          <Link className={`customer-quick ${tone}`} href={href} key={title}>
            <span className="customer-icon">
              <Icon size={24} />
            </span>
            <span>
              <strong>{title}</strong>
              <small>{text}</small>
            </span>
            <ArrowRight size={17} />
          </Link>
        ))}
      </nav>
      <section className="customer-card" style={{ marginBottom: 18 }}>
        <header>
          <h2>Next service appointment</h2>
          <Link href="/bookings">
            View bookings <ArrowRight size={15} />
          </Link>
        </header>
        <Widget resource={appointment}>
          {appointment.data ? (
            <p>
              <strong>{appointment.data.name}</strong> ·{" "}
              {date(appointment.data.starts_at)} ·{" "}
              {appointment.data.status.replaceAll("_", " ")}
            </p>
          ) : (
            <p>
              No upcoming service appointment.{" "}
              <Link href="/services">Book a Service</Link>
            </p>
          )}
        </Widget>
      </section>
      <div className="customer-summary-grid">
        <section className="customer-card">
          <header>
            <h2>
              <Package />
              Your Orders
            </h2>
            <Link href="/orders">
              View all <ArrowRight size={15} />
            </Link>
          </header>
          <Widget resource={orders}>
            <strong className="customer-metric">{total}</strong>
            <p>Orders in your account</p>
            {counts.length ? (
              <ul className="customer-order-counts">
                {counts.map((r: any) => (
                  <li key={r.status}>
                    <span className={`customer-dot ${r.status}`} />
                    {r.count} {r.status.replaceAll("_", " ")}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Your first order starts here.</p>
            )}
            {orders.data?.latest && (
              <small>
                Latest: {orders.data.latest.reference} ·{" "}
                {orders.data.latest.status.replaceAll("_", " ")}
              </small>
            )}
          </Widget>
        </section>
        <section className="customer-card">
          <header>
            <h2>
              <Wallet />
              Wallet Balance
            </h2>
            <Link href="/wallet">
              View <ArrowRight size={15} />
            </Link>
          </header>
          <Widget resource={wallet}>
            <strong className="customer-metric">
              {wallet.data && money(wallet.data.balanceKobo)}
            </strong>
            <p>Available balance · NGN</p>
            <Link className="button" href="/wallet#top-up">
              Top Up Wallet
            </Link>
            <div className="customer-card-note blue">
              <Wallet />
              <span>
                Bank transfers require business approval. Card top-ups credit
                automatically after payment verification.
              </span>
            </div>
          </Widget>
        </section>
        <section className="customer-card">
          <header>
            <h2>
              <Gift />
              EasyRewards
            </h2>
            <Link href="/rewards">
              View <ArrowRight size={15} />
            </Link>
          </header>
          <Widget resource={wallet}>
            <strong className="customer-metric">{wallet.data?.points}</strong>
            <p>Points</p>
            <div className="customer-card-note pink">
              <Gift />
              <span>Explore your rewards and programme benefits.</span>
            </div>
          </Widget>
        </section>
        <section className="customer-card">
          <header>
            <h2>
              <CalendarDays />
              Next Refill
            </h2>
            <Link href="/schedules">
              Set plan <ArrowRight size={15} />
            </Link>
          </header>
          <Widget resource={schedules}>
            {next ? (
              <>
                <strong>{date(next.next_date)}</strong>
                <p>
                  {next.product_name} · every {next.interval_days} days
                </p>
                <span className="customer-status">Active plan</span>
              </>
            ) : (
              <>
                <strong>No active refill plan</strong>
                <p>Create a plan and we'll help you stay prepared.</p>
                <Link className="button secondary" href="/schedules">
                  Create a Refill Plan
                </Link>
              </>
            )}
          </Widget>
        </section>
      </div>
      <div className="customer-detail-grid">
        <section className="customer-card">
          <header>
            <h2>
              <Clock />
              Recent Activity
            </h2>
            <Link href="/notifications">
              View all <ArrowRight size={15} />
            </Link>
          </header>
          <Widget resource={activity}>
            {activity.data?.length ? (
              <ol className="customer-activity">
                {activity.data.map((a: any) => (
                  <li key={a.id}>
                    <span className="customer-icon">
                      <ActivityIcon title={a.title} />
                    </span>
                    <Link href={a.href}>
                      <strong>{a.title}</strong>
                      <span>{a.detail}</span>
                    </Link>
                    <div>
                      <time dateTime={a.created_at}>{date(a.created_at)}</time>
                      <span className="customer-status">
                        {a.status.replaceAll("_", " ")}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="customer-empty">
                <Package />
                <p>
                  Your EasyGas activity will appear here once you place an order
                  or book a service.
                </p>
                <Link href="/gas-order">
                  Place your first order <ArrowRight size={15} />
                </Link>
              </div>
            )}
          </Widget>
        </section>
        <section className="customer-card">
          <header>
            <h2>
              <ChartColumn />
              Gas Purchase History
            </h2>
            <Link href="/consumption">
              View details <ArrowRight size={15} />
            </Link>
          </header>
          <p>Verified delivered gas purchases, not measured consumption.</p>
          <div className="customer-usage">
            <div>
              <Widget resource={history}>
                {historyRows.length ? (
                  <>
                    <div className="customer-history-bars" aria-hidden="true">
                      {[...historyRows].reverse().map((r: any) => (
                        <div key={r.id}>
                          <span
                            style={{
                              height: `${Math.max(4, (Number(r.kg) / maxKg) * 100)}%`,
                            }}
                          />
                          <small>
                            {new Date(r.date).toLocaleDateString("en-NG", {
                              day: "numeric",
                              month: "short",
                            })}
                          </small>
                        </div>
                      ))}
                    </div>
                    <details className="customer-history-table">
                      <summary>Purchase history data</summary>
                      <table>
                        <caption>Verified gas purchases</caption>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Reference</th>
                            <th>Gas (kg)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyRows.map((r: any) => (
                            <tr key={r.id}>
                              <td>{date(r.date)}</td>
                              <td>{r.reference}</td>
                              <td>{Number(r.kg)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </details>
                  </>
                ) : (
                  <div className="customer-empty">
                    <ChartColumn />
                    <p>Your verified gas purchase history will appear here.</p>
                    <Link href="/consumption">
                      Add Gas Profile <Plus size={15} />
                    </Link>
                  </div>
                )}
              </Widget>
            </div>
            <aside className="customer-smart-refill">
              <Leaf size={28} />
              <h3>Smart Refill</h3>
              <Widget resource={profiles}>
                {prediction ? (
                  <>
                    <span className="customer-status">
                      Estimate · {prediction.forecast.confidence} confidence
                    </span>
                    <p>
                      {prediction.label}: you may need gas in approximately{" "}
                      {prediction.forecast.daysLeft} days.
                    </p>
                    <p>
                      Estimated next refill:{" "}
                      {date(prediction.forecast.nextDate)}
                    </p>
                    <small>{prediction.forecast.reason}</small>
                  </>
                ) : (
                  <>
                    <strong>
                      {reportedRefill
                        ? "Your refill update is recorded."
                        : "Your smart refill journey starts here."}
                    </strong>
                    <p>
                      {reportedRefill
                        ? reportedRefill.reminderState.reason
                        : "After enough verified purchases, we can estimate when you may need your next refill."}
                    </p>
                  </>
                )}
                <Link className="button secondary" href="/refill">
                  {prediction ? "Update gas feedback" : "Set Up Smart Refill"}
                </Link>
                <Link href="/account-settings">Reminder preferences</Link>
              </Widget>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}
function ActivityIcon({ title }: { title: string }) {
  const Icon = /service/i.test(title)
    ? WrenchIcon
    : /reward/i.test(title)
      ? Gift
      : /wallet/i.test(title)
        ? Wallet
        : /refill/i.test(title)
          ? CalendarDays
          : ShoppingCart;
  return <Icon size={21} />;
}
import { Wrench as WrenchIcon } from "lucide-react";

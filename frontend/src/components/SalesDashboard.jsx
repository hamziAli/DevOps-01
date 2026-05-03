import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, Clock3, DollarSign, Repeat2, TrendingUp } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function productName() {
  const products = ["Starter Plan", "Pro Plan", "Enterprise Add-on", "Analytics Pack", "Storage Upgrade"];
  return products[randomInt(0, products.length - 1)];
}

function customerName() {
  const names = ["Ayesha", "Bilal", "Fatima", "Hamza", "Ibrahim", "Zara", "Hassan", "Noor"];
  return names[randomInt(0, names.length - 1)];
}

function timeLabel(date = new Date()) {
  return date.toLocaleTimeString("en-US", { hour12: false });
}

function MetricCard({ title, value, icon: Icon, description, valueClassName = "" }) {
  return (
    <article className="sales-metric-card">
      <div className="sales-metric-head">
        <span>{title}</span>
        <Icon size={16} />
      </div>
      <p className={`sales-metric-value ${valueClassName}`}>{value}</p>
      <p className="sales-metric-desc">{description}</p>
    </article>
  );
}

function RealtimeChart({ data, title, lineColor, legendName }) {
  const chartData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    return data.slice(-120);
  }, [data]);

  return (
    <section className="sales-chart-card">
      <h3>
        <BarChart3 size={18} /> {title}
      </h3>
      <div className="sales-chart-wrap">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 15, right: 20, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(value) => `$${Math.round(value)}`} />
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value) || 0), legendName]}
              contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8 }}
              labelStyle={{ color: "#9ca3af" }}
            />
            <Legend />
            <Line type="monotone" dataKey="sales" stroke={lineColor} strokeWidth={2} dot={false} name={legendName} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default function SalesDashboard() {
  const [salesData, setSalesData] = useState([]);
  const [cumulativeData, setCumulativeData] = useState([]);
  const [latestPayments, setLatestPayments] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [salesCount, setSalesCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const amount = randomInt(30, 900);
      const now = new Date();
      const label = timeLabel(now);

      setSalesData((prev) => [...prev, { time: label, sales: amount }].slice(-120));
      setTotalRevenue((prev) => {
        const next = prev + amount;
        setCumulativeData((cumPrev) => [...cumPrev, { time: label, sales: next }].slice(-120));
        return next;
      });
      setSalesCount((prev) => prev + 1);
      setLatestPayments((prev) =>
        [
          { id: `${Date.now()}-${Math.random()}`, amount, product: productName(), customer: customerName(), time: label },
          ...prev
        ].slice(0, 10)
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const averageSale = salesCount ? totalRevenue / salesCount : 0;

  return (
    <section className="panel-card sales-shell">
      <h2 className="sales-title">Active Sales Tracker</h2>
      <p className="sales-subtitle">Simulated real-time sales insights for dashboard presentation.</p>

      <div className="sales-metric-grid">
        <MetricCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={DollarSign} description="Cumulative revenue generated" valueClassName="sales-green" />
        <MetricCard title="Total Transactions" value={salesCount.toLocaleString()} icon={Repeat2} description="Number of sales recorded" />
        <MetricCard title="Average Sale" value={formatCurrency(averageSale)} icon={TrendingUp} description="Average value per transaction" valueClassName="sales-blue" />
        <article className="sales-metric-card">
          <div className="sales-metric-head">
            <span>Activity Status</span>
            <Clock3 size={16} />
          </div>
          <p className="sales-metric-value">
            <Activity className="sales-live-icon" size={18} /> Live
          </p>
          <p className="sales-metric-desc">Data stream updates every 2 seconds</p>
        </article>
      </div>

      <div className="sales-chart-grid">
        <RealtimeChart data={salesData} title="Sales per Update" lineColor="#3b82f6" legendName="Sales Amount" />
        <RealtimeChart data={cumulativeData} title="Cumulative Revenue Trend" lineColor="#8b5cf6" legendName="Cumulative Revenue" />
      </div>

      <section className="sales-payments">
        <h3>Latest Payments</h3>
        {latestPayments.length === 0 ? (
          <p className="sales-muted">No payments yet...</p>
        ) : (
          <div className="sales-payments-list">
            {latestPayments.map((payment) => (
              <div key={payment.id} className="sales-payment-item">
                <div>
                  <p className="sales-payment-amount">{formatCurrency(payment.amount)}</p>
                  <p className="sales-muted">
                    {payment.product} by {payment.customer}
                  </p>
                </div>
                <span className="sales-muted">{payment.time}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

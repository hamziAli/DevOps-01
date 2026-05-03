import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function LogChart({ stats }) {
  const chartData = [
    { level: "INFO", count: stats.INFO ?? 0 },
    { level: "WARN", count: stats.WARN ?? 0 },
    { level: "ERROR", count: stats.ERROR ?? 0 }
  ];

  return (
    <section className="panel-card chart-card">
      <h2>Logs By Type</h2>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="level" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#4f46e5" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default LogChart;

const CARD_CONFIG = [
  { key: "total", label: "Total Logs" },
  { key: "INFO", label: "Info" },
  { key: "WARN", label: "Warnings" },
  { key: "ERROR", label: "Errors" }
];

function StatsBar({ stats, loading }) {
  return (
    <section className="stats-grid">
      {CARD_CONFIG.map((card) => (
        <article key={card.key} className="stat-card">
          <p className="stat-label">{card.label}</p>
          <h3 className="stat-value">{loading ? "..." : stats[card.key] ?? 0}</h3>
        </article>
      ))}
    </section>
  );
}

export default StatsBar;

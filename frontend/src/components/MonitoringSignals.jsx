import { useMemo } from "react";

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function parseNumberWithUnit(rawValue, rawUnit) {
  const value = Number(rawValue);
  if (Number.isNaN(value)) return null;
  if (!rawUnit || rawUnit.toLowerCase() === "ms") return value;
  if (rawUnit.toLowerCase() === "s") return value * 1000;
  if (rawUnit.toLowerCase() === "m") return value * 60000;
  return value;
}

function buildSignals(logs) {
  const safeLogs = Array.isArray(logs) ? logs : [];
  const windowLogs = safeLogs.slice(0, 200);

  const cpuMemoryValues = [];
  const status5xxCount = { recent: 0, previous: 0 };
  const latencyValues = [];
  let authTotal = 0;
  let authFailures = 0;
  const buildTimes = [];

  const half = Math.floor(windowLogs.length / 2) || 1;

  windowLogs.forEach((log, index) => {
    const text = `${log?.message || ""} ${log?.source || ""}`.toLowerCase();

    const utilMatches = [...text.matchAll(/\b(?:cpu|memory|ram|mem)[\s:=]+(\d+(?:\.\d+)?)\s*%/g)];
    utilMatches.forEach((match) => cpuMemoryValues.push(Number(match[1])));

    const is5xx = /\b5\d{2}\b/.test(text) || (log?.type === "ERROR" && /\b(server error|gateway|timeout)\b/i.test(log?.message || ""));
    if (is5xx) {
      if (index < half) status5xxCount.recent += 1;
      else status5xxCount.previous += 1;
    }

    const latencyMatch = text.match(/\b(?:latency|response[_\s-]?time|p99)[\s:=]+(\d+(?:\.\d+)?)\s*(ms|s|m)?\b/i);
    if (latencyMatch) {
      const ms = parseNumberWithUnit(latencyMatch[1], latencyMatch[2]);
      if (ms !== null) latencyValues.push(ms);
    }

    const isAuthEvent = /\b(auth|login|signin|token)\b/.test(text);
    const isAuthFailure = /\b(fail|failed|invalid|unauthorized|denied|forbidden)\b/.test(text) && isAuthEvent;
    if (isAuthEvent) authTotal += 1;
    if (isAuthFailure) authFailures += 1;

    const looksLikeCi = /\b(ci|cd|pipeline|build|github actions|jenkins)\b/.test(text);
    const buildMatch = text.match(/\b(?:build(?:[_\s-]?time)?|pipeline(?:[_\s-]?time)?)[\s:=]+(\d+(?:\.\d+)?)\s*(ms|s|m)?\b/i);
    if (looksLikeCi && buildMatch) {
      const ms = parseNumberWithUnit(buildMatch[1], buildMatch[2]);
      if (ms !== null) buildTimes.push(ms);
    }
  });

  const infraMax = cpuMemoryValues.length ? Math.max(...cpuMemoryValues) : null;
  const p99Latency = percentile(latencyValues, 99);
  const authFailureRate = authTotal ? (authFailures / authTotal) * 100 : null;
  const buildMedian = percentile(buildTimes, 50);

  const is5xxSpike = status5xxCount.recent >= Math.max(3, status5xxCount.previous * 1.5);

  return [
    {
      category: "Infrastructure",
      metric: "High CPU/Memory Usage",
      reason: "Predicts system crashes before they happen.",
      value: infraMax !== null ? `${infraMax.toFixed(1)}% max observed` : "No CPU/memory telemetry in logs yet",
      status: infraMax === null ? "no-data" : infraMax > 85 ? "critical" : infraMax > 70 ? "warn" : "ok"
    },
    {
      category: "Application",
      metric: "5xx Error Spike",
      reason: "Indicates critical service failure.",
      value: `${status5xxCount.recent} recent / ${status5xxCount.previous} previous`,
      status: is5xxSpike ? "critical" : status5xxCount.recent > 0 ? "warn" : "ok"
    },
    {
      category: "Performance",
      metric: "P99 Latency",
      reason: "Reveals performance degradation for users.",
      value: p99Latency !== null ? `${Math.round(p99Latency)} ms` : "No latency metrics in logs yet",
      status: p99Latency === null ? "no-data" : p99Latency > 1500 ? "critical" : p99Latency > 600 ? "warn" : "ok"
    },
    {
      category: "Security",
      metric: "Auth Failure Rate",
      reason: "Signals potential brute-force attacks.",
      value: authFailureRate !== null ? `${authFailureRate.toFixed(1)}% (${authFailures}/${authTotal})` : "No auth logs yet",
      status: authFailureRate === null ? "no-data" : authFailureRate > 30 ? "critical" : authFailureRate > 10 ? "warn" : "ok"
    },
    {
      category: "CI/CD",
      metric: "Pipeline Build Time",
      reason: "Identifies inefficiencies in development workflows.",
      value: buildMedian !== null ? `${Math.round(buildMedian)} ms median` : "No CI/CD build logs yet",
      status: buildMedian === null ? "no-data" : buildMedian > 600000 ? "critical" : buildMedian > 180000 ? "warn" : "ok"
    }
  ];
}

function statusLabel(status) {
  if (status === "critical") return "Critical";
  if (status === "warn") return "Warning";
  if (status === "ok") return "Healthy";
  return "No Data";
}

export default function MonitoringSignals({ logs, onGenerateDemoLogs, generatingDemoLogs }) {
  const signals = useMemo(() => buildSignals(logs), [logs]);

  return (
    <section className="panel-card monitor-signals">
      <div className="monitor-signals-head">
        <h2>Monitoring Signals</h2>
        <button type="button" onClick={onGenerateDemoLogs} disabled={generatingDemoLogs}>
          {generatingDemoLogs ? "Generating..." : "Generate Demo Logs"}
        </button>
      </div>
      <p className="monitor-signals-subtitle">Core DevOps metrics mapped to your live log stream.</p>
      <div className="signals-grid">
        {signals.map((item) => (
          <article key={item.category} className="signal-card">
            <div className="signal-header">
              <span className="signal-category">{item.category}</span>
              <span className={`signal-status signal-${item.status}`}>{statusLabel(item.status)}</span>
            </div>
            <h3>{item.metric}</h3>
            <p className="signal-value">{item.value}</p>
            <p className="signal-reason">{item.reason}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

import { useCallback, useEffect, useState } from "react";
import InjectPanel from "./components/InjectPanel";
import LogChart from "./components/LogChart";
import LogTable from "./components/LogTable";
import MonitoringSignals from "./components/MonitoringSignals";
import SalesDashboard from "./components/SalesDashboard";
import StatsBar from "./components/StatsBar";
import SystemMonitor from "./components/SystemMonitor";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

async function requestJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const payload = await response.json();
      if (payload?.error) {
        message = payload.error;
      }
    } catch {
      // Intentionally ignore parse errors and keep fallback message.
    }
    throw new Error(message);
  }

  return response.json();
}

function App() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ INFO: 0, WARN: 0, ERROR: 0, total: 0 });
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [posting, setPosting] = useState(false);
  const [generatingDemoLogs, setGeneratingDemoLogs] = useState(false);
  const [error, setError] = useState("");

  const fetchLogs = useCallback(async () => {
    const data = await requestJson(`${API_BASE}/logs`);
    setLogs(Array.isArray(data) ? data : []);
  }, []);

  const fetchStats = useCallback(async () => {
    const data = await requestJson(`${API_BASE}/logs/stats`);
    setStats({
      INFO: data?.INFO ?? 0,
      WARN: data?.WARN ?? 0,
      ERROR: data?.ERROR ?? 0,
      total: data?.total ?? 0
    });
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      setError("");
      await Promise.all([fetchLogs(), fetchStats()]);
    } catch (err) {
      setError(err.message || "Unable to fetch data from backend.");
    } finally {
      setLoadingLogs(false);
      setLoadingStats(false);
    }
  }, [fetchLogs, fetchStats]);

  useEffect(() => {
    refreshAll();
    const timer = setInterval(refreshAll, 3000);
    return () => clearInterval(timer);
  }, [refreshAll]);

  const handleInject = async (payload) => {
    try {
      setPosting(true);
      setError("");
      await requestJson(`${API_BASE}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to post log.");
    } finally {
      setPosting(false);
    }
  };

  const handleClear = async () => {
    try {
      setError("");
      await requestJson(`${API_BASE}/logs`, { method: "DELETE" });
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to clear logs.");
    }
  };

  const handleGenerateDemoLogs = async () => {
    const demoPayloads = [
      { type: "WARN", source: "infra-monitor", message: "cpu=88% memory=79% host=node-1" },
      { type: "ERROR", source: "api-gateway", message: "status=503 gateway timeout service=orders" },
      { type: "WARN", source: "perf-tracker", message: "latency=920ms endpoint=/checkout p99=1400ms" },
      { type: "ERROR", source: "auth-service", message: "auth failed invalid password for user=admin" },
      { type: "INFO", source: "github-actions", message: "pipeline build_time=245s branch=main stage=deploy" }
    ];

    try {
      setGeneratingDemoLogs(true);
      setError("");
      await Promise.all(
        demoPayloads.map((payload) =>
          requestJson(`${API_BASE}/logs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          })
        )
      );
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to generate demo logs.");
    } finally {
      setGeneratingDemoLogs(false);
    }
  };

  return (
    <div className="app-shell">
      <header>
        <h1>Log Monitoring Dashboard</h1>
        <p>Realtime logs from Flask + MongoDB</p>
      </header>

      {error ? (
        <p className="error-banner">
          {error}. Make sure Flask backend is running on <strong>http://localhost:5000</strong>.
        </p>
      ) : null}

      <StatsBar stats={stats} loading={loadingStats} />

      <div className="top-grid">
        <InjectPanel onInject={handleInject} posting={posting} />
        <LogChart stats={stats} />
      </div>

      <MonitoringSignals logs={logs} onGenerateDemoLogs={handleGenerateDemoLogs} generatingDemoLogs={generatingDemoLogs} />
      <SalesDashboard />
      <LogTable logs={logs} loading={loadingLogs} onClear={handleClear} />
      <SystemMonitor />
    </div>
  );
}

export default App;

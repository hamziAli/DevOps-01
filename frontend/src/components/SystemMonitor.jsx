import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Cpu, HardDrive, Wifi, Zap } from "lucide-react";

function generateDataPoint(baseValue, variance, spikeChance = 0.05) {
  const isSpike = Math.random() < spikeChance;
  const multiplier = isSpike ? 1.5 + Math.random() * 0.5 : 1;
  const value = Math.max(0, Math.min(100, baseValue + (Math.random() - 0.5) * variance * multiplier));
  return { value, timestamp: Date.now(), isSpike: isSpike && value > 70 };
}

function Sparkline({ data, color = "#3b82f6", spikeColor = "#ef4444", width = 60, height = 20 }) {
  if (!data.length) {
    return <svg width={width} height={height} />;
  }

  const points = data.map((point, index) => ({
    x: data.length === 1 ? 0 : (index / (data.length - 1)) * width,
    y: height - (point.value / 100) * height,
    isSpike: point.isSpike
  }));

  const path = points.reduce((acc, point, index) => (index === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`), "");
  const hasSpikes = points.some((point) => point.isSpike);
  const gradientId = `monitor-gradient-${color.replace("#", "")}`;

  return (
    <svg width={width} height={height} className="monitor-svg">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={hasSpikes ? spikeColor : color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={hasSpikes ? spikeColor : color} stopOpacity={0.1} />
        </linearGradient>
      </defs>

      <motion.path
        d={`${path} L ${width} ${height} L 0 ${height} Z`}
        fill={`url(#${gradientId})`}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />

      <motion.path
        d={path}
        fill="none"
        stroke={hasSpikes ? spikeColor : color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </svg>
  );
}

function ResourceCard({ icon: Icon, label, value, data, color, unit = "%" }) {
  const hasSpikes = data.some((point) => point.isSpike);
  return (
    <div className="monitor-row">
      <div className="monitor-icon-wrap">
        <Icon className={`monitor-icon ${hasSpikes ? "monitor-red" : ""}`} />
      </div>
      <div className="monitor-row-main">
        <div className="monitor-row-head">
          <span>{label}</span>
          <span className={hasSpikes ? "monitor-red" : ""}>
            {value.toFixed(1)} {unit}
          </span>
        </div>
        <Sparkline data={data} color={color} />
      </div>
    </div>
  );
}

function AgentMemoryCard({ agent }) {
  const currentValue = agent.memory[agent.memory.length - 1]?.value || 0;
  const hasSpikes = agent.memory.some((point) => point.isSpike);
  return (
    <div className="monitor-agent-row">
      <span className={`monitor-agent-dot ${hasSpikes ? "monitor-red-bg" : ""}`} style={hasSpikes ? undefined : { backgroundColor: agent.color }} />
      <span className="monitor-agent-name">{agent.name}</span>
      <span className={hasSpikes ? "monitor-red" : ""}>{currentValue.toFixed(0)}MB</span>
    </div>
  );
}

export default function SystemMonitor() {
  const [resourceData, setResourceData] = useState({ cpu: [], gpu: [], vram: [], network: [], memory: [] });
  const [agents, setAgents] = useState([
    { id: "1", name: "Web Agent", memory: [], color: "#3b82f6" },
    { id: "2", name: "Unit Test Agent", memory: [], color: "#10b981" },
    { id: "3", name: "PR Agent #1", memory: [], color: "#f59e0b" },
    { id: "4", name: "Video Agent", memory: [], color: "#8b5cf6" }
  ]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setResourceData((prev) => {
        const maxPoints = 20;
        return {
          cpu: [...prev.cpu, generateDataPoint(45, 30, 0.08)].slice(-maxPoints),
          gpu: [...prev.gpu, generateDataPoint(35, 25, 0.06)].slice(-maxPoints),
          vram: [...prev.vram, generateDataPoint(60, 20, 0.05)].slice(-maxPoints),
          network: [...prev.network, generateDataPoint(25, 40, 0.1)].slice(-maxPoints),
          memory: [...prev.memory, generateDataPoint(70, 15, 0.04)].slice(-maxPoints)
        };
      });

      setAgents((prevAgents) =>
        prevAgents.map((agent) => {
          const baseMemory = agent.id === "1" ? 150 : agent.id === "2" ? 200 : agent.id === "3" ? 80 : 120;
          const newPoint = generateDataPoint(baseMemory, 50, 0.06);
          return { ...agent, memory: [...agent.memory, newPoint].slice(-15) };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const currentCpu = resourceData.cpu[resourceData.cpu.length - 1]?.value || 0;
  const currentGpu = resourceData.gpu[resourceData.gpu.length - 1]?.value || 0;
  const currentVram = resourceData.vram[resourceData.vram.length - 1]?.value || 0;
  const currentNetwork = resourceData.network[resourceData.network.length - 1]?.value || 0;
  const currentMemory = resourceData.memory[resourceData.memory.length - 1]?.value || 0;

  const hasAnySpikes = useMemo(
    () =>
      [...resourceData.cpu, ...resourceData.gpu, ...resourceData.vram, ...resourceData.network, ...resourceData.memory, ...agents.flatMap((agent) => agent.memory)].some(
        (point) => point.isSpike
      ),
    [resourceData, agents]
  );

  return (
    <motion.div className="monitor-shell" initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
      <div className="monitor-card">
        <motion.div className="monitor-header" onClick={() => setIsExpanded((current) => !current)}>
          <div className="monitor-title-wrap">
            <Activity className={`monitor-icon ${hasAnySpikes ? "monitor-red" : ""}`} />
            <span>System Monitor</span>
            {hasAnySpikes ? <span className="monitor-badge">Spike</span> : null}
          </div>
          <motion.span animate={{ rotate: isExpanded ? 180 : 0 }}>▼</motion.span>
        </motion.div>

        <div className="monitor-grid">
          <ResourceCard icon={Cpu} label="CPU" value={currentCpu} data={resourceData.cpu} color="#3b82f6" />
          <ResourceCard icon={Zap} label="GPU" value={currentGpu} data={resourceData.gpu} color="#10b981" />
          <ResourceCard icon={HardDrive} label="VRAM" value={currentVram} data={resourceData.vram} color="#f59e0b" />
          <ResourceCard icon={Wifi} label="Network" value={currentNetwork} data={resourceData.network} color="#8b5cf6" unit="MB/s" />
        </div>

        <AnimatePresence>
          {isExpanded ? (
            <motion.div className="monitor-expanded" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              <ResourceCard icon={HardDrive} label="System Memory" value={currentMemory} data={resourceData.memory} color="#ef4444" unit="GB" />
              <div className="monitor-agent-list">
                <p>Per-Agent Memory</p>
                {agents.map((agent) => (
                  <AgentMemoryCard key={agent.id} agent={agent} />
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

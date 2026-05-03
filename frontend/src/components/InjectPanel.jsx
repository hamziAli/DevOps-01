import { useState } from "react";

const LOG_TYPES = ["INFO", "WARN", "ERROR"];

function InjectPanel({ onInject, posting }) {
  const [message, setMessage] = useState("");
  const [type, setType] = useState("INFO");
  const [source, setSource] = useState("frontend-ui");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!message.trim()) {
      return;
    }

    await onInject({
      message: message.trim(),
      type,
      source: source.trim() || "frontend-ui"
    });

    setMessage("");
  };

  return (
    <section className="panel-card">
      <h2>Inject Log</h2>
      <form className="inject-form" onSubmit={handleSubmit}>
        <label>
          Message
          <input
            type="text"
            placeholder="Service message..."
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            required
          />
        </label>

        <label>
          Type
          <select value={type} onChange={(event) => setType(event.target.value)}>
            {LOG_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          Source
          <input
            type="text"
            placeholder="api-gateway"
            value={source}
            onChange={(event) => setSource(event.target.value)}
          />
        </label>

        <button type="submit" disabled={posting}>
          {posting ? "Sending..." : "Send Log"}
        </button>
      </form>
    </section>
  );
}

export default InjectPanel;

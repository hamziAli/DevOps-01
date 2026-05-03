function LogTable({ logs, loading, onClear }) {
  return (
    <section className="panel-card">
      <div className="table-header">
        <h2>Live Logs</h2>
        <button className="danger-btn" onClick={onClear}>
          Clear All
        </button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Type</th>
              <th>Source</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="placeholder-cell">
                  Loading logs...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="placeholder-cell">
                  No logs found
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log._id}>
                  <td>{new Date(log.timestamp).toLocaleTimeString()}</td>
                  <td>
                    <span className={`chip chip-${log.type.toLowerCase()}`}>{log.type}</span>
                  </td>
                  <td>{log.source}</td>
                  <td>{log.message}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default LogTable;

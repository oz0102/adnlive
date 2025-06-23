import React, { useState, useEffect, useRef } from 'react';

interface LogViewerProps {
  maxLines?: number;
}

const LogViewer: React.FC<LogViewerProps> = ({ maxLines = 100 }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Set up log listener
    const removeLogListener = window.electron.listeners.onStreamLog((log) => {
      setLogs(prevLogs => {
        const newLogs = [...prevLogs, log];
        // Keep only the last maxLines
        if (newLogs.length > maxLines) {
          return newLogs.slice(newLogs.length - maxLines);
        }
        return newLogs;
      });
    });

    return () => {
      removeLogListener();
    };
  }, [maxLines]);

  // Auto-scroll logic
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    if (logContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
      // If user has scrolled up more than 50px from bottom, disable auto-scroll
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isNearBottom);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="log-viewer">
      <div className="log-header">
        <h3>Stream Logs</h3>
        <div className="log-controls">
          <label className="auto-scroll-toggle">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            Auto-scroll
          </label>
          <button className="clear-logs-button" onClick={clearLogs}>
            Clear Logs
          </button>
        </div>
      </div>
      <div 
        className="log-container" 
        ref={logContainerRef}
        onScroll={handleScroll}
      >
        {logs.length === 0 ? (
          <div className="empty-logs">No logs available. Start streaming to see logs.</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="log-line">
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LogViewer;

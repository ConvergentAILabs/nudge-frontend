import React, { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE;

interface ActiveItem {
  sessionId: string;
  title: string;
  mode: "MAX" | "ELON" | "EINSTEIN";
  status: "running" | "paused" | "complete";
  progress?: number;
  etaSeconds?: number;
}

export const ActiveSessionList: React.FC = () => {
  const [items, setItems] = useState<ActiveItem[]>([]);

  useEffect(() => {
    const poll = () => {
      fetch(`${API_BASE}/api/session/active`)
        .then(res => res.json())
        .then(setItems)
        .catch(() => setItems([]));
    };

    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  if (items.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        No active sessions
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map(item => (
        <div
          key={item.sessionId}
          className="rounded border border-gray-800 bg-gray-900 p-3"
        >
          <div className="flex justify-between items-center">
            <div className="text-sm font-medium text-gray-200">
              {item.title || "Untitled Chat"}
            </div>
            <div className="text-xs text-gray-400">
              {item.mode}
            </div>
          </div>

          <div className="mt-1 flex justify-between text-xs">
            <span className="text-gray-400">
              Status: {item.status}
            </span>
            {item.progress !== undefined && (
              <span className="text-blue-400">
                {item.progress}%
              </span>
            )}
          </div>

          {item.etaSeconds !== undefined && (
            <div className="mt-1 text-xs text-gray-500">
              ETA: {Math.ceil(item.etaSeconds / 60)} min
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
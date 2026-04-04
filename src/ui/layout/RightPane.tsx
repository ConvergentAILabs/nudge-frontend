import React from "react";
import { useChatContext } from "../../context/ChatContext";
import AssetPanel from "../assets/AssetPanel";

const API_BASE = import.meta.env.VITE_API_BASE;

console.log("🚀 BUILD CHECK V2 — SSE FIX DEPLOYED", API_BASE);

type RightPaneProps = {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
};

type TaskStatus =
  | "RUNNING"
  | "PAUSED"
  | "WAITING_FOR_INPUT"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

type TaskSummary = {
  task_id: string;
  session_id?: string;   // 🔥 ADD THIS
  status: TaskStatus;
  updated_at: number;
};

export default function RightPane({
  collapsed,
  setCollapsed,
}: RightPaneProps) {
  const { taskSummaries, activateLatestConversation } = useChatContext() as any;
  const [sessions, setSessions] = React.useState<any[]>([]);
  console.log("SESSIONS DEBUG:", sessions);

  React.useEffect(() => {
    fetch(`${API_BASE}/api/sessions/`)
      .then((res) => res.json())
      .then((data) => {
        setSessions(Array.isArray(data) ? data : data.sessions || []);
      })
      .catch(() => {});
  }, []);

  const tasks: TaskSummary[] = React.useMemo(() => {
    return Array.isArray(taskSummaries) ? taskSummaries : [];
  }, [taskSummaries, sessions]);

  const getSessionName = (sessionId?: string) => {
    if (!sessionId) return "Unknown Task";

    const match = sessions.find(
      (s) => s.session_id === sessionId
    );

    return match?.title || "Untitled";
  };

  const activeTasks = tasks.filter(
    (t) =>
      t.status === "RUNNING" ||
      t.status === "PAUSED" ||
      t.status === "WAITING_FOR_INPUT"
  );

  const recentTasks = tasks
    .filter(
      (t) =>
        t.status === "COMPLETED" ||
        t.status === "FAILED" ||
        t.status === "CANCELLED"
    )
    .slice(0, 10);

  const onTaskClick = (sessionId?: string) => {
    if (!sessionId) return;

    activateLatestConversation(sessionId);
  };

  // ===============================
  // COLLAPSED STATE (EDGE HANDLE)
  // ===============================
  if (collapsed) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          paddingTop: 12,
          cursor: "pointer",
        }}
        onClick={() => setCollapsed(false)}
      >
        <div
          style={{
            color: "var(--accent-orange)",
            fontSize: 16,
            fontWeight: 600,
            opacity: 0.9,
          }}
        >
          ›
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col"
      style={{
        background: "var(--nav-bg)",
        color: "var(--chat-text)",
      }}
    >
      {/* ===============================
          TOP COLLAPSE HANDLE
      =============================== */}
      <div
        style={{
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          opacity: 0.6,
          color: "var(--accent-orange)",
        }}
        onClick={() => setCollapsed(true)}
      >
        ‹
      </div>

      {/* ===============================
          BORDER CONTAINER + SCROLLABLE CONTENT
      =============================== */}
      <div
        style={{
          flex: 1,
          padding: 10,
          minHeight: 0,
        }}
      >
        <div
          style={{
            height: "100%",
            overflowY: "auto",
            padding: 12,
            border: "2px solid var(--accent-orange)",
            borderRadius: 10,
            background: "rgba(255,255,255,0.02)",
            minHeight: 0,
          }}
        >
          {/* -------- MAESTRO (SHELL) -------- */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              MAESTRO
            </div>

            <div
              style={{
                border: "1px solid var(--panel-border)",
                borderRadius: 6,
                padding: 10,
                fontSize: 12,
                opacity: 0.7,
              }}
            >
              Maestro orchestration panel (coming soon)
            </div>
          </div>

          {/* -------- ASSETS -------- */}
          <div style={{ marginBottom: 18 }}>
            <AssetPanel />
          </div>

          {/* -------- TASKS -------- */}
          <div>
            <div className="text-sm font-semibold mb-3">
              Task / Project Report
            </div>

            {/* ACTIVE */}
            <div className="mb-4">
              <div
                className="text-xs font-semibold mb-2"
                style={{ opacity: 0.7 }}
              >
                Active
              </div>

              {activeTasks.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {activeTasks.map((task) => (
                    console.log("TASK DEBUG:", task),
                    <div
                      key={task.task_id}
                      onClick={() => onTaskClick(task.session_id)}
                      className="cursor-pointer rounded p-2 text-xs flex justify-between items-center"
                      style={{
                        border: "1px solid var(--panel-border)",
                      }}
                    >
                      <span className="font-mono">
                        {getSessionName(task.session_id)}
                      </span>

                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background:
                            task.status === "RUNNING"
                              ? "rgba(22,163,74,0.15)"
                              : task.status === "PAUSED"
                              ? "rgba(245,158,11,0.18)"
                              : "rgba(59,130,246,0.18)",
                          color:
                            task.status === "RUNNING"
                              ? "#22c55e"
                              : task.status === "PAUSED"
                              ? "#f59e0b"
                              : "#60a5fa",
                        }}
                      >
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="text-xs italic"
                  style={{ opacity: 0.6 }}
                >
                  No active tasks
                </div>
              )}
            </div>

            {/* RECENT */}
            <div>
              <div
                className="text-xs font-semibold mb-2"
                style={{ opacity: 0.7 }}
              >
                Recent
              </div>

              {recentTasks.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {recentTasks.map((task) => (
                    <div
                      key={task.task_id}
                      onClick={() => onTaskClick(task.session_id)}
                      className="cursor-pointer rounded p-2 text-xs flex justify-between items-center"
                      style={{
                        border: "1px solid var(--panel-border)",
                      }}
                    >
                      <span className="font-mono">
                        {getSessionName(task.session_id)}
                      </span>

                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background: "rgba(255,255,255,0.06)",
                          color: "var(--chat-text)",
                        }}
                      >
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="text-xs italic"
                  style={{ opacity: 0.6 }}
                >
                  No recent tasks
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
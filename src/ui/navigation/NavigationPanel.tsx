import React, { useState, useEffect, useRef } from "react";
import { SidebarSection } from "./NavigationSpine";
const API_BASE = import.meta.env.VITE_API_BASE;
import {
  ChevronRight,
  ChevronDown,
  MessageSquare,
  MoreHorizontal,
} from "lucide-react";

import AIPlatformSelector from "./AIPlatformSelector";
import { useChatContext } from "../../context/ChatContext";

interface Props {
  activeSection: SidebarSection;
  collapsed: boolean;
}

interface Chat {
  id: string;
  label: string;
  project?: string;
  pinned?: boolean;
}

interface MenuState {
  chatId: string;
  top: number;
  left: number;
}

export default function NavigationPanel({
  activeSection,
  collapsed,
}: Props) {
  const [openProjects, setOpenProjects] = useState<Record<string, boolean>>({
    travel: true,
    ai: false,
  });

  const { startNewSession, switchConversation, messages, conversationId } = useChatContext();

  const [hoverProject, setHoverProject] = useState<string | null>(null);
  const [hoverChat, setHoverChat] = useState<string | null>(null);
  const [menuState, setMenuState] = useState<MenuState | null>(null);

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("nudge-theme");
    return saved === "light" ? "light" : "dark";
  });


  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuState(null);
      }
    };

    const handleWindowChange = () => {
      setMenuState(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleWindowChange, true);
    window.addEventListener("resize", handleWindowChange);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleWindowChange, true);
      window.removeEventListener("resize", handleWindowChange);
    };
  }, []);

  /* Apply theme */

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("nudge-theme", theme);
  }, [theme]);
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const currentChat = chats.find(c => c.id === conversationId) || null;

  const reloadSessions = async () => {
    const res = await fetch(`${API_BASE}/api/sessions/`);
    const data = await res.json();

    const mapped = data.map((s: any) => ({
      id: s.session_id,
      label: s.title || "New Chat",
      project: s.project_id || undefined,
      pinned: !!s.is_pinned,
    }));

    setChats(mapped);
  };

  useEffect(() => {
    reloadSessions().catch(() => setChats([]));
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      reloadSessions().catch(() => {});
    }
  }, [messages.length]);

  useEffect(() => {
  fetch(`${API_BASE}/api/projects/`)
    .then((res) => res.json())
    .then((data) => {
      const mapped = data.map((p: any) => ({
        id: p.project_id,
        name: p.name,
      }));
      setProjects(mapped);
    })
    .catch(() => setProjects([]));
}, []);

  const toggleProject = (id: string) => {
    setOpenProjects((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const moveChatToProject = async (chatId: string, projectId: string) => {
    await fetch(`${API_BASE}/api/sessions/${chatId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        project_id: projectId,
      }),
    });

    await reloadSessions();
  };

  const SectionHeader = ({ label }: { label: string }) => (
    <div
      style={{
        fontSize: "12px",
        fontWeight: 600,
        opacity: 0.6,
        marginBottom: "10px",
      }}
    >
      {label}
    </div>
  );

  const openChatMenu = (
    e: React.MouseEvent<SVGSVGElement, MouseEvent>,
    chatId: string
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 150;
    const viewportPadding = 12;

    const left = Math.min(
      rect.right - menuWidth,
      window.innerWidth - menuWidth - viewportPadding
    );

    const top = Math.min(
      rect.bottom + 6,
      window.innerHeight - 120 - viewportPadding
    );

    setMenuState((prev) =>
      prev?.chatId === chatId
        ? null
        : {
            chatId,
            top,
            left: Math.max(viewportPadding, left),
          }
    );
  };

  const ChatRow = ({
    chat,
    draggable,
    onDragStart,
  }: {
    chat: Chat;
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent) => void;
  }) => {
    const showMenu = menuState?.chatId === chat.id;
    const isActive = conversationId === chat.id;
    const showHover = hoverChat === chat.id && !showMenu && !isActive;

    return (
      <div
        draggable={draggable}
        onDragStart={onDragStart}
        onClick={() => {
          switchConversation(chat.id);
        }}
        onMouseEnter={() => setHoverChat(chat.id)}
        onMouseLeave={() => setHoverChat(null)}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 10px",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "13px",
          opacity: isActive ? 1 : showHover ? 1 : 0.85,
          background: isActive
            ? "rgba(246,139,45,0.15)"
            : showHover
            ? "rgba(255,255,255,0.04)"
            : "transparent",
          border: isActive
            ? "1px solid rgba(246,139,45,0.35)"
            : "1px solid transparent",
          transition: "all 0.15s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <MessageSquare size={14} />
          {chat.label}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            opacity: 0.6,
          }}
        >
          <MoreHorizontal
            size={16}
            style={{ cursor: "pointer" }}
            onClick={(e) => {
              e.stopPropagation();
              openChatMenu(e, chat.id);
            }}
          />
        </div>
      </div>
    );
  };

  const ProjectItem = ({
    id,
    label,
  }: {
    id: string;
    label: string;
  }) => {
    const open = openProjects[id];
    const isHover = hoverProject === id;

    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setHoverProject(id);
        }}
        onDragLeave={() => setHoverProject(null)}
        onDrop={async (e) => {
          const chatId = e.dataTransfer.getData("chat");
          await moveChatToProject(chatId, id);
          setHoverProject(null);
        }}
      >
        <div
          onClick={() => toggleProject(id)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 10px",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "13px",
            opacity: 0.9,
            transition: "all 0.15s ease",
            background: isHover ? "rgba(246,139,45,0.15)" : "transparent",
          }}
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {label}
        </div>

        <div
          style={{
            overflow: "hidden",
            maxHeight: open ? "200px" : "0px",
            transition: "max-height 0.25s ease",
          }}
        >
          <div style={{ paddingLeft: "20px", marginTop: "4px" }}>
            {chats
              .filter((c) => c.project === id)
              .map((chat) => (
                <ChatRow key={chat.id} chat={chat} />
              ))}
          </div>
        </div>
      </div>
    );
  };

  const renderHeader = () => {
    switch (activeSection) {

      case "home":
        return "Home";

      case "chats":
        return "Chats & Projects";

      case "search":
        return "Search";

      case "account":
        return "Account";

      case "settings":
        return "Settings";

      case "help":
        return "Help";
        
      default:
        return "";
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case "home":
        return (
          <>
            <div style={{ marginBottom: "20px" }}>
              <SectionHeader label="CURRENT FOCUS" />

              {currentChat ? (
                <div
                  onClick={() => switchConversation(currentChat.id)}
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    background: "rgba(255,255,255,0.04)",
                    fontSize: "13px",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: "6px" }}>
                    {currentChat.label}
                  </div>

                  <div style={{ opacity: 0.6, fontSize: "12px" }}>
                    Working on: {currentChat.label}
                  </div>

                  <div style={{ opacity: 0.5, fontSize: "11px", marginTop: "4px" }}>
                    Next: Continue conversation
                  </div>
                </div>
              ) : (
                <div style={{ opacity: 0.6, fontSize: "13px" }}>
                  No active chats yet
                </div>
              )}
            </div>
          </>
        );

      case "chats": {
        return (
          <>
            <div style={{ marginBottom: "20px" }}>
              <SectionHeader label="PROJECTS" />

              <div
                onClick={async () => {
                  const name = window.prompt("Enter project name");
                  if (!name || !name.trim()) return;

                  await fetch(`${API_BASE}/api/projects/`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ name: name.trim() }),
                  });

                  const res = await fetch(`${API_BASE}/api/projects/`);
                  const data = await res.json();

                  const mapped = data.map((p: any) => ({
                    id: p.project_id,
                    name: p.name,
                  }));

                  setProjects(mapped);
                }}
                style={{
                  padding: "6px 10px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "13px",
                  opacity: 0.7,
                  marginBottom: "8px",
                }}
              >
                + New Project
              </div>

              {projects.map((project) => (
                <ProjectItem
                  key={project.id}
                  id={project.id}
                  label={project.name}
                />
              ))}
            </div>

            <div>
              <SectionHeader label="CHATS" />

              <div
                onClick={async () => {
                  const newId = await startNewSession();
                  if (!newId) return;

                  await reloadSessions();
                }}
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "13px",
                  opacity: 0.7,
                  marginBottom: "8px",
                }}
              >
                + New Chat
              </div>

              {chats
                .filter((c) => !c.project)
                .sort((a, b) => {
                  if (a.pinned === b.pinned) return 0;
                  return a.pinned ? -1 : 1;
                })
                .map((chat) => (
                  <ChatRow
                    key={chat.id}
                    chat={chat}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("chat", chat.id);
                    }}
                  />
                ))}
            </div>
          </>
        );
      }

      case "search":
        return (
          <>
            <div style={{ marginBottom: "16px" }}>
              <input
                placeholder="Search chats, projects, artifacts..."
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--panel-border)",
                  background: "var(--chat-bg)",
                  color: "var(--chat-text)",
                  fontSize: "13px",
                }}
              />
            </div>

            <div style={{ opacity: 0.6, fontSize: "13px" }}>
              Results will appear here.
            </div>
          </>
        );

      case "account":
        return (
          <>
            <SectionHeader label="USER PROFILE" />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                fontSize: "13px",
                marginBottom: "18px",
              }}
            >
              <div style={{ cursor: "pointer" }}>User Name</div>
              <div style={{ cursor: "pointer" }}>Password</div>
            </div>

            <SectionHeader label="PERSONAL INFORMATION" />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                fontSize: "13px",
                marginBottom: "18px",
              }}
            >
              <div style={{ cursor: "pointer" }}>First Name</div>
              <div style={{ cursor: "pointer" }}>Last Name</div>
              <div style={{ cursor: "pointer" }}>Email</div>
            </div>

            <SectionHeader label="LICENSE & BILLING" />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                fontSize: "13px",
              }}
            >
              <div style={{ cursor: "pointer" }}>License</div>
              <div style={{ cursor: "pointer" }}>Billing</div>
            </div>
          </>
        );

      case "settings":
        return (
          <>
            <AIPlatformSelector />
          </>
        );

      case "help":
        return (
          <>
            <SectionHeader label="APPEARANCE" />

            <div
              style={{
                display: "flex",
                  gap: "10px",
                  marginBottom: "20px"
                }}
              >
                <div
                  onClick={() => setTheme("light")}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    border: "1px solid var(--panel-border)",
                    color: theme === "light"
                      ? "var(--accent-orange)"
                      : "var(--chat-text)"
                  }}
                >
                  ☀ Light
                </div>

                <div
                  onClick={() => setTheme("dark")}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    border: "1px solid var(--panel-border)",
                    color: theme === "dark"
                      ? "var(--accent-orange)"
                      : "var(--chat-text)"
                  }}
                >
                  🌙 Dark
                </div>
              </div>

              <SectionHeader label="ABOUT" />

              <div style={{ fontSize: "13px", opacity: 0.7 }}>
                NUDGE Cognitive Operating System
              </div>
            </>
          );

      default:
        return null;
    }
  };

  if (collapsed) {
    return null;
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "var(--nav-bg)",
        position: "relative",
      }}
    >
      <div
        style={{
          padding: "16px",
          fontSize: "14px",
          fontWeight: 600,
        }}
      >
        {renderHeader()}
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0 16px 16px 16px",
        }}
      >
        {renderContent()}
      </div>

      {menuState && (
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: `${menuState.top}px`,
            left: `${menuState.left}px`,
            background: "var(--nav-bg)",
            border: "1px solid var(--panel-border)",
            boxShadow: "0 14px 32px rgba(0,0,0,0.55)",
            borderRadius: "8px",
            padding: "6px 0",
            fontSize: "13px",
            minWidth: "150px",
            zIndex: 2000,
          }}
        >
          {(() => {
            const chat = chats.find((c) => c.id === menuState.chatId);

            const items: string[] = [];

            items.push("Rename");

            if (chat?.project) {
              items.push("Remove from Project");
            } else {
              items.push("Move to Project");
            }

            if (chat?.pinned) {
              items.push("Unpin");
            } else {
              items.push("Pin");
            }

            items.push("Delete");

            return items.map((item) => (
              <div
                key={item}
                style={{
                  padding: "6px 12px",
                  cursor: "pointer",
                  transition: "color 0.15s ease, background 0.15s ease",
                }}
                onClick={async () => {
                  if (!chat) return;

                  if (item === "Rename") {
                    const newName = window.prompt("Enter new chat name", chat.label);
                    if (!newName || !newName.trim()) {
                      setMenuState(null);
                      return;
                    }

                    await fetch(`${API_BASE}/api/sessions/${chat.id}`, {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                        "x-conversation-id": conversationId || "",
                      },
                      body: JSON.stringify({
                        title: newName.trim(),
                      }),
                    });

                    await reloadSessions();
                  }

                  if (item === "Move to Project") {
                    if (!projects.length) {
                      alert("No projects available");
                      return;
                    }

                    const options = projects.map((p) => p.name).join("\n");

                    const selected = window.prompt(
                      `Move to which project?\n\n${options}`
                    );

                    if (!selected) return;

                    const project = projects.find((p) => p.name === selected);

                    if (!project) {
                      alert("Project not found");
                      return;
                    }

                    await fetch(`${API_BASE}/api/sessions/${chat.id}`, {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        project_id: project.id,
                      }),
                    });

                    await reloadSessions();
                  }

                  if (item === "Remove from Project") {
                    await fetch(`${API_BASE}/api/sessions/${chat.id}`, {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        project_id: null,
                      }),
                    });

                    await reloadSessions();
                  }

                  if (item === "Pin" || item === "Unpin") {
                    await fetch(`${API_BASE}/api/sessions/${chat.id}`, {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        is_pinned: !chat.pinned,
                      }),
                    });

                    await reloadSessions();
                  }

                  if (item === "Delete") {
                    const currentIndex = chats.findIndex((c) => c.id === chat.id);

                    await fetch(`${API_BASE}/api/sessions/${chat.id}`, {
                      method: "DELETE",
                    });

                    // 🔥 GET FRESH SESSIONS (DO NOT RELY ON STATE)
                    const res = await fetch(`${API_BASE}/api/sessions/`);
                    const data = await res.json();

                    const mapped = data.map((s: any) => ({
                      id: s.session_id,
                      label: s.title || "New Chat",
                      project: s.project_id || undefined,
                      pinned: !!s.is_pinned,
                    }));

                    setChats(mapped);

                    if (mapped.length > 0) {
                      let nextChat = null;

                      if (currentIndex < mapped.length) {
                        nextChat = mapped[currentIndex];
                      } else {
                        nextChat = mapped[mapped.length - 1];
                      }

                      if (nextChat) {
                        await switchConversation(nextChat.id);
                      }
                    } else {
                      const newId = await startNewSession();
                      if (newId) {
                        await switchConversation(newId);
                      }
                    }
                  }

                  setMenuState(null);
                }}
              >
                {item}
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}
import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, MessageSquare, SendHorizonal, Sparkles, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { getStoredUser } from "@/lib/authStorage";
import { getPrimaryWorkspaceRole, hasAnyRole, splitRoles } from "@/lib/internalRoleFlow";
import { sendGpmsAiPrompt } from "@/services/AiChatService";
import "@/styles/chat-widget.css";

const STORAGE_KEY = "gpms-ai-chat-open";
const CHAT_MODES = {
  customer: {
    eyebrow: "Hỗ trợ khách hàng",
    title: "Trợ lý AI cho đơn hàng và hồ sơ",
    launcherLabel: "Hỏi trợ lý",
    placeholder: "Nhập câu hỏi về đơn hàng, hồ sơ hoặc cách dùng GPMS...",
    sendingLabel: "Đang xử lý câu hỏi của bạn...",
    assistantLabel: "Trợ lý khách hàng",
    quickPrompts: [
      "Hướng dẫn tạo đơn hàng mới",
      "Cách theo dõi trạng thái đơn hàng",
      "Cách cập nhật hồ sơ của tôi",
    ],
    buildGreeting(user) {
      const name = user?.fullName || user?.name || "bạn";
      return `Xin chào ${name}. Mình là trợ lý AI hỗ trợ khách hàng trên GPMS. Bạn có thể hỏi cách tạo đơn hàng, theo dõi trạng thái đơn, cập nhật hồ sơ hoặc thao tác trên màn hình hiện tại.`;
    },
  },
  owner: {
    eyebrow: "Hỗ trợ quản lý",
    title: "Trợ lý AI cho chủ xưởng và quản lý",
    launcherLabel: "AI quản lý",
    placeholder: "Nhập câu hỏi về nhân sự, sản xuất, nghỉ phép hoặc cách dùng hệ thống...",
    sendingLabel: "Đang phân tích yêu cầu quản lý của bạn...",
    assistantLabel: "Trợ lý quản lý",
    quickPrompts: [
      "Cách thêm nhân viên mới",
      "Hướng dẫn gán chuyên môn cho thợ",
      "Cách kiểm tra đơn nghỉ phép",
    ],
    buildGreeting(user) {
      const name = user?.fullName || user?.name || "bạn";
      return `Xin chào ${name}. Mình là trợ lý AI hỗ trợ quản lý GPMS cho chủ xưởng và quản lý sản xuất. Bạn có thể hỏi về nhân sự, chuyên môn thợ, nghỉ phép, kế hoạch sản xuất hoặc cách dùng hệ thống ở màn hình hiện tại.`;
    },
  },
  operations: {
    eyebrow: "Hỗ trợ thao tác",
    title: "Trợ lý AI cho sản xuất và công việc hằng ngày",
    launcherLabel: "AI hỗ trợ",
    placeholder: "Nhập câu hỏi về công việc được giao, báo cáo, sản lượng hoặc thao tác trên hệ thống...",
    sendingLabel: "Đang xử lý yêu cầu thao tác của bạn...",
    assistantLabel: "Trợ lý thao tác",
    quickPrompts: [
      "Cách xem việc được giao hôm nay",
      "Hướng dẫn báo cáo sản lượng",
      "Cách xem lịch sử đơn nghỉ",
    ],
    buildGreeting(user) {
      const name = user?.fullName || user?.name || "bạn";
      return `Xin chào ${name}. Mình là trợ lý AI hỗ trợ thao tác trên GPMS cho tổ trưởng, công nhân và bộ phận kiểm soát chất lượng. Bạn có thể hỏi về công việc được giao, báo cáo, đơn nghỉ hoặc cách thao tác trên màn hình hiện tại.`;
    },
  },
};

function resolveChatMode(user) {
  if (!user) return "customer";

  const primaryRole = getPrimaryWorkspaceRole(user.role);
  if (primaryRole === "customer" || primaryRole === "guest") {
    return "customer";
  }

  if (["owner", "pm", "admin", "manager"].includes(primaryRole)) {
    return "owner";
  }

  return "operations";
}

function normalizeHistory(messages) {
  return messages
    .filter((item) => item.role === "user" || item.role === "assistant")
    .map(({ role, content }) => ({ role, content }));
}

function streamReplyText(text, onChunk) {
  return new Promise((resolve) => {
    const content = String(text ?? "");
    if (!content) {
      resolve();
      return;
    }

    let index = 0;
    const step = () => {
      index = Math.min(index + 3, content.length);
      onChunk(content.slice(0, index));

      if (index >= content.length) {
        resolve();
        return;
      }

      window.setTimeout(step, 16);
    };

    step();
  });
}

export default function ChatWidget() {
  const user = useMemo(() => getStoredUser(), []);
  const location = useLocation();
  const canShowChat = useMemo(() => {
    if (!user) return true;

    return hasAnyRole(splitRoles(user.role), [
      "customer",
      "admin",
      "owner",
      "pm",
      "project manager",
      "team leader",
      "teamleader",
      "worker",
      "sewer",
      "tailor",
      "kcs",
      "qc",
      "quality control",
    ]);
  }, [user]);
  const chatMode = useMemo(() => resolveChatMode(user), [user]);
  const chatConfig = CHAT_MODES[chatMode];
  const isAuthPage = ["/login", "/register", "/forgot-password"].includes(location.pathname);
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isStreamingReply, setIsStreamingReply] = useState(false);
  const [messages, setMessages] = useState(() => [
    {
      id: "assistant-greeting",
      role: "assistant",
      content: CHAT_MODES[resolveChatMode(getStoredUser())].buildGreeting(getStoredUser()),
    },
  ]);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, String(open));
  }, [open]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const removableNodes = [
      document.getElementById("chative-messenger-script"),
      document.getElementById("mtcContainer"),
      document.getElementById("mtcLauncher"),
      ...Array.from(document.querySelectorAll('script[src*="messenger.svc.chative.io"]')),
      ...Array.from(document.querySelectorAll('script[src*="chative.io"]')),
      ...Array.from(document.querySelectorAll('[class*="chative"]')),
      ...Array.from(document.querySelectorAll('[id*="chative"]')),
    ].filter(Boolean);

    removableNodes.forEach((node) => node.remove());
  }, []);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    body.scrollTop = body.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    setMessages([
      {
        id: `assistant-greeting-${chatMode}`,
        role: "assistant",
        content: chatConfig.buildGreeting(user),
      },
    ]);
  }, [chatConfig, chatMode, user]);

  if (!canShowChat) {
    return null;
  }

  async function handleSend(promptText) {
    const message = String(promptText ?? input).trim();
    if (!message || sending || isStreamingReply) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const reply = await sendGpmsAiPrompt({
        message,
        history: normalizeHistory(nextMessages),
        user,
        pathname: typeof window !== "undefined" ? window.location.pathname : "",
        assistantMode: chatMode,
      });

      const assistantId = `assistant-${Date.now()}`;

      setIsStreamingReply(true);
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "",
        },
      ]);

      await streamReplyText(reply, (partialContent) => {
        setMessages((prev) =>
          prev.map((item) =>
            item.id === assistantId
              ? {
                  ...item,
                  content: partialContent,
                }
              : item
          )
        );
      });
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          tone: "error",
          content:
            error?.message ||
            "Hiện chưa thể kết nối trợ lý AI. Bạn kiểm tra lại cấu hình API hoặc thử lại sau.",
        },
      ]);
    } finally {
      setSending(false);
      setIsStreamingReply(false);
    }
  }

  return (
    <div className={`gpms-chat-widget${open ? " is-open" : ""}${isAuthPage ? " is-auth-page" : ""}`}>
      {open ? (
        <section className="gpms-chat-panel" aria-label="Trợ lý AI GPMS">
          <header className="gpms-chat-panel__header">
            <div className="gpms-chat-panel__title-wrap">
              <div className="gpms-chat-panel__badge">
                <Bot size={18} />
              </div>
              <div>
                <div className="gpms-chat-panel__eyebrow">{chatConfig.eyebrow}</div>
                <h2 className="gpms-chat-panel__title">{chatConfig.title}</h2>
              </div>
            </div>
            <button
              type="button"
              className="gpms-chat-panel__icon-btn"
              onClick={() => setOpen(false)}
              aria-label="Đóng khung chat"
            >
              <X size={18} />
            </button>
          </header>

          <div className="gpms-chat-panel__prompts">
            {chatConfig.quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="gpms-chat-panel__prompt"
                onClick={() => handleSend(prompt)}
                disabled={sending}
              >
                <Sparkles size={14} />
                <span>{prompt}</span>
              </button>
            ))}
          </div>

          <div ref={bodyRef} className="gpms-chat-panel__body">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`gpms-chat-message gpms-chat-message--${message.role}${
                  message.tone === "error" ? " is-error" : ""
                }`}
              >
                <div className="gpms-chat-message__label">
                  {message.role === "assistant" ? chatConfig.assistantLabel : "Bạn"}
                </div>
                <div className="gpms-chat-message__content">{message.content}</div>
              </article>
            ))}

          </div>

          <form
            className="gpms-chat-panel__composer"
            onSubmit={(event) => {
              event.preventDefault();
              handleSend();
            }}
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              className="gpms-chat-panel__input"
              placeholder={chatConfig.placeholder}
              rows={3}
            />
            <button
              type="submit"
              className="gpms-chat-panel__send"
              disabled={!input.trim() || sending || isStreamingReply}
            >
              <SendHorizonal size={16} />
              <span>Gửi</span>
            </button>
          </form>
        </section>
      ) : null}

      {!open ? (
        <button
          type="button"
          className="gpms-chat-launcher"
          onClick={() => setOpen(true)}
          aria-label="Mở trợ lý AI GPMS"
        >
          <MessageSquare size={20} />
          <span>{chatConfig.launcherLabel}</span>
        </button>
      ) : null}
    </div>
  );
}

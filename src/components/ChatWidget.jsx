import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, MessageSquare, SendHorizonal, Sparkles, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { getStoredUser } from "@/lib/authStorage";
import { hasAnyRole, splitRoles } from "@/lib/internalRoleFlow";
import { sendGpmsAiPrompt } from "@/services/AiChatService";
import "@/styles/chat-widget.css";

const STORAGE_KEY = "gpms-ai-chat-open";

const CUSTOMER_CHAT_CONFIG = {
  eyebrow: "Hỗ trợ khách hàng",
  title: "Trợ lý AI cho khách hàng",
  launcherLabel: "Hỏi trợ lý",
  placeholder: "Nhập câu hỏi về đặt hàng, sản phẩm, tiến độ đơn hoặc cách dùng hệ thống...",
  sendingLabel: "Đang xử lý câu hỏi của bạn...",
  assistantLabel: "Trợ lý khách hàng",
  quickPrompts: [
    "Quy trình đặt hàng như thế nào?",
    "Tôi có thể may những loại quần áo nào?",
    "Thời gian hoàn thành đơn hàng là bao lâu?",
  ],
  buildGreeting(user) {
    const name = user?.fullName || user?.name || "bạn";
    return `Xin chào ${name}. Mình là trợ lý AI hỗ trợ khách hàng trên GPMS. Bạn có thể hỏi về quy trình đặt hàng, loại sản phẩm có thể may, thời gian hoàn thành, cách theo dõi đơn hàng hoặc cách thao tác trên màn hình hiện tại.`;
  },
};

function resolveChatMode() {
  return "customer";
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

function convertHtmlReplyToPlainText(content) {
  const normalized = String(content ?? "").trim();
  if (!normalized) return "";

  return normalized
    .replace(/\r\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<ul[^>]*>/gi, "\n")
    .replace(/<\/ul>/gi, "\n")
    .replace(/<ol[^>]*>/gi, "\n")
    .replace(/<\/ol>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/li>/gi, "")
    .replace(/<(strong|b)[^>]*>/gi, "**")
    .replace(/<\/(strong|b)>/gi, "**")
    .replace(/<(em|i)[^>]*>/gi, "*")
    .replace(/<\/(em|i)>/gi, "*")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatAssistantReplyForDisplay(content) {
  let text = String(content ?? "").replace(/\r\n/g, "\n").trim();
  if (!text) return "";

  text = text
    .replace(/\s{2,}/g, " ")
    .replace(/(Quy\s*trình\s*\d+\s*:|Quy\s*trình:)/gi, "\n\n$1")
    .replace(/(B[uư][oơ]c\s*\d+\s*:)/gi, "\n$1")
    .replace(/\.\s*(?=B[uư][oơ]c\s*\d+\s*:)/gi, ".\n")
    .replace(/\.\s*(?=Quy\s*trình\s*\d+\s*:)/gi, ".\n")
    .replace(/\.\s*(?=Bạn\s+có\s+muốn)/gi, ".\n");

  text = text.replace(
    /((?:Khách hàng|Bạn)\s+có\s+thể:)\s*([^\n.]+)\./gi,
    (_, prefix, listPart) => {
      const items = listPart
        .replace(/\s+hoặc\s+/gi, ", ")
        .split(/\s*,\s*/)
        .map((item) => item.trim())
        .filter(Boolean);

      if (!items.length) return `${prefix}`;
      return `${prefix}\n${items.map((item) => `- ${item}`).join("\n")}.`;
    }
  );

  return text.replace(/\n{3,}/g, "\n\n").trim();
}

function looksTruncatedReply(content) {
  const normalized = String(content ?? "").trim();
  if (!normalized || normalized.length < 40) return false;

  if (/[.!?…"”'"')\]]$/.test(normalized)) {
    return false;
  }

  return /(\b(nếu|khi|để|và|hoặc|sau khi|trường hợp|bước|if|then|because|with)\b|[:,;\-])$/i.test(normalized)
    || /[a-zA-ZÀ-ỹ0-9]$/.test(normalized);
}

async function fetchContinuationReply({ currentReply, history, user, pathname, assistantMode }) {
  const continuationPrompt =
    "Câu trả lời trước của bạn đang bị dừng giữa chừng. Hãy tiếp tục đúng phần còn dang dở, không lặp lại nội dung đã trả lời.";

  return sendGpmsAiPrompt({
    message: continuationPrompt,
    history: [
      ...history,
      { role: "assistant", content: currentReply },
    ],
    user,
    pathname,
    assistantMode,
  });
}

function renderInlineText(text, keyPrefix) {
  const normalized = String(text ?? "");
  const segments = [];
  const pattern = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      segments.push(normalized.slice(lastIndex, match.index));
    }

    segments.push(
      <strong key={`${keyPrefix}-strong-${match.index}`}>{match[1]}</strong>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < normalized.length) {
    segments.push(normalized.slice(lastIndex));
  }

  return segments.length ? segments : normalized;
}

function renderMessageContent(content) {
  const normalized = String(content ?? "").replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const elements = [];
  let paragraphLines = [];
  let listItems = [];
  let listType = null;

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    const text = paragraphLines.join(" ").trim();
    if (text) {
      elements.push(
        <p key={`paragraph-${elements.length}`} className="gpms-chat-message__paragraph">
          {renderInlineText(text, `paragraph-${elements.length}`)}
        </p>
      );
    }
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    const Tag = listType === "ol" ? "ol" : "ul";
    elements.push(
      <Tag
        key={`list-${elements.length}`}
        className={`gpms-chat-message__list${listType === "ol" ? " gpms-chat-message__list--ordered" : ""}`}
      >
        {listItems.map((item, index) => (
          <li key={`item-${index}`}>{renderInlineText(item, `item-${elements.length}-${index}`)}</li>
        ))}
      </Tag>
    );
    listItems = [];
    listType = null;
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      return;
    }

    const orderedMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (orderedMatch) {
      flushParagraph();
      if (listType && listType !== "ol") flushList();
      listType = "ol";
      listItems.push(orderedMatch[2]);
      return;
    }

    const unorderedMatch = line.match(/^[-*•]\s+(.+)$/);
    if (unorderedMatch) {
      flushParagraph();
      if (listType && listType !== "ul") flushList();
      listType = "ul";
      listItems.push(unorderedMatch[1]);
      return;
    }

    if (listItems.length) {
      flushList();
    }

    paragraphLines.push(line);
  });

  flushParagraph();
  flushList();

  return elements.length ? elements : renderInlineText(normalized, "fallback");
}

export default function ChatWidget() {
  const user = useMemo(() => getStoredUser(), []);
  const location = useLocation();

  const canShowChat = useMemo(() => {
    if (!user) return true;

    return hasAnyRole(splitRoles(user.role), [
      "customer",
      "guest",
    ]);
  }, [user]);

  const chatMode = useMemo(() => resolveChatMode(), []);
  const chatConfig = CUSTOMER_CHAT_CONFIG;
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
      content: CUSTOMER_CHAT_CONFIG.buildGreeting(getStoredUser()),
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
        id: "assistant-greeting-customer",
        role: "assistant",
        content: chatConfig.buildGreeting(user),
      },
    ]);
  }, [chatConfig, user]);

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

      let displayReply = convertHtmlReplyToPlainText(reply);

      if (looksTruncatedReply(displayReply)) {
        try {
          const continuationReply = await fetchContinuationReply({
            currentReply: displayReply,
            history: normalizeHistory(nextMessages),
            user,
            pathname: typeof window !== "undefined" ? window.location.pathname : "",
            assistantMode: chatMode,
          });
          const continuationText = convertHtmlReplyToPlainText(continuationReply);
          if (continuationText) {
            displayReply = `${displayReply}\n${continuationText}`.trim();
          }
        } catch {
          // Keep original reply
        }
      }

      const formattedReply = formatAssistantReplyForDisplay(displayReply);

      await streamReplyText(formattedReply, (partialContent) => {
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
                <div className="gpms-chat-message__content">{renderMessageContent(message.content)}</div>
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
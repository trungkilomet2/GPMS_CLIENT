import { getAuthItem } from "@/lib/authStorage";
import { API_ENDPOINTS } from "@/lib/apiconfig";

const CHAT_API_URL = import.meta.env.VITE_GPMS_AI_CHAT_URL || API_ENDPOINTS.AI.GEMINI_CHAT;
const CHAT_API_KEY = import.meta.env.VITE_GPMS_AI_CHAT_API_KEY || "";

function extractReply(payload) {
  if (!payload) return "";
  if (typeof payload === "string") return payload.trim();
  if (typeof payload?.reply === "string") return payload.reply.trim();
  if (typeof payload?.message === "string") return payload.message.trim();
  if (typeof payload?.answer === "string") return payload.answer.trim();
  if (typeof payload?.content === "string") return payload.content.trim();
  if (typeof payload?.data?.reply === "string") return payload.data.reply.trim();
  if (typeof payload?.data?.message === "string") return payload.data.message.trim();
  if (typeof payload?.data?.answer === "string") return payload.data.answer.trim();

  const choiceContent = payload?.choices?.[0]?.message?.content;
  if (typeof choiceContent === "string") return choiceContent.trim();

  return "";
}

export async function sendGpmsAiPrompt({ message, history, user, pathname, assistantMode = "general" }) {
  if (!CHAT_API_URL) {
    throw new Error(
      "Chưa cấu hình API trợ lý AI. Thêm VITE_GPMS_AI_CHAT_URL để kết nối backend."
    );
  }

  const token = getAuthItem("token");
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (CHAT_API_KEY) {
    headers["x-api-key"] = CHAT_API_KEY;
  }

  const response = await fetch(CHAT_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      message,
    }),
  });

  const rawText = await response.text();
  let payload = rawText;

  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    payload = rawText;
  }

  if (!response.ok) {
    const errorMessage =
      extractReply(payload) ||
      payload?.error ||
      payload?.title ||
      "Không thể kết nối trợ lý AI lúc này.";
    throw new Error(errorMessage);
  }

  const reply = extractReply(payload);
  if (!reply) {
    throw new Error("API trợ lý AI chưa trả về nội dung phản hồi hợp lệ.");
  }

  return reply;
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { AiChatBotIcon } from "@/components/ai-chat/AiChatBotIcon";
import { getUserFacingChatError } from "@/lib/ai-chat-api";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi — I'm your KeyForge assistant. Ask about policies, access, or optimization.",
};

function resizeTextarea(element: HTMLTextAreaElement | null) {
  if (!element) return;
  element.style.height = "auto";
  element.style.height = `${Math.min(element.scrollHeight, 120)}px`;
}

type ChatApiResponse = {
  conversation_id?: string;
  reply?: string;
  message?: string;
  suppressed?: boolean;
};

export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    inputRef.current?.focus();
    resizeTextarea(inputRef.current);
  }, [isOpen, messages]);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    resizeTextarea(event.target);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);
    requestAnimationFrame(() => resizeTextarea(inputRef.current));

    try {
      const payload: { message: string; conversation_id?: string } = {
        message: trimmed,
      };
      if (conversationId) {
        payload.conversation_id = conversationId;
      }

      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as ChatApiResponse;
      if (!res.ok) {
        if (data.suppressed) return;
        const userMessage = getUserFacingChatError(
          data.message ?? `Chat request failed (${res.status})`
        );
        if (!userMessage) return;
        throw new Error(userMessage);
      }

      if (data.conversation_id) {
        setConversationId(data.conversation_id);
      }

      const reply = data.reply?.trim();
      if (!reply) {
        throw new Error("The assistant returned an empty response.");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: reply,
        },
      ]);
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : "Something went wrong. Please try again.";
      const userMessage = getUserFacingChatError(rawMessage);
      if (!userMessage) return;
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: userMessage,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[55] flex flex-col items-end gap-3">
      {isOpen && (
        <section
          className="pointer-events-auto flex w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          style={{ height: "min(520px, calc(100vh - 7rem))" }}
          aria-label="AI assistant chat"
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
                <AiChatBotIcon className="h-5 w-5 text-white" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold">AI Assistant</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/90 transition-colors hover:bg-white/15 hover:text-white"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-4 py-4">
            <ul className="space-y-3">
              {messages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <li
                    key={message.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                        isUser
                          ? "rounded-br-md bg-blue-600 text-white"
                          : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                      }`}
                    >
                      {message.content}
                    </div>
                  </li>
                );
              })}
              {isSending && (
                <li className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-500 shadow-sm">
                    Thinking...
                  </div>
                </li>
              )}
            </ul>
            <div ref={messagesEndRef} />
          </div>

          <footer className="shrink-0 border-t border-slate-200 bg-white p-3">
            <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Ask anything..."
                className="block min-h-[36px] max-h-[120px] w-full flex-1 resize-none overflow-y-auto border-0 bg-transparent py-1.5 text-sm leading-6 text-slate-800 shadow-none placeholder:text-slate-400 focus:border-0 focus:outline-none focus:ring-0 focus-visible:!outline-none focus-visible:!outline-offset-0 focus-visible:ring-0"
                aria-label="Chat message"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || isSending}
                className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </footer>
        </section>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label={isOpen ? "Close AI assistant" : "Open AI assistant"}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <AiChatBotIcon className="h-8 w-8 text-white" />
        )}
      </button>
    </div>
  );
}

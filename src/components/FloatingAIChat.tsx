import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Minimize2, Send, MessageCircle } from "lucide-react";
import hunsoccerAiIcon from "@/assets/hunsoccer-ai-icon.png";
import { useTypewriter } from "@/hooks/useTypewriter";
import { useTranslation } from "react-i18next";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isTyping?: boolean;
  translationKey?: string;
}

interface FaqItem {
  id: string;
  questionKey: string;
  answerKey: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: "faq-view-predictions",
    questionKey: "floating_ai_chat.faq.view_predictions.question",
    answerKey: "floating_ai_chat.faq.view_predictions.answer",
  },
  {
    id: "faq-view-winrate",
    questionKey: "floating_ai_chat.faq.view_winrate.question",
    answerKey: "floating_ai_chat.faq.view_winrate.answer",
  },
  {
    id: "faq-view-data",
    questionKey: "floating_ai_chat.faq.view_data.question",
    answerKey: "floating_ai_chat.faq.view_data.answer",
  },
  {
    id: "faq-ai-models",
    questionKey: "floating_ai_chat.faq.ai_models.question",
    answerKey: "floating_ai_chat.faq.ai_models.answer",
  },
  {
    id: "faq-prize-claim",
    questionKey: "floating_ai_chat.faq.prize_claim.question",
    answerKey: "floating_ai_chat.faq.prize_claim.answer",
  },
  {
    id: "faq-contact",
    questionKey: "floating_ai_chat.faq.contact.question",
    answerKey: "floating_ai_chat.faq.contact.answer",
  },
];

// Parse markdown-style links [text](url) to clickable elements
const parseLinks = (text: string) => {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Add the link
    parts.push(
      <a
        key={match.index}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline hover:text-primary/80 font-medium"
      >
        {match[1]}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

const MessageBubble = ({ message }: { message: Message }) => {
  const { i18n } = useTranslation();
  const { displayedText } = useTypewriter({
    text: message.content,
    speed: message.role === "assistant" && message.isTyping ? 30 : 0,
  });

  const content = message.role === "assistant" && message.isTyping ? displayedText : message.content;
  const locale = i18n.language === "zh" ? "zh-CN" : "en-US";

  return (
    <div
      className={`flex ${
        message.role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`max-w-[80%] rounded-lg p-3 ${
          message.role === "user"
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        }`}
      >
        <p className="text-sm">{parseLinks(content)}</p>
        <p className="text-xs opacity-70 mt-1">
          {message.timestamp.toLocaleTimeString(locale, {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
};

const FloatingAIChat = () => {
  const { t, i18n } = useTranslation();
  const [isMinimized, setIsMinimized] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // 查找Header中的AI按钮插槽
  useEffect(() => {
    const slot = document.getElementById("header-ai-chat-slot");
    setHeaderSlot(slot);
  }, []);

  const registerTimeout = (timeoutId: ReturnType<typeof setTimeout>) => {
    timeoutsRef.current.push(timeoutId);
  };

  const clearPendingTimeouts = () => {
    timeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    timeoutsRef.current = [];
  };

  const createWelcomeMessage = () => ({
    id: "welcome",
    role: "assistant" as const,
    content: t("floating_ai_chat.welcome"),
    timestamp: new Date(),
    translationKey: "floating_ai_chat.welcome" as const,
  });

  const scheduleTypingReset = (messageId: string, content: string) => {
    const typingDuration = Math.min(6000, Math.max(1200, content.length * 20));
    const timeoutId = setTimeout(() => {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId ? { ...message, isTyping: false } : message,
        ),
      );
    }, typingDuration);

    registerTimeout(timeoutId);
  };

  const addAssistantMessage = (content: string, translationKey?: string) => {
    const messageId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const message: Message = {
      id: messageId,
      role: "assistant",
      content,
      timestamp: new Date(),
      isTyping: true,
      translationKey,
    };

    setMessages((prev) => [...prev, message]);
    scheduleTypingReset(messageId, content);
  };

  useEffect(() => {
    return () => {
      clearPendingTimeouts();
    };
  }, []);

  useEffect(() => {
    if (!isMinimized) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
    return;
  }, [isMinimized]);

  useEffect(() => {
    setMessages((prev) => {
      const translatedMessages = prev.map((message) =>
        message.translationKey
          ? {
              ...message,
              content: t(message.translationKey),
            }
          : message,
      );

      const welcomeContent = t("floating_ai_chat.welcome");
      const existingWelcomeIndex = prev.findIndex((message) => message.id === "welcome");

      if (existingWelcomeIndex !== -1) {
        const updatedMessages = [...translatedMessages];
        updatedMessages[existingWelcomeIndex] = {
          ...updatedMessages[existingWelcomeIndex],
          content: welcomeContent,
          timestamp: new Date(),
          translationKey: "floating_ai_chat.welcome",
        };
        return updatedMessages;
      }

      if (translatedMessages.length === 0) {
        return [
          createWelcomeMessage(),
        ];
      }

      return translatedMessages;
    });
  }, [i18n.language, t]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const sendMessage = (
    content: string,
    presetResponse?: string,
    options?: { resetInput?: boolean; messageKey?: string; responseKey?: string },
  ) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
      translationKey: options?.messageKey,
    };

    setMessages((prev) => [...prev, userMessage]);
    if (options?.resetInput) {
      setInput("");
    }
    setIsLoading(true);

    const responseText = presetResponse ?? t("floating_ai_chat.demo_response");
    const responseKey = options?.responseKey ?? (!presetResponse ? "floating_ai_chat.demo_response" : undefined);

    const responseDelay = presetResponse ? 600 : 1000;
    const responseTimeout = setTimeout(() => {
      addAssistantMessage(responseText, responseKey);
      setIsLoading(false);
    }, responseDelay);

    registerTimeout(responseTimeout);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input, undefined, { resetInput: true });
    }
  };

  const handleSubmit = () => {
    sendMessage(input, undefined, { resetInput: true });
  };

  const handleFaqSelect = (faq: FaqItem) => {
    const question = t(faq.questionKey);
    const answer = t(faq.answerKey);
    sendMessage(question, answer, { messageKey: faq.questionKey, responseKey: faq.answerKey });
  };

  const handleOpenChat = () => {
    clearPendingTimeouts();
    setIsLoading(false);
    setInput("");
    setMessages([createWelcomeMessage()]);
    setIsMinimized(false);
  };

  return (
    <>
      {/* 遮罩层 */}
      {!isMinimized && (
        <div
          className="fixed inset-0 z-40 bg-background/50 backdrop-blur-[1px]"
          onClick={() => setIsMinimized(true)}
        />
      )}

      {/* 移动端AI按钮 - 通过Portal放在Header的logo右边 */}
      {isMinimized && headerSlot && createPortal(
        <div className="relative">
          {/* 脉冲圆环效果 */}
          <div className="absolute inset-0 rounded-full bg-[hsl(172,48%,55%)]/30 animate-ping" />
          <div className="absolute inset-0 rounded-full bg-[hsl(172,48%,55%)]/20 animate-pulse" />
          
          <button
            onClick={handleOpenChat}
            className="relative w-7 h-7 rounded-full bg-[hsl(172,48%,55%)] hover:bg-[hsl(172,48%,50%)] text-white shadow-lg transition-all duration-300 hover:scale-110 flex items-center justify-center"
            title={t("floating_ai_chat.open_chat_button")}
          >
            <MessageCircle size={14} />
          </button>
        </div>,
        headerSlot
      )}

      {/* 桌面端AI按钮 - 固定在右下角 */}
      {isMinimized && (
        <div className="hidden sm:block fixed bottom-6 right-6 z-50">
          {/* 脉冲圆环效果 */}
          <div className="absolute inset-0 rounded-full bg-[hsl(172,48%,55%)]/30 animate-ping" />
          <div className="absolute inset-0 rounded-full bg-[hsl(172,48%,55%)]/20 animate-pulse" />
          
          <button
            onClick={handleOpenChat}
            className="relative w-14 h-14 rounded-full bg-[hsl(172,48%,55%)] hover:bg-[hsl(172,48%,50%)] text-white shadow-lg transition-all duration-300 hover:scale-110 flex items-center justify-center"
            title={t("floating_ai_chat.open_chat_button")}
          >
            <MessageCircle size={24} />
          </button>
        </div>
      )}

      {/* 聊天窗口 */}
      {!isMinimized && (
        <Card 
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 shadow-2xl border-2 border-border bg-card/95 backdrop-blur-xl w-[calc(100vw-2rem)] sm:w-[400px] h-[min(75vh,620px)] sm:h-[600px] flex flex-col"
        >
          {/* 头部 */}
          <div className="relative p-3 border-b-2 border-border bg-gradient-to-r from-primary/10 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-background border-2 border-border">
                  <img 
                    src={hunsoccerAiIcon} 
                    alt="HUNSOCCER AI" 
                    className="w-[18px] h-[18px] object-contain"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-sm font-pixel tracking-wider">
                    HUNSOCCER AI
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {t("floating_ai_chat.status_online")}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMinimized(true)}
                  className="h-7 w-7 hover:bg-primary/10"
                >
                  <Minimize2 size={14} />
                </Button>
              </div>
            </div>
          </div>

          {/* 聊天内容 */}
          <div className="flex flex-col flex-1 min-h-0">
              <ScrollArea className="flex-1 p-4 min-h-0">
                <div ref={scrollRef} className="space-y-4">
                  {messages.map((message, index) => (
                    <div key={message.id} className="space-y-4">
                      <MessageBubble message={message} />
                      {index === 0 && (
                          <div className="flex flex-col gap-2">
                            {FAQ_ITEMS.map((faq) => (
                              <Button
                                key={faq.id}
                                variant="outline"
                                size="sm"
                                className="justify-start h-auto whitespace-normal text-left py-2 px-3 text-xs leading-relaxed"
                                onClick={() => handleFaqSelect(faq)}
                                disabled={isLoading}
                              >
                                <span>{t(faq.questionKey)}</span>
                              </Button>
                            ))}
                          </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.1s" }} />
                          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.2s" }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>

              {/* 输入框 */}
              <div className="p-3 sm:p-4 border-t border-border bg-card">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={t("floating_ai_chat.input_placeholder")}
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleSubmit}
                    disabled={!input.trim() || isLoading}
                    size="icon"
                  >
                    <Send size={18} />
                  </Button>
                </div>
            </div>
          </div>
        </Card>
      )}
    </>
  );
};

export default FloatingAIChat;

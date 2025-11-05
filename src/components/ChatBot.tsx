import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User } from "lucide-react";
import chatbotBg from "@/assets/chatbot-bg.png";
import robotIcon from "@/assets/hunsoccer-robot-icon.png";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const ChatBot = () => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: t('chat_welcome'),
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: t('chat_ai_response'),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="h-full flex flex-col relative overflow-hidden border-2 border-border bg-card shadow-xl">
      {/* Simple Background Pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `url(${chatbotBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }} />
      
      {/* Header */}
      <div className="relative z-10 p-4 border-b-2 border-border bg-gradient-to-r from-primary/10 to-transparent">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="h-12 w-12 bg-background border-2 border-border flex items-center justify-center p-1 shadow-lg">
            <img src={robotIcon} alt="HSL" className="w-full h-full object-contain pixelated" />
          </div>
          
          {/* Title */}
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground font-pixel tracking-wider">
              HUNSOCCER ROBOT
            </h2>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              5 AI ANALYSIS • ONLINE
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="relative z-10 flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 animate-fade-in ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="h-8 w-8 bg-background border-2 border-border flex items-center justify-center flex-shrink-0 p-1">
                  <img src={robotIcon} alt="AI" className="w-full h-full object-contain pixelated" />
                </div>
              )}
              <div
                className={`max-w-[75%] px-3 py-2 border-2 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border"
                }`}
              >
                <p className="text-sm leading-relaxed font-mono">{message.content}</p>
                <p className="text-xs opacity-60 mt-1 font-mono text-right">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {message.role === "user" && (
                <div className="h-8 w-8 bg-info border-2 border-info flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2 justify-start animate-fade-in">
              <div className="h-8 w-8 bg-background border-2 border-border flex items-center justify-center p-1">
                <img src={robotIcon} alt="AI" className="w-full h-full object-contain pixelated animate-pulse" />
              </div>
              <div className="bg-card border-2 border-border px-3 py-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary animate-bounce" />
                  <div
                    className="w-2 h-2 bg-primary animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                  <div
                    className="w-2 h-2 bg-primary animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="relative z-10 p-3 border-t-2 border-border bg-gradient-to-r from-primary/10 to-transparent">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('chat_placeholder')}
            className="flex-1 bg-background border-2 border-border focus:border-primary font-mono text-sm px-3 py-2"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-primary hover:bg-primary/90 border-2 border-border px-4 py-2 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ChatBot;

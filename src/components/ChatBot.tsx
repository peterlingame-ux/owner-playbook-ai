import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Sparkles } from "lucide-react";
import chatbotBg from "@/assets/chatbot-bg.png";

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
    <Card className="h-full flex flex-col bg-gradient-to-br from-card/95 via-card to-card/90 border-2 border-primary/40 shadow-2xl backdrop-blur-sm relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url(${chatbotBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      {/* Gradient Overlay for better readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/80 to-background/90" />
      
      {/* Header */}
      <div className="relative z-10 p-5 border-b-2 border-primary/30 bg-gradient-to-r from-primary/15 via-primary/10 to-info/10 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-info rounded-full blur-md animate-pulse" />
            <div className="relative h-14 w-14 rounded-full bg-gradient-to-br from-primary via-primary/80 to-info flex items-center justify-center shadow-2xl ring-4 ring-primary/20">
              <Bot className="h-7 w-7 text-primary-foreground" />
              <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-warning animate-pulse" />
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold bg-gradient-to-r from-primary via-foreground to-info bg-clip-text text-transparent flex items-center gap-2">
              {t('ai_assistant')}
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">{t('ai_assistant_subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="relative z-10 flex-1 p-6" ref={scrollRef}>
        <div className="space-y-5">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 animate-fade-in ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-info rounded-full blur-sm opacity-50" />
                  <div className="relative h-9 w-9 rounded-full bg-gradient-to-br from-primary via-primary/90 to-info flex items-center justify-center ring-2 ring-primary/30">
                    <Bot className="h-5 w-5 text-primary-foreground" />
                  </div>
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-5 py-3.5 shadow-lg transition-all hover:shadow-xl ${
                  message.role === "user"
                    ? "bg-gradient-to-br from-primary via-primary/95 to-primary/90 text-primary-foreground"
                    : "bg-gradient-to-br from-muted via-muted/95 to-muted/90 border border-border/50"
                }`}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
                <p className="text-xs opacity-60 mt-2 font-mono">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {message.role === "user" && (
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-info to-success rounded-full blur-sm opacity-50" />
                  <div className="relative h-9 w-9 rounded-full bg-gradient-to-br from-info via-info/90 to-success flex items-center justify-center ring-2 ring-info/30">
                    <User className="h-5 w-5 text-primary-foreground" />
                  </div>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 justify-start animate-fade-in">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-info rounded-full blur-sm opacity-50" />
                <div className="relative h-9 w-9 rounded-full bg-gradient-to-br from-primary via-primary/90 to-info flex items-center justify-center ring-2 ring-primary/30">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-muted via-muted/95 to-muted/90 rounded-2xl px-5 py-3.5 shadow-lg border border-border/50">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" />
                  <div
                    className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                  <div
                    className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="relative z-10 p-5 border-t-2 border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-info/10 backdrop-blur-sm">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('chat_placeholder')}
              className="w-full bg-background/80 backdrop-blur-sm border-2 border-primary/40 focus:border-primary/60 rounded-xl px-4 py-6 text-base shadow-lg transition-all focus:shadow-xl"
              disabled={isLoading}
            />
            <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40" />
          </div>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-gradient-to-r from-primary via-primary/90 to-info hover:from-primary/90 hover:via-primary/80 hover:to-info/90 rounded-xl px-6 shadow-lg hover:shadow-xl transition-all h-auto py-3 hover:scale-105"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ChatBot;

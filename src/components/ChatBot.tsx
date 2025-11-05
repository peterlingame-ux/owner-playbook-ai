import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Sparkles } from "lucide-react";
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
    <Card className="h-full flex flex-col relative overflow-hidden border-2 border-primary/40 shadow-2xl bg-card">
      {/* Football Field Background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url(${chatbotBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-info/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/98 via-background/90 to-background/95" />
      
      {/* Diagonal Accent Lines */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, hsl(var(--primary)) 10px, hsl(var(--primary)) 11px)',
      }} />
      
      {/* Header */}
      <div className="relative z-10 p-4 border-b-2 border-primary/30 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative group">
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-info to-primary rounded-lg blur-xl opacity-60 group-hover:opacity-80 transition-opacity animate-pulse" style={{ animationDuration: '2s' }} />
            
            {/* Icon Container */}
            <div className="relative h-16 w-16 rounded-lg bg-gradient-to-br from-background via-card to-background border-2 border-primary/40 flex items-center justify-center p-2 shadow-2xl transform transition-transform group-hover:scale-110">
              <img src={robotIcon} alt="HUNSOCCER ROBOT" className="w-full h-full object-contain filter brightness-110" />
            </div>
            
            {/* Corner Accents */}
            <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-primary rounded-tl" />
            <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-info rounded-tr" />
            <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-info rounded-bl" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-primary rounded-br" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold bg-gradient-to-r from-primary via-info to-primary bg-clip-text text-transparent font-mono">
                {t('ai_assistant')}
              </h2>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse shadow-lg shadow-success/50" />
                <span className="text-xs text-success font-bold">ONLINE</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary" />
              {t('ai_assistant_subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="relative z-10 flex-1 p-5" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 animate-fade-in ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="relative flex-shrink-0 group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-info rounded-lg blur-sm opacity-40 group-hover:opacity-60 transition-opacity" />
                  <div className="relative h-10 w-10 rounded-lg bg-gradient-to-br from-background via-card to-background border-2 border-primary/30 flex items-center justify-center p-1.5 shadow-lg">
                    <img src={robotIcon} alt="AI" className="w-full h-full object-contain" />
                  </div>
                </div>
              )}
              <div
                className={`max-w-[70%] rounded-xl px-4 py-3 shadow-lg backdrop-blur-sm transition-all hover:shadow-xl ${
                  message.role === "user"
                    ? "bg-gradient-to-br from-primary via-primary/95 to-primary/90 text-primary-foreground border-2 border-primary/30"
                    : "bg-gradient-to-br from-card via-card/95 to-card/90 border-2 border-border/50"
                }`}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
                <p className="text-xs opacity-60 mt-2 font-mono text-right">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {message.role === "user" && (
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-info to-success rounded-lg blur-sm opacity-40" />
                  <div className="relative h-10 w-10 rounded-lg bg-gradient-to-br from-info via-info/90 to-success flex items-center justify-center shadow-lg border-2 border-info/30">
                    <User className="h-5 w-5 text-primary-foreground" />
                  </div>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 justify-start animate-fade-in">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-info rounded-lg blur-sm opacity-40" />
                <div className="relative h-10 w-10 rounded-lg bg-gradient-to-br from-background via-card to-background border-2 border-primary/30 flex items-center justify-center p-1.5 shadow-lg">
                  <img src={robotIcon} alt="AI" className="w-full h-full object-contain animate-pulse" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-card via-card/95 to-card/90 rounded-xl px-4 py-3 shadow-lg border-2 border-border/50 backdrop-blur-sm">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-primary/70 animate-bounce" />
                  <div
                    className="w-2 h-2 rounded-full bg-primary/70 animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                  <div
                    className="w-2 h-2 rounded-full bg-primary/70 animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="relative z-10 p-4 border-t-2 border-primary/30 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent backdrop-blur-sm">
        <div className="flex gap-3">
          <div className="flex-1 relative group">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('chat_placeholder')}
              className="w-full bg-background/90 backdrop-blur-sm border-2 border-primary/40 focus:border-primary rounded-lg px-4 py-5 text-sm shadow-lg transition-all focus:shadow-xl group-hover:border-primary/60"
              disabled={isLoading}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary/50 group-hover:text-primary transition-colors" />
            </div>
          </div>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-gradient-to-r from-primary via-primary/90 to-info hover:from-primary/90 hover:via-primary/80 hover:to-info/90 rounded-lg px-5 shadow-lg hover:shadow-xl transition-all h-auto py-3 hover:scale-105 border-2 border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Tech Corner Accents */}
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/30 rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-info/30 rounded-br-lg" />
      </div>
    </Card>
  );
};

export default ChatBot;

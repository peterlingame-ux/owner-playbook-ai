import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User, X, Minimize2, Maximize2, MessageCircle } from "lucide-react";
import robotIcon from "@/assets/hunsoccer-robot-icon.png";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const FloatingAIChat = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
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
    <>
      {/* Floating Button - Chat Icon */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 z-50 bg-primary hover:bg-primary/90"
          size="icon"
          aria-label="Open AI Chat"
        >
          <MessageCircle className="h-8 w-8" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card 
          className={`fixed z-50 shadow-2xl border-2 border-border bg-card/95 backdrop-blur-xl transition-all duration-300 animate-scale-in ${
            isMinimized 
              ? 'bottom-8 right-8 w-80 h-16' 
              : 'bottom-8 right-8 w-[450px] h-[600px]'
          }`}
        >
          {/* Header */}
          <div className="relative p-3 border-b-2 border-border bg-gradient-to-r from-primary/10 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 bg-background border-2 border-border flex items-center justify-center p-1">
                  <img src={robotIcon} alt="AI" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="font-bold text-sm font-pixel tracking-wider">
                    AI {t('chat_title')}
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-mono">ONLINE</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="h-7 w-7 hover:bg-primary/10"
                >
                  {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                >
                  <X size={14} />
                </Button>
              </div>
            </div>
          </div>

          {/* Chat Content */}
          {!isMinimized && (
            <div className="flex flex-col h-[calc(600px-60px)]">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div ref={scrollRef} className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="h-8 w-8 bg-primary/10 border border-border flex items-center justify-center flex-shrink-0 mt-1">
                          <img src={robotIcon} alt="AI" className="w-6 h-6 object-contain" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className="text-[10px] mt-1 opacity-70">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      {message.role === "user" && (
                        <div className="h-8 w-8 bg-primary/10 border border-border flex items-center justify-center flex-shrink-0 mt-1">
                          <User size={16} />
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="h-8 w-8 bg-primary/10 border border-border flex items-center justify-center flex-shrink-0">
                        <img src={robotIcon} alt="AI" className="w-6 h-6 object-contain" />
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce [animation-delay:0.2s]" />
                          <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t-2 border-border bg-background/50">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={t('chat_placeholder')}
                    disabled={isLoading}
                    className="flex-1 border-2"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    size="icon"
                    className="flex-shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </>
  );
};

export default FloatingAIChat;

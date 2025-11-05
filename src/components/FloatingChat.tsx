import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, X, Minimize2, Maximize2, Sparkles } from "lucide-react";

const FloatingChat = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content: t('chat_welcome')
    }
  ]);

  const handleSend = () => {
    if (!message.trim()) return;
    
    setMessages(prev => [...prev, { role: "user", content: message }]);
    setMessage("");
    
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: t('chat_ai_response')
      }]);
    }, 1000);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 z-50 bg-gradient-to-br from-info via-info to-info/80 hover:from-info/90 hover:to-info/70 border-2 border-info/20 group animate-bounce"
          size="icon"
        >
          <div className="relative">
            <Bot className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
            <Sparkles className="absolute -top-1 -right-1 w-3.5 h-3.5 text-yellow-300 animate-pulse" />
            <div className="absolute inset-0 bg-info rounded-full blur-xl opacity-50 group-hover:opacity-70 transition-opacity" />
          </div>
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card 
          className={`fixed z-50 shadow-2xl border-2 border-info/20 bg-card/95 backdrop-blur-xl transition-all duration-300 animate-scale-in ${
            isMinimized 
              ? 'bottom-6 right-6 w-80 h-16' 
              : 'bottom-6 right-6 w-96 h-[600px]'
          }`}
        >
          {/* Header */}
          <div className="relative p-4 border-b border-border/30 bg-gradient-to-r from-info/20 via-info/10 to-transparent cursor-move">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="p-2 rounded-full bg-gradient-to-br from-info/30 to-info/10 backdrop-blur-sm">
                    <Bot className="text-info" size={20} />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      {t('ai_assistant')}
                    </h3>
                    <Sparkles className="w-3 h-3 text-info animate-pulse" />
                  </div>
                  <p className="text-xs text-green-500 font-medium">在线服务中</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="h-8 w-8 hover:bg-info/10"
                >
                  {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                >
                  <X size={16} />
                </Button>
              </div>
            </div>
          </div>

          {/* Chat Content */}
          {!isMinimized && (
            <>
              <ScrollArea className="flex-1 p-4 h-[calc(600px-140px)]">
                <div className="space-y-3">
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex animate-fade-in ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-xl shadow-sm ${
                          msg.role === "user"
                            ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-sm"
                            : "bg-gradient-to-br from-secondary/80 to-secondary/60 backdrop-blur-sm border border-border/30 rounded-bl-sm"
                        }`}
                      >
                        {msg.role === "assistant" && (
                          <div className="flex items-center gap-2 mb-1.5">
                            <Bot className="w-3.5 h-3.5 text-info" />
                            <span className="text-xs font-semibold text-muted-foreground">AI分析师</span>
                          </div>
                        )}
                        <p className={`text-sm leading-relaxed ${msg.role === "assistant" ? "text-foreground" : ""}`}>
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="p-4 border-t border-border/30 bg-card/50 backdrop-blur-sm">
                <div className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSend()}
                    placeholder={t('chat_placeholder')}
                    className="flex-1 bg-background/70 border-border/50 focus:border-info/50 placeholder:text-muted-foreground/50 transition-colors"
                  />
                  <Button 
                    onClick={handleSend} 
                    size="icon" 
                    className="flex-shrink-0 bg-gradient-to-br from-info to-info/80 hover:from-info/90 hover:to-info/70 shadow-lg hover:shadow-info/20 transition-all"
                  >
                    <Send size={18} />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  24/7 智能足球分析顾问
                </p>
              </div>
            </>
          )}
        </Card>
      )}
    </>
  );
};

export default FloatingChat;

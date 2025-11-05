import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Minimize2, Maximize2, Send, MessageCircle } from "lucide-react";
import hunsoccerAiIcon from "@/assets/hunsoccer-ai-icon.png";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const FloatingAIChat = () => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "您好！我是HUNSOCCER AI，有什么可以帮助您的吗？",
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

    // 模拟AI响应
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "感谢您的提问！这是一个模拟的AI回复。实际使用中，这里会连接到真实的AI服务。",
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
    <Card 
      className={`fixed z-50 shadow-2xl border-2 border-border bg-card/95 backdrop-blur-xl transition-all duration-300 ${
        isMinimized 
          ? 'bottom-4 right-4 w-40 h-8' 
          : 'bottom-4 right-4 w-[200px] h-[300px]'
      }`}
    >
          {/* 头部 */}
          <div className="relative p-1.5 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <div className="p-0.5 bg-background border border-border">
                  <img 
                    src={hunsoccerAiIcon} 
                    alt="HUNSOCCER AI" 
                    className="w-[9px] h-[9px] object-contain"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-[10px] font-pixel tracking-wider">
                    HUNSOCCER AI
                  </h3>
                  <p className="text-[6px] text-muted-foreground font-mono">在线咨询</p>
                </div>
              </div>
              
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="h-4 w-4 hover:bg-primary/10 p-0"
                >
                  {isMinimized ? <Maximize2 size={8} /> : <Minimize2 size={8} />}
                </Button>
              </div>
            </div>
          </div>

        {/* 聊天内容 */}
        {!isMinimized && (
          <div className="flex flex-col h-[calc(300px-30px)]">
              <ScrollArea className="flex-1 p-2">
                <div ref={scrollRef} className="space-y-2">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded p-1.5 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-[10px]">{message.content}</p>
                        <p className="text-[8px] opacity-70 mt-0.5">
                          {message.timestamp.toLocaleTimeString("zh-CN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded p-1.5">
                        <div className="flex gap-0.5">
                          <div className="w-1 h-1 rounded-full bg-primary animate-bounce" />
                          <div className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.1s" }} />
                          <div className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.2s" }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* 输入框 */}
              <div className="p-2 border-t border-border">
                <div className="flex gap-1">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="输入您的问题..."
                    className="flex-1 h-6 text-[10px]"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    size="icon"
                    className="h-6 w-6 p-0"
                  >
                    <Send size={10} />
                  </Button>
                </div>
            </div>
          </div>
        )}
      </Card>
  );
};

export default FloatingAIChat;

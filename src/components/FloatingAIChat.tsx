import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, ChevronLeft, Send, MessageCircle, Sparkles } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const FloatingAIChat = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "您好！我是AI助手，有什么可以帮助您的吗？",
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
    <div 
      className={`fixed top-0 right-0 h-screen z-50 transition-all duration-300 ${
        isCollapsed ? 'w-14' : 'w-[420px]'
      }`}
    >
      {/* 侧边栏 */}
      <Card className="h-full rounded-none border-l-2 border-y-0 border-r-0 bg-card/98 backdrop-blur-xl flex flex-col shadow-2xl">
        {/* 头部 */}
        <div className="relative p-4 border-b-2 border-border bg-gradient-to-b from-primary/10 to-transparent">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg border-2 border-primary/20">
                  <Sparkles className="text-primary" size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base font-pixel tracking-wider">
                    AI 智能助手
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    在线服务中
                  </p>
                </div>
              </div>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8 hover:bg-primary/10 shrink-0"
            >
              {isCollapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </Button>
          </div>
        </div>

        {/* 聊天内容区域 */}
        {!isCollapsed && (
          <>
            <ScrollArea className="flex-1 p-4">
              <div ref={scrollRef} className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg p-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1.5">
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
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.1s" }} />
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.2s" }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* 输入框区域 */}
            <div className="p-4 border-t-2 border-border bg-muted/20">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="输入您的问题..."
                  className="flex-1 bg-background"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="shrink-0"
                >
                  <Send size={18} />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                按 Enter 发送，Shift + Enter 换行
              </p>
            </div>
          </>
        )}

        {/* 折叠状态显示 */}
        {isCollapsed && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-2">
            <MessageCircle className="text-primary" size={24} />
            <div className="text-sm font-medium [writing-mode:vertical-rl]">AI助手</div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default FloatingAIChat;

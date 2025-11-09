import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Minimize2, Maximize2, Send, MessageCircle } from "lucide-react";
import hunsoccerAiIcon from "@/assets/hunsoccer-ai-icon.png";
import { useTypewriter } from "@/hooks/useTypewriter";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

const MessageBubble = ({ message }: { message: Message }) => {
  const { displayedText } = useTypewriter({
    text: message.content,
    speed: message.role === "assistant" && message.isTyping ? 30 : 0,
  });

  const content = message.role === "assistant" && message.isTyping ? displayedText : message.content;

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
        <p className="text-sm">{content}</p>
        <p className="text-xs opacity-70 mt-1">
          {message.timestamp.toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
};

const FloatingAIChat = () => {
  const [isMinimized, setIsMinimized] = useState(true);
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
        isTyping: true,
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
      {/* 最小化按钮 */}
      {isMinimized && (
        <div className="fixed bottom-6 right-[280px] sm:right-6 z-50">
          {/* 脉冲圆环效果 */}
          <div className="absolute inset-0 rounded-full bg-[hsl(172,48%,55%)]/30 animate-ping" />
          <div className="absolute inset-0 rounded-full bg-[hsl(172,48%,55%)]/20 animate-pulse" />
          
          {/* 主按钮 */}
          <button
            onClick={() => setIsMinimized(false)}
            className="relative w-14 h-14 rounded-full bg-[hsl(172,48%,55%)] hover:bg-[hsl(172,48%,50%)] text-white shadow-lg transition-all duration-300 hover:scale-110 flex items-center justify-center"
            title="打开聊天"
          >
            <MessageCircle size={24} />
          </button>
        </div>
      )}

      {/* 聊天窗口 */}
      {!isMinimized && (
        <Card 
          className="fixed bottom-6 right-6 w-[400px] h-[600px] z-50 shadow-2xl border-2 border-border bg-card/95 backdrop-blur-xl"
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
                  <p className="text-[10px] text-muted-foreground font-mono">在线咨询</p>
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
          <div className="flex flex-col h-[calc(600px-60px)]">
              <ScrollArea className="flex-1 p-4">
                <div ref={scrollRef} className="space-y-4">
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
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

              {/* 输入框 */}
              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="输入您的问题..."
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleSend}
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

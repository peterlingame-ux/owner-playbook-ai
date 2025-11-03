import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot } from "lucide-react";

const AIChat = () => {
  const { t } = useTranslation();
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
    
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I can help you analyze team owner data, compare AI predictions, and provide insights on upcoming matches. What would you like to know?"
      }]);
    }, 1000);
  };

  return (
    <Card className="p-6 bg-card border-border">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Bot className="text-primary" size={24} />
          <h2 className="text-xl font-bold">{t('ai_assistant')}</h2>
        </div>
        <p className="text-xs text-muted-foreground ml-8">5AI综合专业分析，大幅度提高胜率</p>
      </div>
      
      <div className="h-[200px] overflow-y-auto mb-4 space-y-4 p-4 bg-secondary/30 rounded-lg">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent"
              }`}
            >
              <p className={`text-sm ${msg.role === "assistant" ? "text-muted-foreground" : ""}`}>{msg.content}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
          placeholder={t('chat_placeholder')}
          className="flex-1 bg-secondary border-border placeholder:text-muted-foreground/50"
        />
        <Button onClick={handleSend} size="icon">
          <Send size={18} />
        </Button>
      </div>
    </Card>
  );
};

export default AIChat;

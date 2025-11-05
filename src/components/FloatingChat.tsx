import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Minimize2, Maximize2, Activity } from "lucide-react";
import MatchCenter from "./MatchCenter";
import chatIcon from "@/assets/chat-icon-new.png";

const FloatingChat = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <>
      {/* Floating Button - Football Icon */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 z-50 bg-transparent hover:bg-transparent border-0 p-0"
          size="icon"
          aria-label="Open Match Schedule"
        >
          <img 
            src={chatIcon} 
            alt="Match Schedule" 
            className="w-full h-full object-contain"
          />
        </Button>
      )}

      {/* Match Schedule Window */}
      {isOpen && (
        <Card 
          className={`fixed z-50 shadow-2xl border-2 border-border bg-card/95 backdrop-blur-xl transition-all duration-300 animate-scale-in ${
            isMinimized 
              ? 'bottom-8 right-8 w-80 h-16' 
              : 'bottom-8 right-8 w-[450px] h-[650px]'
          }`}
        >
          {/* Header */}
          <div className="relative p-3 border-b-2 border-border bg-gradient-to-r from-primary/10 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-background border-2 border-border">
                  <Activity className="text-primary" size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm font-pixel tracking-wider">
                    MATCH SCHEDULE
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-mono">LIVE TRACKING</p>
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

          {/* Match Center Content */}
          {!isMinimized && (
            <div className="h-[calc(650px-60px)] overflow-hidden">
              <MatchCenter />
            </div>
          )}
        </Card>
      )}
    </>
  );
};

export default FloatingChat;

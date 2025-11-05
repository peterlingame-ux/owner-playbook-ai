import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Minimize2, Maximize2, Activity } from "lucide-react";
import MatchCenter from "./MatchCenter";

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
          className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 z-50 bg-primary hover:bg-primary/90 border-2 border-border group"
          size="icon"
          aria-label="Open Match Schedule"
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-primary-foreground"
          >
            {/* Soccer ball icon */}
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <path d="M12 2 L12 6 L15.5 8.5 L14 13 L12 12" stroke="currentColor" strokeWidth="1.2" fill="none"/>
            <path d="M12 2 L8.5 4.5 L5 6.5 L7 11 L12 12" stroke="currentColor" strokeWidth="1.2" fill="none"/>
            <path d="M12 22 L12 18 L8.5 15.5 L10 11 L12 12" stroke="currentColor" strokeWidth="1.2" fill="none"/>
            <path d="M12 22 L15.5 19.5 L19 17.5 L17 13 L12 12" stroke="currentColor" strokeWidth="1.2" fill="none"/>
            <path d="M22 12 L18 12 L15.5 8.5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
            <path d="M2 12 L6 12 L8.5 15.5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
          </svg>
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

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FloatingChatButtonProps {
  onClick: () => void;
}

const FloatingChatButton = ({ onClick }: FloatingChatButtonProps) => {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-lg hover:scale-110 transition-transform z-50 bg-primary hover:bg-primary/90"
      size="icon"
    >
      <div className="relative">
        {/* Football/Soccer ball icon effect */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-primary-foreground"
          >
            <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="2" fill="none"/>
            <path d="M16 1 L16 8 L21 12 L19 19 L16 16" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <path d="M16 1 L11 5 L6 8 L9 15 L16 16" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <path d="M16 31 L16 24 L11 20 L13 13 L16 16" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <path d="M16 31 L21 27 L26 24 L23 17 L16 16" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          </svg>
        </div>
      </div>
    </Button>
  );
};

export default FloatingChatButton;

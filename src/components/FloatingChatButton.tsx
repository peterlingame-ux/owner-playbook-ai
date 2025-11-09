import { Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FloatingChatButtonProps {
  onClick: () => void;
}

const FloatingChatButton = ({ onClick }: FloatingChatButtonProps) => {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-6 right-4 sm:right-6 h-10 w-10 rounded-full shadow-lg hover:scale-105 transition-transform z-50 bg-primary hover:bg-primary/90"
      size="icon"
      aria-label="Open AI Chat"
    >
      <svg
        width="18"
        height="18"
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
  );
};

export default FloatingChatButton;

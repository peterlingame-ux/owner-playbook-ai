import { ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SwipeBackIndicatorProps {
  isActive: boolean;
  progress: number;
}

export const SwipeBackIndicator = ({ isActive, progress }: SwipeBackIndicatorProps) => {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: progress }}
          exit={{ opacity: 0 }}
          className="fixed left-0 top-0 bottom-0 w-20 pointer-events-none z-50 flex items-center justify-start pl-4"
          style={{
            background: `linear-gradient(to right, hsl(var(--primary) / ${progress * 0.2}), transparent)`
          }}
        >
          <motion.div
            animate={{ x: progress * 30 }}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20 backdrop-blur-sm border-2 border-primary/50"
          >
            <ArrowLeft 
              className="w-5 h-5 text-primary"
              style={{ opacity: progress }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

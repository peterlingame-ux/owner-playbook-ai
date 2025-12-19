import { useCountAnimation } from "@/hooks/useCountAnimation";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";

interface AnimatedWinRateProps {
  value: number;
  className?: string;
  style?: React.CSSProperties;
  trend?: number; // positive = up, negative = down, 0 = neutral
  showTrend?: boolean;
}

export const AnimatedWinRate = ({ value, className, style, trend, showTrend = false }: AnimatedWinRateProps) => {
  const animatedValue = useCountAnimation(value, {
    duration: 1500,
    startValue: Math.max(0, value - 12)
  });

  const getTrendIcon = () => {
    if (!showTrend || trend === undefined) return null;
    
    if (trend > 2) {
      return (
        <motion.span
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center ml-1"
        >
          <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-success" />
        </motion.span>
      );
    } else if (trend < -2) {
      return (
        <motion.span
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center ml-1"
        >
          <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
        </motion.span>
      );
    } else {
      return (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="inline-flex items-center ml-1"
        >
          <Minus className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </motion.span>
      );
    }
  };

  return (
    <span className={`inline-flex items-center ${className}`} style={style}>
      {animatedValue.toFixed(1)}%
      {getTrendIcon()}
    </span>
  );
};

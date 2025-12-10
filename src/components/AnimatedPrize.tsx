import { useCountAnimation } from "@/hooks/useCountAnimation";
import { DollarSign } from "lucide-react";
import { motion } from "framer-motion";

interface AnimatedPrizeProps {
  value: number;
  className?: string;
  showIcon?: boolean;
  duration?: number;
}

export const AnimatedPrize = ({ 
  value, 
  className = "", 
  showIcon = false,
  duration = 800 
}: AnimatedPrizeProps) => {
  const animatedValue = useCountAnimation(value, { duration, startValue: 0 });
  
  if (value <= 0) {
    return null;
  }
  
  return (
    <motion.span 
      className={`inline-flex items-center gap-0.5 ${className}`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {showIcon && <DollarSign className="h-3 w-3" />}
      <motion.span
        key={value}
        initial={{ y: -5, opacity: 0.5 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        ${Math.floor(animatedValue).toLocaleString()}
      </motion.span>
    </motion.span>
  );
};

// 大型奖金池显示组件
export const AnimatedPrizePool = ({ 
  value, 
  className = "",
  duration = 1200
}: AnimatedPrizeProps) => {
  const animatedValue = useCountAnimation(value, { duration, startValue: 0 });
  
  return (
    <motion.p 
      className={className}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <motion.span
        key={value}
        initial={{ y: -10 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
      >
        ${Math.floor(animatedValue).toLocaleString()}
      </motion.span>
    </motion.p>
  );
};

export default AnimatedPrize;

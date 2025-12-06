import { useCountAnimation } from "@/hooks/useCountAnimation";

interface AnimatedAmountProps {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
}

export const AnimatedAmount = ({ 
  value, 
  prefix = "", 
  suffix = "",
  className,
  duration = 1500
}: AnimatedAmountProps) => {
  const animatedValue = useCountAnimation(Math.abs(value), {
    duration,
    startValue: 0
  });

  return (
    <span className={className}>
      {prefix}¥{Math.round(animatedValue).toLocaleString()}{suffix}
    </span>
  );
};

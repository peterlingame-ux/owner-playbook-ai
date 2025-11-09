import { useCountAnimation } from "@/hooks/useCountAnimation";

interface AnimatedWinRateProps {
  value: number;
  className?: string;
  style?: React.CSSProperties;
}

export const AnimatedWinRate = ({ value, className, style }: AnimatedWinRateProps) => {
  const animatedValue = useCountAnimation(value, {
    duration: 1500,
    startValue: Math.max(0, value - 12)
  });

  return (
    <span className={className} style={style}>
      {animatedValue.toFixed(1)}%
    </span>
  );
};

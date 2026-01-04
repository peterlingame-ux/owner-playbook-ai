import { useCountAnimation } from "@/hooks/useCountAnimation";
import { useTranslation } from "react-i18next";
import hunterCoinIcon from "@/assets/hunter-coin-new.png";

interface AnimatedAmountProps {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
  showIcon?: boolean;
  iconSize?: string;
}

export const AnimatedAmount = ({ 
  value, 
  prefix = "", 
  suffix = "",
  className,
  duration = 1500,
  showIcon = true,
  iconSize = "w-4 h-4"
}: AnimatedAmountProps) => {
  const { t } = useTranslation();
  const animatedValue = useCountAnimation(Math.abs(value), {
    duration,
    startValue: 0
  });

  return (
    <span className={`inline-flex items-center gap-1 ${className || ''}`}>
      {prefix}{Math.round(animatedValue).toLocaleString()}
      {showIcon ? (
        <img src={hunterCoinIcon} alt={t('hunter_coins_unit')} className={iconSize} />
      ) : (
        ' PTS'
      )}
      {suffix}
    </span>
  );
};

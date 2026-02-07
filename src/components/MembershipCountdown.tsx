import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface MembershipCountdownProps {
  expiresAt: string | null;
  isActive: boolean;
  className?: string;
}

const MS_PER_MINUTE = 60 * 1000;

export const MembershipCountdown = ({ expiresAt, isActive, className = "" }: MembershipCountdownProps) => {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (!expiresAt || !isActive) {
      setCountdown("");
      return;
    }

    const formatRemaining = () => {
      const now = Date.now();
      const remaining = new Date(expiresAt).getTime() - now;

      if (remaining <= 0) {
        return t("membership_expired") || "已过期";
      }

      const days = Math.floor(remaining / 86400000);
      const hours = Math.floor((remaining % 86400000) / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);

      if (days > 0) {
        return `${days}${t("days") || "天"} ${hours}${t("hours") || "小时"} ${minutes}${t("minutes") || "分"}`;
      }
      if (hours > 0) {
        return `${hours}${t("hours") || "小时"} ${minutes}${t("minutes") || "分"}`;
      }
      return `${minutes}${t("minutes") || "分"}`;
    };

    const tick = () => setCountdown(formatRemaining());
    tick();
    const id = setInterval(tick, MS_PER_MINUTE);
    return () => clearInterval(id);
  }, [expiresAt, isActive, t]);

  if (!expiresAt) return null;

  return <span className={className}>{countdown}</span>;
};

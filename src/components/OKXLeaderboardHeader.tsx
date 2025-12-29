import { TrendingUp, TrendingDown, Trophy, Flame, Snowflake } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface OKXLeaderboardHeaderProps {
  timeRange: 1 | 7 | 30;
  onTimeRangeChange: (range: 1 | 7 | 30) => void;
  boardType: 'hot' | 'cold';
  onBoardTypeChange: (type: 'hot' | 'cold') => void;
  totalPlayers: number;
}

export const OKXLeaderboardHeader = ({
  timeRange,
  onTimeRangeChange,
  boardType,
  onBoardTypeChange,
  totalPlayers,
}: OKXLeaderboardHeaderProps) => {
  const { t } = useTranslation();

  const timeRanges = [
    { value: 1 as const, label: '24H' },
    { value: 7 as const, label: '7D' },
    { value: 30 as const, label: '30D' },
  ];

  const boardTypes = [
    { 
      value: 'hot' as const, 
      label: t('hot_players') || '高胜率',
      icon: Flame,
      color: 'text-amber-500',
      activeBg: 'bg-amber-500/10',
      activeBorder: 'border-amber-500/30',
    },
    { 
      value: 'cold' as const, 
      label: t('cold_players') || '低胜率',
      icon: Snowflake,
      color: 'text-blue-500',
      activeBg: 'bg-blue-500/10',
      activeBorder: 'border-blue-500/30',
    },
  ];

  return (
    <div className="space-y-4">
      {/* 主标题区域 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {t('player_leaderboard')}
            </h1>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-muted/50 text-xs text-muted-foreground">
            {totalPlayers} {t('players_suffix') || '位预测者'}
          </span>
        </div>
      </div>

      {/* 筛选器区域 - OKX风格 */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 rounded-xl bg-muted/20 border border-border/30">
        {/* 左侧：榜单类型切换 */}
        <div className="flex items-center gap-2">
          {boardTypes.map((type) => {
            const Icon = type.icon;
            const isActive = boardType === type.value;
            return (
              <button
                key={type.value}
                onClick={() => onBoardTypeChange(type.value)}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 border",
                  isActive
                    ? cn(type.activeBg, type.activeBorder, type.color)
                    : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", isActive && type.color)} />
                <span>{type.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeBoard"
                    className="absolute inset-0 rounded-lg border-2 border-current opacity-20"
                    transition={{ type: "spring", duration: 0.5 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* 右侧：时间范围切换 */}
        <div className="flex items-center bg-background/50 rounded-lg p-1 border border-border/30">
          {timeRanges.map((range) => (
            <button
              key={range.value}
              onClick={() => onTimeRangeChange(range.value)}
              className={cn(
                "relative px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all duration-200",
                timeRange === range.value
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {timeRange === range.value && (
                <motion.div
                  layoutId="activeTimeRange"
                  className="absolute inset-0 bg-primary/10 rounded-md"
                  transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
                />
              )}
              <span className="relative z-10">{range.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 排序提示 */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          {boardType === 'hot' ? (
            <>
              <TrendingUp className="h-3.5 w-3.5 text-success" />
              <span>{t('sorted_by_streak') || '按连胜排序'}</span>
            </>
          ) : (
            <>
              <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              <span>{t('sorted_by_lose_streak') || '按连败排序'}</span>
            </>
          )}
        </span>
        <span className="text-border">·</span>
        <span>{t('realtime_update') || '实时更新'}</span>
      </div>
    </div>
  );
};

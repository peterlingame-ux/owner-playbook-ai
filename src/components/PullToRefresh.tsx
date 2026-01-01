import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}

export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  threshold = 80,
}: PullToRefreshIndicatorProps) {
  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 180;
  const opacity = Math.min(progress * 1.5, 1);
  const scale = 0.5 + progress * 0.5;

  if (pullDistance <= 0 && !isRefreshing) return null;

  return (
    <div
      className="absolute left-0 right-0 flex items-center justify-center z-50 pointer-events-none"
      style={{
        top: 0,
        height: `${Math.max(pullDistance, isRefreshing ? threshold * 0.6 : 0)}px`,
        transition: isRefreshing ? 'none' : 'height 0.2s ease-out',
      }}
    >
      <div
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full bg-card/90 backdrop-blur-sm border border-border/50 shadow-lg",
          isRefreshing && "animate-pulse"
        )}
        style={{
          opacity,
          transform: `scale(${scale})`,
          transition: isRefreshing ? 'none' : 'opacity 0.2s, transform 0.2s',
        }}
      >
        <RefreshCw
          className={cn(
            "w-5 h-5 text-primary",
            isRefreshing && "animate-spin"
          )}
          style={{
            transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
            transition: isRefreshing ? 'none' : 'transform 0.1s',
          }}
        />
      </div>
      {progress >= 1 && !isRefreshing && (
        <span className="absolute bottom-1 text-[10px] text-muted-foreground">
          松开刷新
        </span>
      )}
      {isRefreshing && (
        <span className="absolute bottom-1 text-[10px] text-muted-foreground">
          正在刷新...
        </span>
      )}
    </div>
  );
}

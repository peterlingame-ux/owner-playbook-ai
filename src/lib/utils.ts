import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 获取当前 UTC 时间戳（秒级）
// 注意：时间戳本身是 UTC 的，无论用户在哪个时区，同一个时间点的时间戳都是一样的
// 这样与 API 返回的 UTC 时间戳（如 kickoffTime）相减才是正确的
export const getUTC8Timestamp = (): number => {
  // 直接返回 UTC 时间戳（秒级）
  // 时间戳本身就是 UTC 的，不需要时区转换
  return Math.floor(Date.now() / 1000);
};

// 获取当前 UTC 时间戳（毫秒级）
// 注意：时间戳本身是 UTC 的，无论用户在哪个时区，同一个时间点的时间戳都是一样的
export const getUTC8TimestampMs = (): number => {
  // 直接返回 UTC 时间戳（毫秒级）
  // 时间戳本身就是 UTC 的，不需要时区转换
  return Date.now();
};

const UTC8_OFFSET_MS = 8 * 60 * 60 * 1000;

/** 获取当前在 UTC+8 下的年月日（用于「当天/本周/本月」的日历） */
function getUTC8Calendar(): { y: number; m: number; d: number; dayOfWeek: number } {
  const utc8 = new Date(Date.now() + UTC8_OFFSET_MS);
  return {
    y: utc8.getUTCFullYear(),
    m: utc8.getUTCMonth(),
    d: utc8.getUTCDate(),
    dayOfWeek: utc8.getUTCDay(), // 0=周日, 1=周一, ..., 6=周六
  };
}

/**
 * 按 UTC+8 的「日/周/月」计算时间范围，返回用于查询 settled_at(UTC) 的起止时间（UTC Date）。
 * 日：UTC+8 当天 00:00 ~ 23:59 对应的 UTC 区间
 * 周：UTC+8 本周一 00:00 ~ 本周日 23:59 对应的 UTC 区间
 * 月：UTC+8 当月 1 号 00:00 ~ 当月最后一天 23:59 对应的 UTC 区间
 */
export function getUTC8Range(
  mode: "day" | "week" | "month"
): { start: Date; end: Date } {
  const cal = getUTC8Calendar();
  const { y, m, d, dayOfWeek } = cal;
  let startUtcMs: number;
  let endUtcMs: number;

  if (mode === "day") {
    // UTC+8 (y,m,d) 00:00:00.000 -> UTC
    startUtcMs = Date.UTC(y, m, d, 0, 0, 0, 0) - UTC8_OFFSET_MS;
    endUtcMs = Date.UTC(y, m, d, 23, 59, 59, 999) - UTC8_OFFSET_MS;
  } else if (mode === "week") {
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const mondayD = d - daysToMonday;
    const sundayD = mondayD + 6;
    startUtcMs = Date.UTC(y, m, mondayD, 0, 0, 0, 0) - UTC8_OFFSET_MS;
    endUtcMs = Date.UTC(y, m, sundayD, 23, 59, 59, 999) - UTC8_OFFSET_MS;
  } else {
    // month: 1 号 00:00 ~ 最后一天 23:59 UTC+8
    startUtcMs = Date.UTC(y, m, 1, 0, 0, 0, 0) - UTC8_OFFSET_MS;
    endUtcMs = Date.UTC(y, m + 1, 0, 23, 59, 59, 999) - UTC8_OFFSET_MS;
  }

  return { start: new Date(startUtcMs), end: new Date(endUtcMs) };
}

/** 获取当前 UTC+8 日/周/月范围的简短说明（用于 UI 展示，便于核对） */
function formatUTC8DateForDisplay(date: Date): string {
  const utc8 = new Date(date.getTime() + UTC8_OFFSET_MS);
  const m = utc8.getUTCMonth() + 1;
  const d = utc8.getUTCDate();
  return `${m}月${d}日`;
}

export function getUTC8RangeLabel(mode: "day" | "week" | "month"): string {
  const { start, end } = getUTC8Range(mode);
  return mode === "day"
    ? formatUTC8DateForDisplay(start)
    : `${formatUTC8DateForDisplay(start)} - ${formatUTC8DateForDisplay(end)}`;
}

/** 多语言：按 UTC+8 日/周/月范围格式化，使用 Intl 和 Asia/Shanghai 时区 */
export function getUTC8RangeLabelWithLocale(mode: "day" | "week" | "month", locale: string): string {
  const { start, end } = getUTC8Range(mode);
  const opts: Intl.DateTimeFormatOptions = { timeZone: "Asia/Shanghai", month: "short", day: "numeric" };
  const fmt = (d: Date) => new Intl.DateTimeFormat(locale, opts).format(d);
  return mode === "day" ? fmt(start) : `${fmt(start)} - ${fmt(end)}`;
}

/** 获取 UTC+8 下的「今天」日期字符串 YYYY-MM-DD（用于 settlement_date 等） */
export function getUTC8DateString(): string {
  const cal = getUTC8Calendar();
  const m = String(cal.m + 1).padStart(2, "0");
  const d = String(cal.d).padStart(2, "0");
  return `${cal.y}-${m}-${d}`;
}

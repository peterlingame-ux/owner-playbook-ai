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

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 获取 UTC+8 时区的当前时间戳（秒级）
export const getUTC8Timestamp = (): number => {
  const now = new Date();
  // 获取 UTC+8 时区的当前时间
  const utc8Time = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  // 计算 UTC+8 与 UTC 的时差（毫秒）
  const offset = now.getTime() - utc8Time.getTime();
  // 返回 UTC+8 时间戳（秒级）
  return Math.floor((now.getTime() - offset) / 1000);
};

// 获取 UTC+8 时区的当前时间戳（毫秒级）
export const getUTC8TimestampMs = (): number => {
  const now = new Date();
  // 获取 UTC+8 时区的当前时间
  const utc8Time = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  // 计算 UTC+8 与 UTC 的时差（毫秒）
  const offset = now.getTime() - utc8Time.getTime();
  // 返回 UTC+8 时间戳（毫秒级）
  return now.getTime() - offset;
};

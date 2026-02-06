import { useMemo } from "react";
import type { User } from "@supabase/supabase-js";

const TRIAL_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 白名单手机号：不检查 7 天试用限制 */
const TRIAL_BYPASS_PHONES = ["15557643805", "18218416135"];

function isTrialBypassUser(user: User | null): boolean {
  if (!user?.phone) return false;
  const phone = user.phone.replace(/\D/g, ""); // 去除 +、空格等
  return TRIAL_BYPASS_PHONES.some(
    (bypass) => phone === bypass || phone.endsWith(bypass)
  );
}

export interface TrialStatus {
  isTrialActive: boolean;
  trialExpired: boolean;
  trialEndsAt: Date | null;
  trialEndsAtMs: number;
}

export function useTrialStatus(user: User | null): TrialStatus {
  return useMemo(() => {
    if (!user?.created_at) {
      return {
        isTrialActive: false,
        trialExpired: false,
        trialEndsAt: null,
        trialEndsAtMs: 0,
      };
    }
    // 白名单用户跳过 7 天限制
    if (isTrialBypassUser(user)) {
      return {
        isTrialActive: true,
        trialExpired: false,
        trialEndsAt: null,
        trialEndsAtMs: Number.MAX_SAFE_INTEGER,
      };
    }
    const createdAt = new Date(user.created_at).getTime();
    const trialEndsAtMs = createdAt + TRIAL_DAYS * MS_PER_DAY;
    const now = Date.now();
    const isTrialActive = now < trialEndsAtMs;
    const trialExpired = !isTrialActive;

    return {
      isTrialActive,
      trialExpired,
      trialEndsAt: new Date(trialEndsAtMs),
      trialEndsAtMs,
    };
  }, [user?.created_at, user?.phone]);
}

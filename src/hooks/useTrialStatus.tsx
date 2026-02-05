import { useMemo } from "react";
import type { User } from "@supabase/supabase-js";

const TRIAL_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
  }, [user?.created_at]);
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const UPDATE_INTERVAL = 60 * 1000; // 每分钟更新一次

interface OnlineTimeData {
  totalMinutes: number;
  level: number;
  lastActiveAt: string | null;
}

export const useOnlineTracking = () => {
  const { user } = useAuth();
  const [onlineData, setOnlineData] = useState<OnlineTimeData>({
    totalMinutes: 0,
    level: 1,
    lastActiveAt: null,
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<Date | null>(null);

  // 计算等级: 每1小时升1级，最高50级
  const calculateLevel = useCallback((minutes: number) => {
    return Math.min(50, Math.max(1, Math.floor(minutes / 60) + 1));
  }, []);

  // 获取当前在线时长数据
  const fetchOnlineTime = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_online_time')
        .select('total_minutes, last_active_at')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching online time:', error);
        return;
      }

      if (data) {
        const totalMinutes = data.total_minutes || 0;
        setOnlineData({
          totalMinutes,
          level: calculateLevel(totalMinutes),
          lastActiveAt: data.last_active_at,
        });
      } else {
        // 如果没有记录，创建一个
        const { error: insertError } = await supabase
          .from('user_online_time')
          .insert({ user_id: user.id, total_minutes: 0 });
        
        if (insertError && !insertError.message?.includes('duplicate')) {
          console.error('Error creating online time record:', insertError);
        }
      }
    } catch (err) {
      console.error('Error in fetchOnlineTime:', err);
    }
  }, [user, calculateLevel]);

  // 更新在线时长
  const updateOnlineTime = useCallback(async () => {
    if (!user) return;

    const now = new Date();
    const lastUpdate = lastUpdateRef.current;
    
    // 计算实际经过的分钟数
    let minutesToAdd = 1;
    if (lastUpdate) {
      const diffMs = now.getTime() - lastUpdate.getTime();
      minutesToAdd = Math.max(1, Math.round(diffMs / 60000));
    }
    
    lastUpdateRef.current = now;

    try {
      // 先获取当前值
      const { data: currentData } = await supabase
        .from('user_online_time')
        .select('total_minutes')
        .eq('user_id', user.id)
        .single();

      const currentMinutes = currentData?.total_minutes || 0;
      const newMinutes = currentMinutes + minutesToAdd;

      const { error } = await supabase
        .from('user_online_time')
        .update({
          total_minutes: newMinutes,
          last_active_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating online time:', error);
        return;
      }

      setOnlineData({
        totalMinutes: newMinutes,
        level: calculateLevel(newMinutes),
        lastActiveAt: now.toISOString(),
      });
    } catch (err) {
      console.error('Error in updateOnlineTime:', err);
    }
  }, [user, calculateLevel]);

  // 初始化和定时更新
  useEffect(() => {
    if (!user) {
      setOnlineData({ totalMinutes: 0, level: 1, lastActiveAt: null });
      return;
    }

    // 初始获取数据
    fetchOnlineTime();
    lastUpdateRef.current = new Date();

    // 设置定时更新
    intervalRef.current = setInterval(() => {
      updateOnlineTime();
    }, UPDATE_INTERVAL);

    // 清理
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user, fetchOnlineTime, updateOnlineTime]);

  // 格式化在线时长显示
  const formatOnlineTime = useCallback((minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}小时${mins}分钟`;
    }
    return `${mins}分钟`;
  }, []);

  // 计算升级所需时长
  const getNextLevelProgress = useCallback(() => {
    const currentLevel = onlineData.level;
    if (currentLevel >= 50) {
      return { current: 60, required: 60, percentage: 100 };
    }
    const minutesForCurrentLevel = (currentLevel - 1) * 60;
    const minutesForNextLevel = currentLevel * 60;
    const currentProgress = onlineData.totalMinutes - minutesForCurrentLevel;
    return {
      current: currentProgress,
      required: 60,
      percentage: Math.min(100, Math.round((currentProgress / 60) * 100)),
    };
  }, [onlineData]);

  return {
    ...onlineData,
    formatOnlineTime,
    getNextLevelProgress,
    refetch: fetchOnlineTime,
  };
};

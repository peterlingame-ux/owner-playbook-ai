import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  display_name: string;
  avatar_url: string;
}

interface UserBalance {
  balance: number;
  total_wagered: number;
  total_won: number;
  total_lost: number;
}

interface UserVip {
  isActive: boolean;
  expiresAt: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userProfile: UserProfile | null;
  userBalance: UserBalance | null;
  userVip: UserVip | null;
  refreshBalance: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  refreshUserVip: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  userProfile: null,
  userBalance: null,
  userVip: null,
  refreshBalance: async () => {},
  refreshUserProfile: async () => {},
  refreshUserVip: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);
  const [userVip, setUserVip] = useState<UserVip | null>(null);
  /** 已拉取过 profile/balance/vip 的 user id，避免 onAuthStateChange 与 getSession 重复请求 */
  const fetchedUserIdRef = useRef<string | null>(null);

  // Fetch user profile
  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('display_name, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    // 如果查询出错且不是"记录不存在"的错误，记录错误
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user profile:', error);
      return;
    }

    // 如果用户记录存在，设置用户资料
    if (data) {
      setUserProfile(data);
    } else {
      // 如果用户记录不存在，清理认证信息，视为游客
      console.warn(`User profile not found for userId: ${userId}, clearing auth state`);
      
      // 清除用户资料和余额
      setUserProfile(null);
      setUserBalance(null);
      
      // 清除认证状态（登出）
      await supabase.auth.signOut();
      
      // 清除用户和 session 状态
      setUser(null);
      setSession(null);
    }
  };

  // Fetch user balance
  const fetchUserBalance = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_balances')
      .select('balance, total_wagered, total_won, total_lost')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user balance:', error);
      return;
    }

    if (data) {
      setUserBalance(data);
    } else {
      // 如果没有记录，使用默认值
      setUserBalance({
        balance: 100000,
        total_wagered: 0,
        total_won: 0,
        total_lost: 0,
      });
    }
  };

  // Refresh balance
  const refreshBalance = async () => {
    if (user) {
      await fetchUserBalance(user.id);
    }
  };

  // Fetch user VIP status
  const fetchUserVip = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_vip')
      .select('is_active, expires_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user VIP:', error);
      return;
    }

    if (data && data.expires_at) {
      const expiresAt = data.expires_at as string;
      const isActive = data.is_active === true && new Date(expiresAt) > new Date();
      setUserVip({ isActive, expiresAt });
    } else {
      setUserVip({ isActive: false, expiresAt: null });
    }
  };

  // Refresh user profile
  const refreshUserProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  };

  // Refresh user VIP
  const refreshUserVip = async () => {
    if (user) {
      await fetchUserVip(user.id);
    }
  };

  // 仅对当前 userId 拉取一次 profile/balance/vip；并行请求，全部返回后一次性更新，减少多次 setState 导致的卡顿
  const loadUserDataOnce = (userId: string) => {
    if (fetchedUserIdRef.current === userId) return;
    fetchedUserIdRef.current = userId;
    (async () => {
      const [profileRes, balanceRes, vipRes] = await Promise.all([
        supabase.from('users').select('display_name, avatar_url').eq('id', userId).maybeSingle(),
        supabase.from('user_balances').select('balance, total_wagered, total_won, total_lost').eq('user_id', userId).maybeSingle(),
        supabase.from('user_vip').select('is_active, expires_at').eq('user_id', userId).maybeSingle(),
      ]);
      if (fetchedUserIdRef.current !== userId) return;
      if (profileRes.error && profileRes.error.code !== 'PGRST116') console.error('Error fetching user profile:', profileRes.error);
      if (profileRes.data) {
        setUserProfile(profileRes.data);
      } else {
        fetchedUserIdRef.current = null;
        setUserProfile(null);
        setUserBalance(null);
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        return;
      }
      if (balanceRes.error && balanceRes.error.code !== 'PGRST116') console.error('Error fetching user balance:', balanceRes.error);
      setUserBalance(balanceRes.data ?? { balance: 100000, total_wagered: 0, total_won: 0, total_lost: 0 });
      if (vipRes.error && vipRes.error.code !== 'PGRST116') console.error('Error fetching user VIP:', vipRes.error);
      if (vipRes.data?.expires_at) {
        const expiresAt = vipRes.data.expires_at as string;
        setUserVip({ isActive: vipRes.data.is_active === true && new Date(expiresAt) > new Date(), expiresAt });
      } else {
        setUserVip({ isActive: false, expiresAt: null });
      }
    })();
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          loadUserDataOnce(session.user.id);
        } else {
          fetchedUserIdRef.current = null;
          setUserProfile(null);
          setUserBalance(null);
          setUserVip(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        loadUserDataOnce(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, userProfile, userBalance, userVip, refreshBalance, refreshUserProfile, refreshUserVip }}>
      {children}
    </AuthContext.Provider>
  );
};

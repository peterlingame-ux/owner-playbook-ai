import React, { createContext, useContext, useEffect, useState } from 'react';
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

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userProfile: UserProfile | null;
  userBalance: UserBalance | null;
  refreshBalance: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  userProfile: null,
  userBalance: null,
  refreshBalance: async () => {},
  refreshUserProfile: async () => {},
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

  // Refresh user profile
  const refreshUserProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Defer profile fetch to avoid blocking
        if (session?.user) {
          setTimeout(() => {
            fetchUserProfile(session.user.id);
            fetchUserBalance(session.user.id);
          }, 0);
        } else {
          setUserProfile(null);
          setUserBalance(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        setTimeout(() => {
          fetchUserProfile(session.user.id);
          fetchUserBalance(session.user.id);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, userProfile, userBalance, refreshBalance, refreshUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

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
      // 如果用户记录不存在，尝试创建用户记录
      // 这可能发生在触发器未正确创建用户记录的情况下
      const randomAvatarNum = 1 + Math.floor(Math.random() * 6);
      const defaultAvatar = `/avatars/avatar-${randomAvatarNum}.png`;
      
      // 先使用默认值，避免 UI 显示异常
      setUserProfile({
        display_name: 'User',
        avatar_url: defaultAvatar,
      });
      
      // 尝试创建用户记录
      try {
        const { data: newUserData, error: insertError } = await supabase
          .from('users')
          .insert({
            id: userId,
            display_name: 'User',
            avatar_url: defaultAvatar,
          })
          .select('display_name, avatar_url')
          .maybeSingle();
        
        if (!insertError && newUserData) {
          setUserProfile(newUserData);
        } else if (insertError) {
          console.warn('Failed to create user profile:', insertError);
          // 如果创建失败（可能是权限问题），保持使用默认值
        }
      } catch (createError) {
        console.warn('Error creating user profile:', createError);
        // 保持使用默认值
      }
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
        balance: 10000,
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

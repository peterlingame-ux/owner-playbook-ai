import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 简单的密码哈希函数（生产环境应使用更安全的方案如 bcrypt）
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(0, 16));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computedHash = await hashPassword(password);
  return computedHash === hash;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, userId, phone, password } = await req.json();
    console.log(`[auth-password] Action: ${action}, Phone: ${phone ? phone.slice(0, 4) + "****" : "N/A"}`);

    if (action === "set-password") {
      // 设置密码 - 需要 userId
      if (!userId || !password) {
        return new Response(
          JSON.stringify({ success: false, error: "缺少必要参数" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      if (password.length < 6) {
        return new Response(
          JSON.stringify({ success: false, error: "密码至少需要6位" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const passwordHash = await hashPassword(password);

      const { error } = await supabase
        .from("users")
        .update({ password_hash: passwordHash })
        .eq("id", userId);

      if (error) {
        console.error("[auth-password] Set password error:", error);
        return new Response(
          JSON.stringify({ success: false, error: "设置密码失败" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      console.log(`[auth-password] Password set successfully for user: ${userId}`);
      return new Response(
        JSON.stringify({ success: true, message: "密码设置成功" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "check-password") {
      // 检查用户是否已设置密码
      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, error: "缺少用户ID" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const { data, error } = await supabase
        .from("users")
        .select("password_hash")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("[auth-password] Check password error:", error);
        return new Response(
          JSON.stringify({ success: false, error: "查询失败" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      const hasPassword = !!data?.password_hash;
      console.log(`[auth-password] User ${userId} has password: ${hasPassword}`);

      return new Response(
        JSON.stringify({ success: true, hasPassword }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "login-with-password") {
      // 使用手机号和密码登录
      if (!phone || !password) {
        return new Response(
          JSON.stringify({ success: false, error: "请输入手机号和密码" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // 通过手机号查找 auth.users 中的用户
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error("[auth-password] List users error:", authError);
        return new Response(
          JSON.stringify({ success: false, error: "系统错误" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      const authUser = authUsers.users.find(u => u.phone === phone);
      
      if (!authUser) {
        console.log(`[auth-password] User not found for phone: ${phone.slice(0, 4)}****`);
        return new Response(
          JSON.stringify({ success: false, error: "用户不存在" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }

      // 获取用户的密码哈希
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("password_hash")
        .eq("id", authUser.id)
        .maybeSingle();

      if (userError || !userData) {
        console.error("[auth-password] Get user data error:", userError);
        return new Response(
          JSON.stringify({ success: false, error: "用户数据不存在" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }

      if (!userData.password_hash) {
        return new Response(
          JSON.stringify({ success: false, error: "请先使用短信验证码登录并设置密码", needSmsLogin: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }

      // 验证密码
      const isValid = await verifyPassword(password, userData.password_hash);
      
      if (!isValid) {
        console.log(`[auth-password] Invalid password for user: ${authUser.id}`);
        return new Response(
          JSON.stringify({ success: false, error: "密码错误" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }

      // 生成自定义 token 让用户登录
      // 使用 admin API 创建一个 magic link token
      const { data: signInData, error: signInError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: authUser.email || `${phone}@phone.local`,
        options: {
          redirectTo: Deno.env.get("SUPABASE_URL"),
        }
      });

      if (signInError) {
        console.error("[auth-password] Generate link error:", signInError);
        // 尝试另一种方式 - 直接返回用户信息让前端用 OTP 验证
        return new Response(
          JSON.stringify({ 
            success: true, 
            userId: authUser.id,
            phone: authUser.phone,
            useDirectLogin: true
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[auth-password] Login successful for user: ${authUser.id}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          userId: authUser.id,
          token: signInData.properties?.hashed_token,
          useDirectLogin: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "未知操作" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );

  } catch (error) {
    console.error("[auth-password] Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "服务器错误" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

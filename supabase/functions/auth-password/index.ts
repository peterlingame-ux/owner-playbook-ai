import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-timezone",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

    // 安全地解析请求体，处理空请求或无效 JSON
    let requestBody: { action?: string; userId?: string; phone?: string; password?: string } = {};
    try {
      const bodyText = await req.text();
      if (bodyText && bodyText.trim()) {
        requestBody = JSON.parse(bodyText);
      }
    } catch (parseError) {
      console.error("[auth-password] JSON parse error:", parseError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request body" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { action, userId, phone, password } = requestBody;
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

      // 去掉手机号开头的 + 号，统一比较数字部分
      const normalizedPhone = phone.startsWith('+') ? phone.slice(1) : phone;
      const authUser = authUsers.users.find(u => {
        const normalizedUserPhone = u.phone?.startsWith('+') ? u.phone.slice(1) : u.phone;
        return normalizedUserPhone === normalizedPhone;
      });
      
      if (!authUser) {
        console.log(`[auth-password] User not found for phone: ${phone.slice(0, 4)}****`);
        return new Response(
          JSON.stringify({ success: false, error: "用户不存在", errorCode: "USER_NOT_FOUND" }),
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
          JSON.stringify({ success: false, error: "用户数据不存在", errorCode: "USER_DATA_NOT_FOUND" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }

      if (!userData.password_hash) {
        return new Response(
          JSON.stringify({ success: false, error: "请先使用短信验证码登录并设置密码", errorCode: "NO_PASSWORD_SET", needSmsLogin: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }

      // 验证密码
      const isValid = await verifyPassword(password, userData.password_hash);
      
      if (!isValid) {
        console.log(`[auth-password] Invalid password for user: ${authUser.id}`);
        return new Response(
          JSON.stringify({ success: false, error: "密码错误", errorCode: "INVALID_PASSWORD" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }

      // 密码验证成功，生成 magic link 让用户直接登录（不需要 OTP）
      // 对于手机号登录，需要确保用户有 email 才能生成 magic link
      let signInData: any = null;
      let signInError: any = null;

      // 准备 email（如果用户没有 email，使用虚拟 email）
      const virtualEmail = `${normalizedPhone}@phone.local`;
      const userEmail = authUser.email || virtualEmail;

      // 如果用户没有 email，先尝试更新用户的 email
      if (!authUser.email) {
        try {
          const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
            email: virtualEmail,
          });
          if (updateError) {
            console.warn("[auth-password] Failed to update user email:", updateError);
            // 继续尝试，即使更新失败
          }
        } catch (err) {
          console.warn("[auth-password] Exception updating user email:", err);
          // 继续尝试，即使更新失败
        }
      }

      // 尝试生成 magic link
      // 获取前端 URL（从请求头或环境变量）
      const frontendUrl = req.headers.get("origin") || 
                         req.headers.get("referer")?.split("/").slice(0, 3).join("/") ||
                         "http://localhost:3000";
      
      try {
        const result = await supabase.auth.admin.generateLink({
          type: "magiclink",
          email: userEmail,
          options: {
            redirectTo: `${frontendUrl}/`,
          }
        });
        signInData = result.data;
        signInError = result.error;
      } catch (err) {
        console.error("[auth-password] Generate link exception:", err);
        signInError = err;
      }

      if (signInError || !signInData) {
        console.error("[auth-password] Generate link error:", signInError);
        // 如果生成 magic link 失败，返回用户信息，让前端使用 OTP 方式
        return new Response(
          JSON.stringify({ 
            success: true, 
            userId: authUser.id,
            phone: authUser.phone,
            useDirectLogin: true, // 标记为需要 OTP 验证
            fallbackToOtp: true // 标记为回退到 OTP
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[auth-password] Login successful for user: ${authUser.id}`);
      // 返回 magic link 信息，前端可以直接使用完成登录
      const actionLink = (signInData as any)?.properties?.action_link;
      const hashedToken = (signInData as any)?.properties?.hashed_token;
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          userId: authUser.id,
          phone: authUser.phone,
          magicLink: actionLink,
          hashedToken: hashedToken,
          directLogin: true // 标记为直接登录，不需要 OTP
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

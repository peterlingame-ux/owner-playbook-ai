import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-timezone",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

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
    let requestBody: { phone?: string; userId?: string; action?: string } = {};
    try {
      const bodyText = await req.text();
      if (bodyText && bodyText.trim()) {
        requestBody = JSON.parse(bodyText);
      }
    } catch (parseError) {
      console.error("[check-user-exists] JSON parse error:", parseError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request body" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { phone, userId, action } = requestBody;
    
    // 验证 action 参数
    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: "缺少操作类型 (action)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // 检查用户是否存在
    if (action === "check") {
      if (!phone) {
        return new Response(
          JSON.stringify({ success: false, error: "缺少手机号" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // 通过手机号查找 auth.users 中的用户
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error("[check-user-exists] List users error:", authError);
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
      const exists = !!authUser;

      console.log(`[check-user-exists] Phone: ${phone.slice(0, 4)}****, Exists: ${exists}`);

      return new Response(
        JSON.stringify({ success: true, exists }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 删除新创建的用户（仅在登录模式下）
    if (action === "delete-new-user") {
      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, error: "缺少用户ID" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      
      if (userError || !userData) {
        return new Response(
          JSON.stringify({ success: false, error: "用户不存在" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }

      // 检查用户是否为新创建（1分钟内）
      const userCreatedAt = new Date(userData.user.created_at);
      const now = new Date();
      const timeDiff = now.getTime() - userCreatedAt.getTime();
      const isNewlyCreated = timeDiff < 60000; // 1分钟内

      if (!isNewlyCreated) {
        return new Response(
          JSON.stringify({ success: false, error: "用户不是新创建的" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // 删除用户
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
      
      if (deleteError) {
        console.error("[check-user-exists] Delete user error:", deleteError);
        return new Response(
          JSON.stringify({ success: false, error: "删除用户失败" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      console.log(`[check-user-exists] Deleted newly created user: ${userId}`);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "未知操作" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );

  } catch (error) {
    console.error("[check-user-exists] Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "服务器错误" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

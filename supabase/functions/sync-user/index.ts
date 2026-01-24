import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-timezone",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}

const payloadSchema = z.object({
  phoneNumber: z.string().min(6).max(20).optional(),
  email: z
    .string()
    .trim()
    .transform((value) => (value === "" ? undefined : value))
    .optional()
    .pipe(z.string().email().optional()),
  displayName: z.string().min(1).max(120).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
  invitationCode: z.string().min(6).max(20).optional(), // 邀请码
});

type UserRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const accessToken = authHeader.replace("Bearer ", "").trim();
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Invalid access token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const requestJson = await req.json().catch(() => ({}));
    const validatedPayload = payloadSchema.safeParse(requestJson);
    if (!validatedPayload.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid payload",
          details: validatedPayload.error.flatten(),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: authData, error: authError } = await supabaseClient.auth
      .getUser(accessToken);
    if (authError || !authData?.user) {
      console.error("Failed to fetch user from token", authError);
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { user } = authData;
    const now = new Date().toISOString();
    const userMetadata = (user.user_metadata ?? {}) as Record<string, unknown>;

    // 检查用户是否已存在
    const { data: existingUser } = await supabaseClient
      .from("users")
      .select("id, invited_by, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    const isNewUser = !existingUser;
    const invitationCode = validatedPayload.data.invitationCode?.toUpperCase().trim();

    console.log(`[sync-user] User: ${user.id}, isNew: ${isNewUser}, invitationCode: ${invitationCode || 'none'}`);

    // 处理邀请码逻辑
    let invitedBy: string | null = null;
    let inviterUserId: string | null = null;

    if (isNewUser && invitationCode) {
      // 查找邀请人
      const { data: inviter, error: inviterError } = await supabaseClient
        .from("users")
        .select("id, invitation_code, invited_count")
        .eq("invitation_code", invitationCode)
        .maybeSingle();

      if (inviterError) {
        console.error("[sync-user] Error finding inviter:", inviterError);
      }

      if (inviter && inviter.id !== user.id) {
        invitedBy = invitationCode;
        inviterUserId = inviter.id;
        console.log(`[sync-user] Valid invitation code from user: ${inviter.id}`);
      } else {
        console.log(`[sync-user] Invalid invitation code: ${invitationCode}`);
      }
    }

    // 确保 display_name 和 avatar_url 不为 null（它们是 NOT NULL 字段）
    const displayName = validatedPayload.data.displayName ??
      (typeof userMetadata.full_name === "string" ? userMetadata.full_name : null) ??
      existingUser?.display_name ??
      "User";
    
    const avatarUrl = validatedPayload.data.avatarUrl ??
      (typeof userMetadata.avatar_url === "string" ? userMetadata.avatar_url : null) ??
      existingUser?.avatar_url ??
      '/avatars/avatar-1.png';

    const upsertPayload: UserRow & { invited_by?: string | null } = {
      id: user.id,
      display_name: displayName,
      avatar_url: avatarUrl,
      created_at: user.created_at ?? now,
      updated_at: now,
    };

    // 只有新用户才设置 invited_by
    if (isNewUser && invitedBy) {
      upsertPayload.invited_by = invitedBy;
    }

    const { error: upsertError } = await supabaseClient.from("users").upsert(
      upsertPayload,
      { onConflict: "id" },
    );

    if (upsertError) {
      console.error("Failed to upsert users row", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to sync user profile" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 如果是通过邀请码注册的新用户，奖励 100 USDT
    if (isNewUser && invitedBy && inviterUserId) {
      console.log(`[sync-user] Rewarding new user ${user.id} with 100 USDT for invitation`);
      
      // 给新用户的 USDT 钱包增加 100
      const { error: walletError } = await supabaseClient
        .from("usdt_wallets")
        .upsert({
          user_id: user.id,
          balance: 100,
        }, { onConflict: "user_id" });

      if (walletError) {
        console.error("[sync-user] Error updating new user wallet:", walletError);
      } else {
        console.log(`[sync-user] Added 100 USDT to new user ${user.id}`);
      }

      // 更新邀请人的邀请计数
      const { error: countError } = await supabaseClient
        .from("users")
        .update({ invited_count: (await supabaseClient.from("users").select("invited_count").eq("id", inviterUserId).single()).data?.invited_count + 1 || 1 })
        .eq("id", inviterUserId);

      if (countError) {
        console.error("[sync-user] Error updating inviter count:", countError);
      } else {
        console.log(`[sync-user] Updated invite count for inviter ${inviterUserId}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        isNewUser,
        invitedBy: invitedBy || null,
        bonusReceived: isNewUser && invitedBy ? 100 : 0
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Unexpected error in sync-user function", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

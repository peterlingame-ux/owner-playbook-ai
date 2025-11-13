import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
});

type UserRow = {
  id: string;
  phone_number: string | null;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  last_sign_in_at: string | null;
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

    const upsertPayload: UserRow = {
      id: user.id,
      phone_number: validatedPayload.data.phoneNumber ?? user.phone ?? null,
      email: validatedPayload.data.email ?? user.email ?? null,
      display_name: validatedPayload.data.displayName ??
        (typeof userMetadata.full_name === "string"
          ? userMetadata.full_name
          : null),
      avatar_url: validatedPayload.data.avatarUrl ??
        (typeof userMetadata.avatar_url === "string"
          ? userMetadata.avatar_url
          : null),
      metadata: validatedPayload.data.metadata ??
        (Object.keys(userMetadata).length > 0 ? userMetadata : null),
      created_at: user.created_at ?? now,
      last_sign_in_at: now,
    };

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

    return new Response(
      JSON.stringify({ success: true }),
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



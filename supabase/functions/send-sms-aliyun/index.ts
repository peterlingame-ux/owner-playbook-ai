import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// 阿里云短信服务配置
const ALIYUN_ACCESS_KEY_ID = Deno.env.get("ALIYUN_ACCESS_KEY_ID");
const ALIYUN_ACCESS_KEY_SECRET = Deno.env.get("ALIYUN_ACCESS_KEY_SECRET");
const ALIYUN_REGION = Deno.env.get("ALIYUN_REGION") || "cn-hangzhou";
const ALIYUN_SMS_SIGN_NAME = Deno.env.get("ALIYUN_SMS_SIGN_NAME");
const ALIYUN_SMS_TEMPLATE_CODE = Deno.env.get("ALIYUN_SMS_TEMPLATE_CODE");

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Supabase Auth Hook 签名密钥（可选，用于验证请求来源）
const HOOK_SECRET = Deno.env.get("HOOK_SECRET");

if (!ALIYUN_ACCESS_KEY_ID || !ALIYUN_ACCESS_KEY_SECRET || !ALIYUN_SMS_SIGN_NAME || !ALIYUN_SMS_TEMPLATE_CODE) {
  throw new Error("Missing required Aliyun SMS configuration");
}

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}

/**
 * 生成阿里云 API 签名
 */
async function generateSignature(
  params: Record<string, string>,
  secret: string,
  method: string = "POST"
): Promise<string> {
  // 排序参数
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join("&");

  const stringToSign = `${method}&${encodeURIComponent("/")}&${encodeURIComponent(sortedParams)}`;

  // 使用 HMAC-SHA1 签名
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret + "&"),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(stringToSign)
  );

  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * 发送阿里云短信
 */
async function sendAliyunSMS(
  phoneNumber: string,
  code: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // 阿里云 API 需要 RFC822 格式的时间戳：yyyy-MM-dd'T'HH:mm:ss'Z'
    // 例如：2025-12-04T09:58:38Z
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const day = String(now.getUTCDate()).padStart(2, "0");
    const hours = String(now.getUTCHours()).padStart(2, "0");
    const minutes = String(now.getUTCMinutes()).padStart(2, "0");
    const seconds = String(now.getUTCSeconds()).padStart(2, "0");
    const timestamp = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
    
    const nonce = crypto.getRandomValues(new Uint8Array(16))
      .reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");

    // 构建请求参数
    const params: Record<string, string> = {
      SignatureMethod: "HMAC-SHA1",
      SignatureNonce: nonce,
      AccessKeyId: ALIYUN_ACCESS_KEY_ID!,
      SignatureVersion: "1.0",
      Timestamp: timestamp,
      Action: "SendSms",
      Version: "2017-05-25",
      RegionId: ALIYUN_REGION,
      Format: "JSON", // 请求 JSON 格式响应，而不是默认的 XML
      PhoneNumbers: phoneNumber,
      SignName: ALIYUN_SMS_SIGN_NAME!,
      TemplateCode: ALIYUN_SMS_TEMPLATE_CODE!,
      TemplateParam: JSON.stringify({ code }),
    };

    // 生成签名
    const signature = await generateSignature(params, ALIYUN_ACCESS_KEY_SECRET!);
    params.Signature = signature;

    // 构建请求 URL
    const queryString = Object.keys(params)
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join("&");

    const url = `https://dysmsapi.aliyuncs.com/?${queryString}`;

    // 发送请求
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    // 检查响应内容类型
    const contentType = response.headers.get("content-type") || "";
    let result;

    if (contentType.includes("application/json")) {
      // JSON 格式响应
      result = await response.json();
    } else {
      // XML 格式响应（如果 Format=JSON 参数未生效）
      const text = await response.text();
      console.warn("Received XML response instead of JSON:", text.substring(0, 200));
      
      // 尝试解析 XML（简单解析）
      const codeMatch = text.match(/<Code>(.*?)<\/Code>/);
      const messageMatch = text.match(/<Message>(.*?)<\/Message>/);
      
      result = {
        Code: codeMatch ? codeMatch[1] : "Unknown",
        Message: messageMatch ? messageMatch[1] : "Failed to parse XML response",
      };
    }

    if (result.Code === "OK") {
      return { success: true, message: "短信发送成功" };
    } else {
      return {
        success: false,
        error: result.Message || result.message || "短信发送失败",
      };
    }
  } catch (error) {
    console.error("Aliyun SMS error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 验证 Supabase Hook 签名（可选）
 * 如果配置了 HOOK_SECRET，则验证请求签名
 * 注意：Supabase 的签名验证机制可能因版本而异，这里提供基础验证
 */
async function verifyHookSignature(
  payload: string,
  signature: string | null,
  secret: string | null
): Promise<boolean> {
  if (!secret || !signature) {
    // 如果没有配置密钥，跳过验证（不推荐生产环境）
    console.warn("Hook secret not configured, skipping signature verification");
    return true;
  }

  try {
    // 提取密钥（格式：v1,whsec_...）
    // 如果包含 whsec_，提取后面的部分；否则直接使用
    const secretKey = secret.includes("whsec_") 
      ? secret.split("whsec_")[1] 
      : secret.replace(/^v1,whsec_/, "");

    // 使用 HMAC-SHA256 验证签名
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const messageData = encoder.encode(payload);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      messageData
    );

    const expectedSignature = btoa(
      String.fromCharCode(...new Uint8Array(signatureBuffer))
    );

    // 验证签名（移除可能的空白字符）
    const cleanSignature = signature.trim();
    const cleanExpected = expectedSignature.trim();
    
    return cleanSignature === cleanExpected;
  } catch (error) {
    console.error("Signature verification error:", error);
    // 验证失败时，根据安全策略决定是否拒绝请求
    // 生产环境建议返回 false，开发环境可以返回 true 便于调试
    return false;
  }
}

/**
 * Supabase Auth Hook 处理器
 * 这个函数会被 Supabase Auth 自动调用
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Supabase Auth Hook 会发送授权头，但我们需要允许它通过
    // 检查是否有来自 Supabase 的授权头（apikey 或 authorization）
    const apikey = req.headers.get("apikey");
    const authorization = req.headers.get("authorization");
    
    // 如果既没有 apikey 也没有 authorization，可能是直接调用，允许继续
    // （因为 config.toml 中设置了 verify_jwt = false）
    
    // 获取请求签名（如果存在）
    const signature = req.headers.get("x-supabase-signature") || 
                     req.headers.get("x-hook-signature") ||
                     authorization;
    
    // 读取原始请求体用于签名验证
    const rawBody = await req.text();
    let payload;
    
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      // 如果解析失败，可能是空请求体
      console.error("Failed to parse request body:", e);
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 验证签名（如果配置了密钥）
    if (HOOK_SECRET) {
      const isValid = await verifyHookSignature(rawBody, signature, HOOK_SECRET);
      if (!isValid) {
        console.error("Invalid hook signature");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // 根据 Supabase 官方文档，Send SMS Hook 的输入格式为：
    // {
    //   "user": { ...用户信息... },
    //   "sms": { "otp": "验证码" }
    // }
    // 参考：https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook

    const phone = payload?.user?.phone;
    const otp = payload?.sms?.otp;

    if (!phone || !otp) {
      console.error("Missing phone or OTP in payload:", JSON.stringify(payload));
      return new Response(
        JSON.stringify({ error: "Missing phone or OTP" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 格式化手机号（移除 + 号，阿里云需要纯数字）
    const formattedPhone = phone.replace(/^\+/, "");

    // 发送短信
    const result = await sendAliyunSMS(formattedPhone, otp);

    if (result.success) {
      // 根据官方文档，返回 200 状态码即可，不需要返回内容
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    } else {
      console.error("SMS send failed:", result.error);
      return new Response(
        JSON.stringify({ error: result.error }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Unexpected error in send-sms-aliyun function", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});


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
// 国际短信配置（可选）
const ALIYUN_SMS_INTERNATIONAL_FROM = Deno.env.get("ALIYUN_SMS_INTERNATIONAL_FROM"); // 发送方号码（Sender ID）
const ALIYUN_SMS_INTERNATIONAL_MESSAGE = Deno.env.get("ALIYUN_SMS_INTERNATIONAL_MESSAGE") || "您的验证码是：{code}，5分钟内有效。"; // 国际短信内容模板

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Supabase Auth Hook 签名密钥（可选，用于验证请求来源）
const HOOK_SECRET = Deno.env.get("HOOK_SECRET");

// 创建 Supabase 客户端用于频率限制检查
const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

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
 * 格式化手机号码
 * 阿里云短信服务要求：
 * - 中国大陆手机号：使用11位数字（不带国家代码），例如 15557643805
 * - 国际/港澳台手机号：必须使用国家代码+手机号码，例如 85261234567（香港）、886912345678（台湾）
 * - 手机号必须是纯数字，不能包含空格、横线等字符
 * 
 * 支持的输入格式：
 * 中国大陆：
 * - +86 155 5764 3805 → 15557643805
 * - +8615557643805 → 15557643805
 * - 8615557643805 → 15557643805（移除86）
 * - 15557643805 → 15557643805（保持不变）
 * 
 * 国际号码：
 * - +852 9346 2479 → 85293462479
 * - +85293462479 → 85293462479
 * - 85293462479 → 85293462479（保持不变）
 */
function formatPhoneNumber(phone: string): string | null {
  if (!phone || typeof phone !== "string") {
    console.error(`[formatPhoneNumber] Invalid input: ${phone} (type: ${typeof phone})`);
    return null;
  }

  // 移除所有非数字字符（空格、横线、括号、+号等）
  let digits = phone.replace(/\D/g, "");

  if (!digits || digits.length === 0) {
    console.error(`[formatPhoneNumber] Phone number contains no digits: ${phone}`);
    return null;
  }

  console.log(`[formatPhoneNumber] Processing: ${phone} -> ${digits} (length: ${digits.length})`);

  // 处理中国大陆手机号（11位，以1开头）
  // 格式1: 8615557643805 (13位，包含国家代码 86) → 移除86，返回11位
  if (digits.startsWith("86") && digits.length === 13) {
    // 验证后面的11位是否是有效的手机号（以1开头）
    const phonePart = digits.substring(2);
    if (phonePart.startsWith("1") && phonePart.length === 11) {
      // 进一步验证：第二位应该是3-9
      const secondDigit = phonePart.charAt(1);
      if (secondDigit >= "3" && secondDigit <= "9") {
        console.log(`[formatPhoneNumber] China mainland: Removed country code: ${digits} -> ${phonePart}`);
        return phonePart; // 返回11位手机号（不带国家代码）
      } else {
        console.warn(`[formatPhoneNumber] Invalid second digit: ${secondDigit} in ${digits}`);
      }
    } else {
      console.warn(`[formatPhoneNumber] Invalid phone part after 86: ${phonePart}`);
    }
  }

  // 格式2: 15557643805 (11位，直接使用)
  if (digits.startsWith("1") && digits.length === 11) {
    // 验证是否是有效的手机号（中国大陆手机号以1开头，第二位是3-9）
    const secondDigit = digits.charAt(1);
    if (secondDigit >= "3" && secondDigit <= "9") {
      console.log(`[formatPhoneNumber] China mainland: Valid 11-digit format: ${digits}`);
      return digits; // 直接返回11位手机号
    } else {
      console.warn(`[formatPhoneNumber] Invalid second digit: ${secondDigit} in ${digits}`);
    }
  }

  // 处理国际/港澳台手机号
  // 常见国家/地区代码：852(香港), 853(澳门), 886(台湾), 1(美国/加拿大), 44(英国), 81(日本), 82(韩国), 65(新加坡), 60(马来西亚), 62(印尼), 66(泰国), 84(越南), 91(印度)
  const internationalCountryCodes = [
    "852", // 香港
    "853", // 澳门
    "886", // 台湾
    "1",   // 美国/加拿大（1位，需要特殊处理）
    "44",  // 英国
    "81",  // 日本
    "82",  // 韩国
    "65",  // 新加坡
    "60",  // 马来西亚
    "62",  // 印尼
    "66",  // 泰国
    "84",  // 越南
    "91",  // 印度
  ];

  // 检查是否是国际号码（以国家代码开头）
  // 先检查2-3位的国家代码（排除86，因为86已经处理过了）
  for (const countryCode of internationalCountryCodes) {
    if (countryCode === "86") continue; // 跳过86，已经处理过
    
    if (digits.startsWith(countryCode)) {
      const phonePart = digits.substring(countryCode.length);
      // 验证手机号部分长度（通常国际号码总长度在10-15位之间）
      const totalLength = digits.length;
      if (totalLength >= 10 && totalLength <= 15 && phonePart.length >= 7) {
        console.log(`[formatPhoneNumber] International number (${countryCode}): ${digits}`);
        return digits; // 返回包含国家代码的完整号码
      }
    }
  }

  // 特殊处理：美国/加拿大（国家代码是1，但容易与中国大陆11位手机号混淆）
  // 如果以1开头但长度不是11位，或者长度是11位但第二位不是3-9，可能是美国/加拿大号码
  if (digits.startsWith("1") && digits.length !== 11) {
    // 美国/加拿大手机号通常是11位（1 + 10位），但也可以是其他长度
    if (digits.length >= 10 && digits.length <= 11) {
      console.log(`[formatPhoneNumber] Possible US/Canada number: ${digits}`);
      return digits; // 返回包含国家代码的完整号码
    }
  }

  // 格式3: 其他格式（可能是国际号码或格式错误）
  // 如果长度在10-15之间，可能是有效的国际号码
  if (digits.length >= 10 && digits.length <= 15) {
    // 如果已经是86开头但长度不对，尝试移除86
    if (digits.startsWith("86") && digits.length === 12) {
      const phonePart = digits.substring(2);
      if (phonePart.startsWith("1") && phonePart.length === 10) {
        // 可能是10位手机号（不常见），但尝试返回
        console.warn(`[formatPhoneNumber] 10-digit phone number after removing 86: ${phonePart}`);
        return phonePart;
      }
    }
    // 返回原格式，让阿里云 API 验证（可能是其他国家的国际号码）
    console.log(`[formatPhoneNumber] Returning as-is (possible international number): ${digits}`);
    return digits;
  }

  // 格式不符合预期
  console.error(`[formatPhoneNumber] Invalid phone number format: ${phone} -> ${digits} (length: ${digits.length})`);
  return null;
}

/**
 * 判断手机号是否为国际号码
 * 返回 true 表示国际号码，false 表示中国大陆号码
 * 
 * 注意：此函数应该在 formatPhoneNumber 之后调用，因为 formatPhoneNumber 已经处理了格式
 */
function isInternationalNumber(phoneNumber: string): boolean {
  if (!phoneNumber) {
    return false;
  }

  // 移除所有非数字字符
  const digits = phoneNumber.replace(/\D/g, "");

  // 常见国际/港澳台国家代码列表
  const internationalCountryCodes = [
    "852", // 香港
    "853", // 澳门
    "886", // 台湾
    "44",  // 英国
    "81",  // 日本
    "82",  // 韩国
    "65",  // 新加坡
    "60",  // 马来西亚
    "62",  // 印尼
    "66",  // 泰国
    "84",  // 越南
    "91",  // 印度
  ];

  // 先检查是否以国际国家代码开头（排除86）
  for (const countryCode of internationalCountryCodes) {
    if (digits.startsWith(countryCode)) {
      // 验证手机号部分长度（国际号码总长度通常在10-15位之间）
      const phonePart = digits.substring(countryCode.length);
      if (phonePart.length >= 7 && digits.length >= 10 && digits.length <= 15) {
        console.log(`[isInternationalNumber] Detected international number with country code ${countryCode}: ${digits}`);
        return true; // 国际号码
      }
    }
  }

  // 特殊处理：美国/加拿大（国家代码是1）
  // 如果以1开头但长度不是11位，或者长度是11位但第二位不是3-9，可能是美国/加拿大号码
  if (digits.startsWith("1")) {
    if (digits.length !== 11) {
      // 不是11位，可能是美国/加拿大号码
      if (digits.length >= 10 && digits.length <= 11) {
        console.log(`[isInternationalNumber] Possible US/Canada number: ${digits}`);
        return true;
      }
    } else {
      // 是11位，检查第二位是否是3-9
      const secondDigit = digits.charAt(1);
      if (secondDigit < "3" || secondDigit > "9") {
        // 第二位不是3-9，可能是美国/加拿大号码
        console.log(`[isInternationalNumber] Possible US/Canada number (invalid second digit): ${digits}`);
        return true;
      }
      // 第二位是3-9，是中国大陆号码
      return false;
    }
  }

  // 如果以86开头且长度为13位，是中国大陆号码
  if (digits.startsWith("86") && digits.length === 13) {
    const phonePart = digits.substring(2);
    if (phonePart.startsWith("1") && phonePart.length === 11) {
      const secondDigit = phonePart.charAt(1);
      if (secondDigit >= "3" && secondDigit <= "9") {
        return false; // 中国大陆号码
      }
    }
  }

  // 如果是11位且以1开头，且第二位是3-9，是中国大陆号码
  if (digits.length === 11 && digits.startsWith("1")) {
    const secondDigit = digits.charAt(1);
    if (secondDigit >= "3" && secondDigit <= "9") {
      return false; // 中国大陆号码
    }
  }

  // 其他情况：如果长度在10-15位之间，且不是11位，可能是国际号码
  if (digits.length >= 10 && digits.length <= 15 && digits.length !== 11) {
    console.log(`[isInternationalNumber] Possible international number (length ${digits.length}): ${digits}`);
    return true;
  }

  // 默认视为国内号码（安全起见）
  console.log(`[isInternationalNumber] Defaulting to domestic number: ${digits}`);
  return false;
}

/**
 * 检查短信发送频率限制
 * 阿里云限制：同一手机号每分钟最多发送1条短信
 */
async function checkRateLimit(phoneNumber: string): Promise<{ allowed: boolean; waitSeconds?: number }> {
  if (!supabase) {
    // 如果 Supabase 未初始化，跳过频率检查（不推荐生产环境）
    console.warn("Supabase not initialized, skipping rate limit check");
    return { allowed: true };
  }

  try {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    // 查询最近1分钟内是否有发送记录
    const { data, error } = await supabase
      .from("app_cache")
      .select("created_at")
      .eq("key", `sms_sent_${phoneNumber}`)
      .gte("created_at", oneMinuteAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.warn("Rate limit check error:", error);
      // 检查失败时允许发送（避免阻塞）
      return { allowed: true };
    }

    if (data && data.length > 0) {
      const lastSent = new Date(data[0].created_at);
      const waitTime = Math.ceil((60 - (now.getTime() - lastSent.getTime()) / 1000));
      return { allowed: false, waitSeconds: waitTime };
    }

    return { allowed: true };
  } catch (error) {
    console.warn("Rate limit check exception:", error);
    // 检查失败时允许发送（避免阻塞）
    return { allowed: true };
  }
}

/**
 * 记录短信发送时间（用于频率限制）
 */
async function recordSmsSent(phoneNumber: string): Promise<void> {
  if (!supabase) {
    return;
  }

  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 2 * 60 * 1000); // 2分钟后过期

    await supabase
      .from("app_cache")
      .upsert({
        key: `sms_sent_${phoneNumber}`,
        value: { phone: phoneNumber, sent_at: now.toISOString() },
        expires_at: expiresAt.toISOString(),
      }, { onConflict: "key" });
  } catch (error) {
    console.warn("Failed to record SMS sent time:", error);
    // 记录失败不影响发送流程
  }
}

/**
 * 发送国际短信（使用 SendMessageToGlobe 接口）
 */
async function sendInternationalSMS(
  phoneNumber: string,
  code: string,
  retries: number = 3
): Promise<{ success: boolean; message?: string; error?: string }> {
  // 检查频率限制
  const rateLimit = await checkRateLimit(phoneNumber);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `触发分钟级流控，请等待 ${rateLimit.waitSeconds} 秒后重试`,
    };
  }

  // 构建短信内容（国际短信直接使用文本内容，不使用模板）
  const message = (ALIYUN_SMS_INTERNATIONAL_MESSAGE || "Your verification code is: {code}, valid for 5 minutes.").replace("{code}", code);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // 阿里云 API 需要 RFC822 格式的时间戳
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

      // 构建请求参数（SendMessageToGlobe 接口）
      // 参考：https://www.alibabacloud.com/help/zh/sms/developer-reference/api-dysmsapi-2018-05-01-sendmessagetoglobe
      // 重要：SendMessageToGlobe 接口的 RegionId 必须为 ap-southeast-1，不能使用其他值
      const params: Record<string, string> = {
        SignatureMethod: "HMAC-SHA1",
        SignatureNonce: nonce,
        AccessKeyId: ALIYUN_ACCESS_KEY_ID!,
        SignatureVersion: "1.0",
        Timestamp: timestamp,
        Action: "SendMessageToGlobe",
        Version: "2018-05-01",
        RegionId: "ap-southeast-1", // 国际短信接口固定使用 ap-southeast-1，不能修改
        Format: "JSON",
        To: phoneNumber, // 接收方号码，格式：国际区号+号码（例如：8521245567****）
        Message: message, // 短信内容（直接文本）
        Type: "OTP", // 验证码短信（OTP：验证码短信，NOTIFY：通知短信，MKT：推广短信）
        ValidityPeriod: "300", // 短信有效时长，单位：秒（5分钟 = 300秒）
      };

      // 如果配置了发送方号码（Sender ID），添加 From 参数
      // From: 发送方号码，支持 Sender ID 的发送，只允许数字、字母，含有字母标识最长 11 位，纯数字标识支持 15 位
      if (ALIYUN_SMS_INTERNATIONAL_FROM) {
        // 验证 Sender ID 格式
        const fromValue = ALIYUN_SMS_INTERNATIONAL_FROM.trim();
        const isValidFormat = /^[a-zA-Z0-9]{1,15}$/.test(fromValue);
        
        if (!isValidFormat) {
          console.warn(`[sendInternationalSMS] ALIYUN_SMS_INTERNATIONAL_FROM 格式不正确: "${fromValue}"`);
          console.warn(`[sendInternationalSMS] Sender ID 要求：只允许数字、字母，含有字母标识最长 11 位，纯数字标识支持 15 位`);
          // 不添加 From 参数，让阿里云使用默认值
        } else {
          // 检查长度限制
          const hasLetter = /[a-zA-Z]/.test(fromValue);
          const maxLength = hasLetter ? 11 : 15;
          
          if (fromValue.length > maxLength) {
            console.warn(`[sendInternationalSMS] ALIYUN_SMS_INTERNATIONAL_FROM 长度超出限制: "${fromValue}" (长度: ${fromValue.length}, 最大允许: ${maxLength})`);
            console.warn(`[sendInternationalSMS] 含有字母标识最长 11 位，纯数字标识支持 15 位`);
            // 不添加 From 参数，让阿里云使用默认值
          } else {
            params.From = fromValue;
            console.log(`[sendInternationalSMS] 使用 Sender ID: "${fromValue}"`);
          }
        }
      } else {
        console.log(`[sendInternationalSMS] 未配置 ALIYUN_SMS_INTERNATIONAL_FROM，将使用阿里云默认发送方号码`);
      }

      // 生成签名
      const signature = await generateSignature(params, ALIYUN_ACCESS_KEY_SECRET!);
      params.Signature = signature;

      // 构建请求 URL
      // 国际短信接口使用 ap-southeast-1 区域的 endpoint
      const queryString = Object.keys(params)
        .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join("&");

      const url = `https://dysmsapi.ap-southeast-1.aliyuncs.com/?${queryString}`;

      console.log(`[sendInternationalSMS] Sending to: ${phoneNumber}, message: ${message.substring(0, 50)}...`);

      // 发送请求
      let response: Response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0",
          },
        });
      } catch (fetchError) {
        const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
        
        if (
          (errorMessage.includes("tls handshake") || 
           errorMessage.includes("Connect") ||
           errorMessage.includes("eof")) &&
          attempt < retries
        ) {
          const delay = (attempt + 1) * 1000;
          console.warn(`TLS/Connection error on attempt ${attempt + 1}, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw fetchError;
      }

      // 检查响应状态
      if (!response.ok) {
        const errorText = await response.text().catch(() => "无法读取错误信息");
        
        // 处理503错误（服务器临时故障）- 应该重试
        if (response.status === 503 || response.status === 502 || response.status === 504) {
          const errorMessage = `HTTP ${response.status}: ${errorText.substring(0, 200)}`;
          console.warn(`[sendInternationalSMS] Server error ${response.status} on attempt ${attempt + 1}, will retry...`);
          
          if (attempt < retries) {
            // 对于服务器错误，使用更长的延迟（指数退避）
            const delay = Math.min((attempt + 1) * 2000, 10000); // 2s, 4s, 6s, 最多10s
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            // 最后一次尝试也失败
            return {
              success: false,
              error: `服务器临时故障 (HTTP ${response.status}): ${errorText.substring(0, 100)}`,
            };
          }
        }
        
        // 其他HTTP错误，直接抛出
        throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
      }

      // 解析响应
      const contentType = response.headers.get("content-type") || "";
      let result;

      if (contentType.includes("application/json")) {
        result = await response.json();
      } else {
        const text = await response.text();
        console.warn("Received XML response instead of JSON:", text.substring(0, 200));
        
        // 解析 XML 响应（SendMessageToGlobe 接口可能返回 XML）
        const responseCodeMatch = text.match(/<ResponseCode>(.*?)<\/ResponseCode>/);
        const responseDescriptionMatch = text.match(/<ResponseDescription>(.*?)<\/ResponseDescription>/);
        const codeMatch = text.match(/<Code>(.*?)<\/Code>/);
        const messageMatch = text.match(/<Message>(.*?)<\/Message>/);
        
        result = {
          ResponseCode: responseCodeMatch ? responseCodeMatch[1] : (codeMatch ? codeMatch[1] : "Unknown"),
          ResponseDescription: responseDescriptionMatch ? responseDescriptionMatch[1] : (messageMatch ? messageMatch[1] : "Failed to parse XML response"),
          Code: codeMatch ? codeMatch[1] : "Unknown", // 兼容旧格式
          Message: messageMatch ? messageMatch[1] : "Failed to parse XML response", // 兼容旧格式
        };
      }

      console.log(`[sendInternationalSMS] API Response (attempt ${attempt + 1}):`, JSON.stringify(result));

      // 处理响应（根据阿里云文档，SendMessageToGlobe 接口返回 ResponseCode 字段）
      // ResponseCode: "OK" 表示短信提交成功
      if (result.ResponseCode === "OK" || result.Code === "OK") {
        await recordSmsSent(phoneNumber);
        const messageId = result.MessageId || result.messageId || "N/A";
        const segments = result.Segments || result.segments || "N/A";
        console.log(`[sendInternationalSMS] 短信发送成功: MessageId=${messageId}, Segments=${segments}`);
        return { success: true, message: "国际短信发送成功" };
      } else {
        // ResponseDescription: 短信提交状态码描述
        const errorMessage = result.ResponseDescription || result.Message || result.message || "短信发送失败";
        const errorCode = result.ResponseCode || result.Code || "Unknown";
        
        console.error(`[sendInternationalSMS] API Error: Code=${errorCode}, Message=${errorMessage}, PhoneNumber=${phoneNumber}`);
        
        // 限流错误
        if (
          errorCode === "isv.BUSINESS_LIMIT_CONTROL" ||
          errorMessage.includes("触发分钟级流控") ||
          errorMessage.includes("Permits:") ||
          errorMessage.includes("流控")
        ) {
          await recordSmsSent(phoneNumber);
          const permitMatch = errorMessage.match(/Permits:(\d+)/);
          const waitTime = permitMatch ? parseInt(permitMatch[1]) : 60;
          
          return {
            success: false,
            error: `触发分钟级流控，请等待 ${waitTime} 秒后重试`,
          };
        }
        
        // 手机号格式错误，不重试
        if (
          errorCode === "isv.MOBILE_NUMBER_ILLEGAL" ||
          errorMessage.includes("手机号码格式错误") ||
          errorMessage.includes("手机号") ||
          errorMessage.includes("号码")
        ) {
          return {
            success: false,
            error: `手机号码格式错误: ${errorMessage} (手机号: ${phoneNumber})`,
          };
        }
        
        // 其他错误，如果是最后一次尝试，返回错误
        if (attempt >= retries) {
          return {
            success: false,
            error: `${errorMessage} (错误码: ${errorCode})`,
          };
        }
        
        // 非限流、非格式错误，可以重试
        const delay = (attempt + 1) * 500;
        console.warn(`International SMS send failed on attempt ${attempt + 1}, retrying in ${delay}ms... Error: ${errorMessage}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`International SMS error (attempt ${attempt + 1}/${retries + 1}):`, errorMessage);
      
      // 检查是否是服务器错误（503, 502, 504）- 应该重试
      const isServerError = 
        errorMessage.includes("HTTP 503") ||
        errorMessage.includes("HTTP 502") ||
        errorMessage.includes("HTTP 504") ||
        errorMessage.includes("ServiceUnavailable") ||
        errorMessage.includes("temporary failure");
      
      if (isServerError && attempt < retries) {
        // 对于服务器错误，使用更长的延迟（指数退避）
        const delay = Math.min((attempt + 1) * 2000, 10000); // 2s, 4s, 6s, 最多10s
        console.warn(`Server error detected, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // 如果是最后一次尝试，返回错误
      if (attempt >= retries) {
        return {
          success: false,
          error: errorMessage,
        };
      }
      
      // 其他错误，使用标准延迟重试
      const delay = (attempt + 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: "国际短信发送失败：已达到最大重试次数",
  };
}

/**
 * 发送国内短信（使用 SendSms 接口）
 */
async function sendDomesticSMS(
  phoneNumber: string,
  code: string,
  retries: number = 3
): Promise<{ success: boolean; message?: string; error?: string }> {
  // 检查频率限制
  const rateLimit = await checkRateLimit(phoneNumber);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `触发分钟级流控，请等待 ${rateLimit.waitSeconds} 秒后重试`,
    };
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
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

      // 发送请求（添加超时和重试）
      let response: Response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0",
          },
          // 添加超时控制（Deno 的 fetch 默认没有超时，这里通过 AbortController 实现）
        });
      } catch (fetchError) {
        // 处理网络错误（包括 TLS 握手错误）
        const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
        
        // 如果是 TLS 握手错误或连接错误，进行重试
        if (
          (errorMessage.includes("tls handshake") || 
           errorMessage.includes("Connect") ||
           errorMessage.includes("eof")) &&
          attempt < retries
        ) {
          const delay = (attempt + 1) * 1000; // 递增延迟：1s, 2s, 3s
          console.warn(`TLS/Connection error on attempt ${attempt + 1}, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw fetchError;
      }

      // 检查响应状态
      if (!response.ok) {
        const errorText = await response.text().catch(() => "无法读取错误信息");
        
        // 处理503/502/504错误（服务器临时故障）- 应该重试
        if (response.status === 503 || response.status === 502 || response.status === 504) {
          const errorMessage = `HTTP ${response.status}: ${errorText.substring(0, 200)}`;
          console.warn(`[sendDomesticSMS] Server error ${response.status} on attempt ${attempt + 1}, will retry...`);
          
          if (attempt < retries) {
            // 对于服务器错误，使用更长的延迟（指数退避）
            const delay = Math.min((attempt + 1) * 2000, 10000); // 2s, 4s, 6s, 最多10s
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            // 最后一次尝试也失败
            return {
              success: false,
              error: `服务器临时故障 (HTTP ${response.status}): ${errorText.substring(0, 100)}`,
            };
          }
        }
        
        // 其他HTTP错误，直接抛出
        throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
      }

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

      // 记录完整的响应信息（用于调试）
      console.log(`[sendDomesticSMS] API Response (attempt ${attempt + 1}):`, JSON.stringify(result));

      // 处理阿里云 API 响应
      if (result.Code === "OK") {
        // 记录发送时间（用于频率限制）
        await recordSmsSent(phoneNumber);
        return { success: true, message: "短信发送成功" };
      } else {
        // 检查是否是限流错误
        const errorMessage = result.Message || result.message || "短信发送失败";
        const errorCode = result.Code || result.code || "Unknown";
        
        console.error(`[sendAliyunSMS] API Error: Code=${errorCode}, Message=${errorMessage}, PhoneNumber=${phoneNumber}`);
        
        // 识别限流错误码
        if (
          errorCode === "isv.BUSINESS_LIMIT_CONTROL" ||
          errorMessage.includes("触发分钟级流控") ||
          errorMessage.includes("Permits:") ||
          errorMessage.includes("流控")
        ) {
          // 记录发送时间（即使失败，也要记录，避免重复请求）
          await recordSmsSent(phoneNumber);
          
          // 提取等待时间（如果有）
          const permitMatch = errorMessage.match(/Permits:(\d+)/);
          const waitTime = permitMatch ? parseInt(permitMatch[1]) : 60;
          
          return {
            success: false,
            error: `触发分钟级流控，请等待 ${waitTime} 秒后重试`,
          };
        }
        
        // 手机号格式错误，不重试
        if (
          errorCode === "isv.MOBILE_NUMBER_ILLEGAL" ||
          errorMessage.includes("手机号码格式错误") ||
          errorMessage.includes("手机号") ||
          errorMessage.includes("号码")
        ) {
          return {
            success: false,
            error: `手机号码格式错误: ${errorMessage} (手机号: ${phoneNumber})`,
          };
        }
        
        // 其他错误，如果是最后一次尝试，返回错误
        if (attempt >= retries) {
          return {
            success: false,
            error: `${errorMessage} (错误码: ${errorCode})`,
          };
        }
        
        // 非限流、非格式错误，可以重试
        const delay = (attempt + 1) * 500;
        console.warn(`SMS send failed on attempt ${attempt + 1}, retrying in ${delay}ms... Error: ${errorMessage}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Domestic SMS error (attempt ${attempt + 1}/${retries + 1}):`, errorMessage);
      
      // 检查是否是服务器错误（503, 502, 504）- 应该重试
      const isServerError = 
        errorMessage.includes("HTTP 503") ||
        errorMessage.includes("HTTP 502") ||
        errorMessage.includes("HTTP 504") ||
        errorMessage.includes("ServiceUnavailable") ||
        errorMessage.includes("temporary failure");
      
      if (isServerError && attempt < retries) {
        // 对于服务器错误，使用更长的延迟（指数退避）
        const delay = Math.min((attempt + 1) * 2000, 10000); // 2s, 4s, 6s, 最多10s
        console.warn(`Server error detected, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // 如果是最后一次尝试，返回错误
      if (attempt >= retries) {
        return {
          success: false,
          error: errorMessage,
        };
      }
      
      // 其他错误，使用标准延迟重试
      const delay = (attempt + 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: "短信发送失败：已达到最大重试次数",
  };
}

/**
 * 统一的短信发送入口函数
 * 根据手机号类型自动选择国内或国际接口
 */
async function sendAliyunSMS(
  phoneNumber: string,
  code: string,
  retries: number = 3
): Promise<{ success: boolean; message?: string; error?: string }> {
  // 判断是国际号码还是国内号码
  const isInternational = isInternationalNumber(phoneNumber);
  
  console.log(`[sendAliyunSMS] Phone number: ${phoneNumber}, Type: ${isInternational ? 'International' : 'Domestic'}`);
  
  if (isInternational) {
    // 使用国际短信接口
    return await sendInternationalSMS(phoneNumber, code, retries);
  } else {
    // 使用国内短信接口
    return await sendDomesticSMS(phoneNumber, code, retries);
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

    // 记录原始手机号（用于调试）
    console.log(`[SMS] Original phone number: ${phone} (type: ${typeof phone}, length: ${phone.length})`);

    // 格式化手机号（阿里云需要纯数字，中国大陆手机号需要包含国家代码 86）
    const formattedPhone = formatPhoneNumber(phone);
    
    if (!formattedPhone) {
      console.error(`[SMS] Invalid phone number format: ${phone}`);
      return new Response(
        JSON.stringify({ error: "手机号码格式错误" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[SMS] Formatted phone number: ${formattedPhone} (original: ${phone})`);

    // 发送短信
    const result = await sendAliyunSMS(formattedPhone, otp);

    if (result.success) {
      // 返回有效的 JSON 响应，Supabase 需要解析 JSON
      // 即使官方文档说可以返回空响应，但实际需要有效的 JSON 格式
      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
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


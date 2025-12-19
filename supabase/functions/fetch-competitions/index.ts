import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SPORTNANOAPI_BASE_URL = "https://open.sportnanoapi.com/api/v5";
const SPORTNANOAPI_USER = "nacctsaw";
const SPORTNANOAPI_SECRET = "f0b904438d488e4c3d686b36f69339a6";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get query parameters from request
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const time = url.searchParams.get("time");
    const limit = url.searchParams.get("limit");
    const date = url.searchParams.get("date");
    const league = url.searchParams.get("league");
    const season = url.searchParams.get("season");
    const team = url.searchParams.get("team");
    const live = url.searchParams.get("live");
    const timezone = url.searchParams.get("timezone");
    const endpoint = url.searchParams.get("endpoint") || "competition/list"; // 默认是赛事列表

    // Build API request URL
    const apiParams = new URLSearchParams({
      user: SPORTNANOAPI_USER,
      secret: SPORTNANOAPI_SECRET,
    });

    if (id) {
      apiParams.append("id", id);
    }
    if (time) {
      apiParams.append("time", time);
    }
    if (limit) {
      apiParams.append("limit", limit);
    }
    
    // date 参数处理：对于 match/schedule/diary 端点是必填的
    let dateParam = date;
    if (endpoint === "match/schedule/diary") {
      if (!dateParam) {
        // 如果没有提供 date，使用当前日期，格式转换为 yyyymmdd
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        dateParam = `${year}${month}${day}`;
      } else {
        // 确保格式是 yyyymmdd（移除可能的连字符）
        dateParam = dateParam.replace(/-/g, '');
      }
      apiParams.append("date", dateParam);
    } else if (date) {
      // 对于其他端点，date 是可选的
      apiParams.append("date", date);
    }
    if (league) {
      apiParams.append("league", league);
    }
    if (season) {
      apiParams.append("season", season);
    }
    if (team) {
      apiParams.append("team", team);
    }
    if (live) {
      apiParams.append("live", live);
    }
    if (timezone) {
      apiParams.append("timezone", timezone);
    }

    // 根据 endpoint 参数决定调用哪个 API
    let apiPath = "football/competition/list";
    if (endpoint === "match/schedule/diary") {
      apiPath = "football/match/schedule/diary";
    } else if (endpoint === "match/live") {
      apiPath = "football/match/live";
    }
    
    const apiUrl = `${SPORTNANOAPI_BASE_URL}/${apiPath}?${apiParams.toString()}`;

    // Fetch from SportNanoAPI
    const response = await fetch(apiUrl, {
      method: "GET",
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({
          error: `Failed to fetch competitions: ${response.status} ${response.statusText}`,
          details: errorText,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();

    // Return response with CORS headers
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching competitions:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});


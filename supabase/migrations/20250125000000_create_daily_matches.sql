-- 重新设计 daily_matches 表以支持纳米数据 API 数据结构
-- API: https://open.sportnanoapi.com/api/v5/football/match/schedule/diary

-- 删除旧表（如果存在）
DROP TABLE IF EXISTS public.daily_matches CASCADE;

-- 创建新的 daily_matches 表
CREATE TABLE public.daily_matches (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  match_id INTEGER NOT NULL, -- 纳米数据API的比赛ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 比赛基本信息（来自 DiaryMatch）
  season_id INTEGER,
  competition_id INTEGER,
  home_team_id INTEGER,
  away_team_id INTEGER,
  status_id INTEGER, -- 比赛状态ID
  match_time BIGINT, -- 开球时间戳（秒）
  neutral INTEGER, -- 是否中立场地
  note TEXT, -- 备注信息
  home_scores INTEGER[], -- 主队得分数组 [常规时间比分, 半场比分, 红牌, 黄牌, 角球, 加时比分, 点球比分]
  away_scores INTEGER[], -- 客队得分数组
  home_position TEXT, -- 主队排名
  away_position TEXT, -- 客队排名
  venue_id INTEGER, -- 场地ID
  referee_id INTEGER, -- 裁判ID
  related_id INTEGER, -- 关联比赛ID
  agg_score INTEGER[], -- 总比分
  ended INTEGER, -- 是否已结束 (1-已结束, 0-未结束)
  updated_at_api BIGINT, -- API返回的更新时间戳
  
  -- 覆盖信息（coverage）
  coverage_mlive INTEGER, -- 是否有文字直播
  coverage_intelligence INTEGER, -- 是否有情报
  coverage_lineup INTEGER, -- 是否有阵容
  
  -- 轮次信息（round）
  round_stage_id INTEGER,
  round_group_num INTEGER,
  round_round_num INTEGER,
  
  -- 环境信息（environment）
  environment_weather INTEGER,
  environment_pressure TEXT,
  environment_temperature TEXT,
  environment_wind TEXT,
  environment_humidity TEXT,
  
  -- 联赛信息（从 competition 关联）
  competition_name TEXT, -- 联赛名称
  competition_name_zh TEXT, -- 联赛中文名称（从 multilingual 表关联）
  competition_logo TEXT, -- 联赛logo
  
  -- 球队信息（从 team 关联）
  home_team_name TEXT, -- 主队名称
  home_team_name_zh TEXT, -- 主队中文名称（从 multilingual 表关联）
  home_team_logo TEXT, -- 主队logo
  away_team_name TEXT, -- 客队名称
  away_team_name_zh TEXT, -- 客队中文名称（从 multilingual 表关联）
  away_team_logo TEXT, -- 客队logo
  
  -- 原始数据（JSONB格式，存储完整的API响应）
  raw JSONB,
  
  -- 赔率数据（从番茄体育API获取）
  odds_info JSONB, -- 详细赔率信息（从 getMatchOddsInfoPB API 获取）
  odds_requested BOOLEAN DEFAULT FALSE, -- 是否已请求过赔率信息（true-已请求，false-未请求）
  odds_info_updated_at TIMESTAMPTZ, -- 赔率信息最后更新时间，用于判断是否需要刷新赔率（未预测的比赛超过30分钟且未开始可重新获取）
  
  -- 唯一约束：同一日期同一比赛ID只能有一条记录
  UNIQUE(date, match_id)
);

-- 创建索引
CREATE INDEX idx_daily_matches_match_id ON public.daily_matches(match_id);
CREATE INDEX idx_daily_matches_competition_id ON public.daily_matches(competition_id);
CREATE INDEX idx_daily_matches_home_team_id ON public.daily_matches(home_team_id);
CREATE INDEX idx_daily_matches_away_team_id ON public.daily_matches(away_team_id);
CREATE INDEX idx_daily_matches_match_time ON public.daily_matches(match_time);
CREATE INDEX idx_daily_matches_status_id ON public.daily_matches(status_id);
CREATE INDEX idx_daily_matches_date_match_id ON public.daily_matches(date, match_id);
CREATE INDEX idx_daily_matches_ended ON public.daily_matches(ended);
CREATE INDEX idx_daily_matches_raw ON public.daily_matches USING GIN(raw);
CREATE INDEX idx_daily_matches_odds_info ON public.daily_matches USING GIN(odds_info);
CREATE INDEX idx_daily_matches_odds_requested ON public.daily_matches(odds_requested);
CREATE INDEX idx_daily_matches_odds_info_updated_at ON public.daily_matches(odds_info_updated_at);

-- 添加注释
COMMENT ON TABLE public.daily_matches IS '每日比赛数据表，支持纳米数据 API 数据结构';
COMMENT ON COLUMN public.daily_matches.match_id IS '纳米数据API的比赛ID';
COMMENT ON COLUMN public.daily_matches.match_time IS '开球时间戳（秒）';
COMMENT ON COLUMN public.daily_matches.home_scores IS '主队得分数组 [常规时间比分, 半场比分, 红牌, 黄牌, 角球, 加时比分, 点球比分]';
COMMENT ON COLUMN public.daily_matches.away_scores IS '客队得分数组 [常规时间比分, 半场比分, 红牌, 黄牌, 角球, 加时比分, 点球比分]';
COMMENT ON COLUMN public.daily_matches.ended IS '是否已结束 (1-已结束, 0-未结束)';
COMMENT ON COLUMN public.daily_matches.raw IS '原始数据（JSONB格式，存储完整的API响应）';
COMMENT ON COLUMN public.daily_matches.odds_info IS '详细赔率信息（JSONB格式，从番茄体育 getMatchOddsInfoPB API 获取）';
COMMENT ON COLUMN public.daily_matches.odds_requested IS '是否已请求过赔率信息（true-已请求，false-未请求）';
COMMENT ON COLUMN public.daily_matches.odds_info_updated_at IS '赔率信息最后更新时间，用于判断是否需要刷新赔率（未预测的比赛超过30分钟且未开始可重新获取）';

-- 创建函数自动更新 updated_at
CREATE OR REPLACE FUNCTION public.update_daily_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS update_daily_matches_updated_at_trigger ON public.daily_matches;
CREATE TRIGGER update_daily_matches_updated_at_trigger
  BEFORE UPDATE ON public.daily_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_daily_matches_updated_at();

-- 添加注释
COMMENT ON FUNCTION public.update_daily_matches_updated_at() IS '自动更新 daily_matches 表的 updated_at 字段';

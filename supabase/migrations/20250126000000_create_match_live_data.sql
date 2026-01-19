-- 创建实时比赛数据表，用于存储 /match/live 接口返回的数据
-- API: https://open.sportnanoapi.com/api/v5/football/match/live

CREATE TABLE IF NOT EXISTS public.match_live_data (
  id BIGSERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL, -- 纳米数据API的比赛ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 比分信息（来自 MatchLiveScore）
  score_status INTEGER, -- 比赛状态
  score_home_scores INTEGER[], -- 主队得分数组 [常规时间比分, 半场比分, 红牌, 黄牌, 角球, 加时比分, 点球比分]
  score_away_scores INTEGER[], -- 客队得分数组
  score_kickoff_time BIGINT, -- 开球时间戳（秒）
  score_note TEXT, -- 备注信息
  
  -- 比赛统计（来自 MatchLiveStat[]）
  stats JSONB, -- 比赛统计数据数组
  
  -- 比赛事件（来自 MatchLiveIncident[]）
  incidents JSONB, -- 比赛事件数组
  
  -- 文字直播（来自 MatchLiveText[]）
  tlive JSONB, -- 文字直播数组
  
  -- 原始数据（JSONB格式，存储完整的API响应）
  raw JSONB, -- 完整的 MatchLiveData 对象
  
  -- 唯一约束：同一比赛ID只能有一条最新记录（通过 match_id 唯一）
  UNIQUE(match_id)
);

-- 创建索引
CREATE INDEX idx_match_live_data_match_id ON public.match_live_data(match_id);
CREATE INDEX idx_match_live_data_updated_at ON public.match_live_data(updated_at);
CREATE INDEX idx_match_live_data_score_status ON public.match_live_data(score_status);
CREATE INDEX idx_match_live_data_raw ON public.match_live_data USING GIN(raw);
CREATE INDEX idx_match_live_data_stats ON public.match_live_data USING GIN(stats);
CREATE INDEX idx_match_live_data_incidents ON public.match_live_data USING GIN(incidents);
CREATE INDEX idx_match_live_data_tlive ON public.match_live_data USING GIN(tlive);

-- 创建函数自动更新 updated_at
CREATE OR REPLACE FUNCTION public.update_match_live_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS update_match_live_data_updated_at_trigger ON public.match_live_data;
CREATE TRIGGER update_match_live_data_updated_at_trigger
  BEFORE UPDATE ON public.match_live_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_match_live_data_updated_at();

-- 添加注释
COMMENT ON TABLE public.match_live_data IS '实时比赛数据表，存储 /match/live 接口返回的数据';
COMMENT ON COLUMN public.match_live_data.match_id IS '纳米数据API的比赛ID';
COMMENT ON COLUMN public.match_live_data.score_home_scores IS '主队得分数组 [常规时间比分, 半场比分, 红牌, 黄牌, 角球, 加时比分, 点球比分]';
COMMENT ON COLUMN public.match_live_data.score_away_scores IS '客队得分数组 [常规时间比分, 半场比分, 红牌, 黄牌, 角球, 加时比分, 点球比分]';
COMMENT ON COLUMN public.match_live_data.score_kickoff_time IS '开球时间戳（秒）';
COMMENT ON COLUMN public.match_live_data.stats IS '比赛统计数据数组（JSONB格式）';
COMMENT ON COLUMN public.match_live_data.incidents IS '比赛事件数组（JSONB格式）';
COMMENT ON COLUMN public.match_live_data.tlive IS '文字直播数组（JSONB格式）';
COMMENT ON COLUMN public.match_live_data.raw IS '原始数据（JSONB格式，存储完整的 MatchLiveData 对象）';

-- 更新 daily_matches 表以支持番茄体育 API 数据结构
-- 参考: SportsApi/matches_data/所有比赛_all_20251215_100434.json

-- 添加新字段（如果表不存在则先创建）
DO $$
BEGIN
  -- 如果表不存在，创建表
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'daily_matches') THEN
    CREATE TABLE public.daily_matches (
      id BIGSERIAL PRIMARY KEY,
      date DATE NOT NULL,
      mid TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(date, mid)
    );
  END IF;
END $$;

-- 添加基础字段（如果不存在）
ALTER TABLE public.daily_matches
  ADD COLUMN IF NOT EXISTS raw JSONB;

-- 添加番茄体育 API 特定字段
ALTER TABLE public.daily_matches
  -- 比赛基本信息
  ADD COLUMN IF NOT EXISTS mid TEXT, -- 比赛ID (番茄体育格式)
  ADD COLUMN IF NOT EXISTS mcid TEXT, -- 比赛分类ID
  ADD COLUMN IF NOT EXISTS srid TEXT, -- 系列赛ID
  ADD COLUMN IF NOT EXISTS mst TEXT, -- 比赛状态
  ADD COLUMN IF NOT EXISTS msts TEXT, -- 比赛状态字符串
  ADD COLUMN IF NOT EXISTS mstst TEXT, -- 比赛状态文本
  ADD COLUMN IF NOT EXISTS mststr TEXT, -- 比赛状态字符串
  ADD COLUMN IF NOT EXISTS mststi TEXT, -- 比赛状态整数
  ADD COLUMN IF NOT EXISTS mststs INTEGER, -- 比赛状态状态
  ADD COLUMN IF NOT EXISTS ms INTEGER, -- 比赛状态码
  ADD COLUMN IF NOT EXISTS mess INTEGER, -- 比赛错误状态
  ADD COLUMN IF NOT EXISTS cmec TEXT, -- 比赛状态枚举代码
  
  -- 联赛信息
  ADD COLUMN IF NOT EXISTS tid TEXT, -- 联赛ID
  ADD COLUMN IF NOT EXISTS tn TEXT, -- 联赛名称
  ADD COLUMN IF NOT EXISTS tnjc TEXT, -- 联赛简称
  ADD COLUMN IF NOT EXISTS tlev INTEGER, -- 联赛级别
  ADD COLUMN IF NOT EXISTS lurl TEXT, -- 联赛logo URL
  ADD COLUMN IF NOT EXISTS lvs INTEGER, -- 联赛版本
  
  -- 球队信息（补充）
  ADD COLUMN IF NOT EXISTS mhid TEXT, -- 主队ID (字符串格式)
  ADD COLUMN IF NOT EXISTS maid TEXT, -- 客队ID (字符串格式)
  ADD COLUMN IF NOT EXISTS mhn TEXT, -- 主队名称
  ADD COLUMN IF NOT EXISTS man TEXT, -- 客队名称
  ADD COLUMN IF NOT EXISTS mhlu TEXT[], -- 主队logo URLs数组
  ADD COLUMN IF NOT EXISTS malu TEXT[], -- 客队logo URLs数组
  ADD COLUMN IF NOT EXISTS mhlut TEXT, -- 主队logo URL文本
  ADD COLUMN IF NOT EXISTS malut TEXT, -- 客队logo URL文本
  ADD COLUMN IF NOT EXISTS frmhn TEXT[], -- 主队名称首字母
  ADD COLUMN IF NOT EXISTS frman TEXT[], -- 客队名称首字母
  
  -- 比赛时间
  ADD COLUMN IF NOT EXISTS mgt BIGINT, -- 比赛开始时间戳 (毫秒)
  ADD COLUMN IF NOT EXISTS met BIGINT, -- 比赛结束时间戳 (毫秒)
  ADD COLUMN IF NOT EXISTS mlet TEXT, -- 比赛时长文本 (如 "45:00")
  ADD COLUMN IF NOT EXISTS mle INTEGER, -- 比赛已进行时长 (分钟)
  
  -- 比分信息
  ADD COLUMN IF NOT EXISTS mhs INTEGER, -- 主队得分
  ADD COLUMN IF NOT EXISTS mas INTEGER, -- 客队得分
  ADD COLUMN IF NOT EXISTS msc TEXT[], -- 比分数据数组 (如 ["S0|2:0", "S1|2:0"])
  ADD COLUMN IF NOT EXISTS gcs INTEGER, -- 总进球数
  ADD COLUMN IF NOT EXISTS mng INTEGER, -- 比赛进球数
  ADD COLUMN IF NOT EXISTS mmp TEXT, -- 比赛分钟数
  
  -- 比赛配置
  ADD COLUMN IF NOT EXISTS mc INTEGER, -- 比赛类别
  ADD COLUMN IF NOT EXISTS mcg INTEGER, -- 比赛组别
  ADD COLUMN IF NOT EXISTS mct INTEGER, -- 比赛计数
  ADD COLUMN IF NOT EXISTS mp INTEGER, -- 比赛参数
  ADD COLUMN IF NOT EXISTS mo INTEGER, -- 比赛选项
  ADD COLUMN IF NOT EXISTS mf BOOLEAN, -- 比赛标志
  ADD COLUMN IF NOT EXISTS mft INTEGER, -- 比赛标志类型
  ADD COLUMN IF NOT EXISTS mvs INTEGER, -- 比赛版本
  ADD COLUMN IF NOT EXISTS mms INTEGER, -- 比赛分钟状态
  ADD COLUMN IF NOT EXISTS pmms INTEGER, -- 比赛分钟状态参数
  ADD COLUMN IF NOT EXISTS mbmty INTEGER, -- 比赛类型
  ADD COLUMN IF NOT EXISTS mprmc TEXT, -- 比赛参数代码
  ADD COLUMN IF NOT EXISTS mrmc TEXT, -- 比赛返回代码
  ADD COLUMN IF NOT EXISTS mat TEXT, -- 比赛附加文本
  ADD COLUMN IF NOT EXISTS compose BOOLEAN, -- 是否组合
  ADD COLUMN IF NOT EXISTS hipo BOOLEAN, -- 是否热门
  ADD COLUMN IF NOT EXISTS tf BOOLEAN, -- 是否测试
  ADD COLUMN IF NOT EXISTS th INTEGER, -- 测试参数
  ADD COLUMN IF NOT EXISTS mearlys INTEGER, -- 早期状态
  ADD COLUMN IF NOT EXISTS vf TEXT, -- 版本标志
  
  -- 分类和排序
  ADD COLUMN IF NOT EXISTS csid TEXT, -- 分类ID
  ADD COLUMN IF NOT EXISTS csna TEXT, -- 分类名称
  ADD COLUMN IF NOT EXISTS cds TEXT, -- 代码字符串
  ADD COLUMN IF NOT EXISTS ctt INTEGER, -- 分类类型
  ADD COLUMN IF NOT EXISTS atf TEXT, -- 附加类型标志
  ADD COLUMN IF NOT EXISTS st TEXT, -- 状态文本
  ADD COLUMN IF NOT EXISTS tc TEXT, -- 类型代码
  ADD COLUMN IF NOT EXISTS seid TEXT, -- 系列ID
  ADD COLUMN IF NOT EXISTS sort INTEGER, -- 排序
  ADD COLUMN IF NOT EXISTS "regionIdSort" INTEGER, -- 区域ID排序
  ADD COLUMN IF NOT EXISTS "operationTournamentSort" INTEGER, -- 操作联赛排序
  
  -- 赔率相关标志
  ADD COLUMN IF NOT EXISTS "cosBold" BOOLEAN, -- 是否粗体
  ADD COLUMN IF NOT EXISTS "cosTBold" BOOLEAN, -- 是否标题粗体
  ADD COLUMN IF NOT EXISTS "cosCorner" BOOLEAN, -- 是否有角球
  ADD COLUMN IF NOT EXISTS "cosTCorner" BOOLEAN, -- 是否有标题角球
  ADD COLUMN IF NOT EXISTS "cosPunish" BOOLEAN, -- 是否有惩罚
  ADD COLUMN IF NOT EXISTS "cosTPunish" BOOLEAN, -- 是否有标题惩罚
  ADD COLUMN IF NOT EXISTS "cosOvertime" BOOLEAN, -- 是否有加时
  ADD COLUMN IF NOT EXISTS "cosPenalty" BOOLEAN, -- 是否有点球
  ADD COLUMN IF NOT EXISTS "cosOutright" BOOLEAN, -- 是否直接
  ADD COLUMN IF NOT EXISTS "cosPromotion" BOOLEAN, -- 是否推广
  ADD COLUMN IF NOT EXISTS "cos15Minutes" BOOLEAN, -- 是否15分钟
  
  -- 赔率数据 (存储为 JSONB)
  ADD COLUMN IF NOT EXISTS hps JSONB, -- 赔率数据数组
  ADD COLUMN IF NOT EXISTS "hpsBold" JSONB, -- 粗体赔率
  ADD COLUMN IF NOT EXISTS "hpsCorner" JSONB, -- 角球赔率
  ADD COLUMN IF NOT EXISTS "hpsPunish" JSONB, -- 惩罚赔率
  ADD COLUMN IF NOT EXISTS "hpsOvertime" JSONB, -- 加时赔率
  ADD COLUMN IF NOT EXISTS "hpsPenalty" JSONB, -- 点球赔率
  ADD COLUMN IF NOT EXISTS "hpsPromotion" JSONB, -- 推广赔率
  ADD COLUMN IF NOT EXISTS "hpsOutright" JSONB, -- 直接赔率
  ADD COLUMN IF NOT EXISTS odds_info JSONB, -- 详细赔率信息（从 getMatchOddsInfoPB API 获取）
  
  -- 其他数据
  ADD COLUMN IF NOT EXISTS "betAmount" TEXT, -- 投注金额
  ADD COLUMN IF NOT EXISTS tt TEXT; -- 类型文本

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_daily_matches_mid ON public.daily_matches(mid);
CREATE INDEX IF NOT EXISTS idx_daily_matches_tid ON public.daily_matches(tid);
CREATE INDEX IF NOT EXISTS idx_daily_matches_mhid ON public.daily_matches(mhid);
CREATE INDEX IF NOT EXISTS idx_daily_matches_maid ON public.daily_matches(maid);
CREATE INDEX IF NOT EXISTS idx_daily_matches_mgt ON public.daily_matches(mgt);
CREATE INDEX IF NOT EXISTS idx_daily_matches_date_mid ON public.daily_matches(date, mid);
CREATE INDEX IF NOT EXISTS idx_daily_matches_hps ON public.daily_matches USING GIN(hps);

-- 添加注释
COMMENT ON TABLE public.daily_matches IS '每日比赛数据表，支持番茄体育 API 数据结构';
COMMENT ON COLUMN public.daily_matches.mid IS '比赛ID (番茄体育格式)';
COMMENT ON COLUMN public.daily_matches.hps IS '赔率数据 (JSONB格式，包含所有赔率信息)';
COMMENT ON COLUMN public.daily_matches.odds_info IS '详细赔率信息 (JSONB格式，从 getMatchOddsInfoPB API 获取，包含所有盘口和赔率)';
COMMENT ON COLUMN public.daily_matches.msc IS '比分数据数组';

-- 为 odds_info 创建 GIN 索引以支持 JSONB 查询
CREATE INDEX IF NOT EXISTS idx_daily_matches_odds_info ON public.daily_matches USING GIN(odds_info);

-- 创建函数自动更新 updated_at
CREATE OR REPLACE FUNCTION public.update_daily_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器（如果不存在）
DROP TRIGGER IF EXISTS update_daily_matches_updated_at_trigger ON public.daily_matches;
CREATE TRIGGER update_daily_matches_updated_at_trigger
  BEFORE UPDATE ON public.daily_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_daily_matches_updated_at();

-- 添加注释
COMMENT ON FUNCTION public.update_daily_matches_updated_at() IS '自动更新 daily_matches 表的 updated_at 字段';


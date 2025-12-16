-- 创建联赛常量表
-- 基于 src/i18n/leagues-zh.ts 的映射关系
-- 用于存储联赛英文名到中文名的常量映射

CREATE TABLE IF NOT EXISTS league_constants (
  chinese_name TEXT PRIMARY KEY,
  english_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引以优化查询
CREATE INDEX IF NOT EXISTS idx_league_constants_english_name ON league_constants(english_name);

-- 创建函数自动更新 updated_at
CREATE OR REPLACE FUNCTION update_league_constants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER update_league_constants_updated_at_trigger
  BEFORE UPDATE ON league_constants
  FOR EACH ROW
  EXECUTE FUNCTION update_league_constants_updated_at();

-- 插入数据（基于 leagues-zh.ts）
INSERT INTO league_constants (chinese_name, english_name) VALUES
  ('丹麦甲级联赛', '1. Division'),
  ('土耳其甲级联赛', '1. Lig'),
  ('德国乙级联赛', '2. Bundesliga'),
  ('澳大利亚足球超级联赛', 'A-League'),
  ('亚足联精英冠军联赛', 'AFC Champions League'),
  ('亚足联冠军联赛二', 'AFC Cup'),
  ('瑞典超级联赛', 'Allsvenskan'),
  ('奥地利甲级联赛', 'Bundesliga'),
  ('英格兰冠军联赛', 'Championship'),
  ('意大利杯', 'Coppa Italia'),
  ('法国杯', 'Coupe de France'),
  ('德国杯', 'DFB Pokal'),
  ('荷兰乙级联赛', 'Eerste Divisie'),
  ('波兰甲级联赛', 'Ekstraklasa'),
  ('挪威超级联赛', 'Eliteserien'),
  ('荷兰甲级联赛', 'Eredivisie'),
  ('欧洲足球锦标赛', 'Euro Championship'),
  ('日本甲级联赛', 'J1 League'),
  ('日本乙级联赛', 'J2 League'),
  ('日本足球联赛', 'Japan Football League'),
  ('比利时甲级联赛', 'Jupiler Pro League'),
  ('韩国职业甲级联赛K1', 'K League 1'),
  ('韩国职业乙级联赛K2', 'K League 2'),
  ('西班牙甲级联赛', 'La Liga'),
  ('中国足球甲级联赛', 'League One'),
  ('英格兰乙级联赛', 'League Two'),
  ('葡萄牙乙级联赛', 'Liga 3'),
  ('罗马尼亚甲级联赛', 'Liga I'),
  ('墨西哥超级联赛', 'Liga MX'),
  ('阿根廷甲级联赛', 'Liga Profesional Argentina'),
  ('以色列超级联赛', 'Ligat Ha''al'),
  ('法国甲级联赛', 'Ligue 1'),
  ('法国乙级联赛', 'Ligue 2'),
  ('美国职业大联盟联赛', 'Major League Soccer'),
  ('爱尔兰超级联赛', 'Premier Division'),
  ('埃及超级联赛', 'Premier League'),
  ('苏格兰超级联赛', 'Premiership'),
  ('葡萄牙超级联赛', 'Primeira Liga'),
  ('智利甲级联赛', 'Primera División'),
  ('沙特阿拉伯超级联赛', 'Pro League'),
  ('西班牙乙级联赛', 'Segunda División'),
  ('葡萄牙甲级联赛', 'Segunda Liga'),
  ('巴西甲级联赛', 'Serie A'),
  ('意大利乙级联赛', 'Serie B'),
  ('中国足球超级联赛', 'Super League'),
  ('希腊超级联赛', 'Super League 1'),
  ('瑞典超甲联赛', 'Superettan'),
  ('丹麦超级联赛', 'Superliga'),
  ('土耳其超级联赛', 'Süper Lig'),
  ('欧洲冠军联赛', 'UEFA Champions League'),
  ('欧足联欧洲协会联赛', 'UEFA Europa Conference League'),
  ('欧足联欧洲联赛', 'UEFA Europa League'),
  ('欧洲国家联赛', 'UEFA Nations League'),
  ('欧洲超级杯', 'UEFA Super Cup'),
  ('芬兰超级联赛', 'Veikkausliiga'),
  ('冰岛超级联赛', 'Úrvalsdeild')
ON CONFLICT (chinese_name) 
DO UPDATE SET 
  english_name = EXCLUDED.english_name,
  updated_at = NOW();

-- 添加注释
COMMENT ON TABLE league_constants IS '联赛常量表，存储联赛中文名到英文名的映射关系';
COMMENT ON COLUMN league_constants.chinese_name IS '联赛中文名称（主键）';
COMMENT ON COLUMN league_constants.english_name IS '联赛英文名称';


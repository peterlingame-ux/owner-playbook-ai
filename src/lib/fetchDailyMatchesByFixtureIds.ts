import { SupabaseClient } from '@supabase/supabase-js';

// 统一封装：根据 fixture_id 批量查询 daily_matches，自动分批防止 URL 过长导致 400
export async function fetchDailyMatchesByFixtureIds(
  supabase: SupabaseClient,
  fixtureIds: (number | string)[],
  chunkSize = 100
): Promise<any[]> {
  const ids = [...new Set(fixtureIds)]
    .filter((id) => id !== null && id !== undefined)
    .map((id) => (typeof id === 'string' ? parseInt(id, 10) : id))
    .filter((id) => !Number.isNaN(id));

  if (ids.length === 0) return [];

  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    chunks.push(ids.slice(i, i + chunkSize));
  }

  const allMatches: any[] = [];

  for (const chunk of chunks) {
    const { data, error } = await supabase
      .from('daily_matches' as any)
      .select('*')
      .in('fixture_id', chunk);

    if (error) {
      console.error('fetchDailyMatchesByFixtureIds chunk error:', error);
      continue;
    }
    if (data) {
      allMatches.push(...data);
    }
  }

  // 去重（同一个 fixture_id 只保留一个）
  const map = new Map<number, any>();
  for (const m of allMatches) {
    const fid = typeof m.fixture_id === 'string' ? parseInt(m.fixture_id, 10) : m.fixture_id;
    if (fid != null && !Number.isNaN(fid)) {
      map.set(fid, m);
    }
  }

  return Array.from(map.values());
}


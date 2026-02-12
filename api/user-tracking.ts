
export const config = {
  runtime: 'edge',
};

const SUPABASE_URL = "https://pkcqrmrliuvcydczkvyh.supabase.co";
const SUPABASE_KEY = "sb_publishable_pArtFEGGXC27ub0rbWZIYw_svEoOl_l"; // 建议通过环境变量管理

export default async function handler(req: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { uid, mode, action } = await req.json();

    if (action === 'GET_STATS') {
      // 管理员获取统计数据逻辑
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/qimen_users?select=*&order=last_active.desc`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      const data = await resp.json();
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    // 用户自动注册/更新逻辑 (Upsert)
    // 注意：Supabase REST API 使用 on_conflict 进行 upsert
    const upsertBody = {
      uid,
      last_active: new Date().toISOString(),
      last_mode: mode || 'UNKNOWN'
    };

    const resp = await fetch(`${SUPABASE_URL}/rest/v1/qimen_users`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(upsertBody)
    });

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
}

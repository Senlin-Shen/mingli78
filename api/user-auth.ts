
export const config = {
  runtime: 'edge',
};

const SUPABASE_URL = "https://pkcqrmrliuvcydczkvyh.supabase.co";
const SUPABASE_KEY = "sb_publishable_pArtFEGGXC27ub0rbWZIYw_svEoOl_l";

export default async function handler(req: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { action, username, password } = await req.json();

    if (action === 'REGISTER') {
      // 检查用户是否已存在
      const checkResp = await fetch(`${SUPABASE_URL}/rest/v1/qimen_users?username=eq.${username}`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const existing = await checkResp.json();
      if (existing.length > 0) {
        return new Response(JSON.stringify({ error: '此标识已被占用' }), { status: 400, headers: corsHeaders });
      }

      // 注册新用户
      const regResp = await fetch(`${SUPABASE_URL}/rest/v1/qimen_users`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          password, // 生产环境应加密，此演示环境直接存储
          uid: 'qm_' + Math.random().toString(36).substr(2, 9),
          last_active: new Date().toISOString()
        })
      });

      if (!regResp.ok) throw new Error('注册链路中断');
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (action === 'LOGIN') {
      const loginResp = await fetch(`${SUPABASE_URL}/rest/v1/qimen_users?username=eq.${username}&password=eq.${password}`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const users = await loginResp.json();
      if (users.length === 0) {
        return new Response(JSON.stringify({ error: '身份凭证无效' }), { status: 401, headers: corsHeaders });
      }

      // 更新最后活跃时间
      await fetch(`${SUPABASE_URL}/rest/v1/qimen_users?uid=eq.${users[0].uid}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ last_active: new Date().toISOString() })
      });

      return new Response(JSON.stringify({ user: users[0] }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: '非法操作' }), { status: 400, headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
}

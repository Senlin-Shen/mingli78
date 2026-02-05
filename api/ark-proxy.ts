
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  // 处理预检请求 (CORS)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: "仅支持 POST 请求" }), { 
      status: 405, 
      headers: { "Content-Type": "application/json" } 
    });
  }

  try {
    // 从 Vercel 环境变量中读取配置，如果缺失则使用用户提供的默认值
    const apiKey = process.env.ARK_API_KEY || '98cb8068-1092-4293-8284-e75748242001';
    const endpointId = process.env.ARK_ENDPOINT_ID || 'ep-20260205125313-tqz2h';
    const baseUrl = process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';

    if (!apiKey || !endpointId) {
      return new Response(
        JSON.stringify({ error: "环境变量 ARK_API_KEY 或 ARK_ENDPOINT_ID 未配置" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const frontData = await req.json();

    // 转发请求到火山引擎（服务器端请求，无跨域限制）
    const volcResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: endpointId,
        messages: frontData.messages,
        temperature: frontData.temperature || 0.7,
        stream: true // 开启流式响应以优化前端体验
      })
    });

    if (!volcResponse.ok) {
      const errorText = await volcResponse.text();
      return new Response(JSON.stringify({ error: `火山引擎返回错误: ${errorText}` }), { 
        status: volcResponse.status,
        headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 将火山引擎的响应流透传给前端
    return new Response(volcResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: "API 转发异常", detail: error.message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } 
    });
  }
}

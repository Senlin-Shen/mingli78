
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
    return new Response(JSON.stringify({ error: '仅支持 POST 请求' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 使用用户提供的最新参数
  // 优先级：Vercel 环境变量 > 硬编码默认值
  const apiKey = process.env.VOLC_API_KEY || '98cb8068-1092-4293-8284-e75748242001';
  const endpointId = process.env.VOLC_ENDPOINT_ID || 'ep-20260205125313-tqz2h';
  const baseUrl = process.env.VOLC_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';

  try {
    const incomingBody = await req.json();

    // 转发请求到火山引擎 Ark 平台
    const volcResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: endpointId,
        messages: incomingBody.messages,
        temperature: incomingBody.temperature || 0.7,
        stream: true 
      })
    });

    if (!volcResponse.ok) {
      const errorData = await volcResponse.text();
      return new Response(JSON.stringify({ error: `火山引擎 Ark 报错: ${errorData}` }), { 
        status: volcResponse.status,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 透传 SSE 流响应
    return new Response(volcResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: `代理网关故障: ${error.message}` }), { 
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

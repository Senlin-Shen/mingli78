
export const config = {
  runtime: 'edge', // 必须使用 Edge Runtime 以获得最低转发延迟
};

export default async function handler(req: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-cache, no-transform', // no-transform 关键：防止 Vercel 缓冲 SSE 流
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55000); // 55s 超时控制

  try {
    const apiKey = process.env.ARK_API_KEY;
    const endpointId = process.env.ARK_ENDPOINT_ID;
    const baseUrl = process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';

    if (!apiKey || !endpointId) {
      return new Response(JSON.stringify({ error: "代理配置缺失" }), { status: 500, headers: corsHeaders });
    }

    const body = await req.json();

    // 建立上游请求
    const volcResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "Connection": "keep-alive" // 尝试保持长连接
      },
      body: JSON.stringify({
        model: endpointId,
        messages: body.messages,
        temperature: body.temperature || 0.7,
        stream: true 
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!volcResponse.ok) {
      const errText = await volcResponse.text();
      return new Response(JSON.stringify({ error: `上游响应错误`, detail: errText }), { status: volcResponse.status, headers: corsHeaders });
    }

    // 零缓冲转发响应流
    return new Response(volcResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'X-Content-Type-Options': 'nosniff',
      },
    });

  } catch (error: any) {
    if (error.name === 'AbortError') {
      return new Response(JSON.stringify({ error: "请求时空链路超时" }), { status: 504, headers: corsHeaders });
    }
    return new Response(JSON.stringify({ error: "网关异常", detail: error.message }), { status: 500, headers: corsHeaders });
  }
}

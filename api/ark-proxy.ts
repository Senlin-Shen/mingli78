
export const config = {
  runtime: 'edge', 
};

export default async function handler(req: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-cache, no-transform',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); 

  try {
    const apiKey = process.env.ARK_API_KEY;
    const defaultEndpointId = process.env.ARK_ENDPOINT_ID;
    const baseUrl = process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "代理配置缺失 API KEY" }), { status: 500, headers: corsHeaders });
    }

    const body = await req.json();
    // 优先使用请求中指定的模型，否则使用环境变量中的默认模型
    const modelId = body.model || defaultEndpointId;

    if (!modelId) {
      return new Response(JSON.stringify({ error: "未指定 Endpoint ID" }), { status: 500, headers: corsHeaders });
    }

    const volcResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelId,
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

    return new Response(volcResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'X-Content-Type-Options': 'nosniff',
      },
    });

  } catch (error: any) {
    if (error.name === 'AbortError') {
      return new Response(JSON.stringify({ error: "请求链路超时" }), { status: 504, headers: corsHeaders });
    }
    return new Response(JSON.stringify({ error: "代理网关异常", detail: error.message }), { status: 500, headers: corsHeaders });
  }
}

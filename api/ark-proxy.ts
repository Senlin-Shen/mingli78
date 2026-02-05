export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  // 统一 CORS 响应头配置
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // 处理预检请求 (CORS Preflight)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: "仅支持 POST 请求" }), { 
      status: 405, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  try {
    // 凭据配置：优先从环境变量读取，否则使用提供的默认值
    const apiKey = process.env.ARK_API_KEY || '98cb8068-1092-4293-8284-e75748242001';
    const endpointId = process.env.ARK_ENDPOINT_ID || 'ep-20260205125313-tqz2h';
    const baseUrl = process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';

    const body = await req.json();

    // 发起对火山引擎的请求
    const volcResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: endpointId,
        messages: body.messages,
        temperature: body.temperature || 0.7,
        stream: true 
      })
    });

    // 如果火山引擎返回非 200 状态码
    if (!volcResponse.ok) {
      const errorText = await volcResponse.text();
      console.error('火山引擎接口返回错误:', errorText);
      return new Response(JSON.stringify({ 
        error: `火山引擎响应异常 (${volcResponse.status})`, 
        detail: errorText 
      }), { 
        status: volcResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 检查是否有响应体
    if (!volcResponse.body) {
      return new Response(JSON.stringify({ error: "火山引擎未返回响应流" }), { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 返回流式响应，透传火山引擎的 body
    return new Response(volcResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('代理网关捕捉到异常:', error);
    return new Response(JSON.stringify({ 
      error: "代理网关内部错误", 
      message: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
}
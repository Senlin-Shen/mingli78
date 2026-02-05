
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const apiKey = process.env.ARK_API_KEY;
    const endpointId = process.env.ARK_ENDPOINT_ID;
    const baseUrl = process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';

    if (!apiKey || !endpointId) {
      return new Response(
        JSON.stringify({ 
          error: "环境变量未配置", 
          detail: "请在 Vercel 控制台配置 ARK_API_KEY 和 ARK_ENDPOINT_ID" 
        }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();

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

    if (!volcResponse.ok) {
      const errText = await volcResponse.text();
      return new Response(
        JSON.stringify({ error: `火山引擎错误 (${volcResponse.status})`, detail: errText }), 
        { status: volcResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(volcResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: "代理网关异常", message: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

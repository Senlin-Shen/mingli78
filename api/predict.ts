
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: '服务端 API_KEY 未配置' }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  try {
    const { model, messages } = await req.json();

    // 严格转换结构以适配火山引擎 v3/responses
    const formattedInput = messages.map((m: any) => ({
      role: m.role === 'system' ? 'user' : m.role, // 有些 Endpoint 不接受 system 角色，将其转为 user 更稳健
      content: [
        {
          type: "input_text",
          text: m.content
        }
      ]
    }));

    // 精准调用火山引擎 Ark v3 响应接口
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model, 
        input: formattedInput,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ 
        error: `API 响应异常 (${response.status})`,
        details: errorText 
      }), { 
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Edge Runtime 下直接返回 fetch 的 body 即可完美支持流
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ 
      error: '边缘代理执行异常',
      message: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

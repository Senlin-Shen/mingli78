
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const { model, input, tools } = body;

    // 转发请求到字节跳动火山引擎
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        stream: true,
        input,
        tools: tools || [{ type: "web_search", max_keyword: 3 }]
      }),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      return new Response(`Ark API Error: ${errorMsg}`, { status: response.status });
    }

    // 将字节跳动的流直接管道传回给前端
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    return new Response(`Proxy Error: ${error.message}`, { status: 500 });
  }
}

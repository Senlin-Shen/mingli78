
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { messages, model } = await req.json();

    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.API_KEY}`
      },
      body: JSON.stringify({
        model: model || "doubao-pro-4k",
        messages,
        stream: true
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      return new Response(`火山引擎错误: ${errorData}`, { status: response.status });
    }

    // 将火山引擎的流直接透传给前端
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    return new Response(`服务端异常: ${error.message}`, { status: 500 });
  }
}

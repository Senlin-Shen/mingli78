
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Only POST allowed', { status: 405 });
  }

  try {
    const body = await req.json();

    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.API_KEY}`
      },
      body: JSON.stringify({
        ...body,
        stream: true // 强制开启流式输出以优化体验
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(`火山引擎代理错误: ${errorText}`, { status: response.status });
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (err: any) {
    return new Response(`代理系统故障: ${err.message}`, { status: 500 });
  }
}

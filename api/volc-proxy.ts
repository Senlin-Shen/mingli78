
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Only POST requests are allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const apiKey = process.env.VOLC_API_KEY;
  const endpointId = process.env.VOLC_ENDPOINT_ID;
  const baseUrl = process.env.VOLC_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';

  if (!apiKey || !endpointId) {
    return new Response(JSON.stringify({ error: 'Missing VOLC_API_KEY or VOLC_ENDPOINT_ID environment variables' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const incomingBody = await req.json();

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
        stream: true // 开启流式转发
      })
    });

    if (!volcResponse.ok) {
      const errorData = await volcResponse.text();
      return new Response(JSON.stringify({ error: `Volcengine API Error: ${errorData}` }), { 
        status: volcResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 将火山引擎的流直接透传给前端
    return new Response(volcResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: `Proxy failure: ${error.message}` }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

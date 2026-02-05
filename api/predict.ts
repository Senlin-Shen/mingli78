
export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '服务端未配置 API_KEY，请在 Vercel 中设置环境变量' });
  }

  try {
    const { model, messages } = req.body;

    /**
     * 严格遵循用户 curl 示例的数据结构：
     * "input": [ { "role": "user", "content": [ { "type": "input_text", "text": "..." } ] } ]
     */
    const formattedInput = messages.map((m: any) => ({
      role: m.role,
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
        model: model, // 这里填入 ep- 开头的 Endpoint ID
        input: formattedInput,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ark API Error:', errorText);
      return res.status(response.status).json({ 
        error: `API 异常 (HTTP ${response.status})`,
        details: errorText 
      });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body?.getReader();
    if (!reader) throw new Error('无法读取响应流');

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();

  } catch (error: any) {
    console.error('Proxy Error:', error);
    return res.status(500).json({ 
      error: '代理服务器连接异常',
      message: error.message 
    });
  }
}

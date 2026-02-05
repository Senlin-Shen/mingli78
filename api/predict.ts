
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

    // 使用标准的 OpenAI 兼容接口路径，这通常能解决鉴权格式问题
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model, // 这里对应您的推理接入点 ID (ep-xxxx)
        messages: messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('火山引擎返回错误:', errorText);
      return res.status(response.status).json({ 
        error: `API 响应异常 (HTTP ${response.status})`,
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
    console.error('代理服务器内部错误:', error);
    return res.status(500).json({ 
      error: '代理服务器内部错误',
      message: error.message 
    });
  }
}

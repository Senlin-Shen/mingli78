
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // 从环境变量读取 API_KEY
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    return new Response(JSON.stringify({ 
      error: '服务端未检测到 API_KEY', 
      details: '配置指引：请在 Vercel 控制台 Environment Variables 中添加：Key 为 API_KEY，Value 为您的秘钥字符串。' 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  try {
    const { model, messages } = await req.json();

    if (!model || !model.startsWith('ep-')) {
      return new Response(JSON.stringify({ 
        error: 'Endpoint ID 格式不正确', 
        details: '请在网页输入框填写 ep- 开头的推理接入点 ID，而非 API Key。' 
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 转换消息格式以适配火山引擎 v3/responses 规范
    const formattedInput = messages.map((m: any) => ({
      role: m.role,
      content: [
        {
          type: "input_text",
          text: m.content
        }
      ]
    }));

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
        error: `火山引擎返回错误 (${response.status})`,
        details: errorText 
      }), { 
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ 
      error: '代理服务异常',
      message: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

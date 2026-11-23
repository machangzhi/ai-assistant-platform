
import { aiConfig } from '../../config/ai.config.js';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekResponse {
  id: string;
  model: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function callDeepSeek(
  messages: ChatMessage[]
): Promise<DeepSeekResponse> {
  if (!aiConfig.apiKey) {
    throw new Error('DEEPSEEK_API_KEY 未配置');
  }

  const response = await fetch(
    `${aiConfig.baseURL}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages,
        stream: false
      }),
      signal: AbortSignal.timeout(60000)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `DeepSeek API 请求失败：${response.status} ${errorText}`
    );
  }

  return response.json() as Promise<DeepSeekResponse>;
}

export async function* streamDeepSeek(
  messages: ChatMessage[],
  signal?: AbortSignal
): AsyncGenerator<string> {
  if (!aiConfig.apiKey) {
    throw new Error('DEEPSEEK_API_KEY 未配置');
  }

  const response = await fetch(
    `${aiConfig.baseURL}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages,
        stream: true
      }),
      signal: signal ?? AbortSignal.timeout(60000)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `DeepSeek API 请求失败：${response.status} ${errorText}`
    );
  }

  if (!response.body) {
    throw new Error('DeepSeek 未返回流式数据');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, '\n');

      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      for (const event of events) {
        const data = event
          .split('\n')
          .filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).trim())
          .join('\n');

        if (!data || data === '[DONE]') continue;

        const parsed = JSON.parse(data);

        const content =
          parsed.choices?.[0]?.delta?.content;

        if (typeof content === 'string' && content) {
          yield content;
        }
      }
    }

    buffer += decoder.decode();

    if (buffer.trim()) {
      const data = buffer
        .split('\n')
        .filter(line => line.startsWith('data:'))
        .map(line => line.slice(5).trim())
        .join('\n');

      if (data && data !== '[DONE]') {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;

        if (typeof content === 'string' && content) {
          yield content;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
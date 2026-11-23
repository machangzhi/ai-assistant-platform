
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

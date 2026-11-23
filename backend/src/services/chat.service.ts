
import { callDeepSeek } from '../ai/models/deepseek.js';

export async function chatWithAI(message: string) {
    const messages = [
        {
            role: 'system' as const,
            content: `
                你是一个 AI 技术助手，通过 DeepSeek API 提供服务。

                你的主要职责是帮助用户解决前端、后端和人工智能应用开发问题。

                请遵守以下规则：
                1. 使用中文回答。
                2. 不得声称自己是 Claude、GPT 或其他模型。
                3. 不确定的信息必须明确说明。
                4. 回答技术问题时，尽量解释原理并提供可运行的代码。
                5. 不要编造自己的知识截止日期或技术能力。
            `
        },
        {
            role: 'user' as const,
            content: message
        }
    ];

    const result = await callDeepSeek(messages);

    return {
        answer: result.choices[0]?.message.content ?? '',
        model: result.model,
        usage: result.usage
    };
}

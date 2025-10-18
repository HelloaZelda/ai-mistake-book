// lib/ai.ts
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_SILICON_KEY,
  baseURL: process.env.EXPO_PUBLIC_SILICON_BASE || 'https://api.siliconflow.cn/v1',
});

/**
 * 统一的提示词：让模型返回 JSON，包含答案、步骤、知识点和错因。
 */
const SYSTEM_PROMPT = `你是一位严谨的数学老师。请严格输出JSON，字段：
{
  "answer": string,                 // 标准答案（可含 LaTeX）
  "steps": string,                  // 详细步骤
  "knowledge_points": string[],     // 知识点数组，如 ["二次函数","导数单调性"]
  "error_analysis": string          // 易错点/错因提示
}
只输出JSON，不要多余文字。`;

export async function solveOneImageBase64(base64: string) {
  const res = await client.chat.completions.create({
    model: 'deepseek-math-7b-instruct', // 可换 qwen2-72b-instruct / internlm2-math 等
    temperature: 0.2,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: '识别并解答这道数学题，给出JSON结果：' },
          { type: 'image_url', image_url: `data:image/jpeg;base64,${base64}` },
        ],
      },
    ],
  });

  const text = res.choices?.[0]?.message?.content || '';
  // 尝试解析 JSON（有时模型会包裹markdown）
  const json = safeJson(text);
  return json;
}

function safeJson(s: string) {
  try {
    // 去除```json … ```壳
    const cleaned = s.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      answer: '',
      steps: s,
      knowledge_points: [],
      error_analysis: 'AI 返回非标准JSON，已原样保存。',
    };
  }
}

import OpenAI from 'openai';

export interface MistakeAnalysis {
  questionType: string;
  solution: string;
  errorReason: string;
  knowledgePoints: string[];
}

const client = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_SILICON_KEY,
  baseURL: process.env.EXPO_PUBLIC_SILICON_BASE || 'https://api.siliconflow.cn/v1',
});

const SYSTEM_PROMPT = `你是一位精通数学的老师。请阅读学生上传的题目图片，识别题目并输出一个 JSON 对象，字段如下：
{
  "questionType": "选择题或解答题等中文描述",
  "solution": "详细的解题步骤和答案，可以使用 LaTeX",
  "errorReason": "学生常犯的错误原因",
  "knowledgePoints": ["知识点1", "知识点2"]
}
请严格输出 JSON，禁止额外文字。`;

export async function analyzeMistakeImage(base64: string): Promise<MistakeAnalysis> {
  const response = await client.chat.completions.create({
    model: 'deepseek-math-7b-instruct',
    temperature: 0.2,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: '请分析这道题目，输出指定 JSON：' },
          { type: 'image_url', image_url: `data:image/png;base64,${base64}` },
        ] as any,
      },
    ],
  } as any);

  const text = response.choices?.[0]?.message?.content ?? '';
  return parseAnalysis(text);
}

function parseAnalysis(content: string): MistakeAnalysis {
  try {
    const cleaned = content.replace(/```json|```/g, '').trim();
    const json = JSON.parse(cleaned);
    return {
      questionType: json.questionType ?? json.type ?? '未分类',
      solution: json.solution ?? json.steps ?? '',
      errorReason: json.errorReason ?? json.error_analysis ?? '',
      knowledgePoints: Array.isArray(json.knowledgePoints)
        ? json.knowledgePoints
        : Array.isArray(json.knowledge_points)
        ? json.knowledge_points
        : [],
    };
  } catch (err) {
    console.warn('解析 AI 响应失败，将使用兜底数据', err);
    return {
      questionType: '未分类',
      solution: content,
      errorReason: 'AI 返回非标准 JSON，请检查提示词。',
      knowledgePoints: [],
    };
  }
}

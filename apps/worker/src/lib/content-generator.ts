import { OpenAI } from 'openai';
import { AutomationKeywords, TonePreset, ContentIntent } from '@ai-links/shared-types';
import { getLogger } from './logger.js';
import { z } from 'zod';

export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const GeneratedContentSchema = z.object({
  content: z.string().min(10).max(3000),
  hashtags: z.array(z.string()).optional(),
  emoji: z.array(z.string()).optional(),
});

type GeneratedContent = z.infer<typeof GeneratedContentSchema>;

interface GenerationContext {
  keyword: string;
  keywords: AutomationKeywords;
  previousContent?: string[];
}

class ContentGenerator {
  private openai: OpenAI;
  private logger = getLogger();

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required');
    }
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  private getToneDescription(tone: TonePreset): string {
    const toneMap: Record<TonePreset, string> = {
      [TonePreset.PROFESSIONAL]: 'professional and formal tone',
      [TonePreset.FRIENDLY]: 'friendly and conversational tone',
      [TonePreset.EDUCATIONAL]: 'educational and informative tone',
      [TonePreset.INSPIRATIONAL]: 'inspirational and motivational tone',
      [TonePreset.HUMOROUS]: 'humorous and witty tone',
    };
    return toneMap[tone];
  }

  private getIntentDescriptions(intents: ContentIntent[]): string {
    const intentMap: Record<ContentIntent, string> = {
      [ContentIntent.KNOWLEDGE_SHARING]: 'share knowledge and insights',
      [ContentIntent.QUESTION]: 'ask thoughtful questions to engage the community',
      [ContentIntent.INDUSTRY_NEWS]: 'comment on industry trends and news',
      [ContentIntent.PERSONAL_STORY]: 'share a personal or professional story',
      [ContentIntent.CALL_TO_ACTION]: 'inspire people to take action',
    };

    return intents.map((intent) => intentMap[intent]).join(', or ');
  }

  async generatePost(context: GenerationContext): Promise<GeneratedContent> {
    const { keyword, keywords } = context;

    const prompt = `You are a LinkedIn content expert. Generate an engaging LinkedIn post about "${keyword}".

Tone: ${this.getToneDescription(keywords.tonePreset)}
Intent: The post should ${this.getIntentDescriptions(keywords.allowedIntents)}
Related topics: ${keywords.primaryKeywords.join(', ')}

Avoid these topics: ${keywords.blockedKeywords.join(', ')}

Guidelines:
- Keep it authentic and genuine
- Use natural language, not overly promotional
- Include relevant hashtags if appropriate
- Use 1-3 emojis for visual appeal
- Length: 150-500 characters
- Make it shareable and comment-worthy

Generate ONLY the post content, without any meta information.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content || '';

      this.logger.info(
        { keyword, tokensUsed: response.usage?.total_tokens },
        'Post generated successfully'
      );

      return {
        content: content.trim(),
      };
    } catch (error) {
      this.logger.error({ error, keyword }, 'Failed to generate post');
      throw error;
    }
  }

  async generateComment(
    postContent: string,
    context: GenerationContext
  ): Promise<GeneratedContent> {
    const { keyword, keywords } = context;

    const prompt = `You are a LinkedIn engagement expert. Generate a thoughtful comment on a LinkedIn post about "${keyword}".

Original post excerpt: "${postContent.substring(0, 200)}..."

Tone: ${this.getToneDescription(keywords.tonePreset)}
Intent: The comment should ${this.getIntentDescriptions(keywords.allowedIntents)}

Guidelines:
- Be genuine and add value to the conversation
- Ask a follow-up question or provide insight
- Keep it concise (50-200 characters)
- Don't be overly promotional
- Use 0-2 emojis if it adds value

Generate ONLY the comment text, without any meta information.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 150,
      });

      const content = response.choices[0]?.message?.content || '';

      this.logger.info(
        { keyword, tokensUsed: response.usage?.total_tokens },
        'Comment generated successfully'
      );

      return {
        content: content.trim(),
      };
    } catch (error) {
      this.logger.error({ error, keyword }, 'Failed to generate comment');
      throw error;
    }
  }

  validateContent(content: GeneratedContent): boolean {
    try {
      GeneratedContentSchema.parse(content);
      return true;
    } catch (error) {
      this.logger.warn({ error }, 'Content validation failed');
      return false;
    }
  }
}

export const contentGenerator = new ContentGenerator();

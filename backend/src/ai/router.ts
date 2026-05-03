import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { db, supabase } from '../db/supabase';
import { cache } from '../db/redis';
import { buildSystemPrompt, buildMenuContext, buildConversationHistory } from './prompts';
import { logger } from '../utils/logger';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface AIResponse {
  reply: string;
  intent: string;
  tokensUsed: number;
  costUsd: number;
  orderData?: any;
}

interface ProcessMessageParams {
  restaurantId: string;
  sessionId: string;
  guestProfileId: string;
  userMessage: string;
  phoneNumber: string;
}

function routeQuery(userMessage: string): 'fast' | 'smart' | 'premium' {
  const lower = userMessage.toLowerCase();
  const medicalKeywords = ['allerg', 'gluten', 'nut', 'dairy', 'shellfish', 'peanut'];
  if (medicalKeywords.some(kw => lower.includes(kw))) return 'premium';
  const complexKeywords = ['why', 'compare', 'suggest', 'pair', 'mood', 'recommend', 'best for'];
  if (complexKeywords.some(kw => lower.includes(kw))) return 'smart';
  return 'fast';
}

export async function processMessage(params: ProcessMessageParams): Promise<AIResponse> {
  const { restaurantId, sessionId, userMessage } = params;

  try {
    // Get restaurant config
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single();

    // Get menu context (cached)
    let menuItems = await cache.getMenuContext(restaurantId);
    if (!menuItems) {
      menuItems = await db.getMenuItems(restaurantId);
      await cache.setMenuContext(restaurantId, menuItems);
    }

    // Get conversation history (last 5 messages)
    const { data: conversationHistory } = await supabase
      .from('conversation_logs')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(5);

    const systemPrompt = buildSystemPrompt(
      restaurant?.name || 'The Restaurant',
      restaurant?.ai_tone_config || {}
    );
    const menuContext = buildMenuContext(menuItems || []);
    const history = buildConversationHistory(
      Array.isArray(conversationHistory) ? [...conversationHistory].reverse() : []
    );

    const tier = routeQuery(userMessage);
    let reply: string;
    let tokensUsed: number;
    let costUsd: number;

    if (tier === 'fast') {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `${systemPrompt}\n\nMenu:\n${menuContext}\n\nHistory:\n${history}` },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 200,
        temperature: 0.7
      });
      reply = response.choices[0].message.content || 'I apologize, I could not process that.';
      tokensUsed = response.usage?.total_tokens || 0;
      costUsd = tokensUsed * 0.00000015;

    } else if (tier === 'smart') {
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        system: `${systemPrompt}\n\nMenu:\n${menuContext}\n\nHistory:\n${history}`,
        messages: [{ role: 'user', content: userMessage }]
      });
      reply = response.content[0].type === 'text'
        ? response.content[0].text
        : 'I apologize, I could not process that.';
      tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
      costUsd = tokensUsed * 0.0000005;

    } else {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 400,
        system: `${systemPrompt}\n\nMenu:\n${menuContext}\n\nHistory:\n${history}`,
        messages: [{ role: 'user', content: userMessage }]
      });
      reply = response.content[0].type === 'text'
        ? response.content[0].text
        : 'I apologize, I could not process that.';
      tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
      costUsd = tokensUsed * 0.000003;
    }

    const intent = detectIntent(userMessage);
    if (intent === 'ORDER') {
      logger.info('Order intent detected', { sessionId, userMessage });
    }

    return { reply, intent, tokensUsed, costUsd };

  } catch (error: unknown) {
    logger.error('Error processing message:', error);
    return {
      reply: 'I apologize, I encountered an error. Please try again or speak with our staff.',
      intent: 'ERROR',
      tokensUsed: 0,
      costUsd: 0
    };
  }
}

function detectIntent(userMessage: string): string {
  const lower = userMessage.toLowerCase();
  if (lower.includes('order') || lower.includes("i'll have") || lower.includes('get me')) return 'ORDER';
  if (lower.includes('pay') || lower.includes('bill') || lower.includes('check')) return 'PAYMENT';
  if (lower.includes('complaint') || lower.includes('problem') || lower.includes('issue')) return 'COMPLAINT';
  if (lower.includes('what') || lower.includes('how') || lower.includes('is there')) return 'QUESTION';
  return 'CHITCHAT';
}

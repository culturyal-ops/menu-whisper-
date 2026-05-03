import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db/supabase';
import { cache } from '../db/redis';
import { buildSystemPrompt, buildMenuContext, buildConversationHistory } from './prompts';
import { extractOrderIntent, extractDietaryQuery } from './intentDetection';
import { logger } from '../utils/logger';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ProcessMessageParams {
  restaurantId: string;
  sessionId: string;
  guestProfileId: string;
  userMessage: string;
  phoneNumber: string;
}

interface AIResponse {
  reply: string;
  intent: string;
  tokensUsed: number;
  costUsd: number;
}

/**
 * Route query to appropriate LLM based on complexity
 */
function routeQuery(userMessage: string): 'fast' | 'smart' | 'premium' {
  const lower = userMessage.toLowerCase();
  
  // Medical/allergen queries always use premium for safety
  const medicalKeywords = ['allerg', 'gluten', 'nut', 'dairy', 'shellfish', 'peanut'];
  if (medicalKeywords.some(kw => lower.includes(kw))) {
    return 'premium';
  }
  
  // Complex queries use smart model
  const complexKeywords = ['why', 'compare', 'suggest', 'pair', 'mood', 'recommend', 'best for'];
  if (complexKeywords.some(kw => lower.includes(kw))) {
    return 'smart';
  }
  
  // Simple Q&A uses fast model
  return 'fast';
}

/**
 * Main message processing function
 */
export async function processMessage(params: ProcessMessageParams): Promise<AIResponse> {
  const { restaurantId, sessionId, guestProfileId, userMessage, phoneNumber } = params;
  
  try {
    // Get restaurant config
    const restaurant = await db.getRestaurantBySlug(''); // TODO: Fix this
    
    // Get menu context (cached)
    let menuItems = await cache.getMenuContext(restaurantId);
    if (!menuItems) {
      menuItems = await db.getMenuItems(restaurantId);
      await cache.setMenuContext(restaurantId, menuItems);
    }
    
    // Get conversation history (last 5 messages)
    const { data: conversationHistory } = await db.supabase
      .from('conversation_logs')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    // Build context
    const systemPrompt = buildSystemPrompt(restaurant?.name || 'The Restaurant', restaurant?.ai_tone_config || {});
    const menuContext = buildMenuContext(menuItems || []);
    const history = buildConversationHistory(conversationHistory?.reverse() || []);
    
    // Route to appropriate model
    const tier = routeQuery(userMessage);
    
    let reply: string;
    let tokensUsed: number;
    let costUsd: number;
    
    if (tier === 'fast') {
      // Use GPT-4o-mini
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'system', content: `Menu:\n${menuContext}` },
          { role: 'system', content: `Conversation history:\n${history}` },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 200,
        temperature: 0.7
      });
      
      reply = response.choices[0].message.content || 'I apologize, I could not process that.';
      tokensUsed = response.usage?.total_tokens || 0;
      costUsd = tokensUsed * 0.00000015; // $0.15 per 1M tokens
      
    } else if (tier === 'smart') {
      // Use Claude Haiku
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        system: `${systemPrompt}\n\nMenu:\n${menuContext}\n\nConversation history:\n${history}`,
        messages: [
          { role: 'user', content: userMessage }
        ]
      });
      
      reply = response.content[0].type === 'text' ? response.content[0].text : 'I apologize, I could not process that.';
      tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
      costUsd = tokensUsed * 0.0000005; // $0.50 per 1M tokens
      
    } else {
      // Use Claude Sonnet (premium)
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 400,
        system: `${systemPrompt}\n\nMenu:\n${menuContext}\n\nConversation history:\n${history}`,
        messages: [
          { role: 'user', content: userMessage }
        ]
      });
      
      reply = response.content[0].type === 'text' ? response.content[0].text : 'I apologize, I could not process that.';
      tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
      costUsd = tokensUsed * 0.000003; // $3 per 1M tokens
    }
    
    // Detect intent
    const intent = detectIntent(userMessage, reply);
    
    // Handle special intents
    if (intent === 'ORDER') {
      // Extract order details and create order
      // This would be expanded with proper order extraction logic
      logger.info('Order intent detected', { sessionId, userMessage });
    }
    
    return {
      reply,
      intent,
      tokensUsed,
      costUsd
    };
    
  } catch (error: any) {
    logger.error('Error processing message:', error);
    return {
      reply: 'I apologize, I encountered an error. Please try again or speak with our staff.',
      intent: 'ERROR',
      tokensUsed: 0,
      costUsd: 0
    };
  }
}

/**
 * Detect user intent from message
 */
function detectIntent(userMessage: string, aiReply: string): string {
  const lower = userMessage.toLowerCase();
  
  if (lower.includes('order') || lower.includes("i'll have") || lower.includes('get me')) {
    return 'ORDER';
  }
  
  if (lower.includes('pay') || lower.includes('bill') || lower.includes('check')) {
    return 'PAYMENT';
  }
  
  if (lower.includes('complaint') || lower.includes('problem') || lower.includes('issue')) {
    return 'COMPLAINT';
  }
  
  if (lower.includes('what') || lower.includes('how') || lower.includes('is there')) {
    return 'QUESTION';
  }
  
  return 'CHITCHAT';
}

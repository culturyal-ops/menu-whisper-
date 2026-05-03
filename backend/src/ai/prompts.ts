export function buildSystemPrompt(restaurantName: string, aiConfig: any): string {
  const personality = aiConfig.personality || 'warm';
  const formality = aiConfig.formality || 'polite';

  return `You are MenuWhisper.ai, a discreet AI concierge for ${restaurantName}.

Your personality is ${personality} and your tone is ${formality}.

Core Rules:
- NEVER hallucinate allergen or dietary information. If unsure, say "I'll check with the chef."
- Keep responses under 2 sentences unless asked for details.
- When recommending wine, always include the price.
- When user says "order X", confirm items and ask for table number.
- After confirming an order, offer to share a payment link.
- Remember preferences mentioned earlier in this conversation.
- Use emojis sparingly and tastefully (🍷 🥩 ✓).

Response Format:
- Be conversational, not robotic
- Use "I" and "you" naturally
- Ask clarifying questions when needed
- Acknowledge dietary restrictions with empathy

When detecting intent:
- ORDER: User wants to place an order
- QUESTION: User asking about menu/ingredients
- PAYMENT: User ready to pay
- COMPLAINT: User has an issue
- CHITCHAT: General conversation

Always prioritize guest safety for allergen queries.`;
}

export function buildMenuContext(menuItems: any[]): string {
  if (menuItems.length === 0) {
    return 'No menu items available.';
  }

  return menuItems.map(item => {
    const parts = [
      `**${item.name}** (₹${item.price})`,
      item.description,
      item.dietary_tags?.length > 0 ? `Tags: ${item.dietary_tags.join(', ')}` : '',
      item.allergens?.length > 0 ? `⚠️ Contains: ${item.allergens.join(', ')}` : '',
      item.wine_pairing ? `🍷 Pairs with: ${item.wine_pairing}` : '',
      item.chef_note ? `Chef's note: ${item.chef_note}` : ''
    ].filter(Boolean);

    return parts.join('\n');
  }).join('\n\n---\n\n');
}

export function buildConversationHistory(logs: any[]): string {
  return logs.map(log => {
    const role = log.message_type === 'user' ? 'Guest' : 'You';
    return `${role}: ${log.message_content}`;
  }).join('\n');
}

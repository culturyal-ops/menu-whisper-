/**
 * Extract order intent from user message
 */
export function extractOrderIntent(message: string): {
  isOrder: boolean;
  items: string[];
  tableNumber?: string;
} {
  const lower = message.toLowerCase();
  
  const orderKeywords = [
    "i'll have",
    "i want",
    "order",
    "get me",
    "can i get",
    "i'd like"
  ];
  
  const isOrder = orderKeywords.some(kw => lower.includes(kw));
  
  // Extract table number
  const tableMatch = message.match(/table\s+(\d+)/i);
  const tableNumber = tableMatch ? tableMatch[1] : undefined;
  
  // Simple item extraction (would be enhanced with NER)
  const items: string[] = [];
  
  return {
    isOrder,
    items,
    tableNumber
  };
}

/**
 * Extract dietary query
 */
export function extractDietaryQuery(message: string): {
  isDietaryQuery: boolean;
  restrictions: string[];
} {
  const lower = message.toLowerCase();
  
  const dietaryKeywords = [
    'vegan',
    'vegetarian',
    'gluten-free',
    'gluten free',
    'keto',
    'halal',
    'kosher',
    'dairy-free',
    'dairy free',
    'nut-free',
    'nut free',
    'allergic'
  ];
  
  const restrictions = dietaryKeywords.filter(kw => lower.includes(kw));
  
  return {
    isDietaryQuery: restrictions.length > 0,
    restrictions
  };
}

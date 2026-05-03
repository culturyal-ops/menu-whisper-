import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database helper functions
export const db = {
  async getRestaurantBySlug(slug: string) {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('slug', slug)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getRestaurantByWhatsAppNumber(phoneNumberId: string) {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('whatsapp_number_id', phoneNumberId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getMenuItems(restaurantId: string, available: boolean = true) {
    const query = supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId);
    
    if (available) {
      query.eq('is_available', true);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async findOrCreateGuestProfile(restaurantId: string, phoneNumberHash: string) {
    // Try to find existing
    const { data: existing } = await supabase
      .from('guest_profiles')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('wa_number_hash', phoneNumberHash)
      .single();
    
    if (existing) {
      // Update visit count and last visit
      await supabase
        .from('guest_profiles')
        .update({
          visit_count: existing.visit_count + 1,
          last_visit: new Date().toISOString()
        })
        .eq('id', existing.id);
      
      return existing;
    }
    
    // Create new
    const { data: newProfile, error } = await supabase
      .from('guest_profiles')
      .insert({
        restaurant_id: restaurantId,
        wa_number_hash: phoneNumberHash
      })
      .select()
      .single();
    
    if (error) throw error;
    return newProfile;
  },

  async createOrUpdateSession(
    restaurantId: string,
    guestProfileId: string,
    phoneNumber: string
  ) {
    // Check for active session
    const { data: existing } = await supabase
      .from('sessions')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('guest_profile_id', guestProfileId)
      .eq('status', 'active')
      .single();
    
    if (existing) {
      // Update last message time
      await supabase
        .from('sessions')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', existing.id);
      
      return existing;
    }
    
    // Create new session
    const { data: newSession, error } = await supabase
      .from('sessions')
      .insert({
        restaurant_id: restaurantId,
        guest_profile_id: guestProfileId,
        wa_phone_number: phoneNumber,
        status: 'active'
      })
      .select()
      .single();
    
    if (error) throw error;
    return newSession;
  },

  async logConversation(
    restaurantId: string,
    sessionId: string,
    messageType: 'user' | 'ai' | 'system',
    content: string,
    intent?: string,
    tokensUsed?: number,
    costUsd?: number
  ) {
    await supabase.from('conversation_logs').insert({
      restaurant_id: restaurantId,
      session_id: sessionId,
      message_type: messageType,
      message_content: content,
      intent_detected: intent,
      tokens_used: tokensUsed,
      cost_usd: costUsd
    });
  },

  async createOrder(orderData: {
    restaurant_id: string;
    session_id: string;
    guest_profile_id: string;
    table_number: string;
    items: any[];
    subtotal: number;
    tax: number;
    total: number;
  }) {
    const { data, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateOrderStatus(orderId: string, status: string) {
    const updates: any = { status };
    
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    }
    
    await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId);
  },

  async updateOrderPaymentStatus(orderId: string, paymentStatus: string, paymentId?: string) {
    await supabase
      .from('orders')
      .update({
        payment_status: paymentStatus,
        payment_id: paymentId
      })
      .eq('id', orderId);
  }
};

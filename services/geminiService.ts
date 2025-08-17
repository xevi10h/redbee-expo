import { supabase } from '@/lib/supabase';

interface GeminiResponse {
  success: boolean;
  response?: string;
  error?: string;
  remaining_requests?: number;
}

class GeminiService {
  constructor() {
    console.log('🚀 Gemini Service initialized with secure backend');
  }

  async generateResponse(userMessage: string, userId: string): Promise<string> {
    try {
      // Get current user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Usuario no autenticado');
      }

      // Call secure Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: {
          message: userMessage,
          user_id: userId,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Error al conectar con el asistente');
      }

      const response: GeminiResponse = data;

      if (!response.success) {
        throw new Error(response.error || 'Error generando respuesta');
      }

      return response.response || 'No se pudo generar una respuesta';

    } catch (error) {
      console.error('Error calling Gemini service:', error);
      
      // Return user-friendly error messages
      if (error instanceof Error) {
        if (error.message.includes('límite') || error.message.includes('consultas')) {
          throw new Error('Has alcanzado el límite de 5 consultas cada 2 horas. Inténtalo más tarde.');
        }
        if (error.message.includes('no autenticado')) {
          throw new Error('Necesitas iniciar sesión para usar el asistente IA.');
        }
        throw new Error(error.message);
      }
      
      throw new Error('🚀 Disculpa, hay un problema temporal con la conexión. Te recomiendo intentar de nuevo en unos momentos.');
    }
  }

  // Método para obtener el uso restante del usuario (5 cada 2 horas)
  async getRemainingRequests(userId: string): Promise<number> {
    try {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
      
      const { data, error } = await supabase
        .from('ai_interactions')
        .select('created_at')
        .eq('user_id', userId)
        .gte('created_at', twoHoursAgo.toISOString());

      if (error) {
        console.error('Error getting usage:', error);
        return 5; // Default to max if error
      }

      const usedRequests = data?.length || 0;
      return Math.max(0, 5 - usedRequests);
    } catch (error) {
      console.error('Error checking remaining requests:', error);
      return 5; // Default to max if error
    }
  }
}

export const geminiService = new GeminiService();
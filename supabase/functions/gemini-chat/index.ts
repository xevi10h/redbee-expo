import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GeminiRequest {
  message: string;
  user_id: string;
}

interface GeminiResponse {
  success: boolean;
  response?: string;
  error?: string;
  remaining_requests?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { message, user_id }: GeminiRequest = await req.json()
    
    // Validate request
    if (!message || !user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Message and user_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user_id matches authenticated user
    if (user.id !== user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'User ID mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user profile for personalization
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('display_name, username')
      .eq('id', user_id)
      .single()

    let userName = 'usuario' // Default fallback
    if (profile) {
      userName = profile.display_name || profile.username || 'usuario'
    }

    console.log(`User ${user_id} (${userName}) making request`)
    

    // Check user rate limits (5 requests per 2 hours per user)
    const now = new Date()
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago
    
    // Use service role client for consistent access
    const serviceSupabaseForRead = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const { data: recentInteractions, error: interactionsError } = await serviceSupabaseForRead
      .from('ai_interactions')
      .select('created_at')
      .eq('user_id', user_id)
      .gte('created_at', twoHoursAgo.toISOString())
      .order('created_at', { ascending: false })

    if (interactionsError) {
      console.error('Error fetching recent interactions:', interactionsError)
    }

    const currentRequests = recentInteractions ? recentInteractions.length : 0
    const MAX_REQUESTS_PER_2HOURS = 5
    
    console.log(`Rate limit check for user ${user_id}: ${currentRequests}/${MAX_REQUESTS_PER_2HOURS} requests in last 2 hours`)
    
    if (currentRequests >= MAX_REQUESTS_PER_2HOURS) {
      // Calculate when the user can make their next request
      const oldestInteraction = recentInteractions[recentInteractions.length - 1]
      const oldestTime = new Date(oldestInteraction.created_at)
      const nextAvailableTime = new Date(oldestTime.getTime() + 2 * 60 * 60 * 1000) // 2 hours after oldest
      
      // Calculate time remaining
      const timeRemaining = nextAvailableTime.getTime() - now.getTime()
      const hoursRemaining = Math.floor(timeRemaining / (60 * 60 * 1000))
      const minutesRemaining = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000))
      
      let timeMessage = ''
      if (hoursRemaining > 0) {
        timeMessage = `${hoursRemaining} hora${hoursRemaining !== 1 ? 's' : ''} y ${minutesRemaining} minuto${minutesRemaining !== 1 ? 's' : ''}`
      } else {
        timeMessage = `${minutesRemaining} minuto${minutesRemaining !== 1 ? 's' : ''}`
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Has superado el límite de tu quota de RedBee AI (5 consultas cada 2 horas). Podrás volver a usar RedBee AI dentro de ${timeMessage}.`,
          remaining_requests: 0,
          next_available_at: nextAvailableTime.toISOString()
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Gemini API key from environment
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY not found in environment')
      return new Response(
        JSON.stringify({ success: false, error: 'Service temporarily unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare Gemini request
    const systemContext = `Eres RedBee AI, el asistente de contenido de la aplicación móvil RedBee, una red social especializada en contenido de video corto estilo TikTok/Instagram Reels.

IMPORTANTE: Eres un asistente general de contenido para creadores. NO tienes acceso al contenido específico de los usuarios, a sus analytics, ni a datos de su perfil. Proporcionas consejos generales basados en mejores prácticas de redes sociales.

Tu rol es ayudar a los creadores con consejos generales sobre:
- Estrategias de contenido para redes sociales de video corto
- Técnicas para aumentar engagement y visualizaciones
- Entender algoritmos de redes sociales (TikTok, Instagram Reels, etc.)
- Ideas para crear contenido viral y atractivo
- Mejores prácticas para hashtags y timing de publicación
- Tendencias actuales en video corto y redes sociales
- Consejos de producción y edición de video
- Estrategias de crecimiento en redes sociales

Características de tu personalidad:
- Profesional pero cercano y amigable
- Experto en redes sociales y marketing digital para video corto
- Das consejos prácticos y accionables basados en mejores prácticas generales
- Entiendes las tendencias actuales de redes sociales
- Usas emojis ocasionalmente para ser más dinámico (🚀, 📱, 🎯, ✨)
- Respondes en español principalmente (o en el idioma que te pregunten)
- Eres conciso pero completo en tus respuestas
- Formateas texto usando **negrita** para énfasis y * para bullet points

IMPORTANTE: Si te preguntan sobre analizar contenido específico, datos de perfil, o analytics, explica amablemente que eres un asistente general y que pronto habrá una versión integrada con sus datos.

La audiencia son creadores de contenido que buscan consejos generales para hacer crecer sus cuentas en redes sociales.`

    const fullPrompt = `${systemContext}\n\nUsuario (${userName}): ${message}\n\nRedBee AI:`

    // Call Gemini API
    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiApiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: fullPrompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    })

    if (!geminiResponse.ok) {
      console.error('Gemini API error:', await geminiResponse.text())
      return new Response(
        JSON.stringify({ success: false, error: 'Error generating response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const geminiData = await geminiResponse.json()
    const aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!aiResponse) {
      return new Response(
        JSON.stringify({ success: false, error: 'No response generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log the interaction using service role client
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error: insertError } = await serviceSupabase
      .from('ai_interactions')
      .insert({
        user_id: user_id,
        message: message,
        response: aiResponse,
        created_at: new Date().toISOString()
      })
    
    if (insertError) {
      console.error('Error inserting AI interaction:', insertError)
    } else {
      console.log('AI interaction logged successfully for user:', user_id)
    }

    const remainingRequests = MAX_REQUESTS_PER_2HOURS - (currentRequests + 1)

    return new Response(
      JSON.stringify({ 
        success: true, 
        response: aiResponse,
        remaining_requests: remainingRequests
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
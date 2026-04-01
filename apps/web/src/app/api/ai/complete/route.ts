import { NextResponse } from 'next/server'
// import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  // const supabase = createClient()
  // const { data: { session } } = await supabase.auth.getSession()
  // Disable auth check temporarily for hackathon speed/ease of demo
  // if (!session) return new Response('Unauthorized', { status: 401 })

  const { prompt } = await req.json()

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'grok-beta',
      messages: [
        { role: 'system', content: 'You are an expert AI writing assistant embedded in a document editor. Provide concise, high-quality text completions or rewrites based on the user request. DO NOT output markdown formatting like ** or # unless requested.' },
        { role: 'user', content: prompt }
      ],
      stream: true,
    })
  })

  if (!response.ok) {
    return NextResponse.json({ error: 'Grok API error' }, { status: response.status })
  }

  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { description } = await req.json()

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'grok-beta',
      messages: [
        { role: 'system', content: 'You are a document template generator. Return ONLY valid Tiptap JSON (the "content" array of a doc node). No markdown, no explanation, no code fences. Create a well-structured template. Use headings, bullet lists, and placeholder text in [brackets]. Example format: [{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Title"}]},{"type":"paragraph","content":[{"type":"text","text":"..."}]}]' },
        { role: 'user', content: description }
      ],
      temperature: 0.2
    })
  })

  if (!response.ok) {
    return NextResponse.json({ error: 'Grok API error' }, { status: response.status })
  }

  const data = await response.json()
  const contentStr = data.choices[0].message.content
  
  try {
    let cleanJson = contentStr.trim()
    if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/```json/g, '').replace(/```/g, '').trim()
    }
    const json = JSON.parse(cleanJson)
    return NextResponse.json(json)
  } catch {
    return NextResponse.json([
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Template Error' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'The AI failed to generate a valid template. Please try again.' }] }
    ])
  }
}

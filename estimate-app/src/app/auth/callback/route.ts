import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nwvoqynqresaictepsrx.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53dm9xeW5xcmVzYWljdGVwc3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNTg2NjksImV4cCI6MjA2NjkzNDY2OX0.4nDAp3t723SMQBxyziN07iCBXxQPyHQhDoiX-G5AMZk'

export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'

    console.log('Auth callback:', { code: code?.substring(0, 10) + '...', next, origin })

    if (code) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      console.log('Exchange result:', { 
        success: !error, 
        error: error?.message,
        user: data?.user?.email 
      })
      
      if (!error && data?.user) {
        console.log('Redirecting to:', `${origin}${next}`)
        return NextResponse.redirect(`${origin}${next}`)
      } else {
        console.error('Auth exchange error:', error)
      }
    } else {
      console.log('No code parameter found')
    }

    return NextResponse.redirect(`${origin}/auth/auth-code-error?reason=exchange_failed`)
  } catch (err) {
    console.error('Callback error:', err)
    return NextResponse.redirect(`${request.nextUrl.origin}/auth/auth-code-error?reason=exception`)
  }
}
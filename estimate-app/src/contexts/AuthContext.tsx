'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // クライアントサイドでかつmounted後のみ実行
    if (!mounted) return

    const initSupabase = async () => {
      const { supabase: client } = await import('../../lib/supabase')
      
      const { data: { session } } = await client.auth.getSession()
      
      if (session?.user) {
        // 初期セッション取得時にもusersテーブルにレコードを作成
        await client
          .from('users')
          .upsert({
            id: session.user.id,
            email: session.user.email!,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          })
          .select()
      }
      
      setUser(session?.user ?? null)
      setLoading(false)
      
      const { data: { subscription } } = client.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            // ユーザーがサインインした時、usersテーブルにレコードを作成（既に存在する場合は何もしない）
            await client
              .from('users')
              .upsert({
                id: session.user.id,
                email: session.user.email!,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'id'
              })
              .select()
          }
          
          setUser(session?.user ?? null)
          setLoading(false)
        }
      )

      return subscription
    }

    const subscription = initSupabase()
    
    return () => {
      subscription.then(sub => sub?.unsubscribe())
    }
  }, [mounted])

  // マウント前は何も表示しない
  if (!mounted) {
    return null
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
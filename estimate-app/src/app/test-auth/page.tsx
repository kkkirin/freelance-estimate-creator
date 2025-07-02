'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function TestAuth() {
  const [email, setEmail] = useState('kinomotokirin@gmail.com')
  const [message, setMessage] = useState('')
  const router = useRouter()

  const testDirectSignIn = async () => {
    try {
      // テスト用：直接ユーザーを作成してサインイン
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: 'temp-password-123', // 一時的なパスワード
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      })

      if (error) {
        setMessage(`エラー: ${error.message}`)
      } else {
        setMessage('テストサインイン成功！ダッシュボードにリダイレクトします...')
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      }
    } catch (error) {
      setMessage(`予期しないエラー: ${error}`)
    }
  }

  const checkAuthState = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setMessage(session ? `ログイン済み: ${session.user?.email}` : 'ログインしていません')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            認証テスト
          </h2>
        </div>
        <div className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="メールアドレス"
          />
          
          <button
            onClick={testDirectSignIn}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
          >
            テスト用直接ログイン
          </button>

          <button
            onClick={checkAuthState}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md"
          >
            認証状態確認
          </button>

          <button
            onClick={() => router.push('/login')}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md"
          >
            通常ログインに戻る
          </button>

          {message && (
            <div className="p-3 bg-yellow-100 border border-yellow-400 rounded-md">
              <p className="text-sm">{message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
'use client'

export const dynamic = 'force-dynamic'

import { useAuth } from '../../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { signOut } from '../../../lib/auth'
import { supabase } from '../../../lib/supabase'
import { Estimate } from '../../../types/database.types'

export default function Dashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchEstimates()
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchEstimates = async () => {
    try {
      const { data, error } = await supabase
        .from('estimates')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setEstimates(data || [])
    } catch (error) {
      console.error('Error fetching estimates:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-white">見積もりダッシュボード</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300">{user.email}</span>
              <button
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-white">見積もり一覧</h2>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/templates')}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium border border-gray-600"
              >
                テンプレート管理
              </button>
              <button
                onClick={() => router.push('/estimates/new')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                新しい見積もりを作成
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : estimates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">まだ見積もりが作成されていません。</p>
              <button
                onClick={() => router.push('/estimates/new')}
                className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md text-base font-medium"
              >
                最初の見積もりを作成する
              </button>
            </div>
          ) : (
            <div className="bg-gray-800 shadow overflow-hidden sm:rounded-md border border-gray-700">
              <ul className="divide-y divide-gray-700">
                {estimates.map((estimate) => (
                  <li key={estimate.id}>
                    <div className="px-4 py-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-indigo-400 truncate">
                          {estimate.title}
                        </p>
                        <p className="text-sm text-gray-300">
                          金額: ¥{estimate.total.toLocaleString()} | 
                          修正回数: {estimate.revisions_used}/{estimate.revision_limit}
                        </p>
                        <p className="text-xs text-gray-500">
                          作成日: {new Date(estimate.created_at).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => router.push(`/estimates/${estimate.id}`)}
                          className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => router.push(`/share/${estimate.share_token}`)}
                          className="text-green-400 hover:text-green-300 text-sm font-medium"
                        >
                          共有
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
'use client'

export const dynamic = 'force-dynamic'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function AuthCodeErrorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')

  const getErrorMessage = () => {
    switch (reason) {
      case 'exchange_failed':
        return 'Magic Linkの認証コードの処理に失敗しました。リンクが期限切れの可能性があります。'
      case 'exception':
        return 'システムエラーが発生しました。'
      default:
        return 'Magic Linkの処理中にエラーが発生しました。'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
            ログインエラー
          </h2>
          <p className="text-gray-600 mb-6">
            {getErrorMessage()}
          </p>
          {reason && (
            <p className="text-xs text-gray-400 mb-6">
              エラーコード: {reason}
            </p>
          )}
          <div className="space-y-3">
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md text-sm font-medium"
            >
              新しいMagic Linkを取得
            </button>
            <button
              onClick={() => router.push('/test-auth')}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md text-sm font-medium"
            >
              テスト認証を試す
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md text-sm font-medium"
            >
              ホームに戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthCodeError() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <AuthCodeErrorContent />
    </Suspense>
  )
}
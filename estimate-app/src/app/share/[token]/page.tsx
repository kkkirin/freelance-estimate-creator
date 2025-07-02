'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import { EstimateWithLineItems, LineItem, RevisionLog } from '../../../../types/database.types'

export default function ShareEstimate({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter()
  const [estimate, setEstimate] = useState<EstimateWithLineItems | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [revisionLogs, setRevisionLogs] = useState<RevisionLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadEstimate = async () => {
      const resolvedParams = await params
      if (resolvedParams.token) {
        fetchEstimate(resolvedParams.token)
      }
    }
    loadEstimate()
  }, [params])

  const fetchEstimate = async (token: string) => {
    try {
      const { data: estimateData, error } = await supabase
        .from('estimates')
        .select(`
          *,
          line_items (*),
          revision_logs (*)
        `)
        .eq('share_token', token)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          setError('見積もりが見つかりません。URLが正しいかご確認ください。')
        } else {
          setError('見積もりの取得中にエラーが発生しました。')
        }
        console.error('Error fetching estimate:', error)
        return
      }

      setEstimate(estimateData)
      setLineItems(estimateData.line_items?.sort((a: LineItem, b: LineItem) => a.order_index - b.order_index) || [])
      setRevisionLogs(estimateData.revision_logs || [])
    } catch (error) {
      console.error('Error fetching estimate:', error)
      setError('見積もりの取得中にエラーが発生しました。')
    } finally {
      setIsLoading(false)
    }
  }

  const generatePDF = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error || !estimate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">エラー</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    )
  }

  const remainingRevisions = estimate.revision_limit - estimate.revisions_used
  const isRevisionLimitReached = remainingRevisions <= 0

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="print:hidden bg-gray-800 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.close()}
                className="text-gray-300 hover:text-white text-sm font-medium"
              >
                ← 戻る
              </button>
              <h1 className="text-2xl font-bold text-white">見積もり詳細</h1>
            </div>
            <button
              onClick={generatePDF}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              PDFで保存
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-gray-800 shadow overflow-hidden sm:rounded-lg border border-gray-700">
          <div className="px-4 py-5 sm:p-6">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">{estimate.title}</h2>
              <p className="text-sm text-gray-400">
                作成日: {new Date(estimate.created_at).toLocaleDateString('ja-JP')}
              </p>
            </div>

            <div className="mb-8">
              <h3 className="text-lg font-medium text-white mb-4">作業項目</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-600">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        作業内容
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        時間
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        時間単価
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        金額
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-600">
                    {lineItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{item.name}</div>
                          {item.memo && (
                            <div className="text-sm text-gray-400">{item.memo}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {item.hours}h
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          ¥{item.hourly_rate.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                          ¥{item.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-700">
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-right text-base font-medium text-white">
                        合計金額:
                      </td>
                      <td className="px-6 py-4 text-base font-bold text-indigo-400">
                        ¥{estimate.total.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="bg-blue-900 bg-opacity-30 rounded-lg p-6 border border-blue-700">
                <h3 className="text-lg font-medium text-white mb-4">修正ポリシー</h3>
                <div className="space-y-2">
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">修正回数上限:</span> {estimate.revision_limit}回
                  </p>
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">追加修正単価:</span> ¥{estimate.extra_revision_rate.toLocaleString()}/回
                  </p>
                  <div className="mt-4 pt-4 border-t border-blue-600">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-white">現在の修正状況:</span>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${isRevisionLimitReached ? 'text-red-600' : 'text-green-600'}`}>
                          {remainingRevisions}回残り
                        </div>
                        <div className="text-xs text-gray-400">
                          ({estimate.revisions_used} / {estimate.revision_limit} 使用済み)
                        </div>
                      </div>
                    </div>
                    {isRevisionLimitReached && (
                      <div className="mt-2 p-3 bg-red-900 bg-opacity-50 border border-red-600 rounded-md">
                        <p className="text-sm text-red-300">
                          修正回数上限に達しました。追加修正は別途¥{estimate.extra_revision_rate.toLocaleString()}が発生します。
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {revisionLogs.length > 0 && (
                <div className="bg-gray-700 rounded-lg p-6 border border-gray-600">
                  <h3 className="text-lg font-medium text-white mb-4">修正履歴</h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {revisionLogs
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((log) => (
                        <div key={log.id} className="border-l-4 border-indigo-400 pl-4">
                          <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-white">
                              修正 {log.used_number}回目
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(log.created_at).toLocaleDateString('ja-JP')}
                            </p>
                          </div>
                          {log.memo && (
                            <p className="text-sm text-gray-300 mt-1">{log.memo}</p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-600 pt-6">
              <div className="bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-300">
                      重要事項
                    </h3>
                    <div className="mt-2 text-sm text-yellow-200">
                      <ul className="list-disc list-inside space-y-1">
                        <li>上記金額には消費税は含まれておりません</li>
                        <li>修正回数を超過した場合、追加料金が発生いたします</li>
                        <li>制作期間は別途打ち合わせにて決定いたします</li>
                        <li>本見積もりの有効期限は発行日から30日間です</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="print:hidden mt-8 text-center">
              <p className="text-sm text-gray-400">
                この見積もりについてご質問がございましたら、お気軽にお問い合わせください。
              </p>
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
'use client'

export const dynamic = 'force-dynamic'

import { useAuth } from '../../../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import { EstimateWithLineItems, RevisionLog, NewRevisionLog, LineItem } from '../../../../types/database.types'

interface LineItemForm {
  id: string
  name: string
  hours: number
  hourly_rate: number
  memo: string
  amount: number
  isNew?: boolean
}

export default function EstimateDetail({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [estimate, setEstimate] = useState<EstimateWithLineItems | null>(null)
  const [lineItems, setLineItems] = useState<LineItemForm[]>([])
  const [title, setTitle] = useState('')
  const [revisionLimit, setRevisionLimit] = useState(2)
  const [extraRevisionRate, setExtraRevisionRate] = useState(5000)
  const [revisionsUsed, setRevisionsUsed] = useState(0)
  const [revisionLogs, setRevisionLogs] = useState<RevisionLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [revisionMemo, setRevisionMemo] = useState('')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    const loadEstimate = async () => {
      const resolvedParams = await params
      if (user && resolvedParams.id) {
        fetchEstimate(resolvedParams.id)
      }
    }
    loadEstimate()
  }, [user, params]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchEstimate = async (estimateId: string) => {
    try {
      const { data: estimateData, error } = await supabase
        .from('estimates')
        .select(`
          *,
          line_items (*),
          revision_logs (*)
        `)
        .eq('id', estimateId)
        .eq('user_id', user?.id)
        .single()

      if (error) {
        console.error('Error fetching estimate:', error)
        router.push('/dashboard')
        return
      }

      setEstimate(estimateData)
      setTitle(estimateData.title)
      setRevisionLimit(estimateData.revision_limit)
      setExtraRevisionRate(estimateData.extra_revision_rate)
      setRevisionsUsed(estimateData.revisions_used)
      setRevisionLogs(estimateData.revision_logs || [])
      
      const formattedLineItems = estimateData.line_items
        .sort((a: LineItem, b: LineItem) => a.order_index - b.order_index)
        .map((item: LineItem) => ({
          id: item.id,
          name: item.name,
          hours: item.hours,
          hourly_rate: item.hourly_rate,
          memo: item.memo || '',
          amount: item.amount
        }))
      
      setLineItems(formattedLineItems)
    } catch (error) {
      console.error('Error fetching estimate:', error)
      router.push('/dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  const addLineItem = () => {
    const newItem: LineItemForm = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      hours: 0,
      hourly_rate: 0,
      memo: '',
      amount: 0,
      isNew: true
    }
    setLineItems([...lineItems, newItem])
  }

  const updateLineItem = (id: string, field: keyof LineItemForm, value: string | number) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        if (field === 'hours' || field === 'hourly_rate') {
          updated.amount = updated.hours * updated.hourly_rate
        }
        return updated
      }
      return item
    }))
  }

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id))
  }

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.amount, 0)
  }

  const calculateTotal = () => {
    return calculateSubtotal()
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !estimate) return

    setIsSubmitting(true)

    try {
      const subtotal = calculateSubtotal()
      const total = calculateTotal()

      const { error: estimateError } = await supabase
        .from('estimates')
        .update({
          title: title.trim(),
          subtotal,
          total,
          revision_limit: revisionLimit,
          extra_revision_rate: extraRevisionRate,
          updated_at: new Date().toISOString()
        })
        .eq('id', estimate.id)

      if (estimateError) throw estimateError

      const { error: deleteError } = await supabase
        .from('line_items')
        .delete()
        .eq('estimate_id', estimate.id)

      if (deleteError) throw deleteError

      const newLineItems = lineItems.map((item, index) => ({
        estimate_id: estimate.id,
        name: item.name,
        hours: item.hours,
        hourly_rate: item.hourly_rate,
        memo: item.memo || null,
        amount: item.amount,
        order_index: index
      }))

      const { error: lineItemsError } = await supabase
        .from('line_items')
        .insert(newLineItems)

      if (lineItemsError) throw lineItemsError

      alert('見積もりが更新されました')
      fetchEstimate(estimate.id)
    } catch (error) {
      console.error('Error updating estimate:', error)
      alert('見積もりの更新中にエラーが発生しました。')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUseRevision = async () => {
    if (!estimate || revisionsUsed >= revisionLimit) return

    const newRevisionLog: NewRevisionLog = {
      estimate_id: estimate.id,
      used_number: revisionsUsed + 1,
      memo: revisionMemo || null
    }

    try {
      const { error: logError } = await supabase
        .from('revision_logs')
        .insert(newRevisionLog)

      if (logError) throw logError

      const { error: updateError } = await supabase
        .from('estimates')
        .update({ revisions_used: revisionsUsed + 1 })
        .eq('id', estimate.id)

      if (updateError) throw updateError

      setRevisionsUsed(revisionsUsed + 1)
      setRevisionMemo('')
      alert('修正回数を消化しました')
      fetchEstimate(estimate.id)
    } catch (error) {
      console.error('Error using revision:', error)
      alert('修正回数の消化中にエラーが発生しました。')
    }
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!estimate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">見積もりが見つかりません</h2>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
          >
            ダッシュボードに戻る
          </button>
        </div>
      </div>
    )
  }

  const remainingRevisions = revisionLimit - revisionsUsed
  const isRevisionLimitReached = remainingRevisions <= 0

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-white">見積もり編集</h1>
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  console.log('Share token:', estimate.share_token)
                  console.log('Share URL:', `/share/${estimate.share_token}`)
                  window.open(`/share/${estimate.share_token}`, '_blank')
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                共有リンクを開く
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-300 hover:text-white text-sm font-medium"
              >
                ダッシュボードに戻る
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="bg-gray-800 shadow px-4 py-5 sm:rounded-lg sm:p-6 border border-gray-700">
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6">
                    <label htmlFor="title" className="block text-sm font-medium text-gray-300">
                      見積もりタイトル
                    </label>
                    <input
                      type="text"
                      name="title"
                      id="title"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400"
                    />
                  </div>

                  <div className="col-span-3">
                    <label htmlFor="revision_limit" className="block text-sm font-medium text-gray-300">
                      修正回数上限
                    </label>
                    <input
                      type="number"
                      name="revision_limit"
                      id="revision_limit"
                      min="0"
                      value={revisionLimit}
                      onChange={(e) => setRevisionLimit(parseInt(e.target.value) || 0)}
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-600 rounded-md bg-gray-700 text-white"
                    />
                  </div>

                  <div className="col-span-3">
                    <label htmlFor="extra_revision_rate" className="block text-sm font-medium text-gray-300">
                      追加修正単価（円）
                    </label>
                    <input
                      type="number"
                      name="extra_revision_rate"
                      id="extra_revision_rate"
                      min="0"
                      value={extraRevisionRate}
                      onChange={(e) => setExtraRevisionRate(parseInt(e.target.value) || 0)}
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-600 rounded-md bg-gray-700 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 shadow px-4 py-5 sm:rounded-lg sm:p-6 border border-gray-700">
                <h3 className="text-lg font-medium leading-6 text-white mb-4">作業項目</h3>
                <div className="space-y-4">
                  {lineItems.map((item, index) => (
                    <div key={item.id} className="border border-gray-600 rounded-lg p-4 bg-gray-700">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-medium text-white">作業項目 {index + 1}</h4>
                        {lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLineItem(item.id)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            削除
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-6 gap-4">
                        <div className="col-span-6">
                          <input
                            type="text"
                            placeholder="作業名"
                            value={item.name}
                            onChange={(e) => updateLineItem(item.id, 'name', e.target.value)}
                            className="block w-full shadow-sm sm:text-sm border-gray-600 rounded-md bg-gray-600 text-white placeholder-gray-400"
                            required
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            placeholder="時間"
                            step="0.5"
                            min="0"
                            value={item.hours}
                            onChange={(e) => updateLineItem(item.id, 'hours', parseFloat(e.target.value) || 0)}
                            className="block w-full shadow-sm sm:text-sm border-gray-600 rounded-md bg-gray-600 text-white placeholder-gray-400"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            placeholder="時間単価"
                            min="0"
                            value={item.hourly_rate}
                            onChange={(e) => updateLineItem(item.id, 'hourly_rate', parseInt(e.target.value) || 0)}
                            className="block w-full shadow-sm sm:text-sm border-gray-600 rounded-md bg-gray-600 text-white placeholder-gray-400"
                          />
                        </div>
                        <div className="col-span-2">
                          <div className="text-sm text-white py-2">
                            ¥{item.amount.toLocaleString()}
                          </div>
                        </div>
                        <div className="col-span-6">
                          <textarea
                            placeholder="メモ（任意）"
                            value={item.memo}
                            onChange={(e) => updateLineItem(item.id, 'memo', e.target.value)}
                            rows={2}
                            className="block w-full shadow-sm sm:text-sm border-gray-600 rounded-md bg-gray-600 text-white placeholder-gray-400"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="w-full border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-gray-500 bg-gray-700"
                  >
                    <span className="text-sm text-gray-300">+ 作業項目を追加</span>
                  </button>
                </div>
              </div>

              <div className="bg-gray-800 shadow px-4 py-5 sm:rounded-lg sm:p-6 border border-gray-700">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-white">合計金額</h3>
                    <p className="text-3xl font-bold text-indigo-400">¥{calculateTotal().toLocaleString()}</p>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md text-sm font-medium disabled:opacity-50"
                  >
                    {isSubmitting ? '更新中...' : '見積もりを更新'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-gray-800 shadow px-4 py-5 sm:rounded-lg sm:p-6 mb-6 border border-gray-700">
              <h3 className="text-lg font-medium text-white mb-4">修正回数管理</h3>
              <div className="text-center mb-4">
                <div className={`text-3xl font-bold ${isRevisionLimitReached ? 'text-red-600' : 'text-green-600'}`}>
                  {remainingRevisions}
                </div>
                <div className="text-sm text-gray-400">残り修正回数</div>
                <div className="text-xs text-gray-500 mt-1">
                  {revisionsUsed} / {revisionLimit} 使用済み
                </div>
              </div>

              {!isRevisionLimitReached && (
                <div className="space-y-3">
                  <textarea
                    placeholder="修正内容のメモ（任意）"
                    value={revisionMemo}
                    onChange={(e) => setRevisionMemo(e.target.value)}
                    rows={3}
                    className="block w-full shadow-sm sm:text-sm border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400"
                  />
                  <button
                    onClick={handleUseRevision}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-md text-sm font-medium"
                  >
                    修正回数を消化
                  </button>
                </div>
              )}

              {isRevisionLimitReached && (
                <div className="text-center p-4 bg-red-900 bg-opacity-50 rounded-lg">
                  <p className="text-sm text-red-300">修正回数上限に達しました</p>
                  <p className="text-xs text-red-400 mt-1">
                    追加修正: ¥{extraRevisionRate.toLocaleString()}/回
                  </p>
                </div>
              )}
            </div>

            {revisionLogs.length > 0 && (
              <div className="bg-gray-800 shadow px-4 py-5 sm:rounded-lg sm:p-6 border border-gray-700">
                <h3 className="text-lg font-medium text-white mb-4">修正履歴</h3>
                <div className="space-y-3">
                  {revisionLogs
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((log) => (
                      <div key={log.id} className="border-l-4 border-indigo-400 pl-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-white">
                              修正 {log.used_number}回目
                            </p>
                            {log.memo && (
                              <p className="text-sm text-gray-300 mt-1">{log.memo}</p>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(log.created_at).toLocaleString('ja-JP')}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
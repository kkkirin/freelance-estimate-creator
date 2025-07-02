'use client'

export const dynamic = 'force-dynamic'

import { useAuth } from '../../../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import type { Template, NewEstimate, NewLineItem } from '../../../../types/database.types'

interface LineItemForm {
  id: string
  name: string
  hours: number
  hourly_rate: number
  memo: string
  amount: number
}

// 定義済みの作業項目
const PREDEFINED_TASKS = {
  MV: [
    { name: '企画・構成', hours: 4, memo: 'コンセプト設計、絵コンテ作成' },
    { name: '撮影', hours: 8, memo: 'ロケーション撮影、スタジオ撮影' },
    { name: '編集', hours: 12, memo: 'カット編集、色調補正、音響調整' },
    { name: '納品', hours: 2, memo: 'ファイル書き出し、納品準備' }
  ],
  CM: [
    { name: '企画・提案', hours: 6, memo: 'コンセプト企画、提案資料作成' },
    { name: '撮影', hours: 10, memo: 'メイン撮影、追加撮影' },
    { name: '編集・CG', hours: 16, memo: 'カット編集、CG制作、エフェクト' },
    { name: '音響・MA', hours: 4, memo: 'BGM、効果音、音響調整' },
    { name: '納品', hours: 2, memo: 'ファイル書き出し、各種フォーマット対応' }
  ],
  VP: [
    { name: '企画・構成', hours: 4, memo: 'コンセプト設計、構成案作成' },
    { name: '撮影', hours: 6, memo: 'インタビュー撮影、会社紹介撮影' },
    { name: '編集', hours: 10, memo: 'カット編集、テロップ制作' },
    { name: '納品', hours: 2, memo: 'ファイル書き出し、納品準備' }
  ]
}

// スケジュール目安（営業日）
const SCHEDULE_ESTIMATES = {
  MV: { days: 14, description: '企画から納品まで約2-3週間' },
  CM: { days: 21, description: '企画から納品まで約3-4週間' },
  VP: { days: 12, description: '企画から納品まで約2週間' }
}

// デフォルトの注意事項
const DEFAULT_TERMS = `・修正回数が規定回数を超える場合、追加費用が発生する可能性があります
・制作期間は作業開始日からの目安となります
・最終的なスケジュールは打ち合わせにて調整いたします
・素材提供の遅れにより制作期間が延長する場合があります
・お支払いは制作開始前に50%、納品時に残り50%となります`

export default function NewEstimate() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [title, setTitle] = useState('')
  const [lineItems, setLineItems] = useState<LineItemForm[]>([])
  const [revisionLimit, setRevisionLimit] = useState(2)
  const [extraRevisionRate, setExtraRevisionRate] = useState(5000)
  const [estimatedStartDate, setEstimatedStartDate] = useState('')
  const [estimatedDurationDays, setEstimatedDurationDays] = useState(0)
  const [notes, setNotes] = useState('')
  const [termsAndConditions, setTermsAndConditions] = useState(DEFAULT_TERMS)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchTemplates()
    }
  }, [user])

  const fetchTemplates = async () => {
    try {
      const { data: systemTemplates, error: systemError } = await supabase
        .from('system_templates')
        .select('*')
        .order('name')

      let userTemplates = []
      if (user?.id) {
        const { data: userTemplatesData, error: userError } = await supabase
          .from('templates')
          .select('*')
          .eq('user_id', user.id)
          .order('name')

        if (!userError) {
          userTemplates = userTemplatesData || []
        }
      }

      const convertedSystemTemplates = (systemTemplates || []).map(template => ({
        ...template,
        user_id: null,
        template_type: 'system'
      }))

      const convertedUserTemplates = userTemplates.map(template => ({
        ...template,
        template_type: 'user'
      }))

      const allTemplates = [...convertedSystemTemplates, ...convertedUserTemplates]
      setTemplates(allTemplates)
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template)
    setRevisionLimit(template.default_revision_limit)
    setExtraRevisionRate(template.default_extra_revision_rate)
    
    // テンプレートに基づいて定義済み作業項目を追加
    const templateKey = template.name.includes('MV') ? 'MV' : 
                       template.name.includes('CM') ? 'CM' : 
                       template.name.includes('VP') ? 'VP' : null
    
    if (templateKey && PREDEFINED_TASKS[templateKey]) {
      const predefinedItems = PREDEFINED_TASKS[templateKey].map((task, index) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: task.name,
        hours: task.hours,
        hourly_rate: template.default_hourly_rate,
        memo: task.memo,
        amount: task.hours * template.default_hourly_rate
      }))
      setLineItems(predefinedItems)
      
      // スケジュール目安を設定
      if (SCHEDULE_ESTIMATES[templateKey]) {
        setEstimatedDurationDays(SCHEDULE_ESTIMATES[templateKey].days)
      }
    } else {
      // デフォルトの作業項目を1つ追加
      addLineItem(template.default_hourly_rate)
    }
    
    setCurrentStep(2)
  }
  
  // 終了予定日を計算
  const calculateEndDate = () => {
    if (!estimatedStartDate || !estimatedDurationDays) return ''
    
    const startDate = new Date(estimatedStartDate)
    let endDate = new Date(startDate)
    let addedDays = 0
    
    // 営業日（土日を除く）で計算
    while (addedDays < estimatedDurationDays) {
      endDate.setDate(endDate.getDate() + 1)
      const dayOfWeek = endDate.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 日曜日(0)と土曜日(6)を除く
        addedDays++
      }
    }
    
    return endDate.toISOString().split('T')[0]
  }

  const addLineItem = (defaultRate?: number) => {
    const newItem: LineItemForm = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      hours: 0,
      hourly_rate: defaultRate || selectedTemplate?.default_hourly_rate || 0,
      memo: '',
      amount: 0
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

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + item.amount, 0)
  }

  const handleSubmit = async () => {
    if (!user || !title.trim() || lineItems.length === 0) return

    setIsSubmitting(true)

    try {
      const subtotal = calculateTotal()
      const total = calculateTotal()

      // 基本のestimateデータ（新しいフィールドを除外）
      const estimateData = {
        user_id: user.id,
        // システムテンプレートの場合はnullを設定（外部キー制約を回避）
        template_id: (selectedTemplate?.template_type === 'system') ? null : selectedTemplate?.id || null,
        title: title.trim(),
        subtotal,
        total,
        revision_limit: revisionLimit,
        extra_revision_rate: extraRevisionRate,
        revisions_used: 0
      }
      
      console.log('Creating estimate with data:', estimateData)

      const { data: estimate, error: estimateError } = await supabase
        .from('estimates')
        .insert(estimateData)
        .select()
        .single()

      if (estimateError) throw estimateError

      const newLineItems: NewLineItem[] = lineItems.map((item, index) => ({
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

      router.push(`/estimates/${estimate.id}`)
    } catch (error) {
      console.error('Error creating estimate:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      
      // エラーの詳細を表示
      let errorMessage = '見積もりの作成中にエラーが発生しました。'
      if (error?.message?.includes('column') && error?.message?.includes('does not exist')) {
        errorMessage = 'データベースの更新が必要です。システム管理者にお問い合わせください。'
      } else if (error?.message?.includes('foreign key constraint')) {
        errorMessage = 'テンプレートの関連付けでエラーが発生しました。再度お試しください。'
      } else if (error?.message?.includes('violates')) {
        errorMessage = 'データベース制約エラーが発生しました。入力内容を確認してください。'
      } else if (error?.message) {
        errorMessage = `エラー: ${error.message}`
      }
      
      alert(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-white">見積もり作成</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-300 hover:text-white text-sm font-medium"
            >
              ダッシュボードに戻る
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* ステップインジケーター */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-700 text-gray-400'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-16 h-1 mx-2 ${
                    step < currentStep ? 'bg-indigo-600' : 'bg-gray-700'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-3 text-sm text-gray-400">
            <span>テンプレート選択</span>
            <span>作業項目入力</span>
            <span>確認・作成</span>
          </div>
        </div>

        {/* Step 1: テンプレート選択 */}
        {currentStep === 1 && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-6">プロジェクトタイプを選択してください</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="p-6 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors border border-gray-600 hover:border-indigo-500 text-left"
                >
                  <div className="flex items-center mb-3">
                    <span className="text-2xl mr-3">
                      {template.template_type === 'system' ? '🌟' : '📁'}
                    </span>
                    <h3 className="text-lg font-medium text-white">{template.name}</h3>
                  </div>
                  <p className="text-indigo-400 font-medium mb-2">
                    ¥{template.default_hourly_rate.toLocaleString()}/時間
                  </p>
                  <p className="text-sm text-gray-400">
                    修正回数: {template.default_revision_limit}回まで無料
                  </p>
                  {template.name.includes('MV') && SCHEDULE_ESTIMATES.MV && (
                    <p className="text-xs text-gray-500 mt-1">
                      📅 {SCHEDULE_ESTIMATES.MV.description}
                    </p>
                  )}
                  {template.name.includes('CM') && SCHEDULE_ESTIMATES.CM && (
                    <p className="text-xs text-gray-500 mt-1">
                      📅 {SCHEDULE_ESTIMATES.CM.description}
                    </p>
                  )}
                  {template.name.includes('VP') && SCHEDULE_ESTIMATES.VP && (
                    <p className="text-xs text-gray-500 mt-1">
                      📅 {SCHEDULE_ESTIMATES.VP.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: 内容入力 */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">見積もり情報を入力</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    見積もりタイトル
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="例: 〇〇様 MV制作"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-medium text-white mb-4">作業項目</h3>
              <div className="space-y-4">
                {lineItems.map((item, index) => (
                  <div key={item.id} className="p-4 bg-gray-700 rounded-lg border border-gray-600">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-medium text-white">作業項目 {index + 1}</h4>
                      {lineItems.length > 1 && (
                        <button
                          onClick={() => removeLineItem(item.id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          削除
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <input
                        type="text"
                        placeholder="作業名"
                        value={item.name}
                        onChange={(e) => updateLineItem(item.id, 'name', e.target.value)}
                        className="px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400"
                      />
                      <input
                        type="number"
                        placeholder="時間"
                        step="0.5"
                        value={item.hours}
                        onChange={(e) => updateLineItem(item.id, 'hours', parseFloat(e.target.value) || 0)}
                        className="px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
                      />
                      <input
                        type="number"
                        placeholder="単価"
                        value={item.hourly_rate}
                        onChange={(e) => updateLineItem(item.id, 'hourly_rate', parseInt(e.target.value) || 0)}
                        className="px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
                      />
                      <div className="px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white">
                        ¥{item.amount.toLocaleString()}
                      </div>
                    </div>
                    <textarea
                      placeholder="メモ（任意）"
                      value={item.memo}
                      onChange={(e) => updateLineItem(item.id, 'memo', e.target.value)}
                      rows={2}
                      className="w-full mt-3 px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400"
                    />
                  </div>
                ))}
                
                <button
                  onClick={() => addLineItem()}
                  className="w-full py-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-300 hover:border-gray-500 hover:text-gray-200 transition-colors"
                >
                  + 作業項目を追加
                </button>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-medium text-white mb-4">注意事項</h3>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  見積もりに記載する注意事項を編集できます
                </label>
                <textarea
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors"
              >
                戻る
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                disabled={!title.trim() || lineItems.length === 0}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                確認へ
              </button>
            </div>
          </div>
        )}

        {/* Step 3: 確認・作成 */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-6">見積もり内容確認</h2>
              
              <div className="space-y-4">
                <div className="border-b border-gray-600 pb-4">
                  <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
                  <p className="text-gray-400">
                    テンプレート: {selectedTemplate?.template_type === 'system' ? '🌟' : '📁'} {selectedTemplate?.name}
                  </p>
                </div>

                <div className="space-y-3">
                  {lineItems.map((item, index) => (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-700">
                      <div className="flex-1">
                        <p className="text-white font-medium">{item.name}</p>
                        <p className="text-sm text-gray-400">
                          {item.hours}時間 × ¥{item.hourly_rate.toLocaleString()}/h
                          {item.memo && ` - ${item.memo}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">¥{item.amount.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 注意事項 */}
                <div className="border-t border-gray-600 pt-4">
                  <h4 className="text-lg font-medium text-white mb-2">⚠️ 注意事項</h4>
                  <div className="text-gray-300 text-sm bg-gray-700 p-3 rounded whitespace-pre-wrap">
                    {termsAndConditions}
                  </div>
                </div>

                <div className="border-t border-gray-600 pt-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-2xl font-bold text-white">合計: ¥{calculateTotal().toLocaleString()}</p>
                      <p className="text-sm text-gray-400 mt-1">
                        修正回数: {revisionLimit}回まで無料、追加1回あたり¥{extraRevisionRate.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors"
              >
                戻る
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-8 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isSubmitting ? '作成中...' : '見積もりを作成'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
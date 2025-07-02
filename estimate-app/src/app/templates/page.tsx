'use client'

export const dynamic = 'force-dynamic'

import { useAuth } from '../../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { Template } from '../../../types/database.types'

export default function Templates() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    default_hourly_rate: 0,
    default_revision_limit: 2,
    default_extra_revision_rate: 5000
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchTemplates()
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('user_id', user?.id)
        .order('name')

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('templates')
          .update({
            name: formData.name,
            default_hourly_rate: formData.default_hourly_rate,
            default_revision_limit: formData.default_revision_limit,
            default_extra_revision_rate: formData.default_extra_revision_rate,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTemplate.id)

        if (error) throw error
        alert('テンプレートが更新されました')
      } else {
        const { error } = await supabase
          .from('templates')
          .insert({
            user_id: user.id,
            name: formData.name,
            default_hourly_rate: formData.default_hourly_rate,
            default_revision_limit: formData.default_revision_limit,
            default_extra_revision_rate: formData.default_extra_revision_rate
          })

        if (error) throw error
        alert('テンプレートが作成されました')
      }

      setShowForm(false)
      setEditingTemplate(null)
      setFormData({
        name: '',
        default_hourly_rate: 0,
        default_revision_limit: 2,
        default_extra_revision_rate: 5000
      })
      fetchTemplates()
    } catch (error) {
      console.error('Error saving template:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      alert(`テンプレートの保存中にエラーが発生しました: ${error?.message || 'Unknown error'}`)
    }
  }

  const handleEdit = (template: Template) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      default_hourly_rate: template.default_hourly_rate,
      default_revision_limit: template.default_revision_limit,
      default_extra_revision_rate: template.default_extra_revision_rate
    })
    setShowForm(true)
  }

  const handleDelete = async (template: Template) => {
    if (!confirm(`「${template.name}」を削除してもよろしいですか？`)) return

    try {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', template.id)

      if (error) throw error
      alert('テンプレートが削除されました')
      fetchTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      alert('テンプレートの削除中にエラーが発生しました。')
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingTemplate(null)
    setFormData({
      name: '',
      default_hourly_rate: 0,
      default_revision_limit: 2,
      default_extra_revision_rate: 5000
    })
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
            <h1 className="text-3xl font-bold text-white">テンプレート管理</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-300 hover:text-white text-sm font-medium"
            >
              ダッシュボードに戻る
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-white">テンプレート一覧</h2>
            <button
              onClick={() => setShowForm(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              新しいテンプレートを作成
            </button>
          </div>

          {showForm && (
            <div className="bg-gray-800 shadow px-4 py-5 sm:rounded-lg sm:p-6 mb-6 border border-gray-700">
              <h3 className="text-lg font-medium text-white mb-4">
                {editingTemplate ? 'テンプレート編集' : '新しいテンプレート'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                    テンプレート名
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400"
                    placeholder="例: MV (Music Video)"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="default_hourly_rate" className="block text-sm font-medium text-gray-300">
                      デフォルト時間単価（円）
                    </label>
                    <input
                      type="number"
                      name="default_hourly_rate"
                      id="default_hourly_rate"
                      min="0"
                      required
                      value={formData.default_hourly_rate}
                      onChange={(e) => setFormData({ ...formData, default_hourly_rate: parseInt(e.target.value) || 0 })}
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-600 rounded-md bg-gray-700 text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="default_revision_limit" className="block text-sm font-medium text-gray-300">
                      デフォルト修正回数上限
                    </label>
                    <input
                      type="number"
                      name="default_revision_limit"
                      id="default_revision_limit"
                      min="0"
                      required
                      value={formData.default_revision_limit}
                      onChange={(e) => setFormData({ ...formData, default_revision_limit: parseInt(e.target.value) || 0 })}
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-600 rounded-md bg-gray-700 text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="default_extra_revision_rate" className="block text-sm font-medium text-gray-300">
                      デフォルト追加修正単価（円）
                    </label>
                    <input
                      type="number"
                      name="default_extra_revision_rate"
                      id="default_extra_revision_rate"
                      min="0"
                      required
                      value={formData.default_extra_revision_rate}
                      onChange={(e) => setFormData({ ...formData, default_extra_revision_rate: parseInt(e.target.value) || 0 })}
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-600 rounded-md bg-gray-700 text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="bg-gray-700 py-2 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 hover:bg-gray-600"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md text-sm font-medium"
                  >
                    {editingTemplate ? '更新' : '作成'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">まだテンプレートが作成されていません。</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md text-base font-medium"
              >
                最初のテンプレートを作成する
              </button>
            </div>
          ) : (
            <div className="bg-gray-800 shadow overflow-hidden sm:rounded-md border border-gray-700">
              <ul className="divide-y divide-gray-700">
                {templates.map((template) => (
                  <li key={template.id}>
                    <div className="px-4 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-indigo-400 truncate">
                            {template.name}
                          </p>
                          <div className="mt-2 flex flex-col sm:flex-row sm:items-center text-sm text-gray-300">
                            <span>時間単価: ¥{template.default_hourly_rate.toLocaleString()}/h</span>
                            <span className="hidden sm:inline mx-2">•</span>
                            <span>修正回数: {template.default_revision_limit}回</span>
                            <span className="hidden sm:inline mx-2">•</span>
                            <span>追加修正: ¥{template.default_extra_revision_rate.toLocaleString()}/回</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            作成日: {new Date(template.created_at).toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => handleEdit(template)}
                            className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(template)}
                            className="text-red-400 hover:text-red-300 text-sm font-medium"
                          >
                            削除
                          </button>
                        </div>
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
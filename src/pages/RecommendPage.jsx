import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const STATUS_META = {
  added:    { text: '검토중', color: 'bg-yellow-100 text-yellow-700' },
  approved: { text: '승인됨', color: 'bg-green-100 text-green-700' },
  rejected: { text: '반려됨', color: 'bg-red-100 text-red-700' },
}

const TABS = [
  { value: 'all',      label: '전체'  },
  { value: 'added',    label: '검토중' },
  { value: 'approved', label: '승인됨' },
  { value: 'rejected', label: '반려됨' },
]

function formatReviewer(rec) {
  if (!rec.reviewer_name) return '-'
  if (!rec.reviewed_at) return rec.reviewer_name
  const dateStr = new Date(rec.reviewed_at).toLocaleDateString('ko-KR')
  return rec.reviewer_name + ' / ' + dateStr
}

export default function RecommendPage() {
  const [vendors, setVendors]                   = useState([])
  const [recommendations, setRecommendations]   = useState([])
  const [profile, setProfile]                   = useState(null)
  const [loading, setLoading]                   = useState(true)
  const [refreshKey, setRefreshKey]             = useState(0)
  const [showModal, setShowModal]               = useState(false)
  const [selectedVendorId, setSelectedVendorId] = useState('')
  const [reason, setReason]                     = useState('')
  const [saving, setSaving]                     = useState(false)
  const [errorMsg, setErrorMsg]                 = useState('')
  const [successMsg, setSuccessMsg]             = useState('')
  const [search, setSearch]                     = useState('')
  const [statusFilter, setStatusFilter]         = useState('all')

  const isAdmin = profile?.role === 'admin' || profile?.role === 'purchasing'

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  const filtered = useMemo(() => {
    let list = recommendations
    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status === statusFilter)
    }
    const keyword = search.trim().toLowerCase()
    if (keyword) {
      list = list.filter(
        (r) =>
          r.vendors?.company_name?.toLowerCase().includes(keyword) ||
          r.reason?.toLowerCase().includes(keyword)
      )
    }
    return list
  }, [search, statusFilter, recommendations])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)

      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user
      if (!user || cancelled) { setLoading(false); return }

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const { data: vendorData } = await supabase
        .from('vendors')
        .select('id, company_name')
        .order('company_name', { ascending: true })

      const isAdminRole = prof?.role === 'admin' || prof?.role === 'purchasing'

      let query = supabase
        .from('vendor_recommendations')
        .select('id, reason, status, created_at, reviewed_at, recommended_by, reviewed_by, vendors ( company_name )')
        .order('created_at', { ascending: false })

      if (!isAdminRole) {
        query = query.eq('recommended_by', user.id)
      }

      const { data: recData, error: recError } = await query
      if (recError) {
        console.error('load error:', recError.message)
      }

      let enriched = recData ?? []

      if (enriched.length > 0) {
        const allUids = [
          ...new Set([
            ...enriched.map((r) => r.recommended_by).filter(Boolean),
            ...enriched.map((r) => r.reviewed_by).filter(Boolean),
          ]),
        ]

        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', allUids)

        const profileMap = Object.fromEntries(
          (profilesData ?? []).map((p) => [p.id, p.name])
        )

        enriched = enriched.map((r) => ({
          ...r,
          recommender_name: profileMap[r.recommended_by] ?? r.recommended_by,
          reviewer_name:    profileMap[r.reviewed_by]    ?? null,
        }))
      }

      if (!cancelled) {
        setProfile(prof)
        setVendors(vendorData ?? [])
        setRecommendations(enriched)
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [refreshKey])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedVendorId) { setErrorMsg('추천할 벤더를 선택해주세요.'); return }
    if (!reason.trim())    { setErrorMsg('추천 사유를 입력해주세요.');   return }

    setSaving(true)
    setErrorMsg('')

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData?.user) {
        setErrorMsg('인증 정보를 확인할 수 없습니다. 다시 로그인해주세요.')
        setSaving(false)
        return
      }

      const { error } = await supabase
        .from('vendor_recommendations')
        .insert([{
          vendor_id:      selectedVendorId,
          reason:         reason.trim(),
          recommended_by: authData.user.id,
          status:         'added',
        }])

      if (error) {
        setErrorMsg('저장 중 오류가 발생했습니다: ' + error.message)
        return
      }

      setShowModal(false)
      setSelectedVendorId('')
      setReason('')
      setSuccessMsg('추천이 등록되었습니다.')
      setTimeout(() => setSuccessMsg(''), 3000)
      refresh()
    } catch (err) {
      console.error('handleSubmit error:', err)
      setErrorMsg('예기치 않은 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (rec, newStatus) => {
    const label = newStatus === 'approved' ? '승인' : '반려'
    const companyName = rec.vendors?.company_name ?? ''
    if (!window.confirm('"' + companyName + '" 추천을 ' + label + '하시겠습니까?')) return

    try {
      const { data: authData } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('vendor_recommendations')
        .update({
          status:      newStatus,
          reviewed_by: authData.user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', rec.id)

      if (error) {
        alert('상태 변경 실패: ' + error.message)
      } else {
        refresh()
      }
    } catch (err) {
      console.error('handleStatusChange error:', err)
      alert('예기치 않은 오류가 발생했습니다.')
    }
  }

  const handleDelete = async (rec) => {
    const companyName = rec.vendors?.company_name ?? ''
    if (!window.confirm('"' + companyName + '" 추천 이력을 삭제하시겠습니까?')) return

    const { error } = await supabase
      .from('vendor_recommendations')
      .delete()
      .eq('id', rec.id)

    if (error) {
      alert('삭제 실패: ' + error.message)
    } else {
      setRecommendations((prev) => prev.filter((r) => r.id !== rec.id))
    }
  }

  const handleClose = () => {
    setShowModal(false)
    setSelectedVendorId('')
    setReason('')
    setErrorMsg('')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">추천 벤더</h1>
          <p className="text-sm text-gray-500 mt-1">
            우수 벤더를 추천하고 이력을 관리합니다.
            {!loading && (
              <span className="ml-2 text-blue-500 font-medium">
                {'총 ' + recommendations.length + '건'}
                {search && (' / 검색결과 ' + filtered.length + '건')}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + 추천 등록
        </button>
      </div>

      {successMsg && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {successMsg}
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="업체명, 추천 사유로 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={
                'px-3 py-2 text-xs rounded-lg font-medium transition-colors ' +
                (statusFilter === tab.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        {loading ? (
          <p className="text-center text-gray-400 text-sm py-12">불러오는 중...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-12">
            {search ? '검색 결과가 없습니다.' : '등록된 추천 이력이 없습니다.'}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">업체명</th>
                <th className="px-4 py-3 text-left">추천 사유</th>
                {isAdmin && <th className="px-4 py-3 text-left">추천자</th>}
                <th className="px-4 py-3 text-left">상태</th>
                <th className="px-4 py-3 text-left">추천일</th>
                <th className="px-4 py-3 text-left">검토자</th>
                <th className="px-4 py-3 text-left w-28">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((rec) => (
                <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                    {rec.vendors?.company_name ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs">
                    <p className="line-clamp-2">{rec.reason || '-'}</p>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {rec.recommender_name ?? '-'}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span className={
                      'px-2 py-1 rounded-full text-xs font-medium ' +
                      (STATUS_META[rec.status]?.color ?? 'bg-gray-100 text-gray-500')
                    }>
                      {STATUS_META[rec.status]?.text ?? rec.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {rec.created_at
                      ? new Date(rec.created_at).toLocaleDateString('ko-KR')
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                    {formatReviewer(rec)}
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin && rec.status === 'added' ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleStatusChange(rec, 'approved')}
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => handleStatusChange(rec, 'rejected')}
                          className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          반려
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDelete(rec)}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors"
                      >
                        삭제
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-5">추천 벤더 등록</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  벤더 선택 <span className="text-red-500">*</span>
                </label>
                {vendors.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">
                    등록된 벤더가 없습니다. 먼저 벤더를 등록해주세요.
                  </p>
                ) : (
                  <select
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  >
                    <option value="">-- 벤더를 선택하세요 --</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>{v.company_name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  추천 사유 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="추천 사유를 입력하세요."
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>
              {errorMsg && (
                <p className="text-red-500 text-xs">{errorMsg}</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={saving || vendors.length === 0}
                  className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? '저장 중...' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function TransactionPage() {
  const [transactions, setTransactions] = useState([])
  const [vendors, setVendors] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // 검색 / 필터
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // 모달
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({
    vendor_id: '',
    document_number: '',
    amount: '',
    description: '',
    transaction_date: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // 프로필 + 데이터 로드
  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(prof)
      }

      // 벤더 목록 (active만) ✅ Fix 3: name → company_name
      const { data: vendorData } = await supabase
        .from('vendors')
        .select('id, company_name')
        .eq('status', 'active')
        .order('company_name')
      setVendors(vendorData || [])

      // 거래 내역 (벤더명 조인) ✅ Fix 3: name → company_name
      let query = supabase
        .from('transactions')
        .select(`
          id,
          document_number,
          amount,
          description,
          transaction_date,
          created_at,
          registered_by,
          vendor_id,
          vendors ( company_name )
        `)
        .order('transaction_date', { ascending: false })

      if (dateFrom) query = query.gte('transaction_date', dateFrom)
      if (dateTo)   query = query.lte('transaction_date', dateTo)

      const { data: txData } = await query
      setTransactions(txData || [])
      setLoading(false)
    }

    load()
  }, [refreshKey, dateFrom, dateTo])

  // 검색 필터 (클라이언트) ✅ Fix 3: name → company_name
  const filtered = transactions.filter(tx => {
    const term = searchTerm.toLowerCase()
    return (
      (tx.vendors?.company_name || '').toLowerCase().includes(term) ||
      (tx.document_number || '').toLowerCase().includes(term) ||
      (tx.description || '').toLowerCase().includes(term)
    )
  })

  // 모달 열기 ✅ Fix 1: (tx =) → (tx = null)
  const openModal = (tx = null) => {
    setError('')
    if (tx) {
      setEditTarget(tx)
      setForm({
        vendor_id: tx.vendor_id || '',
        document_number: tx.document_number || '',
        amount: tx.amount || '',
        description: tx.description || '',
        transaction_date: tx.transaction_date || '',
      })
    } else {
      setEditTarget(null)
      setForm({
        vendor_id: '',
        document_number: '',
        amount: '',
        description: '',
        transaction_date: new Date().toISOString().split('T')[0],
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditTarget(null)
    setError('')
  }

  // 저장
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.vendor_id || !form.amount || !form.transaction_date) {
      setError('벤더, 금액, 거래일자는 필수 항목입니다.')
      return
    }

    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()

    const payload = {
      vendor_id: form.vendor_id,
      document_number: form.document_number || null,  // ✅ Fix 2: ||추가
      amount: parseFloat(form.amount),
      description: form.description || null,
      transaction_date: form.transaction_date,
      registered_by: user.id,
    }

    let err
    if (editTarget) {
      ;({ error: err } = await supabase
        .from('transactions')
        .update(payload)
        .eq('id', editTarget.id))
    } else {
      ;({ error: err } = await supabase
        .from('transactions')
        .insert([payload]))
    }

    setSubmitting(false)
    if (err) {
      setError('저장 중 오류가 발생했습니다: ' + err.message)
      return
    }
    closeModal()
    setRefreshKey(k => k + 1)
  }

  // 삭제
  const handleDelete = async (id) => {
    if (!window.confirm('이 거래 내역을 삭제하시겠습니까?')) return
    await supabase.from('transactions').delete().eq('id', id)
    setRefreshKey(k => k + 1)
  }

  // 금액 포맷
  const formatAmount = (v) =>
    Number(v).toLocaleString('ko-KR') + '원'

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">거래 내역</h1>
          <p className="text-sm text-gray-500 mt-1">벤더별 거래 내역을 관리합니다</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          + 거래 등록
        </button>
      </div>

      {/* 필터 영역 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-xs text-gray-500 mb-1">검색</label>
            <input
              type="text"
              placeholder="벤더명, 문서번호, 설명 검색..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">시작일</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">종료일</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {(searchTerm || dateFrom || dateTo) && (
            <button
              onClick={() => { setSearchTerm(''); setDateFrom(''); setDateTo('') }}
              className="text-sm text-gray-400 hover:text-gray-600 px-2 py-2"
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <svg className="animate-spin h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            불러오는 중...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm">거래 내역이 없습니다</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">거래일자</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">벤더명</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">문서번호</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">설명</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">금액</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-gray-600">{tx.transaction_date}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {/* ✅ Fix 3: name → company_name */}
                    {tx.vendors?.company_name || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    {tx.document_number || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                    {tx.description || '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-700">
                    {formatAmount(tx.amount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openModal(tx)}
                        className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                      >
                        수정
                      </button>
                      {profile?.role === 'admin' && (
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 합계 */}
      {filtered.length > 0 && (
        <div className="mt-3 text-right text-sm text-gray-500">
          총 <span className="font-semibold text-gray-700">{filtered.length}건</span>
          {' · '}
          합계{' '}
          <span className="font-bold text-blue-700">
            {formatAmount(filtered.reduce((sum, tx) => sum + Number(tx.amount), 0))}
          </span>
        </div>
      )}

      {/* 등록/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">
                {editTarget ? '거래 내역 수정' : '거래 등록'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg">
                  {error}
                </div>
              )}

              {/* 벤더 선택 ✅ Fix 3: v.name → v.company_name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  벤더 <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.vendor_id}
                  onChange={e => setForm(f => ({ ...f, vendor_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">벤더를 선택하세요</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.company_name}</option>
                  ))}
                </select>
              </div>

              {/* 거래일자 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  거래일자 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.transaction_date}
                  onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 금액 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  금액 (원) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="예: 1500000"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>

              {/* 문서번호 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">문서번호</label>
                <input
                  type="text"
                  placeholder="예: DOC-2024-001"
                  value={form.document_number}
                  onChange={e => setForm(f => ({ ...f, document_number: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 설명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <textarea
                  placeholder="거래 내용을 입력하세요"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? '저장 중...' : editTarget ? '수정 완료' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
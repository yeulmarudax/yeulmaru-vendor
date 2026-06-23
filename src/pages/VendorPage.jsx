import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../supabaseClient'

const INITIAL_FORM = {
  company_name: '',
  business_number: '',
  business_type: '',
  business_category: '',
  main_items: '',
  address: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  note: '',
}

export default function VendorPage() {
  const [vendors, setVendors] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [selected, setSelected] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState(INITIAL_FORM)
  const [editSaving, setEditSaving] = useState(false)
  const [editErrorMsg, setEditErrorMsg] = useState('')

  // ── 벤더 목록 최초 조회 ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    const fetchVendors = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('created_at', { ascending: false })
      if (!cancelled) {
        if (!error) setVendors(data ?? [])
        setLoading(false)
      }
    }
    fetchVendors()
    return () => { cancelled = true }
  }, [])

  // 등록·수정·삭제 후 목록 새로고침
  const refreshVendors = async () => {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setVendors(data ?? [])
  }

  // ── 검색 필터 ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return vendors
    return vendors.filter((v) =>
      v.company_name?.toLowerCase().includes(keyword) ||
      v.business_type?.toLowerCase().includes(keyword) ||
      v.contact_name?.toLowerCase().includes(keyword)
    )
  }, [search, vendors])

  // ── 등록 모달 핸들러 ────────────────────────────────────────
  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleClose = () => {
    setShowModal(false)
    setForm(INITIAL_FORM)
    setErrorMsg('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.company_name.trim()) {
      setErrorMsg('업체명은 필수 입력 항목입니다.')
      return
    }
    setSaving(true)
    setErrorMsg('')

    let userId = null
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      userId = sessionData?.session?.user?.id ?? null
    } catch {
      // 인증 정보를 가져오지 못해도 등록은 계속 진행
    }

    const { error } = await supabase.from('vendors').insert([{
      company_name:      form.company_name.trim(),
      business_number:   form.business_number.trim()   || null,
      business_type:     form.business_type.trim()     || null,
      business_category: form.business_category.trim() || null,
      main_items:        form.main_items.trim()        || null,
      address:           form.address.trim()           || null,
      contact_name:      form.contact_name.trim()      || null,
      contact_phone:     form.contact_phone.trim()     || null,
      contact_email:     form.contact_email.trim()     || null,
      note:              form.note.trim()              || null,
      registered_by:     userId,
    }])

    setSaving(false)
    if (error) {
      setErrorMsg('저장 중 오류가 발생했습니다: ' + error.message)
    } else {
      handleClose()
      await refreshVendors()
    }
  }

  // ── 상세 / 수정 모달 핸들러 ─────────────────────────────────
  const handleRowClick = (vendor) => {
    setSelected(vendor)
    setEditMode(false)
    setEditErrorMsg('')
  }

  const handleDetailClose = () => {
    setSelected(null)
    setEditMode(false)
    setEditForm(INITIAL_FORM)
    setEditErrorMsg('')
  }

  const handleEditStart = () => {
    setEditForm({
      company_name:      selected.company_name      ?? '',
      business_number:   selected.business_number   ?? '',
      business_type:     selected.business_type     ?? '',
      business_category: selected.business_category ?? '',
      main_items:        selected.main_items        ?? '',
      address:           selected.address           ?? '',
      contact_name:      selected.contact_name      ?? '',
      contact_phone:     selected.contact_phone     ?? '',
      contact_email:     selected.contact_email     ?? '',
      note:              selected.note              ?? '',
    })
    setEditErrorMsg('')
    setEditMode(true)
  }

  const handleEditChange = (e) => {
    setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editForm.company_name.trim()) {
      setEditErrorMsg('업체명은 필수 입력 항목입니다.')
      return
    }
    setEditSaving(true)
    setEditErrorMsg('')

    const { error } = await supabase
      .from('vendors')
      .update({
        company_name:      editForm.company_name.trim(),
        business_number:   editForm.business_number.trim()   || null,
        business_type:     editForm.business_type.trim()     || null,
        business_category: editForm.business_category.trim() || null,
        main_items:        editForm.main_items.trim()        || null,
        address:           editForm.address.trim()           || null,
        contact_name:      editForm.contact_name.trim()      || null,
        contact_phone:     editForm.contact_phone.trim()     || null,
        contact_email:     editForm.contact_email.trim()     || null,
        note:              editForm.note.trim()              || null,
        updated_at:        new Date().toISOString(),
      })
      .eq('id', selected.id)

    setEditSaving(false)
    if (error) {
      setEditErrorMsg('수정 중 오류가 발생했습니다: ' + error.message)
    } else {
      setSelected((prev) => ({
        ...prev,
        ...editForm,
        company_name:      editForm.company_name.trim(),
        business_number:   editForm.business_number.trim()   || null,
        business_type:     editForm.business_type.trim()     || null,
        business_category: editForm.business_category.trim() || null,
        main_items:        editForm.main_items.trim()        || null,
        address:           editForm.address.trim()           || null,
        contact_name:      editForm.contact_name.trim()      || null,
        contact_phone:     editForm.contact_phone.trim()     || null,
        contact_email:     editForm.contact_email.trim()     || null,
        note:              editForm.note.trim()              || null,
        updated_at:        new Date().toISOString(),
      }))
      setEditMode(false)
      await refreshVendors()
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`"${selected.company_name}" 벤더를 삭제하시겠습니까?`)) return
    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', selected.id)
    if (error) {
      setEditErrorMsg('삭제 중 오류가 발생했습니다: ' + error.message)
    } else {
      handleDetailClose()
      await refreshVendors()
    }
  }

  // ── ESC 키로 모달 닫기 ──────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return
      if (selected) {
        setSelected(null)
        setEditMode(false)
        setEditForm(INITIAL_FORM)
        setEditErrorMsg('')
        return
      }
      if (showModal) {
        setShowModal(false)
        setForm(INITIAL_FORM)
        setErrorMsg('')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showModal, selected])

  // ── 공통 input className ────────────────────────────────────
  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'

  return (
    <div>
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">벤더 목록</h1>
          <p className="text-sm text-gray-500 mt-1">
            등록된 공급사 목록을 관리합니다.
            {!loading && (
              <span className="ml-2 text-blue-500 font-medium">
                총 {vendors.length}개
                {search && ` · 검색결과 ${filtered.length}개`}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + 벤더 등록
        </button>
      </div>

      {/* 검색 */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="업체명 · 업종 · 담당자로 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-96 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        {loading ? (
          <p className="text-center text-gray-400 text-sm py-12">불러오는 중...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-12">
            {search ? '검색 결과가 없습니다.' : '등록된 벤더가 없습니다.'}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">업체명</th>
                <th className="px-4 py-3 text-left">사업자번호</th>
                <th className="px-4 py-3 text-left">업종</th>
                <th className="px-4 py-3 text-left">업태</th>
                <th className="px-4 py-3 text-left">주요품목</th>
                <th className="px-4 py-3 text-left">담당자</th>
                <th className="px-4 py-3 text-left">연락처</th>
                <th className="px-4 py-3 text-left">등록일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => handleRowClick(v)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{v.company_name}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{v.business_number || '-'}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{v.business_type || '-'}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{v.business_category || '-'}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{v.main_items || '-'}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{v.contact_name || '-'}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{v.contact_phone || '-'}</td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {v.created_at ? new Date(v.created_at).toLocaleDateString('ko-KR') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── 등록 모달 ── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-800 mb-5">벤더 등록</h2>
            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  업체명 <span className="text-red-500">*</span>
                </label>
                <input type="text" name="company_name" value={form.company_name}
                  onChange={handleChange} placeholder="예) (주)코스모스악기사"
                  className={inputCls} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">사업자등록번호</label>
                <input type="text" name="business_number" value={form.business_number}
                  onChange={handleChange} placeholder="000-00-00000" maxLength={12}
                  className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">업종</label>
                  <input type="text" name="business_type" value={form.business_type}
                    onChange={handleChange} placeholder="예) 음향, 악기"
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">업태</label>
                  <input type="text" name="business_category" value={form.business_category}
                    onChange={handleChange} placeholder="예) 도소매, 서비스"
                    className={inputCls} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">주요 품목</label>
                <input type="text" name="main_items" value={form.main_items}
                  onChange={handleChange} placeholder="예) 피아노, 현악기, 음향장비"
                  className={inputCls} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">주소</label>
                <input type="text" name="address" value={form.address}
                  onChange={handleChange} placeholder="예) 서울시 강남구 테헤란로 123"
                  className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">담당자</label>
                  <input type="text" name="contact_name" value={form.contact_name}
                    onChange={handleChange} placeholder="홍길동"
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">연락처</label>
                  <input type="text" name="contact_phone" value={form.contact_phone}
                    onChange={handleChange} placeholder="010-****-0000" maxLength={13}
                    className={inputCls} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">이메일</label>
                <input type="email" name="contact_email" value={form.contact_email}
                  onChange={handleChange} placeholder="example@company****"
                  className={inputCls} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">비고</label>
                <textarea name="note" value={form.note} onChange={handleChange}
                  placeholder="특이사항 또는 메모" rows={2}
                  className={`${inputCls} resize-none`} />
              </div>

              {errorMsg && <p className="text-red-500 text-xs">{errorMsg}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={handleClose}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                  취소
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50">
                  {saving ? '저장 중...' : '등록'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ── 상세보기 / 수정 모달 ── */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={handleDetailClose}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">
                {editMode ? '벤더 수정' : '벤더 상세'}
              </h2>
              <button onClick={handleDetailClose}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">×</button>
            </div>

            {/* 상세보기 모드 */}
            {!editMode && (
              <div className="space-y-3 text-sm">
                <Field label="업체명"     value={selected.company_name} />
                <Field label="사업자번호" value={selected.business_number} />
                <Field label="업종"       value={selected.business_type} />
                <Field label="업태"       value={selected.business_category} />
                <Field label="담당자"     value={selected.contact_name} />
                <Field label="연락처"     value={selected.contact_phone} />
                <Field label="이메일"     value={selected.contact_email} />
                <Field label="주요 품목"  value={selected.main_items} />
                <Field label="주소"       value={selected.address} />
                {selected.note && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">비고</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg px-3 py-2">
                      {selected.note}
                    </p>
                  </div>
                )}
                <p className="text-xs text-gray-400 pt-2">
                  등록일: {selected.created_at ? new Date(selected.created_at).toLocaleDateString('ko-KR') : '-'}
                  {selected.updated_at && ` · 수정일: ${new Date(selected.updated_at).toLocaleDateString('ko-KR')}`}
                </p>
                {editErrorMsg && <p className="text-red-500 text-xs">{editErrorMsg}</p>}
                <div className="flex justify-end gap-2 pt-3">
                  <button onClick={handleDelete}
                    className="px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">
                    삭제
                  </button>
                  <button onClick={handleEditStart}
                    className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                    수정
                  </button>
                </div>
              </div>
            )}

            {/* 수정 모드 */}
            {editMode && (
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    업체명 <span className="text-red-500">*</span>
                  </label>
                  <input type="text" name="company_name" value={editForm.company_name}
                    onChange={handleEditChange} className={inputCls} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">사업자등록번호</label>
                  <input type="text" name="business_number" value={editForm.business_number}
                    onChange={handleEditChange} maxLength={12} className={inputCls} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">업종</label>
                    <input type="text" name="business_type" value={editForm.business_type}
                      onChange={handleEditChange} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">업태</label>
                    <input type="text" name="business_category" value={editForm.business_category}
                      onChange={handleEditChange} className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">주요 품목</label>
                  <input type="text" name="main_items" value={editForm.main_items}
                    onChange={handleEditChange} className={inputCls} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">주소</label>
                  <input type="text" name="address" value={editForm.address}
                    onChange={handleEditChange} className={inputCls} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">담당자</label>
                    <input type="text" name="contact_name" value={editForm.contact_name}
                      onChange={handleEditChange} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">연락처</label>
                    <input type="text" name="contact_phone" value={editForm.contact_phone}
                      onChange={handleEditChange} maxLength={13} className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">이메일</label>
                  <input type="email" name="contact_email" value={editForm.contact_email}
                    onChange={handleEditChange} className={inputCls} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">비고</label>
                  <textarea name="note" value={editForm.note} onChange={handleEditChange}
                    rows={2} className={`${inputCls} resize-none`} />
                </div>

                {editErrorMsg && <p className="text-red-500 text-xs">{editErrorMsg}</p>}

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => { setEditMode(false); setEditErrorMsg('') }}
                    className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                    취소
                  </button>
                  <button type="submit" disabled={editSaving}
                    className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50">
                    {editSaving ? '저장 중...' : '저장'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-xs font-medium text-gray-500 w-24 shrink-0">{label}</span>
      <span className="text-gray-800">{value || '-'}</span>
    </div>
  )
}
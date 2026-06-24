import { useState, useEffect, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import * as XLSX from 'xlsx'

export default function VendorPage() {
  const { profile } = useOutletContext()
  const isAdmin = profile?.role === 'admin'

  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingVendor, setEditingVendor] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [selectedVendor, setSelectedVendor] = useState(null)
  const [uploadMsg, setUploadMsg] = useState('')
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    vendor_name: '',
    business_number: '',
    ceo_name: '',
    business_type: '',
    business_category: '',
    materials: '',
    has_delivery: false,
    website: '',
    address: '',
    main_phone: '',
    contact_name: '',
    contact_mobile: '',
    contact_email: '',
    note: ''
  })

  useEffect(() => { fetchVendors() }, [])

  async function fetchVendors() {
    setLoading(true)
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setVendors(data || [])
    setLoading(false)
  }

  function openAddModal() {
    setEditingVendor(null)
    setForm({
      vendor_name: '', business_number: '', ceo_name: '',
      business_type: '', business_category: '', materials: '',
      has_delivery: false,
      website: '', address: '', main_phone: '',
      contact_name: '', contact_mobile: '', contact_email: '', note: ''
    })
    setShowModal(true)
  }

  function openEditModal(vendor) {
    setEditingVendor(vendor)
    setForm({
      vendor_name: vendor.vendor_name || '',
      business_number: vendor.business_number || '',
      ceo_name: vendor.ceo_name || '',
      business_type: vendor.business_type || '',
      business_category: vendor.business_category || '',
      materials: vendor.materials || '',
      has_delivery: vendor.has_delivery ?? false,
      website: vendor.website || '',
      address: vendor.address || '',
      main_phone: vendor.main_phone || '',
      contact_name: vendor.contact_name || '',
      contact_mobile: vendor.contact_mobile || '',
      contact_email: vendor.contact_email || '',
      note: vendor.note || ''
    })
    setShowModal(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (editingVendor) {
      const { error } = await supabase
        .from('vendors')
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq('id', editingVendor.id)
      if (!error) { fetchVendors(); setShowModal(false) }
    } else {
      const { error } = await supabase
        .from('vendors')
        .insert([{ ...form, status: 'active', registered_by: profile.id }])
      if (!error) { fetchVendors(); setShowModal(false) }
    }
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('vendors').delete().eq('id', id)
    if (!error) {
      fetchVendors()
      setDeleteConfirm(null)
      setSelectedVendor(null)
    }
  }

  function handleExcelDownload() {
    const exportData = vendors.map(v => ({
      '거래처명': v.vendor_name,
      '사업자등록번호': v.business_number,
      '대표자명': v.ceo_name,
      '업태': v.business_type,
      '업종': v.business_category,
      '세부 취급 자재/서비스': v.materials,
      '납품실적': v.has_delivery ? '유' : '무',
      '홈페이지': v.website,
      '주소': v.address,
      '대표번호': v.main_phone,
      '담당자 이름': v.contact_name,
      '담당자 휴대폰': v.contact_mobile,
      '담당자 이메일': v.contact_email,
      '비고(업체특징)': v.note,
      '등록일': v.created_at ? new Date(v.created_at).toLocaleDateString('ko-KR') : ''
    }))
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '거래처목록')
    XLSX.writeFile(wb, `거래처목록_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  function handleTemplateDownload() {
    const template = [{
      '거래처명': '', '사업자등록번호': '', '대표자명': '',
      '업태': '', '업종': '', '세부 취급 자재/서비스': '',
      '납품실적': '유 또는 무',
      '홈페이지': '', '주소': '', '대표번호': '',
      '담당자 이름': '', '담당자 휴대폰': '', '담당자 이메일': '', '비고(업체특징)': ''
    }]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '거래처등록양식')
    XLSX.writeFile(wb, '거래처등록양식.xlsx')
  }

  async function handleExcelUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploadMsg('업로드 중...')
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws)
        if (rows.length === 0) { setUploadMsg('데이터가 없습니다.'); return }
        const insertData = rows
          .map(r => ({
            vendor_name: r['거래처명'] || '',
            business_number: r['사업자등록번호'] ? String(r['사업자등록번호']) : '',
            ceo_name: r['대표자명'] || '',
            business_type: r['업태'] || '',
            business_category: r['업종'] || '',
            materials: r['세부 취급 자재/서비스'] || '',
            has_delivery: r['납품실적'] === '유' || r['납품실적'] === true,
            website: r['홈페이지'] || '',
            address: r['주소'] || '',
            main_phone: r['대표번호'] ? String(r['대표번호']) : '',
            contact_name: r['담당자 이름'] || '',
            contact_mobile: r['담당자 휴대폰'] ? String(r['담당자 휴대폰']) : '',
            contact_email: r['담당자 이메일'] || '',
            note: r['비고(업체특징)'] || '',
            status: 'active',
            registered_by: profile.id
          }))
          .filter(r => r.vendor_name)
        const { error } = await supabase.from('vendors').insert(insertData)
        if (error) {
          setUploadMsg(`오류: ${error.message}`)
        } else {
          setUploadMsg(`${insertData.length}개 거래처가 등록되었습니다.`)
          fetchVendors()
        }
      } catch {
        setUploadMsg('파일 파싱 중 오류가 발생했습니다.')
      }
      e.target.value = ''
      setTimeout(() => setUploadMsg(''), 4000)
    }
    reader.readAsBinaryString(file)
  }

    const filteredVendors = vendors.filter(v =>
    (v.vendor_name || '').includes(searchTerm) ||
    (v.business_number || '').includes(searchTerm) ||
    (v.ceo_name || '').includes(searchTerm) ||
    (v.materials || '').includes(searchTerm) ||
    (v.contact_name || '').includes(searchTerm)
  )

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">거래처 관리</h1>
          <p className="text-sm text-gray-500 mt-1">
            전체 {vendors.length}개 · 검색결과 {filteredVendors.length}개
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">

          {/* 엑셀 양식 - 모든 사용자 */}
          <button
            onClick={handleTemplateDownload}
            className="flex items-center gap-1 px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            엑셀 양식
          </button>

          {/* 엑셀 업로드 - 모든 사용자 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            엑셀 업로드
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleExcelUpload}
          />

          {/* 엑셀 다운로드 - 모든 사용자 */}
          <button
            onClick={handleExcelDownload}
            className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            엑셀 다운로드
          </button>

          {/* 거래처 추가 - 모든 사용자 */}
          <button
            onClick={openAddModal}
            className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 4v16m8-8H4" />
            </svg>
            거래처 추가
          </button>

        </div>
      </div>

      {/* 업로드 결과 메시지 */}
      {uploadMsg && (
        <div className="mb-4 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm">
          {uploadMsg}
        </div>
      )}

      {/* 검색 */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="거래처명, 사업자번호, 대표자, 취급품목, 담당자 검색"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 테이블 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">불러오는 중...</div>
      ) : filteredVendors.length === 0 ? (
        <div className="text-center py-12 text-gray-400">거래처가 없습니다.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">거래처명</th>
                <th className="px-4 py-3 text-left">사업자번호</th>
                <th className="px-4 py-3 text-left">대표자</th>
                <th className="px-4 py-3 text-left">업태/업종</th>
                <th className="px-4 py-3 text-left">취급품목</th>
                <th className="px-4 py-3 text-left">납품실적</th>
                <th className="px-4 py-3 text-left">대표전화</th>
                <th className="px-4 py-3 text-left">담당자</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredVendors.map(vendor => (
                <tr key={vendor.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-blue-700">
                    <button
                      onClick={() => setSelectedVendor(vendor)}
                      className="hover:underline text-left"
                    >
                      {vendor.vendor_name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{vendor.business_number}</td>
                  <td className="px-4 py-3 text-gray-600">{vendor.ceo_name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {[vendor.business_type, vendor.business_category].filter(Boolean).join(' / ')}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{vendor.materials}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      vendor.has_delivery
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {vendor.has_delivery ? '유' : '무'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{vendor.main_phone}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {vendor.contact_name}
                    {vendor.contact_mobile && (
                      <div className="text-xs text-gray-400">{vendor.contact_mobile}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 상세보기 모달 */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">{selectedVendor.vendor_name}</h2>
              <button onClick={() => setSelectedVendor(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-400">사업자등록번호</span><p className="font-medium mt-1">{selectedVendor.business_number || '-'}</p></div>
              <div><span className="text-gray-400">대표자명</span><p className="font-medium mt-1">{selectedVendor.ceo_name || '-'}</p></div>
              <div><span className="text-gray-400">업태</span><p className="font-medium mt-1">{selectedVendor.business_type || '-'}</p></div>
              <div><span className="text-gray-400">업종</span><p className="font-medium mt-1">{selectedVendor.business_category || '-'}</p></div>
              <div className="col-span-2"><span className="text-gray-400">세부 취급 자재/서비스</span><p className="font-medium mt-1">{selectedVendor.materials || '-'}</p></div>
              <div>
                <span className="text-gray-400">납품 실적 유무</span>
                <p className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    selectedVendor.has_delivery
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {selectedVendor.has_delivery ? '✓ 납품 실적 있음' : '✗ 납품 실적 없음'}
                  </span>
                </p>
              </div>
              <div><span className="text-gray-400">대표번호</span><p className="font-medium mt-1">{selectedVendor.main_phone || '-'}</p></div>
              <div className="col-span-2"><span className="text-gray-400">주소</span><p className="font-medium mt-1">{selectedVendor.address || '-'}</p></div>
              <div><span className="text-gray-400">담당자 이름</span><p className="font-medium mt-1">{selectedVendor.contact_name || '-'}</p></div>
              <div><span className="text-gray-400">담당자 휴대폰</span><p className="font-medium mt-1">{selectedVendor.contact_mobile || '-'}</p></div>
              <div className="col-span-2"><span className="text-gray-400">담당자 이메일</span><p className="font-medium mt-1">{selectedVendor.contact_email || '-'}</p></div>
              {selectedVendor.website && (
                <div className="col-span-2">
                  <span className="text-gray-400">홈페이지</span>
                  <p className="font-medium mt-1">
                    <a href={selectedVendor.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      {selectedVendor.website}
                    </a>
                  </p>
                </div>
              )}
              {selectedVendor.note && (
                <div className="col-span-2"><span className="text-gray-400">비고(업체특징)</span><p className="font-medium mt-1">{selectedVendor.note}</p></div>
              )}
              <div><span className="text-gray-400">등록일</span><p className="font-medium mt-1">{selectedVendor.created_at ? new Date(selectedVendor.created_at).toLocaleDateString('ko-KR') : '-'}</p></div>
            </div>
            {isAdmin && (
              <div className="px-6 pb-6 flex justify-end gap-2">
                <button
                  onClick={() => { setSelectedVendor(null); openEditModal(selectedVendor) }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
                >수정</button>
                <button
                  onClick={() => setDeleteConfirm(selectedVendor)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition"
                >삭제</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-2">거래처 삭제</h3>
            <p className="text-sm text-gray-600 mb-1">아래 거래처를 삭제하시겠습니까?</p>
            <p className="text-sm font-semibold text-red-500 mb-4">{deleteConfirm.vendor_name}</p>
            <p className="text-xs text-gray-400 mb-5">삭제된 데이터는 복구할 수 없습니다.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >취소</button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
              >삭제 확인</button>
            </div>
          </div>
        </div>
      )}

      {/* 등록/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                {editingVendor ? '거래처 수정' : '거래처 추가'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">

                <div>
                  <label className="block text-xs text-gray-500 mb-1">거래처명 *</label>
                  <input
                    required
                    value={form.vendor_name}
                    onChange={e => setForm({ ...form, vendor_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">사업자등록번호</label>
                  <input
                    value={form.business_number}
                    onChange={e => setForm({ ...form, business_number: e.target.value })}
                    placeholder="000-00-00000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">대표자명</label>
                  <input
                    value={form.ceo_name}
                    onChange={e => setForm({ ...form, ceo_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">업태</label>
                  <input
                    value={form.business_type}
                    onChange={e => setForm({ ...form, business_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">업종</label>
                  <input
                    value={form.business_category}
                    onChange={e => setForm({ ...form, business_category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">대표번호</label>
                  <input
                    value={form.main_phone}
                    onChange={e => setForm({ ...form, main_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">세부 취급 자재/서비스</label>
                  <input
                    value={form.materials}
                    onChange={e => setForm({ ...form, materials: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-2">납품 실적 유무</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, has_delivery: true })}
                      className={
                        form.has_delivery
                          ? 'flex-1 py-2 rounded-lg text-sm font-medium border transition bg-green-500 text-white border-green-500'
                          : 'flex-1 py-2 rounded-lg text-sm font-medium border transition bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                      }
                    >
                      유 (있음)
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, has_delivery: false })}
                      className={
                        !form.has_delivery
                          ? 'flex-1 py-2 rounded-lg text-sm font-medium border transition bg-gray-500 text-white border-gray-500'
                          : 'flex-1 py-2 rounded-lg text-sm font-medium border transition bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                      }
                    >
                      무 (없음)
                    </button>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">주소</label>
                  <input
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">담당자 이름</label>
                  <input
                    value={form.contact_name}
                    onChange={e => setForm({ ...form, contact_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">담당자 휴대폰</label>
                  <input
                    value={form.contact_mobile}
                    onChange={e => setForm({ ...form, contact_mobile: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">담당자 이메일</label>
                  <input
                    type="email"
                    value={form.contact_email}
                    onChange={e => setForm({ ...form, contact_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">홈페이지</label>
                  <input
                    value={form.website}
                    onChange={e => setForm({ ...form, website: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">비고(업체특징)</label>
                  <textarea
                    rows={3}
                    value={form.note}
                    onChange={e => setForm({ ...form, note: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
                >
                  {editingVendor ? '수정 완료' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
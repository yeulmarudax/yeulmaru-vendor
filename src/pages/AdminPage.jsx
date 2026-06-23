import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function AdminPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ email: '', password: '', name: '', department: '', role: 'user' })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // 사용자 목록 조회
  const fetchUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, name, department, role, created_at')
      .order('created_at', { ascending: false })
    if (!error) setUsers(data)
    setLoading(false)
  }

  useEffect(() => {
  let ignore = false
  const load = async () => {
    if (!ignore) await fetchUsers()
  }
  load()
  return () => { ignore = true }
}, [])

  // 모달 열기 (신규)
  const openCreate = () => {
    setEditTarget(null)
    setForm({ email: '', password: '', name: '', department: '', role: 'user' })
    setMessage(null)
    setShowModal(true)
  }

  // 모달 열기 (수정)
  const openEdit = (user) => {
    setEditTarget(user)
    setForm({
      email: user.email || '',
      password: '',
      name: user.name || '',
      department: user.department || '',
      role: user.role || 'user',
    })
    setMessage(null)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditTarget(null)
    setMessage(null)
  }

  // 신규 사용자 생성
  const handleCreate = async () => {
    if (!form.email || !form.password || !form.name || !form.department) {
      setMessage({ type: 'error', text: '모든 항목을 입력해주세요.' })
      return
    }
    setSubmitting(true)
    setMessage(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            name: form.name,
            department: form.department,
            role: form.role,
          }),
        }
      )
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || '생성 실패')
      setMessage({ type: 'success', text: '사용자가 생성되었습니다.' })
      await fetchUsers()
      setTimeout(closeModal, 1200)
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  // 사용자 정보 수정
  const handleUpdate = async () => {
    if (!form.name || !form.department) {
      setMessage({ type: 'error', text: '이름과 부서를 입력해주세요.' })
      return
    }
    setSubmitting(true)
    setMessage(null)
    const { error } = await supabase
      .from('profiles')
      .update({ name: form.name, department: form.department, role: form.role })
      .eq('id', editTarget.id)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: '수정되었습니다.' })
      await fetchUsers()
      setTimeout(closeModal, 1000)
    }
    setSubmitting(false)
  }

  // 사용자 삭제
  const handleDelete = async (userId) => {
    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId }),
        }
      )
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || '삭제 실패')
      setDeleteConfirm(null)
      await fetchUsers()
    } catch (err) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">사용자 관리</h1>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          + 사용자 추가
        </button>
      </div>

      {/* 사용자 목록 테이블 */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">불러오는 중...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">이름</th>
                <th className="px-4 py-3 text-left">이메일</th>
                <th className="px-4 py-3 text-left">부서</th>
                <th className="px-4 py-3 text-left">역할</th>
                <th className="px-4 py-3 text-left">등록일</th>
                <th className="px-4 py-3 text-left">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    등록된 사용자가 없습니다.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{u.name || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{u.department || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        u.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {u.role === 'admin' ? '관리자' : '일반'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(u.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEdit(u)}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(u)}
                          className="text-red-500 hover:underline text-xs"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 삭제 확인 모달 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">사용자 삭제</h2>
            <p className="text-sm text-gray-600 mb-4">
              <span className="font-semibold text-red-600">{deleteConfirm.name}</span>
              ({deleteConfirm.email}) 사용자를 삭제하시겠습니까?
              <br />
              <span className="text-xs text-gray-400">이 작업은 되돌릴 수 없습니다.</span>
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                disabled={submitting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? '삭제 중...' : '삭제 확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 생성/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {editTarget ? '사용자 수정' : '신규 사용자 추가'}
            </h2>

            <div className="space-y-3">
              {editTarget ? (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">이메일</label>
                  <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500">
                    {editTarget.email || '-'}
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">이메일 *</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="user@gscf***.kr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">초기 비밀번호 *</label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="8자 이상"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs text-gray-500 mb-1">이름 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="홍길동"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">부서 *</label>
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="예: 예술사업팀"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">역할</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="user">일반 (user)</option>
                  <option value="admin">관리자 (admin)</option>
                </select>
              </div>
            </div>

            {message && (
              <div className={`mt-3 text-sm px-3 py-2 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-600'
              }`}>
                {message.text}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={editTarget ? handleUpdate : handleCreate}
                disabled={submitting}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? '처리 중...' : editTarget ? '저장' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
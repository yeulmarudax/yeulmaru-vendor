import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Layout() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('name, department, role')
        .eq('id', user.id)
        .single()

      if (data) setProfile(data)
    }

    fetchProfile()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 사이드바 */}
      <aside className="w-60 bg-white shadow-md flex flex-col">
        {/* 로고 영역 */}
        <div className="px-6 py-5 border-b border-gray-200">
          <p className="text-xs text-gray-400 font-medium">GS칼텍스 예울마루</p>
          <h1 className="text-base font-bold text-gray-800 leading-tight">
            거래처<br />관리 시스템
          </h1>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <span>📊</span> 대시보드
          </NavLink>

          <NavLink
            to="/vendors"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <span>🏢</span> 벤더 목록
          </NavLink>

          <NavLink
            to="/recommend"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <span>📝</span> 벤더 추천
          </NavLink>

          <NavLink
            to="/transactions"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <span>💰</span> 거래 내역
          </NavLink>

          {/* 관리자 전용 메뉴 */}
          {profile?.role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <span>👥</span> 사용자 관리
            </NavLink>
          )}
        </nav>

        {/* 하단 로그아웃 */}
        <div className="px-4 py-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <span>🚪</span> 로그아웃
          </button>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 상단 헤더 */}
        <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-700">거래처 관리 시스템</h2>

          {/* 사용자 정보 */}
          {profile && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-gray-400">👤</span>
              <span className="font-medium">{profile.name}</span>
              <span className="text-gray-400">|</span>
              <span>{profile.department}</span>
              {profile.role === 'admin' && (
                <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                  관리자
                </span>
              )}
            </div>
          )}
        </header>

        {/* 페이지 콘텐츠 */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
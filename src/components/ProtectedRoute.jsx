import { useEffect, useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function ProtectedRoute() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    // 초기 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // 세션 변경 감지 (로그인/로그아웃)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // 세션 확인 중 (undefined = 아직 로딩)
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-400 text-sm">로딩 중...</div>
      </div>
    )
  }

  // 세션 없으면 로그인 페이지로
  if (!session) {
    return <Navigate to="/login" replace />
  }

  // 세션 있으면 자식 라우트 렌더링
  return <Outlet />
}
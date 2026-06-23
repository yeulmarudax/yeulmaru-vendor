// C:\Projects\yeulmaru-vendor\src\pages\DashboardPage.jsx

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 flex items-center gap-4 animate-pulse">
      <div className="w-14 h-14 rounded-full bg-gray-200" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-24" />
        <div className="h-6 bg-gray-200 rounded w-16" />
        <div className="h-3 bg-gray-200 rounded w-20" />
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, icon, bgColor, textColor }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 flex items-center gap-4">
      <div className={`text-3xl w-14 h-14 flex items-center justify-center rounded-full ${bgColor} ${textColor}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function CategoryBar({ label, count, max }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 shrink-0 text-gray-600 truncate" title={label}>{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div
          className="h-2.5 rounded-full bg-blue-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right font-semibold text-gray-700">{count}</span>
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()

  const [loading, setLoading]                   = useState(true)
  const [error, setError]                       = useState(null)
  const [userEmail, setUserEmail]               = useState('')
  const [totalVendors, setTotalVendors]         = useState(0)
  const [thisMonthCount, setThisMonthCount]     = useState(0)
  const [recommendCount, setRecommendCount]     = useState(0)
  const [transactionCount, setTransactionCount] = useState(0)
  const [categoryStats, setCategoryStats]       = useState([])
  const [recentVendors, setRecentVendors]       = useState([])

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserEmail(user.email)

      await Promise.all([
        fetchVendorStats(),
        fetchRecommendStats(),
        fetchTransactionStats(),
        fetchCategoryStats(),
        fetchRecentVendors(),
      ])
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      setError('데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchVendorStats() {
    const { count: total, error: e1 } = await supabase
      .from('vendors')
      .select('*', { count: 'exact', head: true })
    if (e1) throw e1
    setTotalVendors(total ?? 0)

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const { count: monthly } = await supabase
      .from('vendors')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString())
    setThisMonthCount(monthly ?? 0)
  }

  // ✅ 수정: 'vendor_recommend' → 'vendor_recommendations'
  async function fetchRecommendStats() {
    const { count, error: e } = await supabase
      .from('vendor_recommendations')
      .select('*', { count: 'exact', head: true })
    if (e) { setRecommendCount(0); return }
    setRecommendCount(count ?? 0)
  }

  async function fetchTransactionStats() {
    const { count, error: e } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
    if (e) { setTransactionCount(0); return }
    setTransactionCount(count ?? 0)
  }

  async function fetchCategoryStats() {
    const { data, error: e } = await supabase
      .from('vendors')
      .select('business_category')
    if (e) throw e
    const map = {}
    ;(data ?? []).forEach(row => {
      const raw = row.business_category ?? '미분류'
      raw.split(',').map(c => c.trim()).filter(Boolean).forEach(cat => {
        map[cat] = (map[cat] ?? 0) + 1
      })
    })
    const sorted = Object.entries(map)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7)
    setCategoryStats(sorted)
  }

  async function fetchRecentVendors() {
    const { data, error: e } = await supabase
      .from('vendors')
      .select('id, company_name, business_category, contact_name, contact_phone, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
    if (e) throw e
    setRecentVendors(data ?? [])
  }

  function formatDate(iso) {
    if (!iso) return '-'
    return new Date(iso).toLocaleDateString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    })
  }

  return (
    <div className="p-6 max-w-6xl space-y-8">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">대시보드</h1>
          <p className="text-sm text-gray-500 mt-1">
            {userEmail ? `${userEmail} 님, 환영합니다.` : '환영합니다.'}
          </p>
        </div>
        <span className="text-sm text-gray-400">{today}</span>
      </div>

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => navigate('/vendors')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          🏢 벤더 등록
        </button>
        <button
          onClick={() => navigate('/recommend')}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          📝 추천 접수
        </button>
        <button
          onClick={() => navigate('/transactions')}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          💰 거래 내역
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <p className="text-red-500 text-sm">{error}</p>
          <button
            onClick={fetchAll}
            className="text-sm text-blue-600 underline hover:text-blue-800"
          >
            다시 시도
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="등록 벤더 수"
              value={totalVendors.toLocaleString()}
              sub={`이번 달 +${thisMonthCount}개 신규 등록`}
              icon="🏢"
              bgColor="bg-blue-50"
              textColor="text-blue-700"
            />
            <StatCard
              label="추천 접수 건수"
              value={recommendCount.toLocaleString()}
              sub="누적 추천 접수"
              icon="📝"
              bgColor="bg-green-50"
              textColor="text-green-700"
            />
            <StatCard
              label="거래 내역 건수"
              value={transactionCount.toLocaleString()}
              sub="누적 거래 건수"
              icon="💰"
              bgColor="bg-purple-50"
              textColor="text-purple-700"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-base font-semibold text-gray-700 mb-4">
                📊 업종별 벤더 현황
              </h2>
              {categoryStats.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">데이터가 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {categoryStats.map(({ label, count }) => (
                    <CategoryBar
                      key={label}
                      label={label}
                      count={count}
                      max={categoryStats[0].count}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-700">
                  🕐 최근 등록 벤더
                </h2>
                <button
                  onClick={() => navigate('/vendors')}
                  className="text-xs text-blue-600 hover:underline"
                >
                  전체 보기 →
                </button>
              </div>
              {recentVendors.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">등록된 벤더가 없습니다.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-100">
                      <th className="pb-2 font-medium">업체명</th>
                      <th className="pb-2 font-medium">업종</th>
                      <th className="pb-2 font-medium">담당자</th>
                      <th className="pb-2 font-medium">등록일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentVendors.map(v => (
                      <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 font-medium text-gray-800">{v.company_name}</td>
                        <td className="py-2 text-gray-500 truncate max-w-20">{v.business_category ?? '-'}</td>
                        <td className="py-2 text-gray-500">{v.contact_name ?? '-'}</td>
                        <td className="py-2 text-gray-400">{formatDate(v.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  )
}
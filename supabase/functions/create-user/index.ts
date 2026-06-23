// deno-lint-ignore-file no-import-prefix
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ✅ 허용된 role 값만 수용
const ALLOWED_ROLES = ['admin', 'user'] as const
type AllowedRole = typeof ALLOWED_ROLES[number]

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, password, name, department, role } = await req.json()

    // ✅ 필수값 검증
    if (!email || !password || !name || !department) {
      return new Response(
        JSON.stringify({ error: '필수 항목이 누락되었습니다. (email, password, name, department)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ✅ role 화이트리스트 검증
    const safeRole: AllowedRole = ALLOWED_ROLES.includes(role) ? role : 'user'

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Step 1 — auth.users 생성
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ error: authError?.message ?? 'auth 유저 생성 실패' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = authData.user.id

    // Step 2 — profiles upsert
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email,                          // ✅ email 추가
        name,
        department,
        role: safeRole,                 // ✅ 검증된 role 사용
        updated_at: new Date().toISOString(), // ✅ updated_at 추가
      })

    if (profileError) {
      // ✅ orphan 방지 — profiles 실패 시 auth.users도 롤백
      await supabaseAdmin.auth.admin.deleteUser(userId)

      return new Response(
        JSON.stringify({
          error: `프로필 생성 실패 (auth 유저도 롤백됨): ${profileError.message}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        user: {
          id: userId,
          email,
          name,
          department,
          role: safeRole,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
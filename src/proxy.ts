import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const ROTAS_PUBLICAS = ['/login', '/esqueci-senha', '/redefinir-senha', '/api/cnpj']
const ROTAS_CLIENTE = ['/c']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas do cliente (magic link) — autenticação custom via token
  if (ROTAS_CLIENTE.some((rota) => pathname.startsWith(rota))) {
    return NextResponse.next()
  }

  // Rotas públicas
  if (ROTAS_PUBLICAS.some((rota) => pathname === rota || pathname.startsWith(rota + '/'))) {
    return NextResponse.next()
  }

  // Verificar sessão (admin/operador)
  const response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

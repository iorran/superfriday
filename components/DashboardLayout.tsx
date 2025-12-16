'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, FileText, Settings, Users, FileCode, TrendingUp, LogOut, Mail, Upload, Plus } from 'lucide-react'
import { cn } from '@/lib/shared/utils'
import { useSession, signOut } from '@/lib/client/auth'
import Tour from '@/components/Tour'
import { useTour, tourSteps } from '@/hooks/use-tour'

interface DashboardLayoutProps {
  children: React.ReactNode
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const { showTour, completeTour, skipTour } = useTour()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Redirect to login if not authenticated (except on login/signup pages)
    if (mounted && !isPending && !session && pathname !== '/login' && pathname !== '/signup') {
      router.push('/login')
    }
  }, [mounted, session, isPending, pathname, router])

  // Don't render dashboard layout on login/signup pages
  if (pathname === '/login' || pathname === '/signup') {
    return <>{children}</>
  }

  // Show loading state while checking authentication or before mount
  if (!mounted || isPending || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
      // Force redirect even if signOut fails
      router.push('/login')
      router.refresh()
    }
  }

  const mainMenuItems = [
    {
      name: 'Criar Invoice',
      href: '/criar-invoice',
      icon: Plus,
    },
    {
      name: 'Faturas',
      href: '/',
      icon: FileText,
    },
    {
      name: 'Importar Antigas',
      href: '/import-old-files',
      icon: Upload,
    },
  ]

  const financesMenuItems = [
    {
      name: 'Finanças',
      href: '/finances',
      icon: TrendingUp,
    },
  ]

  const settingsMenuItems = [
    {
      name: 'Templates',
      href: '/settings/templates',
      icon: FileCode,
    },
    {
      name: 'Clientes',
      href: '/settings/clients',
      icon: Users,
    },
    {
      name: 'Empresa',
      href: '/settings/user-info',
      icon: FileText,
    },
    {
      name: 'Contador',
      href: '/settings/general',
      icon: Settings,
    },
    {
      name: 'SMTP',
      href: '/settings/email-accounts',
      icon: Mail,
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setSidebarOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Fechar menu lateral"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-card border-r transition-transform duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        role="navigation"
        aria-label="Menu de navegação principal"
      >
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h1 className="text-xl font-bold">Gerenciador de Invoices</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-accent rounded-md"
              aria-label="Fechar menu lateral"
              tabIndex={0}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-6 overflow-y-auto" data-tour="sidebar-nav">
            {/* Main Section */}
            <div className="space-y-2">
              {mainMenuItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-tour="nav-invoices"
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={item.name}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                )
              })}
            </div>

            {/* Separator */}
            <div className="border-t border-border" />

            {/* Finances Section */}
            <div className="space-y-2">
              <div className="px-4 py-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Análise
                </p>
              </div>
              {financesMenuItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-tour="nav-finances"
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={item.name}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                )
              })}
            </div>

            {/* Separator */}
            <div className="border-t border-border" />

            {/* Settings Section */}
            <div className="space-y-2" data-tour="nav-settings">
              <div className="px-4 py-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Configurações
                </p>
              </div>
              {settingsMenuItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={item.name}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                )
              })}
            </div>

            {/* User section */}
            <div className="mt-auto border-t border-border p-4" role="region" aria-label="Informações do usuário">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{session.user.email}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                aria-label="Sair da conta"
                tabIndex={0}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>Sair</span>
              </button>
            </div>
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b" role="banner">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-accent rounded-md"
              aria-label="Abrir menu lateral"
              aria-expanded={sidebarOpen}
              tabIndex={0}
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
            <div className="flex-1" />
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8 h-[calc(100vh-64px)] overflow-y-auto" data-tour="main-content">
          {children}
        </main>
      </div>

      {/* Tour */}
      {showTour && (
        <Tour
          steps={tourSteps}
          onComplete={completeTour}
          onSkip={skipTour}
        />
      )}
    </div>
  )
}

export default DashboardLayout

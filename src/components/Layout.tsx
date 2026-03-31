import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import Login from '@/pages/Login'
import { Button } from '@/components/ui/button'
import {
  LogOut,
  Loader2,
  LayoutDashboard,
  UploadCloud,
  BarChart3,
  History,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Layout() {
  const { session, loading, signOut, user } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">Carregando aplicação...</p>
      </div>
    )
  }

  if (!session) {
    return <Login />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-foreground flex flex-col">
      <header className="border-b bg-white dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="font-bold text-xl text-primary flex items-center gap-2 tracking-tight">
              <span className="bg-primary text-primary-foreground p-1.5 rounded-lg shadow-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                >
                  <path d="M2 12h20" />
                  <path d="M12 2v20" />
                </svg>
              </span>
              VELIT <span className="text-muted-foreground mx-1">x</span> DOMÍNIO
            </div>

            <nav className="hidden lg:flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-lg">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-primary shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800',
                  )
                }
              >
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </NavLink>
              <NavLink
                to="/import"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-primary shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800',
                  )
                }
              >
                <UploadCloud className="w-4 h-4" /> Importar
              </NavLink>
              <NavLink
                to="/conciliacao-balancetes"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-primary shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800',
                  )
                }
              >
                <BarChart3 className="w-4 h-4" /> Balancetes
              </NavLink>
              <NavLink
                to="/conciliacao-razoes"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-primary shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800',
                  )
                }
              >
                <FileText className="w-4 h-4" /> Razões
              </NavLink>
              <NavLink
                to="/history"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-primary shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800',
                  )
                }
              >
                <History className="w-4 h-4" /> Histórico
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 hidden sm:inline-block bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
              {user?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-slate-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col pt-6 pb-12">
        <Outlet />
      </main>
    </div>
  )
}

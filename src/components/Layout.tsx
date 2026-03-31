/* Layout Component - A component that wraps the main content of the app
   - Use this file to add a header, footer, or other elements that should be present on every page
   - This component is used in the App.tsx file to wrap the main content of the app */

import { Outlet, Link } from 'react-router-dom'
import { ArrowLeftRight } from 'lucide-react'

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-50 w-full border-b bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="container flex h-16 items-center px-4 md:px-6 mx-auto">
          <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <ArrowLeftRight className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Velit <span className="text-slate-400 font-medium mx-1">x</span> Domínio
            </span>
          </Link>
        </div>
      </header>
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  )
}

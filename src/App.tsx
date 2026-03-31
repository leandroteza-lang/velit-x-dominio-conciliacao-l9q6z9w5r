/* Main App Component - Handles routing (using react-router-dom), query client and other providers - use this file to add all routes */
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Index from './pages/Index'
import ImportPage from './pages/Import'
import HistoryPage from './pages/History'
import Results from './pages/Results'
import ConciliacaoBalancetes from './pages/ConciliacaoBalancetes'
import ConciliacaoRazoes from './pages/ConciliacaoRazoes'
import RazaoPorConta from './pages/RazaoPorConta'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'

// ONLY IMPORT AND RENDER WORKING PAGES, NEVER ADD PLACEHOLDER COMPONENTS OR PAGES IN THIS FILE
// AVOID REMOVING ANY CONTEXT PROVIDERS FROM THIS FILE (e.g. TooltipProvider, Toaster, Sonner)

import { AuthProvider } from '@/hooks/use-auth'

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/results" element={<Results />} />
            <Route path="/conciliacao-balancetes" element={<ConciliacaoBalancetes />} />
            <Route path="/conciliacao-razoes" element={<ConciliacaoRazoes />} />
            <Route path="/razao-por-conta" element={<RazaoPorConta />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App

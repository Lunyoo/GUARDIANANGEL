import React, { useState, useEffect } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { Toaster } from 'react-hot-toast'
import { ErrorFallback } from './ErrorFallback'

// Import components
import IntegratedDashboard from '@/components/IntegratedDashboard'
import ModernAnalytics from '@/components/ModernAnalytics'
import ModernConversations from '@/components/ModernConversations'
import ModernProductsSimplified from '@/components/ModernProductsSimplified'
import ModernConfig from '@/components/ModernConfig'
import ModernOrders from '@/components/ModernOrders'
import ModernWhatsAppControl from '@/components/ModernWhatsAppControl'
import SystemOperationStatus from '@/components/SystemOperationStatus'
import ThemeToggle from '@/components/ThemeToggle'
import LoginScreen from '@/components/LoginScreen'
import CommandCenter from '@/components/CommandCenter'
import DecisionsView from '@/components/DecisionsView'
import BudgetAllocatorPanel from '@/components/BudgetAllocatorPanel'
import CampaignLinksGenerator from '@/components/CampaignLinksGenerator'
import { Settings as SettingsIcon } from 'lucide-react'

// Hooks
import { useAuth } from '@/hooks/useAuth'

interface TabItem {
  id: string
  label: string
  icon: string
  component: React.ComponentType
}

const tabs: TabItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '🎯', component: IntegratedDashboard },
  { id: 'conversations', label: 'Conversas', icon: '💬', component: ModernConversations },
  { id: 'orders', label: 'Pedidos', icon: '📦', component: ModernOrders },
  { id: 'products', label: 'Produtos', icon: '🛍️', component: ModernProductsSimplified },
  { id: 'campaigns', label: 'Links Campanha', icon: '🔗', component: CampaignLinksGenerator },
  { id: 'budget', label: 'Permissões', icon: '💰', component: BudgetAllocatorPanel },
  { id: 'analytics', label: 'Analytics', icon: '📊', component: ModernAnalytics },
  { id: 'whatsapp', label: 'WhatsApp', icon: '📱', component: ModernWhatsAppControl },
  { id: 'command', label: 'Command Center', icon: '🎮', component: CommandCenter },
  { id: 'config', label: 'Configurações', icon: '⚙️', component: ModernConfig }
]

function App() {
  const { usuarioAtual, isLoading, isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Listen for global tab switch events (e.g., from Products → Campaigns with preselection)
  useEffect(() => {
    const onSwitch = (e: Event) => {
      const detail = (e as CustomEvent).detail as any
      if (detail?.tab) setActiveTab(detail.tab)
    }
    window.addEventListener('ga:switch-tab', onSwitch as EventListener)
    return () => window.removeEventListener('ga:switch-tab', onSwitch as EventListener)
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-400 mx-auto"></div>
          <p className="text-white mt-4 text-lg font-medium">Carregando Guardian Angel...</p>
          <p className="text-gray-400 mt-2">Inicializando sistemas inteligentes</p>
        </div>
      </div>
    )
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen />
  }

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || IntegratedDashboard

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="min-h-screen flex bg-white text-gray-900 dark:bg-gradient-to-br dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 dark:text-white transition-colors">
        {/* Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white/60 dark:bg-black/20 backdrop-blur-lg border-r border-emerald-500/20 transition-all duration-300 flex flex-col`}>        
          {/* Header */}
          <div className="p-4 border-b border-emerald-500/20">
            <div className="flex items-center justify-between">
              {!sidebarCollapsed && (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-lg flex items-center justify-center">
                    <span className="text-black font-bold text-sm">GA</span>
                  </div>
                  <div>
                    <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                      Guardian Angel
                    </h1>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Sistema Inteligente</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
              >
                {sidebarCollapsed ? '→' : '←'}
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} px-3 py-3 rounded-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
                title={sidebarCollapsed ? tab.label : undefined}
              >
                <span className="text-lg">{tab.icon}</span>
                {!sidebarCollapsed && (
                  <span className="ml-3 font-medium">{tab.label}</span>
                )}
              </button>
            ))}
          </nav>

          {/* User Info */}
          {!sidebarCollapsed && (
            <div className="p-4 border-t border-emerald-500/20">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {usuarioAtual?.nome?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {usuarioAtual?.nome}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {usuarioAtual?.isAdmin ? 'Administrador' : 'Usuário'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar */}
              <div className="bg-white/60 dark:bg-black/10 backdrop-blur-lg border-b border-emerald-500/10 p-4 transition-colors">
            <div className="flex justify-between items-center">
              <div>
                    <h2 className="text-xl font-bold">
                  {tabs.find(tab => tab.id === activeTab)?.label}
                </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date().toLocaleDateString('pt-BR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                    {activeTab === 'dashboard' && <SystemOperationStatus />}
                    <button
                      onClick={() => setActiveTab('config')}
                      title="Configurações"
                      className="p-2 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/10 transition-colors"
                    >
                      <SettingsIcon className="w-4 h-4" />
                    </button>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 overflow-auto">
                <div className={`backdrop-blur-lg rounded-xl min-h-full transition-colors ${
                  activeTab === 'dashboard'
                    ? 'bg-transparent border-transparent'
                    : 'bg-white/70 dark:bg-black/20 border border-emerald-500/20'
                }`}>
              <ActiveComponent />
            </div>
          </div>
        </div>

        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgba(0, 0, 0, 0.8)',
              color: '#fff',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              backdropFilter: 'blur(10px)',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#000',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#000',
              },
            },
          }}
        />
      </div>
    </ErrorBoundary>
  )
}

export default App

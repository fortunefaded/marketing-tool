import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { useEffect } from 'react'
import { UnifiedDashboard } from './pages/UnifiedDashboard'
import Campaigns from './routes/Campaigns'
import Tasks from './routes/Tasks'
import CategoryAnalysis from './routes/CategoryAnalysis'
import DetailAnalysis from './routes/DetailAnalysis'
import PeriodAnalysis from './routes/PeriodAnalysis'
import { MetaDashboardReal } from './pages/MetaDashboardReal'
import { MetaApiSetupSteps } from './pages/MetaApiSetupSteps'
import { ConnectStepConvex } from './pages/meta-setup/ConnectStepConvex'
import { PermissionsStepConvex } from './pages/meta-setup/PermissionsStepConvex'
import { TestStepConvex } from './pages/meta-setup/TestStepConvex'
import { CompleteStepConvex } from './pages/meta-setup/CompleteStepConvex'
import { ECForceImporter } from './components/ecforce/ECForceImporter'
import { ECForceContainer } from './pages/ECForceContainer'
import { IntegratedDashboard } from './pages/IntegratedDashboard'
import { ReportManagement } from './pages/ReportManagement'
import { SettingsManagement } from './pages/SettingsManagement'
import { FatigueDashboard } from './components/AdFatigue/FatigueDashboard'
import { FatigueEducation } from './pages/FatigueEducation'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import { vibe } from './lib/vibelogger'
import { setupTestAccount } from './services/testAccountSetup'

// Convex URLのフォールバック処理を追加
const convexUrl = import.meta.env.VITE_CONVEX_URL || 'https://temporary-convex-url.convex.cloud'
const convex = new ConvexReactClient(convexUrl)

// ログ出力
vibe.info('アプリケーション初期化', {
  mode: import.meta.env.MODE,
  convexUrl: convexUrl ? '接続先設定済み' : '未設定',
})

function RouteLogger() {
  const location = useLocation()

  useEffect(() => {
    vibe.debug('ルート変更', { path: location.pathname })
  }, [location])

  return null
}

function AppContent() {
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <RouteLogger />
          <Routes>
            <Route path="/" element={<UnifiedDashboard />} />
            <Route path="/meta-dashboard" element={<MetaDashboardReal />} />
            <Route path="/meta-api-setup" element={<MetaApiSetupSteps />}>
              <Route index element={<ConnectStepConvex />} />
              <Route path="connect" element={<ConnectStepConvex />} />
              <Route path="permissions" element={<PermissionsStepConvex />} />
              <Route path="test" element={<TestStepConvex />} />
              <Route path="complete" element={<CompleteStepConvex />} />
            </Route>
            <Route path="/ecforce-import" element={<ECForceImporter />} />
            <Route path="/ecforce" element={<ECForceContainer />} />
            <Route path="/integrated-dashboard" element={<IntegratedDashboard />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/category-analysis" element={<CategoryAnalysis />} />
            <Route path="/details" element={<DetailAnalysis />} />
            <Route path="/period" element={<PeriodAnalysis />} />
            <Route path="/reports" element={<ReportManagement />} />
            <Route path="/settings" element={<SettingsManagement />} />
            <Route path="/ad-fatigue" element={<FatigueDashboard accountId="test-account-001" />} />
            <Route path="/fatigue-education" element={<FatigueEducation />} />
            <Route
              path="/media"
              element={
                <div className="p-6">
                  <h1 className="text-2xl font-bold">メディア</h1>
                </div>
              }
            />
            <Route
              path="/conversion"
              element={
                <div className="p-6">
                  <h1 className="text-2xl font-bold">コンバージョン</h1>
                </div>
              }
            />
            <Route
              path="/attribution"
              element={
                <div className="p-6">
                  <h1 className="text-2xl font-bold">アトリビューション</h1>
                </div>
              }
            />
            <Route
              path="*"
              element={
                <div className="p-6">
                  <h1 className="text-2xl font-bold text-red-600">404 - ページが見つかりません</h1>
                  <p className="mt-2">リクエストされたページは存在しません。</p>
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function App() {
  useEffect(() => {
    // 開発環境でテストアカウントをセットアップ
    if (import.meta.env.DEV) {
      setupTestAccount()
        .then((account) => {
          console.log('Test account setup completed:', account)
        })
        .catch(console.error)
    }
  }, [])

  return (
    <ConvexProvider client={convex}>
      <Router>
        <AppContent />
      </Router>
    </ConvexProvider>
  )
}

export default App

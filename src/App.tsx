import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { useEffect } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { UnifiedDashboard } from './pages/UnifiedDashboard'
import Campaigns from './routes/Campaigns'
import Tasks from './routes/Tasks'
// import { MetaDashboardReal } from './pages/MetaDashboardReal'
// TODO: Create new setup flow or use Convex components
// import { MetaApiSetupSteps } from './pages/MetaApiSetupSteps'
import { ConnectStepConvex } from './pages/meta-setup/ConnectStepConvex'
import { PermissionsStepConvex } from './pages/meta-setup/PermissionsStepConvex'
import { TestStepConvex } from './pages/meta-setup/TestStepConvex'
import { CompleteStepConvex } from './pages/meta-setup/CompleteStepConvex'
import { ECForceImporter } from './components/ecforce/ECForceImporter'
import { ECForceContainer } from './pages/ECForceContainer'
import { IntegratedDashboard } from './pages/IntegratedDashboard'
import { ReportManagement } from './pages/ReportManagement'
import { SettingsManagement } from './pages/SettingsManagement'
import { SafeFatigueDashboardWrapper } from './features/meta-api/components/SafeFatigueDashboardWrapper'
import { SimpleTestDashboard } from './pages/SimpleTestDashboard'
// TODO: Replace with new implementation - archived components removed
// import { FatigueDashboardWithAccount } from './_archived/components/AdFatigue/FatigueDashboardWithAccount'
// import { FatigueEducation } from './_archived/pages/meta-api/FatigueEducation'
import { NewMetaApiTest } from './components/test/NewMetaApiTest'
import { AggregationTestComponent } from './components/test/AggregationTestComponent'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import { vibe } from './lib/vibelogger'
import { setupTestAccount } from './services/testAccountSetup'
import { ApiConvexTestPage } from './pages/ApiConvexTestPage'

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
            <Route path="/meta-dashboard" element={<UnifiedDashboard />} />
            {/* TODO: Create new setup flow */}
            <Route path="/meta-api-setup" element={<ConnectStepConvex />} />
            <Route path="/meta-api-setup/connect" element={<ConnectStepConvex />} />
            <Route path="/meta-api-setup/permissions" element={<PermissionsStepConvex />} />
            <Route path="/meta-api-setup/test" element={<TestStepConvex />} />
            <Route path="/meta-api-setup/complete" element={<CompleteStepConvex />} />
            <Route path="/ecforce-import" element={<ECForceImporter />} />
            <Route path="/ecforce" element={<ECForceContainer />} />
            <Route path="/integrated-dashboard" element={<IntegratedDashboard />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/reports" element={<ReportManagement />} />
            <Route path="/settings" element={<SettingsManagement />} />
            {/* TODO: Replace with new implementation */}
            <Route path="/ad-fatigue" element={<SafeFatigueDashboardWrapper />} />
            <Route path="/test-new-meta-api" element={<NewMetaApiTest />} />
            <Route path="/ad-fatigue-simple" element={<SafeFatigueDashboardWrapper />} />
            <Route path="/api-convex-test" element={<ApiConvexTestPage />} />
            <Route path="/test-simple" element={<SimpleTestDashboard />} />
            <Route path="/test-aggregation" element={<AggregationTestComponent />} />
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
          if (account) {
            vibe.good('テストアカウントセットアップ完了', { account: account.accountId })
          }
        })
        .catch((error) => vibe.bad('テストアカウントセットアップ失敗', { error }))
    }
  }, [])

  return (
    <ErrorBoundary>
      <ConvexProvider client={convex}>
        <Router>
          <AppContent />
        </Router>
      </ConvexProvider>
    </ErrorBoundary>
  )
}

export default App

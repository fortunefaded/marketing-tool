import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { useEffect } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ConvexUsageTracker } from './utils/convex-usage-tracker'
import MainDashboard from './pages/MainDashboard'
import KPIViewDashboard from './pages/KPIViewDashboardBreakdown'
import { SettingsManagement } from './pages/SettingsManagement'
import { ConnectStepConvex } from './pages/meta-setup/ConnectStepConvex'
import { PermissionsAndTestStep } from './pages/meta-setup/PermissionsAndTestStep'
import { CompleteStepConvex } from './pages/meta-setup/CompleteStepConvex'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import { vibe } from './utils/vibelogger'
import { UnifiedDebugPanel } from './components/UnifiedDebugPanel'
// ECForce関連ページのインポート
import { ECForceMain } from './features/ecforce/pages/ECForceMain'
import { ECForceUpload } from './features/ecforce/pages/ECForceUpload'
import { ECForceDataPage } from './features/ecforce/pages/ECForceDataPage'
import { ECForceMappingPage } from './features/ecforce/pages/ECForceMappingPage'
import { ECForceSync } from './features/ecforce/pages/ECForceSync'
import { ECForceHistory } from './features/ecforce/pages/ECForceHistory'
// 期間別分析（独立機能）
import { PeriodAnalysis } from './features/period-analysis/pages/PeriodAnalysis'
// Google Ads
import { GoogleAdsSettings } from './pages/GoogleAdsSettings'
import { GoogleAdsCallback } from './pages/GoogleAdsCallback'
import { GoogleAdsAnalysis } from './pages/GoogleAdsAnalysis'
// 月次目標設定
import { MonthlyTargets } from './pages/MonthlyTargets'
// 予実管理
import BudgetActualManagement from './pages/BudgetActualManagement'

// Convex URLのフォールバック処理を追加
const convexUrl = import.meta.env.VITE_CONVEX_URL || 'https://temporary-convex-url.convex.cloud'
const convex = new ConvexReactClient(convexUrl)

// ログ出力
vibe.info('アプリケーション初期化', {
  mode: import.meta.env.MODE,
  convexUrl: convexUrl ? '接続先設定済み' : '未設定',
})

// 開発環境でConvex使用量トラッカーを初期化
// 一時的に無効化（エラー対応のため）
if (false && import.meta.env.DEV && typeof window !== 'undefined') {
  const tracker = new ConvexUsageTracker(convex)
  tracker.start()

  // グローバルに公開（デバッグ用）
  ;(window as any).convexTracker = tracker

  console.log('💡 Convex使用量トラッカーが有効です')
  console.log('   コンソールで以下のコマンドが使用可能:')
  console.log('   - convexTracker.printStats() : 統計を表示')
  console.log('   - convexTracker.exportLogs() : ログをエクスポート')
  console.log('   - convexTracker.reset()      : 統計をリセット')
  console.log('   - convexTracker.stop()       : トラッキング停止')
}

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
            <Route path="/" element={<KPIViewDashboard />} />
            <Route path="/meta-analysis" element={<MainDashboard />} />
            <Route path="/google-ads-analysis" element={<GoogleAdsAnalysis />} />
            <Route path="/settings" element={<SettingsManagement />} />
            {/* 月次目標設定 */}
            <Route path="/settings/targets" element={<MonthlyTargets />} />
            {/* Meta API設定ルート */}
            <Route path="/settings/meta-api" element={<ConnectStepConvex />} />
            <Route path="/settings/meta-api/connect" element={<ConnectStepConvex />} />
            <Route path="/settings/meta-api/permissions" element={<PermissionsAndTestStep />} />
            <Route path="/settings/meta-api/test" element={<PermissionsAndTestStep />} />
            <Route path="/settings/meta-api/complete" element={<CompleteStepConvex />} />
            {/* Google Ads設定ルート */}
            <Route path="/settings/google-ads" element={<GoogleAdsSettings />} />
            <Route path="/settings/google-ads/callback" element={<GoogleAdsCallback />} />
            {/* 期間別データ分析（独立機能） */}
            <Route path="/period-analysis" element={<PeriodAnalysis />} />
            {/* 予実管理 */}
            <Route path="/budget-actual" element={<BudgetActualManagement />} />
            {/* ECForce設定ルート */}
            <Route path="/settings/ecforce" element={<ECForceMain />} />
            <Route path="/settings/ecforce/upload" element={<ECForceUpload />} />
            <Route path="/settings/ecforce/data" element={<ECForceDataPage />} />
            <Route path="/settings/ecforce/mapping" element={<ECForceMappingPage />} />
            <Route path="/settings/ecforce/sync" element={<ECForceSync />} />
            <Route path="/settings/ecforce/history" element={<ECForceHistory />} />
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
  return (
    <ErrorBoundary>
      <ConvexProvider client={convex}>
        <Router>
          <AppContent />
          <UnifiedDebugPanel />
        </Router>
      </ConvexProvider>
    </ErrorBoundary>
  )
}

export default App

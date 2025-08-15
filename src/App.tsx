import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { useEffect } from 'react'
import Dashboard from './routes/Dashboard'
import Campaigns from './routes/Campaigns'
import Tasks from './routes/Tasks'
import CategoryAnalysis from './routes/CategoryAnalysis'
import DetailAnalysis from './routes/DetailAnalysis'
import PeriodAnalysis from './routes/PeriodAnalysis'
import LandingPageAnalysis from './routes/LandingPageAnalysis'
import CostAllocationAnalysis from './routes/CostAllocationAnalysis'
import { MetaDashboard } from './pages/MetaDashboard'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import { vibe } from './lib/vibelogger'

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
            <Route path="/" element={<Dashboard />} />
            <Route path="/meta-dashboard" element={<MetaDashboard />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/category-analysis" element={<CategoryAnalysis />} />
            <Route path="/details" element={<DetailAnalysis />} />
            <Route path="/period" element={<PeriodAnalysis />} />
            <Route path="/landing" element={<LandingPageAnalysis />} />
            <Route path="/cost-allocation" element={<CostAllocationAnalysis />} />
            <Route
              path="/reports"
              element={
                <div className="p-6">
                  <h1 className="text-2xl font-bold">レポート</h1>
                </div>
              }
            />
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
          </Routes>
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <ConvexProvider client={convex}>
      <Router>
        <AppContent />
      </Router>
    </ConvexProvider>
  )
}

export default App

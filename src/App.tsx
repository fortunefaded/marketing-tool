import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { useEffect } from 'react'
import Dashboard from './routes/Dashboard'
import Campaigns from './routes/Campaigns'
import Tasks from './routes/Tasks'
import Sidebar from './components/Sidebar'
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
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <RouteLogger />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/tasks" element={<Tasks />} />
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

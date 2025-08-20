import React, { useState } from 'react'
import {
  AcademicCapIcon,
  ChartBarIcon,
  BeakerIcon,
  LightBulbIcon,
  CogIcon,
  DocumentTextIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import {
  THRESHOLD_RATIONALE,
  INDUSTRY_ADJUSTMENTS,
  SEASONAL_ADJUSTMENTS,
} from '../../convex/config/thresholdRationale'
import { ThresholdExplainer } from '../components/AdFatigue/ThresholdExplainer'

export const FatigueEducation: React.FC = () => {
  const [activeSection, setActiveSection] = useState<
    'overview' | 'metrics' | 'industries' | 'simulator'
  >('overview')
  const [simulatorValues, setSimulatorValues] = useState({
    frequency: 2.5,
    ctrDecline: 0.15,
    firstTimeRatio: 0.5,
    industry: 'b2c_ecommerce',
    productPrice: 100,
    season: 'normal',
  })

  const sections = [
    { id: 'overview', label: '概要', icon: AcademicCapIcon },
    { id: 'metrics', label: '指標詳細', icon: ChartBarIcon },
    { id: 'industries', label: '業界別ガイド', icon: BeakerIcon },
    { id: 'simulator', label: 'シミュレーター', icon: CogIcon },
  ]

  const renderOverview = () => (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">広告疲労度測定の科学的アプローチ</h2>
        <p className="text-gray-700 leading-relaxed">
          Meta広告の疲労度測定システムは、行動心理学、統計学、機械学習の知見を統合し、
          広告パフォーマンスの低下を予測・防止します。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <LightBulbIcon className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">ザイオンス効果</h3>
          <p className="text-sm text-gray-600">
            同じ刺激への繰り返し露出により好感度が上昇する心理効果。
            ただし、3-5回を超えると逆に嫌悪感に転じることが研究で判明。
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <ChartBarIcon className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">限界効用逓減の法則</h3>
          <p className="text-sm text-gray-600">
            広告露出の効果は回数とともに減少。 投資対効果（ROAS）が1を下回るポイントを科学的に特定。
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <BeakerIcon className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">機械学習による最適化</h3>
          <p className="text-sm text-gray-600">
            Metaのアルゴリズムは広告の品質スコアを常時評価。
            低パフォーマンス広告は自動的に配信が制限される。
          </p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <h3 className="font-semibold text-amber-900 mb-3">なぜ閾値が重要なのか？</h3>
        <ul className="space-y-2 text-sm text-amber-800">
          <li className="flex items-start">
            <CheckCircleIcon className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
            <span>広告費用の無駄遣いを防ぎ、ROASを最大化</span>
          </li>
          <li className="flex items-start">
            <CheckCircleIcon className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
            <span>ブランドイメージの毀損を事前に防止</span>
          </li>
          <li className="flex items-start">
            <CheckCircleIcon className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
            <span>アルゴリズムペナルティを回避し、配信効率を維持</span>
          </li>
        </ul>
      </div>
    </div>
  )

  const renderMetricsDetail = () => (
    <div className="space-y-8">
      {Object.entries(THRESHOLD_RATIONALE).map(([metric, data]) => (
        <div key={metric} className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
            {metric === 'frequency'
              ? 'Frequency（平均表示回数）'
              : metric === 'ctrDecline'
                ? 'CTR減少率'
                : metric === 'firstTimeRatio'
                  ? '初回インプレッション比率'
                  : metric === 'cpmIncrease'
                    ? 'CPM上昇率'
                    : metric === 'negativeFeedback'
                      ? 'ネガティブフィードバック率'
                      : metric === 'videoMetrics'
                        ? '動画指標'
                        : metric === 'instagramValue'
                          ? 'Instagram価値指標'
                          : metric === 'crossPlatform'
                            ? 'クロスプラットフォーム'
                            : metric}
          </h3>

          {'thresholds' in data && data.thresholds && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">閾値設定</h4>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(data.thresholds).map(([level, value]) => (
                  <div
                    key={level}
                    className={`rounded-lg p-4 text-center ${
                      level === 'safe'
                        ? 'bg-green-50 border border-green-200'
                        : level === 'warning'
                          ? 'bg-yellow-50 border border-yellow-200'
                          : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <div className="text-2xl font-bold mb-1">
                      {typeof value === 'number'
                        ? metric.includes('Ratio') ||
                          metric.includes('Decline') ||
                          metric.includes('Increase') ||
                          metric.includes('Feedback')
                          ? `${(value * 100).toFixed(1)}%`
                          : value.toFixed(1)
                        : String(value)}
                    </div>
                    <div className="text-sm text-gray-600 capitalize">{level}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {'rationale' in data && data.rationale && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">科学的根拠</h4>
              {typeof data.rationale === 'object' ? (
                <div className="space-y-2">
                  {Object.entries(data.rationale).map(([key, value]) => (
                    <div key={key} className="flex items-start">
                      <span
                        className={`inline-block w-2 h-2 rounded-full mt-1.5 mr-2 ${
                          key === 'critical'
                            ? 'bg-red-500'
                            : key === 'warning'
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                        }`}
                      />
                      <p className="text-sm text-gray-600">{value as string}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">{data.rationale}</p>
              )}
            </div>
          )}

          {'evidence' in data && data.evidence && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700">{data.evidence}</p>
            </div>
          )}

          {'mathematical' in data && data.mathematical && (
            <div className="mt-4 bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-800 font-mono">{data.mathematical}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )

  const renderIndustryGuide = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">業界別の調整係数</h3>
        <p className="text-sm text-gray-700">
          業界特性により広告疲労の進行速度は大きく異なります。
          以下の調整係数を基準値に掛けて使用してください。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(INDUSTRY_ADJUSTMENTS).map(([industry, adjustment]) => (
          <div key={industry} className="bg-white rounded-lg shadow-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-3">
              {industry.replace(/_/g, ' ').toUpperCase()}
            </h4>
            <p className="text-sm text-gray-600 mb-4">{adjustment.description}</p>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Frequency調整</span>
                <span className="font-mono text-sm font-semibold">×{adjustment.frequency}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">CTR減少率調整</span>
                <span className="font-mono text-sm font-semibold">×{adjustment.ctrDecline}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                例: 基準値3.5 × {adjustment.frequency} = {(3.5 * adjustment.frequency).toFixed(1)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h4 className="font-semibold text-yellow-900 mb-3">季節・イベント調整</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(SEASONAL_ADJUSTMENTS).map(([season, adjustment]) => (
            <div key={season} className="text-center">
              <div className="text-2xl font-bold text-yellow-700">×{adjustment.multiplier}</div>
              <div className="text-sm text-yellow-800">{season.replace(/_/g, ' ')}</div>
              <div className="text-xs text-yellow-600 mt-1">{adjustment.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderSimulator = () => {
    const calculateStatus = (metric: string, value: number) => {
      const rationale = THRESHOLD_RATIONALE[metric as keyof typeof THRESHOLD_RATIONALE]
      if (!rationale || !('thresholds' in rationale)) return 'safe'
      const thresholds = rationale.thresholds

      if (metric === 'firstTimeRatio') {
        if (value <= (thresholds as any).critical) return 'critical'
        if (value <= (thresholds as any).warning) return 'warning'
      } else {
        if (value >= (thresholds as any).critical) return 'critical'
        if (value >= (thresholds as any).warning) return 'warning'
      }
      return 'safe'
    }

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            インタラクティブ閾値シミュレーター
          </h3>
          <p className="text-sm text-gray-700">
            あなたの広告の値を入力して、疲労度を判定してみましょう。
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 入力フィールド */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency（平均表示回数）
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={simulatorValues.frequency}
                  onChange={(e) =>
                    setSimulatorValues({
                      ...simulatorValues,
                      frequency: parseFloat(e.target.value),
                    })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600 mt-1">
                  <span>0</span>
                  <span className="font-mono font-semibold">
                    {simulatorValues.frequency.toFixed(1)}
                  </span>
                  <span>10</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CTR減少率</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={simulatorValues.ctrDecline * 100}
                  onChange={(e) =>
                    setSimulatorValues({
                      ...simulatorValues,
                      ctrDecline: parseFloat(e.target.value) / 100,
                    })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600 mt-1">
                  <span>0%</span>
                  <span className="font-mono font-semibold">
                    {(simulatorValues.ctrDecline * 100).toFixed(0)}%
                  </span>
                  <span>100%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  初回インプレッション比率
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={simulatorValues.firstTimeRatio * 100}
                  onChange={(e) =>
                    setSimulatorValues({
                      ...simulatorValues,
                      firstTimeRatio: parseFloat(e.target.value) / 100,
                    })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600 mt-1">
                  <span>0%</span>
                  <span className="font-mono font-semibold">
                    {(simulatorValues.firstTimeRatio * 100).toFixed(0)}%
                  </span>
                  <span>100%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">業界</label>
                <select
                  value={simulatorValues.industry}
                  onChange={(e) =>
                    setSimulatorValues({
                      ...simulatorValues,
                      industry: e.target.value,
                    })
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  {Object.entries(INDUSTRY_ADJUSTMENTS).map(([key, value]) => (
                    <option key={key} value={key}>
                      {key.replace(/_/g, ' ').toUpperCase()} - {value.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  商品価格（USD）
                </label>
                <input
                  type="number"
                  value={simulatorValues.productPrice}
                  onChange={(e) =>
                    setSimulatorValues({
                      ...simulatorValues,
                      productPrice: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* 結果表示 */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">判定結果</h4>

              <div className="space-y-3">
                <div
                  className={`p-4 rounded-lg ${
                    calculateStatus('frequency', simulatorValues.frequency) === 'critical'
                      ? 'bg-red-50 border border-red-200'
                      : calculateStatus('frequency', simulatorValues.frequency) === 'warning'
                        ? 'bg-yellow-50 border border-yellow-200'
                        : 'bg-green-50 border border-green-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Frequency</span>
                    <ThresholdExplainer
                      metric="frequency"
                      value={simulatorValues.frequency}
                      status={calculateStatus('frequency', simulatorValues.frequency) as any}
                    />
                  </div>
                  <div className="text-2xl font-bold mt-1">
                    {simulatorValues.frequency.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {calculateStatus('frequency', simulatorValues.frequency) === 'critical'
                      ? '危険：即座の対応が必要'
                      : calculateStatus('frequency', simulatorValues.frequency) === 'warning'
                        ? '警告：注意が必要'
                        : '安全：問題なし'}
                  </div>
                </div>

                <div
                  className={`p-4 rounded-lg ${
                    calculateStatus('ctrDecline', simulatorValues.ctrDecline) === 'critical'
                      ? 'bg-red-50 border border-red-200'
                      : calculateStatus('ctrDecline', simulatorValues.ctrDecline) === 'warning'
                        ? 'bg-yellow-50 border border-yellow-200'
                        : 'bg-green-50 border border-green-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">CTR減少率</span>
                    <ThresholdExplainer
                      metric="ctrDecline"
                      value={simulatorValues.ctrDecline}
                      status={calculateStatus('ctrDecline', simulatorValues.ctrDecline) as any}
                    />
                  </div>
                  <div className="text-2xl font-bold mt-1">
                    {(simulatorValues.ctrDecline * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {calculateStatus('ctrDecline', simulatorValues.ctrDecline) === 'critical'
                      ? '危険：クリエイティブ変更推奨'
                      : calculateStatus('ctrDecline', simulatorValues.ctrDecline) === 'warning'
                        ? '警告：改善を検討'
                        : '安全：正常範囲内'}
                  </div>
                </div>

                <div
                  className={`p-4 rounded-lg ${
                    calculateStatus('firstTimeRatio', simulatorValues.firstTimeRatio) === 'critical'
                      ? 'bg-red-50 border border-red-200'
                      : calculateStatus('firstTimeRatio', simulatorValues.firstTimeRatio) ===
                          'warning'
                        ? 'bg-yellow-50 border border-yellow-200'
                        : 'bg-green-50 border border-green-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">初回インプレッション比率</span>
                    <ThresholdExplainer
                      metric="firstTimeRatio"
                      value={simulatorValues.firstTimeRatio}
                      status={
                        calculateStatus('firstTimeRatio', simulatorValues.firstTimeRatio) as any
                      }
                    />
                  </div>
                  <div className="text-2xl font-bold mt-1">
                    {(simulatorValues.firstTimeRatio * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {calculateStatus('firstTimeRatio', simulatorValues.firstTimeRatio) ===
                    'critical'
                      ? '危険：オーディエンス拡大必要'
                      : calculateStatus('firstTimeRatio', simulatorValues.firstTimeRatio) ===
                          'warning'
                        ? '警告：新規リーチ減少中'
                        : '安全：健全な成長'}
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h5 className="font-medium text-gray-900 mb-2">総合判定</h5>
                <p className="text-sm text-gray-700">
                  {calculateStatus('frequency', simulatorValues.frequency) === 'critical' ||
                  calculateStatus('ctrDecline', simulatorValues.ctrDecline) === 'critical' ||
                  calculateStatus('firstTimeRatio', simulatorValues.firstTimeRatio) === 'critical'
                    ? '広告疲労が深刻です。即座にクリエイティブを変更するか、配信を停止してください。'
                    : calculateStatus('frequency', simulatorValues.frequency) === 'warning' ||
                        calculateStatus('ctrDecline', simulatorValues.ctrDecline) === 'warning' ||
                        calculateStatus('firstTimeRatio', simulatorValues.firstTimeRatio) ===
                          'warning'
                      ? '広告疲労の兆候が見られます。早めの対応を検討してください。'
                      : '広告は健全な状態です。現在の戦略を継続してください。'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">広告疲労度測定 教育センター</h1>
          <p className="text-gray-600">科学的根拠に基づいた閾値設定の理解を深めましょう</p>
        </div>

        {/* Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-8">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as any)}
              className={`flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                activeSection === section.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <section.icon className="h-5 w-5 mr-2" />
              {section.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          {activeSection === 'overview' && renderOverview()}
          {activeSection === 'metrics' && renderMetricsDetail()}
          {activeSection === 'industries' && renderIndustryGuide()}
          {activeSection === 'simulator' && renderSimulator()}
        </div>

        {/* Footer CTA */}
        <div className="mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">さらに詳しく学びたい方へ</h3>
              <p className="text-indigo-100">Meta公式のベストプラクティスガイドをダウンロード</p>
            </div>
            <button className="flex items-center px-6 py-3 bg-white text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 transition-colors">
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              ガイドをダウンロード
              <ArrowRightIcon className="h-4 w-4 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

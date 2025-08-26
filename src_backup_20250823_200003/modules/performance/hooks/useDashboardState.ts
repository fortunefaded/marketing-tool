import { useReducer, useCallback, useMemo } from 'react'

// 統合された状態管理
interface DashboardState {
  campaigns: MetaCampaignData[]
  insights: MetaInsightsData[]
  isLoading: boolean
  error: string | null
  selectedDateRange: DateRange
  selectedCampaignId: string | null
  selectedAdSetId: string | null
  selectedTab: string
  filters: {
    status: string
    objective: string
    searchQuery: string
  }
}

type DashboardAction = 
  | { type: 'SET_CAMPAIGNS'; payload: MetaCampaignData[] }
  | { type: 'SET_INSIGHTS'; payload: MetaInsightsData[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_DATE_RANGE'; payload: DateRange }
  | { type: 'SET_FILTERS'; payload: Partial<DashboardState['filters']> }
  | { type: 'RESET' }

const initialState: DashboardState = {
  campaigns: [],
  insights: [],
  isLoading: false,
  error: null,
  selectedDateRange: { start: '', end: '' },
  selectedCampaignId: null,
  selectedAdSetId: null,
  selectedTab: 'overview',
  filters: {
    status: 'all',
    objective: 'all',
    searchQuery: ''
  }
}

function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'SET_CAMPAIGNS':
      return { ...state, campaigns: action.payload }
    case 'SET_INSIGHTS':
      return { ...state, insights: action.payload }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'SET_DATE_RANGE':
      return { ...state, selectedDateRange: action.payload }
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

export function useDashboardState() {
  const [state, dispatch] = useReducer(dashboardReducer, initialState)

  // Memoized actions
  const actions = useMemo(() => ({
    setCampaigns: (campaigns: MetaCampaignData[]) => 
      dispatch({ type: 'SET_CAMPAIGNS', payload: campaigns }),
    setInsights: (insights: MetaInsightsData[]) => 
      dispatch({ type: 'SET_INSIGHTS', payload: insights }),
    setLoading: (loading: boolean) => 
      dispatch({ type: 'SET_LOADING', payload: loading }),
    setError: (error: string | null) => 
      dispatch({ type: 'SET_ERROR', payload: error }),
    setDateRange: (range: DateRange) => 
      dispatch({ type: 'SET_DATE_RANGE', payload: range }),
    setFilters: (filters: Partial<DashboardState['filters']>) => 
      dispatch({ type: 'SET_FILTERS', payload: filters }),
    reset: () => dispatch({ type: 'RESET' })
  }), [])

  // Memoized calculations
  const metrics = useMemo(() => {
    if (!state.insights.length) return null
    
    return {
      totalSpend: state.insights.reduce((sum, i) => sum + i.spend, 0),
      totalImpressions: state.insights.reduce((sum, i) => sum + i.impressions, 0),
      totalClicks: state.insights.reduce((sum, i) => sum + i.clicks, 0),
      avgCtr: state.insights.reduce((sum, i) => sum + i.ctr, 0) / state.insights.length,
      avgCpm: state.insights.reduce((sum, i) => sum + i.cpm, 0) / state.insights.length
    }
  }, [state.insights])

  // Memoized filtered data
  const filteredInsights = useMemo(() => {
    let filtered = state.insights
    
    if (state.filters.status !== 'all') {
      filtered = filtered.filter(i => i.status === state.filters.status)
    }
    
    if (state.filters.searchQuery) {
      const query = state.filters.searchQuery.toLowerCase()
      filtered = filtered.filter(i => 
        i.ad_name?.toLowerCase().includes(query) ||
        i.campaign_name?.toLowerCase().includes(query)
      )
    }
    
    return filtered
  }, [state.insights, state.filters])

  return {
    state,
    actions,
    metrics,
    filteredInsights
  }
}
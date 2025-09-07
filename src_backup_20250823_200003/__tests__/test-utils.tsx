import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ConvexProvider, ConvexReactClient } from 'convex/react'

const mockConvex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL || 'https://test.convex.cloud'
)

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <ConvexProvider client={mockConvex}>{children}</ConvexProvider>
}

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

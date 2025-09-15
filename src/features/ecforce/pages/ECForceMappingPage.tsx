import React from 'react'
import { ECForceLayout } from '../components/ECForceLayout'
import { AdvertiserMappingSettings } from '../components/mapping/AdvertiserMappingSettings'

export const ECForceMappingPage: React.FC = () => {
  return (
    <ECForceLayout>
      <AdvertiserMappingSettings />
    </ECForceLayout>
  )
}

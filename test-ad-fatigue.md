# Ad Fatigue Page Testing Guide

## Testing Steps:

1. Navigate to http://localhost:3002/ad-fatigue
2. Check if the page loads without errors
3. Click the "データを同期" button
4. Verify that data is fetched from the Meta API

## Expected Behavior:

- Page should show "広告疲労度分析" header
- Sync button should be visible and clickable
- After sync, ads should appear in the dashboard
- Ads should be categorized by fatigue levels (Critical/Warning/Healthy)

## Current Implementation:

The page uses:
- AdFatiguePageWithSync component for API sync
- FatigueDashboard component for displaying data
- useAdFatigueAnalysis hook for data fetching
- AdFatigueCalculator service for score calculations

## Troubleshooting:

If no data appears after sync:
1. Check browser console for errors
2. Verify Meta account is connected in settings
3. Ensure sync period is configured properly
4. Check network tab for API requests
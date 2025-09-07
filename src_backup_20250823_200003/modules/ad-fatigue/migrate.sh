#!/bin/bash

# Ad Fatigue module migration script

# Services
echo "Moving Ad Fatigue services..."
mv src/services/adFatigueCalculator.ts src/modules/ad-fatigue/services/ 2>/dev/null || true
mv src/services/creativeFatigueAnalyzer.ts src/modules/ad-fatigue/services/ 2>/dev/null || true

# Hooks
echo "Moving Ad Fatigue hooks..."
mv src/hooks/useAdFatigue*.ts src/modules/ad-fatigue/hooks/ 2>/dev/null || true

# Components
echo "Moving Ad Fatigue components..."
cp -r src/components/AdFatigue/* src/modules/ad-fatigue/components/ 2>/dev/null || true

# Data
echo "Moving Ad Fatigue data..."
mkdir -p src/modules/ad-fatigue/data
mv src/data/mockAdFatigueData.ts src/modules/ad-fatigue/data/ 2>/dev/null || true

# Create index files
echo "Creating index files..."

# Services index
cat > src/modules/ad-fatigue/services/index.ts << 'EOF'
export * from './adFatigueCalculator'
export * from './creativeFatigueAnalyzer'
EOF

# Hooks index
cat > src/modules/ad-fatigue/hooks/index.ts << 'EOF'
export * from './useAdFatigueAnalysis'
export * from './useAdFatigue'
export * from './useAdFatigueReal'
export * from './useAdFatigueRealSafe'
export * from './useAdFatigueRealSafeDebug'
EOF

echo "Ad Fatigue module migration completed!"
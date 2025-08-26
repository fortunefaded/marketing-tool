#!/bin/bash

# Meta module migration script

# Services
echo "Moving Meta services..."
mv src/services/metaApiService.ts src/modules/meta/services/
mv src/services/MetaAccountManagerUnified.ts src/modules/meta/services/
mv src/services/metaSyncService.ts src/modules/meta/services/

# Hooks
echo "Moving Meta hooks..."
mv src/hooks/useMetaAccounts.ts src/modules/meta/hooks/ 2>/dev/null || true
mv src/hooks/useMetaApiConfig.ts src/modules/meta/hooks/ 2>/dev/null || true

# Types
echo "Moving Meta types..."
mv src/types/meta-account.ts src/modules/meta/types/ 2>/dev/null || true
mv src/types/meta-api.ts src/modules/meta/types/ 2>/dev/null || true

# Components
echo "Moving Meta components..."
mv src/components/meta/* src/modules/meta/components/ 2>/dev/null || true

# Create index files
echo "Creating index files..."

# Services index
cat > src/modules/meta/services/index.ts << 'EOF'
export * from './metaApiService'
export * from './MetaAccountManagerUnified'
export * from './metaSyncService'
EOF

# Hooks index
cat > src/modules/meta/hooks/index.ts << 'EOF'
export * from './useMetaAccounts'
export * from './useMetaApiConfig'
EOF

# Types index
cat > src/modules/meta/types/index.ts << 'EOF'
export * from './meta-account'
export * from './meta-api'
EOF

# Components index
cat > src/modules/meta/components/index.ts << 'EOF'
export * from './AccountSelector'
export * from './AccountSelectorConvex'
EOF

echo "Meta module migration completed!"
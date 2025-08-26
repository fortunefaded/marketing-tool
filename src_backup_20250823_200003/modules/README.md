# Module Architecture

This directory contains the modular architecture of the Marketing Tool application.

## Module Structure

```
src/modules/
├── meta/                 # Meta (Facebook) API integration
│   ├── services/        # Meta API services
│   ├── hooks/          # React hooks for Meta functionality
│   ├── components/     # Meta-specific components
│   └── types/          # TypeScript types for Meta
│
├── creative/            # Creative management and analytics
│   ├── services/       # Creative data services
│   ├── hooks/         # Creative hooks
│   ├── components/    # Creative components
│   └── types/         # Creative types
│
├── ad-fatigue/         # Ad fatigue analysis
│   ├── services/      # Fatigue calculation services
│   ├── hooks/        # Fatigue analysis hooks
│   ├── components/   # Fatigue UI components
│   ├── data/        # Mock data and fixtures
│   └── types/       # Fatigue types
│
├── ecforce/           # ECForce integration
│   ├── services/     # ECForce API services
│   ├── hooks/       # ECForce hooks
│   ├── components/  # ECForce components
│   └── types/       # ECForce types
│
├── storage/          # Storage abstraction layer
│   ├── interfaces/  # Storage interfaces
│   ├── adapters/   # Storage implementations
│   └── services/   # Storage factories
│
└── shared/          # Shared utilities and common code
    ├── utils/      # Common utilities
    ├── types/      # Shared types
    ├── hooks/      # Common hooks
    └── constants/  # App constants
```

## Module Guidelines

1. **Independence**: Each module should be self-contained and not depend on other modules except `shared` and `storage`.

2. **Clear Interfaces**: Each module exposes its public API through an `index.ts` file.

3. **Type Safety**: All modules must export TypeScript types for their public interfaces.

4. **Testing**: Each module should have its own test directory following the same structure.

## Import Examples

```typescript
// Import from a specific module
import { MetaApiService, useMetaAccounts } from '@/modules/meta'

// Import shared utilities
import { logger, formatCurrency } from '@/modules/shared'

// Import storage abstractions
import { createStorage, StorageType } from '@/modules/storage'
```

## Migration Status

- [x] Storage module created
- [x] Shared utilities module created
- [ ] Meta module migration in progress
- [ ] Creative module migration pending
- [ ] Ad Fatigue module migration pending
- [ ] ECForce module migration pending

## Benefits

1. **Better Organization**: Related code is grouped together
2. **Easier Testing**: Module boundaries make testing easier
3. **Code Reusability**: Modules can be reused across projects
4. **Scalability**: New features can be added as new modules
5. **Maintainability**: Clear separation of concerns
# Refactoring Prompt for Claude Code - Meta API Priority Focus

## System Context
You are a senior software architect tasked with refactoring a React/TypeScript marketing tool application. The project currently has 271 TypeScript errors and requires significant architectural improvements. The Meta API integration is the CORE FUNCTIONALITY of this system, not just another feature.

## Critical Priority: Meta API as Core Infrastructure

### Meta API Architecture Requirements
The Meta API integration must be treated as the foundational layer of the application. Every refactoring decision should prioritize:
1. **Token Security**: Implement bank-level security for token management
2. **Data Integrity**: Ensure 100% consistency between cached and real-time data
3. **Resilience**: Build fault-tolerant communication with automatic recovery
4. **Performance**: Optimize for minimal API calls while maintaining data freshness

### Current Meta API Structure (DO NOT BREAK)
```
src/features/meta-api/
├── core/           # Foundation layer - CRITICAL
│   ├── api-client.ts
│   ├── token.ts    # Security-critical
│   └── types.ts
├── fatigue/        # Business logic layer
├── hooks/          # React integration layer
└── components/     # Presentation layer
```

## Refactoring Implementation Phases

### Phase 1: Meta API Foundation Strengthening (Week 1) - HIGHEST PRIORITY
**Goal**: Achieve bulletproof Meta API integration

1. **Secure Token Management**
   ```typescript
   // Implement in src/features/meta-api/core/secure-token-manager.ts
   class SecureTokenManager {
     - Encrypted storage (use Web Crypto API)
     - Automatic refresh before expiration
     - Token rotation strategy
     - Audit logging for all token operations
     - Zero-trust verification on each use
   }
   ```

2. **Resilient API Client**
   ```typescript
   // Implement in src/features/meta-api/core/resilient-client.ts
   class ResilientMetaApiClient {
     - Circuit breaker pattern (fail fast, recover gracefully)
     - Exponential backoff with jitter
     - Request deduplication
     - Response caching with TTL
     - Comprehensive error taxonomy
   }
   ```

3. **Data Synchronization Layer**
   ```typescript
   // Implement in src/features/meta-api/core/sync-manager.ts
   class MetaDataSyncManager {
     - Optimistic updates with rollback
     - Conflict resolution strategy
     - Delta synchronization
     - Background sync with Web Workers
     - Data versioning
   }
   ```

### Phase 2: TypeScript Quality Gates (Week 2)
**Goal**: Zero TypeScript errors in Meta API code

1. **Type Safety Enforcement**
   - Eliminate ALL `any` types in Meta API modules
   - Implement strict type guards for API responses
   - Use branded types for IDs and tokens
   - Implement exhaustive type checking

2. **Error Handling Types**
   ```typescript
   type MetaApiResult<T> = 
     | { success: true; data: T; cached: boolean }
     | { success: false; error: MetaApiError; retryable: boolean }
   ```

### Phase 3: Architecture Refinement (Weeks 3-4)
**Goal**: Clean, maintainable, scalable architecture

1. **Directory Structure Migration**
   ```
   src/
   ├── core/                    # Application core (Meta API lives here)
   │   ├── meta-api/           # THE core feature
   │   ├── auth/               # Authentication (depends on Meta API)
   │   └── data/               # Data layer (integrates with Meta API)
   ├── features/               # Feature modules (consume Meta API)
   ├── shared/                 # Shared resources
   └── infrastructure/         # Technical infrastructure
   ```

2. **Dependency Rules**
   - Meta API can only depend on infrastructure
   - Features MUST use Meta API through defined interfaces
   - No direct Meta API access from UI components

### Phase 4: Performance & Quality (Weeks 5-6)
**Goal**: Production-ready, performant system

1. **Performance Metrics**
   - Meta API response time < 200ms (cached)
   - Token refresh < 100ms
   - Zero failed requests due to token issues
   - 99.9% uptime for Meta API connectivity

2. **Quality Metrics**
   - 100% test coverage for Meta API core
   - 0 TypeScript errors
   - 0 security vulnerabilities
   - Complete API documentation

## Implementation Guidelines

### Code Review Checklist for Meta API Changes
- [ ] Does this change maintain backward compatibility?
- [ ] Are all API calls wrapped in proper error handling?
- [ ] Is token security maintained?
- [ ] Are there tests for failure scenarios?
- [ ] Is the change documented?
- [ ] Does it follow the resilience patterns?

### Testing Strategy for Meta API
```typescript
describe('Meta API Integration', () => {
  describe('Token Management', () => {
    it('should never expose tokens in logs')
    it('should refresh tokens before expiration')
    it('should handle token rotation without service interruption')
  })
  
  describe('API Resilience', () => {
    it('should retry with exponential backoff')
    it('should circuit break after 5 consecutive failures')
    it('should serve cached data when API is unavailable')
  })
  
  describe('Data Integrity', () => {
    it('should maintain consistency between cache and API')
    it('should handle concurrent updates correctly')
    it('should rollback optimistic updates on failure')
  })
})
```

### Security Requirements
1. **Never** store tokens in localStorage
2. **Always** use secure cookie storage with httpOnly flag
3. **Implement** CSRF protection for all Meta API calls
4. **Log** all authentication events
5. **Monitor** for suspicious token usage patterns

### Performance Requirements
1. **Cache** all Meta API responses with appropriate TTL
2. **Batch** API requests when possible
3. **Implement** request deduplication
4. **Use** Web Workers for heavy data processing
5. **Optimize** bundle size (Meta API client < 50KB)

### Error Handling Philosophy
```typescript
// NEVER do this:
try {
  const data = await metaApi.getData()
} catch (error) {
  console.log(error) // Too generic
}

// ALWAYS do this:
const result = await metaApi.getData()
if (!result.success) {
  switch (result.error.code) {
    case 'TOKEN_EXPIRED':
      await handleTokenRefresh()
      break
    case 'RATE_LIMITED':
      await handleRateLimit(result.error.retryAfter)
      break
    case 'NETWORK_ERROR':
      return getCachedData()
    default:
      exhaustiveCheck(result.error.code)
  }
}
```

## Migration Strategy

### Week 1: Foundation
- Day 1-2: Implement SecureTokenManager
- Day 3-4: Implement ResilientMetaApiClient
- Day 5: Integration testing and rollback planning

### Week 2: Type Safety
- Day 1-2: Fix critical TypeScript errors in Meta API
- Day 3-4: Implement comprehensive type guards
- Day 5: Type coverage verification

### Week 3-4: Architecture
- Gradual migration with feature flags
- Parallel running of old and new systems
- A/B testing for performance validation

### Week 5-6: Polish
- Performance optimization
- Documentation completion
- Production readiness review

## Success Criteria

### Must Have (Non-negotiable)
- Zero security vulnerabilities in Meta API
- 100% token operation success rate
- Zero data inconsistency issues
- Complete error recovery capability

### Should Have
- Response time < 200ms for 95% of requests
- 90% code coverage
- Comprehensive documentation
- Monitoring and alerting

### Nice to Have
- GraphQL integration
- Real-time subscriptions
- Predictive token refresh
- ML-based error prediction

## Risk Mitigation

### Risk: Meta API Specification Changes
**Mitigation**: 
- Implement adapter pattern
- Version all API interfaces
- Maintain compatibility layer for 2 versions

### Risk: Token Security Breach
**Mitigation**:
- Implement token encryption at rest
- Use short-lived tokens (15 minutes)
- Implement anomaly detection
- Have emergency token revocation procedure

### Risk: Data Inconsistency
**Mitigation**:
- Implement event sourcing
- Use optimistic locking
- Maintain audit trail
- Have data reconciliation process

## Final Notes

Remember: The Meta API is not just a feature, it's the HEART of this application. Every line of code you write should consider:
1. How does this affect Meta API reliability?
2. Does this maintain our security posture?
3. Will this scale with Meta API growth?
4. Can we recover if Meta API fails?

Treat the Meta API integration with the same care as handling financial transactions or medical records. This is business-critical infrastructure that demands excellence.
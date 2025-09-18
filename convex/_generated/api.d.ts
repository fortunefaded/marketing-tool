/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as advertiserMappings from "../advertiserMappings.js";
import type * as apiConfig from "../apiConfig.js";
import type * as cache_cacheEntries from "../cache/cacheEntries.js";
import type * as cache_dataFreshness from "../cache/dataFreshness.js";
import type * as cache_differentialUpdates from "../cache/differentialUpdates.js";
import type * as ecforce from "../ecforce.js";
import type * as ecforceAggregates from "../ecforceAggregates.js";
import type * as ecforceLimited from "../ecforceLimited.js";
import type * as ecforceMonthlyAggregation from "../ecforceMonthlyAggregation.js";
import type * as ecforcePeriodAnalysis from "../ecforcePeriodAnalysis.js";
import type * as ecforceTestSync from "../ecforceTestSync.js";
import type * as ecforceTrendOptimized from "../ecforceTrendOptimized.js";
import type * as kpiSnapshots from "../kpiSnapshots.js";
import type * as metaAccounts from "../metaAccounts.js";
import type * as metaDailySummary from "../metaDailySummary.js";
import type * as metaInsights from "../metaInsights.js";
import type * as metaMonthlySummary from "../metaMonthlySummary.js";
import type * as syncSettings from "../syncSettings.js";
import type * as tokens from "../tokens.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  advertiserMappings: typeof advertiserMappings;
  apiConfig: typeof apiConfig;
  "cache/cacheEntries": typeof cache_cacheEntries;
  "cache/dataFreshness": typeof cache_dataFreshness;
  "cache/differentialUpdates": typeof cache_differentialUpdates;
  ecforce: typeof ecforce;
  ecforceAggregates: typeof ecforceAggregates;
  ecforceLimited: typeof ecforceLimited;
  ecforceMonthlyAggregation: typeof ecforceMonthlyAggregation;
  ecforcePeriodAnalysis: typeof ecforcePeriodAnalysis;
  ecforceTestSync: typeof ecforceTestSync;
  ecforceTrendOptimized: typeof ecforceTrendOptimized;
  kpiSnapshots: typeof kpiSnapshots;
  metaAccounts: typeof metaAccounts;
  metaDailySummary: typeof metaDailySummary;
  metaInsights: typeof metaInsights;
  metaMonthlySummary: typeof metaMonthlySummary;
  syncSettings: typeof syncSettings;
  tokens: typeof tokens;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

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
import type * as apiConfig from "../apiConfig.js";
import type * as cache_cacheEntries from "../cache/cacheEntries.js";
import type * as cache_dataFreshness from "../cache/dataFreshness.js";
import type * as cache_differentialUpdates from "../cache/differentialUpdates.js";
import type * as ecforce from "../ecforce.js";
import type * as metaAccounts from "../metaAccounts.js";
import type * as metaInsights from "../metaInsights.js";
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
  apiConfig: typeof apiConfig;
  "cache/cacheEntries": typeof cache_cacheEntries;
  "cache/dataFreshness": typeof cache_dataFreshness;
  "cache/differentialUpdates": typeof cache_differentialUpdates;
  ecforce: typeof ecforce;
  metaAccounts: typeof metaAccounts;
  metaInsights: typeof metaInsights;
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

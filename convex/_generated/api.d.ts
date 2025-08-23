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
import type * as adFatigue from "../adFatigue.js";
import type * as adFatigueCalculation from "../adFatigueCalculation.js";
import type * as adFatigueCalculator from "../adFatigueCalculator.js";
import type * as analytics from "../analytics.js";
import type * as apiConfig from "../apiConfig.js";
import type * as campaigns from "../campaigns.js";
import type * as clearMetaInsights from "../clearMetaInsights.js";
import type * as config_fatigueThresholds from "../config/fatigueThresholds.js";
import type * as config_thresholdRationale from "../config/thresholdRationale.js";
import type * as creativeAnalytics from "../creativeAnalytics.js";
import type * as creativeMetrics from "../creativeMetrics.js";
import type * as creativeMetricsCache from "../creativeMetricsCache.js";
import type * as creatives from "../creatives.js";
import type * as dashboardSettings from "../dashboardSettings.js";
import type * as dynamicThresholds from "../dynamicThresholds.js";
import type * as ecforce from "../ecforce.js";
import type * as ecforceConfig from "../ecforceConfig.js";
import type * as ecforceOrders from "../ecforceOrders.js";
import type * as favoriteAnalyses from "../favoriteAnalyses.js";
import type * as filterPresets from "../filterPresets.js";
import type * as functions_metaSync from "../functions/metaSync.js";
import type * as functions_realtime from "../functions/realtime.js";
import type * as instagramMetrics from "../instagramMetrics.js";
import type * as instagramValueMetrics from "../instagramValueMetrics.js";
import type * as memories from "../memories.js";
import type * as metaAccounts from "../metaAccounts.js";
import type * as metaInsights from "../metaInsights.js";
import type * as metaSync from "../metaSync.js";
import type * as metaSyncStatus from "../metaSyncStatus.js";
import type * as reporting_fatigueReport from "../reporting/fatigueReport.js";
import type * as sampleData from "../sampleData.js";
import type * as scheduledFatigueAnalysis from "../scheduledFatigueAnalysis.js";
import type * as scheduledFunctions from "../scheduledFunctions.js";
import type * as scheduledReports from "../scheduledReports.js";
import type * as syncMetadata from "../syncMetadata.js";
import type * as syncSettings from "../syncSettings.js";
import type * as tasks from "../tasks.js";
import type * as tokens from "../tokens.js";
import type * as videoAdMetrics from "../videoAdMetrics.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  adFatigue: typeof adFatigue;
  adFatigueCalculation: typeof adFatigueCalculation;
  adFatigueCalculator: typeof adFatigueCalculator;
  analytics: typeof analytics;
  apiConfig: typeof apiConfig;
  campaigns: typeof campaigns;
  clearMetaInsights: typeof clearMetaInsights;
  "config/fatigueThresholds": typeof config_fatigueThresholds;
  "config/thresholdRationale": typeof config_thresholdRationale;
  creativeAnalytics: typeof creativeAnalytics;
  creativeMetrics: typeof creativeMetrics;
  creativeMetricsCache: typeof creativeMetricsCache;
  creatives: typeof creatives;
  dashboardSettings: typeof dashboardSettings;
  dynamicThresholds: typeof dynamicThresholds;
  ecforce: typeof ecforce;
  ecforceConfig: typeof ecforceConfig;
  ecforceOrders: typeof ecforceOrders;
  favoriteAnalyses: typeof favoriteAnalyses;
  filterPresets: typeof filterPresets;
  "functions/metaSync": typeof functions_metaSync;
  "functions/realtime": typeof functions_realtime;
  instagramMetrics: typeof instagramMetrics;
  instagramValueMetrics: typeof instagramValueMetrics;
  memories: typeof memories;
  metaAccounts: typeof metaAccounts;
  metaInsights: typeof metaInsights;
  metaSync: typeof metaSync;
  metaSyncStatus: typeof metaSyncStatus;
  "reporting/fatigueReport": typeof reporting_fatigueReport;
  sampleData: typeof sampleData;
  scheduledFatigueAnalysis: typeof scheduledFatigueAnalysis;
  scheduledFunctions: typeof scheduledFunctions;
  scheduledReports: typeof scheduledReports;
  syncMetadata: typeof syncMetadata;
  syncSettings: typeof syncSettings;
  tasks: typeof tasks;
  tokens: typeof tokens;
  videoAdMetrics: typeof videoAdMetrics;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

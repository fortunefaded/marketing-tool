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
import type * as adFatigueCalculator from "../adFatigueCalculator.js";
import type * as analytics from "../analytics.js";
import type * as campaigns from "../campaigns.js";
import type * as config_fatigueThresholds from "../config/fatigueThresholds.js";
import type * as config_thresholdRationale from "../config/thresholdRationale.js";
import type * as creativeAnalytics from "../creativeAnalytics.js";
import type * as creativeMetrics from "../creativeMetrics.js";
import type * as creatives from "../creatives.js";
import type * as dynamicThresholds from "../dynamicThresholds.js";
import type * as ecforce from "../ecforce.js";
import type * as functions_metaSync from "../functions/metaSync.js";
import type * as functions_realtime from "../functions/realtime.js";
import type * as instagramValueMetrics from "../instagramValueMetrics.js";
import type * as metaAccounts from "../metaAccounts.js";
import type * as metaInsights from "../metaInsights.js";
import type * as metaSync from "../metaSync.js";
import type * as reporting_fatigueReport from "../reporting/fatigueReport.js";
import type * as scheduledFatigueAnalysis from "../scheduledFatigueAnalysis.js";
import type * as scheduledFunctions from "../scheduledFunctions.js";
import type * as tasks from "../tasks.js";
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
  adFatigueCalculator: typeof adFatigueCalculator;
  analytics: typeof analytics;
  campaigns: typeof campaigns;
  "config/fatigueThresholds": typeof config_fatigueThresholds;
  "config/thresholdRationale": typeof config_thresholdRationale;
  creativeAnalytics: typeof creativeAnalytics;
  creativeMetrics: typeof creativeMetrics;
  creatives: typeof creatives;
  dynamicThresholds: typeof dynamicThresholds;
  ecforce: typeof ecforce;
  "functions/metaSync": typeof functions_metaSync;
  "functions/realtime": typeof functions_realtime;
  instagramValueMetrics: typeof instagramValueMetrics;
  metaAccounts: typeof metaAccounts;
  metaInsights: typeof metaInsights;
  metaSync: typeof metaSync;
  "reporting/fatigueReport": typeof reporting_fatigueReport;
  scheduledFatigueAnalysis: typeof scheduledFatigueAnalysis;
  scheduledFunctions: typeof scheduledFunctions;
  tasks: typeof tasks;
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

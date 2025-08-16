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
import type * as analytics from "../analytics.js";
import type * as campaigns from "../campaigns.js";
import type * as creatives from "../creatives.js";
import type * as functions_metaSync from "../functions/metaSync.js";
import type * as functions_realtime from "../functions/realtime.js";
import type * as metaSync from "../metaSync.js";
import type * as tasks from "../tasks.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  campaigns: typeof campaigns;
  creatives: typeof creatives;
  "functions/metaSync": typeof functions_metaSync;
  "functions/realtime": typeof functions_realtime;
  metaSync: typeof metaSync;
  tasks: typeof tasks;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

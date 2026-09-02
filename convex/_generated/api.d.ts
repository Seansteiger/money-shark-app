/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as bootstrap from "../bootstrap.js";
import type * as customers from "../customers.js";
import type * as http from "../http.js";
import type * as loans from "../loans.js";
import type * as passkeys from "../passkeys.js";
import type * as reset from "../reset.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as trash from "../trash.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  bootstrap: typeof bootstrap;
  customers: typeof customers;
  http: typeof http;
  loans: typeof loans;
  passkeys: typeof passkeys;
  reset: typeof reset;
  seed: typeof seed;
  settings: typeof settings;
  trash: typeof trash;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

import { ConvexReactClient } from "convex/react";

const getConvexUrl = () => {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_CONVEX_URL) {
    return process.env.NEXT_PUBLIC_CONVEX_URL;
  }
  // @ts-ignore
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_CONVEX_URL) {
    // @ts-ignore
    return import.meta.env.VITE_CONVEX_URL;
  }
  return "";
};

const convexUrl = getConvexUrl();

// Convex CLI will configure the URL. We use a placeholder to prevent build-time crashes.
export const convex = new ConvexReactClient(convexUrl || "https://placeholder-url.convex.cloud");

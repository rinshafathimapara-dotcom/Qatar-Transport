import type { NextConfig } from "next";
const config: NextConfig = {
  outputFileTracingIncludes: {
    "/api/walk": ["./data/routing/*.json.gz"],
    "/api/transit-shape": ["./data/routing/*.json.gz"],
  },
};
export default config;

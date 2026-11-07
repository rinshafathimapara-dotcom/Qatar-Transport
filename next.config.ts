import type { NextConfig } from "next";
const config: NextConfig = {
  outputFileTracingIncludes: {
    "/api/geocode": ["./data/geocoding/*.json.gz"],
    "/api/walk": ["./data/routing/*.json.gz"],
    "/api/transit-shape": ["./data/routing/*.json.gz"],
  },
};
export default config;

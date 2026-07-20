import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
});

const nextConfig: NextConfig = {
  transpilePackages: ["@arnius/core"],
};

// En desarrollo no envolvemos con Serwist: no hay service worker (evita cachés
// fantasma al programar) y su wrapper inyecta config de webpack, que hace
// abortar a `next dev` en Next 16 (Turbopack por default).
export default process.env.NODE_ENV === "development" ? nextConfig : withSerwist(nextConfig);

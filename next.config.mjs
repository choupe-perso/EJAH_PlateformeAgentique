/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @napi-rs/keyring et playwright embarquent des binaires natifs que
  // webpack ne sait pas empaqueter - ils doivent rester des dependances
  // externes cote serveur (jamais bundlees).
  experimental: {
    serverComponentsExternalPackages: ["@napi-rs/keyring", "playwright", "playwright-core"],
  },
};

export default nextConfig;

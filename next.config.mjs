/** @type {import('next').NextConfig} */
const nextConfig = {
  // Type-checking runs in CI/locally via `npm run typecheck`; the Netlify build stays fast.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;

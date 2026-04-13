/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  ...(process.env.DEV_IP_ADDRESS ? { allowedDevOrigins: [process.env.DEV_IP_ADDRESS] } : {}),
};

export default nextConfig;

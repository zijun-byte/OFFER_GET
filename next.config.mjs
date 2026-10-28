/** @type {import('next').NextConfig} */
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

if (process.env.NODE_ENV === 'development') initOpenNextCloudflareForDev();

const nextConfig = {
  allowedDevOrigins: ['192.168.31.90'],
};

export default nextConfig;

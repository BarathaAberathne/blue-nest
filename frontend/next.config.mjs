/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Uploaded images served by the Go API (dev + Docker)
      { protocol: "http",  hostname: "localhost",  port: "8080" },
      { protocol: "http",  hostname: "0.0.0.0",   port: "8080" },
      // Production: add your domain, e.g. { protocol: "https", hostname: "api.bluenest.uk" }
    ],
  },
};

export default nextConfig;

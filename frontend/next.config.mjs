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
      // Docker-internal service name (used by Next.js image optimiser server-side)
      { protocol: "http",  hostname: "blue-nest-api",  port: "8080" },
      { protocol: "http",  hostname: "backend",         port: "8080" },
      // Production: add your domain, e.g. { protocol: "https", hostname: "api.bluenest.uk" }
    ],
  },
  async rewrites() {
    // Proxy /uploads/* to the Go backend so Next/Image can optimise them
    // server-side without ECONNREFUSED (localhost doesn't resolve inside Docker).
    // NEXT_PUBLIC_API_INTERNAL_URL is only read at server startup; it defaults to
    // the Docker service name so the image optimiser can reach the backend.
    const backendInternal =
      process.env.NEXT_PUBLIC_API_INTERNAL_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:8080";
    return [
      {
        source: "/uploads/:path*",
        destination: `${backendInternal}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;

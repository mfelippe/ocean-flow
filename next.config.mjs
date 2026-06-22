/** @type {import('next').NextConfig} */
const nextConfig = {
  // Gera um bundle autocontido para a imagem Docker (deploy self-hosted).
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    // Permite upload de anexos via Server Action (limite padrão é 1MB).
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;

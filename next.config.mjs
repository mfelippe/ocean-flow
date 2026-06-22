/** @type {import('next').NextConfig} */
const nextConfig = {
  // Gera um bundle autocontido para a imagem Docker (deploy self-hosted).
  output: "standalone",
  reactStrictMode: true,
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Habilitar output standalone para Docker
  output: 'standalone',

  // pdf-parse (pdfjs-dist) quebra quando o webpack do Next tenta empacotá-lo
  // nas rotas server — roda só com require() nativo do Node em runtime.
  serverExternalPackages: ['pdf-parse'],

  // Otimizações
  poweredByHeader: false,
  compress: true,

  // Permitir imagens de qualquer domínio (ajustar em produção)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le générateur de PDF (analyse préliminaire) tourne côté serveur, hors du
  // bundle : il dépend de modules Node (fontkit, zlib) que Turbopack n'a pas à emballer.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;

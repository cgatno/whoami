import type { APIRoute } from "astro";

// Dynamically generate robots.txt
export const GET: APIRoute = ({ site }) => {
  return new Response(
    `User-agent: *
Allow: /

Sitemap: ${new URL("/sitemap-index.xml", site).toString()}`,
  );
};

// @ts-check
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import portfolio from "./portfolio.config.json" assert { type: "json" };

const basePath = portfolio.site?.basePath ?? "";

// https://astro.build/config
export default defineConfig({
  site: portfolio.site?.url,
  base: basePath || undefined,
  integrations: [tailwind()],
});

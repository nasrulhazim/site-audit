import { defineConfig } from 'astro/config'
import tailwind from '@astrojs/tailwind'

export default defineConfig({
  site: 'https://siteaudit.netlify.app',
  integrations: [tailwind()],
  output: 'static',
})

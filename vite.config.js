import { defineConfig } from 'vite'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const root = import.meta.dirname

// Every top-level *.html file is a page.
const pages = Object.fromEntries(
  readdirSync(root)
    .filter((f) => f.endsWith('.html') && f !== 'lab.html')
    // PAGES=index,train limits a build to some pages.
    .filter((f) => !process.env.PAGES || process.env.PAGES.split(',').includes(f.replace(/\.html$/, '')))
    .map((f) => [f.replace(/\.html$/, ''), resolve(root, f)]),
)

// <!-- @include partials/header.html --> pulls a shared partial into a page.
// Partials may set data via attributes, e.g. <!-- @include partials/header.html page="train" -->
function includePartials() {
  const re = /<!--\s*@include\s+([\w./-]+)((?:\s+[\w-]+="[^"]*")*)\s*-->/g
  const render = (html, depth = 0) =>
    depth > 4
      ? html
      : html.replace(re, (_, file, attrs) => {
          const vars = Object.fromEntries([...attrs.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]))
          let partial = readFileSync(resolve(root, file), 'utf8')
          partial = partial.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (__, k) => vars[k] ?? '')
          return render(partial, depth + 1)
        })
  return {
    name: 'include-partials',
    transformIndexHtml: { order: 'pre', handler: (html) => render(html) },
    handleHotUpdate({ file, server }) {
      if (file.includes('/partials/')) server.ws.send({ type: 'full-reload' })
    },
  }
}

export default defineConfig({
  plugins: [includePartials()],
  // three.js is most of the voyage chunk; it loads after the page has rendered.
  build: { rollupOptions: { input: pages }, chunkSizeWarningLimit: 800 },
  server: { port: 5173, host: true },
})

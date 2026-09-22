import { mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import * as esbuild from 'esbuild'
import { lucideBarrelPlugin } from '../config/scripts/build-mobile-web-app-bundle.mjs'

const mobileDir = fileURLToPath(new URL('../mobile', import.meta.url))
const out = await mkdtemp(join(tmpdir(), 'probe-'))
const SOURCE = `
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { Text } from 'react-native'
import { RpcClientProvider } from '../transport/client-context.web'
import { MobileHtmlPreview, MOBILE_HTML_PREVIEW_SANDBOX } from './MobileHtmlPreview'

window.__sandbox = MOBILE_HTML_PREVIEW_SANDBOX
window.__mount = (html, grants) => {
  const client = { getShellSession: () => ({ grants: { native: grants } }) }
  createRoot(document.getElementById('root')).render(
    createElement(RpcClientProvider, { client },
      createElement(MobileHtmlPreview, { html, renderSource: () => createElement(Text, null, 'S') }))
  )
}
`
const result = await esbuild.build({
  absWorkingDir: mobileDir,
  stdin: { contents: SOURCE, resolveDir: join(mobileDir, 'src/components'), loader: 'tsx', sourcefile: 'probe.tsx' },
  bundle: true,
  format: 'iife',
  outfile: join(out, 'probe.js'),
  target: ['es2022'],
  jsx: 'automatic',
  logLevel: 'warning',
  plugins: [lucideBarrelPlugin],
  nodePaths: [join(mobileDir, 'node_modules')],
  alias: { 'react-native': 'react-native-web' },
  resolveExtensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js'],
  define: { __DEV__: 'false', 'process.env.NODE_ENV': '"production"' },
  metafile: true
})
console.log('bundled ok, inputs:', Object.keys(result.metafile.inputs).length)

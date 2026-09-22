import { mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import * as esbuild from 'esbuild'
import { lucideBarrelPlugin } from '../config/scripts/build-mobile-web-app-bundle.mjs'
import { ENTRY_SOURCE } from '../config/scripts/mobile-web-app-preview-artifact-fixture.mjs'

const mobileDir = fileURLToPath(new URL('../mobile', import.meta.url))
const out = await mkdtemp(join(tmpdir(), 'probe2-'))
const result = await esbuild.build({
  absWorkingDir: mobileDir,
  stdin: { contents: ENTRY_SOURCE, resolveDir: join(mobileDir, 'src/components'), loader: 'tsx', sourcefile: 'probe.tsx' },
  bundle: true, format: 'iife', outfile: join(out, 'probe.js'), target: ['es2022'], jsx: 'automatic',
  logLevel: 'warning', plugins: [lucideBarrelPlugin], nodePaths: [join(mobileDir, 'node_modules')],
  alias: { 'react-native': 'react-native-web' },
  resolveExtensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js'],
  define: { __DEV__: 'false', 'process.env.NODE_ENV': '"production"' }, metafile: true
})
const bytes = Object.values(result.metafile.outputs)[0].bytes
console.log('baseline inputs:', Object.keys(result.metafile.inputs).length, 'bytes:', bytes)

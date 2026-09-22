import { mobileWebAppRouteClosure } from '../config/scripts/build-mobile-web-app-bundle.mjs'
import { PAGE_ROUTE_MODULES } from '../config/scripts/mobile-web-app-page-route-modules.mjs'

for (const [route, mod] of PAGE_ROUTE_MODULES) {
  const closure = await mobileWebAppRouteClosure(mod)
  const hits = closure.local.filter((f) => /MobileHtmlPreview|MobileSessionFileReader/.test(f))
  console.log(route, JSON.stringify(hits))
}

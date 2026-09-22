/**
 * The artifact with its links turned back into text, for a shell that cannot open one.
 *
 * Ruling 37.2 is the specification: no underline, no pointer, and no dead anchor a tap does nothing
 * on. Removing `href` is what delivers all three at once, because it is what the HTML definition of
 * a link turns on -- `a:any-link` stops matching, so the UA stylesheet stops underlining and stops
 * setting the pointer cursor, the element leaves the tab order, and activating it does nothing
 * because there is nothing to activate. The text the author wrote stays exactly where it was, which
 * is what makes this a hidden affordance rather than a degraded screen.
 *
 * Done with the browser's own parser rather than over the string. A regex would have to decide what
 * is an attribute inside an artifact written by an agent, and the two answers that matter -- an
 * `href` inside a comment or a `<template>`, and an `href` this pass failed to see -- are both
 * wrong in a way nothing downstream could notice. `parseFromString` builds a document with no
 * browsing context: no script runs, no subresource is fetched, nothing is laid out.
 *
 * `<area>` as well as `<a>`, because an image map is a link with a shape instead of a box, and
 * `xlink:href` as well as `href`, because that is how an `<a>` inside inline SVG is spelled.
 *
 * Belt and braces with the sandbox: the frame also loses
 * `allow-top-navigation-by-user-activation` on this path, so a link this pass somehow missed is
 * refused by the browsing context as well. Neither fence is the other's excuse -- the sandbox alone
 * would leave the dead anchor the ruling forbids, and this alone would leave a document whose
 * context could still navigate the top frame.
 */
export function htmlPreviewWithInertLinks(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  for (const link of doc.querySelectorAll('a, area')) {
    link.removeAttribute('href')
    link.removeAttributeNS('http://www.w3.org/1999/xlink', 'href')
    // The frame is sealed either way, so this changes nothing a browser would do. It is removed
    // because `target` on a non-link is meaningless markup a Source-tab reader would have to
    // explain away, and the Source tab shows the original.
    link.removeAttribute('target')
  }
  // Re-emitted rather than dropped: without a doctype the frame parses in quirks mode, where an
  // artifact's `height: 100%` resolves against nothing and a full-bleed document collapses. The
  // parser reports the one it read, so an artifact that shipped without one still gets none.
  const doctype = doc.doctype === null ? '' : `<!DOCTYPE ${doc.doctype.name}>`
  return `${doctype}${doc.documentElement.outerHTML}`
}

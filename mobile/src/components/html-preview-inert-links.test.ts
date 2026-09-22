// @vitest-environment happy-dom
/**
 * The link-inerting pass, read as the specification ruling 37.2 wrote: no underline, no pointer, no
 * dead anchor.
 *
 * All three are one property of the document -- whether the element is a link at all -- so this file
 * measures that property and `config/scripts/mobile-web-app-html-preview-render.test.mjs` measures
 * what a real browser then paints and does with it on both engines. Neither reading substitutes for
 * the other: happy-dom has no UA stylesheet and no cursor, and the render rig cannot say which
 * attribute went.
 */
import { describe, expect, it } from 'vitest'
import { htmlPreviewWithInertLinks } from './html-preview-inert-links'

/** The rewritten document, re-parsed, so every case reads a tree rather than a string. */
function inert(html: string): Document {
  return new DOMParser().parseFromString(htmlPreviewWithInertLinks(html), 'text/html')
}

const ARTIFACT =
  '<!doctype html><html><head><title>A</title></head><body>' +
  '<h1 id="marker">text</h1>' +
  '<a id="top" href="https://example.com/a" target="_top">tap</a>' +
  '<a id="blank" href="https://example.com/b" target="_blank">window</a>' +
  '<a id="root" href="/">root</a>' +
  '<a id="named" name="anchor">named</a>' +
  '<img id="mapped" src="x.png" usemap="#m" />' +
  '<map name="m"><area id="area" href="https://example.com/c" shape="rect" coords="0,0,1,1" /></map>' +
  '<svg viewBox="0 0 1 1"><a id="svglink" href="https://example.com/d"><rect /></a></svg>' +
  '</body></html>'

describe('an artifact rendered for a shell that cannot open a link', () => {
  it('leaves no element a browser would treat as a link', () => {
    // The whole of "no underline, no pointer, no dead anchor": all three follow from `a:any-link`
    // not matching, and `href` is what it matches on.
    expect(inert(ARTIFACT).querySelectorAll('a[href], area[href]')).toHaveLength(0)
  })

  it('keeps the text, the headings and the images the author wrote', () => {
    const doc = inert(ARTIFACT)
    expect(doc.getElementById('marker')?.textContent).toBe('text')
    expect(doc.getElementById('top')?.textContent).toBe('tap')
    expect(doc.getElementById('blank')?.textContent).toBe('window')
    expect(doc.getElementById('mapped')?.getAttribute('src')).toBe('x.png')
    expect(doc.title).toBe('A')
    // The elements are still there and still in order: this is a hidden affordance, not a deletion.
    expect([...doc.querySelectorAll('a')].map((one) => one.id)).toEqual([
      'top',
      'blank',
      'root',
      'named',
      'svglink'
    ])
  })

  it('drops the target with the href, so no non-link carries link markup', () => {
    const doc = inert(ARTIFACT)
    expect(doc.getElementById('top')?.hasAttribute('target')).toBe(false)
    expect(doc.getElementById('blank')?.hasAttribute('target')).toBe(false)
  })

  it('reaches an image map and an SVG link, which a pass over `a[href]` alone would not', () => {
    const doc = inert(ARTIFACT)
    expect(doc.getElementById('area')?.hasAttribute('href')).toBe(false)
    // Still an area with its shape: the map is intact, it just goes nowhere.
    expect(doc.getElementById('area')?.getAttribute('shape')).toBe('rect')
    expect(doc.getElementById('svglink')?.hasAttribute('href')).toBe(false)
  })

  it('leaves an anchor that was never a link alone, which is most of what a document has', () => {
    // `<a name>` has no href to begin with, so nothing here should have changed about it.
    expect(inert(ARTIFACT).getElementById('named')?.getAttribute('name')).toBe('anchor')
  })

  it('keeps the doctype, because quirks mode collapses a full-bleed artifact', () => {
    // Measured as the string, not the tree: the doctype is what the frame is parsed under, and a
    // document node exists either way.
    expect(htmlPreviewWithInertLinks(ARTIFACT).toLowerCase().startsWith('<!doctype html>')).toBe(
      true
    )
    // And an artifact that shipped without one still gets none, rather than being handed a mode it
    // was not written for.
    expect(htmlPreviewWithInertLinks('<html><body>x</body></html>').toLowerCase()).not.toContain(
      '<!doctype'
    )
  })

  it('does not run or fetch what the artifact carries, because nothing here has a context', () => {
    // The parse is inert by definition (`parseFromString` builds no browsing context), and this is
    // the reading that says the pass did not change that: the script survives as markup, unrun.
    const withScript =
      '<!doctype html><html><body><script>window.__ran = 1</script><a href="/x">a</a></body></html>'
    const out = htmlPreviewWithInertLinks(withScript)
    expect(out).toContain('window.__ran = 1')
    expect(Reflect.get(globalThis, '__ran')).toBeUndefined()
  })

  it('leaves an href inside a comment or a template where a regex pass would have found it', () => {
    // The reason this is a parser and not a pattern: both of these are text to a browser, and a
    // pass that rewrote them would be editing the artifact rather than its links.
    const doc = inert(
      '<!doctype html><html><body><!-- <a href="https://example.com/x">c</a> -->' +
        '<template><a id="tpl" href="https://example.com/y">t</a></template>' +
        '<a id="real" href="https://example.com/z">r</a></body></html>'
    )
    expect(doc.body.innerHTML).toContain('href="https://example.com/x"')
    // A template's content is a fragment `querySelectorAll` does not walk, and nothing in it is
    // rendered, so its links are markup too. Read off the template rather than the document.
    const template = doc.querySelector('template')
    expect(template?.content.getElementById('tpl')?.getAttribute('href')).toBe(
      'https://example.com/y'
    )
    // The control for both: a link that is rendered did lose its href.
    expect(doc.getElementById('real')?.hasAttribute('href')).toBe(false)
  })
})

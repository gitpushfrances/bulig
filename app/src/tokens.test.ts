/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const css = read('./index.css')
const theme = read('./theme.ts')
const html = read('../index.html')

// index.css declares the dark theme twice: once for "follow the phone" and once for a fixed Dark
// choice in Profile. CSS can't share one block between a media query and a selector, so this test
// keeps the two copies from drifting apart.
function declarations(block: string) {
  return [...block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => `${name}: ${value.trim()}`).sort()
}

function blockAfter(marker: string) {
  const start = css.indexOf('{', css.indexOf(marker) + marker.length - 1)
  const end = css.indexOf('}', start)
  return css.slice(start + 1, end)
}

describe('theme tokens', () => {
  it('declares the same dark tokens for the system setting and the Dark choice', () => {
    const system = declarations(blockAfter(":root:not([data-theme='light']) {"))
    const chosen = declarations(blockAfter(":root[data-theme='dark'] {"))
    expect(system.length).toBeGreaterThan(30)
    expect(chosen).toEqual(system)
  })

  it('keeps the status bar colour in step with the page colour', () => {
    const light = css.match(/--color-bg: var\(--([\w-]+)\)/)?.[1]
    const hex = light && css.match(new RegExp(`--${light}: (#[0-9a-f]{6})`))?.[1]
    expect(hex).toBe('#f4f7f5')
    expect(theme).toContain(`light: '${hex}'`)
    expect(html).toContain(`content="${hex}" media="(prefers-color-scheme: light)"`)
  })

  it('opts the light theme out of force-dark before the first paint', () => {
    expect(css).toMatch(/:root\[data-theme='light'\] \{\s*color-scheme: only light;/)
    expect(html).toContain("t === 'dark' ? 'dark' : 'only light'")
  })
})

import { readdirSync, readFileSync } from 'node:fs'
import { extname, join } from 'node:path'

import { describe, expect, it } from 'vitest'

function vueFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? vueFiles(path) : extname(path) === '.vue' ? [path] : []
  })
}

describe('Vue component API', () => {
  it('uses TypeScript script setup for every scripted component', () => {
    for (const file of vueFiles('src')) {
      const source = readFileSync(file, 'utf8')
      const scripts = [...source.matchAll(/<script([^>]*)>/g)]

      for (const [, attributes] of scripts) {
        expect(attributes, `${file} must use TypeScript <script setup>`).toMatch(/\bsetup\b/)
        expect(attributes, `${file} must use lang="ts"`).toMatch(/\blang=["']ts["']/)
      }

      expect(source, `${file} must not export an Options API component`).not.toMatch(/export\s+default/)
    }
  })
})

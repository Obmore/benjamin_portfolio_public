import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { walk } from './lib/walk.mjs'
import { checkCss, isLayoutProp, movingKeyframes } from './lib/motion-rules.mjs'

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src')
const BANNED_LIB = ['framer', 'motion'].join('-')

function hasForbiddenProp(list) {
  const tokens = list
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean)
  return tokens.some((token) => isLayoutProp(token))
}

const errors = []

// Keyframes may be defined in one file and used in another: collect the moving ones over every stylesheet first.
const files = walk(srcRoot, (file) => /\.(ts|tsx|css)$/.test(file))
const moving = new Set()
for (const file of files) {
  if (file.endsWith('.css')) for (const name of movingKeyframes(fs.readFileSync(file, 'utf8'))) moving.add(name)
}

for (const file of files) {
  const rel = path.relative(srcRoot, file)
  const text = fs.readFileSync(file, 'utf8')

  if (text.includes(BANNED_LIB)) {
    errors.push(`${rel}: ${BANNED_LIB} is not allowed`)
  }

  if (/addEventListener\(\s*['"]scroll['"]/.test(text)) {
    if (!/addEventListener\(\s*['"]scroll['"][\s\S]{0,120}passive:\s*true/.test(text)) {
      errors.push(`${rel}: addEventListener('scroll') must be { passive: true }`)
    }
  }

  if (/(?:^|[\s"'`])transition-all(?:$|[\s"'`])/.test(text)) {
    errors.push(`${rel}: transition-all is not allowed`)
  }

  for (const match of text.matchAll(/transition-\[([^\]]+)\]/g)) {
    if (hasForbiddenProp(match[1])) {
      errors.push(`${rel}: forbidden properties in transition-[${match[1]}]`)
    }
  }

  for (const match of text.matchAll(/transition(?:-property)?\s*:\s*([^;{}]+)/g)) {
    const value = match[1].trim()
    if (value === 'all' || value.startsWith('all ')) {
      errors.push(`${rel}: transition: all is not allowed`)
      continue
    }
    if (hasForbiddenProp(value)) {
      errors.push(`${rel}: forbidden properties in transition: ${value}`)
    }
  }

  if (file.endsWith('.css')) errors.push(...checkCss(text, rel, moving))
}

if (errors.length > 0) {
  console.error('Motion rule check failed:\n')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Motion rule check passed.')

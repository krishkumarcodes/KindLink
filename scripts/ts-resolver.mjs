/**
 * Minimal ESM resolver hook for .ts extensionless imports and Next.js aliases in test scripts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = path.resolve(fileURLToPath(import.meta.url), '../..');

export async function resolve(specifier, context, nextResolve) {
  // 1. Next.js server alias
  if (specifier === 'next/server') {
    return nextResolve('next/server.js', context);
  }

  // 2. Path alias @/*
  if (specifier.startsWith('@/')) {
    const relPath = specifier.slice(2);
    const fullBase = path.join(rootDir, relPath);
    if (fs.existsSync(fullBase + '.ts')) {
      return nextResolve(pathToFileURL(fullBase + '.ts').href, context);
    }
    if (fs.existsSync(fullBase + '.tsx')) {
      return nextResolve(pathToFileURL(fullBase + '.tsx').href, context);
    }
    if (fs.existsSync(path.join(fullBase, 'index.ts'))) {
      return nextResolve(pathToFileURL(path.join(fullBase, 'index.ts')).href, context);
    }
    if (fs.existsSync(fullBase)) {
      return nextResolve(pathToFileURL(fullBase).href, context);
    }
  }

  // 3. Relative extensionless imports (./foo or ../foo)
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && !specifier.match(/\.(ts|tsx|js|mjs|json)$/)) {
    try {
      const parentDir = context.parentURL ? path.dirname(fileURLToPath(context.parentURL)) : rootDir;
      const fullBase = path.resolve(parentDir, specifier);
      if (fs.existsSync(fullBase + '.ts')) {
        return nextResolve(pathToFileURL(fullBase + '.ts').href, context);
      }
      if (fs.existsSync(fullBase + '.tsx')) {
        return nextResolve(pathToFileURL(fullBase + '.tsx').href, context);
      }
      if (fs.existsSync(path.join(fullBase, 'index.ts'))) {
        return nextResolve(pathToFileURL(path.join(fullBase, 'index.ts')).href, context);
      }
    } catch {}
  }

  return nextResolve(specifier, context);
}

#!/usr/bin/env node

const { spawnSync } = require('child_process')
const path = require('path')

const nextBin = require.resolve('next/dist/bin/next')
const workspaceNodeModules = path.resolve(__dirname, '..', 'node_modules')
const rootNodeModules = path.resolve(__dirname, '..', '..', '..', 'node_modules')
const nodePath = [workspaceNodeModules, rootNodeModules, process.env.NODE_PATH].filter(Boolean).join(path.delimiter)

const result = spawnSync(process.execPath, [nextBin, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_IGNORE_INCORRECT_LOCKFILE: process.env.NEXT_IGNORE_INCORRECT_LOCKFILE || '1',
    NODE_PATH: nodePath,
  },
})

if (result.error) {
  console.error(result.error)
  process.exit(1)
}

process.exit(result.status ?? 1)

import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const outputDirectory = path.join(projectRoot, 'THIRD_PARTY_LICENSES')
const licenseFileCandidates = [
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
  'license',
  'license.md',
  'license.txt'
]
const versionCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

function getRuntimeDependencyTree() {
  const output = execFileSync('npm', ['ls', '--omit=dev', '--all', '--long', '--json'], {
    cwd: projectRoot,
    encoding: 'utf8'
  })

  return JSON.parse(output)
}

function collectRuntimeDependencies(node, dependencies = new Map()) {
  if (!node?.dependencies) {
    return dependencies
  }

  for (const [name, dependency] of Object.entries(node.dependencies)) {
    if (!dependency?.version || !dependency?.path) {
      continue
    }

    const versions = dependencies.get(name) ?? new Map()
    if (!versions.has(dependency.version)) {
      versions.set(dependency.version, dependency.path)
    }
    dependencies.set(name, versions)

    collectRuntimeDependencies(dependency, dependencies)
  }

  return dependencies
}

function compareVersions(left, right) {
  return versionCollator.compare(left, right)
}

function findLicenseFile(packagePath) {
  for (const candidate of licenseFileCandidates) {
    const candidatePath = path.join(packagePath, candidate)
    if (existsSync(candidatePath)) {
      return candidatePath
    }
  }

  return null
}

function toDirectoryName(packageName) {
  return packageName.replaceAll('/', '__')
}

function writeLicenseDirectories(dependencies) {
  rmSync(outputDirectory, { recursive: true, force: true })
  mkdirSync(outputDirectory, { recursive: true })

  for (const [packageName, versions] of [...dependencies.entries()].sort((left, right) =>
    left[0].localeCompare(right[0])
  )) {
    const latestVersion = [...versions.keys()].sort(compareVersions).at(-1)

    if (!latestVersion) {
      continue
    }

    const packagePath = versions.get(latestVersion)
    if (!packagePath) {
      continue
    }

    const licenseFile = findLicenseFile(packagePath)
    if (!licenseFile) {
      throw new Error(`No license file found for ${packageName}@${latestVersion}`)
    }

    const destinationDirectory = path.join(outputDirectory, toDirectoryName(packageName))
    mkdirSync(destinationDirectory, { recursive: true })
    copyFileSync(licenseFile, path.join(destinationDirectory, 'LICENSE'))

    if (versions.size > 1) {
      console.log(`Using ${packageName}@${latestVersion} for THIRD_PARTY_LICENSES/`)
    }
  }
}

function main() {
  const runtimeDependencyTree = getRuntimeDependencyTree()
  const runtimeDependencies = collectRuntimeDependencies(runtimeDependencyTree)

  writeLicenseDirectories(runtimeDependencies)

  console.log(`Wrote ${runtimeDependencies.size} third-party license directories.`)
}

main()

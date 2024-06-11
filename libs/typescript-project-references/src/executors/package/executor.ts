import { detectPackageManager, ExecutorContext } from '@nx/devkit'
import {
    calculateProjectDependencies,
    updateBuildableProjectPackageJsonDependencies,
} from '@nx/js/src/utils/buildable-libs-utils'
import { createProjectGraphAsync } from '@nx/workspace/src/core/project-graph'
import execa from 'execa'
import fs from 'node:fs'
import { PackageExecutorSchema } from './schema'

export async function packageExecutor(
    options: PackageExecutorSchema,
    context: ExecutorContext,
) {
    if (!context.projectName) {
        throw new Error('No projectName')
    }
    if (!context.targetName) {
        throw new Error('No targetName')
    }

    const packageManager = detectPackageManager()
    const packageManagerCmd =
        packageManager === 'pnpm'
            ? 'pnpm'
            : packageManager === 'yarn'
            ? 'yarn'
            : 'npx'
    const projGraph = await createProjectGraphAsync()
    const libRoot =
        context.projectsConfigurations?.projects[context.projectName].root
    const { target, dependencies } = calculateProjectDependencies(
        projGraph,
        context.root,
        context.projectName,
        context.targetName,
        context.configurationName || 'production',
    )

    if (libRoot === undefined) {
        throw new Error('Unable to find project root!')
    }

    const packageJson = fs.existsSync(`${libRoot}/package.json`)
        ? JSON.parse(fs.readFileSync(`${libRoot}/package.json`).toString())
        : {}

    const tsup = execa(packageManagerCmd, [
        'tsup',
        ...(options.main ? [options.main] : options.entryPoints || []),
        '-d',
        `${libRoot}/dist`,
        ...[
            ...dependencies.map((dep) => dep.name),
            ...(options.external || []),
            ...Object.keys(packageJson?.dependencies || {}),
            ...Object.keys(packageJson?.peerDependencies || {}),
        ].reduce<string[]>((acc, dep) => {
            acc.push('--external')
            acc.push(dep)
            return acc
        }, []),
        '--sourcemap',
        '--format',
        'esm,cjs',
        ...(options.legacyOutput ? ['--legacy-output'] : []),
    ])
    tsup.stdout?.pipe(process.stdout)
    await tsup

    console.log('Generating type definitions...')
    const tsc = execa(packageManagerCmd, [
        'tsc',
        '-p',
        libRoot,
        '--declaration',
        '--outDir',
        `${libRoot}/dist`,
        '--emitDeclarationOnly',
    ])
    tsc.stdout?.pipe(process.stdout)
    await tsc
    console.log('Done')

    if (
        dependencies.length > 0 &&
        options.updateBuildableProjectDepsInPackageJson
    ) {
        updateBuildableProjectPackageJsonDependencies(
            context.root,
            context.projectName,
            context.targetName,
            context.configurationName || 'production',
            target,
            dependencies,
            options.buildableProjectDepsInPackageJsonType || 'dependencies',
        )
    }

    return {
        success: true,
    }
}

export default packageExecutor

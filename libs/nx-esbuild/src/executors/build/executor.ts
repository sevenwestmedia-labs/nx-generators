import { ExecutorContext, readJson } from '@nrwl/devkit'
import { build } from 'esbuild'
import { FsTree } from 'nx/src/config/tree'
import { BuildExecutorSchema } from './schema'

export default async function runExecutor(
    options: BuildExecutorSchema,
    context: ExecutorContext,
) {
    if (!context.projectName) {
        throw new Error('No projectName')
    }
    const appRoot = context.workspace.projects[context.projectName].root
    const tree = new FsTree(context.cwd, context.isVerbose)

    const packageJson = tree.exists(`${appRoot}/package.json`)
        ? readJson(tree, `${appRoot}/package.json`)
        : {}

    Object.keys(options).forEach((key) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const value = (options as any)[key]
        // NX or json schema default objects to an empty object, this can cause issues with esbuild
        if (typeof value === 'object' && Object.keys(value).length === 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (options as any)[key]
        }
    })

    const result = await build({
        bundle: true,
        sourcemap: true,
        logLevel: 'info',
        metafile: true,
        ...options,
        external: [
            ...(options.external || []),
            ...Object.keys(packageJson?.dependencies || {}),
            ...Object.keys(packageJson?.devDependencies || {}),
        ],
        plugins: options.plugins?.map((plugin) => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const pluginPkg = require(plugin.package)
            return 'default' in pluginPkg
                ? pluginPkg.default(plugin.args)
                : pluginPkg(plugin.args)
        }),
    })

    return {
        success: !result.errors?.length,
    }
}

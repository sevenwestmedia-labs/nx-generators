import { ServeExecutorSchema } from './schema'
import execa from 'execa'
import { ExecutorContext, readJson } from '@nrwl/devkit'
import { FsTree } from '@nrwl/tao/src/shared/tree'
import { build } from 'esbuild'

export default async function runExecutor(
    options: ServeExecutorSchema,
    context: ExecutorContext,
) {
    if (!context.projectName) {
        throw new Error('No projectName')
    }
    if (!options.outfile) {
        throw new Error('Need to specify outfile in watch mode')
    }

    const appRoot = context.workspace.projects[context.projectName].root
    const tree = new FsTree(context.cwd, context.isVerbose)
    const packageJson = readJson(tree, `${appRoot}/package.json`)

    Object.keys(options).forEach((key) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const value = (options as any)[key]
        // NX or json schema default objects to an empty object, this can cause issues with esbuild
        if (typeof value === 'object' && Object.keys(value).length === 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (options as any)[key]
        }
    })

    await build({
        ...options,
        external: [
            ...(options.external || []),
            ...Object.keys(packageJson?.dependencies || {}),
            ...Object.keys(packageJson?.devDependencies || {}),
        ],
        bundle: true,
        watch: true,
    })

    const nodemon = execa('nodemon', [
        '-r',
        'dotenv/config',
        '--enable-source-maps',
        options.outfile,
        `--watch`,
        options.outfile,
    ])
    nodemon.stdout?.pipe(process.stdout)
    nodemon.stderr?.pipe(process.stderr)
    await nodemon
    if (nodemon.connected) {
        nodemon.cancel()
    }

    return {
        success: true,
    }
}

import { ExecutorContext } from '@nrwl/devkit'
import execa from 'execa'
import { getPackageManagerCommand } from 'nx/src/utils/package-manager'
import { ServeExecutorSchema } from './schema'

export default async function runExecutor(
    _options: ServeExecutorSchema,
    context: ExecutorContext,
) {
    if (!context.projectName) {
        throw new Error('No projectName')
    }
    const packageManager = getPackageManagerCommand()
    const appRoot = context.workspace.projects[context.projectName].root
    const args: string[] = [];

    if (_options.open) {
        args.push('--open');
    }

    const vite = execa(
        packageManager.exec,
        ['vite', `${context.cwd}/${appRoot}`, ...args],
        {
            stdio: [process.stdin, process.stdout, 'pipe'],
        },
    )

    await vite

    if (vite.connected) {
        vite.cancel()
    }

    return {
        success: true,
    }
}

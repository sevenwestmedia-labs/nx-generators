import { ExecutorContext } from '@nrwl/devkit'
import execa from 'execa'
import { getPulumiArgs } from '../../helpers/get-pulumi-args'
import { BuildExecutorSchema } from './schema'

export default async function runUpExecutor(
    options: BuildExecutorSchema,
    context: ExecutorContext,
) {
    if (!context.projectName) {
        throw new Error('No projectName')
    }

    const infrastructureRoot =
        context.workspace.projects[context.projectName]?.root

    if (!infrastructureRoot) {
        console.error(`Error: Cannot find root for ${context.projectName}.`)
        return {
            success: false,
        }
    }

    const { pulumiArguments } = getPulumiArgs(
        infrastructureRoot,
        options.configurationStackFormat,
    )

    const pulumiArgs = ['init', ...pulumiArguments]

    console.log(`> pulumi ${pulumiArgs.join(' ')}`)
    const pulumi = execa('pulumi', pulumiArgs, {
        stdio: [process.stdin, process.stdout, process.stderr],
    })
    try {
        const res = await pulumi
        if (res.exitCode !== 0) {
            return { success: false }
        }
    } catch {
        return { success: false }
    }

    return {
        success: true,
    }
}

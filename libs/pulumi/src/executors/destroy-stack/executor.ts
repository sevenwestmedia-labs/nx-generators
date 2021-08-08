import { ExecutorContext } from '@nrwl/devkit'
import execa from 'execa'
import fs from 'fs'
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

    const { env, stackFile, pulumiArguments } = getPulumiArgs(
        infrastructureRoot,
        options.configurationStackFormat,
    )

    // Don't fail if using --env and that stack doesn't exist
    if (env) {
        if (!fs.existsSync(stackFile)) {
            console.warn(
                `${
                    context.projectName || 'unknown project'
                } skipped due to no stack configuration matching --env convention`,
            )

            return {
                success: true,
            }
        }
    }

    const pulumiArgs = ['destroy', ...pulumiArguments]

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

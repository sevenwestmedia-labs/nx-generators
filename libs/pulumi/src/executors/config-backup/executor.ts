import { ExecutorContext } from '@nrwl/devkit'
import S3 from 'aws-sdk/clients/s3'
import fs from 'fs'
import { getPulumiArgs } from '../../helpers/get-pulumi-args'
import { BuildExecutorSchema } from './schema'

export default async function runConfigBackupExecutor(
    options: BuildExecutorSchema,
    context: ExecutorContext,
) {
    if (!context.projectName) {
        throw new Error('No projectName')
    }
    const s3 = new S3({})

    const infrastructureRoot =
        context.workspace.projects[context.projectName]?.root

    if (!infrastructureRoot) {
        console.error(`Error: Cannot find root for ${context.projectName}.`)
        return {
            success: false,
        }
    }

    const { stack, stackFile } = getPulumiArgs(
        infrastructureRoot,
        options.configurationStackFormat,
    )

    try {
        await s3
            .putObject({
                Bucket: options.bucket,
                Key: `pulumi-config-backup/${stack}.yaml`,
                Body: fs.readFileSync(stackFile).toString(),
            })
            .promise()
    } catch (err) {
        console.error('Failed to backup', err)
        return { success: false }
    }

    return {
        success: true,
    }
}

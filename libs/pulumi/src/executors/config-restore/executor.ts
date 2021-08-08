import { ExecutorContext } from '@nrwl/devkit'
import S3 from 'aws-sdk/clients/s3'
import fs from 'fs'
import { getPulumiArgs } from '../../helpers/get-pulumi-args'
import { BuildExecutorSchema } from './schema'

export default async function runConfigRestoreExecutor(
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
            .getObject({
                Bucket: options.bucket,
                Key: `pulumi-config-backup/${stack}.yaml`,
            })
            .promise()
            .then((res) => {
                if (res.Body) {
                    // Restore previous config file (the secrets provider config is the important bit)
                    fs.writeFileSync(stackFile, res.Body.toString())
                }
            })
    } catch (err) {
        console.error('Failed to restore', err)
        return { success: false }
    }

    return {
        success: true,
    }
}

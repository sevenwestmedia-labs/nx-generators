import fs from 'fs'
import yaml from 'js-yaml'
import path from 'path'

export function getPulumiArgs(
    root: string,
    stackFormat = '[projectName].[environment]',
): {
    env: string | undefined
    pulumiArguments: string[]
    pulumiProjectName: string
    stack: string
    pulumiConfigFolder: string | undefined
    stackFile: string
} {
    const configFile = yaml.load(
        fs.readFileSync(path.join(root, 'Pulumi.yaml')).toString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any
    const pulumiProjectName: string = configFile.name
    const pulumiConfigFolder: string | undefined = configFile.config

    const commandLineMap: Record<string, string> = {
        '--disableIntegrityChecking': '--disable-integrity-checking',
        '--nonInteractive': '--non-interactive',
        '--targetDependents': '--target-dependents',
        '--targetReplace': '--target-replace',
        '--secretsProvider': '--secrets-provider',
    }

    let env: string | undefined

    // NX Mangles command line args. Let's fix them back.
    // https://github.com/nrwl/nx/issues/5710
    // This is an incomplete list, should do all args
    const pulumiArguments = process.argv
        .slice(4)
        .map((arg) => {
            const mangled = Object.keys(commandLineMap).find((mangled) =>
                arg.startsWith(mangled),
            )
            if (mangled) {
                return arg.replace(mangled, commandLineMap[mangled])
            }
            return arg
        })
        .filter((arg) => {
            if (arg.startsWith('--env')) {
                env = arg.replace('--env=', '')
                return false
            }
            if (arg.startsWith('--environment')) {
                env = arg.replace('--environment=', '')
                return false
            }
            return true
        })

    let stack: string | undefined
    if (env && !pulumiArguments.includes('--stack')) {
        stack = stackFormat
            .replace('[projectName]', pulumiProjectName)
            .replace('[environment]', env)
        pulumiArguments.push('--stack', stack)
    } else {
        stack = pulumiArguments[pulumiArguments.indexOf('--stack') + 1]
    }
    const stackFile = path.join(
        ...[root, pulumiConfigFolder, `Pulumi.${stack}.yaml`].filter(
            (x): x is string => !!x,
        ),
    )

    pulumiArguments.push('--cwd', root)
    return {
        pulumiProjectName,
        env,
        pulumiArguments,
        stack,
        pulumiConfigFolder,
        stackFile,
    }
}

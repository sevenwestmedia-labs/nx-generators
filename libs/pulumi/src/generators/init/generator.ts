import {
    addProjectConfiguration,
    formatFiles,
    generateFiles,
    offsetFromRoot,
    readProjectConfiguration,
    Tree,
    updateProjectConfiguration,
} from '@nrwl/devkit'
import { addPropertyToJestConfig } from '@nrwl/jest'
import * as path from 'path'
import { PulumiGeneratorSchema } from './schema'

interface NormalizedSchema extends PulumiGeneratorSchema {
    projectName: string
    projectRoot: string
    projectDirectory: string
    parsedTags: string[]
}

type PulumiGeneratorNormalizedSchema = NormalizedSchema & {
    targetProjectName: string
    targetProjectDirectory: string
}

function normalizeOptions(
    host: Tree,
    options: PulumiGeneratorSchema,
): PulumiGeneratorNormalizedSchema {
    const targetProjectConfig = readProjectConfiguration(
        host,
        options.projectName,
    )
    const targetProjectDirectory: string = targetProjectConfig.root

    if (!targetProjectConfig?.targets?.build) {
        throw new Error(
            `Expect ${options.projectName} to have a 'build' target`,
        )
    }
    if (targetProjectConfig.projectType !== 'application') {
        throw new Error(
            `Expect ${options.projectName} to be an NX application, not library`,
        )
    }

    const infrastructureProjectName = `${options.projectName}-infrastructure`
    const infrastructureProjectDirectory = `${targetProjectDirectory}-infrastructure`

    const parsedTags = options.tags
        ? options.tags.split(',').map((s) => s.trim())
        : []

    return {
        ...options,
        projectName: infrastructureProjectName,
        projectRoot: infrastructureProjectDirectory,
        projectDirectory: infrastructureProjectName,
        targetProjectName: options.projectName,
        targetProjectDirectory,
        parsedTags,
    }
}

function addFiles(host: Tree, options: PulumiGeneratorNormalizedSchema) {
    const templateOptions = {
        ...options,
        projectName: options.targetProjectName,
        packageName: options.projectName,
        offsetFromRoot: offsetFromRoot(options.projectRoot),
        template: '',
    }
    generateFiles(
        host,
        path.join(__dirname, 'files'),
        options.projectRoot,
        templateOptions,
    )
}

export default async function (host: Tree, options: PulumiGeneratorSchema) {
    const normalizedOptions = normalizeOptions(host, options)
    addProjectConfiguration(host, normalizedOptions.projectName, {
        root: normalizedOptions.projectRoot,
        projectType: 'application',
        sourceRoot: `${normalizedOptions.projectRoot}/src`,
        targets: {
            lint: {
                executor: '@nrwl/linter:eslint',
                options: {
                    lintFilePatterns: [
                        `${normalizedOptions.projectRoot}/**/*.ts`,
                    ],
                },
            },
            test: {
                executor: '@nrwl/jest:jest',
                options: {
                    jestConfig: `${normalizedOptions.projectRoot}/jest.config.js`,
                    passWithNoTests: true,
                },
                outputs: [`coverage/${normalizedOptions.projectRoot}`],
            },
        },
        tags: normalizedOptions.parsedTags,
        implicitDependencies: [normalizedOptions.targetProjectName],
    })

    const targetProjectConfig = readProjectConfiguration(
        host,
        normalizedOptions.targetProjectName,
    )
    targetProjectConfig.targets = targetProjectConfig.targets || {}
    targetProjectConfig.targets.up = {
        executor: '@wanews/nx-pulumi:up',
        options: {
            targetProjectName: normalizedOptions.targetProjectName,
        },
    }

    updateProjectConfiguration(
        host,
        normalizedOptions.targetProjectName,
        targetProjectConfig,
    )
    addFiles(host, normalizedOptions)

    if (host.exists('jest.config.js')) {
        addPropertyToJestConfig(
            host,
            'jest.config.js',
            'projects',
            `<rootDir>/${normalizedOptions.projectRoot}`,
        )
    }
    await formatFiles(host)
}

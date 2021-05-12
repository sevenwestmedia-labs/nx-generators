import {
    addProjectConfiguration,
    formatFiles,
    generateFiles,
    getWorkspaceLayout,
    names,
    offsetFromRoot,
    Tree,
} from '@nrwl/devkit'
import * as path from 'path'
import { NodeGeneratorSchema } from './schema'

interface NormalizedSchema extends NodeGeneratorSchema {
    projectName: string
    projectRoot: string
    projectDirectory: string
    parsedTags: string[]
}

function normalizeOptions(
    host: Tree,
    options: NodeGeneratorSchema,
): NormalizedSchema {
    const name = names(options.name).fileName
    const projectDirectory = options.directory
        ? `${names(options.directory).fileName}/${name}`
        : name
    const projectName = projectDirectory.replace(new RegExp('/', 'g'), '-')
    const projectRoot = `${
        getWorkspaceLayout(host).appsDir
    }/${projectDirectory}`
    const parsedTags = options.tags
        ? options.tags.split(',').map((s) => s.trim())
        : []

    return {
        ...options,
        projectName,
        projectRoot,
        projectDirectory,
        parsedTags,
    }
}

function addFiles(host: Tree, options: NormalizedSchema) {
    const templateOptions = {
        ...options,
        ...names(options.name),
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

export default async function (host: Tree, options: NodeGeneratorSchema) {
    const normalizedOptions = normalizeOptions(host, options)
    addProjectConfiguration(host, normalizedOptions.projectName, {
        root: normalizedOptions.projectRoot,
        projectType: 'application',
        sourceRoot: `${normalizedOptions.projectRoot}/src`,
        targets: {
            build: {
                executor: '@wanews/nx-vite:build',
                options: {},
            },
            serve: {
                executor: '@wanews/nx-vite:serve',
                options: {
                    platform: 'node',
                    target: 'node14',
                    outfile: `./${normalizedOptions.projectRoot}/dist/bundle.js`,
                    entryPoints: [
                        `./${normalizedOptions.projectRoot}/src/index.ts`,
                    ],
                },
            },
        },
        tags: normalizedOptions.parsedTags,
    })
    addFiles(host, normalizedOptions)
    await formatFiles(host)
}

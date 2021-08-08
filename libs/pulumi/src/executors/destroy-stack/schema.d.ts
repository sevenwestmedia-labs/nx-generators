export interface BuildExecutorSchema {
    targetProjectName?: string
    configurationStackFormat?: string
    buildTarget?: string
    additionalBuildTargets?: Array<{
        project: string
        target: string
        configuration?: string
    }>
    buildTargets?: Array<{
        project: string
        target: string
        configuration?: string
    }>
    infrastructureProject?: string
}

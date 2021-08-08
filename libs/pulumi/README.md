# @wanews/nx-pulumi

NX Plugin for setting up Pulumi projects in an NX repo.

## Generators

### init

```
nx g @wanews/nx-pulumi:init
```

## Executors

### up

```
nx up my-app-infrastructure --stack dev
```

#### env

`--env=prod`

Will create the stack name by prefixing the pulumi project name. ie `--env=prod` is the same as `--stack=<projectname>.prod`.

### create-stack

```
nx create-stack my-app-infrastructure --stack dev
```

#### env

`--env=prod`

Will create the stack name by prefixing the pulumi project name. ie `--env=prod` is the same as `--stack=<projectname>.prod`.

### destroy-stack

```
nx destroy-stack my-app-infrastructure --stack dev
```

#### env

`--env=prod`

Will create the stack name by prefixing the pulumi project name. ie `--env=prod` is the same as `--stack=<projectname>.prod`.

### config-backup

Config files have the secret provider hashes so as an alternative to checking them into git you can use this command to put the config files into s3, then optionally restore them before doing an up

### config-restore

Config files have the secret provider hashes so as an alternative to checking them into git you can use this command to put the config files into s3, then optionally restore them before doing an up

## Running deploy

@wanews/nx-pulumi will add a `deploy` target to the selected project. This will start pulumi with a `--cwd` of the infrastructure project automatically

All arguments will be passed onto the pulumi CLI.

Under the hood, this will run the `up` against your infrastructure project. You can also run the `up` target against the infrastructure project

`nx up my-app-infrastructure --stack dev`

### Affected deploys

when using S3 or another state which doesn't include the project name in the state path, a good workaround is naming your stacks `<project-name>.<env>`. For example `my-project.prod`.

```
[projectName].[env]
```

For example if your `name` key in `Pulumi.yaml` is my-infrastructure and you pass `--env prod`, the stack name will be `my-infrastructure.prod`

This allows you to use the NX affected command with Pulumi to deploy all the affected stacks.

#### Configuration

Use the `configurationStackFormat` executor configuration value to change the stack name format.

Current placeholders `[projectName]`, `[environment]`

Default:

`configurationStackFormat='[projectName].[environment]'`

#### Example

```
nx affected --target=up --env=prod --all
# Or in parallel
nx affected --target=up --env=prod --all --parallel --maxParallel=5
```

### Running other pulumi commands

The main reason for having a plugin is to automatically build the target application and allows NX to deploy applications which have changed in the mono repo. Only the `up` command needs to rebuild the target application.

All other commands you can just use the `--cwd apps/<my-app>-infrastructure` flag when running the pulumi CLI

## Troubleshooting

### Error: unknown flag: --nonInteractive (or similar)

NX Mangles command line args, the issue is being tracked at https://github.com/nrwl/nx/issues/5710

This package manually reverts the mangled command line args but the list of fixed commands is not up to date. Submit a pull request adding the mapped command to libs/pulumi/src/helpers/get-pulumi-args.ts

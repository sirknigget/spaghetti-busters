# Deploy to Vercel from GitHub Actions

The `Deploy to Vercel` job in `.github/workflows/ci.yml` runs after every check
and both browser-test shards succeed on a push to `main`. Pull requests run CI
without deploying or accessing deployment credentials. No Vercel MCP connection
is required.

## Create or link the Vercel project

From the repository root, install the pinned CLI and sign in:

```sh
npm install --global vercel@64.3.1
vercel login
vercel link
```

Choose the Vercel team that will own the deployment, then create a project named
`spaghetti-busters` or select an existing project. Use the repository root (`./`)
as its root directory. Linking creates the project without deploying the app.

The checked-in `vercel.json` selects Vite, `npm ci`, `npm run build`, and `dist`.
Set the project's Node.js version to **22.x** in Vercel's build settings to match
GitHub CI. GitHub installs `pnpm@10.33.0` before building, as required by the pinned
Git dependency.

Vercel's automatic Git deployments are disabled by `git.deploymentEnabled` so
GitHub Actions controls production releases after verification. This also disables
automatic Vercel PR previews. Creating or linking the project through the CLI
avoids the initial automatic deployment performed by a dashboard Git import.

## Create a deployment token

Open [Vercel account tokens](https://vercel.com/account/tokens) and create a token
named `spaghetti-busters-github-cd`. Select the team that owns the linked project
as its scope and choose an expiration date. Your account must have permission to
deploy to that project. Copy the token when it is shown; use it as `VERCEL_TOKEN`
below. Replace the GitHub secret before the token expires, then revoke the old
token after verifying the replacement.

## Configure GitHub secrets

In this repository, open **Settings → Environments**, create an environment
named **production**, and restrict its deployment branches to `main`. Required
reviewers are optional; leave them unset for unattended continuous deployment.

Add these environment secrets. Repository Actions secrets with the same names
also work with this workflow.

| GitHub secret       | Value                                                                  |
| ------------------- | ---------------------------------------------------------------------- |
| `VERCEL_TOKEN`      | The deployment token created above                                     |
| `VERCEL_ORG_ID`     | `orgId` from the local `.vercel/project.json` created by `vercel link` |
| `VERCEL_PROJECT_ID` | `projectId` from the same file                                         |

The organization ID is the Vercel account/team ID, not its display name or slug.
The token's scope and both IDs must point to the same team and project.
`.vercel/` and local environment files are ignored by Git. Keep the token in
GitHub Secrets; never commit it or add it to a `VITE_*` variable, which would
expose it to the browser. The current game needs no application environment
variables or external services.

## First deployment and retries

Merge the workflow into `main` after configuring the secrets. In GitHub's
**Actions → CI** view, all checks must pass before **Deploy to Vercel** starts.
The job pulls production project settings, creates Vercel Build Output locally,
and uploads that output using `vercel deploy --prebuilt --prod --yes`.
The deployment URL appears in the job summary and the GitHub `production`
environment. Open it and start a game to confirm assets and audio load.

If secrets were missing during the first run, add them and use **Re-run failed
jobs** on that `main` run. An expired token requires replacing `VERCEL_TOKEN`.
For project or authorization errors, check both IDs, token scope, and account
permissions. A failed CI check prevents deployment; fix it and push through a PR.
Re-running an older successful `main` run redeploys that older commit, so choose
the latest run when retrying a release.

See [Vercel CLI authentication](https://vercel.com/docs/cli/global-options#token)
and [Git deployment configuration](https://vercel.com/docs/project-configuration/git-configuration#git.deploymentenabled).

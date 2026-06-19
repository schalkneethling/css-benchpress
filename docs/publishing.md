# Publishing

`@schalkneethling/css-benchpress` publishes through npm trusted publishing from the `Publish`
GitHub Actions workflow.

## One-time setup

1. Enable 2FA for the npm and GitHub accounts that can administer this package.
2. In GitHub repository settings, set Actions workflow permissions to read-only by default and require approval for first-time contributors.
3. Protect `main` with pull requests, at least one approval, stale approval dismissal, and approval of the most recent reviewable push.
4. Remove any `NPM_TOKEN` or other npm publish tokens from repository and organization secrets.
5. Create a GitHub environment named `publish`.
   - Disable administrator bypass.
   - Restrict deployments to explicit protected branches such as `main`.
   - Optionally require manual approval before the publish job proceeds.
6. On npmjs.com, open the `@schalkneethling/css-benchpress` package settings and add a trusted publisher:
   - Provider: GitHub Actions
   - Repository: `schalkneethling/css-benchpress`
   - Workflow filename: `publish.yml`
   - Environment: `publish`
   - Allowed action: `npm publish`
7. Enable "Require two-factor authentication and disallow tokens" for the npm package.

The first version of a brand-new npm package cannot be published through trusted publishing,
because npm requires the package to exist before trusted publisher settings can be configured.
Publish the initial version manually with npm 2FA, then configure trusted publishing for
subsequent releases.

## Release flow

1. Update the package version and changelog or release notes.
2. Run the local checks:

   ```bash
   vp check
   vp test
   vp run build
   bun run package:check
   bun pm pack --dry-run --ignore-scripts
   ```

3. Create and publish a GitHub release.
4. The release publication triggers `.github/workflows/publish.yml`.

The workflow runs source checks and tests, builds the package in a separate job, uploads the
tarball as an artifact, and publishes that artifact from the protected `publish` environment
using npm OIDC trusted publishing. The publish job uses Node 24.8.0 only for the final
`npm publish` command so the npm CLI is new enough for trusted publishing.

For solo maintainers, remember that GitHub environment approvals do not currently provide an
extra 2FA challenge. If that risk matters for this package, publish manually with npm 2FA and
keep the workflow as a validated release dry run until GitHub adds environment-level 2FA.

## Repository Workflow

`main` is protected by a branch protection ruleset — direct pushes are not possible, and every change needs a branch + PR that passes required checks. Read [`docs/branch-protection.md`](./docs/branch-protection.md), [`docs/ci-cd.md`](./docs/ci-cd.md), and [`docs/agentic-workflows.md`](./docs/agentic-workflows.md) before making changes.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

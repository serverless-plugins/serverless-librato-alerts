# Contributors

## Check in

- Do check in source (src)
- Do not check in build output (dist)
- Do not check in node_modules

## Development

In order to handle code style and static analysis, we run [Vite+](https://viteplus.dev) checks before each commit
via Git hooks that are installed automatically when dependencies are installed. To make sure the hooks run correctly,
please use the following workflow:

```sh
pnpm install                                # installs all devDependencies and git hooks
git add abc.ext                             # Add the files you've changed. This should include files in src and tests (see above)
git commit -m "Informative commit message"  # Commit. This will run vp check --fix on staged files
```

During the commit step, the hook will take care of formatting, linting, and type checking staged files with `vp check --fix`.
Any automatic fixes are applied in place; re-stage them if prompted.

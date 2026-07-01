## Development workflow

- Before pushing make sure that `lint`, `format` and `e2e` scripts have passed correctly.
- Use the commands in the root package.json since they are very likely already approved.
- Use Conventional Commits for commit messages, e.g. `feat(ui): refresh app layout`.
- Use concise kebab-case branch names with a conventional prefix, e.g. `feat/ui-refresh` or `fix/internet-access-filter`.


## Testing

- When testing a new feature prefer adding a new e2e test in `e2e` project instead of creating trowh away scripts.

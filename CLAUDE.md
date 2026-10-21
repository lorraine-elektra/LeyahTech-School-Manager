# Working on this repository

## Authorship

The repository owner is the only author and committer on GitHub.

- Before committing, run:
  `git config user.name "lorraine-elektra"` and
  `git config user.email "160536608+lorraine-elektra@users.noreply.github.com"`
- Do not add `Co-Authored-By`, `Claude-Session` or "Generated with Claude Code" lines to commit messages or pull request descriptions.
- Do not put the owner's full name in commits or files. Use the `lorraine-elektra` login only.

The `Authorship` check in `.github/workflows/authorship.yml` fails any push or pull request that breaks these rules.

## Product

- The product is LeyahTech School Manager. The name lives in `src/features/shell/product.ts`.
- The demo school is the fictional Adom Heights Academy. Do not reference other schools or earlier projects.
- Run `npm run typecheck` and `npm test` before pushing.

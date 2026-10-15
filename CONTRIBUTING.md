# Contributing to Hardboard

Read [LICENSE](LICENSE) before using or contributing code. This is a
source-available project with noncommercial study permissions, not an open-source
project. GitHub forks for study and upstream contributions are allowed; they are
not permission to publish a hosted copy or sell the project.

Open an issue before a substantial change. Describe the problem and keep pull
requests focused. Use a short-lived branch such as `fix/print-layout` or
`docs/setup`, signed Conventional Commits, and a commit body explaining why the
change is needed. Use a GitHub noreply email if you do not want your personal
email in the history. Review staged paths and diffs before committing.

Write new repository documentation in English. Keep Spanish and English UI
translation keys aligned. Do not add a framework, dependency or build system for
a change that can use the existing plain HTML, CSS and JavaScript structure.

## Check a change

- Open both pages and check the browser console for errors.
- Check Spanish and English, light and dark themes, and a narrow viewport.
- Edit a resume and reload to check persistence.
- Exercise section controls and check browser print preview.
- Confirm that disabled donations remain disabled unless an actual backend is
  provided and reviewed.

CI checks JavaScript syntax. Report which browser tests you performed in the PR;
do not describe untested behavior as verified.

Do not commit secrets, real resumes, personal data, dependency folders, design
exports or internal planning documents. Use synthetic examples and keep `.env`
files local. Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

Contributors retain copyright in their contributions and grant the permissions
specified in the license. Submit only material you have the right to contribute.

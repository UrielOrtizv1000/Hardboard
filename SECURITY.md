# Security policy

## Supported code

Only the current `main` branch is maintained. There are no stable release
branches or response-time guarantees yet. The donations backend is a scaffold,
not a supported payment service.

## Report a vulnerability

Use the repository's **Security > Report a vulnerability** option to send a
private report. Do not open a public issue containing an exploit, credentials,
real resume data or another person's personal information.

Include the affected commit, browser and version, reproduction steps using
synthetic data, expected behavior and the security impact. Wait for a response
before publishing exploit details. If private reporting is unavailable, open an
issue asking for a private contact channel without disclosing the vulnerability.

## Local data

Resume data is stored unencrypted in browser localStorage. Do not treat it as a
secure vault or a backup. Google Fonts is an external resource loaded by the
pages. Payment credentials must never be added to frontend code.

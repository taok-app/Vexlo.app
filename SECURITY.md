# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Vexlo AI, please email security@vercel.com with:

* Description of the vulnerability
* Steps to reproduce
* Potential impact
* Suggested fix (if any)

Please do not open a public GitHub issue for security vulnerabilities.

## Security Best Practices

When using Vexlo AI:

1. **Environment Variables**: Keep your encryption keys and OAuth credentials secure
2. **OAuth Tokens**: Tokens are encrypted at rest using industry-standard encryption
3. **Database**: Use strong passwords and restrict access to your Postgres database
4. **Sandbox Access**: Verify that your Vercel Sandbox credentials are secure
5. **Rate Limiting**: Be aware of rate limits on AI API calls

## Supported Versions

| Version | Status |
|---------|--------|
| 1.0.x   | Current |
| < 1.0   | Unsupported |

## Dependencies

We keep dependencies up to date and monitor for security issues. Run `pnpm audit` to check for vulnerabilities.

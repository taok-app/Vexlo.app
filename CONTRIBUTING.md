# Contributing to Vexlo AI

Thank you for your interest in contributing to Vexlo AI! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/vexlo-ai.git`
3. Create a feature branch: `git checkout -b feature/your-feature`
4. Make your changes
5. Commit your changes: `git commit -am 'Add your feature'`
6. Push to the branch: `git push origin feature/your-feature`
7. Submit a pull request

## Development Setup

```bash
git clone https://github.com/vercel-labs/vexlo-ai.git
cd vexlo-ai
pnpm install
cp .env.example .env.local
# Configure your environment variables
pnpm db:push
pnpm dev
```

## Code Style

* Follow the existing code style and patterns
* Use TypeScript for type safety
* Write meaningful commit messages
* Add tests for new features

## Reporting Issues

Report security vulnerabilities privately to security@vercel.com

For other issues, please use GitHub Issues with a clear title and description.

## Pull Request Process

1. Update the CHANGELOG.md
2. Ensure all tests pass
3. Update documentation as needed
4. Request review from maintainers
5. Address any feedback
6. Squash commits before merge

## Questions?

Please open a discussion or issue for questions about contributing.

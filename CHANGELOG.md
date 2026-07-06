# Changelog

All notable changes to Vexlo AI will be documented in this file.

## [1.0.0] - 2026-07-07

### Added
- Initial public release
- Multi-agent support: Claude Code, Codex CLI, Copilot CLI, Cursor CLI, Gemini CLI, opencode
- User authentication via GitHub and Vercel OAuth
- Task management with real-time progress tracking
- Vercel Sandbox integration for secure code execution
- AI-generated git branch names
- File editor with syntax highlighting
- Terminal access for command execution
- Git integration with automatic commit and push
- Pull request creation
- Persistent task storage with Neon Postgres
- Dark and light theme support
- Responsive UI built with Next.js and Tailwind CSS
- MCP server support for Claude Code
- Comprehensive error recovery
- Rate limiting and security measures

### Technical Stack
- Next.js 16 with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- Drizzle ORM for database
- Neon Postgres for storage
- Vercel Sandbox for execution
- AI SDK 5 with Vercel AI Gateway

### Known Limitations
- Compare mode (multi-agent) is experimental for v1.0
- MCP UI is basic functionality only
- Some advanced git workflows deferred to v1.1
- Deploy logs depend on Vercel SDK

## Future Plans

### v1.1
- Enhanced compare mode UI
- Advanced git workflows (rebase, cherry-pick)
- More AI model options
- Improved deployment logging
- Custom agent templates
- Webhook support
- Team collaboration features

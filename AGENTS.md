# Fibonacci Chat Area — Project Memory

## Overview
- **Name**: Fibonacci Chat Area (formerly Chatbox Community Edition)
- **Type**: Electron-based AI chat desktop application (cross-platform: Windows, macOS, Linux)
- **Package manager**: Bun 1.4.0
- **License**: GPLv3
- **Version**: 0.0.1
- **Repo**: https://my.fibonacci.monster
- **Node engine**: >=22.13.0

## Tech Stack
- **Build**: electron-vite (builds main, preload, renderer separately)
- **UI**: React 18, Tailwind CSS v3.4, Mantine, Radix UI, Assistant UI, Storybook
- **Router**: TanStack Router
- **State**: TanStack Query
- **Language**: TypeScript (strict mode)
- **Lint**: Biome + oxlint
- **Test**: Vitest + Playwright (e2e)
- **DB**: LibSQL (SQLite), IndexedDB, Electron Store
- **Mobile**: Capacitor (iOS, Android)
- **AI Providers**: All major LLM providers via `@ai-sdk/*` (Anthropic, OpenAI, Google, Bedrock, DeepSeek, Mistral, Azure, OpenRouter, Perplexity, etc.) + `@mastra/*` for RAG

## Project Structure

```
Fibonacci-ChatArea-master/
├── src/
│   ├── main/              # Electron main process (~150 files)
│   │   ├── adapters/
│   │   ├── agent-persona/
│   │   ├── knowledge-base/
│   │   ├── mcp/
│   │   ├── oauth/
│   │   │   └── providers/
│   │   ├── sandbox/
│   │   ├── session-attachment-rag/
│   │   └── skills/
│   │       ├── builtin/
│   │       └── __tests__/
│   ├── preload/           # Electron preload (1 file)
│   ├── renderer/          # React UI (~1082 files)
│   │   ├── adapters/
│   │   ├── analytics/
│   │   ├── app/
│   │   ├── components/    # 17 subdirs (chat, common, settings, mcp, knowledge-base, etc.)
│   │   │   ├── animate-ui/
│   │   │   ├── assistant-ui/
│   │   │   ├── chat/
│   │   │   ├── common/
│   │   │   ├── dev/
│   │   │   ├── icons/
│   │   │   ├── InputBox/
│   │   │   ├── knowledge-base/
│   │   │   ├── layout/
│   │   │   ├── mcp/
│   │   │   └── settings/
│   │   │       ├── agent-persona/
│   │   │       ├── mcp/
│   │   │       ├── provider/
│   │   │       └── skills/
│   │   ├── dev/
│   │   ├── hooks/
│   │   ├── i18n/
│   │   │   ├── changelogs/
│   │   │   └── locales/     # 15 locales: ar, de, en, es, fa, fr, it-IT, ja, ko, nb-NO + 5 more
│   │   ├── lib/
│   │   │   └── animations/
│   │   ├── modals/
│   │   ├── native/
│   │   ├── pages/
│   │   │   └── SettingDialog/
│   │   ├── platform/
│   │   │   ├── knowledge-base/
│   │   │   └── session-attachment-rag/
│   │   ├── presentation/
│   │   │   └── session/
│   │   ├── routes/          # 7 routes: copilots, dev, guide, image-creator, -new-user-scenarios, session, settings
│   │   └── packages/        # 13 modules: backup, chatbox-cli, context-management, mcp, model-calls, model-context, model-registry, model-setting-utils, skills, token-estimation, translation + 3 more
│   │       └── model-calls/toolsets/
│   ├── shared/            # Shared code (~266 files)
│   │   ├── types/         # Shared type definitions
│   │   ├── models/
│   │   ├── providers/     # 40+ provider definitions
│   │   ├── oauth/
│   │   ├── services/
│   │   ├── session/
│   │   └── utils/
│   └── __tests__/
├── packages/
│   ├── chatbox-core/      # Core business logic (domain, application, infrastructure)
│   │   ├── src/application/   # attachments, context, model, session, settings
│   │   ├── src/domain/        # settings
│   │   ├── src/generation/
│   │   ├── src/models/
│   │   ├── src/ports/         # analytics, attachments, blob-storage, capabilities, key-value-storage, logger, model-factory, session-repository, settings-repository
│   │   ├── src/session/
│   │   ├── src/testing/       # In-memory test doubles
│   │   └── src/types/
│   └── chatbox-react/       # React integration hooks/providers
│       ├── ApplicationContext.tsx
│       ├── application-hooks.ts
│       ├── ChatboxProvider.tsx
│       ├── createChatApplication.ts
│       ├── generation-hooks.ts
│       ├── index.ts
│       └── query/             # host-lifecycle, query-client, query-keys, session-cache-policy, session-hooks
├── docs/                  # Technical docs (38+ files)
│   ├── technical/           # agent-skills, ai-providers, build-and-deployment, storage, testing, etc.
│   ├── product/             # code-execution, tools-and-integrations
│   ├── plans/               # Migration/plan documents
│   ├── adding-provider.md
│   ├── adding-new-provider.md
│   ├── rag.md
│   ├── storage.md
│   └── testing.md
├── test/                  # Tests
│   ├── cases/               # Provider config test cases
│   ├── integration/         # Integration tests (context-management, file-conversation, model-provider)
│   └── e2e/                 # Playwright e2e tests
├── features/              # BDD/Gherkin feature files (Chinese)
│   ├── chat-streaming.feature
│   ├── image-generation.feature
│   ├── image-storage.feature
│   └── legacy-tool-fallback.feature
├── scripts/               # Build/eval scripts
│   ├── generate-routes.mjs
│   ├── generate-model-snapshot.ts
│   ├── generate-ui-inventory.mjs
│   └── check-shared-boundaries.mjs
├── tasks/                 # PRD/task planning docs
│   ├── prd-context-management.md
│   ├── prd-code-organization-optimization.md
│   ├── prd-provider-system-refactor.md
│   └── prd-compaction-ux-improvement.md
├── assets/                # App icons, entitlements, installer nsh
├── benchmarks/            # Performance benchmarks
│   └── perf/streaming-hot-path.bench.ts
├── resources/             # Splash screens, app icons
├── patches/               # Dependency patches (fflate, mdast-util-gfm, libsql)
├── .erb/                  # Electron React Boilerplate configs & scripts
├── .storybook/            # Storybook config
├── .claude/skills/        # Claude skills (cherry-pick-pro, i18n-translate)
├── .codex/skills/         # Codex skills (i18n-translate)
├── .husky/                # Git hooks (pre-commit, pre-merge-commit, post-merge)
├── doc/                   # User-facing docs (FAQ, README, screenshots)
├── icons/                 # App icons
├── team-sharing/
└── release/               # Build output
```

## Key Config Files
| File | Purpose |
|------|---------|
| `package.json` | Main config, scripts, deps |
| `tsconfig.json` | TS strict, paths `@/*` → `src/renderer`, `@shared/*` → `src/shared` |
| `vite.config.web.ts` | Web dev config (port 1212) |
| `electron.vite.config.ts` | Electron build config |
| `tailwind.config.js` | Tailwind theme (CSS variable colors, dark mode: class) |
| `electron-builder.yml` | Packaging (mac DMG, Windows NSIS, Linux AppImage/deb) |
| `biome.json` | Lint config |
| `bunfig.toml` | Bun config (hoisted linker) |
| `vitest.config.ts` | Test config |
| `components.json` | UI component config |

## Key Source Paths
- Main process: `src/main/`
- Preload: `src/preload/`
- Renderer UI: `src/renderer/`
- Shared code: `src/shared/`
- Core package: `packages/chatbox-core/src/`
- React package: `packages/chatbox-react/src/`
- Integration tests: `test/integration/`

## Important Patterns
- Monorepo with Bun workspaces: `packages/*` and `release/app`
- Three-layer architecture: main (Electron) / preload (bridge) / renderer (React)
- Provider system: 40+ LLM providers with typed definitions in `src/shared/providers/definitions/`
- i18n: 15 locales, managed via i18next + i18next-parser
- Memory features: agent-persona/local-memory-scanner, memory-import, agent-memory toolsets
- Build: `bun run build` → builds main + preload + renderer via electron-vite
- Test: `bun run test` (unit), `bun run test:integration` (integration), `bun run test:e2e` (playwright)

## Notes
- Project was formerly "Chatbox Community Edition"
- Uses electron-react-boilerplate (.erb) as base
- CSS nesting via PostCSS; Tailwind + Mantine presets
- Bundled patches for fflate, mdast-util-gfm-autolink-literal, libsql
- Mobile support via Capacitor (requires separate sync steps)

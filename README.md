# A2A UI

A web-based tool for developers to inspect, debug, and validate A2A (Agent2Agent) protocol servers. Provides a user-friendly interface to interact with A2A agents, monitor communications, and ensure specification compliance.

## Features

### 🔗 Agent Connection & Management

- Connect to A2A-compliant agent servers via URL (`http://` and `https://`)
- Manage multiple agents simultaneously with per-agent status monitoring
- Auto-discovery of agent capabilities using agent cards
- Real-time connection status indicators (connected, disconnected, error)
- Pre-fill agent connections from shareable URLs via query parameters
- Export and import all agent configurations as JSON

**Authentication Support:**
- None (open endpoints)
- Bearer Token (OAuth/JWT)
- API Key (custom header-based)
- Basic Auth (username/password)

**Custom Headers:** Add arbitrary HTTP headers to all agent requests

### 📋 Agent Card Viewer

- Automatically fetch and display agent cards on connection
- Structured view of agent metadata (name, description, version, protocol version)
- Capabilities display: streaming, push notifications, state transition history
- Skills browser with descriptions, tags, input/output modes, and examples
- Raw JSON agent card viewer with syntax highlighting
- Re-fetch agent card on demand

### ✅ Specification Compliance

- Automated A2A protocol compliance validation:
  - Required field checks (name, description, version, protocolVersion)
  - URL validity
  - Capabilities and skills array presence
  - Default input/output mode validation
  - Per-skill field completeness (id, name, description)
- Pass/fail count with color-coded compliance badges (compliant / partial / non-compliant)
- Actionable error messages for each failing check

### 💬 Chat Interface

- Interactive multi-turn chat with A2A agents
- Multiple concurrent chat sessions across different agents
- Persistent message history (stored in IndexedDB, survives page reload)
- Recent chats list in sidebar (last 10 chats)
- Chat title customization and export (JSON or Markdown)

**Message Input:**
- Auto-expanding multi-line textarea
- Keyboard shortcuts: `Enter` to send, `Shift+Enter` for newline, `Cmd/Ctrl+Shift+N` for new session
- Drag-and-drop or click-to-attach file uploads with image thumbnails
- Custom message metadata editor (key-value pairs)
- MIME type filtering based on agent's declared input modes
- "Input Required" banner when the agent requests additional user input

**Message Rendering:**
- User and agent message bubbles with timestamps
- Markdown rendering with GitHub Flavored Markdown (GFM) and code syntax highlighting
- Task status messages with icons (submitted, working, input required, completed, failed, etc.)
- Artifact blocks for generated content (text, files, data)
- Tool call blocks showing tool name, execution phase, and results
- JSON inspection modal to view raw data for any message

### 🐛 Debug Console

- Slide-out panel for real-time JSON-RPC 2.0 message inspection
- Filter logs by type: All, Request, Response, Error
- Timestamped, collapsible log entries with JSON syntax highlighting
- Drag to resize the panel (160px–600px)
- Keyboard shortcut toggle: `Cmd/Ctrl+Shift+D`
- Session info bar: context ID (copyable), transport method, and input/output modalities

### 🗂️ Session Management

- Create new sessions (fresh context ID / UUID) without losing chat history
- Streaming state management with real-time artifact updates
- Stale state cleanup on mount for clean session starts
- Client caching with automatic reconnection

### ⚙️ Agent Settings

- **General:** Set a custom display name per agent
- **Authentication:** Configure auth type and credentials with masked input fields
- **Custom Headers:** Add, edit, and remove arbitrary request headers
- **Agent Card:** Re-fetch, view capabilities/skills, run compliance checks, inspect raw JSON
- Copy shareable agent link (with encoded auth type)
- Remove agent with confirmation dialog

### 🌙 Theming

- Light, Dark, and System preference modes
- Persistent theme selection via `next-themes`

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A running A2A agent server for testing

### Installation

1. Clone the repository:

```bash
git clone https://github.com/ichintansoni/a2a-ui.git
cd a2a-ui
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Usage

1. **Connect to an Agent**: Click "Add Agent" in the sidebar and enter the base URL of your A2A agent server.
2. **View Agent Card**: Once connected, the agent card is automatically fetched and displayed with compliance status.
3. **Start Chatting**: Select the agent and open a chat to send messages and view responses.
4. **Attach Files**: Drag and drop files or use the attachment button — accepted types are filtered by the agent's declared capabilities.
5. **Debug Messages**: Open the debug console (`Cmd/Ctrl+Shift+D`) to inspect raw JSON-RPC communications.
6. **Export a Chat**: Use the export dropdown in the chat header to save the conversation as JSON or Markdown.

## Development

### Available Scripts

- `npm run dev` — Start development server
- `npm run build` — Build for production
- `npm run start` — Start production server
- `npm run lint` — Run ESLint
- `npm run format` — Format code with Prettier
- `npm run test` — Run tests with Vitest
- `npm run test:watch` — Run tests in watch mode
- `npm run test:coverage` — Run tests with coverage report

### Project Structure

```
a2a-ui/
├── app/                    # Next.js app directory
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Main page
├── components/             # React components
│   ├── agent/              # Agent connection & settings
│   ├── chat/               # Chat UI and message rendering
│   ├── debug/              # Debug console
│   └── ui/                 # Shared UI primitives (shadcn/ui)
├── lib/                    # Utility functions and helpers
├── store/                  # Redux Toolkit state management
├── public/                 # Static assets
└── types/                  # TypeScript definitions
```

### Technologies Used

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **State Management**: Redux Toolkit + React-Redux
- **Persistence**: IndexedDB via `idb`
- **A2A SDK**: `@a2a-js/sdk`
- **Markdown**: `react-markdown` with `remark-gfm` and `rehype-highlight`
- **Syntax Highlighting**: `highlight.js`
- **Icons**: Lucide React
- **Testing**: Vitest + Testing Library

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Learn More

- [A2A Protocol Specification](https://a2a-protocol.org/latest/specification/) — Official A2A protocol documentation
- [Next.js Documentation](https://nextjs.org/docs) — Learn about Next.js features
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification) — JSON-RPC protocol details

# A2A UI

A web-based tool for developers to inspect, debug, and validate A2A (Agent2Agent) protocol servers. Provides a user-friendly interface to interact with A2A agents, monitor communications, and ensure specification compliance.

## Features

### 🔗 Agent Connection

- Connect to local A2A agent servers by specifying base URLs (e.g., `http://localhost:9000`)
- Support for multiple agent endpoints
- Connection status monitoring and error handling

### 📋 Agent Card Viewer

- Automatically fetch and display agent cards upon connection
- Structured view of agent metadata and capabilities
- Real-time updates when agent information changes

### ✅ Specification Compliance

- Built-in validation against A2A protocol specifications
- Highlight non-compliant elements with detailed error messages
- Compliance scoring and recommendations

### 💬 Live Chat Interface

- Interactive chat with connected A2A agents
- Message history with timestamps
- Support for different message types and formats

### 🐛 Debug Console

- Slide-out console for raw JSON-RPC 2.0 message inspection
- Real-time display of all requests and responses
- Filterable message log with search functionality
- Export capabilities for debugging sessions

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

1. **Connect to an Agent**: Enter the base URL of your A2A agent server in the connection panel.

2. **View Agent Card**: Once connected, the agent card will be automatically displayed with compliance status.

3. **Start Chatting**: Use the chat interface to send messages to the agent and view responses.

4. **Debug Messages**: Open the debug console to inspect raw JSON-RPC communications.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Project Structure

```
a2a-ui/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/            # React components
├── lib/                   # Utility functions
├── public/                # Static assets
└── types/                 # TypeScript definitions
```

### Technologies Used

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React hooks
- **API Communication**: Fetch API with JSON-RPC 2.0

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Learn More

- [A2A Protocol Specification](https://a2a-protocol.org/latest/specification/) - Official A2A protocol documentation
- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification) - JSON-RPC protocol details

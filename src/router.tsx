import { createBrowserRouter } from "react-router-dom";
import HomePage from "@/routes/home";
import RouteErrorBoundary from "@/routes/error-boundary";
import DashboardLayout from "@/routes/dashboard/layout";
import DashboardPage from "@/routes/dashboard/index";
import AgentsPage from "@/routes/dashboard/agents";
import AgentSettingsPage from "@/routes/dashboard/agent-settings";
import ChatPage from "@/routes/dashboard/chat";
import ConversationsPage from "@/routes/dashboard/conversations";
import CompareRunsPage from "@/routes/dashboard/compare";
import TasksPage from "@/routes/dashboard/tasks";
import QaPage from "@/routes/dashboard/qa";
import EmbedPage from "@/routes/dashboard/embed";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/dashboard",
    element: <DashboardLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "agents", element: <AgentsPage /> },
      { path: "agents/:agentId/settings", element: <AgentSettingsPage /> },
      { path: "chat/:chatId", element: <ChatPage /> },
      { path: "conversations", element: <ConversationsPage /> },
      { path: "compare", element: <CompareRunsPage /> },
      { path: "tasks", element: <TasksPage /> },
      { path: "qa", element: <QaPage /> },
      { path: "embed", element: <EmbedPage /> },
    ],
  },
]);

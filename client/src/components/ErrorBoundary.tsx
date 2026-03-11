import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4 p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground max-w-md">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <Button onClick={() => window.location.reload()}>Refresh</Button>
        </div>
      );
    }

    return this.props.children;
  }
}

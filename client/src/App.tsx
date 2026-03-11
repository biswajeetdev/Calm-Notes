import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import NewNote from "@/pages/NewNote";
import NoteDetail from "@/pages/NoteDetail";
import NotesList from "@/pages/NotesList";
import Settings from "@/pages/Settings";
import Pricing from "@/pages/Pricing";

// Wrapper for protected routes
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/welcome" />;
  }

  return <Component />;
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
     return (
       <div className="flex items-center justify-center min-h-screen bg-background">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
     );
  }

  return (
    <Switch>
      {/* Public Landing Page - Redirects to Dashboard if logged in */}
      <Route path="/welcome">
        {user ? <Redirect to="/" /> : <Landing />}
      </Route>

      {/* Protected Routes */}
      <Route path="/">
         <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/new">
         <ProtectedRoute component={NewNote} />
      </Route>
      <Route path="/notes">
         <ProtectedRoute component={NotesList} />
      </Route>
      <Route path="/notes/:id">
         <ProtectedRoute component={NoteDetail} />
      </Route>
      <Route path="/settings">
         <ProtectedRoute component={Settings} />
      </Route>
      <Route path="/pricing">
         <ProtectedRoute component={Pricing} />
      </Route>

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

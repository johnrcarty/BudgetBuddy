import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Budget from "@/pages/Budget";
import BudgetVisualization from "@/pages/BudgetVisualization";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Budget} />
      <Route path="/visualization" component={BudgetVisualization} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;

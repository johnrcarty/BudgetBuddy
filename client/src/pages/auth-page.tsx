import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().min(1, "Display name is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      displayName: "",
    },
  });

  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(data);
  };

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Left side - Login/Register form */}
      <div className="flex items-center justify-center w-full md:w-1/2 px-4 py-8">
        <Tabs defaultValue="login" className="w-full max-w-md">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          {/* Login Form */}
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>
                  Enter your credentials to access your budget.
                </CardDescription>
              </CardHeader>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input 
                      id="username" 
                      {...loginForm.register("username")}
                      placeholder="Enter your username" 
                    />
                    {loginForm.formState.errors.username && (
                      <p className="text-sm text-red-500">
                        {loginForm.formState.errors.username.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      {...loginForm.register("password")}
                      placeholder="Enter your password" 
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-red-500">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          {/* Register Form */}
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Register</CardTitle>
                <CardDescription>
                  Create a new account to start managing your budget.
                </CardDescription>
              </CardHeader>
              <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-username">Username</Label>
                    <Input 
                      id="register-username" 
                      {...registerForm.register("username")}
                      placeholder="Choose a username" 
                    />
                    {registerForm.formState.errors.username && (
                      <p className="text-sm text-red-500">
                        {registerForm.formState.errors.username.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="display-name">Display Name</Label>
                    <Input 
                      id="display-name" 
                      {...registerForm.register("displayName")}
                      placeholder="Enter your name" 
                    />
                    {registerForm.formState.errors.displayName && (
                      <p className="text-sm text-red-500">
                        {registerForm.formState.errors.displayName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input 
                      id="register-password" 
                      type="password" 
                      {...registerForm.register("password")}
                      placeholder="Choose a password" 
                    />
                    {registerForm.formState.errors.password && (
                      <p className="text-sm text-red-500">
                        {registerForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Register"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Right side - Hero Section */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="flex flex-col justify-center p-12 text-white">
          <h1 className="text-4xl font-bold mb-6">Budget Tracker</h1>
          <h2 className="text-2xl font-semibold mb-4">Take control of your finances</h2>
          <p className="mb-6 text-lg opacity-90">
            A comprehensive monthly budget tracking application that enables you to manage 
            expected and actual revenues and expenses with advanced data visualization.
          </p>
          <ul className="space-y-2 list-disc list-inside opacity-90">
            <li>Track expected vs. actual income and expenses</li>
            <li>Organize budget items by category</li>
            <li>Monitor payment status and due dates</li>
            <li>Visualize budget trends over time</li>
            <li>Export budget data to CSV format</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
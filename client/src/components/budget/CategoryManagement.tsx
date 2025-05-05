import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Plus } from "lucide-react";

// Form schema for adding/editing categories
const categoryFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  displayName: z.string().min(1, "Display name is required"),
  type: z.enum(["revenue", "expense"], { 
    required_error: "Type is required" 
  }),
  sortOrder: z.coerce.number().int().nonnegative(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export default function CategoryManagement() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"revenue" | "expense">("expense");

  // Form for adding new categories
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      displayName: "",
      type: "expense",
      sortOrder: 0,
    },
  });

  // Form for editing categories
  const editForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      displayName: "",
      type: "expense",
      sortOrder: 0,
    },
  });

  // Query to get all categories
  const { data: categories, isLoading } = useQuery({
    queryKey: ['/api/categories'],
  });

  // Mutation to add a new category
  const { mutate: addCategory, isPending: isAddingCategory } = useMutation({
    mutationFn: async (data: CategoryFormValues) => {
      return await apiRequest('POST', '/api/categories', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/budget/current-month'] });
      toast({
        title: "Category Added",
        description: "Category has been added successfully.",
      });
      setOpen(false);
      form.reset({
        name: "",
        displayName: "",
        type: activeTab,
        sortOrder: 0,
      });
    },
    onError: (error) => {
      toast({
        title: "Error Adding Category",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to update a category
  const { mutate: updateCategory, isPending: isUpdatingCategory } = useMutation({
    mutationFn: async (data: CategoryFormValues & { id: number }) => {
      return await apiRequest('PUT', `/api/categories/${data.id}`, {
        name: data.name,
        displayName: data.displayName,
        type: data.type,
        sortOrder: data.sortOrder,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/budget/current-month'] });
      toast({
        title: "Category Updated",
        description: "Category has been updated successfully.",
      });
      setIsEditOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error Updating Category",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to delete a category
  const { mutate: deleteCategory, isPending: isDeletingCategory } = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/budget/current-month'] });
      toast({
        title: "Category Deleted",
        description: "Category has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Deleting Category",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onAddSubmit = (data: CategoryFormValues) => {
    addCategory(data);
  };

  const onEditSubmit = (data: CategoryFormValues) => {
    if (selectedCategory) {
      updateCategory({ ...data, id: selectedCategory.id });
    }
  };

  const handleEditCategory = (category: any) => {
    setSelectedCategory(category);
    editForm.reset({
      name: category.name,
      displayName: category.displayName,
      type: category.type,
      sortOrder: category.sortOrder,
    });
    setIsEditOpen(true);
  };

  const handleDeleteCategory = (id: number) => {
    if (window.confirm("Are you sure you want to delete this category? All budget items in this category will also be deleted.")) {
      deleteCategory(id);
    }
  };

  // Filter categories by type
  const revenueCategories = categories?.filter((cat: any) => cat.type === 'revenue') || [];
  const expenseCategories = categories?.filter((cat: any) => cat.type === 'expense') || [];

  return (
    <div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Category Management</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary">
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onAddSubmit)} className="space-y-4 pt-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Internal Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter category key (no spaces)" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter category display name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="revenue">Revenue</SelectItem>
                            <SelectItem value="expense">Expense</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="sortOrder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sort Order</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => {
                              const value = e.target.value === "" ? "0" : e.target.value;
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isAddingCategory}>
                      {isAddingCategory ? "Adding..." : "Add Category"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "revenue" | "expense")}>
            <TabsHeader>
              <TabsHeaderContent>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="expense" className="text-center">Expense Categories</TabsTrigger>
                  <TabsTrigger value="revenue" className="text-center">Revenue Categories</TabsTrigger>
                </TabsList>
              </TabsHeaderContent>
            </TabsHeader>
            
            <TabsContent value="expense">
              {isLoading ? (
                <div className="flex justify-center py-6">Loading categories...</div>
              ) : expenseCategories.length === 0 ? (
                <div className="py-6 text-center text-gray-500">
                  No expense categories available. Add a category to get started.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 rounded-md font-medium text-sm text-gray-500">
                    <div className="col-span-3">Name</div>
                    <div className="col-span-4">Display Name</div>
                    <div className="col-span-2">Sort Order</div>
                    <div className="col-span-3 text-right">Actions</div>
                  </div>
                  
                  {expenseCategories.map((category: any) => (
                    <div 
                      key={category.id} 
                      className="grid grid-cols-12 gap-4 px-4 py-2 border border-gray-200 rounded-md items-center"
                    >
                      <div className="col-span-3 font-medium">{category.name}</div>
                      <div className="col-span-4">{category.displayName}</div>
                      <div className="col-span-2">{category.sortOrder}</div>
                      <div className="col-span-3 flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8"
                          onClick={() => handleEditCategory(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="h-8"
                          onClick={() => handleDeleteCategory(category.id)}
                          disabled={category.name === 'other'} // Prevent deleting the 'other' category
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="revenue">
              {isLoading ? (
                <div className="flex justify-center py-6">Loading categories...</div>
              ) : revenueCategories.length === 0 ? (
                <div className="py-6 text-center text-gray-500">
                  No revenue categories available. Add a category to get started.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 rounded-md font-medium text-sm text-gray-500">
                    <div className="col-span-3">Name</div>
                    <div className="col-span-4">Display Name</div>
                    <div className="col-span-2">Sort Order</div>
                    <div className="col-span-3 text-right">Actions</div>
                  </div>
                  
                  {revenueCategories.map((category: any) => (
                    <div 
                      key={category.id} 
                      className="grid grid-cols-12 gap-4 px-4 py-2 border border-gray-200 rounded-md items-center"
                    >
                      <div className="col-span-3 font-medium">{category.name}</div>
                      <div className="col-span-4">{category.displayName}</div>
                      <div className="col-span-2">{category.sortOrder}</div>
                      <div className="col-span-3 flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8"
                          onClick={() => handleEditCategory(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="h-8"
                          onClick={() => handleDeleteCategory(category.id)}
                          disabled={category.name === 'revenue'} // Prevent deleting the 'revenue' category
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Edit Category Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 pt-2">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Enter category key (no spaces)" 
                        disabled={selectedCategory?.name === 'revenue' || selectedCategory?.name === 'other'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter category display name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                      disabled={selectedCategory?.name === 'revenue' || selectedCategory?.name === 'other'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="revenue">Revenue</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => {
                          const value = e.target.value === "" ? "0" : e.target.value;
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdatingCategory}>
                  {isUpdatingCategory ? "Updating..." : "Update Category"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TabsHeaderProps {
  children: React.ReactNode;
}

function TabsHeader({ children }: TabsHeaderProps) {
  return <div className="mb-4">{children}</div>;
}

function TabsHeaderContent({ children }: TabsHeaderProps) {
  return <div>{children}</div>;
}
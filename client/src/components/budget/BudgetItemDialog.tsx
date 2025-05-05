import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";

// Form schema
const budgetItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  expectedAmount: z.coerce.number().min(0, "Expected amount must be a positive number"),
  actualAmount: z.coerce.number().min(0, "Actual amount must be a positive number").optional(),
});

type BudgetItemFormValues = z.infer<typeof budgetItemSchema>;

interface BudgetItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: string;
  item: any;
}

export default function BudgetItemDialog({ open, onOpenChange, category, item }: BudgetItemDialogProps) {
  const { toast } = useToast();
  
  // Initialize form
  const form = useForm<BudgetItemFormValues>({
    resolver: zodResolver(budgetItemSchema),
    defaultValues: {
      name: "",
      category: category,
      expectedAmount: 0,
      actualAmount: 0,
      dueDate: null,
      isPaid: false,
    },
  });
  
  // Reset form when dialog opens/closes or item changes
  useEffect(() => {
    if (open) {
      if (item) {
        form.reset({
          name: item.name,
          category: item.category || category,
          expectedAmount: item.expectedAmount,
          actualAmount: item.actualAmount || 0,
          dueDate: item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : null,
          isPaid: item.isPaid || false,
        });
      } else {
        form.reset({
          name: "",
          category: category,
          expectedAmount: 0,
          actualAmount: 0,
          dueDate: null,
          isPaid: false,
        });
      }
    }
  }, [open, item, category, form]);
  
  // Create/Update mutation
  const { mutate: saveItem, isPending } = useMutation({
    mutationFn: async (data: BudgetItemFormValues) => {
      if (item) {
        return await apiRequest('PUT', `/api/budget/items/${item.id}`, data);
      } else {
        return await apiRequest('POST', '/api/budget/items', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budget/current-month'] });
      toast({
        title: item ? "Item Updated" : "Item Created",
        description: `Budget item has been ${item ? "updated" : "created"} successfully.`,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: `Error ${item ? "Updating" : "Creating"} Item`,
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: BudgetItemFormValues) => {
    saveItem(data);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {item ? "Edit Budget Item" : "Add Budget Item"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter item name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="housing">Housing</SelectItem>
                      <SelectItem value="transportation">Transportation</SelectItem>
                      <SelectItem value="food">Food</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="expectedAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Amount</FormLabel>
                  <FormControl>
                    <CurrencyInput 
                      {...field} 
                      onChange={(value) => field.onChange(value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="actualAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Actual Amount</FormLabel>
                  <FormControl>
                    <CurrencyInput 
                      {...field} 
                      onChange={(value) => field.onChange(value)}
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
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

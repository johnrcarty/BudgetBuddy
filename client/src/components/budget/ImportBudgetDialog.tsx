import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Loader2, Check, AlertCircle } from "lucide-react";

interface ImportBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ImportBudgetDialog({ open, onOpenChange }: ImportBudgetDialogProps) {
  const { toast } = useToast();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [jsonData, setJsonData] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  
  // Import data mutation
  const { mutate: importData, isPending, isSuccess, isError, error, reset } = useMutation({
    mutationFn: async (data: { date: string; data: any[] }) => {
      return await apiRequest("POST", "/api/budget/import", data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget/current-month"] });
      queryClient.invalidateQueries({ queryKey: ["/api/budget/history"] });
      toast({
        title: "Import Successful",
        description: data.message || `Successfully imported budget data`,
      });
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error.message || "There was an error importing your budget data",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const handleSubmit = () => {
    setParseError(null);
    reset();
    
    try {
      // Try to parse the JSON data
      let parsedData = JSON.parse(jsonData);
      
      // If it's not an array, wrap it in one
      if (!Array.isArray(parsedData)) {
        parsedData = [parsedData];
      }
      
      // Submit the data
      importData({
        date,
        data: parsedData,
      });
    } catch (e) {
      setParseError("Invalid JSON data. Please check your input and try again.");
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonData(content);
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        reset();
        setParseError(null);
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Budget Data</DialogTitle>
          <DialogDescription>
            Import data from your old budget software by pasting JSON or uploading a file.
            The data will be imported into the selected month.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              Import Month
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="file" className="text-right">
              File
            </Label>
            <Input
              id="file"
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="json" className="text-right pt-2">
              JSON Data
            </Label>
            <Textarea
              id="json"
              placeholder="Paste your JSON budget data here..."
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              className="col-span-3 h-36"
            />
          </div>
          
          {parseError && (
            <div className="flex items-center text-red-500 gap-2 mt-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{parseError}</span>
            </div>
          )}
          
          {isSuccess && (
            <div className="flex items-center text-green-600 gap-2 mt-2">
              <Check className="h-4 w-4" />
              <span className="text-sm">Import completed successfully</span>
            </div>
          )}
          
          {isError && (
            <div className="flex items-center text-red-500 gap-2 mt-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error?.message}</span>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isPending || !jsonData.trim()}
            className="ml-2"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              "Import Data"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
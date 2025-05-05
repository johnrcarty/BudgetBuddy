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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Loader2, Check, AlertCircle, Copy } from "lucide-react";

interface ImportBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// JSON template for import
const JSON_TEMPLATE = `[
  {
    "name": "Salary",
    "category": "income",
    "type": "revenue",
    "expectedAmount": 5000,
    "actualAmount": 5000,
    "dueDate": "2023-05-15",
    "isPaid": true,
    "month": "May 2023"
  },
  {
    "name": "Rent",
    "category": "housing",
    "type": "expense",
    "expectedAmount": 1200,
    "actualAmount": 1200,
    "dueDate": "2023-05-01",
    "isPaid": true,
    "month": "May 2023"
  },
  {
    "name": "Groceries",
    "category": "food",
    "type": "expense",
    "expectedAmount": 400,
    "actualAmount": 380,
    "isPaid": true,
    "month": "May 2023"
  },
  {
    "name": "Salary",
    "category": "income",
    "type": "revenue",
    "expectedAmount": 5000,
    "actualAmount": 5000,
    "month": "June 2023"
  }
]`;

export default function ImportBudgetDialog({ open, onOpenChange }: ImportBudgetDialogProps) {
  const { toast } = useToast();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [jsonData, setJsonData] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("import");
  
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
        
        <Tabs 
          defaultValue="import" 
          className="w-full"
          value={activeTab}
          onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">Import Data</TabsTrigger>
            <TabsTrigger value="template">JSON Template</TabsTrigger>
          </TabsList>
          
          <TabsContent value="import" className="space-y-4">
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
                <div className="col-span-3">
                  <div className="flex justify-between mb-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setJsonData(JSON_TEMPLATE)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Use Template
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setActiveTab("template")}
                    >
                      View Template
                    </Button>
                  </div>
                  <Textarea
                    id="json"
                    placeholder="Paste your JSON budget data here..."
                    value={jsonData}
                    onChange={(e) => setJsonData(e.target.value)}
                    className="h-36"
                  />
                </div>
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
          </TabsContent>
          
          <TabsContent value="template" className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-md">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Expected JSON Format</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON_TEMPLATE);
                    toast({
                      title: "Template Copied",
                      description: "The JSON template has been copied to your clipboard"
                    });
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              <pre className="text-xs overflow-auto p-2 bg-slate-100 rounded border max-h-80">
                {JSON_TEMPLATE}
              </pre>
              
              <div className="mt-4 text-sm">
                <h4 className="font-medium mb-2">Required Fields:</h4>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li><strong>name:</strong> Name of the budget item</li>
                  <li><strong>category:</strong> Category identifier (will create if doesn't exist)</li>
                  <li><strong>type:</strong> "revenue" or "expense"</li>
                  <li><strong>expectedAmount:</strong> Planned budget amount</li>
                </ul>
                
                <h4 className="font-medium mb-2 mt-3">Optional Fields:</h4>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li><strong>month:</strong> Month and year (e.g., "January 2023") - if not provided, uses the date selected in the Import Month field</li>
                  <li><strong>actualAmount:</strong> Actual amount spent or received</li>
                  <li><strong>dueDate:</strong> Due date in any standard format</li>
                  <li><strong>isPaid:</strong> Boolean indicating payment status</li>
                </ul>
                
                <div className="mt-3 text-xs p-2 bg-blue-50 rounded">
                  <strong>Note:</strong> You can import a single item or an array of items.
                  The system will automatically create categories if they don't exist.
                </div>
                
                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    onClick={() => {
                      setJsonData(JSON_TEMPLATE);
                      setActiveTab("import");
                    }}
                    className="mt-2"
                  >
                    Use Template & Go to Import
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Close
          </Button>
          
          {activeTab === "import" && (
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
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
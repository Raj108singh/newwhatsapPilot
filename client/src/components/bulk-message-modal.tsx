import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Template } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BulkMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BulkMessageModal({ open, onOpenChange }: BulkMessageModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [recipients, setRecipients] = useState<string>("");
  const [campaignName, setCampaignName] = useState<string>("");
  const [parameters, setParameters] = useState<string[]>([]);
  const { toast } = useToast();

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
    enabled: open,
  });

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  const sendBulkMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("/api/send-bulk", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Bulk Campaign Started",
        description: `Campaign "${campaignName}" has been initiated successfully.`,
      });
      onOpenChange(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Messages",
        description: error.message || "An error occurred while sending bulk messages.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedTemplateId("");
    setRecipients("");
    setCampaignName("");
    setParameters([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTemplateId || !recipients.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a template and provide recipients.",
        variant: "destructive",
      });
      return;
    }

    const recipientsList = recipients
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (recipientsList.length === 0) {
      toast({
        title: "No Recipients",
        description: "Please provide at least one phone number.",
        variant: "destructive",
      });
      return;
    }

    sendBulkMutation.mutate({
      templateId: selectedTemplateId,
      recipients: recipientsList,
      parameters,
      campaignName: campaignName || `Campaign ${new Date().toISOString()}`,
    });
  };

  const extractTemplateParameters = (template: Template) => {
    if (!template.components || !Array.isArray(template.components)) return [];
    
    const bodyComponent = template.components.find(c => c.type === "BODY");
    if (!bodyComponent || !bodyComponent.text) return [];

    const paramMatches = bodyComponent.text.match(/\{\{(\d+)\}\}/g);
    return paramMatches ? paramMatches.map((match: string, index: number) => ({ 
      placeholder: match, 
      index: index + 1 
    })) : [];
  };

  const templateParams = selectedTemplate ? extractTemplateParameters(selectedTemplate) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Bulk Message</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campaign Name */}
          <div>
            <Label htmlFor="campaignName">Campaign Name</Label>
            <Input
              id="campaignName"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Enter campaign name"
              data-testid="input-campaign-name"
            />
          </div>

          {/* Template Selection */}
          <div>
            <Label htmlFor="template">Select Template</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger data-testid="select-template">
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} ({template.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Recipients */}
          <div>
            <Label htmlFor="recipients">Recipients</Label>
            <div className="space-y-3">
              <div className="flex space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  data-testid="button-upload-csv"
                >
                  <i className="fas fa-upload mr-2"></i>
                  Upload CSV
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  data-testid="button-select-contacts"
                >
                  <i className="fas fa-users mr-2"></i>
                  Select Contacts
                </Button>
              </div>
              <Textarea
                id="recipients"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="Enter phone numbers (one per line)&#10;+1234567890&#10;+1234567891&#10;+1234567892"
                rows={4}
                data-testid="textarea-recipients"
              />
            </div>
          </div>

          {/* Template Preview */}
          {selectedTemplate && (
            <div>
              <Label>Message Preview</Label>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="text-sm text-slate-600">
                  <strong>Template:</strong> {selectedTemplate.name}<br /><br />
                  {selectedTemplate.components && 
                   Array.isArray(selectedTemplate.components) && 
                   selectedTemplate.components.find(c => c.type === "BODY")?.text}
                </div>
              </div>
            </div>
          )}

          {/* Template Parameters */}
          {templateParams.length > 0 && (
            <div>
              <Label>Template Parameters</Label>
              <div className="space-y-3">
                {templateParams.map((param: any, index: number) => (
                  <div key={param.placeholder}>
                    <Label className="block text-xs font-medium text-slate-600 mb-1">
                      {param.placeholder}
                    </Label>
                    <Input
                      value={parameters[index] || ""}
                      onChange={(e) => {
                        const newParams = [...parameters];
                        newParams[index] = e.target.value;
                        setParameters(newParams);
                      }}
                      placeholder={`Parameter ${param.index}`}
                      className="text-sm"
                      data-testid={`input-param-${index}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={sendBulkMutation.isPending}
              data-testid="button-send-bulk"
            >
              {sendBulkMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Sending...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane mr-2"></i>
                  Send Messages
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

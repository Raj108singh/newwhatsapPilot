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
    
    const params: any[] = [];
    
    // Extract parameters from all components
    template.components.forEach((component: any) => {
      if (component.type === "HEADER" && component.format === "TEXT" && component.text) {
        const headerMatches = component.text.match(/\{\{(\d+)\}\}/g);
        if (headerMatches) {
          headerMatches.forEach((match: string, index: number) => {
            params.push({
              component: "HEADER",
              placeholder: match,
              index: params.length + 1,
              label: `Header ${match}`,
              example: component.example?.header_text?.[index] || ""
            });
          });
        }
      }
      
      // Add IMAGE header parameter
      if (component.type === "HEADER" && component.format === "IMAGE") {
        params.push({
          component: "HEADER",
          placeholder: "{{IMAGE_URL}}",
          index: params.length + 1,
          label: "Header Image URL",
          type: "image",
          example: component.example?.header_handle?.[0] || ""
        });
      }
      
      if (component.type === "BODY" && component.text) {
        const bodyMatches = component.text.match(/\{\{(\d+)\}\}/g);
        if (bodyMatches) {
          bodyMatches.forEach((match: string, index: number) => {
            params.push({
              component: "BODY",
              placeholder: match,
              index: params.length + 1,
              label: `Body ${match}`,
              example: component.example?.body_text?.[0]?.[index] || ""
            });
          });
        }
      }
      
      if (component.type === "BUTTONS" && component.buttons) {
        component.buttons.forEach((button: any, buttonIndex: number) => {
          if (button.type === "URL" && button.url && button.url.includes("{{")) {
            const urlMatches = button.url.match(/\{\{(\d+)\}\}/g);
            if (urlMatches) {
              urlMatches.forEach((match: string) => {
                params.push({
                  component: "BUTTON",
                  placeholder: match,
                  index: params.length + 1,
                  label: `Button ${buttonIndex + 1} URL ${match}`,
                  example: button.example?.[0] || ""
                });
              });
            }
          }
        });
      }
    });
    
    return params;
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
                {templates
                  .sort((a, b) => {
                    // Sort by language first, then by name
                    if (a.language !== b.language) {
                      return a.language.localeCompare(b.language);
                    }
                    return a.name.localeCompare(b.name);
                  })
                  .map((template) => {
                    const languageNames: { [key: string]: string } = {
                      'en': 'English',
                      'hi': 'हिन्दी (Hindi)',
                      'te': 'తెలుగు (Telugu)', 
                      'mr': 'मराठी (Marathi)',
                      'ta': 'தமிழ் (Tamil)',
                      'kn': 'ಕನ್ನಡ (Kannada)',
                      'gu': 'ગુજરાતી (Gujarati)',
                      'bn': 'বাংলা (Bengali)',
                      'or': 'ଓଡ଼ିଆ (Odia)',
                      'pa': 'ਪੰਜਾਬੀ (Punjabi)',
                      'as': 'অসমীয়া (Assamese)',
                      'ml': 'മലയാളം (Malayalam)',
                      'ur': 'اردو (Urdu)'
                    };
                    const languageName = languageNames[template.language] || template.language.toUpperCase();
                    
                    return (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{template.name}</span>
                          <span className="text-xs text-slate-500">
                            {languageName} • {template.category} • {template.status}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
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
              <Label>Template Preview</Label>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="text-sm font-medium text-slate-700 flex items-center justify-between">
                  <div>
                    <strong>Template:</strong> {selectedTemplate.name}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {(() => {
                        const languageNames: { [key: string]: string } = {
                          'en': 'English',
                          'hi': 'हिन्दी',
                          'te': 'తెలుగు', 
                          'mr': 'मराठी',
                          'ta': 'தமிழ்',
                          'kn': 'ಕನ್ನಡ',
                          'gu': 'ગુજરાતી',
                          'bn': 'বাংলা',
                          'or': 'ଓଡ଼ିଆ',
                          'pa': 'ਪੰਜਾਬੀ',
                          'as': 'অসমীয়া',
                          'ml': 'മലയാളം',
                          'ur': 'اردو'
                        };
                        return languageNames[selectedTemplate.language] || selectedTemplate.language.toUpperCase();
                      })()}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                      {selectedTemplate.category}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium capitalize ${
                      selectedTemplate.status === 'approved' ? 'bg-green-100 text-green-800' :
                      selectedTemplate.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedTemplate.status}
                    </span>
                  </div>
                </div>
                
                {selectedTemplate.components && Array.isArray(selectedTemplate.components) && (
                  <div className="space-y-2">
                    {(selectedTemplate.components as any[]).map((component: any, index: number) => (
                      <div key={index} className="text-sm">
                        {component.type === "HEADER" && (
                          <div className="bg-blue-50 p-2 rounded">
                            <div className="font-medium text-blue-800">Header:</div>
                            <div className="text-blue-700">
                              {component.format === "TEXT" && component.text}
                              {component.format === "IMAGE" && <span className="italic">Image header</span>}
                              {component.format === "VIDEO" && <span className="italic">Video header</span>}
                              {component.format === "DOCUMENT" && <span className="italic">Document header</span>}
                            </div>
                          </div>
                        )}
                        
                        {component.type === "BODY" && (
                          <div className="bg-gray-50 p-2 rounded">
                            <div className="font-medium text-gray-800">Body:</div>
                            <div className="text-gray-700 whitespace-pre-wrap">{component.text}</div>
                          </div>
                        )}
                        
                        {component.type === "FOOTER" && (
                          <div className="bg-gray-100 p-2 rounded">
                            <div className="font-medium text-gray-600">Footer:</div>
                            <div className="text-gray-600 text-xs">{component.text}</div>
                          </div>
                        )}
                        
                        {component.type === "BUTTONS" && component.buttons && (
                          <div className="bg-green-50 p-2 rounded">
                            <div className="font-medium text-green-800">Buttons:</div>
                            <div className="space-y-1">
                              {component.buttons.map((button: any, btnIndex: number) => (
                                <div key={btnIndex} className="text-green-700 text-xs">
                                  • {button.text} ({button.type})
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Template Parameters */}
          {templateParams.length > 0 && (
            <div>
              <Label>Template Parameters</Label>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                <div className="text-sm text-amber-800">
                  This template requires {templateParams.length} parameter(s). Fill in the values below:
                </div>
                {templateParams.map((param: any, index: number) => (
                  <div key={param.placeholder} className="space-y-1">
                    <Label className="block text-sm font-medium text-slate-700">
                      {param.label}
                      <span className="text-xs text-slate-500 ml-2">
                        ({param.component} component)
                      </span>
                    </Label>
                    {param.type === 'image' ? (
                      <div className="space-y-2">
                        <Input
                          value={parameters[index] || ""}
                          onChange={(e) => {
                            const newParams = [...parameters];
                            newParams[index] = e.target.value;
                            setParameters(newParams);
                          }}
                          placeholder="Enter custom image URL (optional - will use template default if empty)"
                          className="text-sm"
                          data-testid={`input-param-${index}`}
                        />
                        {param.example && (
                          <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                            <strong>Default image:</strong> Template includes a default image
                            <br />
                            <span className="text-blue-500">Leave empty to use default, or enter custom URL above</span>
                          </div>
                        )}
                        {parameters[index] && (
                          <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                            <strong>Custom image selected:</strong> {parameters[index]}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <Input
                          value={parameters[index] || ""}
                          onChange={(e) => {
                            const newParams = [...parameters];
                            newParams[index] = e.target.value;
                            setParameters(newParams);
                          }}
                          placeholder={param.example || `Enter value for ${param.placeholder}`}
                          className="text-sm"
                          data-testid={`input-param-${index}`}
                        />
                        {param.example && (
                          <div className="text-xs text-slate-500">
                            Example: {param.example}
                          </div>
                        )}
                      </div>
                    )}
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

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Template, Group, Contact } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BulkMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BulkMessageModal({ open, onOpenChange }: BulkMessageModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [recipients, setRecipients] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [campaignName, setCampaignName] = useState<string>("");
  const [parameters, setParameters] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [recipientType, setRecipientType] = useState<"manual" | "groups" | "contacts">("manual");
  const { toast } = useToast();

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
    enabled: open,
  });

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
    enabled: open,
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
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
    setSelectedGroups([]);
    setSelectedContacts([]);
    setRecipientType("manual");
  };

  // Phone number normalization - handles with/without country codes
  const normalizePhoneNumber = (phone: string): string => {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // If it starts with 91 and has 12 digits total, add +
    if (digits.length === 12 && digits.startsWith('91')) {
      return '+' + digits;
    }
    
    // If it has 10 digits, assume Indian number and add +91
    if (digits.length === 10) {
      return '+91' + digits;
    }
    
    // If it already starts with + return as is
    if (phone.startsWith('+')) {
      return phone;
    }
    
    // Otherwise add + if it looks like a valid international number
    if (digits.length >= 10) {
      return '+' + digits;
    }
    
    return phone; // Return original if can't normalize
  };

  // CSV Upload Handler
  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV file.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    
    try {
      const text = await file.text();
      const lines = text.split('\n').map(line => line.trim()).filter(line => line);
      
      // Parse CSV - handle both single column and multiple columns
      const phoneNumbers: string[] = [];
      
      lines.forEach((line, index) => {
        // Skip header row if it contains non-numeric data
        if (index === 0 && isNaN(parseInt(line.split(',')[0].replace(/\D/g, '')))) {
          return;
        }
        
        // Split by comma and take first column as phone number
        const columns = line.split(',');
        const phone = columns[0].trim().replace(/['"]/g, ''); // Remove quotes
        
        if (phone) {
          const normalized = normalizePhoneNumber(phone);
          if (normalized !== phone || phone.match(/^\+?[1-9]\d{1,14}$/)) {
            phoneNumbers.push(normalized);
          }
        }
      });
      
      if (phoneNumbers.length === 0) {
        toast({
          title: "No Valid Numbers",
          description: "No valid phone numbers found in the CSV file.",
          variant: "destructive",
        });
        return;
      }
      
      // Add to existing recipients or replace
      const existingNumbers = recipients.split('\n').filter(line => line.trim());
      const allNumbers = [...existingNumbers, ...phoneNumbers];
      
      // Remove duplicates and set
      const uniqueNumbers = Array.from(new Set(allNumbers));
      setRecipients(uniqueNumbers.join('\n'));
      
      toast({
        title: "CSV Uploaded Successfully",
        description: `Added ${phoneNumbers.length} phone numbers. Total: ${uniqueNumbers.length} numbers.`,
      });
      
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to parse CSV file. Please check the format.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTemplateId) {
      toast({
        title: "Missing Information",
        description: "Please select a template.",
        variant: "destructive",
      });
      return;
    }

    let recipientsList: string[] = [];

    // Get recipients based on selected type
    if (recipientType === "manual") {
      if (!recipients.trim()) {
        toast({
          title: "No Recipients",
          description: "Please provide phone numbers.",
          variant: "destructive",
        });
        return;
      }
      recipientsList = recipients
        .split("\n")
        .map(line => normalizePhoneNumber(line.trim()))
        .filter(line => line.length > 0);
    } else if (recipientType === "groups") {
      if (selectedGroups.length === 0) {
        toast({
          title: "No Groups Selected",
          description: "Please select at least one group.",
          variant: "destructive",
        });
        return;
      }
      // Get phone numbers from selected groups
      for (const groupId of selectedGroups) {
        try {
          const groupMembers = await apiRequest(`/api/groups/${groupId}/members`);
          const phoneNumbers = groupMembers.map((member: Contact) => member.phoneNumber);
          recipientsList.push(...phoneNumbers);
        } catch (error) {
          console.error(`Failed to fetch members for group ${groupId}:`, error);
        }
      }
    } else if (recipientType === "contacts") {
      if (selectedContacts.length === 0) {
        toast({
          title: "No Contacts Selected",
          description: "Please select at least one contact.",
          variant: "destructive",
        });
        return;
      }
      recipientsList = selectedContacts.map(contactId => {
        const contact = contacts.find(c => c.id === contactId);
        return contact?.phoneNumber || "";
      }).filter(phone => phone.length > 0);
    }

    // Remove duplicates
    recipientsList = Array.from(new Set(recipientsList));

    if (recipientsList.length === 0) {
      toast({
        title: "No Recipients",
        description: "No valid recipients found.",
        variant: "destructive",
      });
      return;
    }

    sendBulkMutation.mutate({
      templateId: selectedTemplateId,
      recipients: recipientsList,
      parameters,
      campaignName: campaignName || `Campaign ${new Date().toISOString()}`,
      recipientType,
      selectedGroups: recipientType === "groups" ? selectedGroups : undefined,
      selectedContacts: recipientType === "contacts" ? selectedContacts : undefined,
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
            <Label>Recipients</Label>
            <Tabs value={recipientType} onValueChange={(value) => setRecipientType(value as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                <TabsTrigger value="groups">Groups ({groups.length})</TabsTrigger>
                <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="manual" className="space-y-3">
                <div className="flex space-x-2">
                  <label htmlFor="csv-upload">
                    <Button 
                      type="button" 
                      variant="outline" 
                    size="sm"
                    disabled={uploading}
                    data-testid="button-upload-csv"
                    asChild
                  >
                    <span>
                      <i className={`fas ${uploading ? 'fa-spinner fa-spin' : 'fa-upload'} mr-2`}></i>
                      {uploading ? 'Uploading...' : 'Upload CSV'}
                    </span>
                  </Button>
                </label>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                />
                </div>
                <Textarea
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  placeholder="Enter phone numbers (one per line)&#10;+91XXXXXXXXXX&#10;or XXXXXXXXXX&#10;919876543210"
                  rows={4}
                  data-testid="textarea-recipients"
                />
              </TabsContent>
              
              <TabsContent value="groups" className="space-y-3">
                {groups.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <i className="fas fa-users text-4xl mb-2"></i>
                    <p>No groups available. Create a group first.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {groups.map((group) => (
                      <div key={group.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-slate-50">
                        <Checkbox
                          id={`group-${group.id}`}
                          checked={selectedGroups.includes(group.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedGroups([...selectedGroups, group.id]);
                            } else {
                              setSelectedGroups(selectedGroups.filter(id => id !== group.id));
                            }
                          }}
                        />
                        <label htmlFor={`group-${group.id}`} className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{group.name}</p>
                              <p className="text-sm text-slate-500">{group.description}</p>
                            </div>
                            <Badge variant="secondary">Group</Badge>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
                {selectedGroups.length > 0 && (
                  <div className="text-sm text-slate-600">
                    <i className="fas fa-info-circle mr-1"></i>
                    {selectedGroups.length} group(s) selected
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="contacts" className="space-y-3">
                {contacts.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <i className="fas fa-user text-4xl mb-2"></i>
                    <p>No contacts available. Add contacts first.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-slate-50">
                        <Checkbox
                          id={`contact-${contact.id}`}
                          checked={selectedContacts.includes(contact.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedContacts([...selectedContacts, contact.id]);
                            } else {
                              setSelectedContacts(selectedContacts.filter(id => id !== contact.id));
                            }
                          }}
                        />
                        <label htmlFor={`contact-${contact.id}`} className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{contact.name}</p>
                              <p className="text-sm text-slate-500">{contact.phoneNumber}</p>
                              {contact.tags && contact.tags.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {contact.tags.map((tag, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
                {selectedContacts.length > 0 && (
                  <div className="text-sm text-slate-600">
                    <i className="fas fa-info-circle mr-1"></i>
                    {selectedContacts.length} contact(s) selected
                  </div>
                )}
              </TabsContent>
            </Tabs>
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

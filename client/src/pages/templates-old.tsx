import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Template, insertTemplateSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import TemplateCreationDialog from "@/components/template-creation-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const templateFormSchema = insertTemplateSchema.extend({
  bodyText: z.string().min(1, "Body text is required"),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

// Helper function to format template text with parameter placeholders
function formatTemplateText(text: string): string {
  // Replace {{1}}, {{2}}, etc. with more readable placeholders
  return text.replace(/\{\{(\d+)\}\}/g, (match, num) => {
    const placeholders = [
      '[Customer Name]',
      '[Product/Service]', 
      '[Date/Time]',
      '[Amount]',
      '[Order Number]',
      '[Link]',
      '[Phone Number]',
      '[Email]',
      '[Address]',
      '[Custom Value]'
    ];
    const index = parseInt(num) - 1;
    return placeholders[index] || `[Parameter ${num}]`;
  });
}

export default function Templates() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { toast } = useToast();

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      category: "marketing",
      language: "en",
      status: "pending",
      bodyText: "",
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const { bodyText, ...templateData } = data;
      const template = {
        ...templateData,
        components: [
          {
            type: "BODY",
            text: bodyText,
          }
        ],
      };
      const response = await apiRequest("POST", "/api/templates", template);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Template Created",
        description: "Your template has been created successfully.",
      });
      setCreateModalOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Template",
        description: error.message || "An error occurred while creating the template.",
        variant: "destructive",
      });
    },
  });

  const refreshTemplatesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/templates/refresh");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Templates Refreshed",
        description: `Successfully refreshed ${data.templates || 0} templates from your WhatsApp Business account.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
    },
    onError: (error: any) => {
      toast({
        title: "Refresh Failed",
        description: error.message || "Failed to refresh templates from WhatsApp Business API.",
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/templates/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Template Deleted",
        description: "The template has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Delete Template",
        description: error.message || "An error occurred while deleting the template.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TemplateFormData) => {
    createTemplateMutation.mutate(data);
  };

  const handleCreateTemplate = async (templateData: any) => {
    try {
      const response = await apiRequest("POST", "/api/templates", templateData);
      const result = await response.json();
      
      toast({
        title: "Template Created",
        description: "Your WhatsApp Business template has been created successfully.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
    } catch (error: any) {
      toast({
        title: "Failed to Create Template",
        description: error.message || "An error occurred while creating the template.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-slate-300 mb-4"></i>
          <p className="text-slate-500">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Templates</h1>
            <p className="text-sm text-slate-500">Manage your WhatsApp message templates</p>
          </div>
          <div className="flex space-x-3">
            <Button 
              variant="outline"
              onClick={() => refreshTemplatesMutation.mutate()}
              disabled={refreshTemplatesMutation.isPending}
              data-testid="button-refresh-templates"
            >
              <i className={`fas fa-sync ${refreshTemplatesMutation.isPending ? 'fa-spin' : ''} mr-2`}></i>
              {refreshTemplatesMutation.isPending ? 'Refreshing...' : 'Refresh from WhatsApp'}
            </Button>
            <TemplateCreationDialog onCreateTemplate={handleCreateTemplate}>
              <Button data-testid="button-create-template">
                <i className="fas fa-plus mr-2"></i>
                Create Template
              </Button>
            </TemplateCreationDialog>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Template</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Template Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter template name" data-testid="input-template-name" />
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-template-category">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="marketing">Marketing</SelectItem>
                              <SelectItem value="transactional">Transactional</SelectItem>
                              <SelectItem value="utility">Utility</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="bodyText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message Body</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Enter your message body. Use {{1}}, {{2}}, etc. for dynamic parameters."
                            rows={4}
                            data-testid="textarea-template-body"
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-slate-500">
                          Use double curly braces with numbers for dynamic parameters: {`{{1}}`}, {`{{2}}`}, etc.
                        </p>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setCreateModalOpen(false)}
                      data-testid="button-cancel-template"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createTemplateMutation.isPending}
                      data-testid="button-save-template"
                    >
                      {createTemplateMutation.isPending ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          Creating...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save mr-2"></i>
                          Create Template
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {templates.length > 0 ? (
          <div className="grid gap-6">
            {templates.map((template) => {
              const bodyComponent = Array.isArray(template.components) ? template.components.find((c: any) => c.type === "BODY") : null;
              
              return (
                <Card key={template.id} data-testid={`template-card-${template.id}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={
                            template.status === 'approved' ? 'default' :
                            template.status === 'pending' ? 'secondary' :
                            'destructive'
                          }
                        >
                          {template.status}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {template.category}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-slate-600">Message Body:</Label>
                        <div className="mt-1 bg-white rounded-lg border border-green-200 shadow-sm overflow-hidden">
                          {/* Header Component Preview */}
                          {(() => {
                            const components = Array.isArray(template.components) ? template.components : [];
                            const headerComponent = components.find((c: any) => c.type === 'HEADER');
                            if (headerComponent?.format === 'IMAGE') {
                              return (
                                <div className="w-full h-32 bg-gradient-to-r from-green-100 to-green-200 flex items-center justify-center">
                                  <div className="text-center text-green-700">
                                    <i className="fas fa-image text-2xl mb-2"></i>
                                    <p className="text-xs">Header Image</p>
                                  </div>
                                </div>
                              );
                            } else if (headerComponent?.format === 'TEXT') {
                              return (
                                <div className="px-4 py-2 bg-green-50 border-b border-green-200">
                                  <p className="font-semibold text-green-800 text-sm">{headerComponent.text}</p>
                                </div>
                              );
                            }
                          })()}

                          {/* Body Content */}
                          <div className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <i className="fas fa-certificate text-green-600 text-xs"></i>
                              <span className="text-xs font-medium text-green-700 uppercase tracking-wide">
                                Business Template
                              </span>
                            </div>
                            <p className="text-sm text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                              {formatTemplateText(bodyComponent?.text || "No body text available")}
                            </p>

                            {/* Footer Component */}
                            {(() => {
                              const components = Array.isArray(template.components) ? template.components : [];
                              const footerComponent = components.find((c: any) => c.type === 'FOOTER');
                              if (footerComponent) {
                                return (
                                  <div className="mt-3 pt-2 border-t border-slate-200">
                                    <p className="text-xs text-slate-500">{footerComponent.text}</p>
                                  </div>
                                );
                              }
                            })()}
                          </div>

                          {/* Interactive Buttons */}
                          {(() => {
                            const components = Array.isArray(template.components) ? template.components : [];
                            const buttonComponent = components.find((c: any) => c.type === 'BUTTONS');
                            if (buttonComponent?.buttons && buttonComponent.buttons.length > 0) {
                              return (
                                <div className="border-t border-green-200 bg-green-50 p-3">
                                  <div className="space-y-2">
                                    {buttonComponent.buttons.map((button: any, index: number) => (
                                      <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-green-200">
                                        <div className="flex items-center gap-2">
                                          {button.type === 'URL' && <i className="fas fa-external-link-alt text-blue-600 text-xs"></i>}
                                          {button.type === 'PHONE_NUMBER' && <i className="fas fa-phone text-green-600 text-xs"></i>}
                                          {button.type === 'QUICK_REPLY' && <i className="fas fa-reply text-green-600 text-xs"></i>}
                                          <span className="text-sm font-medium text-slate-700">{button.text}</span>
                                        </div>
                                        <span className="text-xs text-slate-400 uppercase">{button.type}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            }
                          })()}

                          {/* Template Metadata */}
                          <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                  <i className="fas fa-language"></i>
                                  <span>{template.language.toUpperCase()}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <i className="fas fa-tag"></i>
                                  <span className="capitalize">{template.category}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <i className={`fas ${template.status === 'approved' ? 'fa-check-circle text-green-500' : 
                                  template.status === 'pending' ? 'fa-clock text-yellow-500' : 'fa-times-circle text-red-500'}`}></i>
                                <span className="capitalize">{template.status}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-sm text-slate-500">
                          Created: {new Date(template.createdAt || '').toLocaleDateString()}
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            data-testid={`button-edit-template-${template.id}`}
                          >
                            <i className="fas fa-edit mr-2"></i>
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => deleteTemplateMutation.mutate(template.id)}
                            disabled={deleteTemplateMutation.isPending}
                            data-testid={`button-delete-template-${template.id}`}
                          >
                            <i className="fas fa-trash mr-2"></i>
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <i className="fas fa-file-alt text-6xl text-slate-300 mb-4"></i>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No templates yet</h3>
              <p className="text-slate-500 mb-4">Create your first WhatsApp message template to get started.</p>
              <TemplateCreationDialog onCreateTemplate={handleCreateTemplate}>
                <Button data-testid="button-create-first-template">
                  <i className="fas fa-plus mr-2"></i>
                  Create Template
                </Button>
              </TemplateCreationDialog>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Image, FileText, MessageSquare, Link, Phone, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";

interface TemplateCreationDialogProps {
  onCreateTemplate: (templateData: any) => void;
  children: React.ReactNode;
}

export default function TemplateCreationDialog({ onCreateTemplate, children }: TemplateCreationDialogProps) {
  const [open, setOpen] = useState(false);
  const [templateType, setTemplateType] = useState<'content' | 'image_content' | 'buttons' | 'multiple_buttons' | 'flow'>('content');
  const [formData, setFormData] = useState({
    name: '',
    category: 'marketing',
    language: 'en',
    headerType: 'none',
    headerText: '',
    headerImage: '',
    bodyText: '',
    footerText: '',
    buttons: [{ type: 'QUICK_REPLY', text: '' }],
    flowSteps: [{ title: '', description: '' }]
  });

  const [preview, setPreview] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const components: any[] = [];
    
    // Add header component if specified
    if (formData.headerType === 'text' && formData.headerText) {
      components.push({
        type: 'HEADER',
        format: 'TEXT',
        text: formData.headerText
      });
    } else if (formData.headerType === 'image' && formData.headerImage) {
      components.push({
        type: 'HEADER',
        format: 'IMAGE',
        example: {
          header_handle: [formData.headerImage]
        }
      });
    }

    // Add body component (required)
    components.push({
      type: 'BODY',
      text: formData.bodyText
    });

    // Add footer component if specified
    if (formData.footerText) {
      components.push({
        type: 'FOOTER',
        text: formData.footerText
      });
    }

    // Add buttons based on template type
    if (['buttons', 'multiple_buttons'].includes(templateType)) {
      const validButtons = formData.buttons.filter(btn => btn.text.trim());
      if (validButtons.length > 0) {
        components.push({
          type: 'BUTTONS',
          buttons: validButtons
        });
      }
    }

    // Add flow components for flow type
    if (templateType === 'flow') {
      const validSteps = formData.flowSteps.filter(step => step.title.trim());
      if (validSteps.length > 0) {
        components.push({
          type: 'FLOW',
          steps: validSteps
        });
      }
    }

    const templateData = {
      name: formData.name,
      category: formData.category,
      language: formData.language,
      components,
      status: 'pending'
    };

    onCreateTemplate(templateData);
    setOpen(false);
    
    // Reset form
    setFormData({
      name: '',
      category: 'marketing',
      language: 'en',
      headerType: 'none',
      headerText: '',
      headerImage: '',
      bodyText: '',
      footerText: '',
      buttons: [{ type: 'QUICK_REPLY', text: '' }],
      flowSteps: [{ title: '', description: '' }]
    });
  };

  const addButton = () => {
    setFormData(prev => ({
      ...prev,
      buttons: [...prev.buttons, { type: 'QUICK_REPLY', text: '' }]
    }));
  };

  const removeButton = (index: number) => {
    setFormData(prev => ({
      ...prev,
      buttons: prev.buttons.filter((_, i) => i !== index)
    }));
  };

  const updateButton = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      buttons: prev.buttons.map((btn, i) => 
        i === index ? { ...btn, [field]: value } : btn
      )
    }));
  };

  const addFlowStep = () => {
    setFormData(prev => ({
      ...prev,
      flowSteps: [...prev.flowSteps, { title: '', description: '' }]
    }));
  };

  const removeFlowStep = (index: number) => {
    setFormData(prev => ({
      ...prev,
      flowSteps: prev.flowSteps.filter((_, i) => i !== index)
    }));
  };

  const updateFlowStep = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      flowSteps: prev.flowSteps.map((step, i) => 
        i === index ? { ...step, [field]: value } : step
      )
    }));
  };

  const renderPreview = () => {
    const headerComponent = formData.headerType === 'text' && formData.headerText ? 
      { type: 'HEADER', format: 'TEXT', text: formData.headerText } :
      formData.headerType === 'image' && formData.headerImage ?
      { type: 'HEADER', format: 'IMAGE', example: { header_handle: [formData.headerImage] } } : null;

    return (
      <div className="bg-white rounded-lg border border-green-200 shadow-sm overflow-hidden">
        {/* Header Preview */}
        {headerComponent && headerComponent.format === 'IMAGE' && (
          <div className="w-full h-32 bg-gradient-to-r from-green-100 to-green-200 flex items-center justify-center">
            <div className="text-center text-green-700">
              <Image className="w-8 h-8 mx-auto mb-2" />
              <p className="text-xs">Header Image</p>
            </div>
          </div>
        )}
        
        {headerComponent && headerComponent.format === 'TEXT' && (
          <div className="px-4 py-2 bg-green-50 border-b border-green-200">
            <p className="font-semibold text-green-800 text-sm">{formData.headerText}</p>
          </div>
        )}

        {/* Body Preview */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <i className="fas fa-certificate text-green-600 text-xs"></i>
            <span className="text-xs font-medium text-green-700 uppercase tracking-wide">
              Business Template
            </span>
          </div>
          <p className="text-sm text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
            {formData.bodyText || "Enter body text..."}
          </p>

          {/* Footer Preview */}
          {formData.footerText && (
            <div className="mt-3 pt-2 border-t border-slate-200">
              <p className="text-xs text-slate-500">{formData.footerText}</p>
            </div>
          )}
        </div>

        {/* Buttons Preview */}
        {(['buttons', 'multiple_buttons'].includes(templateType)) && formData.buttons.some(btn => btn.text.trim()) && (
          <div className="border-t border-green-200 bg-green-50 p-3">
            <div className="space-y-2">
              {formData.buttons.filter(btn => btn.text.trim()).map((button, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-green-200">
                  <div className="flex items-center gap-2">
                    {button.type === 'URL' && <Link className="w-3 h-3 text-blue-600" />}
                    {button.type === 'PHONE_NUMBER' && <Phone className="w-3 h-3 text-green-600" />}
                    {button.type === 'QUICK_REPLY' && <MessageSquare className="w-3 h-3 text-green-600" />}
                    <span className="text-sm font-medium text-slate-700">{button.text}</span>
                  </div>
                  <span className="text-xs text-slate-400 uppercase">{button.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Flow Preview */}
        {templateType === 'flow' && formData.flowSteps.some(step => step.title.trim()) && (
          <div className="border-t border-green-200 bg-blue-50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Workflow className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Interactive Flow</span>
            </div>
            <div className="space-y-2">
              {formData.flowSteps.filter(step => step.title.trim()).map((step, index) => (
                <div key={index} className="p-2 bg-white rounded border border-blue-200">
                  <p className="text-sm font-medium text-slate-700">{step.title}</p>
                  {step.description && (
                    <p className="text-xs text-slate-500 mt-1">{step.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create WhatsApp Business Template</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Template Type Selection */}
              <div>
                <Label className="text-sm font-medium">Template Type</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {[
                    { value: 'content', label: 'Content Only', icon: FileText },
                    { value: 'image_content', label: 'Image + Content', icon: Image },
                    { value: 'buttons', label: 'Single Button', icon: MessageSquare },
                    { value: 'multiple_buttons', label: 'Multiple Buttons', icon: MessageSquare },
                    { value: 'flow', label: 'Interactive Flow', icon: Workflow }
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTemplateType(value as any)}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors",
                        templateType === value
                          ? "bg-green-50 border-green-300 text-green-700"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Basic Template Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="my_template_name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="utility">Utility</SelectItem>
                      <SelectItem value="authentication">Authentication</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Header Section */}
              {['image_content', 'buttons', 'multiple_buttons', 'flow'].includes(templateType) && (
                <div>
                  <Label>Header (Optional)</Label>
                  <Select value={formData.headerType} onValueChange={(value) => setFormData(prev => ({ ...prev, headerType: value }))}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Header</SelectItem>
                      <SelectItem value="text">Text Header</SelectItem>
                      <SelectItem value="image">Image Header</SelectItem>
                    </SelectContent>
                  </Select>

                  {formData.headerType === 'text' && (
                    <Input
                      className="mt-2"
                      value={formData.headerText}
                      onChange={(e) => setFormData(prev => ({ ...prev, headerText: e.target.value }))}
                      placeholder="Header text"
                    />
                  )}

                  {formData.headerType === 'image' && (
                    <Input
                      className="mt-2"
                      value={formData.headerImage}
                      onChange={(e) => setFormData(prev => ({ ...prev, headerImage: e.target.value }))}
                      placeholder="Image URL"
                    />
                  )}
                </div>
              )}

              {/* Body Text */}
              <div>
                <Label htmlFor="bodyText">Message Body</Label>
                <Textarea
                  id="bodyText"
                  value={formData.bodyText}
                  onChange={(e) => setFormData(prev => ({ ...prev, bodyText: e.target.value }))}
                  placeholder="Enter your message content here..."
                  required
                  rows={4}
                />
              </div>

              {/* Footer */}
              <div>
                <Label htmlFor="footerText">Footer (Optional)</Label>
                <Input
                  id="footerText"
                  value={formData.footerText}
                  onChange={(e) => setFormData(prev => ({ ...prev, footerText: e.target.value }))}
                  placeholder="Footer text (optional)"
                />
              </div>

              {/* Buttons Section */}
              {['buttons', 'multiple_buttons'].includes(templateType) && (
                <div>
                  <div className="flex items-center justify-between">
                    <Label>Interactive Buttons</Label>
                    <Button type="button" onClick={addButton} size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Button
                    </Button>
                  </div>
                  <div className="space-y-2 mt-2">
                    {formData.buttons.map((button, index) => (
                      <div key={index} className="flex gap-2">
                        <Select
                          value={button.type}
                          onValueChange={(value) => updateButton(index, 'type', value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="QUICK_REPLY">Quick Reply</SelectItem>
                            <SelectItem value="URL">Website Link</SelectItem>
                            <SelectItem value="PHONE_NUMBER">Phone Call</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          value={button.text}
                          onChange={(e) => updateButton(index, 'text', e.target.value)}
                          placeholder="Button text"
                          className="flex-1"
                        />
                        {formData.buttons.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeButton(index)}
                            size="sm"
                            variant="outline"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Flow Steps Section */}
              {templateType === 'flow' && (
                <div>
                  <div className="flex items-center justify-between">
                    <Label>Flow Steps</Label>
                    <Button type="button" onClick={addFlowStep} size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Step
                    </Button>
                  </div>
                  <div className="space-y-2 mt-2">
                    {formData.flowSteps.map((step, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={step.title}
                          onChange={(e) => updateFlowStep(index, 'title', e.target.value)}
                          placeholder="Step title"
                          className="flex-1"
                        />
                        <Input
                          value={step.description}
                          onChange={(e) => updateFlowStep(index, 'description', e.target.value)}
                          placeholder="Description (optional)"
                          className="flex-1"
                        />
                        {formData.flowSteps.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeFlowStep(index)}
                            size="sm"
                            variant="outline"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  Create Template
                </Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>

          {/* Preview Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Preview</h3>
            </div>
            {renderPreview()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
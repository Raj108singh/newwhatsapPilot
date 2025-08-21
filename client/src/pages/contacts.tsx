import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Contact, insertContactSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const contactFormSchema = insertContactSchema.extend({
  tags: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

export default function Contacts() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      phoneNumber: "",
      name: "",
      email: "",
      tags: "",
    },
  });

  const createContactMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      const { tags, ...contactData } = data;
      const contact = {
        ...contactData,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      };
      const response = await apiRequest("/api/contacts", {
        method: "POST",
        body: JSON.stringify(contact),
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Contact Created",
        description: "The contact has been added successfully.",
      });
      setCreateModalOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Contact",
        description: error.message || "An error occurred while creating the contact.",
        variant: "destructive",
      });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/contacts/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Contact Deleted",
        description: "The contact has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Delete Contact",
        description: error.message || "An error occurred while deleting the contact.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ContactFormData) => {
    createContactMutation.mutate(data);
  };

  const importContactsMutation = useMutation({
    mutationFn: async (contacts: ContactFormData[]) => {
      const results = [];
      for (const contact of contacts) {
        try {
          const { tags, ...contactData } = contact;
          const processedContact = {
            ...contactData,
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
          };
          const response = await apiRequest("/api/contacts", {
            method: "POST",
            body: JSON.stringify(processedContact),
          });
          results.push({ success: true, contact: response });
        } catch (error) {
          results.push({ success: false, contact, error: error instanceof Error ? error.message : String(error) });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      toast({
        title: "CSV Import Complete",
        description: `Successfully imported ${successful} contacts${failed > 0 ? `, ${failed} failed` : ''}`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import contacts from CSV",
        variant: "destructive",
      });
    },
  });

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvContent = e.target?.result as string;
        const lines = csvContent.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          throw new Error('CSV file is empty');
        }

        // Check if first line is header
        const firstLine = lines[0].toLowerCase();
        const hasHeader = firstLine.includes('name') || firstLine.includes('phone') || firstLine.includes('email');
        const dataLines = hasHeader ? lines.slice(1) : lines;

        const contacts: ContactFormData[] = [];
        for (const line of dataLines) {
          const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
          
          // Support different CSV formats
          let phoneNumber = '';
          let name = '';
          let email = '';
          let tags = '';

          if (values.length === 1) {
            // Just phone number
            phoneNumber = values[0];
          } else if (values.length === 2) {
            // Phone and name or name and phone
            if (values[0].includes('+') || /^\d/.test(values[0])) {
              phoneNumber = values[0];
              name = values[1];
            } else {
              name = values[0];
              phoneNumber = values[1];
            }
          } else if (values.length >= 3) {
            // Name, phone, email format
            name = values[0];
            phoneNumber = values[1];
            email = values[2] || '';
            tags = values[3] || '';
          }

          if (phoneNumber && phoneNumber.trim()) {
            contacts.push({
              phoneNumber: phoneNumber.trim(),
              name: name.trim() || undefined,
              email: email.trim() || undefined,
              tags: tags.trim() || undefined,
            });
          }
        }

        if (contacts.length === 0) {
          throw new Error('No valid contacts found in CSV');
        }

        importContactsMutation.mutate(contacts);
        
      } catch (error) {
        toast({
          title: "CSV Parse Error",
          description: error instanceof Error ? error.message : "Failed to parse CSV file",
          variant: "destructive",
        });
      }
    };
    
    reader.readAsText(file);
    // Clear the input
    event.target.value = '';
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // Filter contacts based on search term
  const filteredContacts = contacts.filter(contact =>
    contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phoneNumber.includes(searchTerm) ||
    contact.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-slate-300 mb-4"></i>
          <p className="text-slate-500">Loading contacts...</p>
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
            <h1 className="text-2xl font-semibold text-slate-900">Contacts</h1>
            <p className="text-sm text-slate-500">Manage your WhatsApp contacts and customer database</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              onClick={handleImportClick}
              disabled={importContactsMutation.isPending}
              data-testid="button-import-contacts"
            >
              {importContactsMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Importing...
                </>
              ) : (
                <>
                  <i className="fas fa-upload mr-2"></i>
                  Import CSV
                </>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              className="hidden"
            />
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-contact">
                  <i className="fas fa-plus mr-2"></i>
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="+1234567890" data-testid="input-contact-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="Enter contact name" data-testid="input-contact-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} type="email" placeholder="contact@example.com" data-testid="input-contact-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tags (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="customer, vip, lead (comma separated)" data-testid="input-contact-tags" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-3 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setCreateModalOpen(false)}
                        data-testid="button-cancel-contact"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createContactMutation.isPending}
                        data-testid="button-save-contact"
                      >
                        {createContactMutation.isPending ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Saving...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-save mr-2"></i>
                            Save Contact
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
        {/* Search and Filter */}
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 max-w-md">
              <Input
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-contacts"
              />
            </div>
            <div className="text-sm text-slate-500">
              {filteredContacts.length} of {contacts.length} contacts
            </div>
          </div>
        </div>

        {/* Contacts Grid */}
        {filteredContacts.length > 0 ? (
          <div className="grid gap-4">
            {filteredContacts.map((contact) => (
              <Card key={contact.id} data-testid={`contact-card-${contact.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                        <i className="fas fa-user text-slate-500 text-lg"></i>
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {contact.name || 'Unknown Contact'}
                        </h3>
                        <p className="text-sm text-slate-600">{contact.phoneNumber}</p>
                        {contact.email && (
                          <p className="text-sm text-slate-500">{contact.email}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(contact.tags) && contact.tags.length > 0 ? (
                          contact.tags.map((tag: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline" className="text-xs text-slate-400">
                            No tags
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          data-testid={`button-edit-contact-${contact.id}`}
                        >
                          <i className="fas fa-edit mr-2"></i>
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          data-testid={`button-message-contact-${contact.id}`}
                        >
                          <i className="fas fa-paper-plane mr-2"></i>
                          Message
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteContactMutation.mutate(contact.id)}
                          disabled={deleteContactMutation.isPending}
                          data-testid={`button-delete-contact-${contact.id}`}
                        >
                          <i className="fas fa-trash mr-2"></i>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="text-sm text-slate-500">
                      Added: {new Date(contact.createdAt || '').toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : searchTerm ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <i className="fas fa-search text-6xl text-slate-300 mb-4"></i>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No contacts found</h3>
              <p className="text-slate-500 mb-4">No contacts match your search criteria.</p>
              <Button onClick={() => setSearchTerm("")} data-testid="button-clear-search">
                Clear Search
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <i className="fas fa-address-book text-6xl text-slate-300 mb-4"></i>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No contacts yet</h3>
              <p className="text-slate-500 mb-4">Add your first contact to start building your customer database.</p>
              <Button onClick={() => setCreateModalOpen(true)} data-testid="button-add-first-contact">
                <i className="fas fa-plus mr-2"></i>
                Add Contact
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
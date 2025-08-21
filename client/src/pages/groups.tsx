import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Group, Contact } from "@shared/schema";

const groupFormSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
});

type GroupFormData = z.infer<typeof groupFormSchema>;

export default function Groups() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const { toast } = useToast();

  // Get all groups
  const { data: groups = [], isLoading: groupsLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  // Get all contacts for adding to groups
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  // Get group members for selected group
  const { data: groupMembers = [] } = useQuery<Contact[]>({
    queryKey: ["/api/groups", selectedGroupId, "members"],
    enabled: !!selectedGroupId,
  });

  const form = useForm<GroupFormData>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async (data: GroupFormData) => {
      const response = await apiRequest("/api/groups", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Group Created",
        description: "The group has been created successfully.",
      });
      setCreateModalOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Group",
        description: error.message || "An error occurred while creating the group.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: GroupFormData) => {
    createGroupMutation.mutate(data);
  };

  // Group contacts by their tags for easy visualization
  const contactsByTag = contacts.reduce((acc, contact) => {
    const tags = Array.isArray(contact.tags) ? contact.tags : [];
    tags.forEach(tag => {
      if (!acc[tag]) acc[tag] = [];
      acc[tag].push(contact);
    });
    
    // Add contacts without tags to "Untagged" group
    if (tags.length === 0) {
      if (!acc["Untagged"]) acc["Untagged"] = [];
      acc["Untagged"].push(contact);
    }
    
    return acc;
  }, {} as Record<string, Contact[]>);

  if (groupsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-slate-300 mb-4"></i>
          <p className="text-slate-500">Loading groups...</p>
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
            <h1 className="text-2xl font-semibold text-slate-900">Contact Groups</h1>
            <p className="text-sm text-slate-500">Organize your contacts into WhatsApp-style groups</p>
          </div>
          <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <i className="fas fa-plus mr-2"></i>
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., VIP Customers, Staff Members" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Brief description of this group..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createGroupMutation.isPending}>
                      {createGroupMutation.isPending ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          Creating...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save mr-2"></i>
                          Create Group
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {/* Tag-based Groups (Current System) */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            <i className="fas fa-tags mr-2 text-blue-600"></i>
            Tag-Based Groups ({Object.keys(contactsByTag).length})
          </h2>
          
          {Object.keys(contactsByTag).length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(contactsByTag).map(([tag, tagContacts]) => (
                <div key={tag} className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <i className="fas fa-users text-blue-600"></i>
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900">{tag}</h3>
                        <p className="text-sm text-slate-500">{tagContacts.length} contacts</p>
                      </div>
                    </div>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {tagContacts.length}
                    </span>
                  </div>
                  
                  {/* Show first few contacts */}
                  <div className="space-y-2">
                    {tagContacts.slice(0, 3).map((contact) => (
                      <div key={contact.id} className="flex items-center text-sm">
                        <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center mr-2">
                          <i className="fas fa-user text-slate-500 text-xs"></i>
                        </div>
                        <span className="text-slate-700">{contact.name || contact.phoneNumber}</span>
                      </div>
                    ))}
                    {tagContacts.length > 3 && (
                      <p className="text-xs text-slate-500 ml-8">
                        +{tagContacts.length - 3} more contacts
                      </p>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <Button variant="outline" size="sm" className="w-full">
                      <i className="fas fa-paper-plane mr-2"></i>
                      Send to Group
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
              <i className="fas fa-users text-4xl text-slate-300 mb-4"></i>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Contact Groups Yet</h3>
              <p className="text-slate-500 mb-4">
                Add tags to your contacts to organize them into groups automatically.
              </p>
              <Button variant="outline" onClick={() => window.location.href = '/contacts'}>
                <i className="fas fa-plus mr-2"></i>
                Go to Contacts
              </Button>
            </div>
          )}
        </div>

        {/* Future: Manual Groups */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            <i className="fas fa-layer-group mr-2 text-green-600"></i>
            Custom Groups (Coming Soon)
          </h2>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              <i className="fas fa-info-circle mr-2"></i>
              Manual group creation and contact assignment will be available in the next update.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
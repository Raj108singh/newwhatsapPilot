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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const { toast } = useToast();

  // Get all groups
  const { data: groups = [], isLoading: groupsLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  // Get all contacts for adding to groups
  const { data: contacts = [], isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  // Get group members for selected group
  const { data: groupMembers = [] } = useQuery<Contact[]>({
    queryKey: ["/api/groups", selectedGroup?.id, "members"],
    enabled: !!selectedGroup?.id,
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

  const addMembersMutation = useMutation({
    mutationFn: async ({ groupId, contactIds }: { groupId: string; contactIds: string[] }) => {
      const response = await apiRequest(`/api/groups/${groupId}/members`, {
        method: "POST",
        body: JSON.stringify({ contactIds }),
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Members Added",
        description: "Contacts have been added to the group successfully.",
      });
      setSelectedContacts([]);
      queryClient.invalidateQueries({ queryKey: ["/api/groups", selectedGroup?.id, "members"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Members",
        description: error.message || "An error occurred while adding members.",
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({ groupId, contactId }: { groupId: string; contactId: string }) => {
      const response = await apiRequest(`/api/groups/${groupId}/members/${contactId}`, {
        method: "DELETE",
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Member Removed",
        description: "Contact has been removed from the group.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", selectedGroup?.id, "members"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Remove Member",
        description: error.message || "An error occurred while removing the member.",
        variant: "destructive",
      });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const response = await apiRequest(`/api/groups/${groupId}`, {
        method: "DELETE",
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Group Deleted",
        description: "The group has been deleted successfully.",
      });
      setManageModalOpen(false);
      setSelectedGroup(null);
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Delete Group",
        description: error.message || "An error occurred while deleting the group.",
        variant: "destructive",
      });
    },
  });

  const handleManageGroup = (group: Group) => {
    setSelectedGroup(group);
    setManageModalOpen(true);
    setSelectedContacts([]);
  };

  const handleAddSelectedMembers = () => {
    if (selectedGroup && selectedContacts.length > 0) {
      addMembersMutation.mutate({
        groupId: selectedGroup.id,
        contactIds: selectedContacts,
      });
    }
  };

  const handleRemoveMember = (contactId: string) => {
    if (selectedGroup) {
      removeMemberMutation.mutate({
        groupId: selectedGroup.id,
        contactId,
      });
    }
  };

  const handleToggleContact = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  // Get available contacts (not already in the group)
  const availableContacts = contacts.filter(contact => 
    !groupMembers.some(member => member.id === contact.id)
  );

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

        {/* Manual Groups */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            <i className="fas fa-layer-group mr-2 text-purple-600"></i>
            Custom Groups ({groups.length})
          </h2>
          
          {groups.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <div key={group.id} className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-lg transition-all hover:scale-105">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-3">
                        <i className="fas fa-users text-white text-lg"></i>
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{group.name}</h3>
                        <p className="text-sm text-slate-500 line-clamp-2">
                          {group.description || 'No description'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                      Loading members...
                    </Badge>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleManageGroup(group)}
                    >
                      <i className="fas fa-cog mr-2"></i>
                      Manage
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    >
                      <i className="fas fa-paper-plane mr-2"></i>
                      Message
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-dashed border-purple-300">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-layer-group text-white text-2xl"></i>
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Custom Groups Yet</h3>
              <p className="text-slate-500 mb-4">
                Create custom groups to organize your contacts manually and send targeted messages.
              </p>
              <Button onClick={() => setCreateModalOpen(true)} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                <i className="fas fa-plus mr-2"></i>
                Create Your First Group
              </Button>
            </div>
          )}
        </div>

        {/* Group Management Modal */}
        <Dialog open={manageModalOpen} onOpenChange={setManageModalOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <i className="fas fa-users mr-2 text-purple-600"></i>
                Manage Group: {selectedGroup?.name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Current Members */}
              <div>
                <h3 className="font-medium text-slate-900 mb-3 flex items-center">
                  <i className="fas fa-user-friends mr-2 text-blue-600"></i>
                  Current Members ({groupMembers.length})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                  {groupMembers.length > 0 ? (
                    groupMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <i className="fas fa-user text-blue-600 text-sm"></i>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{member.name || member.phoneNumber}</p>
                            <p className="text-xs text-slate-500">{member.phoneNumber}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <i className="fas fa-times"></i>
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-center py-4">No members in this group yet</p>
                  )}
                </div>
              </div>
              
              {/* Add Members */}
              <div>
                <h3 className="font-medium text-slate-900 mb-3 flex items-center">
                  <i className="fas fa-user-plus mr-2 text-green-600"></i>
                  Add Members ({selectedContacts.length} selected)
                </h3>
                
                {contactsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <i className="fas fa-spinner fa-spin text-slate-400 mr-2"></i>
                    <span className="text-slate-500">Loading contacts...</span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                    {availableContacts.length > 0 ? (
                      <>
                        <div className="bg-green-50 border border-green-200 rounded p-2 mb-2">
                          <p className="text-xs text-green-700">
                            <i className="fas fa-info-circle mr-1"></i>
                            Click on contacts to select them for this group
                          </p>
                        </div>
                        {availableContacts.map((contact) => (
                          <div 
                            key={contact.id} 
                            className={`flex items-center p-3 hover:bg-slate-50 rounded cursor-pointer border transition-all ${
                              selectedContacts.includes(contact.id) ? 'border-green-500 bg-green-50' : 'border-slate-200'
                            }`}
                            onClick={() => handleToggleContact(contact.id)}
                          >
                            <Checkbox
                              checked={selectedContacts.includes(contact.id)}
                              onCheckedChange={() => handleToggleContact(contact.id)}
                              className="mr-3 h-5 w-5"
                            />
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                              <i className="fas fa-user text-green-600"></i>
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-sm text-slate-900">{contact.name || contact.phoneNumber}</p>
                              <p className="text-xs text-slate-600">{contact.phoneNumber}</p>
                              {Array.isArray(contact.tags) && contact.tags.length > 0 && (
                                <div className="flex space-x-1 mt-1">
                                  {contact.tags.slice(0, 2).map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {contact.tags.length > 2 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{contact.tags.length - 2} more
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                            {selectedContacts.includes(contact.id) && (
                              <div className="text-green-600">
                                <i className="fas fa-check-circle"></i>
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <i className="fas fa-users text-slate-300 text-3xl mb-2"></i>
                        <p className="text-slate-500">All contacts are already in this group</p>
                        <p className="text-xs text-slate-400 mt-1">Add more contacts to your account to expand this group</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
                
                {selectedContacts.length > 0 && (
                  <Button
                    onClick={handleAddSelectedMembers}
                    disabled={addMembersMutation.isPending}
                    className="w-full mt-3 bg-green-600 hover:bg-green-700"
                  >
                    {addMembersMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Adding...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-plus mr-2"></i>
                        Add {selectedContacts.length} Member{selectedContacts.length !== 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
            
            {/* Group Actions */}}
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="destructive"
                onClick={() => selectedGroup && deleteGroupMutation.mutate(selectedGroup.id)}
                disabled={deleteGroupMutation.isPending}
              >
                {deleteGroupMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Deleting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-trash mr-2"></i>
                    Delete Group
                  </>
                )}
              </Button>
              
              <Button variant="outline" onClick={() => setManageModalOpen(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
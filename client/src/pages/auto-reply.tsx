import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertAutoReplyRuleSchema, type AutoReplyRule, type InsertAutoReplyRule } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Bot, Plus, Edit, Trash2, MessageSquare, Clock, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AutoReplyPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoReplyRule | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["/api/auto-reply-rules"],
  }) as { data: AutoReplyRule[], isLoading: boolean };

  const form = useForm<InsertAutoReplyRule>({
    resolver: zodResolver(insertAutoReplyRuleSchema),
    defaultValues: {
      name: "",
      trigger: "",
      triggerType: "keyword",
      replyMessage: "",
      isActive: true,
      priority: 1,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertAutoReplyRule) => apiRequest("/api/auto-reply-rules", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auto-reply-rules"] });
      setIsDialogOpen(false);
      setEditingRule(null);
      form.reset();
      toast({ title: "Auto-reply rule created successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to create auto-reply rule", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<InsertAutoReplyRule> }) => 
      apiRequest(`/api/auto-reply-rules/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auto-reply-rules"] });
      setIsDialogOpen(false);
      setEditingRule(null);
      form.reset();
      toast({ title: "Auto-reply rule updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update auto-reply rule", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/auto-reply-rules/${id}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auto-reply-rules"] });
      toast({ title: "Auto-reply rule deleted successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to delete auto-reply rule", variant: "destructive" });
    },
  });

  const createEmojiRules = useMutation({
    mutationFn: () => apiRequest("/api/auto-reply-rules/create-emoji-rules", {
      method: "POST",
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auto-reply-rules"] });
      toast({ title: `🎉 ${data.message}`, description: "Your auto-reply rules now include emojis!" });
    },
    onError: () => {
      toast({ title: "Failed to create emoji rules", variant: "destructive" });
    },
  });

  const handleEdit = (rule: AutoReplyRule) => {
    setEditingRule(rule);
    form.reset({
      name: rule.name,
      trigger: rule.trigger,
      triggerType: rule.triggerType,
      replyMessage: rule.replyMessage,
      isActive: rule.isActive,
      priority: rule.priority,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this auto-reply rule?")) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: InsertAutoReplyRule) => {
    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getTriggerTypeIcon = (type: string) => {
    switch (type) {
      case 'keyword': return <MessageSquare className="w-4 h-4" />;
      case 'greeting': return <Clock className="w-4 h-4" />;
      case 'default': return <Zap className="w-4 h-4" />;
      default: return <Bot className="w-4 h-4" />;
    }
  };

  const getTriggerTypeBadge = (type: string) => {
    const colors = {
      keyword: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      greeting: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      default: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    };
    
    return (
      <Badge className={colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        <div className="flex items-center space-x-1">
          {getTriggerTypeIcon(type)}
          <span className="capitalize">{type}</span>
        </div>
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Auto Reply Rules 🤖</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create intelligent chatbot responses with emoji support for customer inquiries
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => createEmojiRules.mutate()}
            disabled={createEmojiRules.isPending}
            variant="outline"
            className="bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-800"
            data-testid="button-create-emoji-rules"
          >
            {createEmojiRules.isPending ? 'Adding...' : '🎉 Add Emoji Rules'}
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => {
                  setEditingRule(null);
                  form.reset();
                }}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-create-rule"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Rule
              </Button>
            </DialogTrigger>
          
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingRule ? "Edit Auto Reply Rule 📝" : "Create Auto Reply Rule ✨"}
                </DialogTitle>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rule Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., 🎉 Welcome Greeting, 💰 Pricing Info, 🛠️ Support"
                            data-testid="input-rule-name"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="triggerType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trigger Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-trigger-type">
                                <SelectValue placeholder="Select trigger type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="keyword">🔤 Keyword</SelectItem>
                              <SelectItem value="exact_match">🎯 Exact Match</SelectItem>
                              <SelectItem value="contains_any">📝 Contains Any</SelectItem>
                              <SelectItem value="starts_with">▶️ Starts With</SelectItem>
                              <SelectItem value="greeting">👋 Greeting</SelectItem>
                              <SelectItem value="numeric">🔢 Numeric</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              max="10"
                              placeholder="1-10 (higher = more priority)"
                              data-testid="input-priority"
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormDescription>
                            Higher priority rules are processed first
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="trigger"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trigger Text</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., hello 👋, help ❓, support 💬, pricing 💰"
                            data-testid="input-trigger"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Keywords or phrases with emojis that will trigger this response
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="replyMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reply Message</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Hello! 👋 Thanks for contacting us. How can we help you today? 😊&#10;&#10;Choose an option:&#10;1️⃣ Product Info 📦&#10;2️⃣ Pricing 💰&#10;3️⃣ Support 🛠️"
                            rows={6}
                            data-testid="textarea-reply-message"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          The automatic response with emojis that will be sent
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>✅ Active</FormLabel>
                          <FormDescription>
                            Enable this auto-reply rule
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-is-active"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setEditingRule(null);
                        form.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-save-rule"
                    >
                      {editingRule ? "Update Rule 📝" : "Create Rule ✨"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Rules Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(rules as AutoReplyRule[]).map((rule: AutoReplyRule) => (
            <Card key={rule.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg" data-testid={`text-rule-name-${rule.id}`}>
                      {rule.name}
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      {getTriggerTypeBadge(rule.triggerType)}
                      <Badge variant={rule.isActive ? "default" : "secondary"}>
                        {rule.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Priority {rule.priority}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(rule)}
                      data-testid={`button-edit-${rule.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(rule.id)}
                      data-testid={`button-delete-${rule.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Trigger:
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded mt-1">
                    "{rule.trigger}"
                  </p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Reply:
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-3">
                    {rule.replyMessage}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}

          {rules.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <Bot className="w-12 h-12 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Auto Reply Rules 🤖</h3>
              <p className="text-center mb-4">
                Create your first auto-reply rule with emoji support to start automating customer responses
              </p>
              <Button
                onClick={() => setIsDialogOpen(true)}
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Rule ✨
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
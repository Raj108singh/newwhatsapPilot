import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Send, User, Clock, Check, CheckCheck, Phone } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { enIN } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import type { Conversation, Message } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import ChatMessage from "@/components/chat-message";

export default function ConversationsPage() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading: loadingConversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    refetchInterval: 3000, // Refresh every 3 seconds to get new conversations
  });

  const { data: messages = [], isLoading: loadingMessages } = useQuery<Message[]>({
    queryKey: ["/api/conversations", selectedConversation?.id, "messages"],
    queryFn: () => apiRequest(`/api/conversations/${selectedConversation?.id}/messages`),
    enabled: !!selectedConversation?.id,
  });

  // Sort messages by creation date (oldest first, newest at bottom)
  const sortedMessages = [...messages].sort((a, b) => 
    new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      const messagesContainer = document.getElementById('messages-container');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/messages", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversation?.id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: () => {
      toast({
        title: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log("WebSocket connected");
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'new_message' || data.type === 'incoming_message') {
          // Update messages if viewing the relevant conversation
          if (selectedConversation && data.data.conversationId === selectedConversation.id) {
            queryClient.invalidateQueries({ 
              queryKey: ["/api/conversations", selectedConversation.id, "messages"] 
            });
          }
          
          // Update conversations list
          queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
          
          // Show toast for incoming messages
          if (data.type === 'incoming_message') {
            toast({
              title: "New message received",
              description: `From ${data.data.phoneNumber}`,
            });
          }
        }
        
        if (data.type === 'message_status_update') {
          // Update message status
          queryClient.invalidateQueries({ 
            queryKey: ["/api/conversations", selectedConversation?.id, "messages"] 
          });
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setSocket(null);
    };

    return () => {
      ws.close();
    };
  }, [selectedConversation, queryClient, toast]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;

    sendMessageMutation.mutate({
      phoneNumber: selectedConversation.phoneNumber,
      content: newMessage.trim(),
      direction: 'outbound',
      conversationId: selectedConversation.id,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Check className="w-3 h-3 text-gray-500" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-600" />;
      default:
        return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  const getInitials = (phoneNumber: string) => {
    return phoneNumber.slice(-2).toUpperCase();
  };

  // Format time in Asia/Kolkata timezone
  const formatTimeInIST = (date: Date | string) => {
    const utcDate = new Date(date);
    // Add 5:30 hours for IST (UTC+5:30)
    const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
    return format(istDate, 'HH:mm');
  };

  const formatDateInIST = (date: Date | string) => {
    const utcDate = new Date(date);
    const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
    return formatDistanceToNow(istDate, { addSuffix: true });
  };

  return (
    <div className="container mx-auto p-6 h-screen max-h-screen">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Live Chat</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Real-time conversations with customers
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={socket ? "default" : "destructive"}>
              {socket ? "Connected" : "Disconnected"}
            </Badge>
            <span className="text-sm text-gray-500">
              {conversations.length} conversations
            </span>
          </div>
        </div>

        {/* Chat Interface - WhatsApp Style */}
        <div className="flex-1 flex bg-white dark:bg-gray-900 rounded-lg shadow-xl overflow-hidden" style={{ background: '#f0f2f5' }}>
          {/* Conversations List - WhatsApp Sidebar */}
          <div className="w-1/3 bg-white dark:bg-gray-800 border-r border-gray-300 dark:border-gray-600">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-green-600">
              <h2 className="text-lg font-semibold text-white">
                WhatsApp Business
              </h2>
              <p className="text-green-100 text-sm">Conversations</p>
            </div>
            
            <ScrollArea className="flex-1" style={{ height: 'calc(100vh - 200px)' }}>
              {loadingConversations ? (
                <div className="flex items-center justify-center p-8">
                  <div className="w-6 h-6 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                  <MessageCircle className="w-12 h-12 mb-4" />
                  <p className="text-center">No conversations yet</p>
                  <p className="text-sm text-center mt-2">
                    Conversations will appear here when customers message you
                  </p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {conversations.map((conversation: Conversation) => (
                    <Card 
                      key={conversation.id}
                      className={`cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        selectedConversation?.id === conversation.id ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' : ''
                      }`}
                      onClick={() => setSelectedConversation(conversation)}
                      data-testid={`conversation-${conversation.id}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-blue-100 text-blue-600">
                              {getInitials(conversation.phoneNumber)}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {conversation.contactName || conversation.phoneNumber}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                <Phone className="w-3 h-3 mr-1" />
                                {conversation.phoneNumber}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                              {conversation.lastMessage || "No messages yet"}
                            </p>
                            
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-400">
                                {conversation.lastMessageAt && 
                                  formatDateInIST(conversation.lastMessageAt)
                                }
                              </span>
                              
                              {conversation.unreadCount > 0 && (
                                <Badge className="bg-green-600 text-white text-xs">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header - WhatsApp Style */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-green-600 text-white">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarFallback className="bg-white text-green-600 font-bold">
                        {getInitials(selectedConversation.phoneNumber)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-white">
                        {selectedConversation.contactName || selectedConversation.phoneNumber}
                      </h3>
                      <p className="text-sm text-green-100">
                        {selectedConversation.phoneNumber} • Active now
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages Area - WhatsApp Chat Background */}
                <div id="messages-container" className="flex-1 p-4 overflow-y-auto" style={{ 
                  height: 'calc(100vh - 300px)',
                  backgroundImage: `url("data:image/svg+xml,%3csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3e%3cg fill='none' fill-rule='evenodd'%3e%3cg fill='%23e5ddd5' fill-opacity='0.1'%3e%3cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3e%3c/g%3e%3c/g%3e%3c/svg%3e")`,
                  backgroundColor: '#e5ddd5'
                }}>
                  {loadingMessages ? (
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                          <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No messages yet</p>
                        </div>
                      ) : (
                        sortedMessages.map((message: Message) => (
                          <div key={message.id} className="mb-4">
                            <ChatMessage 
                              message={message}
                              contact={{
                                name: selectedConversation.contactName || `Contact ${message.phoneNumber.slice(-4)}`,
                                phoneNumber: message.phoneNumber
                              }}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Message Input - WhatsApp Style */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Type a message"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      data-testid="input-message"
                      className="rounded-full border-gray-300 focus:border-green-500"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendMessageMutation.isPending}
                      data-testid="button-send-message"
                      className="bg-green-600 hover:bg-green-700 text-white rounded-full px-4"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                  <p>Choose a conversation from the list to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
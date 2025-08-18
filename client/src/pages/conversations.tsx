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
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { Conversation, Message } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function ConversationsPage() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: ["/api/conversations"],
  });

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["/api/conversations", selectedConversation?.id, "messages"],
    enabled: !!selectedConversation?.id,
  });

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

        {/* Chat Interface */}
        <div className="flex-1 flex bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
          {/* Conversations List */}
          <div className="w-1/3 border-r border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Conversations
              </h2>
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
                                  formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })
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
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {getInitials(selectedConversation.phoneNumber)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {selectedConversation.contactName || selectedConversation.phoneNumber}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {selectedConversation.phoneNumber}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4" style={{ height: 'calc(100vh - 300px)' }}>
                  {loadingMessages ? (
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message: Message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                          data-testid={`message-${message.id}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.direction === 'outbound'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            
                            <div className={`flex items-center space-x-1 mt-1 ${
                              message.direction === 'outbound' ? 'justify-end' : 'justify-start'
                            }`}>
                              <span className={`text-xs ${
                                message.direction === 'outbound' ? 'text-green-100' : 'text-gray-500'
                              }`}>
                                {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                              </span>
                              
                              {message.direction === 'outbound' && (
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(message.status)}
                                  {message.isAutoReply && (
                                    <Badge variant="outline" className="text-xs bg-white text-green-600 border-green-200">
                                      Auto
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      data-testid="input-message"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendMessageMutation.isPending}
                      data-testid="button-send-message"
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
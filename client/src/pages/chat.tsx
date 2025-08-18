import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import ChatMessage from "@/components/chat-message";
import { websocketManager } from "@/lib/websocket";
import { Message } from "@shared/schema";

export default function Chat() {
  const [isConnected, setIsConnected] = useState(false);
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string>("");
  const [newMessage, setNewMessage] = useState("");
  const [realtimeMessages, setRealtimeMessages] = useState<Message[]>([]);

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  useEffect(() => {
    // Set initial connection status
    setIsConnected(websocketManager.isConnected());

    // Handle real-time messages
    websocketManager.onMessage('new_message', (message: Message) => {
      setRealtimeMessages(prev => [message, ...prev]);
    });

    // Check connection status periodically
    const connectionCheck = setInterval(() => {
      setIsConnected(websocketManager.isConnected());
    }, 5000);

    return () => {
      clearInterval(connectionCheck);
      websocketManager.removeHandler('new_message');
    };
  }, []);

  // Combine real-time and fetched messages
  const allMessages = [...realtimeMessages, ...messages]
    .filter((message, index, self) => 
      index === self.findIndex(m => m.id === message.id)
    )
    .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

  // Get unique phone numbers for chat list
  const phoneNumbers = Array.from(new Set(allMessages.map(m => m.phoneNumber)));

  // Filter messages for selected phone number
  const selectedMessages = selectedPhoneNumber 
    ? allMessages.filter(m => m.phoneNumber === selectedPhoneNumber)
    : [];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedPhoneNumber) return;

    // In a real implementation, this would send via WhatsApp API
    console.log('Sending message:', { to: selectedPhoneNumber, message: newMessage });
    setNewMessage("");
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Live Chat</h1>
            <p className="text-sm text-slate-500">Real-time WhatsApp conversations</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-sm text-slate-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat List */}
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Conversations</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {phoneNumbers.length > 0 ? (
              phoneNumbers.map((phoneNumber) => {
                const lastMessage = allMessages
                  .filter(m => m.phoneNumber === phoneNumber)
                  .slice(-1)[0];
                
                const unreadCount = allMessages
                  .filter(m => m.phoneNumber === phoneNumber && m.direction === 'inbound')
                  .length;

                return (
                  <button
                    key={phoneNumber}
                    onClick={() => setSelectedPhoneNumber(phoneNumber)}
                    className={`w-full p-4 border-b border-slate-100 text-left hover:bg-slate-50 transition-colors ${
                      selectedPhoneNumber === phoneNumber ? 'bg-primary-50 border-l-4 border-l-primary-500' : ''
                    }`}
                    data-testid={`chat-${phoneNumber}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                          <i className="fas fa-user text-slate-500 text-sm"></i>
                        </div>
                        <span className="font-medium text-slate-900">
                          Contact {phoneNumber.slice(-4)}
                        </span>
                      </div>
                      {unreadCount > 0 && (
                        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mb-1">{phoneNumber}</p>
                    {lastMessage && (
                      <p className="text-sm text-slate-600 truncate">
                        {lastMessage.content}
                      </p>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <div className="text-center">
                  <i className="fas fa-comments text-4xl mb-4 text-slate-300"></i>
                  <p>No conversations yet</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedPhoneNumber ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-200 bg-white">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                    <i className="fas fa-user text-slate-500"></i>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Contact {selectedPhoneNumber.slice(-4)}
                    </h3>
                    <p className="text-sm text-slate-500">{selectedPhoneNumber}</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50" data-testid="chat-messages">
                {selectedMessages.map((message) => (
                  <ChatMessage 
                    key={message.id} 
                    message={message}
                    contact={{
                      name: `Contact ${message.phoneNumber.slice(-4)}`,
                      phoneNumber: message.phoneNumber
                    }}
                  />
                ))}
                
                {selectedMessages.length === 0 && (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-slate-500">No messages in this conversation</p>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white">
                <div className="flex space-x-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                    data-testid="input-new-message"
                  />
                  <Button type="submit" disabled={!newMessage.trim()} data-testid="button-send-chat-message">
                    <i className="fas fa-paper-plane"></i>
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-slate-50">
              <div className="text-center">
                <i className="fas fa-comments text-6xl text-slate-300 mb-4"></i>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Select a conversation</h3>
                <p className="text-slate-500">Choose a conversation from the list to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

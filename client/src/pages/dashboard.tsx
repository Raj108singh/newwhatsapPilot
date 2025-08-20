import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ChatMessage from "@/components/chat-message";
import BulkMessageModal from "@/components/bulk-message-modal";
import { websocketManager } from "@/lib/websocket";
import { apiRequest } from "@/lib/queryClient";
import { Message, Template, Campaign } from "@shared/schema";

interface Stats {
  messagesSent: number;
  deliveryRate: number;
  activeChats: number;
  templates: number;
  contacts: number;
  campaigns: number;
}

export default function Dashboard() {
  const [isConnected, setIsConnected] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [realtimeMessages, setRealtimeMessages] = useState<Message[]>([]);

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    queryFn: () => apiRequest('/api/messages'),
  });

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
    queryFn: () => apiRequest('/api/templates'),
  });

  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
    queryFn: () => apiRequest('/api/campaigns'),
  });

  // Load branding settings for header text
  const { data: brandingSettings } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: () => apiRequest('/api/settings'),
    staleTime: 30 * 1000, // 30 seconds for instant updates
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    // Set initial connection status
    setIsConnected(websocketManager.isConnected());

    // Handle real-time messages
    websocketManager.onMessage('new_message', (message: Message) => {
      setRealtimeMessages(prev => [message, ...prev].slice(0, 10)); // Keep only latest 10
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

  // Combine real-time messages with fetched messages
  const displayMessages = [...realtimeMessages, ...messages]
    .filter((message, index, self) => 
      index === self.findIndex(m => m.id === message.id)
    )
    .slice(0, 10);

  const recentTemplates = templates.slice(0, 3);
  const recentCampaigns = campaigns.slice(0, 3);

  // Debug logging
  console.log('Dashboard Data:', {
    stats,
    statsLoading,
    statsError,
    templates: templates.length,
    messages: messages.length,
    campaigns: campaigns.length
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500">
              {brandingSettings?.header_text || 'Monitor your WhatsApp Business API activity'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-sm text-slate-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <Button 
              onClick={() => setBulkModalOpen(true)}
              data-testid="button-new-campaign"
            >
              <i className="fas fa-plus mr-2"></i>
              New Campaign
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Messages Sent</p>
                  <p className="text-2xl font-bold text-slate-900" data-testid="stat-messages-sent">
                    {statsLoading ? '...' : stats?.messagesSent?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-paper-plane text-green-600 text-xl"></i>
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                {statsError ? (
                  <span className="text-red-600 font-medium">Error loading</span>
                ) : (
                  <>
                    <span className="text-green-600 font-medium">+12%</span>
                    <span className="text-slate-500 ml-1">from last month</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Delivery Rate</p>
                  <p className="text-2xl font-bold text-slate-900" data-testid="stat-delivery-rate">
                    {statsLoading ? '...' : stats?.deliveryRate?.toFixed(1) || 0}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-check-circle text-blue-600 text-xl"></i>
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-green-600 font-medium">+2.1%</span>
                <span className="text-slate-500 ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Chats</p>
                  <p className="text-2xl font-bold text-slate-900" data-testid="stat-active-chats">
                    {statsLoading ? '...' : stats?.activeChats || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-comments text-purple-600 text-xl"></i>
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-green-600 font-medium">+18</span>
                <span className="text-slate-500 ml-1">new today</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Templates</p>
                  <p className="text-2xl font-bold text-slate-900" data-testid="stat-templates">
                    {statsLoading ? '...' : stats?.templates || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-file-alt text-orange-600 text-xl"></i>
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-green-600 font-medium">3</span>
                <span className="text-slate-500 ml-1">approved pending</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Real-time Chat */}
          <div className="lg:col-span-2">
            <Card>
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Live Chat</h3>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className="text-sm text-slate-600">Real-time</span>
                  </div>
                </div>
              </div>
              
              <div className="h-96 overflow-y-auto p-4 space-y-4" data-testid="chat-messages">
                {displayMessages.length > 0 ? (
                  displayMessages.map((message) => (
                    <ChatMessage 
                      key={message.id} 
                      message={message}
                      contact={{
                        name: `Contact ${message.phoneNumber.slice(-4)}`,
                        phoneNumber: message.phoneNumber
                      }}
                    />
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    <div className="text-center">
                      <i className="fas fa-comments text-4xl mb-4 text-slate-300"></i>
                      <p>No messages yet</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-slate-200">
                <div className="flex space-x-2">
                  <input 
                    type="text" 
                    placeholder="Type a message..." 
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    data-testid="input-message"
                  />
                  <Button data-testid="button-send-message">
                    <i className="fas fa-paper-plane"></i>
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Actions & Templates */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
                
                <div className="space-y-3">
                  <button 
                    className="w-full flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    onClick={() => setBulkModalOpen(true)}
                    data-testid="button-bulk-message"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <i className="fas fa-broadcast-tower text-green-600"></i>
                      </div>
                      <span className="font-medium text-slate-700">Send Bulk Message</span>
                    </div>
                    <i className="fas fa-chevron-right text-slate-400"></i>
                  </button>
                  
                  <button 
                    className="w-full flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    data-testid="button-create-template"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <i className="fas fa-plus-circle text-blue-600"></i>
                      </div>
                      <span className="font-medium text-slate-700">Create Template</span>
                    </div>
                    <i className="fas fa-chevron-right text-slate-400"></i>
                  </button>
                  
                  <button 
                    className="w-full flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    data-testid="button-import-contacts"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <i className="fas fa-upload text-purple-600"></i>
                      </div>
                      <span className="font-medium text-slate-700">Import Contacts</span>
                    </div>
                    <i className="fas fa-chevron-right text-slate-400"></i>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Templates */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Recent Templates</h3>
                  <button className="text-sm text-primary-600 hover:text-primary-700 font-medium" data-testid="button-view-all-templates">
                    View All
                  </button>
                </div>
                
                <div className="space-y-3">
                  {recentTemplates.map((template) => (
                    <div key={template.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg" data-testid={`template-${template.id}`}>
                      <div className="flex-1">
                        <p className="font-medium text-slate-700 text-sm">{template.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{template.category} • {template.status}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${
                          template.status === 'approved' ? 'bg-green-500' : 
                          template.status === 'pending' ? 'bg-yellow-500' : 
                          'bg-red-500'
                        }`}></span>
                        <button className="text-slate-400 hover:text-slate-600" data-testid={`button-edit-template-${template.id}`}>
                          <i className="fas fa-edit text-sm"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {recentTemplates.length === 0 && (
                    <div className="text-center py-4 text-slate-500">
                      <i className="fas fa-file-alt text-2xl mb-2 text-slate-300"></i>
                      <p className="text-sm">No templates created yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Activity Table */}
        <div className="mt-8">
          <Card>
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
                <button className="text-sm text-primary-600 hover:text-primary-700 font-medium" data-testid="button-view-all-activity">
                  View All Activity
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-medium text-slate-500 uppercase tracking-wider">Campaign</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-slate-500 uppercase tracking-wider">Recipients</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-slate-500 uppercase tracking-wider">Success Rate</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="text-right py-3 px-6 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {recentCampaigns.map((campaign) => {
                    const successRate = campaign.totalRecipients > 0 
                      ? ((campaign.sentCount / campaign.totalRecipients) * 100).toFixed(1)
                      : '0.0';
                    
                    return (
                      <tr key={campaign.id} className="hover:bg-slate-50" data-testid={`campaign-row-${campaign.id}`}>
                        <td className="py-4 px-6">
                          <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
                              campaign.status === 'completed' ? 'bg-green-100' :
                              campaign.status === 'running' ? 'bg-blue-100' :
                              campaign.status === 'failed' ? 'bg-red-100' :
                              'bg-yellow-100'
                            }`}>
                              <i className={`text-sm ${
                                campaign.status === 'completed' ? 'fas fa-check text-green-600' :
                                campaign.status === 'running' ? 'fas fa-spinner fa-spin text-blue-600' :
                                campaign.status === 'failed' ? 'fas fa-times text-red-600' :
                                'fas fa-clock text-yellow-600'
                              }`}></i>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{campaign.name}</p>
                              <p className="text-xs text-slate-500">Bulk campaign</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-900">{campaign.totalRecipients.toLocaleString()}</td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            campaign.status === 'completed' ? 'bg-green-100 text-green-800' :
                            campaign.status === 'running' ? 'bg-blue-100 text-blue-800' :
                            campaign.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {campaign.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-900">{successRate}%</td>
                        <td className="py-4 px-6 text-sm text-slate-500">
                          {new Date(campaign.createdAt || '').toLocaleDateString()}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button className="text-slate-400 hover:text-slate-600" data-testid={`button-view-campaign-${campaign.id}`}>
                            <i className="fas fa-eye"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  
                  {recentCampaigns.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        <i className="fas fa-paper-plane text-3xl mb-2 text-slate-300"></i>
                        <p>No campaigns created yet</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </main>

      {/* Bulk Message Modal */}
      <BulkMessageModal open={bulkModalOpen} onOpenChange={setBulkModalOpen} />
    </div>
  );
}

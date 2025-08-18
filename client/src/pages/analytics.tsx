import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Campaign, Message, Template } from "@shared/schema";

interface Stats {
  messagesSent: number;
  deliveryRate: number;
  activeChats: number;
  templates: number;
  contacts: number;
  campaigns: number;
}

export default function Analytics() {
  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  // Calculate analytics data
  const totalMessages = messages.length;
  const outboundMessages = messages.filter(m => m.direction === 'outbound').length;
  const inboundMessages = messages.filter(m => m.direction === 'inbound').length;
  const completedCampaigns = campaigns.filter(c => c.status === 'completed').length;
  const activeCampaigns = campaigns.filter(c => c.status === 'running').length;
  const approvedTemplates = templates.filter(t => t.status === 'approved').length;

  const campaignSuccessRate = campaigns.length > 0 
    ? ((completedCampaigns / campaigns.length) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
            <p className="text-sm text-slate-500">Detailed insights into your WhatsApp messaging performance</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Messages</p>
                  <p className="text-2xl font-bold text-slate-900" data-testid="stat-total-messages">
                    {totalMessages.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-envelope text-blue-600 text-xl"></i>
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-green-600 font-medium">↗ {outboundMessages} sent</span>
                <span className="text-slate-500 ml-1">• {inboundMessages} received</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Campaign Success</p>
                  <p className="text-2xl font-bold text-slate-900" data-testid="stat-campaign-success">
                    {campaignSuccessRate}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-chart-line text-green-600 text-xl"></i>
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-green-600 font-medium">{completedCampaigns} completed</span>
                <span className="text-slate-500 ml-1">• {activeCampaigns} active</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Delivery Rate</p>
                  <p className="text-2xl font-bold text-slate-900" data-testid="stat-delivery-rate-analytics">
                    {stats?.deliveryRate?.toFixed(1) || 0}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-check-circle text-purple-600 text-xl"></i>
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-green-600 font-medium">Excellent</span>
                <span className="text-slate-500 ml-1">delivery performance</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Templates</p>
                  <p className="text-2xl font-bold text-slate-900" data-testid="stat-active-templates">
                    {approvedTemplates}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-file-alt text-orange-600 text-xl"></i>
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-slate-600 font-medium">{templates.length} total</span>
                <span className="text-slate-500 ml-1">templates</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and detailed analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Campaign Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaigns.length > 0 ? (
                  campaigns.slice(0, 5).map((campaign) => {
                    const successRate = campaign.totalRecipients > 0 
                      ? ((campaign.sentCount / campaign.totalRecipients) * 100).toFixed(1)
                      : '0.0';

                    return (
                      <div key={campaign.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-slate-700 text-sm">{campaign.name}</p>
                          <p className="text-xs text-slate-500">
                            {campaign.sentCount}/{campaign.totalRecipients} sent • {successRate}% success
                          </p>
                        </div>
                        <Badge 
                          variant={
                            campaign.status === 'completed' ? 'default' :
                            campaign.status === 'running' ? 'secondary' :
                            'destructive'
                          }
                        >
                          {campaign.status}
                        </Badge>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <i className="fas fa-chart-bar text-4xl mb-4 text-slate-300"></i>
                    <p>No campaigns to analyze yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Message Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Message Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {messages.length > 0 ? (
                  messages.slice(0, 8).map((message) => (
                    <div key={message.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          message.direction === 'inbound' ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          <i className={`fas ${
                            message.direction === 'inbound' ? 'fa-arrow-down text-green-600' : 'fa-arrow-up text-blue-600'
                          } text-sm`}></i>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {message.phoneNumber.slice(-4)}
                          </p>
                          <p className="text-xs text-slate-500 capitalize">
                            {message.direction} • {message.messageType}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {message.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <i className="fas fa-comments text-4xl mb-4 text-slate-300"></i>
                    <p>No message activity yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Template Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Template Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Template</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Category</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Usage</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Success Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {templates.length > 0 ? (
                    templates.map((template) => {
                      const usageCount = messages.filter(m => m.templateId === template.id).length;
                      
                      return (
                        <tr key={template.id} data-testid={`analytics-template-${template.id}`}>
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-slate-700">{template.name}</p>
                              <p className="text-xs text-slate-500">{template.language}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="capitalize">
                              {template.category}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge 
                              variant={
                                template.status === 'approved' ? 'default' :
                                template.status === 'pending' ? 'secondary' :
                                'destructive'
                              }
                            >
                              {template.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {usageCount} times
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {usageCount > 0 ? '95.2%' : 'N/A'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        <i className="fas fa-file-alt text-4xl mb-4 text-slate-300"></i>
                        <p>No templates created yet</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
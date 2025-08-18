import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BulkMessageModal from "@/components/bulk-message-modal";
import { Campaign, Message } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function BulkMessage() {
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const { toast } = useToast();

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: campaignMessages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages", selectedCampaign?.id],
    enabled: !!selectedCampaign,
  });

  const stopCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await apiRequest("POST", `/api/campaigns/${campaignId}/stop`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Campaign Stopped",
        description: "The campaign has been stopped successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Stop Campaign",
        description: error.message || "An error occurred while stopping the campaign.",
        variant: "destructive",
      });
    },
  });

  const handleViewDetails = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setDetailsModalOpen(true);
  };

  const handleStopCampaign = (campaignId: string) => {
    stopCampaignMutation.mutate(campaignId);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-slate-300 mb-4"></i>
          <p className="text-slate-500">Loading campaigns...</p>
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
            <h1 className="text-2xl font-semibold text-slate-900">Bulk Messages</h1>
            <p className="text-sm text-slate-500">Manage and track your bulk messaging campaigns</p>
          </div>
          <Button 
            onClick={() => setBulkModalOpen(true)}
            data-testid="button-new-bulk-campaign"
          >
            <i className="fas fa-plus mr-2"></i>
            New Campaign
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {campaigns.length > 0 ? (
          <div className="grid gap-6">
            {campaigns.map((campaign) => {
              const successRate = campaign.totalRecipients > 0 
                ? ((campaign.sentCount / campaign.totalRecipients) * 100).toFixed(1)
                : '0.0';

              return (
                <Card key={campaign.id} data-testid={`campaign-card-${campaign.id}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <Badge 
                        variant={
                          campaign.status === 'completed' ? 'default' :
                          campaign.status === 'running' ? 'secondary' :
                          campaign.status === 'failed' ? 'destructive' :
                          'outline'
                        }
                      >
                        {campaign.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-slate-900">{campaign.totalRecipients}</p>
                        <p className="text-sm text-slate-500">Total Recipients</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{campaign.sentCount}</p>
                        <p className="text-sm text-slate-500">Sent</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{campaign.deliveredCount}</p>
                        <p className="text-sm text-slate-500">Delivered</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">{campaign.failedCount}</p>
                        <p className="text-sm text-slate-500">Failed</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-sm text-slate-600">
                          Success Rate: <span className="font-medium">{successRate}%</span>
                        </div>
                        <div className="text-sm text-slate-600">
                          Created: {new Date(campaign.createdAt || '').toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleViewDetails(campaign)}
                          data-testid={`button-view-details-${campaign.id}`}
                        >
                          <i className="fas fa-eye mr-2"></i>
                          View Details
                        </Button>
                        {campaign.status === 'running' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleStopCampaign(campaign.id)}
                            disabled={stopCampaignMutation.isPending}
                            data-testid={`button-stop-campaign-${campaign.id}`}
                          >
                            <i className="fas fa-stop mr-2"></i>
                            {stopCampaignMutation.isPending ? 'Stopping...' : 'Stop'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <i className="fas fa-paper-plane text-6xl text-slate-300 mb-4"></i>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No campaigns yet</h3>
              <p className="text-slate-500 mb-4">Create your first bulk messaging campaign to get started.</p>
              <Button onClick={() => setBulkModalOpen(true)} data-testid="button-create-first-campaign">
                <i className="fas fa-plus mr-2"></i>
                Create Campaign
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Bulk Message Modal */}
      <BulkMessageModal open={bulkModalOpen} onOpenChange={setBulkModalOpen} />

      {/* Campaign Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Campaign Details: {selectedCampaign?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedCampaign && (
            <div className="space-y-6">
              {/* Campaign Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-slate-900">{selectedCampaign.totalRecipients}</p>
                  <p className="text-sm text-slate-500">Total Recipients</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{selectedCampaign.sentCount}</p>
                  <p className="text-sm text-slate-500">Sent</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{selectedCampaign.deliveredCount}</p>
                  <p className="text-sm text-slate-500">Delivered</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-600">{selectedCampaign.failedCount}</p>
                  <p className="text-sm text-slate-500">Failed</p>
                </div>
              </div>

              {/* Campaign Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">Status</p>
                  <Badge 
                    variant={
                      selectedCampaign.status === 'completed' ? 'default' :
                      selectedCampaign.status === 'running' ? 'secondary' :
                      selectedCampaign.status === 'failed' ? 'destructive' :
                      'outline'
                    }
                  >
                    {selectedCampaign.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">Created</p>
                  <p className="text-sm text-slate-600">
                    {new Date(selectedCampaign.createdAt || '').toLocaleString()}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">Template ID</p>
                  <p className="text-sm text-slate-600">{selectedCampaign.templateId}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">Success Rate</p>
                  <p className="text-sm text-slate-600">
                    {selectedCampaign.totalRecipients > 0 
                      ? ((selectedCampaign.sentCount / selectedCampaign.totalRecipients) * 100).toFixed(1)
                      : '0.0'}%
                  </p>
                </div>
              </div>

              {/* Message History */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Message History</h3>
                {messagesLoading ? (
                  <div className="text-center py-8">
                    <i className="fas fa-spinner fa-spin text-slate-400 mb-2"></i>
                    <p className="text-slate-500">Loading messages...</p>
                  </div>
                ) : campaignMessages.length > 0 ? (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {campaignMessages
                      .filter(msg => msg.templateId === selectedCampaign.templateId)
                      .map((message) => (
                        <div key={message.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${
                              message.status === 'sent' ? 'bg-green-500' :
                              message.status === 'delivered' ? 'bg-blue-500' :
                              message.status === 'failed' ? 'bg-red-500' :
                              'bg-yellow-500'
                            }`}></div>
                            <div>
                              <p className="text-sm font-medium text-slate-700">{message.phoneNumber}</p>
                              <p className="text-xs text-slate-500">{message.messageType}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="capitalize">
                              {message.status}
                            </Badge>
                            <p className="text-xs text-slate-500 mt-1">
                              {new Date(message.createdAt || '').toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <i className="fas fa-envelope text-4xl mb-4 text-slate-300"></i>
                    <p>No messages found for this campaign</p>
                  </div>
                )}
              </div>

              {/* Error Details */}
              {selectedCampaign.status === 'failed' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-800 mb-2">Campaign Failed</h4>
                  <p className="text-sm text-red-700">
                    This campaign failed to complete. Common reasons include:
                  </p>
                  <ul className="text-sm text-red-700 mt-2 list-disc list-inside">
                    <li>Invalid WhatsApp API credentials</li>
                    <li>Network connectivity issues</li>
                    <li>Rate limiting by WhatsApp</li>
                    <li>Invalid phone numbers in recipient list</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

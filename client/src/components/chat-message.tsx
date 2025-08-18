import { Message } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: Message;
  contact?: {
    name?: string;
    phoneNumber: string;
  };
}

// Helper function to format template text in chat messages
function formatTemplateContent(content: string): string {
  // Check if it's a template message (starts with "Template:")
  if (content.startsWith('Template:')) {
    const templateName = content.replace('Template: ', '');
    return `📋 ${templateName}\n\nThis message was sent using a business template.`;
  }
  return content;
}

export default function ChatMessage({ message, contact }: ChatMessageProps) {
  const isInbound = message.direction === "inbound";
  const timeAgo = message.createdAt ? getTimeAgo(new Date(message.createdAt)) : "";

  return (
    <div className={cn(
      "flex items-end space-x-2 mb-4",
      isInbound ? "justify-start" : "justify-end flex-row-reverse space-x-reverse"
    )} data-testid={`message-${message.id}`}>
      <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
        <i className={cn(
          "fas text-sm",
          isInbound ? "fa-user text-slate-500" : "fa-user-circle text-green-600"
        )}></i>
      </div>
      <div className={cn("flex flex-col", isInbound ? "items-start" : "items-end")}>
        <div className={cn(
          "flex items-center space-x-2 mb-1 text-xs",
          isInbound ? "justify-start" : "justify-end"
        )}>
          <span className="font-medium text-slate-600">
            {isInbound ? (contact?.name || "Contact") : "You"}
          </span>
          <span className="text-slate-400">{message.phoneNumber.slice(-4)}</span>
        </div>
        <div className={cn(
          "rounded-lg p-3 text-sm max-w-xs",
          isInbound 
            ? "bg-white border border-slate-200 text-slate-700" 
            : "bg-green-500 text-white ml-auto"
        )}>
          {message.messageType === "template" ? (
            <div>
              <div className="flex items-center gap-1 mb-2">
                <i className="fas fa-file-alt text-xs"></i>
                <span className={cn(
                  "text-xs font-medium",
                  isInbound ? "text-slate-500" : "text-green-100"
                )}>
                  Template Message
                </span>
              </div>
              <div className="font-medium whitespace-pre-wrap">{formatTemplateContent(message.content)}</div>
              <div className={cn(
                "text-xs mt-1 opacity-75",
                isInbound ? "text-slate-500" : "text-green-100"
              )}>
                <i className="fas fa-certificate mr-1"></i>
                Business Template
              </div>
            </div>
          ) : (
            <div className="font-medium whitespace-pre-wrap">{message.content}</div>
          )}
          <div className={cn(
            "text-xs mt-1 flex items-center justify-end gap-1",
            isInbound ? "text-slate-400" : "text-green-100"
          )}>
            <span>{timeAgo}</span>
            {!isInbound && (
              <i className={cn(
                "fas",
                message.status === "delivered" ? "fa-check-double text-blue-300" :
                message.status === "sent" ? "fa-check" :
                message.status === "failed" ? "fa-exclamation-triangle text-red-300" :
                "fa-clock"
              )}></i>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`;
  } else if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}m ago`;
  } else if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}h ago`;
  } else {
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }
}
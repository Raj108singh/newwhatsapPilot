import { Message } from "@shared/schema";
import { cn } from "@/lib/utils";
import TemplateMessage from "./template-message";
import { format } from "date-fns";

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
      isInbound ? "justify-start" : "justify-end"
    )} data-testid={`message-${message.id}`}>
      {/* Avatar - Left for inbound, Right for outbound */}
      {isInbound && (
        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
          <i className="fas fa-user text-slate-500 text-sm"></i>
        </div>
      )}
      
      <div className={cn("flex flex-col w-full", isInbound ? "items-start" : "items-end")}>
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
          message.messageType === "template" ? "w-full max-w-md" : "rounded-lg p-3 text-sm w-full max-w-md break-words",
          message.messageType !== "template" && (isInbound 
            ? "bg-white border border-slate-200 text-slate-700" 
            : "bg-green-500 text-white")
        )}>
          {message.messageType === "template" ? (
            <TemplateMessage
              templateData={Array.isArray(message.templateData) ? message.templateData : undefined}
              buttons={Array.isArray(message.buttons) ? message.buttons : undefined}
              mediaUrl={message.mediaUrl || undefined}
              content={message.content}
              isInbound={isInbound}
            />
          ) : (
            <div className="font-medium whitespace-pre-wrap break-words overflow-wrap-anywhere">{message.content}</div>
          )}
          {message.messageType !== "template" && (
            <div className={cn(
              "text-xs mt-1 flex items-center justify-end gap-1",
              isInbound ? "text-slate-400" : "text-green-100"
            )}>
              <span>{timeAgo}</span>
              {!isInbound && (
                <div className="flex items-center">
                  {message.status === "read" || message.status === "seen" ? (
                    <i className="fas fa-check-double text-blue-500"></i>
                  ) : message.status === "delivered" ? (
                    <i className="fas fa-check-double text-gray-400"></i>
                  ) : message.status === "sent" ? (
                    <i className="fas fa-check text-gray-400"></i>
                  ) : message.status === "failed" ? (
                    <i className="fas fa-exclamation-triangle text-red-400"></i>
                  ) : (
                    <i className="fas fa-clock text-gray-400"></i>
                  )}
                  {message.isAutoReply && (
                    <span className="ml-1 text-xs bg-green-200 text-green-800 px-1 rounded">AUTO</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        {message.messageType === "template" && (
          <div className={cn(
            "text-xs mt-1 flex items-center gap-1",
            isInbound ? "justify-start text-slate-400" : "justify-end text-green-200"
          )}>
            <span>{timeAgo}</span>
            {!isInbound && (
              <div className="flex items-center">
                {message.status === "read" || message.status === "seen" ? (
                  <i className="fas fa-check-double text-blue-500"></i>
                ) : message.status === "delivered" ? (
                  <i className="fas fa-check-double text-gray-300"></i>
                ) : message.status === "sent" ? (
                  <i className="fas fa-check text-gray-300"></i>
                ) : message.status === "failed" ? (
                  <i className="fas fa-exclamation-triangle text-red-400"></i>
                ) : (
                  <i className="fas fa-clock text-gray-300"></i>
                )}
                {message.isAutoReply && (
                  <span className="ml-1 text-xs bg-green-100 text-green-700 px-1 rounded">AUTO</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Avatar - Right for outbound messages */}
      {!isInbound && (
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
          <i className="fas fa-user-circle text-white text-sm"></i>
        </div>
      )}
    </div>
  );
}

function getTimeAgo(date: Date): string {
  // Convert to IST (UTC+5:30)
  const utcDate = new Date(date);
  const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
  
  const now = new Date();
  const nowIST = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  
  const diffInSeconds = Math.floor((nowIST.getTime() - istDate.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "now";
  } else if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}m ago`;
  } else if (diffInSeconds < 86400) {
    return format(istDate, 'HH:mm');
  } else if (diffInSeconds < 604800) { // 7 days
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  } else {
    return format(istDate, 'dd/MM');
  }
}
import { Message } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: Message;
  contact?: {
    name?: string;
    phoneNumber: string;
  };
}

export default function ChatMessage({ message, contact }: ChatMessageProps) {
  const isInbound = message.direction === "inbound";
  const timeAgo = message.createdAt ? getTimeAgo(new Date(message.createdAt)) : "";

  return (
    <div className="flex items-start space-x-3" data-testid={`message-${message.id}`}>
      <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
        <i className="fas fa-user text-slate-500 text-sm"></i>
      </div>
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-sm font-medium text-slate-900">
            {contact?.name || "Unknown Contact"}
          </span>
          <span className="text-xs text-slate-500">{message.phoneNumber}</span>
          <span className="text-xs text-slate-400">{timeAgo}</span>
          {message.status && (
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              message.status === "delivered" ? "bg-green-100 text-green-700" :
              message.status === "failed" ? "bg-red-100 text-red-700" :
              "bg-yellow-100 text-yellow-700"
            )}>
              {message.status}
            </span>
          )}
        </div>
        <div className={cn(
          "rounded-lg p-3 text-sm",
          isInbound 
            ? "bg-slate-50 text-slate-700" 
            : "bg-primary-50 text-primary-700"
        )}>
          {message.messageType === "template" ? (
            <div>
              <span className="text-xs text-slate-500 block mb-1">Template Message</span>
              {message.content}
            </div>
          ) : (
            message.content
          )}
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

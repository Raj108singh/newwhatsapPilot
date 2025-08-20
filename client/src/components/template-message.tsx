import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface TemplateMessageProps {
  templateData?: any;
  buttons?: any[];
  mediaUrl?: string;
  content: string;
  isInbound?: boolean;
}

export default function TemplateMessage({ templateData, buttons, mediaUrl, content, isInbound = false }: TemplateMessageProps) {
  // Parse templateData if it's a string
  let parsedTemplateData = templateData;
  if (typeof templateData === 'string') {
    try {
      parsedTemplateData = JSON.parse(templateData);
    } catch (error) {
      console.error('Failed to parse templateData:', error);
      parsedTemplateData = null;
    }
  }
  
  if (!parsedTemplateData || !Array.isArray(parsedTemplateData)) {
    return (
      <div className={cn(
        "rounded-lg p-4",
        isInbound ? "bg-white border border-slate-200" : "bg-green-100"
      )}>
        <div className="font-medium whitespace-pre-wrap">
          📋 {content}
        </div>
        {!isInbound && (
          <div className="text-xs mt-2 opacity-75">
            <i className="fas fa-certificate mr-1"></i>
            Business Template
          </div>
        )}
      </div>
    );
  }

  const headerComponent = parsedTemplateData.find((c: any) => c.type === 'HEADER');
  const bodyComponent = parsedTemplateData.find((c: any) => c.type === 'BODY');
  const footerComponent = parsedTemplateData.find((c: any) => c.type === 'FOOTER');
  const buttonComponent = parsedTemplateData.find((c: any) => c.type === 'BUTTONS');

  return (
    <div className={cn(
      "rounded-lg overflow-hidden",
      isInbound ? "bg-white border border-slate-200" : "bg-green-100"
    )}>
      {/* Header with Image */}
      {headerComponent && headerComponent.format === 'IMAGE' && (mediaUrl || headerComponent.example?.header_handle?.[0]) && (
        <div className="w-full">
          <img 
            src={mediaUrl || headerComponent.example?.header_handle?.[0]} 
            alt="Template header"
            className="w-full h-40 object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Header with Text */}
      {headerComponent && headerComponent.format === 'TEXT' && (
        <div className={cn(
          "px-4 py-2 font-semibold text-sm border-b",
          isInbound ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-green-50 text-green-800 border-green-200"
        )}>
          {headerComponent.text}
        </div>
      )}

      {/* Body Content */}
      <div className="px-4 py-3">
        <div className="font-medium whitespace-pre-wrap text-sm leading-relaxed">
          {bodyComponent?.text || content}
        </div>
      </div>

      {/* Footer */}
      {footerComponent && (
        <div className={cn(
          "px-4 py-2 text-xs border-t",
          isInbound ? "text-slate-500 border-slate-200" : "text-green-700 border-green-200"
        )}>
          {footerComponent.text}
        </div>
      )}

      {/* Interactive Buttons */}
      {(buttons && buttons.length > 0) || (buttonComponent && buttonComponent.buttons) && (
        <div className={cn(
          "border-t",
          isInbound ? "border-slate-200" : "border-green-200"
        )}>
          <div className="space-y-1 p-2">
            {(buttons || buttonComponent?.buttons || []).map((button: any, index: number) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className={cn(
                  "w-full justify-center text-xs font-medium h-8",
                  isInbound 
                    ? "border-slate-300 text-slate-700 hover:bg-slate-50" 
                    : "border-green-300 text-green-700 hover:bg-green-50",
                  button.type === 'URL' && "text-blue-600 hover:text-blue-700"
                )}
                onClick={() => {
                  if (button.type === 'URL' && button.url) {
                    window.open(button.url, '_blank');
                  }
                }}
              >
                {button.type === 'URL' && <i className="fas fa-external-link-alt mr-1"></i>}
                {button.type === 'PHONE_NUMBER' && <i className="fas fa-phone mr-1"></i>}
                {button.type === 'QUICK_REPLY' && <i className="fas fa-reply mr-1"></i>}
                {button.text}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Business Template Indicator */}
      {!isInbound && (
        <div className="px-4 py-2 border-t border-green-200 bg-green-50">
          <div className="flex items-center justify-between text-xs text-green-600">
            <div className="flex items-center gap-1">
              <i className="fas fa-certificate"></i>
              <span className="font-medium">Business Template</span>
            </div>
            <div className="flex items-center gap-1">
              <i className="fas fa-shield-alt"></i>
              <span>Verified</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
# WhatsApp Template Support Guide

Your WhatsApp Pro application now supports all types of WhatsApp Business API templates:

## Supported Template Components

### 1. Header Components
- **TEXT Headers**: Static or dynamic text headers with variable substitution
- **IMAGE Headers**: Requires image URL parameter
- **VIDEO Headers**: Requires video URL parameter  
- **DOCUMENT Headers**: Requires document URL and optional filename parameters

### 2. Body Components
- **Dynamic Variables**: Supports {{1}}, {{2}}, etc. variable substitution
- **Rich Text**: Bold, italic formatting preserved from template design

### 3. Button Components
- **URL Buttons**: Dynamic URLs with variable substitution
- **PHONE_NUMBER Buttons**: Static phone numbers (no parameters needed)
- **QUICK_REPLY Buttons**: Interactive quick replies (no parameters needed)
- **COPY_CODE Buttons**: Coupon codes and promotional codes
- **FLOW Buttons**: Interactive flows with action data

### 4. Footer Components
- **Dynamic Text**: Variable substitution in footers (rarely used)

## Parameter Usage Examples

### Text Header Template
```json
{
  "templateId": "your-text-template-id",
  "recipients": ["+1234567890"],
  "parameters": ["John", "Premium Service"],
  "campaignName": "Text Header Campaign"
}
```

### Image Header Template with Custom Image
```json
{
  "templateId": "your-image-template-id",
  "recipients": ["+1234567890"],
  "parameters": [
    "https://yoursite.com/header-image.jpg",
    "John",
    "Premium Service"
  ],
  "campaignName": "Custom Image Campaign"
}
```

### Image Header Template with Default Image
```json
{
  "templateId": "your-image-template-id",
  "recipients": ["+1234567890"],
  "parameters": [],
  "campaignName": "Default Image Campaign"
}
```

### URL Button Template
```json
{
  "templateId": "your-url-button-template-id", 
  "recipients": ["+1234567890"],
  "parameters": [
    "John",
    "https://yoursite.com/custom-landing?user=john",
    "SAVE20"
  ],
  "campaignName": "URL Button Campaign"
}
```

### Flow Button Template
```json
{
  "templateId": "your-flow-template-id",
  "recipients": ["+1234567890"],
  "parameters": [
    "unique-flow-token-123",
    "John"
  ],
  "campaignName": "Interactive Flow Campaign"
}
```

## Template Parameter Mapping

The system automatically maps parameters in order:
1. First parameter goes to first variable in header
2. Subsequent parameters fill body variables
3. Remaining parameters fill button variables
4. Special handling for media URLs in headers

## Best Practices

1. **Image Header Templates**: You can either provide custom image URLs or leave parameters empty to use the template's default image
2. **Test templates individually**: Verify each template works before bulk sending
3. **Use meaningful parameter values**: Avoid empty strings or invalid URLs for text parameters
4. **Monitor campaign results**: Check success/failure rates in the dashboard
5. **Handle different template types**: Your campaigns can mix template types
6. **Custom vs Default Images**: For image headers, the system automatically uses template defaults when no custom image is provided

## Error Handling

The system handles:
- Missing parameters (skips optional components)
- Invalid URLs (logs errors but continues)
- Template format mismatches (detailed error messages)
- API rate limits (automatic retry logic)

Your WhatsApp Pro now supports the full spectrum of WhatsApp Business API template capabilities!
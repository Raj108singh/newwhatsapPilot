/**
 * Direct API Test for Auto-Reply System
 * Tests the actual auto-reply endpoint functionality
 */

const BASE_URL = 'http://localhost:5000';

async function testAutoReplyAPI() {
  console.log('🧪 Testing Auto-Reply API directly via /api/messages endpoint');
  
  // Test scenarios
  const testMessages = [
    {
      scenario: "High Priority Pricing Keyword",
      message: "hello pricing information please",
      phoneNumber: "+918318868521",
      expectedTrigger: "pricing"
    },
    {
      scenario: "Support Keyword",
      message: "I need support help",
      phoneNumber: "+918318868521", 
      expectedTrigger: "support"
    },
    {
      scenario: "Greeting Pattern", 
      message: "Hello there",
      phoneNumber: "+918318868521",
      expectedTrigger: "greeting"
    },
    {
      scenario: "Multiple Keywords - Priority Test",
      message: "hello support pricing help",
      phoneNumber: "+918318868521",
      expectedTrigger: "pricing (highest priority)"
    },
    {
      scenario: "Case Insensitive",
      message: "PRICING INFO PLEASE",
      phoneNumber: "+918318868521",
      expectedTrigger: "pricing"
    },
    {
      scenario: "Default Fallback",
      message: "Random message without keywords",
      phoneNumber: "+918318868521", 
      expectedTrigger: "default"
    }
  ];

  for (const test of testMessages) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📝 Test: ${test.scenario}`);
    console.log(`📞 Phone: ${test.phoneNumber}`);
    console.log(`💬 Message: "${test.message}"`);
    console.log(`🎯 Expected: ${test.expectedTrigger}`);
    
    try {
      // Test the message endpoint to see auto-reply behavior
      const response = await fetch(`${BASE_URL}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          phoneNumber: test.phoneNumber,
          content: test.message,
          templateId: null,
          type: 'text'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Message sent successfully');
        console.log('📋 Response:', JSON.stringify(result, null, 2));
      } else {
        const error = await response.text();
        console.log('❌ Failed to send message:', error);
      }
      
    } catch (error) {
      console.log('❌ API Error:', error.message);
    }
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Also test the auto-reply matching logic directly
async function testAutoReplyLogic() {
  console.log('\n🔬 Testing Auto-Reply Logic Matching Directly');
  
  // Simulate the AutoReplyService.processIncomingMessage logic
  const simulateAutoReply = (content) => {
    console.log(`\n📨 Testing message: "${content}"`);
    
    // Mock rules based on typical setup (sorted by priority)
    const mockRules = [
      { trigger: 'pricing', triggerType: 'keyword', priority: 10, replyMessage: 'Here are our pricing details...', isActive: true },
      { trigger: 'support', triggerType: 'keyword', priority: 8, replyMessage: 'Our support team will help...', isActive: true },
      { trigger: 'hello', triggerType: 'greeting', priority: 5, replyMessage: 'Hello! Welcome!', isActive: true },
      { trigger: '', triggerType: 'default', priority: 1, replyMessage: 'Thanks for contacting us!', isActive: true }
    ];
    
    const lowerContent = content.toLowerCase();
    
    for (const rule of mockRules) {
      let matches = false;
      
      switch (rule.triggerType) {
        case 'keyword':
          matches = lowerContent.includes(rule.trigger.toLowerCase());
          break;
        case 'greeting':
          matches = /^(hi|hello|hey|good morning|good evening)/i.test(content);
          break;
        case 'default':
          matches = true;
          break;
      }
      
      if (matches) {
        console.log(`✅ Matched: ${rule.triggerType} - "${rule.trigger}" (priority ${rule.priority})`);
        console.log(`💬 Reply: "${rule.replyMessage}"`);
        return rule;
      }
    }
    
    console.log('❌ No rule matched');
    return null;
  };
  
  // Test different message patterns
  const testPatterns = [
    "hello",
    "hello pricing",
    "pricing information",
    "I need support",
    "PRICING PLEASE",
    "support with pricing",
    "random text",
    "",
    "Good morning"
  ];
  
  testPatterns.forEach(pattern => {
    simulateAutoReply(pattern);
  });
}

// Execute tests
async function runTests() {
  console.log('🚀 Starting Direct API Auto-Reply Tests\n');
  
  await testAutoReplyLogic();
  console.log('\n' + '='.repeat(60));
  await testAutoReplyAPI();
  
  console.log('\n🏁 Tests completed');
}

runTests().catch(console.error);
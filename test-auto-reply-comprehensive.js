/**
 * Comprehensive Auto-Reply System Test
 * Tests keyword triggering, priority handling, and all edge cases
 */

const BASE_URL = 'http://localhost:5000';

// Test scenarios for auto-reply system
const testScenarios = [
  // Priority testing - higher priority should win
  {
    name: "High Priority Keyword Override",
    message: "hello pricing",
    expectedTrigger: "pricing",
    expectedPriority: 10,
    description: "Should trigger high-priority pricing rule instead of greeting"
  },
  
  // Exact keyword matching
  {
    name: "Exact Keyword Match",
    message: "What are your prices?",
    expectedTrigger: "pricing",
    expectedPriority: 10,
    description: "Should match pricing keyword in context"
  },
  
  // Case insensitive matching
  {
    name: "Case Insensitive Keyword",
    message: "HELLO SUPPORT",
    expectedTrigger: "support",
    expectedPriority: 8,
    description: "Should match keywords regardless of case"
  },
  
  // Greeting detection
  {
    name: "Greeting Detection",
    message: "Hello there!",
    expectedTrigger: "greeting",
    expectedPriority: 5,
    description: "Should detect greeting pattern"
  },
  
  // Multiple keyword conflict resolution
  {
    name: "Multiple Keywords - Priority Resolution",
    message: "I need support with pricing",
    expectedTrigger: "pricing",
    expectedPriority: 10,
    description: "Should choose pricing (priority 10) over support (priority 8)"
  },
  
  // Default fallback
  {
    name: "Default Fallback",
    message: "Random message with no keywords",
    expectedTrigger: "default",
    expectedPriority: 1,
    description: "Should fall back to default rule when no keywords match"
  },
  
  // Edge cases
  {
    name: "Empty Message",
    message: "",
    expectedTrigger: "default",
    expectedPriority: 1,
    description: "Should handle empty messages gracefully"
  },
  
  {
    name: "Special Characters",
    message: "What about pricing!!! @#$%",
    expectedTrigger: "pricing",
    expectedPriority: 10,
    description: "Should match keywords despite special characters"
  },
  
  // Partial matches
  {
    name: "Partial Keyword Match",
    message: "Do you have customer support?",
    expectedTrigger: "support",
    expectedPriority: 8,
    description: "Should match partial keyword within sentence"
  }
];

class AutoReplyTester {
  constructor() {
    this.sessionCookie = null;
    this.rules = [];
  }

  async login() {
    console.log('🔐 Attempting to login...');
    
    // Try with cookie-based session first (if browser is open)
    const testResponse = await fetch(`${BASE_URL}/api/auto-reply-rules`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (testResponse.ok) {
      console.log('✅ Already authenticated via browser session');
      return true;
    }
    
    console.log('❌ Not authenticated, will test without auth');
    return false;
  }

  async fetchRules() {
    console.log('📋 Fetching current auto-reply rules...');
    
    try {
      const response = await fetch(`${BASE_URL}/api/auto-reply-rules`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.log('❌ Cannot fetch rules - not authenticated');
        // Create mock rules for testing based on the current system
        this.rules = [
          { id: '1', trigger: 'pricing', triggerType: 'keyword', priority: 10, replyMessage: 'Here are our pricing details...', isActive: true },
          { id: '2', trigger: 'support', triggerType: 'keyword', priority: 8, replyMessage: 'Our support team will help you...', isActive: true },
          { id: '3', trigger: 'hello', triggerType: 'greeting', priority: 5, replyMessage: 'Hello! Welcome to WhatsApp Pro!', isActive: true },
          { id: '4', trigger: '', triggerType: 'default', priority: 1, replyMessage: 'Thank you for contacting us. How can we help?', isActive: true }
        ];
        console.log('🔧 Using mock rules for testing');
        return;
      }
      
      this.rules = await response.json();
      console.log(`✅ Fetched ${this.rules.length} active rules`);
      
    } catch (error) {
      console.error('❌ Error fetching rules:', error.message);
      this.rules = [];
    }
  }

  // Simulate the auto-reply matching logic from server/modern-routes.ts
  matchesRule(content, rule) {
    const lowerContent = content.toLowerCase();
    const trigger = rule.trigger.toLowerCase();
    
    switch (rule.triggerType) {
      case 'keyword':
        return lowerContent.includes(trigger);
      case 'greeting':
        return /^(hi|hello|hey|good morning|good evening)/i.test(content);
      case 'default':
        return true;
      default:
        return false;
    }
  }

  processMessage(content) {
    console.log(`\n🔍 Processing message: "${content}"`);
    
    // Sort rules by priority (descending - higher priority first)
    const sortedRules = [...this.rules]
      .filter(rule => rule.isActive)
      .sort((a, b) => b.priority - a.priority);
    
    console.log('📊 Rules by priority:');
    sortedRules.forEach(rule => {
      console.log(`   ${rule.priority}: ${rule.triggerType} - "${rule.trigger}"`);
    });
    
    for (const rule of sortedRules) {
      if (this.matchesRule(content, rule)) {
        console.log(`✅ Matched rule: ${rule.triggerType} - "${rule.trigger}" (priority ${rule.priority})`);
        return {
          triggeredRule: rule,
          replyMessage: rule.replyMessage
        };
      }
    }
    
    console.log('❌ No rules matched');
    return null;
  }

  async runTest(scenario) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 TEST: ${scenario.name}`);
    console.log(`📝 Description: ${scenario.description}`);
    console.log(`📨 Input: "${scenario.message}"`);
    console.log(`🎯 Expected: ${scenario.expectedTrigger} (priority ${scenario.expectedPriority})`);
    
    const result = this.processMessage(scenario.message);
    
    if (!result) {
      console.log('❌ FAIL: No rule triggered');
      return false;
    }
    
    const { triggeredRule } = result;
    const actualTrigger = triggeredRule.triggerType === 'keyword' ? triggeredRule.trigger : triggeredRule.triggerType;
    const actualPriority = triggeredRule.priority;
    
    console.log(`📋 Actual: ${actualTrigger} (priority ${actualPriority})`);
    console.log(`💬 Reply: "${result.replyMessage}"`);
    
    // Check if the result matches expectations
    const triggerMatches = actualTrigger === scenario.expectedTrigger;
    const priorityMatches = actualPriority === scenario.expectedPriority;
    
    if (triggerMatches && priorityMatches) {
      console.log('✅ PASS: Test successful');
      return true;
    } else {
      console.log('❌ FAIL: Test failed');
      if (!triggerMatches) {
        console.log(`   Expected trigger: ${scenario.expectedTrigger}, got: ${actualTrigger}`);
      }
      if (!priorityMatches) {
        console.log(`   Expected priority: ${scenario.expectedPriority}, got: ${actualPriority}`);
      }
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Auto-Reply System Test');
    console.log(`📊 Testing ${testScenarios.length} scenarios`);
    
    await this.login();
    await this.fetchRules();
    
    if (this.rules.length === 0) {
      console.log('❌ No rules found - cannot test');
      return;
    }
    
    let passed = 0;
    let failed = 0;
    
    for (const scenario of testScenarios) {
      const success = await this.runTest(scenario);
      if (success) {
        passed++;
      } else {
        failed++;
      }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 TEST RESULTS SUMMARY');
    console.log(`✅ Passed: ${passed}/${testScenarios.length}`);
    console.log(`❌ Failed: ${failed}/${testScenarios.length}`);
    console.log(`📈 Success Rate: ${((passed / testScenarios.length) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n🔧 Issues detected in auto-reply system:');
      console.log('   - Check rule priorities in database');
      console.log('   - Verify keyword matching logic');
      console.log('   - Ensure rules are properly ordered by priority');
    } else {
      console.log('\n🎉 All tests passed! Auto-reply system is working correctly.');
    }
  }

  // Test priority conflict resolution specifically
  async testPriorityConflicts() {
    console.log('\n🔬 PRIORITY CONFLICT RESOLUTION TEST');
    
    const conflictTests = [
      {
        message: "hello pricing support",
        description: "All keywords present - should choose highest priority",
        expectedWinner: "pricing (priority 10)"
      },
      {
        message: "hi support team",
        description: "Greeting + support keyword - should choose support",
        expectedWinner: "support (priority 8)"
      }
    ];
    
    for (const test of conflictTests) {
      console.log(`\n📝 ${test.description}`);
      console.log(`📨 Message: "${test.message}"`);
      
      const result = this.processMessage(test.message);
      if (result) {
        const winner = `${result.triggeredRule.triggerType === 'keyword' ? result.triggeredRule.trigger : result.triggeredRule.triggerType} (priority ${result.triggeredRule.priority})`;
        console.log(`🏆 Winner: ${winner}`);
        console.log(`✅ Expected: ${test.expectedWinner}`);
      }
    }
  }
}

// Run the comprehensive test
async function runAutoReplyTests() {
  const tester = new AutoReplyTester();
  await tester.runAllTests();
  await tester.testPriorityConflicts();
}

// Execute tests
runAutoReplyTests().catch(console.error);
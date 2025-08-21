import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, TestTube, RotateCcw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface TestMessage {
  id: number;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface TestResult {
  input: string;
  reply: string;
  hasReply: boolean;
}

export default function AutoReplyDemo() {
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [phoneNumber] = useState('+918318868521');
  const queryClient = useQueryClient();

  // Pre-defined test messages with emojis
  const testMessages = [
    { text: 'Hi 👋', description: 'Greeting trigger with emoji' },
    { text: 'hello 😊', description: 'Greeting trigger (lowercase)' },
    { text: '1', description: 'Numeric option 1' },
    { text: '2', description: 'Numeric option 2' },
    { text: '3', description: 'Numeric option 3' },
    { text: '4', description: 'Numeric option 4' },
    { text: 'menu 📋', description: 'Menu command with emoji' },
    { text: 'help ❓', description: 'Help command with emoji' },
    { text: 'demo 🚀', description: 'Demo request with emoji' },
    { text: 'hours 🕒', description: 'Business hours with emoji' },
    { text: 'support 💬', description: 'Support trigger with emoji' },
    { text: 'xyz123', description: 'Unknown input (fallback)' }
  ];

  // Test auto-reply system
  const testAutoReply = useMutation({
    mutationFn: async (testData: { phoneNumber: string; testMessages?: string[] }) => {
      const response = await fetch('/api/auto-reply-rules/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(testData)
      });
      
      if (!response.ok) {
        throw new Error('Test failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Test results:', data);
    }
  });

  // Send individual message
  const sendMessage = async (content: string) => {
    // Add user message
    const userMessage: TestMessage = {
      id: Date.now(),
      content,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch('/api/auto-reply-rules/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          phoneNumber,
          testMessages: [content]
        })
      });

      if (response.ok) {
        const result = await response.json();
        const testResult = result.testResults[0];
        
        if (testResult?.hasReply && testResult.reply !== 'No matching rule found') {
          const botMessage: TestMessage = {
            id: Date.now() + 1,
            content: testResult.reply,
            sender: 'bot',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, botMessage]);
        } else {
          const noReplyMessage: TestMessage = {
            id: Date.now() + 1,
            content: 'No auto-reply rule matched your message.',
            sender: 'bot',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, noReplyMessage]);
        }
      }
    } catch (error) {
      console.error('Error testing message:', error);
    }
  };

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      sendMessage(inputMessage.trim());
      setInputMessage('');
    }
  };

  const runBulkTest = async () => {
    setMessages([]);
    try {
      const result = await testAutoReply.mutateAsync({
        phoneNumber,
        testMessages: testMessages.map(t => t.text)
      });

      // Add all test results as messages
      const allMessages: TestMessage[] = [];
      let messageId = Date.now();

      result.testResults.forEach((testResult: TestResult, index: number) => {
        // User message
        allMessages.push({
          id: messageId++,
          content: testResult.input,
          sender: 'user',
          timestamp: new Date(Date.now() + index * 1000)
        });

        // Bot response
        allMessages.push({
          id: messageId++,
          content: testResult.hasReply ? testResult.reply : 'No matching rule found',
          sender: 'bot',
          timestamp: new Date(Date.now() + index * 1000 + 500)
        });
      });

      setMessages(allMessages);
    } catch (error) {
      console.error('Bulk test failed:', error);
    }
  };

  const clearContext = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/auto-reply-rules/test-context/${phoneNumber}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      return response.json();
    }
  });

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Auto-Reply System Demo</h1>
        <p className="text-muted-foreground">
          Test your enhanced auto-reply rules with keyword and numeric triggers
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Test Controls */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              Test Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Phone Number</label>
              <div className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded">
                {phoneNumber}
              </div>
            </div>

            <Button 
              onClick={runBulkTest}
              disabled={testAutoReply.isPending}
              className="w-full"
            >
              {testAutoReply.isPending ? 'Running Tests...' : 'Run All Tests'}
            </Button>

            <Button 
              variant="outline"
              onClick={() => clearContext.mutate()}
              disabled={clearContext.isPending}
              className="w-full"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear Context
            </Button>

            <div className="space-y-2">
              <h3 className="font-medium text-sm">Quick Test Messages:</h3>
              <div className="grid grid-cols-1 gap-2">
                {testMessages.slice(0, 8).map((test, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => sendMessage(test.text)}
                    className="justify-start text-left h-auto py-2"
                  >
                    <div>
                      <div className="font-medium">{test.text}</div>
                      <div className="text-xs text-muted-foreground">{test.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chat Interface */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Auto-Reply Test Chat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Messages */}
              <ScrollArea className="h-96 w-full border rounded-md p-4">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Send a message or run tests to see auto-replies in action!</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            message.sender === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {message.sender === 'user' ? (
                              <User className="w-4 h-4" />
                            ) : (
                              <Bot className="w-4 h-4" />
                            )}
                            <Badge variant="outline" className="text-xs">
                              {message.sender === 'user' ? 'You' : 'Bot'}
                            </Badge>
                          </div>
                          <div className="whitespace-pre-wrap text-sm">
                            {message.content}
                          </div>
                          <div className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your message..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button onClick={handleSendMessage} size="icon">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Results Summary */}
      {testAutoReply.data && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Test Results Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {testAutoReply.data.summary.repliedTo}
                </div>
                <div className="text-sm text-muted-foreground">Replies Generated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {testAutoReply.data.summary.noReply}
                </div>
                <div className="text-sm text-muted-foreground">No Reply</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {testAutoReply.data.summary.totalTests}
                </div>
                <div className="text-sm text-muted-foreground">Total Tests</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
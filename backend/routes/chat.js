const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

// Simple in-memory rate limiter
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 20;

/**
 * Middleware: Rate limit + Auth token
 */
router.use((req, res, next) => {
  // 1. Rate Limit
  const ip = req.ip || 'anonymous';
  const now = Date.now();
  const userRate = rateLimit.get(ip) || { count: 0, reset: now + RATE_LIMIT_WINDOW };

  if (now > userRate.reset) {
    userRate.count = 0;
    userRate.reset = now + RATE_LIMIT_WINDOW;
  }
  
  if (userRate.count >= MAX_REQUESTS) {
    return res.status(429).json({ success: false, error: 'Too many requests' });
  }

  userRate.count++;
  rateLimit.set(ip, userRate);

  // 2. Auth Token
  const authHeader = req.headers['authorization'];
  const expectedToken = process.env.CHAT_API_TOKEN;
  
  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  next();
});

// Transaction tools section
const TRANSACTION_TOOLS_SECTION = `
## TRANSACTION CAPABILITIES

You can help users execute OpenWork transactions. When a user clearly wants to perform one of these actions AND has provided enough information, respond normally AND embed a tool call at the end of your response:

<tool>
{"name": "TOOL_NAME", "params": {...}, "display": "Human readable summary"}
</tool>

Available tools:
- postJob(title, budget, description) — Post a new job. budget is a number in USDC. Ask for missing params.
- applyToJob(jobId, proposal, proposedAmount?) — Apply to an existing job. proposedAmount is optional USDC amount (e.g. 100 for $100).
- startJob(jobId, applicantAddress) — Start a job by hiring an applicant. applicantAddress is the 0x address of the applicant. DO NOT ask for applicationId — the frontend looks it up automatically.
- submitWork(jobId, workDetails) — Submit completed work
- releasePayment(jobId) — Release payment to worker
- raiseDispute(jobId, reason) — Raise a dispute on a job
- createProfile(name, skills, hourlyRate) — Create a freelancer profile
- startDirectContract(title, budget, description, jobTaker) — Hire someone directly

IMPORTANT: Only embed <tool> when the user has explicitly confirmed they want to transact. Always ask for missing required params first.
`;

/**
 * Call LLM with automatic provider detection:
 * 1. GEMINI_API_KEY → Google Generative Language API
 * 2. AWS creds → Amazon Bedrock (Claude)
 * 3. Fail with helpful error
 */
async function callLLM(messages) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  // Method 1: Gemini API key
  if (GEMINI_API_KEY) {
    // Extract system prompt — Gemini uses systemInstruction, not a 'system' role message
    const systemMsg = messages.find(m => m.role === 'system');
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${GEMINI_API_KEY}`;
    const body = {
      contents,
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048, topP: 0.95 }
    };
    if (systemMsg) {
      body.systemInstruction = { parts: [{ text: systemMsg.content }] };
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await resp.json();
    if (resp.ok) {
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';
    }
    throw new Error(data.error?.message || 'Gemini API error');
  }

  // Method 2: AWS Bedrock (Claude)
  const awsKey = process.env.AWS_ACCESS_KEY_ID;
  const awsSecret = process.env.AWS_SECRET_ACCESS_KEY;
  if (awsKey && awsSecret) {
    const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');
    const client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: { accessKeyId: awsKey, secretAccessKey: awsSecret }
    });

    // Convert to Bedrock Converse format
    const bedrockMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'model' ? 'assistant' : m.role,
        content: [{ text: m.content }]
      }));

    // Extract system prompt
    const systemPrompt = messages.filter(m => m.role === 'system').map(m => ({ text: m.content }));

    const command = new ConverseCommand({
      modelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      messages: bedrockMessages,
      system: systemPrompt.length > 0 ? systemPrompt : undefined,
      inferenceConfig: { temperature: 0.3, maxTokens: 2048, topP: 0.95 }
    });

    const response = await client.send(command);
    return response.output?.message?.content?.[0]?.text || 'Sorry, I could not generate a response.';
  }

  throw new Error('No LLM provider configured. Set GEMINI_API_KEY or AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY.');
}

/**
 * POST /api/chat
 */
router.post('/', async (req, res) => {
  try {
    const { message, context, history } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    // Build messages array (provider-agnostic)
    const messages = [];

    if (context) {
      const fullContext = context.includes('TRANSACTION CAPABILITIES')
        ? context
        : context + TRANSACTION_TOOLS_SECTION;

      messages.push({
        role: 'system',
        content: `${fullContext}\n\nYou are OpenWork AI, the expert assistant for OpenWork. Answer accurately and concisely. When the user wants a transaction, follow the TRANSACTION CAPABILITIES instructions.`
      });
    }

    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-20)) {
        if (msg.role === 'user') {
          messages.push({ role: 'user', content: msg.text });
        } else if (msg.role === 'oppy' || msg.role === 'bot') {
          messages.push({ role: 'assistant', content: msg.text });
        }
      }
    }

    messages.push({ role: 'user', content: message });

    const aiResponse = await callLLM(messages);
    res.json({ success: true, response: aiResponse });

  } catch (error) {
    console.error('[chat] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

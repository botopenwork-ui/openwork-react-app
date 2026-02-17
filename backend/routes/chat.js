const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

/**
 * Gemini AI Chat endpoint
 * POST /api/chat
 * Body: { message: string, context?: string, history?: Array<{role: string, text: string}> }
 */
router.post('/', async (req, res) => {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Gemini API key not configured on server'
      });
    }

    const { message, context, history } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    // Build multi-turn conversation contents
    const contents = [];

    // First message: system context as the initial user turn
    if (context) {
      contents.push({
        role: 'user',
        parts: [{ text: `${context}\n\nYou are Agent Oppy, the expert AI assistant for OpenWork. Use the documentation above to answer questions accurately and concisely. Be technical when needed but explain concepts clearly. If suggesting code, use proper formatting.` }]
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'Understood! I\'m Agent Oppy, ready to help with OpenWork questions. I have access to the full protocol documentation including all contracts, deployment addresses, workflows, and technical details. What would you like to know?' }]
      });
    }

    // Add conversation history (last 10 exchanges to keep within token limits)
    if (history && Array.isArray(history)) {
      const recentHistory = history.slice(-20); // last 20 messages (10 exchanges)
      for (const msg of recentHistory) {
        if (msg.role === 'user') {
          contents.push({ role: 'user', parts: [{ text: msg.text }] });
        } else if (msg.role === 'oppy') {
          contents.push({ role: 'model', parts: [{ text: msg.text }] });
        }
      }
    }

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
          topP: 0.95,
          topK: 40
        }
      })
    });

    const data = await response.json();

    if (response.ok) {
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';

      res.json({
        success: true,
        response: aiResponse
      });
    } else {
      res.status(response.status).json({
        success: false,
        error: data.error?.message || 'Gemini API error'
      });
    }

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

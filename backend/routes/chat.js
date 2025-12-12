const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

/**
 * Gemini AI Chat endpoint
 * POST /api/chat
 * Body: { message: string, context?: string }
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

    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: context 
              ? `${context}\n\nUser Question: ${message}\n\nProvide a helpful, accurate, and concise answer based on the OpenWork documentation above. Be technical when needed but also explain concepts clearly. If suggesting code, use proper formatting.`
              : message
          }]
        }],
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

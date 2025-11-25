const express = require('express');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateMessage(message, maxLength = 5000) {
  if (!message || typeof message !== 'string') return false;
  const trimmed = message.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength;
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_PORT === '465',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error('Email transporter configuration error:', error);
  } else {
    console.log('Email transporter is ready to send messages');
  }
});

app.get('/api', (req, res) => {
  res.json({ message: 'Hello from the server!' });
});

// Diagnostic endpoint to check available models
app.get('/api/models', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
    const data = await response.json();
    
    if (response.ok) {
      const models = data.models || [];
      const supportedModels = models
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => ({
          name: m.name,
          displayName: m.displayName,
          description: m.description
        }));
      
      res.json({ 
        success: true, 
        count: supportedModels.length,
        models: supportedModels 
      });
    } else {
      res.status(response.status).json({ error: data });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/send', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please fill out all fields.' 
      });
    }

    const sanitizedName = sanitizeInput(name);
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedMessage = sanitizeInput(message);

    if (sanitizedName.length < 2 || sanitizedName.length > 100) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name must be between 2 and 100 characters.' 
      });
    }

    if (!isValidEmail(sanitizedEmail)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a valid email address.' 
      });
    }

    if (!validateMessage(sanitizedMessage, 5000)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Message must be between 1 and 5000 characters.' 
      });
    }

    if (!process.env.VERIFIED_SENDER_EMAIL || !process.env.ADMIN_RECIPIENT_EMAILS) {
      console.error('Missing required email configuration in .env file');
      return res.status(500).json({ 
        success: false, 
        message: 'Server configuration error. Please contact the administrator.' 
      });
    }

    const adminMailOptions = {
      from: `"Portfolio Alert" <${process.env.VERIFIED_SENDER_EMAIL}>`,
      to: process.env.ADMIN_RECIPIENT_EMAILS,
      replyTo: sanitizedEmail,
      subject: `New Contact Form Submission from ${sanitizedName}`,
      html: `
        <h2>You have a new contact form submission!</h2>
        <p><strong>Name:</strong> ${sanitizedName}</p>
        <p><strong>Email:</strong> ${sanitizedEmail}</p>
        <p><strong>Message:</strong></p>
        <pre style="white-space: pre-wrap; word-wrap: break-word;">${sanitizedMessage}</pre>
        <hr>
        <p style="color: #666; font-size: 12px;">This message was sent from the portfolio contact form.</p>
      `,
    };

    const userMailOptions = {
      from: `"Sugam Pokharel" <${process.env.VERIFIED_SENDER_EMAIL}>`,
      to: sanitizedEmail,
      subject: `Thank you for your message, ${sanitizedName}!`,
      html: `
        <p>Hi ${sanitizedName},</p>
        <p>Thank you for getting in touch! I've received your message and will get back to you as soon as possible.</p>
        <br>
        <p>Best regards,</p>
        <p>Sugam Pokharel</p>
        <hr>
        <p style="color: #666; font-size: 12px;">This is an automated confirmation email.</p>
      `,
    };

    await Promise.all([
      transporter.sendMail(adminMailOptions),
      transporter.sendMail(userMailOptions),
    ]);
    
    res.status(200).json({ 
      success: true, 
      message: 'Message sent successfully! I\'ll get back to you soon.' 
    });
  } catch (error) {
    console.error('Error sending email:', error);
    
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Error: ${error.message}` 
      : 'An error occurred while sending your message. Please try again later or contact me directly at sugampokharel28@gmail.com.';
    
    res.status(500).json({ 
      success: false, 
      message: errorMessage 
    });
  }
});

// FIXED: Correctly formats history for the Google Gemini API structure
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history = [] } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ 
                success: false, 
                message: 'Please provide a valid message.' 
            });
        }

        const trimmedMessage = message.trim();

        if (trimmedMessage.length === 0 || trimmedMessage.length > 2000) {
            return res.status(400).json({ 
                success: false, 
                message: trimmedMessage.length === 0 ? 'Message cannot be empty.' : 'Message is too long. Please keep it under 2000 characters.' 
            });
        }

        const systemPrompt = `You are a helpful AI assistant embedded on the portfolio website of Sugam Pokharel, a Fullstack Developer.
Your name is 'AI Assistant'. You are friendly, polite, and professional.
Your purpose is to answer questions about Sugam's skills, projects, and experience.

Do not answer questions that are not related to Sugam's professional portfolio. If asked an off-topic question, 
politely decline and steer the conversation back to Sugam.

Here is some information about Sugam (from the website):
- Role: Fullstack Developer
- Skills: HTML5 (95%), CSS3 (90%), JavaScript (85%), React (80%), Node.js (70%), MongoDB (65%), Git (85%), Tailwind CSS (85%), REST APIs (80%), Express.js (75%).
- Projects: 
    1. 'E-Commerce Platform': A live site with payments (Stripe), booking system, live chat, and AI. Built with React, Node.js, MongoDB.
    2. 'Task Manager App': A responsive app with drag-and-drop. Built with React and JavaScript.
- Experience: 
    1. 'Freelance Web Developer' (2023-Present): Designed and developed responsive sites for clients.
    2. 'Web Developer Intern' (Summer 2022 at Example Tech Co.): Assisted senior devs, used React, Node.js, and Agile.
- Contact: sugampokharel28@gmail.com

Keep your responses concise and helpful. Always be professional and friendly.`;

        const apiKey = process.env.GEMINI_API_KEY; 

        if (!apiKey) {
            console.error('GEMINI_API_KEY is not set in your .env file.');
            throw new Error('Server configuration error: API key missing');
        }
        
        // Use gemini-2.5-flash with v1beta API (supports systemInstruction)
        const model = 'gemini-2.5-flash';
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        console.log(`Using Gemini model: ${model}`);

        // Build the contents array
        const contents = [];
        
        // Add history from client
        for (const msg of history) {
            contents.push({ 
                role: msg.role === 'bot' ? 'model' : 'user',
                parts: [{ text: msg.content }] 
            });
        }
        
        // Add the current user message
        contents.push({ 
            role: 'user', 
            parts: [{ text: trimmedMessage }] 
        });

        const payload = {
            contents: contents,
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            },
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
            const apiResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!apiResponse.ok) {
                const errorBody = await apiResponse.text();
                let errorData;
                try {
                  errorData = JSON.parse(errorBody);
                } catch (e) {
                  errorData = { error: { message: errorBody } };
                }
                
                console.error('Gemini API Error:', {
                  status: apiResponse.status,
                  statusText: apiResponse.statusText,
                  error: errorData
                });
                
                throw new Error(`API call failed with status: ${apiResponse.status}`);
            }

            const result = await apiResponse.json();
            
            if (result.promptFeedback?.blockReason) {
                console.warn('Gemini API blocked the prompt:', result.promptFeedback.blockReason);
                return res.status(400).json({
                    success: false,
                    message: 'I apologize, but I cannot respond to that message. Please try rephrasing your question or ask about Sugam\'s portfolio, skills, or projects.'
                });
            }

            const candidate = result.candidates?.[0];

            if (candidate && candidate.content?.parts?.[0]?.text) {
                const text = candidate.content.parts[0].text;
                res.json({ success: true, message: text });
            } else if (candidate?.finishReason === 'SAFETY') {
                console.warn('Gemini API blocked response due to safety filters');
                return res.status(400).json({
                    success: false,
                    message: 'I apologize, but I cannot provide a response to that. Please try asking about Sugam\'s portfolio, skills, or projects.'
                });
            } else {
                console.error('Invalid response structure from AI API:', result);
                throw new Error('Invalid response structure from AI API');
            }
        } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                throw new Error('Request timeout: The AI service took too long to respond.');
            }
            throw fetchError;
        }

    } catch (error) {
        console.error('Error with Gemini AI:', error);
        
        const fallbackResponse = "I apologize, but I'm currently unable to process your request. Please feel free to email Sugam directly at sugampokharel28@gmail.com and he'll get back to you shortly!";
        
        const errorMessage = process.env.NODE_ENV === 'development' 
            ? `${fallbackResponse} (Error: ${error.message})` 
            : fallbackResponse;
        
        res.status(500).json({ 
            success: false, 
            message: errorMessage 
        });
    }
});

// Catch-all route for HTML (MUST be last)
app.get('*', (req, res, next) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else {
    next(); // Let it fall through to 404 handler
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'An unexpected error occurred. Please try again later.'
  });
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: Port ${PORT} is already in use.`);
    console.error(`\nTo fix this, you can:`);
    console.error(`1. Stop the existing server process`);
    console.error(`2. Use a different port by setting PORT environment variable`);
    console.error(`3. On Windows, find and kill the process: netstat -ano | findstr :${PORT}`);
    console.error(`   Then: taskkill /PID <PID> /F\n`);
    process.exit(1);
  } else {
    console.error('Server error:', error);
    process.exit(1);
  }
});
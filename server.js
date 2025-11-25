const express = require('express');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
const PDFDocument = require('pdfkit'); // For PDF generation
const rateLimit = require('express-rate-limit'); // Import rate limiter

const compression = require('compression'); // Import compression

dotenv.config();

const app = express();
const DEFAULT_PORT = parseInt(process.env.PORT) || 4000;

// --- NEW: Single Source of Truth for Portfolio Data ---
const portfolioData = {
  name: 'Sugam Pokharel',
  title: 'Fullstack Developer',
  email: 'sugampokharel28@gmail.com',
  portfolio: 'sugampokharel.dev',
  linkedin: 'in/sugam-pokharel-0504b438b',
  github: 'github.com/sugampokhareldev',
  twitter: 'PokharelSu65518',
  ui: {
    typewriterText: 'Digital Experiences,Innovative Solutions,Modern Products,Better Futures',
    chatGreeting: "Hi! I'm Sugam's AI assistant. Ask me anything about his skills, projects, or experience!"
  },
  about: {
    summary: [
      "I'm a self-taught Fullstack Developer with a passion for creating innovative web applications. My journey began in 2020, and since then I've been constantly learning and evolving with the latest technologies.",
      "I believe in writing clean, efficient code and creating user experiences that are both beautiful and functional. My approach combines modern design principles with robust backend architecture to deliver solutions that truly make a difference.",
      "When I'm not coding, you can find me exploring new technologies, contributing to open source, or sharing knowledge with the developer community. I'm particularly interested in AI integration, progressive web apps, and creating accessible experiences for all users."
    ],
    stats: {
      projectsCompleted: 10,
      yearsExperience: 4,
      technologiesMastered: 12,
      availableForWork: true
    },
    availability: {
      status: "Available for Freelance",
      message: "Open to exciting projects and collaborations"
    },
    features: [
      { icon: 'fa-bolt', title: 'Fast & Efficient', text: 'Optimized solutions for better performance' },
      { icon: 'fa-mobile-alt', title: 'Responsive Design', text: 'Perfect experience on all devices' },
      { icon: 'fa-code', title: 'Clean Code', text: 'Maintainable and scalable solutions' }
    ]
  },
  skills: [
    {
      category: 'Frontend',
      icon: 'fa-code',
      proficient: ['React', 'JavaScript (ES6+)', 'CSS3', 'Tailwind CSS', 'HTML5'],
      familiar: ['TypeScript', 'Vue.js']
    },
    {
      category: 'Backend',
      icon: 'fa-server',
      proficient: ['Node.js', 'Express.js'],
      familiar: ['MongoDB', 'REST APIs', 'GraphQL', 'Rust (Learning)']
    },
    {
      category: 'Tools & Others',
      icon: 'fa-tools',
      proficient: ['Git', 'VS Code', 'Responsive Design'],
      familiar: ['Docker', 'AWS', 'CI/CD', 'AI/ML Integration']
    }
  ],
  experience: [
    {
      title: 'Freelance Web Developer',
      period: '2023 - Present',
      points: [
        'Designed and developed responsive, modern websites for 5+ clients from concept to deployment.',
        'Specialized in creating fullstack MERN applications, including e-commerce platforms with payment and AI integration.',
        'Managed all aspects of the project lifecycle, including client communication, requirements gathering, development, and deployment.'
      ]
    }
  ],
  projects: [
    {
      title: 'E-Commerce Website',
      description: 'Full-featured online store with payment processing, inventory management, and customer dashboard.',
      image: 'images/project1.png',
      tech: ['Node.js', 'MongoDB', 'HTML', 'CSS', 'JS'],
      links: { preview: 'https://ajkcleaners.de/', github: 'https://github.com/sugampokhareldev' },
      category: 'fullstack'
    },
    {
      title: 'Customer Management App',
      description: 'Comprehensive customer relationship management system with data visualization and reporting tools.',
      image: 'images/project2.png',
      tech: ['Node.js', 'MongoDB', 'Tailwind CSS', 'JS'],
      links: { github: 'https://github.com/sugampokhareldev/customer-management-' },
      category: 'fullstack'
    },
    {
      title: 'School Website Redesign',
      description: 'Modern, responsive redesign of a school website focusing on accessibility and user experience.',
      image: 'images/project-3.png',
      tech: ['HTML', 'CSS'],
      links: { preview: 'https://sugampokhareldev.github.io/SugamDev.SchoolProject/', github: 'https://github.com/sugampokhareldev/SugamDev.SchoolProject' },
      category: 'frontend'
    },
    {
      title: 'Unit Converter',
      description: 'A handy utility tool for converting between Metric and Imperial units. Built with pure HTML, CSS, and JavaScript.',
      image: 'images/project-4.png',
      tech: ['HTML', 'CSS', 'JavaScript'],
      links: { preview: 'https://sugampokhareldev.github.io/Unti-Converter/', github: 'https://github.com/sugampokhareldev/Unti-Converter' },
      category: 'frontend'
    },
    {
      title: 'Solar System 3D',
      description: 'An interactive 3D visualization of the Solar System using CSS animations. Educational and visually engaging.',
      image: 'images/project-5.png',
      tech: ['HTML', 'CSS', 'JavaScript'],
      links: { preview: 'https://sugampokhareldev.github.io/SugamDev.SolarSystem/', github: 'https://github.com/sugampokhareldev/SugamDev.SolarSystem' },
      category: 'frontend'
    }
  ]
};
// --- End of Portfolio Data ---


// --- Security & Middleware ---
app.use(compression()); // Enable Gzip compression
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// --- CORS Configuration with Production Safety ---
let corsOrigin = process.env.ALLOWED_ORIGIN;
if (process.env.NODE_ENV === 'production' && !corsOrigin) {
  // Fail fast in production if the origin isn't set
  throw new Error('ALLOWED_ORIGIN environment variable is not set for production.');
}

app.use(cors({
  origin: corsOrigin || '*', // Allows '*' for dev, but requires explicit origin for production
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

// --- Rate Limiting ---
// Limit general API requests
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window`
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." }
});

// Stricter limit for emails and chat to prevent abuse
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 submissions per hour
  message: { success: false, message: "Too many messages sent. Please try again in an hour." }
});

const chatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // Limit each IP to 20 chat messages per 10 minutes
  message: { success: false, message: "Chat limit reached. Please wait a moment." }
});

app.use('/api', apiLimiter);
app.use('/api/send', contactLimiter);
app.use('/api/chat', chatLimiter);

// --- Input Validation Helpers ---
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

function validateMessage(message, maxLength = 3000) {
  if (!message || typeof message !== 'string') return false;
  const trimmed = message.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength;
}

// --- Exponential Backoff Fetch Helper ---
/**
 * Fetches a resource with exponential backoff for retries.
 */
async function fetchWithBackoff(url, options, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout per attempt

      const apiResponse = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (apiResponse.ok) {
        return apiResponse; // Success!
      }

      // Retry only on 503 (Unavailable) or 429 (Too Many Requests)
      if (apiResponse.status === 503 || apiResponse.status === 429) {
        console.log(`Gemini API returned ${apiResponse.status}. Retrying in ${delay / 1000}s... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Double the delay for next time
      } else {
        return apiResponse;
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`Fetch attempt timed out. Retrying in ${delay / 1000}s... (Attempt ${i + 1}/${retries})`);
      } else {
        console.error(`Fetch attempt ${i + 1} failed:`, error.message);
      }

      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        throw error;
      }
    }
  }
  throw new Error('API call failed after all retries.');
}


// --- Nodemailer Email Transport ---
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

// --- API Test Route ---
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from the server!' });
});

// --- NEW: API Route for Portfolio Data ---
app.get('/api/portfolio-data', (req, res) => {
  res.json(portfolioData);
});


// --- SEO: Sitemap Route ---
app.get('/sitemap.xml', (req, res) => {
  const baseUrl = process.env.BASE_URL || `http://localhost:${DEFAULT_PORT}`;
  const currentDate = new Date().toISOString();

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/index.html</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

  res.header('Content-Type', 'application/xml');
  res.send(sitemap);
});

// --- Contact Form Email Route ---
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

    if (!validateMessage(sanitizedMessage, 3000)) {
      return res.status(400).json({
        success: false,
        message: 'Message must be between 1 and 3000 characters.'
      });
    }

    if (!process.env.VERIFIED_SENDER_EMAIL || !process.env.ADMIN_RECIPIENT_EMAILS) {
      console.error('Missing required email configuration in .env file');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error. Please contact the administrator.'
      });
    }

    // Email to Admin
    // --- Email Templates ---
    const getAdminEmailTemplate = (name, email, message) => `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px; border-radius: 10px;">
        <div style="background: linear-gradient(135deg, #6366f1, #a855f7); padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
          <h2 style="color: white; margin: 0;">New Portfolio Inquiry</h2>
        </div>
        <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <p style="color: #4b5563; font-size: 16px;"><strong>Name:</strong> ${name}</p>
          <p style="color: #4b5563; font-size: 16px;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #6366f1;">${email}</a></p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;"><strong>Message:</strong><br>${message.replace(/\n/g, '<br>')}</p>
          <div style="margin-top: 30px; text-align: center;">
            <a href="mailto:${email}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reply Now</a>
          </div>
        </div>
        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">Sent from your portfolio website</p>
      </div>
    `;

    const getUserAutoReplyTemplate = (name) => `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px; border-radius: 10px;">
        <div style="background: linear-gradient(135deg, #6366f1, #a855f7); padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
          <h2 style="color: white; margin: 0;">Message Received! 🚀</h2>
        </div>
        <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <p style="color: #374151; font-size: 18px;">Hi <strong>${name}</strong>,</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Thanks for reaching out! I've received your message and will get back to you as soon as possible (usually within 24 hours).
          </p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            In the meantime, feel free to check out my latest projects on my portfolio.
          </p>
          <div style="margin-top: 30px; padding: 15px; background-color: #f3f4f6; border-radius: 6px; border-left: 4px solid #6366f1;">
            <p style="margin: 0; color: #4b5563; font-style: italic;">"Building innovative solutions at the intersection of design and technology."</p>
          </div>
          <p style="color: #374151; font-size: 16px; margin-top: 30px;">Best regards,<br><strong>Sugam Pokharel</strong></p>
        </div>
      </div>
    `;

    // 1. Send Notification to Admin
    const adminMailOptions = {
      from: `"${sanitizedName}" <${process.env.VERIFIED_SENDER_EMAIL}>`,
      to: process.env.ADMIN_RECIPIENT_EMAILS,
      replyTo: sanitizedEmail,
      subject: `New Portfolio Message from ${sanitizedName}`,
      html: getAdminEmailTemplate(sanitizedName, sanitizedEmail, sanitizedMessage),
      text: `Name: ${sanitizedName}\nEmail: ${sanitizedEmail}\nMessage: ${sanitizedMessage}` // Fallback
    };

    // 2. Send Auto-Reply to User
    const userAutoReplyOptions = {
      from: `"Sugam Pokharel" <${process.env.VERIFIED_SENDER_EMAIL}>`,
      to: sanitizedEmail,
      subject: `Thanks for contacting me! 🚀`,
      html: getUserAutoReplyTemplate(sanitizedName),
      text: `Hi ${sanitizedName},\n\nThanks for reaching out! I've received your message and will get back to you shortly.\n\nBest regards,\nSugam Pokharel`
    };

    // Send both emails
    await Promise.all([
      transporter.sendMail(adminMailOptions),
      transporter.sendMail(userAutoReplyOptions)
    ]);

    res.status(200).json({
      success: true,
      message: 'Message sent successfully! I\'ll get back to you soon.'
    });
  } catch (error) {
    console.error('Error sending email:', error);
    const errorMessage = 'An error occurred. Please try again or contact me directly at sugampokharel28@gmail.com.';
    res.status(500).json({
      success: false,
      message: errorMessage
    });
  }
});

// --- AI Chatbot Route (Gemini) ---
// --- UPDATED to use portfolioData ---
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid message.'
      });
    }

    const trimmedMessage = sanitizeInput(message.trim());

    // --- Dynamically build info strings ---
    const skillsInfo = portfolioData.skills.map(cat =>
      `* ${cat.category}:\n  * Proficient: ${cat.proficient.join(', ')}\n  * Familiar: ${cat.familiar.join(', ')}`
    ).join('\n');

    const projectsInfo = portfolioData.projects.map(p =>
      `* ${p.title}: ${p.description} (Tech: ${p.tech.join(', ')})${p.links.preview ? ` [Live at ${p.links.preview}]` : ''}`
    ).join('\n');

    const experienceInfo = portfolioData.experience.map(e =>
      `* ${e.title} (${e.period}): ${e.points.join(' ')}`
    ).join('\n');

    const systemPrompt = `You are a helpful AI assistant on Sugam Pokharel's portfolio website.
Your name is 'AI Assistant'. You are friendly, polite, and professional.
Your purpose is to answer questions about Sugam's skills, projects, and experience.
Do not answer off-topic questions (like math, general knowledge unrelated to tech, or politics). Politely decline and steer the conversation back to Sugam's portfolio.

Here is Sugam's info:
- Role: ${portfolioData.title}
- Contact: ${portfolioData.email}
- Summary: ${portfolioData.about.summary.join(' ')}

- Skills:
${skillsInfo}

- Experience:
${experienceInfo}

- Projects:
${projectsInfo}

Keep responses concise and helpful. Use simple markdown for lists if needed.`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Server configuration error: API key missing');
    }

    const model = 'gemini-2.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const contents = history.map(msg => ({
      role: msg.role === 'bot' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
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
        maxOutputTokens: 512, // Reduced for faster responses
      },
    };

    try {
      const apiResponse = await fetchWithBackoff(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, 3, 1000);

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        console.error('Gemini API Error (after retries):', JSON.stringify(errorData, null, 2));
        throw new Error(`API call failed with status: ${apiResponse.status}`);
      }

      const result = await apiResponse.json();

      if (result.promptFeedback?.blockReason) {
        return res.status(400).json({
          success: false,
          message: 'I cannot respond to that. Please ask about Sugam\'s portfolio.'
        });
      }

      const candidate = result.candidates?.[0];
      if (candidate && candidate.content?.parts?.[0]?.text) {
        res.json({ success: true, message: candidate.content.parts[0].text });
      } else {
        throw new Error('Invalid response structure from AI API');
      }
    } catch (fetchError) {
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout: The AI service took too long.');
      }
      throw fetchError;
    }

  } catch (error) {
    console.error('Error with Gemini AI:', error);
    const fallbackResponse = "I apologize, but I'm currently unable to process your request. Please email Sugam directly at sugampokharel28@gmail.com.";
    res.status(500).json({
      success: false,
      message: fallbackResponse
    });
  }
});

// --- Dynamic PDF Resume Generation Route (PDFKit) ---
// --- UPDATED to use portfolioData ---
app.get('/api/resume', async (req, res, next) => {
  try {
    console.log('Generating PDF resume with PDFKit...');

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Sugam-Pokharel-Resume.pdf"');

    doc.pipe(res);

    // Use portfolioData as the resume data
    const resumeData = portfolioData;

    let yPos = 50;
    const checkPageBreak = (requiredSpace) => {
      if (yPos + requiredSpace > 750) {
        doc.addPage();
        yPos = 50;
        return true;
      }
      return false;
    };

    const addSectionHeader = (text, yPos) => {
      checkPageBreak(30);
      doc.fontSize(16)
        .fillColor('#3b82f6')
        .font('Helvetica-Bold')
        .text(text, 50, yPos, { underline: true });
      return yPos + 30;
    };

    // Header
    doc.fontSize(28).fillColor('#1f2937').font('Helvetica-Bold').text(resumeData.name, 50, yPos);
    yPos += 35; // Increased spacing
    doc.fontSize(14).fillColor('#6b7280').font('Helvetica').text(resumeData.title, 50, yPos);
    yPos += 30; // Increased spacing

    // Contact Information
    doc.fontSize(10).fillColor('#6b7280').font('Helvetica');
    doc.text(`Email: ${resumeData.email}`, 50, yPos);
    doc.text(`Portfolio: ${resumeData.portfolio}`, 280, yPos);
    yPos += 15;
    doc.text(`LinkedIn: ${resumeData.linkedin}`, 50, yPos);
    doc.text(`GitHub: ${resumeData.github}`, 280, yPos);
    yPos += 35;

    // Sections
    yPos = addSectionHeader('Professional Summary', yPos);
    checkPageBreak(40);
    doc.fontSize(11).fillColor('#6b7280').font('Helvetica-Oblique');
    const summaryText = resumeData.about.summary.join(' '); // Join summary paragraphs
    const summaryHeight = doc.heightOfString(summaryText, { width: 495 });
    doc.text(summaryText, 50, yPos, { width: 495, align: 'left' });
    yPos += summaryHeight + 25;

    yPos = addSectionHeader('Technical Skills', yPos);
    checkPageBreak(60);
    resumeData.skills.forEach(skillCat => {
      // Category name
      doc.fontSize(11).fillColor('#1f2937').font('Helvetica-Bold').text(`${skillCat.category}:`, 50, yPos);

      // Skills text - ensure it starts on a new line to avoid overlap
      const allSkills = `Proficient: ${skillCat.proficient.join(', ')}. Familiar: ${skillCat.familiar.join(', ')}`;
      const skillsHeight = doc.heightOfString(allSkills, { width: 495 });
      yPos += 15; // Move down before adding skills text
      doc.font('Helvetica').fillColor('#6b7280').text(allSkills, 70, yPos, { width: 475 });
      yPos += skillsHeight + 10;
    });
    yPos += 15;


    yPos = addSectionHeader('Professional Experience', yPos);
    resumeData.experience.forEach((job) => {
      checkPageBreak(100);
      doc.fontSize(12).fillColor('#1f2937').font('Helvetica-Bold').text(job.title, 50, yPos, { width: 350 });
      doc.fontSize(10).fillColor('#6b7280').font('Helvetica-Oblique').text(job.period, 400, yPos, { align: 'right', width: 145 });
      yPos += 25;
      job.points.forEach(point => {
        checkPageBreak(20);
        doc.fontSize(10).fillColor('#1f2937').font('Helvetica').text(`• ${point}`, 60, yPos, { width: 435, align: 'left' });
        yPos += doc.heightOfString(`• ${point}`, { width: 435 }) + 5;
      });
      yPos += 15;
    });

    yPos = addSectionHeader('Selected Projects', yPos);
    resumeData.projects.forEach((project) => {
      checkPageBreak(100);
      doc.fontSize(12).fillColor('#1f2937').font('Helvetica-Bold').text(project.title, 50, yPos, { width: 350 });
      doc.fontSize(10).fillColor('#6b7280').font('Helvetica-Oblique').text(project.tech.join(', '), 400, yPos, { align: 'right', width: 145 });
      yPos += 25;

      const point = `${project.description}${project.links.preview ? ` Live at ${project.links.preview}.` : ''}`;
      checkPageBreak(20);
      doc.fontSize(10).fillColor('#1f2937').font('Helvetica').text(`• ${point}`, 60, yPos, { width: 435, align: 'left' });
      yPos += doc.heightOfString(`• ${point}`, { width: 435 }) + 5;

      yPos += 15;
    });

    doc.end();
    console.log('PDF generated successfully.');

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Could not generate resume.'
    });
  }
});

// --- Serve Frontend ---
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'privacy.html'));
});

app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'terms.html'));
});

app.get('*', (req, res, next) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else {
    next();
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'An unexpected error occurred.'
  });
});

// --- Robust Server Startup (Auto-Port Detection) ---
const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`\n✅ Server is running on http://localhost:${port}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.log(`⚠️  Port ${port} is busy. Trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', error);
      process.exit(1);
    }
  });
};

startServer(DEFAULT_PORT);
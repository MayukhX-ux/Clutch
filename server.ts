import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { Firestore } from '@google-cloud/firestore';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// Initialize Gemini SDK lazily
let ai: GoogleGenAI | null = null;
function getGeminiSDK(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

// Initialize Admin/Server-side Firestore using @google-cloud/firestore
let firestoreDb: Firestore | null = null;
function getFirestoreDb(): Firestore {
  if (!firestoreDb) {
    let projectId = 'clean-chemist-h3n78'; // fallback
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.projectId) {
          projectId = config.projectId;
        }
      }
    } catch (e) {
      console.error('Error reading firebase config on server', e);
    }
    
    firestoreDb = new Firestore({
      projectId,
      databaseId: '(default)'
    });
  }
  return firestoreDb;
}

// 1. Get all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const dbInstance = getFirestoreDb();
    const tasksSnapshot = await dbInstance.collection('tasks').orderBy('createdAt', 'desc').get();
    const tasks: any[] = [];
    tasksSnapshot.forEach(doc => {
      tasks.push({ id: doc.id, ...doc.data() });
    });
    res.json(tasks);
  } catch (error: any) {
    console.error('Error fetching tasks from server Firestore:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch tasks' });
  }
});

// 2. Create or Update a task
app.post('/api/tasks', async (req, res) => {
  try {
    const task = req.body;
    if (!task || !task.id) {
      return res.status(400).json({ error: 'Task data with a valid ID is required' });
    }
    const dbInstance = getFirestoreDb();
    await dbInstance.collection('tasks').doc(task.id).set(task, { merge: true });
    res.json({ success: true, task });
  } catch (error: any) {
    console.error('Error saving task to server Firestore:', error);
    res.status(500).json({ error: error.message || 'Failed to save task' });
  }
});

// 3. Delete a task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Task ID is required' });
    }
    const dbInstance = getFirestoreDb();
    await dbInstance.collection('tasks').doc(id).delete();
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting task from server Firestore:', error);
    res.status(500).json({ error: error.message || 'Failed to delete task' });
  }
});

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Get User Profile from IAP / Sandbox Headers
app.get('/api/user/profile', (req, res) => {
  const email = req.headers['x-goog-authenticated-user-email'] || '';
  res.json({
    email: Array.isArray(email) ? email[0] : email || 'user@example.com',
  });
});

// Helper function to calculate the next day in YYYY-MM-DD format
function getNextDay(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    d.setDate(d.getDate() + 1);
    const nextYear = d.getFullYear();
    const nextMonth = String(d.getMonth() + 1).padStart(2, '0');
    const nextDay = String(d.getDate()).padStart(2, '0');
    return `${nextYear}-${nextMonth}-${nextDay}`;
  }
  return dateStr;
}

// Google Calendar & Gmail Sync Endpoint
app.post('/api/tasks/sync', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header is missing. Please complete the Google Workspace setup.' });
    }

    const { task, syncCalendar, sendNotification, recipientEmail } = req.body;
    if (!task) {
      return res.status(400).json({ error: 'Task data is required.' });
    }

    let calendarResult = null;
    let gmailResult = null;

    // 1. Sync to Google Calendar
    if (syncCalendar) {
      try {
        const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            summary: `🎯 Task: ${task.title}`,
            description: `Task created in Clutch Workspace.\nPriority: ${task.priority}\nCategory: ${task.category}\nStatus: ${task.status}`,
            start: {
              date: task.date,
            },
            end: {
              date: getNextDay(task.date),
            },
            reminders: {
              useDefault: true,
            },
          }),
        });

        const calData = await calendarResponse.json();
        if (!calendarResponse.ok) {
          throw new Error(calData.error?.message || 'Google Calendar API error');
        }
        calendarResult = { success: true, htmlLink: calData.htmlLink };
      } catch (calErr: any) {
        console.error('Google Calendar Sync Error:', calErr);
        calendarResult = { success: false, error: calErr.message || 'Failed to create calendar event' };
      }
    }

    // 2. Send Gmail Notification
    if (sendNotification && recipientEmail) {
      try {
        const subject = `🚀 Task Launched: ${task.title}`;
        const encodedSubject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
        
        const priorityColors: Record<string, string> = {
          high: '#ffebeb',
          medium: '#fff6e0',
          low: '#eaf6ec',
        };
        const priorityTextColors: Record<string, string> = {
          high: '#eb5757',
          medium: '#df9a00',
          low: '#27ae60',
        };
        
        const badgeColor = priorityColors[task.priority] || '#f1f1f0';
        const badgeTextColor = priorityTextColors[task.priority] || '#37352f';

        const emailLines = [
          `To: ${recipientEmail}`,
          `Subject: ${encodedSubject}`,
          'MIME-Version: 1.0',
          'Content-Type: text/html; charset=utf-8',
          'Content-Transfer-Encoding: base64',
          '',
          `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #37352f; line-height: 1.6; background-color: #fcfcfc; padding: 20px; }
    .card { max-width: 520px; margin: 0 auto; border: 1px solid #e9e9e7; border-radius: 12px; padding: 28px; background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
    .logo { font-size: 20px; font-weight: 800; color: #6366f1; margin-bottom: 24px; letter-spacing: -0.025em; }
    .header { font-size: 16px; font-weight: 700; margin-bottom: 12px; color: #111827; }
    .title-box { background: #f8f9fa; border-left: 4px solid #6366f1; padding: 12px 16px; margin-bottom: 20px; font-size: 15px; font-weight: 600; border-radius: 0 8px 8px 0; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .meta-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .meta-table td { padding: 8px 0; font-size: 13px; border-bottom: 1px solid #f4f4f5; }
    .meta-table td.label { color: #6b7280; width: 120px; font-weight: 500; }
    .meta-table td.value { color: #111827; font-weight: 500; }
    .footer { font-size: 11px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 16px; margin-top: 24px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Clutch</div>
    <div class="header">🎯 New Task Launched!</div>
    <div class="title-box">${task.title}</div>
    <table class="meta-table">
      <tr>
        <td class="label">Priority</td>
        <td class="value"><span class="badge" style="background-color: ${badgeColor}; color: ${badgeTextColor};">${task.priority}</span></td>
      </tr>
      <tr>
        <td class="label">Category</td>
        <td class="value" style="text-transform: capitalize;">${task.category}</td>
      </tr>
      <tr>
        <td class="label">Target Date</td>
        <td class="value">${task.date}</td>
      </tr>
    </table>
    <div class="footer">
      Sent automatically from your Clutch Workspace dashboard.
    </div>
  </div>
</body>
</html>`
        ];

        const emailContent = emailLines.join('\r\n');
        const rawMessage = Buffer.from(emailContent)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            raw: rawMessage,
          }),
        });

        const gmailData = await gmailResponse.json();
        if (!gmailResponse.ok) {
          throw new Error(gmailData.error?.message || 'Google Gmail API error');
        }
        gmailResult = { success: true };
      } catch (gmailErr: any) {
        console.error('Gmail Send Error:', gmailErr);
        gmailResult = { success: false, error: gmailErr.message || 'Failed to send email notification' };
      }
    }

    res.json({ calendarResult, gmailResult });
  } catch (error: any) {
    console.error('Task Sync API Error:', error);
    res.status(500).json({ error: error.message || 'Error processing Google Workspace actions' });
  }
});

// AI Generation API (for inline formatting, rewriting, expanding, translating)
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { prompt, blockContent, pageTitle, action } = req.body;
    const sdk = getGeminiSDK();

    let fullPrompt = '';
    
    // Choose appropriate prompt based on action
    switch (action) {
      case 'summarize':
        fullPrompt = `Summarize the following text briefly and professionally. Keep it within 2-3 sentences:\n\n"${blockContent}"`;
        break;
      case 'improve':
        fullPrompt = `Improve the writing quality, clarity, and tone of the following text, while keeping its core meaning:\n\n"${blockContent}"`;
        break;
      case 'make-longer':
        fullPrompt = `Expand the following text to add more depth, details, and professional explanation:\n\n"${blockContent}"`;
        break;
      case 'make-shorter':
        fullPrompt = `Make the following text more concise, sharp, and brief:\n\n"${blockContent}"`;
        break;
      case 'translate':
        const targetLang = req.body.targetLang || 'Spanish';
        fullPrompt = `Translate the following text into ${targetLang} accurately while preserving the professional formatting and tone:\n\n"${blockContent}"`;
        break;
      case 'change-tone':
        const tone = req.body.tone || 'professional';
        fullPrompt = `Rewrite the following text to have a highly ${tone} tone:\n\n"${blockContent}"`;
        break;
      case 'analyze-tasks':
        fullPrompt = `You are an elite, high-performance productivity coach and task analyst.
Analyze the following list of tasks (which include titles, status, priority, category, and date):
"${blockContent}"

Provide a concise, extremely high-value productivity analysis in Markdown format:
1. Identify immediate bottlenecks or high-priority items that need focus.
2. Provide feedback on workload balance across categories (e.g., Work vs. Personal vs. Learning).
3. Offer 3 highly actionable, non-generic strategies/habits tailored to their task patterns to improve their daily completion rates.
Keep the tone professional, motivating, and incredibly sharp.`;
        break;
      case 'brainstorm':
        fullPrompt = `Brainstorm 5 creative ideas, actionable bullet points, or next steps based on this topic: "${prompt}". Page context: "${pageTitle || ''}"`;
        break;
      case 'draft-doc':
        fullPrompt = `You are a high-performance content planner. Generate a comprehensive professional-grade structured document draft for the topic: "${prompt}".
Include headings, text, bullet lists, and to-do blocks.
Format your output as a clean, valid JSON array of block objects.
The block object schema must exactly match:
[
  { "type": "h1", "content": "Section Title" },
  { "type": "text", "content": "Paragraph text content..." },
  { "type": "todo", "content": "Actionable checkbox item", "properties": { "checked": false } },
  { "type": "bullet", "content": "Bullet point item" },
  { "type": "quote", "content": "An inspiring or important quote" },
  { "type": "callout", "content": "Callout or tip content" },
  { "type": "divider", "content": "" }
]
Do not include any markdown wrap or extra text. Return ONLY the raw JSON array. Ensure it is valid JSON and parses correctly.`;
        break;
      case 'schedule-task':
        fullPrompt = `You are an intelligent task manager. Parse the following natural language request into a single structured task object.
Current local date/time is: ${new Date().toISOString().split('T')[0]}.
Request: "${prompt}"

Format your output as a clean, valid JSON object with the following schema:
{
  "title": "Clear concise title of the task",
  "status": "todo",
  "priority": "low" | "medium" | "high",
  "category": "work" | "personal" | "health" | "finance" | "learning" | "other",
  "date": "YYYY-MM-DD"
}

Determine the correct date based on keywords like "tomorrow", "next Monday", "next Friday", "on Oct 12th", etc., relative to the current local date: ${new Date().toISOString().split('T')[0]}. If no date is mentioned, default to today's date.
Determine the correct priority (low, medium, high) and category (work, personal, health, finance, learning, other) based on context.
Return ONLY the raw JSON object. Do not include markdown formatting or extra text.`;
        break;
      default:
        fullPrompt = `Provide a helpful response to this request: "${prompt}".\nIf there is selected text, take it into account:\n"${blockContent || ''}"`;
        break;
    }

    // Call Gemini API
    const response = await sdk.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
    });

    const text = response.text || '';
    
    // Attempt to parse as JSON if it's a draft document
    if (action === 'draft-doc') {
      try {
        // Strip code block backticks if the model returned them
        let cleanText = text.trim();
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.substring(7, cleanText.length - 3).trim();
        } else if (cleanText.startsWith('```')) {
          cleanText = cleanText.substring(3, cleanText.length - 3).trim();
        }
        
        const blocks = JSON.parse(cleanText);
        return res.json({ text: 'Draft generated successfully!', blocks });
      } catch (err) {
        console.error('Failed to parse JSON blocks, returning as text', err);
        // Fallback to text blocks
        const paragraphs = text.split('\n\n').filter(Boolean);
        const blocks = paragraphs.map(p => {
          if (p.startsWith('# ')) return { type: 'h1', content: p.replace('# ', '') };
          if (p.startsWith('## ')) return { type: 'h2', content: p.replace('## ', '') };
          if (p.startsWith('### ')) return { type: 'h3', content: p.replace('### ', '') };
          if (p.startsWith('- [ ] ') || p.startsWith('- [  ] ')) return { type: 'todo', content: p.replace(/^- \[[ xX]?\] /, ''), properties: { checked: false } };
          if (p.startsWith('- ') || p.startsWith('* ')) return { type: 'bullet', content: p.replace(/^[-*] /, '') };
          return { type: 'text', content: p };
        });
        return res.json({ text: 'Draft generated (parsed as standard text)!', blocks });
      }
    }

    if (action === 'schedule-task') {
      try {
        let cleanText = text.trim();
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.substring(7, cleanText.length - 3).trim();
        } else if (cleanText.startsWith('```')) {
          cleanText = cleanText.substring(3, cleanText.length - 3).trim();
        }
        const taskData = JSON.parse(cleanText);
        return res.json({ text: 'Task scheduled successfully!', task: taskData });
      } catch (err) {
        console.error('Failed to parse scheduled task JSON:', err);
        // Fallback: build a default task out of text description
        const today = new Date().toISOString().split('T')[0];
        return res.json({
          text: 'Parsed scheduled task fallback',
          task: {
            title: prompt,
            status: 'todo',
            priority: 'medium',
            category: 'work',
            date: today
          }
        });
      }
    }

    return res.json({ text });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ error: error.message || 'Error executing AI generation' });
  }
});

// Start server
async function startServer() {
  // Vite dev server middleware integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware mounted in development mode.');
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving static files in production mode.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Clutch Server is running on http://localhost:${PORT}`);
  });
}

startServer();

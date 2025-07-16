import dotenv from 'dotenv';
dotenv.config();  // Load environment variables from .env

import pkg from 'openai';
const { OpenAI } = pkg;
import restify from 'restify';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get the current directory using import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Make sure your OpenAI API key is set in .env
});

const server = restify.createServer();

// Middleware to parse JSON requests
server.use(restify.plugins.bodyParser());

// ✅ CORS middleware
server.pre((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'OPTIONS, GET, POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.send(204);
    return;
  }
  return next();
});

// ✅ Serve the widget file from the 'public' directory using fs
server.get('/widget.html', (req, res, next) => {
  const widgetFilePath = path.join(__dirname, 'public', 'widget.html');  // Ensure the path is correct
  
  if (fs.existsSync(widgetFilePath)) {
    const fileContent = fs.readFileSync(widgetFilePath, 'utf8');
    res.header('Content-Type', 'text/html');  // Ensure the correct content type is set
    res.write(fileContent);  // Stream the content
    res.end();  // End the response
  } else {
    res.send(404, { error: 'Widget file not found' });
  }
  return next();
});

// ✅ Assistants API route to handle messages
server.post('/api/messages', async (req, res) => {
  try {
    const { message, memory = [], files = [] } = req.body;

    if (!message) {
      res.send(400, { error: "No message provided" });
      return;
    }

    const response = await openai.beta.threads.createAndRun({
      assistant_id: "asst_CvpjeE9OxLq5bqHLFbSmanBP",
      thread: {
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
      },
    });

    const runId = response.id;

    // Poll run status
    let runStatus;
    do {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(response.thread_id, runId);
    } while (runStatus.status !== 'completed' && runStatus.status !== 'failed');

    if (runStatus.status === 'failed') {
      throw new Error("Assistant run failed");
    }

    const messages = await openai.beta.threads.messages.list(response.thread_id);
    const lastMessage = messages.data.find(msg => msg.role === 'assistant');

    res.send({ reply: lastMessage?.content?.[0]?.text?.value || "(No reply)" });
  } catch (error) {
    console.error('❌ Error in /api/messages:', error);
    res.send(500, { error: error.message || "Internal server error" });
  }
});

// Start the server
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`✅ HR.Ai server running on port ${PORT}`);
});

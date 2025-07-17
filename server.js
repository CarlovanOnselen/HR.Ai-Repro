import OpenAI from 'openai'; // Default import
import restify from 'restify';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Initialize OpenAI with the API key from Render's environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // This will pick up the API key from Render's environment
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
  const widgetFilePath = path.join(__dirname, 'public', 'widget.html');
  
  if (fs.existsSync(widgetFilePath)) {
    const fileContent = fs.readFileSync(widgetFilePath, 'utf8');
    res.header('Content-Type', 'text/html');
    res.write(fileContent);
    res.end();
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

    // Log the incoming message
    console.log('Received message:', message);

    // Create and run the OpenAI thread
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

    // Log the full response from createAndRun
    console.log('API Response from createAndRun:', JSON.stringify(response, null, 2));

    // Extract threadId and runId
    const threadId = response?.thread_id || response?.thread?.id;
    const runId = response?.id;

    console.log('Thread ID:', threadId);
    console.log('Run ID:', runId);

    // Validate threadId and runId to avoid invalid path issues
    if (!threadId || !runId) {
      console.error('Error: Missing thread ID or run ID in response');
      res.send(500, { error: 'Missing thread or run ID in API response' });
      return;
    }

    // Poll run status
    let runStatus;
    console.log('Polling for run status...');
    do {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log('Polling run status for threadId:', threadId, 'and runId:', runId);
      try {
        runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
        console.log('Run Status:', runStatus.status);
      } catch (err) {
        console.error('Error while polling run status:', err);
      }
    } while (runStatus?.status !== 'completed' && runStatus?.status !== 'failed');

    if (runStatus?.status === 'failed') {
      throw new Error("Assistant run failed");
    }

    const messages = await openai.beta.threads.messages.list(threadId);
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

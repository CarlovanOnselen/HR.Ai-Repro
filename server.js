import { OpenAI } from 'openai';  // Use the default import, no need to destructure
import restify from 'restify';
import path from 'path';
import fs from 'fs';

// Initialize OpenAI using the API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,  // Uses the API key from environment
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
    const response = await openai.chat.completions.create({
      model: 'gpt-4',  // Specify the model you want to use (e.g., 'gpt-4')
      messages: [
        { role: 'user', content: message },
      ],
    });

    // Log the full response from createAndRun
    console.log('API Response:', JSON.stringify(response, null, 2));

    const reply = response?.choices?.[0]?.message?.content || "(No reply)";

    res.send({ reply });
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

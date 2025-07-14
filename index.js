import restify from 'restify';
import cors from '@koa/cors';
import { OpenAI } from 'openai';
import fileType from 'file-type';

// Load environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = process.env.ASSISTANT_ID;

if (!OPENAI_API_KEY || !ASSISTANT_ID) {
  console.error('ERROR: OPENAI_API_KEY and ASSISTANT_ID environment variables must be set');
  process.exit(1);
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const server = restify.createServer();

// Enable CORS middleware for all origins
server.pre((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.send(200);
    return;
  }
  return next();
});

// Body parser to parse JSON and multipart/form-data (for files)
server.use(restify.plugins.bodyParser({
  mapParams: true,
  mapFiles: true,
  overrideParams: false,
  multipartHandler: async (part, req, res, next) => {
    if (part.filename) {
      // You can handle file uploads here (save to disk or memory)
      // For demo: store buffer in req.files with mimetype
      const buffers = [];
      for await (const chunk of part) {
        buffers.push(chunk);
      }
      const fileBuffer = Buffer.concat(buffers);
      const type = await fileType.fromBuffer(fileBuffer);
      req.files = req.files || {};
      req.files[part.name] = {
        filename: part.filename,
        data: fileBuffer,
        mime: type?.mime || 'application/octet-stream'
      };
    }
    next();
  }
}));

// POST /api/messages endpoint
server.post('/api/messages', async (req, res) => {
  try {
    const { message, memory, files } = req.body;

    if (!message) {
      res.send(400, { error: 'No message provided' });
      return;
    }

    // Prepare messages array for the Assistants API
    // memory is an optional array of previous messages
    const messages = [];

    // Push system prompt first
    messages.push({
      role: 'system',
      content: 'You are HR.Ai, a helpful HR assistant.',
    });

    // Add memory if provided (expect array of {role, content})
    if (Array.isArray(memory)) {
      for (const mem of memory) {
        if (mem.role && mem.content) {
          messages.push(mem);
        }
      }
    }

    // Add the current user message last
    messages.push({
      role: 'user',
      content: message,
    });

    // Call the OpenAI Assistants API with thread memory support
    const completion = await openai.chat.completions.create({
      assistantId: ASSISTANT_ID,
      messages,
      files, // optional files support, you can expand this if needed
    });

    const botReply = completion.choices[0]?.message?.content || 'No reply from assistant.';

    res.send({ reply: botReply });
  } catch (error) {
    console.error('Error in /api/messages:', error);
    res.send(500, { error: 'Internal server error.' });
  }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`✅ HR.Ai server running on port ${PORT}`);
});

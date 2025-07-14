import restify from 'restify';
import { OpenAI } from 'openai';
import { lookup } from 'file-type';
import fs from 'fs/promises';
import path from 'path';

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const server = restify.createServer();
server.use(restify.plugins.bodyParser());

// Manual CORS middleware
server.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // allow all origins
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    res.send(200);
  } else {
    next();
  }
});

// POST /api/messages
server.post('/api/messages', async (req, res) => {
  try {
    const { message, memory = [], fileData } = req.body;

    if (!message) {
      res.send(400, { error: 'Message is required.' });
      return;
    }

    const thread = await openai.beta.threads.create();

    // Add user's message
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: message
    });

    // Attach file if any
    if (fileData && fileData.name && fileData.content) {
      const buffer = Buffer.from(fileData.content, 'base64');
      const tmpFile = path.join('/tmp', fileData.name);
      await fs.writeFile(tmpFile, buffer);

      const fileUpload = await openai.files.create({
        file: await fs.readFile(tmpFile),
        purpose: 'assistants'
      });

      await openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: 'Uploading a file for reference.',
        file_ids: [fileUpload.id]
      });
    }

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: 'asst_CvpjeE9OxLq5bqHLFbSmanBP'
    });

    // Wait for completion
    let completedRun;
    do {
      await new Promise((r) => setTimeout(r, 1500));
      completedRun = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    } while (completedRun.status !== 'completed');

    const messages = await openai.beta.threads.messages.list(thread.id);
    const reply = messages.data.find(m => m.role === 'assistant');

    res.send({ reply: reply?.content[0]?.text?.value || 'No reply.' });
  } catch (err) {
    console.error('❌ Error:', err);
    res.send(500, { error: 'Internal server error.' });
  }
});

// Start server
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`✅ HR.Ai server running on port ${PORT}`);
});

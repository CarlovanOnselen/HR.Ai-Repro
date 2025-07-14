import restify from 'restify';
import corsMiddleware from 'restify-cors-middleware';
import { OpenAI } from 'openai';
import fileType from 'file-type';
import fs from 'fs';
import path from 'path';

// Init OpenAI with your API Key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Init server
const server = restify.createServer();
server.use(restify.plugins.bodyParser({ mapParams: true }));

// Allow CORS
const cors = corsMiddleware({
  origins: ['*'],
  allowHeaders: ['Authorization'],
  exposeHeaders: ['Authorization'],
});
server.pre(cors.preflight);
server.use(cors.actual);

// TEMP: store uploaded files
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// Endpoint: POST /api/messages
server.post('/api/messages', async (req, res) => {
  try {
    const { message, threadId, fileBase64, fileName } = req.body;

    if (!message) {
      return res.send(400, { error: 'Message is required' });
    }

    // 🧠 If no thread, create one
    const thread_id = threadId || (await openai.beta.threads.create()).id;

    let file_id;
    if (fileBase64 && fileName) {
      // Decode base64 string to buffer
      const buffer = Buffer.from(fileBase64, 'base64');
      const detected = await fileType.fromBuffer(buffer);
      const ext = path.extname(fileName) || `.${detected?.ext || 'bin'}`;
      const tempPath = path.join(UPLOAD_DIR, `temp-${Date.now()}${ext}`);
      fs.writeFileSync(tempPath, buffer);

      // Upload to OpenAI
      const uploaded = await openai.files.create({
        file: fs.createReadStream(tempPath),
        purpose: 'assistants',
      });

      file_id = uploaded.id;
      fs.unlinkSync(tempPath);
    }

    // Append message to thread
    await openai.beta.threads.messages.create(thread_id, {
      role: 'user',
      content: message,
      ...(file_id && { file_ids: [file_id] }),
    });

    // Run assistant on the thread
    const run = await openai.beta.threads.runs.create(thread_id, {
      assistant_id: 'asst_CvpjeE9OxLq5bqHLFbSmanBP',
    });

    // Poll until complete
    let completedRun;
    const maxTries = 20;
    for (let i = 0; i < maxTries; i++) {
      completedRun = await openai.beta.threads.runs.retrieve(thread_id, run.id);
      if (completedRun.status === 'completed') break;
      if (completedRun.status === 'failed' || completedRun.status === 'expired') {
        throw new Error('Assistant failed to respond.');
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    // Get latest assistant message
    const messages = await openai.beta.threads.messages.list(thread_id);
    const reply = messages.data.find((m) => m.role === 'assistant')?.content?.[0]?.text?.value || '...';

    return res.send({ reply, threadId: thread_id });
  } catch (err) {
    console.error('❌ Error:', err);
    return res.send(500, { error: 'Internal server error.' });
  }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`✅ HR.Ai server running on port ${PORT}`);
});

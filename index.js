import restify from 'restify';
import corsMiddleware from 'restify-cors-middleware2';
import { OpenAI } from 'openai';
import fileType from 'file-type';
import fs from 'fs';
import path from 'path';

// === OpenAI Setup ===
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const assistantId = 'asst_CvpjeE9OxLq5bqHLFbSmanBP'; // Replace with yours
const server = restify.createServer();

// === CORS Middleware ===
const cors = corsMiddleware({
  origins: ['*'],
  allowHeaders: ['Authorization'],
  exposeHeaders: ['Authorization']
});
server.pre(cors.preflight);
server.use(cors.actual);

// === Body Parser Middleware ===
server.use(restify.plugins.bodyParser({ mapParams: true }));

// === /api/messages ===
server.post('/api/messages', async (req, res) => {
  try {
    const { message, memory = [], fileUrl } = req.body;

    if (!message) {
      res.send(400, { error: 'No message provided.' });
      return;
    }

    // === Step 1: Create thread (or restore from memory) ===
    const thread = await openai.beta.threads.create();

    // === Step 2: Upload file if present ===
    let fileId = null;
    if (fileUrl) {
      const localFilePath = await downloadFile(fileUrl);
      const upload = await openai.files.create({
        file: fs.createReadStream(localFilePath),
        purpose: 'assistants',
      });
      fileId = upload.id;
      fs.unlinkSync(localFilePath); // Cleanup temp
    }

    // === Step 3: Add user message to thread ===
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: message,
      ...(fileId && { file_ids: [fileId] }),
    });

    // === Step 4: Run assistant ===
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
    });

    // === Step 5: Poll run status ===
    let result;
    while (true) {
      const status = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      if (status.status === 'completed') break;
      if (status.status === 'failed') {
        return res.send(500, { error: 'Run failed.' });
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // === Step 6: Get assistant reply ===
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantReply = messages.data.find(msg => msg.role === 'assistant');

    res.send({
      reply: assistantReply?.content[0]?.text?.value || 'No response.',
      thread_id: thread.id,
    });
  } catch (err) {
    console.error('Error:', err);
    res.send(500, { error: 'Internal server error.' });
  }
});

// === Server Listen ===
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`✅ HR.Ai server running on port ${PORT}`);
});

// === Utility: Download file ===
async function downloadFile(fileUrl) {
  const response = await fetch(fileUrl);
  const buffer = await response.arrayBuffer();
  const ext = (await fileType.fromBuffer(Buffer.from(buffer)))?.ext || 'bin';
  const filename = `upload-${Date.now()}.${ext}`;
  const filePath = path.join('/tmp', filename);
  fs.writeFileSync(filePath, Buffer.from(buffer));
  return filePath;
}

import restify from 'restify';
import cors from '@koa/cors';
import { OpenAI } from 'openai';
import { fileTypeFromBuffer } from 'file-type';

// Your OpenAI Assistant ID here
const ASSISTANT_ID = 'asst_CvpjeE9OxLq5bqHLFbSmanBP';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const server = restify.createServer();

// Enable CORS for all origins (adjust if you want stricter policy)
server.use(
  (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.send(200);
      return;
    }
    return next();
  }
);

// Parse JSON body
server.use(restify.plugins.bodyParser());

server.post('/api/messages', async (req, res) => {
  try {
    const { message, memory = [], files = [] } = req.body;

    if (!message) {
      res.send(400, { error: 'No message provided.' });
      return;
    }

    // Prepare files for upload if any
    const fileUploads = [];
    for (const file of files) {
      // file should have base64 content and filename
      const buffer = Buffer.from(file.base64, 'base64');
      const type = await fileTypeFromBuffer(buffer);
      fileUploads.push({
        name: file.name,
        data: buffer,
        mimeType: type?.mime || 'application/octet-stream',
      });
    }

    // Call the OpenAI Assistants API with memory and files
    const completion = await openai.chat.completions.create({
      assistant: ASSISTANT_ID,
      message: { role: 'user', content: message },
      memory,
      files: fileUploads.length > 0 ? fileUploads : undefined,
    });

    res.send({ reply: completion.choices[0].message.content, memory: completion.memory });
  } catch (error) {
    console.error('Error in /api/messages:', error);
    res.send(500, { error: 'Internal server error.' });
  }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`✅ HR.Ai server running on port ${PORT}`);
});

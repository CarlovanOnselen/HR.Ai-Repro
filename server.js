import pkg from 'openai';  // Default import for openai
const { OpenAI } = pkg;

import restify from 'restify';
import path from 'path';
import fs from 'fs';

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

    // Create and run the OpenAI thread (correct method for OpenAI SDK v2)
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',  // Specify the model (can change based on your setup)
      messages: [
        { role: 'user', content: message },
      ],
    });

    // Log the full response from OpenAI
    console.log('API Response from createAndRun:', JSON.stringify(response, null, 2));

    // Send the assistant's response
    const assistantReply = response.choices[0]?.message.content || "(No reply)";

    res.send({ reply: assistantReply });
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

server.post('/api/messages', async (req, res) => {
  const userMessage = req.body?.text || '';

  try {
    // 1. Create a new thread
    const threadRes = await fetch("https://api.openai.com/v1/threads", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const thread = await threadRes.json();
    const threadId = thread.id;

    // 2. Add a message to the thread
    await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'user',
        content: userMessage
      })
    });

    // 3. Run the assistant on the thread
    const runRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assistant_id: process.env.ASSISTANT_ID
      })
    });

    const run = await runRes.json();

    // 4. Poll until the run completes
    let runStatus = run.status;
    let runResult = run;
    while (runStatus === 'queued' || runStatus === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const statusRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${run.id}`, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      });

      runResult = await statusRes.json();
      runStatus = runResult.status;
    }

    // 5. Get assistant's message
    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      }
    });

    const messages = await messagesRes.json();
    const lastMessage = messages.data.find(m => m.role === 'assistant');

    res.send(200, {
      reply: lastMessage?.content?.[0]?.text?.value || "🤖 I didn’t quite catch that."
    });

  } catch (err) {
    console.error('❌ OpenAI API Error:', err);
    res.send(500, { reply: "⚠️ Sorry, I'm having trouble right now." });
  }
});

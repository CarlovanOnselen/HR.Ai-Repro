const restify = require('restify');
const { BotFrameworkAdapter } = require('botbuilder');
require('dotenv').config();
const fetch = require('node-fetch');

const adapter = new BotFrameworkAdapter({
    appId: process.env.MICROSOFT_APP_ID || '',
    appPassword: process.env.MICROSOFT_APP_PASSWORD || ''
});

const server = restify.createServer();
server.listen(process.env.PORT || 3978, () => {
    console.log(`HR.Ai Bot running on port ${process.env.PORT || 3978}`);
});

server.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, async (context) => {
        if (context.activity.type === 'message') {
            const userMessage = context.activity.text;

            try {
                const response = await fetch("https://api.openai.com/v1/assistants/" + process.env.ASSISTANT_ID + "/messages", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + process.env.OPENAI_API_KEY
                    },
                    body: JSON.stringify({
                        thread: { messages: [{ role: "user", content: userMessage }] }
                    })
                });

                const data = await response.json();
                const reply = data?.choices?.[0]?.message?.content || "I'm here, but I didn’t understand that.";

                await context.sendActivity(reply);
            } catch (err) {
                console.error("OpenAI API error:", err);
                await context.sendActivity("There was an error connecting to HR.Ai.");
            }
        }
    });
});

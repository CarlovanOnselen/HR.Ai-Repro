
🚀 HR.Ai Teams Bot - Setup Instructions

1. Open a terminal and navigate into this folder.

2. Run:
   npm install

3. Add your Microsoft App ID and Password to .env (optional for Teams publishing):
   MICROSOFT_APP_ID=your_bot_id
   MICROSOFT_APP_PASSWORD=your_bot_password

4. Start the bot:
   npm start

5. Use ngrok to expose:
   ngrok http 3978

6. Register the bot on Azure with endpoint:
   https://<your-ngrok-subdomain>.ngrok.io/api/messages

7. Upload Teams App Manifest with bot ID to Teams.

Questions? Contact your developer or integration specialist.

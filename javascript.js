const { Client } = require("discord.js-selfbot-v13");
const express = require("express");
const app = express();
const cors = require("cors");

app.use(cors());
app.use(express.json());

let client = null;
let intervals = new Map();

app.post("/start", async (req, res) => {
  const { token, replyMessage, autoChatMessage, channelId, delay } = req.body;

  if (!token) return res.status(400).send("Token required");

  // Clean up previous instance if exists
  if (client) {
    try {
      await client.destroy();
    } catch (err) {
      console.error("Error destroying previous client:", err);
    }
    clearIntervals();
  }

  client = new Client();

  client.on("ready", () => {
    console.log(`Logged in as ${client.user.username}`);

    // Auto Chat
    if (channelId && autoChatMessage) {
      const channel = client.channels.cache.get(channelId);
      if (channel) {
        const interval = setInterval(() => {
          channel.send(autoChatMessage).catch(err => {
            console.error("Failed to send auto-chat message:", err);
          });
        }, delay || 5000);
        intervals.set(channelId, interval);
      }
    }
  });

  client.on("messageCreate", (message) => {
    if (message.channel.type === "DM" && message.author.id !== client.user.id) {
      message.channel.send(replyMessage || "Hello! Auto-reply here.")
        .catch(err => console.error("Failed to send reply:", err));
    }
  });

  try {
    await client.login(token);
    res.send("Bot started!");
  } catch (err) {
    console.error("Login error:", err);
    res.status(401).send("Invalid token");
  }
});

app.post("/stop", async (req, res) => {
  try {
    if (client) {
      await client.destroy();
      client = null;
    }
    clearIntervals();
    res.send("Bot stopped");
  } catch (err) {
    console.error("Error stopping bot:", err);
    res.status(500).send("Error stopping bot");
  }
});

app.get("/status", (req, res) => {
  res.json({
    running: !!client,
    username: client?.user?.username
  });
});

function clearIntervals() {
  intervals.forEach(interval => clearInterval(interval));
  intervals.clear();
}

module.exports = app;

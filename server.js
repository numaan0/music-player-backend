require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const ytdl = require('ytdl-core');
const corsOptions = {
  origin: 'https://numusic.netlify.app/',  
  methods: ['GET', 'POST'],  
  allowedHeaders: ['Content-Type', 'Authorization'], 
  credentials: true,
};
const app = express();
const cache = {};
app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));
//test commit
app.get('/download/:videoId',async (req, res) => {
  console.log("in")
  const url = `http://www.youtube.com/watch?v=${req.params.videoId}`;
  console.log(url)
  const info = await ytdl.getInfo(url);
  const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
  res.setHeader('Content-Type', 'audio/mpeg');
  ytdl.downloadFromInfo(info, { format: format}).pipe(res)
});

app.get('/stream/:videoId', async (req, res) => {
  console.log(`Received request for video: ${req.params.videoId}`);
  try {
    const url = `http://www.youtube.com/watch?v=${req.params.videoId}`;
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });

    // Check if we have this video in our cache
    const cachedAudio = cache[url];
    if (cachedAudio) {
      // If we do, send the cached audio
      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(cachedAudio);
    } else {
      // If we don't, download the video and cache the audio
      const audioStream = ytdl.downloadFromInfo(info, { format: format });
      const audioBuffer = [];
      audioStream.on('data', (chunk) => {
        audioBuffer.push(chunk);
      });
      audioStream.on('end', () => {
        const audioData = Buffer.concat(audioBuffer);
        cache[url] = audioData;  // Cache the audio data
        res.setHeader('Content-Type', 'audio/mpeg');
        res.send(audioData);
      });
      audioStream.on('error', (err) => {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while downloading the video' });
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred while fetching video info' });
  }
});
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

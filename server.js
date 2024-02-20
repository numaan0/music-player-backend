require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const ytdl = require('ytdl-core');

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));
//test commit
app.get('/stream/:videoId', (req, res) => {
  const url = `http://www.youtube.com/watch?v=${req.params.videoId}`;
  ytdl.getInfo(url, (err, info) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'An error occurred while fetching video info' });
      return;
    }
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
    res.setHeader('Content-Type', 'audio/mpeg');
    ytdl.downloadFromInfo(info, { format: format }).pipe(res);
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

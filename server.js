require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const ytdl = require('ytdl-core');
const ytSearch  = require('yt-search');
const searchVideos = require('youtube-search-api');
const corsOptions = {
  origin: '*',  
  methods: ['GET', 'POST'],  
  allowedHeaders: ['Content-Type', 'Authorization'], 
  credentials: true,
};
const app = express();
const cache = {};
// app.set('trust proxy', true);
// process.env.YTDL_NO_UPDATE = 'true';

app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  validationsConfig: false,
		default: true,
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

    const cachedAudio = cache[url];
    if (cachedAudio) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(cachedAudio);
    } else {
      const audioStream = ytdl.downloadFromInfo(info, { format: format });
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Accept-Ranges', 'bytes');//this is for letting user skip the  part of a song
      audioStream.pipe(res);

      const audioBuffer = [];
      audioStream.on('data', (chunk) => {
        audioBuffer.push(chunk);
      });
      audioStream.on('end', () => {
        const audioData = Buffer.concat(audioBuffer);
        cache[url] = audioData;
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


app.get('/api/suggestions', async(req, res)=>{

  const {limit} = req.query;
  console.log(limit);
  try{
    const result = await searchVideos.GetSuggestData(parseInt(limit));
    console.log("Result : ",result);
    const songs = result.item.map(item =>({
      title: item.title,
      videoId: item.id,
      thumbnail: item.thumbnail
    }))

    res.json(songs);

  } catch(error){
    console.log("Error",e);
    res.status(400).json({error: "Error Occured"});
  }

});


app.get('/api/songs', async (req, res) => {
  const { keywords,limit } = req.query;
  console.log(limit)
  if (!keywords) {
      return res.status(400).json({ error: 'Keywords parameter is required' });
  }

  try {
      const result = await searchVideos.GetListByKeyword(keywords, false, parseInt(limit) );
      console.log("List",result)
      const songs = result.items.map(item => ({
          title: item.title,
          videoId: item.id,
          thumbnail: item.thumbnail
      }));
      // console.log(songs2,"Sonfs")


      // const searchResults =await ytSearch({ query: keywords });
      // // console.log(searchResults)

      // const songs = searchResults.videos.slice(0, 5).map(video => 
      //    ({
      //     title: video.title,
      //     artist: video.author.name,
      //     videoId: video.videoId,
      //     // thumbnail: video.thumbnail,
      //     // image: video.image,
      //     author: video.author,
      //     date: video.uploadDate
      // }));

      res.json(songs);
  } catch (error) {
      console.error('Error fetching songs:', error);
      res.status(500).json({ error: 'An error occurred while fetching songs' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

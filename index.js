import express from "express"
import cors from "cors"
import multer from "multer"
import { v4 as uuidv4 } from "uuid"
import path from "path"
import fs from "fs"
import {exec} from "child_process" // watch out
import { stderr, stdout } from "process"

const app = express()

//multer middleware

const storage = multer.diskStorage({
  destination: function(req, file, cb){
    cb(null, "./uploads")
  },
  filename: function(req, file, cb){
    cb(null, file.fieldname + "-" + file.originalname + path.extname(file.originalname))
  }
})

// multer configuration
const upload = multer({storage: storage})

//route
app.use(
  cors({
    origin: ["http://localhost:8000"],
    credentials: true
  })
) 

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*") // watch it
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next()
})

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use("/uploads", express.static("uploads"))

app.post("/upload", upload.single('file'), function(req, res){
  const videoPath = req.file.path
  console.log(`videoPath ${videoPath}`)
  const { scale, bitrateVideo, bitrateAudio } = req.body;
  const logo = `./logo`
  const outputPath = `./outputs`

  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, {recursive: true})
  }

  // ffmpeg
  // const ffmpegCommand = `ffmpeg -i ${videoPath} -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputPath}/segment%03d.ts" -start_number 0 ${hlsPath}`;  /** ffmpeg transcoding and packaging */
  // const ffmpegCommand = `ffmpeg -i ${videoPath} -vf "scale=-2:${scale}" -c:v libx264 -b:v ${bitrateVideo}k -c:a aac -b:a ${bitrateAudio}k "${outputPath}/output_360p.mp4"`; /** ffmpeg transcoding video only*/
  const ffmpegCommand = `ffmpeg -i ${videoPath} -i "${logo}/toffee-vertical-logo-high-res.png" -filter_complex "[1:v]scale=iw*0.1:-1[logo];[0:v][logo]overlay=main_w-overlay_w-10:10" -c:v libx264 -b:v 800k -c:a aac -b:a 96k "${outputPath}/output_360p.mp4" && ffmpeg -i ${videoPath} -i "${logo}/toffee-vertical-logo-high-res.png" -filter_complex "[1:v]scale=iw*0.1:-1[logo];[0:v][logo]overlay=main_w-overlay_w-10:10" -c:v libx264 -b:v 1200k -c:a aac -b:a 128k "${outputPath}/output_480p.mp4" && ffmpeg -i ${videoPath} -i "${logo}/toffee-vertical-logo-high-res.png" -filter_complex "[1:v]scale=iw*0.1:-1[logo];[0:v][logo]overlay=main_w-overlay_w-10:10" -c:v libx264 -b:v 2500k -c:a aac -b:a 128k "${outputPath}/output_720p.mp4" && ffmpeg -i ${videoPath} -i "${logo}/toffee-vertical-logo-high-res.png" -filter_complex "[1:v]scale=iw*0.1:-1[logo];[0:v][logo]overlay=main_w-overlay_w-10:10" -c:v libx264 -b:v 5000k -c:a aac -b:a 192k "${outputPath}/output_1080p.mp4"` /** ffmpeg transcoding video with logo*/
  console.log(`ffmpegCommand ${ffmpegCommand}`);

  // no queue because of POC, not to be used in production
  exec(ffmpegCommand, (error, stdout, stderr) => {
    if (error) {
      console.log(`exec error: ${error}`)
    }
    // console.log(`stdout: ${stdout}`)
    // console.log(`stderr: ${stderr}`)
    // const videoUrl = `http://localhost:8000/uploads/outputs/${lessonId}/manifest.m3u8`;

    res.json({
      message: "Video transcoded successfully",
      ffmpegCommand: ffmpegCommand,
      // lessonId: lessonId
    })
  })
})

app.post("/package", function(req, res){
  const inputPath = `./uploads/outputs`
  const { audioKeyId, audioKey, audioKeyIv, hdKeyId, hdKey, hdKeyIv, sdKeyId, sdKey, sdKeyIv, } = req.body;
  const outputPath = `./uploads/outputs/packager_outputs`

  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, {recursive: true})
  }

  // shaka packager
  const packagerhlsCommand = `packager in="${inputPath}/output_360p.mp4",stream=audio,output="${outputPath}/audio.mp4",drm_label=AUDIO in="${inputPath}/output_360p.mp4",stream=video,output="${outputPath}/h264_360p.mp4",drm_label=AUDIO in="${inputPath}/output_480p.mp4",stream=video,output="${outputPath}/h264_480p.mp4",drm_label=AUDIO in="${inputPath}/output_720p.mp4",stream=video,output="${outputPath}/h264_720p.mp4",drm_label=AUDIO in="${inputPath}/output_1080p.mp4",stream=video,output="${outputPath}/h264_1080p.mp4",drm_label=AUDIO --protection_scheme cbcs --enable_raw_key_encryption --keys label=AUDIO:key_id=${audioKeyId}:key=${audioKey}:iv=${audioKeyIv} --protection_systems FairPlay --hls_master_playlist_output="${outputPath}/h264_master.m3u8" --hls_key_uri="skd://${audioKeyId}"`  /** for hls content*/
  // const packagerDashCommand = `packager in="${inputPath}/output_360p.mp4",stream=audio,output="${outputPath}/audio.mp4",drm_label=AUDIO in="${inputPath}/output_360p.mp4",stream=video,output="${outputPath}/h264_360p.mp4",drm_label=SD in="${inputPath}/output_480p.mp4",stream=video,output="${outputPath}/h264_480p.mp4",drm_label=SD in="${inputPath}/output_720p.mp4",stream=video,output="${outputPath}/h264_720p.mp4",drm_label=HD in="${inputPath}/output_1080p.mp4",stream=video,output="${outputPath}/h264_1080p.mp4",drm_label=HD --enable_raw_key_encryption --keys label=AUDIO:key_id=${audioKeyId}:key=${audioKey}:iv=${audioKeyIv},label=SD:key_id=${sdKeyId}:key=${sdKey}:iv=${sdKeyIv},label=HD:key_id=${hdKeyId}:key=${hdKey}:iv=${hdKeyIv} --mpd_output "${outputPath}/h264.mpd"`   /** for hls content*/
  // console.log(packagerCommand);```

  // no queue because of POC, not to be used in production
  exec(packagerhlsCommand, (error, stdout, stderr) => {   //before running packageCommand, remove hls or dash in between the variable name.
    if (error) {
      console.log(`exec error: ${error}`)
    }
    console.log(`packager: success`)
    // console.log(`stdout: ${stdout}`)
    // console.log(`stderr: ${stderr}`)
    // const videoUrl = `http://localhost:8000/uploads/outputs/${lessonId}/manifest.m3u8`;

    res.json({
      message: "Video packaged successfully",
      packagerCommand: packagerhlsCommand,
      // lessonId: lessonId
    })
  })
})

app.listen(8000, function(){
  console.log("App is listening at port 8000...")
})
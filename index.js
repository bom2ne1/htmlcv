require('dotenv').config();
const SSL_KEY_PATH = process.env.SSL_KEY_PATH;
const SSL_CERT_PATH = process.env.SSL_CERT_PATH;
const SSL_CHAIN_PATH = process.env.SSL_CHAIN_PATH;
const IGNORE_IP = process.env.IGNORE_IP;
const UPLOAD_PATH = process.env.UPLOAD_PATH;
const CACHE_EXPIRY_TIME = process.env.CACHE_EXPIRY_TIME;

const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const { v4: uuidv4 } = require('uuid');
const cookieParser = require('cookie-parser');

const multer = require('multer');

const app = express();
const HTTP_PORT = 80;
const HTTPS_PORT = 443;

const ipCache = new Map();


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_PATH);
    },
    filename: (req, file, cb) => {
        const filename = `${req.visitorInfo.location.city}-${req.visitorInfo.location.country}-${fsSafeDatetimeString()}.webm`;
        cb(null, filename);
    }
});

const upload = multer({ storage });
if (!fs.existsSync(UPLOAD_PATH)) {
    fs.mkdirSync(UPLOAD_PATH);
}

function fsSafeDatetimeString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const datetimeString = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;

    return datetimeString;
}

app.use(express.json());
app.use(cookieParser());

app.use(async (req, res, next) => {
    let nowDate = new Date();
    var visitorIp = req.ip.replace('::ffff:', '');

    let sessionId = req.cookies['session_id'];
    if (!sessionId) {
        sessionId = uuidv4();
        res.cookie('session_id', sessionId, { httpOnly: true });
    }

    req.visitorInfo = {
        session_id: sessionId,
        ip_raw: req.ip,
        ip: visitorIp,
        url: req.originalUrl,
        method: req.method,
        timestamp: nowDate.toISOString(),
        timestamp_sydney: nowDate.toLocaleString(),
        location: null,
    };

    if (ipCache.has(visitorIp)) {
        req.visitorInfo.location = ipCache.get(visitorIp).location;
    } else {
        try {
            const response = await fetch(`http://ip-api.com/json/${visitorIp}`);
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'success') {
                    const location = {
                        city: data.city,
                        region: data.regionName,
                        country: data.country,
                        lat: data.lat,
                        lon: data.lon,
                    };

                    req.visitorInfo.location = location;

                    ipCache.set(visitorIp, {
                        location,
                        timeout: setTimeout(() => {
                            ipCache.delete(visitorIp);
                        }, CACHE_EXPIRY_TIME),
                    });
                }
            }
        } catch (error) {
            console.error('Failed to fetch location:', error.message);
        }
    }

    var sitePages = [
        "/log",
        "/styles.css",
        "/script.js",
        "/gameScript.js",
        "/sprites/wall2.png",
        "/sprites/taxman.png",
        "/sprites/blood2.png",
        "/sprites/zogspear.png",
    ]

    if (req.visitorInfo.ip == IGNORE_IP) {
        return next();
    }

    fs.appendFile(path.join(__dirname, 'visitor_logs.json'), JSON.stringify(req.visitorInfo) + ',\n', (err) => {
        if (err) console.error('Failed to write log:', err);
    });

    if (sitePages.includes(req.visitorInfo.url)) {
        const logMessage = `${req.visitorInfo.timestamp_sydney} - From ${req.visitorInfo.location.city}, ${req.visitorInfo.location.country} (${req.visitorInfo.session_id} | ${req.visitorInfo.ip}) - ${req.visitorInfo.method} - ${req.visitorInfo.url}\n`;
        console.log(logMessage.trim());
    }

    next();
});
app.use(express.static(path.join(__dirname, 'public')));
app.use('/.well-known/acme-challenge', express.static(path.join(__dirname, '.well-known', 'acme-challenge')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/log', (req, res) => {
    const logData = {
        ...req.body,
        ...req.visitorInfo,
    };

    if (req.visitorInfo.ip == IGNORE_IP) {
        return res.send({ success: true });
    }

    const orderedLogData = {
        timestamp_sydney: logData.timestamp_sydney,
        session_id: logData.session_id,
        ip: logData.ip,
        loc: `${logData.location.city}, ${logData.location.country}`,
        ...logData,
    };

    console.log(`Event logged for user from ${req.visitorInfo.location.city}, ${req.visitorInfo.location.country} (${req.visitorInfo.session_id})):`, orderedLogData);

    fs.appendFile(
        path.join(__dirname, 'event_logs.json'),
        JSON.stringify(orderedLogData) + ',\n',
        (err) => {
            if (err) console.error('Failed to write event log:', err);
        }
    );

    res.send({ success: true });
});

// app.get('/joelcaleycv.docx', (req, res) => {
//     const filename = req.params.filename;
//     const filePath = path.join(__dirname, 'files', filename);

//     // Send the file to the user
//     res.download(filePath, filename, (err) => {
//         if (err) {
//             console.error("Error while sending file:", err);
//             res.status(500).send('Error while downloading the file.');
//         }
//     });
// });

app.get('/grinch', (req, res) => {
    const grinchFilePath = path.join(__dirname, 'public', 'How.the.Grinch.Stole.Christmas.1966.1080p.PCOK.WEB-DL.AAC.2.0.H.264-output-optimized.mp4');
    fs.stat(grinchFilePath, (err, stats) => {
        if (err) {
            console.error('Error retrieving file stats:', err);
            return res.status(404).send('File not found.');
        }

        const fileSize = stats.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            if (start >= fileSize || end >= fileSize) {
                return res.status(416).send('Requested range not satisfiable');
            }

            const chunkSize = end - start + 1;
            const fileStream = fs.createReadStream(grinchFilePath, { start, end });

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': 'video/mp4'
            });

            fileStream.pipe(res);
        } else {
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4'
            });

            fs.createReadStream(grinchFilePath).pipe(res);
        }
    });
});

app.post('/submit-feedback', (req, res) => {
    const feedback = req.body.feedback;
    const feedbackData = {
        ...req.body,
        ...req.visitorInfo
    };

    if (!feedback) {
        // return res.status(400).send({ message: 'Feedback is required' });
    }

    fs.appendFile(
        path.join(__dirname, 'feedback.json'),
        JSON.stringify(feedbackData) + ',\n',
        (err) => {
            if (err) console.error('Failed to save feedback:', err);
        }
    );

    res.send({ success: true });
});

app.post('/submit-video-feedback', upload.single('video'), (req, res) => {
    if (!req.file) {
        return res.status(400).send({ message: 'No video file uploaded' });
    }

    const logData = {
        filename: req.file.filename,
        ...req.visitorInfo
    };


    fs.appendFile(
        path.join(__dirname, UPLOAD_PATH, `${req.file.filename}.json`),
        JSON.stringify(logData),
        (err) => {
            if (err) console.error('Failed to write event log:', err);
        }
    );


    console.log(`Video feedback received: ${req.file.filename}; From: ${req.visitorInfo.location.city}, ${req.visitorInfo.location.country} (${req.visitorInfo.session_id})`);
    res.send({ message: 'Video feedback submitted successfully' });
});









app.use('/cloudwave-code-challenge', express.static(path.join(__dirname, 'dist')));

app.get('/cloudwave-code-challenge', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get('/cloudwave-code-challenge/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});














http.createServer(app).listen(HTTP_PORT, () => {
    console.log(`HTTP server running at http://localhost:${HTTP_PORT}`);
});

try {
    const sslOptions = {
        key: fs.readFileSync(path.join(__dirname, SSL_KEY_PATH)),
        cert: fs.readFileSync(path.join(__dirname, SSL_CERT_PATH)),
        ca: fs.readFileSync(path.join(__dirname, SSL_CHAIN_PATH))
    };

    https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
        console.log(`HTTPS server running at https://localhost:${HTTPS_PORT}`);
    });
} catch (error) {
    for (var i = 10 - 1; i >= 0; i--) {
        console.log('SSL certificates not found. HTTPS server not started.');
    }
}
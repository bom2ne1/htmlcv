const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

const isPhone = /Mobi|Android/i.test(navigator.userAgent);
const isTablet = /Tablet|iPad/i.test(navigator.userAgent);
const deviceType = isPhone ? 'Phone' : isTablet ? 'Tablet' : 'Desktop';

const browserInfo = {
    userAgent: navigator.userAgent,
    appName: navigator.appName,
    appVersion: navigator.appVersion,
    platform: navigator.platform,
    language: navigator.language,
    languages: navigator.languages
};

const screenInfo = {
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio
};

const connectionInfo = navigator.connection || {};
const connectionDetails = {
    effectiveType: connectionInfo.effectiveType || 'unknown',
    downlink: connectionInfo.downlink || 'unknown',
    rtt: connectionInfo.rtt || 'unknown'
};

const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

const timeZoneInfo = {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timeZoneOffset: new Date().getTimezoneOffset()
};

const hardwareInfo = {
    deviceMemory: navigator.deviceMemory || 'unknown',
    hardwareConcurrency: navigator.hardwareConcurrency || 'unknown'
};

const storageInfo = {
    cookiesEnabled: navigator.cookieEnabled,
    localStorageSupported: typeof window.localStorage !== 'undefined',
    sessionStorageSupported: typeof window.sessionStorage !== 'undefined'
};

const userInfo = {
    isMobile,
    browserInfo,
    screenInfo,
    connectionDetails,
    hasTouch,
    timeZoneInfo,
    hardwareInfo,
    storageInfo,
    deviceType,
    timestamp: new Date().toISOString()
};

if (isMobile) {
    console.log("is mobile . hide game, particles, etc");
} else {
    console.log("is not mobile .");
}

function debounce(fn, ms) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), ms);
    };
}

function logEvent(eventType, eventData) {

    console.log('loggingEvent', eventType, eventData)
    fetch('/log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({

                type: eventType,
                data: eventData,
                timestamp: new Date().toISOString(),
            }),
        })
        .then(response => response.json())
        .then(data => console.log(eventType, 'Log sent successfully:', data))
        .catch(error => console.error(eventType, 'Error logging event:', error));
}

document.addEventListener('DOMContentLoaded', () => {
    logEvent('page_load', { message: 'Page loaded successfully' });
    logEvent('userInfo', { userInfo });
});

document.addEventListener('click', (e) => {
    const target = e.target;
    const tagName = target.tagName.toLowerCase();
    const id = target.id ? `#${target.id}` : '';
    const classes = target.classList.length > 0 ? `.${Array.from(target.classList).join('.')}` : '';
    logEvent('click', { x: e.clientX, y: e.clientY, target: `${tagName}${id}${classes}` });
});

var logScroll = debounce((eventType, eventData) => logEvent(eventType, eventData), 500);
var logMandelBrot = debounce((eventType, eventData) => logEvent(eventType, eventData), 500);

document.addEventListener('scroll', (e) => {
    logScroll('scroll', { scrollX: window.scrollX, scrollY: window.scrollY });
});

let mediaRecorder;
let recordedChunks = [];
let videoBlob;
let videoURL;
let stream;
let isRecording = false;
const videoElement = document.getElementById('feedback-video');


function checkSubmitButtonStatus() {
    if (document.getElementById('feedback-name').value || document.getElementById('feedback-email').value || document.getElementById('feedback-input').value || videoBlob) {
        document.getElementById('submit-feedback').disabled = false;
    } else {
        document.getElementById('submit-feedback').disabled = true;
    }
}

document.getElementById('feedback-name').addEventListener('input', () => {
    checkSubmitButtonStatus()
});

document.getElementById('feedback-email').addEventListener('input', () => {
    checkSubmitButtonStatus()
});

document.getElementById('feedback-input').addEventListener('input', () => {
    checkSubmitButtonStatus()
});


document.getElementById('minimize-feedback').addEventListener('click', () => {
    const container = document.getElementById('feedback-container');
    container.classList.toggle('minimized');
    const isMinimized = container.classList.contains('minimized');
    document.getElementById('minimize-feedback').textContent = isMinimized ? '+' : '-';
});

async function submitFeedback() {
    const name = document.getElementById('feedback-name').value;
    const email = document.getElementById('feedback-email').value;
    const feedback = document.getElementById('feedback-input').value;

    if (videoBlob) {
        const formData = new FormData();
        formData.append('video', videoBlob, 'feedback.webm');

        try {
            const response = await fetch('/submit-video-feedback', {
                method: 'POST',
                body: formData,
            });

        } catch (error) {
            alert('An error occurred. Please try again later.');
            console.error(error);
        }
/*
        document.getElementById('toggle-recording').textContent = 'Record Video Message';
        document.getElementById('delete-video-feedback').style.display = 'none';
        videoElement.pause();
        videoElement.currentTime = 0;
        videoElement.style.display = 'none';*/
    }

    if (!videoBlob && !name && !email && !feedback.trim()) {
        alert("womp womp. there's nothing to submit");
        return;
    }

    try {
        const response = await fetch('/submit-feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, feedback }),
        });

        if (response.ok) {
            alert('Thank you for your feedback!');
            document.getElementById('feedback-name').value = '';
            document.getElementById('feedback-email').value = '';
            document.getElementById('feedback-input').value = '';
            
            videoBlob = null;
            videoURL = null;

            videoElement.pause();
            videoElement.currentTime = 0;
            videoElement.style.display = 'none';

            document.getElementById('delete-video-feedback').style.display = 'none';
            document.getElementById('toggle-recording').textContent = 'Record Video Message';
            isRecording = false;
            // document.getElementById('submit-feedback').style.display = 'none'; 
            // document.getElementById('submit-feedback').disabled = true;
            checkSubmitButtonStatus()
        } else {
            alert('Failed to submit feedback. Please try again later.');
        }
    } catch (error) {
        alert('An error occurred. Please try again later.');
    }
}

document.getElementById('submit-feedback').addEventListener('click', async () => {
    if (isRecording) {
        mediaRecorder.stop();
        stream.getTracks().forEach(track => track.stop());
        document.getElementById('toggle-recording').textContent = 'Record Again';
        isRecording = false;
    }
    requestAnimationFrame(submitFeedback)

});

document.getElementById('delete-video-feedback').addEventListener('click', () => {

    videoBlob = null;
    videoURL = null;

    videoElement.pause();
    videoElement.currentTime = 0;
    videoElement.style.display = 'none';

    document.getElementById('delete-video-feedback').style.display = 'none';
    document.getElementById('toggle-recording').textContent = 'Record Video Message';
    isRecording = false;

    checkSubmitButtonStatus();
});

document.getElementById('toggle-recording').addEventListener('click', async () => {
    if (isRecording) {

        mediaRecorder.stop();
        stream.getTracks().forEach(track => track.stop());
        document.getElementById('toggle-recording').textContent = 'Record Again';
    } else {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            videoElement.style.display = 'inline-block';
            videoElement.srcObject = stream;
            videoElement.muted = true;
            videoElement.controls = false;

            mediaRecorder = new MediaRecorder(stream);
            recordedChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
                videoURL = URL.createObjectURL(videoBlob);

                videoElement.srcObject = null;
                videoElement.src = videoURL;
                videoElement.muted = false;
                videoElement.controls = true;
                videoElement.load();
                videoElement.play();
                document.getElementById('delete-video-feedback').style.display = 'inline-block';

                // document.getElementById('submit-feedback').disabled = false;
                checkSubmitButtonStatus();

            };

            mediaRecorder.start();
            document.getElementById('toggle-recording').textContent = 'Stop Recording';
        } catch (error) {
            alert('Error accessing webcam/microphone. Please check permissions.');
            console.error(error);
        }
    }

    isRecording = !isRecording;
});
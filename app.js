let stream = null;
let autoDetectInterval = null;
let uploadedImage = null;

// Test API connection
async function testConnection() {
    const apiUrl = document.getElementById('apiUrl').value;
    const status = document.getElementById('connectionStatus');
    
    if (!apiUrl) {
        status.textContent = '❌ Please enter API URL';
        status.style.color = 'red';
        return;
    }
    
    try {
        const response = await fetch(`${apiUrl}/health`, {
            method: 'GET',
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });
        
        const data = await response.json();
        
        if (data.status === 'healthy') {
            status.textContent = '✅ Connected';
            status.style.color = 'green';
            localStorage.setItem('apiUrl', apiUrl);
        }
    } catch (error) {
        status.textContent = '❌ Connection failed';
        status.style.color = 'red';
        console.error('Connection error:', error);
    }
}

// Load saved API URL
window.onload = function() {
    const savedUrl = localStorage.getItem('apiUrl');
    if (savedUrl) {
        document.getElementById('apiUrl').value = savedUrl;
    }
};

// Start webcam
async function startWebcam() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
        });
        
        const video = document.getElementById('webcam');
        video.srcObject = stream;
        
        document.getElementById('startWebcam').disabled = true;
        document.getElementById('stopWebcam').disabled = false;
        document.getElementById('captureBtn').disabled = false;
        document.getElementById('autoDetect').disabled = false;
        
    } catch (error) {
        alert('Error accessing webcam: ' + error.message);
        console.error('Webcam error:', error);
    }
}

// Stop webcam
function stopWebcam() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        document.getElementById('webcam').srcObject = null;
        
        document.getElementById('startWebcam').disabled = false;
        document.getElementById('stopWebcam').disabled = true;
        document.getElementById('captureBtn').disabled = true;
        
        if (autoDetectInterval) {
            clearInterval(autoDetectInterval);
            document.getElementById('autoDetect').checked = false;
        }
    }
}

// Capture frame and predict
async function captureAndPredict() {
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = canvas.toDataURL('image/jpeg');
    await sendImageToAPI(imageData);
}

// Send image to API
async function sendImageToAPI(imageData) {
    const apiUrl = document.getElementById('apiUrl').value;
    
    if (!apiUrl) {
        alert('Please enter API URL first!');
        return;
    }
    
    try {
        const response = await fetch(`${apiUrl}/predict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ image_base64: imageData })
        });
        
        const result = await response.json();
        displayResults(result);
        
    } catch (error) {
        alert('Prediction error: ' + error.message);
        console.error('API error:', error);
    }
}

// Preview uploaded image
function previewImage() {
    const file = document.getElementById('imageUpload').files[0];
    const preview = document.getElementById('preview');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedImage = e.target.result;
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            document.getElementById('uploadBtn').disabled = false;
        };
        reader.readAsDataURL(file);
    }
}

// Upload and predict
async function uploadAndPredict() {
    if (!uploadedImage) {
        alert('Please select an image first!');
        return;
    }
    
    await sendImageToAPI(uploadedImage);
}

// Display results
function displayResults(result) {
    const resultsDiv = document.getElementById('results');
    const statusLabel = document.getElementById('statusLabel');
    const confidence = document.getElementById('confidence');
    const confidenceBar = document.getElementById('confidenceBar');
    const probsList = document.getElementById('probsList');
    
    resultsDiv.style.display = 'block';
    
    const status = result.predicted_class;
    statusLabel.textContent = status.toUpperCase();
    
    if (status === 'alert') {
        statusLabel.style.color = '#4CAF50';
    } else if (status === 'tired') {
        statusLabel.style.color = '#F44336';
    } else {
        statusLabel.style.color = '#FF9800';
    }
    
    const conf = result.confidence.toFixed(2);
    confidence.textContent = `${conf}%`;
    confidenceBar.style.width = `${conf}%`;
    confidenceBar.style.backgroundColor = status === 'alert' ? '#4CAF50' : 
                                          status === 'tired' ? '#F44336' : '#FF9800';
    
    probsList.innerHTML = '';
    for (const [className, prob] of Object.entries(result.probabilities)) {
        const probDiv = document.createElement('div');
        probDiv.className = 'prob-item';
        probDiv.innerHTML = `
            <span>${className}:</span>
            <div class="prob-bar">
                <div style="width: ${prob}%; background: #2196F3;"></div>
            </div>
            <span>${prob.toFixed(2)}%</span>
        `;
        probsList.appendChild(probDiv);
    }
    
    resultsDiv.scrollIntoView({ behavior: 'smooth' });
}

// Auto-detect toggle
document.getElementById('autoDetect').addEventListener('change', function() {
    if (this.checked) {
        autoDetectInterval = setInterval(captureAndPredict, 2000);
    } else {
        if (autoDetectInterval) {
            clearInterval(autoDetectInterval);
        }
    }
});

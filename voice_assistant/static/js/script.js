// --------- DOM Elements ---------
const micBtn = document.getElementById('mic-btn');
const statusText = document.getElementById('status-text');
const statusDots = document.getElementById('status-dots');
const recognizedText = document.getElementById('recognized-text');
const assistantAction = document.getElementById('assistant-action');

// Route Metrics Elements
const metricTime = document.getElementById('metric-time');
const metricCost = document.getElementById('metric-cost');
const metricExpanded = document.getElementById('metric-expanded');
const metricAlgo = document.getElementById('metric-algo');

// Canvas Elements
const canvas = document.getElementById('network-canvas');
const ctx = canvas.getContext('2d');

// --------- State Variables ---------
// Audio
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });

// Graph
let graphData = null;
let animationFrame = null;
const NODE_RADIUS = 8;
const COLORS = {
    defaultNode: '#64748b',
    expandedNode: '#f59e0b',
    pathNode: '#10b981',
    sourceNode: '#3b82f6',
    targetNode: '#ef4444',
    defaultEdge: '#334155',
    pathEdge: '#10b981'
};


// --------- Initialization ---------
async function init() {
    try {
        const response = await fetch('/api/graph'); // Fetching from self (Flask merges BOTH now)
        graphData = await response.json();
        drawGraph();
    } catch (error) {
        console.error("Error fetching graph:", error);
    }
}


// --------- Graph Rendering ---------
function drawGraph(expandedSet = new Set(), pathSet = new Set(), pathEdges = new Set(), sourceNode = null, targetNode = null) {
    if (!graphData) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all edges first
    for (const [nodeId, neighbors] of Object.entries(graphData.adjacency)) {
        const startNode = graphData.nodes[nodeId];
        neighbors.forEach(neighbor => {
            const endNode = graphData.nodes[neighbor.node];
            const isPathEdge = pathEdges.has(`${nodeId}-${neighbor.node}`) || pathEdges.has(`${neighbor.node}-${nodeId}`);

            ctx.beginPath();
            ctx.moveTo(startNode.x, startNode.y);
            ctx.lineTo(endNode.x, endNode.y);
            ctx.strokeStyle = isPathEdge ? COLORS.pathEdge : COLORS.defaultEdge;
            ctx.lineWidth = isPathEdge ? 3 : 1;
            ctx.stroke();

            if (isPathEdge) {
                const midX = (startNode.x + endNode.x) / 2;
                const midY = (startNode.y + endNode.y) / 2;
                ctx.fillStyle = '#94a3b8';
                ctx.font = '10px Arial';
                ctx.fillText(neighbor.weight, midX, midY - 5);
            }
        });
    }

    // Draw all nodes
    for (const [nodeId, node] of Object.entries(graphData.nodes)) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, NODE_RADIUS, 0, 2 * Math.PI);

        if (nodeId === sourceNode) {
            ctx.fillStyle = COLORS.sourceNode;
            ctx.shadowColor = COLORS.sourceNode;
            ctx.shadowBlur = 10;
        } else if (nodeId === targetNode) {
            ctx.fillStyle = COLORS.targetNode;
            ctx.shadowColor = COLORS.targetNode;
            ctx.shadowBlur = 10;
        } else if (pathSet.has(nodeId)) {
            ctx.fillStyle = COLORS.pathNode;
            ctx.shadowBlur = 0;
        } else if (expandedSet.has(nodeId)) {
            ctx.fillStyle = COLORS.expandedNode;
            ctx.shadowBlur = 0;
        } else {
            ctx.fillStyle = COLORS.defaultNode;
            ctx.shadowBlur = 0;
        }

        ctx.fill();
        ctx.shadowBlur = 0; // reset

        // Draw label for source/target/path only for cleanliness
        if (nodeId === sourceNode || nodeId === targetNode || pathSet.has(nodeId)) {
            ctx.fillStyle = '#fff';
            ctx.font = '12px Inter';
            ctx.fillText(nodeId, node.x + 12, node.y + 4);
        }
    }
}


// --------- Audio Capture & Voice API ---------
micBtn.addEventListener('click', async () => {
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
});

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks);
            audioChunks = [];
            setStatus('Processing', true);

            try {
                // Convert WEBM blob to standard WAV
                const wavBlob = await convertBlobToWav(audioBlob);
                await sendAudioToServer(wavBlob);
            } catch (err) {
                console.error("Audio conversion/upload error", err);
                setStatus('Error: Processing Failed', false);
            }
        };

        mediaRecorder.start();
        isRecording = true;
        micBtn.classList.add('listening');
        setStatus('Listening...', false);
        audioChunks = [];

        // Reset Assitant Texts
        recognizedText.textContent = '...';
        assistantAction.textContent = '...';

    } catch (err) {
        console.error("Microphone access denied:", err);
        setStatus('Mic Access Denied', false);
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    isRecording = false;
    micBtn.classList.remove('listening');
}

function setStatus(text, showDots) {
    statusText.textContent = text;
    if (showDots) statusDots.classList.remove('hidden');
    else statusDots.classList.add('hidden');
}

async function sendAudioToServer(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'record.wav');

    try {
        const response = await fetch('/api/recognize', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        setStatus('Ready', false);

        if (result.success) {
            recognizedText.textContent = `"${result.text}"`;
            assistantAction.textContent = result.action;
            handleIntent(result.intent, result.action, result.data);
        } else {
            recognizedText.textContent = "Error";
            assistantAction.textContent = result.error || "Failed to recognize speech.";
        }
    } catch (error) {
        console.error("Network error:", error);
        setStatus('Ready', false);
        recognizedText.textContent = "Network Error";
    }
}

// --------- Action Handler ---------
function handleIntent(intent, actionText, dataPayload) {
    if (intent === 'open_website') {
        let url = "";
        if (actionText.toLowerCase().includes("google")) url = "https://www.google.com";
        else if (actionText.toLowerCase().includes("youtube")) url = "https://www.youtube.com";
        if (url) setTimeout(() => window.open(url, '_blank'), 1000);

    } else if (intent === 'search') {
        const queryMatch = actionText.match(/for: '(.*)'/);
        if (queryMatch && queryMatch[1]) {
            setTimeout(() => window.open(`https://www.google.com/search?q=${encodeURIComponent(queryMatch[1])}`, '_blank'), 1000);
        }

    } else if (intent === 'find_route' && dataPayload && dataPayload.source && dataPayload.target) {
        // Trigger Route Finding visually
        metricAlgo.textContent = dataPayload.algorithm === 'astar' ? "A* Search" : "Best First Search";
        metricAlgo.style.background = dataPayload.algorithm === 'astar' ? "#8b5cf6" : "#0ea5e9";

        requestPathComputation(dataPayload.source, dataPayload.target, dataPayload.algorithm);
    }
}

// --------- Path computation & Animation ---------
async function requestPathComputation(source, target, algorithm) {
    if (animationFrame) cancelAnimationFrame(animationFrame);

    // Reset Graph briefly
    drawGraph(new Set(), new Set(), new Set(), source, target);

    metricTime.textContent = "Computing...";
    metricCost.textContent = "--";
    metricExpanded.textContent = "--";

    try {
        const response = await fetch('/api/route', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source, target, algorithm })
        });
        const result = await response.json();

        if (response.ok) {
            metricTime.textContent = `${result.execution_time_ms} ms`;
            metricCost.textContent = result.cost === null ? "Infinity" : result.cost;
            metricExpanded.textContent = result.nodes_expanded;

            animateSearch(result.expanded_sequence, result.path, source, target);
        } else {
            console.error(result.error);
            assistantAction.textContent = "Routing failed: Invalid nodes or unreachable target.";
        }
    } catch (error) {
        console.error("Error computing route:", error);
    }
}

function animateSearch(expandedSequence, finalPath, sourceNode, targetNode) {
    let expandedIndex = 0;
    const expandedSet = new Set();
    const pathSet = new Set();
    const pathEdges = new Set();

    function step() {
        if (expandedIndex < expandedSequence.length) {
            for (let i = 0; i < 2; i++) {
                if (expandedIndex < expandedSequence.length) {
                    expandedSet.add(expandedSequence[expandedIndex]);
                    expandedIndex++;
                }
            }
            drawGraph(expandedSet, pathSet, pathEdges, sourceNode, targetNode);
            animationFrame = requestAnimationFrame(step);
        } else {
            finalPath.forEach(node => pathSet.add(node));
            for (let i = 0; i < finalPath.length - 1; i++) {
                pathEdges.add(`${finalPath[i]}-${finalPath[i + 1]}`);
            }
            drawGraph(expandedSet, pathSet, pathEdges, sourceNode, targetNode);
        }
    }
    animationFrame = requestAnimationFrame(step);
}

// --------- WAV Converter Utility ---------
async function convertBlobToWav(blob) {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const numOfChannels = 1;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1;
    const bitDepth = 16;

    let channelData = audioBuffer.getChannelData(0);

    const dataByteLength = channelData.length * (bitDepth / 8);
    const bufferLength = 44 + dataByteLength;
    const arrayBufferWav = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBufferWav);

    function writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataByteLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numOfChannels * (bitDepth / 8), true);
    view.setUint16(32, numOfChannels * (bitDepth / 8), true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataByteLength, true);

    let offset = 44;
    for (let i = 0; i < channelData.length; i++) {
        let sample = Math.max(-1, Math.min(1, channelData[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
    }

    return new Blob([view], { type: 'audio/wav' });
}

// Start graph load
init();

const canvas = document.getElementById('network-canvas');
const ctx = canvas.getContext('2d');
const sourceSelect = document.getElementById('source-select');
const targetSelect = document.getElementById('target-select');
const computeBtn = document.getElementById('find-route-btn');
const metricTime = document.getElementById('metric-time');
const metricCost = document.getElementById('metric-cost');
const metricExpanded = document.getElementById('metric-expanded');

let graphData = null;
let currentPath = [];
let currentExpanded = [];
let animationFrame = null;

// Graph style constants
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

// Initialize
async function init() {
    try {
        const response = await fetch('http://127.0.0.1:8080/api/graph');
        graphData = await response.json();

        populateDropdowns();
        drawGraph();
    } catch (error) {
        console.error("Error fetching graph:", error);
        alert("Make sure the Python backend is running on port 8080!");
    }
}

function populateDropdowns() {
    const nodes = Object.keys(graphData.nodes);
    nodes.forEach(nodeId => {
        const opt1 = document.createElement('option');
        opt1.value = nodeId;
        opt1.textContent = nodeId;
        sourceSelect.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = nodeId;
        opt2.textContent = nodeId;
        targetSelect.appendChild(opt2);
    });

    // Set different default selections
    if (nodes.length > 1) {
        sourceSelect.selectedIndex = 0;
        targetSelect.selectedIndex = nodes.length - 1;
    }
}

function drawGraph(expandedSet = new Set(), pathSet = new Set(), pathEdges = new Set()) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!graphData) return;

    // Draw all edges first
    for (const [nodeId, neighbors] of Object.entries(graphData.adjacency)) {
        const startNode = graphData.nodes[nodeId];

        neighbors.forEach(neighbor => {
            const endNode = graphData.nodes[neighbor.node];

            // Check if this edge is part of the path
            const isPathEdge = pathEdges.has(`${nodeId}-${neighbor.node}`) || pathEdges.has(`${neighbor.node}-${nodeId}`);

            ctx.beginPath();
            ctx.moveTo(startNode.x, startNode.y);
            ctx.lineTo(endNode.x, endNode.y);
            ctx.strokeStyle = isPathEdge ? COLORS.pathEdge : COLORS.defaultEdge;
            ctx.lineWidth = isPathEdge ? 3 : 1;
            ctx.stroke();

            // Draw weight text if it's part of path for clarity
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
    const sourceNode = sourceSelect.value;
    const targetNode = targetSelect.value;

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

        // Draw label for source/target/path
        if (nodeId === sourceNode || nodeId === targetNode || pathSet.has(nodeId)) {
            ctx.fillStyle = '#fff';
            ctx.font = '12px Inter';
            ctx.fillText(nodeId, node.x + 12, node.y + 4);
        }
    }
}

async function computeRoute() {
    if (animationFrame) cancelAnimationFrame(animationFrame);

    const source = sourceSelect.value;
    const target = targetSelect.value;
    const algorithm = document.querySelector('input[name="algorithm"]:checked').value;

    if (source === target) {
        alert("Source and Destination cannot be the same.");
        return;
    }

    computeBtn.disabled = true;
    computeBtn.textContent = "Computing...";

    // Reset metrics
    metricTime.textContent = "-- ms";
    metricCost.textContent = "--";
    metricExpanded.textContent = "--";

    try {
        const response = await fetch('http://127.0.0.1:8080/api/route', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source, target, algorithm })
        });

        const result = await response.json();

        if (response.ok) {
            metricTime.textContent = `${result.execution_time_ms} ms`;
            metricCost.textContent = result.cost === null ? "Infinity" : result.cost;
            metricExpanded.textContent = result.nodes_expanded;

            animateSearch(result.expanded_sequence, result.path);
        } else {
            alert(result.error);
        }
    } catch (error) {
        console.error("Error computing route:", error);
        alert("Failed to communicate with the server.");
    } finally {
        computeBtn.disabled = false;
        computeBtn.textContent = "Compute Route";
    }
}

function animateSearch(expandedSequence, finalPath) {
    let expandedIndex = 0;
    const expandedSet = new Set();
    const pathSet = new Set();
    const pathEdges = new Set();

    function step() {
        if (expandedIndex < expandedSequence.length) {
            // Animating expansion
            for (let i = 0; i < 2; i++) { // Speed up animation by doing 2 at a time
                if (expandedIndex < expandedSequence.length) {
                    expandedSet.add(expandedSequence[expandedIndex]);
                    expandedIndex++;
                }
            }
            drawGraph(expandedSet, pathSet, pathEdges);
            animationFrame = requestAnimationFrame(step);
        } else {
            // Done expanding, show final path
            finalPath.forEach(node => pathSet.add(node));

            for (let i = 0; i < finalPath.length - 1; i++) {
                pathEdges.add(`${finalPath[i]}-${finalPath[i + 1]}`);
            }

            drawGraph(expandedSet, pathSet, pathEdges);
        }
    }

    // Start animation step
    animationFrame = requestAnimationFrame(step);
}

// Event Listeners
computeBtn.addEventListener('click', computeRoute);
sourceSelect.addEventListener('change', () => drawGraph());
targetSelect.addEventListener('change', () => drawGraph());

// Run init
init();

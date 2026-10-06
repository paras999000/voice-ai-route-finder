# Intelligent Route Finder using Heuristic Search

## Industry Problem Context
In the IT industry, finding an optimal route between locations natively applies to challenges spanning logistics, delivery platforms, navigation systems, cloud network routing, and data center traffic optimizations. The fundamental objective is to minimize cost variables—such as distance, bandwidth, travel time, or latency—in a real-time, scalable infrastructure.

## Our Approach
This project acts as an industry-standard proof-of-concept for Heuristic Search optimization.
The system models realistic locations as nodes in a graph with mathematical coordinate representations, and edges (paths) containing a weighted cost calculation representing real-world distances or "traffic" penalties (dynamically generated during simulation).

### Core Search Algorithms Implemented
- **A* Search (Optimal)**: Uses `f(n) = g(n) + h(n)` where `h(n)` is our Euclidean Distance heuristic. Identifies the lowest possible cost path mathematically achievable.
- **Best First Search (Greedy)**: Uses `f(n) = h(n)` heavily prioritizing speed over route optimality. It consistently seeks the neighbor "closest" to the target via the heuristic without thoroughly comparing path accumulations, rapidly yielding a route even if it incurs a higher actual cost.

## Project Architecture
- **Backend (Python & Flask)**: A lightweight REST API server responsible for the graph generation (creating nodes, pseudo-random edges simulating varied traffic states) and high-speed execution of the graph theory algorithms on demand.
- **Frontend (HTML/JS/CSS Canvas)**: A professional visualization dashboard presenting the entire problem state visually. It handles user interactions, renders the graph manually via HTML5 Canvas, and strictly animates the "nodes expanded" sequence sent from the server, showcasing clearly the difference in computational behavior between A* and Best First routing logic.
- **Metrics Evaluated**:
  - `Execution Time (ms)`
  - `Path Cost (Total Traveled Weight)`
  - `Nodes Expanded` (A visual indicator of algorithmic efficiency/thoroughness computations)

## How to Run the Project

1. **Prerequisites**: Ensure you have Python 3 installed.
2. **Install Dependencies**:
   Navigate into this project's directory (`route_finder`) in your terminal and execute:
   ```bash
   pip install -r requirements.txt
   ```
3. **Start the API Server**:
   ```bash
   python app.py
   ```
4. **Launch Application**:
   Open a modern web browser and visit `http://127.0.0.1:8080/`. You will be presented with the interactive dashboard.

## Industry Demonstration Flow
1. Open the dashboard. Wait for the graph nodes (gray circles) and edges (dark lines) to construct.
2. Select a `Source Node` on one far side of the map, and a `Destination Node` on the opposing side.
3. Select **Best First Search** and click `Compute Route`.
   - Observe how aggressively the algorithm dives towards the target. 
   - Note the Execution Time and Nodes Expanded.
4. Change the selection to **A* Search** and compute again.
   - Observe how it visually explores alternate pathways mathematically to guarantee the cheapest path.
   - You will see the Path Cost will either remain optimal, or aggressively improve compared to the Best First Search execution.

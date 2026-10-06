# AI Voice Assistant with Intelligent Route Finder

A comprehensive web application that merges an **AI Voice Assistant** with a simulated industry **Intelligent Route Finder**. Users can command the system verbally to open websites, search the web, or instruct it to calculate optimal or fast routes across a complex graph network using Heuristic Search Algorithms.

## Features
- **Voice Commands**: 
  - Greet the user ("Hello", "Hi").
  - Open websites ("Open Google", "Open YouTube").
  - Search the web ("Search for Python").
  - **Graph Routing**: "Find a route from Node 3 to Node 12 using Best First search".
- **Intelligent Routing Algorithms**:
  - **A* Search**: Guaranteed shortest path using Euclidean distance heuristics.
  - **Best First Search (Greedy)**: Rapid computation, prioritizing node expansion speed over the ultimate lowest cost.
- **Dynamic Visualization**: A custom HTML5 Canvas renders the city graph, edges, traffic weights, and animates algorithm computation in real-time.
- **Robust Audio Capture**: Leverages the `MediaRecorder` API and converts `WebM/Opus` audio blobs to pure `WAV` via Web Audio API so Python can decode it natively.

## Project Structure
- `app.py`: Flask backend managing the routing logic, the unified UI, and the NLP pattern matching against the Google Speech Recognition API.
- `search_algorithms.py`: Contains the actual A* and Best First Heuristic Search routines.
- `requirements.txt`: Python dependencies (`Flask`, `SpeechRecognition`, `Flask-CORS`, `networkx`).
- `templates/index.html`: The integrated, dark-themed dashboard UI containing the Voice Assistant microphone and the visual map canvas side-by-side.
- `static/css/style.css`: Professional UI layout styles.
- `static/js/script.js`: Audio recording logic, API fetch logic, and Canvas graph rendering animations.

## How to Run

1. **Install Python**: Make sure you have Python 3.7+ installed.
2. **Install Dependencies**: Open a terminal in this directory and run:
   ```bash
   pip install -r requirements.txt
   ```
3. **Start the Application**:
   ```bash
   python app.py
   ```
4. **Open in Browser**:
   Navigate to `http://127.0.0.1:5000` in your web browser. Make sure you allow microphone permissions when prompted.
5. **Test Commands**:
   Click the microphone button and firmly command the system:
   - *"Find route from Node 4 to Node 16 using A Star Search"*
   - *"Search for artificial intelligence"*
   - *"Open YouTube website"*

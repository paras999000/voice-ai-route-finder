import os
import math
import random
import speech_recognition as sr
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from search_algorithms import a_star_search, best_first_search
import re

app = Flask(__name__)
CORS(app)
recognizer = sr.Recognizer()

# Generate a realistic-looking city graph
def generate_city_graph(num_nodes=30, connection_radius=300):
    graph = {
        'nodes': {},
        'adjacency': {}
    }
    
    # Create nodes with random coordinates
    for i in range(num_nodes):
        node_id = f"Node_{i}"
        graph['nodes'][node_id] = {
            'x': random.randint(50, 750),
            'y': random.randint(50, 550),
            'label': node_id
        }
        graph['adjacency'][node_id] = []
        
    for node1, data1 in graph['nodes'].items():
        for node2, data2 in graph['nodes'].items():
            if node1 != node2:
                dist = math.hypot(data2['x'] - data1['x'], data2['y'] - data1['y'])
                if dist < connection_radius:
                    traffic_penalty = random.uniform(1.0, 2.5)
                    weight = dist * traffic_penalty
                    if len(graph['adjacency'][node1]) < 4:
                        existing_connections = [n['node'] for n in graph['adjacency'][node1]]
                        if node2 not in existing_connections:
                            graph['adjacency'][node1].append({
                                'node': node2,
                                'weight': round(weight, 2),
                                'distance': round(dist, 2)
                            })
                            
    nodes_list = list(graph['nodes'].keys())
    for _ in range(num_nodes // 3):
        n1 = random.choice(nodes_list)
        n2 = random.choice(nodes_list)
        if n1 != n2:
             dist = math.hypot(graph['nodes'][n2]['x'] - graph['nodes'][n1]['x'], graph['nodes'][n2]['y'] - graph['nodes'][n1]['y'])
             weight = dist * 1.2
             graph['adjacency'][n1].append({'node': n2, 'weight': round(weight, 2), 'distance': round(dist, 2)})
             graph['adjacency'][n2].append({'node': n1, 'weight': round(weight, 2), 'distance': round(dist, 2)})

    return graph

city_graph = generate_city_graph(45, 180)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/graph', methods=['GET'])
def get_graph():
    return jsonify(city_graph)

@app.route('/api/route', methods=['POST'])
def calculate_route():
    data = request.json
    source = data.get('source')
    target = data.get('target')
    algorithm = data.get('algorithm')
    
    if not source or not target or source not in city_graph['nodes'] or target not in city_graph['nodes']:
        return jsonify({'error': 'Invalid source or target nodes'}), 400
        
    if algorithm == 'astar':
        result = a_star_search(city_graph, source, target)
    elif algorithm == 'bestfirst':
        result = best_first_search(city_graph, source, target)
    else:
        return jsonify({'error': 'Unknown algorithm. Use "astar" or "bestfirst"'}), 400
        
    return jsonify({
        'path': result['path'],
        'cost': round(result['cost'], 2),
        'execution_time_ms': round(result['execution_time_ms'], 4),
        'nodes_expanded': result['nodes_expanded'],
        'expanded_sequence': result['expanded_sequence'],
        'algorithm': algorithm
    })

@app.route('/api/recognize', methods=['POST'])
def recognize_speech():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided', 'success': False}), 400

    audio_file = request.files['audio']
    temp_path = "temp_audio.wav"
    audio_file.save(temp_path)

    try:
        with sr.AudioFile(temp_path) as source:
            audio_data = recognizer.record(source)
        
        text = recognizer.recognize_google(audio_data)
        text = text.lower()

        command_intent = "unknown"
        action = None
        data_payload = {}

        if "route" in text or "path" in text:
            command_intent = "find_route"
            
            # Simple NLP extraction for numbers representing Node IDs
            numbers = re.findall(r'\d+', text)
            if len(numbers) >= 2:
                source_node = f"Node_{numbers[0]}"
                target_node = f"Node_{numbers[1]}"
                algorithm = "astar" if "a star" in text or "a*" in text else "bestfirst"
                
                action = f"Finding route from {source_node} to {target_node} using {algorithm} search."
                data_payload = {
                    'source': source_node,
                    'target': target_node,
                    'algorithm': algorithm
                }
            else:
                action = "I heard you want a route, but couldn't parse the exact node numbers. Please say e.g., 'Find route from Node 3 to Node 10.'"
                
        elif "hello" in text or "hi" in text or "greetings" in text:
            command_intent = "greeting"
            action = "Hello! I am your AI Mini Assistant."
        elif "open" in text and ("google" in text or "website" in text or "youtube" in text):
            command_intent = "open_website"
            website = "google.com"
            if "youtube" in text: website = "youtube.com"
            action = f"Opening {website}..."
        elif "search" in text or "find" in text:
            command_intent = "search"
            query = text.replace('search', '').replace('find', '').replace('for', '').strip()
            action = f"Searching the web for: '{query}'"
        else:
            command_intent = "display_text"
            action = f"I heard you say: '{text}'"

        response = {
            'text': text,
            'intent': command_intent,
            'action': action,
            'accuracy': 'High (Google Speech API)',
            'success': True,
            'data': data_payload
        }
    except sr.UnknownValueError:
        response = {'error': 'Could not understand the audio.', 'success': False}
    except sr.RequestError as e:
        response = {'error': f'API unavailable: {e}', 'success': False}
    except Exception as e:
        response = {'error': str(e), 'success': False}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    return jsonify(response)

if __name__ == '__main__':
    app.run(debug=True, port=5000)

from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import math
import random
from search_algorithms import a_star_search, best_first_search

app = Flask(__name__)
CORS(app)

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
        
    # Create edges based on distance
    for node1, data1 in graph['nodes'].items():
        for node2, data2 in graph['nodes'].items():
            if node1 != node2:
                # Calculate distance
                dist = math.hypot(data2['x'] - data1['x'], data2['y'] - data1['y'])
                
                # If they are close enough, connect them
                if dist < connection_radius:
                    # Apply a random traffic penalty multiplier between 1.0 and 2.5
                    traffic_penalty = random.uniform(1.0, 2.5)
                    weight = dist * traffic_penalty
                    
                    # Add edge (directed, but we do this for all pairs making it bidirectional with varying traffic)
                    # We limit the number of connections to prevent a massive web (simulate roads)
                    if len(graph['adjacency'][node1]) < 4:
                        # Append the edge
                        # Ensure we don't already have this connection
                        existing_connections = [n['node'] for n in graph['adjacency'][node1]]
                        if node2 not in existing_connections:
                            graph['adjacency'][node1].append({
                                'node': node2,
                                'weight': round(weight, 2),
                                'distance': round(dist, 2)
                            })
                            
    # Ensure graph is mostly fully connected by adding some random long distance highways
    nodes_list = list(graph['nodes'].keys())
    for _ in range(num_nodes // 3):
        n1 = random.choice(nodes_list)
        n2 = random.choice(nodes_list)
        if n1 != n2:
             dist = math.hypot(graph['nodes'][n2]['x'] - graph['nodes'][n1]['x'], graph['nodes'][n2]['y'] - graph['nodes'][n1]['y'])
             weight = dist * 1.2 # fast highway
             graph['adjacency'][n1].append({'node': n2, 'weight': round(weight, 2), 'distance': round(dist, 2)})
             graph['adjacency'][n2].append({'node': n1, 'weight': round(weight, 2), 'distance': round(dist, 2)})

    return graph

# Our static instance of the map for this server run
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

if __name__ == '__main__':
    app.run(debug=True, port=8080)

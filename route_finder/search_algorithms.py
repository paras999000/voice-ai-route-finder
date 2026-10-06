import math
import time
import heapq

def heuristic(node1, node2, graph):
    """
    Calculate the Euclidean distance between two nodes.
    We assume the graph dict has coordinates under 'nodes'[node_id] -> {'x': float, 'y': float}
    """
    try:
        x1, y1 = graph['nodes'][node1]['x'], graph['nodes'][node1]['y']
        x2, y2 = graph['nodes'][node2]['x'], graph['nodes'][node2]['y']
        return math.hypot(x2 - x1, y2 - y1)
    except KeyError:
        return 0 # Fallback if coordinates are missing

def a_star_search(graph, start, goal):
    """
    A* Search Algorithm
    f(n) = g(n) + h(n)
    Returns: path, cost, execution_time_ms, nodes_expanded
    """
    start_time = time.perf_counter()
    
    # Priority queue stores (f_score, g_score, current_node, path)
    open_set = []
    heapq.heappush(open_set, (0, 0, start, [start]))
    
    # Tracks the best g_score for each node
    g_scores = {start: 0}
    nodes_expanded = 0
    expanded_sequence = []

    while open_set:
        f_score, current_g, current, path = heapq.heappop(open_set)
        
        # Skip if we found a better path to 'current' earlier
        if current_g > g_scores.get(current, float('inf')):
            continue
            
        nodes_expanded += 1
        expanded_sequence.append(current)

        if current == goal:
            execution_time_ms = (time.perf_counter() - start_time) * 1000
            return {
                'path': path,
                'cost': current_g,
                'execution_time_ms': execution_time_ms,
                'nodes_expanded': nodes_expanded,
                'expanded_sequence': expanded_sequence
            }

        # Expand neighbors
        for neighbor in graph['adjacency'].get(current, []):
            weight = neighbor['weight']
            next_node = neighbor['node']
            new_g = current_g + weight
            
            if new_g < g_scores.get(next_node, float('inf')):
                g_scores[next_node] = new_g
                h = heuristic(next_node, goal, graph)
                f = new_g + h
                heapq.heappush(open_set, (f, new_g, next_node, path + [next_node]))

    execution_time_ms = (time.perf_counter() - start_time) * 1000
    return {
        'path': [],
        'cost': float('inf'),
        'execution_time_ms': execution_time_ms,
        'nodes_expanded': nodes_expanded,
        'expanded_sequence': expanded_sequence
    }

def best_first_search(graph, start, goal):
    """
    Greedy Best-First Search Algorithm
    f(n) = h(n)
    Returns: path, cost, execution_time_ms, nodes_expanded
    """
    start_time = time.perf_counter()
    
    # Priority queue stores (h_score, current_node, path, cumulative_cost)
    open_set = []
    initial_h = heuristic(start, goal, graph)
    heapq.heappush(open_set, (initial_h, start, [start], 0))
    
    visited = set()
    nodes_expanded = 0
    expanded_sequence = []

    while open_set:
        h_score, current, path, current_cost = heapq.heappop(open_set)
        
        if current in visited:
            continue
            
        visited.add(current)
        nodes_expanded += 1
        expanded_sequence.append(current)

        if current == goal:
            execution_time_ms = (time.perf_counter() - start_time) * 1000
            return {
                'path': path,
                'cost': current_cost,
                'execution_time_ms': execution_time_ms,
                'nodes_expanded': nodes_expanded,
                'expanded_sequence': expanded_sequence
            }

        # Expand neighbors
        for neighbor in graph['adjacency'].get(current, []):
            next_node = neighbor['node']
            weight = neighbor['weight']
            
            if next_node not in visited:
                h = heuristic(next_node, goal, graph)
                new_cost = current_cost + weight
                heapq.heappush(open_set, (h, next_node, path + [next_node], new_cost))

    execution_time_ms = (time.perf_counter() - start_time) * 1000
    return {
        'path': [],
        'cost': float('inf'),
        'execution_time_ms': execution_time_ms,
        'nodes_expanded': nodes_expanded,
        'expanded_sequence': expanded_sequence
    }

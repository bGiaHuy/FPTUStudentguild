import json
import csv
import sys
import os
import math

def calculate_distance(n1, n2):
    try:
        x1, y1 = float(n1.get('x')), float(n1.get('y'))
        x2, y2 = float(n2.get('x')), float(n2.get('y'))
        return round(math.sqrt((x2 - x1)**2 + (y2 - y1)**2), 2)
    except (TypeError, ValueError):
        return None

def validate_graph(filepath):
    print(f"Validating {filepath}...")
    
    if filepath.endswith('.json'):
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        nodes = data.get('nodes', [])
        edges = data.get('edges', [])
        connectors = data.get('vertical_connectors', [])
        graph_status = data.get('review_status', 'draft')
    else:
        print("Only JSON graph validation is fully implemented in this script.")
        return False

    errors = []
    warnings = []

    # Check for production readiness
    is_prod = graph_status == 'verified'

    # Nodes validation
    node_ids = set()
    node_dict = {}
    for i, n in enumerate(nodes):
        nid = n.get('node_id')
        if not nid or nid == "TODO_HUMAN_FILL":
            errors.append(f"Node at index {i} has invalid/missing node_id.")
            continue
        if nid in node_ids:
            errors.append(f"Duplicate node_id found: {nid}")
        node_ids.add(nid)
        node_dict[nid] = n
        
        if is_prod and n.get('review_status') != 'verified':
            errors.append(f"Graph is marked verified, but node {nid} is {n.get('review_status')}")

    # Vertical connectors validation (they also link nodes)
    # The prompt specified vertical connectors have 'node_ids_by_floor'
    for c in connectors:
        cid = c.get('connector_id')
        if is_prod and c.get('review_status') != 'verified':
            errors.append(f"Graph is verified, but connector {cid} is not.")
        # we treat connected nodes as edges conceptually or just validate they exist
        nmap = c.get('node_ids_by_floor', {})
        for fl, cnid in nmap.items():
            if cnid not in node_ids:
                errors.append(f"Connector {cid} references missing node {cnid} on floor {fl}")

    # Edges validation
    seen_edges = set()
    connected_nodes = set()
    
    for i, e in enumerate(edges):
        eid = e.get('edge_id')
        if not eid or eid == "TODO_HUMAN_FILL":
            errors.append(f"Edge at index {i} has invalid/missing edge_id.")
            continue
            
        u, v = e.get('from_node_id'), e.get('to_node_id')
        if u not in node_ids:
            errors.append(f"Edge {eid} references missing from_node_id: {u}")
        if v not in node_ids:
            errors.append(f"Edge {eid} references missing to_node_id: {v}")
            
        if is_prod and e.get('review_status') != 'verified':
            errors.append(f"Graph is marked verified, but edge {eid} is {e.get('review_status')}")

        if u in node_ids and v in node_ids:
            connected_nodes.add(u)
            connected_nodes.add(v)
            
            # Floor check (edges must be on same floor unless vertical type)
            n1, n2 = node_dict[u], node_dict[v]
            if n1.get('floor') != n2.get('floor') and e.get('type') not in ['stair', 'elevator']:
                errors.append(f"Edge {eid} connects different floors but is not a stair/elevator.")
            
            # Auto-calculate weight
            w = e.get('weight')
            if w is None or str(w).strip() == "":
                dist = calculate_distance(n1, n2)
                if dist is not None:
                    e['weight'] = dist
                    warnings.append(f"Auto-calculated weight {dist} for edge {eid}")
                else:
                    warnings.append(f"Edge {eid} has missing weight and endpoints lack x/y coordinates.")

        # Duplicate edge check
        edge_pair = tuple(sorted([str(u), str(v)]))
        if edge_pair in seen_edges:
            warnings.append(f"Duplicate edge detected between {u} and {v} (Edge {eid})")
        seen_edges.add(edge_pair)

    # Isolated nodes check
    isolated = node_ids - connected_nodes
    if isolated:
        # Some nodes might only be connected via vertical connectors
        connector_nodes = set()
        for c in connectors:
            connector_nodes.update(c.get('node_ids_by_floor', {}).values())
        
        truly_isolated = isolated - connector_nodes
        for iso in truly_isolated:
            warnings.append(f"Isolated node detected: {iso}")

    # Output
    for w in warnings:
        print(f"[WARNING] {w}")
    for err in errors:
        print(f"[ERROR] {err}")

    if errors:
        print("\nValidation FAILED.")
        sys.exit(1)
    else:
        print("\nValidation PASSED.")
        # The prompt said auto-calculate weight but "do not write to DB / modify map geometry". 
        # We can write it back to the JSON file if it's just the route graph.
        # But for safety, we just print the auto-calculated weights as warnings.
        sys.exit(0)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python validate_route_graph.py <path_to_json_or_csv>")
        sys.exit(1)
    validate_graph(sys.argv[1])

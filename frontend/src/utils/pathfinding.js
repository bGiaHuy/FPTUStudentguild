/**
 * Dijkstra's algorithm for indoor routing.
 * DO NOT wire this to the public UI until graph review_status is 'verified'.
 * 
 * @param {Object} graph - The JSON route graph (must have nodes and edges)
 * @param {string} startNodeId 
 * @param {string} endNodeId 
 * @returns {Object} Route result { nodeIds, distance, floors, instructions }
 */
export function findPath(graph, startNodeId, endNodeId) {
  if (!graph || !graph.nodes || !graph.edges) {
    throw new Error("Invalid graph data");
  }

  // Build adjacency list
  const adj = {};
  const nodeMap = {};

  graph.nodes.forEach(n => {
    adj[n.node_id] = [];
    nodeMap[n.node_id] = n;
  });

  graph.edges.forEach(e => {
    if (!adj[e.from_node_id]) adj[e.from_node_id] = [];
    if (!adj[e.to_node_id]) adj[e.to_node_id] = [];

    const w = typeof e.weight === 'number' ? e.weight : 1; // Fallback weight
    adj[e.from_node_id].push({ to: e.to_node_id, weight: w, edge: e });
    
    if (e.bidirectional) {
      adj[e.to_node_id].push({ to: e.from_node_id, weight: w, edge: e });
    }
  });

  // Vertical connectors conceptually act as zero or fixed-weight edges if not explicitly modeled in edges array.
  // The graph specification implies we should also link vertical_connectors if they exist.
  if (graph.vertical_connectors) {
    graph.vertical_connectors.forEach(vc => {
      const nodeIds = Object.values(vc.node_ids_by_floor || {});
      // Create a clique of connections for this vertical connector
      for (let i = 0; i < nodeIds.length; i++) {
        for (let j = i + 1; j < nodeIds.length; j++) {
          const u = nodeIds[i];
          const v = nodeIds[j];
          if (!adj[u]) adj[u] = [];
          if (!adj[v]) adj[v] = [];
          
          adj[u].push({ to: v, weight: 10, type: vc.type, connector: vc }); // Base weight for stairs/elevator
          adj[v].push({ to: u, weight: 10, type: vc.type, connector: vc });
        }
      }
    });
  }

  // Priority Queue (min-heap approximation via simple sorting for small graphs)
  const dist = {};
  const prev = {};
  const pq = [];

  graph.nodes.forEach(n => {
    dist[n.node_id] = Infinity;
    prev[n.node_id] = null;
  });

  if (!dist.hasOwnProperty(startNodeId)) {
    return { nodeIds: [], distance: 0, floors: [], instructions: ["Điểm bắt đầu không hợp lệ."] };
  }
  if (!dist.hasOwnProperty(endNodeId)) {
    return { nodeIds: [], distance: 0, floors: [], instructions: ["Điểm kết thúc không hợp lệ."] };
  }

  dist[startNodeId] = 0;
  pq.push({ id: startNodeId, d: 0 });

  while (pq.length > 0) {
    // Sort to get min distance
    pq.sort((a, b) => a.d - b.d);
    const curr = pq.shift();

    if (curr.id === endNodeId) break;
    if (curr.d > dist[curr.id]) continue;

    const neighbors = adj[curr.id] || [];
    for (const edge of neighbors) {
      const newDist = dist[curr.id] + edge.weight;
      if (newDist < dist[edge.to]) {
        dist[edge.to] = newDist;
        prev[edge.to] = { id: curr.id, edgeContext: edge };
        pq.push({ id: edge.to, d: newDist });
      }
    }
  }

  // Reconstruct path
  if (dist[endNodeId] === Infinity) {
    return { nodeIds: [], distance: 0, floors: [], instructions: ["Không tìm thấy đường đi."] };
  }

  const path = [];
  let curr = endNodeId;
  while (curr) {
    path.unshift(curr);
    if (prev[curr]) {
      curr = prev[curr].id;
    } else {
      curr = null;
    }
  }

  // Extract floors visited
  const floorsSet = new Set();
  path.forEach(id => {
    const n = nodeMap[id];
    if (n && n.floor) floorsSet.add(n.floor);
  });

  // Basic instructions (Mock placeholder for future implementation)
  const instructions = ["Bắt đầu từ " + startNodeId];
  if (floorsSet.size > 1) {
    instructions.push("Sử dụng cầu thang/thang máy để di chuyển giữa các tầng.");
  }
  instructions.push("Đến " + endNodeId);

  return {
    nodeIds: path,
    distance: dist[endNodeId],
    floors: Array.from(floorsSet),
    instructions: instructions
  };
}

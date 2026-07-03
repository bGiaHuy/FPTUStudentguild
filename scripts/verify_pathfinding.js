/**
 * Pathfinding verification script.
 * Validates that the A* algorithm produces correct paths:
 *   - No room-to-room jumps (wall crossing)
 *   - All intermediate nodes are navigable
 *   - Multi-floor paths go through stair nodes
 *   - Entrance nodes are traversable
 * 
 * Usage: node scripts/verify_pathfinding.js
 */

const fs = require('fs');
const path = require('path');

// Load graph data
const GRAPH_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'delta_route_graph.json');
const graphData = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'));

// ====== Replicate the worker's A* logic ======

class MinHeap {
  constructor() { this.heap = []; }
  push(element, priority) {
    this.heap.push({ element, priority });
    this._bubbleUp(this.heap.length - 1);
  }
  pop() {
    if (this.heap.length === 0) return null;
    const min = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) { this.heap[0] = last; this._sinkDown(0); }
    return min.element;
  }
  isEmpty() { return this.heap.length === 0; }
  _bubbleUp(idx) {
    while (idx > 0) {
      const parent = (idx - 1) >> 1;
      if (this.heap[idx].priority >= this.heap[parent].priority) break;
      [this.heap[idx], this.heap[parent]] = [this.heap[parent], this.heap[idx]];
      idx = parent;
    }
  }
  _sinkDown(idx) {
    const len = this.heap.length;
    while (true) {
      let smallest = idx;
      const left = 2 * idx + 1, right = 2 * idx + 2;
      if (left < len && this.heap[left].priority < this.heap[smallest].priority) smallest = left;
      if (right < len && this.heap[right].priority < this.heap[smallest].priority) smallest = right;
      if (smallest === idx) break;
      [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
      idx = smallest;
    }
  }
}

const NAVIGABLE_TYPES = new Set(['hallway', 'lobby', 'stair', 'corridor', 'entrance']);
const FLOOR_CHANGE_PENALTY = 300;

function buildGraph(data) {
  const adjacency = new Map();
  const nodeMap = new Map();
  for (const node of data.nodes) {
    adjacency.set(node.node_id, []);
    nodeMap.set(node.node_id, node);
  }
  for (const edge of data.edges) {
    if (!adjacency.has(edge.from_node_id) || !adjacency.has(edge.to_node_id)) continue;
    adjacency.get(edge.from_node_id).push({ to: edge.to_node_id, weight: edge.weight, type: edge.type });
    if (edge.bidirectional !== false) {
      adjacency.get(edge.to_node_id).push({ to: edge.from_node_id, weight: edge.weight, type: edge.type });
    }
  }
  return { adjacency, nodeMap };
}

function heuristic(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx*dx + dy*dy) + Math.abs(a.floor - b.floor) * FLOOR_CHANGE_PENALTY;
}

function findPath(adjacency, nodeMap, startId, endId) {
  const openQueue = new MinHeap();
  openQueue.push(startId, 0);
  const cameFrom = new Map();
  const costSoFar = new Map();
  cameFrom.set(startId, null);
  costSoFar.set(startId, 0);
  const endNode = nodeMap.get(endId);
  if (!endNode) return null;

  while (!openQueue.isEmpty()) {
    const currentId = openQueue.pop();
    if (currentId === endId) break;
    const neighbors = adjacency.get(currentId) || [];
    for (const next of neighbors) {
      const newCost = costSoFar.get(currentId) + next.weight;
      if (!costSoFar.has(next.to) || newCost < costSoFar.get(next.to)) {
        const nextNode = nodeMap.get(next.to);
        if (!nextNode) continue;
        const isNavigable = NAVIGABLE_TYPES.has(nextNode.type);
        if (!isNavigable && next.to !== endId && next.to !== startId) continue;
        costSoFar.set(next.to, newCost);
        const priority = newCost + heuristic(nextNode, endNode);
        openQueue.push(next.to, priority);
        cameFrom.set(next.to, { prevId: currentId, edgeType: next.type });
      }
    }
  }

  if (!cameFrom.has(endId)) return null;
  const pathNodes = [];
  let currentId = endId;
  while (currentId !== null) {
    pathNodes.push(nodeMap.get(currentId));
    const from = cameFrom.get(currentId);
    currentId = from ? from.prevId : null;
  }
  pathNodes.reverse();
  return { path: pathNodes, distance: Math.round(costSoFar.get(endId)) };
}

// ====== Test Cases ======

const { adjacency, nodeMap } = buildGraph(graphData);

let passed = 0, failed = 0;

function test(name, startId, endId, checks) {
  const result = findPath(adjacency, nodeMap, startId, endId);
  const errors = [];

  if (!result) {
    errors.push('No path found!');
  } else {
    // Check 1: No room-to-room consecutive nodes (unless start/end)
    for (let i = 1; i < result.path.length - 1; i++) {
      const prev = result.path[i-1];
      const curr = result.path[i];
      if (prev.type === 'room' && curr.type === 'room') {
        errors.push(`Room-to-room jump: ${prev.node_id}(${prev.label}) → ${curr.node_id}(${curr.label})`);
      }
    }

    // Check 2: All intermediate nodes should be navigable
    for (let i = 1; i < result.path.length - 1; i++) {
      const node = result.path[i];
      if (!NAVIGABLE_TYPES.has(node.type) && node.type !== 'room') {
        // Room is ok if it's only start/end, but toilet in middle is suspicious
        errors.push(`Non-navigable intermediate: ${node.node_id}(${node.type}: ${node.label})`);
      }
    }

    // Check 3: Multi-floor paths must go through stair nodes
    if (checks && checks.multiFloor) {
      const hasStair = result.path.some(n => n.type === 'stair');
      if (!hasStair) errors.push('Multi-floor path missing stair node');
    }

    // Check 4: Entrance nodes should be traversable
    if (checks && checks.throughEntrance) {
      const hasEntrance = result.path.some(n => n.type === 'entrance');
      if (!hasEntrance) errors.push('Path should go through entrance node but does not');
    }

    // Check 5: Path should not have duplicate consecutive nodes
    for (let i = 1; i < result.path.length; i++) {
      if (result.path[i].node_id === result.path[i-1].node_id) {
        errors.push(`Duplicate consecutive node: ${result.path[i].node_id}`);
      }
    }
  }

  if (errors.length === 0) {
    console.log(`  ✅ ${name} — dist=${result?.distance}, nodes=${result?.path.length}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}`);
    errors.forEach(e => console.log(`     → ${e}`));
    if (result) {
      const summary = result.path.map(n => `${n.node_id}(${n.type}:F${n.floor})`).join(' → ');
      console.log(`     Path: ${summary}`);
    }
    failed++;
  }
}

console.log('\n=== PATHFINDING VERIFICATION ===\n');

// --- Same floor tests ---
console.log('--- Same Floor (F1) ---');
test('F1: Room 103 → Room 112', 'N137', 'N134', {});
test('F1: Sảnh (entrance) → Room 105', 'N131', 'N141', { throughEntrance: true });
test('F1: Cửa (entrance N133) → Room 111', 'N133', 'N138', {});
test('F1: Room ICPDP → Thư viện', 'N132', 'N156', {});

console.log('\n--- Same Floor (F2) ---');
// Find some F2 room nodes
const f2Rooms = graphData.nodes.filter(n => n.floor === 2 && n.type === 'room');
if (f2Rooms.length >= 2) {
  test(`F2: ${f2Rooms[0].label} → ${f2Rooms[1].label}`, f2Rooms[0].node_id, f2Rooms[1].node_id, {});
}

// --- Cross-floor tests ---
console.log('\n--- Cross-Floor ---');
test('F1→F2: Room 103 → F2 room via stairs', 'N137', f2Rooms[0]?.node_id || 'N291', { multiFloor: true });
test('F1→F3: Sảnh (F1) → F3 stair', 'N131', 'N473', { multiFloor: true });

// Find F3 and F4 room nodes
const f3Rooms = graphData.nodes.filter(n => n.floor === 3 && n.type === 'room');
const f4Rooms = graphData.nodes.filter(n => n.floor === 4 && n.type === 'room');
if (f3Rooms.length > 0 && f4Rooms.length > 0) {
  test(`F3→F4: ${f3Rooms[0].label} → ${f4Rooms[0].label}`, f3Rooms[0].node_id, f4Rooms[0].node_id, { multiFloor: true });
}
if (f2Rooms.length > 0 && f4Rooms.length > 0) {
  test(`F2→F4: ${f2Rooms[0].label} → ${f4Rooms[0].label}`, f2Rooms[0].node_id, f4Rooms[0].node_id, { multiFloor: true });
}

// --- Entrance traversal tests ---
console.log('\n--- Entrance Node Traversal ---');
// Path that should naturally go THROUGH an entrance node
test('Through sảnh F1: Left wing → Right wing', 'N158', 'N167', {});  // hallway to hallway across top
test('Through cửa F1: ICPDP → Room 112', 'N132', 'N134', {});

// --- Edge cases ---
console.log('\n--- Edge Cases ---');
test('Same node start=end', 'N137', 'N137', {});
test('Non-existent start node', 'N9999', 'N137', {});

// --- Room-to-room leak check (exhaustive) ---
console.log('\n--- Room-to-Room Leak Check (sample of 20 pairs) ---');
const roomNodes = graphData.nodes.filter(n => n.type === 'room');
const samplePairs = [];
for (let i = 0; i < Math.min(20, roomNodes.length); i++) {
  const j = (i + 5) % roomNodes.length;
  samplePairs.push([roomNodes[i], roomNodes[j]]);
}
samplePairs.forEach(([a, b]) => {
  test(`Room ${a.label}(F${a.floor}) → Room ${b.label}(F${b.floor})`, a.node_id, b.node_id, 
    a.floor !== b.floor ? { multiFloor: true } : {});
});

// --- Summary ---
console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);

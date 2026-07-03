const fs = require('fs');
const json = JSON.parse(fs.readFileSync('frontend/public/data/delta_nav_grid.json'));
const floor1 = json.floors['1'];
const width = floor1.width;
const height = floor1.height;
const grid = new Uint8Array(width * height);
let isWalkable = true;
let idx = 0;
for (let i = 0; i < floor1.rle.length; i++) {
  const count = floor1.rle[i];
  if (!isWalkable) {
    for (let j = idx; j < idx + count; j++) {
      grid[j] = 1;
    }
  }
  idx += count;
  isWalkable = !isWalkable;
}
function getNearestWalkable(cx, cy) {
  if (grid[cy * width + cx] !== 1) return {x: cx, y: cy};
  let best = null, minDist = Infinity;
  for(let r=1; r<=100; r++) {
    for(let dy=-r; dy<=r; dy++) {
      for(let dx=-r; dx<=r; dx++) {
        if(Math.abs(dx)!==r && Math.abs(dy)!==r) continue;
        let nx=cx+dx, ny=cy+dy;
        if(nx>=0 && nx<width && ny>=0 && ny<height && grid[ny*width+nx]!==1) {
          let d = Math.abs(dx)+Math.abs(dy);
          if(d < minDist) { minDist=d; best={x:nx, y:ny}; }
        }
      }
    }
    if(best && minDist <= r*1.5) return best;
  }
  return best;
}
const r111 = {x: 104, y: 17}; // DELTA-F1-user-gen-15
const stair1 = {x: 104, y: 20}; // DELTA-F1-user-gen-14
const sPt = getNearestWalkable(r111.x, r111.y);
const ePt = getNearestWalkable(stair1.x, stair1.y);
console.log('Room walkable:', sPt);
console.log('Stair walkable:', ePt);

// A simple flood fill to see if sPt and ePt are connected
let visited = new Set();
let q = [sPt];
visited.add(sPt.x+','+sPt.y);
let found = false;
let ccount = 0;
while(q.length>0) {
  let curr = q.shift();
  ccount++;
  if(curr.x===ePt.x && curr.y===ePt.y) { found=true; break; }
  for(let d of [[0,1],[1,0],[0,-1],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]) {
    let nx=curr.x+d[0], ny=curr.y+d[1];
    if(nx>=0&&nx<width&&ny>=0&&ny<height && grid[ny*width+nx]!==1) {
      let key = nx+','+ny;
      if(!visited.has(key)) {
        visited.add(key);
        q.push({x:nx, y:ny});
      }
    }
  }
}
console.log('Connected by flood fill?', found);
console.log('Visited cells:', ccount);

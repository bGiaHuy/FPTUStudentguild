import json
import math
import os
import sys

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))
DRAFT_PATH = os.path.join(PROJECT_ROOT, "frontend", "public", "data", "delta_draft.json")
OUTPUT_PATH = os.path.join(PROJECT_ROOT, "frontend", "public", "data", "delta_nav_grid.json")

CELL_SIZE = 20
# Define what types of items physically block walking
OBSTACLE_TYPES = {'room', 'office', 'toilet', 'technical_room', 'wall', 'stair', 'elevator', 'door', 'skylight', 'block'}

def rect_intersects_cell(min_x, min_y, max_x, max_y, cx, cy, cell_size):
    cell_min_x = cx * cell_size
    cell_min_y = cy * cell_size
    cell_max_x = cell_min_x + cell_size
    cell_max_y = cell_min_y + cell_size
    
    return not (max_x <= cell_min_x or 
                min_x >= cell_max_x or 
                max_y <= cell_min_y or 
                min_y >= cell_max_y)

def compress_rle(grid, width, height):
    """Compress 2D grid into 1D RLE array starting with 0 (walkable) count"""
    rle = []
    current_val = 0
    run_length = 0
    
    for y in range(height):
        for x in range(width):
            if grid[y][x] == current_val:
                run_length += 1
            else:
                rle.append(run_length)
                current_val = grid[y][x]
                run_length = 1
                
    rle.append(run_length)
    return rle

def find_access_points(grid, grid_width, grid_height, bbox):
    """Find walkable cells just outside the bounding box."""
    min_x = int(math.floor(bbox.get("min_x", 0) / CELL_SIZE))
    min_y = int(math.floor(bbox.get("min_y", 0) / CELL_SIZE))
    max_x = int(math.ceil(bbox.get("max_x", 0) / CELL_SIZE))
    max_y = int(math.ceil(bbox.get("max_y", 0) / CELL_SIZE))
    
    # Clamp to grid boundaries
    min_x = max(0, min_x)
    min_y = max(0, min_y)
    max_x = min(grid_width - 1, max_x)
    max_y = min(grid_height - 1, max_y)
    
    access_points = []
    
    # Check perimeter of the clamped box
    # Top and bottom edges
    for x in range(min_x - 1, max_x + 2):
        for y in [min_y - 1, max_y + 1]:
            if 0 <= x < grid_width and 0 <= y < grid_height:
                if grid[y][x] == 0:
                    access_points.append({"x": x, "y": y})
                    
    # Left and right edges
    for y in range(min_y, max_y + 1):
        for x in [min_x - 1, max_x + 1]:
            if 0 <= x < grid_width and 0 <= y < grid_height:
                if grid[y][x] == 0:
                    access_points.append({"x": x, "y": y})
                    
    # Deduplicate
    unique_points = []
    seen = set()
    for p in access_points:
        key = f"{p['x']},{p['y']}"
        if key not in seen:
            seen.add(key)
            unique_points.append(p)
            
    return unique_points

def main():
    print(f"Loading draft data from {DRAFT_PATH}")
    with open(DRAFT_PATH, "r", encoding="utf-8") as f:
        draft = json.load(f)
        
    nav_data = {
        "cell_size": CELL_SIZE,
        "floors": {}
    }
    
    for floor in draft.get("floors", []):
        fnum = floor.get("floor")
        img_w = floor.get("image_width", 2000) + floor.get("image_min_x", 0)
        img_h = floor.get("image_height", 1500) + floor.get("image_min_y", 0)
        
        grid_w = int(math.ceil(img_w / CELL_SIZE))
        grid_h = int(math.ceil(img_h / CELL_SIZE))
        
        print(f"Floor {fnum}: Image {img_w}x{img_h}, Grid {grid_w}x{grid_h}")
        
        # Initialize grid (0 = walkable)
        grid = [[0 for _ in range(grid_w)] for _ in range(grid_h)]
        
        # Mark obstacles
        items = floor.get("items", [])
        for item in items:
            itype = item.get("item_type", "")
            if itype in OBSTACLE_TYPES:
                bbox = item.get("bbox", {})
                min_x = bbox.get("min_x", 0)
                min_y = bbox.get("min_y", 0)
                max_x = bbox.get("max_x", 0)
                max_y = bbox.get("max_y", 0)
                
                # Rasterize bbox into grid
                start_x = max(0, int(math.floor(min_x / CELL_SIZE)))
                start_y = max(0, int(math.floor(min_y / CELL_SIZE)))
                end_x = min(grid_w - 1, int(math.ceil(max_x / CELL_SIZE)))
                end_y = min(grid_h - 1, int(math.ceil(max_y / CELL_SIZE)))
                
                for y in range(start_y, end_y + 1):
                    for x in range(start_x, end_x + 1):
                        if 0 <= x < grid_w and 0 <= y < grid_h:
                            if rect_intersects_cell(min_x, min_y, max_x, max_y, x, y, CELL_SIZE):
                                grid[y][x] = 1
                            
        # Compute Access Points for all clickable items + stairs/elevators
        access_map = {}
        for item in items:
            iid = item.get("item_id")
            itype = item.get("item_type", "")
            if item.get("is_clickable") or itype in ['stair', 'elevator', 'room', 'office']:
                ap = find_access_points(grid, grid_w, grid_h, item.get("bbox", {}))
                if ap:
                    bbox = item.get("bbox", {})
                    cx = (bbox.get("min_x", 0) + bbox.get("max_x", 0)) / 2
                    cy = (bbox.get("min_y", 0) + bbox.get("max_y", 0)) / 2
                    access_map[iid] = {
                        "type": itype,
                        "points": ap,
                        "center_x": cx,
                        "center_y": cy
                    }
                    
        rle_data = compress_rle(grid, grid_w, grid_h)
        
        nav_data["floors"][fnum] = {
            "width": grid_w,
            "height": grid_h,
            "rle": rle_data,
            "access_points": access_map
        }
        
        print(f"  Generated {len(rle_data)} RLE segments, {len(access_map)} items with access points")
        
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(nav_data, f, ensure_ascii=False, separators=(',', ':'))
        
    print(f"Successfully wrote {OUTPUT_PATH}")

if __name__ == "__main__":
    main()

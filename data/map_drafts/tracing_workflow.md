# SVG Tracing Workflow

The `xlsx_grid_approximation` strategy is officially rejected due to inaccurate room overlays.
Instead, we use a manual tracing workflow to extract exact geometry for each room from the official floor plan images.

## Step 1: Setup the SVG Editor
1. Open an SVG editor like Inkscape or Figma.
2. Import the official floor plan PNG (`mapping/floor1.png` or `mapping/floor3.png`).
3. Set the PNG as a locked background layer. Make sure the document size matches the image dimensions exactly.

## Step 2: Draw the Polygons
1. Create a new layer called `Rooms`.
2. Use the Rectangle or Polygon (Pen) tool to draw shapes over each room, corridor, or point of interest.
3. Ensure boundaries align accurately with the walls.

## Step 3: Name the Shapes (Crucial)
1. For every shape you draw, you must set its **ID** or **Name** to the exact Room Code from the XLSX file.
2. Examples: `321`, `320A`, `C303`, `NVS_Nu`, `Cau_thang`.
3. In Inkscape, open the Object Properties panel (`Shift+Ctrl+O`) and change the `ID` field.
4. In Figma, rename the layer to the room code.

## Step 4: Export the SVG
1. Hide the background image layer (so the SVG only contains the traced vectors, reducing file size).
2. Export as SVG.
3. Save the exported files to `data/map_sources/`:
   - `data/map_sources/delta_floor1_traced.svg`
   - `data/map_sources/delta_floor3_traced.svg`

## Step 5: Process the SVG
Once the SVG files are placed in `data/map_sources/`, run the parser and validation scripts:
```bash
python scripts/parse_traced_delta_svg.py
python scripts/validate_traced_map.py
```
This will compute bounding boxes and polygons, validate the IDs against the XLSX metadata, and generate a draft JSON for QA preview.

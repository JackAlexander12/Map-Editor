AGV Map Editor — Project Overview

This project is a full-stack AGV map editor that allows users to design, visualize, and validate warehouse layouts. It includes a React + Tailwind frontend for map editing and an Express backend for validation and data storage. The application saves and loads a map from Map.json.

Dependencies
Backend (/back)

express – Web framework for defining RESTful endpoints

cors – Enables frontend–backend communication in development

jest, supertest – Testing framework and HTTP test utilities

nodemon – Automatically restarts the development server

Frontend (/frontend)

react, react-dom, vite – Frontend framework and bundler

tailwindcss, postcss, autoprefixer – Styling and layout

axios – HTTP client for API calls

framer-motion – Animations and transitions

lucide-react – Icon components

shadcn/ui – UI component primitives (buttons, cards, modals)

API Endpoints
Map
Method	Endpoint	Description
GET	/api/map	Returns the current map
PUT	/api/map	Replaces the entire map
PATCH	/api/map	Merges in nodes or edges
Nodes
Method	Endpoint	Description
POST	/api/nodes	Adds a new node
POST	/api/nodes/bulk	Adds multiple nodes
PUT	/api/nodes/:code	Updates an existing node (code is immutable)
PATCH	/api/nodes/:code	Partial update
DELETE	/api/nodes/:code	Deletes a node and its connected edges
Edges
Method	Endpoint	Description
GET	/api/edges	Lists all edges
POST	/api/edges	Creates a new edge (axis-aligned)
DELETE	/api/edges	Removes an edge
Validation Rules

Edges must be axis-aligned (share the same X or Y).

Edge length must be greater than 0 and less than or equal to maxNeighborDistance.

Node codes must be unique and immutable.

Editing nodes revalidates all connected edges.

Map.json Structure
{
  "map": {
    "maxNeighborDistance": 1500,
    "bounds": { "minX": 0, "minY": 0, "maxX": 10000, "maxY": 6000 },
    "nodes": [
      {
        "x": 0,
        "y": 0,
        "code": 10001000,
        "name": "Node A",
        "directions": ["North", "South"],
        "charger": { "direction": "North" },
        "chute": { "direction": "West" }
      }
    ],
    "edges": [
      { "from": 10001000, "to": 20001000, "length": 1000 }
    ]
  }
}

Running the Application
Option 1: With Docker
docker compose up --build


Frontend runs on http://localhost:3000

Backend runs on http://localhost:5000

The included Nginx configuration proxies /api/* requests to the backend automatically.

Option 2: Without Docker

Backend

cd back
npm ci
npm run dev
# or npm start


Frontend

cd frontend
npm ci
npm run dev


By default, the frontend connects to the backend at http://localhost:5000.
You can adjust this in src/api.js if needed.

Frontend Functionality

Interactive canvas for adding, moving, and connecting nodes

Nodes snap to grid and display their coordinates

Click two nodes to create an edge

Pan and zoom functionality

Real-time validation errors from backend responses

Importer modal for replacing the map by pasting JSON

Panels and Tools

Toolbar – Load, save, zoom, rotate, and reset controls

Left Panel – Displays all nodes and edges with edit/delete actions

Right Panel – Tool selector and map configuration

Canvas – Main workspace for editing nodes and edges

Keyboard Shortcuts

1 – Pan tool

2 – Add node

3 – Add edge

R – Fit to bounds

[ or ] – Toggle side panels

\ – Toggle left panel

Esc – Cancel current tool

Testing

To run backend tests:

cd back
npm test


Tests cover:

Validation logic for edges and nodes

File read/write behavior

API route handling and integration

import axios from 'axios';
const BASE = 'http://localhost:5000';

export const api = {
  ping: () => axios.get(`${BASE}/works`).then(r => r.data),
  getMap: () => axios.get(`${BASE}/api/map`).then(r => r.data),
  putMap: (payload) => axios.put(`${BASE}/api/map`, payload).then(r => r.data),

  addNode: (node) => axios.post(`${BASE}/api/nodes`, node).then(r => r.data),
  patchNode: (code, patch) => axios.patch(`${BASE}/api/nodes/${code}`, patch).then(r => r.data),
  updateNode: (code, node) => axios.put(`${BASE}/api/nodes/${code}`, node).then(r => r.data),
  deleteNode: (code) => axios.delete(`${BASE}/api/nodes/${code}`).then(r => r.data),

  getEdges: () => axios.get(`${BASE}/api/edges`).then(r => r.data),
  addEdge: ({ from, to }) => axios.post(`${BASE}/api/edges`, { from, to }).then(r => r.data),
  deleteEdge: ({ from, to }) => axios.delete(`${BASE}/api/edges`, { data: { from, to } }).then(r => r.data)
};

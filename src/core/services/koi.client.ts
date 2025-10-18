import { http } from '../../infra/http';

// Swap in mocked data until KOI API is ready
const mockAlgos = [
  { id: 'DCA_SOL', name: 'Daily DCA SOL', minAllocSOL: 0.1, chain: 'sol', desc: 'Buys SOL once/day' },
];

export async function listAlgos() {
  try {
    const res = await http.get('/algos'); // if koi-fish is up
    return res.data;
  } catch {
    return mockAlgos;                      // fallback so bot isn’t blocked
  }
}

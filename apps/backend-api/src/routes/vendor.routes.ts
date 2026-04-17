import { Router } from 'express';
const router = Router();
// TODO: Implement vendor routes
router.get('/', (req, res) => res.json({ success: true, data: [] }));
router.get('/:id', (req, res) => res.json({ success: true, data: {} }));
router.post('/', (req, res) => res.json({ success: true }));
router.put('/:id', (req, res) => res.json({ success: true }));
router.delete('/:id', (req, res) => res.json({ success: true }));
export default router;

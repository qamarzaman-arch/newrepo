import { Router } from 'express';
const router = Router();

// TODO: Implement menu routes
router.get('/categories', (req, res) => res.json({ success: true, data: [] }));
router.get('/items', (req, res) => res.json({ success: true, data: [] }));
router.post('/items', (req, res) => res.json({ success: true }));
router.put('/items/:id', (req, res) => res.json({ success: true }));
router.delete('/items/:id', (req, res) => res.json({ success: true }));

export default router;

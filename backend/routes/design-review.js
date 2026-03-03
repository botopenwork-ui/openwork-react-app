const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

const DATA_FILE = path.join(__dirname, '../data/design-review.json');

// Helper to read data
async function readData() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.writeFile(DATA_FILE, '[]', 'utf8');
            return [];
        }
        throw error;
    }
}

// Helper to write data
async function writeData(data) {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// GET /api/design-review/screens
router.get('/screens', async (req, res) => {
    try {
        const screens = await readData();
        res.json(screens);
    } catch (error) {
        console.error('Error fetching screens:', error);
        res.status(500).json({ message: 'Error fetching screens' });
    }
});

// POST /api/design-review/screens/:id/comments
router.post('/screens/:id/comments', async (req, res) => {
    try {
        const screenId = req.params.id;
        const { author, text } = req.body;
        const timestamp = new Date().toISOString();

        if (!author || !text) {
            return res.status(400).json({ message: 'Author and text are required for comments.' });
        }

        const screens = await readData();
        const screenIndex = screens.findIndex(s => s.id === screenId);

        if (screenIndex === -1) {
            return res.status(404).json({ message: 'Screen not found.' });
        }

        screens[screenIndex].comments.push({ author, text, timestamp });
        await writeData(screens);
        res.status(201).json(screens[screenIndex].comments);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: 'Error adding comment' });
    }
});

// POST /api/design-review/screens/:id/tasks/:taskId/status
router.post('/screens/:id/tasks/:taskId/status', async (req, res) => {
    try {
        const { id: screenId, taskId } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ message: 'Status is required.' });
        }

        const screens = await readData();
        const screenIndex = screens.findIndex(s => s.id === screenId);

        if (screenIndex === -1) {
            return res.status(404).json({ message: 'Screen not found.' });
        }

        const taskIndex = screens[screenIndex].tasks.findIndex(t => t.id === taskId);

        if (taskIndex === -1) {
            return res.status(404).json({ message: 'Task not found.' });
        }

        screens[screenIndex].tasks[taskIndex].status = status;
        await writeData(screens);
        res.json(screens[screenIndex].tasks[taskIndex]);
    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).json({ message: 'Error updating task status' });
    }
});

module.exports = router;

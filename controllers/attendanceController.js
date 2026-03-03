const db = require('../config/db');

exports.markAttendance = async (req, res) => {
    const { status } = req.body; // Present, Absent, Late
    const user = req.user;

    if (!user) {
        return res.status(401).json({ message: 'User not authenticated' });
    }

    if (user.role !== 'Employee') {
        return res.status(403).json({ message: 'Only employees can mark attendance.' });
    }

    if (!status || !['Present', 'Absent', 'Late'].includes(status)) {
        return res.status(400).json({ message: 'Valid status is required (Present, Absent, or Late).' });
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    try {
        // Check if already marked today
        const [existing] = await db.query('SELECT id FROM attendance WHERE user_id = ? AND date = ?', [user.id, today]);
        if (existing.length > 0) {
            return res.status(409).json({ message: 'Attendance already marked for today. Please try again tomorrow.' });
        }

        // Mark attendance
        const [result] = await db.query('INSERT INTO attendance (user_id, date, status) VALUES (?, ?, ?)', [user.id, today, status]);
        
        res.status(201).json({ 
            message: 'Attendance marked successfully.',
            data: {
                id: result.insertId,
                user_id: user.id,
                date: today,
                status: status
            }
        });
    } catch (error) {
        console.error('Attendance marking error:', error);
        
        // Handle duplicate entry error specifically
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Attendance already marked for today!' });
        }
        
        res.status(500).json({ message: 'Failed to mark attendance. Please try again.' });
    }
};

exports.getAttendance = async (req, res) => {
    const user = req.user;

    try {
        let query = '';
        let params = [];

        if (user.role === 'Admin' || user.role === 'Manager') {
            query = 'SELECT attendance.*, users.name, users.email FROM attendance JOIN users ON attendance.user_id = users.id';
            if (req.query.user_id) {
                query += ' WHERE attendance.user_id = ?';
                params = [req.query.user_id];
            }
        } else { // Employee
            query = 'SELECT * FROM attendance WHERE user_id = ?';
            params = [user.id];
        }

        const [records] = await db.query(query, params);
        res.json(records);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.exportReport = async (req, res) => {
    const user = req.user;
    if (user.role === 'Employee') {
        return res.status(403).json({ message: 'Access denied.' });
    }

    try {
        const [records] = await db.query(`
            SELECT users.name, users.email, attendance.date, attendance.status
            FROM attendance
            JOIN users ON attendance.user_id = users.id
            ORDER BY attendance.date DESC
        `);
        res.json(records);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
};
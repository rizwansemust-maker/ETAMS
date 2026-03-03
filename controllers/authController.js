const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    const { name, email, password, role, department } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ message: 'Name, email, password and role are required.' });
    }

    try {
        // Check if email already exists
        const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(409).json({ message: 'Email already registered.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const [result] = await db.query(
            'INSERT INTO users (name, email, password, role, department) VALUES (?, ?, ?, ?, ?)',
            [name, email, hashedPassword, role, department || null]
        );

        res.status(201).json({
            message: 'Registration successful',
            user: {
                id: result.insertId,
                name,
                email,
                role,
                department
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.login = async (req, res) => {
    const { email, password, role } = req.body;  // role bhi le rahe hain

    if (!email || !password || !role) {
        return res.status(400).json({ message: 'Email, password and role are required.' });
    }

    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        
        console.log('Database query result:', users);
        console.log('DB Query length:', users.length);
        
        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const user = users[0];
        console.log('User object:', JSON.stringify(user));
        
        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // Check role
        if (user.role !== role) {
            return res.status(403).json({ message: `Invalid role selected. You are registered as ${user.role}.` });
        }

        // Create JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        const responseData = {
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department
            }
        };
        
        console.log('Login response:', JSON.stringify(responseData));
        res.json(responseData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
};
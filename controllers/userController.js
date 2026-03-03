const db = require('../config/db');
const bcrypt = require('bcryptjs');

// GET ALL USERS (Admin Only)
exports.getAllUsers = async (req, res) => {
    const user = req.user;
    if (user.role !== 'Admin') {
        return res.status(403).json({ message: 'Only admin can view all users.' });
    }

    try {
        const [users] = await db.query('SELECT id, name, email, role, department FROM users');
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
};

// GET SINGLE USER
exports.getUserById = async (req, res) => {
    const { id } = req.params;
    const user = req.user;

    try {
        const query = 'SELECT id, name, email, role, department FROM users WHERE id = ?';
        const [users] = await db.query(query, [id]);

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (user.role !== 'Admin' && user.id !== parseInt(id)) {
            return res.status(403).json({ message: 'You can only view your own profile.' });
        }

        res.json(users[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
};

// UPDATE USER
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { name, email, password, role, department } = req.body;
    const user = req.user;

    if (user.role !== 'Admin' && user.id !== parseInt(id)) {
        return res.status(403).json({ message: 'You can only update your own profile.' });
    }

    try {
        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        let updateQuery = 'UPDATE users SET ';
        const updateValues = [];

        if (name) {
            updateQuery += 'name = ?, ';
            updateValues.push(name);
        }
        if (email) {
            updateQuery += 'email = ?, ';
            updateValues.push(email);
        }
        if (password) {
            const hashed = await bcrypt.hash(password, 10);
            updateQuery += 'password = ?, ';
            updateValues.push(hashed);
        }
        if (department !== undefined) {
            updateQuery += 'department = ?, ';
            updateValues.push(department);
        }
        if (role && user.role === 'Admin') {
            updateQuery += 'role = ?, ';
            updateValues.push(role);
        }

        updateQuery = updateQuery.slice(0, -2);
        updateQuery += ' WHERE id = ?';
        updateValues.push(id);

        await db.query(updateQuery, updateValues);
        res.json({ message: 'User updated successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
};

// DELETE USER
exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    const user = req.user;

    if (user.role !== 'Admin') {
        return res.status(403).json({ message: 'Only admin can delete users.' });
    }

    try {
        const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.json({ message: 'User deleted successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const db = require('../config/db');

exports.getTasks = async (req, res) => {
    const user = req.user; // from auth middleware
    console.log('getTasks called for user:', user.id, user.role);

    try {
        let query = '';
        let params = [];

        if (user.role === 'Admin') {
            query = 'SELECT tasks.*, users.name as assigned_to_name FROM tasks LEFT JOIN users ON tasks.assigned_to = users.id';
        } else if (user.role === 'Manager') {
            // Manager sees tasks created by him or assigned to his team members? For simplicity, tasks created by him.
            query = 'SELECT tasks.*, users.name as assigned_to_name FROM tasks LEFT JOIN users ON tasks.assigned_to = users.id WHERE tasks.created_by = ?';
            params = [user.id];
        } else { // Employee
            query = 'SELECT * FROM tasks WHERE assigned_to = ?';
            params = [user.id];
        }

        console.log('Query:', query);
        const [tasks] = await db.query(query, params);
        console.log('Tasks found:', tasks.length);
        res.json(tasks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.createTask = async (req, res) => {
    const { title, description, assigned_to, due_date } = req.body;
    const user = req.user;

    if (user.role === 'Employee') {
        return res.status(403).json({ message: 'Employees cannot create tasks.' });
    }

    if (!title || !assigned_to || !due_date) {
        return res.status(400).json({ message: 'Title, assigned employee, and due date are required.' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO tasks (title, description, assigned_to, created_by, due_date) VALUES (?, ?, ?, ?, ?)',
            [title, description, assigned_to, user.id, due_date]
        );

        res.status(201).json({ message: 'Task created successfully.', taskId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.updateTask = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const user = req.user;

    try {
        // Check if task exists
        const [tasks] = await db.query('SELECT * FROM tasks WHERE id = ?', [id]);
        if (tasks.length === 0) {
            return res.status(404).json({ message: 'Task not found.' });
        }

        const task = tasks[0];

        // Permissions: Admin can update any, Manager can update tasks they created, Employee can only update status of their own tasks
        if (user.role === 'Employee') {
            if (task.assigned_to !== user.id) {
                return res.status(403).json({ message: 'You can only update your own tasks.' });
            }
            // Employee can only change status
            await db.query('UPDATE tasks SET status = ? WHERE id = ?', [status, id]);
        } else if (user.role === 'Manager') {
            if (task.created_by !== user.id) {
                return res.status(403).json({ message: 'You can only update tasks you created.' });
            }
            // Manager can update all fields
            await db.query('UPDATE tasks SET title = ?, description = ?, assigned_to = ?, due_date = ?, status = ? WHERE id = ?',
                [req.body.title || task.title, req.body.description || task.description, req.body.assigned_to || task.assigned_to, req.body.due_date || task.due_date, status || task.status, id]);
        } else { // Admin
            await db.query('UPDATE tasks SET title = ?, description = ?, assigned_to = ?, due_date = ?, status = ? WHERE id = ?',
                [req.body.title || task.title, req.body.description || task.description, req.body.assigned_to || task.assigned_to, req.body.due_date || task.due_date, status || task.status, id]);
        }

        res.json({ message: 'Task updated successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.deleteTask = async (req, res) => {
    const { id } = req.params;
    const user = req.user;

    if (user.role === 'Employee') {
        return res.status(403).json({ message: 'Employees cannot delete tasks.' });
    }

    try {
        const [tasks] = await db.query('SELECT * FROM tasks WHERE id = ?', [id]);
        if (tasks.length === 0) {
            return res.status(404).json({ message: 'Task not found.' });
        }

        if (user.role === 'Manager' && tasks[0].created_by !== user.id) {
            return res.status(403).json({ message: 'You can only delete tasks you created.' });
        }

        await db.query('DELETE FROM tasks WHERE id = ?', [id]);
        res.json({ message: 'Task deleted successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
};
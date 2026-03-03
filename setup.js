const mysql = require('mysql2');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

// Direct connection (not pooled) for setup
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

async function setup() {
    try {
        console.log('Creating database...');
        
        // Create database if not exists
        connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`, (err) => {
            if (err) throw err;
            console.log('✅ Database created/exists');
            
            // Now use that database
            connection.query(`USE ${process.env.DB_NAME}`, (err) => {
                if (err) throw err;
                
                createUsersTable();
            });
        });
        
    } catch (error) {
        console.error('❌ Setup Error:', error);
        process.exit(1);
    }
}

function createUsersTable() {
    console.log('Creating users table...');
    
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL,
            department VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    connection.query(createTableSQL, (err) => {
        if (err) {
            console.error('❌ Error creating table:', err);
            process.exit(1);
        }
        
        console.log('✅ Users table created/exists');
        createTasksTable();
    });
}

function createTasksTable() {
    console.log('Creating tasks table...');
    
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS tasks (
            id INT PRIMARY KEY AUTO_INCREMENT,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            assigned_to INT NOT NULL,
            created_by INT NOT NULL,
            due_date DATE,
            status VARCHAR(50) DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (assigned_to) REFERENCES users(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    `;
    
    connection.query(createTableSQL, (err) => {
        if (err) {
            console.error('❌ Error creating table:', err);
            process.exit(1);
        }
        
        console.log('✅ Tasks table created/exists');
        createAttendanceTable();
    });
}

function createAttendanceTable() {
    console.log('Creating attendance table...');
    
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS attendance (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            check_in_time DATETIME,
            check_out_time DATETIME,
            status VARCHAR(50),
            attendance_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_attendance (user_id, attendance_date),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `;
    
    connection.query(createTableSQL, (err) => {
        if (err) {
            console.error('❌ Error creating table:', err);
            process.exit(1);
        }
        
        console.log('✅ Attendance table created/exists');
        insertDemoUsers();
    });
}

async function insertDemoUsers() {
    console.log('Inserting demo users...');
    
    const demoUsers = [
        {
            name: 'Admin User',
            email: 'admin@etams.com',
            password: await bcrypt.hash('admin123', 10),
            role: 'Admin',
            department: 'Management'
        },
        {
            name: 'Manager User',
            email: 'manager@etams.com',
            password: await bcrypt.hash('manager123', 10),
            role: 'Manager',
            department: 'Operations'
        },
        {
            name: 'Mohsin',
            email: 'mohsinali@gmail.com',
            password: await bcrypt.hash('rcbrand7654', 10),
            role: 'Employee',
            department: 'IT'
        }
    ];
    
    let inserted = 0;
    
    demoUsers.forEach((user) => {
        const sql = 'INSERT IGNORE INTO users (name, email, password, role, department) VALUES (?, ?, ?, ?, ?)';
        
        connection.query(sql, [user.name, user.email, user.password, user.role, user.department], (err) => {
            if (err) {
                console.error('❌ Error inserting user:', err);
            } else {
                console.log(`✅ User inserted: ${user.email} (${user.role})`);
            }
            
            inserted++;
            if (inserted === demoUsers.length) {
                console.log('\n✅ Setup complete!');
                console.log('\n📝 Demo Credentials:');
                console.log('  Admin: admin@etams.com / admin123');
                console.log('  Manager: manager@etams.com / manager123');
                console.log('  Employee: mohsinndhb@gmail.com / rcbrand7654');
                
                connection.end();
                process.exit(0);
            }
        });
    });
}

setup();

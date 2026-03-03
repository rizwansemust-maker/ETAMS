const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

const deleteSQL = `DELETE FROM attendance WHERE DATE(date) = CURDATE()`;

connection.query(deleteSQL, (err, result) => {
    if (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
    console.log('✅ Deleted today attendance records:', result.affectedRows);
    connection.end();
    process.exit(0);
});

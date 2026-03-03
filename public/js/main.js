// ==================== HELPER FUNCTIONS ====================
function getToken() {
    return localStorage.getItem('token');
}

function getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

function setAuth(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
}

function clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

function isAuthenticated() {
    return !!getToken();
}

function redirectToLogin() {
    window.location.href = 'login.html';
}

function logout() {
    clearAuth();
    redirectToLogin();
}

// ==================== API CALLS ====================
async function apiCall(url, method = 'GET', body = null, requiresAuth = true) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (requiresAuth) {
        const token = getToken();
        if (!token) {
            redirectToLogin();
            return null;
        }
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);
        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                clearAuth();
                redirectToLogin();
                return null;
            }
            throw new Error(data.message || 'Request failed');
        }
        return data;
    } catch (error) {
        console.error('API Error:', error);
        alert(error.message);
        return null;
    }
}

// ==================== AUTH PAGES ====================
// Login & Register handlers are in their respective HTML files (inline scripts)

// Register form handler
if (document.getElementById('register-form')) {
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const role = document.getElementById('register-role').value;
        const department = document.getElementById('register-department').value;

        const data = await apiCall('/api/auth/register', 'POST', { name, email, password, role, department }, false);
        if (data) {
            alert('Registration successful! Please login.');
            window.location.href = 'login.html';
        }
    });
}

// ==================== DASHBOARD COMMON ====================
const currentPage = window.location.pathname.split('/').pop();
if (currentPage.includes('dashboard') || currentPage === 'tasks.html' || currentPage === 'attendance.html') {
    const user = getUser();
    if (!user) {
        redirectToLogin();
    } else {
        const userNameSpan = document.getElementById('user-name');
        if (userNameSpan) userNameSpan.textContent = user.name;
    }
}

// Logout button handler
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
}

// ==================== ADMIN DASHBOARD ====================
if (currentPage === 'admin-dashboard.html') {
    loadAdminDashboard();
}

async function loadAdminDashboard() {
    const user = getUser();
    if (!user) return;

    // 1. Load total employees
    const users = await apiCall('/api/users');
    if (users) {
        const employees = users.filter(u => u.role === 'Employee');
        document.getElementById('total-employees').textContent = employees.length;
        populateEmployeeDropdown(employees);
    }

    // 2. Load total tasks
    const tasks = await apiCall('/api/tasks');
    console.log('Tasks data received:', tasks);
    if (tasks) {
        console.log('Tasks count:', tasks.length, 'Tasks is array:', Array.isArray(tasks));
        document.getElementById('total-tasks').textContent = tasks.length;
        displayAdminTasks(tasks);
    }

    // 3. Load attendance summary
    const attendance = await apiCall('/api/attendance');
    if (attendance) {
        const today = new Date().toISOString().split('T')[0];
        const todayPresent = attendance.filter(a => a.date === today && a.status === 'Present').length;
        document.getElementById('attendance-summary').textContent = `${todayPresent} Present Today`;
    }

    // 4. Task creation form handler
    const taskForm = document.getElementById('task-form');
    if (taskForm) {
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('task-title').value;
            const description = document.getElementById('task-desc').value;
            const assigned_to = document.getElementById('task-employee').value;
            const due_date = document.getElementById('task-due').value;

            if (!assigned_to) {
                alert('Please select an employee');
                return;
            }

            const result = await apiCall('/api/tasks', 'POST', { title, description, assigned_to, due_date });
            if (result) {
                alert('Task created successfully!');
                const updatedTasks = await apiCall('/api/tasks');
                displayAdminTasks(updatedTasks);
                document.getElementById('total-tasks').textContent = updatedTasks.length;
                taskForm.reset();
            }
        });
    }
}

function populateEmployeeDropdown(employees) {
    const select = document.getElementById('task-employee');
    if (!select) return;
    select.innerHTML = '<option value="">Select Employee</option>';
    employees.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.id;
        option.textContent = `${emp.name} (${emp.email})`;
        select.appendChild(option);
    });
}

function displayAdminTasks(tasks) {
    console.log('displayAdminTasks called with:', tasks);
    const tbody = document.getElementById('task-list');
    console.log('tbody element:', tbody);
    if (!tbody) return;

    tbody.innerHTML = '';
    if (tasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No tasks found.</td></tr>';
        return;
    }

    console.log('Iterating over', tasks.length, 'tasks');
    tasks.forEach((task, index) => {
        console.log('Adding task', index, ':', task.title);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${task.title}</td>
            <td>${task.assigned_to_name || 'N/A'}</td>
            <td>${task.due_date}</td>
            <td>${task.status}</td>
            <td>
                <button onclick="deleteTask(${task.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    console.log('displayAdminTasks complete');
}

async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    const result = await apiCall(`/api/tasks/${taskId}`, 'DELETE');
    if (result) {
        alert('Task deleted');
        const updatedTasks = await apiCall('/api/tasks');
        displayAdminTasks(updatedTasks);
        document.getElementById('total-tasks').textContent = updatedTasks.length;
    }
}

// ==================== MANAGER DASHBOARD ====================
if (currentPage === 'manager-dashboard.html') {
    loadManagerDashboard();
}

async function loadManagerDashboard() {
    const user = getUser();

    const users = await apiCall('/api/users');
    if (users) {
        const employees = users.filter(u => u.role === 'Employee');
        document.getElementById('total-employees').textContent = employees.length;
    }

    const tasks = await apiCall('/api/tasks');
    if (tasks) {
        document.getElementById('total-tasks').textContent = tasks.length;

        const taskList = document.getElementById('task-list');
        if (taskList) {
            taskList.innerHTML = '';
            tasks.forEach(task => {
                const li = document.createElement('li');
                li.textContent = `${task.title} - Status: ${task.status} (Due: ${task.due_date})`;
                taskList.appendChild(li);
            });
        }
    }

    const attendance = await apiCall('/api/attendance');
    if (attendance) {
        const today = new Date().toISOString().split('T')[0];
        const todayPresent = attendance.filter(a => a.date === today && a.status === 'Present').length;
        document.getElementById('attendance-summary').textContent = `${todayPresent} Present Today`;
    }

    const taskForm = document.getElementById('task-form');
    if (taskForm) {
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('task-title').value;
            const description = document.getElementById('task-desc').value;
            const assigned_to = document.getElementById('task-employee').value;
            const due_date = document.getElementById('task-due').value;

            const result = await apiCall('/api/tasks', 'POST', { title, description, assigned_to, due_date });
            if (result) {
                alert('Task created!');
                window.location.reload();
            }
        });
    }
}

// ==================== EMPLOYEE DASHBOARD ====================
if (currentPage === 'employee-dashboard.html') {
    loadEmployeeDashboard();
}

async function loadEmployeeDashboard() {
    const tasks = await apiCall('/api/tasks');
    const taskList = document.getElementById('task-list');
    if (taskList && tasks) {
        taskList.innerHTML = '';
        tasks.forEach(task => {
            const li = document.createElement('li');
            li.innerHTML = `
                ${task.title} - Due: ${task.due_date} - Status: ${task.status}
                ${task.status !== 'Completed' ? `<button onclick="updateTaskStatus(${task.id}, 'Completed')">Mark Complete</button>` : ''}
            `;
            taskList.appendChild(li);
        });
    }
}

async function updateTaskStatus(taskId, status) {
    const result = await apiCall(`/api/tasks/${taskId}`, 'PUT', { status });
    if (result) {
        alert('Task updated!');
        window.location.reload();
    }
}

async function markAttendance(status) {
    const result = await apiCall('/api/attendance', 'POST', { status });
    if (result) {
        alert('Attendance marked!');
    }
}

// ==================== TASKS PAGE (for admin/manager) ====================
if (currentPage === 'tasks.html') {
    loadTasksPage();
}

async function loadTasksPage() {
    const tasks = await apiCall('/api/tasks');
    const taskList = document.getElementById('task-list');
    if (taskList && tasks) {
        taskList.innerHTML = '';
        tasks.forEach(task => {
            const li = document.createElement('li');
            li.textContent = `${task.title} - Assigned to: ${task.assigned_to_name || 'N/A'} - Status: ${task.status} - Due: ${task.due_date}`;
            if (getUser().role !== 'Employee') {
                li.innerHTML += ` <button onclick="deleteTask(${task.id})">Delete</button>`;
            }
            taskList.appendChild(li);
        });
    }
}

// ==================== ATTENDANCE PAGE ====================
if (currentPage === 'attendance.html') {
    loadAttendancePage();
}

async function loadAttendancePage() {
    const user = getUser();
    let attendance = await apiCall('/api/attendance');
    const tableBody = document.querySelector('#attendance-table tbody');
    if (tableBody && attendance) {
        tableBody.innerHTML = '';
        attendance.forEach(record => {
            const row = document.createElement('tr');
            if (user.role === 'Admin' || user.role === 'Manager') {
                row.innerHTML = `
                    <td>${record.user_id}</td>
                    <td>${record.name}</td>
                    <td>${record.date}</td>
                    <td>${record.status}</td>
                `;
            } else {
                row.innerHTML = `
                    <td>${record.date}</td>
                    <td>${record.status}</td>
                `;
            }
            tableBody.appendChild(row);
        });
    }

    const exportBtn = document.getElementById('export-btn');
    if (exportBtn && (user.role === 'Admin' || user.role === 'Manager')) {
        exportBtn.addEventListener('click', async () => {
            const data = await apiCall('/api/attendance/export');
            if (data) {
                const csv = data.map(row => `${row.name},${row.email},${row.date},${row.status}`).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'attendance_report.csv';
                a.click();
            }
        });
    }
}
// Login form handler (with role)
if (document.getElementById('login-form')) {
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const role = document.getElementById('login-role').value;  // role le rahe hain
        const errorMsgDiv = document.getElementById('error-message');
        const loginBtn = document.getElementById('login-btn');
        
        if (!role) {
            errorMsgDiv.textContent = 'Please select your role';
            return;
        }
        
        // Disable button to avoid double submit
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
        
        try {
            console.log('Sending login request for:', email, 'with role:', role);
            const data = await apiCall('/api/auth/login', 'POST', { email, password, role }, false);
            console.log('Login response:', data);
            
            if (data) {
                // Check if token and user exist
                if (!data.token || !data.user) {
                    throw new Error('Invalid response from server: missing token or user');
                }
                
                setAuth(data.token, data.user);
                const userRole = data.user.role.toLowerCase();
                console.log('User role:', userRole);
                
                // Redirect based on role
                if (userRole === 'admin') {
                    window.location.href = 'admin-dashboard.html';
                } else if (userRole === 'manager') {
                    window.location.href = 'manager-dashboard.html';
                } else if (userRole === 'employee') {
                    window.location.href = 'employee-dashboard.html';
                } else {
                    window.location.href = 'dashboard.html'; // fallback
                }
            } else {
                // apiCall returned null (error already shown)
                errorMsgDiv.textContent = 'Login failed. Check credentials and role.';
                loginBtn.disabled = false;
                loginBtn.textContent = 'Login';
            }
        } catch (error) {
            console.error('Login error:', error);
            errorMsgDiv.textContent = 'Error: ' + error.message;
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
    });
}
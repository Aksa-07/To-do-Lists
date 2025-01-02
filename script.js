const inputBox = document.getElementById("input-box");
const prioritySelect = document.getElementById("priority");
const listContainer = document.getElementById("list-container");
const reminderTime = document.getElementById("reminder-time");
const searchBox = document.getElementById("search-box");

let points = parseInt(localStorage.getItem("points")) || 0; // Load points from localStorage
let badge = localStorage.getItem("badge") || "Beginner"; // Load badge from localStorage

// Add a new task
function addTask(taskText = inputBox.value.trim(), taskPriority = prioritySelect.value, taskDueDate = document.getElementById("due-date").value) {
    if (taskText === '' || taskDueDate === '' || taskPriority === '') {
        alert("You must provide text, due date, and priority!");
        return;
    }

    const task = {
        id: Date.now(),
        text: taskText,
        priority: taskPriority,
        dueDate: taskDueDate,
        completed: false,
    };

    saveTask(task);
    inputBox.value = ''; // Clear the input box
    renderTasks();
    scheduleReminders(task); // Schedule reminders for the task
}

// Save task to localStorage
function saveTask(task) {
    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    tasks.push(task);
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

// Render tasks with optional filtering
function renderTasks(filter = 'all', searchQuery = '') {
    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    const filteredTasks = tasks.filter(task => {
        if (filter === 'all') return task.text.toLowerCase().includes(searchQuery.toLowerCase());
        if (filter === 'completed') return task.completed && task.text.toLowerCase().includes(searchQuery.toLowerCase());
        return !task.completed && task.text.toLowerCase().includes(searchQuery.toLowerCase()); // 'pending' filter
    });

    listContainer.innerHTML = ''; // Clear the task list
    filteredTasks.forEach(task => {
        const li = document.createElement("li");
        li.className = `${task.priority} ${task.completed ? 'checked' : ''}`;
        li.setAttribute('data-id', task.id);
        li.innerHTML = `
            <span class="task-text" onclick="editTask(${task.id})">${task.text}</span>
            <div>
                <button class="action-btn complete-btn" onclick="toggleComplete(${task.id})" ${task.completed ? 'disabled' : ''}>✔</button>
                <button class="action-btn" onclick="deleteTask(${task.id})">✖</button>
            </div>
        `;
        listContainer.appendChild(li);
    });
    updateGamificationDisplay();
}

// Toggle task completion status
function toggleComplete(id) {
    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    const updatedTasks = tasks.map(task => {
        if (task.id === id && !task.completed) {
            task.completed = true; // Mark as completed
            updateGamification(); // Update gamification points
        }
        return task;
    });
    localStorage.setItem("tasks", JSON.stringify(updatedTasks));
    renderTasks();
}

// Delete a task
function deleteTask(id) {
    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    const updatedTasks = tasks.filter(task => task.id !== id);
    localStorage.setItem("tasks", JSON.stringify(updatedTasks));
    renderTasks();
}

// Filter tasks
function filterTasks(filter) {
    renderTasks(filter, searchBox.value); // Pass the search query to the render function
    document.querySelectorAll('.filters button').forEach(button => {
        button.classList.remove('active');
    });
    document.querySelector(`.filters button[onclick="filterTasks('${filter}')"]`).classList.add('active');
}

// Search tasks by query
function searchTasks() {
    renderTasks('all', searchBox.value);
}

// Edit a task
function editTask(id) {
    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    const task = tasks.find(task => task.id === id);
    const newTaskText = prompt("Edit task:", task.text);

    if (newTaskText) {
        task.text = newTaskText.trim();
        localStorage.setItem("tasks", JSON.stringify(tasks));
        renderTasks();
    }
}

// Export tasks as CSV
function exportTasks() {
    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    const csvContent = "ID,Task,Priority,Completed,Due Date\n" +
        tasks.map(task => `${task.id},${task.text},${task.priority},${task.completed},${task.dueDate}`).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "tasks.csv";
    link.click();
}

// Update Gamification
function updateGamification() {
    points += 1; // Increase points by one
    localStorage.setItem("points", points); // Save points to localStorage

    if (points >= 100 && badge === "Beginner") {
        badge = "Intermediate";
    } else if (points >= 200 && badge === "Intermediate") {
        badge = "Advanced";
    }
    localStorage.setItem("badge", badge); // Save badge to localStorage
    updateGamificationDisplay();
}

function updateGamificationDisplay() {
    document.getElementById("points-display").textContent = `Points: ${points}`;
    document.getElementById("badge-display").textContent = `Badge: ${badge}`;
}

// Schedule reminders for a task
function scheduleReminders(task) {
    const dueDate = new Date(task.dueDate);
    const now = new Date();

    if (dueDate > now) {
        const reminderTimes = [now, now, now]; // Initializing the reminder times

        for (let i = 0; i < 3; i++) {
            reminderTimes[i] = new Date(now.getTime() + (dueDate - now) * (i + 1) / 4); // Set reminders at intervals before due date
        }

        reminderTimes.forEach(reminderTime => {
            const timeToReminder = reminderTime - now;
            if (timeToReminder > 0) {
                setTimeout(() => {
                    if (Notification.permission === "granted") {
                        new Notification(`Reminder: Task "${task.text}" is due soon.`);
                    } else if (Notification.permission !== "denied") {
                        Notification.requestPermission().then(permission => {
                            if (permission === "granted") {
                                new Notification(`Reminder: Task "${task.text}" is due soon.`);
                            }
                        });
                    }
                }, timeToReminder);
            }
        });
    }
}

// Voice Assistant Integration
function startVoiceAssistant() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();

    recognition.onresult = function(event) {
        const voiceText = event.results[0][0].transcript;
        const [taskText, taskPriority, taskDueDate] = parseVoiceCommand(voiceText);
        addTask(taskText, taskPriority, taskDueDate);
    };

    recognition.onspeechend = function() {
        recognition.stop();
    };

    recognition.onerror = function(event) {
        alert('Voice Assistant Error: ' + event.error);
    };
}

function parseVoiceCommand(voiceText) {
    const taskText = voiceText.match(/task (.+)/i)[1];
    const taskPriority = voiceText.match(/priority (low|medium|high)/i)[1];
    const taskDueDate = voiceText.match(/due (.+)/i)[1];

    return [taskText, taskPriority, taskDueDate];
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    renderTasks();
    updateGamificationDisplay(); // Load points and badge on page load
    document.getElementById("search-box").addEventListener("input", searchTasks);
    document.getElementById("voice-assistant-btn").addEventListener("click", startVoiceAssistant);
});

document.addEventListener('DOMContentLoaded', () => {
    const displayDate = document.getElementById('displayDate');
    const datePicker = document.getElementById('datePicker');
    const prevDayBtn = document.getElementById('prevDayBtn');
    const nextDayBtn = document.getElementById('nextDayBtn');
    const scheduleGrid = document.getElementById('scheduleGrid');
    const totalTasksCount = document.getElementById('totalTasksCount');
    const completedTasksCount = document.getElementById('completedTasksCount');
    const generalTaskInput = document.getElementById('generalTaskInput'); // New element
    const generalAddTaskBtn = document.getElementById('generalAddTaskBtn'); // New element

    let currentDate = new Date(); // Start with today's date

    // Function to format date for display
    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Function to format time for display (e.g., "9 AM", "3 PM")
    const formatTime = (hour) => {
        const time = new Date();
        time.setHours(hour, 0, 0, 0); // Set to the start of the hour
        return time.toLocaleTimeString('en-US', {
            hour: 'numeric',
            hour12: true
        });
    };

    // Store tasks in a simple object for the current day
    // Example: { "2025-06-12": { "9": [{id: 't1', text: 'Meeting', completed: false}], "10": [] } }
    const tasks = {};

    // Function to save tasks to localStorage
    const saveTasks = () => {
        localStorage.setItem('dayPlannerTasks', JSON.stringify(tasks));
        // console.log("Tasks saved:", tasks); // Uncomment for debugging
    };

    // Function to load tasks from localStorage
    const loadTasks = () => {
        const loadedTasks = localStorage.getItem('dayPlannerTasks');
        if (loadedTasks) {
            try {
                const parsedTasks = JSON.parse(loadedTasks);
                // Clear existing tasks before loading to prevent merging issues from previous sessions
                for (const key in tasks) {
                    delete tasks[key];
                }
                Object.assign(tasks, parsedTasks);
                // console.log("Tasks loaded:", tasks); // Uncomment for debugging
            } catch (e) {
                console.error("Error parsing tasks from localStorage:", e);
                localStorage.removeItem('dayPlannerTasks'); // Clear bad data to avoid future errors
            }
        }
    };

    // Function to update task counts displayed in the header
    const updateTaskCounts = () => {
        const currentDayKey = currentDate.toISOString().split('T')[0]; // e.g., "2025-06-12"
        const dayTasksByHour = tasks[currentDayKey] || {}; // Get the object of tasks for the current day, by hour
        let total = 0;
        let completed = 0;

        // Iterate over the hourly keys (e.g., "6", "7", "8"...)
        for (const hour in dayTasksByHour) {
            // Ensure it's an own property and the value is an array before iterating through tasks
            if (Object.prototype.hasOwnProperty.call(dayTasksByHour, hour) && Array.isArray(dayTasksByHour[hour])) {
                dayTasksByHour[hour].forEach(task => {
                    total++; // Increment total for every task
                    if (task.completed) {
                        completed++; // Increment completed if the task is marked as complete
                    }
                });
            }
        }
        totalTasksCount.textContent = total;
        completedTasksCount.textContent = completed;
        // console.log(`Counts updated: Total=${total}, Completed=${completed}`); // Uncomment for debugging
    };


    // Function to render the schedule grid for the current date
    const renderSchedule = () => {
        scheduleGrid.innerHTML = ''; // Clear existing schedule
        const currentHour = new Date().getHours();
        const currentDayKey = currentDate.toISOString().split('T')[0]; // Current day being displayed
        const todayKey = new Date().toISOString().split('T')[0]; // Actual today's date

        // Ensure the current day has an entry in tasks object
        if (!tasks[currentDayKey]) {
            tasks[currentDayKey] = {};
        }

        for (let hour = 6; hour <= 23; hour++) { // From 6 AM to 11 PM
            // Create a wrapper for the time-label and task-list-container to act as a grid row
            const gridRow = document.createElement('div');
            gridRow.classList.add('schedule-grid-row');

            const timeLabelDiv = document.createElement('div');
            timeLabelDiv.classList.add('time-label');
            timeLabelDiv.textContent = formatTime(hour);

            const taskListContainerDiv = document.createElement('div');
            taskListContainerDiv.classList.add('task-list-container');
            taskListContainerDiv.dataset.hour = hour; // Store the hour for easy reference

            // Highlight current hour for today's view only
            if (currentDayKey === todayKey && hour === currentHour) {
                gridRow.classList.add('current-hour');
            }

            // Load tasks for this hour and current day
            if (!tasks[currentDayKey][hour]) {
                tasks[currentDayKey][hour] = [];
            }

            tasks[currentDayKey][hour].forEach(task => {
                const taskItem = createTaskElement(task, currentDayKey, hour);
                taskListContainerDiv.appendChild(taskItem);
            });

            // Add input field and add button for new tasks (per-hour)
            const addTaskInput = document.createElement('input');
            addTaskInput.type = 'text';
            addTaskInput.placeholder = 'Add new task...';
            addTaskInput.classList.add('add-task-input');
            addTaskInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && addTaskInput.value.trim() !== '') {
                    addTask(currentDayKey, hour, addTaskInput.value.trim());
                    addTaskInput.value = ''; // Clear input
                }
            });

            const addTaskButton = document.createElement('button');
            addTaskButton.classList.add('add-task-btn');
            addTaskButton.innerHTML = '<span class="material-icons">add_circle_outline</span> Add Task';
            addTaskButton.addEventListener('click', () => {
                if (addTaskInput.value.trim() !== '') {
                    addTask(currentDayKey, hour, addTaskInput.value.trim());
                    addTaskInput.value = ''; // Clear input
                }
            });

            const taskInputWrapper = document.createElement('div');
            taskInputWrapper.appendChild(addTaskInput);
            taskInputWrapper.appendChild(addTaskButton);
            taskListContainerDiv.appendChild(taskInputWrapper);

            // Append time label and task container to the gridRow
            gridRow.appendChild(timeLabelDiv);
            gridRow.appendChild(taskListContainerDiv);

            // Append the row to the schedule grid
            scheduleGrid.appendChild(gridRow);
        }
        updateTaskCounts(); // Call update counts after rendering is complete
    };

    // Helper to create a single task DOM element
    const createTaskElement = (task, dayKey, hour) => {
        const taskItem = document.createElement('div');
        taskItem.classList.add('task-item');
        if (task.completed) {
            taskItem.classList.add('completed');
        }
        taskItem.dataset.taskId = task.id; // Store task ID for easy reference

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.completed;
        checkbox.addEventListener('change', () => {
            // Find the task in the tasks object and update its completed status
            const currentTasks = tasks[dayKey]?.[hour]; // Safely access the hour's tasks
            if (currentTasks) {
                const foundTask = currentTasks.find(t => t.id === task.id);
                if (foundTask) {
                    foundTask.completed = checkbox.checked;
                    taskItem.classList.toggle('completed', foundTask.completed); // Toggle visual class
                    saveTasks(); // Save changes to localStorage
                    updateTaskCounts(); // Update displayed counts
                }
            }
        });

        const taskText = document.createElement('span');
        taskText.classList.add('task-item-text');
        taskText.textContent = task.text;

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-task-btn');
        deleteButton.innerHTML = '<span class="material-icons">delete</span>';
        deleteButton.addEventListener('click', () => {
            deleteTask(dayKey, hour, task.id);
        });

        taskItem.appendChild(checkbox);
        taskItem.appendChild(taskText);
        taskItem.appendChild(deleteButton);

        return taskItem;
    };

    // Add a new task (used by both per-hour and general add buttons)
    const addTask = (dayKey, hour, text) => {
        const newTask = {
            id: Date.now().toString(), // Simple unique ID (timestamp based)
            text: text,
            completed: false
        };
        // Ensure the hour array exists for the given day
        if (!tasks[dayKey]) {
            tasks[dayKey] = {};
        }
        if (!tasks[dayKey][hour]) {
            tasks[dayKey][hour] = [];
        }
        tasks[dayKey][hour].push(newTask);
        saveTasks();
        renderSchedule(); // Re-render to show new task and update counts
    };

    // Delete a task
    const deleteTask = (dayKey, hour, taskId) => {
        if (tasks[dayKey] && tasks[dayKey][hour]) {
            tasks[dayKey][hour] = tasks[dayKey][hour].filter(task => task.id !== taskId);
            saveTasks();
            renderSchedule(); // Re-render to reflect deletion and update counts
        }
    };

    // Event Listeners for date navigation and picker
    displayDate.addEventListener('click', () => {
        datePicker.showPicker(); // Opens the native date picker
    });

    datePicker.addEventListener('change', () => {
        currentDate = new Date(datePicker.value);
        updateDisplayAndSchedule();
    });

    prevDayBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 1); // Go back one day
        updateDisplayAndSchedule();
    });

    nextDayBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() + 1); // Go forward one day
        updateDisplayAndSchedule();
    });

    // Handle the new general "Add Task" button at the bottom
    generalAddTaskBtn.addEventListener('click', () => {
        const taskText = generalTaskInput.value.trim();
        if (taskText !== '') {
            const currentHour = new Date().getHours(); // Default to current hour
            addTask(currentDate.toISOString().split('T')[0], currentHour, taskText);
            generalTaskInput.value = ''; // Clear the input field
        } else {
            alert('Please enter a task for the general task button.');
        }
    });

    generalTaskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            generalAddTaskBtn.click(); // Trigger the button click
        }
    });

    // Helper to update the displayed date and re-render the schedule
    const updateDisplayAndSchedule = () => {
        displayDate.textContent = formatDate(currentDate);
        datePicker.value = currentDate.toISOString().split('T')[0]; // Set date input value to YYYY-MM-DD
        renderSchedule();
    };

    // Initial load and render when the page first loads
    loadTasks(); // Load tasks from localStorage
    updateDisplayAndSchedule(); // Display current date and render schedule

    // Set up interval to re-render the schedule every minute,
    // primarily to update the "current hour" highlight if on today's date.
    setInterval(() => {
        const todayKey = new Date().toISOString().split('T')[0];
        if (currentDate.toISOString().split('T')[0] === todayKey) { // Only update highlight if on today's view
             renderSchedule(); // Re-render to update current hour highlight
        }
    }, 60 * 1000); // Every minute (60,000 milliseconds)
});
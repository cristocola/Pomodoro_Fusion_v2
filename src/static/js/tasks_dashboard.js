document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    const API_ENDPOINT = '/api/tasks/history';

    // DOM Elements
    const monthYearDisplay = document.getElementById('month-year-display');
    const calendarGrid = document.getElementById('calendar-grid');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const noTasksState = document.getElementById('no-tasks-state');
    const taskBoard = document.getElementById('task-board');

    let currentDisplayDate = new Date();
    let allTasks = [];

    async function fetchTaskHistory() {
        showLoading(true);
        try {
            const response = await fetch(API_ENDPOINT);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            if (!data || !Array.isArray(data.tasks)) {
                throw new Error("Invalid data format from server.");
            }
            allTasks = data.tasks;
            if (allTasks.length === 0) {
                noTasksState.classList.remove('hidden');
                taskBoard.classList.add('hidden');
            } else {
                renderCalendar();
            }
        } catch (error) {
            console.error('Error fetching task history:', error);
            showError(`Failed to load task history: ${error.message}`);
        } finally {
            showLoading(false);
        }
    }

    function renderCalendar() {
        calendarGrid.innerHTML = '';
        monthYearDisplay.textContent = currentDisplayDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const year = currentDisplayDate.getFullYear();
        const month = currentDisplayDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        const firstDayOfWeek = firstDayOfMonth.getDay(); // 0=Sun, 1=Mon, ...

        // Add blank cells for days before the first of the month
        for (let i = 0; i < firstDayOfWeek; i++) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('calendar-day', 'other-month');
            calendarGrid.appendChild(dayCell);
        }

        // Add cells for each day of the month
        for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
            const dayCell = createDayCell(new Date(year, month, day));
            calendarGrid.appendChild(dayCell);
        }
    }

    function createDayCell(date) {
        const dayCell = document.createElement('div');
        dayCell.classList.add('calendar-day');

        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const todayKey = new Date().toISOString().split('T')[0];
        if (dateKey === todayKey) {
            dayCell.classList.add('today');
        }

        const dayNumber = document.createElement('div');
        dayNumber.classList.add('day-number');
        dayNumber.textContent = date.getDate();
        dayCell.appendChild(dayNumber);

        const tasksForDay = allTasks.filter(task => task.created_at.startsWith(dateKey));

        tasksForDay.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.classList.add('task-item', `status-${task.status}`);
            taskElement.innerHTML = `
                <div class="task-desc">${task.task_description}</div>
                <div class="task-stats">
                    Est: ${task.estimated_pomodoros} | Act: ${task.actual_pomodoros}
                </div>
            `;
            dayCell.appendChild(taskElement);
        });

        return dayCell;
    }

    function changeMonth(offset) {
        currentDisplayDate.setMonth(currentDisplayDate.getMonth() + offset);
        renderCalendar();
    }

    function showLoading(isLoading) {
        if (isLoading) {
            loadingState.classList.remove('hidden');
            taskBoard.classList.add('hidden');
            noTasksState.classList.add('hidden');
            errorState.classList.add('hidden');
        } else {
            loadingState.classList.add('hidden');
            if (!noTasksState.classList.contains('hidden') || !errorState.classList.contains('hidden')) {
                taskBoard.classList.add('hidden');
            } else {
                taskBoard.classList.remove('hidden');
            }
        }
    }

    function showError(message) {
        errorState.textContent = message;
        errorState.classList.remove('hidden');
        taskBoard.classList.add('hidden');
    }

    // Event Listeners
    prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    nextMonthBtn.addEventListener('click', () => changeMonth(1));

    // Initial Load
    fetchTaskHistory();
});

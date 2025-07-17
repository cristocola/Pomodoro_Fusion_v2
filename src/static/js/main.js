
  // --- Task Manager Module ---
  const TaskManager = (() => {
    let tasks = [];

    async function fetchTasks() {
        clearApiError();
        try {
            const response = await fetch(TASKS_ENDPOINT);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            tasks = data.tasks || [];
            renderTasks();
        } catch (err) {
            showApiError(`Fetch tasks failed: ${err.message}`);
        }
    }

    async function addTask(description, estimated_pomodoros) {
        clearApiError();
        try {
            const response = await fetch(TASKS_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ description, estimated_pomodoros })
            });
            if (!response.ok) {
                 const errData = await response.json();
                 throw new Error(errData.error || `HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            tasks.push(data.task);
            renderTasks();
        } catch (err) {
            showApiError(`Add task failed: ${err.message}`);
        }
    }

    async function incrementPomodoro(taskId) {
        clearApiError();
        try {
            const response = await fetch(`${TASKS_ENDPOINT}/${taskId}/increment`, { method: "POST" });
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                task.actual_pomodoros++;
                if (task.status === 'Pending') task.status = 'In Progress';
            }
            renderTasks();
        } catch (err) {
            showApiError(`Update task failed: ${err.message}`);
        }
    }
    
    async function completeTask(taskId) {
        clearApiError();
        try {
            const response = await fetch(`${TASKS_ENDPOINT}/${taskId}/complete`, { method: "POST" });
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                task.status = 'Completed';
            }
            if (currentTaskId === taskId) {
                currentTaskId = null; // Deselect if completed
            }
            renderTasks();
        } catch (err) {
            showApiError(`Complete task failed: ${err.message}`);
        }
    }

    function renderTasks() {
        taskList.innerHTML = "";
        if (tasks.length === 0) {
            const li = document.createElement("li");
            li.textContent = "No tasks for today. Add one to get started!";
            li.classList.add('empty-log');
            taskList.appendChild(li);
            return;
        }

        tasks.forEach(task => {
            const li = document.createElement('li');
            li.dataset.taskId = task.id;
            li.classList.toggle('selected', task.id === currentTaskId);
            li.classList.toggle('completed', task.status === 'Completed');

            const description = document.createElement('span');
            description.className = 'task-description';
            description.textContent = task.task_description;
            li.appendChild(description);

            const pomodoros = document.createElement('div');
            pomodoros.className = 'task-pomodoros';
            for (let i = 0; i < task.estimated_pomodoros; i++) {
                const box = document.createElement('div');
                box.className = 'pomo-box';
                if (i < task.actual_pomodoros) {
                    box.classList.add('filled');
                }
                pomodoros.appendChild(box);
            }
            if (task.actual_pomodoros > task.estimated_pomodoros) {
                const extra = document.createElement('span');
                extra.textContent = `+${task.actual_pomodoros - task.estimated_pomodoros}`;
                pomodoros.appendChild(extra);
            }
            li.appendChild(pomodoros);
            
            if (task.status !== 'Completed') {
                const actions = document.createElement('div');
                actions.className = 'task-actions';
                const completeBtn = document.createElement('button');
                completeBtn.className = 'complete-btn';
                completeBtn.title = 'Mark as Complete';
                completeBtn.innerHTML = '<i class="fas fa-check-circle"></i>';
                completeBtn.onclick = (e) => {
                    e.stopPropagation();
                    completeTask(task.id);
                };
                actions.appendChild(completeBtn);
                li.appendChild(actions);
            }


            li.onclick = () => {
                if (task.status !== 'Completed') {
                    currentTaskId = (currentTaskId === task.id) ? null : task.id;
                    renderTasks();
                }
            };

            taskList.appendChild(li);
        });
    }
    
    addTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const description = taskDescriptionInput.value.trim();
        const estimate = parseInt(taskEstimateInput.value, 10);
        if (description && estimate > 0) {
            addTask(description, estimate);
            taskDescriptionInput.value = '';
            taskEstimateInput.value = 1;
        }
    });

    return { init: fetchTasks, incrementPomodoro };
  })();

  // --- Settings Modal Manager ---
  const SettingsModal = (() => {
    function open() { settingsModalContainer.classList.add('visible'); closeSettingsBtn.focus(); }
    function close() { settingsModalContainer.classList.remove('visible'); settingsBtn.focus(); }
    function setupEventListeners() {
      settingsBtn.addEventListener('click', open);
      closeSettingsBtn.addEventListener('click', close);
      settingsModalContainer.addEventListener('click', (e) => { if (e.target === settingsModalContainer) close(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && settingsModalContainer.classList.contains('visible')) close(); });
    }
    return { init: setupEventListeners };
  })();


  // --- Application Module ---
  const App = (() => {
    function playAlarm(isEarlyFinish = false, completedState = null) {
      const durationSetting = parseInt(alarmLengthInput.value || 7, 10);
      const durationMs = durationSetting * 1000;
      const effectiveDurationMs = isEarlyFinish && completedState === WORK_STATE ? Math.min(durationMs, 3000) : durationMs;

      // --- Android Native Alarm ---
      if (typeof Android !== "undefined" && Android.scheduleAlarm) {
        const triggerAtMillis = Date.now() + 100; // Trigger almost immediately
        Android.scheduleAlarm(triggerAtMillis);
        console.log(`Scheduled native Android alarm to trigger at ${new Date(triggerAtMillis).toLocaleTimeString()}`);
      } else {
        // --- Fallback for Web Browsers ---
        alarmSound.currentTime = 0;
        alarmSound.volume = Math.max(0, Math.min(1, (parseInt(alarmVolumeInput.value || Settings.defaults.volume, 10)) / 10));
        alarmSound.play().catch(e => console.error("Error playing sound:", e));
        setTimeout(() => { if (!alarmSound.paused) { alarmSound.pause(); alarmSound.currentTime = 0; } }, effectiveDurationMs);
      }
    }

    function cycleQuotes() {
      quoteBox.classList.add('fade-out');
      setTimeout(() => {
        currentQuoteIndex = (currentQuoteIndex + 1) % quotes.length;
        quoteBox.textContent = quotes[currentQuoteIndex];
        quoteBox.classList.remove('fade-out'); quoteBox.classList.add('fade-in');
      }, 500);
      setTimeout(() => quoteBox.classList.remove('fade-in'), 1000);
    }

    function init() {
      Settings.load();
      LogManager.renderLogs().then(() => Timer.updateUIState()).catch(() => Timer.updateUIState());
      TaskManager.init();

      startWorkBtn.addEventListener("click", Timer.workToggle);
      startBreakBtn.addEventListener("click", Timer.startBreakHandler);
      skipBreakBtn.addEventListener("click", Timer.skipBreakHandler);
      resetBtn.addEventListener("click", Timer.reset);
      finishEarlyBtn.addEventListener("click", Timer.finishEarly);
      voidPomoBtn.addEventListener("click", Timer.voidPomodoro);
      deleteLogBtn.addEventListener("click", LogManager.deleteLastLog);
      showTodayOnlyCheckbox.addEventListener("change", LogManager.renderLogs);
      enableNotificationsBtn.addEventListener("click", Notify.requestPermission);

      alarmVolumeInput.addEventListener('input', () => {
        volumeValueDisplay.textContent = alarmVolumeInput.value;
        // Save is handled by the Settings module's event listener
      });

      SettingsModal.init();
      setInterval(cycleQuotes, QUOTE_CYCLE_INTERVAL_MS);
      updateNotificationButton();
      console.log("Pomodoro App Initialized.");
    }
    return { init, playAlarm };
  })();

  function updateNotificationButton() {
    if (!('Notification' in window)) {
      enableNotificationsBtn.disabled = true; enableNotificationsBtn.textContent = "Notifications N/A";
      enableNotificationsBtn.style.opacity = '0.6'; enableNotificationsBtn.style.cursor = 'not-allowed';
    } else {
      enableNotificationsBtn.disabled = false; enableNotificationsBtn.style.opacity = '1';
      enableNotificationsBtn.style.cursor = 'pointer'; enableNotificationsBtn.style.backgroundColor = ''; enableNotificationsBtn.style.color = '';
      notificationPermission = Notification.permission;
      if (notificationPermission === 'granted') {
        enableNotificationsBtn.textContent = "Notifications Enabled";
        enableNotificationsBtn.style.backgroundColor = 'var(--break-color)'; enableNotificationsBtn.style.color = 'var(--light-text)';
      } else if (notificationPermission === 'denied') {
        enableNotificationsBtn.textContent = "Notifications Blocked"; enableNotificationsBtn.disabled = true;
        enableNotificationsBtn.style.backgroundColor = 'var(--danger-color)'; enableNotificationsBtn.style.color = 'var(--light-text)';
        enableNotificationsBtn.style.opacity = '0.6'; enableNotificationsBtn.style.cursor = 'not-allowed';
      } else { enableNotificationsBtn.textContent = "Enable Notifications"; }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', App.init);
  else App.init();

  // The viewHistoryLink is now a standard href, so no JS is needed.
})();

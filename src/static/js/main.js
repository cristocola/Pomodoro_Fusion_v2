    // Wrap in IIFE to avoid global scope pollution
    (function () {
      'use strict'; // Enable strict mode

      // --- Constants ---
      const API_BASE_URL = "";
      const LOG_ENDPOINT = `${API_BASE_URL}/log`;
      const DELETE_LOG_ENDPOINT = `${API_BASE_URL}/delete-last-log`;
      const LOGS_ENDPOINT = `${API_BASE_URL}/logs`;
      const TICK_INTERVAL_MS = 1000; // Update timer every second
      const DEBT_ACCUMULATOR_INTERVAL_MS = 1000; // How often to update live debt
      const QUOTE_CYCLE_INTERVAL_MS = 15000; 
      const TITLE_PREFIX = "Pomodoro Fusion";
      const WORK_STATE = 'work';
      const BREAK_STATE = 'break';
      const LONGBREAK_STATE = 'longBreak';
      const PAUSED_STATE = 'paused';
      const IDLE_STATE = 'idle';

      // --- DOM Element References ---
      const timerDisplay = document.getElementById("timer");
      const timerStatusDisplay = document.getElementById("timer-status");
      const pomodoroInput = document.getElementById("pomodoroLength");
      const breakInput = document.getElementById("breakLength");
      const longBreakInput = document.getElementById("longBreakLength");
      const longBreakIntervalInput = document.getElementById("longBreakInterval");
      const alarmLengthInput = document.getElementById("alarmLength");
      const alarmVolumeInput = document.getElementById("alarmVolume");
      const volumeValueDisplay = document.getElementById("volumeValue");
      const startWorkBtn = document.getElementById("startWorkBtn");
      const startBreakBtn = document.getElementById("startBreakBtn");
      const skipBreakBtn = document.getElementById("skipBreakBtn");
      const resetBtn = document.getElementById("resetBtn");
      const finishEarlyBtn = document.getElementById("finishEarlyBtn");
      const deleteLogBtn = document.getElementById("deleteLogBtn");
      const showTodayOnlyCheckbox = document.getElementById("showTodayOnly");
      const logList = document.getElementById("log");
      const visualContainer = document.getElementById("pomodoro-visual");
      const pomoCountElem = document.getElementById("pomo-count");
      const rewardQuoteElem = document.getElementById("reward-quote");
      const quoteBox = document.getElementById("quote-box");
      const alarmSound = document.getElementById("alarm-sound");
      const apiStatusElem = document.getElementById("api-status");
      const enableNotificationsBtn = document.getElementById("enableNotificationsBtn");
      const body = document.body;

      // Workday Management DOM Elements
      const workdayStatusIndicator = document.getElementById("workdayStatusIndicator"); 
      const startWorkdayBtn = document.getElementById("startWorkdayBtn");
      const endWorkdayBtn = document.getElementById("endWorkdayBtn");
      const timeDebtDisplay = document.getElementById("timeDebtDisplay");
      const timeDebtValueElem = document.getElementById("timeDebtValue");


      // --- Modal References ---
      const settingsBtn = document.getElementById("settingsBtn");
      const settingsModalContainer = document.getElementById("settings-modal-container");
      const closeSettingsBtn = document.getElementById("closeSettingsBtn");

      // --- Quotes Data ---
      const quotes = [
        "The secret of getting ahead is getting started. – Mark Twain",
        "Productivity is being able to do things that you were never able to do before. – Franz Kafka",
        "It always seems impossible until it's done. – Nelson Mandela",
        "The way to get started is to quit talking and begin doing. – Walt Disney",
        "Focus on being productive instead of busy. – Tim Ferriss",
        "The key is not to prioritize what's on your schedule, but to schedule your priorities. – Stephen Covey",
        "Either you run the day or the day runs you. – Jim Rohn",
        "Concentrate all your thoughts upon the work in hand. The sun's rays do not burn until brought to a focus. – Alexander Graham Bell"
      ];
      let currentQuoteIndex = 0;

      // --- State Variables ---
      let timerInterval = null;
      let debtAccumulatorInterval = null; // For dedicated debt accumulation
      let currentState = IDLE_STATE;
      let pausedFromState = null;
      let startTime = 0;
      let duration = 0;
      let pausedRemaining = null;
      let sessionCount = 0; 
      let notificationPermission = Notification.permission;

      // Workday State Variables
      let isWorkdayActive = false;
      let workdayStartTime = null;
      let timeDebt = 0; // in seconds
      let lastActivityEndTime = null; 
      let debtIntervalStartTime = null; // Tracks start of current live debt accumulation period

      // --- Utility Functions ---
      const formatTime = (totalSeconds) => {
        if (isNaN(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      };

      const updateTitle = (timeString, status) => {
        if (status === IDLE_STATE || status === PAUSED_STATE) {
          document.title = TITLE_PREFIX;
        } else {
          let statusText = status.charAt(0).toUpperCase() + status.slice(1);
          if (status === LONGBREAK_STATE) statusText = "Long Break";
          document.title = `${timeString} - ${statusText} | ${TITLE_PREFIX}`;
        }
      };

      const showApiError = (message) => {
        apiStatusElem.textContent = `Error: ${message}. Check server & console.`;
        console.error("API Error:", message);
      };

      const clearApiError = () => {
        apiStatusElem.textContent = '';
      };

      const getNextBreakInfo = () => {
        const longInterval = parseInt(longBreakIntervalInput.value || 4, 10);
        const isLongBreakNext = sessionCount >= longInterval && longInterval > 0;
        const breakMinutes = isLongBreakNext ? (longBreakInput.value || 25) : (breakInput.value || 5);
        const breakState = isLongBreakNext ? LONGBREAK_STATE : BREAK_STATE;
        const description = isLongBreakNext ? 'Long' : 'Short';
        return {
            isLong: isLongBreakNext,
            minutes: parseInt(breakMinutes, 10),
            state: breakState,
            description: description
        };
      };


      // --- Settings Manager ---
      const Settings = (() => {
        const defaults = {
          pomodoro: 25, 
          break: 5,     
          longBreak: 25,
          longBreakInterval: 4,
          alarm: 7,
          volume: 4,   
          showToday: true,
          notificationPerm: 'default',
          isWorkdayActive: false,
          workdayStartTime: null,
          timeDebt: 0,
          lastActivityEndTime: null // This stores the timestamp of when the *last active session ended* or when workday started/app loaded in idle.
        };

        const get = (key) => localStorage.getItem(key);
        const set = (key, value) => localStorage.setItem(key, value);
        const getJson = (key) => {
            const item = localStorage.getItem(key);
            try {
                return item ? JSON.parse(item) : null;
            } catch (e) {
                console.warn(`Could not parse JSON for key ${key}:`, e);
                return null;
            }
        };
        const setJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));

        const load = () => {
          pomodoroInput.value = get('pomodoro') || defaults.pomodoro;
          breakInput.value = get('break') || defaults.break;
          longBreakInput.value = get('longBreak') || defaults.longBreak;
          longBreakIntervalInput.value = get('longBreakInterval') || defaults.longBreakInterval;
          alarmLengthInput.value = get('alarm') || defaults.alarm;
          alarmVolumeInput.value = get('volume') || defaults.volume;
          volumeValueDisplay.textContent = alarmVolumeInput.value; 
          showTodayOnlyCheckbox.checked = (get('showToday') === null) ? defaults.showToday : (get('showToday') === 'true');
          notificationPermission = Notification.permission; 
          
          isWorkdayActive = getJson('isWorkdayActive') !== null ? getJson('isWorkdayActive') : defaults.isWorkdayActive;
          workdayStartTime = getJson('workdayStartTime') ? parseInt(getJson('workdayStartTime')) : defaults.workdayStartTime;
          timeDebt = getJson('timeDebt') ? parseFloat(getJson('timeDebt')) : defaults.timeDebt;
          // Load lastActivityEndTime. This is crucial for offline debt calculation.
          lastActivityEndTime = getJson('lastActivityEndTime') ? parseInt(getJson('lastActivityEndTime')) : defaults.lastActivityEndTime;

          if (isWorkdayActive && lastActivityEndTime && currentState === IDLE_STATE) { 
            const offlineIdleTimeSeconds = (Date.now() - lastActivityEndTime) / 1000; 
            if (offlineIdleTimeSeconds > 1) { 
                timeDebt += offlineIdleTimeSeconds;
                console.log(`Added ${formatTime(offlineIdleTimeSeconds)} of offline idle time to debt.`);
            }
            // Important: After accounting for offline debt, the current "idle" period effectively starts NOW.
            // WorkdayManager.startDebtAccumulation will set its own debtIntervalStartTime.
            // We also update lastActivityEndTime to now because the offline period is over.
            lastActivityEndTime = Date.now(); 
          }
          
          // If workday is active and we are idle, start accumulating debt.
          if (isWorkdayActive && currentState === IDLE_STATE) {
            WorkdayManager.startDebtAccumulation();
          }
        };

        const save = () => {
          set('pomodoro', pomodoroInput.value);
          set('break', breakInput.value);
          set('longBreak', longBreakInput.value);
          set('longBreakInterval', longBreakIntervalInput.value);
          set('alarm', alarmLengthInput.value);
          set('volume', alarmVolumeInput.value);
          set('showToday', showTodayOnlyCheckbox.checked);

          setJson('isWorkdayActive', isWorkdayActive);
          setJson('workdayStartTime', workdayStartTime);
          setJson('timeDebt', timeDebt);
          // lastActivityEndTime is updated by WorkdayManager methods, then saved here.
          setJson('lastActivityEndTime', lastActivityEndTime); 
        };

        [pomodoroInput, breakInput, longBreakInput, longBreakIntervalInput, alarmLengthInput, alarmVolumeInput, showTodayOnlyCheckbox].forEach(el => {
          el.addEventListener('change', save);
        });
        alarmVolumeInput.addEventListener('input', () => {
          volumeValueDisplay.textContent = alarmVolumeInput.value;
          save(); 
        });

        return { load, save, defaults }; // Expose defaults for App.playAlarm
      })();


      // --- Notification Manager ---
      const Notify = (() => {
        const requestPermission = async () => {
          if (!('Notification' in window)) {
            alert('This browser does not support desktop notification');
            return;
          }
          if (notificationPermission !== 'granted') {
            try {
              const permission = await Notification.requestPermission();
              notificationPermission = permission; 
              updateNotificationButton(); 
              console.log('Notification permission:', permission);
            } catch (error) {
              console.error('Error requesting notification permission:', error);
            }
          } else {
            console.log('Notifications already granted.');
          }
        };

        const show = (title, bodyContent) => {
          if (notificationPermission !== 'granted') {
            console.log("Notification permission not granted. Skipping notification.");
            return;
          }
          if ('Notification' in window) { 
              new Notification(title, { body: bodyContent, icon: 'pomodorsi.webp' });
          } else {
              console.error("Notifications not supported.");
          }
        };
        return { requestPermission, show };
      })();

      // --- Workday Manager ---
      const WorkdayManager = (() => {
        function updateDebtDisplay() {
            if (timeDebtDisplay.classList.contains('hidden') && isWorkdayActive) {
                timeDebtDisplay.classList.remove('hidden');
            }
            timeDebtValueElem.textContent = formatTime(timeDebt);
        }

        function startDebtAccumulation() {
            if (!isWorkdayActive || currentState !== IDLE_STATE) {
                stopDebtAccumulation(); // Ensure it's stopped if conditions aren't met
                return;
            }
            if (debtAccumulatorInterval) return; // Already running

            debtIntervalStartTime = Date.now(); // Mark the beginning of this specific idle accumulation period
            console.log("Starting dedicated debt accumulation interval.");
            debtAccumulatorInterval = setInterval(() => {
                if (isWorkdayActive && currentState === IDLE_STATE) {
                    const elapsedSinceIntervalStart = (Date.now() - debtIntervalStartTime) / 1000;
                    // This interval directly adds to timeDebt.
                    // The previous approach of adding (Date.now() - lastActivityEndTime) was prone to issues
                    // if lastActivityEndTime wasn't perfectly managed.
                    // Here, we add small increments.
                    timeDebt += DEBT_ACCUMULATOR_INTERVAL_MS / 1000; // Add 1 second of debt
                    updateDebtDisplay();
                    Settings.save(); // Save frequently while accumulating
                } else {
                    // Should not happen if interval is managed correctly, but as a safeguard:
                    stopDebtAccumulation();
                }
            }, DEBT_ACCUMULATOR_INTERVAL_MS);
        }

        function stopDebtAccumulation() {
            if (!debtAccumulatorInterval) return; // Not running

            clearInterval(debtAccumulatorInterval);
            debtAccumulatorInterval = null;
            
            // Calculate any final debt fragment since the last interval tick for this idle period
            if (debtIntervalStartTime && isWorkdayActive && currentState === IDLE_STATE) { // Check currentState too
                const fragmentSeconds = (Date.now() - debtIntervalStartTime) / 1000;
                const expectedAccumulation = Math.floor(fragmentSeconds / (DEBT_ACCUMULATOR_INTERVAL_MS / 1000)) * (DEBT_ACCUMULATOR_INTERVAL_MS / 1000);
                const actualSecondsSinceLastTick = fragmentSeconds % (DEBT_ACCUMULATOR_INTERVAL_MS / 1000);

                // This logic is tricky. The interval itself adds 1s per tick.
                // When stopping, the time since debtIntervalStartTime has passed.
                // The debt is already mostly accounted for by the interval.
                // We just need to ensure `lastActivityEndTime` is set correctly for the *next* phase.
            }
            console.log("Stopped dedicated debt accumulation interval.");
            debtIntervalStartTime = null; // Reset for the next idle period
            
            // When debt accumulation stops (e.g., work/break starts, or workday ends),
            // this point in time becomes the new `lastActivityEndTime` for potential offline calculation
            // or if the app immediately goes back to IDLE without an intervening active timer.
            lastActivityEndTime = Date.now();
            Settings.save(); // Save final debt and lastActivityEndTime
        }


        function start() {
            if (isWorkdayActive) return;
            isWorkdayActive = true;
            workdayStartTime = Date.now();
            timeDebt = 0; 
            lastActivityEndTime = workdayStartTime; // Initial last activity end is workday start
            console.log("Workday started at:", new Date(workdayStartTime).toLocaleTimeString());
            updateWorkdayUI();
            if (currentState === IDLE_STATE) { // Should always be true when workday starts
                startDebtAccumulation();
            }
            Settings.save(); 
        }

        function end() {
            if (!isWorkdayActive) return;
            
            stopDebtAccumulation(); // Stop and finalize any ongoing idle debt accumulation

            const workdayDuration = (workdayStartTime ? (Date.now() - workdayStartTime) / 1000 : 0);
            console.log("Workday ended. Duration:", formatTime(workdayDuration), "Final Time Debt:", formatTime(timeDebt));
            
            isWorkdayActive = false;
            workdayStartTime = null;
            lastActivityEndTime = null; 
            
            updateWorkdayUI();
            Settings.save(); 
        }
        
        // This function is no longer the primary way to add debt during live transitions.
        // Its role is reduced. The debtAccumulatorInterval handles live idle time.
        // calculateAndApplyDebtOnTransition() is effectively replaced by start/stopDebtAccumulation calls.

        function reduceDebt(amountToReduceInSeconds) { 
            if (!isWorkdayActive) return;
            const scheduledReduction = amountToReduceInSeconds;
            timeDebt -= scheduledReduction;
            if (timeDebt < 0) timeDebt = 0;
            console.log(`Debt reduced by scheduled ${formatTime(scheduledReduction)}. Remaining debt: ${formatTime(timeDebt)}`);
            updateDebtDisplay(); // Update display immediately
            Settings.save();
        }

        function updateWorkdayUI() {
            if (isWorkdayActive) {
                workdayStatusIndicator.textContent = "Workday: Active";
                workdayStatusIndicator.classList.remove('status-stopped');
                workdayStatusIndicator.classList.add('status-active');
                startWorkdayBtn.classList.add('hidden');
                endWorkdayBtn.classList.remove('hidden');
                timeDebtDisplay.classList.remove('hidden'); // Ensure visible if workday active
            } else {
                workdayStatusIndicator.textContent = "Workday: Stopped";
                workdayStatusIndicator.classList.remove('status-active');
                workdayStatusIndicator.classList.add('status-stopped');
                startWorkdayBtn.classList.remove('hidden');
                endWorkdayBtn.classList.add('hidden');
                timeDebtDisplay.classList.add('hidden');
            }
            updateDebtDisplay(); // Always update debt display with current value
            startWorkBtn.disabled = false; 
        }
        
        // Call this when a work/break session *actually ends* (completes, skipped, finished early)
        // This marks the beginning of a new potential IDLE period.
        function markEndOfSessionActivity() {
            if(isWorkdayActive) {
                lastActivityEndTime = Date.now(); // This is the key timestamp for offline and for starting next idle debt calc
                console.log("Session activity (work/break) ended. lastActivityEndTime updated:", new Date(lastActivityEndTime).toLocaleTimeString());
                Settings.save(); 
                if (currentState === IDLE_STATE) { // If we are now idle
                    startDebtAccumulation();
                }
            }
        }

        return { start, end, reduceDebt, updateWorkdayUI, markEndOfSessionActivity, startDebtAccumulation, stopDebtAccumulation };
      })();


      // --- Timer Module ---
      const Timer = (() => {

        function updateDisplay(remainingSeconds) {
          const timeString = formatTime(remainingSeconds);
          timerDisplay.textContent = timeString;
          timerDisplay.classList.toggle('low-time', remainingSeconds <= 10 && remainingSeconds > 0 && currentState !== IDLE_STATE && currentState !== PAUSED_STATE);
          updateTitle(timeString, currentState);
        }

        function updateUIState() {
          body.className = ''; 
          startWorkBtn.classList.remove('state-running');
          startBreakBtn.classList.add('hidden');
          skipBreakBtn.classList.add('hidden');
          finishEarlyBtn.classList.add('hidden');

          const baseStateForClass = currentState === PAUSED_STATE ? pausedFromState : currentState;
          if (baseStateForClass === WORK_STATE) body.classList.add('state-work');
          else if (baseStateForClass === BREAK_STATE || baseStateForClass === LONGBREAK_STATE) body.classList.add('state-break');

          switch (currentState) {
            case WORK_STATE:
            case BREAK_STATE:
            case LONGBREAK_STATE:
              timerStatusDisplay.textContent = currentState === WORK_STATE ? `Working... (Cycle ${sessionCount + 1}/${longBreakIntervalInput.value || 4})`
                                               : `${currentState === LONGBREAK_STATE ? 'Long ' : 'Short '}Break!`;
              startWorkBtn.textContent = "Pause"; // Generic "Pause"
              startWorkBtn.classList.add('state-running');
              if (currentState === WORK_STATE) finishEarlyBtn.classList.remove('hidden');
              else skipBreakBtn.classList.remove('hidden');
              break;
            case PAUSED_STATE:
              const pausedWhat = pausedFromState === WORK_STATE ? 'Work'
                : pausedFromState === LONGBREAK_STATE ? 'Long Break'
                  : pausedFromState === BREAK_STATE ? 'Short Break' : 'Session';
              timerStatusDisplay.textContent = `${pausedWhat} Paused (${formatTime(pausedRemaining)})`;
              startWorkBtn.textContent = "Resume";
              if (pausedFromState === WORK_STATE) finishEarlyBtn.classList.remove('hidden');
              if (pausedFromState === BREAK_STATE || pausedFromState === LONGBREAK_STATE) skipBreakBtn.classList.remove('hidden');
              break;
            case IDLE_STATE:
            default:
              timerStatusDisplay.textContent = "Ready";
              startWorkBtn.textContent = "Start Work";
              const nextBreak = getNextBreakInfo();
              startBreakBtn.textContent = `Start ${nextBreak.description} Break (${nextBreak.minutes} min)`;
              startBreakBtn.setAttribute('aria-label', `Start ${nextBreak.description} Break Timer (${nextBreak.minutes} minutes)`);
              startBreakBtn.classList.remove('hidden');
              
              const initialTime = (pomodoroInput.value || 25) * 60;
              updateDisplay(initialTime);
              updateTitle(formatTime(initialTime), IDLE_STATE);
              
              // If workday is active and we enter IDLE, start accumulating debt
              if(isWorkdayActive) WorkdayManager.startDebtAccumulation();
              break;
          }
          WorkdayManager.updateWorkdayUI(); 
        }

        function tick() {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          let remaining = duration - elapsed; 

          if (remaining > 0) {
            updateDisplay(remaining);
          } else {
            clearInterval(timerInterval);
            timerInterval = null;
            updateDisplay(0);

            const completedState = currentState;
            currentState = IDLE_STATE; 

            App.playAlarm(false, completedState);
            WorkdayManager.markEndOfSessionActivity(); // Marks end of active session, potentially starts debt accumulation

            if (completedState === WORK_STATE) {
              LogManager.logPomodoro().then(() => {
                timerStatusDisplay.textContent = `Work complete! Ready for a break.`;
                updateUIState(); 
              }).catch(() => {
                timerStatusDisplay.textContent = "Work complete! (Log failed). Ready.";
                updateUIState();
              });
            } else if (completedState === BREAK_STATE || completedState === LONGBREAK_STATE) {
              timerStatusDisplay.textContent = "Break finished. Ready for next session!";
              updateUIState(); 
            } else {
              updateUIState(); 
            }
          }
        }

        function start(state, minutes) {
           if (timerInterval && currentState !== PAUSED_STATE) return; // Already running a non-paused timer
           // Allow starting if IDLE or PAUSED. If PAUSED, this effectively overrides the pause.
           
            WorkdayManager.stopDebtAccumulation(); // Stop debt if it was accumulating (i.e., if current state was IDLE)
            
            clearInterval(timerInterval); // Clear any existing main timer
            timerInterval = null;
            pausedRemaining = null;
            pausedFromState = null;
            
            let actualMinutes = parseFloat(minutes); 

            currentState = state;
            duration = actualMinutes * 60;
            startTime = Date.now();

            updateDisplay(duration);
            updateUIState();

            if (duration > 0) {
                 timerInterval = setInterval(tick, TICK_INTERVAL_MS);
            } else {
                console.warn(`Starting timer with duration 0 for state: ${state}. Completing immediately.`);
                tick(); 
            }
        }

        function pause() {
          if (!timerInterval || currentState === PAUSED_STATE || currentState === IDLE_STATE) return;
          
          WorkdayManager.stopDebtAccumulation(); // Stop debt accumulation as we are no longer IDLE.
                                              // Mark this point as end of activity for potential offline debt if app closes while paused.
          lastActivityEndTime = Date.now(); // Treat pause as an "end of active phase" for debt purposes
          Settings.save();

          clearInterval(timerInterval);
          timerInterval = null;
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          pausedRemaining = Math.max(0, duration - elapsed);
          pausedFromState = currentState;
          currentState = PAUSED_STATE;
          
          updateUIState();
          updateDisplay(pausedRemaining);
        }

        function resume() {
          if (currentState !== PAUSED_STATE || pausedRemaining === null || pausedFromState === null) return;
          
          // When resuming, we are no longer IDLE. Debt accumulation should be stopped (if it somehow started).
          WorkdayManager.stopDebtAccumulation(); 
          
          currentState = pausedFromState;
          duration = pausedRemaining;
          startTime = Date.now(); 
          pausedRemaining = null;
          pausedFromState = null;
          
          updateUIState();
          if (duration > 0) {
             timerInterval = setInterval(tick, TICK_INTERVAL_MS);
          } else {
             tick(); // If remaining duration was 0, complete immediately
          }
        }

        function workToggle() {
          if (currentState === WORK_STATE || currentState === BREAK_STATE || currentState === LONGBREAK_STATE) {
            pause();
          } else if (currentState === PAUSED_STATE) {
            resume();
          } else if (currentState === IDLE_STATE) {
            // Debt accumulation stops when `start()` is called.
            start(WORK_STATE, pomodoroInput.value || 25);
          }
        }

        function startBreakHandler() {
          if (currentState !== IDLE_STATE || startBreakBtn.classList.contains('hidden')) return;

          // Debt accumulation stops when `start()` is called.
          let breakInfo = getNextBreakInfo();
          let scheduledBreakMinutes = breakInfo.minutes;
          let actualBreakMinutes = scheduledBreakMinutes;

          if (isWorkdayActive) {
            // Time debt would have been accumulated by the debtAccumulatorInterval up to this point.
            let currentDebtSeconds = timeDebt; 
            actualBreakMinutes = scheduledBreakMinutes - (currentDebtSeconds / 60); 
            if (actualBreakMinutes < 0) actualBreakMinutes = 0;
            
            WorkdayManager.reduceDebt(scheduledBreakMinutes * 60); 
            
            if (actualBreakMinutes < scheduledBreakMinutes) {
                console.log(`Break shortened due to debt. Scheduled: ${scheduledBreakMinutes} min, Actual: ${actualBreakMinutes.toFixed(1)} min`);
                // timerStatusDisplay.textContent = `Break (shortened by debt): ${formatTime(actualBreakMinutes * 60)}`; // This might be cleared by updateUIState
            }
          }
          
          console.log(`Starting ${breakInfo.description} break (${actualBreakMinutes.toFixed(1)} min).`);
          start(breakInfo.state, actualBreakMinutes);

          if (breakInfo.isLong) {
            sessionCount = 0;
          }
        }

        function skipBreakHandler() {
          if (currentState === BREAK_STATE || currentState === LONGBREAK_STATE || (currentState === PAUSED_STATE && (pausedFromState === BREAK_STATE || pausedFromState === LONGBREAK_STATE))) {
            if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
            
            pausedRemaining = null;
            pausedFromState = null;
            currentState = IDLE_STATE;
            timerStatusDisplay.textContent = "Break skipped. Ready to work!";
            
            WorkdayManager.markEndOfSessionActivity(); // Break is over, mark end, start debt if idle
            updateUIState(); 
          }
        }

        function reset() { 
          if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
          WorkdayManager.stopDebtAccumulation(); // Stop any ongoing debt accumulation

          pausedRemaining = null;
          pausedFromState = null;
          currentState = IDLE_STATE;
          sessionCount = 0; 
          
          WorkdayManager.markEndOfSessionActivity(); // Resetting implies current activity segment ends.
          updateUIState(); 
          const workMinutes = pomodoroInput.value || 25;
          updateDisplay(workMinutes * 60);
          updateTitle(formatTime(workMinutes * 60), IDLE_STATE);
        }


        function finishEarly() {
          if (currentState === WORK_STATE || (currentState === PAUSED_STATE && pausedFromState === WORK_STATE)) {
            if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
            const completedStateBeforeLog = WORK_STATE;
            currentState = IDLE_STATE;
            pausedRemaining = null;
            pausedFromState = null;

            App.playAlarm(true, completedStateBeforeLog);
            WorkdayManager.markEndOfSessionActivity(); 

            LogManager.logPomodoro().then(() => {
              timerStatusDisplay.textContent = `Finished Early! Ready for a break.`;
            }).catch(() => {
              timerStatusDisplay.textContent = "Finished Early! (Log failed). Ready.";
            }).finally(() => {
              updateUIState(); 
            });
          }
        }

        return { workToggle, startBreakHandler, skipBreakHandler, reset, finishEarly, updateUIState };
      })();


      // --- Log Manager Module ---
      const LogManager = (() => {
        let currentLogs = [];
        let todayLogCount = 0;

        async function fetchLogs() {
          clearApiError();
          try {
            const response = await fetch(LOGS_ENDPOINT);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            currentLogs = data.logs || [];
            return currentLogs;
          } catch (err) {
            showApiError(`Fetch logs failed: ${err.message}`);
            return currentLogs; 
          }
        }

        async function renderLogs() {
          const logsToRender = await fetchLogs();
          const today_YYYY_MM_DD = new Date().toISOString().split('T')[0];

          todayLogCount = logsToRender.filter(log => typeof log === 'string' && log.startsWith(today_YYYY_MM_DD)).length;
          pomoCountElem.textContent = `Today's sessions: ${todayLogCount}`;
          updatePomodoroVisual(todayLogCount);

          const filteredLogs = showTodayOnlyCheckbox.checked
            ? logsToRender.filter(log => typeof log === 'string' && log.startsWith(today_YYYY_MM_DD))
            : logsToRender;

          logList.innerHTML = "";
          if (filteredLogs.length === 0) {
            const li = document.createElement("li");
            li.textContent = showTodayOnlyCheckbox.checked ? "No Pomodoros completed today yet." : "No Pomodoros logged yet.";
            li.classList.add('empty-log');
            logList.appendChild(li);
          } else {
            filteredLogs.slice().reverse().forEach(entry => {
              const li = document.createElement("li");
              li.textContent = entry;
              logList.appendChild(li);
            });
          }
          updateRewardQuote(todayLogCount);
        }

        function updatePomodoroVisual(countForToday) {
          visualContainer.innerHTML = "";
          const validCount = Math.max(0, parseInt(countForToday || 0, 10));
          for (let i = 0; i < validCount; i++) {
            const dot = document.createElement("div");
            dot.classList.add("pomodoro-dot", WORK_STATE);
            dot.title = `Pomodoro ${i + 1} completed today`;
            visualContainer.appendChild(dot);
          }
        }

        function updateRewardQuote(count) {
          let rewardMessage = '';
          if (count >= 20) rewardMessage = "Incredible achievement! 20+ Pomodoros today! 🎉";
          else if (count >= 16) rewardMessage = "Outstanding work! 16 Pomodoros logged today! 🔥";
          else if (count >= 12) rewardMessage = "Amazing effort! 12 Pomodoros completed! Keep it up!";
          else if (count >= 8) rewardMessage = "Great job! 8 Pomodoros done! Your focus is sharp!";
          else if (count >= 4) rewardMessage = "Solid progress! 4 Pomodoros completed!";
          
          rewardQuoteElem.textContent = rewardMessage;
          rewardQuoteElem.classList.toggle('visible', !!rewardMessage);
        }

        async function logPomodoro() {
          sessionCount++;
          const now = new Date();
          const logEntry = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

          clearApiError();
          try {
            const response = await fetch(LOG_ENDPOINT, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ logEntry })
            });
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            await renderLogs();
            return true;
          } catch (err) {
            showApiError(`Save log failed: ${err.message}`);
            sessionCount = Math.max(0, sessionCount - 1);
            await renderLogs(); 
            throw err;
          }
        }

        async function deleteLastLog() {
          clearApiError();
          try {
            const response = await fetch(DELETE_LOG_ENDPOINT, { method: "POST" });
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            await renderLogs();
            if(currentState === IDLE_STATE) { 
                 sessionCount = 0; // Reset session count for long break cycle if idle
                 Timer.updateUIState(); 
             }
          } catch (err) {
            showApiError(`Delete log failed: ${err.message}`);
          }
        }
        return { renderLogs, logPomodoro, deleteLastLog };
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

          alarmSound.currentTime = 0;
          alarmSound.volume = Math.max(0, Math.min(1, (parseInt(alarmVolumeInput.value || Settings.defaults.volume, 10)) / 10)); 
          alarmSound.play().catch(e => console.error("Error playing sound:", e));
          setTimeout(() => { if (!alarmSound.paused) { alarmSound.pause(); alarmSound.currentTime = 0; }}, effectiveDurationMs);

          let notifyTitle = "Time's Up!", notifyBody = "Session finished.";
          if (completedState === BREAK_STATE || completedState === LONGBREAK_STATE) { notifyTitle = "Break Over!"; notifyBody = "Time to get back to work!"; }
          else if (isEarlyFinish && completedState === WORK_STATE) { notifyTitle = "Session Finished Early!"; notifyBody = "Pomodoro logged. Time for a break!"; }
          else if (completedState === WORK_STATE) { notifyTitle = "Work Session Complete!"; notifyBody = "Great focus! Time for a well-deserved break."; }
          Notify.show(notifyTitle, notifyBody);
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
          
          startWorkBtn.addEventListener("click", Timer.workToggle);
          startBreakBtn.addEventListener("click", Timer.startBreakHandler);
          skipBreakBtn.addEventListener("click", Timer.skipBreakHandler);
          resetBtn.addEventListener("click", Timer.reset);
          finishEarlyBtn.addEventListener("click", Timer.finishEarly);
          deleteLogBtn.addEventListener("click", LogManager.deleteLastLog);
          showTodayOnlyCheckbox.addEventListener("change", LogManager.renderLogs);
          enableNotificationsBtn.addEventListener("click", Notify.requestPermission);
          
          startWorkdayBtn.addEventListener("click", WorkdayManager.start);
          endWorkdayBtn.addEventListener("click", WorkdayManager.end);

          alarmVolumeInput.addEventListener('input', () => {
            volumeValueDisplay.textContent = alarmVolumeInput.value;
            // Save is handled by the Settings module's event listener
          });

          SettingsModal.init();
          setInterval(cycleQuotes, QUOTE_CYCLE_INTERVAL_MS);
          updateNotificationButton(); 
          console.log("Pomodoro App Initialized with Time Debt feature.");
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
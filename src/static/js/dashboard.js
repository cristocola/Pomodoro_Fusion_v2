const API_ENDPOINT = "/logs";

// DOM Elements
const refreshButton = document.getElementById('refresh-button');
const sortSelect = document.getElementById('sort-order');
const logDetailsContainer = document.getElementById('log-details-content');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const noLogsState = document.getElementById('no-logs-state');
const heatmapPrevYearBtn = document.getElementById('heatmap-prev-year');
const heatmapNextYearBtn = document.getElementById('heatmap-next-year');
const heatmapYearDisplay = document.getElementById('heatmap-year-display');

const dailyFlowModal = document.getElementById('daily-flow-modal');
const dailyFlowModalClose = document.getElementById('daily-flow-modal-close');
const dailyFlowModalTitle = document.getElementById('daily-flow-modal-title');

let hourlyChart = null;
let trendsChart = null;
let dailyFlowChartInstance = null;
let currentHeatmapYear = new Date().getFullYear();
let processedGlobalData = null; // To store processed data for reuse

// Achievements Configuration with categories and sanitized names
const achievementsConfig = {
    // Category: Pomodoro Milestones
    pomo_50: { name: "Focused Fifty", icon: "fas fa-seedling", desc: "Complete 50 Pomodoros", category: "Pomodoro Milestones", target: 50, getCurrent: (stats) => stats.totalPomodoros, condition: (stats) => stats.totalPomodoros >= 50 },
    pomo_100: { name: "Century Club", icon: "fas fa-medal", desc: "Complete 100 Pomodoros", category: "Pomodoro Milestones", target: 100, getCurrent: (stats) => stats.totalPomodoros, condition: (stats) => stats.totalPomodoros >= 100 },
    pomo_500: { name: "Pomo Powerhouse", icon: "fas fa-dumbbell", desc: "Complete 500 Pomodoros", category: "Pomodoro Milestones", target: 500, getCurrent: (stats) => stats.totalPomodoros, condition: (stats) => stats.totalPomodoros >= 500 },
    pomo_1000: { name: "Kilo-Focus", icon: "fas fa-brain", desc: "Complete 1000 Pomodoros", category: "Pomodoro Milestones", target: 1000, getCurrent: (stats) => stats.totalPomodoros, condition: (stats) => stats.totalPomodoros >= 1000 },
    pomo_2500: { name: "Grand Master", icon: "fas fa-chess-king", desc: "Complete 2,500 Pomodoros", category: "Pomodoro Milestones", target: 2500, getCurrent: (stats) => stats.totalPomodoros, condition: (stats) => stats.totalPomodoros >= 2500 },
    pomo_5000: { name: "Pomo Legend", icon: "fas fa-dragon", desc: "Complete 5,000 Pomodoros", category: "Pomodoro Milestones", target: 5000, getCurrent: (stats) => stats.totalPomodoros, condition: (stats) => stats.totalPomodoros >= 5000 },
    pomo_10000: { name: "Pomo Deity", icon: "fas fa-infinity", desc: "Complete 10,000 Pomodoros", category: "Pomodoro Milestones", target: 10000, getCurrent: (stats) => stats.totalPomodoros, condition: (stats) => stats.totalPomodoros >= 10000 },
    pomo_15000_pro: { name: "Pomo Celestial", icon: "fas fa-star-of-life", desc: "Complete 15,000 Pomodoros", category: "Pomodoro Milestones", tier: 'pro', target: 15000, getCurrent: (stats) => stats.totalPomodoros, condition: (stats) => stats.totalPomodoros >= 15000 },
    pomo_20000_furious: { name: "Pomo Ascendant", icon: "fas fa-rocket", desc: "Complete 20,000 Pomodoros", category: "Pomodoro Milestones", tier: 'furious', target: 20000, getCurrent: (stats) => stats.totalPomodoros, condition: (stats) => stats.totalPomodoros >= 20000 },
    pomo_25000_legendary: { name: "Pomo Overlord", icon: "fas fa-satellite-dish", desc: "Complete 25,000 Pomodoros!", category: "Pomodoro Milestones", tier: 'legendary', target: 25000, getCurrent: (stats) => stats.totalPomodoros, condition: (stats) => stats.totalPomodoros >= 25000 },
    pomo_30000_legacy: { name: "Focus Weaver", icon: "fas fa-atom", desc: "Complete 30,000 Pomodoros!", category: "Pomodoro Milestones", tier: 'legendary', target: 30000, getCurrent: (stats) => stats.totalPomodoros, condition: (stats) => stats.totalPomodoros >= 30000 },

    // Category: Streaks
    streak_3: { name: "On a Roll!", icon: "fas fa-wind", desc: "3-day streak", category: "Streaks", target: 3, getCurrent: (stats) => Math.max(stats.longestStreak.duration, stats.currentStreak.duration), condition: (stats) => stats.longestStreak.duration >= 3 || stats.currentStreak.duration >= 3 },
    streak_7: { name: "Week Warrior", icon: "fas fa-calendar-week", desc: "7-day streak", category: "Streaks", target: 7, getCurrent: (stats) => Math.max(stats.longestStreak.duration, stats.currentStreak.duration), condition: (stats) => stats.longestStreak.duration >= 7 || stats.currentStreak.duration >= 7 },
    streak_14: { name: "Fortnight Focus", icon: "fas fa-shield-alt", desc: "14-day streak", category: "Streaks", target: 14, getCurrent: (stats) => Math.max(stats.longestStreak.duration, stats.currentStreak.duration), condition: (stats) => stats.longestStreak.duration >= 14 || stats.currentStreak.duration >= 14 },
    streak_30: { name: "Month Master", icon: "fas fa-crown", desc: "30-day streak", category: "Streaks", target: 30, getCurrent: (stats) => Math.max(stats.longestStreak.duration, stats.currentStreak.duration), condition: (stats) => stats.longestStreak.duration >= 30 || stats.currentStreak.duration >= 30 },
    streak_60: { name: "Two Month Titan", icon: "fas fa-calendar-alt", desc: "60-day streak", category: "Streaks", target: 60, getCurrent: (stats) => Math.max(stats.longestStreak.duration, stats.currentStreak.duration), condition: (stats) => stats.longestStreak.duration >= 60 || stats.currentStreak.duration >= 60 },
    streak_90: { name: "Quarterly Quest", icon: "fas fa-hourglass-half", desc: "90-day streak", category: "Streaks", target: 90, getCurrent: (stats) => Math.max(stats.longestStreak.duration, stats.currentStreak.duration), condition: (stats) => stats.longestStreak.duration >= 90 || stats.currentStreak.duration >= 90 },
    streak_100: { name: "The Unbroken", icon: "fas fa-link", desc: "100-day streak", category: "Streaks", target: 100, getCurrent: (stats) => Math.max(stats.longestStreak.duration, stats.currentStreak.duration), condition: (stats) => stats.longestStreak.duration >= 100 || stats.currentStreak.duration >= 100 },
    streak_150_pro: { name: "Perpetual Motion", icon: "fas fa-infinity", desc: "150-day streak", category: "Streaks", tier: 'pro', target: 150, getCurrent: (stats) => Math.max(stats.longestStreak.duration, stats.currentStreak.duration), condition: (stats) => stats.longestStreak.duration >= 150 || stats.currentStreak.duration >= 150 },
    streak_200_furious: { name: "The Unrelenting", icon: "fas fa-shield-alt", desc: "200-day streak!", category: "Streaks", tier: 'furious', target: 200, getCurrent: (stats) => Math.max(stats.longestStreak.duration, stats.currentStreak.duration), condition: (stats) => stats.longestStreak.duration >= 200 || stats.currentStreak.duration >= 200 },
    streak_365_legendary: { name: "Year of Focus", icon: "fas fa-calendar-check", desc: "A full 365-day streak!", category: "Streaks", tier: 'legendary', target: 365, getCurrent: (stats) => Math.max(stats.longestStreak.duration, stats.currentStreak.duration), condition: (stats) => stats.longestStreak.duration >= 365 || stats.currentStreak.duration >= 365 },
    streak_500_legacy: { name: "Eternal Flame", icon: "fas fa-fire-alt", desc: "A 500-day streak!", category: "Streaks", tier: 'legendary', target: 500, getCurrent: (stats) => Math.max(stats.longestStreak.duration, stats.currentStreak.duration), condition: (stats) => stats.longestStreak.duration >= 500 || stats.currentStreak.duration >= 500 },

    // Category: Peak Performance
    peak_day_10: { name: "Double Digits", icon: "fas fa-angle-double-up", desc: "10+ Pomos in a day", category: "Peak Performance", target: 10, getCurrent: (stats) => stats.bestDay.count, condition: (stats) => stats.bestDay.count >= 10 },
    peak_day_15: { name: "Focus Fifteen", icon: "fas fa-rocket", desc: "15+ Pomos in a day", category: "Peak Performance", target: 15, getCurrent: (stats) => stats.bestDay.count, condition: (stats) => stats.bestDay.count >= 15 },
    peak_day_20: { name: "Unstoppable!", icon: "fas fa-meteor", desc: "20+ Pomos in a day", category: "Peak Performance", target: 20, getCurrent: (stats) => stats.bestDay.count, condition: (stats) => stats.bestDay.count >= 20 },
    peak_day_25: { name: "Pomo Pro", icon: "fas fa-user-astronaut", desc: "25+ Pomos in a day", category: "Peak Performance", target: 25, getCurrent: (stats) => stats.bestDay.count, condition: (stats) => stats.bestDay.count >= 25 },
    peak_day_30_pro: { name: "Peak Day - Pro", icon: "fas fa-mountain", desc: "30+ Pomos in a single day!", category: "Peak Performance", tier: 'pro', target: 30, getCurrent: (stats) => stats.bestDay.count, condition: (stats) => stats.bestDay.count >= 30 },
    peak_day_35_furious: { name: "Peak Day - Furious", icon: "fas fa-broadcast-tower", desc: "35+ Pomos in a single day!", category: "Peak Performance", tier: 'furious', target: 35, getCurrent: (stats) => stats.bestDay.count, condition: (stats) => stats.bestDay.count >= 35 },
    peak_day_40_legendary: { name: "Day of Legends", icon: "fas fa-meteor", desc: "40+ Pomos in one day!", category: "Peak Performance", tier: 'legendary', target: 40, getCurrent: (stats) => stats.bestDay.count, condition: (stats) => stats.bestDay.count >= 40 },
    peak_day_45_legacy: { name: "Chronos Defied", icon: "fas fa-hourglass-end", desc: "45+ Pomos in one day!", category: "Peak Performance", tier: 'legendary', target: 45, getCurrent: (stats) => stats.bestDay.count, condition: (stats) => stats.bestDay.count >= 45 },

    productive_week_30: { name: "Productive Week", icon: "fas fa-star", desc: "30+ Pomos in a week", category: "Peak Performance", target: 30, getCurrent: (stats) => stats.bestWeek.count, condition: (stats) => stats.bestWeek.count >= 30 },
    productive_week_50: { name: "Super Week", icon: "fas fa-bolt", desc: "50+ Pomos in a week", category: "Peak Performance", target: 50, getCurrent: (stats) => stats.bestWeek.count, condition: (stats) => stats.bestWeek.count >= 50 },
    productive_week_75: { name: "Mega Week", icon: "fas fa-fighter-jet", desc: "75+ Pomos in a week", category: "Peak Performance", target: 75, getCurrent: (stats) => stats.bestWeek.count, condition: (stats) => stats.bestWeek.count >= 75 },
    centurion_week: { name: "The Centurion", icon: "fas fa-shield-halved", desc: "100 Pomos in a week", category: "Peak Performance", target: 100, getCurrent: (stats) => stats.bestWeek.count, condition: (stats) => stats.bestWeek.count >= 100 },
    productive_week_110_pro: { name: "Power Week", icon: "fas fa-bolt", desc: "110+ Pomos in a single week!", category: "Peak Performance", tier: 'pro', target: 110, getCurrent: (stats) => stats.bestWeek.count, condition: (stats) => stats.bestWeek.count >= 110 },
    productive_week_120_furious: { name: "Storm Week", icon: "fas fa-wind", desc: "120+ Pomos in a single week!", category: "Peak Performance", tier: 'furious', target: 120, getCurrent: (stats) => stats.bestWeek.count, condition: (stats) => stats.bestWeek.count >= 120 },
    productive_week_130_legendary: { name: "Week of Wonders", icon: "fas fa-star", desc: "130+ Pomos in one week!", category: "Peak Performance", tier: 'legendary', target: 130, getCurrent: (stats) => stats.bestWeek.count, condition: (stats) => stats.bestWeek.count >= 130 },
    productive_week_140_legacy: { name: "Titan's Week", icon: "fas fa-gavel", desc: "140+ Pomos in one week!", category: "Peak Performance", tier: 'legendary', target: 140, getCurrent: (stats) => stats.bestWeek.count, condition: (stats) => stats.bestWeek.count >= 140 },

    power_month_100: { name: "Power Month", icon: "fas fa-battery-full", desc: "100+ Pomos in a calendar month", category: "Peak Performance", target: 100, getCurrent: (stats) => stats.bestMonth.count, condition: (stats) => stats.bestMonth.count >= 100 },
    power_month_200: { name: "Ultra Month", icon: "fas fa-charging-station", desc: "200+ Pomos in a calendar month", category: "Peak Performance", target: 200, getCurrent: (stats) => stats.bestMonth.count, condition: (stats) => stats.bestMonth.count >= 200 },
    power_month_250_pro: { name: "Mega Month", icon: "fas fa-calendar-alt", desc: "250+ Pomos in a calendar month!", category: "Peak Performance", tier: 'pro', target: 250, getCurrent: (stats) => stats.bestMonth.count, condition: (stats) => stats.bestMonth.count >= 250 },
    power_month_300_furious: { name: "Giga Month", icon: "fas fa-layer-group", desc: "300+ Pomos in a calendar month!", category: "Peak Performance", tier: 'furious', target: 300, getCurrent: (stats) => stats.bestMonth.count, condition: (stats) => stats.bestMonth.count >= 300 },
    power_month_350_legendary: { name: "Month of Mastery", icon: "fas fa-crown", desc: "350+ Pomos in a calendar month!", category: "Peak Performance", tier: 'legendary', target: 350, getCurrent: (stats) => stats.bestMonth.count, condition: (stats) => stats.bestMonth.count >= 350 },
    power_month_400_legacy: { name: "Zenith Month", icon: "fas fa-place-of-worship", desc: "400+ Pomos in a calendar month!", category: "Peak Performance", tier: 'legendary', target: 400, getCurrent: (stats) => stats.bestMonth.count, condition: (stats) => stats.bestMonth.count >= 400 },

    // Category: Daily Consistency
    elite_4_days_100: { name: "Steady 4+", icon: "fas fa-dice-four", desc: "100 days with 4+ Pomodoros", category: "Daily Consistency", target: 100, getCurrent: (stats) => stats.countDaysOver4Pomos, condition: (stats) => stats.countDaysOver4Pomos >= 100 },
    elite_8_days_25: { name: "Consistent 8+", icon: "fas fa-mountain", desc: "25 days with 8+ Pomodoros", category: "Daily Consistency", target: 25, getCurrent: (stats) => stats.countDaysOver8Pomos, condition: (stats) => stats.countDaysOver8Pomos >= 25 },
    elite_8_days_100: { name: "Dedicated 8+", icon: "fas fa-gem", desc: "100 days with 8+ Pomodoros", category: "Daily Consistency", target: 100, getCurrent: (stats) => stats.countDaysOver8Pomos, condition: (stats) => stats.countDaysOver8Pomos >= 100 },
    elite_8_days_200: { name: "Masterful 8+", icon: "fas fa-landmark", desc: "200 days with 8+ Pomodoros", category: "Daily Consistency", target: 200, getCurrent: (stats) => stats.countDaysOver8Pomos, condition: (stats) => stats.countDaysOver8Pomos >= 200 },
    elite_12_days_25: { name: "Consistent 12+", icon: "fas fa-chart-line", desc: "25 days with 12+ Pomodoros", category: "Daily Consistency", target: 25, getCurrent: (stats) => stats.countDaysOver12Pomos, condition: (stats) => stats.countDaysOver12Pomos >= 25 },
    elite_12_days_100: { name: "Dedicated 12+", icon: "fas fa-trophy", desc: "100 days with 12+ Pomodoros", category: "Daily Consistency", target: 100, getCurrent: (stats) => stats.countDaysOver12Pomos, condition: (stats) => stats.countDaysOver12Pomos >= 100 },
    elite_12_days_200: { name: "Masterful 12+", icon: "fas fa-university", desc: "200 days with 12+ Pomodoros", category: "Daily Consistency", target: 200, getCurrent: (stats) => stats.countDaysOver12Pomos, condition: (stats) => stats.countDaysOver12Pomos >= 200 },
    elite_12_days_300_pro: { name: "Deep Work Adept (12+)", icon: "fas fa-brain", desc: "300 days with 12+ Pomodoros", category: "Daily Consistency", tier: 'pro', target: 300, getCurrent: (stats) => stats.countDaysOver12Pomos, condition: (stats) => stats.countDaysOver12Pomos >= 300 },
    elite_12_days_400_furious: { name: "Deep Work Savant (12+)", icon: "fas fa-hat-wizard", desc: "400 days with 12+ Pomodoros", category: "Daily Consistency", tier: 'furious', target: 400, getCurrent: (stats) => stats.countDaysOver12Pomos, condition: (stats) => stats.countDaysOver12Pomos >= 400 },
    elite_12_days_500_legendary: { name: "Scholarly Sage (12+)", icon: "fas fa-book-reader", desc: "500 days with 12+ Pomodoros", category: "Daily Consistency", tier: 'legendary', target: 500, getCurrent: (stats) => stats.countDaysOver12Pomos, condition: (stats) => stats.countDaysOver12Pomos >= 500 },
    elite_16_days_25: { name: "Consistent 16+", icon: "fas fa-fire", desc: "25 days with 16+ Pomodoros", category: "Daily Consistency", target: 25, getCurrent: (stats) => stats.countDaysOver16Pomos, condition: (stats) => stats.countDaysOver16Pomos >= 25 },
    elite_16_days_100: { name: "Dedicated 16+", icon: "fas fa-sun", desc: "100 days with 16+ Pomodoros", category: "Daily Consistency", target: 100, getCurrent: (stats) => stats.countDaysOver16Pomos, condition: (stats) => stats.countDaysOver16Pomos >= 100 },
    elite_16_days_200: { name: "Masterful 16+", icon: "fas fa-volcano", desc: "200 days with 16+ Pomodoros", category: "Daily Consistency", target: 200, getCurrent: (stats) => stats.countDaysOver16Pomos, condition: (stats) => stats.countDaysOver16Pomos >= 200 },
    elite_16_days_250_pro: { name: "High Caliber Focus (16+)", icon: "fas fa-bullseye", desc: "250 days with 16+ Pomodoros", category: "Daily Consistency", tier: 'pro', target: 250, getCurrent: (stats) => stats.countDaysOver16Pomos, condition: (stats) => stats.countDaysOver16Pomos >= 250 },
    elite_16_days_300_furious: { name: "Focus Incarnate (16+)", icon: "fas fa-fire", desc: "300 days with 16+ Pomodoros", category: "Daily Consistency", tier: 'furious', target: 300, getCurrent: (stats) => stats.countDaysOver16Pomos, condition: (stats) => stats.countDaysOver16Pomos >= 300 },
    elite_16_days_350_legendary: { name: "Resilient Mind (16+)", icon: "fas fa-gem", desc: "350 days with 16+ Pomodoros", category: "Daily Consistency", tier: 'legendary', target: 350, getCurrent: (stats) => stats.countDaysOver16Pomos, condition: (stats) => stats.countDaysOver16Pomos >= 350 },
    elite_20_days_10: { name: "Elite Focus x10", icon: "fas fa-award", desc: "10 days with 20+ Pomodoros", category: "Daily Consistency", target: 10, getCurrent: (stats) => stats.countDaysOver20Pomos, condition: (stats) => stats.countDaysOver20Pomos >= 10 },
    elite_20_days_25: { name: "Elite Focus x25", icon: "fas fa-medal", desc: "25 days with 20+ Pomodoros", category: "Daily Consistency", target: 25, getCurrent: (stats) => stats.countDaysOver20Pomos, condition: (stats) => stats.countDaysOver20Pomos >= 25 },
    elite_20_days_50: { name: "Elite Focus x50", icon: "fas fa-bahai", desc: "50 days with 20+ Pomodoros", category: "Daily Consistency", target: 50, getCurrent: (stats) => stats.countDaysOver20Pomos, condition: (stats) => stats.countDaysOver20Pomos >= 50 },

    // Category: Special Achievements
    morning_hustler_100: { name: "Morning Hustler", icon: "fas fa-mug-hot", desc: "100 Pomos before 12 PM (total)", category: "Special Achievements", target: 100, getCurrent: (stats) => stats.totalPomosMorning, condition: (stats) => stats.totalPomosMorning >= 100 },
    afternoon_ace_100: { name: "Afternoon Ace", icon: "fas fa-briefcase", desc: "100 Pomos 12PM-5PM (total)", category: "Special Achievements", target: 100, getCurrent: (stats) => stats.totalPomosAfternoon, condition: (stats) => stats.totalPomosAfternoon >= 100 },
    evening_enthusiast_100: { name: "Evening Star", icon: "fas fa-star-and-crescent", desc: "100 Pomos after 5 PM (total)", category: "Special Achievements", target: 100, getCurrent: (stats) => stats.totalPomosEvening, condition: (stats) => stats.totalPomosEvening >= 100 },
    time_traveler: { name: "Time Traveler", icon: "fas fa-history", desc: "Logged Pomos across 2+ years", category: "Special Achievements", target: 2, getCurrent: (stats) => stats.uniqueYearsLogged, condition: (stats) => stats.uniqueYearsLogged >= 2},
    full_spectrum: { name: "Full Spectrum", icon: "fas fa-rainbow", desc: "Logged a Pomo in every hour (0-23)", category: "Special Achievements", target: 24, getCurrent: (stats) => stats.loggedHoursTracker.size, condition: (stats) => stats.loggedAllHours },
    perfect_month_log: { name: "Perfect Month", icon: "fas fa-calendar-check", desc: "Logged Pomos every day of a calendar month", category: "Special Achievements", target: 1, getCurrent: (stats) => stats.perfectMonthsCount, condition: (stats) => stats.perfectMonthsCount > 0 },
    yearly_devotion: { name: "Yearly Devotion", icon: "fas fa-book-reader", desc: "200+ logged days in a single year", category: "Special Achievements", target: 200, getCurrent: (stats) => stats.maxLoggedDaysInYear, condition: (stats) => stats.maxLoggedDaysInYear >= 200 },

    // Category: Collector
    collector_25: { name: "The Collector", icon: "fas fa-archive", desc: "Unlock 25 achievements", category: "Collector", target: 25, getCurrent: (stats) => stats.unlockedAchievementsCount, condition: (stats) => stats.unlockedAchievementsCount >= 25 },
    collector_50: { name: "Grand Collector", icon: "fas fa-chess-queen", desc: "Unlock 50 achievements", category: "Collector", target: 50, getCurrent: (stats) => stats.unlockedAchievementsCount, condition: (stats) => stats.unlockedAchievementsCount >= 50 },
};


function formatDate(dateString, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
    const date = parseDateSafe(dateString);
    return date ? date.toLocaleDateString(undefined, options) : 'N/A';
}

/**
 * THIS IS THE ONLY FUNCTION THAT HAS BEEN CHANGED.
 * It now correctly parses the timestamp string "YYYY-MM-DD HH:MM:SS"
 * as the user's local time, preventing any unwanted timezone conversions.
 */
function parseDateSafe(dateString) {
    if (!dateString || typeof dateString !== 'string') return null;

    // The expected format is "YYYY-MM-DD HH:MM:SS"
    const parts = dateString.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
    if (!parts) {
        // Fallback for other potential formats, like ISO strings if they exist
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? null : date;
    }

    // parts[0] is the full string, parts[1] is Year, parts[2] is Month, etc.
    const year = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1; // Month is 0-indexed in JS
    const day = parseInt(parts[3], 10);
    const hour = parseInt(parts[4], 10);
    const minute = parseInt(parts[5], 10);
    const second = parseInt(parts[6], 10);

    // This constructor correctly creates a date in the user's local timezone
    const date = new Date(year, month, day, hour, minute, second);

    // Final validation
    if (isNaN(date.getTime()) || date.getFullYear() !== year) {
        return null;
    }

    return date;
}

function diffInDays(date1, date2) {
    const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
    return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

function getYYYYMMDD(date) {
    // This function now correctly operates on a local date object
    if (!date || isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}


async function loadAndDisplayLogs() {
    showLoadingState(true);
    errorState.classList.add('hidden');
    noLogsState.classList.add('hidden');
    logDetailsContainer.innerHTML = '';

    try {
        const response = await fetch(API_ENDPOINT);
        if (!response.ok) {
            let errorText = `HTTP error! Status: ${response.status}`;
            try { const serverError = await response.text(); if (serverError) errorText += ` - ${serverError.substring(0, 200)}`; } catch (e) { /* Ignore */ }
            throw new Error(errorText);
        }
        const data = await response.json();
        if (!data || !data.logs || !Array.isArray(data.logs)) {
             throw new Error("Received invalid data format from server.");
        }
        if (data.logs.length === 0) {
            noLogsState.classList.remove('hidden');
            updateDashboard(null); // Clear dashboard if no logs
            return;
        }
        processedGlobalData = processAllLogs(data.logs);
        updateDashboard(processedGlobalData);
    } catch (error) {
        console.error("❌ Error fetching or processing logs:", error);
        errorState.textContent = `Failed to load logs: ${error.message}. Check console.`;
        errorState.classList.remove('hidden');
        updateDashboard(null); // Clear dashboard on error
    } finally {
        showLoadingState(false);
         if (!logDetailsContainer.querySelector('.log-year') && errorState.classList.contains('hidden') && loadingState.classList.contains('hidden') && noLogsState.classList.contains('hidden')) {
            if (processedGlobalData === null || (processedGlobalData && processedGlobalData.totalDaysLogged === 0)) {
                 noLogsState.classList.remove('hidden');
            }
        }
    }
}

function showLoadingState(isLoading) {
    const mainContent = document.querySelector('.dashboard-grid');
    if (isLoading) {
        loadingState.classList.remove('hidden');
        if(mainContent) mainContent.classList.add('hidden');
    } else {
        loadingState.classList.add('hidden');
        if(mainContent) mainContent.classList.remove('hidden');
    }
}

function processAllLogs(logs) {
    const dailyCounts = {};
    const hourlyCounts = Array(24).fill(0);
    const hourlyLogDays = Array(24).fill(0);
    const weeklyTotals = {};
    const monthlyTotals = {};
    const yearlyPomoCounts = {};
    const loggedHoursTracker = new Set(); // Tracks unique hours (0-23)

    let totalPomodoros = 0;
    let bestDay = { date: null, count: 0 };
    let totalPomosMorning = 0, totalPomosAfternoon = 0, totalPomosEvening = 0;
    let daysOver4Pomos = 0, daysOver8Pomos = 0, daysOver12Pomos = 0, daysOver16Pomos = 0, daysOver20Pomos = 0;

    // The logs are parsed correctly here using the new function
    const processedLogs = logs.map(entryString => parseDateSafe(entryString)).filter(d => d !== null);
    processedLogs.sort((a, b) => a.getTime() - b.getTime());

    processedLogs.forEach(entryDate => {
        const dateKey = getYYYYMMDD(entryDate); // This now produces the correct local date string
        const hour = entryDate.getHours();
        const year = entryDate.getFullYear().toString();

        if (!dailyCounts[dateKey]) {
            dailyCounts[dateKey] = { count: 0, entries: [], loggedHoursInDay: new Set(), timestamps: [] };
        }
        dailyCounts[dateKey].count++;
        dailyCounts[dateKey].entries.push(entryDate.toISOString()); // Store as ISO for consistency in modal
        dailyCounts[dateKey].loggedHoursInDay.add(hour);
        dailyCounts[dateKey].timestamps.push(entryDate.getTime());

        totalPomodoros++;
        hourlyCounts[hour]++;
        loggedHoursTracker.add(hour);
        yearlyPomoCounts[year] = (yearlyPomoCounts[year] || 0) + 1;

        if (!dailyCounts[dateKey].hourlyLogMarkerForAvg) {
            dailyCounts[dateKey].hourlyLogMarkerForAvg = {};
        }
        if (!dailyCounts[dateKey].hourlyLogMarkerForAvg[hour]) {
            hourlyLogDays[hour]++;
            dailyCounts[dateKey].hourlyLogMarkerForAvg[hour] = true;
        }

        if (hour < 12) totalPomosMorning++;
        else if (hour >= 12 && hour < 17) totalPomosAfternoon++;
        else totalPomosEvening++;
    });

    const sortedDays = Object.keys(dailyCounts).sort();
    if (sortedDays.length === 0) {
        // Return a default structure ensuring all keys exist for achievements
        return {
            totalPomodoros: 0, totalDaysLogged: 0, averagePerDay: 0,
            bestDay: { date: null, count: 0 },
            longestStreak: { duration: 0, avgPomos: 0, peakPomos: 0 },
            currentStreak: { duration: 0, avgPomos: 0, peakPomos: 0 },
            dailyCounts: {}, hourlyAverages: Array(24).fill(0), weeklyTotals: {}, monthlyTotals: {}, yearlyGroups: {},
            bestWeek: { week: null, count: 0 }, bestMonth: { month: null, count: 0 },
            totalPomosMorning: 0, totalPomosAfternoon: 0, totalPomosEvening: 0,
            countDaysOver4Pomos: 0, countDaysOver8Pomos: 0, countDaysOver12Pomos: 0, countDaysOver16Pomos: 0, countDaysOver20Pomos: 0,
            uniqueYearsLogged: 0, loggedAllHours: false, perfectMonthsCount: 0, maxLoggedDaysInYear: 0,
            momentum: { trend: 'flat', currentAvg: 0, prevAvg: 0, diff: 0 },
            unlockedAchievementsCount: 0, loggedHoursTracker: new Set()
        };
    }

    let bestWeek = { week: null, count: 0};
    let bestMonth = { month: null, count: 0};
    const uniqueYears = new Set();
    const loggedDaysPerYear = {};
    let perfectMonthsCount = 0;

    sortedDays.forEach(dateKey => {
        const count = dailyCounts[dateKey].count;
        if (count > bestDay.count) bestDay = { date: dateKey, count: count };
        if (count >= 4) daysOver4Pomos++;
        if (count >= 8) daysOver8Pomos++;
        if (count >= 12) daysOver12Pomos++;
        if (count >= 16) daysOver16Pomos++;
        if (count >= 20) daysOver20Pomos++;

        const dateObj = parseDateSafe(dateKey);
        if (dateObj) {
            const yearStr = dateObj.getFullYear().toString();
            const monthOfYear = dateObj.getMonth();
            uniqueYears.add(yearStr);
            loggedDaysPerYear[yearStr] = (loggedDaysPerYear[yearStr] || 0) + 1;
            const monthKey = `${yearStr}-${String(monthOfYear + 1).padStart(2, '0')}`;
            monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + count;
            if (monthlyTotals[monthKey] > bestMonth.count) bestMonth = { month: monthKey, count: monthlyTotals[monthKey] };
            const week = getISOWeek(dateObj);
            const weekKey = `${yearStr}-W${String(week).padStart(2, '0')}`;
            weeklyTotals[weekKey] = (weeklyTotals[weekKey] || 0) + count;
            if (weeklyTotals[weekKey] > bestWeek.count) bestWeek = { week: weekKey, count: weeklyTotals[weekKey] };
        }
    });

    Object.keys(monthlyTotals).forEach(monthKey => {
        const [year, monthNum] = monthKey.split('-').map(Number);
        const daysInMonth = new Date(year, monthNum, 0).getDate();
        let loggedDaysThisMonth = 0;
        for (let i = 1; i <= daysInMonth; i++) {
            const dateToCheck = `${year}-${String(monthNum).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            if (dailyCounts[dateToCheck] && dailyCounts[dateToCheck].count > 0) loggedDaysThisMonth++;
        }
        if (loggedDaysThisMonth === daysInMonth) perfectMonthsCount++;
    });

    let maxLoggedDaysInYear = 0;
    for(const year in loggedDaysPerYear) {
        if(loggedDaysPerYear[year] > maxLoggedDaysInYear) maxLoggedDaysInYear = loggedDaysPerYear[year];
    }

    let longestStreakData = calculateStreakDetails([], dailyCounts);
    let currentStreakData = calculateStreakDetails([], dailyCounts);
    let tempStreakDays = [];

    if (sortedDays.length > 0) {
        tempStreakDays.push(sortedDays[0]);
        for (let i = 1; i < sortedDays.length; i++) {
            const prevD = parseDateSafe(sortedDays[i-1]);
            const currD = parseDateSafe(sortedDays[i]);
            if (prevD && currD && diffInDays(prevD, currD) === 1) {
                tempStreakDays.push(sortedDays[i]);
            } else {
                if (tempStreakDays.length >= longestStreakData.duration) {
                    longestStreakData = calculateStreakDetails(tempStreakDays, dailyCounts);
                }
                tempStreakDays = [sortedDays[i]];
            }
        }
        if (tempStreakDays.length >= longestStreakData.duration) {
            longestStreakData = calculateStreakDetails(tempStreakDays, dailyCounts);
        }

        const today = new Date();
        const todayISO = getYYYYMMDD(today);
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const yesterdayISO = getYYYYMMDD(yesterday);

        let lastLoggedDayInStreak = null;
        if (dailyCounts[todayISO]) lastLoggedDayInStreak = todayISO;
        else if (dailyCounts[yesterdayISO]) lastLoggedDayInStreak = yesterdayISO;

        if (lastLoggedDayInStreak) {
            let j = sortedDays.indexOf(lastLoggedDayInStreak);
            let currentTempDays = [];
            while (j >= 0) {
                currentTempDays.unshift(sortedDays[j]);
                if (j > 0) {
                    const prevD = parseDateSafe(sortedDays[j-1]);
                    const currD = parseDateSafe(sortedDays[j]);
                    if (prevD && currD && diffInDays(prevD, currD) === 1) j--;
                    else break;
                } else break;
            }
            currentStreakData = calculateStreakDetails(currentTempDays, dailyCounts);
             if (!dailyCounts[todayISO] && currentStreakData.endDate === yesterdayISO) {
                 currentStreakData.duration = 0;
             } else if (!dailyCounts[todayISO] && currentStreakData.endDate !== yesterdayISO) {
                  currentStreakData.duration = 0;
             }
        } else {
             currentStreakData.duration = 0; // No logs today or yesterday
        }
    }

    let momentum = { trend: 'flat', currentAvg: 0, prevAvg: 0, diff: 0 };
    const activeDays = sortedDays.filter(d => dailyCounts[d] && dailyCounts[d].count > 0);
    if (activeDays.length >= 14) {
        const last7DaysData = activeDays.slice(-7);
        const prev7DaysData = activeDays.slice(-14, -7);
        const sumLast7 = last7DaysData.reduce((sum, day) => sum + dailyCounts[day].count, 0);
        const sumPrev7 = prev7DaysData.reduce((sum, day) => sum + dailyCounts[day].count, 0);
        momentum.currentAvg = sumLast7 / 7;
        momentum.prevAvg = sumPrev7 / 7;
        momentum.diff = momentum.currentAvg - momentum.prevAvg;
        if (momentum.diff > 0.5) momentum.trend = 'up';
        else if (momentum.diff < -0.5) momentum.trend = 'down';
    }

    const hourlyAverages = hourlyCounts.map((total, hr) => hourlyLogDays[hr] > 0 ? (total / hourlyLogDays[hr]) : 0);
    const yearlyGroups = {};
    Object.entries(dailyCounts).forEach(([dateKey, data]) => {
        const year = dateKey.substring(0, 4);
        const month = dateKey.substring(0, 7);
        if (!yearlyGroups[year]) yearlyGroups[year] = { months: {}, total: 0 };
        if (!yearlyGroups[year].months[month]) yearlyGroups[year].months[month] = { days: {}, total: 0 };
        yearlyGroups[year].months[month].days[dateKey] = data.count;
        yearlyGroups[year].months[month].total += data.count;
        yearlyGroups[year].total += data.count;
    });

    return {
        totalPomodoros, totalDaysLogged: sortedDays.length,
        averagePerDay: sortedDays.length > 0 ? (totalPomodoros / sortedDays.length) : 0,
        bestDay,
        longestStreak: longestStreakData,
        currentStreak: currentStreakData,
        dailyCounts, hourlyAverages, weeklyTotals, monthlyTotals, yearlyGroups, bestWeek, bestMonth,
        totalPomosMorning, totalPomosAfternoon, totalPomosEvening,
        daysOver4Pomos, daysOver8Pomos, daysOver12Pomos, daysOver16Pomos, daysOver20Pomos,
        countDaysOver4Pomos: daysOver4Pomos, countDaysOver8Pomos: daysOver8Pomos,
        countDaysOver12Pomos: daysOver12Pomos, countDaysOver16Pomos: daysOver16Pomos,
        countDaysOver20Pomos: daysOver20Pomos,
        uniqueYearsLogged: uniqueYears.size,
        loggedAllHours: loggedHoursTracker.size === 24,
        loggedHoursTracker: loggedHoursTracker,
        perfectMonthsCount, maxLoggedDaysInYear,
        momentum,
        unlockedAchievementsCount: 0
    };
}

function calculateStreakDetails(streakDays, dailyCounts) {
    if (!streakDays || streakDays.length === 0) {
        return { duration: 0, avgPomos: 0, peakPomos: 0, startDate: null, endDate: null, days: [] };
    }
    let totalPomosInStreak = 0;
    let peakPomosInStreak = 0;
    streakDays.forEach(day => {
        const count = dailyCounts[day] ? dailyCounts[day].count : 0;
        totalPomosInStreak += count;
        if (count > peakPomosInStreak) {
            peakPomosInStreak = count;
        }
    });
    return {
        duration: streakDays.length,
        avgPomos: streakDays.length > 0 ? totalPomosInStreak / streakDays.length : 0,
        peakPomos: peakPomosInStreak,
        startDate: streakDays[0],
        endDate: streakDays[streakDays.length - 1],
        days: streakDays
    };
}

function getISOWeek(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
}


function updateDashboard(stats) {
    processedGlobalData = stats;
    // Update Quick Stats
    document.getElementById('total-pomodoros').textContent = stats?.totalPomodoros?.toLocaleString() || '0';
    document.getElementById('total-days').textContent = stats?.totalDaysLogged?.toLocaleString() || '0';
    document.getElementById('average-per-day').textContent = stats?.averagePerDay?.toFixed(1) || '0.0';
    const ls = stats?.longestStreak || { duration: 0, avgPomos: 0, peakPomos: 0, startDate: null, endDate: null };
    document.getElementById('longest-streak').textContent = ls.duration;
    document.getElementById('longest-streak-details').textContent = `Avg: ${ls.avgPomos.toFixed(1)} | Peak: ${ls.peakPomos}`;
    document.getElementById('longest-streak-tooltip').textContent = ls.startDate && ls.endDate ? `From: ${formatDate(ls.startDate, {month:'short', day:'numeric'})} To: ${formatDate(ls.endDate, {month:'short', day:'numeric'})}` : 'N/A';
    const cs = stats?.currentStreak || { duration: 0, avgPomos: 0, peakPomos: 0, startDate: null, endDate: null };
    document.getElementById('current-streak').textContent = cs.duration;
    document.getElementById('current-streak-details').textContent = cs.duration > 0 ? `Avg: ${cs.avgPomos.toFixed(1)} | Peak: ${cs.peakPomos}` : 'Avg: -- | Peak: --';
    document.getElementById('current-streak-tooltip').textContent = cs.duration > 0 && cs.startDate ? `Started: ${formatDate(cs.startDate, {month:'short', day:'numeric'})}` : 'N/A';
    document.getElementById('best-day-count').textContent = stats?.bestDay?.count || '0';
    document.getElementById('best-day-date').textContent = stats?.bestDay?.date ? formatDate(stats.bestDay.date, { month: 'short', day: 'numeric' }) : 'N/A';
    document.getElementById('days-over-4').textContent = stats?.daysOver4Pomos?.toLocaleString() || '0';
    document.getElementById('days-over-8').textContent = stats?.daysOver8Pomos?.toLocaleString() || '0';
    document.getElementById('days-over-12').textContent = stats?.daysOver12Pomos?.toLocaleString() || '0';
    document.getElementById('days-over-16').textContent = stats?.daysOver16Pomos?.toLocaleString() || '0';
    document.getElementById('days-over-20').textContent = stats?.daysOver20Pomos?.toLocaleString() || '0';

    // Update Momentum
    const momentumArrowIcon = document.getElementById('momentum-arrow-icon');
    const momentumTextEl = document.getElementById('momentum-text');
    const momentumDetailsEl = document.getElementById('momentum-details');
    if (stats?.momentum && stats.totalDaysLogged >=14) {
        momentumArrowIcon.className = 'momentum-arrow fas';
        if (stats.momentum.trend === 'up') {
            momentumArrowIcon.classList.add('fa-arrow-trend-up', 'up');
            momentumTextEl.textContent = `Trending Up (+${stats.momentum.diff.toFixed(1)} avg)`;
        } else if (stats.momentum.trend === 'down') {
            momentumArrowIcon.classList.add('fa-arrow-trend-down', 'down');
            momentumTextEl.textContent = `Trending Down (${stats.momentum.diff.toFixed(1)} avg)`;
        } else {
            momentumArrowIcon.classList.add('fa-arrows-left-right', 'flat');
            momentumTextEl.textContent = 'Steady Pace';
        }
        momentumDetailsEl.textContent = `Current: ${stats.momentum.currentAvg.toFixed(1)} avg | Prev: ${stats.momentum.prevAvg.toFixed(1)} avg (last 7 vs prev 7 active days)`;
    } else {
        momentumArrowIcon.textContent = '--';
        momentumArrowIcon.className = 'momentum-arrow';
        momentumTextEl.textContent = 'Not enough data';
        momentumDetailsEl.textContent = '(vs. previous 7 active days)';
    }

    // NEW "On This Day" Logic
    const onThisDayList = document.getElementById('on-this-day-list');
    onThisDayList.innerHTML = ''; // Clear previous content
    if (stats?.dailyCounts) {
        const today = new Date();
        
        const comparisons = [
            { label: 'Last Week', date: new Date(new Date().setDate(today.getDate() - 7)) },
            { label: 'Last Month', date: new Date(new Date().setMonth(today.getMonth() - 1)) },
            { label: 'Last Year', date: new Date(new Date().setFullYear(today.getFullYear() - 1)) }
        ];

        let historyFound = false;
        comparisons.forEach(comp => {
            const dateKey = getYYYYMMDD(comp.date);
            const count = stats.dailyCounts[dateKey]?.count || 0;
            const item = document.createElement('div');
            item.className = 'on-this-day-item';
            
            if (count > 0) {
                historyFound = true;
                item.innerHTML = `<span class="label">${comp.label}:</span> <span class="count">${count} Pomos</span>`;
            } else {
                item.innerHTML = `<span class="label">${comp.label}:</span> <span class="no-history-text">No data</span>`;
            }
            onThisDayList.appendChild(item);
        });
        if (!historyFound && onThisDayList.children.length > 0) {
            // This case handles when comparison dates exist but have no data.
            // If you want a generic message when all are "No data", add it here.
        } else if (onThisDayList.children.length === 0) {
             onThisDayList.innerHTML = '<p class="no-history-text">No historical data for these dates.</p>';
        }

    } else {
         onThisDayList.innerHTML = '<p class="no-history-text">No data available.</p>';
    }

    // Render Charts, Achievements, Logs
    if (stats && stats.totalDaysLogged > 0) {
        renderActivityHeatmap(stats.dailyCounts, currentHeatmapYear);
        renderHourlyPerformanceChart(stats.hourlyAverages);
        renderTrendsChart(stats.weeklyTotals);
        renderAchievements(stats); // This will also update stats.unlockedAchievementsCount
        displayGroupedLogs(stats.yearlyGroups);
        noLogsState.classList.add('hidden');
        document.querySelector('.dashboard-grid').classList.remove('hidden');
    } else {
        renderActivityHeatmap({}, currentHeatmapYear);
        renderHourlyPerformanceChart([]);
        renderTrendsChart({});
        renderAchievements(null);
        displayGroupedLogs({});
        noLogsState.classList.remove('hidden');
        document.querySelector('.dashboard-grid').classList.add('hidden');
    }
}

function renderActivityHeatmap(dailyCountsData, year) {
    heatmapYearDisplay.textContent = year;
    const grid = document.getElementById('heatmap-grid-content');
    const monthsContainer = document.getElementById('heatmap-months');
    const weekdaysContainer = document.getElementById('heatmap-weekdays');
    grid.innerHTML = ''; monthsContainer.innerHTML = ''; weekdaysContainer.innerHTML = '';

    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    dayLabels.forEach((label, i) => {
        const dayLabel = document.createElement('div');
        dayLabel.className = 'heatmap-weekday-label';
        dayLabel.textContent = label;
        if(i % 2 !== 0 && i !== 0 && i !== 6 && dayLabels.length > 3) dayLabel.style.visibility = "hidden";
        weekdaysContainer.appendChild(dayLabel);
    });

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    let currentMonth = -1;
    const firstDayOffset = startDate.getDay();
    for (let i = 0; i < firstDayOffset; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'heatmap-day'; emptyCell.style.visibility = 'hidden';
        grid.appendChild(emptyCell);
    }

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateKey = getYYYYMMDD(d);
        const count = dailyCountsData && dailyCountsData[dateKey] ? dailyCountsData[dateKey].count : 0;
        const dayCell = document.createElement('div');
        dayCell.className = 'heatmap-day';
        let level = 0;
        if (count > 0 && count <= 2) level = 1;
        else if (count > 2 && count <= 5) level = 2;
        else if (count > 5 && count <= 9) level = 3;
        else if (count > 9 && count <= 14) level = 4;
        else if (count > 14) level = 5;
        dayCell.setAttribute('data-level', level.toString());
        const tooltip = document.createElement('span');
        tooltip.className = 'tooltip';
        tooltip.textContent = `${count} Pomos on ${formatDate(dateKey)}`;
        dayCell.appendChild(tooltip);
        grid.appendChild(dayCell);

        if (d.getMonth() !== currentMonth) {
            currentMonth = d.getMonth();
            if (d.getDate() <= 7 || monthsContainer.children.length === 0 ) {
                const monthLabel = document.createElement('div');
                monthLabel.className = 'heatmap-month-label';
                monthLabel.textContent = d.toLocaleDateString(undefined, { month: 'short' });
                monthsContainer.appendChild(monthLabel);
            }
        }
    }
     while(monthsContainer.children.length < 12 && monthsContainer.children.length > 0) {
        const lastMonthDate = new Date(year, monthsContainer.children.length, 1);
        if (lastMonthDate <= endDate) {
            const monthLabel = document.createElement('div');
            monthLabel.className = 'heatmap-month-label';
            monthLabel.textContent = lastMonthDate.toLocaleDateString(undefined, { month: 'short' });
            monthsContainer.appendChild(monthLabel);
        } else {
            break;
        }
    }
}

function renderHourlyPerformanceChart(hourlyAveragesData) {
    const ctx = document.getElementById('hourly-performance-chart').getContext('2d');
    const labels = Array.from({ length: 24 }, (_, i) => {
        const hour = i % 24;
        if (hour === 0) return '12 AM'; if (hour < 12) return `${hour} AM`;
        if (hour === 12) return '12 PM'; return `${hour - 12} PM`;
    });
    if (hourlyChart) hourlyChart.destroy();
    hourlyChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: 'Avg Pomodoros', data: hourlyAveragesData, backgroundColor: 'rgba(243, 156, 18, 0.6)', borderColor: 'rgba(243, 156, 18, 1)', borderWidth: 1, borderRadius: 3 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: 'var(--text-secondary)', font: { size: 9 } } }, x: { grid: { display: false }, ticks: { color: 'var(--text-secondary)', font: { size: 9 }, maxRotation: 45, minRotation: 45 } } }, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#343a40', titleColor: '#f8f9fa', bodyColor: '#f8f9fa', callbacks: { label: (c) => `Avg: ${c.parsed.y.toFixed(1)} Pomos` } } } }
    });
}
function renderTrendsChart(weeklyTotalsData) {
    const ctx = document.getElementById('trends-chart').getContext('2d');
    const sortedWeeks = Object.keys(weeklyTotalsData || {}).sort();
    const labels = sortedWeeks.map(weekKey => weekKey.replace(/-/g, ' '));
    const data = sortedWeeks.map(weekKey => weeklyTotalsData[weekKey]);
    if (trendsChart) trendsChart.destroy();
    trendsChart = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: [{ label: 'Pomodoros per Week', data: data, borderColor: 'var(--accent-secondary)', backgroundColor: 'rgba(52, 152, 219, 0.1)', fill: true, tension: 0.3, pointBackgroundColor: 'var(--accent-secondary)', pointBorderColor: 'var(--bg-secondary)', pointHoverRadius: 5, pointRadius: data.length > 52 ? 1: 2.5 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: 'var(--text-secondary)', font: { size: 9 } } }, x: { grid: { display: false }, ticks: { color: 'var(--text-secondary)', font: { size: 9 }, callback: function(v, i) { const l = this.getLabelForValue(v); if (!l) return null; if (labels.length > 26 && i % 4 !== 0) return null; if (labels.length > 12 && i % 2 !== 0 && labels.length <=26) return null; return l.substring(l.indexOf('W')); } } } }, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#343a40', titleColor: '#f8f9fa', bodyColor: '#f8f9fa'} } }
    });
}

// Renders achievements grouped by category
function renderAchievements(stats) {
    const mainContainer = document.getElementById('achievements-grid-content');
    mainContainer.innerHTML = '';
    let unlockedCount = 0;

    const currentStats = stats || {
        totalPomodoros: 0, longestStreak: {duration:0}, currentStreak:{duration:0}, bestDay:{count:0}, bestWeek:{count:0}, bestMonth:{count:0},
        totalPomosMorning: 0, totalPomosAfternoon: 0, totalPomosEvening: 0,
        countDaysOver4Pomos: 0, countDaysOver8Pomos: 0, countDaysOver12Pomos: 0, countDaysOver16Pomos: 0, countDaysOver20Pomos: 0,
        uniqueYearsLogged: 0, loggedAllHours: false, perfectMonthsCount: 0, maxLoggedDaysInYear: 0, loggedHoursTracker: new Set(),
        unlockedAchievementsCount: 0
    };

    if (stats) {
        Object.entries(achievementsConfig).forEach(([key, ach]) => {
            if (key.startsWith('collector_')) return;
            if (ach.condition(stats)) unlockedCount++;
        });
        currentStats.unlockedAchievementsCount = unlockedCount;
        if (achievementsConfig.collector_25.condition(currentStats)) unlockedCount++;
        if (achievementsConfig.collector_50.condition(currentStats)) unlockedCount++;
        currentStats.unlockedAchievementsCount = unlockedCount;
    }

    const categorized = {};
    Object.values(achievementsConfig).forEach(ach => {
        if (!categorized[ach.category]) {
            categorized[ach.category] = [];
        }
        categorized[ach.category].push(ach);
    });

    const categoryOrder = ["Pomodoro Milestones", "Streaks", "Peak Performance", "Daily Consistency", "Special Achievements", "Collector"];

    categoryOrder.forEach(categoryName => {
        if (!categorized[categoryName]) return;

        const categoryHeader = document.createElement('h3');
        categoryHeader.className = 'achievement-category-title';
        categoryHeader.textContent = categoryName;
        mainContainer.appendChild(categoryHeader);

        const categoryGrid = document.createElement('div');
        categoryGrid.className = 'achievements-grid';
        categorized[categoryName].forEach(ach => {
            const isUnlocked = stats ? ach.condition(currentStats) : false;
            categoryGrid.appendChild(createAchievementDOM(ach, isUnlocked, currentStats));
        });
        mainContainer.appendChild(categoryGrid);
    });
}

function createAchievementDOM(achievement, unlocked, stats) {
    const item = document.createElement('div');
    item.className = 'achievement-item';
    if (unlocked) {
        item.classList.add('unlocked');
        if (achievement.tier) item.classList.add('tier-' + achievement.tier);
    }
    const iconEl = document.createElement('i');
    iconEl.className = achievement.icon; item.appendChild(iconEl);
    const nameEl = document.createElement('h4');
    nameEl.textContent = achievement.name; item.appendChild(nameEl);
    const tooltip = document.createElement('span');
    tooltip.className = 'tooltip';

    let tooltipText = achievement.desc;

    if (!unlocked && stats && typeof achievement.getCurrent === 'function' && typeof achievement.target !== 'undefined') {
        const currentValue = achievement.getCurrent(stats);
        const targetValue = achievement.target;
        const displayValue = Math.min(currentValue, targetValue);
        tooltipText += ` (Progress: ${displayValue.toLocaleString()} / ${targetValue.toLocaleString()})`;
    } else if (unlocked) {
        tooltipText += ` (Achieved!)`;
    }

    tooltip.textContent = tooltipText;
    item.appendChild(tooltip);
    return item;
}

function displayGroupedLogs(yearlyGroupsData) {
    logDetailsContainer.innerHTML = '';
    if (!yearlyGroupsData || Object.keys(yearlyGroupsData).length === 0) return;

    const sortOrder = sortSelect.value;
    const sortedYearKeys = Object.keys(yearlyGroupsData).sort((a, b) => sortOrder === 'desc' ? b.localeCompare(a) : a.localeCompare(b));

    sortedYearKeys.forEach((yearKey, index) => {
        const yearData = yearlyGroupsData[yearKey];
        if (!yearData || yearData.total === 0) return;
        const yearDiv = document.createElement('div');
        yearDiv.className = 'log-year';
        if (index > 0) yearDiv.classList.add('is-collapsed');

        const yearHeader = document.createElement('div'); yearHeader.className = 'log-year-header'; yearHeader.setAttribute('role', 'button'); yearHeader.setAttribute('tabindex', '0'); yearHeader.setAttribute('aria-expanded', !(index > 0)); yearHeader.setAttribute('aria-controls', `year-content-${yearKey}`);
        const yearTitle = document.createElement('h3'); yearTitle.textContent = yearKey;
        const yearToggle = document.createElement('span'); yearToggle.className = 'year-toggle-icon fas fa-chevron-down';
        yearHeader.appendChild(yearTitle); yearHeader.appendChild(yearToggle); yearDiv.appendChild(yearHeader);

        const yearContentDiv = document.createElement('div'); yearContentDiv.className = 'log-year-content'; yearContentDiv.id = `year-content-${yearKey}`; yearDiv.appendChild(yearContentDiv);

        const sortedMonthKeys = Object.keys(yearData.months || {}).sort((a, b) => sortOrder === 'desc' ? b.localeCompare(a) : a.localeCompare(b));
        sortedMonthKeys.forEach(monthKey => {
            const monthData = yearData.months[monthKey];
            if (!monthData || monthData.total === 0) return;
            const monthDiv = document.createElement('div'); monthDiv.className = 'log-month';
            const monthHeader = document.createElement('div'); monthHeader.className = 'log-month-header';
            const monthTitle = document.createElement('h4'); monthTitle.textContent = formatDate(monthKey + '-01', { year: 'numeric', month: 'long' });
            const monthTotal = document.createElement('span'); monthTotal.className = 'month-total'; monthTotal.textContent = `Total: ${monthData.total}`;
            monthHeader.appendChild(monthTitle); monthHeader.appendChild(monthTotal); monthDiv.appendChild(monthHeader);

            const daysGrid = document.createElement('div'); daysGrid.className = 'log-days-grid';
            const sortedDayKeys = Object.keys(monthData.days || {}).sort((a,b) => {
                const dayA = parseInt(a.split('-')[2]);
                const dayB = parseInt(b.split('-')[2]);
                return sortOrder === 'desc' ? dayB - dayA : dayA - dayB;
            });

            sortedDayKeys.forEach(dayKey => {
                const dayCount = monthData.days[dayKey]; if (dayCount === 0) return;
                const dayArticle = document.createElement('article'); dayArticle.className = 'log-day';
                dayArticle.setAttribute('data-datekey', dayKey);

                const dayHeading = document.createElement('h5'); dayHeading.textContent = formatDate(dayKey, { weekday: 'short', month: 'short', day: 'numeric'});
                const countSpan = document.createElement('span'); countSpan.className = 'day-count'; countSpan.textContent = dayCount;
                const dotsContainer = document.createElement('div'); dotsContainer.className = 'pomodoro-dots-container';
                const maxDots = 15;
                for (let i = 0; i < Math.min(dayCount, maxDots); i++) { const dot = document.createElement('div'); dot.className = 'pomodoro-dot'; dotsContainer.appendChild(dot); }
                if (dayCount > maxDots) { const etc = document.createElement('span'); etc.className = 'dots-overflow'; etc.textContent = `+${dayCount - maxDots}`; dotsContainer.appendChild(etc); }
                dayArticle.appendChild(dayHeading); dayArticle.appendChild(countSpan); dayArticle.appendChild(dotsContainer);

                dayArticle.addEventListener('click', () => showDailyFocusFlow(dayKey));
                daysGrid.appendChild(dayArticle);
            });
            if (daysGrid.hasChildNodes()) { monthDiv.appendChild(daysGrid); yearContentDiv.appendChild(monthDiv); }
        });
        yearHeader.addEventListener('click', () => { const coll = yearDiv.classList.toggle('is-collapsed'); yearHeader.setAttribute('aria-expanded', !coll); });
        yearHeader.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const coll = yearDiv.classList.toggle('is-collapsed'); yearHeader.setAttribute('aria-expanded', !coll); } });
        if (yearContentDiv.hasChildNodes()) logDetailsContainer.appendChild(yearDiv);
    });
}

function showDailyFocusFlow(dateKey) {
    if (!processedGlobalData || !processedGlobalData.dailyCounts || !processedGlobalData.dailyCounts[dateKey]) return;

    const dayData = processedGlobalData.dailyCounts[dateKey];
    const hourlyPomosForDay = Array(24).fill(0);
    if (dayData.timestamps && Array.isArray(dayData.timestamps)) {
        dayData.timestamps.forEach(ts => {
            hourlyPomosForDay[new Date(ts).getHours()]++;
        });
    }

    dailyFlowModalTitle.textContent = `Hourly Focus Flow for ${formatDate(dateKey)}`;

    const ctx = document.getElementById('daily-flow-chart').getContext('2d');
    const labels = Array.from({ length: 24 }, (_, i) => {
        const hour = i % 24;
        if (hour === 0) return '12AM'; if (hour < 12) return `${hour}AM`;
        if (hour === 12) return '12PM'; return `${hour - 12}PM`;
    });

    if (dailyFlowChartInstance) dailyFlowChartInstance.destroy();
    dailyFlowChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pomodoros',
                data: hourlyPomosForDay,
                backgroundColor: 'rgba(52, 152, 219, 0.6)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 1,
                borderRadius: 3
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1, color: 'var(--text-secondary)', font: {size: 9} }, grid: {color: 'rgba(0,0,0,0.05)'} }, x: { ticks: {color: 'var(--text-secondary)', font: {size: 9}}, grid: {display: false} } },
            plugins: { legend: { display: false }, tooltip: {enabled: true} }
        }
    });
    dailyFlowModal.style.display = 'block';
}

// Event Listeners
sortSelect.addEventListener('change', () => {
    if(processedGlobalData && processedGlobalData.yearlyGroups) {
        displayGroupedLogs(processedGlobalData.yearlyGroups);
    } else {
        loadAndDisplayLogs();
    }
});
refreshButton.addEventListener('click', loadAndDisplayLogs);

heatmapPrevYearBtn.addEventListener('click', () => {
    currentHeatmapYear--;
    if (processedGlobalData && processedGlobalData.dailyCounts) {
         renderActivityHeatmap(processedGlobalData.dailyCounts, currentHeatmapYear);
    } else {
        loadAndDisplayLogs().then(() => {
            if (processedGlobalData && processedGlobalData.dailyCounts) {
                renderActivityHeatmap(processedGlobalData.dailyCounts, currentHeatmapYear);
            }
        });
    }
});
heatmapNextYearBtn.addEventListener('click', () => {
    currentHeatmapYear++;
     if (processedGlobalData && processedGlobalData.dailyCounts) {
         renderActivityHeatmap(processedGlobalData.dailyCounts, currentHeatmapYear);
    } else {
        loadAndDisplayLogs().then(() => {
            if (processedGlobalData && processedGlobalData.dailyCounts) {
                renderActivityHeatmap(processedGlobalData.dailyCounts, currentHeatmapYear);
            }
        });
    }
});

dailyFlowModalClose.onclick = () => dailyFlowModal.style.display = 'none';
window.onclick = (event) => {
    if (event.target == dailyFlowModal) dailyFlowModal.style.display = 'none';
}


document.addEventListener('DOMContentLoaded', () => {
    // Initial renders with empty/null data to structure the page
    renderAchievements(null);
    renderHourlyPerformanceChart([]);
    renderTrendsChart({});
    renderActivityHeatmap({}, currentHeatmapYear);

    // Load the actual data
    loadAndDisplayLogs();
})
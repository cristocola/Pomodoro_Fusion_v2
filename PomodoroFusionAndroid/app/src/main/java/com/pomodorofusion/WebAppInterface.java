package com.pomodorofusion;

import android.content.Context;
import android.webkit.JavascriptInterface;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Intent;
import java.util.Calendar;

public class WebAppInterface {
    Context mContext;

    WebAppInterface(Context c) {
        mContext = c;
    }

    @JavascriptInterface
    public void scheduleAlarm(long triggerAtMillis) {
        AlarmManager alarmManager = (AlarmManager) mContext.getSystemService(Context.ALARM_SERVICE);
        Intent intent = new Intent(mContext, AlarmReceiver.class);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(mContext, 0, intent, PendingIntent.FLAG_IMMUTABLE);

        // Schedule the alarm
        alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
    }
}

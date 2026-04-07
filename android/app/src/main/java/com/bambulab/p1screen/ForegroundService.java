package com.bambulab.p1screen;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.Handler;
import android.os.Looper;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;

import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

public final class ForegroundService extends Service {
  public static final int PORT = 8888;
  private static final int NOTIFICATION_ID = 1001;
  private static final String CHANNEL_ID = "backend_service_v2";

  public static final String ACTION_SERVICE_READY = "com.bambulab.p1screen.SERVICE_READY";
  private static boolean isServerReady = false;
  private static Runnable readyCallback;
  private WebService server;

  public static synchronized void setReadyCallback(Runnable callback) {
    readyCallback = callback;
    if (isServerReady && callback != null) {
      new Handler(Looper.getMainLooper()).post(callback);
    }
  }

  public static synchronized boolean isReady() {
    return isServerReady;
  }

  public static String getBaseUrl() {
    return "http://127.0.0.1:" + PORT + "/";
  }

  @Override
  public void onCreate() {
    super.onCreate();
//    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
//      startForeground(NOTIFICATION_ID, createNotification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
//    } else {
      startForeground(NOTIFICATION_ID, createNotification());
//    }
    startServer();
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    return START_NOT_STICKY;
  }

  @Override
  public void onTaskRemoved(Intent rootIntent) {
    stopSelf();
    super.onTaskRemoved(rootIntent);
  }

  @Override
  public void onDestroy() {
    stopServer();
    synchronized (ForegroundService.class) {
      isServerReady = false;
    }
    stopForeground(true);
    super.onDestroy();
  }

  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }

  private void startServer() {
    if (server != null) {
      return;
    }
    try {
      server = new WebService(PORT, getApplicationContext(), createInsecureTlsSocketFactory());
      server.start();
      synchronized (ForegroundService.class) {
        isServerReady = true;
        if (readyCallback != null) {
          new Handler(Looper.getMainLooper()).post(readyCallback);
        }
      }
    } catch (IOException | GeneralSecurityException e) {
      stopSelf();
    }
  }

  private void stopServer() {
    if (server == null) {
      return;
    }
    server.stop();
    server = null;
  }

  private Notification createNotification() {
    NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && manager != null) {
      NotificationChannel channel = new NotificationChannel(
        CHANNEL_ID,
        getString(R.string.notification_channel_name),
        NotificationManager.IMPORTANCE_DEFAULT
      );
      manager.createNotificationChannel(channel);
    }

    Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
      ? new Notification.Builder(this, CHANNEL_ID)
      : new Notification.Builder(this);

    Intent launchIntent = new Intent(this, MainActivity.class);
    launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    int pendingIntentFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
      ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
      : PendingIntent.FLAG_UPDATE_CURRENT;
    PendingIntent contentIntent = PendingIntent.getActivity(this, 0, launchIntent, pendingIntentFlags);

    return builder
      .setContentTitle(getString(R.string.app_name))
      .setContentText(getString(R.string.notification_text))
      .setContentIntent(contentIntent)
      .setSmallIcon(R.drawable.ic_notification_logo)
      .setOngoing(true)
      .build();
  }

  private static SSLSocketFactory createInsecureTlsSocketFactory() throws GeneralSecurityException {
    TrustManager[] trustManagers = new TrustManager[]{new X509TrustManager() {
      @Override
      public void checkClientTrusted(X509Certificate[] chain, String authType) {
      }

      @Override
      public void checkServerTrusted(X509Certificate[] chain, String authType) {
      }

      @Override
      public X509Certificate[] getAcceptedIssuers() {
        return new X509Certificate[0];
      }
    }};

    SSLContext context = SSLContext.getInstance("TLS");
    context.init(null, trustManagers, new SecureRandom());
    return context.getSocketFactory();
  }
}

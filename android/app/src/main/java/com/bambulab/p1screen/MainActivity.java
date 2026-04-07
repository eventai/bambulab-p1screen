package com.bambulab.p1screen;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

public final class MainActivity extends Activity {
  private static final int PERMISSION_REQUEST_CODE = 100;
  private static final long EXIT_INTERVAL_MS = 2000L;

  private WebView webView;
  private long lastBackPressedAt;
  private volatile boolean destroyed;

  @SuppressLint("SetJavaScriptEnabled")
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_main);
    applyWindowInsets();
    applyFullscreen();

    checkPermissionsAndStartService();

    boolean isDebuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    WebView.setWebContentsDebuggingEnabled(isDebuggable);

    webView = findViewById(R.id.web_view);

    WebSettings settings = webView.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setAllowFileAccess(false);
    settings.setAllowContentAccess(false);
    settings.setLoadsImagesAutomatically(true);

    webView.setPadding(0, 0, 0, 0);

    ForegroundService.setReadyCallback(this::loadHomeUrl);
  }

  @Override
  public void onWindowFocusChanged(boolean hasFocus) {
    super.onWindowFocusChanged(hasFocus);
    if (hasFocus) {
      applyFullscreen();
    }
  }

  @Override
  protected void onResume() {
    super.onResume();
    applyFullscreen();
  }

  @Override
  public void onBackPressed() {
    long now = SystemClock.elapsedRealtime();
    if (now - lastBackPressedAt < EXIT_INTERVAL_MS) {
      stopForegroundService();
      finishAndRemoveTask();
      return;
    }
    lastBackPressedAt = now;
    Toast.makeText(this, "再按一次返回键退出应用", Toast.LENGTH_SHORT).show();
  }

  private void applyFullscreen() {
    View decorView = getWindow().getDecorView();
    int flags = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY;
    decorView.setSystemUiVisibility(flags);
  }

  private void applyWindowInsets() {
    final View root = findViewById(android.R.id.content);
    root.setOnApplyWindowInsetsListener((v, insets) -> {
      v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), 0);
      return insets.consumeSystemWindowInsets();
    });
  }

  private void loadHomeUrl() {
    if (destroyed || webView == null) {
      return;
    }
    webView.loadUrl(ForegroundService.getBaseUrl());
  }

  private void checkPermissionsAndStartService() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
      requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, PERMISSION_REQUEST_CODE);
    } else {
      startForegroundService();
    }
  }

  @Override
  public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
    if (requestCode == PERMISSION_REQUEST_CODE) {
      startForegroundService();
    }
  }

  private void startForegroundService() {
    Intent intent = new Intent(this, ForegroundService.class);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      startForegroundService(intent);
    } else {
      startService(intent);
    }
  }

  private void stopForegroundService() {
    Intent intent = new Intent(this, ForegroundService.class);
    stopService(intent);
  }

  @Override
  protected void onDestroy() {
    destroyed = true;
    ForegroundService.setReadyCallback(null);
    if (webView != null) {
      ViewGroup parent = (ViewGroup) webView.getParent();
      if (parent != null) {
        parent.removeView(webView);
      }
      webView.stopLoading();
      webView.destroy();
      webView = null;
    }
    super.onDestroy();
  }
}

package com.bambulab.p1screen;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.net.HttpURLConnection;
import java.net.URL;

public final class MainActivity extends Activity {
  private static final long EXIT_INTERVAL_MS = 2000L;

  private WebView webView;
  private long lastBackPressedAt;
  private volatile boolean destroyed;

  @SuppressLint("SetJavaScriptEnabled")
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_main);
    applyFullscreen();
    observeSystemUiVisibility();

    startBackendService();

    boolean isDebuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    WebView.setWebContentsDebuggingEnabled(isDebuggable);

    webView = findViewById(R.id.web_view);
    webView.setVisibility(View.INVISIBLE);

    WebSettings settings = webView.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setAllowFileAccess(false);
    settings.setAllowContentAccess(false);
    settings.setLoadsImagesAutomatically(true);

    webView.setPadding(0, 0, 0, 0);
    webView.setWebViewClient(new RetryWebViewClient());
    waitForBackendThenLoadHome();
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
      stopBackendService();
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
        finishAndRemoveTask();
      } else {
        finish();
      }
      return;
    }
    lastBackPressedAt = now;
    Toast.makeText(this, "再按一次返回键退出应用", Toast.LENGTH_SHORT).show();
  }

  private void applyFullscreen() {
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
    View decorView = getWindow().getDecorView();
    int flags = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
      | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
      | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
      | View.SYSTEM_UI_FLAG_FULLSCREEN
      | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
      | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY;
    decorView.setSystemUiVisibility(flags);
  }

  private void observeSystemUiVisibility() {
    final View decorView = getWindow().getDecorView();
    decorView.setOnSystemUiVisibilityChangeListener(visibility -> {
      if ((visibility & View.SYSTEM_UI_FLAG_HIDE_NAVIGATION) == 0) {
        decorView.postDelayed(this::applyFullscreen, 120L);
      }
    });
  }

  private void waitForBackendThenLoadHome() {
    new Thread(() -> {
      int retries = 120;
      while (!destroyed && retries-- > 0) {
        if (isBackendReady()) {
          runOnUiThread(() -> {
            if (destroyed || webView == null) {
              return;
            }
            webView.loadUrl(LocalBackendService.getBaseUrl());
          });
          return;
        }
        try {
          Thread.sleep(150L);
        } catch (InterruptedException ignored) {
          Thread.currentThread().interrupt();
          return;
        }
      }

      runOnUiThread(() -> {
        if (destroyed || webView == null) {
          return;
        }
        webView.loadUrl(LocalBackendService.getBaseUrl());
      });
    }, "backend-waiter").start();
  }

  private boolean isBackendReady() {
    HttpURLConnection connection = null;
    try {
      URL url = new URL(LocalBackendService.getBaseUrl());
      connection = (HttpURLConnection) url.openConnection();
      connection.setConnectTimeout(300);
      connection.setReadTimeout(300);
      connection.setRequestMethod("GET");
      int code = connection.getResponseCode();
      return code >= 200 && code < 500;
    } catch (Exception ignored) {
      return false;
    } finally {
      if (connection != null) {
        connection.disconnect();
      }
    }
  }

  private void startBackendService() {
    Intent intent = new Intent(this, LocalBackendService.class);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      startForegroundService(intent);
      return;
    }
    startService(intent);
  }

  private void stopBackendService() {
    Intent intent = new Intent(this, LocalBackendService.class);
    stopService(intent);
  }

  @Override
  protected void onDestroy() {
    destroyed = true;
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

  private final class RetryWebViewClient extends WebViewClient {
    @Override
    public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && request != null && request.isForMainFrame()) {
        view.postDelayed(() -> view.loadUrl(LocalBackendService.getBaseUrl()), 500L);
      }
    }

    @Override
    public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
      view.postDelayed(() -> view.loadUrl(LocalBackendService.getBaseUrl()), 500L);
    }

    @Override
    public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
      handler.cancel();
    }

    @Override
    public void onPageFinished(WebView view, String url) {
      view.setVisibility(View.VISIBLE);
      super.onPageFinished(view, url);
    }
  }
}

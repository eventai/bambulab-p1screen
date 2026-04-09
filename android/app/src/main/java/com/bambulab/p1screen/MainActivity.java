package com.bambulab.p1screen;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;

import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

public final class MainActivity extends Activity {
  private static final int PORT = 8888;
  private static final long EXIT_INTERVAL_MS = 2000L;

  private WebView webView;
  private WebService webService;
  private long lastBackPressedAt;

  @SuppressLint("SetJavaScriptEnabled")
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_main);
    applyWindowInsets();
    applyFullscreen();

    startWebService();

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

    webView.loadUrl(getBaseUrl());
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
    startWebService();
  }

  @Override
  protected void onPause() {
    super.onPause();
    stopWebService();
  }

  @Override
  public void onBackPressed() {
    long now = SystemClock.elapsedRealtime();
    if (now - lastBackPressedAt < EXIT_INTERVAL_MS) {
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

  private void startWebService() {
    if (webService != null && webService.isAlive()) {
      return;
    }
    try {
      if (webService == null) {
        webService = new WebService(PORT, getApplicationContext(), createInsecureTlsSocketFactory());
      }
      webService.start();
    } catch (IOException | GeneralSecurityException e) {
      throw new IllegalStateException("Failed to start local web service", e);
    }
  }

  private void stopWebService() {
    if (webService == null) {
      return;
    }
    webService.stop();
  }

  private static String getBaseUrl() {
    return "http://127.0.0.1:" + PORT + "/";
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

  @Override
  protected void onDestroy() {
    stopWebService();
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

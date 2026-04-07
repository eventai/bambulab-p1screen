package com.bambulab.p1screen;

import android.content.Context;
import android.content.res.AssetManager;
import android.text.TextUtils;

import fi.iki.elonen.NanoHTTPD;
import fi.iki.elonen.NanoWSD;

import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;

import javax.net.ssl.SSLSocketFactory;

public final class LocalHttpServer extends NanoWSD {
  private final Context appContext;
  private final ThumbnailHandler thumbnailHandler;
  private final SSLSocketFactory tlsSocketFactory;

  public LocalHttpServer(int port, Context context, SSLSocketFactory socketFactory) {
    super(port);
    appContext = context;
    tlsSocketFactory = socketFactory;
    thumbnailHandler = new ThumbnailHandler();
  }

  @Override
  public void start() throws IOException {
    start(0, false);
  }

  @Override
  protected Response serveHttp(IHTTPSession session) {
    if (Method.GET != session.getMethod()) {
      return NanoHTTPD.newFixedLengthResponse(Response.Status.METHOD_NOT_ALLOWED, "text/plain", "Method Not Allowed");
    }

    String uri = session.getUri();
    if ("/api/getThumbnail".equals(uri)) {
      return thumbnailHandler.handle(session);
    }
    return serveStatic(session);
  }

  @Override
  protected WebSocket openWebSocket(IHTTPSession handshake) {
    if (!"/mqtt".equals(handshake.getUri())) {
      return new WsTlsBridge(handshake, tlsSocketFactory, true);
    }
    return new WsTlsBridge(handshake, tlsSocketFactory, false);
  }

  private Response serveStatic(IHTTPSession session) {
    String uri = session.getUri();
    if (TextUtils.isEmpty(uri) || "/".equals(uri)) {
      uri = "/index.html";
    }
    if (uri.contains("..")) {
      return NanoHTTPD.newFixedLengthResponse(Response.Status.FORBIDDEN, "text/plain", "Forbidden");
    }

    AssetResult asset = openAsset(uri);
    if (asset == null) {
      return NanoHTTPD.newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "Not Found");
    }

    String mime = guessMimeType(asset.path);
    Response response = NanoHTTPD.newChunkedResponse(Response.Status.OK, mime, asset.inputStream);
    if (asset.path.endsWith(".html")) {
      response.addHeader("Cache-Control", "no-cache");
    } else {
      response.addHeader("Cache-Control", "public,max-age=86400");
    }
    return response;
  }

  private AssetResult openAsset(String uri) {
    AssetManager assets = appContext.getAssets();
    String normalized = uri.startsWith("/") ? uri.substring(1) : uri;
    String[] candidates = new String[]{
      "web/" + normalized,
      normalized,
    };

    for (String path : candidates) {
      try {
        return new AssetResult(path, assets.open(path));
      } catch (IOException ignored) {
      }
    }
    return null;
  }

  private static String guessMimeType(String path) {
    String lower = path.toLowerCase(Locale.US);
    if (lower.endsWith(".html")) return "text/html; charset=utf-8";
    if (lower.endsWith(".js")) return "application/javascript; charset=utf-8";
    if (lower.endsWith(".css")) return "text/css; charset=utf-8";
    if (lower.endsWith(".svg")) return "image/svg+xml";
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
    if (lower.endsWith(".json")) return "application/json; charset=utf-8";
    if (lower.endsWith(".ico")) return "image/x-icon";
    return "application/octet-stream";
  }

  private static final class AssetResult {
    final String path;
    final InputStream inputStream;

    AssetResult(String path, InputStream inputStream) {
      this.path = path;
      this.inputStream = inputStream;
    }
  }
}

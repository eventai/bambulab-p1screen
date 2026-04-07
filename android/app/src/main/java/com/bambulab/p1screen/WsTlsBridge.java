package com.bambulab.p1screen;

import android.util.Log;

import fi.iki.elonen.NanoHTTPD;
import fi.iki.elonen.NanoWSD;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;

public final class WsTlsBridge extends NanoWSD.WebSocket {
  private static final String TAG = "WsTlsBridge";
  private final SSLSocketFactory sslSocketFactory;
  private final boolean rejectImmediately;

  private SSLSocket tlsSocket;
  private OutputStream tlsOutput;
  private volatile boolean closed;

  public WsTlsBridge(NanoHTTPD.IHTTPSession handshakeRequest, SSLSocketFactory socketFactory, boolean reject) {
    super(handshakeRequest);
    sslSocketFactory = socketFactory;
    rejectImmediately = reject;
  }

  @Override
  protected void onOpen() {
    Log.d(TAG, "WebSocket onOpen: " + getHandshakeRequest().getUri());
    if (rejectImmediately) {
      Log.w(TAG, "Rejecting WebSocket immediately: unsupported path");
      closeBridge(NanoWSD.WebSocketFrame.CloseCode.PolicyViolation, "unsupported websocket path");
      return;
    }

    try {
      URI target = parseTargetUri(getHandshakeRequest());
      int targetPort = target.getPort() > 0 ? target.getPort() : 8883;
      Log.d(TAG, "Connecting to TLS target: " + target.getHost() + ":" + targetPort);

      tlsSocket = (SSLSocket) sslSocketFactory.createSocket(target.getHost(), targetPort);
      tlsSocket.setSoTimeout(0);
      tlsSocket.startHandshake();
      tlsOutput = tlsSocket.getOutputStream();
      Log.d(TAG, "TLS handshake successful");

      Thread upstreamReader = new Thread(() -> pumpTlsToWebSocket(tlsSocket), "mqtt-tls-reader");
      upstreamReader.setDaemon(true);
      upstreamReader.start();
    } catch (Exception e) {
      Log.e(TAG, "Failed to establish TLS bridge", e);
      closeBridge(NanoWSD.WebSocketFrame.CloseCode.InternalServerError, "connect failed");
    }
  }

  @Override
  protected void onClose(NanoWSD.WebSocketFrame.CloseCode code, String reason, boolean initiatedByRemote) {
    Log.d(TAG, "WebSocket onClose: code=" + code + ", reason=" + reason + ", initiatedByRemote=" + initiatedByRemote);
    closeBridge(code, reason);
  }

  @Override
  protected void onMessage(NanoWSD.WebSocketFrame message) {
    if (closed || tlsOutput == null) {
      closeBridge(NanoWSD.WebSocketFrame.CloseCode.GoingAway, "tls not ready");
      return;
    }

    try {
      byte[] payload = message.getBinaryPayload();
      if (payload == null) {
        String text = message.getTextPayload();
        payload = text == null ? new byte[0] : text.getBytes(StandardCharsets.UTF_8);
      }
      if (payload.length == 0) {
        return;
      }
      tlsOutput.write(payload);
      tlsOutput.flush();
    } catch (IOException e) {
      closeBridge(NanoWSD.WebSocketFrame.CloseCode.InternalServerError, "tls write failed");
    }
  }

  @Override
  protected void onPong(NanoWSD.WebSocketFrame pong) {
  }

  @Override
  protected void onException(IOException exception) {
    Log.e(TAG, "WebSocket onException", exception);
    closeBridge(NanoWSD.WebSocketFrame.CloseCode.InternalServerError, "ws exception");
  }

  private void pumpTlsToWebSocket(SSLSocket socket) {
    Log.d(TAG, "Starting TLS to WS pump");
    try (InputStream inputStream = socket.getInputStream()) {
      byte[] buffer = new byte[4096];
      int read;
      while ((read = inputStream.read(buffer)) >= 0) {
        if (read == 0) {
          continue;
        }
        send(Arrays.copyOf(buffer, read));
      }
      Log.d(TAG, "TLS stream reached EOF");
      closeBridge(NanoWSD.WebSocketFrame.CloseCode.NormalClosure, "tls closed");
    } catch (IOException e) {
      if (!closed) {
        Log.e(TAG, "TLS read failed", e);
      }
      closeBridge(NanoWSD.WebSocketFrame.CloseCode.InternalServerError, "tls read failed");
    }
  }

  private synchronized void closeBridge(NanoWSD.WebSocketFrame.CloseCode code, String reason) {
    if (closed) {
      return;
    }
    Log.d(TAG, "Closing bridge: code=" + code + ", reason=" + reason);
    closed = true;

    if (tlsSocket != null) {
      try {
        tlsSocket.close();
      } catch (IOException ignored) {
      }
      tlsSocket = null;
    }

    try {
      close(code, reason, false);
    } catch (IOException ignored) {
    }
  }

  private static URI parseTargetUri(NanoHTTPD.IHTTPSession session) throws URISyntaxException {
    String raw = session.getParms().get("url");
    if (raw == null || raw.isEmpty()) {
      throw new URISyntaxException("", "missing url query");
    }

    URI target = new URI(raw);
    if (!"mqtts".equals(target.getScheme())) {
      throw new URISyntaxException(raw, "unsupported protocol");
    }
    if (target.getHost() == null || target.getHost().isEmpty()) {
      throw new URISyntaxException(raw, "missing host");
    }
    return target;
  }
}

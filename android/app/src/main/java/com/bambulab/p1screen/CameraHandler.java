package com.bambulab.p1screen;

import android.util.Base64;
import android.util.Log;

import fi.iki.elonen.NanoHTTPD;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.PipedInputStream;
import java.io.PipedOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.util.Arrays;

import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

public final class CameraHandler {
  private static final String TAG = "CameraHandler";
  private static final int CAMERA_PORT = 6000;

  public NanoHTTPD.Response handle(NanoHTTPD.IHTTPSession session) {
    String ip = session.getParms().get("ip");
    String code = session.getParms().get("code");

    if (ip == null || code == null) {
      return NanoHTTPD.newFixedLengthResponse(
        NanoHTTPD.Response.Status.BAD_REQUEST,
        "text/plain",
        "Missing ip or code parameter"
      );
    }

    try {
      PipedInputStream pin = new PipedInputStream(1024 * 1024); // 1MB buffer
      PipedOutputStream pout = new PipedOutputStream(pin);

      Thread cameraThread = new Thread(() -> streamCamera(ip, code, pout));
      cameraThread.setDaemon(true);
      cameraThread.start();

      NanoHTTPD.Response response = NanoHTTPD.newChunkedResponse(
        NanoHTTPD.Response.Status.OK,
        "text/event-stream",
        pin
      );
      response.addHeader("Cache-Control", "no-cache");
      response.addHeader("Connection", "keep-alive");
      response.addHeader("X-Accel-Buffering", "no");
      return response;

    } catch (Exception e) {
      Log.e(TAG, "Failed to initialize camera stream", e);
      return NanoHTTPD.newFixedLengthResponse(
        NanoHTTPD.Response.Status.INTERNAL_ERROR,
        "text/plain",
        "Internal Server Error"
      );
    }
  }

  private void streamCamera(String ip, String code, PipedOutputStream pout) {
    SSLSocket tlsSocket = null;
    try {
      Log.i(TAG, "Connecting to camera TLS at " + ip + ":" + CAMERA_PORT);
      SSLSocketFactory sslSocketFactory = createInsecureTlsSocketFactory();
      tlsSocket = (SSLSocket) sslSocketFactory.createSocket(ip, CAMERA_PORT);
      tlsSocket.startHandshake();

      OutputStream out = tlsSocket.getOutputStream();
      InputStream in = tlsSocket.getInputStream();

      // Build 80-byte authentication packet
      byte[] authBuf = new byte[80];
      Arrays.fill(authBuf, (byte) 0);
      
      // [0x40 LE4]
      authBuf[0] = 0x40; authBuf[1] = 0x00; authBuf[2] = 0x00; authBuf[3] = 0x00;
      // [0x3000 LE4]
      authBuf[4] = 0x00; authBuf[5] = 0x30; authBuf[6] = 0x00; authBuf[7] = 0x00;
      // [0x00 LE4] -> 8-11
      // [0x00 LE4] -> 12-15

      // Username (32 bytes)
      byte[] userBytes = "bblp".getBytes(StandardCharsets.US_ASCII);
      System.arraycopy(userBytes, 0, authBuf, 16, userBytes.length);

      // Access Code (32 bytes)
      byte[] codeBytes = code.getBytes(StandardCharsets.US_ASCII);
      System.arraycopy(codeBytes, 0, authBuf, 48, Math.min(codeBytes.length, 32));

      out.write(authBuf);
      out.flush();
      Log.i(TAG, "Sent camera auth packet");

      byte[] header = new byte[16];
      while (true) {
        // Read 16-byte frame header
        if (!readExactly(in, header, 16)) {
          break;
        }

        // Payload size is little-endian UInt32 in first 4 bytes
        int payloadSize = (header[0] & 0xFF) |
                          ((header[1] & 0xFF) << 8) |
                          ((header[2] & 0xFF) << 16) |
                          ((header[3] & 0xFF) << 24);

        if (payloadSize <= 0 || payloadSize > 5 * 1024 * 1024) {
          Log.w(TAG, "Invalid payload size: " + payloadSize);
          break;
        }

        byte[] frame = new byte[payloadSize];
        if (!readExactly(in, frame, payloadSize)) {
          break;
        }

        // Validate JPEG magic: FF D8 ... FF D9
        if (payloadSize >= 2 && frame[0] == (byte) 0xFF && frame[1] == (byte) 0xD8) {
          String b64 = Base64.encodeToString(frame, Base64.NO_WRAP);
          String sseData = "data: " + b64 + "\n\n";
          pout.write(sseData.getBytes(StandardCharsets.UTF_8));
          pout.flush();
        }
      }

    } catch (Exception e) {
      Log.e(TAG, "Camera stream error", e);
    } finally {
      Log.i(TAG, "Camera stream closed");
      if (tlsSocket != null) {
        try { tlsSocket.close(); } catch (IOException ignored) {}
      }
      try { pout.close(); } catch (IOException ignored) {}
    }
  }

  private boolean readExactly(InputStream in, byte[] buffer, int length) throws IOException {
    int total = 0;
    while (total < length) {
      int read = in.read(buffer, total, length - total);
      if (read < 0) return false; // EOF
      total += read;
    }
    return true;
  }

  private SSLSocketFactory createInsecureTlsSocketFactory() throws Exception {
    TrustManager[] trustManagers = new TrustManager[]{new X509TrustManager() {
      @Override public void checkClientTrusted(X509Certificate[] chain, String authType) {}
      @Override public void checkServerTrusted(X509Certificate[] chain, String authType) {}
      @Override public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
    }};
    SSLContext context = SSLContext.getInstance("TLS");
    context.init(null, trustManagers, new SecureRandom());
    return context.getSocketFactory();
  }
}

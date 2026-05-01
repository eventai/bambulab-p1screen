package com.bambulab.p1screen;

import android.util.Log;

import org.apache.commons.net.ftp.FTP;
import org.apache.commons.net.ftp.FTPFile;
import org.apache.commons.net.ftp.FTPSClient;
import org.apache.commons.net.util.TrustManagerUtils;

import fi.iki.elonen.NanoHTTPD;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

public final class FilesHandler {
  private static final String TAG = "FilesHandler";
  private static final int FTP_PORT = 990;

  public NanoHTTPD.Response handleFiles(NanoHTTPD.IHTTPSession session) {
    String ip = session.getParms().get("ip");
    String code = session.getParms().get("code");

    if (ip == null || code == null) {
      return NanoHTTPD.newFixedLengthResponse(NanoHTTPD.Response.Status.BAD_REQUEST, "text/plain", "Missing parameters");
    }

    FTPSClient client = createFtpsClient();
    try {
      client.connect(ip, FTP_PORT);
      if (!client.login("bblp", code)) {
        throw new Exception("FTP Login failed");
      }
      client.execPBSZ(0);
      client.execPROT("P");
      client.enterLocalPassiveMode();

      JSONArray results = new JSONArray();
      String[] dirs = {"/", "/cache", "/sdcard", "/model"};

      for (String dir : dirs) {
        FTPFile[] files = client.listFiles(dir);
        if (files != null) {
          for (FTPFile f : files) {
            String name = f.getName();
            if (name != null && (name.endsWith(".3mf") || name.endsWith(".gcode.3mf"))) {
              JSONObject obj = new JSONObject();
              String taskName = name.replace(".gcode.3mf", "").replace(".3mf", "");
              
              obj.put("name", taskName);
              obj.put("fullName", name);
              obj.put("size", f.getSize());
              obj.put("path", dir.equals("/") ? "/" + name : dir + "/" + name);
              
              if (f.getTimestamp() != null) {
                // Approximate ISO string
                obj.put("modified", String.format("%tFT%<tTZ", f.getTimestamp().getTime()));
              } else {
                obj.put("modified", null);
              }
              results.put(obj);
            }
          }
        }
      }

      client.logout();
      client.disconnect();

      return NanoHTTPD.newFixedLengthResponse(NanoHTTPD.Response.Status.OK, "application/json", results.toString());

    } catch (Exception e) {
      Log.e(TAG, "FTP files error", e);
      return NanoHTTPD.newFixedLengthResponse(NanoHTTPD.Response.Status.INTERNAL_ERROR, "text/plain", e.getMessage());
    } finally {
      if (client.isConnected()) {
        try { client.disconnect(); } catch (IOException ignored) {}
      }
    }
  }

  public NanoHTTPD.Response handleThumbnail(NanoHTTPD.IHTTPSession session) {
    String ip = session.getParms().get("ip");
    String code = session.getParms().get("code");
    String name = session.getParms().get("name");
    String path = session.getParms().get("path");

    if (ip == null || code == null || name == null) {
      return NanoHTTPD.newFixedLengthResponse(NanoHTTPD.Response.Status.BAD_REQUEST, "text/plain", "Missing parameters");
    }

    List<String> ftpPaths = new ArrayList<>();
    if (path != null && !path.isEmpty()) {
      ftpPaths.add(path);
    }
    ftpPaths.add("/cache/" + name + ".gcode.3mf");
    ftpPaths.add("/cache/" + name + ".3mf");
    ftpPaths.add("/" + name + ".gcode.3mf");
    ftpPaths.add("/" + name + ".3mf");

    List<String> thumbnailEntries = Arrays.asList(
      "Metadata/plate_1.png",
      "Metadata/thumbnail.png",
      "Metadata/cover.png",
      "Metadata/plate_2.png"
    );

    FTPSClient client = createFtpsClient();
    try {
      client.connect(ip, FTP_PORT);
      if (!client.login("bblp", code)) {
        throw new Exception("FTP Login failed");
      }
      client.execPBSZ(0);
      client.execPROT("P");
      client.enterLocalPassiveMode();
      client.setFileType(FTP.BINARY_FILE_TYPE);

      byte[] imgData = null;
      StringBuilder errorMessages = new StringBuilder();

      for (String ftpPath : ftpPaths) {
        Log.i(TAG, "Trying to download: " + ftpPath);
        InputStream is = client.retrieveFileStream(ftpPath);
        if (is != null) {
          java.io.File tempFile = null;
          try {
            tempFile = java.io.File.createTempFile("bambu_", ".3mf");
            java.io.FileOutputStream fos = new java.io.FileOutputStream(tempFile);
            byte[] buffer = new byte[8192];
            int len;
            while ((len = is.read(buffer)) != -1) {
              fos.write(buffer, 0, len);
            }
            fos.close();
            
            // Now parse robustly using ZipFile
            java.util.zip.ZipFile zipFile = new java.util.zip.ZipFile(tempFile);
            java.util.Enumeration<? extends java.util.zip.ZipEntry> entries = zipFile.entries();
            while (entries.hasMoreElements()) {
              java.util.zip.ZipEntry entry = entries.nextElement();
              if (thumbnailEntries.contains(entry.getName())) {
                InputStream zis = zipFile.getInputStream(entry);
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                while ((len = zis.read(buffer)) > 0) {
                  baos.write(buffer, 0, len);
                }
                zis.close();
                imgData = baos.toByteArray();
                break;
              }
            }
            zipFile.close();
          } catch (Exception e) {
            Log.w(TAG, "Zip parse error", e);
            errorMessages.append("ZipError: ").append(e.getMessage()).append(" ");
          } finally {
            if (tempFile != null && tempFile.exists()) {
              tempFile.delete();
            }
          }
          
          try {
            client.completePendingCommand();
          } catch (Exception e) {
            errorMessages.append("CmdError: ").append(e.getMessage()).append(" ");
          }
          
          if (imgData != null) {
            break;
          }
        } else {
          errorMessages.append("No stream for ").append(ftpPath).append(" ");
        }
      }

      client.logout();
      client.disconnect();

      if (imgData != null && imgData.length > 0) {
        NanoHTTPD.Response response = NanoHTTPD.newFixedLengthResponse(NanoHTTPD.Response.Status.OK, "image/png", new ByteArrayInputStream(imgData), imgData.length);
        response.addHeader("Cache-Control", "public, max-age=3600");
        return response;
      } else {
        String err = errorMessages.toString();
        if (imgData != null && imgData.length == 0) {
            err = "Extracted 0 bytes for thumbnail. " + err;
        }
        if (err.isEmpty()) err = "Thumbnail not found";
        return NanoHTTPD.newFixedLengthResponse(NanoHTTPD.Response.Status.INTERNAL_ERROR, "text/plain", err);
      }

    } catch (Exception e) {
      Log.e(TAG, "FTP thumbnail error", e);
      return NanoHTTPD.newFixedLengthResponse(NanoHTTPD.Response.Status.INTERNAL_ERROR, "text/plain", e.getMessage());
    } finally {
      if (client.isConnected()) {
        try { client.disconnect(); } catch (IOException ignored) {}
      }
    }
  }

  private FTPSClient createFtpsClient() {
    FTPSClient client = new FTPSClient("TLSv1.2", true); // true = implicit
    client.setTrustManager(TrustManagerUtils.getAcceptAllTrustManager());
    client.setEndpointCheckingEnabled(false);
    client.setStrictReplyParsing(false);
    return client;
  }
}

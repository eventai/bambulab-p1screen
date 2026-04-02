package com.bambulab.p1screen;

import fi.iki.elonen.NanoHTTPD;

import net.lingala.zip4j.io.inputstream.ZipInputStream;
import net.lingala.zip4j.model.LocalFileHeader;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

public final class ThumbnailHandler {
  private final OkHttpClient httpClient = new OkHttpClient.Builder().build();

  public NanoHTTPD.Response handle(NanoHTTPD.IHTTPSession session) {
    String url = session.getParms().get("url");
    String plateIdx = session.getParms().get("plate_idx");
    if (isEmpty(url) || isEmpty(plateIdx)) {
      return NanoHTTPD.newFixedLengthResponse(
        NanoHTTPD.Response.Status.BAD_REQUEST,
        "text/plain",
        "Missing parameter"
      );
    }

    Request request = new Request.Builder().url(url).get().build();
    try (Response response = httpClient.newCall(request).execute()) {
      ResponseBody body = response.body();
      if (!response.isSuccessful() || body == null) {
        return NanoHTTPD.newFixedLengthResponse(
          NanoHTTPD.Response.Status.NOT_FOUND,
          "text/plain",
          "Thumbnail not found"
        );
      }

      byte[] png = extractPlatePng(body.bytes(), plateIdx);
      if (png == null) {
        return NanoHTTPD.newFixedLengthResponse(
          NanoHTTPD.Response.Status.NOT_FOUND,
          "text/plain",
          "Thumbnail not found"
        );
      }

      NanoHTTPD.Response result = NanoHTTPD.newFixedLengthResponse(
        NanoHTTPD.Response.Status.OK,
        "image/png",
        new ByteArrayInputStream(png),
        png.length
      );
      result.addHeader("Cache-Control", "public, max-age=2592000");
      return result;
    } catch (Exception ignored) {
      return NanoHTTPD.newFixedLengthResponse(
        NanoHTTPD.Response.Status.NOT_FOUND,
        "text/plain",
        "Thumbnail not found"
      );
    }
  }

  private static byte[] extractPlatePng(byte[] archiveBytes, String plateIdx) throws IOException {
    String targetName = "Metadata/plate_" + plateIdx + ".png";
    try (ZipInputStream zipInputStream = new ZipInputStream(new ByteArrayInputStream(archiveBytes))) {
      LocalFileHeader fileHeader;
      while ((fileHeader = zipInputStream.getNextEntry()) != null) {
        if (!targetName.equals(fileHeader.getFileName())) {
          continue;
        }
        return readAllBytes(zipInputStream);
      }
    }
    return null;
  }

  private static byte[] readAllBytes(ZipInputStream inputStream) throws IOException {
    ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
    byte[] buffer = new byte[8192];
    int count;
    while ((count = inputStream.read(buffer)) > 0) {
      outputStream.write(buffer, 0, count);
    }
    return outputStream.toByteArray();
  }

  private static boolean isEmpty(String value) {
    return value == null || value.trim().isEmpty();
  }
}

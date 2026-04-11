package com.bambulab.p1screen;

import fi.iki.elonen.NanoHTTPD;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;

import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;

public final class FetchHandler {
  private final OkHttpClient httpClient = new OkHttpClient.Builder().build();

  public NanoHTTPD.Response handle(NanoHTTPD.IHTTPSession session) {
    String url = session.getParms().get("url");
    if (url == null || url.trim().isEmpty()) {
      return NanoHTTPD.newFixedLengthResponse(
        NanoHTTPD.Response.Status.BAD_REQUEST,
        "text/plain",
        "Missing url parameter"
      );
    }

    Request request = new Request.Builder().url(url).get().build();
    Response okResponse = null;
    try {
      okResponse = httpClient.newCall(request).execute();
      final ResponseBody body = okResponse.body();
      if (body == null) {
        okResponse.close();
        return NanoHTTPD.newFixedLengthResponse(
          NanoHTTPD.Response.Status.NOT_FOUND,
          "text/plain",
          "Not Found"
        );
      }

      final Response finalOkResponse = okResponse;
      InputStream wrappedStream = new FilterInputStream(body.byteStream()) {
        @Override
        public void close() throws IOException {
          try {
            super.close();
          } finally {
            finalOkResponse.close();
          }
        }
      };

      String contentType = body.contentType() != null ? body.contentType().toString() : "application/octet-stream";
      long contentLength = body.contentLength();

      NanoHTTPD.Response.IStatus status = new NanoHTTPD.Response.IStatus() {
        @Override
        public String getDescription() { return finalOkResponse.message(); }
        @Override
        public int getRequestStatus() { return finalOkResponse.code(); }
      };

      NanoHTTPD.Response nResponse;
      if (contentLength >= 0) {
        nResponse = NanoHTTPD.newFixedLengthResponse(status, contentType, wrappedStream, contentLength);
      } else {
        nResponse = NanoHTTPD.newChunkedResponse(status, contentType, wrappedStream);
      }

      String[] headersToForward = {"content-type", "content-length", "last-modified", "cache-control"};
      for (String header : headersToForward) {
        String value = okResponse.header(header);
        if (value != null) {
          nResponse.addHeader(header, value);
        }
      }

      return nResponse;

    } catch (Exception e) {
      if (okResponse != null) okResponse.close();
      return NanoHTTPD.newFixedLengthResponse(
        NanoHTTPD.Response.Status.INTERNAL_ERROR,
        "text/plain",
        e.getMessage()
      );
    }
  }
}

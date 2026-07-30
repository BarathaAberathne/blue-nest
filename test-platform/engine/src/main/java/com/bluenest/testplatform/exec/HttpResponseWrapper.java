package com.bluenest.testplatform.exec;

import java.util.Map;

public final class HttpResponseWrapper {
    public final int status;
    public final long responseTimeMs;
    public final Map<String, String> headers;
    public final String bodyRaw;

    public HttpResponseWrapper(int status, long responseTimeMs, Map<String, String> headers, String bodyRaw) {
        this.status = status;
        this.responseTimeMs = responseTimeMs;
        this.headers = headers;
        this.bodyRaw = bodyRaw;
    }
}

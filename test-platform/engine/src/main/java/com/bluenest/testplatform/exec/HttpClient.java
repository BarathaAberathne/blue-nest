package com.bluenest.testplatform.exec;

import io.restassured.builder.RequestSpecBuilder;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;

import java.util.LinkedHashMap;
import java.util.Map;

import static io.restassured.RestAssured.given;

/**
 * The only place REST-Assured is used directly — it's the HTTP transport
 * adapter (spec §11 "Uses Rest Assured internally as the initial HTTP
 * transport adapter"), not something a script author writes against.
 */
public final class HttpClient {

    private final String baseUrl;
    private final int timeoutSeconds;

    public HttpClient(String baseUrl, int timeoutSeconds) {
        this.baseUrl = baseUrl;
        this.timeoutSeconds = timeoutSeconds;
    }

    public HttpResponseWrapper execute(String method, String path, String bodyJson,
                                        String bearerToken, String correlationId) {
        RequestSpecification spec = given()
                .spec(new RequestSpecBuilder()
                        .setBaseUri(baseUrl)
                        .setContentType(ContentType.JSON)
                        .setAccept(ContentType.JSON)
                        .build())
                .header("X-Correlation-Id", correlationId);
        if (bearerToken != null) {
            spec = spec.header("Authorization", "Bearer " + bearerToken);
        }
        if (bodyJson != null && !bodyJson.isBlank()) {
            spec = spec.body(bodyJson);
        }

        long start = System.currentTimeMillis();
        Response response = switch (method) {
            case "GET" -> spec.when().get(path);
            case "POST" -> spec.when().post(path);
            case "PUT" -> spec.when().put(path);
            case "PATCH" -> spec.when().patch(path);
            case "DELETE" -> spec.when().delete(path);
            default -> throw new IllegalArgumentException("Unsupported HTTP method: " + method);
        };
        long elapsed = System.currentTimeMillis() - start;

        Map<String, String> headers = new LinkedHashMap<>();
        response.getHeaders().forEach(h -> headers.put(h.getName(), h.getValue()));

        return new HttpResponseWrapper(response.getStatusCode(), elapsed, headers, response.getBody().asString());
    }
}

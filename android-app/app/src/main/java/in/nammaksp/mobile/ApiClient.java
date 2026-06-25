package in.nammaksp.mobile;

import android.os.Handler;
import android.os.Looper;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

final class ApiClient {
    static final String BASE_URL = "https://namma-ksp-50043229029.development.catalystappsail.in";

    interface Callback {
        void onSuccess(Object data);
        void onError(String message);
    }

    private final ExecutorService executor = Executors.newFixedThreadPool(4);
    private final Handler main = new Handler(Looper.getMainLooper());
    private final SessionManager session;

    ApiClient(SessionManager session) {
        this.session = session;
    }

    void get(String path, Callback callback) {
        request("GET", path, null, callback);
    }

    void post(String path, JSONObject body, Callback callback) {
        request("POST", path, body, callback);
    }

    private void request(String method, String path, JSONObject body, Callback callback) {
        executor.execute(() -> {
            HttpURLConnection connection = null;
            try {
                URL url = new URL(BASE_URL + path);
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod(method);
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(30000);
                connection.setRequestProperty("Accept", "application/json");
                connection.setRequestProperty("Content-Type", "application/json");

                String token = session.token();
                if (!token.isEmpty()) {
                    connection.setRequestProperty("Authorization", "Bearer " + token);
                }

                if (body != null) {
                    connection.setDoOutput(true);
                    byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
                    try (OutputStream out = connection.getOutputStream()) {
                        out.write(bytes);
                    }
                }

                int code = connection.getResponseCode();
                InputStream stream = code >= 200 && code < 300
                        ? connection.getInputStream()
                        : connection.getErrorStream();
                String text = read(stream);

                if (code < 200 || code >= 300) {
                    String message = extractError(text);
                    main.post(() -> callback.onError(message));
                    return;
                }

                Object parsed = parseJson(text);
                main.post(() -> callback.onSuccess(parsed));
            } catch (Exception ex) {
                main.post(() -> callback.onError(ex.getMessage() == null ? "Network error" : ex.getMessage()));
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
            }
        });
    }

    private static String read(InputStream stream) throws Exception {
        if (stream == null) {
            return "";
        }
        StringBuilder builder = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line);
            }
        }
        return builder.toString();
    }

    private static Object parseJson(String text) throws JSONException {
        String trimmed = text == null ? "" : text.trim();
        if (trimmed.startsWith("[")) {
            return new JSONArray(trimmed);
        }
        if (trimmed.startsWith("{")) {
            return new JSONObject(trimmed);
        }
        return trimmed;
    }

    private static String extractError(String text) {
        try {
            Object parsed = parseJson(text);
            if (parsed instanceof JSONObject) {
                JSONObject obj = (JSONObject) parsed;
                if (obj.has("detail")) {
                    return obj.optString("detail", "Request failed");
                }
                if (obj.has("error")) {
                    return obj.optString("error", "Request failed");
                }
            }
        } catch (Exception ignored) {
        }
        return text == null || text.isEmpty() ? "Request failed" : text;
    }
}

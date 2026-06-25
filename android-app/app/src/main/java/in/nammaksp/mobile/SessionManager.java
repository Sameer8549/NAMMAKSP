package in.nammaksp.mobile;

import android.content.Context;
import android.content.SharedPreferences;

final class SessionManager {
    private static final String PREFS = "namma_ksp_session";
    private static final String TOKEN = "token";
    private static final String USERNAME = "username";
    private static final String ROLE = "role";

    private final SharedPreferences prefs;

    SessionManager(Context context) {
        prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    void save(String token, String username, String role) {
        prefs.edit()
                .putString(TOKEN, token)
                .putString(USERNAME, username)
                .putString(ROLE, role)
                .apply();
    }

    String token() {
        return prefs.getString(TOKEN, "");
    }

    String username() {
        return prefs.getString(USERNAME, "");
    }

    String role() {
        return prefs.getString(ROLE, "");
    }

    boolean isLoggedIn() {
        return !token().isEmpty();
    }

    void clear() {
        prefs.edit().clear().apply();
    }
}

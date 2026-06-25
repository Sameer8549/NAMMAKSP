package in.nammaksp.mobile;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.Space;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Iterator;
import java.util.Locale;
import java.util.TimeZone;

public class MainActivity extends Activity {
    private static final int BG = Color.rgb(247, 249, 252);
    private static final int INK = Color.rgb(20, 35, 51);
    private static final int MUTED = Color.rgb(93, 111, 128);
    private static final int GREEN = Color.rgb(30, 107, 86);
    private static final int NAVY = Color.rgb(18, 60, 105);
    private static final int GOLD = Color.rgb(203, 151, 45);

    private SessionManager session;
    private ApiClient api;
    private LinearLayout root;
    private LinearLayout content;
    private String activeTab = "Dashboard";
    private String chatLanguage = "en-US";
    private String chatSessionId = "android-" + System.currentTimeMillis();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        session = new SessionManager(this);
        api = new ApiClient(session);
        if (session.isLoggedIn()) {
            showShell();
        } else {
            showLogin();
        }
    }

    private void showLogin() {
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(BG);
        LinearLayout box = column();
        box.setPadding(dp(22), dp(40), dp(22), dp(28));
        scroll.addView(box);

        TextView badge = text("Karnataka State Police", 13, GOLD, true);
        box.addView(badge);
        box.addView(title("NAMMA KSP"));
        box.addView(text("Crime intelligence, analytics, reports, and conversational AI for investigators.", 16, MUTED, false));
        box.addView(space(24));

        EditText username = input("Username");
        username.setSingleLine(true);
        username.setImeOptions(EditorInfo.IME_ACTION_NEXT);
        box.addView(username);
        box.addView(space(12));

        EditText password = input("Password");
        password.setSingleLine(true);
        password.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        password.setImeOptions(EditorInfo.IME_ACTION_DONE);
        box.addView(password);
        box.addView(space(16));

        Button login = primary("Sign in");
        box.addView(login);
        box.addView(space(18));
        box.addView(card("Live Catalyst backend", ApiClient.BASE_URL));

        login.setOnClickListener(v -> {
            String user = username.getText().toString().trim();
            String pass = password.getText().toString();
            if (user.isEmpty() || pass.isEmpty()) {
                toast("Enter username and password");
                return;
            }
            login.setEnabled(false);
            login.setText("Signing in...");
            JSONObject body = new JSONObject();
            try {
                body.put("username", user);
                body.put("password", pass);
            } catch (Exception ignored) {
            }
            api.post("/api/auth/login", body, new ApiClient.Callback() {
                @Override
                public void onSuccess(Object data) {
                    JSONObject obj = (JSONObject) data;
                    session.save(obj.optString("token"), obj.optString("username"), obj.optString("role"));
                    showShell();
                }

                @Override
                public void onError(String message) {
                    login.setEnabled(true);
                    login.setText("Sign in");
                    toast(message);
                }
            });
        });

        setContentView(scroll);
    }

    private void showShell() {
        root = column();
        root.setBackgroundColor(BG);

        LinearLayout header = row();
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setPadding(dp(16), dp(18), dp(16), dp(10));
        TextView brand = text("NAMMA KSP", 20, NAVY, true);
        header.addView(brand, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        Button logout = secondary("Logout");
        logout.setTextSize(12);
        header.addView(logout);
        root.addView(header);

        TextView user = text(session.username() + "  |  " + session.role(), 13, MUTED, false);
        user.setPadding(dp(16), 0, dp(16), dp(8));
        root.addView(user);

        root.addView(nav());

        ScrollView scroll = new ScrollView(this);
        content = column();
        content.setPadding(dp(16), dp(14), dp(16), dp(24));
        scroll.addView(content);
        root.addView(scroll, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1));

        logout.setOnClickListener(v -> {
            api.post("/api/auth/logout", new JSONObject(), new ApiClient.Callback() {
                @Override public void onSuccess(Object data) { }
                @Override public void onError(String message) { }
            });
            session.clear();
            showLogin();
        });

        setContentView(root);
        openTab(activeTab);
    }

    private HorizontalScrollView nav() {
        HorizontalScrollView scroller = new HorizontalScrollView(this);
        scroller.setHorizontalScrollBarEnabled(false);
        LinearLayout tabs = row();
        tabs.setPadding(dp(12), 0, dp(12), dp(10));
        String[] names = {"Dashboard", "Chat", "Reports", "Audit"};
        for (String name : names) {
            Button tab = name.equals(activeTab) ? primary(name) : secondary(name);
            tab.setTextSize(13);
            tab.setOnClickListener(v -> {
                activeTab = name;
                showShell();
            });
            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, dp(44));
            params.setMargins(dp(4), 0, dp(4), 0);
            tabs.addView(tab, params);
        }
        scroller.addView(tabs);
        return scroller;
    }

    private void openTab(String tab) {
        content.removeAllViews();
        if ("Chat".equals(tab)) {
            renderChat();
        } else if ("Reports".equals(tab)) {
            renderReports();
        } else if ("Audit".equals(tab)) {
            renderAudit();
        } else {
            renderDashboard();
        }
    }

    private void renderDashboard() {
        content.addView(sectionTitle("Operational dashboard"));
        content.addView(loading());
        api.get("/api/analytics/overview", new ApiClient.Callback() {
            @Override
            public void onSuccess(Object data) {
                content.removeAllViews();
                content.addView(sectionTitle("Operational dashboard"));
                JSONObject obj = (JSONObject) data;
                LinearLayout grid = column();
                grid.addView(metric("Total FIRs", obj.optString("total_firs", "0")));
                grid.addView(metric("Open cases", obj.optString("open_cases", "0")));
                grid.addView(metric("Districts", obj.optString("districts_covered", "0")));
                grid.addView(metric("Offenders", obj.optString("total_offenders", "0")));
                content.addView(grid);
                loadAdvanced();
            }

            @Override
            public void onError(String message) {
                showError("Dashboard failed", message);
            }
        });
    }

    private void loadAdvanced() {
        content.addView(space(10));
        content.addView(sectionTitle("Intelligence signals"));
        content.addView(loading());
        api.get("/api/analytics/advanced-intelligence", new ApiClient.Callback() {
            @Override
            public void onSuccess(Object data) {
                removeLastLoading();
                renderJsonCards(data, 0);
            }

            @Override
            public void onError(String message) {
                removeLastLoading();
                content.addView(card("Intelligence unavailable", message));
            }
        });
    }

    private void renderChat() {
        content.addView(sectionTitle("Conversational AI"));
        LinearLayout language = row();
        Button english = "en-US".equals(chatLanguage) ? primary("English") : secondary("English");
        Button kannada = "kn-IN".equals(chatLanguage) ? primary("Kannada") : secondary("Kannada");
        english.setOnClickListener(v -> { chatLanguage = "en-US"; renderChat(); });
        kannada.setOnClickListener(v -> { chatLanguage = "kn-IN"; renderChat(); });
        language.addView(english, new LinearLayout.LayoutParams(0, dp(44), 1));
        language.addView(kannada, new LinearLayout.LayoutParams(0, dp(44), 1));
        content.addView(language);
        content.addView(space(12));

        EditText prompt = input("Ask about FIRs, hotspots, offenders, or trends");
        prompt.setMinLines(3);
        prompt.setGravity(Gravity.TOP);
        content.addView(prompt);
        content.addView(space(10));

        Button ask = primary("Ask AI");
        content.addView(ask);
        TextView answer = text("", 15, INK, false);
        answer.setPadding(0, dp(14), 0, 0);
        content.addView(answer);

        ask.setOnClickListener(v -> {
            String question = prompt.getText().toString().trim();
            if (question.isEmpty()) {
                toast("Type a question");
                return;
            }
            ask.setEnabled(false);
            ask.setText("Thinking...");
            answer.setText("");
            JSONObject body = new JSONObject();
            try {
                body.put("message", question);
                body.put("session_id", chatSessionId);
                body.put("language", chatLanguage);
            } catch (Exception ignored) {
            }
            api.post("/api/chat", body, new ApiClient.Callback() {
                @Override
                public void onSuccess(Object data) {
                    ask.setEnabled(true);
                    ask.setText("Ask AI");
                    JSONObject obj = (JSONObject) data;
                    answer.setText(obj.optString("response", obj.toString()));
                }

                @Override
                public void onError(String message) {
                    ask.setEnabled(true);
                    ask.setText("Ask AI");
                    answer.setText(message);
                }
            });
        });
    }

    private void renderReports() {
        content.addView(sectionTitle("Reports"));
        EditText fir = input("FIR ID, for example FIR0001");
        fir.setSingleLine(true);
        content.addView(fir);
        content.addView(space(10));
        Button generate = primary("Generate case PDF");
        content.addView(generate);
        content.addView(space(14));
        content.addView(sectionTitle("Archive"));
        content.addView(loading());

        generate.setOnClickListener(v -> {
            String id = fir.getText().toString().trim().toUpperCase(Locale.US);
            if (id.isEmpty()) {
                toast("Enter FIR ID");
                return;
            }
            generate.setEnabled(false);
            generate.setText("Generating...");
            JSONObject body = new JSONObject();
            try {
                body.put("fir_id", id);
            } catch (Exception ignored) {
            }
            api.post("/api/reports/case", body, new ApiClient.Callback() {
                @Override
                public void onSuccess(Object data) {
                    generate.setEnabled(true);
                    generate.setText("Generate case PDF");
                    toast("Report generated");
                    renderReports();
                }

                @Override
                public void onError(String message) {
                    generate.setEnabled(true);
                    generate.setText("Generate case PDF");
                    toast(message);
                }
            });
        });

        api.get("/api/reports/list", new ApiClient.Callback() {
            @Override
            public void onSuccess(Object data) {
                removeLastLoading();
                JSONArray list = (JSONArray) data;
                if (list.length() == 0) {
                    content.addView(card("No reports yet", "Generate a case report to see it here."));
                    return;
                }
                for (int i = 0; i < Math.min(list.length(), 20); i++) {
                    JSONObject report = list.optJSONObject(i);
                    if (report == null) {
                        continue;
                    }
                    String filename = report.optString("filename");
                    Button item = secondary(filename);
                    item.setGravity(Gravity.START | Gravity.CENTER_VERTICAL);
                    item.setOnClickListener(v -> openReport(filename));
                    content.addView(item);
                    content.addView(space(8));
                }
            }

            @Override
            public void onError(String message) {
                removeLastLoading();
                content.addView(card("Reports failed", message));
            }
        });
    }

    private void renderAudit() {
        content.addView(sectionTitle("Recent audit log"));
        content.addView(loading());
        api.get("/api/audit/logs?limit=10", new ApiClient.Callback() {
            @Override
            public void onSuccess(Object data) {
                content.removeAllViews();
                content.addView(sectionTitle("Recent audit log"));
                JSONArray logs = (JSONArray) data;
                if (logs.length() == 0) {
                    content.addView(card("No audit events", "New sign-ins and admin actions will appear here."));
                    return;
                }
                for (int i = 0; i < logs.length(); i++) {
                    JSONObject log = logs.optJSONObject(i);
                    if (log == null) {
                        continue;
                    }
                    String title = log.optString("action") + "  |  " + log.optString("username", "-");
                    String detail = formatAudit(log.optString("timestamp"))
                            + "\n" + log.optString("resource", "-")
                            + "\n" + log.optString("detail", "");
                    content.addView(card(title, detail));
                    content.addView(space(8));
                }
            }

            @Override
            public void onError(String message) {
                showError("Audit failed", message);
            }
        });
    }

    private void openReport(String filename) {
        Uri uri = Uri.parse(ApiClient.BASE_URL + "/api/reports/download/" + Uri.encode(filename));
        startActivity(new Intent(Intent.ACTION_VIEW, uri));
    }

    private void renderJsonCards(Object data, int depth) {
        if (depth > 1 || data == null) {
            return;
        }
        if (data instanceof JSONObject) {
            JSONObject obj = (JSONObject) data;
            Iterator<String> keys = obj.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                Object value = obj.opt(key);
                if (value instanceof JSONObject || value instanceof JSONArray) {
                    content.addView(card(clean(key), summarize(value)));
                } else {
                    content.addView(card(clean(key), String.valueOf(value)));
                }
                content.addView(space(8));
            }
        } else if (data instanceof JSONArray) {
            JSONArray arr = (JSONArray) data;
            for (int i = 0; i < Math.min(arr.length(), 6); i++) {
                Object item = arr.opt(i);
                content.addView(card("Signal " + (i + 1), summarize(item)));
                content.addView(space(8));
            }
        }
    }

    private String summarize(Object value) {
        if (value instanceof JSONArray) {
            JSONArray arr = (JSONArray) value;
            StringBuilder out = new StringBuilder();
            for (int i = 0; i < Math.min(arr.length(), 4); i++) {
                Object item = arr.opt(i);
                out.append("- ").append(item instanceof JSONObject ? compact((JSONObject) item) : String.valueOf(item)).append("\n");
            }
            return out.toString().trim();
        }
        if (value instanceof JSONObject) {
            return compact((JSONObject) value);
        }
        return String.valueOf(value);
    }

    private String compact(JSONObject obj) {
        StringBuilder out = new StringBuilder();
        Iterator<String> keys = obj.keys();
        int count = 0;
        while (keys.hasNext() && count < 6) {
            String key = keys.next();
            out.append(clean(key)).append(": ").append(obj.optString(key)).append("\n");
            count++;
        }
        return out.toString().trim();
    }

    private String clean(String key) {
        if (key == null) {
            return "";
        }
        String[] parts = key.replace('_', ' ').split(" ");
        StringBuilder out = new StringBuilder();
        for (String part : parts) {
            if (part.isEmpty()) {
                continue;
            }
            out.append(Character.toUpperCase(part.charAt(0))).append(part.substring(1)).append(" ");
        }
        return out.toString().trim();
    }

    private String formatAudit(String timestamp) {
        try {
            SimpleDateFormat input = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US);
            input.setTimeZone(TimeZone.getTimeZone("UTC"));
            Date date = input.parse(timestamp);
            SimpleDateFormat output = new SimpleDateFormat("dd MMM yyyy, HH:mm", Locale.US);
            output.setTimeZone(TimeZone.getTimeZone("Asia/Kolkata"));
            return output.format(date);
        } catch (Exception ex) {
            return timestamp;
        }
    }

    private TextView title(String value) {
        TextView tv = text(value, 32, NAVY, true);
        tv.setPadding(0, dp(6), 0, dp(8));
        return tv;
    }

    private TextView sectionTitle(String value) {
        TextView tv = text(value, 20, INK, true);
        tv.setPadding(0, 0, 0, dp(12));
        return tv;
    }

    private View metric(String label, String value) {
        LinearLayout item = column();
        item.setBackgroundResource(R.drawable.card_bg);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        params.setMargins(0, 0, 0, dp(10));
        item.setLayoutParams(params);
        item.addView(text(value, 28, GREEN, true));
        item.addView(text(label, 14, MUTED, false));
        return item;
    }

    private View card(String heading, String body) {
        LinearLayout item = column();
        item.setBackgroundResource(R.drawable.card_bg);
        item.addView(text(heading, 16, INK, true));
        TextView bodyView = text(body == null ? "" : body, 14, MUTED, false);
        bodyView.setPadding(0, dp(6), 0, 0);
        item.addView(bodyView);
        return item;
    }

    private ProgressBar loading() {
        ProgressBar bar = new ProgressBar(this);
        bar.setPadding(0, dp(16), 0, dp(16));
        return bar;
    }

    private void removeLastLoading() {
        int count = content.getChildCount();
        if (count > 0 && content.getChildAt(count - 1) instanceof ProgressBar) {
            content.removeViewAt(count - 1);
        }
    }

    private void showError(String title, String message) {
        content.removeAllViews();
        content.addView(sectionTitle(title));
        content.addView(card("Could not load data", message));
    }

    private EditText input(String hint) {
        EditText edit = new EditText(this);
        edit.setHint(hint);
        edit.setTextColor(INK);
        edit.setHintTextColor(MUTED);
        edit.setTextSize(15);
        edit.setBackgroundResource(R.drawable.input_bg);
        return edit;
    }

    private Button primary(String label) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextColor(Color.WHITE);
        button.setTextSize(14);
        button.setAllCaps(false);
        button.setTypeface(Typeface.DEFAULT_BOLD);
        button.setBackgroundResource(R.drawable.primary_button);
        return button;
    }

    private Button secondary(String label) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextColor(NAVY);
        button.setTextSize(14);
        button.setAllCaps(false);
        button.setTypeface(Typeface.DEFAULT_BOLD);
        button.setBackgroundResource(R.drawable.secondary_button);
        return button;
    }

    private TextView text(String value, int sp, int color, boolean bold) {
        TextView tv = new TextView(this);
        tv.setText(value);
        tv.setTextSize(sp);
        tv.setTextColor(color);
        tv.setLineSpacing(dp(2), 1.0f);
        if (bold) {
            tv.setTypeface(Typeface.DEFAULT_BOLD);
        }
        return tv;
    }

    private LinearLayout column() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        return layout;
    }

    private LinearLayout row() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.HORIZONTAL);
        return layout;
    }

    private Space space(int dp) {
        Space space = new Space(this);
        space.setLayoutParams(new FrameLayout.LayoutParams(1, dp(dp)));
        return space;
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }

    private void toast(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }
}

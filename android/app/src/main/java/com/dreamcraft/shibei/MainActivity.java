package com.dreamcraft.shibei;

import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.graphics.Color;
import android.view.View;
import com.getcapacitor.BridgeActivity;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
    private TextToSpeech tts;
    private volatile int initStatus = -999;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.parseColor("#f6f1e9"));
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            View decor = getWindow().getDecorView();
            decor.setSystemUiVisibility(decor.getSystemUiVisibility() | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }
        tts = new TextToSpeech(this, new TextToSpeech.OnInitListener() {
            @Override
            public void onInit(int status) {
                initStatus = status;
            }
        });
        WebView webView = getBridge().getWebView();
        webView.addJavascriptInterface(new NativeBridge(), "AndroidNative");
    }

    private class NativeBridge {
        @JavascriptInterface
        public String getStatusBarHeight() {
            int resourceId = getResources().getIdentifier("status_bar_height", "dimen", "android");
            if (resourceId > 0) {
                int px = getResources().getDimensionPixelSize(resourceId);
                float density = getResources().getDisplayMetrics().density;
                return String.valueOf(Math.round(px / density));
            }
            return "0";
        }

        @JavascriptInterface
        public String speak(String text, String lang) {
            if (tts == null) return "tts_null";
            if (initStatus != TextToSpeech.SUCCESS) return "not_ready:" + initStatus;
            if (text == null || text.isEmpty()) return "empty";
            tts.stop();
            Locale locale = "zh".equals(lang) ? Locale.CHINA : Locale.US;
            int r = tts.setLanguage(locale);
            if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) {
                return "lang_unsupported:" + r;
            }
            int speakResult = tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "shibei_tts");
            return speakResult == TextToSpeech.SUCCESS ? "ok" : "speak_failed:" + speakResult;
        }
    }

    @Override
    public void onDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        super.onDestroy();
    }
}

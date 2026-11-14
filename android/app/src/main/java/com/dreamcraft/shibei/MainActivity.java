package com.dreamcraft.shibei;

import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
    private TextToSpeech tts;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        tts = new TextToSpeech(this, new TextToSpeech.OnInitListener() {
            @Override
            public void onInit(int status) {
                if (status == TextToSpeech.SUCCESS && tts != null) {
                    tts.setLanguage(Locale.US);
                }
            }
        });
        WebView webView = getBridge().getWebView();
        webView.addJavascriptInterface(new TtsInterface(), "AndroidTTS");
    }

    private class TtsInterface {
        @JavascriptInterface
        public void speak(String text, String lang) {
            if (tts == null || text == null) return;
            tts.stop();
            Locale locale = ("zh".equals(lang)) ? Locale.CHINA : Locale.US;
            int result = tts.setLanguage(locale);
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                tts.setLanguage(Locale.US);
            }
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "shibei_tts");
        }
    }

    @Override
    protected void onDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        super.onDestroy();
    }
}

package com.dreamcraft.shibei;

import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.graphics.Color;
import android.view.View;
import android.content.Intent;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import androidx.core.content.FileProvider;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.FileOutputStream;
import java.util.List;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
    private TextToSpeech tts;
    private volatile int initStatus = -999;
    private int engineIndex = 0;
    private final String[] engineCandidates = new String[] { "com.google.android.tts", null };

    private final TextToSpeech.OnInitListener initListener = new TextToSpeech.OnInitListener() {
        @Override
        public void onInit(int status) {
            if (status == TextToSpeech.SUCCESS) {
                initStatus = TextToSpeech.SUCCESS;
                return;
            }
            initStatus = status;
            engineIndex++;
            if (engineIndex < engineCandidates.length) {
                createTts(engineCandidates[engineIndex]);
            }
        }
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.parseColor("#f6f1e9"));
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            View decor = getWindow().getDecorView();
            decor.setSystemUiVisibility(decor.getSystemUiVisibility() | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }
        createTts(engineCandidates[0]);
        WebView webView = getBridge().getWebView();
        webView.addJavascriptInterface(new NativeBridge(), "AndroidNative");
    }

    private void createTts(String engine) {
        if (tts != null) {
            try { tts.shutdown(); } catch (Exception e) {}
        }
        initStatus = -999;
        try {
            if (engine == null) {
                tts = new TextToSpeech(getApplicationContext(), initListener);
            } else {
                tts = new TextToSpeech(getApplicationContext(), initListener, engine);
            }
        } catch (Exception e) {
            engineIndex++;
            if (engineIndex < engineCandidates.length) {
                createTts(engineCandidates[engineIndex]);
            } else {
                initStatus = TextToSpeech.ERROR;
            }
        }
    }

    private String listEngines() {
        try {
            Intent intent = new Intent(TextToSpeech.Engine.INTENT_ACTION_TTS_SERVICE);
            List<ResolveInfo> list = getPackageManager().queryIntentServices(intent, 0);
            StringBuilder sb = new StringBuilder();
            for (ResolveInfo info : list) {
                sb.append(info.serviceInfo.packageName).append(",");
            }
            String s = sb.toString();
            return s.isEmpty() ? "无" : s;
        } catch (Exception e) {
            return "获取失败:" + e.getMessage();
        }
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
            if (tts == null) return "no_engine";
            if (initStatus != TextToSpeech.SUCCESS) {
                String engines = listEngines();
                if (engines.equals("无") || engines.isEmpty()) {
                    return "no_engine";
                }
                return "not_ready:" + initStatus + " 引擎列表:" + engines;
            }
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

        @JavascriptInterface
        public void openTtsDownload() {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.tts"));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
            } catch (Exception e) {}
        }

        @JavascriptInterface
        public String exportData(String json, String filename) {
            try {
                File file = new File(getCacheDir(), filename);
                FileOutputStream fos = new FileOutputStream(file);
                fos.write(json.getBytes("UTF-8"));
                fos.close();
                Uri uri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".fileprovider", file);
                Intent share = new Intent(Intent.ACTION_SEND);
                share.setType("application/json");
                share.putExtra(Intent.EXTRA_STREAM, uri);
                share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                Intent chooser = Intent.createChooser(share, "导出数据");
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(chooser);
                return "ok";
            } catch (Exception e) {
                return "failed:" + e.getMessage();
            }
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

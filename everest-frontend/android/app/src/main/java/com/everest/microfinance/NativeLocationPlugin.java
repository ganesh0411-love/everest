package com.everest.microfinance;

import android.content.Context;
import android.content.Intent;
import android.os.Build;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeLocation")
public class NativeLocationPlugin extends Plugin {

    @PluginMethod
    public void startService(PluginCall call) {
        String staffId = call.getString("staffId");
        String projectId = call.getString("projectId");
        String apiKey = call.getString("apiKey");
        String authToken = call.getString("authToken");

        if (staffId == null || projectId == null || apiKey == null) {
            call.reject("staffId, projectId, and apiKey must be provided");
            return;
        }

        Context context = getContext();
        Intent intent = new Intent(context, LocationForegroundService.class);
        intent.putExtra("staffId", staffId);
        intent.putExtra("projectId", projectId);
        intent.putExtra("apiKey", apiKey);
        intent.putExtra("authToken", authToken);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }

        call.resolve();
    }

    @PluginMethod
    public void stopService(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, LocationForegroundService.class);
        intent.setAction("STOP");
        context.startService(intent);
        call.resolve();
    }
}

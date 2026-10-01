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

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        Context context = getContext();
        boolean hasBackgroundLocation = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            hasBackgroundLocation = androidx.core.content.ContextCompat.checkSelfPermission(context, android.Manifest.permission.ACCESS_BACKGROUND_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED;
        } else {
            hasBackgroundLocation = androidx.core.content.ContextCompat.checkSelfPermission(context, android.Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED;
        }

        android.os.PowerManager pm = (android.os.PowerManager) context.getSystemService(Context.POWER_SERVICE);
        boolean isBatteryIgnored = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            isBatteryIgnored = pm.isIgnoringBatteryOptimizations(context.getPackageName());
        } else {
            isBatteryIgnored = true;
        }

        com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
        ret.put("hasBackgroundLocation", hasBackgroundLocation);
        ret.put("isBatteryIgnored", isBatteryIgnored);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestBatteryOptimization(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent intent = new Intent(android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(android.net.Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            Intent intent = new Intent("android.intent.action.MANAGE_APP_PERMISSIONS");
            intent.putExtra("android.intent.extra.PACKAGE_NAME", getContext().getPackageName());
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        } catch (Exception e) {
            Intent intent = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            android.net.Uri uri = android.net.Uri.fromParts("package", getContext().getPackageName(), null);
            intent.setData(uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }
}

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

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (androidx.core.content.ContextCompat.checkSelfPermission(getContext(), android.Manifest.permission.POST_NOTIFICATIONS) 
                    != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                android.app.Activity activity = getActivity();
                if (activity != null) {
                    androidx.core.app.ActivityCompat.requestPermissions(
                        activity,
                        new String[]{android.Manifest.permission.POST_NOTIFICATIONS},
                        1002
                    );
                }
            }
        }

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
        try {
            // Direct to battery optimization ignore list
            Intent intent = new Intent(android.provider.Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            // Fallback to application details
            Intent intent = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(android.net.Uri.fromParts("package", getContext().getPackageName(), null));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        }
    }

    @PluginMethod
    public void openBatterySettings(PluginCall call) {
        requestBatteryOptimization(call);
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        android.app.Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is null");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Requesting ACCESS_BACKGROUND_LOCATION directly opens the system page 
            // with the "Allow all the time" radio button on Android 11+
            androidx.core.app.ActivityCompat.requestPermissions(
                activity,
                new String[]{android.Manifest.permission.ACCESS_BACKGROUND_LOCATION},
                1001
            );
            call.resolve();
        } else {
            // Fallback for older Android
            Intent intent = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(android.net.Uri.fromParts("package", getContext().getPackageName(), null));
            activity.startActivity(intent);
            call.resolve();
        }
    }
}

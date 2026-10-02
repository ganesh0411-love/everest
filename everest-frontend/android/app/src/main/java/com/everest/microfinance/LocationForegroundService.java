package com.everest.microfinance;

import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.location.Location;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class LocationForegroundService extends Service {
    private static final String TAG = "LocationService";
    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    private PowerManager.WakeLock wakeLock;
    private ExecutorService networkExecutor = Executors.newSingleThreadExecutor();

    private String staffId;
    private String projectId;
    private String apiKey;
    private String authToken;
    private long lastUploadTime = 0;

    @Override
    public void onCreate() {
        super.onCreate();
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);

        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Everest::LocationWakeLock");
        wakeLock.acquire();

        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult locationResult) {
                if (locationResult == null) {
                    return;
                }
                for (Location location : locationResult.getLocations()) {
                    long currentTime = System.currentTimeMillis();
                    // Throttle writes to at most every 2 seconds
                    if (currentTime - lastUploadTime >= 2000) {
                        lastUploadTime = currentTime;
                        Log.i(TAG, "Native GPS Fix: lat=" + location.getLatitude() + " lng=" + location.getLongitude() + " status=200");
                        uploadToFirestore(location);
                    }
                }
            }
        };
    }

    @SuppressLint("MissingPermission")
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && "STOP".equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }

        if (intent != null) {
            staffId = intent.getStringExtra("staffId");
            projectId = intent.getStringExtra("projectId");
            apiKey = intent.getStringExtra("apiKey");
            authToken = intent.getStringExtra("authToken");
        }

        startForeground(9001, createNotification());

        try {
            fusedLocationClient.getLastLocation().addOnSuccessListener(location -> {
                if (location != null) {
                    Log.i(TAG, "Immediate Native GPS Fix on Start: lat=" + location.getLatitude() + " lng=" + location.getLongitude());
                    uploadToFirestore(location);
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Error fetching last location on start", e);
        }

        LocationRequest locationRequest = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 3000)
                .setMinUpdateIntervalMillis(2000)
                .setMinUpdateDistanceMeters(0)
                .build();

        fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper());
        return START_STICKY;
    }

    private Notification createNotification() {
        String channelId = "everest_field_attendance";
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    channelId,
                    "Field Operations Service",
                    NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }

        return new NotificationCompat.Builder(this, channelId)
                .setContentTitle("Everest Microfinance")
                .setContentText("Everest Field Tracking Active")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true)
                .build();
    }

    private void uploadToFirestore(Location location) {
        if (staffId == null || projectId == null || apiKey == null) return;

        networkExecutor.execute(() -> {
            try {
                String urlString = "https://firestore.googleapis.com/v1/projects/" + projectId 
                        + "/databases/(default)/documents/live_locations/" + staffId 
                        + "?updateMask.fieldPaths=latitude&updateMask.fieldPaths=longitude"
                        + "&updateMask.fieldPaths=heading&updateMask.fieldPaths=speed"
                        + "&updateMask.fieldPaths=isLive&updateMask.fieldPaths=updatedAt"
                        + "&key=" + apiKey;

                URL url = new URL(urlString);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("PATCH");
                conn.setRequestProperty("Content-Type", "application/json");
                if (authToken != null && !authToken.isEmpty()) {
                    conn.setRequestProperty("Authorization", "Bearer " + authToken);
                }
                conn.setDoOutput(true);

                SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
                String timestamp = sdf.format(new Date());

                double speedKmH = location.hasSpeed() ? location.getSpeed() * 3.6 : 0.0;
                double heading = location.hasBearing() ? location.getBearing() : 0.0;

                String jsonPayload = "{"
                        + "\"fields\": {"
                        + "\"latitude\": {\"doubleValue\": " + location.getLatitude() + "},"
                        + "\"longitude\": {\"doubleValue\": " + location.getLongitude() + "},"
                        + "\"heading\": {\"doubleValue\": " + heading + "},"
                        + "\"speed\": {\"doubleValue\": " + speedKmH + "},"
                        + "\"isLive\": {\"booleanValue\": true},"
                        + "\"updatedAt\": {\"timestampValue\": \"" + timestamp + "\"}"
                        + "}"
                        + "}";

                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = jsonPayload.getBytes(StandardCharsets.UTF_8);
                    os.write(input, 0, input.length);
                }

                int responseCode = conn.getResponseCode();
                if (responseCode == 200 || responseCode == 201) {
                    Log.d(TAG, "Successfully updated Firestore: " + responseCode);
                } else {
                    Log.e(TAG, "Failed to update Firestore: " + responseCode);
                }
                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "Error updating Firestore via REST", e);
            }
        });
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (fusedLocationClient != null) {
            fusedLocationClient.removeLocationUpdates(locationCallback);
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        networkExecutor.shutdown();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}

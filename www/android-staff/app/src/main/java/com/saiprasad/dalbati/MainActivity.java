package com.saiprasad.dalbati;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createOrdersChannel();
    }

    /**
     * Creates the "orders" notification channel with MAX importance and a
     * custom loud alarm sound so kitchen staff NEVER miss an order.
     */
    private void createOrdersChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Delete old channel first so updated settings take effect
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.deleteNotificationChannel("orders");
            }

            NotificationChannel channel = new NotificationChannel(
                    "orders",
                    "New Orders",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("LOUD alerts when a new order is placed");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 500, 200, 500});
            channel.setBypassDnd(true);  // Override Do Not Disturb
            channel.enableLights(true);
            channel.setLightColor(0xFFFF6600); // Orange

            // Use our custom loud alarm sound instead of default
            Uri soundUri = Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.order_alert);
            AudioAttributes audioAttrs = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
            channel.setSound(soundUri, audioAttrs);

            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}

/**
 * order-alert.js — Generates and plays "Order! Order!" voice alert
 * Uses Web Speech API (SpeechSynthesis) for the voice.
 * Falls back to a beep tone if speech isn't available.
 */
(function () {
    window.OrderAlert = {
        _lastCount: -1,

        /** Play "Order Order" speech + attention beep */
        play: function () {
            // Play beep first for attention
            this._beep();

            // Then speak "Order! Order!"
            if ('speechSynthesis' in window) {
                // Cancel any ongoing speech
                speechSynthesis.cancel();

                var msg = new SpeechSynthesisUtterance('Order! Order! New order received!');
                msg.rate = 1.1;
                msg.pitch = 1.2;
                msg.volume = 1;
                msg.lang = 'en-IN';
                speechSynthesis.speak(msg);

                // Repeat after a short pause
                setTimeout(function () {
                    var msg2 = new SpeechSynthesisUtterance('Order! Order!');
                    msg2.rate = 1.2;
                    msg2.pitch = 1.3;
                    msg2.volume = 1;
                    msg2.lang = 'en-IN';
                    speechSynthesis.speak(msg2);
                }, 2500);
            }
        },

        /** Generate attention beep using Web Audio API */
        _beep: function () {
            try {
                var ctx = new (window.AudioContext || window.webkitAudioContext)();
                // Three rapid beeps
                for (var i = 0; i < 3; i++) {
                    var osc = ctx.createOscillator();
                    var gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.frequency.value = 880;
                    osc.type = 'square';
                    gain.gain.value = 0.3;
                    osc.start(ctx.currentTime + i * 0.2);
                    osc.stop(ctx.currentTime + i * 0.2 + 0.12);
                }
            } catch (e) { /* no audio context available */ }
        },

        /**
         * Check if there are new pending orders.
         * Call this after every fetch with the current pending count.
         */
        checkNewOrders: function (pendingOrders) {
            var currentCount = pendingOrders.length;

            // First load — just set the baseline, don't alert
            if (this._lastCount === -1) {
                this._lastCount = currentCount;
                return;
            }

            // New orders detected
            if (currentCount > this._lastCount) {
                this.play();

                // Also show browser notification if permitted
                if ('Notification' in window && Notification.permission === 'granted') {
                    var newest = pendingOrders[0];
                    new Notification('🔔 New Order!', {
                        body: (newest?.customerName || 'Customer') + ' — ₹' + (newest?.total || ''),
                        icon: 'logo.png',
                        tag: 'new-order'
                    });
                }
            }

            this._lastCount = currentCount;
        }
    };

    // Request notification permission on load
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
})();

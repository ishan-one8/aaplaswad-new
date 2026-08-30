#!/usr/bin/env node
/**
 * Generates a loud "ORDER ORDER" alert WAV file.
 * Three ascending beeps followed by three more — unmistakable alarm.
 */
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const CHANNELS = 1;
const BITS = 16;
const DURATION = 3; // seconds total

function generateSamples() {
    const totalSamples = SAMPLE_RATE * DURATION;
    const samples = new Int16Array(totalSamples);

    // Pattern: 3 rapid high beeps, pause, 3 rapid high beeps
    const beeps = [
        // First set: three quick beeps
        { start: 0.0, end: 0.15, freq: 880, vol: 0.9 },
        { start: 0.20, end: 0.35, freq: 1047, vol: 0.9 },
        { start: 0.40, end: 0.55, freq: 1175, vol: 0.9 },
        // Pause
        // Second set: three quick beeps (higher)
        { start: 0.75, end: 0.90, freq: 1175, vol: 0.95 },
        { start: 0.95, end: 1.10, freq: 1319, vol: 0.95 },
        { start: 1.15, end: 1.30, freq: 1480, vol: 0.95 },
        // Third set: urgent rapid beeps
        { start: 1.50, end: 1.62, freq: 1480, vol: 1.0 },
        { start: 1.65, end: 1.77, freq: 1661, vol: 1.0 },
        { start: 1.80, end: 1.92, freq: 1760, vol: 1.0 },
        { start: 1.95, end: 2.07, freq: 1976, vol: 1.0 },
        // Final long alarm tone
        { start: 2.20, end: 2.90, freq: 1760, vol: 0.85 },
    ];

    for (let i = 0; i < totalSamples; i++) {
        const t = i / SAMPLE_RATE;
        let value = 0;
        for (const b of beeps) {
            if (t >= b.start && t < b.end) {
                // Square wave with slight rounding for less harshness
                const phase = (t - b.start) * b.freq;
                const raw = Math.sin(2 * Math.PI * phase) > 0 ? 1 : -1;
                // Add overtone for richness
                const overtone = Math.sin(2 * Math.PI * phase * 2) * 0.3;
                // Envelope: quick attack, sustain, quick release
                const elapsed = t - b.start;
                const remaining = b.end - t;
                const attack = Math.min(elapsed / 0.01, 1);
                const release = Math.min(remaining / 0.02, 1);
                const envelope = attack * release;
                value += (raw + overtone) * b.vol * envelope;
            }
        }
        samples[i] = Math.max(-32768, Math.min(32767, Math.round(value * 32767 * 0.7)));
    }
    return samples;
}

function writeWav(filePath, samples) {
    const dataSize = samples.length * (BITS / 8);
    const buffer = Buffer.alloc(44 + dataSize);

    // RIFF header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);

    // fmt chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // chunk size
    buffer.writeUInt16LE(1, 20);  // PCM
    buffer.writeUInt16LE(CHANNELS, 22);
    buffer.writeUInt32LE(SAMPLE_RATE, 24);
    buffer.writeUInt32LE(SAMPLE_RATE * CHANNELS * BITS / 8, 28); // byte rate
    buffer.writeUInt16LE(CHANNELS * BITS / 8, 32); // block align
    buffer.writeUInt16LE(BITS, 34);

    // data chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    for (let i = 0; i < samples.length; i++) {
        buffer.writeInt16LE(samples[i], 44 + i * 2);
    }

    fs.writeFileSync(filePath, buffer);
    console.log(`✅ Written: ${filePath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

const samples = generateSamples();
const outPath = path.join(__dirname, '..', '..', 'staff', 'order-alert.wav');
writeWav(outPath, samples);
const androidPath = path.join(__dirname, '..', '..', 'android-staff', 'app', 'src', 'main', 'assets', 'public', 'order-alert.wav');
writeWav(androidPath, samples);
console.log('Done!');

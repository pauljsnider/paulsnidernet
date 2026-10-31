"""Experimental stock-firmware PWM transmitter; no PIO state machines claimed."""
from machine import Pin, PWM
from time import ticks_us, ticks_diff, ticks_add
import gc
from remote_core import encode

class Transmitter:
    def __init__(self):
        self.pwm = None
        self.remaining = 0
        self.next_at = 0
        self.times = ()

    def start(self, command):
        if self.remaining:
            return False
        freq, times, frames, period = encode(command)
        if self.pwm is None:
            # Universe 2026 schematic: GPIO16 drives IR MOSFET, active high.
            self.pwm = PWM(Pin(16), freq=freq, duty_u16=0)
        self.pwm.freq(freq)
        self.times, self.remaining, self.period = times, frames, period
        self.next_at = ticks_us()
        return True

    def poll(self):
        if not self.remaining or ticks_diff(ticks_us(), self.next_at) < 0:
            return
        started = ticks_us()
        # One bounded frame per update. PWM generates carrier; software gates it.
        # Interrupt jitter is not masked: hardware validation is required.
        gc.collect()
        deadline = ticks_us()
        try:
            for i, duration in enumerate(self.times):
                self.pwm.duty_u16(21845 if i % 2 == 0 else 0)
                deadline = ticks_add(deadline, duration)
                while ticks_diff(deadline, ticks_us()) > 0:
                    pass
        finally:
            self.pwm.duty_u16(0)
        self.remaining -= 1
        self.next_at = ticks_add(started, self.period)

    def close(self):
        self.remaining = 0
        if self.pwm is not None:
            self.pwm.duty_u16(0)
            self.pwm.deinit()
            Pin(16, Pin.OUT, value=0)
            self.pwm = None

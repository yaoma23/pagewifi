#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("boot ok");
}

void loop() {
  Serial.println("loop...");
  delay(1000);
}

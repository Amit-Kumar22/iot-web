/*
 * IoT Platform — ESP32 over HTTP (simplest; polls every 2 s)
 *
 * No extra libraries needed. Use MQTT instead if you need instant response.
 *
 * Datastreams this sketch expects on the device:
 *   V0  switch  → controls LED_PIN
 *   V1  value   → reports a reading every 10 s
 */
#include <WiFi.h>
#include <HTTPClient.h>

// ---------- change these ----------
const char* WIFI_SSID     = "YOUR_WIFI";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_HOST   = "69.62.75.151";   // your server IP / domain
const int   HTTP_PORT     = 5010;
const char* AUTH_TOKEN    = "PASTE_DEVICE_TOKEN"; // Device → Setup tab
// ----------------------------------

const int LED_PIN = 2;
unsigned long lastPoll = 0, lastSend = 0;

String baseUrl() { return String("http://") + SERVER_HOST + ":" + HTTP_PORT + "/api/external"; }

// GET /api/external/get?token=..&V0  → plain text value
String readPin(const char* pin) {
  HTTPClient http;
  http.begin(baseUrl() + "/get?token=" + AUTH_TOKEN + "&" + pin);
  int code = http.GET();
  String body = code == 200 ? http.getString() : "";
  http.end();
  return body;
}

// GET /api/external/update?token=..&V1=23.5
void writePin(const char* pin, float value) {
  HTTPClient http;
  http.begin(baseUrl() + "/update?token=" + AUTH_TOKEN + "&" + pin + "=" + String(value, 2));
  int code = http.GET();
  Serial.printf("-> %s = %.2f (%d)\n", pin, value, code);
  http.end();
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.printf("\nWiFi ok, IP %s\n", WiFi.localIP().toString().c_str());
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) { WiFi.reconnect(); delay(1000); return; }

  if (millis() - lastPoll > 2000) {
    lastPoll = millis();
    String v0 = readPin("V0");
    if (v0.length()) digitalWrite(LED_PIN, v0.toInt() == 1 ? HIGH : LOW);
  }
  if (millis() - lastSend > 10000) {
    lastSend = millis();
    writePin("V1", temperatureRead());  // replace with your sensor
  }
}

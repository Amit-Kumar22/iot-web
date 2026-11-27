/*
 * IoT Platform — ESP32 over MQTT (instant, two-way)
 *
 * Library: "PubSubClient" by Nick O'Leary (Arduino Library Manager)
 *
 * Datastreams this sketch expects on the device (create them in the website):
 *   V0  switch  → controls LED_PIN
 *   V1  value   → reports a reading every 5 s (here: the ESP32's internal temperature)
 */
#include <WiFi.h>
#include <PubSubClient.h>

// ---------- change these ----------
const char* WIFI_SSID     = "YOUR_WIFI";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_HOST   = "69.62.75.151";   // your server IP / domain
const int   MQTT_PORT     = 1883;
const char* AUTH_TOKEN    = "PASTE_DEVICE_TOKEN"; // Device → Setup tab
// ----------------------------------

const int LED_PIN = 2;

WiFiClient net;
PubSubClient mqtt(net);
unsigned long lastSend = 0;

// Server → device. Topic looks like  dev/<deviceId>/down/V0
void onMessage(char* topic, byte* payload, unsigned int len) {
  String t(topic);
  String pin = t.substring(t.lastIndexOf('/') + 1);
  String value;
  for (unsigned int i = 0; i < len; i++) value += (char)payload[i];
  Serial.printf("<- %s = %s\n", pin.c_str(), value.c_str());

  if (pin == "V0") digitalWrite(LED_PIN, value.toInt() == 1 ? HIGH : LOW);
}

// Device → server
void sendValue(const char* pin, float value) {
  char topic[16], payload[16];
  snprintf(topic, sizeof(topic), "up/%s", pin);
  dtostrf(value, 0, 2, payload);
  mqtt.publish(topic, payload);
  Serial.printf("-> %s = %s\n", pin, payload);
}

void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("WiFi");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.printf(" ok, IP %s\n", WiFi.localIP().toString().c_str());
}

void connectMqtt() {
  while (!mqtt.connected()) {
    String clientId = "esp32-" + String((uint32_t)ESP.getEfuseMac(), HEX);
    Serial.print("MQTT...");
    // username can be anything; the password is the device auth token
    if (mqtt.connect(clientId.c_str(), "device", AUTH_TOKEN)) {
      Serial.println(" connected");
      mqtt.subscribe("down/#");  // server replies with all current values
    } else {
      Serial.printf(" failed (rc=%d), retrying in 3s\n", mqtt.state());
      delay(3000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  connectWiFi();
  mqtt.setServer(SERVER_HOST, MQTT_PORT);
  mqtt.setCallback(onMessage);
  mqtt.setKeepAlive(30);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (!mqtt.connected()) connectMqtt();
  mqtt.loop();

  if (millis() - lastSend > 5000) {
    lastSend = millis();
    sendValue("V1", temperatureRead());  // replace with your sensor
  }
}

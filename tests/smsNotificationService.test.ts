import assert from "node:assert/strict";
import test from "node:test";
import { SmsNotificationService } from "../src/services/notifications/sms.js";

test("sends TalkSasa SMS through the v3 API with normalized Kenya recipient", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init: init ?? {} });
    return new Response(JSON.stringify({ status: "success", task_id: "task-1" }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };

  const service = new SmsNotificationService({
    provider: "talksasa",
    talksasaApiToken: "api-token",
    talksasaSenderId: "JKFLATS",
    talksasaBaseUrl: "https://bulksms.example.test/api/v3/",
    fetchImpl
  });

  assert.equal(service.isEnabled(), true);
  assert.equal(service.getProvider(), "talksasa");
  assert.equal(service.getSenderId(), "JKFLATS");

  await service.send({
    to: "0712 345 678",
    message: "Welcome  to   JK Flats.",
    tag: "tenant-welcome"
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://bulksms.example.test/api/v3/sms/send");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(
    (calls[0].init.headers as Record<string, string>).Authorization,
    "Bearer api-token"
  );

  const body = JSON.parse(String(calls[0].init.body));
  assert.deepEqual(body, {
    recipient: "254712345678",
    sender_id: "JKFLATS",
    type: "plain",
    message: "Welcome to JK Flats."
  });
});

test("TalkSasa SMS is disabled until proxy key and sender id are configured", async () => {
  let callCount = 0;
  const fetchImpl: typeof fetch = async () => {
    callCount += 1;
    return new Response("{}", { status: 200 });
  };

  const service = new SmsNotificationService({
    provider: "talksasa",
    talksasaApiToken: "api-token",
    fetchImpl
  });

  assert.equal(service.isEnabled(), false);
  await service.send({
    to: "+254712345678",
    message: "This should not be sent."
  });
  assert.equal(callCount, 0);
});

test("TalkSasa SMS trims messages to the documented single SMS length", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init: init ?? {} });
    return new Response("{}", { status: 200 });
  };
  const service = new SmsNotificationService({
    provider: "talksasa",
    talksasaApiToken: "api-token",
    talksasaSenderId: "JKFLATS",
    fetchImpl
  });

  await service.send({
    to: "+254712345678",
    message: "A".repeat(220)
  });

  const body = JSON.parse(String(calls[0].init.body));
  assert.equal(body.recipient, "254712345678");
  assert.equal(body.message.length, 160);
  assert.match(body.message, /\.\.\.$/);
});

test("TalkSasa SMS surfaces provider errors", async () => {
  const originalError = console.error;
  console.error = () => undefined;
  try {
    const service = new SmsNotificationService({
      provider: "talksasa",
      talksasaApiToken: "api-token",
      talksasaSenderId: "JKFLATS",
      fetchImpl: async () =>
        new Response(JSON.stringify({ message: "Invalid sender" }), {
          status: 422,
          headers: { "content-type": "application/json" }
        })
    });

    await assert.rejects(
      () =>
        service.send({
          to: "+254712345678",
          message: "Hello"
        }),
      /TalkSasa SMS failed \(422\)/
    );
  } finally {
    console.error = originalError;
  }
});

test("TalkSasa SMS can target the Ladybird proxy path for legacy keys", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init: init ?? {} });
    return new Response("{}", { status: 200 });
  };
  const service = new SmsNotificationService({
    provider: "talksasa",
    talksasaProxyApiKey: "proxy-key",
    talksasaSenderId: "JKFLATS",
    talksasaBaseUrl: "https://ladybird.talksasa.com",
    talksasaSendPath: "/send-sms",
    fetchImpl
  });

  await service.send({
    to: "+254712345678",
    message: "Hello"
  });

  assert.equal(calls[0].url, "https://ladybird.talksasa.com/send-sms");
  assert.equal(
    (calls[0].init.headers as Record<string, string>).Authorization,
    "Bearer proxy-key"
  );
});

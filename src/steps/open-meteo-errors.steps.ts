import { Given, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { TestWorld } from "../support/world";

/*
 * Open-Meteo is an external dependency.
 * These steps configure the expected mocked provider behaviour.
 *
 * The actual mocking mechanism will be implemented once the SUT
 * exposes its Open-Meteo integration boundary.
 */

Given(
  "the Open-Meteo API is mocked as unavailable",
  function (this: TestWorld) {
    this.weatherMode = "unavailable";
  }
);

Given(
  "Open-Meteo is mocked to return incomplete 7-day weather forecast data for {string}",
  function (this: TestWorld, location: string) {
    assert.equal(
      this.location,
      location,
      "The mocked weather location does not match the requested location"
    );

    this.weatherMode = "incomplete";
  }
);

Then(
  "the error response should indicate that weather data is temporarily unavailable",
  function (this: TestWorld) {
    assert.ok(
      this.responseBody,
      "Expected an error response body"
    );

    const message = getErrorMessage(this.responseBody);

    assert.match(
      message,
      /weather.*temporarily unavailable|weather.*unavailable/i,
      "Expected the response to indicate that weather data is temporarily unavailable"
    );
  }
);

Then(
  "the response should contain an error code {string}",
  function (this: TestWorld, expectedCode: string) {
    assert.ok(
      this.responseBody,
      "Expected an error response body"
    );

    assert.equal(
      this.responseBody.code,
      expectedCode,
      `Expected error code ${expectedCode}`
    );
  }
);

Then(
  "the response should contain an error message {string}",
  function (this: TestWorld, expectedMessage: string) {
    assert.ok(
      this.responseBody,
      "Expected an error response body"
    );

    assert.equal(
      getErrorMessage(this.responseBody),
      expectedMessage
    );
  }
);

function getErrorMessage(body: any): string {
  const message =
    body?.message ??
    body?.error ??
    body?.detail;

  assert.equal(
    typeof message,
    "string",
    "Error message is missing from the response"
  );

  return message;
}
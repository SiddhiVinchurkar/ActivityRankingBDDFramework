import {
  DataTable,
  Given,
  Then,
  When
} from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { apiClient } from "../support/hooks";
import { TestWorld } from "../support/world";

Given("the Activity Ranking API is available", async function () {
  const response = await apiClient.checkActivityRankingApi();
  assert.ok(
    response.ok(),
    `Activity Ranking API is not available. Status: ${response.status()}`
  );
});

Given("the Open-Meteo API is available", async function () {
  const response = await apiClient.checkOpenMeteoApi();
  assert.ok(
    response.ok(),
    `Open-Meteo API is not available. Status: ${response.status()}`
  );
});

Given(
  "the user enters city or town name {string}",
  function (this: TestWorld, location: string) {
    this.location = location;
  }
);

Given(
  "Open-Meteo returns 7-day weather forecast for {string}",
  function (this: TestWorld, location: string) {
    assert.equal(this.location, location);
    this.weatherMode = "live";
  }
);

Given(
  "Open-Meteo returns controlled 7-day weather data for {string}",
  function (this: TestWorld, location: string) {
    assert.equal(this.location, location);
    this.weatherMode = "controlled";
  }
);

Given(
  "the user enters partial city or town name {string}",
  function (this: TestWorld, partialLocation: string) {
    this.partialLocation = partialLocation;
  }
);

Given(
  "possible location matches are returned for {string}",
  async function (this: TestWorld, partialLocation: string) {
    assert.equal(this.partialLocation, partialLocation);

    const response = await apiClient.searchLocations(partialLocation);
    assert.equal(response.status(), 200);

    const body = await response.json();
    assert.ok(Array.isArray(body.matches), "Expected location matches array");
    assert.ok(body.matches.length > 0, "Expected at least one location match");
  }
);

Given(
  "the user selects {string}",
  function (this: TestWorld, selectedLocation: string) {
    this.selectedLocation = selectedLocation;
  }
);

Given(
  "Open-Meteo returns the next 7 days weather forecast for the selected location",
  function (this: TestWorld) {
    assert.ok(this.selectedLocation, "A location must be selected first");
    this.weatherMode = "live";
  }
);

Given(
  "the user does not provide a city or town name",
  function (this: TestWorld) {
    this.location = undefined;
  }
);

Given(
  "the location cannot be resolved by the Activity Ranking API",
  function (this: TestWorld) {
    this.locationResolution = "not-found";
  }
);

Given(
  "the location is successfully resolved by the Activity Ranking API",
  function (this: TestWorld) {
    this.locationResolution = "resolved";
  }
);

Given(
  "Open-Meteo returns no weather data for the resolved location",
  function (this: TestWorld) {
    assert.equal(this.locationResolution, "resolved");
    this.weatherMode = "no-data";
  }
);

When(
  "the user requests activity recommendations",
  async function (this: TestWorld) {
    this.response = await apiClient.getActivityRecommendations({
      location: this.location ?? this.partialLocation,
      selectedLocation: this.selectedLocation,
      weatherMode: this.weatherMode,
      locationResolution: this.locationResolution
    });

    const contentType = this.response.headers()["content-type"] ?? "";
    this.responseBody = contentType.includes("application/json")
      ? await this.response.json()
      : await this.response.text();
  }
);

Then(
  "the response status should be {int}",
  function (this: TestWorld, expectedStatus: number) {
    assert.ok(this.response, "No API response was captured");
    assert.equal(this.response.status(), expectedStatus);
  }
);

Then(
  "the response should contain recommendations for {int} days",
  function (this: TestWorld, expectedDays: number) {
    const days = getForecastDays(this.responseBody);
    assert.equal(days.length, expectedDays);
  }
);

Then(
  "each day activity should contain:",
  function (this: TestWorld, table: DataTable) {
    const expectedAttributes = table
      .hashes()
      .map(row => row.responseAttributes);

    const days = getForecastDays(this.responseBody);

    for (const day of days) {
      const activities = getActivities(day);

      assert.ok(
        activities.length > 0,
        `No activity recommendations returned for ${day.date}`
      );

      for (const activity of activities) {
        for (const attribute of expectedAttributes) {
          if (attribute === "date") {
            assert.ok(day.date, "Forecast date is missing");
          } else {
            assert.ok(
              Object.prototype.hasOwnProperty.call(activity, attribute),
              `${attribute} is missing for an activity on ${day.date}`
            );
          }
        }
      }
    }
  }
);

Then(
  "the response should contain {int} consecutive forecast dates",
  function (this: TestWorld, expectedDays: number) {
    const days = getForecastDays(this.responseBody);
    assert.equal(days.length, expectedDays);

    const dates = days.map((day: any) => {
      assert.ok(day.date, "Forecast date is missing");
      return new Date(`${day.date}T00:00:00Z`);
    });

    for (let index = 1; index < dates.length; index++) {
      const differenceInDays =
        (dates[index].getTime() - dates[index - 1].getTime()) /
        (24 * 60 * 60 * 1000);

      assert.equal(
        differenceInDays,
        1,
        "Forecast dates are not consecutive"
      );
    }
  }
);

Then(
  "each forecast day should contain the following activity recommendations:",
  function (this: TestWorld, table: DataTable) {
    const expectedActivities = table
      .hashes()
      .map(row => row.activity)
      .sort();

    const days = getForecastDays(this.responseBody);

    for (const day of days) {
      const actualActivities = getActivities(day)
        .map((activity: any) => activity.activityName)
        .sort();

      assert.deepEqual(
        actualActivities,
        expectedActivities,
        `Unexpected activity recommendations for ${day.date}`
      );
    }
  }
);

Then(
  "each activity should have a suitability measure",
  function (this: TestWorld) {
    for (const day of getForecastDays(this.responseBody)) {
      for (const activity of getActivities(day)) {
        assert.equal(
          typeof activity.suitabilityScore,
          "number",
          `Invalid suitability score for ${activity.activityName}`
        );
        assert.ok(
          Number.isFinite(activity.suitabilityScore),
          `Suitability score is not a finite number for ${activity.activityName}`
        );
      }
    }
  }
);

Then(
  "each activity should have reasoning for its ranking",
  function (this: TestWorld) {
    for (const day of getForecastDays(this.responseBody)) {
      for (const activity of getActivities(day)) {
        assert.equal(
          typeof activity.reasoning,
          "string",
          `Invalid reasoning for ${activity.activityName}`
        );
        assert.ok(
          activity.reasoning.trim().length > 0,
          `Reasoning is empty for ${activity.activityName}`
        );
      }
    }
  }
);

Then(
  "activities should be ordered from most suitable to least suitable",
  function (this: TestWorld) {
    for (const day of getForecastDays(this.responseBody)) {
      const scores = getActivities(day).map(
        (activity: any) => activity.suitabilityScore
      );

      const sortedScores = [...scores].sort((a, b) => b - a);

      assert.deepEqual(
        scores,
        sortedScores,
        `Activities are not ordered by suitability for ${day.date}`
      );
    }
  }
);

// This step intentionally matches the wording in the final feature file.
Then(
  "the highest scoribg activity should be the first recommendations for each day",
  function (this: TestWorld) {
    for (const day of getForecastDays(this.responseBody)) {
      const activities = getActivities(day);
      assert.ok(activities.length > 0, `No activities returned for ${day.date}`);

      const highestScore = Math.max(
        ...activities.map((activity: any) => activity.suitabilityScore)
      );

      assert.equal(
        activities[0].suitabilityScore,
        highestScore,
        `Highest scoring activity is not first for ${day.date}`
      );
    }
  }
);

Then(
  "activities should be ranked based on weather suitability for each day",
  function (this: TestWorld) {
    for (const day of getForecastDays(this.responseBody)) {
      const activities = getActivities(day);
      assert.ok(activities.length > 0, `No activities returned for ${day.date}`);

      for (const activity of activities) {
        assert.equal(typeof activity.suitabilityScore, "number");
      }

      const scores = activities.map(
        (activity: any) => activity.suitabilityScore
      );
      assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
    }
  }
);

Then(
  "the error response should indicate that a location is required",
  function (this: TestWorld) {
    assert.ok(this.responseBody, "Error response body is missing");
    assert.match(
      getErrorMessage(this.responseBody),
      /location.*required|required.*location/i
    );
  }
);

Then(
  "the error response should indicate that the location was not found",
  function (this: TestWorld) {
    assert.ok(this.responseBody, "Error response body is missing");
    assert.match(
      getErrorMessage(this.responseBody),
      /location.*not found|not found.*location/i
    );
  }
);

Then(
  "the error response should indicate that weather data was not found for the location",
  function (this: TestWorld) {
    assert.ok(this.responseBody, "Error response body is missing");
    assert.match(
      getErrorMessage(this.responseBody),
      /weather.*not found|no weather|weather data.*location/i
    );
  }
);

function getForecastDays(body: any): any[] {
  assert.ok(body && typeof body === "object", "Response body must be JSON");
  assert.ok(Array.isArray(body.days), "Response should contain a days array");
  return body.days;
}

function getActivities(day: any): any[] {
  assert.ok(
    Array.isArray(day.activities),
    `Activities are missing for forecast date ${day.date ?? "unknown"}`
  );
  return day.activities;
}

function getErrorMessage(body: any): string {
  if (typeof body === "string") return body;

  const message = body?.message ?? body?.error ?? body?.detail;
  assert.equal(typeof message, "string", "Error message is missing");
  return message;
}

# Activity Ranking API - BDD Test Suite

## Overview

This repository contains a specification-first BDD test suite for the Activity Ranking API ticket.

The service is expected to accept a city or town name and return ranked activity recommendations for the next seven days using weather data from Open-Meteo. The activities covered by the feature are Skiing, Surfing, Outdoor Sightseeing and Indoor Sightseeing.

There is no System Under Test (SUT) yet. The suite therefore defines the expected behaviour and API contract first. A failing/red state is expected until an implementation matching this contract is available.

## Test approach

The feature is written from the API consumer's point of view and covers:

- successful recommendations for multiple valid locations
- seven consecutive forecast dates
- ranking of all required activities
- suitability score and reasoning for each activity
- partial city/town matching followed by selection of a resolved location
- missing location input
- a location that cannot be resolved
- a resolved location for which Open-Meteo returns no weather data
- scenarios where Open-Meteo API will be down

The Scenario Outline is used to exercise the same successful contract for London, Manchester and Edinburgh (any location can be considered) without duplicating scenarios.

Controlled weather data is used by the ranking scenario so the ranking behaviour can eventually be tested deterministically rather than depending on changing live weather.

## API contract assumptions

The ticket does not define endpoint paths, response schemas, suitability score format, or error status codes. The test suite therefore assumes:

- `GET /api/activities` returns activity recommendations.
- `GET /api/locations` supports partial location matching.
- A successful request returns HTTP 200.
- Missing location input returns HTTP 400.
- An unresolved location returns HTTP 404.
- A resolved location with no weather data returns HTTP 404.
- Open-Meteo unavailable results in HTTP 503.
- Incomplete Open-Meteo data results in HTTP 502.
- `suitabilityScore` is represented as a number.
- Activity recommendations are ordered from highest to lowest suitability.


### Activity recommendations

`GET /api/activities?location=London`

Expected successful response shape:

```json
{
  "days": [
    {
      "date": "2026-08-17",
      "activities": [
        {
          "activityName": "Outdoor Sightseeing",
          "suitabilityScore": 90,
          "reasoning": "Clear skies and mild temperature"
        },
        {
          "activityName": "Indoor Sightseeing",
          "suitabilityScore": 70,
          "reasoning": "Indoor activity remains suitable"
        },
        {
          "activityName": "Surfing",
          "suitabilityScore": 40,
          "reasoning": "Limited surfing conditions"
        },
        {
          "activityName": "Skiing",
          "suitabilityScore": 10,
          "reasoning": "No snowfall expected"
        }
      ]
    }
  ]
}
```

The `days` collection is expected to contain seven forecast days.

For each day, activity recommendations are ordered from the highest suitability score to the lowest. The first recommendation is therefore expected to be the highest-scoring activity for that day.

The ticket asks for a measure of suitability but does not define its representation. This suite assumes `suitabilityScore` is numeric.

### Partial location search

The suite assumes partial location resolution is exposed through:

`GET /api/locations?query=Lon`

Expected response shape:

```json
{
  "matches": [
    {
      "name": "London",
      "country": "United Kingdom",
      "latitude": 51.5072,
      "longitude": -0.1276
    }
  ]
}
```

The user can select a returned location before requesting recommendations. The selected/resolved location is then used to obtain weather data.

### Error behaviour

The suite assumes:

- missing city/town input returns HTTP 400
- an unresolved location returns HTTP 404
- a successfully resolved location with no available weather data returns HTTP 404
- Open-Meteo unavailable returns HTTP 503
- incomplete Open-Meteo forecast data returns HTTP 502 with error code INCOMPLETE_WEATHER_DATA

Error messages are validated semantically where the exact message is not part of the assumed contract. The incomplete forecast scenario validates the specific error code and message defined by the test contract.

## Testability and Open-Meteo dependency

Open-Meteo is an external third-party dependency. The test suite should not depend on changing live weather conditions or on the real Open-Meteo service becoming unavailable in order to exercise failure scenarios.

Since there is currently no System Under Test (SUT), the exact mechanism used by the application to integrate with and mock Open-Meteo is not yet known.

For the purpose of this specification-first test framework, the following test-only request headers are assumed as a test seam:

- `x-test-weather-mode: live`
- `x-test-weather-mode: controlled`
- `x-test-weather-mode: no-data`
- `x-test-weather-mode: unavailable`
- `x-test-weather-mode: incomplete`

The weather mode allows the tests to describe the Open-Meteo behaviour required by a scenario.

`live` represents the normal Open-Meteo integration.

`controlled` represents deterministic 7-day weather data used to validate
activity ranking without depending on changing live weather.

`no-data` represents a successful Open-Meteo interaction where weather data
is not available for the resolved location.

`unavailable` represents an Open-Meteo service failure.

`incomplete` represents a successful provider response that does not contain
the complete weather data required to produce the 7-day recommendations.

The following location-resolution modes are also assumed:
- `x-test-location-resolution: normal`
- `x-test-location-resolution: not-found`
- `x-test-location-resolution: resolved`

These headers are not part of the business API requirements in the supplied ticket. They are testability assumptions made for this automation framework.

Once the SUT is implemented, these test seams may be replaced by dependency injection, HTTP stubbing, a mock server, or another mechanism supported by the application architecture. The feature scenarios should remain unchanged if the underlying mocking implementation changes.

## Project structure

```text
activity-ranking-api-tests/
├── features/
│   └── activity-ranking.feature
    └── open-meteo-errors.feature
├── src/
│   ├── steps/
│   │   └── activity-ranking.steps.ts
        └── open-meteo-errors.steps.ts 
│   └── support/
│       ├── api-client.ts
│       ├── hooks.ts
│       └── world.ts
├── package.json
├── tsconfig.json
├── cucumber.js
└── README.md
```

## Running the tests

### Requirements

- Node.js 20
- npm

Install dependencies:

```bash
npm install
```

Run the BDD suite:

```bash
npm test
```

The default SUT base URL is:

```text
http://localhost:3000
```

A different environment can be supplied with:

```bash
BASE_URL=http://localhost:8080 npm test
```

## Expected current result

The tests are expected to be red while no Activity Ranking API implementation is running.

The first Background step checks `/health`, so an absent SUT will fail early and clearly rather than producing misleading assertion failures later in the scenario.

Once the API is implemented, the suite should become green as the implementation satisfies the contract described by the feature.

## Trade-offs and omissions

The ticket does not define the actual formula used to calculate suitability for Skiing, Surfing, Outdoor Sightseeing or Indoor Sightseeing. The suite therefore validates that:

- all required activities are returned
- each activity has a suitability score
- each activity has reasoning
- recommendations are ordered by suitability
- the highest-scoring recommendation is returned first

It does not invent weather thresholds or expected numeric scores.

Performance, authentication and rate limiting are not covered because they are not part of the assignment.

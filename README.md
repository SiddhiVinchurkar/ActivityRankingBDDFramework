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

The Scenario Outline is used to exercise the same successful contract for London, Manchester and Edinburgh without duplicating scenarios.

Controlled weather data is used by the ranking scenario so the ranking behaviour can eventually be tested deterministically rather than depending on changing live weather.

## Assumed API contract

The ticket does not provide endpoint paths or a JSON schema, so the suite makes the following contract decisions.

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

The feature validates the error message semantically rather than requiring one exact message string.

## Open-Meteo dependency

Open-Meteo is an external third-party dependency.

The Background checks that Open-Meteo is reachable for the normal feature flow. The check uses a small forecast request for known coordinates.

For ranking tests, live weather alone is not sufficient because weather changes over time. The future application should expose a replaceable weather-client boundary or equivalent test seam so controlled Open-Meteo responses can be supplied.

The current automation represents the expected test seam through test-only request headers:

- `x-test-weather-mode: live`
- `x-test-weather-mode: controlled`
- `x-test-weather-mode: no-data`
- `x-test-location-resolution: normal`
- `x-test-location-resolution: not-found`
- `x-test-location-resolution: resolved`

These headers are a specification/testing assumption only. Since the SUT does not exist, the implementation may use a different mechanism such as dependency injection or a stub server. If that happens, only the support/client layer should need to change; the feature scenarios should remain the same.

A separate dependency-failure feature can use mocked/stubbed Open-Meteo responses for conditions such as the third-party service being unavailable or returning incomplete data.

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

Performance, authentication and rate limiting are not covered because they are not part of the assigment.

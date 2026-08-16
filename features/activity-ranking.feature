Feature: Activity Ranking API - City-Based Weather Forecast Integration

  As a user
  I want to enter a city or town name
  And receive ranked activity recommendations for the next 7 days
  So that I can choose activities based on expected weather conditions

  Background:
    Given the Activity Ranking API is available
    And the Open-Meteo API is available


  Scenario Outline: Get ranked activities for a valid city or town
    Given the user enters city or town name "<location>"
    And Open-Meteo returns 7-day weather forecast for "<location>"
    When the user requests activity recommendations
    Then the response status should be 200
    And the response should contain recommendations for 7 days
    And each day activity recommendation should contain:
      | responseAttributes            |
      | date                          |
      | activityName                  |
      | suitabilityScore              |
      | reasoning                     |

    Examples:
      | location   |
      | London     |
      | Manchester |
      | Edinburgh  |


  Scenario: Forecast contains the next 7 consecutive days
    Given the user enters city or town name "London"
    And Open-Meteo returns 7-day weather forecast for "London"
    When the user requests activity recommendations
    Then the response status should be 200
    And the response should contain 7 consecutive forecast dates

  Scenario: All activities are independently ranked based on weather conditions
  Given the user enters city or town name "London"
  And Open-Meteo returns controlled 7-day weather data for "London"
  When the user requests activity recommendations
  Then the response status should be 200
  And each forecast day should contain the following activity recommendations:
  |activity             |
  |Skiing               |
  |Surfing              |
  |Outdoor Sightseeing  |
  |Indoor Sightseeing   |
  And each activity should have a suitability measure
  And each activity should have reasoning for its ranking
  And activities should be ordered from most suitable to least suitable
  And the highest scoring activity should be the first recommendations for each day

  Scenario: Get activity recommendations using a partial city or town name
  Given the user enters partial city or town name "Lon"
  And possible location matches are returned for "Lon"
  And the user selects "London, United Kingdom"
  And Open-Meteo returns the next 7 days weather forecast for the selected location
  When the user requests activity recommendations
  Then the response status should be 200
  And the response should contain recommendations for 7 days
  And activities should be ranked based on weather suitability for each day


  Scenario: City or town name is not provided
    Given the user does not provide a city or town name
    When the user requests activity recommendations
    Then the response status should be 400
    And the error response should indicate that a location is required

  Scenario: Location is not found by the Activity Ranking API
  Given the user enters city or town name "NotARealPlace"
  And the location cannot be resolved by the Activity Ranking API
  When the user requests activity recommendations
  Then the response status should be 404
  And the error response should indicate that the location was not found

  Scenario: Location is resolved but weather data is not found in Open-Meteo
  Given the user enters city or town name "Katpady"
  And the location is successfully resolved by the Activity Ranking API
  And Open-Meteo returns no weather data for the resolved location
  When the user requests activity recommendations
  Then the response status should be 404
  And the error response should indicate that weather data was not found for the location
